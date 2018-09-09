var MAP     = { w: 1200, h: 600 }, // the size of the map (in tiles)
    BORDER  = 36,                // the size of the border
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
    e_shot  = { angle: 0, power: 0 }
    bullet  = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 10, active: false, shooter: 1 },
    curves  = [],
    routers = [
      { x: 0, y: 0, angle: 0, power: 0, damage: 20, color: COLOR.GREEN, size: 40, active: false },
      { x: 0, y: 0, angle: 0, power: 0, damage: 30, color: COLOR.YELLOW, size: 30, active: false },
      { x: 0, y: 0, angle: 0, power: 0, damage: 40, color: COLOR.RED, size: 20, active: false }
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
    ctx.fillRect(BORDER, BORDER, (MAP.w) - BORDER * 2, (MAP.h) - BORDER * 2);

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
    ctx.fillRect(BORDER, BORDER, (MAP.w) - BORDER * 2, (MAP.h) - BORDER * 2);

    // render center line
    ctx.beginPath();
    ctx.strokeStyle = COLOR.WHITE;
    ctx.moveTo(MAP.w / 2, 0);
    ctx.lineTo(MAP.w / 2, MAP.h);
    ctx.stroke();

    //render shooting lines
    for (let i = 0; i < routers.length; i++) {
      if (routers[i].active) {
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);

        for(var x = 0 + 1; x <= enemy.x - player.x; x += 1) {
          hy = Math.tan(toRad(routers[i].angle)) * x - (GRAVITY / (2 * (routers[i].power * 5)**2 * Math.cos(toRad(routers[i].angle))**2)) * x**2;
          ctx.lineTo(x + player.x, (MAP.h - hy) - (MAP.h - player.y));
        }

        ctx.lineJoin = 'round';
        ctx.lineWidth = .5;
        ctx.strokeStyle = routers[i].color;
        ctx.stroke();
      }
    }

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
    ctx.fillStyle = COLOR.RED;
    ctx.moveTo(player.x + PSIZE * Math.cos(toRad(360 - player.angle -10)), player.y + PSIZE * Math.sin(toRad(360 - player.angle -10)));
    ctx.lineTo(px + (10 + player.power / 5) * Math.cos(toRad(360 - player.angle)), py + (10 + player.power / 5) * Math.sin(toRad(360 - player.angle)));
    ctx.lineTo(player.x + PSIZE * Math.cos(toRad(360 - player.angle + 10)), player.y + PSIZE * Math.sin(toRad(360 - player.angle + 10)));
    ctx.closePath();
    ctx.fill();
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
    ctx.fillStyle = COLOR.RED;
    ctx.moveTo(enemy.x + PSIZE * Math.cos(toRad(360 - enemy.angle -10)), enemy.y + PSIZE * Math.sin(toRad(360 - enemy.angle -10)));
    ctx.lineTo(ex + (10 + enemy.power / 5) * Math.cos(toRad(360 - enemy.angle)), ey + (10 + enemy.power / 5) * Math.sin(toRad(360 - enemy.angle)));
    ctx.lineTo(enemy.x + PSIZE * Math.cos(toRad(360 - enemy.angle + 10)), enemy.y + PSIZE * Math.sin(toRad(360 - enemy.angle + 10)));
    ctx.closePath();
    ctx.fill();
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
        ctx.fillRect(routers[i].x - (routers[i].size / 2), routers[i].y - (routers[i].size / 2), routers[i].size, routers[i].size);
      };
    }

    // render bullet
    if (bullet.active || true) {
      ctx.beginPath();
      ctx.fillStyle = bullet.color;
      ctx.strokeStyle = COLOR.WHITE;
      ctx.lineWidth = 1;
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
  generateRouters();
  nextRound();
}

function restart() {
  document.removeEventListener('keydown', keyDown);
  document.removeEventListener('keyup',   keyUp);
  document.addEventListener('keypress', spaceStart, false);

  started = false;
  player  = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 45, power: 0 };
  enemy   = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 32 - (PSIZE / 2), hp: 100, angle: 135, power: 0 };
  bullet  = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 10, active: false, shooter: 0 };
}

function nextRound() {
  round++;
  turn = PLAYER;

  resetBullet();
  //generateRouters();
}

function enemyTurn() {
  turn = ENEMY;
  let r = Math.floor(Math.random() * 3);

  let a_rand  = Math.floor(Math.random() * 30) / 10;
      a_rand -= Math.floor(Math.random() * 30) / 10;

  let p_rand  = Math.floor(Math.random() * 50) / 10;
      p_rand -= Math.floor(Math.random() * 50) / 10;

  e_shot.angle = 180 - routers[r].angle + a_rand;
  e_shot.power = routers[r].power + p_rand;

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
  //bullet = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 10, active: false };
  bullet = { x: bullet.x, y: bullet.y, dx: 0, dy: 0, color: COLOR.WHITE, damage: 10, active: false, shooter: 0 };
}

function fireBullet(shooter, x, y, dx, dy) {
  bullet = { x: x, y: y, dx: dx, dy: dy, color: COLOR.WHITE, damage: 10, active: true, shooter: shooter };
}

function generateRouters() {
  let distance, theta, velocity, power, rx, ry, maxh, min_diff;
  let angles = [];
  for (let i = 0; i < routers.length; i++) {
    // generate curve angle and calculate power
    do {
      distance = enemy.x - player.x;
      do {
        theta = Math.floor(Math.random() * 75);

        min_diff = 75;
        for (let j = 0; j < angles.length; j++) {
          diff = Math.abs(theta - angles[j]);
          min_diff = Math.min(diff, min_diff);
        }
      } while (min_diff < 3);

      velocity = Math.sqrt((distance * GRAVITY) / Math.sin(toRad(2 * theta)));
      power = velocity / 5;

      maxh = (velocity**2 * Math.sin(toRad(theta))**2) / (2 * GRAVITY);
    } while (power > 100 || maxh > MAP.h - 100);

    angles.push(theta);

    rx = Math.floor(Math.random() * 600) + (MAP.w / 2 - 300);
    ry = Math.tan(toRad(theta)) * rx - (GRAVITY / (2 * velocity**2 * Math.cos(toRad(theta))**2)) * rx**2;

    routers[i].x = rx + player.x;
    routers[i].y = (MAP.h - ry) - (MAP.h - player.y);
    routers[i].angle = theta;
    routers[i].power = power;
    routers[i].active = true;

    // for (let i = 0; i < routers.length; i++) {
    //   let min = BORDER + routers[i].size + 10;
    //   let max = MAP.h - BORDER - routers[i].size - 10;
    //   let y = Math.floor(Math.random() * (max - min)) + min;

    //   routers[i].y = y;
    //   routers[i].active = true;
    // }
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
    let c1 = bullet.x - Math.max(routers[i].x - routers[i].size / 2, Math.min(bullet.x, routers[i].x + routers[i].size / 2));
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
        player.power += 0.5;
        console.log('power = ' + player.power);
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
      if (enemy.angle < e_shot.angle - 0.1) {
        enemy.angle += 0.1;
      } else if (enemy.angle > e_shot.angle + 0.1) {
        enemy.angle -= 0.1;
      } else {
        if (enemy.power < e_shot.power) {
          enemy.power += 0.5;
        } else {
          let dx = (Math.cos(toRad(enemy.angle)) * enemy.power) * 5;
          let dy = - (Math.sin(toRad(enemy.angle)) * enemy.power) * 5;
          fireBullet(ENEMY, enemy.x, enemy.y, dx, dy);

          enemy.power = 0;
        }
      }
    }
    // move angle
    if (player.angleUp && player.angle < 90) {
      player.angle += 0.5;
      console.log('angle = ' + player.angle);
    }
    else if (player.angleDown && player.angle > 0) {
      player.angle -= 0.5;
      console.log('angle = ' + player.angle);
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
      canvas.addEventListener('click', function(evt) {
        getMousePos(canvas, evt);
      }, false);
  }
}

document.addEventListener('keypress', spaceStart, false);
frame(); // start the first frame


      function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        console.log(evt.clientX - rect.left);
        console.log(evt.clientY - rect.top);
      }

