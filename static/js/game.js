Array.prototype.add_vec = function(arr)
{
        var a = new Array(this.length);
        for (var i = this.length; i--;) { a[i] = this[i] + arr[i]; }
        return a;
}

Array.prototype.floor = function()
{
        var a = new Array(this.length);
        for (var i = this.length; i--;) { a[i] = Math.floor(this[i]); }
        return a;
}

var lastTouchPos;

var state = {
	last: null,
	current: null,
};

function MessageQueue()
{
	this.messages = [];
	this.counter = 0;

	this.add = function(str) 
	{
		this.messages.push(str);
		this.counter = str.length * 5;
	}

	this.draw = function()
	{
		if (this.messages.length == 0) { return; }

		draw_text([320 / 2, 320 / 2 - 64], this.messages[0]);
		this.counter--;
		
		if (this.counter <= 0)
		{
			this.messages.shift();
			if (this.messages.length) this.counter = this.messages[0].length * 5;
		}
	}
}

var msg_queue = new MessageQueue();
var ctx;
var socket = null;
var paused = true;
var time = 0;

ground = [];
well = null;
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
'ground2.png',
'ground3.png',
'well.png',
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

function draw_text(pos, str, size, color)
{
	if (!size) size = 12;
	if (!color) color = '#F00';

	ctx.save();
	ctx.textAlign = 'center';
	ctx.font = size + 'px arial';

	function draw_line(pos, str)
	{
		ctx.fillStyle = '#333';
		const dt = 2 * Math.PI / 10;
		for (var i = 10; i--;)
		{
			var t = dt * i;
			var off = pos.add_vec([Math.cos(t) * 2, Math.sin(t) * 2]).floor();
			ctx.fillText(str, off[0], off[1]);
		}

		ctx.fillStyle = color;
		ctx.fillText(str, pos[0], pos[1]);
	}

	var lines = str.split('\n');
	for (var i = 0; i < lines.length; ++i)
	{
		draw_line(pos.add_vec([0, i * size]), lines[i]);
	}

	ctx.restore();
}

function draw_character(character_type, character, dt, anim_cb)
{
	ctx.save();
	character.pos = character.pos.floor();
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
	if (character.souls != undefined)
	{
		draw_text(
			[16, 42],
			'souls: ' + character.souls,
			8, 
			character.id == state.current.me.id ? '#0F0' : '#F00'
		);
	}
	ctx.restore();
}

var ground_table = [];
for (var i = 7; i--;) { ground_table.push(Math.ceil(Math.random() * 3).toString()); }

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
		var key = ground_table[(r * 10 + c) % ground_table.length];
		ground[key].draw(ground[key].img, 1, 0, 0);
		ctx.restore();
	}

	if (s == null) { return; }

	var all_sprites = s.players.concat(s.humans, [{type:'well', pos: [320/2, 320/2]}]);

	all_sprites.sort(function(p0, p1) { return p1.pos[1] - p0.pos[1]; });

	for (var i = all_sprites.length; i--;)
	{
		var character = all_sprites[i];
		var char_type = human;

		if (character.name != undefined) { char_type = reaper; }

		if (character.type == 'well')
		{
			ctx.save();
			ctx.transVec(character.pos);
			ctx.transVec([Math.floor(-well.img.width/2), Math.floor(-well.img.height/2)]);
			well.draw(well.img, 1, 0, 0);
			ctx.restore();		
		}
		else
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

	msg_queue.draw();
	draw_text([320/2, 16], "Knowledge needed: " + state.current.knowledge_needed);
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
		socket.send({ command: 'dash', payload: { }});
	}
	if ($G.input.keyboard.IsKeyDown(13)) {
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
			case 'game_message':
				msg_queue.add(msg.payload.message);
				break;
		}
	});

	ctx = $G.gfx.context;
	ctx.transVec = function(v){
		this.translate(v[0], v[1]);
	};

	$G.input.touch.setMove(function(e) {
		var me = state.current.me;
		var dx = pageX - me.pos[0], dy = pageY - me.pos[1];
		socket.send({ command: 'move', payload: { dir: [
			dx / Math.abs(dx),
			dy / Math.abs(dy)
		]}});
	});
	$G.input.mouse.setClick(function() { socket.send({ command: 'attack', payload: { }}); });
	//$G.touch.setClick(function() { socket.send({ command: 'attack', payload: { }}); });

	for (var dir in {'down':0, 'up':0, 'left':0, 'right':0})
	{
		reaper.walk[dir] = new $G.animation.sprite(0, 0, 32, 32, 6, 6, $G.assets.images['Grim_walk_' + dir + '.png'])
		reaper.attack[dir] = new $G.animation.sprite(0, 0, 32, 32, 6, 15, $G.assets.images['Grim_attack_' + dir + '.png'])
		human.walk[dir] = new $G.animation.sprite(0, 0, 32, 32, 4, 6, $G.assets.images['scientist_walk_' + dir + '.png'])
		human.death[dir] = new $G.animation.sprite(0, 0, 32, 32, 10, 10, $G.assets.images['scientist_death_' + dir + '.png'])
	}

	for (var num in { '1': 0, '2':0, '3':0})
	{
		ground[num] = new $G.animation.sprite(0, 0, 32, 32, 1, 0, $G.assets.images['ground' + num + '.png'])
	}
	
	well = new $G.animation.sprite(0, 0, 58, 41, 1, 0, $G.assets.images['well.png'])
}
