module.exports = {
   'checkgame': function(map) {
		var result = false;
		['x','o'].forEach(function(data) {
			if(map[0] == data && map[1] == data && map[2] == data)
				result = true;
			if(map[3] == data && map[4] == data && map[5] == data)
				result = true;
			if(map[6] == data && map[7] == data && map[8] == data)
				result = true;
			if(map[0] == data && map[3] == data && map[6] == data)
				result = true;
			if(map[1] == data && map[4] == data && map[7] == data)
				result = true;
			if(map[2] == data && map[5] == data && map[8] == data)
				result = true;
			if(map[0] == data && map[4] == data && map[8] == data)
				result = true;
			if(map[6] == data && map[4] == data && map[2] == data)
				result = true;
		});
		return result;
	},
	'sample': Array.prototype.sample = function(){
		return this[Math.floor(Math.random()*this.length)];
	},
	'replace': Array.prototype.replace = function(t, v) {
		if(this.indexOf(t)!= -1) this[this.map((e, i) => [i, e]).filter(e => e[1] == t)[0][0]] = v;
	}
}