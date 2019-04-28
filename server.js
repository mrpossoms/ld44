const ATTACK_FRAMES = 10;

var players = {};
var humans = {};

var isEmpty = function(dic)
{
	for (var key in dic) {
		if (dic.hasOwnProperty(key)) { return false; }
	}

	return true;
}

Array.prototype.add_vec = function(arr)
{
	var a = new Array(this.length);
	for (var i = this.length; i--;) { a[i] = this[i] + arr[i]; }
	return a;
}

Array.prototype.sub_vec = function(arr)
{
	var a = new Array(this.length);
	for (var i = this.length; i--;) { a[i] = this[i] - arr[i]; }
	return a;
}

Array.prototype.scale = function(s)
{
	var a = new Array(this.length);
	for (var i = this.length; i--;) { a[i] = this[i] * s; }
	return a;
}

Array.prototype.norm = function()
{
	return this.scale(1 / this.dist());
}

Array.prototype.dist = function(arr)
{
	var dist = 0;
	for (var i = this.length; i--;)
	{
		dist += Math.pow(this[i] - (arr ? arr[i] : 0), 2);
	}

	return Math.sqrt(dist);
}

function spawn_human_wave(number)
{
	for (;number--;)
	{
		var t = Math.random() * (2 * 3.14);
		var r = (Math.random() * 50) + 230;
		humans[number] = {
			pos: [ r * Math.cos(t) + (320 >> 1), r * Math.sin(t) + (320 >> 1) ],
			dir: [ 0, 0 ],
			hp: 1,
		};
	}
}

function player_con(player)
{
	player_id = 0;
	do {
		player_id = Math.floor(Math.random() * 4096);
	} while (players[this.id] != undefined);

	player.state = {
		name: '',
		pos: [320 >> 1, 320 >> 1],
		dir: [0, 0],
		move: false,
		hp: 100,
		damage: 1,
		id: player_id,
		action: {
			name: '',
			progress: 0
		}
	};

	players[player.state.id] = player;

	console.log('Player:' + player.state.id + ' connected'); 

	player.on('message', function incoming(msg) {
		if (typeof(msg.command) !== 'string') { return; }
		switch (msg.command)
		{
			case 'move':
				player.state.dir = msg.payload.dir;
				player.state.move = true;
				break;
			case 'attack':
				player.state.action.name = msg.command;
				player.state.action.progress = ATTACK_FRAMES;
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

	var wave_size = 10;
	spawn_human_wave(wave_size);

	// do game state update
	setInterval(function() {

		if (isEmpty(players)) { return; }

		// update state
		for (var id in players)
		{
			var player = players[id];
			if (player.state.move)
			{
				player.state.pos = player.state.pos.add_vec(player.state.dir);
				player.state.move = false;
			}
			
			if (player.state.action.progress > 0)
			{
				// check for player hitting humans
				if (player.state.action.progress == 5 && player.state.action.name == 'attack')
				for (var id in humans)
				{
					var human = humans[id];
					
					if (human.pos.dist(player.state.pos) <= 16)
					{
						human.hp -= player.state.damage;
					}

					if (human.hp <= 0) { delete humans[id]; }
				}

				player.state.action.progress--;
			}
			else { player.state.action.name = ''; }
		}

		if (isEmpty(humans))
		{
			wave_size = Math.ceil(wave_size * 1.5);
			spawn_human_wave(wave_size);
		}

		//console.log(JSON.stringify(humans));
		for (var id in humans)
		{
			var human = humans[id];
			var diff = human.pos.sub_vec([320 >> 1, 320 >> 1]);

			if (diff.dist() > 32)
			{
				human.dir = diff.norm().scale(-0.1);
				human.pos = human.pos.add_vec(human.dir);
			}
		}

		var player_states = [], human_states = [];
		for (var id in players) { player_states.push(players[id].state); }
		for (var id in humans) { human_states.push(humans[id]); }


		// send states to players
		for (var id in players)
		{
			players[id].send({
				command: 'state',
				payload: {
					players: player_states,
					humans: human_states,
				}
			});

		}
	}, 16);
};
