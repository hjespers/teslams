#!/usr/bin/env node
var teslams = require('../teslams.js');
var util = require('util');
var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password>')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.demand('u')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.demand('p')
	.alias('?', 'help')
	.describe('?', 'Print usage information')
	.argv;

if ( argv.help == true ) {
	console.log( 'Usage: get_vehicle_state.js -u <username> -p <password>');
	process.exit(1);
}

teslams.get_vid( { email: argv.username, password: argv.password }, function ( id ) {
	teslams.get_vehicle_state( id , function ( state) {
		console.log( util.inspect( state ) );
	});
}); 
