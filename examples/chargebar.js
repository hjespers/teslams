#!/usr/bin/env node
var teslams = require('../teslams');
var argv = require('optimist')
    .usage('Usage: $0 -u username -p password ')
    .alias('u', 'username')
    .describe('u', 'Teslamotors.com login')
    .alias('p', 'password')
    .describe('p', 'Teslamotors.com password');

// get credentials either from command line or config.json in ~/.teslams/config.js
var creds = require('./config.js').config(argv);

argv = argv.argv;

if ( argv.help == true ) {
    console.log( 'Usage: chargebar.js -u <username> -p <password>');
    process.exit(1);
}

var multimeter = require('multimeter-hj');
var multi = multimeter(process);

// exit nicely and turn cursor back on
multi.charm.removeAllListeners('^C');
multi.charm.on('^C', function () {
    multi.charm.cursor(true);
    multi.write('\n\n\n').destroy();
    process.exit();
});

multi.charm.cursor(false);  // turn off cursor during bar updating

multi.charm
    .erase('screen')
    .position(0,0)
    .write('Tesla Model S Charge Monitor\n')
    .position(0,6);

var bars = [];
var bar0 = multi.rel(0,1, {
    width: 60, 
    solid: { text : ' ', foreground : 'white', background: 'red'}, 
    empty : { text : ' ' }  
    });

bars.push(bar0);
var bar1 = multi.rel(0,2, {
    width: 60, 
    solid: { text : ' ', foreground : 'white', background: 'blue'}, 
    empty : { text : ' ' }  
});
bars.push(bar1);
var bar2 = multi.rel(0,3, {
    width: 60, 
    solid: { text : ' ', foreground : 'white', background: 'yellow'}, 
    empty : { text : ' ' }  
});
bars.push(bar2);
var msg;
bars[0].percent( 0, msg='Initializing...' );
bars[1].percent( 0, msg='Initializing...' );
bars[2].percent( 0, msg='Initializing...' );

teslams.vehicles( { email: creds.username, password: creds.password }, function ( vehicles ) {
    if (vehicles.id == undefined) {
        // console.log("Error: Undefined vehicle id");
    } else {
        bars[0].percent( 50, msg='Initializing...' );
        bars[1].percent( 50, msg='Initializing...' );
        bars[2].percent( 50, msg='Initializing...' );
        teslams.get_gui_settings( vehicles.id, function( gs ) {
            bars[0].percent( 100, msg='Initializing...' );
            bars[1].percent( 100, msg='Initializing...' );
            bars[2].percent( 100, msg='Initializing...' );
            get_info( gs, vehicles ); // inital request for data to display 
            var iv = setInterval( function () { 
                get_info( gs, vehicles ); 
            }, 10000); // Poll every 10 sec for refreshed data and update of bars
        });
    }
});


function get_info( gs, vehicles ) {
            teslams.get_charge_state( vehicles.id, function ( cs ) {
                var p = cs.charger_power;
                var v = cs.charger_voltage;
                var i = cs.charger_actual_current + '/' + cs.charger_pilot_current;
                var ttfc = "";
                if (cs.time_to_full_charge > 1) {
                    ttfc = cs.time_to_full_charge + ' hours';
                } else if (cs.time_to_full_charge <= 0) {
                    ttfc = 'N/A'; 
                } else {
                    ttfc = (cs.time_to_full_charge*60).toPrecision(3) + ' minutes';
                }
                var r = (cs.charge_to_max_range == false)?'STANDARD':'MAX RANGE';
                if ( cs.charge_limit_soc != null ) {
                    r = cs.charge_limit_soc + '% limit set';
                }
                if ( cs.fast_charger_present ) {
                    bars[2].percent( p, msg=' Supercharger: ' + Math.abs(p) + 'kW, ' + v + ' V, ' + cs.battery_current + ' A                ');
                } else {
                    bars[2].percent( p, msg=' Charger: ' + p + 'kW, ' + v + ' V, ' + i + ' A               ');
                }
                bars[1].percent( cs.battery_level, msg=' Level: ' + cs.battery_level + '% (' + cs.battery_range + ' ' + gs.gui_range_display + ' miles)         ');
                bars[0].percent( (cs.charge_rate<0)?0:cs.charge_rate, msg=' Charge Rate: ' + cs.charge_rate + ' ' + gs.gui_distance_units + '           ');
                multi.charm
                    .down(1)
                    .write('Charging State: ' + cs.charging_state + '              \n')
                    .write('Range: ' + r + '              \n')
                    .write('Time to full : ' + ttfc + '                \n')
                    .up(4);
                if (cs.charging_state == 'Complete') {
                        multi.charm
                        .cursor(true)
                        .position(0,10);
                        multi.write('\n').destroy();
                    process.exit();
                }
            });
}
