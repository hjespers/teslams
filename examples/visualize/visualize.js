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
var fs = require('fs');
var lastTime = 0;
var started = false;
var to;
var capacity;
var express = require('express');
var app = express();
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var speedup = 60000;

passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne({ username: username }, function (err, user) {
			if (err) { return done(err); }
			if (!user) {
				return done(null, false, { message: 'Incorrect username.' });
			}
			if (!user.validPassword(password)) {
				return done(null, false, { message: 'Incorrect password.' });
			}
			return done(null, user);
		});
	}
));
function makeDate(string, offset) {
	var args = string.split('-');
	var date = new Date(args[0], args[1]-1, args[2], args[3], args[4], args[5]);
	if (offset != null)
		date = +date + offset;
	return new Date(date);
}
function dateString(time) {
	return time.getFullYear() + '-' + (time.getMonth()+1) + '-' + time.getDate() + '-' +
		time.getHours() + '-' + time.getMinutes() + '-' + time.getSeconds();
}
function dashDate(date, filler) { // date-time with all '-'
	var c = date.replace('%20','-').replace(' ','-').split('-');
	for (var i = c.length; i < 6; i++)
		c.push(filler[i-3]);
	return c[0] + '-' + c[1] + '-' + c[2] + '-' + c[3] + '-' + c[4] + '-' + c[5];
}
function parseDates(fromQ, toQ) {
	if (toQ == null || toQ == "" || toQ.split('-').count < 2) // no valid to argument -> to = now
		this.toQ = dateString(new Date());
	else
		this.toQ = dashDate(toQ,['00','00','00']);
	if (fromQ == null || fromQ == "" || fromQ.split('-').count < 2) // no valid from argument -> 12h before to
		this.fromQ = dashDate(dateString(makeDate(this.toQ, -12 * 3600 * 1000)));
	else
		this.fromQ = dashDate(fromQ,['23','59','59']);
}
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

if (argv.verbose) app.use(express.logger('dev'));

app.get('/', function(req, res) {
	// friendly welcome screen
	fs.readFile(__dirname + "/welcome.html", "utf-8", function(err, data) {
		if (err) throw err;
		res.send(data);
	});
});

app.get('/update', function (req, res) {
	// we don't keep the database connection as that has caused occasional random issues while testing
	if (!started)
		return;
	MongoClient.connect("mongodb://127.0.0.1:27017/" + argv.db, function(err, db) {
		if(err) {
			console.log('error connecting to database:', err);
			return;
		}
		collection = db.collection("tesla_stream");
		if (req.query.speed != null && req.query.speed != "")
			speedup = req.query.speed * 2000; // every 2000 msec
		// get the data from 'speedup' as many seconds
		// but not past the end of the requested segment and not past the current time
		var endTime = +lastTime + speedup;
		if (to && +endTime > +to)
			endTime = +to;
		var currentTime = new Date().getTime();
		if (+endTime > +currentTime)
			endTime = +currentTime;
		collection.find({"ts": {"$gt": +lastTime, "$lte": +endTime}}).toArray(function(err,docs) {
			if (argv.verbose) console.log("got datasets:", docs.length);
			if (docs.length == 0) {
				// create one dummy entry so the map app knows the last time we looked at
				docs = [ { "ts": +endTime, "record": [ +lastTime+"" ,"0","0","0","0","0","0","0","0","0","0","0"]} ];
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
});

app.get('/map', function(req, res) {
	var dates = new parseDates(req.query.from, req.query.to);
	from = makeDate(dates.fromQ);
	to = makeDate(dates.toQ);
	if (req.query.speed != null && req.query.speed != "" && req.query.speed <= 120 && req.query.speed >= 1)
		speedup = req.query.speed * 2000;
	if (req.query.to == undefined || req.query.to.split('-').length < 6 ||
	    req.query.from == undefined || req.query.from.split('-').length < 6) {
		var speedQ = speedup / 2000;
		res.redirect('/energy?from=' + dates.fromQ + '&to=' + dates.toQ + '&speed=' + speedQ.toFixed(0));
		return;
	}
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
				fs.readFile(__dirname + "/map.html", "utf-8", function(err, data) {
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
});

app.get('/energy', function(req, res) {
	var path = req.path;
	var dates = new parseDates(req.query.from, req.query.to);
	from = makeDate(dates.fromQ);
	to = makeDate(dates.toQ);
	if (req.query.to == undefined || req.query.to.split('-').length < 6 ||
	    req.query.from == undefined || req.query.from.split('-').length < 6) {
		res.redirect('/energy?from=' + dates.fromQ + '&to=' + dates.toQ);
		return;
	}
	// don't deliver more than 10000 data points (that's one BIG screen)
	var halfIncrement =  Math.round((+to - +from) / 20000);
	var increment = 2 + halfIncrement;
	var outputE = "", outputS = "", outputSOC = "", firstDate = 0, lastDate = 0;
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
			docs.forEach(function(doc) {
				var vals = doc.record.toString().replace(",,",",0,").split(",");
				if (firstDate == 0) {
					firstDate = lastDate = doc.ts;
					outputE = "[" + +from + ",0]";
					outputS = "[" + +from + ",0]";
					outputSOC = "[" + +from + "," + vals[3] + "],null";
				}
				if (doc.ts >= lastDate) {
					if (doc.ts > lastDate + increment) {
						if (maxE != -1000) {
							outputE += ",[" + (+lastDate + halfIncrement) + "," + maxE + "]";
							outputE += ",[" + (+lastDate + increment) + "," + minE + "]";
						}
						if (maxS != -1000)
							outputS += ",[" + (+lastDate + halfIncrement) + "," + (+maxS + +minS) / 2 + "]";
						if (maxSOC != -1000)
							outputSOC += ",[" + (+lastDate + halfIncrement)  + "," + (+maxSOC + +minSOC) / 2 + "]";
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
			var outputAmp = "", outputVolt = "";
			lastDate = +from;
			collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
				if (argv.verbose) console.log("Found " + docs.length + " entries in aux DB");
				ouputAmp = "[" + +firstDate + ",0]";
				ouputColt = "[" + +firstDate + ",0]";
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
							outputAmp += ",[" + (lastDate + 60000) + ",0]";
							outputVolt += ",[" + (lastDate + 60000) + ",0]";
							outputAmp += ",[" + (doc.ts - 60000) + ",0]";
							outputVolt += ",[" + (doc.ts - 60000) + ",0]";
						}
						outputAmp += ",[" + doc.ts + "," + doc.chargeState.charger_actual_current + "]";
						outputVolt += ",[" + doc.ts + "," + doc.chargeState.charger_voltage + "]";
						lastDate = doc.ts;
					}
				});
				outputAmp += ",[" + (lastDate + 60000) + ",0]";
				outputVolt += ",[" + (lastDate + 60000) + ",0]";
				outputAmp += ",[" + (+chartEnd) + ",0]";
				outputVolt += ",[" + (+chartEnd) + ",0]";

				db.close();
				fs.readFile(__dirname + "/energy.html", "utf-8", function(err, data) {
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
});

app.get('/stats', function(req, res) {
	var path = req.path;
	var dates = new parseDates(req.query.from, req.query.to);
	from = makeDate(dates.fromQ);
	to = makeDate(dates.toQ);
	if (req.query.to == undefined || req.query.to.split('-').length < 6 ||
	    req.query.from == undefined || req.query.from.split('-').length < 6) {
		res.redirect('/stats?from=' + dates.fromQ + '&to=' + dates.toQ);
		return;
	}
	var outputD = "", outputC = "", outputA = "", outputW = "", comma, firstDate = 0, lastDay = 0, lastDate = 0;
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
					comma = "";
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
							outputA += comma + "[" + +midnight  + "," + 1000 * kWh / dist + "]";
						} else {
							outputA += comma + "null";
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
				outputA += comma + "[" + +midnight  + "," + 1000 * kWh / dist + "]";
			} else {
				outputA += comma + "null";
			}
			outputW += comma + "[" + +midnight + "," + kWh + "]";

			db.close();
			fs.readFile(__dirname + "/stats.html", "utf-8", function(err, data) {
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
});

// that's all it takes to deliver the static files in the otherfiles subdirectory
app.use(express.static(__dirname + '/otherfiles'));

app.listen(8766);

if (!argv.silent) console.log("Server running");
