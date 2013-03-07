#!/usr/bin/env node
var teslams = require('../teslams');
var argv = require('optimist')
	.usage('Usage: $0 -u username -p password ')
	.alias('u', 'username')
	.describe('u', 'Teslamotors.com login')
	.demand('u')
	.alias('p', 'password')
	.describe('p', 'Teslamotors.com password')
	.demand('p')
	.argv;

if ( argv.help == true ) {
	console.log( 'Usage: chargebar.js -u <username> -p <password>');
	process.exit(1);
}

var creds = { 
	email: argv.username, 
	password: argv.password 
};

var multimeter = require('multimeter');
var multi = multimeter(process);

// exit nicely and turn cursor back on
multi.on('^C', function () {
    multi.charm.cursor(true);
    multi.write('\n').destroy();
    process.exit();
});

multi.charm.cursor(false);  // turn off cursor during bar updating

//console.log('Battery Charging Data\n\n\n'); // make some room for 3 bars and then make them in an array
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
bars[0].percent( 0, msg='Initializing...' );
bars[1].percent( 0, msg='Initializing...' );
bars[2].percent( 0, msg='Initializing...' );

teslams.vehicles( { email: creds.email, password: creds.password }, function ( vehicles ) {
	if (vehicles.id == undefined) {
		// console.log("Error: Undefined vehicle id");
	} else {
		teslams.get_gui_settings( vehicles.id, function( gs ) {
		  var iv = setInterval( function () {
			teslams.get_charge_state( vehicles.id, function ( cs ) {
				var p = cs.charger_power;
				var v = cs.charger_voltage;
				var i = cs.charger_actual_current + '/' + cs.charger_pilot_current 
				var ttfc = (cs.time_to_full_charge>1)?cs.time_to_full_charge + ' hours':(cs.time_to_full_charge*60).toPrecision(3) + ' minutes';
				var r = (cs.charge_to_max_range == false)?'STANDARD':'MAX RANGE';
				bars[2].percent( p, msg=' Charger: ' + p + 'kW, ' + v + ' V, ' + i + ' A          ');
				bars[1].percent( cs.battery_level, msg=' Level: ' + cs.battery_level + '% (' + cs.battery_range + ' ' + gs.gui_range_display + ' miles)         ');
				bars[0].percent( (cs.charge_rate<0)?0:cs.charge_rate, msg=' Charge Rate: ' + cs.charge_rate + ' ' + gs.gui_charge_rate_units + '           ');
				multi.charm
					.down(1)
					.write('Charging State: ' + cs.charging_state + '              \n')
					.write('Range: ' + r + '              \n')
					.write('Time to full : ' + ttfc + '                \n')
					.up(4);
				if (cs.charging_state == 'Complete') {
    					multi.charm.cursor(true);
    					multi.write('\n').destroy();
					console.log('\ncomplete\n');
					process.exit();
				}
			});
		  }, 10000);
		});
	}
});
