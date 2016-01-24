var request = require('request');
var util = require('util');
var JSONbig = require('json-bigint');
var crypto = require('crypto');

var portal = 'https://owner-api.teslamotors.com/api/1';
exports.portal = portal;
var owner_api = 'https://owner-api.teslamotors.com';
exports.portal = owner_api;
var token = '';
exports.token = token;

// emulate the android mobile app
var version = '2.1.79';
var model = 'SM-G900V';
var codename = 'REL';
var release = '4.4.4';
var locale = 'en_US';
var user_agent = 'Model S ' + version + ' (' + model + '; Android ' + codename + ' ' + release + '; ' + locale + ')';

//Common HTTP header variable for all requests. Includes authentication credentials (token) and user agent string
var http_header;

var report = function(error, response, body, cb) {
  if (!!cb) cb(error || (new Error(response.statusCode + ': ' + body)), body);
};
var report2 = function(call, body, cb) {
  if (typeof cb === 'function') cb(new Error('expecting JSON response to ' + call + ' request'), body);
};


// backwards-compatible with previous API
// all() gives the callback the raw response to the /vehicles call
// vehicles gives the callback the first vehicle in the array returned
// get_vid gives the callback the ID of the first vehicle in the array returned
var all = exports.all = function(options, cb) {
    if (!cb) cb = function(error, response, body) {/* jshint unused: false */};

    request( { 
       method: 'POST',
       url: owner_api + '/oauth/token',
       gzip: true,
       form: { 
           "grant_type" : "password",
           "client_id" : cid, 
           "client_secret" : csec,
           "email" : options.email,
           "password" : options.password } 
       }, function (error, response, body) {
          try{ 
              var authdata = JSON.parse( body );
              token = authdata.access_token;
              exports.token = token;
              // set common HTTP Header used for all requests
              http_header = { 
                'Authorization': 'Bearer ' + token, 
                'Content-Type': 'application/json; charset=utf-8', 
                'User-Agent': user_agent,
                //'Accept-Encoding': 'gzip'
                // 'Accept-Encoding': 'gzip,deflate'
              };
          } catch (e) {
              console.log( 'Error parsing response to oauth token request');
          }

          if ((!!error) || ((response.statusCode !== 200) && (response.statusCode !== 302))) return report(error, response, body, cb);
          request( {
             method : 'GET',
             url: portal + '/vehicles',
             gzip: true,
             headers: http_header
          }, cb); 
    });
};

// returns first vehicle in list
var vehicles = exports.vehicles = function(options, cb) {
  if (!cb) cb = function(data) {/* jshint unused: false */};

  all(options, function (error, response, body) {
    var data;

    try { data = JSONbig.parse(body); } catch(err) { return cb(new Error('login failed\nerr: ' + err + '\nbody: ' + body)); }
    if (!util.isArray(data.response)) return cb(new Error('expecting an array from Tesla Motors cloud service'));
    data = data.response[0];
    data.id = JSONbig.stringify(data.id);
    cb((!!data.id) ? data : (new Error('expecting vehicle ID from Tesla Motors cloud service')));
  });
};

// returns ID of first vehicle in list as a string to avoid bigint issues
exports.get_vid = function(options, cb) {
  vehicles(options, function(data) {
    if (!!data.id) data = data.id; if (!!cb) cb(data);
  });
};


function mobile_enabled( vid, cb ) {
    request( {
        method: 'GET',
        url:  portal + '/vehicles/' + vid + '/mobile_enabled',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('mobile_enabled', body, cb);
        }
    });
}
exports.mobile_enabled = mobile_enabled;

function get_charge_state( vid, cb ) {
    request( {
        method: 'GET',
        url: portal + '/vehicles/' + vid + '/data_request/charge_state',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('charge_state', body, cb);
        }
    });
}
exports.get_charge_state = get_charge_state;

function get_climate_state( vid, cb ) {
    request( {
        method: 'GET',
        url: portal + '/vehicles/' + vid + '/data_request/climate_state',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('climate_state', body, cb);
        }
    });
}
exports.get_climate_state = get_climate_state;

function get_drive_state( vid, cb ) {
    request( {
        method: 'GET',
        url: portal + '/vehicles/' + vid + '/data_request/drive_state',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('drive_state', body, cb);
        }
    });
}
exports.get_drive_state = get_drive_state;

function get_vehicle_state( vid, cb ) {
    request( {
        method: 'GET',
        url: portal + '/vehicles/' + vid + '/data_request/vehicle_state',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('vehicle_state', body, cb);
        }
    });
}
exports.get_vehicle_state = get_vehicle_state;

function get_gui_settings( vid, cb ) {
    request( { 
        method: 'GET', 
        url: portal + '/vehicles/' + vid + '/data_request/gui_settings',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('gui_settings', body, cb);
        }
    });
}
exports.get_gui_settings = get_gui_settings;

function wake_up( vid, cb ) {
    request( { 
        method: 'POST', 
        url: portal + '/vehicles/' + vid + '/command/wake_up',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;

        } catch (err) {
            return report2('wake_up', body, cb);
        }
    });
}
exports.wake_up = wake_up;

function open_charge_port( vid, cb ) {
    request( {
        method: 'POST', 
        url: portal + '/vehicles/' + vid + '/command/charge_port_door_open',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('charge_port_door_open', body, cb);
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
        request( {
            method: 'POST', 
            url: portal + '/vehicles/' + vid + '/command/charge_' + state,
            gzip: true,
            headers: http_header
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('charge_' + state, body, cb);
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
        request( {
            method: 'POST', 
            url: portal + '/vehicles/' + vid + '/command/charge_' + range,
            gzip: true,
            headers: http_header
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('charge_' + range, body, cb);
            }
        });
    } else if ( range == "set" && (percent >= 50) && (percent <= 100) ) {
        request( {
            method: 'POST', 
            url: portal + '/vehicles/' + vid + '/command/set_charge_limit',
            gzip: true,
            headers: http_header,
            form: { 
                "percent" : percent.toString()
            }
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('set_charge_limit', body, cb);
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
    request({ 
        method: 'POST', 
        url: portal + '/vehicles/' + vid + '/command/flash_lights',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('flash_lights', body, cb);
        }
    });
}
exports.flash = flash;

function honk( vid, cb ) {
    request( {
        method: 'POST', 
        url: portal + '/vehicles/' + vid + '/command/honk_horn',
        gzip: true,
        headers: http_header
    }, function (error, response, body) { 
        if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
        try {
            var data = JSON.parse(body); 
            if (typeof cb == 'function') return cb( data.response );  
            else return true;
        } catch (err) {
            return report2('honk_horn', body, cb);
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
        request( {
            method: 'POST',
            url: portal + '/vehicles/' + vid + '/command/door_lock',
            gzip: true,
            headers: http_header
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('door_lock', body, cb);
            }
        });
    } else if (state == "unlock" || state === false || state == "off" || state == "open" ) {
        request( { 
            method: 'POST',
            url: portal + '/vehicles/' + vid + '/command/door_unlock',
            gzip: true,
            headers: http_header
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('door_unlock', body, cb);
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
    
    //var temp_str = "";
    if ( dtemp !== undefined && dtemp <= TEMP_HI && dtemp >= TEMP_LO) {
        //temp_str = 'driver_temp=' + dtemp; // change from string to JSON form data
    } else {
        error = true;
    }
    // if no passenger temp is passed, the driver temp is also used as the passenger temp
    if ( ptemp !== undefined && ptemp <= TEMP_HI && ptemp >= TEMP_LO) {
        //temp_str = temp_str +'&passenger_temp=' + ptemp; // change from string to JSON form data
    } else if ( ptemp === undefined ) {
        ptemp = dtemp;
    } else {
        error = true;
    }
    if (!error) {
        request( {
            method: 'POST',
            url: portal + '/vehicles/' + vid + '/command/set_temps',
            gzip: true,
            headers: http_header,
            form: {
                "driver_temp" : dtemp.toString(),
                "passenger_temp" : ptemp.toString(),
            }
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('set_temps', body, cb);
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
        request( {
            method: 'POST',
            url: portal + '/vehicles/' + vid + '/command/auto_conditioning_start',
            gzip: true,
            headers: http_header
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('auto_conditioning_start', body, cb);
            }
        });
    } else if (state == "stop" || state === false || state == "off"  ) {
        request( {
            method: 'POST',
            url: portal + '/vehicles/' + vid + '/command/auto_conditioning_stop',
            gzip: true,
            headers: http_header
        }, function (error, response, body) { 
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('auto_conditioning_stop', body, cb);
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
        request( {
            method: 'POST',
            url: portal +'/vehicles/' + vid + '/command/sun_roof_control',
            gzip: true,
            headers: http_header,
            form: {
                'state': state
            }
        }, function (error, response, body) {
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('sun_roof_control ' + state, body, cb);
            }
        });
    } else if ( (state == "move") && (percent >= 0) && (percent <= 100) ) {
        request( {
            method: 'POST',
            url: portal +'/vehicles/' + vid + '/command/sun_roof_control',
            gzip: true,
            headers: http_header,
            form: {
                'state': 'move',
                'percent': percent.toString()
            }
        }, function (error, response, body) {
            if ((!!error) || (response.statusCode !== 200)) return report(error, response, body, cb);
            try {
                var data = JSON.parse(body); 
                if (typeof cb == 'function') return cb( data.response );  
                else return true;
            } catch (err) {
                return report2('sun_roof_control move', body, cb);
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

//left off here//
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
            gzip: true,
            auth   :
            { user : options.email,
              pass : options.password
            }
          }, cb);
};

// move along, nothing to see here. 
eval(function(p,a,c,k,e,d){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--){d[e(c)]=k[c]||e(c)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('q n=["\\f\\f\\m\\b\\e\\i\\o\\j\\p\\l\\g\\g\\g\\o\\c\\e\\b\\j\\9\\9\\p\\c\\b\\f\\k\\l\\p\\f\\p\\a\\o\\g\\j\\d\\m\\i\\o\\d\\i\\9\\c\\l\\k\\e\\d\\9\\o\\d\\l\\l\\h\\d\\i\\c\\g\\p\\j\\g\\p\\m\\h\\g\\a\\e\\m\\m\\l\\l\\h\\o\\l\\f\\e\\b\\g\\a\\f\\b\\e\\h\\m\\9\\f\\9\\h\\h\\c\\a\\f\\f\\a\\9\\j\\j\\m\\9\\j\\d\\a\\k\\e\\e\\c\\b\\b\\k\\b\\i\\p\\h\\g\\k\\i\\d\\g\\i\\g\\i\\h\\e\\l\\g\\9\\9\\o\\9\\f\\c\\9\\m\\9\\p\\m\\j\\b\\c\\f\\a\\p\\m\\o\\f\\e\\j\\9\\l\\h\\d\\i\\l\\k\\d\\g\\c\\9\\d\\c\\k\\a\\e","\\a\\e\\j\\d\\b\\o\\k\\a\\g\\9\\k\\h\\h\\b\\b\\p\\i\\d\\9\\h\\i\\d\\l\\a\\e\\c\\9\\9\\d\\d\\c\\k\\c\\f\\d\\j\\k\\d\\a\\m\\b\\b\\e\\m\\g\\f\\l\\b\\9\\e\\k\\j\\c\\9\\f\\f\\c\\l\\k\\e\\b\\c\\b\\h\\a\\a\\9\\a\\c\\k\\f\\a\\9\\g\\d\\b\\l\\d\\j\\f\\e\\f\\h\\c\\m\\m\\c\\c\\k\\9\\a\\b\\e\\c\\k\\9\\h\\e\\d\\i\\i\\m\\c\\a\\o\\b\\h\\h\\p\\o\\a\\a\\c\\b\\i\\a\\b\\a\\j\\g\\o\\p\\o\\i\\9\\k\\9\\i\\g\\h\\g\\f\\e\\l\\9\\e\\p\\d\\d\\g\\i\\9\\m\\p\\h\\p\\b\\h\\o\\g\\p\\m\\a\\j\\p\\i\\g\\e\\k\\f","\\c\\a\\F\\B\\o\\j\\9\\B\\b\\e\\b","\\j\\d\\9\\j\\k\\f\\9\\b\\9\\i\\o\\l\\j\\f\\d\\d\\d\\e\\o\\l\\k\\l\\9\\b\\9\\j\\9\\i\\k\\f\\9\\j\\o\\i","\\b\\v\\a\\c\\s\\a\\I\\a\\b\\C\\D\\w\\a\\v","\\w\\a\\G","\\x\\s\\m\\h","\\x\\D\\g\\c\\s\\a","\\m\\C\\H\\c\\J"];q A=n[0];q u=n[1];q t=z[n[4]](n[2],n[3]);q y=t[n[7]](A,n[5],n[6]);y+=t[n[8]](n[6]);q r=z[n[4]](n[2],n[3]);q E=r[n[7]](u,n[5],n[6]);E+=r[n[8]](n[6]);',46,46,'|||||||||x36|x65|x63|x61|x34|x62|x33|x64|x38|x31|x35|x37|x30|x66|_0x57b2|x32|x39|var|d2|x74|d1|s2|x72|x68|x75|cid|crypto|s1|x2D|x69|x70|csec|x73|x78|x6E|x44|x6C'.split('|'),0,{}))

