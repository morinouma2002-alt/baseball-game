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

// ステージごとの見た目(バッター b / ピッチャー p)。どれもオリジナルの人物。
// skin 肌 / hair 髪 / jersey ユニフォーム / trim アクセント色 / cap ぼうし・ヘルメット / pants ズボン
// 小物: glasses めがね / freckles そばかす / stache ひげ / tail ポニーテール / band ぼうしの線 / eyeblack アイブラック
var LOOKS = [
  { b: { skin: "#f6d3b0", hair: "#5a3a2a", jersey: "#f7f4f5", trim: "#e8456f", cap: "#d63a63", pants: "#f2f0f2", num: "7" },
    p: { skin: "#f6d3b0", hair: "#6b4a2f", jersey: "#f4f6ff", trim: "#2f6fd0", cap: "#2a5fc0", pants: "#e6e9f2", num: "1" } },
  { b: { skin: "#f1c9a0", hair: "#2b2b33", jersey: "#fff3dc", trim: "#f08a1c", cap: "#e07a10", pants: "#fff7e8", num: "4", tail: true },
    p: { skin: "#e8b88a", hair: "#2b2b33", jersey: "#e9f7ea", trim: "#2e9c4f", cap: "#2e8a49", pants: "#eef6ee", num: "3", glasses: true } },
  { b: { skin: "#e8b88a", hair: "#7a4a1e", jersey: "#eaf3ff", trim: "#2f8fe0", cap: "#2f7fd0", pants: "#eef4fb", num: "10" },
    p: { skin: "#f1c9a0", hair: "#c0561e", jersey: "#fff0e0", trim: "#e0402a", cap: "#d63a2a", pants: "#fbeee2", num: "18", band: "#fff" } },
  { b: { skin: "#f6d3b0", hair: "#d8902a", jersey: "#f1ecff", trim: "#8a5ad8", cap: "#7a4ac8", pants: "#f3f0fb", num: "9", glasses: true },
    p: { skin: "#d9a97e", hair: "#2a2a2a", jersey: "#efe6ff", trim: "#7a4ac8", cap: "#6a3ab8", pants: "#ece6f7", num: "6", freckles: true } },
  { b: { skin: "#f1c9a0", hair: "#1f1f2a", jersey: "#f2f4f8", trim: "#1f3a7a", cap: "#1f3a7a", pants: "#eef0f5", num: "2", eyeblack: true },
    p: { skin: "#f6d3b0", hair: "#8a6a3a", jersey: "#f4f6fb", trim: "#c0213a", cap: "#1f3a7a", pants: "#e8ebf2", num: "11", glasses: true, band: "#c0213a" } },
  { b: { skin: "#d9a97e", hair: "#2a1f1a", jersey: "#eaf1ea", trim: "#2a6a4a", cap: "#245a3e", pants: "#eef3ee", num: "5", tail: true },
    p: { skin: "#e8b88a", hair: "#b8b8c0", jersey: "#e6efe9", trim: "#1f5a3a", cap: "#1f4a33", pants: "#e3ebe5", num: "21", stache: true } },
  { b: { skin: "#f6d3b0", hair: "#8a3ab8", jersey: "#2c2a3a", trim: "#c8a8ff", cap: "#4a3a7a", pants: "#3a3850", num: "13" },
    p: { skin: "#f1c9a0", hair: "#6a2aa0", jersey: "#35305a", trim: "#d8b8ff", cap: "#4a3a7a", pants: "#2e2b48", num: "0", tail: true, band: "#d8b8ff" } },
  { b: { skin: "#e8b88a", hair: "#2b2b33", jersey: "#fff0f0", trim: "#d82a2a", cap: "#222230", pants: "#f5eaea", num: "1", eyeblack: true },
    p: { skin: "#d9a97e", hair: "#1a1a1a", jersey: "#26262e", trim: "#e03a3a", cap: "#c82a2a", pants: "#2e2e38", num: "99", eyeblack: true, stache: true } }
];
// いま描くキャラの見た目: 打席中はそのステージ、それ以外(タイトルなど)は1ステージ目
function lookFor() {
  var i = (scene === "batting" && g) ? g.idx : 0;
  return LOOKS[i] || LOOKS[0];
}

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
  return { v: 2, coins: 0, cleared: c, best: b, levels: { power: 0, meet: 0 }, mute: false, sens: 1, bgm: 50, se: 80 };
}
// いどう感度(バット/バッターの動かしやすさ)。0.3〜3.0、0.1きざみ、ふつうは1.0
var SENS_MIN = 0.3, SENS_MAX = 3.0;
function clampSens(v) {
  v = Number(v);
  if (!isFinite(v)) return 1;
  return Math.round(Math.max(SENS_MIN, Math.min(SENS_MAX, v)) * 10) / 10;
}
// 音量(%)。0〜100、10きざみ
function clampVol(v) {
  v = Number(v);
  if (!isFinite(v)) return 50;
  return Math.round(Math.max(0, Math.min(100, v)) / 10) * 10;
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
    s.bgm = o.bgm === undefined ? 50 : clampVol(o.bgm);   // 古いセーブには無いので初期値(BGM 50% / SE 80%)
    s.se = o.se === undefined ? 80 : clampVol(o.se);
    s.sens = o.sens === undefined ? 1 : clampSens(o.sens);   // 古いセーブには無いのでふつう(1.0)
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
  if (save.mute || !actx || save.se <= 0) return;
  try {
    var t0 = actx.currentTime + (delay || 0);
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime((vol || 0.08) * save.se / 80, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* 音が出なくても続行 */ }
}
// ノイズ音(風切り音・歓声など)。freq はフィルタ中心周波数、sweep は終わりの周波数
function noiseBurst(dur, freq, vol, delay, sweep) {
  if (save.mute || !actx || save.se <= 0) return;
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
    gn.gain.setValueAtTime(vol * save.se / 80, t0);
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

// ---------- BGM(WebAudioで作る軽いループ。外部音源なし) ----------
// Cメジャーのやさしい8小節ループ。メロディ(三角波) + ベース(サイン波)
var BGM_MEL = [523, 659, 784, 659, 587, 698, 880, 698, 659, 784, 1047, 784, 698, 587, 523, 0];
var BGM_BASS = [131, 131, 175, 175, 196, 196, 131, 131];
var BGM_STEP = 0.3;
var bgmNext = 0, bgmIdx = 0;
function bgmNote(freq, t0, dur, type, vol) {
  var o = actx.createOscillator(), gn = actx.createGain();
  o.type = type; o.frequency.value = freq;
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(actx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
// 毎フレーム呼ぶ。少し先の音までを予約していく(最初のクリック/キー後に actx ができてから鳴る)
function bgmTick() {
  if (!actx || actx.state !== "running") return;
  if (save.mute || save.bgm <= 0 || !(scene === "title" || scene === "stageSelect" || scene === "options" || scene === "batting")) {
    bgmNext = 0; return;
  }
  try {
    var now = actx.currentTime;
    if (bgmNext < now) bgmNext = now + 0.05;
    var v = 0.07 * save.bgm / 100;
    while (bgmNext < now + 0.4) {
      var m = BGM_MEL[bgmIdx % BGM_MEL.length];
      if (m) bgmNote(m, bgmNext, BGM_STEP * 0.9, "triangle", v);
      if (bgmIdx % 2 === 0) bgmNote(BGM_BASS[(bgmIdx >> 1) % BGM_BASS.length], bgmNext, BGM_STEP * 1.8, "sine", v * 1.2);
      bgmNext += BGM_STEP; bgmIdx++;
    }
  } catch (e) { /* 音が出なくても続行 */ }
}
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
  sessionBest = 0;
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
  // 画面の位置を、狭いバット範囲に割り当てる。バッターは左固定。
  // 感度が高いほどポインタを少し動かしただけでバットが大きく動く(中心からの距離 x 感度)
  var sens = save.sens;
  var cx = (ZONE.x0 + ZONE.x1) / 2, cy = (ZONE.y0 + ZONE.y1) / 2;
  aimTarget.x = clamp(cx + (clamp(p.x / 800, 0, 1) - 0.5) * (ZONE.x1 - ZONE.x0) * sens, ZONE.x0, ZONE.x1);
  aimTarget.y = clamp(cy + (p.y - ZONE_Y) * sens, ZONE.y0, ZONE.y1);
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
  var sp = 360 * dt * save.sens;
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
        if (o.dist && (o.kind === "hr" || o.kind === "hit") && o.dist > sessionBest) sessionBest = o.dist;
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
  bgmTick();
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

var optionsFrom = "title";
function openOptions() { optionsFrom = scene; releaseAll(); go("options"); }
function changeVol(key, d) {
  var n = clampVol(save[key] + d);
  if (n === save[key]) return;
  save[key] = n; saveGame();
  if (key === "se") sfx.click();
}
function toggleMute() { save.mute = !save.mute; saveGame(); if (!save.mute) { initAudio(); sfx.click(); } }

function goBack() {
  if (scene === "stageSelect") go("title");
  else if (scene === "options") go(optionsFrom);
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

// ---------- 背景(球場): 一度だけ別のキャンバスに描いておき、毎フレームはそれを貼るだけ ----------
// 地面は1つの平面。地平線 HORIZON、ホームベース手前の奥行き Z0 から、
//   奥行き Z(インチ、ホームベース=0)・横 X → 画面 (400 + X*1.65*u, HORIZON + 317*u),  u = Z0 / (Z0 + Z)
// ピッチャーの足(Z=60.5ft)は y=214、ホームベースは y=388 になる。
var HORIZON = 71, Z0 = 596, PX = 1.65, PY = 317;
function gp(X, Z) { var u = Z0 / (Z0 + Z); return [400 + PX * X * u, HORIZON + PY * u]; }
function gpoly(c, pts) {
  c.beginPath();
  for (var i = 0; i < pts.length; i++) { var p = gp(pts[i][0], pts[i][1]); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
  c.closePath();
}
function gcircle(c, X, Z, r, n) {   // 地面の円(実寸 r インチ)
  var pts = [];
  for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push([X + r * Math.cos(a), Z + r * Math.sin(a)]); }
  gpoly(c, pts);
}
var BG_TOP = 70;   // 背景キャンバスは画面の上 BG_TOP px / 下 60px 余分に持つ(カメラ移動用)
var bgCanvas = null;
var FRONT_ROW_Y = 111;
var crowdFront = [];
(function () {
  var cols = ["#d98a8a", "#e0b48a", "#e6dc9a", "#9cc59a", "#8cc1cf", "#9a94cf", "#cf9cc4", "#e8e4dc"];
  for (var i = 0; i < 70; i++) crowdFront.push({ x: i * 11.6 + (i % 2) * 3, c: cols[(i * 5 + 3) % cols.length] });
})();

function buildBackground() {
  var cv = document.createElement("canvas");
  cv.width = W; cv.height = H + BG_TOP + 60;
  var c = cv.getContext("2d");
  c.translate(0, BG_TOP);
  var i, x, y, gr;
  // 空
  gr = c.createLinearGradient(0, -BG_TOP, 0, 115);
  gr.addColorStop(0, "#4f9fe0"); gr.addColorStop(0.65, "#9fd2f2"); gr.addColorStop(1, "#d6ecf6");
  c.fillStyle = gr; c.fillRect(0, -BG_TOP, W, 200);
  // やわらかい雲(ぼかした円を重ねる)
  var clouds = [[120, 34, 70, 14], [330, 22, 90, 12], [560, 40, 80, 14], [720, 18, 60, 10], [470, 66, 70, 9]];
  for (i = 0; i < clouds.length; i++) {
    var cl = clouds[i];
    for (var k = 0; k < 6; k++) {
      var cx = cl[0] + (k - 2.5) * cl[2] / 5, cy = cl[1] + ((k * 7) % 5 - 2) * 2, cr = cl[3] * (1.1 - Math.abs(k - 2.5) * 0.12) + 4;
      var rg = c.createRadialGradient(cx, cy, 0, cx, cy, cr * 1.7);
      rg.addColorStop(0, "rgba(255,255,255,0.55)"); rg.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, cr * 1.7, 0, Math.PI * 2); c.fill();
    }
  }
  // 照明塔
  for (i = 0; i < 2; i++) {
    var lx = i ? 700 : 100;
    c.fillStyle = "#6c7384"; c.fillRect(lx - 2, 28, 4, 60);
    c.fillStyle = "#4a5060"; c.fillRect(lx - 17, 14, 34, 18);
    c.fillStyle = "#f4f1d4";
    for (var ly = 0; ly < 2; ly++) for (var lc = 0; lc < 5; lc++) c.fillRect(lx - 15 + lc * 6.5, 16 + ly * 8, 4.5, 5.5);
  }
  // スタンド(うしろの屋根 / 上段 / 下段)
  c.fillStyle = "#5d6482"; c.fillRect(0, 58, W, 6);
  gr = c.createLinearGradient(0, 64, 0, 124);
  gr.addColorStop(0, "#7d7ba0"); gr.addColorStop(1, "#9a96b8");
  c.fillStyle = gr; c.fillRect(0, 64, W, 60);
  c.fillStyle = "rgba(40,40,70,0.25)"; c.fillRect(0, 92, W, 2);          // 通路
  // 観客(小さな点とブロック。ひかえめな色)
  var cols = ["#c98a95", "#cfae8c", "#d2cc98", "#93b896", "#86b3c2", "#938fc0", "#bd93b6", "#dcd8d0", "#7d86a8"];
  for (var row = 0; row < 5; row++) {
    var ry = 70 + row * 8 + (row >= 3 ? 4 : 0);
    for (i = 0; i < 100; i++) {
      x = i * 8.2 + (row % 2) * 4 + ((i * 7 + row * 3) % 3);
      c.fillStyle = cols[(i * 5 + row * 3 + ((i * i) % 4)) % cols.length];
      c.fillRect(x - 2.6, ry + 1, 5.2, 5);
      c.beginPath(); c.arc(x, ry, 2.2, 0, Math.PI * 2); c.fill();
    }
  }
  // 階段の通路(縦)
  c.fillStyle = "rgba(50,50,85,0.35)";
  for (i = 0; i < 9; i++) c.fillRect(i * 100 + 40, 64, 3, 60);
  // 手前のかげ
  gr = c.createLinearGradient(0, 100, 0, 124);
  gr.addColorStop(0, "rgba(40,40,70,0)"); gr.addColorStop(1, "rgba(40,40,70,0.35)");
  c.fillStyle = gr; c.fillRect(0, 100, W, 24);
  // スコアボード(オリジナル)
  c.fillStyle = "#223a2c"; c.fillRect(66, 62, 168, 52);
  c.fillStyle = "#e8e4d0"; c.fillRect(66, 62, 168, 2); c.fillRect(66, 112, 168, 2);
  c.fillStyle = "#14231a"; c.fillRect(72, 68, 156, 40);
  c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = "#e0e0d0";
  for (i = 0; i < 9; i++) { c.fillRect(82 + i * 16, 92, 12, 10); }
  c.fillStyle = "#14231a";
  for (i = 0; i < 9; i++) { c.fillRect(85 + i * 16, 95, 6, 4); }
  // フェンス(外野の壁): 濃い緑 + 上にクッション + 広告バナー
  c.fillStyle = "#1f4a35"; c.fillRect(0, 118, W, 24);
  c.fillStyle = "#f2c230"; c.fillRect(0, 116, W, 3);                 // ホームラン線(黄色)
  c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(0, 119, W, 2);
  var ads = [["#c2453d", "サークル"], ["#2f6fb0", "ホームラン"], ["#e0a030", "ダービー"], ["#3a8f68", "ベースボール"], ["#8a5ab0", "サークル"], ["#2f9fb0", "ホームラン"]];
  c.font = "bold 9px " + FONT;
  for (i = 0; i < 6; i++) {
    var ax = 6 + i * 133;
    if (i === 2 || i === 3) continue;
    c.fillStyle = ads[i][0]; c.fillRect(ax, 123, 120, 14);   // 文字なしの色つき看板
  }
  // 中央の距離表示
  c.fillStyle = "#f2f2e6"; c.fillRect(342, 121, 116, 18);
  c.fillStyle = "#1f4a35"; c.font = "bold 12px " + FONT; c.fillText(FENCE_M + " m", 400, 130.5);
  c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(0, 140, W, 2);
  // ウォーニングトラック(壁のまえの土)
  gr = c.createLinearGradient(0, 142, 0, 156);
  gr.addColorStop(0, "#9b7552"); gr.addColorStop(1, "#b08a63");
  c.fillStyle = gr; c.fillRect(0, 142, W, 14);
  // 外野の芝: 奥行きが等間隔の刈りあと(遠いほど細くなる)
  gr = c.createLinearGradient(0, 156, 0, H + 60);
  gr.addColorStop(0, "#4b9a52"); gr.addColorStop(1, "#58ab5a");
  c.fillStyle = gr; c.fillRect(0, 156, W, H + 60 - 156);
  var uTop = (156 - HORIZON) / PY, uBot = (H + 60 - HORIZON) / PY;
  var tTop = 1 / uTop, tBot = 1 / uBot, step = (tTop - tBot) / 13;
  for (i = 0; i < 13; i++) {
    if (i % 2) continue;
    var y0 = HORIZON + PY / (tTop - i * step), y1 = HORIZON + PY / (tTop - (i + 1) * step);
    c.fillStyle = "rgba(10,60,20,0.13)"; c.fillRect(0, y0, W, y1 - y0 + 0.5);
  }
  // 内野の土(1塁-3塁のあいだの扇形) + 中の芝のひし形
  var skin = [[0, -20]], tt, sx, sz;
  for (i = 0; i <= 48; i++) {
    tt = Math.PI * (1 - i / 48);
    sx = 1140 * Math.cos(tt); sz = 726 + 1140 * Math.sin(tt);
    if (Math.abs(sx) > sz) sx = sz * (sx < 0 ? -1 : 1);     // ファウルラインより外には土を出さない
    skin.push([sx, sz]);
  }  gpoly(c, skin);
  c.fillStyle = "#b98b62"; c.fill();
  // 内野の芝(ひし形: 本塁-1塁-2塁-3塁を内側へ縮めたもの)
  gpoly(c, [[0, 100], [642, 742], [0, 1385], [-642, 742]]);
  gr = c.createLinearGradient(0, 160, 0, 330);
  gr.addColorStop(0, "#5fae5d"); gr.addColorStop(1, "#6cbb66");
  c.fillStyle = gr; c.fill();
  // ホームのまわりの土の円(半径13ft) + バッターボックス周辺
  gcircle(c, 0, 0, 156, 48); c.fillStyle = "#b98b62"; c.fill();
  // 投手マウンド(半径9ft) と ピッチャーズプレート
  gcircle(c, 0, 726, 108, 40); c.fillStyle = "#c39a6f"; c.fill();
  gcircle(c, 0, 726, 60, 32); c.fillStyle = "#cfa77a"; c.fill();
  c.fillStyle = "#f4f1ea"; c.fillRect(395, 213, 10, 2.5);
  // 2塁ベース
  var b2 = gp(0, 1524);
  c.fillStyle = "#b98b62"; c.beginPath(); c.ellipse(b2[0], b2[1] + 1, 36, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#f4f1ea"; c.fillRect(b2[0] - 5, b2[1] - 3, 10, 3);
  // ファウルライン(白) と ホームベース・バッターボックスの白線
  c.lineCap = "butt";
  c.strokeStyle = "rgba(246,244,236,0.95)";
  var pl = gp(0, -8), fe;
  for (i = -1; i <= 1; i += 2) {
    fe = gp(i * 2064, 2064 - 8);
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(pl[0], pl[1]); c.lineTo(fe[0], fe[1]); c.stroke();
  }
  // バッターボックス(バッターの足元に合わせて描く: 画面の x 258..340, 奥行き y 378..417)
  c.lineWidth = 1.8; c.strokeStyle = "rgba(246,244,236,0.92)";
  c.beginPath(); c.moveTo(258, 417); c.lineTo(346, 417); c.lineTo(340, 377); c.lineTo(262, 377); c.closePath(); c.stroke();
  // ホームベース(平らな辺がピッチャー側)
  c.fillStyle = "rgba(0,0,0,0.18)";
  c.beginPath(); c.moveTo(385.5, 383.5); c.lineTo(414.5, 383.5); c.lineTo(414.5, 390); c.lineTo(400, 397); c.lineTo(385.5, 390); c.closePath(); c.fill();
  c.fillStyle = "#f6f4ec";
  c.beginPath(); c.moveTo(386, 382); c.lineTo(414, 382); c.lineTo(414, 388.5); c.lineTo(400, 395); c.lineTo(386, 388.5); c.closePath(); c.fill();
  // 手前の暗がり(画面の下にむかってやわらかく)
  gr = c.createLinearGradient(0, 380, 0, H + 60);
  gr.addColorStop(0, "rgba(20,30,20,0)"); gr.addColorStop(1, "rgba(20,30,20,0.22)");
  c.fillStyle = gr; c.fillRect(0, 380, W, H + 60 - 380);
  bgCanvas = cv;
}

function drawField(withCrowd, cheer) {
  if (!bgCanvas) buildBackground();
  ctx.drawImage(bgCanvas, 0, -BG_TOP);
  // 空の上にはみ出す分(カメラが下がったとき)
  ctx.fillStyle = "#4f9fe0"; ctx.fillRect(0, -BG_TOP - 60, W, 60);
  if (withCrowd) {
    // 最前列の観客(動く): 通常はゆらゆら / ホームランでは立ち上がって跳ねる
    for (var i = 0; i < crowdFront.length; i++) {
      var p = crowdFront[i];
      var dy = cheer ? -Math.abs(Math.sin(time * 9 + i * 0.7)) * 7 : Math.sin(time * 3 + i) * 0.6;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 3.4, FRONT_ROW_Y + 2 + dy, 6.8, 7 - dy);
      circle(p.x, FRONT_ROW_Y + dy, 3.1, p.c);
    }
    // フェンスの上端が最前列の足元をかくす
    ctx.fillStyle = "#f2c230"; ctx.fillRect(0, 116, W, 3);
  }
}

// ---------- 人物(実際の野球選手の体型: 約7頭身) ----------
var BAT_LEN = 96;
// 関節の長さは固定。うでは伸びず、ひじ・ひざが曲がって届かせる。
var ARM1 = 31, ARM2 = 29, LEG_L = 36, TORSO_L = 44, HIP_Y = 350;
function lerp(a, b, t) { return a + (b - a) * t; }
function ss(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function shade(hex, k) {   // "#rrggbb" を k 倍の明るさに
  var n = parseInt(hex.slice(1), 16);
  return "rgb(" + Math.round((n >> 16 & 255) * k) + "," + Math.round((n >> 8 & 255) * k) + "," + Math.round((n & 255) * k) + ")";
}
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
// 2関節IK。(px,py)から(tx,ty)へ、長さ l1,l2 は一定。ひじ/ひざは (prx,pry) 側へ曲げる。
// 遠すぎるときは手の位置のほうを届く範囲にそろえる(長さは変えない)。
function ik(px, py, tx, ty, l1, l2, prx, pry) {
  var dx = tx - px, dy = ty - py, d = Math.sqrt(dx * dx + dy * dy);
  var max = l1 + l2 - 0.01;
  if (d < 0.001) { dx = 0.001; dy = 0; d = 0.001; }
  if (d > max) { tx = px + dx / d * max; ty = py + dy / d * max; dx = tx - px; dy = ty - py; d = max; }
  var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  var h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  var ux = dx / d, uy = dy / d, mx = px + ux * a, my = py + uy * a;
  var e1x = mx - uy * h, e1y = my + ux * h, e2x = mx + uy * h, e2y = my - ux * h;
  var s1 = (e1x - px) * prx + (e1y - py) * pry, s2 = (e2x - px) * prx + (e2y - py) * pry;
  return s1 >= s2 ? { ex: e1x, ey: e1y, tx: tx, ty: ty } : { ex: e2x, ey: e2y, tx: tx, ty: ty };
}
function limb(x0, y0, x1, y1, x2, y2, w1, c1, w2, c2) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = c1; ctx.lineWidth = w1;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = c2; ctx.lineWidth = w2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
// 足: ふともも(ユニフォームのパンツ) + すね(すそ + ストッキング)
function drawLeg(hx, hy, kx, ky, fx, fy, lw, pants, sock) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = pants; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
  var mx = lerp(kx, fx, 0.3), my = lerp(ky, fy, 0.3);
  ctx.lineWidth = lw - 1.5;
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(mx, my); ctx.stroke();
  ctx.strokeStyle = sock; ctx.lineWidth = lw - 5;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(fx, fy); ctx.stroke();
}
function drawShoe(x, y, dir, col) {
  ctx.fillStyle = col;
  roundRect(dir > 0 ? x - 7 : x - 11, y - 5, 18, 7, 3); ctx.fill();
  ctx.fillStyle = "#ddd";
  ctx.fillRect(dir > 0 ? x - 7 : x - 11, y + 1, 18, 1.5);
}
function drawNumber(x, y, str, col, size) {
  ctx.fillStyle = col; ctx.font = "bold " + size + "px sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

// バッターの体は左の定位置に固定。バットの位置(ax, ay)に合わせて、体の傾きとバットの角度を変える
// (うでは伸ばさず、重心の移動・前傾・腰と肩の回転・バットの角度で高さや前後を表す)。
// swingT: null=構え / 数値=スイング中。CONTACT_SW でバットが(ax, ay)を通る。
function drawBatter(ax, ay, swingT) {
  var D = Math.PI / 180;
  var LK = lookFor().b;
  var skin = LK.skin, skinD = shade(LK.skin, 0.88), jersey = LK.jersey, trim = LK.trim, helmet = LK.cap;
  var pantsC = LK.pants, glove = "#34343f";
  // --- スイングの進み具合 w: 0=構え 1=ミートの瞬間 2=振り抜き ---
  var w = 0;
  if (swingT !== null) {
    if (swingT < CONTACT_SW) { var a = swingT / CONTACT_SW; w = a * a; }
    else { var b = Math.min(1, (swingT - CONTACT_SW) / (SWING_DUR - CONTACT_SW)); w = 1 + (1 - Math.pow(1 - b, 2)); }
  }
  var w1 = Math.min(w, 1), w2 = Math.max(0, w - 1);
  // 腰と肩のひねり(1付近=横向き 0=正面)。腰が先に回り、すこし遅れて肩が回る
  var rh = w <= 1 ? lerp(1.0, 0.0, ss(0, 0.7, w)) : lerp(0, -0.4, w2);
  var rs = w <= 1 ? lerp(1.1, 0.1, ss(0.25, 1, w)) : lerp(0.1, -0.5, w2);
  // --- 足は地面に固定(足は広げ、ひざを曲げる)。前足だけ踏み出して着地 ---
  // --- 体の位置・傾きは、バットの位置(ax, ay)でほんの少しだけ変える(うでは固定) ---
  var baseX = 322 + (ax - 395) * 0.5;                 // 体全体の重心の移動(足も一緒に動く)
  var fl = { x: baseX - 24, y: 412 - 5 * w2 }, fr = { x: baseX + 24 + 16 * w1, y: 412 - 12 * Math.sin(Math.PI * w1) };
  var hh = 9 * Math.cos(rh) + 2;
  var phi0 = 0.12 + 0.05 * (ax - 395) / 45 + 0.04 * (ay - 360) / 50;   // 上半身の傾き(数度だけ)
  // 体の姿勢: wv=0..1 のときの腰・肩の中心(手の位置の基準)
  function torsoAt(wv) {
    var hxx = baseX + 8 * wv, ph = phi0 + 0.08 * wv;
    return { hx: hxx, phi: ph, sx: hxx + TORSO_L * Math.sin(ph), sy: HIP_Y - TORSO_L * Math.cos(ph) };
  }
  var T = torsoAt(w1);
  var hx = T.hx + (w2 > 0 ? 2 : 0), phi = T.phi;
  var hlx = hx - hh, hrx = hx + hh;
  var sx = T.sx + (w2 > 0 ? 2 : 0), sy = T.sy;
  var hw = 17 * Math.cos(rs) + 2;
  var slx = sx - hw, srx = sx + hw;
  // --- 手(グリップ)は肩の中心から決まった位置に固定。バットはそこを軸に回るだけ ---
  var GRIP_DX = 22, GRIP_DY = 26;
  var BL = BAT_LEN * 1.15;                            // 見た目のバットの長さ(ゾーンのどこでも届くように)
  var Tc = torsoAt(1);                                // ミートの瞬間の体
  var gcx = Tc.sx + GRIP_DX, gcy = Tc.sy + GRIP_DY;
  var thc = Math.atan2(ay - gcy, ax - gcx);           // ミートの瞬間のバットの向き(必ず(ax,ay)を通る)
  var th0 = -112 * D + Math.sin(time * 4) * 0.03;
  var thf = thc + 100 * D;                            // 振り抜き: バットは背中側へ
  var gx = sx + GRIP_DX - 6 * w2, gy = sy + GRIP_DY - 8 * w2 + (swingT === null ? Math.sin(time * 4) * 0.8 : 0);
  var th = w <= 1 ? lerp(th0, thc, w) : lerp(thc, thf, w2);
  var dxb = Math.cos(th), dyb = Math.sin(th);

  function drawBatShape() {
    ctx.save();
    ctx.translate(gx, gy); ctx.rotate(th);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(BL * 0.3, 0); ctx.stroke();
    ctx.strokeStyle = "#c98b4d"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(BL * 0.3, 0); ctx.lineTo(BL, 0); ctx.stroke();
    var gh = greenHalfU(save.levels.meet);       // スイートスポット(緑): ミートで広がる
    ctx.strokeStyle = "#3ddc60"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(BL * (GREEN_C - gh), 0); ctx.lineTo(BL * (GREEN_C + gh), 0); ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  // 影
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(baseX + 5, 414, 44, 7, 0, 0, Math.PI * 2); ctx.fill();
  // 振り抜きでは、バットは背中側に回る(体のうしろに描く)
  if (w2 > 0.45) drawBatShape();
  // 足(うしろ足 / 前足)
  var lk = ik(hlx, HIP_Y, fl.x, fl.y - 6, LEG_L, LEG_L, 1, 0.1);
  var rk = ik(hrx, HIP_Y, fr.x, fr.y - 6, LEG_L, LEG_L, 1, 0.1);
  drawLeg(hlx, HIP_Y, lk.ex, lk.ey, lk.tx, lk.ty, 15, pantsC, trim);
  drawLeg(hrx, HIP_Y, rk.ex, rk.ey, rk.tx, rk.ty, 15, pantsC, trim);
  drawShoe(fl.x, fl.y, 1, "#26262e"); drawShoe(fr.x, fr.y, 1, "#26262e");
  // パンツ + ベルト
  ctx.fillStyle = pantsC;
  roundRect(hlx - 7, HIP_Y - 6, hrx - hlx + 14, 16, 6); ctx.fill();
  // ジャージの胴体: 肩の線と腰の線をつないだ形(ひねると幅が変わる)
  ctx.fillStyle = jersey; ctx.strokeStyle = jersey; ctx.lineWidth = 9; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(slx, sy + 1); ctx.lineTo(srx, sy + 1); ctx.lineTo(hrx, HIP_Y - 6); ctx.lineTo(hlx, HIP_Y - 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = trim; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(srx + 4, sy + 6); ctx.lineTo(hrx + 4, HIP_Y - 8); ctx.stroke();
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hlx - 5, HIP_Y - 4); ctx.lineTo(hrx + 5, HIP_Y - 4); ctx.stroke();
  ctx.fillStyle = "#d8c36a"; ctx.fillRect(hx - 2, HIP_Y - 6, 4, 4);
  drawNumber((slx + srx) / 2, (sy + HIP_Y) / 2 - 3, LK.num, trim, LK.num.length > 1 ? 11 : 13);
  // 首 + 頭 + バッティングヘルメット(ピッチャー側を向く)
  var hdx = sx + 20 * Math.sin(phi) + 3, hdy = sy - 20 * Math.cos(phi);
  ctx.strokeStyle = skinD; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sx, sy + 1); ctx.lineTo(hdx, hdy + 6); ctx.stroke();
  // 髪(ヘルメットの下から見える後ろ髪 / ポニーテール)
  if (LK.tail) {
    ctx.strokeStyle = LK.hair; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hdx - 9, hdy); ctx.quadraticCurveTo(hdx - 19, hdy + 1, hdx - 18, hdy + 12); ctx.stroke();
  }
  circle(hdx - 8, hdy + 5, 4.5, LK.hair);
  circle(hdx, hdy, 10.5, skin);
  circle(hdx + 10, hdy + 2, 2.2, skin);                              // 鼻
  circle(hdx + 5, hdy - 1, 1.5, "#2b2b33");                          // 目
  circle(hdx + 5.5, hdy - 1.6, 0.6, "#fff");
  circle(hdx + 3.5, hdy + 4, 2.6, "rgba(255,120,140,0.45)");         // ほっぺ
  if (LK.eyeblack) { ctx.fillStyle = "rgba(20,20,30,0.7)"; ctx.fillRect(hdx + 2.5, hdy + 1.2, 5, 1.6); }
  if (LK.glasses) {
    ctx.strokeStyle = "#2b2b33"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(hdx + 5, hdy - 1, 3.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hdx + 1.4, hdy - 1.4); ctx.lineTo(hdx - 6, hdy - 2); ctx.stroke();
  }
  ctx.strokeStyle = "#5a3a2a"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(hdx + 3, hdy - 3.5); ctx.lineTo(hdx + 8, hdy - 3); ctx.stroke();   // まゆ
  ctx.strokeStyle = "#a5533d";
  ctx.beginPath(); ctx.moveTo(hdx + 5, hdy + 6); ctx.lineTo(hdx + 8.5, hdy + 5.5); ctx.stroke(); // くち
  ctx.fillStyle = helmet;
  ctx.beginPath(); ctx.arc(hdx - 0.5, hdy - 1.5, 11.5, Math.PI, 0); ctx.lineTo(hdx + 11, hdy - 1.5); ctx.lineTo(hdx - 12, hdy - 1.5); ctx.closePath(); ctx.fill();
  roundRect(hdx + 5, hdy - 4.5, 11, 3.2, 1.5); ctx.fill();            // つば
  ctx.beginPath(); ctx.ellipse(hdx - 2, hdy + 2.5, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill();   // 耳あて
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(hdx - 0.5, hdy - 1.5, 8, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  // うしろ側のうで(上腕 + 前腕) + バッティンググローブ
  var a1 = ik(slx, sy + 3, gx, gy, ARM1, ARM2, -0.4, 1);
  limb(slx, sy + 3, a1.ex, a1.ey, a1.tx, a1.ty, 10, jersey, 7, skin);
  circle(slx, sy + 3, 5.5, jersey);
  if (w2 <= 0.45) drawBatShape();
  // 前側のうで(両手でバットをにぎる)
  var a2 = ik(srx, sy + 3, gx + dxb * 8, gy + dyb * 8, ARM1, ARM2, 0.4, 1);
  limb(srx, sy + 3, a2.ex, a2.ey, a2.tx, a2.ty, 10, jersey, 7, skin);
  circle(srx, sy + 3, 5.5, jersey);
  circle(a1.tx, a1.ty, 4, glove); circle(a2.tx, a2.ty, 4, glove);
  ctx.restore();
}
// 構えのままの立ち姿(タイトル・結果画面用)。足元(x, y)、大きさ sc
function drawBatterStand(x, y, sc) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-322, -412);
  drawBatter(395, ZONE_Y, null);
  ctx.restore();
}

// ピッチャー(遠くのマウンド): 7頭身。足元(x, y)、大きさ s(s=1で身長 約145)。
// wind: 0〜1=ふりかぶり(1でリリース) / 1〜=リリース後の経過秒 / 2=フィニッシュ。左投げ。
// 流れ: セット → ひざを上げる → ステップ → 腕を回す → リリース → フォロースルー
var pitcherHand = { x: 404, y: 163 };      // 投げる手の画面上の位置(リリースのとき ballAt の開始点に合わせる)
function drawPitcher(x, y, s, wind) {
  var LK = lookFor().p;
  var skin = LK.skin, jersey = LK.jersey, trim = LK.trim, capc = LK.cap;
  var pantsC = LK.pants, glove = "#8a5a2b";
  var u = Math.min(1, wind), fk = wind > 1 ? ss(0, 0.25, wind - 1) : 0;
  var cam = 0.2, ccs = Math.cos(cam), csn = Math.sin(cam);
  var turn = ss(0.1, 0.4, u) - ss(0.7, 0.95, u);        // 横向きになる度合い
  var A = ss(0.1, 0.42, u), B = ss(0.48, 0.88, u);       // A=ひざ上げ B=ステップ
  var cockP = ss(0.35, 0.72, u), acc = ss(0.72, 1, u);   // 腕の引き / 腕の振り
  var hipH = 71 - 2 * A - 9 * B - 3 * fk;
  var hx = -2 * A + B;
  var hh = 9.5 - 3 * turn, hw = 17 - 7 * turn;
  var L = 0.04 + 0.12 * B + 0.28 * acc + 0.3 * fk;       // 前傾
  var T = 0.1 * cockP + 0.18 * acc + 0.1 * fk;           // 投げる側の肩が下がる
  var sxc = hx, syc = -hipH - TORSO_L * Math.cos(L) + TORSO_L * Math.sin(L) * csn;
  var sg = { x: sxc - hw * Math.cos(T), y: syc - hw * Math.sin(T) };   // グラブ側の肩(画面左)
  var sr = { x: sxc + hw * Math.cos(T), y: syc + hw * Math.sin(T) };   // 投げる側の肩(画面右)
  var hdx = sxc - 6 * T, hdy = syc - 17 * Math.cos(L) + 17 * Math.sin(L) * csn;

  // 足の位置(ひざ上げ -> ステップ)
  var restF = { x: -11, y: 0 }, liftF = { x: -7, y: -36 }, landF = { x: -20, y: 9 };
  var f1x = lerp(restF.x, liftF.x, A), f1y = lerp(restF.y, liftF.y, A);
  var lead = { x: lerp(f1x, landF.x, B), y: lerp(f1y, landF.y, B) };
  var pivot = { x: 11 + 3 * fk, y: -13 * fk };
  var lk = ik(hx - hh, -hipH, lead.x, lead.y - 5, LEG_L, LEG_L, -1, 0.2);
  var pk = ik(hx + hh, -hipH, pivot.x, pivot.y - 5, LEG_L, LEG_L, 1, 0.2);

  // 投げる腕: 3次元の向きで回し(長さは一定)、画面に投影する → 手前に向かうと短く見えるだけで伸びない
  var Udn = [0.15, -0.95, 0.2], Fdn = [0.1, -0.9, 0.35];
  var Uck = [0.97, 0.1, -0.2], Fck = [0.25, 0.88, -0.4];
  var Urel = [0.15, 0.5, 0.85], Frel = [-0.25, 0.5, 0.83];
  var Ufol = [-0.3, -0.6, 0.75], Ffol = [-0.85, -0.45, 0.3];
  var accF = acc * acc;
  var U = mix3(mix3(mix3(Udn, Uck, cockP), Urel, acc), Ufol, fk);
  var F = mix3(mix3(mix3(Fdn, Fck, cockP), Frel, accF), Ffol, fk);
  function proj(v, len) {
    var m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return { x: v[0] / m * len, y: (-v[1] * ccs + v[2] * csn) / m * len };
  }
  var pu = proj(U, ARM1), pf = proj(F, ARM2);
  var fkE = { x: sr.x + pu.x, y: sr.y + pu.y };
  var fkH = { x: fkE.x + pf.x, y: fkE.y + pf.y };
  var chest = { x: sxc + 3, y: syc + 14 };
  var ikR = ik(sr.x, sr.y, chest.x, chest.y, ARM1, ARM2, 0.3, 1);
  var bI = wind > 1 ? 0 : 1 - ss(0.25, 0.5, u);
  var rE = { x: lerp(fkE.x, ikR.ex, bI), y: lerp(fkE.y, ikR.ey, bI) };
  var rH = { x: lerp(fkH.x, ikR.tx, bI), y: lerp(fkH.y, ikR.ty, bI) };
  // グラブ側のうで
  var gOut = ss(0.4, 0.85, u);
  var gT = { x: lerp(sxc - 3, sxc - 26, gOut), y: lerp(syc + 14, syc + 4, gOut) };
  gT = { x: lerp(gT.x, sxc - 14, fk), y: lerp(gT.y, syc + 22, fk) };
  var ikG = ik(sg.x, sg.y, gT.x, gT.y, ARM1, ARM2, -0.4, 1);

  pitcherHand = { x: x + rH.x * s, y: y + rH.y * s };

  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // 影
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  // 足 + スパイク
  drawLeg(hx - hh, -hipH, lk.ex, lk.ey, lk.tx, lk.ty, 14, pantsC, trim);
  drawLeg(hx + hh, -hipH, pk.ex, pk.ey, pk.tx, pk.ty, 14, pantsC, trim);
  drawShoe(lead.x, lead.y, -1, "#26262e"); drawShoe(pivot.x, pivot.y, 1, "#26262e");
  // パンツ + ジャージ + ベルト
  ctx.fillStyle = pantsC;
  roundRect(hx - hh - 7, -hipH - 6, hh * 2 + 14, 16, 6); ctx.fill();
  ctx.fillStyle = jersey; ctx.strokeStyle = jersey; ctx.lineWidth = 9; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(sg.x, sg.y + 1); ctx.lineTo(sr.x, sr.y + 1); ctx.lineTo(hx + hh, -hipH - 6); ctx.lineTo(hx - hh, -hipH - 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx - hh - 5, -hipH - 4); ctx.lineTo(hx + hh + 5, -hipH - 4); ctx.stroke();
  drawNumber(sxc, (syc - hipH) / 2 - 2, LK.num, trim, LK.num.length > 1 ? 11 : 13);
  // 首 + 頭 + ぼうし
  ctx.strokeStyle = skin; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sxc, syc + 1); ctx.lineTo(hdx, hdy + 6); ctx.stroke();
  if (LK.tail) {   // ポニーテール(顔のうしろ)
    ctx.strokeStyle = LK.hair; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hdx + 6, hdy - 4); ctx.quadraticCurveTo(hdx + 19, hdy - 2, hdx + 16, hdy + 11); ctx.stroke();
  }
  circle(hdx, hdy, 10.5, skin);
  ctx.fillStyle = LK.hair;   // ぼうしの下からのぞく髪
  ctx.beginPath(); ctx.ellipse(hdx - 9, hdy + 1, 2.8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hdx + 9, hdy + 1, 2.8, 5, 0, 0, Math.PI * 2); ctx.fill();
  circle(hdx - 3.8, hdy - 0.5, 1.5, "#2b2b33"); circle(hdx + 3.8, hdy - 0.5, 1.5, "#2b2b33");
  circle(hdx - 3.3, hdy - 1.1, 0.6, "#fff"); circle(hdx + 4.3, hdy - 1.1, 0.6, "#fff");
  circle(hdx - 6.5, hdy + 3.6, 2.3, "rgba(255,120,140,0.45)"); circle(hdx + 6.5, hdy + 3.6, 2.3, "rgba(255,120,140,0.45)");
  if (LK.freckles) {
    ctx.fillStyle = "rgba(150,80,40,0.7)";
    for (var fi = -1; fi <= 1; fi += 2) { circle(hdx + fi * 5.5, hdy + 1.6, 0.6, ctx.fillStyle); circle(hdx + fi * 3.8, hdy + 2.6, 0.6, ctx.fillStyle); circle(hdx + fi * 7, hdy + 2.6, 0.6, ctx.fillStyle); }
  }
  if (LK.eyeblack) { ctx.fillStyle = "rgba(20,20,30,0.7)"; ctx.fillRect(hdx - 6, hdy + 1.6, 4.4, 1.5); ctx.fillRect(hdx + 1.6, hdy + 1.6, 4.4, 1.5); }
  if (LK.glasses) {
    ctx.strokeStyle = "#2b2b33"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hdx - 3.8, hdy - 0.5, 3.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(hdx + 3.8, hdy - 0.5, 3.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hdx - 0.5, hdy - 0.5); ctx.lineTo(hdx + 0.5, hdy - 0.5); ctx.stroke();
  }
  ctx.strokeStyle = "#a5533d"; ctx.lineWidth = 1.2;   // くち(にっこり)
  ctx.beginPath(); ctx.arc(hdx, hdy + 4.2, 2.6, 0.2, Math.PI - 0.2); ctx.stroke();
  if (LK.stache) { ctx.fillStyle = LK.hair; roundRect(hdx - 4.5, hdy + 2.6, 9, 2.2, 1.1); ctx.fill(); }
  circle(hdx - 10.3, hdy + 1, 2, skin); circle(hdx + 10.3, hdy + 1, 2, skin);
  ctx.fillStyle = capc;
  ctx.beginPath(); ctx.arc(hdx, hdy - 1.5, 11.5, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hdx, hdy - 3, 12.5, 3.4, 0, 0, Math.PI); ctx.fill();   // つば
  if (LK.band) { ctx.strokeStyle = LK.band; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hdx, hdy - 1.5, 8.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  // グラブ側のうで + グラブ
  limb(sg.x, sg.y + 1, ikG.ex, ikG.ey, ikG.tx, ikG.ty, 10, jersey, 7, skin);
  circle(sg.x, sg.y + 1, 5.5, jersey);
  circle(ikG.tx, ikG.ty, 6.5, glove);
  ctx.strokeStyle = "#5e3a18"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(ikG.tx, ikG.ty, 3.2, 0, Math.PI * 2); ctx.stroke();
  // 投げる側のうで
  limb(sr.x, sr.y + 1, rE.x, rE.y, rH.x, rH.y, 10, jersey, 7, skin);
  circle(sr.x, sr.y + 1, 5.5, jersey);
  circle(rH.x, rH.y, 3.6, skin);
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
    return { x: g.bx, y: g.by + 28 * ex, r: 9 - ex, a: 1, sx: g.bx, sy: 400 };
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
  return { x: x, y: y, r: 3 + 6 * p, a: a, sx: x, sy: gy };   // 大きさは一定のペースでふつうに大きくなる(近づいても急にでかくならない)
}

function drawOptionsButton(x, y, w, h) {
  button("options", x, y, w, h, "", openOptions, {
    render: function (x, y, w, h) {
      ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(x, y, w, h, h / 2); ctx.fill();
      text("オプション", x + w / 2, y + h / 2 + 1, 13, "#6a5acd");
    }
  });
}
function drawMute() {
  button("mute", 726, 8, 66, 30, "", toggleMute, {
    render: function (x, y, w, h, f) {
      ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(x, y, w, h, 15); ctx.fill();
      text(save.mute ? "おと:OFF" : "おと:ON", x + w / 2, y + h / 2 + 1, 13, "#6a5acd");
    }
  });
}

function changeSens(d) {
  var n = clampSens(save.sens + d);
  if (n === save.sens) return;
  save.sens = n; saveGame();
}
// いどう感度の [-] 値 [+]。large=ステージ選択用 / それ以外=バッティング中の小さい表示
function drawSens(large) {
  var x0 = large ? 282 : 560, y0 = large ? 380 : 60, bw = large ? 44 : 28, bh = large ? 44 : 26;
  var cx = large ? 400 : 665;
  if (large) {
    text("いどうかんど", cx, y0 + 6, 13, "#6a5acd");
    text(save.sens.toFixed(1) + "x", cx, y0 + 30, 22, "#4a3f8f");
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.85)"; roundRect(x0, y0, 210, bh, 13); ctx.fill();
    text("かんど " + save.sens.toFixed(1) + "x", cx, y0 + bh / 2 + 1, 14, "#4a3f8f");
  }
  var xm = x0, xp = large ? x0 + 192 : x0 + 210 - bw;
  button("sensDown", xm, y0, bw, bh, "-", function () { changeSens(-0.1); },
         { enabled: save.sens > SENS_MIN, size: large ? 28 : 18, color: "#6a8cff" });
  button("sensUp", xp, y0, bw, bh, "+", function () { changeSens(0.1); },
         { enabled: save.sens < SENS_MAX, size: large ? 28 : 18, color: "#6a8cff" });
}

// ---------- 各画面 ----------
function drawTitle() {
  drawField(true);
  drawPitcher(400, 214, 0.42, 0);
  drawBatterStand(300, 400, 1.0);
  ctx.fillStyle = "rgba(255,255,255,0.78)"; roundRect(150, 40, 500, 140, 28); ctx.fill();
  text("サークルゲーム", 400, 68, 20, "#ff6f91");
  text("ホームランダービー", 400, 118, 48, "#ffffff", "center", "#ff6f91");
  text("バットを動かして、緑のところに当ててホームラン!", 400, 160, 17, "#6a5acd", "center", null, 470);
  button("start", 290, 236, 220, 56, "スタート!", function () { go("stageSelect"); }, { size: 28, color: "#ff6f91" });
  button("options", 322, 300, 156, 30, "オプション", openOptions, { size: 14, color: "#6a8cff" });
  button("reset", 322, 336, 156, 28, "データを消す", resetData, { size: 14, color: "#9a8fd1" });
  text("マウス / タップ / 矢印キーでバットを動かして、クリック / スペースでスイング", 400, 392, 14, "#fff", "center", "rgba(0,0,0,0.35)", 700);
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
  drawSens(true);
  drawOptionsButton(640, 8, 80, 30);
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

// ストライクゾーン(3x3の薄いマス目) + バットが届く範囲のワク(四すみ)
function drawStrikeZone() {
  var x0 = PLATE.x - 32, y0 = ZONE_Y - 34, w = 64, h = 68, i;
  ctx.save();
  ctx.lineJoin = "round";
  // バットが届く範囲(カーソルが動ける範囲)
  var zx = ZONE.x0, zy = ZONE.y0, zw = ZONE.x1 - ZONE.x0, zh = ZONE.y1 - ZONE.y0, L = 12;
  var corners = [[zx, zy, 1, 1], [zx + zw, zy, -1, 1], [zx, zy + zh, 1, -1], [zx + zw, zy + zh, -1, -1]];
  function brackets() {
    ctx.beginPath();
    for (i = 0; i < 4; i++) {
      var c = corners[i];
      ctx.moveTo(c[0] + c[2] * L, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * L);
    }
    ctx.stroke();
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 4.5; brackets();
  ctx.strokeStyle = "rgba(255,240,150,0.85)"; ctx.lineWidth = 2; brackets();
  // ストライクゾーン本体
  ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(x0, y0, w, h);
  function grid() {
    ctx.beginPath();
    for (i = 1; i < 3; i++) {
      ctx.moveTo(x0 + w * i / 3, y0); ctx.lineTo(x0 + w * i / 3, y0 + h);
      ctx.moveTo(x0, y0 + h * i / 3); ctx.lineTo(x0 + w, y0 + h * i / 3);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2.5; grid();
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; grid();
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 4.5; ctx.strokeRect(x0, y0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h);
  ctx.restore();
}

// バットの打つ位置のカーソル(位置だけを示す。タイミングは示さない)
// 細いバット形。太い先(スイートスポット)が aim の位置にぴったり重なる
function drawAimCursor(aligned) {
  var x = aim.x, y = aim.y;
  var swinging = g.swingT !== null;
  var pulse = swinging ? 0 : Math.sin(performance.now() / 260);
  var k = swinging ? 0.8 + 0.08 * Math.sin(g.swingT * 60) : 1 + 0.04 * pulse;
  var L = 54, ang = -0.3; // 持ち手は左下(バッター側)、先が aim
  function batPath() {
    ctx.beginPath();
    ctx.moveTo(-L, 0);                 // グリップエンド
    ctx.lineTo(-L, -2.6);
    ctx.lineTo(-L * 0.62, -1.6);       // 細い持ち手
    ctx.quadraticCurveTo(-L * 0.3, -1.8, -13, -4.4); // だんだん太く
    ctx.lineTo(-3, -4.6);
    ctx.quadraticCurveTo(5, -4.4, 5, 0); // 丸い先端
    ctx.quadraticCurveTo(5, 4.4, -3, 4.6);
    ctx.lineTo(-13, 4.4);
    ctx.quadraticCurveTo(-L * 0.3, 1.8, -L * 0.62, 1.6);
    ctx.lineTo(-L, 2.6);
    ctx.closePath();
  }
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(k, k);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  batPath();
  ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 4.5; ctx.stroke();
  ctx.fillStyle = swinging ? "rgba(255,210,58,0.95)" : aligned ? "rgba(90,235,120,0.97)" : "rgba(255,244,200,0.92)"; ctx.fill();
  ctx.strokeStyle = swinging ? "#fff3a0" : aligned ? "#d6ffdf" : "#ffffff"; ctx.lineWidth = 1.6; ctx.stroke();
  // グリップのノブ
  ctx.beginPath(); ctx.arc(-L, 0, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fill();
  ctx.beginPath(); ctx.arc(-L, 0, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();
  // スイートスポットの小さな点
  circle(x, y, 2.8, "rgba(0,0,0,0.8)");
  circle(x, y, 1.8, "#ff8a1f");
}
// 到達点(g.bx, g.by)の目印: 終盤に収束するリング(ボールが届く瞬間に小さな輪になる)
function drawArrivalCue(p) {
  if (p < 0.55) return;
  var k = clamp((p - 0.55) / 0.45, 0, 1);
  var rr = 8 + 30 * (1 - k) * (1 - k);
  ctx.save();
  ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0," + (0.4 * k) + ")";
  ctx.beginPath(); ctx.arc(g.bx, g.by, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2.6; ctx.strokeStyle = "rgba(255,225,60," + (0.6 + 0.4 * k) + ")";
  ctx.beginPath(); ctx.arc(g.bx, g.by, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255," + (0.5 + 0.5 * k) + ")"; ctx.lineWidth = 2; // 到達点の小さな輪
  ctx.beginPath(); ctx.arc(g.bx, g.by, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function aimAligned() {
  return Math.abs(g.bx - aim.x) <= REACH_H && Math.abs(g.by - aim.y) <= reachV(save.levels.meet);
}
// ---------- 飛距離トラッカー ----------
var GAUGE = { x0: 90, x1: 710, y: 430, max: 160 };
var sessionBest = 0;         // このステージで一番飛んだ距離(メモリのみ。セーブ形式は変えない)
function flightPos(f, q) {
  return {
    x: g.bx + f.dx * q,
    y: g.by + (f.endY - g.by) * q - f.arc * Math.sin(Math.PI * q)
  };
}
function gaugeX(m) { return GAUGE.x0 + Math.min(GAUGE.max, Math.max(0, m)) / GAUGE.max * (GAUGE.x1 - GAUGE.x0); }
// 飛行の進み具合 q -> いま飛んだ距離(m)。q=1 で o.dist ちょうど
function flownDist(o, q) { return Math.round(o.dist * (1 - (1 - q) * (1 - q))); }

function drawDistGauge(d, o) {
  var gy = GAUGE.y, i, m, x;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)"; roundRect(GAUGE.x0 - 40, gy - 13, GAUGE.x1 - GAUGE.x0 + 80, 26, 8); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(GAUGE.x0, gy - 1.5, GAUGE.x1 - GAUGE.x0, 3);
  ctx.fillStyle = "#ffe14d"; ctx.fillRect(GAUGE.x0, gy - 1.5, gaugeX(d) - GAUGE.x0, 3);   // 飛んだぶん
  for (m = 0; m <= 150; m += 25) {
    x = gaugeX(m);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(x - 0.5, gy - 5, 1, 10);
    if (m % 50 === 0 && m !== FENCE_M) text(m + "m", x, gy + 8, 9, "#fff", "center", "rgba(0,0,0,0.7)");
  }
  // フェンス(超えたら光る)
  var fx = gaugeX(FENCE_M), over = d >= FENCE_M;
  ctx.fillStyle = over ? "#ff3d6e" : "#ffe14d"; ctx.fillRect(fx - 1.5, gy - 10, 3, 20);
  text("フェンス " + FENCE_M + "m", fx, gy - 19, 10, over ? "#ffe14d" : "#fff", "center", "rgba(0,0,0,0.75)");
  // ベスト
  if (sessionBest > 0) {
    x = gaugeX(sessionBest);
    ctx.fillStyle = "#7fe0ff"; ctx.fillRect(x - 1, gy - 9, 2, 18);
    text("ベスト " + sessionBest + "m", x, gy + 8, 9, "#7fe0ff", "center", "rgba(0,0,0,0.75)");
  }
  // 球のマーカー
  x = gaugeX(d);
  circle(x, gy, 6, "#fff");
  ctx.lineWidth = 2; ctx.strokeStyle = "#e0405a"; ctx.beginPath(); ctx.arc(x, gy, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawLandingPin(p, label) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x, p.y + 2); ctx.lineTo(p.x, p.y - 16); ctx.stroke();
  ctx.fillStyle = "#ff3d6e";
  ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 12, p.y - 12); ctx.lineTo(p.x, p.y - 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  text(label, p.x, p.y + 14, 14, "#fff", "center", "rgba(0,0,0,0.8)");
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

  drawStrikeZone();

  // ピッチャー
  var wind = 0;
  if (g.phase === "windup") wind = g.t / g.windT;
  else if (g.phase === "pitch" || g.phase === "contact") wind = 1 + g.t;
  else if (g.phase === "flight" || g.phase === "result") wind = 2;
  drawPitcher(400, 214, 0.42, wind);

  // ボール
  if (g.phase === "pitch") {
    var b = ballAt(g.t);
    var pp = g.t / g.ballTime;
    if (pp <= 1) drawArrivalCue(pp);
    // 地面の影(消える球でも見える)
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(b.sx, b.sy, Math.max(2, b.r * 1.1), Math.max(1, b.r * 0.4), 0, 0, Math.PI * 2); ctx.fill();
    // 残像(短い軌跡)
    for (var ti = 3; ti >= 1; ti--) {
      var tb = ballAt(Math.max(0, g.t - ti * 0.035));
      if (tb.a > 0 && g.t > ti * 0.035) {
        ctx.globalAlpha = 0.28 - ti * 0.06;
        circle(tb.x, tb.y, tb.r * 1.15 + 1, "#fff");
      }
    }
    ctx.globalAlpha = 1;
    if (b.a > 0) {
      drawBall(b.x, b.y, b.r);
    }
  } else if (g.phase === "windup") {
    drawBall(pitcherHand.x, pitcherHand.y, 3);
  } else if (g.phase === "contact") {
    drawBall(g.bx, g.by, 9);
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
    var fr = 9 * (1 - q) + f.endSize * q;
    // 軌跡(空中の通り道。古いほどうすく細く)
    for (var tj = 16; tj >= 1; tj--) {
      var tq = q - tj * 0.025;
      if (tq <= 0) continue;
      var tp = flightPos(f, tq);
      ctx.globalAlpha = 0.55 * (1 - tj / 17);
      circle(tp.x, tp.y, Math.max(1.2, (9 * (1 - tq) + f.endSize * tq) * (1 - tj / 20)), "#fff");
    }
    ctx.globalAlpha = 1;
    drawBall(fx, fy, fr);
    if (g.t < 0.25) drawSparks(g.bx, g.by, 1 + g.t * 4);
  }

  // 飛距離トラッカー(ゲージ + 数字 + 着地ピン)
  if (g.out && g.out.dist && (g.phase === "flight" || g.phase === "result")) {
    var inFl = g.phase === "flight";
    var dNow = inFl ? flownDist(g.out, Math.min(1, g.t / g.flight.dur)) : g.out.dist;
    drawDistGauge(dNow, g.out);
    if (inFl) text(dNow + "m", 400, 78, 36, "#ffe14d", "center", "rgba(0,0,0,0.8)");
    else {
      var lp = flightPos(g.flight, 1);
      drawLandingPin({ x: clamp(lp.x, 40, 660), y: Math.max(lp.y, 84) }, g.out.dist + "m");
    }
  }

  drawBatter(aim.x, aim.y, g.swingT);
  if (g.phase === "windup" || g.phase === "pitch") {
    var al = g.phase === "pitch" && g.swingT === null && aimAligned();
    drawAimCursor(al);
  }

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
    var hr = g.out && g.out.kind === "hr";
    var sc = 1 + Math.max(0, 0.3 - g.t) * (hr ? 2.2 : 1.2);
    ctx.save();
    if (hr) {   // 放射状の光
      ctx.translate(400, 250);
      ctx.fillStyle = "rgba(255,225,77,0.22)";
      for (var ri = 0; ri < 12; ri++) {
        var ra = ri * Math.PI / 6 + time * 0.8;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ra) * 330, Math.sin(ra) * 330);
        ctx.lineTo(Math.cos(ra + 0.2) * 330, Math.sin(ra + 0.2) * 330);
        ctx.closePath(); ctx.fill();
      }
      ctx.translate(-400, -250);
    }
    ctx.translate(400, 250); ctx.scale(sc, sc);
    text(txt, 0, 0, hr ? 84 : 44, hr ? "#ffe14d" : "#ffffff", "center", hr ? "#ff3d6e" : "#4a3f8f");
    if (sub) text(sub, 0, 50, 30, "#ffffff", "center", "#4a3f8f");
    if (sub2) text(sub2, 0, 84, 24, "#ffe14d", "center", "#ff3d6e");
    ctx.restore();
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
  drawSens(false);
  drawOptionsButton(690, 92, 80, 26);
  drawMute();
}

function optionsRow(y, label, valText, id, onDown, onUp, canDown, canUp) {
  ctx.fillStyle = "rgba(255,255,255,0.9)"; roundRect(60, y, 680, 76, 18); ctx.fill();
  text(label, 90, y + 38, 26, "#ff6f91", "left");
  button(id + "Down", 420, y + 12, 64, 52, "-", onDown, { enabled: canDown, size: 30, color: "#6a8cff" });
  text(valText, 540, y + 38, 28, "#4a3f8f");
  button(id + "Up", 596, y + 12, 64, 52, "+", onUp, { enabled: canUp, size: 30, color: "#6a8cff" });
}
function drawOptions() {
  drawBackdropSoft("#e3dcff", "#ffd9ec");
  text("オプション", 400, 40, 34, "#fff", "center", "#6a5acd");
  optionsRow(80, "いどうかんど", save.sens.toFixed(1) + "x", "oSens",
    function () { changeSens(-0.1); }, function () { changeSens(0.1); }, save.sens > SENS_MIN, save.sens < SENS_MAX);
  optionsRow(170, "BGM おんりょう", save.bgm + "%", "oBgm",
    function () { changeVol("bgm", -10); }, function () { changeVol("bgm", 10); }, save.bgm > 0, save.bgm < 100);
  optionsRow(260, "こうかおん おんりょう", save.se + "%", "oSe",
    function () { changeVol("se", -10); }, function () { changeVol("se", 10); }, save.se > 0, save.se < 100);
  button("back", 300, 366, 200, 52, "もどる", function () { go(optionsFrom); }, { size: 24, color: "#9a8fd1" });
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
  if (r.cleared) {
    text("ステージクリア!", 400, 80, 54, "#ffe14d", "center", "#ff6f91");
    drawBatterStand(400, 352, 0.9);
    for (var i = 0; i < 12; i++) {
      var a = time * 1.5 + i * 0.52;
      circle(400 + Math.cos(a) * (130 + (i % 3) * 20), 220 + Math.sin(a) * 60, 5, ["#ff6f91", "#ffd23f", "#6a8cff", "#3ddc60"][i % 4]);
    }
  } else {
    text("ざんねん…", 400, 80, 54, "#ffffff", "center", "#6a5acd");
    drawBatterStand(400, 352, 0.9);
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
  else if (scene === "options") drawOptions();
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
  setSave: function (s) { save = s; },
  changeSens: changeSens, setAimTarget: setAimTarget
};
})();
