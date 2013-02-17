var request = require('request');

// edit the credentials to contain your teslamotors.com login email and password
var creds = { email: "youremail.com", password: "yourpassword" };
var portal = 'https://portal.vn.teslamotors.com';

function mobile_enabled( vid ) {
	request( portal + '/vehicles/' + vid + '/mobile_enabled', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nMobile State:");
		console.log(data);
	});
}

function get_charge_state( vid ) {
	request( portal + '/vehicles/' + vid + '/command/charge_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nCharge State:");
		console.log(data);
	});
}

function get_climate_state( vid ) {
	request( portal + '/vehicles/' + vid + '/command/climate_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nClimate State:");
		console.log(data);
	});
}

function get_drive_state( vid ) {
	request( portal + '/vehicles/' + vid + '/command/drive_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nDrive State:");
		console.log(data);
	});
}

function get_vehicle_state( vid ) {
	request( portal + '/vehicles/' + vid + '/command/vehicle_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nVehicle State:");
		console.log(data);
	});
}

function get_gui_settings( vid ) {
	request( portal + '/vehicles/' + vid + '/command/gui_settings', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nGUI Settings:");
		console.log(data);
	});
}

function wake_up( vid ) {
	request( portal + '/vehicles/' + vid + '/command/wake_up', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nWake up Model S it's time to talk!");
		console.log(data);
	});
}

function open_charge_port( vid ) {
	request( portal + '/vehicles/' + vid + '/command/charge_port_door_open', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nCharge port door open:");
		console.log(data);
	});
}

var CHARGE_OFF   = 0; // changes charge state to ON without effecting range mode
var CHARGE_ON    = 1; // changes charge state to OFF without effecting range mode
function charge_state( vid, state ) {
	// Change the range mode if necessary
	if (state == CHARGE_ON  || state == "start" || state == true) { 
		state = "start"; 
	};
	if (state == CHARGE_OFF || state == "stop" || state == false) { 
		state = "stop" 
	};

	if (state == "start" || state == "stop" ) {
		console.log('sending GET to ' + portal + '/vehicles/' + vid + '/command/charge_' + state);
		request( portal + '/vehicles/' + vid + '/command/charge_' + state, function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nCharge state setting to " + state);
			console.log(data);
		});
	} else {
		console.log( "Error: Invalid charge state = " + state);
	} 
}

var RANGE_STD    = 0; // changes range mode to STANDARD without effecting charge state
var RANGE_MAX    = 1; // changes range mode to MAX_RANGE without effecting charge state
function charge_range( vid, range ) {
	if (range == RANGE_STD || range == "std" || range == "standard" ) { 
		range = "standard" 
	};
	if (range == RANGE_MAX || range == "max" || range == "max_range") {
		range = "max_range"
	};
	if (range == "standard" || "max_range" ) {
		request( portal + '/vehicles/' + vid + '/command/charge_' + range, function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nCharge range set to " + range);
			console.log(data);
		});
	} else {
		console.log( "Error: Invalid charge range = " + range);
	} 
}

function flash( vid ) {
	request( portal + '/vehicles/' + vid + '/command/flash_lights', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nFlasing lights:");
		console.log(data);
	});
}

function honk( vid ) {
	request( portal + '/vehicles/' + vid + '/command/honk_horn', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nHonk horn:");
		console.log(data);
	});
}

var LOCK_OFF = 0;
var LOCK_ON  = 1;
function door_lock( vid, state ) {
	if (state == "lock" || state == true || state == "on" || state == "close" ) {
		request( portal + '/vehicles/' + vid + '/command/door_lock', function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nLocking the doors:");
			console.log(data);
		});
	} else if (state == "unlock" || state == false || state == "off" || state == "open" ) {
		request( portal + '/vehicles/' + vid + '/command/door_unlock', function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nUnlocking the doors:");
			console.log(data);
		});
	} else {
		console.log( "Error: Invalid door lock state = " + state);
	}
}

var TEMP_HI = 32;
var TEMP_LO = 17;
function set_temperature( vid, dtemp, ptemp ) {
	var temp_str = "";
	if ( dtemp != undefined && dtemp <= TEMP_HI && dtemp >= TEMP_LO) {
		temp_str = 'driver_temp=' + dtemp;
	} else {
		var error = true;
	}
	// if no passenger temp is passed, the driver temp is also used as the passenger temp
	if ( ptemp != undefined && ptemp <= TEMP_HI && ptemp >= TEMP_LO) {
		temp_str = temp_str +'&passenger_temp=' + ptemp;
	} else if ( ptemp == undefined ) {
		ptemp = dtemp;
		temp_str = temp_str +'&passenger_temp=' + dtemp;
	} else {
		var error = true;
	}
	if (!error) {
		request( portal + '/vehicles/' + vid + '/command/set_temps?' + temp_str, function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log('\nSetting cabin temperature to Driver (' + dtemp + 'C), Passenger (' + ptemp + 'C)');
			console.log(data);
		});
	} else {
		console.log('\nError: Invalid temperature setting (' + dtemp + 'C), Passenger (' + ptemp + 'C)');
	}
}

var CLIMATE_OFF = 0;
var CLIMATE_ON  = 1;
function auto_conditioning( vid, state ) {
	if (state == CLIMATE_ON) { state = true };
	if (state == CLIMATE_OFF) { state = false };
	if (state == "start" || state == true || state == "on" ) {
		request( portal + '/vehicles/' + vid + '/command/auto_conditioning_start', function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nClimate control changing state to " + state );
			console.log(data);
		});
	} else if (state == "stop" || state == false || state == "off"  ) {
		request( portal + '/vehicles/' + vid + '/command/auto_conditioning_stop', function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nClimate control changing state to " + state );
			console.log(data);
		});
	} else {
		console.log( "Error: Invalid auto conditining state = " + state);
	}
}

var ROOF_CLOSE   = 0;
var ROOF_VENT    = 1;
var ROOF_COMFORT = 2;
var ROOF_OPEN    = 3;
function sun_roof( vid, state ) {
	// add a check that  their is a sunroof on the car??
	if (state == ROOF_CLOSE) { state = "close" };
	if (state == ROOF_VENT) { state = "vent" };
	if (state == ROOF_COMFORT) { state = "comfort" };
	if (state == ROOF_OPEN) { state = "open" };
	if (state == "open" || state == "close" || state == "comfort" || state == "vent" ) {

		console.log('Sending GET to ' + portal + '/vehicles/' + vid + '/command/sun_roof_control?state=' + state);
		request( portal +'/vehicles/' + vid + '/command/sun_roof_control?state=' + state, function (error, response, body) { 
			var data = JSON.parse(body); 
			console.log("\nSun roof changing state to " + state);
			console.log(data);
		});
	} else {
		console.log( 'Error: Invalid sun roof state = ' + state);
		console.log( 'Valid sun roof states are "open", "close", "comfort", or "vent"');
	}
}


// enough with all the functions. Put these in a proper node.js module so they are out of my sight!
// below is an example of how to use these functions
//
// Login, get cookies, and figure out the vehicle ID (vid) for subsequent queries
//
var tesla = request( { method: 'POST',
	   url: portal + '/login',
	   form:{
		"user_session[email]": creds.email, 
		"user_session[password]": creds.password 
	   }}, 
	   function (error, response, body) {
		if (!error) {
			request(portal + '/vehicles', function (error, response, body) 
				  { 
					if ( body.substr(0,1) != "[" ) {
						console.log(' login failed, please edit this program to include valid login/password');
						process.exit( 1 );
					}
					var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
					console.log("\nVehicle List:");
					console.log(data);
					console.log("REST API\nid :" + data.id);
					tesla.id = data.id;
					if (tesla.id == undefined) {
						console.log("Error: Undefined vehicle id");
					} else {
						//
						// Remember NODE is all async non-blocking so all these requests go in parallel
						//
						// not needed for REST API but test all known REST functions anyway
						//
						wake_up( tesla.id );
						//
						// get some info
						//
						mobile_enabled( tesla.id );
						get_charge_state( tesla.id );
						get_climate_state( tesla.id );
						get_drive_state( tesla.id );
						get_vehicle_state( tesla.id );
						get_gui_settings( tesla.id );
						//
						//  cute but annoying stuff while debugging
						//
						//flash( tesla.id ); 
						//honk( tesla.id ); 
						//open_charge_port( tesla.id ) 
						//
						// control some stuff
						//
						door_lock( tesla.id, LOCK_ON );
						sun_roof( tesla.id, ROOF_CLOSE );
						auto_conditioning( tesla.id, CLIMATE_OFF ); 
						charge_range( tesla.id, RANGE_STD ); 
						charge_state( tesla.id, CHARGE_ON ); 
						set_temperature( tesla.id, 20); // automatically set passenger to driver setting
						// set_temperature( tesla.id, TEMP_LO , TEMP_HI ); 
					}
				  }
			)
		}	
	   }
        );
