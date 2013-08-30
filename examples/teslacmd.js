#!/usr/bin/env node
var util = require('util');
var teslams = require('../teslams.js');
var argv = require('optimist')
	.usage('Usage: $0 -u <username> -p <password> -cdFgHimPtvw -A [on|off] -C [start|stop] -R [std|max|50-100] -S [close|vent|comfort|open|0-100] -L [lock|unlock] -T temp')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.boolean(['c', 'd', 'F', 'g', 'H', 'i', 'm', 'P', 't', 'v', 'w'])
	.describe('c', 'Display the charge state')
	.describe('d', 'Display the drive state')
	.alias('d', 'drive')
	.describe('F', 'Flash the car headlights')
	.alias('F', 'flash')
	.describe('g', 'Display the GUI settings')
	.alias('g', 'gui')
	.alias('H', 'honk')
	.describe('H', 'Honk the car horn')
	.alias('i', 'id')
	.describe('i', 'Print vehicle identification')
	.describe('m', 'Display the mobile state')
	.alias('m', 'mobile')
	.describe('P', 'Open charge port door')
	.alias('P', 'port')
	.describe('t', 'Display the climate/temp state')
	.describe('v', 'Display the vehicle state')
	.alias('w', 'wake')
	.describe('w', 'Wake up the car telemetry')
	.alias('R', 'range')
	.describe('R', 'Charging range mode: "std" or "max"')
	.alias('S', 'roof')
	.describe('S', 'Move the car sunroof to: "close", "vent", "comfort", "open" or any percent')
	.alias('T', 'temp')
	.describe('T', 'Set the car climate control temperature (in Celcius)')
	.alias('L', 'lock')
	.describe('L', 'Lock/Unlock the car doors')
	.alias('A', 'climate')
	.describe('A', 'Turn the air conditioning and heating on/off')
	.alias('C', 'charge')
	.describe('C', 'Turn the charging on/off')
	.alias('?', 'help')
	.describe('?', 'Print usage information');


// get credentials either from command line or config.json in ~/.teslams/config.js
var creds = require('./config.js').config(argv);
argv = argv.argv;

if ( argv.help == true ) {
	console.log( 'Usage: teslacmd.js -u <username> -p <password> -cdFgHimPtvw');
	console.log( '                   -A [on|off] -C [start|stop] -R [std|max|50-100]');
	console.log( '                   -S [close|vent|comfort|open|0-100] -L [lock|unlock] -T temp');
	console.log( '\nOptions:');
	console.log( '  -u, --username  Teslamotors.com login                                                       [required]');
	console.log( '  -p, --password  Teslamotors.com password                                                    [required]');
	console.log( '  -c              Display the charge state                                                    [boolean]');
	console.log( '  -d, --drive     Display the drive state                                                     [boolean]');
	console.log( '  -F, --flash     Flash the car headlights                                                    [boolean]');
	console.log( '  -g, --gui       Display the GUI settings                                                    [boolean]');
	console.log( '  -H, --honk      Honk the car horn                                                           [boolean]');
	console.log( '  -m, --mobile    Display the mobile state                                                    [boolean]');
	console.log( '  -P, --port      Open charge port door                                                       [boolean]');
	console.log( '  -t              Display the climate/temp state                                              [boolean]');
	console.log( '  -v              Display the vehicle state                                                   [boolean]');
	console.log( '  -i, --id        Print vehicle identification "--no-i" for silent mode                       [boolean]  [default: true]');
	console.log( '  -w, --wake      Wake up the car telemetry                                                   [boolean]');
	console.log( '  -R, --range     Charging range mode: "std" or "max" or any percent from 50-100            ');
	console.log( '  -S, --roof      Move the car sunroof to: "close", "vent", "comfort", "open" or any percent');
	console.log( '  -T, --temp      Set the car climate control temperature (in Celcius)                      ');
	console.log( '  -L, --lock      Lock/Unlock the car doors                                                 ');
	console.log( '  -A, --climate   Turn the air conditioning and heating on/off                              ');
	console.log( '  -C, --charge    Turn the charging on/off                                                  ');
	console.log( '  -?, --help      Print usage information                                                   ');
	process.exit(1);
}

function pr( stuff ) {
	console.log( util.inspect(stuff) );
}


//teslams.get_vid( { email: creds.username, password: creds.password }, function ( vid ) {
teslams.vehicles( { email: creds.username, password: creds.password }, function ( vehicle ) {
	vid = vehicle.id;
	if (vid == undefined) {
		console.log("Error: Undefined vehicle vid");
		process.exit(1);
	} else {
		if (argv.i) {
			pr( vehicle);
		}
		// wake up the car's telematics system
		if (argv.w) {
			teslams.wake_up( vid, pr );
		}
		//
		// get some info
		//
		if (argv.m) {
			teslams.mobile_enabled( vid, pr );
		}
		if (argv.c) {
			teslams.get_charge_state( vid, pr );
		}
		if (argv.t) {
			teslams.get_climate_state( vid, pr );
		}
		if (argv.d) {
			teslams.get_drive_state( vid, pr );
		}
		if (argv.v) {
			teslams.get_vehicle_state( vid, pr );
		}
		if (argv.g) {
			teslams.get_gui_settings( vid, pr );
		}
		//
		//  cute but annoying stuff while debugging
		//
		if (argv.F) {
			teslams.flash( vid, pr ); 
		}
		if (argv.H) {
			teslams.honk( vid, pr ); 
		}
		if (argv.P) {
			teslams.open_charge_port( vid, pr ) 
		}
		//
		// control some stuff
		//
		if ( argv.lock != undefined ) {
			teslams.door_lock( {id: vid, lock: argv.lock }, pr );
		}
		if ( argv.roof != undefined ) {
			if ( argv.roof >= 0 && argv.roof <= 100 ) {
				teslams.sun_roof( {id: vid, roof: 'move', percent: argv.roof }, pr );
			} else if (argv.roof == "open" || argv.roof == "close" || argv.roof == "comfort" || argv.roof == "vent") {
				teslams.sun_roof( {id: vid, roof: argv.roof }, pr );
			} else {
				var err = new Error("Invalid sun roof state. Specify 0-100 percent, 'open', 'close', 'comfort' or 'vent'");
				return pr( err );			
			}
		}
		if ( argv.climate != undefined ) {
			teslams.auto_conditioning( { id: vid, climate: argv.climate}, pr ); 
		}
		if ( argv.range != undefined ) {
			if ( argv.range >= 50 && argv.range <= 100 ) {
				teslams.charge_range( { id: vid, range: 'set', percent: argv.range }, pr );
			} else {
				teslams.charge_range( { id: vid, range: argv.range }, pr ); 
			}
		}
		if ( argv.charge != undefined ) {
			if (argv.charge == "start" || argv.charge == "stop" ) {
				teslams.charge_state( { id: vid, charge: argv.charge }, pr ); 
			} else {
				var err = new Error("Invalid charge state. Use 'start' or 'stop'");
				return pr( err );
			}
		}
		if ( argv.temp != undefined ) {
			if ( argv.temp <= teslams.TEMP_HI && argv.temp >= teslams.TEMP_LO) {
				teslams.set_temperature( { id: vid, dtemp: argv.temp}, pr); 
			} else {
				var err = new Error("Invalid temperature. Valid range is " + teslams.TEMP_LO + " - " + teslams.TEMP_HI + " C" );
				return pr( err );
			}
		}
	}
});


