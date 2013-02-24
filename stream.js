var request = require('request');
var teslams = require('./teslams');

// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
var fs = require('fs');
try {

	var jsonString = fs.readFileSync("./config.json").toString();
	var config = JSON.parse(jsonString);
	var creds = { 
		email: config.username, 
		password: config.password 
	};
	var p_url = config.portal_url;
	var s_url = config.stream_url;
	var output_file = config.output_file;
} catch (err) {
	
	console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
	process.exit(1);
}

function get_stream( vid, long_vid, token ) {
	if (long_vid == undefined || token == undefined) {
		console.log('Error: undefined vehicle_id (' + long_vid +') or token (' + token +')' );
		console.log('Exiting...');
		process.exit(1);
	} else {
	   request( 
		{ 
			'uri': s_url + long_vid +'/?values=speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state', 
			'method' : 'GET',
			'auth': {
				'user': creds.email,
				'pass': token
			}
		},  
		function( error, response, body) {
			if (!error && response.statusCode == 200) {
			        console.log('timestamp,speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state\n'); 
				get_stream( vid, long_vid, token ); // keep calling again and again
        		} else if ( response.statusCode == 401) {
				console.log('HTTP 401: Unauthorized - token has likely expired, getting a new one');

				//request(teslams.portal + '/vehicles', function (error, response, body) { 
				request(p_url, function (error, response, body) { 
					var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
					token = data.tokens[0];
					if (token != undefined) {
						console.log('New token = ' + token);
						get_stream( vid, long_vid, token ); // keep calling again and again
					} else {
						console.log('Simple new token fetch returned undefined token');
						request(p_url + vid + '/command/wake_up', function (error, response, body) { 
							var data = JSON.parse(body); 
							console.log("\nWake up!");
							console.log(data);
							//request(teslams.portal + '/vehicles', function (error, response, body) { 
							request( p_url, function (error, response, body) { 
								var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
								token = data.tokens[0];
								console.log('New token = ' + token);
								get_stream( vid, long_vid, token ); // keep calling again and again
							});
						});
					}
				});
			} else {
               			console.log('Problem with request:'); 
               			console.log('Response status code = ' + response.statusCode );
               			console.log('Error code = ' + error);
				//process.exit(1);
				get_stream( vid, long_vid, token ); // keep calling again and again
         		}	
		}
	   ).pipe(fs.createWriteStream( output_file, {'flags': 'a'} ));
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
					mytesla.token = data.tokens[0];
					console.log('Streaming output for vehicle_id (' + mytesla.vid + ') to file stream_output.txt');
					if (mytesla.token == undefined ) {
						console.log("Error: no streaming password/token, calling wake_up and trying again");
						request('https://portal.vn.teslamotors.com/vehicles/' + mytesla.id + '/command/wake_up', function (error, response, body) { 
							var data = JSON.parse(body); 
							console.log("\nWake up!");
							console.log(data);
							request(teslams.portal + '/vehicles', function (error, response, body) { 
								var data = JSON.parse( body.substr(1, body.length - 2 ) ); 
								mytesla.token = data.tokens[0];
								console.log('Initial token = ' + mytesla.token);
								get_stream( mytesla.id, mytesla.vid, mytesla.token ); // keep calling again and again
							});
						});
					} else {
						get_stream( mytesla.id, mytesla.vid, mytesla.token );
					}
				  }
			).pipe(fs.createWriteStream( output_file ));
		}	
	   }
        );
