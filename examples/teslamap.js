#!/usr/bin/env node
var request = require('request');
var util = require('util');
var open = require('open');
var teslams = require('../teslams');
var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password> [--json || --url || --kml] [--map]')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.demand('u')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.demand('p')
	.boolean(['j'])
	.describe('j', 'Display the drive state info in JSON format')
	.alias('j', 'json')
	.boolean(['m'])
	.describe('m', 'Display the location of the car using Google Maps (in the default browser)')
	.alias('m', 'map')
	.boolean(['k'])
	.describe('k', 'Print out the location of the car in KML format')
	.alias('k', 'kml')
	.boolean(['U'])
	.describe('U', 'Print a URL to google maps on the console')
	.alias('U', 'url')
	.describe('?', 'Print usage information')
	.alias('?', 'help')
	.argv;


if ( argv.help == true ) {
	console.log( 'Usage: teslamap.js -u <username> -p <password> [--json || --url || --kml] [--map]');
	process.exit(1);
}

var creds = { 
	email: argv.username, 
	password: argv.password 
};

function ds( state ) {
	if (state.latitude != undefined) {
		if (argv.json) {
			console.log( util.inspect(state) );
		} else if (argv.url) {
			console.log('https://maps.google.com/maps?q=' + state.latitude + ',' + state.longitude);
		} else if (argv.kml) {
			console.log('<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">');
			console.log('\t<Placemark>\n\t\t<name>My Tesla</name>\n\t\t<description>My Tesla Model S</description>');
			console.log('\t\t<Point>\n\t\t\t<coordinates>' + state.longitude + ',' + state.latitude + '</coordinates>');
			console.log('\t\t</Point>\n\t</Placemark>\n</kml>');
		} else {
			console.log( state.latitude + ',' + state.longitude); 
		}
		if (argv.map) {
			open('https://maps.google.com/maps?q=' + state.latitude + ',' + state.longitude);
		}
	} else {
		console.log( 'Error: undefined drive state returned from Tesla. Try again.');
	} 
}

//
// Login, get cookies, and figure out the vehicle ID (vid) for subsequent queries
//
var mytesla = request( { method: 'POST',
     url: teslams.portal + '/login',
	   form:{
		"user_session[email]": creds.email, 
		"user_session[password]": creds.password 
	   }}, 
	   function (error, response, body) {
		if (!error) {
			request(teslams.portal + '/vehicles', function (error, response, body) 
				  { 
					if ( body.substr(0,1) != "[" ) {
						console.log(' login failed, please edit this program to include valid login/password');
						process.exit( 1 );
					}
					var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
					if (argv.id) {
						console.log('Vehicle List:');
						console.log(data);
					}
					mytesla.id = data.id;
					if (mytesla.id == undefined) {
						console.log("Error: Undefined vehicle id");
					} else {
						teslams.get_drive_state( mytesla.id, ds );
					}
				  }
			)
		}	
	   }
        );


