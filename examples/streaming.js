#!/usr/bin/env node
var request = require('request');
var teslams = require('../teslams.js');
var fs = require('fs');
var util = require('util');
var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password> [--file <filename>] [--silent]')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.demand('u')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.demand('p')
	.alias('s', 'silent')
	.describe('s', 'Silent mode: no output to console')
	.boolean(['s'])
	.alias('f', 'file')
	.describe('f', 'Comma Separated Values (CSV) output file. Defaults to streaming.out')
	.default('f', 'streaming.out')
	.alias('v', 'values')
	.describe('v', 'List of values to collect')
	.default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range')
<<<<<<< HEAD
=======
	//.default('v', 'speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state,range,est_range,heading')
>>>>>>> 93d8dba290d8530f6c5e2f15344468f00859ebf5
	.alias('?', 'help')
	.describe('?', 'Print usage information')
	.argv;
if ( argv.help == true ) {
	console.log( 'Usage: streaming.js -u <username> -p <password> -f <output_file>');
	process.exit(1);
}
var p_url = 'https://portal.vn.teslamotors.com/vehicles/';
var s_url = 'https://streaming.vn.teslamotors.com/stream/';

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
		).pipe(fs.createWriteStream( argv.file, {'flags': 'a'} ));
	} 
}

function initstream() {
	teslams.vehicles( { email: argv.username, password: argv.password }, function ( vehicles ) {
		if (!argv.silent) { console.log( util.inspect( vehicles) ); }
		if ( vehicles.tokens[0] == undefined ) {
			console.log('Warn: no tokens returned, calling wake_up then trying again');
			teslams.wake_up( vehicles.id, function( resp ) {
				//ignore the wake_up() response and try again
				initstream();		
			});
                } else {
                     	tsla_poll( vehicles.id, vehicles.vehicle_id, vehicles.tokens[0] ); 
		}
        });
}

//this is the main part of this program
fs.createWriteStream( argv.file ); //create the output file
if (!argv.silent) { console.log('timestamp,' + argv.values);} //TODO: write this line to outfile for csv 
initstream(); 	//call the REST API in order get login and get the id, vehicle_id, and streaming password token
