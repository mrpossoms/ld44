
var lastTouchPos;

var road, deathBus, fodder;
var explosion, smoke, sparks, fire, blood, intro;
var ctx;
var paused = true;
var time = 0;

$G.assets.images("imgs/").load(['Road-0.png', 'Death.png' , 'Cars-0.png', 'Cars-1.png', 'Cars-2.png', 'Explo-0.png', 'Guy-0.png', 'Smoke-0.png', 'Sparks-0.png', 'Fire-0.png', 'Intro.png'], function(){
	start();
});

function aspectRatio(){
	return $G.canvas.height / $G.canvas.width;
}

function massFromSprite(sprite){
	return sprite._w * sprite._h;
}

function ScoreBubbles(){
	var bubs = [];

	bubs.add = function(pos, n){
		bubs.push({
			pos: pos,
			score: n,
			time: 0.25
		});
	};

	bubs.draw = function(dt){

		for(var i = this.length; i--;){
			var b = this[i];
			var x = b.pos.e(1), y = b.pos.e(2);

			var grad = ctx.createLinearGradient(0, y, 0, y + 10);
			grad.addColorStop(0, 'yellow');
			grad.addColorStop(1, 'red');

			ctx.fillStyle   = grad;
			ctx.strokeStyle = 'black';
			ctx.strokeText('HP ' + Math.ceil(deathBus.hp) + '%', x, y);
			ctx.fillText('HP ' + Math.ceil(deathBus.hp) + '%', x, y);

			b.time -= dt;
		}

		if(this.length && this[0].time <= 0){
			this.shift();
		}
	};

	return bubs;
}

function DeathBus(img){
	this._sprite = new $G.animation.sprite(0, 0, img.width, img.height, 1, 0);
	this.position = $V([$G.canvas.width / 2, $G.canvas.height * 0.75]);
	this.mass = massFromSprite(this._sprite) * 2;
	this.hp = 100;
	this.kills = 0;
	this.half = $V([img.width / 2, img.height / 2]).x(1);

	var half = this.half;

	this.bounds = function(){
		var b = this._sprite.bounds(this.position);
		b.upperLeft.x  += half.e(1) / 2;
		b.lowerRight.x -= half.e(1) / 2;
		return b;
	};

	this.update = function(furyRoad, dt){
		var dx = lastTouchPos.subtract(this.position);
		var temp = dx.x(dt * 4); temp.setElements([temp.e(1), 0]);
		var quarter = half.x(0.3);
		var bounds = furyRoad.bounds();
		var left  = this.position.e(1) - quarter.e(1) + temp.e(1);
		var right = this.position.e(1) + quarter.e(1) + temp.e(1);

		// keep the bus within bounds
		if(left < bounds.upperLeft.x){
			temp.setElements([0, 0]);
			this.position.setElements([bounds.upperLeft.x + quarter.e(1), this.position.e(2)]);
		}

		if(right > bounds.lowerRight.x){
			temp.setElements([0, 0]);
			this.position.setElements([bounds.lowerRight.x - quarter.e(1), this.position.e(2)]);
		}

		this.position = this.position.add(temp); // left right
		temp = dx.x(dt * 8); temp.setElements([0, temp.e(2)]);
		this.position = this.position.add(temp);     // up down

		// clamp health
		if(this.hp > 100){
			this.hp = 100;
		}
		else if(this.hp < 0){
			this.hp = 0;
		}
	};

	this.draw = function(dt){
		var crazy = $V([Math.random() - 0.5, Math.random() - 0.5]);

		ctx.save();
		ctx.transVec(this.position.subtract(half).add(crazy));
		this._sprite.draw(img, 1, 0);
		ctx.restore();
	};
}

function FodderManager(){
	var pools = [
		$G.objectPool(20), // small
		$G.objectPool(20), // med
		$G.objectPool(10), // large
		$G.objectPool(10), // peds
	];

	pools.eachFodder = function(cb){
		for(var i = this.length; i--;){
			var p = this[i];
			for(var j = p.living; j--;){
				var res = cb(p[j]);
				if(res == 1) break;
				if(res == 2) return;
			}
		}
	};

	// for convenience
	var small = pools[0], medium = pools[1], large = pools[2], peds = pools[3];

	small.sprite  = new $G.animation.sprite(0, 0, 15, 32, 2, 0);
	medium.sprite = new $G.animation.sprite(0, 0, 16, 32, 12, 0);
	large.sprite  = new $G.animation.sprite(0, 0, 16, 50, 4, 0);
	peds.sprite   = new $G.animation.sprite(0, 0, 10, 19, 8, 0);

	small.img  = $G.assets.images['Cars-2.png'];
	medium.img = $G.assets.images['Cars-0.png'];
	large.img  = $G.assets.images['Cars-1.png'];
	peds.img   = $G.assets.images['Guy-0.png'];

	small.baseHp  = 1;
	medium.baseHp = 5;
	large.baseHp  = 20;
	peds.baseHp   = 0.25

	var spawnTimer = 0;

	function collisionCheck(myPool, me){
		var force = $V([0, 0]);

		for(var i = pools.length; i--;){
			var p = pools[i];

			// peds can't collide with peds
			if(myPool == peds && p == peds){
				continue;
			}

			for(var j = p.living; j--;){
				var obj = p[j];

				// dont collide with yourself dummy
				if(obj == me) continue;

				// the two are intersecting right now!
				if($G.test.box(me.bounds).overlapsBox(obj.bounds)){
					var delta = me.pos.subtract(obj.pos);
					delta = delta.x(obj.mass / Math.sqrt(delta.dot(delta)));
					force = force.add(delta);
				}
			}
		}

		var dbb = deathBus.bounds()
		if($G.test.box(dbb).overlapsBox(me.bounds))
		{
			var delta = me.pos.subtract(deathBus.position);
			delta = delta.x(deathBus.mass / Math.sqrt(delta.dot(delta)));
			force = force.add(delta);

			var dmg = Math.pow(force.dot(force), 0.083) / 8;

			deathBus.hp += dmg;
		}

		var magSqr;
		if(magSqr = force.dot(force)){
			if(magSqr > 10000){
				return force.toUnitVector().x(6500);
			}
			return force;
		}

		return false;
	}

function bloodBomb(p){
	for(var k = 20 + Math.floor(Math.random() * 10); k--;){
		blood.spawn(
			$V([p.e(1), p.e(2), 1]),
			$V([Math.random() - 0.5, Math.random() - 0.5 + (k % 2 == 0 ? 0 : 4), 0]).x(200),
			0.25
		);
	}
}

	this.reset = function(){
		for(var i = pools.length; i--;){
			pools[i].living = 0;
		}
	};

	this.spawn = function(pos, poolIndex){
		var me = pools[poolIndex].spawn({
			pos:   pos,
			vel:   $V([0, 0]),
			slowness: poolIndex == 3 ? 800 : Math.random() * 50 + 200,
			mass: massFromSprite(pools[poolIndex].sprite),
			frame: Math.floor(Math.random() * 2) * 2,
			hp:    pools[poolIndex].baseHp,
			dying: 10,
			exploding: 0.25,
			homex: 0
		});

		if(!me) return null;

		me.pos = pos;
		me.hp  = pools[poolIndex].baseHp;

		return me;
	};

	this.update = function(road, bus, dt){
		var roadBounds = road.bounds();

		// update the positions and bounds first
		for(var i = pools.length; i--;){
			var p = pools[i];
			var half = $V([p.sprite._w / 2, p.sprite._h / 2]);
			for(var j = p.living; j--;){
				var fodder = p[j];
				fodder.pos = fodder.pos.add(fodder.vel.x(dt));
				fodder.bounds = p.sprite.bounds(fodder.pos);

				// car went off screen, kill it
				if(fodder.pos.e(2) - p.sprite._h > $G.canvas.height){
					// the player failed to destroy the fodder, hurt them
					if(fodder.hp > 0){
						deathBus.hp -= fodder.hp;
					}

					p.kill(j);
					continue;
				}

				// move down
				// try to get back in the right lane
				var dx = 0;
				if(fodder.hp > 0) dx = fodder.homex - fodder.pos.e(1);
				fodder.vel = fodder.vel.add($V([dx * 4 * dt, fodder.slowness * dt]));

				var next = fodder.pos.add(fodder.vel.x(dt));

				//if(p != peds)
				{
				if(next.e(1) > roadBounds.lowerRight.x){
					fodder.pos.setElements([roadBounds.lowerRight.x, fodder.pos.e(2)]);
					fodder.vel.setElements([-fodder.vel.e(1) * 1.0, fodder.vel.e(2)]);
					fodder.hp -= Math.abs(fodder.vel.e(1));
				}

				if(next.e(1) < roadBounds.upperLeft.x){
					fodder.pos.setElements([roadBounds.upperLeft.x, fodder.pos.e(2)]);
					fodder.vel.setElements([-fodder.vel.e(1) * 1.0, fodder.vel.e(2)]);
					fodder.hp -= Math.abs(fodder.vel.e(1));
				}
				}

				if(fodder.hp <= 0){
					fodder.dying -= dt;
					//fodder.vel = fodder.vel.add($V([0, fodder.slowness * dt]));

					if(p != peds && fodder.dying > 7.5)
					fire.spawn(
						$V([fodder.pos.e(1), fodder.pos.e(2), 0.5 + Math.random() / 2]),
						$V([Math.random() - 0.5, Math.random() + 8, -0.15 - Math.random() * 0.1]).x(50),
						0.3
					);


					if(fodder.dying <= 0){
						p.kill(j);
					}
				}
				else if(fodder.hp < p.baseHp * 0.75 && !(Math.floor(time * 100) % 2)){
					smoke.spawn(
						$V([fodder.pos.e(1), fodder.pos.e(2), 1]),
						$V([Math.random() - 0.5, Math.random() + 4, 0.15]).x(50),
						0.5
					);
				}
				// decay velocity
				fodder.vel = fodder.vel.add(fodder.vel.x(-dt * 1.5));
			}
		}

		// respond to collisions
		for(var i = pools.length; i--;){
			var p = pools[i];
			for(var j = p.living; j--;){
				var force;

				// was there a collision? If so, go flying the other way and take damage
				if(force = collisionCheck(p, p[j])){
					var dmg = Math.pow(force.dot(force), 0.083) / 8;
					var wasAlive = p[j].hp > 0;
					if(dmg > 10) dmg = 10;

					p[j].vel = p[j].vel.add(force.x(dt));
					p[j].hp -= dmg;

					if(p[j].hp <= 0 && wasAlive){
						deathBus.kills += p.baseHp;
					}

					if(p == peds){
						bloodBomb(p[j].pos);
					}
					else{
						for(var k = Math.ceil(dmg); k--;){
							sparks.spawn(
								$V([p[j].pos.e(1), p[j].pos.e(2), 1]),
								$V([Math.random() - 0.5, Math.random() - 0.5, 0]).x(800),
								0.125
							);
						}

						if(p == small){
							bloodBomb(p[j].pos);
						}
					}

					if(p[j].hp < 0){
						p[j].hp = 0;
					}
				}

			}
		}


		var center = $V([$G.canvas.width / 2, -128]);
		var roadWidth = road.bounds().lowerRight.x - road.bounds().upperLeft.x;

		var carSpawnPoints = [
			center,
			center.add($V([-roadWidth / 4, 0])),
			center.add($V([roadWidth / 4, 0]))
		];


		var pedSpawnPoints = [
			center.add($V([-(roadWidth * 0.9) / 2, 0])),
			center.add($V([ (roadWidth * 0.9) / 2, 0]))
		];

		// time to spawn something
		if(spawnTimer <= 0){
			var pi = Math.floor(Math.random() * 4);
			var fodder;

			if(pools[pi] != peds){
				var spi = Math.floor(Math.random() * 3);

				for(var i = 0; i < 3; ++i){
					var colliding = false;
					pools.eachFodder(function(f){

						if($G.test.box(f.bounds).containsPoint(carSpawnPoints[(spi + i) % 3], )){
							colliding = true;
							return 2;
						}
					});

					if(!colliding){
						fodder = this.spawn(carSpawnPoints[(spi + i) % 3], pi);

						if(!fodder) return;
						fodder.homex = fodder.pos.e(1);
						break;
					}
				}

				var density = 1 - Math.pow(Math.sin(time / Math.PI * 2) + 1, 2);
				spawnTimer = 0.1 + density * Math.random() * 1.5 / (time * 2);
				if(pools[pi] == medium){
					fodder.frame = Math.floor(Math.random() * 6) * 2;
				}
			}
			else{
				for(var i = Math.ceil(10 * Math.random()); i--;){
					fodder = this.spawn(pedSpawnPoints[Math.floor(Math.random() * 2)], pi);
					if(!fodder) return;
					fodder.homex = fodder.pos.e(1);
					fodder.pos = fodder.pos.add($V([0, i * 10]));
					spawnTimer = 0.5 + Math.sin(time / Math.PI * 2) * Math.random() * 1.5;
				}
			}
		}
		else{
			spawnTimer -= dt;
		}
	};

	this.draw = function(dt){

		// respond to collisions
		for(var i = pools.length; i--;){
			var p      = pools[i];
			var sprite = p.sprite;
			var img    = p.img;
			var half   = $V([sprite._w / 2, sprite._h / 2]);

			for(var j = p.living; j--;){
				var off = ((p[j].hp <= 0) ? 1 : 0);
				ctx.save();
				ctx.transVec(p[j].pos);

				// spin out when crashing, unless it's a motorcycle
				if(p[j].hp <= 0){
					ctx.rotate(p[j].dying * 10);
					ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);
				}
				ctx.transVec(half.x(-1));
				sprite.draw(
					img,
					1, 0,
					p[j].frame + off
				);
				ctx.restore();

				if(p[j].hp <= 0 && p[j].exploding > 0 && p != peds){
					ctx.save();
					ctx.transVec(p[j].pos);
					ctx.translate(-explosion._w / 2, -explosion._h /2);
					explosion.draw(explosion.img, 1, dt);
					ctx.restore();

					p[j].exploding -= dt;
				}

//				ctx.fillStyle = '#FFFFFF';
//				ctx.fillText('hp: ' + p[j].hp + ' frame: ' + (p[j].frame + ((p[j].hp <= 0) ? 1 : 0)), p[j].pos.e(1), p[j].pos.e(2));

			}
		}

	};
}

function RoadSegments(imgs){
	this._ps = [];
	this._sprite = new $G.animation.sprite(
		0, 0,
		imgs[0].width, imgs[0].height,
		1,
		0
	);

	var half = $G.canvas.height / 2;
	var scl = half / imgs[0].height;

	var dims = {
		w: imgs[0].width * scl,
		h: half,
	};

	// position the segments initally
	for(var i = 0; i < 3; ++i){
		this._ps.push($V([$G.canvas.width / 2 - dims.w / 2, i * dims.h]));
	}

	this.bounds = function(){
		var h = dims.w / 2, c = $G.canvas.width / 2;
		return {
			upperLeft: {
				x: c - h,
				y: 0,
			},
			lowerRight: {
				x: c + h,
				y: $G.canvas.height
			}
		};
	};

	this.draw = function(dt){
		var delta = $V([0, dims.h * 4 * time]);
		for(var i = this._ps.length; i--;){
			var p = this._ps[i];
			var temp = p.add(delta);

			temp.setElements([p.e(1), (temp.e(2) % ($G.canvas.height + dims.h)) - dims.h]);

			ctx.save();
			ctx.transVec(temp);
			this._sprite.draw(
				imgs[0],
				scl,
				0
			);
			ctx.restore();
		}
	};
}

function loop(){
	var dt = $G.timer.tick();
	time += dt;

	console.log(time);

	var val = Math.ceil(Math.sin(time * 4) * 10 + 64).toString(16);
	$G.gfx.canvas.clear('#' + val + val + val);

	if(deathBus.hp > 0 && !paused){
		fodder.update(road, deathBus, dt);
		deathBus.update(road, dt);
	}

	road.draw(dt);
	fodder.draw(dt);
	deathBus.draw(dt);

	fire.draw(dt);
	smoke.draw(dt);
	blood.draw(dt);
	sparks.draw(dt);

	var grad = ctx.createLinearGradient(0, 10, 0, 20);
	var r = Math.ceil((100 - deathBus.hp) * 2.55)
	var g = Math.ceil((deathBus.hp) * 2.55)
	grad.addColorStop(0, 'yellow');
	grad.addColorStop(1, 'rgb(' + r + ',' + g +',0)');

	ctx.textAlign = 'left';
	ctx.fillStyle   = grad;
	ctx.strokeStyle = 'black';
	ctx.strokeText('HP ' + Math.ceil(deathBus.hp) + '%', 10, 20)
	ctx.fillText('HP ' + Math.ceil(deathBus.hp) + '%', 10, 20);

	ctx.textAlign = 'right';
	ctx.fillStyle = 'white';
	ctx.strokeText('Kills ' + Math.ceil(deathBus.kills), $G.canvas.width - 10, 20);
	ctx.fillText('Kills ' + Math.ceil(deathBus.kills), $G.canvas.width - 10, 20);

	if(deathBus.hp <= 0){
		ctx.save();
		ctx.transVec(deathBus.position.subtract(deathBus.half));
		for(var i = 5; i--;){
			ctx.translate(
			(Math.random() - 0.5) * deathBus.half.e(1),
			(Math.random() - 0.5) * deathBus.half.e(2));
			explosion.draw(explosion.img, 1, dt);
		}
		ctx.restore();


		ctx.textAlign = "center";
		ctx.strokeText("GAME OVER", $G.canvas.width / 2, $G.canvas.height / 2);
		ctx.fillStyle = "yellow";
		ctx.fillText("GAME OVER", $G.canvas.width / 2, $G.canvas.height / 2);


		ctx.strokeText("KILLS " + Math.ceil(deathBus.kills), $G.canvas.width / 2, $G.canvas.height / 2 + 20);
		ctx.fillStyle = "red";
		ctx.fillText("KILLS " + Math.ceil(deathBus.kills), $G.canvas.width / 2, $G.canvas.height / 2 + 20);
	}

	if(paused){
		ctx.drawImage($G.assets.images['Intro.png'], 0, 0, $G.canvas.width, $G.canvas.height);
	}
}

function start(){
	$G.init(loop, 'canvas').gfx.canvas.init();

	ctx = $G.gfx.context;
	ctx.transVec = function(v){
		this.translate(v.e(1), v.e(2));
	};

	ctx.font = '12px arial';

	var roadImg = $G.assets.images['Road-0.png'];
	var busImg  = $G.assets.images['Death.png'];

	explosion = new $G.animation.sprite(0, 0, 42, 46, 3, 12);
	explosion.img = $G.assets.images['Explo-0.png'];

	intro = new $G.animation.sprite(0, 0, 256, 256, 1, 0);

	smoke = new $G.particlePool(
		100,
		$G.assets.images['Smoke-0.png'],
		new $G.animation.sprite(0, 0, 10, 10, 3, 0)
	);

	sparks = new $G.particlePool(
		50,
		$G.assets.images['Sparks-0.png'],
		new $G.animation.sprite(0, 0, 10, 10, 5, 0)
	);

	blood = new $G.particlePool(
		50,
		$G.assets.images['Sparks-0.png'],
		new $G.animation.sprite(50, 0, 10, 10, 5, 0)
	);

	fire = new $G.particlePool(
		100,
		$G.assets.images['Fire-0.png'],
		new $G.animation.sprite(0, 0, 36, 36, 3, 0)
	);

	road     = new RoadSegments([roadImg]);
	deathBus = new DeathBus(busImg);
	fodder   = new FodderManager();

	lastTouchPos = $V([$G.canvas.width / 2, $G.canvas.height / 2]);

	var move = function(e){
		var t = e.pageX ? e : e.touches[0];

		var x = $G.canvas.width * t.pageX / window.innerWidth;
		var y = $G.canvas.height * t.pageY / window.innerHeight;

		lastTouchPos = $V([x, y]);
	};

	var begin = function(e){
		paused = false;

		if(deathBus.hp <= 0){
			fodder.reset();
			deathBus.hp = 100;
			deathBus.kills = 0;
		}
	};

	$G.input.touch.setStart(begin);
	$G.input.touch.setMove(move);
	$G.input.mouse.setClick(begin);
	$G.input.mouse.setMove(move);

}
