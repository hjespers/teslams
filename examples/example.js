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
		// Remember node.js is all async and non-blocking so any uncommented lines below will generate requests in parallel
        // Uncomment too many lines at once and you will get yourself blocked by the Tesla DoS protection systems.
		//
		// teslams.wake_up( vid, pr );
		//
		// get some info
		//
		// teslams.mobile_enabled( vid, pr );
		teslams.get_charge_state( vid, pr );
		// teslams.get_climate_state( vid, pr );
		// teslams.get_drive_state( vid, pr );
		// teslams.get_vehicle_state( vid, pr );
		// teslams.get_gui_settings( vid, pr );
		//
		// cute but annoying stuff while debugging
		//
		// teslams.flash( vid, pr ); 
		// teslams.honk( vid, pr ); 
		// teslams.open_charge_port( vid, pr ) 
		//
		// control some stuff
		//
		// teslams.door_lock( { id: vid, lock: "lock" }, pr );
		// teslams.sun_roof( { id: vid, roof: "close" }, pr );
		// teslams.auto_conditioning( { id: vid, climate: "off" }, pr ); 
		// teslams.charge_range( { id: vid, range: "standard" }, pr ); 
		// teslams.charge_state( { id: vid, charge: "on" }, pr ); 
		// teslams.set_temperature( { id: vid, dtemp: 20 }, pr ); 
	}
  }
);
