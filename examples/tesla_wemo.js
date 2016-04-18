#!/usr/bin/env node
var wemore = require('wemore');
var util = require('util');
var teslams = require('../teslams.js');
var JSONbig = require('json-bigint');

// get credentials either from command line or config.json in ~/.teslams/config.js
var argv = require('optimist')
    .usage('Usage: $0 -u <username> -p <password> -XZ -P [port] -O [offset]')
    .alias('u', 'username')
    .describe('u', 'Teslamotors.com login')
    .alias('p', 'password')
    .describe('p', 'Teslamotors.com password')
    .describe('P', 'HTTP Listen Port (default is 9001)')
    .alias('P', 'port')
    .default('P', '9001')
    .alias('O', 'vehicle')   
    .describe('O', 'Select the vehicle offset for accounts with multiple vehicles')
    .default('O', 0)
    .boolean(['X', 'Z'])
    .alias('X', 'isplugged')
    .describe('X', 'Check if car is plugged in and continue only if connected to a charger')
    .alias('Z', 'isawake')
    .describe('Z', 'Check if car is asleep and continue only if awake')
    .alias('?', 'help')
    .describe('?', 'Print usage information');

var creds = require('./config.js').config(argv);
argv = argv.argv;

if (argv.help === true) {
    console.log('Usage: tesla_wemo -u <username> -p <password> -XZ');
    console.log('                  -P [listen port (default 8888)]');
    console.log('\nOptions:');
    console.log('  -u, --username  Teslamotors.com login                   ');
    console.log('  -p, --password  Teslamotors.com password                ');
    console.log('  -P, --port      HTTP listen port                               [default:9001]');
    console.log('  -O, --vehicle   Vehicle offset for multi-vehicle accounts      [default: 0]  ');
    console.log('  -X, --isplugged Check if car is plugged in and continue only if connected to a charger      [boolean]');
    console.log('  -Z, --isawake   Check if car is asleep and continue only if awake                           [boolean]');
    console.log('  -?, --help      Print usage information                 ');
    process.exit(1);
}

var listenport = argv.port, climateport;
if (isNaN(listenport) || listenport < 1) {
    console.log("missing or incorrect listen port: '" + listenport + "' using default 9001 and 9002\n");
    listenport = 9001;
    climateport = 9002;
} else {
	var climateport = parseInt(listenport) + 1;
}
console.log("wemo emulator running on listen ports " + listenport + ' and ' + climateport);

teslams.all({ email: creds.username, password: creds.password }, function (error, response, body) {
    "use strict";

    function pr(stuff) {
        console.log(util.inspect(stuff));
    }

    var data, vehicle;
    //check we got a valid JSON response from Tesla
    try {
        data = JSONbig.parse(body);
    } catch (err) {
        pr(new Error('parsing error: ' + err ));
        process.exit(1);
    }
    //check we got an array of vehicles and get the first one
    if (!util.isArray(data.response)) {
        console.log( data.response );
        pr(new Error('expecting an array from Tesla Motors cloud service'));
        process.exit(1);
    }
    //vehicle = data.response[argv.vehicle];
    vehicle = data.response[0];
    //check the vehicle has a valid id
    if (vehicle.id_s === undefined) {
        pr(new Error('No vehicle data returned for car number ' + argv.vehicle));
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
    var charger = wemore.Emulate({friendlyName: "MyTesla Charger", port: listenport}); 
	var climate = wemore.Emulate({friendlyName: "MyTesla Climate", port: climateport}); 

	charger.on('listening', function() {
	    // if you want it, you can get it:
	    console.log("my tesla charger listening on", this.port);
	});

	charger.on('state', function(binaryState) {
	    console.log("charger set to=", binaryState);
	});

	// also, 'on' and 'off' events corresponding to binary state
	charger.on('on', function() {
		teslams.charge_state({ id: vehicle.id, charge: 'start' }, function (resp) {
			console.log("charger turned on");
			console.log(resp);
		});
	});

	charger.on('off', function() {
		teslams.charge_state({ id: vehicle.id, charge: 'stop' }, function (resp) {
			console.log("charger turned off");
			console.log(resp);
		});
	});

	climate.on('listening', function() {
	    // if you want it, you can get it:
	    console.log("my tesla climate listening on", this.port);
	});

	climate.on('state', function(binaryState) {
	    console.log("climate set to=", binaryState);
	});

	// also, 'on' and 'off' events corresponding to binary state
	climate.on('on', function() {
		teslams.auto_conditioning({ id: vehicle.id, climate: 'on' }, function (resp) {
			console.log("climate turned on");
			console.log(resp);
		});
	});

	climate.on('off', function() {
		teslams.auto_conditioning({ id: vehicle.id, climate: 'off' }, function (resp) {
			console.log("climate turned off");
			console.log(resp);
		});
	});
});
