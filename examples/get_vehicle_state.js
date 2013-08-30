#!/usr/bin/env node
var teslams = require('../teslams.js');
var util = require('util');
var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password>')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.alias('?', 'help')
	.describe('?', 'Print usage information');

// get credentials either from command line or config.json in ~/.teslams/config.js
var creds = require('./config.js').config(argv);

argv = argv.argv;

if ( argv.help == true ) {
	console.log( 'Usage: get_vehicle_state.js -u <username> -p <password>');
	process.exit(1);
}

teslams.get_vid( { email: creds.username, password: creds.password }, function ( id ) {
	teslams.get_vehicle_state( id , function ( state) {
		console.log( util.inspect( state ) );
	});
}); 
