var MAP     = { w: 1200, h: 600 }, // the size of the map (in tiles)
    BORDER  = 20,                // the size of the border
    GRAVITY = 9.8 * 12,    // very exagerated gravity (6x)
    ACCEL   = 1 / 5,              // horizontal acceleration -  take 1/2 second to reach maxdx
    PSIZE   = 20,              // horizontal acceleration -  take 1/2 second to reach maxdx
    BSIZE   = 4,
    PLAYER  = 1,
    ENEMY   = 2,
    COLOR   = { BLACK: '#000', WHITE: '#FFF', GREEN: '#093', RED: '#F00', YELLOW: '#FF0' },
    KEY     = { UP: 38, DOWN: 40, SPACE: 32 };

var canvas  = document.getElementById('canvas'),
    ctx     = canvas.getContext('2d'),
    width   = canvas.width = MAP.w,
    height  = canvas.height = MAP.h,
    started = false,
    round   = 0,
    turn    = null,
    player  = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 45, power: 0 },
    enemy   = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 135, power: 0 },
    e_shot  = { angle: 0, power: 0}
    bullet  = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 0, active: false, shooter: 1 },
    routers = [
      { y: 0, damage: 10, color: COLOR.GREEN, size: 40, active: false },
      { y: 0, damage: 20, color: COLOR.YELLOW, size: 30, active: false },
      { y: 0, damage: 40, color: COLOR.RED, size: 20, active: false }
    ];

var gradient = ctx.createRadialGradient(MAP.w / 2, MAP.h / 2, 0, MAP.w / 2, MAP.h / 2, MAP.w / 2);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, '#0f9b0f');


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
    ctx.fillStyle = gradient;
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

    ctx.font = "40px Arial";
    ctx.fillStyle = COLOR.WHITE;
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR.GREEN;
    ctx.textAlign = "center";
    ctx.fillText("Space to Start", MAP.w / 2, MAP.h / 2 + 120);
    ctx.strokeText("Space to Start", MAP.w / 2, MAP.h / 2 + 120);
  } else {
    // render border
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, MAP.w, MAP.h);

    // render background
    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(20, 20, (MAP.w) - 40, (MAP.h) - 40);

    // render center line
    ctx.beginPath();
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
    ctx.strokeStyle = COLOR.RED;
    ctx.lineWidth = 3;
    ctx.closePath();
    ctx.stroke();
    //render shooting angle
    let px = player.x + PSIZE * Math.cos(toRad(360 - player.angle));
    let py = player.y + PSIZE * Math.sin(toRad(360 - player.angle));
    ctx.beginPath();
    ctx.strokeStyle = COLOR.WHITE;
    ctx.moveTo(px, py);
    ctx.lineTo(px + (10 + player.power / 5) * Math.cos(toRad(360 - player.angle)), py + (10 + player.power / 5) * Math.sin(toRad(360 - player.angle)));
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
    ctx.strokeStyle = COLOR.RED;
    ctx.lineWidth = 3;
    ctx.closePath();
    ctx.stroke();
    //render shooting angle
    let ex = enemy.x + PSIZE * Math.cos(toRad(360 - enemy.angle));
    let ey = enemy.y + PSIZE * Math.sin(toRad(360 - enemy.angle));
    ctx.beginPath();
    ctx.strokeStyle = COLOR.WHITE;
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + (10 + enemy.power / 5) * Math.cos(toRad(360 - enemy.angle)), ey + (10 + enemy.power / 5) * Math.sin(toRad(360 - enemy.angle)));
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

    // render routers
    for (let i = 0; i < routers.length; i++) {
      if (routers[i].active) {
        ctx.fillStyle = routers[i].color;
        ctx.fillRect(MAP.w / 2 - routers[i].size / 2, routers[i].y - (routers[i].size / 2), routers[i].size, routers[i].size);
      }
    }

    // render bullet
    if (bullet.active || true) {
      ctx.beginPath();
      ctx.fillStyle = bullet.color;
      ctx.strokeStyle = COLOR.WHITE
      ctx.lineWidth = 1
      ctx.arc(bullet.x, bullet.y, BSIZE, 0, 2*Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
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
  nextRound();
}

function restart() {
  document.removeEventListener('keydown', keyDown);
  document.removeEventListener('keyup',   keyUp);
  document.addEventListener('keypress', spaceStart, false);

  started = false;
  player  = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 45, power: 0 };
  enemy   = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 135, power: 0 };
  bullet  = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 0, active: false, shooter: 0 };
}

function nextRound() {
  round++;
  turn = PLAYER;

  resetBullet();
  generateRouters();
}

function enemyTurn() {
  turn = ENEMY;
  e_shot.angle = Math.floor(Math.random() * (170 - 102)) + 102;
  e_shot.power = Math.floor(Math.random() * (100 - 25)) + 25;

  resetBullet();
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

function fireBullet(shooter, x, y, dx, dy) {
  bullet = { x: x, y: y, dx: dx, dy: dy, color: COLOR.WHITE, damage: 0, active: true, shooter: shooter };
}

function generateRouters() {

  for (let i = 0; i < routers.length; i++) {
    let min = BORDER + routers[i].size + 10;
    let max = MAP.h - BORDER - routers[i].size - 10;
    let y = Math.floor(Math.random() * (max - min)) + min;

    routers[i].y = y;
    routers[i].active = true;
  }
}

function collisionDetection() {
  // detect collision with enemy
  if (bullet.shooter == PLAYER) {
    let c1 = bullet.x - enemy.x;
    let c2 = bullet.y - enemy.y;

    if (c1 ** 2 + c2 ** 2 < (BSIZE + PSIZE)**2) {
      hitEnemy();
      return;
    }
  }

  // detect collision with player
  if (bullet.shooter == ENEMY) {
    let c1 = bullet.x - player.x;
    let c2 = bullet.y - player.y;

    if (c1 ** 2 + c2 ** 2 < (BSIZE + PSIZE)**2) {
      hitPlayer();
      return;
    }
  }

  // detect collision with borders
  if ((bullet.x < (BORDER + BSIZE)) || (bullet.x > (MAP.w - BORDER - BSIZE)) ||
      (bullet.y < (BORDER + BSIZE)) || (bullet.y > (MAP.h - BORDER - BSIZE))) {
    miss();
    return;
  }

  // detect collision with routers
  for (let i = 0; i < routers.length; i++) {
    let c1 = bullet.x - Math.max(MAP.w / 2 - routers[i].size / 2, Math.min(bullet.x, MAP.w / 2 + routers[i].size / 2));
    let c2 = bullet.y - Math.max(routers[i].y - routers[i].size / 2, Math.min(bullet.y, routers[i].y + routers[i].size / 2));
    if ((c1 ** 2 + c2 ** 2) < (BSIZE ** 2))
      hitRouter(i);
  }
}

function update(dt) {
  if (enemy.hp <= 0) {
    // enemy dead
    alert("YOU WIN!");
    restart();
  } else if (player.hp <= 0) {
    // player dead
    alert("YOU LOSE!");
    restart();
  } else if (bullet.active) {
    // bullet fired
    // move bullet
    bullet.y  = bullet.y  + (dt * bullet.dy);
    bullet.x  = bullet.x  + (dt * bullet.dx);
    bullet.dy = bullet.dy + (dt * GRAVITY);

    collisionDetection();
  } else {
    if (turn == PLAYER) {
      // player turn
      if (player.fire && !player.firing) {
        // start firing
        player.power = 0;
        player.firing = true;
      } else if (player.fire && player.power < 100) {
        // continue firing
        player.power += 2;
      }
      else if (!player.fire && player.firing) {
        // finish firing
        let dx = (Math.cos(toRad(player.angle)) * player.power) * 5;
        let dy = - (Math.sin(toRad(player.angle)) * player.power) * 5;
        fireBullet(PLAYER, player.x, player.y, dx, dy);

        player.power = 0;
        player.firing = false;
      }
    } else {
      // enemy turn
      if (enemy.angle < e_shot.angle) {
        enemy.angle += 0.5;
      } else if (enemy.angle > e_shot.angle) {
        enemy.angle -= 0.5;
      } else {
        if (enemy.power < e_shot.power) {
          enemy.power += 2;
        } else {
          let dx = (Math.cos(toRad(enemy.angle)) * enemy.power) * 5;
          let dy = - (Math.sin(toRad(enemy.angle)) * enemy.power) * 5;
          fireBullet(ENEMY, enemy.x, enemy.y, dx, dy);

          enemy.power = 0;
        }
      }
    }
    // move angle
    if (player.angleUp && player.angle <= 90) {
      player.angle += 0.5;
    }
    else if (player.angleDown && player.angle >= 0) {
      player.angle -= 0.5;
    }
  }
}

function miss() {
  bullet.shooter == PLAYER ? enemyTurn() : nextRound();
}

function hitEnemy() {
  enemy.hp = Math.max(enemy.hp - bullet.damage, 0);
  enemyTurn();
}

function hitPlayer() {
  player.hp = Math.max(player.hp - bullet.damage, 0);
  nextRound();
}

function hitRouter(i) {
  if (routers[i].damage > bullet.damage) {
    bullet.damage = routers[i].damage;
    bullet.color = routers[i].color;
  }
}

function keyDown(ev) { return onkey(ev, ev.keyCode, true); }
function keyUp(ev) { return onkey(ev, ev.keyCode, false); }

function spaceStart(ev) {
  if (ev.keyCode == KEY.SPACE) {
    document.removeEventListener('keypress', spaceStart);
    start();
      // canvas.addEventListener('mousemove', function(evt) {
      //   getMousePos(canvas, evt);
      // }, false);
  }
}

document.addEventListener('keypress', spaceStart, false);
frame(); // start the first frame


      // function getMousePos(canvas, evt) {
      //   var rect = canvas.getBoundingClientRect();
      //   bullet.x = evt.clientX - rect.left;
      //   bullet.y = evt.clientY - rect.top;
      // }

