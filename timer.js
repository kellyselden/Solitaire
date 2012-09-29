function TimerHelper(timer, countDown) {
	var timerHelper = this;
	var intervalID;
	this.start = function() {
		if (this.running) return;
		intervalID = setInterval(function() {
			var d = timerHelper.getTime();
			d.setSeconds(d.getSeconds() + (countDown ? -1 : 1));
			timer.innerHTML = d.toTimeString().split(' ')[0];
		}, 1000);
		this.running = true;
	}
	this.stop = function() {
		if (!this.running) return;
		clearInterval(intervalID);
		this.running = false;
	}
	this.getTime = function() {
		var array = timer.innerHTML.split(':').reverse();
		var seconds = array.shift();
		var minutes = array.shift();
		var hours = array.shift();
		return new Date(null, null, null, hours, minutes, seconds, null);
	}
}