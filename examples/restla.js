#!/usr/bin/env node
var util = require('util');
var teslams = require('../teslams.js');
var argv = require('optimist')
    .usage('Usage: $0 -u <username> -p <password> -XZ -P [port]')
    .alias('u', 'username')
    .describe('u', 'Teslamotors.com login')
    .alias('p', 'password')
    .describe('p', 'Teslamotors.com password')
    .describe('P', 'HTTP Listen Port (default is 8888)')
    .alias('P', 'port')
    .default('P', '8888')
    .boolean(['X', 'Z'])
    .alias('X', 'isplugged')
    .describe('X', 'Check if car is plugged in and continue only if connected to a charger')
    .alias('Z', 'isawake')
    .describe('Z', 'Check if car is asleep and continue only if awake')
    .alias('?', 'help')
    .describe('?', 'Print usage information');

// get credentials either from command line or config.json in ~/.teslams/config.js
var creds = require('./config.js').config(argv);
argv = argv.argv;

if (argv.help === true) {
    console.log('Usage: teslacmd.js -u <username> -p <password> -XZ');
    console.log('                   -P [listen port (default 8888)]');
    console.log('\nOptions:');
    console.log('  -u, --username  Teslamotors.com login                   ');
    console.log('  -p, --password  Teslamotors.com password                ');
    console.log('  -P, --port      HTTP listen port                        [default:8888]');
    console.log('  -X, --isplugged Check if car is plugged in and continue only if connected to a charger      [boolean]');
    console.log('  -Z, --isawake   Check if car is asleep and continue only if awake                           [boolean]');
    console.log('  -?, --help      Print usage information                 ');
    process.exit(1);
}

var http = require('http');
// set and check the validity of the HTTP listen port
// the environment variable $PORT is read for deployment on heroku
var httpport = process.env.PORT || argv.port;
if (isNaN(httpport) || httpport < 1) {
    console.log("missing or incorrect http listen port: '" + httpport + "' using default 8888\n");
    httpport = 8888;
}

function parseUrl(vehicle, req, res) {
    "use strict";

    function pr(stuff) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", 0);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(stuff));
    }

    var vid = vehicle.id, url = req.url;
    console.log('url: ' + url + '\n');

    switch (url) {
    case "/vehicle":
        teslams.vehicles(vid, function (resp) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", 0);
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(resp));
        });
        break;
    case "/mobile":
        teslams.mobile_enabled(vid, pr);
        break;
    case "/gui":
        teslams.get_gui_settings(vid, pr);
        break;
    case "/charge":
        teslams.get_charge_state(vid, pr);
        break;
    case "/charge/start":
        teslams.charge_state({ id: vid, charge: 'start' }, pr);
        break;
    case "/charge/stop":
        teslams.charge_state({ id: vid, charge: 'stop' }, pr);
        break;
    case "/charge/charging_state":
        teslams.get_charge_state(vid, function (resp) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", 0);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(resp.charging_state));
        });
        break;
    case "/charge/battery_range":
        teslams.get_charge_state(vid, function (resp) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", 0);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(resp.battery_range));
        });
        break;
    case "/charge/battery_level":
        teslams.get_charge_state(vid, function (resp) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", 0);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(resp.battery_level));
        });
        break;
    case "/climate":
        teslams.get_climate_state(vid, pr);
        break;
    case "/climate/on":
        teslams.auto_conditioning({ id: vid, climate: 'on' }, pr);
        break;
    case "/climate/off":
        teslams.auto_conditioning({ id: vid, climate: 'off' }, pr);
        break;
    case "/drive":
        teslams.get_drive_state(vid, pr);
        break;
    case "/lock":
        teslams.get_vehicle_state(vid, pr);
        break;
    case "/lock/on":
        teslams.door_lock({id: vid, lock: 'lock' }, pr);
        break;
    case "/lock/off":
        teslams.door_lock({id: vid, lock: 'unlock' }, pr);
        break;
    case "/unlock":
        teslams.door_lock({id: vid, lock: 'unlock' }, pr);
        break;
    case "/vehicle_state":
        teslams.get_vehicle_state(vid, pr);
        break;
    case "/vehicle_state/locked":
        teslams.get_vehicle_state(vid, function (resp) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", 0);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(resp.locked));
        });
        break;
    case "/flash":
        teslams.flash(vid, pr);
        break;
    case "/honk":
        teslams.honk(vid, pr);
        break;
    case "/port":
        teslams.open_charge_port(vid, pr);
        break;
    case "/roof":
        teslams.get_vehicle_state(vid, pr);
        break;
    case "/roof/percent/50":
        teslams.sun_roof({id: vid, roof: 'move', percent: '50' }, pr);
        break;
    case "/roof/open":
        teslams.sun_roof({id: vid, roof: 'open' }, pr);
        break;
    case "/roof/vent":
        teslams.sun_roof({id: vid, roof: 'vent' }, pr);
        break;
    case "/roof/comfort":
        teslams.sun_roof({id: vid, roof: 'comfort' }, pr);
        break;
    case "/roof/close":
        teslams.sun_roof({id: vid, roof: 'close' }, pr);
        break;
    case "/wake":
        teslams.wake_up(vid, pr);
        break;
    case "/range":
        teslams.get_charge_state(vid, pr);
        break;
    case "/range/70":
        teslams.charge_range({ id: vid, range: 'set', percent: '70' }, pr);
        break;
    case "/range/80":
        teslams.charge_range({ id: vid, range: 'set', percent: '80' }, pr);
        break;
    case "/range/std":
        teslams.charge_range({ id: vid, range: 'std' }, pr);
        break;
    case "/range/max":
        teslams.charge_range({ id: vid, range: 'max' }, pr);
        break;
    case "/help":
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", 0);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<html><body><table>');
        res.write('<tr><td><a href="../vehicle">/vehicle</a><td>Print vehicle info</tr>');
        res.write('<tr><td><a href="../vehicle_state">/vehicle_state</a><td>Display the vehicle state</tr>');
        res.write('<tr><td><a href="../charge">/charge</a><td>Display the charge state</tr>');
        res.write('<tr><td><a href="../charge/start">/charge/start</a><td>Start charging the car</tr>');
        res.write('<tr><td><a href="../charge/stop">/charge/stop</a><td>Stop charging the car</tr>');
        res.write('<tr><td><a href="../drive">/drive</a><td>Display the drive state</tr>');
        res.write('<tr><td><a href="../flash">/flash</a><td>Flash the car headlights</tr>');
        res.write('<tr><td><a href="../gui">/gui</a><td>Display the GUI settings</tr>');
        res.write('<tr><td><a href="../honk">/honk</a><td>Honk the car horn</tr>');
        res.write('<tr><td><a href="../mobile">/mobile</a><td>Display the mobile state</tr>');
        res.write('<tr><td><a href="../lock">/lock</a><td>Display the current state of the car door locks</tr>');
        res.write('<tr><td><a href="../lock/on">/lock/on</a><td>Lock the car doors</tr>');
        res.write('<tr><td><a href="../lock/off">/lock/off</a><td>Unlock the car doors</tr>');
        res.write('<tr><td><a href="../port">/port</a><td>Open charge port door</tr>');
        res.write('<tr><td><a href="../climate">/climate</a><td>Display the climate/temp state</tr>');
        res.write('<tr><td><a href="../climate/on">/climate/on<td>Turn the air conditioning and heating ON</tr>');
        res.write('<tr><td><a href="../climate/off">/climate/off<td>Turn the air conditioning and heating OFF</tr>');
        res.write('<tr><td><a href="../roof">/roof</a><td>Display the current state of the car sunroof</tr>');
        res.write('<tr><td><a href="../roof/open">/roof/open</a><td>Open the car sunroof</tr>');
        res.write('<tr><td><a href="../roof/vent">/roof/vent</a><td>Move the car sunroof to the vent position</tr>');
        res.write('<tr><td><a href="../roof/comfort">/roof/comfort</a><td>Move the car sunroof to the comfort position</tr>');
        res.write('<tr><td><a href="../roof/close">/roof/close</a><td>Close the car sunroof</tr>');
        res.write('<tr><td><a href="../range">/range</a><td>Display the current range settings</tr>');
        res.write('<tr><td><a href="../range/70">/range/70</a><td>Set charging to 70% SOC</tr>');
        res.write('<tr><td><a href="../range/80">/range/80</a><td>Set charging to 80% SOC</tr>');
        res.write('<tr><td><a href="../range/std">/range/std</a><td>Set charging to daily/standard range mode</tr>');
        res.write('<tr><td><a href="../range/max">/range/max</a><td>Set charging to trip/maximum range mode</tr>');
        res.write('<tr><td><a href="../wake">/wake</a><td>Wake up the car telemetry</tr>');
        //TODO
        //res.writeg'<tr><td>*/temp/{temp}<td>Set the car climate control temperature (in Celcius)</tr>');
        //  uses teslams.set_temperatureg{ id: vid, dtemp: argv.temp}, pr);
        //res.writeg'<tr><td>*/all<td>Print info for all vehicle on the users account</tr>');
        res.write('<tr><td><a href="../help">/help</a><td>Print this usage information</tr>');
        res.end('</table></body></html>');
        break;
    default:
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", 0);
        res.writeHead(501, {'Content-Type': 'text/plain'});
        res.end("Invalid URL\n");
    }
}

console.log("web server running on http://localhost:" + httpport);

teslams.all({ email: creds.username, password: creds.password }, function (error, response, body) {
    "use strict";

    function pr(stuff) {
        console.log(util.inspect(stuff));
    }

    var data, vehicle;
    //check we got a valid JSON response from Tesla
    try {
        data = JSON.parse(body);
    } catch (err) {
        pr(new Error('login failed'));
        process.exit(1);
    }
    //check we got an array of vehicles and get the first one
    if (!util.isArray(data)) {
        pr(new Error('expecting an array from Tesla Motors cloud service'));
        process.exit(1);
    }
    vehicle = data[0];
    //check the vehicle has a valid id
    if (vehicle.id === undefined) {
        pr(new Error('expecting vehicle ID from Tesla Motors cloud service'));
        process.exit(1);
    }
    // first some checks to see if we should even continue
    if (argv.isawake === true && vehicle.state === 'asleep') {
        pr(new Error('exiting because car is asleep'));
        process.exit(1);
    }
    if (argv.isplugged) {
        // safe to call get_charge_state because not asleep or don't care
        teslams.get_charge_state(vehicle.id, function (cs) {
            if (cs.charging_state === 'Disconnected') {
                pr(new Error('exiting because car is not plugged in'));
                process.exit(1);
            }
        });
    }
    // passed through all exit condition checks
    // require http module for the web server
    // start a web server and wait for requests to trigger TESLA Events
    http.createServer(function (req, res) {
        parseUrl(vehicle, req, res);
    }).listen(httpport);
});

