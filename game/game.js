"use strict";
/*
 * Striker Protocol - an original action-platformer
 * Inspired by the "run, gun, dash, wall-jump, charge-shot, boss rush"
 * genre of 16-bit action platformers, built from scratch with
 * original characters, names, art, and level design.
 */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
const keys = {};
const pressedOnce = {};
window.addEventListener("keydown", (e) => {
  if (!keys[e.code]) pressedOnce[e.code] = true;
  keys[e.code] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
function down(...codes) { return codes.some((c) => keys[c]); }
function justPressed(...codes) {
  for (const c of codes) {
    if (pressedOnce[c]) return true;
  }
  return false;
}
function clearFrameInput() {
  for (const k in pressedOnce) pressedOnce[k] = false;
}

// ---------------------------------------------------------------------------
// Minimal synthesized SFX (no external audio assets)
// ---------------------------------------------------------------------------
let actx = null;
function audioCtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}
function beep(freq, dur, type = "square", gain = 0.05) {
  try {
    const ac = audioCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ac.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.stop(ac.currentTime + dur);
  } catch (_) { /* audio unavailable */ }
}
const sfx = {
  shoot: () => beep(720, 0.08, "square", 0.04),
  charged: () => beep(220, 0.25, "sawtooth", 0.06),
  jump: () => beep(500, 0.1, "triangle", 0.05),
  dash: () => beep(300, 0.12, "sawtooth", 0.05),
  hit: () => beep(120, 0.15, "square", 0.06),
  explode: () => beep(80, 0.3, "square", 0.08),
  pickup: () => beep(900, 0.1, "sine", 0.05),
};

// ---------------------------------------------------------------------------
// World / level definition
// A single stage told in horizontally-scrolling "rooms" stitched together.
// Rects are solid platforms. Hazards are instant-damage spike rects.
// ---------------------------------------------------------------------------
const LEVEL_WIDTH = 6400;
const GROUND_Y = 500;

const platforms = [
  // ground segments (with a few gaps/pits)
  { x: 0, y: GROUND_Y, w: 900, h: 40 },
  { x: 1000, y: GROUND_Y, w: 500, h: 40 },
  { x: 1620, y: GROUND_Y, w: 900, h: 40 },
  { x: 2650, y: GROUND_Y, w: 1200, h: 40 },
  { x: 4000, y: GROUND_Y, w: 900, h: 40 },
  { x: 5050, y: GROUND_Y, w: 1350, h: 40 },

  // floating platforms
  { x: 300, y: 400, w: 140, h: 20 },
  { x: 560, y: 320, w: 120, h: 20 },
  { x: 760, y: 400, w: 140, h: 20 },
  { x: 1080, y: 380, w: 150, h: 20 },
  { x: 1300, y: 300, w: 120, h: 20 },

  { x: 1700, y: 420, w: 120, h: 20 },
  { x: 1900, y: 340, w: 120, h: 20 },
  { x: 2100, y: 420, w: 120, h: 20 },
  { x: 2320, y: 460, w: 200, h: 20 },

  // vertical wall-jump shaft
  { x: 2760, y: 460, w: 30, h: 300 },
  { x: 3000, y: 380, w: 30, h: 380 },
  { x: 2760, y: 260, w: 270, h: 20 },

  { x: 3200, y: 440, w: 140, h: 20 },
  { x: 3420, y: 360, w: 140, h: 20 },
  { x: 3640, y: 440, w: 140, h: 20 },

  { x: 4150, y: 400, w: 150, h: 20 },
  { x: 4400, y: 320, w: 130, h: 20 },
  { x: 4650, y: 400, w: 150, h: 20 },

  { x: 5150, y: 420, w: 150, h: 20 },
  { x: 5400, y: 340, w: 150, h: 20 },
  { x: 5650, y: 420, w: 150, h: 20 },

  // boss arena floor
  { x: 5900, y: GROUND_Y, w: 500, h: 40 },
];

const spikes = [
  { x: 900, y: GROUND_Y - 16, w: 100, h: 16 },
  { x: 1520, y: GROUND_Y - 16, w: 100, h: 16 },
  { x: 3850, y: GROUND_Y - 16, w: 150, h: 16 },
];

const pits = [
  { x: 900, w: 100 },
  { x: 1520, w: 100 },
  { x: 3850, w: 150 },
];

const pickups = [
  { x: 620, y: 280, type: "health", taken: false },
  { x: 1330, y: 260, type: "energy", taken: false },
  { x: 2140, y: 380, type: "health", taken: false },
  { x: 3460, y: 320, type: "energy", taken: false },
  { x: 4430, y: 280, type: "health", taken: false },
];

const checkpoints = [0, 1600, 2650, 4000, 5050, 5900].map((x) => ({ x, used: false }));

// Simple enemy roster placed around the level.
function spawnEnemies() {
  return [
    { kind: "crawler", x: 500, y: GROUND_Y - 24, dir: -1, hp: 2, alive: true, patrolMin: 300, patrolMax: 900 },
    { kind: "crawler", x: 1750, y: GROUND_Y - 24, dir: 1, hp: 2, alive: true, patrolMin: 1620, patrolMax: 2500 },
    { kind: "turret", x: 2350, y: 430, dir: -1, hp: 3, alive: true, cooldown: 0 },
    { kind: "crawler", x: 3250, y: GROUND_Y - 24, dir: 1, hp: 2, alive: true, patrolMin: 3200, patrolMax: 3780 },
    { kind: "turret", x: 4200, y: 370, dir: -1, hp: 3, alive: true, cooldown: 0 },
    { kind: "crawler", x: 4700, y: GROUND_Y - 24, dir: -1, hp: 2, alive: true, patrolMin: 4000, patrolMax: 4880 },
    { kind: "turret", x: 5400, y: 300, dir: -1, hp: 3, alive: true, cooldown: 0 },
    { kind: "crawler", x: 5200, y: GROUND_Y - 24, dir: 1, hp: 2, alive: true, patrolMin: 5050, patrolMax: 5900 },
  ];
}
let enemies = spawnEnemies();

const BOSS_TRIGGER_X = 5950;
const BOSS_ARENA = { xMin: 5900, xMax: 6400 };

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
class Player {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = 60;
    this.y = GROUND_Y - 48;
    this.w = 26;
    this.h = 40;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.onWallDir = 0; // -1 left wall, 1 right wall, 0 none
    this.maxHp = 8;
    this.hp = this.maxHp;
    this.maxEnergy = 8;
    this.energy = this.maxEnergy;
    this.charge = 0;
    this.charging = false;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.invuln = 0;
    this.dead = false;
    this.walkFrame = 0;
    this.lives = 3;
  }
}

const player = new Player();
let projectiles = []; // player shots
let enemyShots = [];
let particles = [];
let camX = 0;
let lastCheckpoint = { x: 60, y: GROUND_Y - 48 };
let gameState = "title"; // title | playing | paused | dead | victory
let stageTimer = 0;
let boss = null;

function makeBoss() {
  return {
    x: 6250,
    y: GROUND_Y - 90,
    w: 70,
    h: 90,
    vx: 0,
    vy: 0,
    hp: 40,
    maxHp: 40,
    phase: 0,
    actionTimer: 90,
    action: "idle",
    dir: -1,
    alive: true,
    telegraph: 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addParticle(x, y, color, life = 20, vx = 0, vy = 0) {
  particles.push({ x, y, color, life, maxLife: life, vx, vy });
}

function explosion(x, y, color = "#ffb84d") {
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI * 2 * i) / 10;
    addParticle(x, y, color, 22, Math.cos(ang) * 2.2, Math.sin(ang) * 2.2);
  }
  sfx.explode();
}

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------
const GRAVITY = 0.62;
const MAX_FALL = 13;
const MOVE_SPEED = 4.2;
const AIR_ACCEL = 0.5;
const GROUND_ACCEL = 0.85;
const FRICTION = 0.8;
const JUMP_VEL = -11.5;
const WALL_JUMP_VX = 6.5;
const WALL_JUMP_VY = -10.5;
const WALL_SLIDE_MAX = 2.2;
const DASH_SPEED = 9.5;
const DASH_DURATION = 14;
const DASH_COOLDOWN = 28;

function solidAt(rect) {
  for (const p of platforms) {
    if (rectsOverlap(rect, p)) return p;
  }
  return null;
}

function updatePlayerPhysics() {
  const p = player;
  if (p.dead) return;

  const left = down("ArrowLeft", "KeyA");
  const right = down("ArrowRight", "KeyD");
  const jumpPressed = justPressed("KeyX", "Space");
  const jumpHeld = down("KeyX", "Space");
  const dashPressed = justPressed("KeyC", "ShiftLeft", "ShiftRight");
  const shootHeld = down("KeyZ", "KeyK");
  const shootReleased = !shootHeld && p.charging;

  // Dash handling
  if (p.dashCooldown > 0) p.dashCooldown--;
  if (p.dashTime > 0) {
    p.dashTime--;
    p.vy = 0;
  } else if (dashPressed && p.dashCooldown === 0 && p.energy > 0) {
    p.dashTime = DASH_DURATION;
    p.dashCooldown = DASH_COOLDOWN;
    p.vx = DASH_SPEED * p.facing;
    p.invuln = Math.max(p.invuln, 10);
    sfx.dash();
  }

  if (p.dashTime > 0) {
    p.vx = DASH_SPEED * p.facing;
    addParticle(p.x + p.w / 2, p.y + p.h / 2, "#7ad7ff", 10, -p.facing * 1.5, 0);
  } else {
    // Horizontal movement
    const accel = p.onGround ? GROUND_ACCEL : AIR_ACCEL;
    if (left && !right) {
      p.vx -= accel;
      p.facing = -1;
    } else if (right && !left) {
      p.vx += accel;
      p.facing = 1;
    } else if (p.onGround) {
      p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }
    p.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, p.vx));
  }

  // Gravity + wall slide
  if (!p.onGround) {
    p.vy += GRAVITY;
    if (p.onWallDir !== 0 && p.vy > 0 && ((p.onWallDir < 0 && left) || (p.onWallDir > 0 && right))) {
      p.vy = Math.min(p.vy, WALL_SLIDE_MAX);
    }
    p.vy = Math.min(p.vy, MAX_FALL);
  }

  // Jump / wall jump
  if (jumpPressed) {
    if (p.onGround) {
      p.vy = JUMP_VEL;
      p.onGround = false;
      sfx.jump();
    } else if (p.onWallDir !== 0) {
      p.vy = WALL_JUMP_VY;
      p.vx = WALL_JUMP_VX * -p.onWallDir;
      p.facing = -p.onWallDir;
      p.onWallDir = 0;
      sfx.jump();
    }
  }
  if (!jumpHeld && p.vy < -4) {
    p.vy = -4; // variable jump height
  }

  // --- Horizontal move + collision ---
  p.x += p.vx;
  let box = { x: p.x, y: p.y, w: p.w, h: p.h };
  let hit = solidAt(box);
  if (hit) {
    if (p.vx > 0) p.x = hit.x - p.w;
    else if (p.vx < 0) p.x = hit.x + hit.w;
    p.vx = 0;
  }
  p.x = Math.max(0, Math.min(LEVEL_WIDTH - p.w, p.x));

  // --- Vertical move + collision ---
  p.y += p.vy;
  p.onGround = false;
  box = { x: p.x, y: p.y, w: p.w, h: p.h };
  hit = solidAt(box);
  if (hit) {
    if (p.vy > 0) {
      p.y = hit.y - p.h;
      p.onGround = true;
    } else if (p.vy < 0) {
      p.y = hit.y + hit.h;
    }
    p.vy = 0;
  }

  // fall in a pit -> instant hazard
  const overPit = pits.some((pit) => p.x + p.w > pit.x && p.x < pit.x + pit.w);
  if (p.y > H + 100 || (overPit && p.y + p.h > GROUND_Y + 60)) {
    damagePlayer(p.maxHp); // pit kill
  }

  // wall detection for wall-jump/slide (only when airborne)
  p.onWallDir = 0;
  if (!p.onGround) {
    const leftBox = { x: p.x - 3, y: p.y + 4, w: 3, h: p.h - 8 };
    const rightBox = { x: p.x + p.w, y: p.y + 4, w: 3, h: p.h - 8 };
    if (solidAt(leftBox) && left) p.onWallDir = -1;
    else if (solidAt(rightBox) && right) p.onWallDir = 1;
  }

  // Charging shot
  if (shootHeld) {
    p.charging = true;
    p.charge = Math.min(60, p.charge + 1);
  }
  if (shootReleased) {
    fireShot(p.charge >= 45 ? 2 : p.charge >= 20 ? 1 : 0);
    p.charging = false;
    p.charge = 0;
  }

  if (p.invuln > 0) p.invuln--;

  // checkpoints
  for (const cp of checkpoints) {
    if (!cp.used && p.x >= cp.x) {
      cp.used = true;
      lastCheckpoint = { x: cp.x + 20, y: GROUND_Y - 48 };
    }
  }

  // pickups
  for (const pk of pickups) {
    if (pk.taken) continue;
    const box2 = { x: pk.x, y: pk.y, w: 20, h: 20 };
    if (rectsOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, box2)) {
      pk.taken = true;
      sfx.pickup();
      if (pk.type === "health") p.hp = Math.min(p.maxHp, p.hp + 2);
      else p.energy = Math.min(p.maxEnergy, p.energy + 3);
    }
  }

  p.walkFrame += Math.abs(p.vx) > 0.2 && p.onGround ? 1 : 0;

  // enter boss arena
  if (!boss && p.x > BOSS_TRIGGER_X) {
    boss = makeBoss();
  }
}

function fireShot(level) {
  const p = player;
  if (level > 0 && p.energy < level) level = 0;
  if (level > 0) p.energy -= level;
  const speed = 9 + level;
  const size = 6 + level * 4;
  projectiles.push({
    x: p.x + (p.facing > 0 ? p.w : -size),
    y: p.y + p.h / 2 - size / 2,
    vx: speed * p.facing,
    w: size,
    h: size,
    level,
  });
  if (level >= 2) sfx.charged();
  else sfx.shoot();
}

function damagePlayer(amount) {
  const p = player;
  if (p.invuln > 0 || p.dead) return;
  p.hp -= amount;
  p.invuln = 60;
  sfx.hit();
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    explosion(p.x + p.w / 2, p.y + p.h / 2, "#7ad7ff");
    setTimeout(() => respawn(), 900);
  }
}

function respawn() {
  const p = player;
  p.lives -= 1;
  if (p.lives < 0) {
    gameState = "dead";
    return;
  }
  p.dead = false;
  p.hp = p.maxHp;
  p.energy = p.maxEnergy;
  p.x = lastCheckpoint.x;
  p.y = lastCheckpoint.y;
  p.vx = 0;
  p.vy = 0;
  p.invuln = 90;
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.kind === "crawler") {
      e.x += e.dir * 1.4;
      if (e.x < e.patrolMin) { e.x = e.patrolMin; e.dir = 1; }
      if (e.x > e.patrolMax) { e.x = e.patrolMax; e.dir = -1; }
      const box = { x: e.x, y: e.y, w: 24, h: 24 };
      if (rectsOverlap(box, playerBox()) ) damagePlayer(1);
    } else if (e.kind === "turret") {
      e.cooldown--;
      const dx = player.x - e.x;
      e.dir = dx < 0 ? -1 : 1;
      if (e.cooldown <= 0 && Math.abs(dx) < 500) {
        enemyShots.push({ x: e.x, y: e.y + 8, vx: 5 * e.dir, w: 8, h: 8 });
        e.cooldown = 90;
      }
      const box = { x: e.x, y: e.y, w: 24, h: 24 };
      if (rectsOverlap(box, playerBox())) damagePlayer(1);
    }
  }
  enemies = enemies.filter((e) => e.alive || e.deathTimer === undefined);
}

function playerBox() {
  return { x: player.x, y: player.y, w: player.w, h: player.h };
}

// ---------------------------------------------------------------------------
// Boss: "Warden Prime" - a hulking sentry with three attack phases.
// ---------------------------------------------------------------------------
function updateBoss() {
  if (!boss || !boss.alive) return;
  const b = boss;
  const dx = player.x - b.x;
  b.dir = dx < 0 ? -1 : 1;
  b.actionTimer--;

  if (b.actionTimer <= 0) {
    const roll = Math.random();
    if (b.hp < b.maxHp * 0.34) {
      b.action = roll < 0.5 ? "slam" : "burst";
    } else if (b.hp < b.maxHp * 0.67) {
      b.action = roll < 0.4 ? "slam" : roll < 0.7 ? "dash" : "burst";
    } else {
      b.action = roll < 0.5 ? "slam" : "dash";
    }
    b.actionTimer = 100;
    b.telegraph = 24;
  }

  if (b.telegraph > 0) {
    b.telegraph--;
    b.vx = 0;
  } else if (b.action === "dash") {
    b.vx = b.dir * 6;
  } else if (b.action === "slam" && b.actionTimer === 99) {
    for (let i = -2; i <= 2; i++) {
      enemyShots.push({ x: b.x + b.w / 2, y: b.y, vx: i * 2.2, vy: -6, w: 10, h: 10, grav: true });
    }
  } else if (b.action === "burst" && b.actionTimer % 20 === 0) {
    enemyShots.push({ x: b.x + (b.dir > 0 ? b.w : 0), y: b.y + b.h / 2, vx: 7 * b.dir, w: 10, h: 10 });
  } else {
    b.vx *= 0.85;
  }

  b.x += b.vx;
  b.x = Math.max(BOSS_ARENA.xMin, Math.min(BOSS_ARENA.xMax - b.w, b.x));

  if (rectsOverlap({ x: b.x, y: b.y, w: b.w, h: b.h }, playerBox())) {
    damagePlayer(2);
  }

  // player shots hitting boss
  for (const s of projectiles) {
    if (rectsOverlap({ x: s.x, y: s.y, w: s.w, h: s.h }, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      s.dead = true;
      b.hp -= 1 + s.level * 2;
      addParticle(s.x, s.y, "#ffe27a", 12);
      if (b.hp <= 0) {
        b.alive = false;
        boss = null;
        explosion(b.x + b.w / 2, b.y + b.h / 2, "#ffb84d");
        gameState = "victory";
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------
function updateProjectiles() {
  for (const s of projectiles) {
    s.x += s.vx;
    if (s.x < camX - 50 || s.x > camX + W + 50) s.dead = true;
    const hitWall = solidAt({ x: s.x, y: s.y, w: s.w, h: s.h });
    if (hitWall) s.dead = true;
    for (const e of enemies) {
      if (!e.alive) continue;
      const eb = { x: e.x, y: e.y, w: 24, h: 24 };
      if (rectsOverlap({ x: s.x, y: s.y, w: s.w, h: s.h }, eb)) {
        s.dead = true;
        e.hp -= 1 + s.level * 2;
        addParticle(e.x + 12, e.y + 12, "#ffe27a", 10);
        if (e.hp <= 0) {
          e.alive = false;
          explosion(e.x + 12, e.y + 12, "#ff7a7a");
        }
      }
    }
  }
  projectiles = projectiles.filter((s) => !s.dead);

  for (const s of enemyShots) {
    if (s.grav) {
      s.vy += 0.3;
      s.y += s.vy;
    }
    s.x += s.vx;
    if (rectsOverlap({ x: s.x, y: s.y, w: s.w, h: s.h }, playerBox())) {
      s.dead = true;
      damagePlayer(1);
    }
    if (s.x < camX - 50 || s.x > camX + W + 50 || s.y > H + 100) s.dead = true;
  }
  enemyShots = enemyShots.filter((s) => !s.dead);
}

function updateParticles() {
  for (const pt of particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
  }
  particles = particles.filter((pt) => pt.life > 0);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#131327");
  grad.addColorStop(1, "#1c1c36");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // parallax silhouettes
  ctx.fillStyle = "#20223f";
  for (let i = 0; i < 8; i++) {
    const bx = (i * 420 - camX * 0.3) % (W + 400) - 200;
    ctx.fillRect(bx, 260, 160, 280);
  }
  ctx.fillStyle = "#282a4d";
  for (let i = 0; i < 10; i++) {
    const bx = (i * 300 - camX * 0.55) % (W + 300) - 150;
    ctx.fillRect(bx, 340, 100, 200);
  }
}

function drawPlatforms() {
  ctx.fillStyle = "#3f4a73";
  for (const p of platforms) {
    if (p.x + p.w < camX - 50 || p.x > camX + W + 50) continue;
    ctx.fillRect(p.x - camX, p.y, p.w, p.h);
    ctx.fillStyle = "#5b6aa0";
    ctx.fillRect(p.x - camX, p.y, p.w, 4);
    ctx.fillStyle = "#3f4a73";
  }
  ctx.fillStyle = "#ff4d4d";
  for (const s of spikes) {
    if (s.x + s.w < camX - 50 || s.x > camX + W + 50) continue;
    const n = Math.floor(s.w / 16);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x - camX + i * 16, s.y + s.h);
      ctx.lineTo(s.x - camX + i * 16 + 8, s.y);
      ctx.lineTo(s.x - camX + i * 16 + 16, s.y + s.h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawPickups() {
  for (const pk of pickups) {
    if (pk.taken) continue;
    if (pk.x < camX - 50 || pk.x > camX + W + 50) continue;
    ctx.fillStyle = pk.type === "health" ? "#66ffcc" : "#ffd166";
    ctx.beginPath();
    ctx.arc(pk.x - camX + 10, pk.y + 10 + Math.sin(stageTimer / 10) * 3, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const p = player;
  if (p.dead) return;
  const sx = p.x - camX;
  if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return; // flicker

  ctx.save();
  ctx.translate(sx + p.w / 2, p.y + p.h / 2);
  ctx.scale(p.facing, 1);

  // body
  ctx.fillStyle = p.dashTime > 0 ? "#bfefff" : "#4da3ff";
  ctx.fillRect(-p.w / 2, -p.h / 2 + 6, p.w, p.h - 6);
  // helmet
  ctx.fillStyle = "#2f6fce";
  ctx.fillRect(-p.w / 2 + 2, -p.h / 2, p.w - 4, 16);
  // visor
  ctx.fillStyle = "#c9f2ff";
  ctx.fillRect(2, -p.h / 2 + 5, 8, 5);
  // arm cannon
  ctx.fillStyle = "#2f6fce";
  const armLen = p.charging ? 16 + Math.min(10, p.charge / 5) : 14;
  ctx.fillRect(p.w / 2 - 4, -2, armLen, 8);
  if (p.charging) {
    ctx.fillStyle = p.charge >= 45 ? "#ff8a3d" : p.charge >= 20 ? "#ffe27a" : "#8fd3ff";
    ctx.beginPath();
    ctx.arc(p.w / 2 + armLen, 2, 3 + Math.min(6, p.charge / 8), 0, Math.PI * 2);
    ctx.fill();
  }
  // legs (simple walk cycle)
  ctx.fillStyle = "#2f6fce";
  const legOffset = p.onGround && Math.abs(p.vx) > 0.3 ? Math.sin(p.walkFrame / 4) * 5 : 0;
  ctx.fillRect(-8, p.h / 2 - 10, 6, 10 + legOffset * 0.2);
  ctx.fillRect(2, p.h / 2 - 10, 6, 10 - legOffset * 0.2);

  ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const sx = e.x - camX;
    if (sx < -50 || sx > W + 50) continue;
    if (e.kind === "crawler") {
      ctx.fillStyle = "#ff7a7a";
      ctx.fillRect(sx, e.y, 24, 24);
      ctx.fillStyle = "#3a0d0d";
      ctx.fillRect(sx + (e.dir > 0 ? 14 : 4), e.y + 6, 6, 6);
    } else if (e.kind === "turret") {
      ctx.fillStyle = "#b16bff";
      ctx.fillRect(sx, e.y, 24, 24);
      ctx.fillStyle = "#3a0d3a";
      ctx.fillRect(sx + (e.dir > 0 ? 18 : -6), e.y + 9, 10, 6);
    }
  }
}

function drawBoss() {
  if (!boss || !boss.alive) return;
  const b = boss;
  const sx = b.x - camX;
  ctx.fillStyle = b.telegraph > 0 ? "#ffe27a" : "#8b3ff2";
  ctx.fillRect(sx, b.y, b.w, b.h);
  ctx.fillStyle = "#4b1f99";
  ctx.fillRect(sx + 8, b.y + 12, b.w - 16, 20);
  ctx.fillStyle = "#ff5e5e";
  ctx.fillRect(sx + (b.dir > 0 ? b.w - 20 : 10), b.y + 16, 10, 10);

  // boss health bar
  const bw = 400;
  ctx.fillStyle = "#222";
  ctx.fillRect(W / 2 - bw / 2, 16, bw, 14);
  ctx.fillStyle = "#c34cff";
  ctx.fillRect(W / 2 - bw / 2, 16, bw * (b.hp / b.maxHp), 14);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(W / 2 - bw / 2, 16, bw, 14);
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WARDEN PRIME", W / 2, 12);
}

function drawProjectiles() {
  ctx.fillStyle = "#8fd3ff";
  for (const s of projectiles) {
    ctx.fillStyle = s.level >= 2 ? "#ff8a3d" : s.level === 1 ? "#ffe27a" : "#8fd3ff";
    ctx.fillRect(s.x - camX, s.y, s.w, s.h);
  }
  ctx.fillStyle = "#ff5e5e";
  for (const s of enemyShots) {
    ctx.fillRect(s.x - camX, s.y, s.w, s.h);
  }
}

function drawParticles() {
  for (const pt of particles) {
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - camX, pt.y, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  const p = player;
  // health bar
  ctx.fillStyle = "#000";
  ctx.fillRect(14, 14, 14 * 10 + 6, 16);
  for (let i = 0; i < p.maxHp; i++) {
    ctx.fillStyle = i < p.hp ? "#66ffcc" : "#243b34";
    ctx.fillRect(18 + i * 12, 18, 9, 8);
  }
  // energy bar
  ctx.fillStyle = "#000";
  ctx.fillRect(14, 34, 14 * 10 + 6, 16);
  for (let i = 0; i < p.maxEnergy; i++) {
    ctx.fillStyle = i < p.energy ? "#ffd166" : "#4d3f1f";
    ctx.fillRect(18 + i * 12, 38, 9, 8);
  }
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`LIVES x${p.lives}`, 14, 68);
}

function drawOverlay() {
  if (gameState === "title") {
    ctx.fillStyle = "rgba(10,10,20,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#8fd3ff";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("STRIKER PROTOCOL", W / 2, H / 2 - 40);
    ctx.fillStyle = "#fff";
    ctx.font = "16px monospace";
    ctx.fillText("An original run-and-gun action platformer", W / 2, H / 2 - 8);
    ctx.fillText("Press ENTER to start", W / 2, H / 2 + 30);
    ctx.font = "12px monospace";
    ctx.fillText("Arrows/WASD move | Z shoot (hold=charge) | X jump | C dash", W / 2, H / 2 + 60);
  } else if (gameState === "paused") {
    ctx.fillStyle = "rgba(10,10,20,0.7)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H / 2);
  } else if (gameState === "dead") {
    ctx.fillStyle = "rgba(20,0,0,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ff5e5e";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SYSTEM OFFLINE", W / 2, H / 2 - 10);
    ctx.fillStyle = "#fff";
    ctx.font = "16px monospace";
    ctx.fillText("Press ENTER to retry", W / 2, H / 2 + 30);
  } else if (gameState === "victory") {
    ctx.fillStyle = "rgba(10,20,10,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#66ffcc";
    ctx.font = "bold 34px monospace";
    ctx.textAlign = "center";
    ctx.fillText("WARDEN PRIME DEFEATED", W / 2, H / 2 - 10);
    ctx.fillStyle = "#fff";
    ctx.font = "16px monospace";
    ctx.fillText("Sector secured. Press ENTER to play again", W / 2, H / 2 + 30);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function resetGame() {
  player.reset();
  enemies = spawnEnemies();
  projectiles = [];
  enemyShots = [];
  particles = [];
  boss = null;
  camX = 0;
  lastCheckpoint = { x: 60, y: GROUND_Y - 48 };
  for (const cp of checkpoints) cp.used = false;
  for (const pk of pickups) pk.taken = false;
  stageTimer = 0;
}

function update() {
  if (justPressed("Enter")) {
    if (gameState === "title" || gameState === "dead" || gameState === "victory") {
      resetGame();
      gameState = "playing";
    } else if (gameState === "playing") {
      gameState = "paused";
    } else if (gameState === "paused") {
      gameState = "playing";
    }
  }

  if (gameState === "playing") {
    stageTimer++;
    updatePlayerPhysics();
    updateEnemies();
    updateBoss();
    updateProjectiles();
    updateParticles();

    // camera follow with soft clamp
    const targetCam = Math.max(0, Math.min(LEVEL_WIDTH - W, player.x - W / 2));
    camX += (targetCam - camX) * 0.15;
    if (boss) camX = Math.max(BOSS_ARENA.xMin - 100, Math.min(LEVEL_WIDTH - W, camX));
  }

  clearFrameInput();
}

function render() {
  drawBackground();
  drawPlatforms();
  drawPickups();
  drawEnemies();
  drawBoss();
  drawPlayer();
  drawProjectiles();
  drawParticles();
  if (gameState !== "title") drawHud();
  drawOverlay();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
