var request = require('request');
var teslams = require('./teslams.js');

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
					console.log("\nVehicle List:");
					console.log(data);
					console.log("REST API\nid :" + data.id);
					mytesla.id = data.id;
					if (mytesla.id == undefined) {
						console.log("Error: Undefined vehicle id");
					} else {
						//
						// Remember NODE is all async non-blocking so all these requests go in parallel
						//
						// not needed for REST API but test all known REST functions anyway
						//
						teslams.wake_up( mytesla.id );
						//
						// get some info
						//
						teslams.mobile_enabled( mytesla.id );
						teslams.get_charge_state( mytesla.id );
						teslams.get_climate_state( mytesla.id );
						teslams.get_drive_state( mytesla.id );
						teslams.get_vehicle_state( mytesla.id );
						teslams.get_gui_settings( mytesla.id );
						//
						//  cute but annoying stuff while debugging
						//
						//teslams.flash( mytesla.id ); 
						//teslams.honk( mytesla.id ); 
						//teslams.open_charge_port( mytesla.id ) 
						//
						// control some stuff
						//
						teslams.door_lock( mytesla.id, teslams.LOCK_ON );
						teslams.sun_roof( mytesla.id, teslams.ROOF_CLOSE );
						teslams.auto_conditioning( mytesla.id, teslams.CLIMATE_OFF ); 
						teslams.charge_range( mytesla.id, teslams.RANGE_STD ); 
						teslams.charge_state( mytesla.id, teslams.CHARGE_ON ); 
						teslams.set_temperature( mytesla.id, 20); // automatically set passenger to driver setting
						// teslams.set_temperature( mytesla.id, teslams.TEMP_LO , teslams.TEMP_HI ); 
					}
				  }
			)
		}	
	   }
        );


