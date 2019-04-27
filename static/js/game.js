
var lastTouchPos;

var ctx;
var paused = true;
var time = 0;

var game = {
	planet: {
		mesh: null
	}
};

$G.assets.images("imgs/").load([], function(){
	start();
});

function aspectRatio()
{
	return $G.canvas.height / $G.canvas.width;
}

function loop()
{
	var dt = $G.timer.tick();
	time += dt;

	console.log(time);

	if(paused){

	}

	game.renderer.render( game.scene, game.camera );
}

function start()
{
	game.scene = new THREE.Scene();
	game.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	game.renderer = new THREE.WebGLRenderer();

	game.renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( game.renderer.domElement );

	$G.canvas = game.renderer.domElement;

	var geometry = new THREE.IcosahedronBufferGeometry( 2, 2 );
	var material = new THREE.MeshNormalMaterial({ wireframe: true });
	// geometry.attributes.position.array[0] = 4;
	game.planet.mesh = new THREE.Mesh( geometry, material );
	game.scene.add( game.planet.mesh );



	game.camera.position.z = 5;

	$G.init(loop, null);

	var touch_start = [];

	var move = function(e)
	{
		var t = e.pageX ? e : e.touches[0];

		var x = t.pageX;
		var y = t.pageY;

		if (touch_start.length > 0)
		{
			var x_axis = new THREE.Vector3(1, 0, 0);
			var y_axis = new THREE.Vector3(0, 1, 0);
			var rot_x = new THREE.Quaternion().setFromAxisAngle(y_axis, (x - touch_start[0]) / 100);
			var rot_y = new THREE.Quaternion().setFromAxisAngle(x_axis, (y - touch_start[1]) / 100);

			game.planet.mesh.applyQuaternion(rot_x.multiply(rot_y));
			touch_start = [ x, y ];
		}
	};

	var begin = function(e)
	{
		var t = e.pageX ? e : e.touches[0];

		touch_start = [ t.pageX, t.pageY ];
	};

	var end = function(e)
	{
		touch_start = [];
	}

	$G.input.touch.setStart(begin);
	$G.input.touch.setEnd(end);
	$G.input.touch.setMove(move);

	$G.input.mouse.setClick(begin);
	$G.input.mouse.setClickEnd(end);
	$G.input.mouse.setMove(move);
}
