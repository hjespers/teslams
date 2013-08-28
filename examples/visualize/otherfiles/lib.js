function compareTime(a,b){
	var as = (a+"-0").split("-");
	var bs = (b+"-0").split("-");
	for (var i = 0; i < 6; i++) {
		if (+as[i] < +bs[i])
			return -1;
		if (+as[i] > +bs[i])
			return +1;
	}
	return 0;
}
function sameDate(a, b) {
	console.log(a,b);
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
		datepickers.fromQ = normalizeDate(new Date(toQ));
	else
		datepickers.fromQ = normalizeDate(fromQ);
}
function datepickers(url) {
	$("#frompicker").datetimepicker({
		dateFormat: "yy-mm-dd",
		timeFormat: "HH-mm-ss",
		separator: " ",
		defaultValue: datepickers.fromQ,
		onClose: function(dateText, inst) {
			var dt = dateText.replace(' ','-');
			if (dt.length > 10 && compareTime(dt, datepickers.fromQ) != 0) {
				self.location = url + "?from=" + dt + "&to=" + datepickers.toQ.replace(' ','-')
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
				self.location = url + "?from=" + datepickers.fromQ.replace(' ','-') + "&to=" + dt
			}
		}
	});
}
