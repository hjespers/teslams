
var strings = {
	"label": {
		"distance": {
			"en": "Distance",
			"de": "Distanz"
		},
		"energy used": {
			"en": "Energy Used",
			"de": "Energieverbrauch"
		},
		"energy lost": {
			"en": "Energy Lost",
			"de": "Energieverlust"
		},
		"charge": {
			"en": "Charge",
			"de": "Ladung"
		},
		"average": {
			"en": "Average",
			"de": "Durchschnitt"
		},
		"Tesla Daily and Weekly Summary Chart": {
			"en": "Tesla Daily and Weekly Summary Chart",
			"de": "Tesla Tages- und Wochenstatistik"
		},
		"Daily plot, starting": {
			"en": "Daily plot, starting",
			"de": "Tagesstatistik ab"
		},
		"Weekly plot": {
			"en": "Weekly plot",
			"de": "Wochenstatistik"
		},
		"Start time": {
			"en": "Start time",
			"de": "Von"
		},
		"End time": {
			"en": "End time",
			"de": "Bis"
		},
		"speed": {
			"en": "Speed",
			"de": "Geschwindigkeit"
		},
		"energy": {
			"en": "Energy",
			"de": "Energie"
		},
		"current": {
			"en": "Current",
			"de": "Strom"
		},
		"voltage": {
			"en": "Voltage",
			"de": "Spannung"
		},
		"power": {
			"en": "Power",
			"de": "Leistung"
		},
		"Tesla Energy Chart": {
			"en": "Tesla Energy Chart",
			"de": "Tesla Energie- und Fahrdaten"
		},
		"Energy and speed plot, starting": {
			"en": "Energy and speed plot, starting",
			"de": "Energie und Geschwindigkeit ab"
		},
		"Total energy expended": {
			"en": "Total energy expended",
			"de": "Gesamtenergieverbrauch"
		},
		"total energy regen": {
			"en": "Total energy regen",
			"de": "Gesamtenergierückgewinnung"
		},
		"Voltage and current while charging.": {
			"en": "Voltage and current while charging.",
			"de": "Spannung und Strom beim Laden."
		},
		"Maximum charge power:": {
			"en": "Maximum charge power:",
			"de": "Maximale Ladeleistung:"
		},
		"SOC and rated range": {
			"en": "SOC and rated range",
			"de": "Ladung und offizielle Reichweite"
		},
		"SOC": {
			"en": "SOC",
			"de": "Ladung"
		},
		"rated range": {
			"en": "Rated range",
			"de": "Offizielle Reichweite"
		},
		"at": {
			"en": "at",
			"de": "am"
		},
		"Start Updates": {
			"en": "Start Updates",
			"de": "Aktualisieren"
		},
		"Stop Updates": {
			"en": "Stop Updates",
			"de": "Nicht mehr aktualisieren"
		},
		"range": {
			"en": "range",
			"de": "Reichweite"
		},
		"odometer": {
			"en": "odometer",
			"de": "km-Stand"
		},
		"going": {
			"en": "going",
			"de": "Tacho"
		},
		"parked": {
			"en": "parked",
			"de": "geparkt"
		},
		"parked and charging": {
			"en": "parked and charging",
			"de": "geparkt und aufladend"
		},
		"Center map on marker": {
			"en": "Center map on marker",
			"de": "Karte zentrieren"
		},
		"Stop centering map": {
			"en": "Stop centering map",
			"de": "Karte nicht zentrieren"
		},
		"Replay Speed (real time = 1x)": {
			"en": "Replay Speed (real time = 1x)",
			"de": "Zeitraffer (Echtzeit = 1x)"
		},
		"Replay Control": {
			"en": "Replay Control",
			"de": "Zeitpunkt"
		}
	},
	"metric": {
		"distance": {
			"conversion": function(dist) { return dist * 1.609; },
			"en": "km"
		},
		"energy": {
			"conversion": function(e) { return e; },
			"en": "kWh"
		},
		"energy_per_distance": {
			"conversion": function(e) { return e / 1.609; },
			"en": "Wh/km"
		},
		"speed_long": {
			"conversion": function(speed) { return speed * 1.609; },
			"en": "km/h"
		},
		"speed": {
			"conversion": function(speed) { return speed * 1.609; },
			"en": "km/h"
		}
	},
	"imperial": {
		"distance": {
			"conversion": function(dist) { return dist; },
			"en": "miles",
			"de": "Meilen"
		},
		"energy_per_distance": {
			"conversion": function(e) { return e; },
			"en": "Wh/mile",
			"de": "Wh/Meile"
		},
		"speed_long": {
			"conversion": function(speed) { return speed; },
			"en": "miles/hour",
			"de": "Meilen/Stunde"
		},
		"speed": {
			"conversion": function(speed) { return speed; },
			"en": "mph"
		}
	}
};
function conv(k1, k2, k3) {
	if (strings[k1][k2] === undefined)
		k1 = "metric";
	if (strings[k1][k2][k3] === undefined) {
		if (strings[k1][k2]["en"] === undefined)
			return "no conversion for " + k2;
		return strings[k1][k2]["en"];
	}
	return strings[k1][k2][k3];
}
function compareTime(a,b){
	var as = (a.replace(" ","-")+"-0").split("-");
	var bs = (b.replace(" ","-")+"-0").split("-");
	for (var i = 0; i < 6; i++) {
		if (+as[i] < +bs[i])
			return -1;
		if (+as[i] > +bs[i])
			return +1;
	}
	return 0;
}
function sameDate(a, b) {
	var as = a.split("-");
	var bs = b.split("-");
	for (var i = 0; i < 3; i++) {
		if (+as[i] != +bs[i])
			return false;
	}
	return true;
}
function makeDate(string, offset) {
	var args = string.replace('%20','-').replace(' ','-').split('-');
	var date = new Date(args[0], args[1]-1, args[2], args[3], args[4], args[5]);
	if (offset != null)
		date = +date + offset;
	return new Date(date);
}
function normalizeDate(date) {
	var c = date.replace('%20','-').replace(' ','-').split('-');
	while (c.length < 6)
		c.push('00');
	return c[0] + '-' + c[1] + '-' + c[2] + ' ' + c[3] + '-' + c[4] + '-' + c[5];
}
function dateString(time) {
	return time.getFullYear() + '-' + (time.getMonth()+1) + '-' + time.getDate() + ' ' +
		time.getHours() + '-' + time.getMinutes() + '-' + time.getSeconds();
}
function parseDates(fromQ, toQ) {
	if (toQ == null || toQ == "" || toQ.split('-').count < 2) // no valid to argument -> to = now
		datepickers.toQ = dateString(new Date());
	else
		datepickers.toQ = normalizeDate(toQ);
	if (fromQ == null || fromQ == "" || fromQ.split('-').count < 2) // no valid from argument -> 12h before to
		datepickers.fromQ = dateString(makeDate(datepickers.toQ, -12 * 3600 * 1000));
	else
		datepickers.fromQ = normalizeDate(fromQ);
}
function datepickers(url, params) {
	$("#frompicker").datetimepicker({
		dateFormat: "yy-mm-dd",
		timeFormat: "HH-mm-ss",
		separator: " ",
		defaultValue: datepickers.fromQ,
		onClose: function(dateText, inst) {
			var dt = dateText.replace(' ','-');
			if (dt.length > 10 && compareTime(dt, datepickers.fromQ) != 0) {
				if (compareTime(dt, datepickers.toQ.replace(' ','-')) < 0) {
					self.location = url + "?from=" + dt + "&to=" + datepickers.toQ.replace(' ','-') + params;
				} else {
					datepickers.fromQ = dt;
				}
			}
		}
	});
	$("#topicker").datetimepicker({
		dateFormat: "yy-mm-dd",
		timeFormat: "HH-mm-ss",
		separator: " ",
		defaultValue: datepickers.toQ,
		onClose: function(dateText, inst) {
			var dt = dateText.replace(' ','-');
			if (dt.length > 10 && compareTime(dt, datepickers.toQ) != 0) {
				if (compareTime(datepickers.fromQ.replace(' ','-'), dt) < 0) {
					self.location = url + "?from=" + datepickers.fromQ.replace(' ','-') + "&to=" + dt + params;
				} else {
					datepickers.toQ = dt;
				}
			}
		}
	});
}
