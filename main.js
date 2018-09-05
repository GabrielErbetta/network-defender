var TILE     = 4,                 // the size of each tile (in game pixels)
    MAP      = { tw: 300, th: 150, pw: 300 * TILE, ph: 150 * TILE }, // the size of the map (in tiles)
    BORDER   = 20,                // the size of the border
    METER    = TILE,               // abitrary choice for 1m
    GRAVITY  = METER * 9.8 * 3,    // very exagerated gravity (6x)
    MAXDX    = METER * 20,         // max horizontal speed (20 tiles per second)
    MAXDY    = METER * 100,         // max vertical speed   (60 tiles per second)
    ACCEL    = 1 / 5,              // horizontal acceleration -  take 1/2 second to reach maxdx
    PSIZE    = 5;              // horizontal acceleration -  take 1/2 second to reach maxdx

var canvas   = document.getElementById('canvas'),
    ctx      = canvas.getContext('2d'),
    width    = canvas.width  = MAP.tw * TILE,
    height   = canvas.height = MAP.th * TILE,
    player   = { x: BORDER + 20, y: MAP.ph - BORDER - 20 - (TILE * PSIZE), hp: 100, angle: 45, power: 0 },
    enemy    = { x: MAP.pw - BORDER - 20 - (TILE * PSIZE), y: MAP.ph - BORDER - 20 - (TILE * PSIZE), hp: 100 },
    bullet   = { x: -10, y: 0, dx: 0, dy: 0 },
    started  = false,
    routers  = [
      { y: 0, damage: 10 },
      { y: 0, damage: 20 },
      { y: 0, damage: 40 }
    ];

var t2p = function(t) { return t*TILE; },
    p2t = function(p) { return Math.floor(p/TILE); };

var KEY    = { UP: 38, DOWN: 40, SPACE: 32 };

var COLOR  = { BLACK: '#000000', GREEN: '#009933' /*, YELLOW: '#FFE83D', BLUE: '#6AD8D3'*/ };

function timestamp() {
  if (window.performance && window.performance.now)
    return window.performance.now();
  else
    return new Date().getTime();
}

function bound(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

var fps  = 60,
    step = 1/fps,
    dt   = 0,
    now, last = timestamp();

function frame() {
  if (started) {
    now = timestamp();
    dt = dt + Math.min(1, (now - last) / 1000);
    while(dt > step) {
      dt = dt - step;
      update(step);
    }
    last = now;
  }
  render(ctx, dt);
  requestAnimationFrame(frame, canvas);
}

function render(ctx) {
  if (!started) {
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(0, 0, MAP.tw * TILE, MAP.th * TILE);

    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(20, 20, (MAP.tw * TILE) - 40, (MAP.th * TILE) - 40);

    ctx.font = "80px Arial";
    ctx.fillStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR.GREEN;
    ctx.textAlign = "center";
    ctx.fillText("Computer Cannon", MAP.tw * TILE / 2, MAP.th * TILE / 2);
    ctx.strokeText("Computer Cannon", MAP.tw * TILE / 2, MAP.th * TILE / 2);
  } else {
    // render background
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(0, 0, MAP.tw * TILE, MAP.th * TILE);

    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(20, 20, (MAP.tw * TILE) - 40, (MAP.th * TILE) - 40);

    // render center line
    ctx.strokeStyle = "#FFFFFF";
    ctx.moveTo(MAP.pw / 2, 0);
    ctx.lineTo(MAP.pw / 2, MAP.ph);
    ctx.stroke();

    // render player
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(player.x, player.y, TILE * PSIZE, TILE * PSIZE);
    // render firewall
    ctx.beginPath();
    ctx.arc(player.x + (PSIZE * TILE / 2), player.y + (PSIZE * TILE / 2), PSIZE * TILE, 0, 2*Math.PI);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();
    //render shooting angle
    var x = (player.x + (PSIZE * TILE / 2)) + (PSIZE * TILE) * Math.cos(toRad(360 - player.angle));
    var y = (player.y + (PSIZE * TILE / 2)) + (PSIZE * TILE) * Math.sin(toRad(360 - player.angle));
    ctx.strokeStyle = "#FFFFFF";
    ctx.moveTo(x, y);
    ctx.lineTo(x + (10 + player.power / 5) * Math.cos(toRad(360 - player.angle)), y + (10 + player.power / 5) * Math.sin(toRad(360 - player.angle)));
    ctx.stroke();

    // render enemy
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(enemy.x, enemy.y, TILE * PSIZE, TILE * PSIZE);
    // render firewall
    ctx.beginPath();
    ctx.arc(enemy.x + (PSIZE * TILE / 2), enemy.y + (PSIZE * TILE / 2), PSIZE * TILE, 0, 2*Math.PI);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();

    // render bullet
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(bullet.x - TILE / 4, bullet.y - TILE / 4, TILE * 2, TILE * 2);
  }
}

function toRad(deg) {
  return Math.PI * deg / 180.0;
}

function start() {
  document.addEventListener('keydown', keyDown, false);
  document.addEventListener('keyup',   keyUp, false);

  started = true;
  score = 0;
  now = last = timestamp();
}

function onkey(ev, key, down) {
  switch(key) {
    case KEY.UP:    player.angleUp   = down; return false;
    case KEY.DOWN:  player.angleDown = down; return false;
    case KEY.SPACE: player.fire      = down; return false;
  }
}

function update(dt) {
  // key presses
  if (player.fire && !player.firing) {
    player.power = 0;
    player.firing = true;
    console.log("power = " + player.power);
  } else if (player.fire && player.power < 100) {
    player.power += 1;
    console.log("power = " + player.power);
  }
  else if (!player.fire && player.firing) {
    bullet.x  = player.x + (PSIZE * TILE / 4);
    bullet.y  = player.y + (PSIZE * TILE / 4);
    bullet.dx = (Math.cos(toRad(player.angle)) * player.power) * 5;
    bullet.dy = - (Math.sin(toRad(player.angle)) * player.power) * 5;

    console.log("power = " + player.power);
    //console.log("angle = " + player.angle);

    console.log("dx = " + bullet.dx);
    console.log("dy = " + bullet.dy);

    player.power = 0;
    player.firing = false;
  }
  else if (player.angleUp && player.angle <= 90) {
    console.log("angle = " + player.angle);
    player.angle += 1;
  }
  else if (player.angleDown && player.angle >= 0) {
    console.log("angle = " + player.angle);
    player.angle -= 1;
  }


  // move bullet
  bullet.y  = bullet.y  + (dt * bullet.dy);
  bullet.x  = bullet.x  + (dt * bullet.dx);
  bullet.dy = bullet.dy + (dt * GRAVITY);
  //bullet.dy = bound(bullet.dy + (dt * GRAVITY), -MAXDY, MAXDY);
}

function keyDown(ev) { return onkey(ev, ev.keyCode, true); }
function keyUp(ev) { return onkey(ev, ev.keyCode, false); }

function spaceStart(ev) {
  if (ev.keyCode == KEY.SPACE) {
    document.removeEventListener('keypress', spaceStart);
    start();
  }
}

document.addEventListener('keypress', spaceStart, false);
frame(); // start the first frame
