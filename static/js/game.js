
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
	idle: null,
	walk: {
		down: null,
		up: null,
		left: null,
		right: null
	}
};

$G.assets.images("imgs/").load(['ground1.png', 'Grim_walk_down.png'], function(){
	start();
});

function aspectRatio(){
	return $G.canvas.height / $G.canvas.width;
}

function draw_state(s, dt)
{
	for (var r = 0; r < 10; ++r)
	for (var c = 0; c < 10; ++c)
	{
		ctx.save();
		ctx.transVec([c * 32, r * 32]);
		ground['1'].draw(ground['1'].img, 1, 0, 0);
		ctx.restore();
	}

	if (s == null) { return; }

	for (var i = s.players.length; i--;)
	{
		var player = s.players[i];
		ctx.save();
		ctx.transVec(player.pos);
		reaper.walk['down'].draw(reaper.walk['down'].img, 1, dt, 0);
		ctx.restore();
	}
}

function loop(){
	var dt = $G.timer.tick();
	time += dt;

	draw_state(state.current, dt);

	dir = [ 0, 0 ]
	moving = false
	if ($G.input.keyboard.IsKeyDown(KEY_UP)) {
		dir[1] += -1; moving = true;
	}

	if ($G.input.keyboard.IsKeyDown(KEY_DOWN)) {
		dir[1] += 1; moving = true;
	}

	if ($G.input.keyboard.IsKeyDown(KEY_LEFT)) {
		dir[0] += -1; moving = true;
	}

	if ($G.input.keyboard.IsKeyDown(KEY_RIGHT)) {
		dir[0] += 1; moving = true;
	}

	if (moving) { socket.send({ command: 'move', payload: { dir: dir }}); }

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
	}

	for (var num in { '1': 0 })
	{
		ground[num] = new $G.animation.sprite(0, 0, 32, 32, 1, 0, $G.assets.images['ground' + num + '.png'])
	}

	ctx.font = '12px arial';
}
