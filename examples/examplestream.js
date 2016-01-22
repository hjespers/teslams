#!/usr/bin/env node
var teslams = require('../teslams.js');

// edit the ~/.teslams/config.json file to contain your teslamotors.com login email and password

try {
	var configFile = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + "/.teslams/config.json";
	var config = JSON.parse(require('fs').readFileSync(configFile).toString());
	if ( config.hasOwnProperty('username') && config.hasOwnProperty('password') ) {
		var creds = { 
			email: config.username, 
			password: config.password 
		};
	} else {
		console.log("Unable to load " + configFile + "; username & password are required arguments");
		console.log (config);
		process.exit(1);		
	}
} catch (err) {
	console.log("Error parsing config file: " + err);
	process.exit(1);
}


//This is a very simple example to show the sequence required to call the stream() function
//
//A much more complicated version of this app is streaming.js which handles continuous long polling
//for data, expiring tokens, automatically wakes up the car when needed, handles sleep mode properly,
//and writes the data to either a file or a mongodb database.
//
//First you need to call vehicles() to get the vehicle_id and tokens to use as passwords 
//Note that the password used for the REST call to vehicles() is different than 
//   the password used in the streaming API call to stream() even though the email is the same

console.log ('calling teslams.vehicles()');
teslams.vehicles( { email: creds.email, password: creds.password }, function ( vehicles ) {
    console.log( 'got vehicles data');
    if (typeof vehicles === "undefined") {
        console.log("Error: Undefined vehicle");
    } else if (vehicles.tokens === undefined) {
        console.log("Error: Undefined token, car might be sleeping, call wakeup first using 'teslacmd -w'");
    } else {
	console.log('Calling Streaming API using token from vehicles response, expect to wait up to 2 minutes for full response...');
	var params = { email: creds.email, password: vehicles.tokens[0], vehicle_id: vehicles.vehicle_id };
        teslams.stream( params, function (error, response, body) { 
			console.log(body); 
		});
    }
});
