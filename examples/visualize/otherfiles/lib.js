function compareTime(a,b){
	var as = (a+"-0").split("-");
	var bs = (b+"-0").split("-");
	for (var i = 0; i < 6; i++) {
		if (+as[i] < +bs[i])
			return -1;
		if (+as[i] > +bs[i])
			return +1;
	}
console.log(0);
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

