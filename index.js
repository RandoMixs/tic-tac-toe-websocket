const { uuid } = require('uuidv4');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

var procurando, jogando;

const app = express();
app.get('/hello', function (req, res) {
  res.send('Hi')
})
app.get('/info', function (req, res) {
  res.send(JSON.stringify({"searching":procurando, "playing":jogando}))
})
app.use(express.static('html'));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

Array.prototype.sample = function(){
  return this[Math.floor(Math.random()*this.length)];
}

Array.prototype.replace = function(t, v) {
	if(this.indexOf(t)!= -1) this[this.map((e, i) => [i, e]).filter(e => e[1] == t)[0][0]] = v;
}

function checkgame(map) {
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
}

var id = 0;
var games = [];
var lookup = {};
var type = ['x','o'];

wss.on('connection', function connection(ws) {
	ws.isAlive = true;
	ws.status = 'searching';
	ws.type = null;
	ws.canplay = false;
	ws.opponent = null;
	ws.gameid = null;
	ws.startTime = null;
	ws.id = id++;
	lookup[ws.id] = ws;
	
	ws.on('message', function incoming(message) {
		if(message == "Pong") {
			ws.send('{"status":"ping", "latency":"' + (new Date()-ws.startTime) + '"}');
			return ws.isAlive = true;
		} else if(message == "Play") {
			if(ws.status == "end") {
				ws.status = 'searching';
				return ws.send(JSON.stringify({'status':ws.status}));
			} else {
				return ws.terminate();
			}
		}
		
		if(message.replace(/\D/g, "") >= 9) return ws.terminate();
		if(ws.canplay == false) return ws.terminate();
		var found = games.find(function(item) {
			return item.gameid == ws.gameid;
		});
		var update = found;
		if(found['map'][message]) ws.terminate();
		update['map'][message] = ws.type;
		games.replace(found, update);
		if(checkgame(found['map']) == true) {
			ws.send('{"status":"winner"}');
			ws.opponent.send('{"status":"loser", "row":'+ message + '}');
			ws.opponent.status = "end";
			ws.opponent.canplay = false;
			ws.opponent.opponent = null;
			ws.opponent.gameid = null;
			ws.opponent = null;
			ws.canplay = false;
			ws.gameid = null;
			ws.status = "end";
		} else if(update['map'][0] && update['map'][1] && update['map'][2] && update['map'][3] && update['map'][4] && update['map'][5] && update['map'][6] && update['map'][7] && update['map'][8]) {
			ws.send('{"status":"tie"}');
			ws.opponent.send('{"status":"tie", "row":'+ message + '}');
			ws.opponent.status = "end";
			ws.opponent.canplay = false;
			ws.opponent.opponent = null;
			ws.opponent.gameid = null;
			ws.opponent = null;
			ws.canplay = false;
			ws.gameid = null;
			ws.status = "end";
		} else {
			ws.opponent.send('{"status":"played", "row":'+ message + '}');
			ws.opponent.canplay = true;
			ws.canplay = false;
		}
	});

	ws.send(JSON.stringify({'status':ws.status}));
	
	ws.on('close', () => {
		if(ws.opponent) {
			ws.opponent.send('{"status":"closed"}');
			ws.opponent.canplay = false;
			ws.opponent.opponent = null;
			ws.opponent.gameid = null;
			setTimeout(function () {
				ws.opponent.status = "searching";
				ws.send(JSON.stringify({'status':ws.status}));
			}, 800);
		}
		return ws.terminate();
	});
});

setInterval(function () {
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive == false) {
			if(ws.opponent) {
				ws.opponent.send('{"status":"closed"}');
				ws.opponent.canplay = false;
				ws.opponent.opponent = null;
				ws.opponent.gameid = null;
				setTimeout(function () {
					ws.opponent.status = "searching";
					ws.send(JSON.stringify({'status':ws.status}));
				}, 800);
			}
			return ws.terminate();
		} else {
			ws.startTime = new Date();
			ws.isAlive = false;
			ws.send('Ping');
		}
	});
}, 1500);

server.listen(process.env.PORT || 80, () => {
    console.log(`Servidor iniciado :)`);
});

// Matchmaking
setInterval(function () {
	if(wss.clients.length == 0) return;
	var last;
	wss.clients.forEach(function each(client) {
		if(client.status == 'searching') {
			if(last == null) last = client;
			if(last != client) {
				var gameid = uuid();
				var fplayer = type.sample();
				if(fplayer == "x") { var splayer = "o"; } else { var splayer = "x"; }
				games.push({"gameid":gameid,"map":{0:null,1:null,2:null,3:null,4:null,5:null,6:null,7:null,8:null}});
				// Configura os players
				client.status = 'found';
				client.type = fplayer;
				client.opponent = last;
				client.send('{"status":"found", "you":"' + fplayer + '", "canplay":true, "player":"' + last + '"}');
				client.canplay = true;
				client.gameid = gameid;
				last.send('{"status":"found", "you":"' + splayer + '", "canplay":false, "player":"' + client.id + '"}');
				last.status = 'found';
				last.type = splayer;
				last.opponent = client;
				last.gameid = gameid;
				last = null;
			}
		}
	});
}, 1000)

// Console
setInterval(function () {
	var psm = 0;
	wss.clients.forEach(function each(client) {
		if(client.status == 'searching') psm++;
	});
	procurando = psm;
	var psm = 0;
	wss.clients.forEach(function each(client) {
		if(client.status == 'found') psm++;
	});
	jogando = psm;
}, 1000);