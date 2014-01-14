var request = require('request');
var util = require('util');

var portal = 'https://portal.vn.teslamotors.com';
exports.portal = portal;

var report = function(error, response, body, cb) {
  if (!!cb) cb(error || (new Error(response.statusCode + ': ' + body)));
};

// backwards-compatible with previous API
// all() gives the callback the raw response to the /vehicles call
// vehicles gives the callback the first vehicle in the array returned
// get_vid gives the callback the ID of the first vehicle in the array returned
var all = exports.all = function(options, cb) {
  if (!cb) cb = function(error, response, body) {/* jshint unused: false */};

  request({ method                     : 'POST',
            url                        : portal + '/login',
            form                       :
            { "user_session[email]"    : options.email,
              "user_session[password]" : options.password
            }
          }, function (error, response, body) {
    if ((!!error) || ((response.statusCode !== 200) && (response.statusCode !== 302))) return report(error, response, body, cb);
    request(portal + '/vehicles', cb);
  });
};

// returns first vehicle in list
var vehicles = exports.vehicles = function(options, cb) {
  if (!cb) cb = function(data) {/* jshint unused: false */};

  all(options, function (error, response, body) {
    var data;

    try { data = JSON.parse(body); } catch(err) { return cb(new Error('login failed')); }
    if (!util.isArray(data)) return cb(new Error('expecting an array from Tesla Motors cloud service'));
    data = data[0];
    cb((!!data.id) ? data : (new Error('expecting vehicle ID from Tesla Motors cloud service')));
  });
};

// returns ID of first vehicle in list
exports.get_vid = function(options, cb) {
  vehicles(options, function(data) {
    if (!!data.id) data = data.id;
    if (!!cb) cb(data);
  });
};


function mobile_enabled( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/mobile_enabled', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to mobile_enabled request') );  
			else return false;
		}
	});
}
exports.mobile_enabled = mobile_enabled;

function get_charge_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/charge_state', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to charge_state request') );  
			else return false;
		}
	});
}
exports.get_charge_state = get_charge_state;

function get_climate_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/climate_state', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to climate_state request') );  
			else return false;
		}
	});
}
exports.get_climate_state = get_climate_state;

function get_drive_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/drive_state', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to drive_state request') );  
			else return false;
		}
	});
}
exports.get_drive_state = get_drive_state;

function get_vehicle_state( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/vehicle_state', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to vehicle_state request') );  
			else return false;
		}
	});
}
exports.get_vehicle_state = get_vehicle_state;

function get_gui_settings( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/gui_settings', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to gui_settings request') );  
			else return false;
		}
	});
}
exports.get_gui_settings = get_gui_settings;

function wake_up( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/wake_up', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to wake_up request') );  
			else return false;
		}
	});
}
exports.wake_up = wake_up;

function open_charge_port( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/charge_port_door_open', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to charge_port_door_open request') );  
			else return false;
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
	if (state == CHARGE_ON  || state == "on" || state == "start" || state === true ) { 
		state = "start"; 
	}
	if (state == CHARGE_OFF || state == "off" || state == "stop" || state === false ) { 
		state = "stop";
	}

	if (state == "start" || state == "stop" ) {
		request( portal + '/vehicles/' + vid + '/command/charge_' + state, function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to charge_' + state + ' request') );  
				else return false;
			}
		});
	} else {
		if (typeof cb == 'function') return cb( new Error("Invalid charge state = " + state));  
		else return false;
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
	var percent = params.percent;
	if (range == RANGE_STD || range == "std" || range == "standard" ) { 
		range = "standard";
	}
	if (range == RANGE_MAX || range == "max" || range == "max_range") {
		range = "max_range";
	}
	if (range == "standard" || range == "max_range" ) {
		request( portal + '/vehicles/' + vid + '/command/charge_' + range, function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to charge_' + range + ' request') );  
				else return false;
			}
		});
	} else if ( range == "set" && (percent >= 50) && (percent <= 100) ) {
		request( portal + '/vehicles/' + vid + '/command/set_charge_limit?state=set&percent='  + percent, function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to set_charge_limit request') );  
				else return false;
			}
		});
	} else {
		if (typeof cb == 'function') return cb( new Error("Invalid charge range = " + range));  
		else return false;
	} 
}
exports.charge_range = charge_range;
exports.RANGE_STD = RANGE_STD;
exports.RANGE_MAX = RANGE_MAX;

function flash( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/flash_lights', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to flash_lights request') );  
			else return false;
		}
	});
}
exports.flash = flash;

function honk( vid, cb ) {
	request( portal + '/vehicles/' + vid + '/command/honk_horn', function (error, response, body) { 
		if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
		try {
			var data = JSON.parse(body); 
			if (typeof cb == 'function') return cb( data );  
			else return true;
		} catch (err) {
			if (typeof cb == 'function') return cb( new Error('expecting JSON response to honk_horn request') );  
			else return false;
		}
	});
}
exports.honk = honk;

var LOCK_OFF = 0;
var LOCK_ON  = 1;
function door_lock( params, cb ) {
	var vid = params.id;
	var state = params.lock;
	if (state == "lock" || state === true || state == "on" || state == "close" ) {
		request( portal + '/vehicles/' + vid + '/command/door_lock', function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to door_lock request') );  
				else return false;
			}
		});
	} else if (state == "unlock" || state === false || state == "off" || state == "open" ) {
		request( portal + '/vehicles/' + vid + '/command/door_unlock', function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to door_unlock request') );  
				else return false;
			}
		});
	} else {
		if (typeof cb == 'function') return cb( new Error("Invalid door lock state = " + state));  
		else return false;
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
	var error = false;
	
	var temp_str = "";
	if ( dtemp !== undefined && dtemp <= TEMP_HI && dtemp >= TEMP_LO) {
		temp_str = 'driver_temp=' + dtemp;
	} else {
		error = true;
	}
	// if no passenger temp is passed, the driver temp is also used as the passenger temp
	if ( ptemp !== undefined && ptemp <= TEMP_HI && ptemp >= TEMP_LO) {
		temp_str = temp_str +'&passenger_temp=' + ptemp;
	} else if ( ptemp === undefined ) {
		ptemp = dtemp;
		temp_str = temp_str +'&passenger_temp=' + dtemp;
	} else {
		error = true;
	}
	if (!error) {
		request( portal + '/vehicles/' + vid + '/command/set_temps?' + temp_str, function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to set_temps request') );  
				else return false;
			}
		});
	} else {
		if (typeof cb == 'function') return cb( new Error('Invalid temperature setting (' + dtemp + 'C), Passenger (' + ptemp + 'C)'));  
		else return false;
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
	if (state == CLIMATE_ON) { state = true; }
	if (state == CLIMATE_OFF) { state = false; }
	if (state == "start" || state === true || state == "on" ) {
		request( portal + '/vehicles/' + vid + '/command/auto_conditioning_start', function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to auto_conditioning_start request') );  
				else return false;
			}
		});
	} else if (state == "stop" || state === false || state == "off"  ) {
		request( portal + '/vehicles/' + vid + '/command/auto_conditioning_stop', function (error, response, body) { 
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to auto_conditioning_stop request') );  
				else return false;
			}
		});
	} else {
		if (typeof cb == 'function') return cb( new Error("Invalid auto conditioning state = " + state));  
		else return false;
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
	var percent = params.percent;
	// add a check that  their is a sunroof on the car??
	if (state == ROOF_CLOSE) { state = "close"; }
	if (state == ROOF_VENT) { state = "vent"; }
	if (state == ROOF_COMFORT) { state = "comfort"; }
	if (state == ROOF_OPEN) { state = "open"; }
	if (state == "open" || state == "close" || state == "comfort" || state == "vent") {
		request( portal +'/vehicles/' + vid + '/command/sun_roof_control?state=' + state, function (error, response, body) {
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to sun_roof_control request') );  
				else return false;
			}
		});
	} else if ( (state == "move") && (percent >= 0) && (percent <= 100) ) {
		
		request( portal +'/vehicles/' + vid + '/command/sun_roof_control?state=move&percent=' + percent, function (error, response, body) {
			if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
			try {
				var data = JSON.parse(body); 
				if (typeof cb == 'function') return cb( data );  
				else return true;
			} catch (err) {
				if (typeof cb == 'function') return cb( new Error('expecting JSON response to sun_roof_control move request') );  
				else return false;
			}
		});
	} else {
		if (typeof cb == 'function') return cb( new Error("Invalid sun roof state " + util.inspect(params)));  
		else return false;
	}
}
exports.sun_roof = sun_roof;
exports.ROOF_CLOSE = ROOF_CLOSE;
exports.ROOF_VENT = ROOF_VENT;
exports.ROOF_COMFORT = ROOF_COMFORT;
exports.ROOF_OPEN = ROOF_OPEN;

// Streaming API stuff is below. Everything above is the REST API 
//
// Required options to teslams.stream() are { 
//              email: 'your teslamotors.com login', 
//              password: 'token returned from a prior call to teslams.vehicles()',
//              vehicle_id: 'Long form vehicle_id returned from a prior call to teslams.vehicles()'
//              a callback that expects ( error, response, body) for the HTTP response
// }
// See examples/examplestream.js for a simple one poll working example of how to use this function
// See examples/streaming.js for a more complicated but useful continuous polling example of streaming

exports.stream_columns = [ 'speed',
                           'odometer',
                           'soc',
                           'elevation',
                           'est_heading',
                           'est_lat',
                           'est_lng',
                           'power',
                           'shift_state',
                           'range',
                           'est_range',
                           'heading'
                          ];

exports.stream = function(options, cb) {
  if (!cb) cb = function(error, response, body) {/* jshint unused: false */};

  request({ method : 'GET',
            url    : 'https://streaming.vn.teslamotors.com/stream/' + options.vehicle_id + '/?values=' + exports.stream_columns.join(','),
            auth   :
            { user : options.email,
              pass : options.password
            }
          }, cb);
};
