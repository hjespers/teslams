#!/usr/bin/env node
require('pkginfo')(module, 'version');

var JSONbig = require('json-bigint');
var util = require('util');
var teslams = require('../teslams.js');
var argv = require('optimist')
    .usage('Usage: $0 -u <username> -p <password> -acdFgHimMPtvVwXZ -A [on|off] -C [start|stop] -R [std|max|50-90,100] -S [close|vent|comfort|open|0-100] -L [lock|unlock] -T temp')
    .alias('u', 'username')
    .describe('u', 'Teslamotors.com login')
    .alias('p', 'password')
    .describe('p', 'Teslamotors.com password')
    .boolean(['a', 'c', 'd', 'F', 'g', 'H', 'i', 'm', 'P', 't', 'v', 'w', 'Z'])
    .alias('a', 'all')
    .describe('a', 'Print information about all vehicles on the account')
    .describe('c', 'Display the charge state')
    .describe('d', 'Display the drive state')
    .alias('d', 'drive')
    .describe('F', 'Flash the car headlights')
    .alias('F', 'flash')
    .describe('g', 'Display the GUI settings')
    .alias('g', 'gui')
    .alias('H', 'honk')
    .describe('H', 'Honk the car horn')
    .alias('i', 'info')
    .describe('i', 'Print vehicle information')
    .describe('m', 'Display the mobile state')
    .alias('m', 'mobile')
    .describe('P', 'Open charge port door')
    .alias('P', 'port')
    .describe('t', 'Display the climate/temp state')
    .describe('v', 'Display the vehicle state')
    .alias('w', 'wake')
    .describe('w', 'Wake up the car telemetry')
    .alias('X', 'isplugged')
    .describe('X', 'Check if car is plugged in and continue only if connected to a charger')
    .alias('Z', 'isawake')
    .describe('Z', 'Check if car is asleep and continue only if awake')
    .alias('R', 'range')
    .describe('R', 'Charging range mode: "std" or "max"')
    .alias('S', 'roof')
    .alias('S', 'sunroof')
    .describe('S', 'Move the car sunroof to: "close", "vent", "comfort", "open" or any percent')
    .alias('T', 'temp')
    .describe('T', 'Set the car climate control temperature (in Celcius)')
    .alias('L', 'lock')
    .describe('L', 'Lock/Unlock the car doors')
    .alias('A', 'climate')
    .alias('A', 'air')
    .describe('A', 'Turn the air conditioning and heating on/off')
    .alias('M', 'metric')
    .describe('M', 'Convert and print all values into metric units')
    .alias('C', 'charge')   
    .describe('C', 'Turn the charging on/off')
    .alias('V', 'version')   
    .describe('V', 'Print the version of teslams')
    .alias('?', 'help')
    .describe('?', 'Print usage information');


// get credentials either from command line or config.json in ~/.teslams/config.js
var creds = require('./config.js').config(argv);
argv = argv.argv;

if ( argv.help === true ) {
    console.log( 'Usage: teslacmd.js -u <username> -p <password> -acdFgHimPtvVwXZ');
    console.log( '                   -A [on|off] -C [start|stop] -R [std|max|50-90|100]');
    console.log( '                   -S [close|vent|comfort|open|0-100] -L [lock|unlock] -T temp');
    console.log( '\nOptions:');
    console.log( '  -u, --username  Teslamotors.com login                                                       [required]');
    console.log( '  -p, --password  Teslamotors.com password                                                    [required]');
    console.log( '  -a, --all       Print info for all vehicle on the users account                             [boolean]');
    console.log( '  -c              Display the charge state                                                    [boolean]');
    console.log( '  -d, --drive     Display the drive state                                                     [boolean]');
    console.log( '  -F, --flash     Flash the car headlights                                                    [boolean]');
    console.log( '  -g, --gui       Display the GUI settings                                                    [boolean]');
    console.log( '  -H, --honk      Honk the car horn                                                           [boolean]');
    console.log( '  -m, --mobile    Display the mobile state                                                    [boolean]');
    console.log( '  -M, --metric    Convert measurements in metric unit                                         [boolean]');
    console.log( '  -P, --port      Open charge port door                                                       [boolean]');
    console.log( '  -t              Display the climate/temp state                                              [boolean]');
    console.log( '  -v              Display the vehicle state                                                   [boolean]');
    console.log( '  -i, --info      Print vehicle info                                                          [boolean]');
    console.log( '  -V, --version   Print version of teslams software                                           [boolean]');
    console.log( '  -w, --wake      Wake up the car telemetry                                                   [boolean]');
    console.log( '  -X, --isplugged Check if car is plugged in and continue only if connected to a charger      [boolean]');
    console.log( '  -Z, --isawake   Check if car is asleep and continue only if awake                           [boolean]');
    console.log( '  -A, --climate   Turn the air conditioning and heating on/off                              ');
    console.log( '  -C, --charge    Turn the charging on/off                                                  ');
    console.log( '  -R, --range     Charging range mode: "std" or "max" or any percent from 50-90 or 100      ');
    console.log( '  -S, --roof      Move the car sunroof to: "close", "vent", "comfort", "open" or any percent');
    console.log( '  -L, --lock      Lock/Unlock the car doors                                                 ');
    console.log( '  -T, --temp      Set the car climate control temperature (in Celcius)                      ');
    console.log( '  -?, --help      Print usage information                                                   ');
    process.exit();
}

if (argv.version) {
    console.log( module.exports.version );
    process.exit();
}

function pr( stuff ) {
    console.log( util.inspect(stuff) );
}

function parseArgs( vehicle ) {
    var vid = vehicle.id, err;
    if (argv.i) { 
        vehicle.id = vehicle.id.toString();
        vehicle.vehicle_id = vehicle.vehicle_id.toString();
        pr(vehicle); 
    }
    // wake up the car's telematics system
    if (argv.w) {
        teslams.wake_up( vid, pr );
    }

    //
    // get some info
    //
    if (argv.m) {
        teslams.mobile_enabled( vid, pr );
    }
    if (argv.c) {
        teslams.get_charge_state( vid, function ( cs ) {
            if (argv.metric) {
                if (cs.battery_range !== undefined) cs.metric_battery_range = (cs.battery_range * 1.609344).toFixed(2);
                if (cs.est_battery_range !== undefined) cs.metric_est_battery_range = (cs.est_battery_range * 1.609344).toFixed(2);
                if (cs.ideal_battery_range !== undefined) cs.metric_ideal_battery_range = (cs.ideal_battery_range * 1.609344).toFixed(2);
            } 
            pr(cs);
        } );
    }
    if (argv.t) {

        teslams.get_climate_state( vid, pr);

    }
    if (argv.d) {
        teslams.get_drive_state( vid, function (ds) {
            //console.log( typeof ds.speed);
            if (argv.metric && typeof ds.speed !== "undefined") {
                if (ds.speed === null) {
                    ds.metric_speed = null;
                } else {
                    ds.metric_speed = (ds.speed * 1.609344).toFixed(0);
                }
            }
            pr(ds);
        });
    }
    if (argv.v) {
        teslams.get_vehicle_state( vid, pr );
    }
    if (argv.g) {
        teslams.get_gui_settings( vid, pr );
    }
    //
    //  cute but annoying stuff while debugging
    //
    if (argv.F) {
        teslams.flash( vid, pr ); 
    }
    if (argv.H) {
        teslams.honk( vid, pr ); 
    }
    if (argv.P) {
        teslams.open_charge_port( vid, pr );
    }
    //
    // control some stuff
    //
    if ( argv.lock !== undefined ) {
        teslams.door_lock( {id: vid, lock: argv.lock }, pr );
    }
    if ( argv.roof !== undefined ) {
        if ( argv.roof >= 0 && argv.roof <= 100 ) {
            teslams.sun_roof( {id: vid, roof: 'move', percent: argv.roof }, pr );
        } else if (argv.roof == "open" || argv.roof == "close" || argv.roof == "comfort" || argv.roof == "vent") {
            teslams.sun_roof( {id: vid, roof: argv.roof }, pr );
        } else {
            err = new Error("Invalid sun roof state. Specify 0-100 percent, 'open', 'close', 'comfort' or 'vent'");
            return pr( err );           
        }
    }
    if ( argv.climate !== undefined ) {
        teslams.auto_conditioning( { id: vid, climate: argv.climate}, pr ); 
    }
    if ( argv.range !== undefined ) {
        if ( argv.range >= 50 && argv.range <= 100 ) {
            teslams.charge_range( { id: vid, range: 'set', percent: argv.range }, pr );
        } else {
            teslams.charge_range( { id: vid, range: argv.range }, pr ); 
        }
    }
    if ( argv.charge !== undefined ) {
        if (argv.charge == "start" || argv.charge == "stop" ) {
            teslams.charge_state( { id: vid, charge: argv.charge }, pr ); 
        } else {
            err = new Error("Invalid charge state. Use 'start' or 'stop'");
            return pr( err );
        }
    }
    if ( argv.temp !== undefined ) {
        if ( argv.temp <= teslams.TEMP_HI && argv.temp >= teslams.TEMP_LO) {
            teslams.set_temperature( { id: vid, dtemp: argv.temp}, pr); 
        } else {
            err = new Error("Invalid temperature. Valid range is " + teslams.TEMP_LO + " - " + teslams.TEMP_HI + " C" );
            return pr( err );
        }
    }
}


teslams.all( { email: creds.username, password: creds.password }, function ( error, response, body ) {
    var data, vehicle;
    //check we got a valid JSON response from Tesla
    try { 
        data = JSONbig.parse(body); 
    } catch(err) { 
        pr(new Error('login failed')); 
        process.exit(1);
    }
    //check we got an array of vehicles and get the first one
        if (!util.isArray(data.response)) {
        pr(new Error('expecting an array from Tesla Motors cloud service'));
        process.exit(1);
    }
        vehicle = data.response[0];
    //check the vehicle has a valid id
    if (vehicle.id === undefined) {
        pr( new Error('expecting vehicle ID from Tesla Motors cloud service'));
        process.exit(1);
    }
    if (argv.all) { pr(body); }
    // first some checks to see if we should even continue
    if (argv.isawake && vehicle.state == 'asleep') {
        pr(new Error('exiting because car is asleep'));
        process.exit(1);
    } else if (argv.isplugged) { 
        // safe to call get_charge_state because not asleep or don't care
        teslams.get_charge_state( vehicle.id, function ( cs ) { 
            if (cs.charging_state == 'Disconnected') {
                pr( new Error('exiting because car is not plugged in'));
                process.exit(1);
            } else { 
                // passed through all exit condition checks 
                parseArgs( vehicle );
            }
        });
    } else {
        // passed through all exit condition checks 
        setTimeout(function(){ parseArgs( vehicle ); }, 5000);
    }
});
