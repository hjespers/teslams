#!/usr/bin/env node
var teslams = require('../teslams.js');

// edit the config.json file to contain your teslamotors.com login email and password
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

//This is a very simple example to show the sequence required to call the stream() function
//
//A much more complicated version of this app is streaming.js which handles continuous long polling
//for data, expiring tokens, automatically wakes up the car when needed, handles sleep mode properly,
//and writes the data to either a file or a mongodb database.
//
//First you need to call vehicles() to get the vehicle_id and tokens to use as passwords 
//Note that the password used for the REST call to vehicles() is different than 
//   the password used in the streaming API call to stream() even though the email is the same
teslams.vehicles( { email: creds.email, password: creds.password }, function ( vehicles ) {
    if (vehicles == undefined) {
        console.log("Error: Undefined vehicle");
    } else if (vehicles.tokens[0] == undefined) {
        console.log("Error: Undefined token, call wakeup first using 'teslacmd -w'");
    } else {
	console.log('Calling Streaming API, expect to wait up to 2 minutes for full response...');
	var params = { email: creds.email, password: vehicles.tokens[0], vehicle_id: vehicles.vehicle_id };
        teslams.stream( params, function (error, response, body) { 
		console.log( body); 
	});
    }
});
