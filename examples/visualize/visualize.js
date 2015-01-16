#!/usr/bin/env node
// create a local http server on port 8766 that visualizes the path of a Tesla Model S
// the data is taken from a MongoDB database
// the server can visualize / fast forward through past data in that database
// the client (as viewed in a browser) keeps updating real time until stopped
//
// You need a valid Google Maps v3 API key to use this script
//  https://developers.google.com/maps/documentation/javascript/tutorial#api_key
//
var apiKey = 'AIzaSyAtYQ9xjedv3B6_2HwsDVMY7oHlbNs-cvk';


function argchecker( argv ) {
    if (argv.db === true) throw 'MongoDB database name is unspecified. Use -d dbname or --db dbname';
}

var argv = require('optimist')
    .usage('Usage: $0 --db <MongoDB database> [--port <http listen port>] [--silent] [--verbose]')
    .check( argchecker )
    .alias('p', 'port')
    .describe('p', 'Listen port for the local http server')
    .default('p', 8766)
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
    .describe('?', 'Print usage information');



var creds = require('../config.js').config(argv);
argv = argv.argv;
if ( argv.help === true ) {
    console.log( 'Usage: visualize.js --db <MongoDB database> [--silent] [--verbose]');
    process.exit(1);
}
// set and check the validity of the HTTP listen port 
// the environment variable $PORT is read for deployment on heroku
var httpport = process.env.PORT;
if ( !isNaN(httpport) && httpport >= 1) {
    console.log('Using listen port (' + httpport + ') set by $PORT environment variable');
    argv.port = httpport;
}
var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI|| process.env.MONGOHQ_URI || 'mongodb://127.0.0.1:27017/' + argv.db;
console.log('Using MongoDB URI: ' + mongoUri);
var date = new Date();
var http = require('http');
var fs = require('fs');
var lastTime = 0;
var started = false;
var from, to;
var capacity;
var express = require('express');
require('express-namespace');
var app = express();
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var speedup = 60000;
var nav = "";
var system = "";
var fwVersion = "";
var vin = "";
var optionString = "";
var baseString = "";

var baseText = {
    RENA: "North American",
    REEU: "European",
    TM02: "Signature",
    PF01: "P",
    PF00: "S",
    BT85: "85PLUS",
    BT60: "60",
    BT40: "40"
};
var optionText = {
    PBSB: "<li> black</li>",
    PBCW: "<li> solid white</li>",
    PMSS: "<li> silver</li>",
    PMTG: "<li> dolphin gray metallic</li>",
    PMAB: "<li> metallic brown</li>",
    PMMB: "<li> metallic blue</li>",
    PMSG: "<li> metallic green</li>",
    PPSW: "<li> pearl white</li>",
    PPMR: "<li> multi-coat red</li>",
    PPSR: "<li> signature red</li>",
    RFPO: "<li> panorama roof</li>",
    WT19: "<li> silver 19\" wheels</li>",
    WT21: "<li> silver 21\" wheels</li>",
    WTSP: "<li> gray 21\" wheels</li>",
    WTSG: "<li> gray performance 21\" wheels</li>",
    TR01: "<li> third row seats</li>",
    SU01: "<li> air suspension</li>",
    SC01: "<li> super charger enabled</li>",
    TP01: "<li> tech package</li>",
    AU01: "<li> audio upgrade</li>",
    CH01: "<li> dual charger</li>",
    PK01: "<li> parking sensors</li>",
    CW01: "<li> cold weather package</li>",
    LP01: "<li> premium lighting package</li>",
    SP01: "<li> security package</li>"
};
    

// this is super simplistic for now. Clear text passwords, nothing fancy, trivial to
// intercept - but it's a start
var users;
if (creds !== undefined && creds.hasOwnProperty('visualize') && creds.visualize.hasOwnProperty('webusers')) {
    users = creds.visualize.webusers;
}

// Set the baseUrl property in your config.json if you want to run visualize in a
// path other than the root of the webserver. For example, to run visualize at
// http://example.com/teslavis, set visualize.baseUrl to "/teslavis"
var baseUrl;
if (creds !== undefined && creds.hasOwnProperty('visualize') && creds.visualize.hasOwnProperty('baseUrl')) {
    console.log("Found a baseUrl (" + creds.visualize.baseUrl + ") in the config.json file");
    baseUrl = creds.visualize.baseUrl;
} else {
    baseUrl = "";
}

// please change this to have at least some trivial session hijacking protection
var localSecret = "please change this secret string";

// these two functions implement our simplistic user lookup
function findById(id, fn) {
    var idx = id - 1;
    if (users[idx]) {
        fn(null, users[idx]);
    } else {
        fn(new Error('User ' + id + ' does not exist'));
    }
}
function findByUsername(username, fn) {
    if (!argv.silent) console.log("find user", username);
    for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
        if (user.username === username) {
            return fn(null, user);
        }
    }
    return fn(null, null);
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, store) {
    store(null, user.id);
});
passport.deserializeUser(findById);
//
// now setup passport and route it into our express setup
//
passport.use(new LocalStrategy(
    function(username, password, done) {
        findByUsername(username, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user || user.password != password) {
                return done(null, false, { message: 'Invalid user or password' });
            }
            return done(null, user);
        });
    }
));

app.namespace(baseUrl, function() {

    app.use(express.cookieParser());
    //deprecated in connect 3.0
    //app.use(express.bodyParser());
    app.use(express.urlencoded())
    app.use(express.json())
    app.use(express.session({ secret: localSecret }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);

    // simple login screen with correspoding POST setup
    app.get('/login', function(req,res) {
        fs.readFile(__dirname + "/login.html", "utf-8", function(err, data) {
            if (err) throw err;
            res.send(data);
        });
    });
    app.post('/login', passport.authenticate('local', { successRedirect: baseUrl + '/',
                                                        failureRedirect: baseUrl + '/login' }));

    // call this in every app.get() that should only be accessible when logged in
    function ensureAuthenticated(req, res, next) {
        if (users === undefined || req.isAuthenticated()) {
            return next();
        }
        res.redirect(baseUrl + '/login');
    }

    // read in the shared navigation bar so we can insert this into every page
    fs.readFile(__dirname + "/otherfiles/nav.html", "utf-8", function(err, data) {
        if (err) throw err;
        nav = data.replace(/BASE/g,baseUrl);
    });

    // shorthand to get leading zero when showing minutes
    function lZ(mins) {
        var zmins = '0' + mins;
        return zmins.substr(zmins.length - 2);
    }

    function makeDate(string, offset) {
        var args = string.split('-');
        var date = new Date(args[0], args[1]-1, args[2], args[3], args[4], args[5]);
        if (offset !== undefined )
            date = new Date(date.getTime() + offset);
        return date;
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
        if (toQ == undefined || toQ === null || toQ === "" || toQ.split('-').count < 2) // no valid to argument -> to = now
            this.toQ = dateString(new Date());
        else
            this.toQ = dashDate(toQ,['00','00','00']);
        if (fromQ == undefined || fromQ === null || fromQ === "" || fromQ.split('-').count < 2) // no valid from argument -> 12h before to
            this.fromQ = dashDate(dateString(makeDate(this.toQ, -12 * 3600 * 1000)));
        else
            this.fromQ = dashDate(fromQ,['23','59','59']);
    }
    function weekNr(d) {
        d = new Date(d);
        d.setHours(0,0,0);
        d.setDate(d.getDate() + 4 - (d.getDay()));
        var yearStart = new Date(d.getFullYear(),0,1);
        return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    }
    MongoClient.connect(mongoUri, function(err, db) {
        // this is the first time we connect - if we get an error, just throw it
        if(err) throw(err);
        var collectionA = db.collection("tesla_aux");
        // get the last stored entry that describes the vehicles
        var query = {'vehicles': { '$exists': true } };
        var options = { 'sort': [['ts', 'desc']], 'limit': 1};
        collectionA.find(query, options).toArray(function(err, docs) {
            if (argv.verbose) console.dir(docs);
            if (docs.length === 0) {
                console.log("missing vehicles data in db, assuming Model S 60");
                capacity = 60;
            } else {
                if (docs.length > 1)
                    console.log("congratulations, you have more than one Tesla Model S - this only supports your first car");
                vin = docs[0].vehicles.vin;
                
                optionString = "<ul>";
                var options = docs[0].vehicles.option_codes.split(',');
                for (var i = 0; i < options.length; i++) {
                    if (optionText[options[i]] !== undefined)
                        optionString += optionText[options[i]];
                    if (baseText[options[i]] !== undefined)
                        baseString += " " + baseText[options[i]];

                    if (options[i] == "PX01") {
                        baseString = baseString.replace("PLUS", "+");
                    }
                    if (options[i].substring(0,2) == "BT") {
                        if (options[i] == "BT85") {
                            capacity = 85;
                        } else if (options[i] == "BT60") {
                            capacity = 60;
                        } else if (options[i] == "BT40") {
                            capacity = 60;
                        }
                    }
                }
                optionString += "</ul>";
                baseString = baseString.replace("PLUS", "");

                if (argv.verbose) console.log(baseString);
                if (argv.verbose) console.log(optionString);
            }
            if (argv.verbose) console.log("battery capacity", capacity);
        });
        query = {'guiSettings': { '$exists': true } };
        options = { 'sort': [['ts', 'desc']], 'limit': 1};
        collectionA.find(query,options).toArray(function(err, docs) {
            if (docs.length == 0) {
                console.log("missing GUI settings in db, assuming imperial");
                system = "imperial";
            } else {
                if (docs[0].guiSettings.gui_distance_units == "mi/hr") { // hey Tesla - that's a speed, not a distance
                    system = "imperial";
                } else {
                    system = "metric";
                }
            }
        });
        query = {'vehicleState': { '$exists': true } };
        options = { 'sort': [['ts', 'desc']], 'limit': 1};
        collectionA.find(query, options).toArray(function(err, docs) {
            if (docs.length == 0) {
                console.log("missing vehicleState settings in db");
            } else {
                var fwBuild = docs[0].vehicleState.car_version;
                if (fwBuild != undefined) {
                    if (fwBuild.substr(0,4) == "1.25")
                        fwVersion = "4.3 ";
                    else if (fwBuild.substr(0,4) == "1.31")
                        fwVersion = "4.4 ";
                    else if (fwBuild.substr(0,4) == "1.33")
                        fwVersion = "4.5 ";
                    else if (fwBuild.substr(0,4) == "1.35")
                        fwVersion = "5.0 ";
                    else if (fwBuild.substr(0,4) == "1.45")
                        fwVersion = "5.6 ";
                    else if (fwBuild.substr(0,4) == "1.49")
                        fwVersion = "5.8 ";
                    else if (fwBuild.substr(0,4) == "1.51")
                        fwVersion = "5.9 ";
                    else if (fwBuild.substr(0,4) == "1.59")
                        fwVersion = "5.11 ";
                    else if (fwBuild.substr(0,4) == "1.64")
                        fwVersion = "5.12 ";
                    else if (fwBuild.substr(0,4) == "1.66")
                        fwVersion = "5.14 ";
                    else if (fwBuild.substr(0,4) == "1.67")
                        fwVersion = "6.0 ";
                    fwVersion += "(" + fwBuild + ")";
                } else {
                    fwVersion = 'unknown';
                }
            }
        });

    });

    if (argv.verbose) app.use(express.logger('dev'));

    app.get('/', ensureAuthenticated, function(req, res) {
        // friendly welcome screen
        fs.readFile(__dirname + "/welcome.html", "utf-8", function(err, data) {
            if (err) throw err;
            res.send(data.replace("MAGIC_NAV",nav)
                 .replace("MAGIC_OPTIONS", baseString + optionString)
                 .replace("MAGIC_VIN", vin)
                 .replace("MAGIC_FIRMWARE_VERSION", fwVersion)
                 .replace("MAGIC_DISPLAY_SYSTEM", system));
        });
    });

    app.get('/getdata', ensureAuthenticated, function (req, res) {
        var ts, options, vals;
        if (argv.verbose) console.log('/getdata with',req.query.at);
        MongoClient.connect(mongoUri, function(err, db) {
            if(err) {
                console.log('error connecting to database:', err);
                return;
            }
            var collection = db.collection("tesla_stream");
            if (req.query.at === null) {
                if (argv.verbose) console.log("why is there no 'at' parameter???");
                return;
            }
            // get the data at time 'at'
            ts = +req.query.at;
            options = { 'sort': [['ts', 'desc']], 'limit': 1};
            collection.find({"ts": {"$lte": +ts}}, options).toArray(function(err,docs) {
                if (argv.verbose) console.log("got datasets:", docs.length);
                if (docs.length === 0) {
                    // that shouldn't happen unless the database is empty...
                    console.log("no data found for /getdata request at time", console.log(new Date(+ts).toString));
                    return;
                }
                res.setHeader("Content-Type", "application/json");
                vals = docs[0].record.toString().replace(",,",",0,").split(",");
                res.write("[" + JSON.stringify(vals) + "]", "utf-8");
                res.end();
                db.close();
            });
        });
    });

    app.get('/storetrip', ensureAuthenticated, function(req, res) {
        MongoClient.connect(mongoUri, function(err, db) {
            if (err) {
                console.log('error connecting to database:', err);
                return;
            }
            var collection = db.collection("trip_data");
            collection.remove({ 'dist': '-1'}, function(err,docs) {
                collection.insert(req.query, { 'safe': true }, function(err,docs) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send("OK");
                    }
                });
            });
        });
    });

    app.get('/getlasttrip', ensureAuthenticated, function(req, res) {
        MongoClient.connect(mongoUri, function(err, db) {
            if (err) {
                console.log('error connecting to database:', err);
                return;
            }
            var collection = db.collection("trip_data");
            var options = { 'sort': [['chargeState.battery_range', 'desc']] };
            collection.find({},{ 'sort': [['from', 'desc']], 'limit': 1 }).toArray(function(err,docs) {
                console.log(docs);
                res.setHeader("Content-Type", "application/json");
                res.send(docs);
            });
        });
    });

    app.get('/update', ensureAuthenticated, function (req, res) {
        // we don't keep the database connection as that has caused occasional random issues while testing
        if (!started)
            return;
        MongoClient.connect(mongoUri, function(err, db) {
            if(err) {
                console.log('error connecting to database:', err);
                return;
            }
            var collection = db.collection("tesla_stream");
            if (req.query.until === null) {
                console.log("why is there no 'until' parameter???");
                return;
            }
            // get the data until 'until'
            // but not past the end of the requested segment and not past the current time
            var endTime = +req.query.until;
            if (to && +endTime > +to)
                endTime = +to;
            var currentTime = new Date().getTime();
            if (+endTime > +currentTime)
                endTime = +currentTime;
            collection.find({"ts": {"$gt": +lastTime, "$lte": +endTime}}).toArray(function(err,docs) {
                if (argv.verbose) console.log("got datasets:", docs.length);
                if (docs.length === 0) {
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
                    lastTime = +doc.ts;
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

    app.get('/map', ensureAuthenticated, function(req, res) {
        var params = "";
        if (req.query.lang !== undefined)
            params = "&lang=" + req.query.lang;
        if (req.query.metric === "true")
            params += "&metric=true";
        var dates = new parseDates(req.query.from, req.query.to);
        from = makeDate(dates.fromQ);
        to = makeDate(dates.toQ);
        if (req.query.speed !== null && req.query.speed !== "" && req.query.speed <= 120 && req.query.speed >= 1)
            speedup = req.query.speed * 2000;
        if (req.query.to === undefined || req.query.to.split('-').length < 6 ||
            req.query.from === undefined || req.query.from.split('-').length < 6) {
            var speedQ = speedup / 2000;
            res.redirect(baseUrl + '/map?from=' + dates.fromQ + '&to=' + dates.toQ + '&speed=' + speedQ.toFixed(0) + params);
            return;
        }
        MongoClient.connect(mongoUri, function(err, db) {
            if(err) {
                console.log('error connecting to database:', err);
                return;
            }
            var collection = db.collection("tesla_stream");
            var searchString = {$gte: +from, $lte: +to};
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
                            .replace("MAGIC_FIRST_LOC", vals[6] + "," + vals[7])
                            .replace("MAGIC_NAV", nav)
                            .replace("MAGIC_DISPLAY_SYSTEM", '"' + system + '"');
                        res.end(response, "utf-8");
                    });
                });
                db.close();
                started = true;
            });
        });
        if (!argv.silent) console.log('done sending the initial page');
    });

    app.get('/energy', ensureAuthenticated, function(req, res) {
        var path = req.path;
        var params = "";
        if (req.query.lang !== undefined)
            params = "&lang=" + req.query.lang;
        if (req.query.metric === "true")
            params += "&metric=true";
        var dates = new parseDates(req.query.from, req.query.to);
        from = makeDate(dates.fromQ);
        to = makeDate(dates.toQ);
        if (req.query.to === undefined || req.query.to.split('-').length < 6 ||
            req.query.from === undefined || req.query.from.split('-').length < 6) {
            res.redirect(baseUrl + '/energy?from=' + dates.fromQ + '&to=' + dates.toQ + params);
            return;
        }
        // don't deliver more than 10000 data points (that's one BIG screen)
        var halfIncrement =  Math.round((+to - +from) / 20000);
        var increment = 2 + halfIncrement;
        var outputE = "", outputS = "", outputSOC = "", outputRange = "", firstDate = 0, lastDate = 0;
        var minE = 1000, minS = 1000, minSOC = 1000;
        var maxE = -1000, maxS = -1000, maxSOC = -1000;
        var gMaxE = -1000, gMaxS = -1000;
        var gMinE = 1000, gMinS = 1000;
        var cumulE = 0, cumulR = 0, cumulES, cumulRS, prevTS;
        MongoClient.connect(mongoUri, function(err, db) {
            var speed, energy, soc, vals;
            if(err) {
                console.log('error connecting to database:', err);
                return;
            }
            res.setHeader("Content-Type", "text/html");
            var collection = db.collection("tesla_stream");
            collection.find({"ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
                docs.forEach(function(doc) {
                    vals = doc.record.toString().replace(",,",",0,").split(",");
                    speed = parseInt(vals[1]);
                    energy = parseInt(vals[8]);
                    soc = parseInt(vals[3]);
                    if (firstDate === 0) {
                        firstDate = lastDate = prevTS = doc.ts;
                        outputE = "[" + (+from) + ",0]";
                        outputS = "[" + (+from) + ",0]";
                        outputSOC = "[" + (+from) + "," + soc + "],null";
                    }
                    if (doc.ts >= lastDate) {
                        if (doc.ts > lastDate + increment) {
                            if (maxE != -1000) {
                                outputE += ",[" + (+lastDate + halfIncrement) + "," + maxE + "]";
                                outputE += ",[" + (+lastDate + increment) + "," + minE + "]";
                            }
                            if (maxS != -1000)
                                outputS += ",[" + (+lastDate + halfIncrement) + "," + (+maxS + minS) / 2 + "]";
                            if (maxSOC != -1000)
                                outputSOC += ",[" + (+lastDate + halfIncrement)  + "," + (+maxSOC + minSOC) / 2 + "]";
                            lastDate = doc.ts;
                            if (+maxE > +gMaxE) gMaxE = maxE;
                            if (+minE < +gMinE) gMinE = minE;
                            if (+maxS > +gMaxS) gMaxS = maxS;
                            maxE = maxS = maxSOC = -1000;
                            minE = minS = minSOC = 1000;
                        }
                        if (energy > 0) cumulE += energy * (doc.ts - prevTS);
                        if (energy < 0) cumulR += energy * (doc.ts - prevTS);
                        if (energy > maxE) maxE = energy;
                        if (energy < minE) minE = energy;
                        if (speed > maxS) maxS = speed;
                        if (speed < minS) minS = speed;
                        if (soc > maxSOC) maxSOC = soc;
                        if (soc < minSOC) minSOC = soc;
                        prevTS = doc.ts;
                    }
                });
                cumulE = cumulE / 3600000;
                cumulR = cumulR / 3600000;
                if (cumulE > 1) {
                    cumulES = cumulE.toFixed(1) + "kWh";
                    cumulRS = (-cumulR).toFixed(1) + "kWh";
                } else {
                    cumulES = (cumulE * 1000).toFixed(0) + "Wh";
                    cumulRS = (-cumulR * 1000).toFixed(0) + "Wh";
                }
                var chartEnd = lastDate;

                // now look for data in the aux collection

                var collection = db.collection("tesla_aux");
                var maxAmp = 0, maxVolt = 0, maxMph = 0, maxPower = 0;
                var outputAmp = "", outputVolt = "", outputPower = "";
                var amp, volt, power;
                lastDate = +from;
                collection.find({"chargeState": {"$exists": true},
                         "ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
                    if (argv.verbose) console.log("Found " + docs.length + " entries in aux DB");
                    outputAmp = "[" + (+firstDate) + ",0]";
                    outputVolt = "[" + (+firstDate) + ",0]";
                    outputPower = "[" + (+firstDate) + ",0]";
                    var comma = "";
                    docs.forEach(function(doc) {
                        amp = volt = 0;
                        if(doc.chargeState.charging_state === 'Charging') {
                            if (doc.chargeState.charger_actual_current !== undefined) {
                                if (doc.chargeState.charger_actual_current !== 0) {
                                    amp = doc.chargeState.charger_actual_current;
                                } else {
                                    amp = doc.chargeState.battery_current;
                                }
                                outputAmp += ",[" + doc.ts + "," + amp + "]";
                                lastDate = doc.ts;
                            }
                            if (doc.chargeState.charger_voltage !== undefined) {
                                volt = doc.chargeState.charger_voltage;
                                outputVolt += ",[" + doc.ts + "," + volt + "]";
                                lastDate = doc.ts;
                            }
                            if (lastDate == doc.ts) { // we had valid values
                                power = parseFloat(volt) * parseFloat(amp) / 1000;
                                outputPower += ",[" + doc.ts + "," + power.toFixed(1) + "]";
                                if (power > maxPower) {
                                    maxPower = power;
                                    maxAmp = amp;
                                    maxVolt = volt;
                                    maxMph = doc.chargeState.charge_rate;
                                }
                            }
                        } else if (doc.chargeState.charging_state === 'Disconnected' ||
                               doc.chargeState.charging_state === 'Complete' ||
                               doc.chargeState.charging_state === 'Pending' ||
                               doc.chargeState.charging_state === 'Starting' ||
                               doc.chargeState.charging_state === 'Stopped') {
                            outputAmp += ",[" + doc.ts + ",0]";
                            outputVolt += ",[" + doc.ts + ",0]";
                            outputPower += ",[" + doc.ts + ",0]";
                        }
                        if (doc.chargeState.battery_range !== undefined) {
                            outputRange += comma + "[" + doc.ts + "," + doc.chargeState.battery_range + "]";
                            comma = ",";
                        }
                    });
                    outputAmp += ",[" + (lastDate + 60000) + ",0]";
                    outputVolt += ",[" + (lastDate + 60000) + ",0]";
                    outputPower += ",[" + (lastDate + 60000) + ",0]";
                    outputAmp += ",[" + (+chartEnd) + ",0]";
                    outputVolt += ",[" + (+chartEnd) + ",0]";
                    outputPower += ",[" + (+chartEnd) + ",0]";

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
                        var response = data.replace("MAGIC_NAV", nav)
                            .replace("MAGIC_ENERGY", outputE)
                            .replace("MAGIC_SPEED", outputS)
                            .replace("MAGIC_SOC", outputSOC)
                            .replace("MAGIC_START", startDate)
                            .replace("MAGIC_MAX_ENG", gMaxE)
                            .replace("MAGIC_MIN_ENG", gMinE)
                            .replace("MAGIC_MAX_SPD", gMaxS)
                            .replace("MAGIC_MIN_SPD", gMinS)
                            .replace("MAGIC_CUMUL_E", cumulES)
                            .replace("MAGIC_CUMUL_R", cumulRS)
                            .replace("MAGIC_VOLT", outputVolt)
                            .replace("MAGIC_AMP", outputAmp)
                            .replace("MAGIC_POWER", outputPower)
                            .replace("MAGIC_RANGE", outputRange)
                            .replace("MAGIC_MAX_VOLT", maxVolt)
                            .replace("MAGIC_MAX_AMP", maxAmp)
                            .replace("MAGIC_MAX_KW", maxPower.toFixed(1))
                            .replace("MAGIC_MAX_MPH", maxMph)
                            .replace("MAGIC_CAPACITY", capacity)
                            .replace("MAGIC_DISPLAY_SYSTEM", '"' + system + '"');
                        res.end(response, "utf-8");
                        if (argv.verbose) console.log("delivered", outputSOC.length,"records and", response.length, "bytes");
                    });
                });
            });
        });
    });

    function countCharge(ts) {
        if (!countCharge.start)
            countCharge.start = ts;
    }
    function stopCountingCharge(ts) {
        if (countCharge.start && ts - countCharge.start > 60000) // at least a minute
            countCharge.chargeInt.push([countCharge.start,ts]);
        countCharge.start = null;
    }
    function countVamp(ts) {
        if (!countVamp.start)
            countVamp.start = ts;
    }
    function stopCountingVamp(ts) {
        if (countVamp.start && ts - countVamp.start > 60000) // at least a minute
            countVamp.vampInt.push([countVamp.start,ts]);
        countVamp.start = null;
    }
    function calculateDelta(d1, d2) {
        var cS1 = d1.chargeState, cS2 = d2.chargeState;
        if (!cS1 || !cS2 || !cS1.battery_level || !cS2.battery_level || cS2.battery_range > cS1.battery_range) {
            return 0;
        }
        // var ratedWh = 5 * ((cS1.battery_level * capacity / cS1.battery_range) + (cS2.battery_level * capacity / cS2.battery_range));
        // let's use the data that we seem to are converging on in the forums instead:
        var ratedWh = (capacity == 85) ? 286 : 267;
        var delta = ratedWh * (cS1.battery_range - cS2.battery_range);
    //  if (argv.verbose) { // great for debugging
    //      console.log(new Date(d1.ts), new Date(d2.ts), "ratedWh", ratedWh.toFixed(1),
    //              "delta range", (cS1.battery_range - cS2.battery_range).toFixed(1) ,"delta", delta.toFixed(1));
    //  }
        return delta / 1000;
    }
    app.get('/test', ensureAuthenticated, function(req, res) {
        MongoClient.connect(mongoUri, function(err, db) {
            if(err) {
                console.log('error connecting to database:', err);
                return;
            }
            var output = "";
            var collection = db.collection("tesla_aux");
            var options = { 'sort': [['chargeState.battery_range', 'desc']] };
            collection.find({"chargeState": {$exists: true}}).toArray(function(err,docs) {
                var comma = "";
                docs.forEach(function(doc) {
                    if (doc.chargeState.battery_level !== undefined) {
                        output += comma + "\n[" + doc.chargeState.battery_level + "," + doc.chargeState.battery_range + "]";
                        comma = ',';
                    }
                });
                db.close();
                fs.readFile(__dirname + "/test.html", "utf-8", function(err, data) {
                    if (err) throw err;
                    res.send(data.replace("MAGIC_TEST", output));
                });
            });
        });
    });
    app.get('/stats', ensureAuthenticated, function(req, res) {
        var debugStartTime = new Date().getTime();
        var path = req.path;
        var params = "";
        if (req.query.lang !== undefined)
            params = "&lang=" + req.query.lang;
        if (req.query.metric === "true")
            params += "&metric=true";
        var dates = new parseDates(req.query.from, req.query.to);
        countVamp.vampInt = [];
        countCharge.chargeInt = [];
        countVamp.start = null;
        from = makeDate(dates.fromQ);
        to = makeDate(dates.toQ);
        if (req.query.to === undefined || req.query.to.split('-').length < 6 ||
            req.query.from === undefined || req.query.from.split('-').length < 6) {
            res.redirect(baseUrl + '/stats?from=' + dates.fromQ + '&to=' + dates.toQ + params);
            return;
        }
        var outputD = "", outputC = "", outputA = "", comma, firstDate = 0, lastDay = 0, lastDate = 0, distHash = {}, useHash = {};
        var outputWD = "", outputWC = "", outputWA = "", commaW, distWHash = {}, useWHash ={};
        MongoClient.connect(mongoUri, function(err, db) {
            if(err) {
                console.log('error connecting to database:', err);
                return;
            }
            res.setHeader("Content-Type", "text/html");
            var collection = db.collection("tesla_stream");
            if (argv.verbose)
                console.log("starting DB request after", new Date().getTime() - debugStartTime, "ms");
            collection.find({"ts": {"$gte": from.getTime(), "$lte": to.getTime()}}).toArray(function(err,docs) {
                if (argv.verbose)
                    console.log("processing data after", new Date().getTime() - debugStartTime, "ms");
                // this is really annoying; the values from the database frequently aren't sorted by
                // timestamp, even if you didn't edit the data. So we need to sort here - the mongoDB
                // sort function fails if the amount of data becomes too large :-(
                docs.sort(function(a,b){return a.ts - b.ts;});
                var vals = [];
                var odo, energy, state, soc;
                var dist, kWh, ts, midnight, used;
                var week, distW = 0, kWhW = 0, usedW = 0, chargeW = 0;
                var startOdo, charge, minSOC, maxSOC, increment, kWs;
                if (docs === null) {
                    if (argv.verbose) {
                        console.log(err);
                        console.log("no output for stream from", +from, "to", +to);
                    }
                    return;
                }
                function updateWValues(f) {
                    var lw = weekNr(lastDate);
                    var ld = new Date(lastDate);
                    if (lw == week && f !== true)
                        return;
                    var wts = ld.getTime() - 24 * 3600 * 1000 * ld.getDay() - 3600 * 1000 * ld.getHours() - 60 * 1000 * ld.getMinutes() - 1000 * ld.getSeconds() - ld.getMilliseconds();
                    outputWD += commaW + "[" + wts + "," + distW + "]";
                    outputWC += commaW + "[" + wts + "," + chargeW + "]";
                    commaW = ",";
                    distWHash[wts+""] = distW;
                    useWHash[wts+""] = kWhW;
                    distW = chargeW = distW = kWhW = 0;
                }
                function updateValues() {
                    stopCountingVamp(lastDate);
                    stopCountingCharge(lastDate);
                    charge += increment * capacity / 100;
                    chargeW += charge;
                    dist = odo - startOdo;
                    distW += dist;
                    kWh = kWs / 3600;
                    kWhW += kWh;
                    ts = new Date(lastDate);
                    midnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 0, 0, 0);
                    outputD += comma + "[" + (+midnight)  + "," + dist + "]";
                    outputC += comma + "[" + (+midnight)  + "," + charge + "]";
                    distHash[midnight.getTime()+""] = dist;
                    useHash[midnight.getTime()+""] = kWh;
                }
                docs.forEach(function(doc) {
                    var day = new Date(doc.ts).getDay();
                    week = weekNr(doc.ts);
                    vals = doc.record.toString().replace(",,",",0,").split(",");
                    odo = parseFloat(vals[2]);
                    soc = parseFloat(vals[3]); // sadly, this is an integer today :-(
                    energy = parseInt(vals[8]);
                    state = vals[9];
                    if (firstDate === 0) {
                        firstDate = doc.ts - 1;
                        lastDay = day;
                        startOdo = odo;
                        minSOC = 101; maxSOC = -1; kWs = 0; charge = 0; increment = 0; comma = ""; commaW = "";
                    }
                    if (day != lastDay) {
                        updateValues();
                        updateWValues();
                        lastDay = day;
                        startOdo = odo;
                        minSOC = 101; maxSOC = -1; kWs = 0; charge = 0; increment = 0; comma = ",";
                    }
                    // this is crude - it would be much better to get this from
                    // the aux database and use the actual charge info
                    if (state != 'R' && state != 'D') { // we are not driving
                        if (energy < 0) { // parked & charging
                            stopCountingVamp(doc.ts);
                            countCharge(doc.ts);
                            if (soc < minSOC) minSOC = soc;
                            if (soc > maxSOC) maxSOC = soc;
                            increment = maxSOC - minSOC;
                        } else { // parked & consuming
                            countVamp(doc.ts);
                            stopCountingCharge(doc.ts);
                            // if we were charging before, add the estimate to the total
                            // this a quite coarse as SOC is in full percent - bad granularity
                            if (increment > 0) {
                                charge += increment * capacity / 100;
                                increment = 0; minSOC = 101; maxSOC = -1;
                            }
                        }
                    } else {
                        // we're driving - add up the energy used / regen
                        if (lastDate > 0)
                            kWs += (doc.ts - lastDate) / 1000 * (energy - 0.12); // this correction is needed to match in car data???
                        stopCountingVamp(doc.ts);
                    }
                    lastDate = doc.ts;
                });

                // we still need to add the last day
                updateValues();
                updateWValues(true);
                // now analyze the charging data
                collection = db.collection("tesla_aux");
                collection.find({"chargeState": {$exists: true}, "ts": {$gte: +from, $lte: +to}}).toArray(function(err,docs) {
                    var i = 0, vampirekWh = 0, day, lastDay = -1, lastDate = null, comma = "", outputY = "", outputWY = "", commaW = "";
                    var j = 0, chargekWh = 0, outputCN = "", usedkWh = 0, outputUsed = "", outputWCN = "", outputWUsed = "";
                    var chargekWhW = 0, vampirekWhW = 0, usedW = 0;
                    var vState1 = null;
                    var cState1 = null;
                    var uState1 = null;
                    var lastDoc = null;
                    var maxI = countVamp.vampInt.length;
                    var maxJ = countCharge.chargeInt.length;
                    function updateChargeWValues(f) {
                        var ld, lw = weekNr(lastDate);
                        if (lw == week && f !== true)
                            return;
                        // if we force the display we need to get the week from the last doc
                        // that we had, otherwise we are showing last weeks data, so get it from lastDate
                        if (f === true) {
                            if (lastDoc !== null && lastDoc.ts !== undefined) {
                                ld = new Date(lastDoc.ts);
                            } else { // we have no data for this range
                                outputWY += commaW + "null";
                                outputWCN += commaW + "null";
                                outputWUsed += commaW + "null";
                                commaW = ',';
                                return;
                            }
                        } else {
                            ld = new Date(lastDate);
                        }
                        var wts = ld.getTime() - 24 * 3600 * 1000 * ld.getDay() - 3600 * 1000 * ld.getHours() - 60 * 1000 * ld.getMinutes() - 1000 * ld.getSeconds() - ld.getMilliseconds();
                        outputWY += commaW + "[" + wts + "," + vampirekWhW + "]";
                        outputWCN += commaW + "[" + wts + "," + chargekWhW + "]";
                        outputWUsed += commaW + "[" + wts + "," + usedW + "]";
                        dist = distWHash[wts+""];
                        if (dist > 0) {
                            outputWA += commaW + "[" + wts + "," + 1000 * usedW / dist + "]";
                        } else {
                            outputWA += commaW + "null";
                        }
                        commaW = ",";
                        chargekWhW = 0;
                        vampirekWhW = 0;
                        usedW = 0;
                    }
                    function updateChargeValues(d) {
                        if (vState1) {
                            vampirekWh += calculateDelta(vState1, d);
                            vState1 = d;
                        }
                        if (cState1) {
                            chargekWh += calculateDelta(d, cState1);
                            cState1 = d;
                        }
                        if (uState1) {
                            usedkWh += calculateDelta(uState1, lastDoc);
                            uState1 = d;
                        }
                        vampirekWhW += vampirekWh;
                        chargekWhW += chargekWh;
                        ts = new Date(lastDate);
                        midnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), 0, 0, 0).getTime()+"";
                        outputY += comma + "[" + midnight + "," + vampirekWh + "]";
                        outputCN += comma + "[" + midnight + "," + chargekWh + "]";
                        // depending on what failed, sometimes the discrete integral is better (missing charge data)
                        // but usually the charge data derived usage is more accurate. Picking the higher of the two
                        // seems to get us the best results.
                        used = Math.max(useHash[midnight+""], usedkWh);
                        // used = usedkWh;
                        usedW += usedkWh;
                        outputUsed += comma + "[" + midnight + "," + used + "]";
                        dist = distHash[midnight+""];
                        if (dist > 0) {
                            outputA += comma + "[" + midnight  + "," + 1000 * used / dist + "]";
                        } else {
                            outputA += comma + "null";
                        }
                        comma = ",";
                    }
                    docs.forEach(function(doc) {
                        day = new Date(doc.ts).getDay();
                        week = weekNr(doc.ts);
                        if (!doc || !doc.chargeState || !doc.chargeState.battery_level)
                            return;
                        if (day != lastDay) {
                            if (lastDate) {
                                updateChargeValues(doc);
                                updateChargeWValues();
                            }
                            lastDate = doc.ts;
                            lastDay = day;
                            vampirekWh = 0;
                            chargekWh = 0;
                            usedkWh = 0;
                        }
                        lastDoc = doc;
                        if (uState1 === null && vState1 === null && cState1 === null)
                            uState1 = doc;
                        if (i < maxI && vState1 === null && doc.ts >= countVamp.vampInt[i][0]) {
                            if (uState1 !== null && doc !== null && uState1.ts < doc.ts) {
                                usedkWh += calculateDelta(uState1, doc);
                            }
                            uState1 = null;
                            vState1 = doc;
                        }
                        if (i < maxI && doc.ts >= countVamp.vampInt[i][1]) {
                            vampirekWh += calculateDelta(vState1, doc);
                            vState1 = null;
                            uState1 = doc;
                            i++;
                        }
                        if (j < maxJ && cState1 === null && doc.ts >= countCharge.chargeInt[j][0]) {
                            if (uState1 !== null && doc !== null && uState1.ts < doc.ts) {
                                usedkWh += calculateDelta(uState1, doc);
                            }
                            uState1 = null;
                            cState1 = doc;
                        }
                        if (j < maxJ && doc.ts >= countCharge.chargeInt[j][1]) {
                            chargekWh += calculateDelta(doc, cState1);
                            cState1 = null;
                            uState1 = doc;
                            j++;
                        }
                    });
                    updateChargeValues(lastDoc);
                    updateChargeWValues(true);
                    db.close();
                    fs.readFile(__dirname + "/stats.html", "utf-8", function(err, data) {
                        if (err) throw err;
                        var fD = new Date(firstDate);
                        var startDate = (fD.getMonth() + 1) + "/" + fD.getDate() + "/" + fD.getFullYear();
                        var response = data
                            .replace("MAGIC_NAV", nav)
                            .replace("MAGIC_DISTANCE", outputD)
                            .replace("MAGIC_WDISTANCE", outputWD)
                            .replace("MAGIC_CHARGE", outputCN)
                            .replace("MAGIC_WCHARGE", outputWCN)
                            .replace("MAGIC_AVERAGE", outputA)
                            .replace("MAGIC_WAVERAGE", outputWA)
                            .replace("MAGIC_KWH", outputUsed)
                            .replace("MAGIC_WKWH", outputWUsed)
                            .replace("MAGIC_VKWH", outputY)
                            .replace("MAGIC_WVKWH", outputWY)
                            .replace("MAGIC_START", startDate)
                            .replace("MAGIC_DISPLAY_SYSTEM", '"' + system + '"');
                        res.end(response, "utf-8");
                        if (argv.verbose)
                            console.log("total processing time", new Date().getTime() - debugStartTime, "ms");
                    });

                });
            });
        });
    });

    app.get('/trip', ensureAuthenticated, function(req, res) {
        res.setHeader("Content-Type", "text/html");
        fs.readFile(__dirname + "/trip.html", "utf-8", function(err, data) {
            if (err) throw err;
            res.end(data.replace("MAGIC_NAV", nav), "utf-8");
        });
    });

    app.get('/fahrtenbuch', ensureAuthenticated, function(req, res) {
        var path = req.path;
        var dates = new parseDates(req.query.from, req.query.to);
        var from = makeDate(dates.fromQ);
        var to = makeDate(dates.toQ);
        res.setHeader("Content-Type", "text/html");
        fs.readFile(__dirname + "/fahrtenbuch.html", "utf-8", function(err, data) {
            if (err) throw err;
            var lltable = "[0,0,0,0]";
            var table = "<thead><tr><th colspan=9 id='title'>Fahrtenbuch</th></tr>\n";
            table += "<tr><th colspan=6 class='left' id='Fahrer'>Fahrer: <span id='fahrername'>Tesla Fahrer</span></th><th colspan=3 class='left'>Abgabedatum:</th></tr>\n";
            table += "<tr><th colspan=2>Abfahrt</th><th colspan=2>Ankunft</th>";
            table += "<th rowspan=2>Wegstrecke</th><th rowspan=2>Reisezweck</th><th rowspan=2>Auto<br>Kennzeichen</th>";
            table += "<th rowspan=2>KM Stand am<br>Zielort</th><th rowspan=2>Unterschrift</th></tr>";
            table += "<tr><th>Datum</th><th>Zeit</th><th>Datum</th><th>Zeit</th></tr></thead>";
            MongoClient.connect(mongoUri, function(err, db) {
                if(err) {
                    console.log('error connecting to database:', err);
                    return;
                }
                var collection = db.collection("trip_data");
                // strangely the timestamps end up in the database as strings
                var searchString = {$and: [ {'from': {$gte: ""+from.getTime()}}, {'to': {$lte: ""+to.getTime()}} ] };
                collection.find(searchString).toArray(function(err,docs) {
                    var row = 0;
                    if (argv.verbose) console.log("got datasets:", docs.length);
                    table += "<tbody>\n";
                    docs.forEach(function(doc) {
                        row++;
                        table += "<tr>";
                        var depart = new Date(+doc.from);
                        var arrive = new Date(+doc.to);
                        table += "<td>" + depart.getDate() + "." + (depart.getMonth() + 1) + "." + (1900 + depart.getYear()) +"</td>";
                        table += "<td>" + depart.getHours() + ":" + lZ(depart.getMinutes())  + "</td>";
                        table += "<td>" + arrive.getDate() + "." + (arrive.getMonth() + 1) + "." + (1900 + arrive.getYear()) +"</td>";
                        table += "<td>" + arrive.getHours() + ":" + lZ(arrive.getMinutes())  + "</td>";
                        table += "<td>" + (1.609 * parseFloat(doc.dist)).toFixed(1) + "km</td>";
                        if (doc.type === "business")
                            table += "<td>" + doc.name + "</td>";
                        else
                            table += "<td>privat</td>";
                        table += "<td><span class='kennzeichen'/></td>";
                        table += "<td>" + (1.609 * parseFloat(doc.odo)).toFixed(1) + "</td>";
                        table += "<td></td>";
                        table += "</tr>\n";
                        // the client side of this then fills in the addresses
                        table += "<tr><td colspan=4 id='start" + row + "'/></td><td colspan=2 id='stop" + row + "'></td></tr>\n";
                        if (doc.type === "business" && doc.start !== undefined && doc.end !== undefined)
                            lltable += ",[" + doc.start.lat + "," + doc.start.lng + "," + doc.end.lat + "," + doc.end.lng + "]";
                        else
                            lltable += ",[0,0,0,0]";
                    });
                    table += "</tbody>\n";
                    db.close();
                    res.end(data.replace("MAGIC_NAV", nav)
                            .replace("MAGIC_TRIP_TABLE", table)
                            .replace("MAGIC_ADDR_TABLE", lltable), "utf-8");
                });
            });
        });
    });

    // that's all it takes to deliver the static files in the otherfiles subdirectory
    app.use(baseUrl, express.static(__dirname + '/otherfiles'));
});

app.listen(argv.port);

if (!argv.silent) console.log("Server running on port " + argv.port);
