#!/usr/bin/env node
// create a local http server on port 8766 that visualizes the path of a Tesla Model S
// the data is taken from a MongoDB database
// the server can visualize / fast forward through past data in that database
// the client (as viewed in a browser) keeps updating real time until stopped
//
// You need a valid Google Maps v3 API key to use this script
//	https://developers.google.com/maps/documentation/javascript/tutorial#api_key
//
var apiKey = 'AIzaSyAtYQ9xjedv3B6_2HwsDVMY7oHlbNs-cvk';

var argv = require('optimist')
	.usage('Usage: $0 --db <MongoDB database> [--port <http listen port>] [--replay <number of minutes>] [--silent] [--verbose]')
	.alias('p', 'port')
	.describe('p', 'Listen port for the local http server')
	.default('p', 8766)
	.alias('r', 'replay')
	.describe('r', 'number of minutes ago that the replay should start')
	.default('r', 5)
	.alias('d', 'db')
	.describe('d', 'MongoDB database name')
	.demand('d')
	.alias('s', 'silent')
	.describe('s', 'Silent mode: no output to console')
	.boolean(['s'])
	.alias('v', 'verbose')
	.describe('v', 'Verbose mode: more output to console')
	.boolean(['v'])
	.alias('?', 'help')
	.describe('?', 'Print usage information')
	.argv;
if ( argv.help == true ) {
	console.log( 'Usage: visualize.js --db <MongoDB database> [--replay <number of minutes>] [--silent] [--verbose]');
	process.exit(1);
}
var MongoClient = require('mongodb').MongoClient;
var date = new Date();
var http = require('http');
var url = require('url');
var fs = require('fs');
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
				// get no more than 10 minutes or 240 samples, whichever is smaller
				collection.find({"ts": {$gt: lastTime, $lte: lastTime + 600000}}, { limit: 240}).toArray(function(err,docs) {
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
			if (argv.verbose) console.log("connected to db");
			if(err) throw err;
			collection = db.collection("tesla_stream");
			var startTime = + date.getTime() - argv.replay * 60 * 1000; // go back 'replay' minutes
			collection.find({"ts": {$gte: startTime}}).limit(1).toArray(function(err,docs) {
				if (argv.verbose) console.log("got datasets:", docs.length);
				docs.forEach(function(doc) {
					var record = doc.record;
					var vals = record.toString().replace(",,",",0,").split(/[,\n\r]/);
					if (lastTime == 0) { lastTime = +vals[0]; }
					res.setHeader("Content-Type", "text/html"); 
					fs.readFile("./map.html", "utf-8", function(err, data) {
						if (err) throw err;
						var response = data.replace("MAGIC_APIKEY", apiKey)
									.replace("MAGIC_UPDATE_URL", "http://localhost:" + argv.port + "/update")
									.replace("MAGIC_FIRST_LOC", vals[6] + "," + vals[7]);
						res.end(response, "utf-8");
					});
				});
				db.close();
				started = true;
			});
		});
		if (!argv.silent) console.log('done sending the initial page');
	} else {
		if (argv.verbose) console.log("request for", req.url);
		if (/^\/energy/.test(req.url)) {
			var query = url.parse(req.url, "true").query;
			if (!query.to || !query.from) {
				res.end("<html><head></head><body>Invalid query format</body></html>", "utf-8");
				return;
			}
			fromParts = (query.from + "-0").split("-");
			toParts = (query.to + "-59").split("-");
			from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], fromParts[3], fromParts[4], fromParts[5]);
			to = new Date(toParts[0], toParts[1] - 1, toParts[2], toParts[3], toParts[4], toParts[5]);
			var outputE = "", outputS = "", comma = "", firstDate = 0, lastDate = 0;
			MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
				if(!err) {
					res.setHeader("Content-Type", "text/html");
					collection = db.collection("tesla_stream");
					collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
						docs.forEach(function(doc) {
							if (firstDate == 0) firstDate = doc.ts;
							if (doc.ts > lastDate) {
								lastDate = doc.ts;
								outputE += comma + "[" + doc.ts  + "," + doc.record.toString().replace(",,",",0,").split(",")[8] + "]";
								outputS += comma + "[" + doc.ts  + "," + doc.record.toString().replace(",,",",0,").split(",")[1] + "]";
								comma = ",";
							}
						});
						db.close();
						fs.readFile("./energy.html", "utf-8", function(err, data) {
							if (err) throw err;
							var fD = new Date(firstDate);
							var startDate = (fD.getMonth() + 1) + "/" + fD.getDate() + "/" + fD.getFullYear();
							var response = data.replace("MAGIC_ENERGY", outputE)
										.replace("MAGIC_SPEED", outputS)
										.replace("MAGIC_START", startDate);
							res.end(response, "utf-8");
						});
					});
				}
			});
		} else if (req.url == "/jquery.flot.js" || req.url == "/jquery.flot.time.min.js" || req.url == "/jquery.flot.threshold.min.js") {
			res.setHeader("Content-Type", "text/javascript");
			fs.readFile("." + req.url, "utf-8", function(err, data) {
				if (err) throw err;
				res.end(data, "utf-8");
			});
		} else if (req.url == "/favicon.ico") {
			res.setHeader("Content-Type", "text/javascript");
			fs.readFile("./tesla-graphs-favicon.ico", function(err, data) {
				if (err) throw err;
				res.end(data);
			});
		}
	}
}).listen(argv.port);

if (!argv.silent) console.log("Server running");

