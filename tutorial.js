/* ============================================================
   Doodle District — Tutorial System v3.0
   - Guided practice arena with a stationary dummy
   - Step-by-step prompts: move, shoot, swing, rocket jump
   - Uses Three.js (from import map) for a lightweight 3D scene
   - Completing grants a 'Tutorial Complete' badge
   ============================================================ */
(function () {
'use strict';

var T = null;
var scene, camera, renderer, dummy, dummyHit, tracer;
var keys = {};
var yaw = 0, pitch = 0;
var pos = { x: 0, y: 1.6, z: 8 };
var vel = { x: 0, y: 0, z: 0 };
var onGround = true;
var step = 0;
var stepDone = [false, false, false, false, false];
var active = false;
var container = null;
var raf = null;
var lastTime = 0;
var swingT = 0;
var hasShot = false, hasSwung = false, hasJumped = false;
var dummyHp = 100;
var moveDist = 0;
var lastPos = { x: 0, z: 8 };

var STEPS = [
  { title: 'MOVE AROUND', text: 'Use W A S D to walk. Move around to continue.', check: function () { return moveDist > 8; } },
  { title: 'SHOOT THE DUMMY', text: 'Click to shoot the stationary dummy. Hit it 3 times!', check: function () { return dummyHp <= 40; } },
  { title: 'MELEE SWING', text: 'Press SPACE to swing your blade at the dummy.', check: function () { return hasSwung; } },
  { title: 'ROCKET JUMP', text: 'Press F to fire a rocket at the ground and launch yourself up!', check: function () { return hasJumped; } },
  { title: 'TUTORIAL COMPLETE', text: "You're ready! Click FINISH to return to the menu.", check: function () { return step >= 4; } }
];

async function start() {
  if (active) return;
  T = await import('three');

  /* Create overlay container */
  container = document.createElement('div');
  container.id = 'dd-tutorial';
  container.innerHTML =
    '<canvas id="dd-tut-canvas"></canvas>' +
    '<div id="dd-tut-hud">' +
      '<div id="dd-tut-step"><h2></h2><p></p></div>' +
      '<div id="dd-tut-hint">W A S D = move · MOUSE = look · CLICK = shoot · SPACE = swing · F = rocket · ESC = quit</div>' +
      '<div id="dd-tut-progress"></div>' +
      '<button type="button" id="dd-tut-finish" style="display:none">FINISH</button>' +
    '</div>';
  document.body.appendChild(container);

  var canvas = document.getElementById('dd-tut-canvas');
  renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new T.Scene();
  scene.background = new T.Color(0xf5f3e6);

  camera = new T.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(pos.x, pos.y, pos.z);

  /* Lighting */
  scene.add(new T.HemisphereLight(0xffffff, 0xaaaabb, 1.0));
  var dir = new T.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 5);
  scene.add(dir);

  /* Ground - doodle paper style */
  var groundGeo = new T.PlaneGeometry(80, 80);
  var groundMat = new T.MeshStandardMaterial({ color: 0xf5f3e6, roughness: 0.9 });
  var ground = new T.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* Grid lines for doodle look */
  var grid = new T.GridHelper(80, 40, 0x1a30c0, 0x1a30c0);
  grid.material.opacity = 0.15;
  grid.material.transparent = true;
  scene.add(grid);

  /* Boundary walls */
  var wallMat = new T.MeshStandardMaterial({ color: 0x333a55, roughness: 0.7 });
  [[0, 40, 80, 4, 1], [0, -40, 80, 4, 1], [40, 0, 1, 4, 80], [-40, 0, 1, 4, 80]].forEach(function (w) {
    var wall = new T.Mesh(new T.BoxGeometry(w[2], w[3], w[4]), wallMat);
    wall.position.set(w[0], w[3] / 2, w[1]);
    scene.add(wall);
  });

  /* Dummy target - doodle humanoid */
  dummy = new T.Group();
  var inkMat = new T.MeshStandardMaterial({ color: 0xd02030, roughness: 0.6 });
  var darkMat = new T.MeshStandardMaterial({ color: 0x23232e, roughness: 0.7 });
  /* Body */
  var body = new T.Mesh(new T.BoxGeometry(0.8, 1.2, 0.4), inkMat);
  body.position.y = 1.3; dummy.add(body);
  /* Head */
  var head = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.5), darkMat);
  head.position.y = 2.2; dummy.add(head);
  /* Arms */
  var armL = new T.Mesh(new T.BoxGeometry(0.2, 0.9, 0.2), inkMat);
  armL.position.set(-0.5, 1.4, 0); dummy.add(armL);
  var armR = new T.Mesh(new T.BoxGeometry(0.2, 0.9, 0.2), inkMat);
  armR.position.set(0.5, 1.4, 0); dummy.add(armR);
  /* Legs */
  var legL = new T.Mesh(new T.BoxGeometry(0.25, 0.8, 0.25), darkMat);
  legL.position.set(-0.2, 0.4, 0); dummy.add(legL);
  var legR = new T.Mesh(new T.BoxGeometry(0.25, 0.8, 0.25), darkMat);
  legR.position.set(0.2, 0.4, 0); dummy.add(legR);
  /* Outline edges */
  var lineMat = new T.LineBasicMaterial({ color: 0x1a30c0, transparent: true, opacity: 0.5 });
  dummy.traverse(function (o) {
    if (o.isMesh) {
      try {
        var e = new T.LineSegments(new T.EdgesGeometry(o.geometry, 28), lineMat);
        e.position.copy(o.position); o.parent.add(e);
      } catch (err) {}
    }
  });
  dummy.position.set(0, 0, 0);
  scene.add(dummy);

  /* Tracer line (hidden initially) */
  var tracerGeo = new T.BufferGeometry();
  tracerGeo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  tracer = new T.Line(tracerGeo, new T.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0 }));
  scene.add(tracer);

  /* Event listeners */
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', onClick);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('keydown', onEsc);
  window.addEventListener('resize', onResize);
  document.getElementById('dd-tut-finish').addEventListener('click', finish);

  /* Lock pointer */
  canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
  canvas.addEventListener('click', function () { if (active) canvas.requestPointerLock(); });

  active = true;
  step = 0;
  dummyHp = 100;
  hasShot = false; hasSwung = false; hasJumped = false;
  moveDist = 0;
  lastPos = { x: pos.x, z: pos.z };
  updateStepUI();
  lastTime = performance.now();
  loop();
}

function onKeyDown(e) {
  if (!active) return;
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); doSwing(); }
  if (e.code === 'KeyF') { e.preventDefault(); doRocketJump(); }
}
function onKeyUp(e) { keys[e.code] = false; }
function onEsc(e) { if (e.code === 'Escape' && active) finish(); }
function onMouseMove(e) {
  if (!active || document.pointerLockElement !== document.getElementById('dd-tut-canvas')) return;
  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-1.4, Math.min(1.4, pitch));
}
function onResize() {
  if (!active || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function onClick(e) {
  if (!active) return;
  doShoot();
}

function doShoot() {
  hasShot = true;
  /* Raycast from camera */
  var ray = new T.Raycaster();
  ray.setFromCamera({ x: 0, y: 0 }, camera);

  /* Check dummy hit */
  var hits = ray.intersectObject(dummy, true);
  if (hits.length > 0 && hits[0].distance < 30) {
    dummyHp -= 20;
    /* Flash dummy */
    dummy.traverse(function (o) {
      if (o.isMesh && o.material && o.material.color) {
        o.material.emissive = new T.Color(0xff4444);
        setTimeout(function () { if (o.material) o.material.emissive = new T.Color(0x000000); }, 100);
      }
    });
    /* Hit burst */
    var hitPos = hits[0].point;
    spawnBurst(hitPos, 0xff4444, 8);
  }

  /* Tracer effect */
  var tracerPos = tracer.geometry.attributes.position;
  tracerPos.setXYZ(0, camera.position.x, camera.position.y, camera.position.z);
  var end = new T.Vector3();
  camera.getWorldDirection(end);
  end.multiplyScalar(30).add(camera.position);
  tracerPos.setXYZ(1, end.x, end.y, end.z);
  tracerPos.needsUpdate = true;
  tracer.material.opacity = 0.8;
  setTimeout(function () { if (tracer) tracer.material.opacity = 0; }, 100);
}

function doSwing() {
  hasSwung = true;
  swingT = 0.3;
  /* Check if near dummy */
  if (dummy.position.distanceTo(new T.Vector3(pos.x, pos.y, pos.z)) < 3) {
    dummyHp -= 30;
    spawnBurst(dummy.position.clone().setY(1.5), 0xff8800, 12);
  }
}

function doRocketJump() {
  hasJumped = true;
  /* Apply upward velocity */
  vel.y = 20;
  onGround = false;
  /* Explosion effect at feet */
  spawnBurst(new T.Vector3(pos.x, 0.2, pos.z), 0xff6600, 20);
  /* Small self-damage visual */
  dummyHp = Math.max(0, dummyHp); /* no actual damage in tutorial */
}

var bursts = [];
function spawnBurst(position, color, count) {
  for (var i = 0; i < count; i++) {
    var p = new T.Mesh(
      new T.SphereGeometry(0.05, 4, 3),
      new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 })
    );
    p.position.copy(position);
    p.userData = {
      vel: new T.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8),
      life: 0.6
    };
    scene.add(p);
    bursts.push(p);
  }
}

function updateStepUI() {
  var s = STEPS[step];
  if (!s) return;
  document.querySelector('#dd-tut-step h2').textContent = s.title;
  document.querySelector('#dd-tut-step p').textContent = s.text;
  var prog = '';
  for (var i = 0; i < STEPS.length - 1; i++) {
    prog += (i < step ? '✓ ' : (i === step ? '▶ ' : '○ '));
  }
  document.getElementById('dd-tut-progress').textContent = prog;
  if (step >= STEPS.length - 1) {
    document.getElementById('dd-tut-finish').style.display = 'block';
  }
}

function checkStep() {
  if (step < STEPS.length - 1 && STEPS[step].check()) {
    step++;
    updateStepUI();
  }
}

function loop() {
  if (!active) return;
  raf = requestAnimationFrame(loop);
  var now = performance.now();
  var dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  /* Movement */
  var speed = 8;
  var forward = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  var right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  var move = new T.Vector3();
  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyA']) move.sub(right);
  if (keys['KeyD']) move.add(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

  pos.x += move.x;
  pos.z += move.z;
  moveDist += Math.sqrt(move.x * move.x + move.z * move.z);

  /* Gravity & jump */
  vel.y -= 25 * dt;
  pos.y += vel.y * dt;
  if (pos.y <= 1.6) { pos.y = 1.6; vel.y = 0; onGround = true; }

  /* Clamp to bounds */
  pos.x = Math.max(-38, Math.min(38, pos.x));
  pos.z = Math.max(-38, Math.min(38, pos.z));

  /* Camera */
  camera.position.set(pos.x, pos.y, pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  /* Swing animation */
  if (swingT > 0) swingT -= dt;

  /* Update bursts */
  for (var i = bursts.length - 1; i >= 0; i--) {
    var b = bursts[i];
    b.position.addScaledVector(b.userData.vel, dt);
    b.userData.vel.y -= 10 * dt;
    b.userData.life -= dt;
    b.material.opacity = Math.max(0, b.userData.life / 0.6);
    if (b.userData.life <= 0) {
      scene.remove(b); b.geometry.dispose(); b.material.dispose();
      bursts.splice(i, 1);
    }
  }

  /* Dummy wobble when hit */
  if (dummyHp <= 0) {
    dummy.rotation.z = Math.sin(now * 0.01) * 0.1;
    dummy.position.y = Math.sin(now * 0.005) * 0.1;
  }

  renderer.render(scene, camera);
  checkStep();
}

function finish() {
  active = false;
  if (raf) cancelAnimationFrame(raf);
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('keydown', onEsc);
  window.removeEventListener('resize', onResize);
  if (document.pointerLockElement) document.exitPointerLock();
  if (renderer) { renderer.dispose(); }
  if (container && container.parentNode) container.parentNode.removeChild(container);
  container = null;

  /* Mark tutorial complete */
  try { localStorage.setItem('dd_tutorial_done', '1'); } catch (e) {}

  /* Show toast */
  if (window.__ddMenu && window.__ddMenu.toast) {
    window.__ddMenu.toast("★ Tutorial complete! You're ready to play. ★", 4);
  }

  /* Reload to return to menu */
  try {
    if (window.__game && window.__game.game) {
      window.__game.game.state = 'start';
      window.__game.game.menu = false;
    }
  } catch (e) {}
  location.reload();
}

/* Public API */
window.__ddTutorial = { start: start };

/* CSS */
var style = document.createElement('style');
style.textContent =
  '#dd-tutorial{position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#f5f3e6}' +
  '#dd-tut-canvas{display:block;width:100%;height:100%}' +
  '#dd-tut-hud{position:fixed;top:0;left:0;width:100%;pointer-events:none;font-family:"Patrick Hand",cursive}' +
  '#dd-tut-step{position:absolute;top:20px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.95);border:2px solid #1a30c0;border-radius:12px;padding:16px 28px;text-align:center;max-width:500px;box-shadow:0 4px 16px rgba(0,0,0,.15)}' +
  '#dd-tut-step h2{margin:0 0 6px;color:#1a30c0;font-size:22px;font-family:"Caveat",cursive;font-weight:600}' +
  '#dd-tut-step p{margin:0;color:#333;font-size:16px}' +
  '#dd-tut-hint{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(26,48,192,.9);color:#fff;padding:8px 20px;border-radius:8px;font-size:14px;white-space:nowrap}' +
  '#dd-tut-progress{position:absolute;top:90px;left:50%;transform:translateX(-50%);color:#1a30c0;font-size:20px;letter-spacing:4px}' +
  '#dd-tut-finish{position:absolute;top:160px;left:50%;transform:translateX(-50%);pointer-events:auto;background:#1a30c0;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-family:"Patrick Hand",cursive;font-size:20px;cursor:pointer;box-shadow:0 4px 12px rgba(26,48,192,.4)}' +
  '#dd-tut-finish:hover{background:#2a40d0}';
document.head.appendChild(style);
})();
