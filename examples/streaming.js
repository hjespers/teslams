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
    '   [--values <value list>] [--maxrpm <#num>] \n' +
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
var lastss = "init"; // last shift state
var ss = "init"; // shift state
var napmode = false; // flag for enabling pause to allow sleep to set in 
var sleepmode = false;
var napTimeoutId;
var sleepIntervalId;
// various instance counters to avoid multiple concurrent instances
var pcount = 0; 
var scount = 0;
var icount = 0;
var ncount = 0;


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
    .alias('N', 'napcheck')
    .describe('N', 'Number of minutes between nap checks')
    .default('N', 1)
    .alias('S', 'sleepcheck')
    .describe('S', 'Number of minutes between sleep checks')
    .default('S', 1)
    .alias('v', 'values')
    .describe('v', 'List of values to collect')
    .default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range,heading')
    .alias('?', 'help')
    .describe('?', 'Print usage information');

// get credentials either from command line or ~/.teslams/config.json
var creds = require('./config.js').config(argv);

argv = argv.argv;
argv.napcheck *= 60000;
argv.sleepcheck *= 60000;

if ( argv.help == true ) {
    console.log(usage);
    process.exit(1);
}

var nFields = argv.values.split(",").length + 1; // number of fields including ts

if (argv.db) {
    console.log("database name", argv.db);
    MongoClient = require('mongodb').MongoClient;
    var mongoUri = process.env.MONGOLAB_URI|| process.env.MONGOHQ_URI || 'mongodb://127.0.0.1:27017/' + argv.db;

    MongoClient.connect(mongoUri, function(err, db) {
        if(err) throw err;
        collectionS = db.collection('tesla_stream');
        collectionA = db.collection('tesla_aux');
    });
} else {
    stream = fs.createWriteStream(argv.file);
}

function tsla_poll( vid, long_vid, token ) {    
    pcount++;
    if ( pcount > 1 ) {
        ulog('Too many pollers running, exiting this one');
        pcount = pcount - 1;
        return;
    }   
    if (napmode) {
        ulog('Info: car is napping, skipping tsla_poll()');
        pcount = pcount - 1;
        return;
    } 
    if (long_vid == undefined || token == undefined) {
        console.log('Error: undefined vehicle_id (' + long_vid +') or token (' + token +')');
        console.log('Exiting...');
        process.exit(1);
    } 
    var now = new Date().getTime();
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
            }, 60000);  // 1 minute
            pcount = pcount - 1;
            return;
        }   
    } else { // longer than a minute since last request
        srpm = 0;
        slast = now;
    }
    //napmode checking
    if ( argv.zzz == true && lastss == "" && ss == "") {
        //if not charging stop polling for 30 minutes
        rpm++;
        teslams.get_charge_state( vid, function (cs) { 
            if (cs.charging_state == 'Charging') {
                ulog('Info: car is charging, continuing to poll for data');
            } else {
                if (ncount == 0) {
                    ncount++;               
                    ulog('Info: 30 minute nap starts now');
                    napmode = true;
                    // 30 minutes of nap mode to let the car fall asleep        
                    napTimeoutId = setTimeout(function() { 
                        ncount = 0;
                        clearInterval(sleepIntervalId);
                        scount = 0;
                        napmode = false;
                        ss = 'nap';
                        lastss = 'nap';
                        initstream();
                    }, 1800000);    // 30 minute of nap time
                } else {
                    ulog('Debug: (' + ncount + ') Nap timer is already running. Not starting another');
                }
                // check if sleep has set in every minute (default) 
                if (scount == 0) {
                    scount++;
                    sleepIntervalId = setInterval(function() {
                        if (napmode == true) {
                            rpm++;
                            teslams.vehicles( { email: creds.username, password: creds.password }, function ( vehicles ) {  
                                if ( typeof vehicles.state != undefined ) {
                                    ulog( 'Vehicle state is: ' + vehicles.state );
                                    if (vehicles.state == 'asleep' || vehicles.state == 'unknown') {
                                        ulog( 'Stopping nap mode since car is now in (' + vehicles.state + ') state' );
                                        clearTimeout(napTimeoutId);
                                        ncount = 0;
                                        clearInterval(sleepIntervalId);
                                        scount = 0;
                                        napmode = false;
                                        ss = 'sleep';
                                        lastss = 'sleep';
                                        initstream();
                                    }
                                } else {
                                    ulog( 'Nap checker: undefined vehicle state' );
                                }
                            });
                        }                   
                    }, argv.sleepcheck); // every 1 minute  (default)
                } else {
                    ulog('Debug: (' + scount + ') Sleep checker is already running. Not starting another');
                }
            }
        });
        // need to check again if nap mode flag had been changed above
        // [HJ] added some code to the .on('data') function below to detect and cancel 
        // nap mode if the car starts driving again.
        if (napmode == true) {
            ulog('Info: code just entered nap mode but we will start one last poll');
            // [HJ]
            // ulog('Info: code just entered nap mode canceling long poll');
            // pcount = pcount - 1;
            // return;
        } 
    }
    srpm++; //increment the number of streaming requests per minute
    request({'uri': s_url + long_vid +'/?values=' + argv.values,
            'method' : 'GET',
            'auth': {'user': creds.username,'pass': token},
            'timeout' : 125000 // a bit more than the expected 2 minute max long poll
            }, function( error, response, body) {
        if ( error ) { // HTTP Error
            ulog( 'Polling again because poll returned HTTP error:' + error );
            // put short delay to avoid infinite recursive loop and stack overflow
            setTimeout(function() {
                tsla_poll( vid, long_vid, token ); // poll again
            }, 10000);
            pcount = pcount - 1;
            return;
        } else if (response.statusCode == 200) { // HTTP OK
            if (body===undefined) {
                ulog('WARN: HTTP returned OK but body is undefined');
                setTimeout(function() {
                    tsla_poll( vid, long_vid, token ); // poll again
                }, 10000); //10 seconds
                pcount = pcount - 1;
                return;
            } else if (body===null) {
                ulog('WARN: HTTP returned OK but body is null');
                setTimeout(function() {
                    tsla_poll( vid, long_vid, token ); // poll again
                }, 10000); // 10 seconds
                pcount = pcount - 1;
                return;
            } else {
                ulog('Poll return HTTP OK and body is this:\n' + body);
                // put short delay to avoid infinite recursive loop and stack overflow
                setTimeout(function() {
                    tsla_poll( vid, long_vid, token ); // poll again
                }, 1000); // 1 second
                pcount = pcount - 1;
                return;
            }
        } else if ( response.statusCode == 401) { // HTTP AUTH Failed
            ulog('WARN: HTTP 401: Unauthorized - token has likely expired, reinitializing');
            setTimeout(function() {
                initstream();
            }, 1000); //1 seconds
            pcount = pcount - 1;
            return;
        } else { // all other unexpected responses
            ulog('Unexpected problem with request:\n    Response status code = ' + response.statusCode + '  Error code = ' + error + '\n Polling again in 10 seconds...');
            // put short delay to avoid infinite recursive loop and stack overflow
            setTimeout(function() {
                tsla_poll( vid, long_vid, token ); // poll again
            }, 10000); // 10 seconds
            pcount = pcount - 1;
            return;
        }
    }).on('data', function(data) {
        // TODO: parse out shift_state field and assign to a global for better sleep checking
        var d, vals, i, record, doc;              
		d = data.toString().trim();
		vals = d.split(/[,\n\r]/);
		//check we have a valid timestamp to avoid interpreting corrupt stream data             
		if ( isNaN(vals[0]) || vals[0] < 1340348400000) { //tesla epoch
			ulog('Bad timestamp (' + vals[0] + ')' );
		} else {
            if (argv.db) {
            
                //for (i = 0; i < vals.length; i += nFields) { // seems unecessary and loops once anyway
                
                record = vals.slice(0, nFields);
                	doc = { 'ts': +vals[0], 'record': record };
                	collectionS.insert(doc, { 'safe': true }, function(err,docs) {
                        if(err) util.log(err);
                	});   
                	
                //}
                
                lastss = ss; 
                ss = vals[9]; // TODO: fix hardcoded position for shift_state
                // [HJ] this section goes with the code above which allows one last poll
                // after entering nap mode. If this turns out to cause other problems
                // remove this nap cancel section AND switch back to disabling this
                // final poll
                if (napmode == true && ss != '') {
                    //cancel nap mode           
                    ulog('Info: canceling nap mode because shift_state is now (' + ss + ')'); 
                    clearTimeout(napTimeoutId);
                    ncount = 0;
                    clearInterval(sleepIntervalId);
                    scount = 0;
                    napmode = false;
                    ss = 'abort';
                    lastss = 'abort';
                    initstream();
                }
            } else {
                  stream.write(data);
            }
        }
    });     
}

function getAux() {
    // make absolutely sure we don't overwhelm the API
    var now = new Date().getTime();
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
    // check if the car is napping
    if (napmode || sleepmode) {
        ulog('Info: car is napping or sleeping, skipping auxiliary REST data sample');
        //TODO add periodic /vehicles state check to see if nap mode should be cancelled because car is back online again
        return;
    } else {
        rpm = rpm + 2; // increase REST request counter by 2 for following requests
        ulog( 'getting charge state Aux data');
        teslams.get_charge_state( getAux.vid, function(data) {
            var doc = { 'ts': new Date().getTime(), 'chargeState': data };
            collectionA.insert(doc, { 'safe': true }, function(err,docs) {
                if(err) throw err;
            });
        });
        ulog( 'getting climate state Aux data');
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
}


function storeVehicles(vehicles) {
    var doc = { 'ts': new Date().getTime(), 'vehicles': vehicles };
    collectionA.insert(doc, { 'safe': true }, function (err, docs) {
        if (err) console.dir(err);
    });
    rpm = rpm + 2; // increment REST request counter for following 2 requests
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
    icount++;
    if ( icount > 1 ) {
        ulog('Debug: Too many initializers running, exiting this one');
        icount = icount - 1;
        return;
    }   
    if (napmode) {
        ulog('Info: car is napping, skipping initstream()');
        icount = icount - 1;
        return;
    } 
    // make absolutely sure we don't overwhelm the API
    var now = new Date().getTime();
    if ( now - last < 60000) { // last request was within the past minute
        ulog( rpm + ' of ' + argv.maxrpm + ' REST requests since ' + last);
        if ( now - last < 0 ) {
            ulog('Warn: Clock moved backwards - Daylight Savings Time??');
            rpm = 0;
            last = now;
        } else if (rpm > argv.maxrpm) { // throttle check
            util.log('Warn: throttling due to too many REST API requests');
            setTimeout(function() { 
                initstream(); 
            }, 60000); // 1 minute
            icount = icount - 1;
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
        if (vehicles.state == undefined) {
            ulog( util.inspect( vehicles) ); // teslams.vehicles call could return and error string
        }
        if (argv.zzz && vehicles.state != 'online') { //respect sleep mode
            var timeDelta = Math.floor(argv.napcheck / 60000) + ' minutes';
            if (argv.napcheck % 60000 != 0) {
                timeDelta += ' ' + Math.floor((argv.napcheck % 60000) / 1000) + ' seconds';
            }
            ulog('Info: car is in (' + vehicles.state + ') state, will check again in ' + timeDelta);
            napmode = true;
            // wait for 1 minute (default) and check again if car is asleep
            setTimeout(function() { 
                napmode = false;
                sleepmode = true;
                initstream();
            }, argv.napcheck); // 1 minute (default)
            icount = icount - 1;
            return;     
        } else if ( typeof vehicles.tokens == "undefined" || vehicles.tokens[0] == undefined ) {
            ulog('Info: car is in (' + vehicles.state + ') state, calling /charge_state to reveal the tokens');
            rpm++;  // increment the REST API request counter           
            teslams.get_charge_state( vehicles.id, function( resp ) {
                if ( resp.charging_state != undefined ) {
                    // returned valid response so re-initialize right away
                    ulog('Debug: charge_state request succeeded (' + resp.charging_state + '). \n  Reinitializing...');
                    setTimeout(function() { 
                        initstream(); 
                    }, 1000); // 1 second
                    icount = icount - 1;
                    return;
                } else {
                    ulog('Warn: waking up with charge_state request failed.\n  Waiting 30 secs and then reinitializing...');
                    // charge_state failed. wait 30 seconds before trying again to reinitialize
                    // no need to set napmode = true because we are trying to wake up anyway
                    setTimeout(function() { 
                        initstream(); 
                    }, 30000);   // 30 seconds    
                    icount = icount - 1;
                    return;       
                } 
            }); 
        } else { // this is the valid condition so we have the required tokens and ids
            sleepmode = false;
            if (firstTime) {    // initialize only once
                firstTime = false;
                if (argv.db) { // initialize database
                    initdb(vehicles);
                } else { // initialize first line of CSV file output with field names 
                    stream.write('timestamp,' + argv.values + '\n');
                }
            }
            tsla_poll( vehicles.id, vehicles.vehicle_id, vehicles.tokens[0] );
            icount = icount - 1;
            return;
        }
    }); // end of teslams.vehicles() request
}

// this is the main part of this program
// call the REST API in order get login and get the id, vehicle_id, and streaming password token
ulog('timestamp,' + argv.values);
initstream();
