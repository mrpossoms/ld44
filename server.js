const ATTACK_FRAMES = 10;

var players = {};
var humans = {};

Array.prototype.add_vec = function(arr)
{
	var a = new Array(this.length);
	for (var i = this.length; i--;) { a[i] = this[i] + arr[i]; }
	return a;
}

Array.prototype.dist = function(arr)
{
	var dist = 0;
	for (var i = this.length; i--;)
	{
		dist += Math.pow(this[i] - arr[i], 2);
	}

	return Math.sqrt(dist);
}

function player_con(player)
{
	player_id = 0;
	do {
		player_id = Math.floor(Math.random() * 4096);
	} while (players[this.id] != undefined);

	player.state = {
		name: '',
		pos: [0, 0],
		dir: [0, 0],
		move: false,
		hp: 0,
		id: player_id,
		action: {
			name: '',
			progress: 0
		}
	};

	player.spawn = function() {
		this.hp = 100;
	};

	players[player.state.id] = player;

	console.log('Player:' + player.state.id + ' connected'); 

	player.on('message', function incoming(msg) {
		if (typeof(msg.command) !== 'string') { return; }
		switch (msg.command)
		{
			case 'move':
				console.log('moving');
				player.state.dir = msg.payload.dir;
				player.state.move = true;
				break;
			case 'attack':
				player.state.attack = ATTACK_FRAMES;
				break;
			case 'name':
				player.state.name = msg.payload.name;
				break;
		}
	});

	player.on('disconnect', function() {
		console.log('Player:' + player.state.id + ' disconnected'); 
		delete players[player.state.id];
	});
}

module.exports.server = function(http, port) {
	var io = require('socket.io')(http);

	io.on('connection', player_con);

	// do game state update
	setInterval(function() {
		// update state
		for (var id in players)
		{
			var player = players[id];
			if (player.state.move)
			{
				player.state.pos = player.state.pos.add_vec(player.state.dir);
				console.log(player.state.pos);
				player.state.move = false;
			}
		}

		var player_states = [];
		for (var id in players) { player_states.push(players[id].state); }

		// send states to players
		for (var id in players)
		{
			players[id].send({
				command: 'state',
				payload: {
					players: player_states
				}
			});

		}
	}, 16);
};
