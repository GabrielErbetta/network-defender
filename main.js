var MAP     = { w: 1200, h: 600 }, // the size of the map (in tiles)
    BORDER  = 36,                // the size of the border
    GRAVITY = 9.8 * 12,    // very exagerated gravity (6x)
    ACCEL   = 1 / 5,              // horizontal acceleration -  take 1/2 second to reach maxdx
    PSIZE   = 20,              // horizontal acceleration -  take 1/2 second to reach maxdx
    BSIZE   = 4,
    PLAYER  = 1,
    ENEMY   = 2,
    COLOR   = { BLACK: '#000', WHITE: '#FFF', GREEN: '#093', RED: '#F00', YELLOW: '#FF0' },
    KEY     = { UP: 38, DOWN: 40, SPACE: 32 },
    IMAGES  = { PLAYER_ICON: "images/comm_terminal.png", IE_ICON: "images/ie_icon.png", size: 2 },
    SOUNDS  = {
      SHOOT:   new Audio('sounds/shoot_11.wav'),
      HIT:     new Audio('sounds/hit_11.wav'),
      MISS:    new Audio('sounds/miss_11.wav'),
      POWERUP: new Audio('sounds/powerup_11.wav')
    };

var canvas    = document.getElementById('canvas'),
    ctx       = canvas.getContext('2d'),
    width     = canvas.width = MAP.w,
    height    = canvas.height = MAP.h,
    images    = { size: 0 },
    started   = false,
    ended     = false,
    ending    = false,
    end_delay = 0,
    turn      = null,
    icon      = null,
    player    = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 20 - (PSIZE / 2), hp: 10, angle: 45, power: 0, last_power: 0, cannon_multiplier: 0 },
    enemy     = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 20 - (PSIZE / 2), hp: 10, angle: 135, power: 0, last_power: 0, cannon_multiplier: 1, misses: 0 },
    e_shot    = { angle: 0, power: 0 }
    bullet    = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 1, active: false, shooter: 0 },
    explosion = { x: 0, y: 0, frames: 0 },
    routers   = [
      { x: 0, y: 0, angle: 0, power: 0, damage: 2, color: COLOR.GREEN, size: 40, active: false },
      { x: 0, y: 0, angle: 0, power: 0, damage: 3, color: COLOR.YELLOW, size: 30, active: false },
      { x: 0, y: 0, angle: 0, power: 0, damage: 4, color: COLOR.RED, size: 20, active: false }
    ];

var gradient = ctx.createRadialGradient(MAP.w / 2, MAP.h / 2, 0, MAP.w / 2, MAP.h / 2, MAP.w / 2);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, '#434343');

var fps  = 60,
    step = 1/fps,
    dt   = 0,
    now, last = timestamp();




function timestamp() {
  if (window.performance && window.performance.now)
    return window.performance.now();
  else
    return new Date().getTime();
}

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
  render();
  requestAnimationFrame(frame, canvas);
}

function renderTitle() {
  let title = "Network Defender";
  draw(title, 10, MAP.w / 2 - (title.length * 21), MAP.h / 2 - 130);

  // render subtitle
  let subtitle = "Space to start";
  draw(subtitle, 4, MAP.w / 2 - (subtitle.length * 8) + 5, MAP.h / 2);

  // render instructions
  let instruction = "Up and down to change angle";
  draw(instruction, 3, MAP.w / 4 - 170, MAP.h / 2 + 100);
  instruction = "Hold space to shoot";
  draw(instruction, 3, MAP.w / 4 - 170, MAP.h / 2 + 130);
  instruction = "Hit powerups for damage boost";
  draw(instruction, 3, MAP.w / 4 - 170, MAP.h / 2 + 160);

  //render powerups
  let powerup = "Green: 2x damage";
  draw(powerup, 3, (MAP.w / 4 * 3) - 110, MAP.h / 2 + 100, COLOR.GREEN);
  powerup = "Yellow: 3x damage";
  draw(powerup, 3, (MAP.w / 4 * 3) - 110, MAP.h / 2 + 130, COLOR.YELLOW);
  powerup = "Red: 4x damage";
  draw(powerup, 3, (MAP.w / 4 * 3) - 110, MAP.h / 2 + 160, COLOR.RED);
}

function renderBackground() {
  // clear canvas
  ctx.clearRect(0,0,MAP.w,MAP.h);

  // render border
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, MAP.w, MAP.h);

  // render background
  ctx.fillStyle = COLOR.BLACK;
  ctx.fillRect(BORDER, BORDER, (MAP.w) - BORDER * 2, (MAP.h) - BORDER * 2);
}

function renderCannon(cannon) {
  // render cannon
  ctx.drawImage(images.player_icon, cannon.x - PSIZE / 2, cannon.y - (PSIZE / 2), PSIZE, PSIZE);

  // render icon
  if (cannon == player) {
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillRect(cannon.x - 3, cannon.y - 6, 2, 3);
    ctx.fillRect(cannon.x + 1, cannon.y - 6, 2, 3);
    ctx.fillRect(cannon.x - 4, cannon.y, 8, 2);
    ctx.fillRect(cannon.x - 5, cannon.y - 1, 2, 2);
    ctx.fillRect(cannon.x + 3, cannon.y - 1, 2, 2);
  } else {
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillRect(cannon.x - 4, cannon.y - 6, 8, 4);
    ctx.fillRect(cannon.x - 2, cannon.y - 2, 5, 3);
    ctx.fillStyle = COLOR.BLACK;
    ctx.fillRect(cannon.x - 3, cannon.y - 5, 2, 2);
    ctx.fillRect(cannon.x + 1, cannon.y - 5, 2, 2);
    ctx.fillRect(cannon.x - 1, cannon.y - 1, 1, 2);
    ctx.fillRect(cannon.x + 1, cannon.y - 1, 1, 2);
  }

  // render firewall
  ctx.strokeStyle = COLOR.WHITE;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(cannon.x, cannon.y, PSIZE, 0, 2*Math.PI);
  ctx.closePath();
  ctx.stroke();

  //render aim
  let aim_x = cannon.x + PSIZE * Math.cos(toRad(360 - cannon.angle));
  let aim_y = cannon.y + PSIZE * Math.sin(toRad(360 - cannon.angle));
  ctx.fillStyle = COLOR.WHITE;

  ctx.beginPath();
  ctx.moveTo(cannon.x + PSIZE * Math.cos(toRad(350 - cannon.angle)), cannon.y + PSIZE * Math.sin(toRad(350 - cannon.angle)));
  ctx.lineTo(aim_x + 10 * Math.cos(toRad(360 - cannon.angle)), aim_y + 10 * Math.sin(toRad(360 - cannon.angle)));
  ctx.lineTo(cannon.x + PSIZE * Math.cos(toRad(370 - cannon.angle)), cannon.y + PSIZE * Math.sin(toRad(360 - cannon.angle + 10)));
  ctx.closePath();
  ctx.fill();

  // render lifebar
  let hp_x = (MAP.w - BORDER) * cannon.cannon_multiplier;
  ctx.fillStyle = COLOR.BLACK;
  ctx.fillRect(hp_x + 8, MAP.h - 8, BORDER - 16, -86);
  ctx.fillRect(hp_x + 14, MAP.h - 94, 8, -4);

  // render hp
  let hp_color;
  if (cannon.hp >= 8) hp_color = COLOR.GREEN;
  else if (cannon.hp >= 4) hp_color = COLOR.YELLOW;
  else hp_color = COLOR.RED;
  ctx.fillStyle = hp_color;

  for (let i = 0; i < cannon.hp; i++) {
    ctx.fillRect(hp_x + 12, MAP.h - 12 - (i * 8), 12, -6);
  }
  draw("HP", 2, hp_x + 11, MAP.h - 112);

  // render power bar
  let power_x = (MAP.w - BORDER * 2) * cannon.cannon_multiplier + BORDER;
  ctx.fillStyle = COLOR.BLACK;
  ctx.fillRect(power_x, MAP.h - 8, 255 - (cannon.cannon_multiplier * 510), -10);

  // render power
  ctx.fillStyle = COLOR.WHITE;
  ctx.fillRect(power_x, MAP.h - 8, cannon.power - (cannon.cannon_multiplier * (cannon.power * 2)), -10);

  // render last power
  if (cannon.last_power) {
    let last_power_x = BORDER + cannon.last_power;
    if (cannon == enemy) last_power_x = MAP.w - last_power_x;

    ctx.fillStyle = COLOR.RED;
    ctx.fillRect(last_power_x, MAP.h - 8, 1, -10);
  }

  // render 'POWER'
  let power_text_x = (cannon == player) ? BORDER : MAP.w - BORDER - 42;
  draw("Power", 2, power_text_x, MAP.h - 32);

  // render IP
  let p_pow = "192.168.1." + cannon.power;
  let ip_text_x = (cannon == player) ? BORDER + 255 - (7 * p_pow.length) : MAP.w - BORDER - 255;
  draw(p_pow, 2, ip_text_x, MAP.h - 32);
}

function renderRouter(router) {
  ctx.fillStyle = router.color;
  ctx.fillRect(router.x - (router.size / 2), router.y - (router.size / 2), router.size, router.size);
}

function renderBullet() {
  ctx.beginPath();
  ctx.fillStyle = bullet.color;
  ctx.strokeStyle = COLOR.WHITE;
  ctx.lineWidth = 1;
  ctx.arc(bullet.x, bullet.y, BSIZE, 0, 2*Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function renderExplosion() {
  ctx.fillStyle = COLOR.RED;
  ctx.fillRect(explosion.x - 2, explosion.y - 10, 4, 20);
  ctx.fillRect(explosion.x - 10, explosion.y - 2, 20, 4);
  ctx.fillStyle = COLOR.YELLOW;
  ctx.fillRect(explosion.x - 2, explosion.y - 6, 4, 12);
  ctx.fillRect(explosion.x - 6, explosion.y - 2, 12, 4);
}

function renderGameOver() {
  // render cable
  ctx.fillStyle = COLOR.WHITE;
  ctx.fillRect(MAP.w / 2 - 200, MAP.h / 2 - 3, 150, 6);
  ctx.fillRect(MAP.w / 2 - 50, MAP.h / 2 - 10, 50, 20);

  // render port
  ctx.fillRect(MAP.w / 2 + 50, MAP.h / 2 - 90, 120, 180);
  ctx.fillStyle = COLOR.BLACK;
  ctx.fillRect(MAP.w / 2 + 95, MAP.h / 2 - 15, 30, 30);
  ctx.fillRect(MAP.w / 2 + 102, MAP.h / 2 - 21, 16, 6);

  // render texts
  draw("Game Over", 8, MAP.w / 2 - 160, MAP.h / 2 - 180);
  draw("You are disconnected", 4, MAP.w / 2 - 160, MAP.h / 2 + 160);
  draw("Press space to try again", 4, MAP.w / 2 - 185, MAP.h / 2 + 190);
}

function renderVictory() {
  // render icon
  ctx.drawImage(images.ie_icon, MAP.w / 2 - 100, MAP.h / 2 - 100, 200, 200);

  // render texts
  draw("Congratulations", 8, MAP.w / 2 - 250, MAP.h / 2 - 180);
  draw("Your network is safe", 4, MAP.w / 2 - 162, MAP.h / 2 + 160);
  draw("Press space to restart", 4, MAP.w / 2 - 168, MAP.h / 2 + 190);
}

function render() {
  renderBackground();

  if (!started) {
    renderTitle();
  } else if (!ended) {
    renderCannon(player);
    renderCannon(enemy);

    // render routers
    for (let i = 0; i < routers.length; i++) {
      if (routers[i].active) {
        renderRouter(routers[i]);
      }
    }

    // render bullet
    if (bullet.active) {
      renderBullet();
    }

    // render explosion
    if (explosion.frames > 0) {
      renderExplosion();
      explosion.frames--;
    }
  } else {
    if (player.hp <= 0) {
      renderGameOver();
    } else {
      renderVictory();
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
  document.removeEventListener('keypress', restart);
  document.removeEventListener('keydown', keyDown);
  document.removeEventListener('keyup',   keyUp);
  document.addEventListener('keypress', spaceStart, false);

  started   = false;
  ended     = false;
  player    = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 20 - (PSIZE / 2), hp: 10, angle: 45, power: 0, last_power: 0, cannon_multiplier: 0 },
  enemy     = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 20 - (PSIZE / 2), hp: 10, angle: 135, power: 0, last_power: 0, cannon_multiplier: 1, misses: 0 },
  bullet    = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHITE, damage: 10, active: false, shooter: 0 };
  explosion = { x: 0, y: 0, frames: 0 };
}

function nextRound() {
  turn = PLAYER;

  resetBullet();
  generateRouters();
}

function enemyTurn() {
  turn = ENEMY;
  let r = Math.floor(Math.random() * 3);
  let miss_chance = Math.max(r*2 - 1, 10 - (enemy.misses * 2) - ((player.hp - enemy.hp) * 3));

  let a_rand  = Math.floor(Math.random() * (miss_chance / 3));
      a_rand -= Math.floor(Math.random() * (miss_chance / 3));

  let p_rand  = Math.floor(Math.random() * miss_chance);
      p_rand -= Math.floor(Math.random() * miss_chance);

  e_shot.angle = 180 - routers[r].angle + a_rand;
  e_shot.power = routers[r].power + p_rand;

  console.log((routers[r].angle + a_rand) + " (" + routers[r].angle + ') ' + e_shot.power + " (" + routers[r].power + ")");

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
  bullet = { x: bullet.x, y: bullet.y, dx: 0, dy: 0, color: COLOR.WHITE, damage: 1, active: false, shooter: 0 };
}

function fireBullet(shooter, x, y, dx, dy) {
  bullet = { x: x, y: y, dx: dx, dy: dy, color: COLOR.WHITE, damage: 1, active: true, shooter: shooter };
  SOUNDS.SHOOT.play();
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
      power = velocity / 2;

      maxh = (velocity**2 * Math.sin(toRad(theta))**2) / (2 * GRAVITY);
    } while (power > 255 || maxh > MAP.h - 100);

    angles.push(theta);

    rx = Math.floor(Math.random() * 200) + (MAP.w / 2 - 100) - player.x;
    ry = Math.tan(toRad(theta)) * rx - (GRAVITY / (2 * velocity**2 * Math.cos(toRad(theta))**2)) * rx**2;

    routers[i].x = rx + player.x;
    routers[i].y = (MAP.h - ry) - (MAP.h - player.y);
    routers[i].angle = theta;
    routers[i].power = power;
    routers[i].active = true;
  }
}

function collisionDetection() {
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
}

function update(dt) {
  if (ended) return;

  if (ending) {
    if (end_delay > 0) {
      end_delay--;
    } else {
      ending = false;
      ended = true;
      document.addEventListener('keypress', restart, false);
    }
  } else if (enemy.hp <= 0) {
    ending = true;
    end_delay = 10;
  } else if (player.hp <= 0) {
    ending = true;
    end_delay = 10;
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
      } else if (player.fire && player.power < 255) {
        // continue firing
        player.power += 1;
      }
      else if (!player.fire && player.firing) {
        // finish firing
        let dx = (Math.cos(toRad(player.angle)) * player.power) * 2;
        let dy = - (Math.sin(toRad(player.angle)) * player.power) * 2;
        fireBullet(PLAYER, player.x, player.y, dx, dy);

        player.last_power = player.power;
        player.firing = false;
      }
    } else {
      // enemy turn
      if (enemy.angle < e_shot.angle - 0.1) {
        enemy.angle += 0.1;
      } else if (enemy.angle > e_shot.angle + 0.1) {
        enemy.angle -= 0.1;
      } else {
        if (!enemy.firing) {
          enemy.power = 0;
          enemy.firing = true;
        } else if (enemy.power < e_shot.power && enemy.power < 255) {
          enemy.power += 1;
        } else {
          let dx = (Math.cos(toRad(enemy.angle)) * enemy.power) * 2;
          let dy = - (Math.sin(toRad(enemy.angle)) * enemy.power) * 2;
          fireBullet(ENEMY, enemy.x, enemy.y, dx, dy);

          enemy.last_power = enemy.power;
          enemy.firing = false;
        }
      }
    }
  }

  // move angle
  if (player.angleUp && player.angle < 90) {
    player.angle += 0.5;
  } else if (player.angleDown && player.angle > 0) {
    player.angle -= 0.5;
  }
}

function explode() {
  explosion.x = bullet.x;
  explosion.y = bullet.y;
  explosion.frames = 30;
}

function miss() {
  SOUNDS.MISS.play();
  explode();
  if (bullet.shooter == PLAYER) {
    enemyTurn();
  } else {
    enemy.misses++;
    nextRound();
  }
}

function hitEnemy() {
  SOUNDS.HIT.play();
  explode();
  enemy.hp = Math.max(enemy.hp - bullet.damage, 0);
  enemyTurn();
}

function hitPlayer() {
  SOUNDS.HIT.play();
  explode();
  enemy.misses = 0;
  player.hp = Math.max(player.hp - bullet.damage, 0);
  nextRound();
}

function hitRouter(i) {
  if (routers[i].damage > bullet.damage) {
    SOUNDS.POWERUP.pause();
    SOUNDS.POWERUP.play();
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
  }
}

function load() {
  images.size++;

  if (images.size == IMAGES.size) {
    document.addEventListener('keypress', spaceStart, false);
    frame(); // start the first frame
  }
}

function loadImage(src, name) {
  images[name] = document.createElement('img');
  images[name].addEventListener('load', load() , false);
  images[name].src = src;
}



loadImage(IMAGES.PLAYER_ICON, "player_icon");
loadImage(IMAGES.IE_ICON, "ie_icon");
