#!/usr/bin/env node
var request = require('request');
var teslams = require('../teslams.js');
var fs = require('fs');
var util = require('util');
var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password>')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.demand('u')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.demand('p')
	.alias('o', 'output')
	.describe('o', 'output file')
	.demand('o')
	.alias('?', 'help')
	.describe('?', 'Print usage information')
	.argv;
if ( argv.help == true ) {
	console.log( 'Usage: streaming.js -u <username> -p <password> -o <output_file>');
	process.exit(1);
}
var p_url = 'https://portal.vn.teslamotors.com/vehicles/';
var s_url = 'https://streaming.vn.teslamotors.com/stream/';

function tslastream( vid, long_vid, token ) {
	if (long_vid == undefined || token == undefined) {
		console.log('Error: undefined vehicle_id (' + long_vid +') or token (' + token +')' );
		console.log('Exiting...');
		process.exit(1);
	} else {
	   request( 
		{ 
			'uri': s_url + long_vid +'/?values=speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state', 
			'method' : 'GET',
			'auth': {
				'user': argv.username,
				'pass': token
			}
		},  
		function( error, response, body) {
			if (!error && response.statusCode == 200) {
			        console.log('timestamp,speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state\n'); 
				get_stream( vid, long_vid, token ); // keep calling again and again
        	} 
        	else if ( response.statusCode == 401) {
				console.log('HTTP 401: Unauthorized - token has likely expired, getting a new one');
				request(p_url, function (error, response, body) { 
					var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
					token = data.tokens[0];
					if (token != undefined) {
						console.log('New token = ' + token);
						get_stream( vid, long_vid, token ); // keep calling again and again
					} else {
						console.log('Simple new token fetch returned undefined token');
						request(p_url + vid + '/command/wake_up', function (error, response, body) { 
							var data = JSON.parse(body); 
							console.log("\nWake up!");
							console.log(data);
							request( p_url, function (error, response, body) { 
								var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
								token = data.tokens[0];
								console.log('New token = ' + token);
								tslastream( vid, long_vid, token ); // keep calling again and again
							});
						});
					}
				});
			} 
			else {
               	console.log('Problem with request:'); 
               	console.log('Response status code = ' + response.statusCode );
               	console.log('Error code = ' + error);
				//process.exit(1);
				tslastream( vid, long_vid, token ); // keep calling again and again
         	}	
		}
	   ).pipe(fs.createWriteStream( argv.output, {'flags': 'a'} ));
	} 
}

function initstream() {
	teslams.vehicles( { email: argv.username, 
                    	password: argv.password 
                  	  }, 
                  	  function ( vehicles ) {
                        	console.log( util.inspect( vehicles) );
                        	if ( vehicles.tokens[0] == undefined ) {
								console.log('Warn: no tokens returned, calling wake_up then trying again');
								teslams.wake_up( vehicles.id, function( resp ) {
									initstream();		
								});
                        	} else {
                         		tslastream( vehicles.id, vehicles.vehicle_id, vehicles.tokens[0] ); 
							}
                  	});
}

//create the output file
fs.createWriteStream( argv.output ); 
//call the REST API a few times in order get login and get the id, vehicle_id, and streaming password token
initstream();
