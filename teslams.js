var request = require('request');

var portal = 'https://portal.vn.teslamotors.com';
exports.portal = portal;

function vehicles( options, cb ) {
	request( { method: 'POST',
     	   url: portal + '/login',
	   form:{
		"user_session[email]": options.email, 
		"user_session[password]": options.password 
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
					if (data.id == undefined) {
						console.log("Error: Undefined vehicle id");
						return;
					} else if (cb != undefined) {
						return cb( data );
					} else {
						return;
					}
				  }
			)
		} else {
			return error;	
		}
	   }
        );
}
exports.vehicles = vehicles;

function get_vid( options, cb ) {
	request( { method: 'POST',
     	   url: portal + '/login',
	   form:{
		"user_session[email]": options.email, 
		"user_session[password]": options.password 
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
					if (data.id == undefined) {
						console.log("Error: Undefined vehicle id");
						return;
					} else if (cb != undefined) {
						return cb( data.id );
					} else {
						return;
					}
				  }
			)
		} else {
			return error;	
		}
	   }
        );
}
exports.get_vid = get_vid;


function mobile_enabled( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/mobile_enabled', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.mobile_enabled = mobile_enabled;

function get_charge_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/charge_state', function (error, response, body) { 
		try {
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		} catch (err) {
			console.log("Error encountered in get_charge_state() function: " + err);
			return err;
		}
	});
}
exports.get_charge_state = get_charge_state;

function get_climate_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/climate_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.get_climate_state = get_climate_state;

function get_drive_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/drive_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.get_drive_state = get_drive_state;

function get_vehicle_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/vehicle_state', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.get_vehicle_state = get_vehicle_state;

function get_gui_settings( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/gui_settings', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.get_gui_settings = get_gui_settings;

function wake_up( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/wake_up', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nWake up Model S it's time to talk!");
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.wake_up = wake_up;

function open_charge_port( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/charge_port_door_open', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.open_charge_port = open_charge_port;

var CHARGE_OFF   = 0; // changes charge state to ON without effecting range mode
var CHARGE_ON    = 1; // changes charge state to OFF without effecting range mode
function charge_state( params, cb ) {
	var vid = params.id;
	var state = params.charge;
	// Change the range mode if necessary
	if (state == CHARGE_ON  || state == "on" || state == "start" || state == true) { 
		state = "start"; 
	};
	if (state == CHARGE_OFF || state == "off" || state == "stop" || state == false) { 
		state = "stop" 
	};

	if (state == "start" || state == "stop" ) {
		request( portal + '/vehicles/' + vid + '/command/charge_' + state, function (error, response, body) { 
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else {
		console.log( "Error: Invalid charge state = " + state);
	} 
}
exports.charge_state = charge_state;
exports.CHARGE_OFF = CHARGE_OFF;
exports.CHARGE_ON = CHARGE_ON;

var RANGE_STD    = 0; // changes range mode to STANDARD without effecting charge state
var RANGE_MAX    = 1; // changes range mode to MAX_RANGE without effecting charge state
function charge_range( params, cb ) {
	var vid = params.id;
	var range = params.range;
	if (range == RANGE_STD || range == "std" || range == "standard" ) { 
		range = "standard" 
	};
	if (range == RANGE_MAX || range == "max" || range == "max_range") {
		range = "max_range"
	};
	if (range == "standard" || "max_range" ) {
		request( portal + '/vehicles/' + vid + '/command/charge_' + range, function (error, response, body) { 
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return true;
			}
		});
	} else {
		console.log( "Error: Invalid charge range = " + range);
		return false;
	} 
}
exports.charge_range = charge_range;
exports.RANGE_STD = RANGE_STD;
exports.RANGE_MAX = RANGE_MAX;

function flash( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/flash_lights', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return true;
		}
	});
}
exports.flash = flash;

function honk( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/honk_horn', function (error, response, body) { 
		var data = JSON.parse(body); 
		if (cb != undefined) {
			return cb( data );
		} else {
			return;
		}
	});
}
exports.honk = honk;

var LOCK_OFF = 0;
var LOCK_ON  = 1;
function door_lock( params, cb ) {
	var vid = params.id;
	var state = params.lock;
	if (state == "lock" || state == true || state == "on" || state == "close" ) {
		request( portal + '/vehicles/' + vid + '/command/door_lock', function (error, response, body) { 
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else if (state == "unlock" || state == false || state == "off" || state == "open" ) {
		request( portal + '/vehicles/' + vid + '/command/door_unlock', function (error, response, body) { 
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else {
		console.log( "Error: Invalid door lock state = " + state);
	}
}
exports.door_lock = door_lock;
exports.LOCK_OFF = LOCK_OFF;
exports.LOCK_ON = LOCK_ON;

var TEMP_HI = 32;
var TEMP_LO = 17;
function set_temperature( params, cb ) {
	var dtemp = params.dtemp;
	var ptemp = params.ptemp;
	var vid = params.id;
	
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
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else {
		console.log('\nError: Invalid temperature setting (' + dtemp + 'C), Passenger (' + ptemp + 'C)');
	}
}
exports.set_temperature = set_temperature;
exports.TEMP_HI = TEMP_HI;
exports.TEMP_LO = TEMP_LO;

var CLIMATE_OFF = 0;
var CLIMATE_ON  = 1;
function auto_conditioning( params, cb ) {
	var vid = params.id;
	var state = params.climate;
	if (state == CLIMATE_ON) { state = true };
	if (state == CLIMATE_OFF) { state = false };
	if (state == "start" || state == true || state == "on" ) {
		request( portal + '/vehicles/' + vid + '/command/auto_conditioning_start', function (error, response, body) { 
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else if (state == "stop" || state == false || state == "off"  ) {
		request( portal + '/vehicles/' + vid + '/command/auto_conditioning_stop', function (error, response, body) { 
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else {
		console.log( "Error: Invalid auto conditining state = " + state);
	}
}
exports.auto_conditioning = auto_conditioning;
exports.CLIMATE_OFF = CLIMATE_OFF;
exports.CLIMATE_ON = CLIMATE_ON;

var ROOF_CLOSE   = 0;
var ROOF_VENT    = 1;
var ROOF_COMFORT = 2;
var ROOF_OPEN    = 3;
function sun_roof( params, cb ) {
	var vid = params.id;
	var state = params.roof;
	// add a check that  their is a sunroof on the car??
	if (state == ROOF_CLOSE) { state = "close" };
	if (state == ROOF_VENT) { state = "vent" };
	if (state == ROOF_COMFORT) { state = "comfort" };
	if (state == ROOF_OPEN) { state = "open" };
	if (state == "open" || state == "close" || state == "comfort" || state == "vent" ) {
		request( portal +'/vehicles/' + vid + '/command/sun_roof_control?state=' + state, function (error, response, body) {
			var data = JSON.parse(body); 
			if (cb != undefined) {
				return cb( data );
			} else {
				return;
			}
		});
	} else {
		console.log( 'Error: Invalid sun roof state = ' + state);
		console.log( 'Valid sun roof states are "open", "close", "comfort", or "vent"');
	}
}
exports.sun_roof = sun_roof;
exports.ROOF_CLOSE = ROOF_CLOSE;
exports.ROOF_VENT = ROOF_VENT;
exports.ROOF_COMFORT = ROOF_COMFORT;
exports.ROOF_OPEN = ROOF_OPEN;

