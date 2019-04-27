
var lastTouchPos;

var road, deathBus, fodder;
var explosion, smoke, sparks, fire, blood, intro;
var ctx;
var socket = null;
var paused = true;
var time = 0;

$G.assets.images("imgs/").load([], function(){
	start();
});

function aspectRatio(){
	return $G.canvas.height / $G.canvas.width;
}

function loop(){
	var dt = $G.timer.tick();
	time += dt;

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
				console.log(msg.payload);
				break;
		}
	});

	ctx = $G.gfx.context;
	ctx.transVec = function(v){
		this.translate(v.e(1), v.e(2));
	};

	ctx.font = '12px arial';
}
