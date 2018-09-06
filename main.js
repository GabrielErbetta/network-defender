var MAP     = { w: 1200, h: 600 }, // the size of the map (in tiles)
    BORDER  = 20,                // the size of the border
    GRAVITY = 9.8 * 12,    // very exagerated gravity (6x)
    ACCEL   = 1 / 5,              // horizontal acceleration -  take 1/2 second to reach maxdx
    PSIZE   = 20,              // horizontal acceleration -  take 1/2 second to reach maxdx
    BSIZE   = 8
    COLOR   = { BLACK: '#000', WHITE: '#FFF', GREEN: '#093', RED: '#F00'/*, BLUE: '#6AD8D3'*/ },
    KEY     = { UP: 38, DOWN: 40, SPACE: 32 };

var canvas  = document.getElementById('canvas'),
    ctx     = canvas.getContext('2d'),
    width   = canvas.width = MAP.w,
    height  = canvas.height = MAP.h,
    started = false,
    player  = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 45, power: 0 },
    enemy   = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100 },
    bullet  = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 0, active: false, shooter: 0 },
    routers = [
      { y: 0, damage: 10 },
      { y: 0, damage: 20 },
      { y: 0, damage: 40 }
    ];


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
  ctx.clearRect(0,0,MAP.w,MAP.h); // clear canvas

  if (!started) {
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(0, 0, MAP.w, MAP.h);

    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(20, 20, (MAP.w) - 40, (MAP.h) - 40);

    ctx.font = "80px Arial";
    ctx.fillStyle = COLOR.WHITE;
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR.GREEN;
    ctx.textAlign = "center";
    ctx.fillText("Router Shootout", MAP.w / 2, MAP.h / 2);
    ctx.strokeText("Router Shootout", MAP.w / 2, MAP.h / 2);
  } else {
    // render border
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(0, 0, MAP.w, MAP.h);

    // render background
    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(20, 20, (MAP.w) - 40, (MAP.h) - 40);

    // render center line
    ctx.strokeStyle = COLOR.WHITE;
    ctx.moveTo(MAP.w / 2, 0);
    ctx.lineTo(MAP.w / 2, MAP.h);
    ctx.stroke();

    // render player
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(player.x - PSIZE / 2, player.y - (PSIZE / 2), PSIZE, PSIZE);
    // render firewall
    ctx.beginPath();
    ctx.arc(player.x, player.y, PSIZE, 0, 2*Math.PI);
    ctx.strokeStyle = COLOR.WHITE;
    ctx.lineWidth = 3;
    ctx.closePath();
    ctx.stroke();
    //render shooting angle
    let x = player.x + PSIZE * Math.cos(toRad(360 - player.angle));
    let y = player.y + PSIZE * Math.sin(toRad(360 - player.angle));
    ctx.strokeStyle = COLOR.WHITE;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (10 + player.power / 5) * Math.cos(toRad(360 - player.angle)), y + (10 + player.power / 5) * Math.sin(toRad(360 - player.angle)));
    ctx.stroke();
    // render hp
    ctx.beginPath();
    ctx.strokeStyle = COLOR.GREEN;
    ctx.lineWidth = 3;
    ctx.moveTo(player.x - PSIZE, player.y + PSIZE + 10);
    ctx.lineTo(player.x - PSIZE + (PSIZE * 2 * player.hp / 100), player.y + PSIZE + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = COLOR.RED;
    ctx.moveTo(player.x - PSIZE + (PSIZE * 2 * player.hp / 100), player.y + PSIZE + 10);
    ctx.lineTo(player.x - PSIZE + (PSIZE * 2 * player.hp / 100) + (PSIZE * 2 * (100 - player.hp) / 100), player.y + PSIZE + 10);
    ctx.stroke();

    // render enemy
    ctx.fillStyle = COLOR.GREEN;
    ctx.fillRect(enemy.x - PSIZE / 2, enemy.y - (PSIZE / 2), PSIZE, PSIZE);
    // render firewall
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, PSIZE, 0, 2*Math.PI);
    ctx.strokeStyle = COLOR.WHITE;
    ctx.lineWidth = 3;
    ctx.closePath();
    ctx.stroke();
    // render hp
    ctx.beginPath();
    ctx.strokeStyle = COLOR.GREEN;
    ctx.lineWidth = 3;
    ctx.moveTo(enemy.x - PSIZE, enemy.y + PSIZE + 10);
    ctx.lineTo(enemy.x - PSIZE + (PSIZE * 2 * enemy.hp / 100), enemy.y + PSIZE + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = COLOR.RED;
    ctx.moveTo(enemy.x - PSIZE + (PSIZE * 2 * enemy.hp / 100), enemy.y + PSIZE + 10);
    ctx.lineTo(enemy.x - PSIZE + (PSIZE * 2 * enemy.hp / 100) + (PSIZE * 2 * (100 - enemy.hp) / 100), enemy.y + PSIZE + 10);
    ctx.stroke();

    // render bullet
    if (bullet.active || true) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, BSIZE, 0, 2*Math.PI);
      ctx.fillStyle = bullet.color;
      ctx.fill();
    }
  }
}

function toRad(deg) {
  return Math.PI * deg / 180.0;
}

function start() {
  document.addEventListener('keydown', keyDown, false);
  document.addEventListener('keyup',   keyUp, false);

  started = true;
  now = last = timestamp();
}

function restart() {
  document.removeEventListener('keydown', keyDown);
  document.removeEventListener('keyup',   keyUp);
  document.addEventListener('keypress', spaceStart, false);

  started = false;
  player  = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 45, power: 0 };
  enemy   = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100 };
  bullet  = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 0, active: false, shooter: 0 };
}

function onkey(ev, key, down) {
  switch(key) {
    case KEY.UP:    player.angleUp   = down; return false;
    case KEY.DOWN:  player.angleDown = down; return false;
    case KEY.SPACE: player.fire      = down; return false;
  }
}

function resetBullet() {
  //bullet = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 0, active: false };
  bullet = { x: bullet.x, y: bullet.y, dx: 0, dy: 0, color: COLOR.WHITE, damage: 0, active: false, shooter: 0 };
}

function fireBullet(x, y, dx, dy) {
  bullet = { x: x, y: y, dx: dx, dy: dy, color: COLOR.WHITE, damage: 0, active: true, shooter: 0 };
}

function collisionDetection() {
  let bulletRadius = (BSIZE * 0.75);

  // detect collision with enemy
  let c1 = bullet.x - enemy.x;
  let c2 = bullet.y - enemy.y;
  let distance = Math.sqrt(c1 ** 2 + c2 ** 2);

  if (distance < bulletRadius + PSIZE)
    return true;

  // detect collision with borders
  if ((bullet.x < (BORDER + bulletRadius)) || (bullet.x > (MAP.w - BORDER - bulletRadius)) ||
      (bullet.y < (BORDER + bulletRadius)) || (bullet.y > (MAP.h - BORDER - bulletRadius))) {
    resetBullet();
  }

  /*  routers go here
  for (i = 0; i < pipes.length; i++) {
    pipe = pipes[i];

    var pttl = [pipe.x, 0],
        pttr = [pipe.x + (3 * TILE), 0],
        ptbl = [pipe.x, (pipe.top + 1) * TILE],
        ptbr = [pipe.x + (3 * TILE), (pipe.top + 1) * TILE];

    var pbtl = [pipe.x, (pipe.top + 9) * TILE],
        pbtr = [pipe.x + (3 * TILE), (pipe.top + 9) * TILE],
        pbbl = [pipe.x, MAP.h],
        pbbr = [pipe.x + (3 * TILE), MAP.h];

    if ((tl[0] >= pttl[0] && tl[0] <= pttr[0] && tl[1] <= ptbl[1]) ||
        (tr[0] >= pttl[0] && tr[0] <= pttr[0] && tr[1] <= ptbl[1]) ||
        (bl[0] >= pbtl[0] && bl[0] <= pbtr[0] && bl[1] >= pbtl[1]) ||
        (br[0] >= pbtl[0] && br[0] <= pttr[0] && br[1] >= pbtl[1])) {
      pipe.scored = true;
      return true;
    }
  }
  */

  return false;
}

function update(dt) {
  if (enemy.hp <= 0) {
    alert("YOU WIN!");
    restart();
  }
  else if (bullet.active) {
    // move bullet
    bullet.y  = bullet.y  + (dt * bullet.dy);
    bullet.x  = bullet.x  + (dt * bullet.dx);
    bullet.dy = bullet.dy + (dt * GRAVITY);

    if (collisionDetection()) {
      console.log("ACERTOU!");
      enemy.hp = Math.max(enemy.hp - 50, 0);
      resetBullet();
    }
  }
  else {
    // key presses
    if (player.fire && !player.firing) {
      player.power = 0;
      player.firing = true;
      //console.log("power = " + player.power);
    } else if (player.fire && player.power < 100) {
      player.power += 2;
      //console.log("power = " + player.power);
    }
    else if (!player.fire && player.firing) {
      let dx = (Math.cos(toRad(player.angle)) * player.power) * 5;
      let dy = - (Math.sin(toRad(player.angle)) * player.power) * 5;

      fireBullet(player.x, player.y, dx, dy);

      //console.log("power = " + player.power);
      //console.log("dx = " + bullet.dx);
      //console.log("dy = " + bullet.dy);

      player.power = 0;
      player.firing = false;
    }
    else if (player.angleUp && player.angle <= 90) {
      console.log("angle = " + player.angle);
      player.angle += 0.5;
    }
    else if (player.angleDown && player.angle >= 0) {
      console.log("angle = " + player.angle);
      player.angle -= 0.5;
    }
  }
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
