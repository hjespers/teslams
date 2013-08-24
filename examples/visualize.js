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


function argchecker( argv ) {
	if (argv.db == true) throw 'MongoDB database name is unspecified. Use -d dbname or --db dbname';
}

var argv = require('optimist')
	.usage('Usage: $0 --db <MongoDB database> [--port <http listen port>] [--replay <number of minutes>] [--silent] [--verbose]')
	.check( argchecker )
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

var capacity;
MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
	// this is the first time we connect - if we get an error, just throw it
	if(err) throw(err);
	var collectionA = db.collection("tesla_aux");
	// get the last stored entry that describes the vehicles
	var query = {'vehicles': { '$exists': true } };
	var options = { 'sort': [['ts', 'desc']], 'limit': 1};
	collectionA.find(query, options).toArray(function(err, docs) {
		if (argv.verbose) console.dir(docs);
		if (docs.length == 0) {
			console.log("missing vehicles data in db, assuming Model S 60");
			capacity = 60;
		} else {
			if (docs.length > 1)
				console.log("congratulations, you have more than one Tesla Model S - this only supports your first car");
			var options = docs[0].vehicles.option_codes.split(',');
			for (var i = 0; i < options.length; i++) {
				if (options[i] == "BT85") {
					capacity = 85;
					break;
				}
				if (options[i] == "BT60") {
					capacity = 60;
					break;
				}
			}
		}
		if (argv.verbose) console.log("battery capacity", capacity);
	});
});

http.createServer(function(req, res) {
	if (argv.verbose) { console.log("====>request is: ", req.url)}
	var parsedUrl = url.parse(req.url, true);
	var path = parsedUrl.pathname;
	if (path == "/update") {
		// we don't keep the database connection as that has caused occasional random issues while testing
		if (!started)
			return;
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if(err) {
				console.log('error connecting to database:', err);
				return;
			}
			collection = db.collection("tesla_stream");
			// get no more than 10 minutes or 240 samples, whichever is smaller
			var endTime = +lastTime + 600000;
			if (to && +endTime > +to)
				endTime = +to;
			collection.find({"ts": {"$gt": +lastTime, "$lte": +endTime}}).toArray(function(err,docs) {
				if (argv.verbose) console.log("got datasets:", docs.length);
				if (docs.length == 0) {
					// create one dummy entry so the map app knows the last time we looked at
					docs = [ { "ts": +endTime, "record": [ +lastTime+"" ,"0","0","0","0","0","0","0","0","0","0","0"]} ];
					lastTime = +endTime; // skip this segment
				}
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
					console.log("last timestamp:", lastTime, showTime.toString());
				}
				db.close();
			});
		});
	} else if (path == "/") {
		var fromParts = (parsedUrl.query.from + "-0").split("-");
		var toParts = (parsedUrl.query.to + "-59").split("-");
		if (fromParts[5])
			from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], fromParts[3], fromParts[4], fromParts[5]);
		if (toParts[5])
			to = new Date(toParts[0], toParts[1] - 1, toParts[2], toParts[3], toParts[4], toParts[5]);
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if(err) {
				console.log('error connecting to database:', err);
				return;
			}
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
	} else if (path == "/energy") {
		if (!parsedUrl.query.to || !parsedUrl.query.from) {
			res.end("<html><head></head><body>Invalid query format</body></html>", "utf-8");
			return;
		}
		// make ranges work with and without time component
		fromParts = (parsedUrl.query.from + "-0-0-0").split("-");
		if (parsedUrl.query.to.split("-").length == 3) {
			toParts = (parsedUrl.query.to + "23-59-59").split("-");
		} else {
			toParts = (parsedUrl.query.to + "-59-59").split("-");
		}
		from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], fromParts[3], fromParts[4], fromParts[5]);
		to = new Date(toParts[0], toParts[1] - 1, toParts[2], toParts[3], toParts[4], toParts[5]);
		// don't deliver more than 10000 data points (that's one BIG screen)
		var halfIncrement =  Math.round((+to - +from) / 20000);
		var increment = 2 + halfIncrement;
		var outputE = "", outputS = "", outputSOC = "", comma, firstDate = 0, lastDate = 0;
		var minE = 1000, minS = 1000, minSOC = 1000;
		var maxE = -1000, maxS = -1000, maxSOC = -1000;
		var gMaxE = -1000, gMaxS = -1000;
		var gMinE = 1000, gMinS = 1000;
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if(err) {
				console.log('error connecting to database:', err);
				return;
			}
			res.setHeader("Content-Type", "text/html");
			collection = db.collection("tesla_stream");
			collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
				comma = "";
				docs.forEach(function(doc) {
					if (firstDate == 0) firstDate = lastDate = doc.ts;
					if (doc.ts >= lastDate) {
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
							if (+maxE > +gMaxE) gMaxE = maxE;
							if (+minE < +gMinE) gMinE = minE;
							if (+maxS > +gMaxS) gMaxS = maxS;
							maxE = maxS = maxSOC = -1000;
							minE = minS = minSOC = 1000;
						}
						if (+vals[8] > +maxE) maxE = vals[8];
						if (+vals[8] < +minE) minE = vals[8];
						if (+vals[1] > +maxS) maxS = vals[1];
						if (+vals[1] < +minS) minS = vals[1];
						if (+vals[3] > +maxSOC) maxSOC = vals[3];
						if (+vals[3] < +minSOC) minSOC = vals[3];
					}
				});
				var chartEnd = lastDate;

				// now look for data in the aux collection

				collection = db.collection("tesla_aux");
				var maxAmp = 0, maxVolt = 0, maxMph = 0;
				var outputAmp = "", outputVolt = "", comma = "";
				lastDate = +from;
				collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
					if (argv.verbose) console.log("Found " + docs.length + " entries in aux DB");
					comma = '';
					docs.forEach(function(doc) {
						if(typeof doc.chargeState !== 'undefined') {
							if (doc.chargeState.charge_rate > maxMph) {
								maxMph = doc.chargeState.charge_rate;
								maxVolt = doc.chargeState.charger_voltage;
								maxAmp = doc.chargeState.charger_actual_current;
							}
							// we get these in 60s increments, but only when charging;
							// we might miss the occasional sample so if the time gap
							// is more than 3 minutes, pull the lines down to zero
							if (doc.ts - lastDate > 180000) {
								outputAmp += comma + "[" + (lastDate + 60000) + ",0]";
								outputVolt += comma + "[" + (lastDate + 60000) + ",0]";
								outputAmp += comma + "[" + (doc.ts - 60000) + ",0]";
								outputVolt += comma + "[" + (doc.ts - 60000) + ",0]";
							}
							outputAmp += comma + "[" + doc.ts + "," + doc.chargeState.charger_actual_current + "]";
							outputVolt += comma + "[" + doc.ts + "," + doc.chargeState.charger_voltage + "]";
							comma = ",";
							lastDate = doc.ts;
						}
					});
					outputAmp += comma + "[" + (lastDate + 60000) + ",0]";
					outputVolt += comma + "[" + (lastDate + 60000) + ",0]";
					outputAmp += comma + "[" + (+chartEnd) + ",0]";
					outputVolt += comma + "[" + (+chartEnd) + ",0]";

					db.close();
					fs.readFile("./energy.html", "utf-8", function(err, data) {
						if (err) throw err;
						var fD = new Date(firstDate);
						var startDate = (fD.getMonth() + 1) + "/" + fD.getDate() + "/" + fD.getFullYear();
						gMinE = +gMinE - 10;
						gMaxE = +gMaxE + 10;
						if (2 * gMaxS > +gMaxE) {
							gMaxS = +gMaxS + 5;
							gMaxE = 2 * gMaxS;
						} else {
							gMaxS = gMaxE / 2;
						}
						gMinS = gMinE / 2;
						var maxKw = maxVolt * maxAmp / 1000;
						var response = data.replace("MAGIC_ENERGY", outputE)
									.replace("MAGIC_SPEED", outputS)
									.replace("MAGIC_SOC", outputSOC)
									.replace("MAGIC_START", startDate)
									.replace("MAGIC_MAX_ENG", gMaxE)
									.replace("MAGIC_MIN_ENG", gMinE)
									.replace("MAGIC_MAX_SPD", gMaxS)
									.replace("MAGIC_MIN_SPD", gMinS)
									.replace("MAGIC_VOLT", outputVolt)
									.replace("MAGIC_AMP", outputAmp)
									.replace("MAGIC_MAX_VOLT", maxVolt)
									.replace("MAGIC_MAX_AMP", maxAmp)
									.replace("MAGIC_MAX_KW", maxKw.toFixed(1))
									.replace("MAGIC_MAX_MPH", maxMph);
						res.end(response, "utf-8");
						if (argv.verbose) console.log("delivered", outputSOC.length,"records and", response.length, "bytes");
					});
				});
			});
		});
	} else if (path == "/stats") {
		if (!parsedUrl.query.to || !parsedUrl.query.from) {
			res.end("<html><head></head><body>Invalid query format</body></html>", "utf-8");
			return;
		}
		fromParts = (parsedUrl.query.from + "-0").split("-");
		toParts = (parsedUrl.query.to + "-59").split("-");
		from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0);
		to = new Date(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59);
		var outputD = "", outputC = "", outputA = "", outputW = "", comma, commaD, firstDate = 0, lastDay = 0, lastDate = 0;
		var startOdo = 0, charge = 0, minSOC = 101, maxSOC = -1, increment = 0, kWs = 0;
		MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
			if(err) {
				console.log('error connecting to database:', err);
				return;
			}
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
						kWs = 0;
						comma = "", commaD = "";
					}
					if (doc.ts > lastDate) { // we don't want to go back in time
						if (day == lastDay) {
							// still the same day - accumulate stats for charging
							// this is crude - it would be much better to get this from
							// the aux database and use the actual charge info
							if (vals[9] != 'R' && vals[9] != 'D') { // we are not driving
								if (vals[8] < 0) { // parked & charging
									if (vals[3] < minSOC) minSOC = vals[3];
									if (vals[3] > maxSOC) maxSOC = vals[3];
									increment = maxSOC - minSOC;
								} else { // parked & consuming
									if (vals[8] > 0)
										kWs += (doc.ts - lastDate) / 1000 * vals[8];
									// if we were charging before, add the estimate to the total
									if (increment > 0) {
										charge += increment * capacity / 100;
										increment = 0;
										minSOC = 101;
										maxSOC = -1;
									}
								}
							} else {
								// we're driving - add up the energy used / regen
								kWs += (doc.ts - lastDate) / 1000 * vals[8];
							}
						} else {
							lastDay = day;
							var dist = +vals[2] - startOdo;
							var kWh = kWs / 3600;
							var ts = new Date(lastDate);
							var midnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 0, 0, 0);
							charge += increment;
							outputD += comma + "[" + +midnight  + "," + dist + "]";
							outputC += comma + "[" + +midnight  + "," + charge + "]";
							if (dist > 0) {
								outputA += commaD + "[" + +midnight  + "," + 1000 * kWh / dist + "]";
								commaD = ",";
							}
							outputW += comma + "[" + +midnight + "," + kWh + "]";
							startOdo = vals[2];
							charge = 0;
							minSOC = 101;
							maxSOC = -1;
							kWs = 0;
							comma = ",";
						}
						lastDate = doc.ts;
					}
				});

				// we still need to add the last day

				var dist = +vals[2] - startOdo;
				var kWh = kWs / 3600;
				var ts = new Date(lastDate);
				var midnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 0, 0, 0);
				charge += increment;
				outputD += comma + "[" + +midnight  + "," + dist + "]";
				outputC += comma + "[" + +midnight  + "," + charge + "]";
				if (dist > 0) {
					outputA += commaD + "[" + +midnight  + "," + 1000 * kWh / dist + "]";
					commaD = ",";
				}
				outputW += comma + "[" + +midnight + "," + kWh + "]";

				db.close();
				fs.readFile("./stats.html", "utf-8", function(err, data) {
					if (err) throw err;
					var fD = new Date(firstDate);
					var startDate = (fD.getMonth() + 1) + "/" + fD.getDate() + "/" + fD.getFullYear();
					var response = data.replace("MAGIC_DISTANCE", outputD)
							.replace("MAGIC_CHARGE", outputC)
							.replace("MAGIC_AVERAGE", outputA)
							.replace("MAGIC_KWH", outputW)
							.replace("MAGIC_START", startDate);
					res.end(response, "utf-8");
				});
			});
		});
	} else { // let's try to just deliver that file - but to avoid attacks, only the ones we know about
		if (argv.verbose) console.log("request for", req.url);
		if (path == "/jquery-1.9.1.js" ||
		    path == "/jquery-ui.css" ||
		    path == "/jquery-ui-1.10.3.custom.min.js" ||
		    path == "/jquery-ui-timepicker-addon.js" ||
		    path == "/jquery-ui-timepicker-addon.css" ||
		    path == "/jquery.flot.js" ||
		    path == "/jquery.flot.js" ||
		    path == "/jquery.flot.time.min.js" ||
		    path == "/jquery.flot.threshold.min.js" ||
		    path == "/jquery.flot.orderBars.js" ||
		    path == "/url.min.js" ||
		    (/^\/images.*png$/.test(path))) {
			if (argv.verbose) console.log("delivering file", path);
			if (/.js$/.test(path))
				res.setHeader("Content-Type", "text/javascript");
			else if (/.png$/.test(path))
				res.setHeader("Content-Type", "image/png");
			else
				res.setHeader("Content-Type", "text/css");
			fs.readFile("." + path, "utf-8", function(err, data) {
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

