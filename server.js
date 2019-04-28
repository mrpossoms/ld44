const ATTACK_FRAMES = 10;
const DEATH_FRAMES = 60;
const START_WAVE_SIZE = 4;
const DASH_FRAMES = 10;

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

Array.prototype.choose_one = function()
{
	return this[Math.floor(Math.random() * this.length)];
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
		var r = (Math.random() * (100 + number)) + 230;
		humans[number] = {
			pos: [ r * Math.cos(t) + (320 >> 1), r * Math.sin(t) + (320 >> 1) ],
			dir: [ 0, 0 ],
			hp: 1,
			action: {
				name: '',
				progress: 0
			}
		};
	}
}

var story_prompt = [
	'Welcome fellow reaper...',
	'The enterprising humans are seeking\nthe knowledge to thwart death through\ntheir science.',
	'Cut them down...\nKeep them from the well of knowledge.'
];

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
		souls: 0,
		id: player_id,
		action: {
			name: '',
			progress: 0
		}
	};
	player.send_game_message = function(str)
	{
		player.send({ command: 'game_message', payload: { message: str } });
	}

	players[player.state.id] = player;

	console.log('Player:' + player.state.id + ' connected'); 
	
	for (var i = 0; i < story_prompt.length; ++i)
		player.send_game_message(story_prompt[i]);

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
			case 'dash':
				player.state.action.name = msg.command;
				player.state.action.progress = DASH_FRAMES;
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

	var wave_size = START_WAVE_SIZE;

	// do game state update
	setInterval(function() {

		if (isEmpty(players))
		{
			wave_size = START_WAVE_SIZE;
			humans = {};
			return;
		}

		// update state
		for (var id in players)
		{
			var player = players[id];

			
			if (player.state.action.progress > 0)
			{
				// check for player hitting humans
				if (player.state.action.progress == 5 && player.state.action.name == 'attack')
				for (var id in humans)
				{
					var human = humans[id];
					var last_hp = human.hp;

					if (human.pos.dist(player.state.pos) <= 16)
					{
						human.hp -= player.state.damage;
					}

					if (human.hp <= 0 && last_hp > 0)
					{
						player.state.souls++;
						human.action.name = 'death';
						human.action.progress = DEATH_FRAMES;
					}
				}
				
				if (player.state.action.name == 'dash')
				{
					player.state.move = true;
					player.state.dir = player.state.dir.norm().scale(3);
				}

				player.state.action.progress--;
			}
			else { player.state.action.name = ''; }

			if (player.state.move)
			{
				player.state.pos = player.state.pos.add_vec(player.state.dir);
				player.state.move = false;
			}
		}

		if (isEmpty(humans))
		{
			wave_size = Math.ceil(wave_size * 1.5);
			spawn_human_wave(wave_size);

			var spawn_msgs = ['They persist...', 'More are coming...', 'They are not detured...'];
			for (var id in players)
				players[id].send_game_message(spawn_msgs.choose_one());
		}

		//console.log(JSON.stringify(humans));
		for (var id in humans)
		{
			var human = humans[id];
		
			if (human.action.name == 'death' && human.action.progress <= 0)
			{
				delete humans[id];
				continue;
			}

			if (human.action.progress > 0)
			{
				human.action.progress--;
				if (human.action.name == 'death') { continue; }
			}
			else { human.action.name = ''; }

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
