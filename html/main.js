function str_pad_left(string,pad,length) {
    return (new Array(length+1).join(pad)+string).slice(-length);
}

// Detecta SSL
var protocolo = "ws";
if(location.protocol == "https:") protocolo = "wss";

var x, matchtime, you, canplay, symb;
var socket = new WebSocket(protocolo + "://" + window.location.hostname);
$('.loading.text').text('Tentando se conectar com o servidor...');

var timelimit_t;
function timelimit() {
	clearInterval(timelimit_t);
	if(canplay == false) {
		clearInterval(timelimit_t);
		$('.game.timelimit').css({'bottom':'-20px','opacity':0});
	} else {
		var tempo = 1;
		$('.game.timelimit').text('15s restantes').css({'bottom':'20px','opacity':1});
		timelimit_t = setInterval(function () {
			if(tempo == 15) {
				clearInterval(timelimit_t);
				canplay = false;
				var audio = new Audio('lost_time.mp3').play();
			} else if(tempo >= 10) {
				var audio = new Audio('timer.mp3').play();
				$('.game.timelimit').css({"transform":"scale(1.1)"}).delay(500).queue(function(){
					$(this).css({"transform":"scale(1)"}).dequeue();
				});
			}
			$('.game.timelimit').text((15 - tempo) + 's restantes');
			tempo++;
		}, 1000);
	}
}

socket.onopen = function(e) {
	console.error("[open] Connection established");
	$('.loading.text').text('Conexão estabelecida');
};

var atualizarJogo = function (symb, data) {
	symb = "x";
	if(you == "x") symb = "o";
	$(`<img src="img/${symb}.png" alt="${symb}">`).appendTo('.game.op[row=' + data['row'] + ']').hide().fadeIn(400);
};

var modalStatus = function (texto) {
	$('.game.box').css('opacity','.4');
	$('.match.info').text(texto);
	$('.match.display').fadeIn(400);
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
			$('.game.box').css({'transform':'translate(-50%,-50%) rotate3d(1, 1, 0,0deg) scale(1)',opacity:1});
			if(data['canplay'] == true) {
				canplay = true;
				$('.game.status').html('<span>Sua vez de jogar</span>');
				timelimit();
			} else {
				canplay = false;
				$('.game.status').html('<span>Vez do oponente</span>');
			}
			$('.game.info').html('<span>Você é o ' + data['you'].toUpperCase() + '</span>');
			$('.game.info span, .game.status span').css('opacity','1');
		}, 800);
	}
	if(data['status'] == "closed") {
		$('.game.box').css({'transform':'translate(-50%,-50%) rotate3d(1, 1, 0,-90deg) scale(.5)','opacity':0});
		$('.game.op').text("");
		canplay = false;
		$('.loading.text').html('O outro player fechou o jogo, procurando uma nova partida...');
		$('.loading.box').fadeIn(400);
		timelimit();
	}
	if(data['status'] == "you") {
		timelimit();
		if($('.'+btoa(data['row']).replace('==',''))[0]) {
			$('.'+btoa(data['row']).replace('==','')).css('opacity','1');
		} else {
			atualizarJogo(symb, data);
			canplay = false;
			$('.game.status').html('<span>Vez do oponente</span>');
			timelimit();
		}
	}
	if(data['status'] == "played") {
		atualizarJogo(symb, data);
		canplay = true;
		$('.game.status').html('<span>Sua vez de jogar</span>');
		timelimit();
		var audio = new Audio('sound.mp3');
		audio.play();
	}
	if(data['status'] == "loser") {
		atualizarJogo(symb, data);
		canplay = false;
		modalStatus('Você perdeu!');
		timelimit();
		var audio = new Audio('lose.mp3');
		audio.play();
	}
	if(data['status'] == "winner") {
		atualizarJogo(symb, data);
		canplay = false;
		modalStatus('Você ganhou!');
		timelimit();
		var audio = new Audio('win.mp3');
		audio.play();
	}
	if(data['status'] == "tie") {
		atualizarJogo(symb, data);
		canplay = false;
		modalStatus('Empate!');
		timelimit();
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
	$(e['target']).html(`<img class="custom ${btoa($(e['target']).attr('row')).replace('==','')}" src="img/${you}.png" style="opacity:.5">`);
	socket.send($(e['target']).attr('row'));
	canplay = false;
	$('.game.status').html('<span>Vez do oponente</span>');
});

$('.match.btn[go=play]').on('click', () => {
	$('.match.display').fadeOut(200);
	$('.game.box').css({'transform':'translate(-50%,-50%) rotate3d(1, 1, 0,-90deg) scale(.5)','opacity':0});
	$('.game.op').css('opacity','0');
	setTimeout(function () {
		$('.game.op').text("");
		$('.game.op').css('opacity','1');
		socket.send('Play');
	}, 200);
});