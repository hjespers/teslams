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
var to;

// HACK HACK HACK HACK
//

var capacity = 60;

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
				var endTime = lastTime + 600000;
				if (to && endTime > to)
					endTime = to;
				collection.find({"ts": {"$gt": +lastTime, "$lte": +endTime}}).toArray(function(err,docs) {
					if (argv.verbose) console.log("got datasets:", docs.length);
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
	} else if (req.url == "/" || /^\/\?/.test(req.url)) {
		if (argv.verbose) console.log("request for", req.url);
		var query = url.parse(req.url, "true").query;
		var fromParts = (query.from + "-0").split("-");
		var toParts = (query.to + "-59").split("-");
		if (fromParts[5])
			from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], fromParts[3], fromParts[4], fromParts[5]);
		if (toParts[5])
			to = new Date(toParts[0], toParts[1] - 1, toParts[2], toParts[3], toParts[4], toParts[5]);
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if (argv.verbose) console.log("connected to db");
			if(err) throw err;
			collection = db.collection("tesla_stream");
			var startTime = (from) ? from : date.getTime() - argv.replay * 60 * 1000; // go back 'replay' minutes
			var searchString;
			if (!toParts[5])
				searchString = {$gte: +startTime};
			else
				searchString = {$gte: +startTime, $lte: +to};
			collection.find({"ts": searchString}).limit(1).toArray(function(err,docs) {
				if (argv.verbose) console.log("got datasets:", docs.length);
				docs.forEach(function(doc) {
					var record = doc.record;
					var vals = record.toString().replace(",,",",0,").split(/[,\n\r]/);
					lastTime = +vals[0];
					res.setHeader("Content-Type", "text/html"); 
					fs.readFile("./map.html", "utf-8", function(err, data) {
						if (err) throw err;
						var response = data.replace("MAGIC_APIKEY", apiKey)
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
			// make ranges work with and without time component
			fromParts = (query.from + "-0-0-0").split("-");
			if (query.to.split("-").length == 3) {
				toParts = (query.to + "23-59-59").split("-");
			} else {
				toParts = (query.to + "-59-59").split("-");
			}
			from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], fromParts[3], fromParts[4], fromParts[5]);
			to = new Date(toParts[0], toParts[1] - 1, toParts[2], toParts[3], toParts[4], toParts[5]);
			// don't deliver more than 10000 data points (that's one BIG screen)
			var halfIncrement =  Math.round((+to - +from) / 20000);
			var increment = 2 + halfIncrement;
			var outputE = "", outputS = "", outputSOC = "", comma = "", firstDate = 0, lastDate = 0;
			var minE = 1000, minS = 1000, minSOC = 1000;
			var maxE = -1000, maxS = -1000, maxSOC = -1000;
			MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
				if(!err) {
					res.setHeader("Content-Type", "text/html");
					collection = db.collection("tesla_stream");
					collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
						docs.forEach(function(doc) {
							if (firstDate == 0) firstDate = lastDate = doc.ts;
							if (doc.ts > lastDate) {
								var vals = doc.record.toString().replace(",,",",0,").split(",");
								if (doc.ts > lastDate + increment) {
									if (maxE != -1000) {
										outputE += comma + "[" + (+lastDate + halfIncrement) + "," + maxE + "]";
										outputE += ",[" + (+lastDate + increment) + "," + minE + "]";
									}
									if (maxS != -1000)
										outputS += comma + "[" + (+lastDate + halfIncrement) + "," + (+maxS + +minS) / 2 + "]";
									if (maxSOC != -1000)
										outputSOC += comma + "[" + (+lastDate + halfIncrement)  + "," + (+maxSOC + +minSOC) / 2 + "]";
									comma = ",";
									lastDate = doc.ts;
									maxE = maxS = maxSOC = -1000;
									minE = minS = minSOC = 1000;
								}
								if (vals[8] > maxE) maxE = vals[8];
								if (vals[8] < minE) minE = vals[8];
								if (vals[1] > maxS) maxS = vals[1];
								if (vals[1] < minS) minS = vals[1];
								if (vals[3] > maxSOC) maxSOC = vals[3];
								if (vals[3] < minSOC) minSOC = vals[3];
							}
						});
						db.close();
						fs.readFile("./energy.html", "utf-8", function(err, data) {
							if (err) throw err;
							var fD = new Date(firstDate);
							var startDate = (fD.getMonth() + 1) + "/" + fD.getDate() + "/" + fD.getFullYear();
							var response = data.replace("MAGIC_ENERGY", outputE)
										.replace("MAGIC_SPEED", outputS)
										.replace("MAGIC_SOC", outputSOC)
										.replace("MAGIC_START", startDate);
							res.end(response, "utf-8");
							if (argv.verbose) console.log("delivered", outputSOC.length,"records and", response.length, "bytes");
						});
					});
				}
			});
		} else if (/^\/stats/.test(req.url)) {
			var query = url.parse(req.url, "true").query;
			if (!query.to || !query.from) {
				res.end("<html><head></head><body>Invalid query format</body></html>", "utf-8");
				return;
			}
			fromParts = (query.from + "-0").split("-");
			toParts = (query.to + "-59").split("-");
			from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0);
			to = new Date(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59);
			var outputD = "", outputC = "", outputA = "", comma = "", commaD = "", firstDate = 0, lastDay = 0, lastDate = 0;
			var startOdo = 0, charge = 0, minSOC = 101, maxSOC = -1, increment = 0;
			MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
				if(!err) {
					var vals = [];
					res.setHeader("Content-Type", "text/html");
					collection = db.collection("tesla_stream");
					collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
						docs.forEach(function(doc) {
							var day = new Date(doc.ts).getDay();
							vals = doc.record.toString().replace(",,",",0,").split(",");
							if (firstDate == 0) {
								firstDate = doc.ts;
								lastDay = day;
								startOdo = vals[2];
								minSOC = 101;
								maxSOC = -1;
							}
							if (doc.ts > lastDate) { // we don't want to go back in time
								if (day == lastDay) {
									// still the same day - accumulate stats for charging
									// this is crude - it would be much better to get this from
									// the aux databased and use the actual charge info
									if (vals[9] != 'R' && vals[9] != 'D' && vals[8] < 0) {
										if (vals[3] < minSOC) minSOC = vals[3];
										if (vals[3] > maxSOC) maxSOC = vals[3];
										increment = maxSOC - minSOC;
									} else {
										if (increment > 0) {
											charge += increment * capacity / 100;
											increment = 0;
											minSOC = 101;
											maxSOC = -1;
										}
									}
								} else {
									lastDay = day;
									var dist = +vals[2] - startOdo;
									var ts = new Date(lastDate);
									// in order for lines and bars to line up nicely it looks better if the
									// bars start at midnight, but the lines are setup to have their values
									// at midday
									var midnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 0, 0, 0);
									var midday = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 12, 0, 0);
									charge += increment;
									outputD += comma + "[" + +midnight  + "," + dist + "]";
									outputC += comma + "[" + +midnight  + "," + charge + "]";
									if (dist > 0) {
										outputA += commaD + "[" + +midday  + "," + 1000 * charge / dist + "]";
										commaD = ",";
									}
									startOdo = vals[2];
									charge = 0;
									minSOC = 101;
									maxSOC = -1;
									comma = ",";
								}
								lastDate = doc.ts;
							}
						});
						// we still need to add the last day
						var dist = +vals[2] - startOdo;
						var ts = new Date(lastDate);
						var midnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 0, 0, 0);
						var midday = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 12, 0, 0);
						charge += increment;
						outputD += comma + "[" + +midnight  + "," + dist + "]";
						outputC += comma + "[" + +midnight  + "," + charge + "]";
						if (dist > 0) {
							outputA += commaD + "[" + +midday  + "," + 1000 * charge / dist + "]";
							commaD = ",";
						}
						collection = db.collection("tesla_aux");
						var maxAmp = 0, maxVolt = 0, maxMph = 0;
						collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
							if (argv.verbose) console.log("Found " + docs.length + " entries in aux DB");
							docs.forEach(function(doc) {
								if(typeof doc.chargeState !== 'undefined') {
									if (doc.chargeState.charger_voltage > maxVolt)
										maxVolt = doc.chargeState.charger_voltage;
									if (doc.chargeState.charger_actual_current > maxAmp)
										maxAmp = doc.chargeState.charger_actual_current;
									if (doc.chargeState.charge_rate > maxMph)
										maxMph = doc.chargeState.charge_rate;
								}
							});
							db.close();
							fs.readFile("./stats.html", "utf-8", function(err, data) {
								if (err) throw err;
								var fD = new Date(firstDate);
								var startDate = (fD.getMonth() + 1) + "/" + fD.getDate() + "/" + fD.getFullYear();
								var response = data.replace("MAGIC_DISTANCE", outputD)
										.replace("MAGIC_CHARGE", outputC)
										.replace("MAGIC_AVERAGE", outputA)
										.replace("MAGIC_START", startDate)
										.replace("MAGIC_MAX_VOLT", maxVolt)
										.replace("MAGIC_MAX_AMP", maxAmp)
										.replace("MAGIC_MAX_MPH", maxMph);
								res.end(response, "utf-8");
							});
						});
					});
				}
			});
		} else if (req.url == "/jquery-1.9.1.js" ||
			   req.url == "/jquery-ui.css" ||
			   req.url == "/jquery-ui-1.10.3.custom.min.js" ||
			   req.url == "/jquery-ui-timepicker-addon.js" ||
			   req.url == "/jquery-ui-timepicker-addon.css" ||
			   req.url == "/jquery.flot.js" ||
			   req.url == "/jquery.flot.js" ||
			   req.url == "/jquery.flot.time.min.js" ||
			   req.url == "/jquery.flot.threshold.min.js" ||
			   req.url == "/url.min.js" ||
			   (/^\/images.*png$/.test(req.url))) {
			if (argv.verbose) console.log("delivering file", req.url);
			if (/.js$/.test(req.url))
				res.setHeader("Content-Type", "text/javascript");
			else if (/.png$/.test(req.url))
				res.setHeader("Content-Type", "image/png");
			else
				res.setHeader("Content-Type", "text/css");
			fs.readFile("." + req.url, "utf-8", function(err, data) {
				if (err) throw err;
				res.end(data, "utf-8");
			});
		} else if (req.url == "/favicon.ico") {
			fs.readFile("./tesla-graphs-favicon.ico", function(err, data) {
				if (err) throw err;
				res.end(data);
			});
		}
	}
}).listen(argv.port);

if (!argv.silent) console.log("Server running");

