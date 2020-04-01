function str_pad_left(string,pad,length) {
    return (new Array(length+1).join(pad)+string).slice(-length);
}

// Fiz isso pra detectar automaticamente se é pra utilizar o WebSocket no modo HTTPS ou no modo HTTP :)
var protocolo = "ws";
if(location.protocol == "https:") protocolo = "wss";

var x, matchtime, you, canplay, symb;
var socket = new WebSocket(protocolo + "://" + window.location.hostname);
$('.loading.text').text('Tentando se conectar com o servidor...');

socket.onopen = function(e) {
	console.error("[open] Connection established");
	$('.loading.text').text('Conexão estabelecida');
};

socket.onmessage = function(event) {
	if(event['data'] == "Ping") return socket.send('Pong');
	var data = JSON.parse(event['data']);
	// Debug
	if(data['status'] == "ping") {
		$('.debug.ping').text(data['latency'] + ' ms');
	}
	//
	if(data['status'] == "searching") {
		canplay = false;
		$('.loading.box').fadeIn(400);
		$('.loading.text').html('Encontrando uma partida...<span class="matchsearch">00:00</span>');
		matchtime = 0;
		x = setInterval(function () {
			matchtime++;
			var minutes = Math.floor(matchtime / 60);
			var seconds = matchtime - minutes * 60;
			$('.loading.text').html('Encontrando uma partida...<span class="matchsearch">' + str_pad_left(minutes,'0',2)+':'+str_pad_left(seconds,'0',2) + '</span>');
		}, 1000);
	}
	if(data['status'] == "found") {
		clearInterval(x);
		you = data['you'];
		$('.loading.text').text('Partida encontrada');
		setTimeout(function () {
			$('.loading.box').fadeOut(400);
			$('.game.box').css('transform','translate(-50%,-50%) rotate3d(1, 1, 0,0deg)');
			if(data['canplay'] == true) {
				canplay = true;
				$('.game.status').html('<span>Sua vez de jogar</span>');
			} else {
				canplay = false;
				$('.game.status').html('<span>Vez do oponente</span>');
			}
			$('.game.info').html('<span>Você é o ' + data['you'].toUpperCase() + '</span>');
			$('.game.info span, .game.status span').css('opacity','1');
		}, 800);
	}
	if(data['status'] == "closed") {
		$('.game.box').css('transform','translate(-50%,-50%) rotate3d(1, 1, 0,-90deg)');
		$('.game.op').text("");
		canplay = false;
		$('.loading.text').html('O outro player fechou o jogo, procurando uma nova partida...');
		$('.loading.box').fadeIn(400);
	}
	if(data['status'] == "played") {
		symb = "x";
		if(you == "x") symb = "o";
		$('.game.op[row=' + data['row'] + ']').html('<span>' + symb + '</span>');
		canplay = true;
		$('.game.status').html('<span>Sua vez de jogar</span>');
		var audio = new Audio('sound.mp3');
		audio.play();
	}
	if(data['status'] == "loser") {
		symb = "x";
		if(you == "x") symb = "o";
		$('.game.op[row=' + data['row'] + ']').html('<span>' + symb + '</span>');
		canplay = false;
		$('.match.info').text('Você perdeu!');
		$('.match.display').fadeIn(400);
	}
	if(data['status'] == "winner") {
		symb = "x";
		if(you == "x") symb = "o";
		$('.game.op[row=' + data['row'] + ']').html('<span>' + symb + '</span>');
		canplay = false;
		$('.match.info').text('Você ganhou!');
		$('.match.display').fadeIn(400);
	}
	if(data['status'] == "tie") {
		symb = "x";
		if(you == "x") symb = "o";
		$('.game.op[row=' + data['row'] + ']').html('<span>' + symb + '</span>');
		$('.match.info').text('Empate!');
		$('.match.display').fadeIn(400);
	}
};

socket.onclose = function(event) {
	clearInterval(x);
	console.error('[close] Connection died');
	$('.loading.text').text('Erro ao estabelecer conexão com o servidor, tente mais tarde!');
	$('.loading.box').fadeIn(400);
};

socket.onerror = function(error) {
	console.error(error.message);
};

$('.game.op').on('click', (e) => {
	if(canplay == false) return;
	if($(e['target']).text()) return;
	$(e['target']).html('<span>' + you + '</span>');
	socket.send($(e['target']).attr('row'));
	canplay = false;
	$('.game.status').html('<span>Vez do oponente</span>');
});

$('.match.btn[go=play]').on('click', () => {
	$('.match.display').fadeOut(200);
	$('.game.box').css('transform','translate(-50%,-50%) rotate3d(1, 1, 0,-90deg)');
	$('.game.op').css('opacity','0');
	setTimeout(function () {
		$('.game.op').text("");
		$('.game.op').css('opacity','1');
		socket.send('Play');
	}, 200);
});