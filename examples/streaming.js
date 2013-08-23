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

var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password> [--file <filename>] [--db <MongoDB database>] [--silent] \n' +
		'# if --db <MongoDB database> argument is given, store data in MongoDB, otherwise in a flat file')
	.check(argchecker)
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.demand('u')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.demand('p')
	.alias('d', 'db')
	.describe('d', 'MongoDB database name')
	.alias('s', 'silent')
	.describe('s', 'Silent mode: no output to console')
	.boolean(['s'])
	.alias('f', 'file')
	.describe('f', 'Comma Separated Values (CSV) output file. Defaults to streaming.out')
	.default('f', 'streaming.out')
	.alias('v', 'values')
	.describe('v', 'List of values to collect')
	.default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range')
	//.default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range,heading')
	.alias('?', 'help')
	.describe('?', 'Print usage information')
	.argv;

if ( argv.help == true ) {
	console.log( 'Usage: streaming.js -u <username> -p <password> [--file <filename>] [--db <MongoDB database>] [--silent] \n' +
		'# if --db <MongoDB database> argument is given, store data in MongoDB, otherwise in a flat file');
	process.exit(1);
}

var p_url = 'https://portal.vn.teslamotors.com/vehicles/';
var s_url = 'https://streaming.vn.teslamotors.com/stream/';
var nFields = argv.values.split(",").length + 1; // number of fields including ts
var collectionS, collectionA;
var startedAuxPoll = false;

if (argv.db) {
	console.log("database name", argv.db);
	var MongoClient = require('mongodb').MongoClient;
	MongoClient.connect('mongodb://127.0.0.1:27017/' + argv.db, function(err, db) {
		if(err) throw err;
		collectionS = db.collection('tesla_stream');
		collectionA = db.collection('tesla_aux');
	});
} else {
	var stream = fs.createWriteStream(argv.file);
}

function tsla_poll( vid, long_vid, token ) {
	if (long_vid == undefined || token == undefined) {
		console.log('Error: undefined vehicle_id (' + long_vid +') or token (' + token +')' );
		console.log('Exiting...');
		process.exit(1);
	} else {
		request( 
		{ 
			'uri': s_url + long_vid +'/?values=' + argv.values, 
			'method' : 'GET',
			'auth': {
				'user': argv.username,
				'pass': token
			},
			'timeout' : 125000 // a bit more than the expected 2 minute max long poll
		},  
		function( error, response, body) {
			if ( error ) { // HTTP Error
				if (!argv.silent) { console.log( error ); }
				// put short delay to avoid stack overflow
				setTimeout(function() { 
					tsla_poll( vid, long_vid, token ); // poll again
				}, 1000);
			} else if (response.statusCode == 200) { // HTTP OK
				if (!argv.silent) { console.log(body); }
					tsla_poll( vid, long_vid, token ); // poll again
			} else if ( response.statusCode == 401) { // HTTP AUTH Failed
				if (!argv.silent) {
					console.log('WARN: HTTP 401: Unauthorized - token has likely expired, getting a new one');
				}
				initstream();
			} else {
				if (!argv.silent) {
					console.log('Problem with request:'); 
					console.log('	Response status code = ' + response.statusCode );
					console.log('	Error code = ' + error);
					console.log('Polling again...');
				}
				// put short delay to avoid stack overflow
				setTimeout(function() { 
					tsla_poll( vid, long_vid, token ); // poll again 
				}, 1000);
			}	
		}
		).on('data', function(data) {
			if (argv.db) {
				var d = data.toString().trim();
				var vals = d.split(/[,\n\r]/);
				for (var i = 0; i < vals.length; i += nFields) {
					var record = vals.slice(i, nFields);
					var doc = { 'ts': +vals[i], 'record': record };
					collectionS.insert(doc, { 'safe': true }, function(err,docs) {
						if(err) console.log(err);
					});
//					collectionS.find({ 'ts': +vals[i]}).toArray(function(err, exist){
//						try {
//							if (err || exist == null || exist.length == 0) { // only write entry if it doesn't already exist
//								collectionS.insert(doc, { 'safe': true }, function(err,docs) {
//									if(err) console.log(err);
//								});
//							} else {
//								console.log("had data, not writing it");
//							}
//						} catch (innerError) {
//							console.dir(innerError);
//						}
//					});
				}
			} else {
				stream.write(data);
			}
		});
	} 
}

function getAux() {
	// make absolutely sure we don't overwhelm the API
	if (new Date().getTime() - getAux.lastTime < 30000)
		return;

	teslams.get_charge_state( getAux.vid, function(data) {
		if (data.charging_state == "Charging") {
			var doc = { 'ts': new Date().getTime(), 'chargeState': data };
			collectionA.insert(doc, { 'safe': true }, function(err,docs) {
				if(err) throw err;
			});
		}
	});
	teslams.get_climate_state( getAux.vid, function(data) {
		var ds = JSON.stringify(data);
		if (ds.length > 2 && ds != JSON.stringify(getAux.climate)) {
			getAux.climate = data;
			var doc = { 'ts': new Date().getTime(), 'climateState': data };
			collectionA.insert(doc, { 'safe': true }, function(err,docs) {
				if(err) throw err;
			});
		}
	});
	getAux.lastTime = new Date().getTime();
}

function storeVehicles(vehicles) {
	var doc = { 'ts': new Date().getTime(), 'vehicles': vehicles };
	collectionA.insert(doc, { 'safe': true }, function (err, docs) {
		if (err) console.dir(err);
	});
}

function initdb(vehicles) {
	storeVehicles(vehicles); 
	if (startedAuxPoll == false) {
		startedAuxPoll = true;
		getAux.vid = vehicles.id;
		getAux.lastTime = 0;
		getAux();
		setInterval(getAux, 60000); // also get non-streaming data every 60 seconds
	}
}

function initstream() {
	teslams.vehicles( { email: argv.username, password: argv.password }, function ( vehicles ) {
		if (!argv.silent) { console.log( util.inspect( vehicles) ); }
		if ( typeof vehicles == "undefined" || typeof vehicles.tokens == "undefined" || vehicles.tokens[0] == undefined ) {
			if (!argv.silent) {
				console.log('Warn: no tokens returned, calling wake_up then trying again');
			}
			teslams.wake_up( vehicles.id, function( resp ) {
				//ignore the wake_up() response and try again
				initstream();		
			});
                } else {
			if (argv.db) initdb(vehicles); //only do this if mongodb flag is set
                     	tsla_poll( vehicles.id, vehicles.vehicle_id, vehicles.tokens[0] ); 
		}
        });
}

//this is the main part of this program
if (!argv.silent) { console.log('timestamp,' + argv.values);} //TODO: write this line to outfile for csv 
initstream(); 	//call the REST API in order get login and get the id, vehicle_id, and streaming password token
