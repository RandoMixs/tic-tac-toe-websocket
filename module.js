module.exports = {
   'checkgame': function(map) {
		var result = false;
		if(map[0] && map[1] && map[2] && map[3] && map[4] && map[5] && map[6] && map[7] && map[8])
			result = "tie";
		['x','o'].forEach(function(data) {
			if(map[0] == data && map[1] == data && map[2] == data)
				result = "win";
			if(map[3] == data && map[4] == data && map[5] == data)
				result = "win";
			if(map[6] == data && map[7] == data && map[8] == data)
				result = "win";
			if(map[0] == data && map[3] == data && map[6] == data)
				result = "win";
			if(map[1] == data && map[4] == data && map[7] == data)
				result = "win";
			if(map[2] == data && map[5] == data && map[8] == data)
				result = "win";
			if(map[0] == data && map[4] == data && map[8] == data)
				result = "win";
			if(map[6] == data && map[4] == data && map[2] == data)
				result = "win";
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