
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

	if(paused){

	}

	game.renderer.render( game.scene, game.camera );
}

function generate_planet()
{
	var cells = [];
	var iso = new THREE.IcosahedronBufferGeometry( 2, 2 );
	var material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

	var verts = iso.attributes.position.array;
	var norms = iso.attributes.normal.array;
	for (var i = 0; i < iso.attributes.position.count; ++i)
	{
		var tri = new THREE.Geometry();
		tri.vertices.push(verts[i * 3 + 0]);
		tri.vertices.push(verts[i * 3 + 1]);
		tri.vertices.push(verts[i * 3 + 2]);
		//tri.faceVertexUVs.push(iso.attributes.uv[i * 2 + 0]);
		//tri.faceVertexUVs.push(iso.attributes.uv[i * 2 + 1]);

		var norm = new THREE.Vector3(
			norms[i * 3 + 0],
			norms[i * 3 + 1],
			norms[i * 3 + 2]
		);
		tri.faces.push(new THREE.Face3(0, 1, 2, norm));

		cells.push({
			geometry: {
				cell: new THREE.Mesh(tri, material)
			}
		});
	}

	return cells;
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
	//game.planet.mesh = new THREE.Mesh( geometry, material );
	//game.scene.add( game.planet.mesh );

	var cells = generate_planet();

	for (var i = cells.length; i--;)
	{
		game.scene.add(cells[i].geometry.cell);
	}

	game.camera.position.z = 5;

	$G.init(loop, null);

	var touch_start = [];

	var move = function(e)
	{
		var t = e.pageX ? e : e.touches[0];

		var x = (t.pageX / window.innerWidth) * 2 - 1;
		var y = (t.pageY / window.innerHeight) * 2 + 1;

		if (touch_start.length > 0)
		{
			var x_axis = new THREE.Vector3(1, 0, 0);
			var y_axis = new THREE.Vector3(0, 1, 0);
			var rot_x = new THREE.Quaternion().setFromAxisAngle(y_axis, (x - touch_start[0]) / 1);
			var rot_y = new THREE.Quaternion().setFromAxisAngle(x_axis, (y - touch_start[1]) / 1);

			game.planet.mesh.applyQuaternion(rot_x.multiply(rot_y));
			touch_start = [ x, y ];
		}
	};

	var begin = function(e)
	{
		var t = e.pageX ? e : e.touches[0];

		var x = (t.pageX / window.innerWidth) * 2 - 1;
		var y = (t.pageY / window.innerHeight) * 2 + 1;

		touch_start = [ x, y ];
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
