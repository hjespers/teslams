#!/usr/bin/env node
var util = require('util');
var teslams = require('../teslams.js');

// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
var fs = require('fs');
try {

	var jsonString = fs.readFileSync("./config.json").toString();
	var config = JSON.parse(jsonString);
	var creds = { 
		email: config.username, 
		password: config.password 
	};
} catch (err) {
	console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
	process.exit(1);
}


// Generic callback function to print the return value
function pr( stuff ) {
	console.log( util.inspect( stuff ) );
}

teslams.get_vid( { email: creds.email, password: creds.password }, function ( vid ) {
	if (vid == undefined) {
		console.log("Error: Undefined vehicle id");
	} else {
		//
		// Remember NODE is all async non-blocking so all these requests go in parallel
		//
		// not needed for REST API but test all known REST functions anyway
		//
		teslams.wake_up( vid, pr );
		//
		// get some info
		//
		teslams.mobile_enabled( vid, pr );
		teslams.get_charge_state( vid, pr );
		teslams.get_climate_state( vid, pr );
		teslams.get_drive_state( vid, pr );
		teslams.get_vehicle_state( vid, pr );
		teslams.get_gui_settings( vid, pr );
		//
		//  cute but annoying stuff while debugging
		//
		//teslams.flash( vid, pr ); 
		//teslams.honk( vid, pr ); 
		//teslams.open_charge_port( vid, pr ) 
		//
		// control some stuff
		//
		teslams.door_lock( { id: vid, lock: teslams.LOCK_ON }, pr );
		teslams.sun_roof( { id: vid, roof: teslams.ROOF_CLOSE }, pr );
		teslams.auto_conditioning( { id: vid, climate: teslams.CLIMATE_OFF }, pr ); 
		teslams.charge_range( { id: vid, range: teslams.RANGE_STD }, pr ); 
		teslams.charge_state( { id: vid, charge: teslams.CHARGE_ON }, pr ); 
		teslams.set_temperature( { id: vid, dtemp: 20 }, pr ); 
		// teslams.set_temperature( { id: vid, dtemp: teslams.TEMP_LO , ptemp: teslams.TEMP_HI }, pr ); 
	}
  }
);
