(function () {
"use strict";

// ============================================================
// ホームランダービー : ふつうの人が主人公のバッティングゲーム
// 画面はすべて 800x450 の canvas に描画します。
// ============================================================

var W = 800, H = 450;
var FONT = "'Hiragino Maru Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
var SAVE_KEY = "circleHRDerby.save.v1";
var MAX_LV = 10;
var FENCE_M = 90;

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

// ---------- ステージ ----------
// ballTime: 投球から捕手に届くまでの秒数 / curve: 変化球の横ブレ(px)
var STAGES = [
  { name: "はじめの公園",       pitches: 10, target: 3, ballTime: 1.40, curve: 0,  reward: 30 },
  { name: "商店街グラウンド",   pitches: 10, target: 4, ballTime: 1.25, curve: 0,  reward: 50 },
  { name: "学校のグラウンド",   pitches: 10, target: 5, ballTime: 1.15, curve: 20, reward: 80 },
  { name: "河川敷スタジアム",   pitches: 10, target: 5, ballTime: 1.05, curve: 35, reward: 120 },
  { name: "ドームスタジアム",   pitches: 9,  target: 5, ballTime: 0.95, curve: 50, reward: 180 },
  { name: "サークル決勝戦",     pitches: 9,  target: 6, ballTime: 0.85, curve: 65, reward: 260 }
];

var STATS = [
  { key: "power", name: "パワー",   desc: "ホームランの飛距離" },
  { key: "meet",  name: "ミート",   desc: "グリーンゾーンの広さ" },
  { key: "eye",   name: "選球眼",   desc: "ボールの見やすさ" }
];

// ---------- ゲーム数値(ステータスで変化する) ----------
function greenHalf(meet) { return 0.06 + 0.01 * meet; }           // 秒
function yellowHalf(meet) { return greenHalf(meet) * 2; }         // 秒
function outerHalf(meet)  { return greenHalf(meet) * 3.2; }       // 秒
function powerBase(power) { return 95 + 7 * power; }              // m
function eyeSlow(eye)     { return 1 + 0.025 * eye; }             // 球速の倍率(遅くなる)
function upgradeCost(lv)  { return 20 + 15 * lv; }

// d: スイング時刻 - 球が届く時刻(秒)。負=早い、正=遅い
// 判定は純関数。rnd は 0..1 の乱数関数。
function classify(d, meet, power, rnd) {
  var G = greenHalf(meet), Y = yellowHalf(meet), O = outerHalf(meet);
  var ad = Math.abs(d);
  if (ad <= G) {
    var dist = (powerBase(power)) * (1 - 0.3 * (ad / G)) + rnd() * 8;
    if (dist < FENCE_M + 1) dist = FENCE_M + 1;
    return { kind: "hr", dist: Math.round(dist) };
  }
  if (ad <= Y) {
    if (rnd() < 0.4) {
      return d < 0 ? { kind: "ground", dist: 25 + Math.round(rnd() * 30) }
                   : { kind: "fly", dist: 50 + Math.round(rnd() * 25) };
    }
    return { kind: "foul", side: d < 0 ? -1 : 1, dist: 20 + Math.round(rnd() * 40) };
  }
  if (ad <= O) {
    return d < 0 ? { kind: "ground", dist: 25 + Math.round(rnd() * 30) }
                 : { kind: "fly", dist: 40 + Math.round(rnd() * 30) };
  }
  return { kind: "miss" };
}

// ---------- セーブ ----------
function defaultSave() {
  var c = [], b = [];
  for (var i = 0; i < STAGES.length; i++) { c.push(false); b.push(0); }
  return { v: 1, coins: 0, cleared: c, best: b, levels: { power: 0, meet: 0, eye: 0 }, mute: false };
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
var sfx = {
  click: function () { beep(660, 0.07, "square", 0.05); },
  deny:  function () { beep(160, 0.12, "square", 0.06); },
  swing: function () { beep(300, 0.08, "sawtooth", 0.04); beep(200, 0.1, "sawtooth", 0.03, 0.05); },
  hit:   function () { beep(900, 0.06, "square", 0.1); },
  hr:    function () { beep(523, 0.15, "triangle", 0.12); beep(659, 0.15, "triangle", 0.12, 0.13); beep(784, 0.3, "triangle", 0.12, 0.26); },
  miss:  function () { beep(140, 0.25, "triangle", 0.08); },
  clear: function () { beep(523, 0.12, "triangle", 0.12); beep(659, 0.12, "triangle", 0.12, 0.12); beep(784, 0.12, "triangle", 0.12, 0.24); beep(1047, 0.3, "triangle", 0.12, 0.36); },
  fail:  function () { beep(300, 0.2, "triangle", 0.1); beep(220, 0.2, "triangle", 0.1, 0.2); beep(160, 0.35, "triangle", 0.1, 0.4); }
};

// ---------- 状態 ----------
var scene = "title";
var focusId = null;
var buttons = [];            // 直近の描画で登録されたボタン
var time = 0;                // 経過秒(アニメ用)
var g = null;                // バッティング中の状態
var resultInfo = null;
var statusMsg = "";

function go(name) { scene = name; focusId = null; }

function rnd() { return Math.random(); }

// ---------- バッティング ----------
var PLATE = { x: 400, y: 375 };
var SWING_DUR = 0.25, CONTACT_T = 0.15, PASS_T = 0.4;

function startStage(idx) {
  var st = STAGES[idx];
  g = {
    idx: idx, stage: st,
    pitchesLeft: st.pitches, hr: 0,
    phase: "intro", t: 0,
    swung: false, swingT: null, out: null,
    ballTime: 1, curveOff: 0, flight: null, popup: null
  };
  go("batting");
}

function setupPitch() {
  var st = g.stage;
  var base = st.ballTime * eyeSlow(save.levels.eye);
  g.ballTime = base * (0.95 + rnd() * 0.1);
  g.curveOff = 0;
  g.isCurve = false;
  if (st.curve > 0 && rnd() < 0.5) {
    g.isCurve = true;
    g.curveOff = st.curve * (rnd() < 0.5 ? -1 : 1);
  }
  g.swung = false; g.swingT = null; g.out = null; g.flight = null; g.popup = null;
}

function doSwing() {
  if (!g) return;
  // 何度でもスイング可。ただし直前のスイングが振り終わるまで(約0.2秒)は再スイング不可
  if (g.swingT !== null && g.swingT < 0.2) return;
  if (g.phase === "windup" || g.phase === "intro") {
    // 投げる前の空振り: この球のスイングは消費しない(また振れる)
    g.swingT = 0; g.wasted = true;
    sfx.swing();
    return;
  }
  if (g.phase !== "pitch") return;
  g.swung = true; g.swingT = 0; g.wasted = false;
  sfx.swing();
  var d = g.t - g.ballTime;
  var res = classify(d, save.levels.meet, save.levels.power, rnd);
  g.lastD = d;
  if (res.kind !== "miss") {
    g.out = res;
    g.phase = "contact"; g.t = 0;
  }
}

function startFlight() {
  var o = g.out, f;
  if (o.kind === "hr") {
    f = { dur: 1.6, dx: (rnd() - 0.5) * 420, endY: 55, arc: 70, endSize: 3 };
    sfx.hit(); sfx.hr();
  } else if (o.kind === "foul") {
    f = { dur: 1.0, dx: o.side * 420, endY: 300, arc: 150, endSize: 6 };
    sfx.hit();
  } else if (o.kind === "ground") {
    f = { dur: 0.9, dx: (rnd() - 0.5) * 240, endY: 255, arc: 14, endSize: 8 };
    sfx.hit();
  } else {
    f = { dur: 1.2, dx: (rnd() - 0.5) * 300, endY: 190, arc: 170, endSize: 5 };
    sfx.hit();
  }
  g.flight = f;
  g.phase = "flight"; g.t = 0;
}

function popupText(o) {
  if (!o) return g.swung ? "空振り!" : "見逃し";
  switch (o.kind) {
    case "hr": return "ホームラン!!";
    case "foul": return "ファウル";
    case "ground": return "ゴロ";
    case "fly": return "フライ";
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
  var st = g.stage, idx = g.idx, coins = 0, first = false;
  if (cleared) {
    first = !save.cleared[idx];
    coins = first ? st.reward : Math.round(st.reward * 0.3);
    save.cleared[idx] = true;
  } else {
    coins = 5 * g.hr;
  }
  if (g.hr > save.best[idx]) save.best[idx] = g.hr;
  save.coins += coins;
  saveGame();
  resultInfo = { idx: idx, cleared: cleared, hr: g.hr, target: st.target, coins: coins, first: first,
                 allClear: cleared && idx === STAGES.length - 1 };
  if (cleared) sfx.clear(); else sfx.fail();
  go("result");
}

function updateBatting(dt) {
  g.t += dt;
  if (g.swingT !== null) g.swingT = Math.min(g.swingT + dt, 1);
  switch (g.phase) {
    case "intro":
      if (g.t >= 0.9) { g.phase = "windup"; g.t = 0; setupPitch(); }
      break;
    case "windup":
      if (g.t >= 0.6) { g.phase = "pitch"; g.t = 0; g.pitchesLeft--; }
      break;
    case "pitch":
      if (g.t >= g.ballTime + PASS_T) {
        g.phase = "result"; g.t = 0; g.out = null;
        if (g.swung) sfx.miss();
      }
      break;
    case "contact":
      if (g.t >= CONTACT_T) startFlight();
      break;
    case "flight":
      if (g.t >= g.flight.dur) {
        if (g.out.kind === "hr") g.hr++;
        g.phase = "result"; g.t = 0;
      }
      break;
    case "result":
      if (g.t >= (g.out && g.out.kind === "hr" ? 1.2 : 0.9)) endPitch();
      break;
  }
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

canvas.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  initAudio();
  var p = toLogical(e);
  var b = hitButton(p);
  if (b) { focusId = b.id; activate(b); return; }
  if (scene === "batting") doSwing();
  else if (scene === "title") { sfx.click(); go("stageSelect"); }
});
canvas.addEventListener("pointermove", function (e) {
  if (e.pointerType === "touch") return;
  var b = hitButton(toLogical(e));
  canvas.style.cursor = b && b.enabled ? "pointer" : "default";
  if (b && b.enabled && scene !== "batting") focusId = b.id;
});
canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

window.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  var k = e.code || e.key;
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
function text(str, x, y, size, color, align, stroke) {
  ctx.save();
  ctx.font = "bold " + size + "px " + FONT;
  ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color || "#fff";
  ctx.fillText(str, x, y);
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

function drawField(withCrowd) {
  var sky = ctx.createLinearGradient(0, 0, 0, 130);
  sky.addColorStop(0, "#7fd0ff"); sky.addColorStop(1, "#d9f3ff");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 130);
  // くも
  circle(120, 30, 16, "rgba(255,255,255,0.9)"); circle(140, 34, 20, "rgba(255,255,255,0.9)"); circle(162, 32, 14, "rgba(255,255,255,0.9)");
  circle(600, 24, 14, "rgba(255,255,255,0.9)"); circle(618, 28, 18, "rgba(255,255,255,0.9)");
  // スタンド
  ctx.fillStyle = "#8f86c9"; ctx.fillRect(0, 70, W, 60);
  if (withCrowd) {
    for (var i = 0; i < crowd.length; i++) {
      var c = crowd[i];
      circle(c.x, c.y + Math.sin(time * 3 + i) * 0.8, 6, c.c);
    }
  }
  // フェンス
  ctx.fillStyle = "#3f8f5a"; ctx.fillRect(0, 118, W, 18);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 118, W, 3);
  text(FENCE_M + "m", 400, 127, 11, "#fff");
  // 芝
  var gr = ctx.createLinearGradient(0, 136, 0, H);
  gr.addColorStop(0, "#6fcf7f"); gr.addColorStop(1, "#4aa860");
  ctx.fillStyle = gr; ctx.fillRect(0, 136, W, H - 136);
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

function drawBatter(x, y, s, swingT) {
  drawPerson(x, y, s, { cap: "#ff6f91", uni: "#ff9ec4", skin: "#ffe0bd", pants: "#fff" });
  // バット: -110度(構え) -> 0度(ミート) -> 70度(振り抜き)
  var prog = 0;
  if (swingT !== null) prog = Math.min(1, swingT / SWING_DUR);
  var eased = 1 - Math.pow(1 - prog, 2);
  var ang = (-110 + 180 * eased) * Math.PI / 180;
  if (swingT === null) ang += Math.sin(time * 4) * 0.04;
  var px = x + 12 * s, py = y - 52 * s, len = 62 * s;
  ctx.save();
  ctx.translate(px, py); ctx.rotate(ang);
  // うで
  ctx.strokeStyle = "#ffe0bd"; ctx.lineWidth = 6 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-10 * s, 2 * s); ctx.lineTo(0, 0); ctx.stroke();
  // バット
  ctx.strokeStyle = "#c98b4d"; ctx.lineWidth = 6 * s;
  ctx.beginPath(); ctx.moveTo(-6 * s, 0); ctx.lineTo(len, 0); ctx.stroke();
  // スイートスポット(緑)
  ctx.strokeStyle = "#3ddc60"; ctx.lineWidth = 7 * s;
  ctx.beginPath(); ctx.moveTo(len * 0.62, 0); ctx.lineTo(len * 0.88, 0); ctx.stroke();
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

function drawBall(x, y, r, trail) {
  if (trail && trail.length) {
    for (var i = 0; i < trail.length; i++) {
      var tp = trail[i];
      ctx.globalAlpha = 0.35 * (1 - i / trail.length);
      circle(tp.x, tp.y, tp.r, "#ffffff");
    }
    ctx.globalAlpha = 1;
  }
  circle(x + 1, y + 1, r, "rgba(0,0,0,0.2)");
  circle(x, y, r, "#fff");
  ctx.strokeStyle = "#e0524d"; ctx.lineWidth = Math.max(1, r / 5);
  ctx.beginPath(); ctx.arc(x, y, r * 0.65, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.65, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
}

function ballAt(pitchT, ballTime, curveOff) {
  var p = pitchT / ballTime;
  if (p <= 1) {
    var e = p;
    return {
      x: 404 + (PLATE.x - 404) * e + curveOff * Math.sin(Math.PI * e),
      y: 160 + (PLATE.y - 160) * e,
      r: 3 + 10 * e
    };
  }
  var ex = Math.min(1, (pitchT - ballTime) / PASS_T);
  return { x: PLATE.x, y: PLATE.y + 28 * ex, r: 13 - 1 * ex };
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
  drawPitcher(400, 215, 0.6, 0);
  drawBatter(300, 400, 1.3, null);
  ctx.fillStyle = "rgba(255,255,255,0.78)"; roundRect(150, 40, 500, 140, 28); ctx.fill();
  text("サークルゲーム", 400, 68, 20, "#ff6f91");
  text("ホームランダービー", 400, 118, 48, "#ffffff", "center", "#ff6f91");
  text("タイミングを合わせてホームランを打とう!", 400, 160, 17, "#6a5acd");
  button("start", 290, 236, 220, 56, "スタート", function () { go("stageSelect"); }, { size: 28, color: "#ff6f91" });
  button("reset", 322, 304, 156, 30, "データを消す", resetData, { size: 14, color: "#9a8fd1" });
  text("クリック / タップ / スペースキーで遊べるよ", 400, 360, 14, "#fff", "center", "rgba(0,0,0,0.35)");
  drawMute();
}

function resetData() {
  var ok = true;
  try { ok = window.confirm("セーブデータを全部消しますか?\n(クリア状況・コイン・ステータスが元に戻ります)"); } catch (e) { ok = true; }
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
  text("コイン: " + save.coins, 20, 36, 20, "#a0680a", "left");
  for (var i = 0; i < STAGES.length; i++) {
    (function (i) {
      var st = STAGES[i];
      var col = i % 3, row = Math.floor(i / 3);
      var x = 40 + col * 250, y = 70 + row * 150, w = 230, h = 136;
      var un = isUnlocked(i);
      button("stage" + i, x, y, w, h, "", function () { startStage(i); }, {
        enabled: un, deny: true,
        render: function (x, y, w, h, f, en) {
          ctx.fillStyle = en ? "#fff" : "#cfcfdc"; roundRect(x, y, w, h, 18); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = en ? "#ff9ec4" : "#a8a8b8"; ctx.stroke();
          text("ステージ " + (i + 1), x + 14, y + 20, 15, en ? "#ff6f91" : "#8a8a9a", "left");
          if (save.cleared[i]) text("★クリア", x + w - 12, y + 20, 15, "#e0a100", "right");
          text(st.name, x + w / 2, y + 50, 19, en ? "#4a3f8f" : "#8a8a9a");
          text("球数 " + st.pitches + "  目標 HR " + st.target, x + w / 2, y + 82, 15, en ? "#555" : "#8a8a9a");
          if (en) {
            text("ベスト HR " + save.best[i], x + w / 2, y + 108, 14, "#888");
          } else {
            // かぎマーク
            ctx.fillStyle = "#8a8a9a"; roundRect(x + w / 2 - 14, y + 98, 28, 22, 4); ctx.fill();
            ctx.strokeStyle = "#8a8a9a"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x + w / 2, y + 98, 9, Math.PI, 0); ctx.stroke();
            text("前のステージをクリア", x + w / 2, y + 126, 11, "#777");
          }
        }
      });
    })(i);
  }
  button("status", 40, 380, 230, 50, "ステータス", function () { statusMsg = ""; go("status"); }, { size: 24, color: "#6a8cff" });
  button("back", 530, 380, 230, 50, "タイトルへ", function () { go("title"); }, { size: 22, color: "#9a8fd1" });
  drawMute();
}

function drawStatus() {
  drawBackdropSoft("#fff3c4", "#ffd9ec");
  text("ステータス", 400, 36, 32, "#fff", "center", "#ff9a3c");
  text("コイン: " + save.coins, 20, 36, 22, "#a0680a", "left");
  for (var i = 0; i < STATS.length; i++) {
    (function (i) {
      var s = STATS[i], lv = save.levels[s.key];
      var y = 70 + i * 100;
      ctx.fillStyle = "rgba(255,255,255,0.9)"; roundRect(30, y, 740, 88, 18); ctx.fill();
      text(s.name, 50, y + 24, 24, "#ff6f91", "left");
      text("Lv " + lv + (lv >= MAX_LV ? " (MAX)" : ""), 150, y + 24, 20, "#4a3f8f", "left");
      for (var k = 0; k < MAX_LV; k++) {
        ctx.fillStyle = k < lv ? "#ffb347" : "#e5e1f0";
        roundRect(50 + k * 26, y + 44, 22, 14, 4); ctx.fill();
      }
      text(effectText(s.key, lv), 50, y + 74, 14, "#555", "left");
      var cost = upgradeCost(lv), can = lv < MAX_LV && save.coins >= cost;
      button("up" + i, 590, y + 14, 160, 60, lv >= MAX_LV ? "MAX" : "強化 " + cost + "コイン", function () { upgrade(s.key); },
             { enabled: can, size: 18, color: "#6a8cff" });
    })(i);
  }
  if (statusMsg) text(statusMsg, 400, 392, 16, "#d6336c");
  button("back", 300, 400, 200, 40, "もどる", function () { go("stageSelect"); }, { size: 20, color: "#9a8fd1" });
  drawMute();
}

function effectText(key, lv) {
  if (key === "power") return "ホームランの飛距離: 約 " + powerBase(lv) + "m (Lv0 は 95m)";
  if (key === "meet") return "グリーンゾーン: ±" + Math.round(greenHalf(lv) * 1000) + "ミリ秒 (Lv0 は ±60)";
  return "ボールが " + (lv * 2.5) + "% ゆっくり + 軌跡が見える";
}

function upgrade(key) {
  var lv = save.levels[key];
  if (lv >= MAX_LV) return;
  var cost = upgradeCost(lv);
  if (save.coins < cost) { statusMsg = "コインがたりないよ"; return; }
  save.coins -= cost;
  save.levels[key] = lv + 1;
  saveGame();
  statusMsg = "";
  sfx.clear();
}

function drawBatting() {
  drawField(true);
  var st = g.stage;
  // ピッチャー
  var wind = 0;
  if (g.phase === "windup") wind = g.t / 0.6;
  else if (g.phase === "pitch" || g.phase === "contact") wind = 1 + g.t;
  else if (g.phase === "flight" || g.phase === "result") wind = 2;
  drawPitcher(400, 205, 0.6, wind);

  // ボール(投球中)
  if (g.phase === "pitch") {
    var b = ballAt(g.t, g.ballTime, g.curveOff);
    var trail = [];
    var n = save.levels.eye;
    for (var i = 1; i <= n; i++) {
      var tt = g.t - i * 0.035;
      if (tt < 0) break;
      var tb = ballAt(tt, g.ballTime, g.curveOff);
      trail.push(tb);
    }
    drawBall(b.x, b.y, b.r, trail);
  } else if (g.phase === "windup") {
    // 手に持っているボール
    drawBall(404, 160, 3, null);
  } else if (g.phase === "contact") {
    drawBall(PLATE.x, PLATE.y, 13, null);
  } else if (g.phase === "result" && !g.out) {
    var bb = ballAt(g.ballTime + PASS_T, g.ballTime, g.curveOff);
    drawBall(bb.x, bb.y, bb.r, null);
  }

  // 打球
  if (g.phase === "flight") {
    var f = g.flight, q = Math.min(1, g.t / f.dur);
    var fx = PLATE.x + f.dx * q;
    var fy = PLATE.y + (f.endY - PLATE.y) * q - f.arc * Math.sin(Math.PI * q);
    var fr = 12 * (1 - q) + f.endSize * q;
    drawBall(fx, fy, fr, null);
  }

  drawBatter(335, 412, 1.0, g.swingT);

  // タイミングバー(ストライクゾーンの下)
  drawTimingBar();

  // ポップアップ
  var showPop = false, txt = "", sub = "";
  if (g.phase === "flight" && g.t > g.flight.dur * 0.5) showPop = true;
  if (g.phase === "result") showPop = true;
  if (g.phase === "flight" || (g.phase === "result" && g.out)) {
    txt = popupText(g.out);
    if (g.out.kind === "hr" || g.out.kind === "fly" || g.out.kind === "ground") sub = "飛距離 " + g.out.dist + "m";
  } else if (g.phase === "result") {
    txt = popupText(null);
  }
  if (g.phase === "intro") { showPop = true; txt = "プレイボール!"; }
  if (showPop) {
    var sc = 1 + Math.max(0, 0.3 - g.t) * 1.2;
    ctx.save();
    ctx.translate(400, 250); ctx.scale(sc, sc);
    var hr = g.out && g.out.kind === "hr";
    text(txt, 0, 0, hr ? 64 : 46, hr ? "#ffe14d" : "#ffffff", "center", hr ? "#ff3d6e" : "#4a3f8f");
    if (sub) text(sub, 0, 52, 30, "#ffffff", "center", "#4a3f8f");
    ctx.restore();
  }

  // HUD
  ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(8, 8, 330, 62, 14); ctx.fill();
  text("ステージ" + (g.idx + 1) + " " + st.name, 20, 26, 16, "#4a3f8f", "left");
  text("のこり " + g.pitchesLeft + "球", 20, 52, 20, "#ff6f91", "left");
  text("HR " + g.hr + " / " + st.target, 190, 52, 22, "#e08a00", "left");
  button("quit", 650, 8, 70, 30, "", function () { go("stageSelect"); }, {
    render: function (x, y, w, h) {
      ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(x, y, w, h, 15); ctx.fill();
      text("やめる", x + w / 2, y + h / 2 + 1, 14, "#6a5acd");
    }
  });
  drawMute();
}

function drawTimingBar() {
  var meet = save.levels.meet;
  var O = outerHalf(meet), Y = yellowHalf(meet), G = greenHalf(meet);
  var cx = 400, hw = 190, y = 428, h = 16;
  var gw = hw * G / O, yw = hw * Y / O;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; roundRect(cx - hw - 4, y - 4, hw * 2 + 8, h + 8, 10); ctx.fill();
  ctx.fillStyle = "#ff8a8a"; ctx.fillRect(cx - hw, y, hw * 2, h);
  ctx.fillStyle = "#ffe066"; ctx.fillRect(cx - yw, y, yw * 2, h);
  ctx.fillStyle = "#3ddc60"; ctx.fillRect(cx - gw, y, gw * 2, h);
  if (g.phase === "pitch") {
    var d = g.t - g.ballTime;
    var mx = cx + hw * (d / O);
    if (mx >= cx - hw - 6 && mx <= cx + hw + 6) {
      mx = Math.max(cx - hw, Math.min(cx + hw, mx));
      ctx.fillStyle = "#fff"; ctx.fillRect(mx - 2, y - 6, 4, h + 12);
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.strokeRect(mx - 2, y - 6, 4, h + 12);
    }
  }
  text("スイング! (クリック / タップ / スペース)", 400, 417, 11, "#fff", "center", "rgba(0,0,0,0.5)");
}

function drawResult() {
  drawBackdropSoft(resultInfo.cleared ? "#ffe9a8" : "#c9d3ee", resultInfo.cleared ? "#ffc4dd" : "#e6e0f5");
  var r = resultInfo, st = STAGES[r.idx];
  if (r.cleared) {
    text("ステージクリア!", 400, 80, 54, "#ffe14d", "center", "#ff6f91");
    // よろこぶ人
    drawBatter(400, 300, 1.4, null);
    for (var i = 0; i < 12; i++) {
      var a = time * 1.5 + i * 0.52;
      circle(400 + Math.cos(a) * (130 + (i % 3) * 20), 200 + Math.sin(a) * 60, 5, ["#ff6f91", "#ffd23f", "#6a8cff", "#3ddc60"][i % 4]);
    }
  } else {
    text("ざんねん…", 400, 80, 54, "#ffffff", "center", "#6a5acd");
    drawBatter(400, 300, 1.4, null);
  }
  text(st.name + "   ホームラン " + r.hr + " / " + r.target, 400, 130, 22, "#4a3f8f");
  text("もらったコイン: +" + r.coins, 400, 165, 24, "#a0680a");
  if (r.cleared && r.first && r.idx < STAGES.length - 1) text("次のステージが解放されたよ!", 400, 195, 18, "#d6336c");
  if (r.allClear) text("全ステージ制覇! おめでとう!", 400, 195, 22, "#d6336c");
  if (!r.cleared) text("ステータスを強化してもう一度!", 400, 195, 18, "#4a3f8f");
  button("retry", 120, 360, 250, 56, "もう一回", function () { startStage(r.idx); }, { size: 26, color: "#ff6f91" });
  button("select", 430, 360, 250, 56, "ステージ選択へ", function () { go("stageSelect"); }, { size: 22, color: "#6a8cff" });
  drawMute();
}

// ---------- メインループ ----------
var last = 0;
function frame(ts) {
  var dt = last ? (ts - last) / 1000 : 0;
  last = ts;
  if (dt > 0.05) dt = 0.05;
  time += dt;
  if (scene === "batting") updateBatting(dt);
  buttons = [];
  ctx.clearRect(0, 0, W, H);
  if (scene === "title") drawTitle();
  else if (scene === "stageSelect") drawStageSelect();
  else if (scene === "status") drawStatus();
  else if (scene === "batting") drawBatting();
  else if (scene === "result") drawResult();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 動作確認用(ゲーム内では使わない)
window.CircleHR = { classify: classify, STAGES: STAGES, greenHalf: greenHalf, powerBase: powerBase, eyeSlow: eyeSlow, loadSave: loadSave, SAVE_KEY: SAVE_KEY };
})();
