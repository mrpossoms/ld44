Array.prototype.add_vec = function(arr)
{
        var a = new Array(this.length);
        for (var i = this.length; i--;) { a[i] = this[i] + arr[i]; }
        return a;
}

var lastTouchPos;

var state = {
	last: null,
	current: null,
};

var ctx;
var socket = null;
var paused = true;
var time = 0;

ground = [];
reaper = {
	walk: {
		down: null,
		up: null,
		left: null,
		right: null
	},
	attack: {
		down: null,
		up: null,
		left: null,
		right: null
	}

};

human = {
	walk: {
		down: null,
		up: null,
		left: null,
		right: null
	},
	death: {
		down: null,
		up: null,
		left: null,
		right: null
	}
};

var images = [
'ground1.png',
'Grim_walk_down.png',
'Grim_walk_right.png',
'Grim_walk_up.png',
'Grim_walk_left.png',
'Grim_attack_down.png',
'Grim_attack_right.png',
'Grim_attack_up.png',
'Grim_attack_left.png',
'scientist_walk_down.png',
'scientist_walk_right.png',
'scientist_walk_up.png',
'scientist_walk_left.png',
'scientist_death_down.png',
'scientist_death_right.png',
'scientist_death_up.png',
'scientist_death_left.png'
];

$G.assets.images("imgs/").load(images, function(){
	start();
});

function aspectRatio(){
	return $G.canvas.height / $G.canvas.width;
}

function draw_character(character_type, character, dt, anim_cb)
{
	ctx.save();
	ctx.transVec(character.pos.add_vec([-16, -16]));
	
	var anim_name = 'walk';
	var anim_dir = 'down';

	if (anim_cb) { anim_name = anim_cb(character); }

	var x_mag = Math.abs(character.dir[0]);
	var y_mag = Math.abs(character.dir[1]);

	if (y_mag > x_mag)
	{
		if (character.dir[1] > 0) { anim_dir = 'down'; }
		else if (character.dir[1] < 0) { anim_dir = 'up'; }
	}
	else
	{
		if (character.dir[0] > 0) { anim_dir = 'right'; }
		else if (character.dir[0] < 0) { anim_dir = 'left'; }
	}

	character_type[anim_name][anim_dir].draw(character_type[anim_name][anim_dir].img, 1, 0, 0);
	ctx.restore();
}

function draw_state(s, dt)
{
	var chars = [ reaper, human ]
	for (var ci = chars.length; ci--;)
	{
		for (var anim_name in chars[ci])
		{
			for (var dir in chars[ci][anim_name])
			{
				chars[ci][anim_name][dir].Time += dt;
			}
		}
	}

	for (var r = 0; r < 10; ++r)
	for (var c = 0; c < 10; ++c)
	{
		ctx.save();
		ctx.transVec([c * 32, r * 32]);
		ground['1'].draw(ground['1'].img, 1, 0, 0);
		ctx.restore();
	}

	if (s == null) { return; }

	var all_sprites = s.players.concat(s.humans);

	all_sprites.sort(function(p0, p1) { return p1.pos[1] - p0.pos[1]; });

	for (var i = all_sprites.length; i--;)
	{
		var character = all_sprites[i];
		/*
		ctx.save();
		ctx.transVec(player.pos);
		
		var anim_name = 'walk';
		var anim_dir = 'down';
		switch(player.action.name)
		{
			case 'attack':
				anim_name = 'attack';
				break;
		}

		if (player.dir[1] > 0) { anim_dir = 'down'; }
		else if (player.dir[1] < 0) { anim_dir = 'up'; }
		else if (player.dir[0] > 0) { anim_dir = 'right'; }
		else if (player.dir[0] < 0) { anim_dir = 'left'; }

		reaper[anim_name][anim_dir].draw(reaper[anim_name][anim_dir].img, 1, dt, 0);
		ctx.restore();
		*/

		var char_type = human;

		if (character.name != undefined) { char_type = reaper; }

		//if (character.name)
		{ // check if player
			draw_character(char_type, character, dt, function(c) {
				switch(c.action.name)
				{
					case 'attack': return 'attack';
					case 'death': return 'death';
					default: return 'walk';
				}
			});
		}
	}
}

function loop(){
	var dt = $G.timer.tick();
	time += dt;

	draw_state(state.current, dt);

	dir = [ 0, 0 ]
	moving = false
	var kb = $G.input.keyboard;
	if (kb.IsKeyDown(KEY_UP) || kb.IsKeyDown(87)) {
		dir[1] += -1; moving = true;
	}

	if (kb.IsKeyDown(KEY_DOWN) || kb.IsKeyDown(83)) {
		dir[1] += 1; moving = true;
	}

	if (kb.IsKeyDown(KEY_LEFT) || kb.IsKeyDown(65)) {
		dir[0] += -1; moving = true;
	}

	if (kb.IsKeyDown(KEY_RIGHT) || kb.IsKeyDown(68)) {
		dir[0] += 1; moving = true;
	}
	if (moving) { socket.send({ command: 'move', payload: { dir: dir }}); }

	if ($G.input.keyboard.IsKeyDown(32)) {
		socket.send({ command: 'attack', payload: { }});
	}

	if(paused){
	}
}

function start(){
	$G.init(loop, 'canvas').gfx.canvas.init();

	socket = io();
	socket.on('message', function(msg) {
		switch (msg.command)
		{
			case 'state':
				state.last = state.current;
				state.current = msg.payload;
				break;
		}
	});

	ctx = $G.gfx.context;
	ctx.transVec = function(v){
		this.translate(v[0], v[1]);
	};

	for (var dir in {'down':0, 'up':0, 'left':0, 'right':0})
	{
		reaper.walk[dir] = new $G.animation.sprite(0, 0, 32, 32, 6, 6, $G.assets.images['Grim_walk_' + dir + '.png'])
		reaper.attack[dir] = new $G.animation.sprite(0, 0, 32, 32, 6, 15, $G.assets.images['Grim_attack_' + dir + '.png'])
		human.walk[dir] = new $G.animation.sprite(0, 0, 32, 32, 4, 6, $G.assets.images['scientist_walk_' + dir + '.png'])
		human.death[dir] = new $G.animation.sprite(0, 0, 32, 32, 10, 10, $G.assets.images['scientist_death_' + dir + '.png'])
	}

	for (var num in { '1': 0 })
	{
		ground[num] = new $G.animation.sprite(0, 0, 32, 32, 1, 0, $G.assets.images['ground' + num + '.png'])
	}

	ctx.font = '12px arial';
}
