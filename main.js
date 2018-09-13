var MAP     = { w: 1200, h: 600 },
    BORDER  = 36,
    GRAVITY = 9.8 * 12,
    PSIZE   = 20,
    BSIZE   = 4,
    PLAYER  = 1,
    ENEMY   = 2,
    COLOR   = { BLK: '#000', WHT: '#FFF', GRY: '#666', GRN: '#093', RED: '#F00', YLW: '#FF0', DRK_YLW: '#afaf00' },
    KEY     = { UP: 38, DOWN: 40, SPACE: 32 },
    IMAGES  = { CANNON: "images/cannon.png", IE_ICON: "images/ie_icon.png", size: 2 },
    SOUNDS  = {
      HIT:     new Audio('sounds/hit.mp3'),
      MISS:    new Audio('sounds/miss.mp3'),
      POWERUP: new Audio('sounds/powerup.mp3'),
      SHOOT:   new Audio('sounds/shoot.mp3')
    };

var canvas        = document.getElementById('canvas'),
    ctx           = canvas.getContext('2d'),
    images        = { size: 0 },
    started,
    ended,
    ending        = false,
    end_delay     = 0,
    turn          = null,
    reset_in,
    icon          = null,
    player,
    enemy,
    e_shot,
    bullet,
    explosion,
    routers       = [
      { x: 0, y: 0, angle: 0, power: 0, damage: 2, color: COLOR.GRN, size: 30, active: false },
      { x: 0, y: 0, angle: 0, power: 0, damage: 3, color: COLOR.DRK_YLW, size: 25, active: false },
      { x: 0, y: 0, angle: 0, power: 0, damage: 4, color: COLOR.RED, size: 15, active: false }
    ];

    canvas.width  = MAP.w;
    canvas.height = MAP.h;

var fps  = 60,
    step = 1/fps,
    dt   = 0,
    now, last = timestamp();


function setVariables() {
  started   = false;
  ended     = false;
  reset_in  = 3;
  player    = { x: BORDER + 20 + (PSIZE / 2), y: MAP.h - BORDER - 20 - (PSIZE / 2), hp: 10, angle: 45, power: 0, last_power: 0, multiplier: 0 };
  enemy     = { x: MAP.w - BORDER - 20 - (PSIZE / 2), y: MAP.h - BORDER - 20 - (PSIZE / 2), hp: 10, angle: 135, power: 0, last_power: 0, multiplier: 1, misses: 0 };
  e_shot    = { angle: 0, power: 0 };
  bullet    = { x: 0, y: 0, dx: 0, dy: 0, color: COLOR.WHT, damage: 10, active: false, shooter: 0 };
  explosion = { x: 0, y: 0, frames: 0 };
}

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
  var title = "Network Defense";
  draw(title, 10, MAP.w / 2 - (title.length * 21), MAP.h / 2 - 130);

  // render subtitle
  var subtitle = "Space to start";
  draw(subtitle, 4, MAP.w / 2 - (subtitle.length * 8) + 5, MAP.h / 2);

  // render instructions
  var instruction = "Up and down to change angle";
  draw(instruction, 3, MAP.w / 4 - 170, MAP.h / 2 + 100);
  instruction = "Hold space to shoot";
  draw(instruction, 3, MAP.w / 4 - 170, MAP.h / 2 + 130);
  instruction = "Hit powerups for damage boost";
  draw(instruction, 3, MAP.w / 4 - 170, MAP.h / 2 + 160);

  //render powerups
  var powerup = "Green: 2x damage";
  draw(powerup, 3, (MAP.w / 4 * 3) - 110, MAP.h / 2 + 100, COLOR.GRN);
  powerup = "Yellow: 3x damage";
  draw(powerup, 3, (MAP.w / 4 * 3) - 110, MAP.h / 2 + 130, COLOR.DRK_YLW);
  powerup = "Red: 4x damage";
  draw(powerup, 3, (MAP.w / 4 * 3) - 110, MAP.h / 2 + 160, COLOR.RED);
}

function renderBackground() {
  var g = ctx.createRadialGradient(MAP.w / 2, MAP.h / 2, 0, MAP.w / 2, MAP.h / 2, MAP.w / 2);
      g.addColorStop(0, '#000');
      g.addColorStop(1, '#444');

  // clear canvas
  ctx.clearRect(0,0,MAP.w,MAP.h);

  // render border
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MAP.w, MAP.h);

  // render background
  ctx.fillStyle = COLOR.BLK;
  ctx.fillRect(BORDER, BORDER, (MAP.w) - BORDER * 2, (MAP.h) - BORDER * 2);
}

function renderCannon(cannon) {
  // render cannon
  ctx.drawImage(images.cannon, cannon.x - PSIZE / 2, cannon.y - (PSIZE / 2), PSIZE, PSIZE);

  // render icon
  if (cannon == player) {
    ctx.fillStyle = COLOR.WHT;
    ctx.fillRect(cannon.x - 3, cannon.y - 6, 2, 3);
    ctx.fillRect(cannon.x + 1, cannon.y - 6, 2, 3);
    ctx.fillRect(cannon.x - 4, cannon.y, 8, 2);
    ctx.fillRect(cannon.x - 5, cannon.y - 1, 2, 2);
    ctx.fillRect(cannon.x + 3, cannon.y - 1, 2, 2);
  } else {
    ctx.fillStyle = COLOR.WHT;
    ctx.fillRect(cannon.x - 4, cannon.y - 6, 8, 4);
    ctx.fillRect(cannon.x - 2, cannon.y - 2, 5, 3);
    ctx.fillStyle = COLOR.BLK;
    ctx.fillRect(cannon.x - 3, cannon.y - 5, 2, 2);
    ctx.fillRect(cannon.x + 1, cannon.y - 5, 2, 2);
    ctx.fillRect(cannon.x - 1, cannon.y - 1, 1, 2);
    ctx.fillRect(cannon.x + 1, cannon.y - 1, 1, 2);
  }

  // render firewall
  ctx.strokeStyle = COLOR.WHT;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(cannon.x, cannon.y, PSIZE, 0, 2*Math.PI);
  ctx.closePath();
  ctx.stroke();

  //render aim
  var aim_x = cannon.x + PSIZE * Math.cos(toRad(360 - cannon.angle));
  var aim_y = cannon.y + PSIZE * Math.sin(toRad(360 - cannon.angle));
  ctx.fillStyle = COLOR.WHT;

  ctx.beginPath();
  ctx.moveTo(cannon.x + PSIZE * Math.cos(toRad(350 - cannon.angle)), cannon.y + PSIZE * Math.sin(toRad(350 - cannon.angle)));
  ctx.lineTo(aim_x + 10 * Math.cos(toRad(360 - cannon.angle)), aim_y + 10 * Math.sin(toRad(360 - cannon.angle)));
  ctx.lineTo(cannon.x + PSIZE * Math.cos(toRad(370 - cannon.angle)), cannon.y + PSIZE * Math.sin(toRad(360 - cannon.angle + 10)));
  ctx.closePath();
  ctx.fill();

  // render lifebar
  var hp_x = (MAP.w - BORDER) * cannon.multiplier;
  ctx.fillStyle = COLOR.BLK;
  ctx.fillRect(hp_x + 8, MAP.h - 8, BORDER - 16, -86);
  ctx.fillRect(hp_x + 14, MAP.h - 94, 8, -4);

  // render hp
  var hp_color;
  if (cannon.hp >= 8) hp_color = COLOR.GRN;
  else if (cannon.hp >= 4) hp_color = COLOR.YLW;
  else hp_color = COLOR.RED;
  ctx.fillStyle = hp_color;

  for (var i = 0; i < cannon.hp; i++) {
    ctx.fillRect(hp_x + 12, MAP.h - 12 - (i * 8), 12, -6);
  }
  draw("HP", 2, hp_x + 11, MAP.h - 112);

  // render power bar
  var power_x = (MAP.w - BORDER * 2) * cannon.multiplier + BORDER;
  ctx.fillStyle = COLOR.BLK;
  ctx.fillRect(power_x, MAP.h - 8, 255 - (cannon.multiplier * 510), -10);

  // render power
  ctx.fillStyle = COLOR.WHT;
  ctx.fillRect(power_x, MAP.h - 8, cannon.power - (cannon.multiplier * (cannon.power * 2)), -10);

  // render last power
  if (cannon.last_power) {
    var last_power_x = BORDER + cannon.last_power;
    if (cannon == enemy) last_power_x = MAP.w - last_power_x;

    ctx.fillStyle = COLOR.RED;
    ctx.fillRect(last_power_x, MAP.h - 8, 1, -10);
  }

  // render 'POWER'
  var power_text_x = (cannon == player) ? BORDER : MAP.w - BORDER - 42;
  draw("Power", 2, power_text_x, MAP.h - 32);

  // render IP
  var p_pow = "192.168.1." + cannon.power;
  var ip_text_x = (cannon == player) ? BORDER + 255 - (7 * p_pow.length) : MAP.w - BORDER - 255;
  draw(p_pow, 2, ip_text_x, MAP.h - 32);
}

function renderRouter(router) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR.WHT;
  ctx.fillStyle = router.color;

  // render circle
  ctx.beginPath();
  ctx.arc(router.x, router.y, router.size, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // render icons
  ctx.fillStyle = COLOR.WHT;
  ctx.strokeStyle = COLOR.BLK;
  ctx.lineWidth = 2;
  ctx.fillRect(router.x - 10, router.y + 7, 4, -5);
  ctx.strokeRect(router.x - 10, router.y + 7, 4, -5);

  ctx.fillRect(router.x - 5, router.y + 7, 4, -8);
  ctx.strokeRect(router.x - 5, router.y + 7, 4, -8);

  if (router.damage == 2) ctx.fillStyle = COLOR.GRY;
  ctx.fillRect(router.x, router.y + 7, 4, -11);
  ctx.strokeRect(router.x, router.y + 7, 4, -11);

  if (router.damage == 3) ctx.fillStyle = COLOR.GRY;
  ctx.fillRect(router.x + 5, router.y + 7, 4, -14);
  ctx.strokeRect(router.x + 5, router.y + 7, 4, -14);
}

function renderRouterReset() {
  var s = reset_in > 1 ? "s" : "";
  draw("Damage boosters will move in " + reset_in + " turn" + s, 2, BORDER, 0 + 20);
}

function renderBullet() {
  ctx.beginPath();
  ctx.fillStyle = bullet.color;
  ctx.strokeStyle = COLOR.WHT;
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
  ctx.fillStyle = COLOR.YLW;
  ctx.fillRect(explosion.x - 2, explosion.y - 6, 4, 12);
  ctx.fillRect(explosion.x - 6, explosion.y - 2, 12, 4);
}

function renderGameOver() {
  // render cable
  ctx.fillStyle = COLOR.WHT;
  ctx.fillRect(MAP.w / 2 - 200, MAP.h / 2 - 3, 150, 6);
  ctx.fillRect(MAP.w / 2 - 50, MAP.h / 2 - 10, 50, 20);

  // render port
  ctx.fillRect(MAP.w / 2 + 50, MAP.h / 2 - 90, 120, 180);
  ctx.fillStyle = COLOR.BLK;
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
    renderRouterReset();
    for (var i = 0; i < routers.length; i++) {
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

  setVariables();
}

function nextRound() {
  turn = PLAYER;
  bullet.active = false;

  reset_in--;
  if (reset_in <= 0) {
    reset_in = 2;
    generateRouters();
  }
}

function enemyTurn() {
  turn = ENEMY;
  var r = Math.floor(Math.random() * 3);
  var miss_chance = Math.max(r*2, 15 - (enemy.misses * 2) - ((player.hp - enemy.hp) * 3));

  var a_rand  = Math.floor(Math.random() * (miss_chance / 3));
      a_rand -= Math.floor(Math.random() * (miss_chance / 3));

  var p_rand  = Math.floor(Math.random() * miss_chance);
      p_rand -= Math.floor(Math.random() * miss_chance);

  e_shot.angle = 180 - routers[r].angle + a_rand;
  e_shot.power = routers[r].power + p_rand;

  bullet.active = false;
}


function onkey(ev, key, down) {
  switch(key) {
    case KEY.UP:    player.angleUp   = down; return false;
    case KEY.DOWN:  player.angleDown = down; return false;
    case KEY.SPACE: player.fire      = down; return false;
  }
}

function fireBullet(shooter, x, y, dx, dy) {
  bullet = { x: x, y: y, dx: dx, dy: dy, color: COLOR.WHT, damage: 1, active: true, shooter: shooter };
  SOUNDS.SHOOT.play();
}

function generateRouters() {
  var distance, theta, velocity, power, rx, ry, maxh, min_diff;
  var angles = [];
  for (var i = 0; i < routers.length; i++) {
    // generate curve angle and calculate power
    do {
      distance = enemy.x - player.x;
      do {
        theta = Math.floor(Math.random() * 75);

        min_diff = 75;
        for (var j = 0; j < angles.length; j++) {
          diff = Math.abs(theta - angles[j]);
          min_diff = Math.min(diff, min_diff);
        }
      } while (min_diff < 4);

      velocity = Math.sqrt((distance * GRAVITY) / Math.sin(toRad(2 * theta)));
      power = velocity / 2;

      maxh = (Math.pow(velocity, 2) * Math.pow(Math.sin(toRad(theta)), 2)) / (2 * GRAVITY);
    } while (power > 255 || maxh > MAP.h - (MAP.h - player.y) - BORDER - (routers[i].size) - 5);

    angles.push(theta);

    rx = Math.floor(Math.random() * 200) + (MAP.w / 2 - 100) - player.x;
    ry = Math.tan(toRad(theta)) * rx - (GRAVITY / (2 * Math.pow(velocity, 2) * Math.pow(Math.cos(toRad(theta)), 2))) * Math.pow(rx, 2);

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
  for (var i = 0; i < routers.length; i++) {
    var c1 = bullet.x - routers[i].x;
    var c2 = bullet.y - routers[i].y;
    if ((Math.pow(c1, 2) + Math.pow(c2, 2)) < Math.pow(BSIZE + routers[i].size, 2))
      hitRouter(i);
  }

  // detect collision with enemy
  if (bullet.shooter == PLAYER) {
    var c1 = bullet.x - enemy.x;
    var c2 = bullet.y - enemy.y;

    if (Math.pow(c1, 2) + Math.pow(c2, 2) < Math.pow(BSIZE + PSIZE, 2)) {
      hitEnemy();
      return;
    }
  }

  // detect collision with player
  if (bullet.shooter == ENEMY) {
    var c1 = bullet.x - player.x;
    var c2 = bullet.y - player.y;

    if (Math.pow(c1, 2) + Math.pow(c2, 2) < Math.pow(BSIZE + PSIZE, 2)) {
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
        var dx = (Math.cos(toRad(player.angle)) * player.power) * 2;
        var dy = - (Math.sin(toRad(player.angle)) * player.power) * 2;
        fireBullet(PLAYER, player.x, player.y, dx, dy);

        player.last_power = player.power;
        player.firing = false;
      }
    } else {
      // enemy turn
      if (enemy.angle < e_shot.angle - 0.2) {
        if (enemy.angle < e_shot.angle - 1) {
          enemy.angle += 1;
        } else {
          enemy.angle += 0.2;
        }
      } else if (enemy.angle > e_shot.angle + 0.2) {
        if (enemy.angle > e_shot.angle + 1) {
          enemy.angle -= 1;
        } else {
          enemy.angle -= 0.2;
        }
      } else {
        if (!enemy.firing) {
          enemy.power = 0;
          enemy.firing = true;
        } else if (enemy.power < e_shot.power && enemy.power < 255) {
          enemy.power += 1;
        } else {
          var dx = (Math.cos(toRad(enemy.angle)) * enemy.power) * 2;
          var dy = - (Math.sin(toRad(enemy.angle)) * enemy.power) * 2;
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
    setVariables();
    frame(); // start the first frame
  }
}

function loadImage(src, name) {
  images[name] = document.createElement('img');
  images[name].addEventListener('load', load, false);
  images[name].src = src;
}



loadImage(IMAGES.CANNON, "cannon");
loadImage(IMAGES.IE_ICON, "ie_icon");
