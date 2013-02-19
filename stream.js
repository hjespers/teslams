var request = require('request');
var fs = require('fs');
var teslams = require('./teslams');

// edit the credentials to contain your teslamotors.com login email and password
var creds = { email: "youremail.com", password: "yourpassword" }

function get_stream( long_vid, password ) {
	if ( long_vid != undefined ) {
	   request( 
		{ 
			'uri': 'https://streaming.vn.teslamotors.com/stream/' + long_vid +'/?values=speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state', 
			'method' : 'GET',
			'auth': creds.email + ':' + password
		},  
		function( error, response, body) {
			if (!error && response.statusCode == 200) {
			        console.log('timestamp,speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state\n'); 
        		} else {
               			console.log('Problem with request: status code = ' + response.statusCode);
				console.log( error );
				console.log( response );
				console.log( body );
				process.exit(1);
         		}	
			get_stream( long_vid, password ); // keep calling again and again
		}
	   ).pipe(fs.createWriteStream('stream_output.txt', {'flags': 'a'} ));
	} else {
		console.log('Error: undefined vehicle_id');
		process.exit(1);
	}
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
					var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
					console.log(data);
					mytesla.id = data.id;
					mytesla.vid = data.vehicle_id;
					mytesla.pw = data.tokens[0];
					console.log('Streaming output for vehicle_id (' + mytesla.vid + ') to file stream_output.txt');
					if (mytesla.pw == undefined ) {
						console.log("Error: no streaming password token");
						teslams.wake_up( mytesla.id);
						get_stream( mytesla.vid, mytesla.pw );
					} else {
						get_stream( mytesla.vid, mytesla.pw );
					}
				  }
			).pipe(fs.createWriteStream('stream_output.txt'));
		}	
	   }
        );
