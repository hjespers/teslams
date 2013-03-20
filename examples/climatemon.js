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
	console.log( 'Usage: climatemon.js -u <username> -p <password>');
	process.exit(1);
}

var creds = { 
	email: argv.username, 
	password: argv.password 
};

var multimeter = require('multimeter');
var multi = multimeter(process);

// exit nicely and turn cursor back on
multi.charm.removeAllListeners('^C');
multi.charm.on('^C', function () {
    multi.charm.cursor(true);
    multi.write('\n\n\n').destroy();
    process.exit();
});

multi.charm.on('^D', function () {
    // toggle climate control on/off
    teslams.vehicles( { email: creds.email, password: creds.password }, function ( vehicles ) {
	if (vehicles.id == undefined) {
		// console.log("Error: Undefined vehicle id");
	} else {
		teslams.get_climate_state( vehicles.id, function ( cs ) {
			teslams.auto_conditioning( { id: vehicles.id, climate: !(cs.is_auto_conditioning_on) } ); 
		});
	}
    });
});

multi.charm.cursor(false);  // turn off cursor during bar updating

multi.charm
	.erase('screen')
	.position(0,0)
	.write('Tesla Model S Climate Monitor\n')
	.position(0,6);

var bars = [];
var bar0 = multi.rel(0,1, {
	width: 60, 
	solid: { text : ' ', foreground : 'white', background: 128}, 
	empty : { text : ' ' }	
});
var bar1 = multi.rel(0,2, {
	width: 60, 
	solid: { text : ' ', foreground : 'white', background: 'white'}, 
	empty : { text : ' ' }	
	});
var bar2 = multi.rel(0,3, {
	width: 60, 
	solid: { text : ' ', foreground : 'white', background: 128}, 
	empty : { text : ' ' }	
});
bars.push(bar0);
bars.push(bar1);
bars.push(bar2);
bars[0].ratio( 0, 120,  msg='Initializing...' );
bars[1].ratio( 0, 120, msg='Initializing...' );
bars[2].ratio( 0, 120, msg='Initializing...' );

teslams.vehicles( { email: creds.email, password: creds.password }, function ( vehicles ) {
	if (vehicles.id == undefined) {
		// console.log("Error: Undefined vehicle id");
	} else {
		teslams.get_gui_settings( vehicles.id, function( gs ) {
		  var iv = setInterval( function () {
			teslams.get_climate_state( vehicles.id, function ( cs ) {
				var itemp = cs.inside_temp;
				var otemp = cs.outside_temp;
				var dtemp = cs.driver_temp_setting;
				var ptemp = cs.passenger_temp_setting;
				var fs = (cs.fan_status > 0)?'Fan Speed: '+cs.fan_status:'Climate Control: OFF';
				var fd = (cs.is_front_defronster_on == true)?'ON':'OFF'; 
				var rd = (cs.is_rear_defronster_on == true)?'ON':'OFF'; 
				var ac = (cs.is_auto_conditioning_on == true)?'ON':'OFF'; 
				if ( cs.is_auto_conditioning_on ) {
					bar1.solid = { text : ' ', foreground : 'white', background: 'green'}; 
					bar2.solid = { text : ' ', foreground : 'white', background: 'blue'}; 
				} else if ( cs.fan_status > 0 ) {
					bar1.solid = { text : ' ', foreground : 'white', background: 'green'}; 
					bar2.solid = { text : ' ', foreground : 'white', background: 'red'}; 
				} else {
					bar1.solid = { text : ' ', foreground : 'white', background: 'white'}; 
					bar2.solid = { text : ' ', foreground : 'white', background: 128}; 
				}
				if (gs.gui_temperature_units == 'F') {
					var u = ' F';
					if (cs.inside_temp == null ) {
						itemp = null;
					} else {
						itemp = (itemp * 9/5 + 32).toFixed(1); 
					}
					if (cs.outside_temp == null ) {
						otemp = null;
					} else {
						otemp = (otemp * 9/5 + 32).toFixed(1); 
					}
					dtemp = (dtemp * 9/5 + 32).toFixed(1); 
					ptemp = (ptemp * 9/5 + 32).toFixed(1); 
				} else {
					//display in Celcius; 
					var u = ' C';
				}
				bars[2].ratio( itemp, 120, msg=' Interior Temp: ' + itemp + u + '          ');
				bars[1].ratio( dtemp, 120, msg=' Climate Setting: ' + dtemp + u + '          ');
				bars[0].ratio( otemp, 120, msg=' Exterior Temp: ' + otemp + u + '          ');
				multi.charm
					.down(1)
					.write(fs + '                                 \n')
					.write('Air Conditioning : ' + ac + '                         \n')
					.write('Defroster: Front (' + fd + '), Rear (' + rd + ')            \n')
					.up(4);
			});
		  }, 10000);
		});
	}
});
