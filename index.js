const { checkgame, sample, replace } = require('./module'); // Alguns modulos usados
const { uuid } = require('uuidv4'); // Nem precisaria usar, mas usei pra deixar mais organizado as ID's de cada jogo :)
const express = require('express'); // Servidor para aplicativos Web
const http = require('http');
const WebSocket = require('ws'); // Modulo do WebSocket pra fazer a comunicação do jogo com o servidor e a comunicação entre os players
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('html'));

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
	// Verifica se todos os usuarios estão conectado com o servidor e caso alguma usuario não retorne o ping encerra a sessão
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
	// Faz o matchmaking
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
}, 1500);

server.listen(process.env.PORT || 80, () => {
    console.log(`Servidor iniciado :)`);
});