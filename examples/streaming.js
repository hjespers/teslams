#!/usr/bin/env node
//
// streaming.js
//
// Stream data from Tesla's streaming API to either a flat file or a MongoDB database
//
var request = require('request');
var teslams = require('../teslams.js');
var fs = require('fs');
var util = require('util');

function argchecker( argv ) {
	if (argv.db == true) throw 'MongoDB database name is unspecified. Use -d dbname or --db dbname';
}

var usage = 'Usage: $0 -u <username> -p <password> [-sz] [--file <filename> || --db <MongoDB database>] \n' +
	'	[--values <value list>] [--maxrpm <#num>] \n' +
	'# if --db <MongoDB database> argument is given, store data in MongoDB, otherwise in a flat file';

var p_url = 'https://portal.vn.teslamotors.com/vehicles/';
var s_url = 'https://streaming.vn.teslamotors.com/stream/';
var collectionS, collectionA;
var firstTime = true;
var MongoClient;
var stream;
var last = 0; // datetime for checking request rates
var rpm = 0; // REST API Request Per Minute counter
var slast = 0; // datetime for checking streaming request rates
var srpm = 0; // Streaming URL Request Per Minute counter

var argv = require('optimist')
	.usage(usage)
	.check(argchecker)
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.alias('d', 'db')
	.describe('d', 'MongoDB database name')
	.alias('s', 'silent')
	.describe('s', 'Silent mode: no output to console')
	.alias('z', 'zzz')
	.describe('z', 'enable sleep mode checking')
	.boolean(['s', 'z'])
	.alias('f', 'file')
	.describe('f', 'Comma Separated Values (CSV) output file. Defaults to streaming.out')
	.default('f', 'streaming.out')
	.alias('r', 'maxrpm')
	.describe('r', 'Maximum number of requests per minute')
	.default('r', 6)
	.alias('v', 'values')
	.describe('v', 'List of values to collect')
	.default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range')
	//.default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range,heading')
	.alias('?', 'help')
	.describe('?', 'Print usage information');

// get credentials either from command line or ~/.teslams/config.json
var creds = require('./config.js').config(argv);

argv = argv.argv;

if ( argv.help == true ) {
	console.log(usage);
	process.exit(1);
}

var nFields = argv.values.split(",").length + 1; // number of fields including ts

if (argv.db) {
	console.log("database name", argv.db);
	MongoClient = require('mongodb').MongoClient;
	MongoClient.connect('mongodb://127.0.0.1:27017/' + argv.db, function(err, db) {
		if(err) throw err;
		collectionS = db.collection('tesla_stream');
		collectionA = db.collection('tesla_aux');
	});
} else {
	stream = fs.createWriteStream(argv.file);
}

function tsla_poll( vid, long_vid, token ) {
	if (long_vid == undefined || token == undefined) {
		console.log('Error: undefined vehicle_id (' + long_vid +') or token (' + token +')' );
		console.log('Exiting...');
		process.exit(1);
	} 
	now = new Date().getTime();
	if ( now - slast < 60000) { // last streaming request was less than 1 minute ago
		ulog( srpm + ' of ' + argv.maxrpm + ' Stream requests since ' + slast);
		if ( now - slast < 0 ) {
			ulog('Warn: Clock moved backwards - Daylight Savings Time??');
			srpm = 0;
			slast = now;
		} else if (srpm > argv.maxrpm ) {
			ulog('Warn: throttling due to too many streaming requests per minute');
			setTimeout(function() { 
				tsla_poll( vid, long_vid, token );
			}, 60000);	
			return;
		}	
	} else { // longer than a minute since last request
		srpm = 0;
		slast = now;
	}
	srpm++; //increment the number of streaming requests per minute
	request({'uri': s_url + long_vid +'/?values=' + argv.values,
			'method' : 'GET',
			'auth': {'user': creds.username,'pass': token},
			'timeout' : 125000 // a bit more than the expected 2 minute max long poll
			}, function( error, response, body) {
		if ( error ) { // HTTP Error
			ulog( error );
			// put short delay to avoid infinite recursive loop and stack overflow
			setTimeout(function() {
				tsla_poll( vid, long_vid, token ); // poll again
			}, 1000);
		} else if (response.statusCode == 200) { // HTTP OK
			if (body===undefined) {
				ulog('WARN: HTTP returned OK but body is undefined');
			} else if (body===null) {
				ulog('WARN: HTTP returned OK but body is null');
			} else {
				ulog(body);
			}
			// put short delay to avoid infinite recursive loop and stack overflow
			setTimeout(function() {
				tsla_poll( vid, long_vid, token ); // poll again
			}, 1000);
		} else if ( response.statusCode == 401) { // HTTP AUTH Failed
			ulog('WARN: HTTP 401: Unauthorized - token has likely expired, reinitializing');
			setTimeout(function() {
				initstream();
			}, 1000);
		} else { // all other unexpected responses
			ulog('Unexpected problem with request:\n	Response status code = ' + response.statusCode + '	Error code = ' + error + '\n Polling again in 10 seconds...');
			// put short delay to avoid infinite recursive loop and stack overflow
			setTimeout(function() {
				tsla_poll( vid, long_vid, token ); // poll again
			}, 10000);
		}
	}).on('data', function(data) {
		var d, vals, i, record, doc;
		if (argv.db) {
			d = data.toString().trim();
			vals = d.split(/[,\n\r]/);
			for (i = 0; i < vals.length; i += nFields) {
				record = vals.slice(i, nFields);
				doc = { 'ts': +vals[i], 'record': record };
				collectionS.insert(doc, { 'safe': true }, function(err,docs) {
					if(err) util.log(err);
				});
			}
		} else {
			stream.write(data);
		}
	});		
}

function getAux() {
    // make absolutely sure we don't overwhelm the API
    now = new Date().getTime();
    if ( now - last < 60000) { // last request was within the past minute
    	ulog( 'getAux: ' + rpm + ' of ' + argv.maxrpm + ' REST requests since ' + last);
    	if ( now - last < 0 ) {
			ulog('Warn: Clock moved backwards - Daylight Savings Time??');
			rpm = 0;
			last = now;
		} else if ( rpm > argv.maxrpm ) {
			ulog ('Throttling Auxiliary REST requests due to too much REST activity');
			return;
		}
	} else { // longer than a minute since last request
		rpm = 0;
		last = now;
	}
	rpm = rpm + 2; // increase REST request counter by 2 for following requests
	teslams.get_charge_state( getAux.vid, function(data) {
		var doc = { 'ts': new Date().getTime(), 'chargeState': data };
		collectionA.insert(doc, { 'safe': true }, function(err,docs) {
			if(err) throw err;
		});
	});
	teslams.get_climate_state( getAux.vid, function(data) {
		var ds = JSON.stringify(data), doc;

		if (ds.length > 2 && ds != JSON.stringify(getAux.climate)) {
			getAux.climate = data;
			doc = { 'ts': new Date().getTime(), 'climateState': data };
			collectionA.insert(doc, { 'safe': true }, function(err,docs) {
				if(err) throw err;
			});
		}
	});
}

function storeVehicles(vehicles) {
	var doc = { 'ts': new Date().getTime(), 'vehicles': vehicles };
	collectionA.insert(doc, { 'safe': true }, function (err, docs) {
		if (err) console.dir(err);
	});
	rpm += 2; // increment REST request counter 
	teslams.get_vehicle_state(vehicles.id, function(data) {
		ulog( util.inspect(data));
		doc = { 'ts': new Date().getTime(), 'vehicleState': data };
		collectionA.insert(doc, { 'safe': true }, function (err, docs) {
			if (err) console.dir(err);
		});
	});
	teslams.get_gui_settings(vehicles.id, function(data) {
		ulog(util.inspect(data));
		doc = { 'ts': new Date().getTime(), 'guiSettings': data };
		collectionA.insert(doc, { 'safe': true }, function (err, docs) {
			if (err) console.dir(err);
		});
	});
}

// if we are storing into a database we also want to
// - store the vehicle data (once, after the first connection)
// - store some other REST API data around climate and charging (every minute)
function initdb(vehicles) {
	storeVehicles(vehicles);
	getAux.vid = vehicles.id;
	// getAux();
	setInterval(getAux, 60000); // also get non-streaming data every 60 seconds
}

function ulog( string ) {
	if (!argv.silent) {
		util.log( string );
	}
}

function initstream() {
    // make absolutely sure we don't overwhelm the API
    now = new Date().getTime();
    if ( now - last < 60000) { // last request was within the past minute
    	ulog( rpm + ' of ' + argv.maxrpm + ' REST requests since ' + last);
    	if ( now - last < 0 ) {
			ulog('Warn: Clock moved backwards - Daylight Savings Time??');
			rpm = 0;
			last = now;
		} else if (rpm > argv.maxrpm) { // throttle check
        	util.log('Warn: throttling due to too many REST API');
        	setTimeout(function() { 
        		initstream(); 
        	}, 60000); 
        	return;
        }       
    } else { // longer than a minute since last request
		last = now;
		rpm = 0; // reset the REST API request counter
	}
	rpm++; // increment the REST API request counter
	teslams.vehicles( { email: creds.username, password: creds.password }, function ( vehicles ) {	
		if ( typeof vehicles == "undefined" ) {
			console.log('Error: undefined response to vehicles request' );
			console.log('Exiting...');
			process.exit(1);
		}
		ulog( util.inspect( vehicles) ); 
		if ( typeof vehicles.tokens == "undefined" || vehicles.tokens[0] == undefined ) {
			ulog('Warn: no tokens returned');
			if (argv.zzz && vehicles.state == 'asleep') { //respect sleep mode
				ulog('Info: car is sleeping, will check again later');	
                // wait for 5 minutes and check again if car is asleep
				setTimeout(function() { 
					initstream();
				}, 300000);
			} else { // car is either awake already OR don't care to let it sleep
				ulog('Info: calling wake_up');
				rpm++;	// increment the REST API request counter			
				teslams.wake_up( vehicles.id, function( resp ) {
					// check the wake_up() response and reinitialize to get vehicle data and valid tokens
					// added a 30sec delay to avoid a tight repeating loop
					// such as in the case wake_up returns unusually quickly or with an error 
					if ( resp.result ) {
						// wake_up returned true so re-initialize right away
						setTimeout(function() { 
							initstream(); 
						}, 1000);
					} else {
						ulog('Warn: wake_up request failed.\n  Waiting 30 secs and then reinitializing...');
						// wake_up failed. wait 30 seconds before trying again to reinitialize 
						setTimeout(function() { 
							initstream(); 
						}, 30000);              
					} 
				});
			}
		} else { // this is the valid condition so we have the required tokens and ids
			if (firstTime) {	// initialize only once
				firstTime = false;
				if (argv.db) { // initialize database
					initdb(vehicles);
				} else { // initialize first line of CSV file output with field names 
					stream.write('timestamp,' + argv.values + '\n');
				}
			}
			tsla_poll( vehicles.id, vehicles.vehicle_id, vehicles.tokens[0] );
		}
	}); // end of teslams.vehicles() request
}

// this is the main part of this program
// call the REST API in order get login and get the id, vehicle_id, and streaming password token
ulog('timestamp,' + argv.values);
initstream();
