function str_pad_left(string, pad, length) {
	return (new Array(length + 1).join(pad) + string).slice(-length);
}

function fadeIn(el, ms) {
	el.style.display = 'block';
	el.style.opacity = '0';
	el.style.transition = `opacity ${ms}ms`;
	requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
}

function fadeOut(el, ms) {
	el.style.transition = `opacity ${ms}ms`;
	el.style.opacity = '0';
	setTimeout(() => { el.style.display = 'none'; }, ms);
}

function appendImg(parent, src, alt, ms) {
	var img = document.createElement('img');
	img.src = src;
	img.alt = alt;
	img.style.opacity = '0';
	img.style.transition = `opacity ${ms || 400}ms`;
	parent.appendChild(img);
	requestAnimationFrame(() => requestAnimationFrame(() => { img.style.opacity = '1'; }));
	return img;
}

var loadingBox     = document.querySelector('.loading.box');
var loadingText    = document.querySelector('.loading.text');
var gameBox        = document.querySelector('.game.box');
var gameStatus     = document.querySelector('.game.status');
var gameInfo       = document.querySelector('.game.info');
var gameTimelimit  = document.querySelector('.game.timelimit');
var matchDisplay   = document.querySelector('.match.display');
var matchInfo      = document.querySelector('.match.info');
var gameOps        = document.querySelectorAll('.game.op');

var protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
var socket = new WebSocket(protocolo + '://' + window.location.hostname);
loadingText.textContent = 'Tentando se conectar com o servidor...';

var x, matchtime, you, canplay;

var setCanplay = function (val) {
	canplay = val;
	gameBox.classList.toggle('myturn', val);
};

var timelimit_t;
function timelimit() {
	clearInterval(timelimit_t);
	if (!canplay) {
		gameTimelimit.style.bottom = '-20px';
		gameTimelimit.style.opacity = '0';
		return;
	}
	var tempo = 1;
	gameTimelimit.textContent = '15s restantes';
	gameTimelimit.style.bottom = '20px';
	gameTimelimit.style.opacity = '1';
	timelimit_t = setInterval(function () {
		if (tempo === 15) {
			clearInterval(timelimit_t);
			setCanplay(false);
			new Audio('lost_time.mp3').play();
		} else if (tempo >= 10) {
			new Audio('timer.mp3').play();
			gameTimelimit.style.transform = 'scale(1.1)';
			setTimeout(() => { gameTimelimit.style.transform = 'scale(1)'; }, 500);
		}
		gameTimelimit.textContent = (15 - tempo) + 's restantes';
		tempo++;
	}, 1000);
}

socket.onopen = function () {
	console.error('[open] Connection established');
	loadingText.textContent = 'Conexão estabelecida';
};

var atualizarJogo = function (data) {
	var symb = you === 'x' ? 'o' : 'x';
	var cell = document.querySelector('.game.op[row="' + data['row'] + '"]');
	if (cell) appendImg(cell, `img/${symb}.png`, symb, 400);
};

var modalStatus = function (texto) {
	gameBox.style.opacity = '0.4';
	matchInfo.textContent = texto;
	fadeIn(matchDisplay, 400);
};

var WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[6,4,2]];

var findWinLine = function () {
	for (var line of WIN_LINES) {
		var syms = line.map(function (n) {
			var cell = document.querySelector('.game.op[row="' + n + '"]');
			var img = cell && cell.querySelector('img');
			return img ? img.alt : null;
		});
		if (syms[0] && syms[0] === syms[1] && syms[1] === syms[2]) return line;
	}
	return null;
};

var spawnConfetti = function () {
	var colors = ['#1bf179','#ff6b9d','#ffd93d','#6bcbff','#ff9f43','#a29bfe','#ffffff'];
	var end = Date.now() + 2000;
	(function frame() {
		confetti({ particleCount: 2, angle: 60,  spread: 150, origin: { x: 0 }, colors: colors });
		confetti({ particleCount: 2, angle: 120, spread: 150, origin: { x: 1 }, colors: colors });
		if (Date.now() < end) requestAnimationFrame(frame);
	}());
};

var cleanupWinAnim = function () {
	gameOps.forEach(el => el.classList.remove('dimmed', 'winning', 'losing'));
};

var animateWin = function (texto = 'Você ganhou!') {
	var line = findWinLine();
	if (!line) { modalStatus(texto); return; }
	gameOps.forEach(el => el.classList.add('dimmed'));
	line.forEach(n => {
		var cell = document.querySelector('.game.op[row="' + n + '"]');
		cell.classList.remove('dimmed');
		cell.classList.add('winning');
	});
	setTimeout(spawnConfetti, 500);
	setTimeout(function () { modalStatus(texto); }, 1000);
};

var animateLose = function (texto = 'Você perdeu!') {
	gameBox.classList.add('shake');
	setTimeout(() => gameBox.classList.remove('shake'), 450);
	var line = findWinLine();
	if (!line) { setTimeout(() => modalStatus(texto), 500); return; }
	setTimeout(function () {
		gameOps.forEach(el => el.classList.add('dimmed'));
		line.forEach(n => {
			var cell = document.querySelector('.game.op[row="' + n + '"]');
			cell.classList.remove('dimmed');
			cell.classList.add('losing');
		});
		setTimeout(function () { modalStatus(texto); }, 1000);
	}, 150);
};

socket.onmessage = function (event) {
	if (event.data === 'Ping') return socket.send('Pong');
	var data = JSON.parse(event.data);

	if (data.status === 'ping') {
		document.querySelector('.debug.ping').textContent = data.latency + ' ms';
	}
	if (data.status === 'searching') {
		setCanplay(false);
		fadeIn(loadingBox, 400);
		loadingText.innerHTML = 'Encontrando uma partida...<span class="matchsearch">00:00</span>';
		matchtime = 0;
		x = setInterval(function () {
			matchtime++;
			var minutes = Math.floor(matchtime / 60);
			var seconds = matchtime - minutes * 60;
			loadingText.innerHTML = 'Encontrando uma partida...<span class="matchsearch">'
				+ str_pad_left(minutes, '0', 2) + ':' + str_pad_left(seconds, '0', 2) + '</span>';
		}, 1000);
	}
	if (data.status === 'found') {
		clearInterval(x);
		you = data.you;
		loadingText.textContent = 'Partida encontrada';
		setTimeout(function () {
			fadeOut(loadingBox, 400);
			gameBox.style.transform = 'translate(-50%,-50%) rotate3d(1, 1, 0,0deg) scale(1)';
			gameBox.style.opacity = '1';
			if (data.canplay) {
				setCanplay(true);
				gameStatus.innerHTML = '<span>Sua vez de jogar</span>';
				timelimit();
			} else {
				setCanplay(false);
				gameStatus.innerHTML = '<span>Vez do oponente</span>';
			}
			gameInfo.innerHTML = '<span>Você é o ' + data.you.toUpperCase() + '</span>';
			document.querySelectorAll('.game.info span, .game.status span')
				.forEach(el => el.style.opacity = '1');
		}, 800);
	}
	if (data.status === 'closed') {
		gameBox.style.transform = 'translate(-50%,-50%) rotate3d(1, 1, 0,-90deg) scale(.5)';
		gameBox.style.opacity = '0';
		gameOps.forEach(el => { el.textContent = ''; });
		setCanplay(false);
		loadingText.textContent = 'O outro player fechou o jogo, procurando uma nova partida...';
		fadeIn(loadingBox, 400);
		timelimit();
	}
	if (data.status === 'you') {
		timelimit();
		var cls = '.' + btoa(data.row).replace('==', '');
		var optimistic = document.querySelector(cls);
		if (optimistic) {
			optimistic.style.opacity = '1';
		} else {
			var cell = document.querySelector('.game.op[row="' + data.row + '"]');
			appendImg(cell, `img/${you}.png`, you, 400);
			setCanplay(false);
			gameStatus.innerHTML = '<span>Vez do oponente</span>';
			timelimit();
		}
	}
	if (data.status === 'played') {
		atualizarJogo(data);
		setCanplay(true);
		gameStatus.innerHTML = '<span>Sua vez de jogar</span>';
		timelimit();
		new Audio('sound.mp3').play();
	}
	if (data.status === 'loser') {
		atualizarJogo(data);
		setCanplay(false);
		timelimit();
		new Audio('lose.mp3').play();
		animateLose();
	}
	if (data.status === 'winner') {
		var winCell = document.querySelector('.game.op[row="' + data.row + '"]');
		if (data.row != null && winCell && !winCell.querySelector('img')) {
			appendImg(winCell, `img/${you}.png`, you, 200);
		}
		setCanplay(false);
		timelimit();
		new Audio('win.mp3').play();
		animateWin();
	}
	if (data.status === 'tie') {
		atualizarJogo(data);
		setCanplay(false);
		timelimit();
		modalStatus('Empate!');
	}
};

socket.onclose = function () {
	clearInterval(x);
	console.error('[close] Connection died');
	loadingText.textContent = 'Erro ao estabelecer conexão com o servidor, tente mais tarde!';
	fadeIn(loadingBox, 400);
};

socket.onerror = function (error) {
	console.error(error.message);
};

gameBox.addEventListener('click', function (e) {
	var cell = e.target.closest('.game.op');
	if (!cell || !canplay || cell.querySelector('img')) return;
	var row = cell.getAttribute('row');
	cell.innerHTML = `<img class="custom ${btoa(row).replace('==', '')}" src="img/${you}.png" alt="${you}" style="opacity:.5">`;
	socket.send(row);
	setCanplay(false);
	gameStatus.innerHTML = '<span>Vez do oponente</span>';
});

document.querySelector('.match.btn[go=play]').addEventListener('click', function () {
	setTimeout(cleanupWinAnim, 600);
	fadeOut(matchDisplay, 200);
	gameBox.style.transform = 'translate(-50%,-50%) rotate3d(1, 1, 0,-90deg) scale(.5)';
	gameBox.style.opacity = '0';
	gameOps.forEach(el => el.style.opacity = '0');
	setTimeout(function () {
		gameOps.forEach(el => { el.innerHTML = ''; el.style.opacity = '1'; });
		socket.send('Play');
	}, 200);
});
