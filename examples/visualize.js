#!/usr/bin/env node
// create a local http server on port 8766 that visualizes the path of a Tesla Model S
// the data is taken from a MongoDB database
// the server can visualize / fast forward through past data in that database
// the client (as viewed in a browser) keeps updating real time until stopped
//
// You need a valid Google Maps v3 API key to use this script
//	https://developers.google.com/maps/documentation/javascript/tutorial#api_key
//
var apiKey = 'YOU NEED AN API KEY';

var argv = require('optimist')
	.usage('Usage: $0 [--db <MongoDB database>] [--replay <number of minutes>] [--silent] [--verbose]')
	.alias('r', 'replay')
	.describe('r', 'number of minutes ago that the replay should start')
	.default('r', 5)
	.alias('d', 'db')
	.describe('d', 'MongoDB database name')
	.alias('s', 'silent')
	.describe('s', 'Silent mode: no output to console')
	.boolean(['s'])
	.alias('?', 'help')
	.describe('?', 'Print usage information')
	.argv;
if ( argv.help == true ) {
	console.log( 'Usage: visualize.js [--db <MongoDB database>] [--replay <number of minutes>] [--silent] [--verbose]');
	process.exit(1);
}
var MongoClient = require('mongodb').MongoClient;
var date = new Date();
var http = require('http');
var lastTime = 0;
var started = false;
http.createServer(function(req, res) {
	if (argv.verbose) { console.log("====>request is: ", req.url, req.headers, req.method) }
	if (req.url == "/update") {
		// we don't keep the database connection as that has caused occasional random issues while testing
		if (!started)
			return;
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if(!err) {
				collection = db.collection("tesla_stream");
				// get no more than 5 minutes or 240 samples, whichever is smaller
				collection.find({"ts": {$gt: lastTime, $lte: lastTime + 300000}}, { limit: 240}).toArray(function(err,docs) {
					res.setHeader("Content-Type", "application/json"); 
					res.write("[", "utf-8");
					var comma = "";
					docs.forEach(function(doc) {
						// the tesla streaming service replaces a few items with "" when the car is off
						// the reg exp below replaces the two that are numerical with 0 (the shift_state stays unchanged)
						var vals = doc.record.toString().replace(",,",",0,").split(",");
						res.write(comma + JSON.stringify(vals), "utf-8");
						lastTime = doc.ts;
						comma = ",";
					});
					res.end("]", "utf-8");
					if (!argv.silent) {
						var showTime = new Date(lastTime);
						console.log(lastTime, showTime.toString());
					}
					db.close();
				});
			}
		});
	} else if (req.url == "/") {
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if(err) throw err;
			collection = db.collection("tesla_stream");
			var startTime = + date.getTime() - argv.replay * 60 * 1000; // go back 'replay' minutes
			collection.find({"ts": {$gte: startTime}}).limit(1).toArray(function(err,docs) {
				docs.forEach(function(doc) {
					var record = doc.record;
					var vals = record.toString().replace(",,",",0,").split(/[,\n\r]/);
					if (lastTime == 0) { lastTime = +vals[0]; }
					//
					// this creates the page displayed in the browser;
					// I tried to make this code somewhat dense without sacrificing too much readability either
					// here in the sources or when debugging it in the browser; that's why it is all sent as
					// one long string that is assembled here across many lines of code.
					// the getColor function is just a little piece of mathermatical magic that matches a speed
					// to a wavelength and then does a crude wavelength to RGB conversion
					//
					res.setHeader("Content-Type", "text/html"); 
					res.end("<!DOCTYPE html><html><head>\n" +
						"<meta name='viewport' content='initial-scale=1.0, user-scalable=no' />\n" +
						"<style type='text/css'> html { height: 100% } body { height: 100%; margin: 0; padding: 0 } #map-canvas { height: 90% } </style>\n" +
						"<script src='http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js'></script>\n" +
						"<script type='text/javascript' src='https://maps.googleapis.com/maps/api/js?key=" + apiKey + "&sensor=true'></script>\n" +
						"<script type='text/javascript'>\n" +
						"var myLatlng; var map; var marker; var infoWindow;\n" +
						"function hex(num) { var s = '#0' + num.toString(16) + ''; return s.substring(s.length - 2); }\n" +
						"function getColor(speed) { \n" +
						"	var wl = speed*2+440; if(wl>640){wl=640;}\n" +
						"	var r=Math.round(35+(wl-510)*3.14); if(r<55){r=55} if(r>255){r=255}\n" +
						"	var b=35+(510-wl)*11;if(b<55){b=55;} if(b>255){b=255}\n" +
						"	var g=(wl<580) ? Math.round(35 + (wl - 440) * 4.4) : Math.round(35 + (640 - wl) * 3.66); if(g<55){g=55} if(g>255){g=255}\n" +
						"	return '#'+hex(r)+hex(g)+hex(b);\n" +
						"}\n" +
						"function getMore() { \n" +
						"	$.getJSON('http://mail.hohndel.org:8766/update', function (d, textStatus, jqXHR) { \n" +
						"		if (d.length == 0) { return; }\n" +
						"		for (var i = 0; i < d.length; i++) { \n" +
						"			var nextLatlng = new google.maps.LatLng(d[i][6],d[i][7]);\n" +
						"			var points = [myLatlng,nextLatlng];\n" +
						"			var color = getColor(d[i][1]);\n" +
						"			var opacity = (d[i][0] - getMore.lastTimestamp > 5000) ? 0.1 : 0.9;\n" +
						"			var path = new google.maps.Polyline({path:points,strokeColor:color,strokeOpacity:opacity,strokeWeight:4});\n" +
						"			path.setMap(map);\n" +
						"			if (i == d.length - 1) {\n" +
						"				var cStr = '<div id=\"content\">';\n" +
						"				marker.setPosition(nextLatlng);\n" +
						"				if (d[i][9] == 'D' || d[i][9] == 'R'){cStr+='going '+d[i][1]+' mph'}\n" +
						"				else if (d[i][8] < 0){cStr+='parked and charging ~ '+(-d[i][8])+'kW'}\n" +
						"				else {cStr+='parked'}\n" +
						"				cStr+='<br>odometer '+d[i][2]+'<br>range '+d[i][10]+'</div>';\n" +
						"				infoWindow.setContent(cStr);\n" +
						"			}\n" +
						"			myLatlng = nextLatlng;\n" +
						"		}\n" +
						"	}); }\n" +
						"function initialize() { \n" +
						"	myLatlng = new google.maps.LatLng(" + vals[6] + "," + vals[7] + ");\n" +
						"	var mapOptions = { center: myLatlng, zoom: 16, mapTypeId: google.maps.MapTypeId.ROADMAP };\n" + 
						"	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);\n" + 
						"	marker = new google.maps.Marker({ position: myLatlng, map: map, title: 'Tesla Model S'});\n" +
						"	var cStr = \'<div id=\"content\">going " + vals[1] + " mph<br>odometer " + vals[2] + "<br>range " + vals[10] + "</div>\';\n" +
						"	infoWindow = new google.maps.InfoWindow({content: cStr});\n" +
						"	infoWindow.open(map, marker);\n" +
						"	setInterval(getMore, 2000);\n" +
						"}\n" + 
						"google.maps.event.addDomListener(window, 'load', initialize);\n" + 
						"</script>\n" + 
						"</head> <body> <div id='map-canvas'/> </body> </html>\n", "utf-8");
				});
				db.close();
				started = true;
			});
		});
		if (!argv.silent) console.log('done sending the initial page');
	}
}).listen(8766, "mail.hohndel.org");

if (!argv.silent) console.log("Server running");

