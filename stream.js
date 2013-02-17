var request = require('request'); // run "npm install request" to get this required module
var fs = require('fs');

// edit the credentials to contain your teslamotors.com login email and password
var creds = { email: "youremail.com", password: "yourpassword" }

function wake_up( vid ) {
	request('https://portal.vn.teslamotors.com/vehicles/' + vid + '/command/wake_up', function (error, response, body) { 
		var data = JSON.parse(body); 
		console.log("\nWake up!");
		console.log(data);
	});
}

function get_stream( long_vid, password ) {
	request( 
		{ 
			'uri': 'https://streaming.vn.teslamotors.com/stream/' + long_vid +'/?values=speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state', 
			'method' : 'GET',
			'auth': creds.email + ':' + password
		},  
		function( error, response, body) {
			if (!error && response.statusCode == 200) {
                		console.log('Response BODY: ' + body);
			        console.log('values=timestamp,speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state'); 
        		} else {
               			console.log('Problem with request: status code = ' + response.statusCode);
				console.log( error );
				console.log( response );
				console.log( body );
         		}	
			get_stream( long_vid, password ); // keep calling again and again
		}
	).pipe(fs.createWriteStream('stream_output.txt', {'flags': 'a'} ));
}

//
// Login, get cookies, and figure out the vehicle ID (vid) for subsequent queries
//
var tesla = request( { method: 'POST',
	   url: 'https://portal.vn.teslamotors.com/login',
	   form:{
		"user_session[email]": creds.email, 
		"user_session[password]": creds.password
	   }}, 
	   function (error, response, body) {
		if (!error) {
			request('https://portal.vn.teslamotors.com/vehicles', function (error, response, body) 
				  { 
					var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
					console.log(data);
					tesla.id = data.id;
					tesla.vid = data.vehicle_id;
					tesla.pw = data.tokens[0];
					console.log("streaming output to file stream_output.txt");
					if (tesla.pw == undefined ) {
						console.log("Error: no streaming password token");
						wake_up( tesla.id);
						get_stream( tesla.vid, tesla.pw );
					} else {
						get_stream( tesla.vid, tesla.pw );
					}
				  }
			).pipe(fs.createWriteStream('stream_output.txt'));
		}	
	   }
        );
