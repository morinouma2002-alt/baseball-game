(function () {
"use strict";

// ============================================================
// ホームランダービー : ふつうの人が主人公のバッティングゲーム
// 画面はすべて 800x450 の canvas に描画します。
// ============================================================

var W = 800, H = 450;
var FONT = "'Hiragino Maru Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
var SAVE_KEY = "circleHRDerby.save.v1";   // v1 のセーブも読めるようにキーは据え置き
var MAX_LV = 10;
var FENCE_M = 100;

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

// ---------- ステージ ----------
// ballTime: 投球から捕手に届くまでの秒数 / types: 球種 / windup: 投球前の間(秒)の範囲
var FIX = [0.55, 0.55];
var STAGES = [
  { name: "新人くん",               pitches: 10, target: 6,  ballTime: 1.60, types: ["straight"],                    windup: FIX },
  { name: "草野球の先輩",           pitches: 12, target: 8,  ballTime: 1.40, types: ["straight"],                    windup: FIX },
  { name: "商店街のエース",         pitches: 15, target: 10, ballTime: 1.25, types: ["straight"],                    windup: FIX },
  { name: "河川敷のトリックスター", pitches: 20, target: 13, ballTime: 1.15, types: ["bounce", "straight"],          windup: FIX },
  { name: "大学の左腕",             pitches: 25, target: 17, ballTime: 1.10, types: ["drop", "straight"],            windup: FIX },
  { name: "ベテラン投手",           pitches: 30, target: 20, ballTime: 1.00, types: ["straight", "bounce", "drop"],  windup: [0.35, 0.8] },
  { name: "魔球使い",               pitches: 35, target: 24, ballTime: 0.95, types: ["straight", "bounce", "drop", "vanish"], windup: [0.35, 0.8] },
  { name: "最終ボス",               pitches: 40, target: 28, ballTime: 0.80, types: ["straight", "vanish"],          windup: [0.35, 0.8] }
];

var STATS = [
  { key: "power", name: "パワー", desc: "飛距離" },
  { key: "meet",  name: "ミート", desc: "グリーンの広さ" }
];

// ---------- ゲーム数値(ステータスで変化する) ----------
var REACH_H = 34;          // バットの横の届く範囲(px)
var TIME_WIN = 0.2;        // これより大きくズレたら空振り(秒)
var SWING_SCALE = 2.8;     // タイミングのズレ(秒) -> バット上の位置(0..1)
var GREEN_C = 0.75;        // バット上のグリーン中心
function greenHalfU(meet) { return 0.13 * (1 + 0.06 * meet); }  // グリーンの半幅(バット長さ比)
function reachV(meet)     { return 22 + 1.5 * meet; }           // 縦の届く範囲(px)
function distMul(power)   { return 1 + 0.04 * power; }
function upgradeCost(lv)  { return 50 * (lv + 1); }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// d: (バットがボールの位置を通る時刻) - (球が届く時刻) 秒。負=早い、正=遅い
// ev/ex: ボールとバットの縦/横のズレ(px)。純関数。rnd は 0..1 の乱数関数。
function classify(d, ev, ex, meetLv, powerLv, rnd) {
  if (Math.abs(d) > TIME_WIN) return { kind: "miss" };
  var rv = reachV(meetLv);
  if (ex > REACH_H * 1.4 || ev > rv * 1.4) return { kind: "miss" };
  var side = d < 0 ? -1 : 1;
  if (ex > REACH_H || ev > rv) return { kind: "foul", side: side, dist: 20 + Math.round(rnd() * 40) };
  var u = GREEN_C + d * SWING_SCALE;       // バット上の当たった位置(0=持ち手 1=先)
  if (u < 0 || u > 1) return { kind: "miss" };
  var gh = greenHalfU(meetLv);
  var x = Math.abs(u - GREEN_C);
  var q;
  if (x <= gh) {
    q = 1 - 0.4 * x / gh;
  } else {
    var end = u < GREEN_C ? GREEN_C : 1 - GREEN_C;
    q = 0.6 * (1 - (x - gh) / (end - gh));
  }
  q = clamp(q, 0, 1);
  if (x <= gh) {
    var dist = 150 * (0.4 + 0.6 * q) * distMul(powerLv) + rnd() * 4;
    return { kind: "hr", dist: Math.round(dist), q: q, just: q >= 0.9 };
  }
  if (q >= 0.35) return { kind: "hit", dist: Math.round(40 + 55 * q / 0.6), q: q };
  return { kind: "foul", side: side, dist: 20 + Math.round(rnd() * 40), q: q };
}

// ---------- セーブ ----------
function defaultSave() {
  var c = [], b = [];
  for (var i = 0; i < STAGES.length; i++) { c.push(false); b.push(0); }
  return { v: 2, coins: 0, cleared: c, best: b, levels: { power: 0, meet: 0 }, mute: false };
}
function clampInt(n, lo, hi) {
  n = Math.floor(Number(n));
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
function loadSave() {
  var s = defaultSave();
  try {
    var raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return s;
    var o = JSON.parse(raw);
    if (!o || typeof o !== "object") return s;
    s.coins = clampInt(o.coins, 0, 99999999);
    for (var i = 0; i < STAGES.length; i++) {
      s.cleared[i] = !!(o.cleared && o.cleared[i] === true);
      s.best[i] = clampInt(o.best && o.best[i], 0, 999);
    }
    for (var k = 0; k < STATS.length; k++) {
      s.levels[STATS[k].key] = clampInt(o.levels && o.levels[STATS[k].key], 0, MAX_LV);
    }
    s.mute = o.mute === true;
    if (o.v !== 2) {
      // v1 -> v2: 選球眼は廃止。使ったぶんのコインを返す
      var eyeLv = clampInt(o.levels && o.levels.eye, 0, MAX_LV);
      for (var e = 0; e < eyeLv; e++) s.coins += 20 + 15 * e;
      try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e2) {}
    }
  } catch (e) {
    return defaultSave();
  }
  return s;
}
var save = loadSave();
function saveGame() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 保存できない環境ではメモリのみ */ }
}
function isUnlocked(i) { return i === 0 || save.cleared[i - 1] === true; }

// ---------- 音 ----------
var actx = null;
function initAudio() {
  if (actx) { if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return; }
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  } catch (e) { actx = null; }
}
function beep(freq, dur, type, vol, delay) {
  if (save.mute || !actx) return;
  try {
    var t0 = actx.currentTime + (delay || 0);
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* 音が出なくても続行 */ }
}
// ノイズ音(風切り音・歓声など)。freq はフィルタ中心周波数、sweep は終わりの周波数
function noiseBurst(dur, freq, vol, delay, sweep) {
  if (save.mute || !actx) return;
  try {
    var t0 = actx.currentTime + (delay || 0);
    var n = Math.max(1, Math.floor(actx.sampleRate * dur));
    var buf = actx.createBuffer(1, n, actx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = actx.createBufferSource(); src.buffer = buf;
    var f = actx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    var gn = actx.createGain();
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(gn); gn.connect(actx.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  } catch (e) { /* 音が出なくても続行 */ }
}
var sfx = {
  click: function () { beep(660, 0.07, "square", 0.05); },
  deny:  function () { beep(160, 0.12, "square", 0.06); },
  pitch: function () { noiseBurst(0.18, 600, 0.12, 0, 1800); },
  swing: function () { noiseBurst(0.16, 1800, 0.18, 0, 500); },
  hit:   function (good) { noiseBurst(0.03, 2500, good ? 0.5 : 0.3, 0); beep(1200, 0.04, "square", good ? 0.12 : 0.06); },
  hr:    function () { noiseBurst(1.2, 1500, 0.2, 0.1, 900); beep(523, 0.15, "triangle", 0.1, 0.1); beep(659, 0.15, "triangle", 0.1, 0.23); beep(784, 0.3, "triangle", 0.1, 0.36); },
  miss:  function () { noiseBurst(0.06, 300, 0.4, 0); beep(180, 0.12, "triangle", 0.12); },
  clear: function () { beep(523, 0.12, "triangle", 0.12); beep(659, 0.12, "triangle", 0.12, 0.12); beep(784, 0.12, "triangle", 0.12, 0.24); beep(1047, 0.3, "triangle", 0.12, 0.36); },
  fail:  function () { noiseBurst(0.6, 400, 0.12, 0, 200); beep(300, 0.2, "triangle", 0.1); beep(220, 0.2, "triangle", 0.1, 0.2); beep(160, 0.35, "triangle", 0.1, 0.4); }
};

// ---------- 状態 ----------
var scene = "title";
var focusId = null;
var buttons = [];            // 直近の描画で登録されたボタン
var time = 0;                // 経過秒(アニメ用)
var g = null;                // バッティング中の状態
var resultInfo = null;
var statusMsg = "";
var paused = false;          // 画面撮影用(通常は false)

function go(name) { scene = name; focusId = null; }

function rnd() { return Math.random(); }

// ---------- バッティング ----------
var PLATE = { x: 400, y: 375 };
var ZONE_Y = 360;
var ZONE = { x0: 350, x1: 440, y0: 310, y1: 410 };   // バットを動かせる範囲(バッターは左に固定。この中だけでうろうろ)
var SWING_DUR = 0.30, CONTACT_SW = 0.14, HITSTOP = 0.06, PASS_T = 0.4;
var aim = { x: 400, y: ZONE_Y };          // バットの位置(スイング中は固定)
var aimTarget = { x: 400, y: ZONE_Y };    // ポインタ/キーが指している位置
var keysDown = {};

function startStage(idx) {
  var st = STAGES[idx];
  g = {
    idx: idx, stage: st,
    pitchesLeft: st.pitches, hr: 0, points: 0, pitchNo: 0,
    phase: "intro", t: 0,
    swingT: null,                  // null=構え / 数値=スイング中(必ず時間で終わる)
    swung: false, contactDone: false, out: null,
    ballTime: 1, type: "straight", windT: 0.55, bx: 400, by: ZONE_Y,
    flight: null, lastDist: 0, hitFlash: 0
  };
  go("batting");
}

function setupPitch() {
  var st = g.stage;
  g.ballTime = st.ballTime * (0.95 + rnd() * 0.1);
  g.type = st.types[Math.floor(rnd() * st.types.length)];
  g.windT = st.windup[0] + rnd() * (st.windup[1] - st.windup[0]);
  g.bx = PLATE.x + (rnd() * 2 - 1) * 14;
  g.by = ZONE_Y + (rnd() * 2 - 1) * 28;
  g.swung = false; g.contactDone = false; g.out = null; g.flight = null;
}

function setAimTarget(p) {
  // 画面の横位置(0〜800)を、狭いバット範囲に割り当てる。バッターは左固定。
  aimTarget.x = ZONE.x0 + clamp(p.x / 800, 0, 1) * (ZONE.x1 - ZONE.x0);
  aimTarget.y = clamp(p.y, ZONE.y0, ZONE.y1);
}

// スイング開始。どのフェーズでも振れる(空振りのアニメだけになる)。
// スイングはかならず SWING_DUR 秒で終わる(updateBatting が毎フレーム確認)。
function doSwing() {
  if (!g || scene !== "batting") return;
  if (g.swingT !== null) return;          // スイング中は新しいスイングを受け付けない
  g.swingT = 0;
  aim.x = aimTarget.x; aim.y = aimTarget.y;
  sfx.swing();
  if (g.phase !== "pitch" || g.contactDone) return;
  g.swung = true;
  var d = (g.t + CONTACT_SW) - g.ballTime;
  var res = classify(d, Math.abs(g.by - aim.y), Math.abs(g.bx - aim.x), save.levels.meet, save.levels.power, rnd);
  if (res.kind !== "miss") {
    g.contactDone = true;
    g.out = res;
    g.phase = "contact"; g.t = 0;
  }
}

function startFlight() {
  var o = g.out, f;
  if (o.kind === "hr") {
    f = { dur: 1.6, dx: (rnd() - 0.5) * 420, endY: 55, arc: 70, endSize: 3 };
    sfx.hit(true); sfx.hr();
  } else if (o.kind === "foul") {
    f = { dur: 1.0, dx: o.side * 420, endY: 300, arc: 150, endSize: 6 };
    sfx.hit(false);
  } else {
    f = { dur: 1.2, dx: (rnd() - 0.5) * 300, endY: 215, arc: 130, endSize: 5 };
    sfx.hit(false);
  }
  g.flight = f;
  g.phase = "flight"; g.t = 0;
}

function popupText(o) {
  if (!o) return g.swung ? "空振り!" : "見逃し";
  switch (o.kind) {
    case "hr": return "ホームラン!!";
    case "foul": return "ファウル";
    case "hit": return "ヒット";
  }
  return "";
}

function endPitch() {
  // 1球ぶんの結果が確定した後の進行
  if (g.hr >= g.stage.target) return finishStage(true);
  if (g.pitchesLeft <= 0) return finishStage(false);
  g.phase = "windup"; g.t = 0;
  setupPitch();
}

function finishStage(cleared) {
  var st = g.stage, idx = g.idx, bonus = 0, first = false;
  if (cleared) {
    first = !save.cleared[idx];
    bonus = first ? 50 * (idx + 1) : Math.round(50 * (idx + 1) * 0.3);
    save.cleared[idx] = true;
  }
  var total = g.points + bonus;
  if (g.hr > save.best[idx]) save.best[idx] = g.hr;
  save.coins += total;
  saveGame();
  resultInfo = { idx: idx, cleared: cleared, hr: g.hr, target: st.target, coins: total, points: g.points, bonus: bonus, first: first,
                 allClear: cleared && idx === STAGES.length - 1 };
  if (cleared) sfx.clear(); else sfx.fail();
  go("result");
}

function updateBatting(dt) {
  g.t += dt;
  // --- スイングは時間だけで終わる(ポインタ/キーのイベントには一切依存しない) ---
  if (g.swingT !== null) {
    g.swingT += dt;
    if (g.swingT >= SWING_DUR) g.swingT = null;
  }
  // --- キーボードでバットを動かす ---
  var sp = 360 * dt;
  if (keysDown.ArrowLeft)  aimTarget.x = clamp(aimTarget.x - sp, ZONE.x0, ZONE.x1);
  if (keysDown.ArrowRight) aimTarget.x = clamp(aimTarget.x + sp, ZONE.x0, ZONE.x1);
  if (keysDown.ArrowUp)    aimTarget.y = clamp(aimTarget.y - sp, ZONE.y0, ZONE.y1);
  if (keysDown.ArrowDown)  aimTarget.y = clamp(aimTarget.y + sp, ZONE.y0, ZONE.y1);
  if (g.swingT === null) { aim.x = aimTarget.x; aim.y = aimTarget.y; }
  if (g.hitFlash > 0) g.hitFlash = Math.max(0, g.hitFlash - dt);

  switch (g.phase) {
    case "intro":
      if (g.t >= 0.7) { g.phase = "windup"; g.t = 0; setupPitch(); }
      break;
    case "windup":
      if (g.t >= g.windT) { g.phase = "pitch"; g.t = 0; g.pitchesLeft--; g.pitchNo++; sfx.pitch(); }
      break;
    case "pitch":
      if (g.t >= g.ballTime + PASS_T) {
        g.phase = "result"; g.t = 0; g.out = null;
        sfx.miss();
      }
      break;
    case "contact":
      if (g.t >= HITSTOP) startFlight();
      break;
    case "flight":
      if (g.t >= g.flight.dur) {
        var o = g.out;
        if (o.kind === "hr") {
          g.hr++; g.lastDist = o.dist;
          g.points += 10 + Math.max(0, Math.floor((o.dist - FENCE_M) / 10));
          g.hitFlash = 0.35;
        } else if (o.kind === "hit") {
          g.lastDist = o.dist;
        }
        g.phase = "result"; g.t = 0;
      }
      break;
    case "result":
      if (g.t >= (g.out && g.out.kind === "hr" ? 1.0 : 0.5)) endPitch();
      break;
  }
}

function update(dt) {
  time += dt;
  if (scene === "batting" && g) updateBatting(dt);
}

// ---------- ボタン / 入力 ----------
function button(id, x, y, w, h, label, action, opt) {
  opt = opt || {};
  var enabled = opt.enabled !== false;
  buttons.push({ id: id, x: x, y: y, w: w, h: h, action: action, enabled: enabled, deny: opt.deny });
  var focused = focusId === id;
  if (opt.render) {
    opt.render(x, y, w, h, focused, enabled);
  } else {
    ctx.save();
    ctx.fillStyle = enabled ? (opt.color || "#ff9ec4") : "#b9b9c8";
    roundRect(x, y, w, h, Math.min(14, h / 2)); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.fillStyle = enabled ? "#fff" : "#7d7d90";
    ctx.font = "bold " + (opt.size || 20) + "px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }
  if (focused) {
    ctx.save();
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffe14d";
    roundRect(x - 3, y - 3, w + 6, h + 6, Math.min(16, h / 2 + 3)); ctx.stroke();
    ctx.restore();
  }
}

function enabledButtons() {
  var r = [];
  for (var i = 0; i < buttons.length; i++) if (buttons[i].enabled) r.push(buttons[i]);
  return r;
}
function moveFocus(dir) {
  var list = enabledButtons();
  if (!list.length) return;
  var cur = -1;
  for (var i = 0; i < list.length; i++) if (list[i].id === focusId) cur = i;
  if (cur < 0) cur = dir > 0 ? -1 : 0;
  cur = (cur + dir + list.length) % list.length;
  focusId = list[cur].id;
  sfx.click();
}
function activate(b) {
  if (!b) return;
  if (!b.enabled) { sfx.deny(); return; }
  sfx.click();
  b.action();
}
function activateFocused() {
  var list = enabledButtons();
  for (var i = 0; i < list.length; i++) if (list[i].id === focusId) return activate(list[i]);
  if (list.length) activate(list[0]);
}

function toggleMute() { save.mute = !save.mute; saveGame(); if (!save.mute) { initAudio(); sfx.click(); } }

function goBack() {
  if (scene === "stageSelect") go("title");
  else if (scene === "status" || scene === "batting" || scene === "result") go("stageSelect");
}

function toLogical(e) {
  var r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
function hitButton(p) {
  for (var i = buttons.length - 1; i >= 0; i--) {
    var b = buttons[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}

// スイングはポインタを離したかどうかに関係なく時間で終わるので、
// pointerup / pointercancel / setPointerCapture は使わない。
canvas.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  initAudio();
  var p = toLogical(e);
  var b = hitButton(p);
  if (b) { focusId = b.id; activate(b); return; }
  if (scene === "batting") { setAimTarget(p); doSwing(); }
  else if (scene === "title") { sfx.click(); go("stageSelect"); }
});
canvas.addEventListener("pointermove", function (e) {
  var p = toLogical(e);
  if (scene === "batting") setAimTarget(p);
  if (e.pointerType === "touch") return;
  var b = hitButton(p);
  canvas.style.cursor = b && b.enabled ? "pointer" : (scene === "batting" ? "crosshair" : "default");
  if (b && b.enabled && scene !== "batting") focusId = b.id;
});
canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

function releaseAll() {
  keysDown = {};
  if (g) g.swingT = null;
}
window.addEventListener("blur", releaseAll);
document.addEventListener("visibilitychange", function () { if (document.hidden) releaseAll(); });

window.addEventListener("keydown", function (e) {
  var k = e.code || e.key;
  if (scene === "batting" && (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown")) {
    e.preventDefault(); keysDown[k] = true; return;
  }
  if (e.repeat) return;
  initAudio();
  if (k === "Space" || k === "Enter" || k === "NumpadEnter") {
    e.preventDefault();
    if (scene === "batting") doSwing(); else activateFocused();
  } else if (k === "ArrowDown" || k === "ArrowRight") {
    e.preventDefault(); if (scene !== "batting") moveFocus(1);
  } else if (k === "ArrowUp" || k === "ArrowLeft") {
    e.preventDefault(); if (scene !== "batting") moveFocus(-1);
  } else if (k === "Escape") {
    e.preventDefault(); goBack();
  } else if (k === "KeyM") {
    toggleMute();
  }
});
window.addEventListener("keyup", function (e) {
  delete keysDown[e.code || e.key];
});

// ---------- 描画ユーティリティ ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function text(str, x, y, size, color, align, stroke, maxW) {
  ctx.save();
  ctx.font = "bold " + size + "px " + FONT;
  ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.strokeText(str, x, y, maxW); }
  ctx.fillStyle = color || "#fff";
  ctx.fillText(str, x, y, maxW);
  ctx.restore();
}
function circle(x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}

// 観客(固定の見た目)
var crowd = [];
(function () {
  var cols = ["#ffb3c1", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff"];
  for (var r = 0; r < 3; r++) {
    for (var i = 0; i < 44; i++) {
      crowd.push({ x: i * 19 + (r % 2) * 9, y: 84 + r * 14, c: cols[(i * 3 + r * 5) % cols.length] });
    }
  }
})();

function drawField(withCrowd, cheer) {
  var sky = ctx.createLinearGradient(0, 0, 0, 130);
  sky.addColorStop(0, "#7fd0ff"); sky.addColorStop(1, "#d9f3ff");
  ctx.fillStyle = sky; ctx.fillRect(0, -60, W, 190);
  // くも
  circle(120, 30, 16, "rgba(255,255,255,0.9)"); circle(140, 34, 20, "rgba(255,255,255,0.9)"); circle(162, 32, 14, "rgba(255,255,255,0.9)");
  circle(600, 24, 14, "rgba(255,255,255,0.9)"); circle(618, 28, 18, "rgba(255,255,255,0.9)");
  // スタンド
  ctx.fillStyle = "#8f86c9"; ctx.fillRect(0, 70, W, 60);
  if (withCrowd) {
    for (var i = 0; i < crowd.length; i++) {
      var c = crowd[i];
      var dy = cheer ? -Math.abs(Math.sin(time * 9 + i * 0.7)) * 6 : Math.sin(time * 3 + i) * 0.8;
      circle(c.x, c.y + dy, 6, c.c);
    }
  }
  // フェンス
  ctx.fillStyle = "#3f8f5a"; ctx.fillRect(0, 118, W, 18);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 118, W, 3);
  text(FENCE_M + "m", 400, 127, 11, "#fff");
  // 芝
  var gr = ctx.createLinearGradient(0, 136, 0, H);
  gr.addColorStop(0, "#6fcf7f"); gr.addColorStop(1, "#4aa860");
  ctx.fillStyle = gr; ctx.fillRect(0, 136, W, H - 136 + 60);
  for (var s = 0; s < 8; s++) {
    ctx.fillStyle = s % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
    ctx.fillRect(0, 136 + s * 40, W, 40);
  }
  // 土のあと
  ctx.fillStyle = "#d9a875";
  ctx.beginPath(); ctx.ellipse(400, 392, 150, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(400, 205, 38, 12, 0, 0, Math.PI * 2); ctx.fill();
  // ホームベース
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(386, 380); ctx.lineTo(414, 380); ctx.lineTo(414, 387); ctx.lineTo(400, 396); ctx.lineTo(386, 387); ctx.closePath(); ctx.fill();
}

// ふつうの人物(丸い頭 + 帽子 + ユニフォーム)
// o: { cap, uni, skin, pants }
function drawPerson(x, y, s, o) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // 影
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  // 足
  ctx.fillStyle = o.pants;
  roundRect(-11, -34, 9, 32, 4); ctx.fill();
  roundRect(2, -34, 9, 32, 4); ctx.fill();
  ctx.fillStyle = "#444";
  roundRect(-14, -5, 13, 6, 3); ctx.fill();
  roundRect(1, -5, 13, 6, 3); ctx.fill();
  // 体
  ctx.fillStyle = o.uni;
  roundRect(-16, -66, 32, 38, 10); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(-16, -42, 32, 4);
  // 頭
  circle(0, -80, 15, o.skin);
  // 帽子
  ctx.fillStyle = o.cap;
  ctx.beginPath(); ctx.arc(0, -82, 16, Math.PI, 0); ctx.closePath(); ctx.fill();
  roundRect(-2, -86, 22, 5, 2); ctx.fill();
  // 顔
  circle(-6, -78, 2, "#333"); circle(6, -78, 2, "#333");
  circle(-10, -73, 3, "rgba(255,120,140,0.5)"); circle(10, -73, 3, "rgba(255,120,140,0.5)");
  ctx.strokeStyle = "#a33"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, -74, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

var BAT_LEN = 62;
// バッターの体は左の定位置に固定。バットの位置(ax, ay)に合わせて少しだけうろうろする。
function drawBatter(ax, ay, swingT) {
  var bodyX = 285 + (ax - ZONE.x0) * 0.3 + (ay - ZONE_Y) * 0.1;
  drawPerson(bodyX, 412, 1.0, { cap: "#ff6f91", uni: "#ff9ec4", skin: "#ffe0bd", pants: "#fff" });
  drawBat(bodyX + 8, 360, ax - 47, ay, swingT);
}
// 角度: -110度(構え) -> 0度(ボールの位置を通る, swingT=CONTACT_SW) -> 70度(振り抜き)
function drawBat(sx, sy, px, py, swingT) {
  var ang;
  if (swingT === null) {
    ang = -110 + Math.sin(time * 4) * 2;
  } else if (swingT < CONTACT_SW) {
    var a = swingT / CONTACT_SW;
    ang = -110 + 110 * (a * a);
  } else {
    var b = Math.min(1, (swingT - CONTACT_SW) / (SWING_DUR - CONTACT_SW));
    ang = 70 * (1 - Math.pow(1 - b, 2));
  }
  ang = ang * Math.PI / 180;
  // うで
  ctx.save();
  ctx.strokeStyle = "#ffe0bd"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke();
  ctx.translate(px, py); ctx.rotate(ang);
  // バット
  ctx.strokeStyle = "#c98b4d"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(BAT_LEN, 0); ctx.stroke();
  // スイートスポット(緑): ミートで広がる
  var gh = greenHalfU(save.levels.meet);
  ctx.strokeStyle = "#3ddc60"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(BAT_LEN * (GREEN_C - gh), 0); ctx.lineTo(BAT_LEN * (GREEN_C + gh), 0); ctx.stroke();
  ctx.restore();
}

function drawPitcher(x, y, s, wind) {
  drawPerson(x, y, s, { cap: "#4aa3ff", uni: "#9bd1ff", skin: "#f5cfa0", pants: "#e8f1ff" });
  // 腕: 投球前は頭上へ、リリースで前へ
  var a = -Math.PI / 2 + (wind < 1 ? -0.4 + wind * 0.4 : 0.7 * Math.min(1, (wind - 1) * 6));
  ctx.save();
  ctx.translate(x + 14 * s, y - 60 * s);
  ctx.rotate(a);
  ctx.strokeStyle = "#f5cfa0"; ctx.lineWidth = 6 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24 * s, 0); ctx.stroke();
  ctx.restore();
}

function drawBall(x, y, r) {
  circle(x + 1, y + 1, r, "rgba(0,0,0,0.2)");
  circle(x, y, r, "#fff");
  ctx.strokeStyle = "#e0524d"; ctx.lineWidth = Math.max(1, r / 5);
  ctx.beginPath(); ctx.arc(x, y, r * 0.65, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.65, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
}

// 投球中のボールの位置。手前に来るほど速く見える(p^1.6)
function ballAt(pitchT) {
  var T = g.ballTime, p = pitchT / T;
  if (p > 1) {
    var ex = Math.min(1, (pitchT - T) / PASS_T);
    return { x: g.bx, y: g.by + 28 * ex, r: 13 - ex, a: 1, sx: g.bx, sy: 400 };
  }
  var e = Math.pow(p, 1.6);
  var tgt = g.by - (g.type === "drop" ? 60 : 0);
  var x = 404 + (g.bx - 404) * e;
  var line = 160 + (tgt - 160) * e;
  var gy = 165 + (400 - 165) * e;      // その奥行きでの地面の高さ
  var y = line;
  if (g.type === "bounce") {
    if (p < 0.55) {
      var s1 = p / 0.55;
      y = line + (gy - line) * s1 * s1;
    } else {
      var s2 = (p - 0.55) / 0.45;
      y = gy + (line - gy) * Math.sqrt(s2);
    }
  } else if (g.type === "drop" && p > 0.65) {
    var s3 = (p - 0.65) / 0.35;
    y = line + 60 * s3 * s3;
  }
  var a = (g.type === "vanish" && p > 0.45 && p < 0.78) ? 0 : 1;
  return { x: x, y: y, r: 3 + 10 * e, a: a, sx: x, sy: gy };
}

function drawMute() {
  button("mute", 726, 8, 66, 30, "", toggleMute, {
    render: function (x, y, w, h, f) {
      ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(x, y, w, h, 15); ctx.fill();
      text(save.mute ? "おと:OFF" : "おと:ON", x + w / 2, y + h / 2 + 1, 13, "#6a5acd");
    }
  });
}

// ---------- 各画面 ----------
function drawTitle() {
  drawField(true);
  drawPitcher(400, 215, 0.7, 0);
  drawPerson(300, 400, 1.3, { cap: "#ff6f91", uni: "#ff9ec4", skin: "#ffe0bd", pants: "#fff" });
  ctx.fillStyle = "rgba(255,255,255,0.78)"; roundRect(150, 40, 500, 140, 28); ctx.fill();
  text("サークルゲーム", 400, 68, 20, "#ff6f91");
  text("ホームランダービー", 400, 118, 48, "#ffffff", "center", "#ff6f91");
  text("バットを動かして、緑のところに当ててホームラン!", 400, 160, 17, "#6a5acd", "center", null, 470);
  button("start", 290, 236, 220, 56, "スタート!", function () { go("stageSelect"); }, { size: 28, color: "#ff6f91" });
  button("reset", 322, 304, 156, 30, "データを消す", resetData, { size: 14, color: "#9a8fd1" });
  text("マウス / タップ / 矢印キーでバットを動かして、クリック / スペースでスイング", 400, 360, 14, "#fff", "center", "rgba(0,0,0,0.35)", 700);
  drawMute();
}

function resetData() {
  var ok = true;
  try { ok = window.confirm("セーブデータを全部消しますか?\n(クリア状況・ポイント・ステータスが元に戻ります)"); } catch (e) { ok = true; }
  if (!ok) return;
  save = defaultSave();
  try { window.localStorage.removeItem(SAVE_KEY); } catch (e) {}
  statusMsg = "";
}

function drawBackdropSoft(c1, c2) {
  var gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  for (var i = 0; i < 14; i++) {
    circle((i * 137) % W, (i * 71 + Math.sin(time + i) * 6) % H, 18 + (i % 4) * 8, "rgba(255,255,255,0.12)");
  }
}

function drawStageSelect() {
  drawBackdropSoft("#bde7ff", "#ffd9ec");
  text("ステージえらび", 400, 36, 32, "#fff", "center", "#ff6f91");
  text("ポイント: " + save.coins, 20, 36, 20, "#a0680a", "left");
  for (var i = 0; i < STAGES.length; i++) {
    (function (i) {
      var st = STAGES[i];
      var col = i % 4, row = Math.floor(i / 4);
      var x = 17 + col * 195, y = 68 + row * 148, w = 180, h = 136;
      var un = isUnlocked(i);
      button("stage" + i, x, y, w, h, "", function () { startStage(i); }, {
        enabled: un, deny: true,
        render: function (x, y, w, h, f, en) {
          ctx.fillStyle = en ? "#fff" : "#cfcfdc"; roundRect(x, y, w, h, 18); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = en ? "#ff9ec4" : "#a8a8b8"; ctx.stroke();
          text("ステージ " + (i + 1), x + 12, y + 20, 14, en ? "#ff6f91" : "#8a8a9a", "left");
          if (save.cleared[i]) text("★クリア", x + w - 10, y + 20, 14, "#e0a100", "right");
          text(st.name, x + w / 2, y + 50, 16, en ? "#4a3f8f" : "#8a8a9a", "center", null, w - 16);
          text("球数 " + st.pitches + "  目標HR " + st.target, x + w / 2, y + 80, 14, en ? "#555" : "#8a8a9a", "center", null, w - 16);
          if (en) {
            text("ベスト HR " + save.best[i], x + w / 2, y + 106, 14, "#888");
          } else {
            // かぎマーク
            ctx.fillStyle = "#8a8a9a"; roundRect(x + w / 2 - 14, y + 94, 28, 22, 4); ctx.fill();
            ctx.strokeStyle = "#8a8a9a"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x + w / 2, y + 94, 9, Math.PI, 0); ctx.stroke();
            text("前のステージをクリア", x + w / 2, y + 124, 11, "#777");
          }
        }
      });
    })(i);
  }
  button("status", 40, 378, 230, 52, "ステータス", function () { statusMsg = ""; go("status"); }, { size: 26, color: "#6a8cff" });
  button("back", 530, 378, 230, 52, "タイトルへ", function () { go("title"); }, { size: 22, color: "#9a8fd1" });
  drawMute();
}

function drawStatus() {
  drawBackdropSoft("#fff3c4", "#ffd9ec");
  text("ステータス", 400, 36, 32, "#fff", "center", "#ff9a3c");
  text("ポイント: " + save.coins, 20, 36, 22, "#a0680a", "left");
  for (var i = 0; i < STATS.length; i++) {
    (function (i) {
      var s = STATS[i], lv = save.levels[s.key];
      var y = 68 + i * 138;
      ctx.fillStyle = "rgba(255,255,255,0.9)"; roundRect(30, y, 740, 124, 18); ctx.fill();
      text(s.name, 50, y + 30, 32, "#ff6f91", "left");
      text("Lv " + lv + (lv >= MAX_LV ? " (MAX)" : ""), 190, y + 30, 26, "#4a3f8f", "left");
      for (var k = 0; k < MAX_LV; k++) {
        ctx.fillStyle = k < lv ? "#ffb347" : "#e5e1f0";
        roundRect(50 + k * 38, y + 58, 32, 20, 5); ctx.fill();
      }
      text(effectText(s.key, lv), 50, y + 100, 18, "#555", "left");
      var cost = upgradeCost(lv), can = lv < MAX_LV && save.coins >= cost;
      button("up" + i, 560, y + 20, 190, 84, lv >= MAX_LV ? "MAX" : "強化 " + cost + "pt", function () { upgrade(s.key); },
             { enabled: can, size: 26, color: "#6a8cff" });
    })(i);
  }
  if (statusMsg) text(statusMsg, 400, 360, 16, "#d6336c");
  button("back", 300, 386, 200, 48, "もどる", function () { go("stageSelect"); }, { size: 22, color: "#9a8fd1" });
  drawMute();
}

function effectText(key, lv) {
  if (key === "power") return "飛距離 +" + (lv * 4) + "%  (1上げるごとに +4%)";
  return "グリーン +" + (lv * 6) + "%  (1上げるごとに +6%) / バットの届く高さも少し広がる";
}

function upgrade(key) {
  var lv = save.levels[key];
  if (lv >= MAX_LV) return;
  var cost = upgradeCost(lv);
  if (save.coins < cost) { statusMsg = "ポイントがたりないよ"; return; }
  save.coins -= cost;
  save.levels[key] = lv + 1;
  saveGame();
  statusMsg = "";
  sfx.clear();
}

function drawBatting() {
  var st = g.stage;
  var hrNow = g.out && g.out.kind === "hr" && (g.phase === "flight" || g.phase === "result");
  // カメラ: ホームランの打球を追って、背景が上にスクロールする
  var cam = 0;
  if (g.out && g.out.kind === "hr") {
    if (g.phase === "flight") cam = 28 * Math.min(1, g.t / g.flight.dur);
    else if (g.phase === "result") cam = 28 * Math.max(0, 1 - g.t / 0.6);
  }
  ctx.save();
  ctx.translate(0, cam);
  drawField(true, hrNow);
  ctx.restore();

  // ストライクゾーン
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.strokeRect(PLATE.x - 32, ZONE_Y - 34, 64, 68);
  ctx.restore();

  // ピッチャー
  var wind = 0;
  if (g.phase === "windup") wind = g.t / g.windT;
  else if (g.phase === "pitch" || g.phase === "contact") wind = 1 + g.t;
  else if (g.phase === "flight" || g.phase === "result") wind = 2;
  drawPitcher(400, 205, 0.7, wind);

  // ボール
  if (g.phase === "pitch") {
    var b = ballAt(g.t);
    circle(b.sx, b.sy, Math.max(2, b.r * 0.9), "rgba(0,0,0,0.18)");   // 地面の影(消える球でも見える)
    if (b.a > 0) drawBall(b.x, b.y, b.r);
  } else if (g.phase === "windup") {
    drawBall(404, 163, 3);
  } else if (g.phase === "contact") {
    drawBall(g.bx, g.by, 13);
    drawSparks(g.bx, g.by, g.t / HITSTOP);
  } else if (g.phase === "result" && !g.out) {
    var bb = ballAt(g.ballTime + PASS_T);
    drawBall(bb.x, bb.y, bb.r);
  }

  // 打球
  if (g.phase === "flight") {
    var f = g.flight, q = Math.min(1, g.t / f.dur);
    var fx = g.bx + f.dx * q;
    var fy = g.by + (f.endY - g.by) * q - f.arc * Math.sin(Math.PI * q);
    var fr = 12 * (1 - q) + f.endSize * q;
    drawBall(fx, fy, fr);
    if (g.t < 0.25) drawSparks(g.bx, g.by, 1 + g.t * 4);
  }

  drawBatter(aim.x, aim.y, g.swingT);

  // ポップアップ
  var showPop = false, txt = "", sub = "", sub2 = "";
  if (g.phase === "flight" && g.t > g.flight.dur * 0.5) showPop = true;
  if (g.phase === "result") showPop = true;
  if (g.phase === "flight" || (g.phase === "result" && g.out)) {
    txt = popupText(g.out);
    if (g.out.kind === "hr" || g.out.kind === "hit") sub = "飛距離 " + g.out.dist + "m";
    if (g.out.kind === "hr" && g.out.just) sub2 = "ジャストミート!";
  } else if (g.phase === "result") {
    txt = popupText(null);
  }
  if (g.phase === "intro") { showPop = true; txt = "プレイボール!"; }
  if (showPop) {
    var sc = 1 + Math.max(0, 0.3 - g.t) * 1.2;
    ctx.save();
    ctx.translate(400, 250); ctx.scale(sc, sc);
    var hr = g.out && g.out.kind === "hr";
    text(txt, 0, 0, hr ? 64 : 44, hr ? "#ffe14d" : "#ffffff", "center", hr ? "#ff3d6e" : "#4a3f8f");
    if (sub) text(sub, 0, 50, 30, "#ffffff", "center", "#4a3f8f");
    if (sub2) text(sub2, 0, 84, 24, "#ffe14d", "center", "#ff3d6e");
    ctx.restore();
  }
  // ホームランのフラッシュ
  if (g.hitFlash > 0) {
    ctx.fillStyle = "rgba(255,255,255," + (0.55 * g.hitFlash / 0.35) + ")";
    ctx.fillRect(0, 0, W, H);
  }

  // 初球だけ操作のヒント
  if (g.pitchNo <= 1 && g.phase !== "result" && g.phase !== "flight") {
    text("マウス/ゆびでバットを動かして、クリックでスイング! 緑のところに当てるととおくへ飛ぶ", 400, 438, 13, "#fff", "center", "rgba(0,0,0,0.6)", 780);
  }

  // HUD
  ctx.fillStyle = "rgba(255,255,255,0.88)"; roundRect(8, 8, 632, 46, 14); ctx.fill();
  text(st.name, 20, 22, 15, "#4a3f8f", "left", null, 190);
  text("ポイント " + (save.coins + g.points), 20, 42, 12, "#a0680a", "left");
  text("HR " + g.hr + " / " + st.target, 330, 30, 30, "#e08a00");
  text("のこり " + g.pitchesLeft + "球", 540, 30, 22, "#ff6f91");
  if (g.lastDist > 0) text("直近 " + g.lastDist + "m", 400, 146, 14, "#fff", "center", "rgba(0,0,0,0.5)");
  button("quit", 650, 8, 70, 30, "", function () { go("stageSelect"); }, {
    render: function (x, y, w, h) {
      ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(x, y, w, h, 15); ctx.fill();
      text("やめる", x + w / 2, y + h / 2 + 1, 14, "#6a5acd");
    }
  });
  drawMute();
}

function drawSparks(x, y, k) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,230,80," + Math.max(0, 1 - k * 0.5) + ")"; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (var i = 0; i < 10; i++) {
    var a = i * Math.PI / 5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (14 + k * 6), y + Math.sin(a) * (14 + k * 6));
    ctx.lineTo(x + Math.cos(a) * (24 + k * 14), y + Math.sin(a) * (24 + k * 14));
    ctx.stroke();
  }
  ctx.restore();
}

function drawResult() {
  drawBackdropSoft(resultInfo.cleared ? "#ffe9a8" : "#c9d3ee", resultInfo.cleared ? "#ffc4dd" : "#e6e0f5");
  var r = resultInfo, st = STAGES[r.idx];
  var batterOpt = { cap: "#ff6f91", uni: "#ff9ec4", skin: "#ffe0bd", pants: "#fff" };
  if (r.cleared) {
    text("ステージクリア!", 400, 80, 54, "#ffe14d", "center", "#ff6f91");
    drawPerson(400, 320, 1.4, batterOpt);
    for (var i = 0; i < 12; i++) {
      var a = time * 1.5 + i * 0.52;
      circle(400 + Math.cos(a) * (130 + (i % 3) * 20), 220 + Math.sin(a) * 60, 5, ["#ff6f91", "#ffd23f", "#6a8cff", "#3ddc60"][i % 4]);
    }
  } else {
    text("ざんねん…", 400, 80, 54, "#ffffff", "center", "#6a5acd");
    drawPerson(400, 320, 1.4, batterOpt);
  }
  text(st.name + "   ホームラン " + r.hr + " / " + r.target, 400, 130, 22, "#4a3f8f");
  text("もらったポイント: +" + r.coins + (r.bonus ? "  (クリアボーナス " + r.bonus + " 含む)" : ""), 400, 165, 22, "#a0680a", "center", null, 760);
  if (r.cleared && r.first && r.idx < STAGES.length - 1) text("次のステージが解放されたよ!", 400, 195, 18, "#d6336c");
  if (r.allClear) text("全ステージ制覇! おめでとう!", 400, 195, 22, "#d6336c");
  if (!r.cleared) text("ステータスを強化してもう一度!", 400, 195, 18, "#4a3f8f");
  button("retry", 120, 360, 250, 56, "もう一回", function () { startStage(r.idx); }, { size: 26, color: "#ff6f91" });
  button("select", 430, 360, 250, 56, "ステージ選択へ", function () { go("stageSelect"); }, { size: 22, color: "#6a8cff" });
  drawMute();
}

// ---------- メインループ ----------
function render() {
  buttons = [];
  ctx.clearRect(0, 0, W, H);
  if (scene === "title") drawTitle();
  else if (scene === "stageSelect") drawStageSelect();
  else if (scene === "status") drawStatus();
  else if (scene === "batting") drawBatting();
  else if (scene === "result") drawResult();
}
var last = 0;
function frame(ts) {
  var dt = last ? (ts - last) / 1000 : 0;
  last = ts;
  if (dt > 0.05) dt = 0.05;
  if (!paused) update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 動作確認用(ゲーム内では使わない)
window.__HRD = {
  STAGES: STAGES, classify: classify, loadSave: loadSave, upgradeCost: upgradeCost, SAVE_KEY: SAVE_KEY,
  state: function () { return { scene: scene, g: g, save: save, aim: aim, aimTarget: aimTarget }; },
  step: function (dt) { update(dt); },
  render: function () { render(); },
  go: go, startStage: startStage, doSwing: doSwing, upgrade: upgrade, resetData: resetData,
  setPaused: function (p) { paused = !!p; },
  setSave: function (s) { save = s; }
};
})();
