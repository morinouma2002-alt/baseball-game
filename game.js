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
  { name: "新人くん",               pitches: 10, target: 6,  ballTime: 1.60, types: ["straight", "slow"],            windup: FIX },
  { name: "草野球の先輩",           pitches: 12, target: 8,  ballTime: 1.40, types: ["straight", "curve"],          windup: FIX },
  { name: "商店街のエース",         pitches: 15, target: 10, ballTime: 1.25, types: ["straight", "change"],         windup: FIX },
  { name: "河川敷のトリックスター", pitches: 20, target: 13, ballTime: 1.15, types: ["bounce", "rising", "slider"],  windup: FIX },
  { name: "大学の左腕",             pitches: 25, target: 17, ballTime: 1.10, types: ["drop", "sinker", "straight"],  windup: [0.3, 0.3] },
  { name: "ベテラン投手",           pitches: 30, target: 20, ballTime: 1.00, types: ["slider", "change", "curve", "straight"],  windup: [0.35, 0.8] },
  { name: "魔球使い",               pitches: 35, target: 24, ballTime: 0.95, types: ["knuckle", "slider", "drop", "vanish"], windup: [0.35, 0.8] },
  { name: "最終ボス",               pitches: 40, target: 28, ballTime: 0.80, types: ["rising", "vanish", "curve", "sinker", "straight"], windup: [0.35, 0.8] }
];

// ステージごとの見た目(バッター b は人物 / ピッチャー p は動物)。どれもオリジナル。
// 共通: jersey ユニフォーム / trim アクセント色 / cap ぼうし・ヘルメット / pants ズボン
// バッター b: skin 肌 / hair 髪 / 小物 glasses めがね / tail ポニーテール / eyeblack アイブラック
// 動物 p: form 投げ方(over オーバー / side サイド / bigwind 大きなふりかぶり / under アンダー / quick クイック / threeq 3/4 / tornado トルネード / power ダイナミック) / sp 種類 / pname なまえ / jp 種類の表示名 / fur 毛 / belly おなか・マズル / dark こい色(耳・しっぽ・たてがみ) / inner 耳の内側
var LOOKS = [
  { b: { skin: "#f6d3b0", hair: "#5a3a2a", jersey: "#f7f4f5", trim: "#e8456f", cap: "#d63a63", pants: "#f2f0f2", num: "7" },
    p: { form: "over", sp: "rabbit",   pname: "ぴょんこ", jp: "うさぎ",     fur: "#fffaf6", belly: "#ffffff", dark: "#e9d6dc", inner: "#ffb0c4", jersey: "#f4f6ff", trim: "#2f6fd0", cap: "#2a5fc0", pants: "#e6e9f2", num: "1" } },
  { b: { skin: "#f1c9a0", hair: "#2b2b33", jersey: "#fff3dc", trim: "#f08a1c", cap: "#e07a10", pants: "#fff7e8", num: "4", tail: true },
    p: { form: "side", sp: "cat",      pname: "にゃんた", jp: "ねこ",       fur: "#f2a24a", belly: "#fff1d6", dark: "#b8681c", inner: "#ffb0b8", jersey: "#e9f7ea", trim: "#2e9c4f", cap: "#2e8a49", pants: "#eef6ee", num: "3" } },
  { b: { skin: "#e8b88a", hair: "#7a4a1e", jersey: "#eaf3ff", trim: "#2f8fe0", cap: "#2f7fd0", pants: "#eef4fb", num: "10" },
    p: { form: "bigwind", sp: "dog",      pname: "わんすけ", jp: "こいぬ",     fur: "#ecd0a0", belly: "#fff4e2", dark: "#8a5530", inner: "#ffb0b8", jersey: "#fff0e0", trim: "#e0402a", cap: "#d63a2a", pants: "#fbeee2", num: "18" } },
  { b: { skin: "#f6d3b0", hair: "#d8902a", jersey: "#f1ecff", trim: "#8a5ad8", cap: "#7a4ac8", pants: "#f3f0fb", num: "9", glasses: true },
    p: { form: "under", sp: "fox",      pname: "こんた",   jp: "きつね",     fur: "#f27c2a", belly: "#ffffff", dark: "#5a2e1a", inner: "#ffd0b0", jersey: "#efe6ff", trim: "#7a4ac8", cap: "#6a3ab8", pants: "#ece6f7", num: "6" } },
  { b: { skin: "#f1c9a0", hair: "#1f1f2a", jersey: "#f2f4f8", trim: "#1f3a7a", cap: "#1f3a7a", pants: "#eef0f5", num: "2", eyeblack: true },
    p: { form: "quick", sp: "tanuki",   pname: "ぽんた",   jp: "たぬき",     fur: "#b4906a", belly: "#ecd9b4", dark: "#4a3526", inner: "#7a5a40", jersey: "#f4f6fb", trim: "#c0213a", cap: "#1f3a7a", pants: "#e8ebf2", num: "11" } },
  { b: { skin: "#d9a97e", hair: "#2a1f1a", jersey: "#eaf1ea", trim: "#2a6a4a", cap: "#245a3e", pants: "#eef3ee", num: "5", tail: true },
    p: { form: "threeq", sp: "penguin",  pname: "ぺんた",   jp: "ペンギン",   fur: "#34406a", belly: "#ffffff", dark: "#222a48", inner: "#ffa51f", jersey: "#e6efe9", trim: "#1f5a3a", cap: "#1f4a33", pants: "#e3ebe5", num: "21", shoe: "#ffa51f" } },
  { b: { skin: "#f6d3b0", hair: "#8a3ab8", jersey: "#2c2a3a", trim: "#c8a8ff", cap: "#4a3a7a", pants: "#3a3850", num: "13" },
    p: { form: "tornado", sp: "hedgehog", pname: "はりまる", jp: "ハリネズミ", fur: "#ffdcc2", belly: "#fff0e4", dark: "#6a4a8a", inner: "#ffb0b8", jersey: "#35305a", trim: "#d8b8ff", cap: "#4a3a7a", pants: "#2e2b48", num: "0" } },
  { b: { skin: "#e8b88a", hair: "#2b2b33", jersey: "#fff0f0", trim: "#d82a2a", cap: "#222230", pants: "#f5eaea", num: "1", eyeblack: true },
    p: { form: "power", sp: "lion",     pname: "がおう",   jp: "ライオン",   fur: "#f6c45c", belly: "#fff0c8", dark: "#b4601e", inner: "#ffb0b8", jersey: "#26262e", trim: "#e03a3a", cap: "#c82a2a", pants: "#2e2e38", num: "99" } }
];
// いま描くキャラの見た目: 打席中はそのステージ、それ以外(タイトルなど)は1ステージ目
var lookOverride = null;   // ステージ選択のアイコンなど、別のステージの見た目で描くとき用
function lookFor() {
  var i = lookOverride !== null ? lookOverride : (scene === "batting" && g) ? g.idx : 0;
  return LOOKS[i] || LOOKS[0];
}
// 「ぴょんこさん(うさぎ)」
function pitcherLabel(i) { var p = LOOKS[i].p; return p.pname + "さん(" + p.jp + ")"; }
// 小さなアイコン用: 指定ステージの動物ピッチャーを構えの姿で描く
function drawPitcherIcon(i, x, y, s) {
  var keep = pitcherHand;
  lookOverride = i; drawPitcher(x, y, s, 0); lookOverride = null;
  pitcherHand = keep;
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
  g.rel = FORM_REL[LOOKS[g.idx].p.form] || FORM_REL.over;
  g.side = rnd() < 0.5 ? -1 : 1;
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
// "#rrggbb" の明るさを変える。k<1=かげ(すこし青く) / k>1=ハイライト(白へ近づける)。結果も "#rrggbb"
function shade(hex, k) {
  var n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255], i, v, s = "#";
  for (i = 0; i < 3; i++) {
    v = k > 1 ? lerp(c[i], 255, Math.min(1, k - 1)) : c[i] * Math.pow(k, i === 2 ? 0.85 : i === 1 ? 1.03 : 1);
    v = Math.round(clamp(v, 0, 255));
    s += (v < 16 ? "0" : "") + v.toString(16);
  }
  return s;
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

// ---------- バッター(セミリアル): 光は左上手前から。グラデーションの陰影と細い暗色のふちどり ----------
var LIGHT = { x: -0.55, y: -0.83 };
// 地面にやわらかく落ちる影
function softShadow(cx, cy, rx, ry, a) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, "rgba(12,20,12," + a + ")"); gr.addColorStop(0.55, "rgba(12,20,12," + (a * 0.55) + ")"); gr.addColorStop(1, "rgba(12,20,12,0)");
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// テーパー(先ほそ)の手足パーツ。r0/rm/r1=はじ・ふくらみ・おわりの半径、tm=ふくらみの位置(0..1)
function seg(x0, y0, x1, y1, r0, rm, r1, tm, base, hi, lo) {
  return { x0: x0, y0: y0, x1: x1, y1: y1, r0: r0, rm: rm, r1: r1, tm: tm, base: base, hi: hi, lo: lo };
}
function limbPath(s) {
  var dx = s.x1 - s.x0, dy = s.y1 - s.y0, d = Math.sqrt(dx * dx + dy * dy) || 1;
  var nx = -dy / d, ny = dx / d;
  var mx = s.x0 + dx * s.tm, my = s.y0 + dy * s.tm;
  var ax = s.x0 + nx * s.r0, ay = s.y0 + ny * s.r0, bx = s.x1 + nx * s.r1, by = s.y1 + ny * s.r1;
  var a2x = s.x0 - nx * s.r0, a2y = s.y0 - ny * s.r0, b2x = s.x1 - nx * s.r1, b2y = s.y1 - ny * s.r1;
  var a1 = Math.atan2(ny, nx);
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(2 * (mx + nx * s.rm) - (ax + bx) / 2, 2 * (my + ny * s.rm) - (ay + by) / 2, bx, by);
  ctx.arc(s.x1, s.y1, s.r1, a1, a1 + Math.PI, true);
  ctx.quadraticCurveTo(2 * (mx - nx * s.rm) - (a2x + b2x) / 2, 2 * (my - ny * s.rm) - (a2y + b2y) / 2, a2x, a2y);
  ctx.arc(s.x0, s.y0, s.r0, a1 + Math.PI, a1, true);
  ctx.closePath();
}
function limbGrad(s) {
  var dx = s.x1 - s.x0, dy = s.y1 - s.y0, d = Math.sqrt(dx * dx + dy * dy) || 1;
  var nx = -dy / d, ny = dx / d;
  if (nx * LIGHT.x + ny * LIGHT.y < 0) { nx = -nx; ny = -ny; }     // 光が当たる側
  var mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2, r = s.rm + 0.5;
  var gr = ctx.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
  gr.addColorStop(0, shade(s.base, s.hi)); gr.addColorStop(0.38, shade(s.base, 1)); gr.addColorStop(1, shade(s.base, s.lo));
  return gr;
}
// パーツをまとめて描く: まず全部のふちどり(外側の輪郭だけ残る)、つぎに陰影つきの塗り
function drawSegs(segs) {
  var i, s;
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.7;
  for (i = 0; i < segs.length; i++) {
    s = segs[i]; limbPath(s);
    ctx.fillStyle = ctx.strokeStyle = shade(s.base, 0.5); ctx.fill(); ctx.stroke();
  }
  for (i = 0; i < segs.length; i++) { s = segs[i]; limbPath(s); ctx.fillStyle = limbGrad(s); ctx.fill(); }
}
function pt(x0, y0, x1, y1, t) { return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t }; }
// 手足の途中に巻くライン(袖口・すそ・ストッキングの白線)。t=位置(0..1) r=手足の半径 wd=線の太さ
function band(x0, y0, x1, y1, t, r, wd, col) {
  var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / d * r, ny = dx / d * r;
  var cx = x0 + dx * t, cy = y0 + dy * t;
  ctx.lineCap = "butt"; ctx.lineWidth = wd; ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(cx - nx, cy - ny); ctx.lineTo(cx + nx, cy + ny); ctx.stroke();
  ctx.lineCap = "round";
}
// 足首の位置: かかと(つま先)を軸にくつを回したあとの位置。f=地面の足場、px=回転軸のx
function footAnkle(f, tilt, px) {
  var dx = f.x - px, dy = -8, c = Math.cos(tilt), s = Math.sin(tilt);
  return { x: px + dx * c - dy * s, y: f.y + 2 + dx * s + dy * c };
}
// スパイク(右向き): 足元 (f.x, f.y) が地面から2px上。底のスタッドが土に触れる
function drawCleat(f, tilt, px, col, trim) {
  ctx.save();
  ctx.translate(px, f.y + 2); ctx.rotate(tilt); ctx.translate(-px, -(f.y + 2));
  ctx.translate(f.x, f.y);
  // 底のスタッド
  ctx.fillStyle = "#15151a";
  ctx.fillRect(-6.5, 1.2, 2, 2.2); ctx.fillRect(-1.5, 1.2, 2, 2.2); ctx.fillRect(3.5, 1.2, 2, 2.2); ctx.fillRect(9, 1.2, 2, 2.2);
  ctx.beginPath();
  ctx.moveTo(-8.6, -2.6); ctx.lineTo(-8.2, -9.4);
  ctx.quadraticCurveTo(-3.5, -10.6, 1.2, -9.2);
  ctx.quadraticCurveTo(4.6, -6.6, 9, -5.6);
  ctx.quadraticCurveTo(13.4, -4.8, 13.4, -0.6);
  ctx.lineTo(13.4, 1.6); ctx.lineTo(-8.6, 1.6);
  ctx.quadraticCurveTo(-9.6, -0.6, -8.6, -2.6);
  ctx.closePath();
  var gr = ctx.createLinearGradient(-6, -10, 6, 2);
  gr.addColorStop(0, shade(col, 1.9)); gr.addColorStop(0.35, shade(col, 1.15)); gr.addColorStop(1, shade(col, 0.55));
  ctx.fillStyle = gr; ctx.fill();
  ctx.lineWidth = 0.9; ctx.strokeStyle = shade(col, 0.4); ctx.lineJoin = "round"; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "#e9e9ee"; ctx.fillRect(-10, 0, 26, 1.7);                       // ソール(白)
  ctx.strokeStyle = trim; ctx.lineWidth = 1.5;                                    // サイドのライン
  ctx.beginPath(); ctx.moveTo(-7, -3.2); ctx.quadraticCurveTo(0, -4.6, 8, -2); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(10, -3.2, 2.6, 1.1, -0.2, 0, Math.PI * 2); ctx.fill();   // つま先のつや
  ctx.restore();
  ctx.strokeStyle = "rgba(235,235,240,0.7)"; ctx.lineWidth = 0.7;                 // ひも
  for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(1.2 + i * 2.4, -8.4 + i * 1.1); ctx.lineTo(3.4 + i * 2.4, -7.2 + i * 1.1); ctx.stroke(); }
  ctx.restore();
}
// バッティンググローブ: バットの向き th にそって、バットをにぎる形
function drawGlove(x, y, th, trim) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(th);
  var gr = ctx.createLinearGradient(0, -4, 0, 4);
  var lit = (-Math.sin(th) * LIGHT.x + Math.cos(th) * LIGHT.y) > 0;
  gr.addColorStop(0, lit ? "#5a5c6a" : "#25262e"); gr.addColorStop(1, lit ? "#25262e" : "#5a5c6a");
  ctx.beginPath(); ctx.moveTo(-4, -3.2); ctx.lineTo(3.4, -3.6); ctx.quadraticCurveTo(6, -3.4, 6, 0);
  ctx.quadraticCurveTo(6, 3.4, 3.4, 3.6); ctx.lineTo(-4, 3.2); ctx.closePath();
  ctx.fillStyle = gr; ctx.fill();
  ctx.lineWidth = 0.8; ctx.strokeStyle = "#101016"; ctx.lineJoin = "round"; ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 0.7;                       // ゆびのすきま
  for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-0.4 + i * 2.1, -3.3); ctx.lineTo(-0.4 + i * 2.1, 3.3); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.beginPath(); ctx.ellipse(1.2, lit ? -2 : 2, 3.4, 0.9, 0, 0, Math.PI * 2); ctx.fill();   // つや
  ctx.beginPath(); ctx.ellipse(-1.4, -3, 2.6, 1.5, 0.3, 0, Math.PI * 2); ctx.fillStyle = "#3a3c48"; ctx.fill(); ctx.stroke();            // おやゆび
  ctx.fillStyle = trim; ctx.fillRect(-5.8, -3.4, 2.2, 6.8);                        // リストストラップ
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-4.5, -3.4, 0.9, 6.8);
  ctx.restore();
}
// うで: 肩のふくらみ + 袖(トリムのライン) + 肌のひじ・前腕(筋肉のふくらみ)
function drawArm(x0, y0, a, jersey, trim, skin) {
  var ex = a.ex, ey = a.ey, tx = a.tx, ty = a.ty, p2 = pt(x0, y0, ex, ey, 0.7);
  drawSegs([
    seg(ex, ey, tx, ty, 4.6, 5.1, 3.0, 0.3, skin, 1.1, 0.64),
    seg(x0, y0, ex, ey, 5.2, 5.4, 4.2, 0.35, skin, 1.08, 0.68),
    seg(x0, y0, p2.x, p2.y, 6.6, 6.8, 5.6, 0.3, jersey, 1.12, 0.62)
  ]);
  band(x0, y0, ex, ey, 0.66, 5.6, 1.8, trim);
  band(x0, y0, ex, ey, 0.61, 5.8, 0.8, shade(trim, 0.6));
  // 袖のしわ(肩とひじ側) と 前腕のハイライト
  var ux = ex - x0, uy = ey - y0, ul = Math.sqrt(ux * ux + uy * uy) || 1, nx = -uy / ul, ny = ux / ul;
  var fx = tx - ex, fy = ty - ey, fl2 = Math.sqrt(fx * fx + fy * fy) || 1, fnx = -fy / fl2, fny = fx / fl2;
  if (nx * LIGHT.x + ny * LIGHT.y < 0) { nx = -nx; ny = -ny; }
  if (fnx * LIGHT.x + fny * LIGHT.y < 0) { fnx = -fnx; fny = -fny; }
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.16)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0 - nx * 3 + ux * 0.12, y0 - ny * 3 + uy * 0.12); ctx.lineTo(x0 - nx * 3.6 + ux * 0.4, y0 - ny * 3.6 + uy * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0 + nx * 1 + ux * 0.2, y0 + ny * 1 + uy * 0.2); ctx.lineTo(x0 - nx * 2 + ux * 0.46, y0 - ny * 2 + uy * 0.46); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath(); ctx.moveTo(x0 + nx * 3.4 + ux * 0.1, y0 + ny * 3.4 + uy * 0.1); ctx.lineTo(x0 + nx * 3.4 + ux * 0.45, y0 + ny * 3.4 + uy * 0.45); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.24)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(ex + fx * 0.18 + fnx * 2, ey + fy * 0.18 + fny * 2); ctx.lineTo(ex + fx * 0.6 + fnx * 1.6, ey + fy * 0.6 + fny * 1.6); ctx.stroke();
  ctx.strokeStyle = "rgba(90,30,20,0.28)"; ctx.lineWidth = 1;                       // ひじのしわ
  ctx.beginPath(); ctx.moveTo(ex - nx * 3.6, ey - ny * 3.6); ctx.quadraticCurveTo(ex - nx * 1.8 - ux * 0.06, ey - ny * 1.8 - uy * 0.06, ex + nx * 0.8, ey + ny * 0.8); ctx.stroke();
  // 肩のつや
  var rg = ctx.createRadialGradient(x0 + nx * 3, y0 + ny * 3, 0, x0 + nx * 3, y0 + ny * 3, 5);
  rg.addColorStop(0, "rgba(255,255,255,0.22)"); rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x0 + nx * 3, y0 + ny * 3, 5, 0, Math.PI * 2); ctx.fill();
}
// バット(木): グリップから先まで。緑のスイートスポットの位置は判定と同じ(BL * (GREEN_C ± gh))
function drawBatShape(gx, gy, th, BL, gh) {
  ctx.save();
  ctx.translate(gx, gy); ctx.rotate(th);
  ctx.beginPath();
  ctx.moveTo(-5, -1.9); ctx.lineTo(BL * 0.22, -2.2);
  ctx.bezierCurveTo(BL * 0.4, -2.3, BL * 0.46, -4.4, BL * 0.58, -4.4);
  ctx.lineTo(BL * 0.97, -4.4); ctx.quadraticCurveTo(BL + 2, -4.4, BL + 2, 0); ctx.quadraticCurveTo(BL + 2, 4.4, BL * 0.97, 4.4);
  ctx.lineTo(BL * 0.58, 4.4); ctx.bezierCurveTo(BL * 0.46, 4.4, BL * 0.4, 2.3, BL * 0.22, 2.2);
  ctx.lineTo(-5, 1.9); ctx.closePath();
  ctx.fillStyle = "#c98b4d"; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "#4a3a3a"; ctx.fillRect(-6, -3, BL * 0.2 + 6, 6);              // グリップテープ
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (var i = 0; i < 4; i++) ctx.fillRect(-4 + i * 5, -3, 1, 6);
  ctx.fillStyle = "#3ddc60"; ctx.fillRect(BL * (GREEN_C - gh), -6, BL * gh * 2, 12);       // スイートスポット
  var lit = (-Math.sin(th) * LIGHT.x + Math.cos(th) * LIGHT.y) > 0 ? 1 : -1;
  var gr = ctx.createLinearGradient(0, lit * 4.6, 0, -lit * 4.6);
  gr.addColorStop(0, "rgba(255,255,255,0.35)"); gr.addColorStop(0.35, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(30,10,0,0.42)");
  ctx.fillStyle = gr; ctx.fillRect(-6, -6, BL + 10, 12);
  ctx.restore();
  ctx.lineWidth = 0.9; ctx.strokeStyle = "#5a3a1c"; ctx.lineJoin = "round"; ctx.stroke();
  // ノブ
  ctx.beginPath(); ctx.ellipse(-6.2, 0, 2.6, 3.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#6a4a40"; ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.ellipse(-6.8, -lit * 1, 1, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// 頭: 首の上。ヘルメット(つや・耳あて・つば)、顔(まぶた・目・まゆ・鼻・口・耳)、つばの影
function drawBatterHead(hdx, hdy, tilt, LK) {
  var skin = LK.skin, hair = LK.hair, hel = LK.cap, trim = LK.trim, gr;
  var skinLo = shade(skin, 0.7), edge = shade(skin, 0.5), hairEdge = shade(hair, 0.5);
  ctx.save();
  ctx.translate(hdx, hdy); ctx.rotate(tilt); ctx.scale(0.92, 0.92);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  function facePath() {
    ctx.beginPath(); ctx.moveTo(-8.4, -5);
    ctx.bezierCurveTo(-9.6, -12.5, 3, -13.8, 7.6, -8);
    ctx.quadraticCurveTo(8.7, -5.6, 8.6, -3.6);
    ctx.lineTo(9.2, -1);
    ctx.quadraticCurveTo(11.9, 3, 10.6, 4);
    ctx.quadraticCurveTo(9.6, 4.6, 8.9, 4.4);
    ctx.lineTo(8.8, 6);
    ctx.quadraticCurveTo(9.5, 7, 8.6, 7.9);
    ctx.quadraticCurveTo(9.3, 9.2, 7.8, 10.5);
    ctx.quadraticCurveTo(5.5, 12.4, 1.5, 11.3);
    ctx.quadraticCurveTo(-4, 10.5, -7, 5);
    ctx.quadraticCurveTo(-9.2, 1, -8.4, -5);
    ctx.closePath();
  }
  // ポニーテール(ヘルメットのうしろから)
  if (LK.tail) {
    var sw = Math.sin(time * 2.2) * 0.8;
    ctx.beginPath(); ctx.moveTo(-9.5, -3.5);
    ctx.bezierCurveTo(-17, -2 + sw, -19.5, 8, -15 + sw, 17);
    ctx.bezierCurveTo(-14, 10, -12.5, 4, -8, 2.4); ctx.closePath();
    gr = ctx.createLinearGradient(-19, -4, -9, 8);
    gr.addColorStop(0, shade(hair, 1.45)); gr.addColorStop(0.5, hair); gr.addColorStop(1, shade(hair, 0.55));
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = hairEdge; ctx.stroke();
    circle(-10.6, -2.4, 1.7, trim);
  }
  // 顔(肌)
  facePath();
  gr = ctx.createRadialGradient(-1, -4, 1, 1, 1, 16);
  gr.addColorStop(0, shade(skin, 1.12)); gr.addColorStop(0.55, skin); gr.addColorStop(1, shade(skin, 0.78));
  ctx.fillStyle = gr; ctx.fill();
  ctx.save(); facePath(); ctx.clip();
  // あごの下とほおのかげ / ほんのり赤み
  gr = ctx.createLinearGradient(0, 3, 0, 12);
  gr.addColorStop(0, "rgba(90,40,30,0)"); gr.addColorStop(1, "rgba(90,40,30,0.3)");
  ctx.fillStyle = gr; ctx.fillRect(-10, 3, 24, 10);
  gr = ctx.createRadialGradient(4.5, 4.2, 0, 4.5, 4.2, 5.5);
  gr.addColorStop(0, "rgba(225,95,95,0.26)"); gr.addColorStop(1, "rgba(225,95,95,0)");
  ctx.fillStyle = gr; ctx.fillRect(-1, -1, 12, 11);
  // ヘルメットのつばの影(おでこ〜目のうえ)
  gr = ctx.createLinearGradient(0, -5, 0, 2.2);
  gr.addColorStop(0, "rgba(30,15,15,0.46)"); gr.addColorStop(1, "rgba(30,15,15,0)");
  ctx.fillStyle = gr; ctx.fillRect(-10, -5, 24, 7.5);
  ctx.restore();
  facePath(); ctx.lineWidth = 0.8; ctx.strokeStyle = edge; ctx.stroke();    // あごのふちどり
  // 後ろ髪・もみあげ
  ctx.beginPath(); ctx.moveTo(-8.9, -6);
  ctx.bezierCurveTo(-11, -1, -10, 5.5, -6.6, 8);
  ctx.quadraticCurveTo(-4.6, 6.2, -3.8, 3);
  ctx.lineTo(-3.8, -4.5); ctx.closePath();
  gr = ctx.createLinearGradient(-10, -6, -4, 8);
  gr.addColorStop(0, shade(hair, 1.35)); gr.addColorStop(1, shade(hair, 0.65));
  ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.7; ctx.strokeStyle = hairEdge; ctx.stroke();
  // 耳
  ctx.beginPath(); ctx.ellipse(-1.2, 2.6, 2.6, 3.5, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = shade(skin, 0.92); ctx.fill(); ctx.lineWidth = 0.7; ctx.strokeStyle = edge; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-0.8, 2.9, 1.2, 2, 0.1, 0, Math.PI * 2); ctx.fillStyle = skinLo; ctx.fill();
  // 鼻のかげ・小鼻
  ctx.strokeStyle = shade(skin, 0.62); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(9, -1); ctx.quadraticCurveTo(8.2, 1.8, 9.2, 3.8); ctx.stroke();
  circle(9.7, 3.8, 0.55, shade(skin, 0.4));
  ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.beginPath(); ctx.ellipse(10.4, 1.4, 0.6, 1.2, 0.2, 0, Math.PI * 2); ctx.fill();
  // 目: 白目・黒目・まぶた・まつげのライン
  ctx.beginPath(); ctx.ellipse(5.3, -0.4, 2.4, 1.55, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f0ea"; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(5.3, -0.4, 2.4, 1.55, 0.05, 0, Math.PI * 2); ctx.clip();
  circle(6.1, -0.3, 1.35, "#4a3424"); circle(6.2, -0.3, 0.7, "#0e0a0a");
  circle(5.7, -0.8, 0.38, "#fff");
  gr = ctx.createLinearGradient(0, -2, 0, 0.4);                      // まぶたの影
  gr.addColorStop(0, "rgba(40,20,20,0.5)"); gr.addColorStop(1, "rgba(40,20,20,0)");
  ctx.fillStyle = gr; ctx.fillRect(2, -2, 8, 3);
  ctx.restore();
  ctx.strokeStyle = shade(skin, 0.3); ctx.lineWidth = 0.9;           // 上まぶた
  ctx.beginPath(); ctx.ellipse(5.3, -0.4, 2.5, 1.65, 0.05, Math.PI * 1.05, Math.PI * 1.98); ctx.stroke();
  ctx.strokeStyle = shade(skin, 0.74); ctx.lineWidth = 0.55;         // 二重のライン・下まぶた
  ctx.beginPath(); ctx.moveTo(2.8, -2.4); ctx.quadraticCurveTo(5.3, -3.2, 7.8, -2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(5.3, -0.3, 2.4, 1.6, 0.05, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  if (LK.eyeblack) { ctx.fillStyle = "rgba(15,15,25,0.78)"; roundRect(2.8, 1.5, 5.4, 1.5, 0.7); ctx.fill(); }
  // まゆ
  ctx.beginPath(); ctx.moveTo(2.4, -3.2); ctx.quadraticCurveTo(5.4, -4.8, 8.4, -3.8); ctx.quadraticCurveTo(5.6, -4, 2.4, -2.5); ctx.closePath();
  ctx.fillStyle = shade(hair, 0.85); ctx.fill();
  // 口: 上くちびるのライン・下くちびる
  ctx.strokeStyle = "#8a4a40"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(5.8, 7); ctx.quadraticCurveTo(7.6, 7.5, 8.9, 6.6); ctx.stroke();
  ctx.fillStyle = "rgba(200,95,95,0.4)"; ctx.beginPath(); ctx.ellipse(7.7, 8.2, 1.6, 0.8, -0.1, 0, Math.PI * 2); ctx.fill();
  // めがね
  if (LK.glasses) {
    ctx.strokeStyle = "#23232c"; ctx.lineWidth = 0.9;
    roundRect(2, -3.4, 7, 5.6, 2.3); ctx.stroke();
    ctx.fillStyle = "rgba(190,225,255,0.18)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -1.2); ctx.lineTo(-4.5, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -1.2); ctx.lineTo(10, -1.4); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(3.4, -2.2); ctx.lineTo(4.8, -2.4); ctx.stroke();
  }
  // ---- ヘルメット ----
  function domePath() {
    ctx.beginPath(); ctx.moveTo(-11.4, 3.2);
    ctx.bezierCurveTo(-14, -9, -3, -16.8, 6.4, -11.4);
    ctx.quadraticCurveTo(10.8, -8.8, 11, -4.4);
    ctx.lineTo(3, -3.7); ctx.quadraticCurveTo(-4, -3, -7, -2.6);
    ctx.quadraticCurveTo(-10.2, -2, -11.4, 3.2); ctx.closePath();
  }
  domePath();
  gr = ctx.createLinearGradient(-9, -15, 9, -1);
  gr.addColorStop(0, shade(hel, 1.5)); gr.addColorStop(0.3, shade(hel, 1.1)); gr.addColorStop(0.7, shade(hel, 0.75)); gr.addColorStop(1, shade(hel, 0.5));
  ctx.fillStyle = gr; ctx.fill();
  ctx.save(); domePath(); ctx.clip();
  ctx.strokeStyle = trim; ctx.lineWidth = 1.7;                        // 飾りライン
  ctx.beginPath(); ctx.moveTo(-9.5, -6); ctx.quadraticCurveTo(0, -12.2, 9.8, -7.2); ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.7;          // 中央の成形ライン
  ctx.beginPath(); ctx.moveTo(-10.5, -4); ctx.quadraticCurveTo(0, -15, 9, -7.5); ctx.stroke();
  gr = ctx.createRadialGradient(-4.5, -11.2, 0, -4.5, -11.2, 7);      // つや
  gr.addColorStop(0, "rgba(255,255,255,0.8)"); gr.addColorStop(0.4, "rgba(255,255,255,0.28)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gr; ctx.save(); ctx.translate(-4.5, -11.2); ctx.rotate(-0.35); ctx.scale(1.6, 0.6); ctx.translate(4.5, 11.2); ctx.fillRect(-14, -18, 20, 12); ctx.restore();
  ctx.restore();
  domePath(); ctx.lineWidth = 0.9; ctx.strokeStyle = shade(hel, 0.38); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.ellipse(-4.8, -10.6, 1.6, 0.6, -0.4, 0, Math.PI * 2); ctx.fill();
  // 耳あて
  ctx.beginPath(); ctx.moveTo(-7.4, -3.4); ctx.lineTo(0.8, -3.4); ctx.quadraticCurveTo(1.4, 2, -0.6, 4.6);
  ctx.quadraticCurveTo(-4, 5.4, -7.6, 3.4); ctx.closePath();
  gr = ctx.createLinearGradient(-7, -3, 1, 5);
  gr.addColorStop(0, shade(hel, 1.25)); gr.addColorStop(1, shade(hel, 0.55));
  ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = shade(hel, 0.38); ctx.stroke();
  circle(-3, 0.4, 1.3, shade(hel, 0.45)); circle(-3.3, 0.1, 0.5, "rgba(255,255,255,0.45)");
  // つば
  ctx.beginPath(); ctx.moveTo(4.6, -6.6); ctx.lineTo(12.6, -6); ctx.quadraticCurveTo(18, -5.2, 17.4, -3.2);
  ctx.quadraticCurveTo(17, -2.4, 15, -2.4); ctx.lineTo(4.6, -3.2); ctx.closePath();
  gr = ctx.createLinearGradient(0, -6.6, 0, -2.4);
  gr.addColorStop(0, shade(hel, 1.3)); gr.addColorStop(1, shade(hel, 0.5));
  ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = shade(hel, 0.36); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(12.2, -5.5, 3.6, 0.5, 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// バッターの体は左の定位置に固定。バットの位置(ax, ay)に合わせて、体の傾きとバットの角度を変える
// (うでは伸ばさず、重心の移動・前傾・腰と肩の回転・バットの角度で高さや前後を表す)。
// swingT: null=構え / 数値=スイング中。CONTACT_SW でバットが(ax, ay)を通る。
// 動きの順番: 腰 -> 胴 -> 肩 -> うで -> バット(あとのパーツほど少し遅れて動く)。
// 見る向き: うしろ斜めから。ピッチャー(右)のほうへ顔を向け、せなかに背番号。
function drawBatter(ax, ay, swingT) {
  var D = Math.PI / 180;
  var LK = lookFor().b;
  var skin = LK.skin, jersey = LK.jersey, trim = LK.trim;
  var pantsC = LK.pants, shoeC = "#2a2b33";
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
  var fl = { x: baseX - 24, y: 412 - 3 * w2 }, fr = { x: baseX + 24 + 16 * w1, y: 412 - 12 * Math.sin(Math.PI * w1) };
  var tiltB = -0.55 * ss(0.3, 1.3, w);                // うしろ足: つま先を軸にかかとが上がる
  var tiltF = 0.28 * Math.sin(Math.PI * w1);          // 前足: 浮いているあいだはつま先が下がる
  var hh = 9 * Math.cos(rh) + 2;
  var phi0 = 0.12 + 0.05 * (ax - 395) / 45 + 0.04 * (ay - 360) / 50;   // 上半身の傾き(数度だけ)
  // 体の姿勢: wv=0..1 のときの腰・肩の中心(手の位置の基準)。構えでは体重がうしろ足にのる
  function torsoAt(wv) {
    var hxx = baseX - 3 * (1 - wv) + 11 * wv, ph = phi0 + 0.08 * wv;
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
  var wb = w <= 1 ? Math.pow(w, 1.25) : w;            // バットは肩よりすこし遅れてついてくる(w=1でぴったり(ax,ay))
  var th = w <= 1 ? lerp(th0, thc, wb) : lerp(thc, thf, w2);
  var dxb = Math.cos(th), dyb = Math.sin(th);
  var gh = greenHalfU(save.levels.meet);              // スイートスポット(緑): ミートで広がる

  var i, gr;
  ctx.save();
  // 地面の影(足もとはくっきり・全体はやわらかく)
  softShadow(baseX + 4, 414, 52, 8, 0.2);
  softShadow(fl.x + 2, 414, 15, 3.4, 0.5);
  softShadow(fr.x + 2, 414, 15 + 4 * w1, 3.4, 0.5 - 0.3 * Math.sin(Math.PI * w1));
  // 振り抜きでは、バットは背中側に回る(体のうしろに描く)
  if (w2 > 0.45) drawBatShape(gx, gy, th, BL, gh);
  // 足(うしろ足 / 前足): ふともも・すね(パンツ)・すそ・ストッキング + 骨盤
  var fa = footAnkle(fl, tiltB, fl.x + 11), fb = footAnkle(fr, tiltF, fr.x - 8);
  var lk = ik(hlx, HIP_Y, fa.x, fa.y, LEG_L, LEG_L, 1, 0.1);
  var rk = ik(hrx, HIP_Y, fb.x, fb.y, LEG_L, LEG_L, 1, 0.1);
  var legs = [seg(hlx, HIP_Y - 1, hrx, HIP_Y - 1, 8.5, 8.5, 8.5, 0.5, pantsC, 1.1, 0.74)];
  var sides = [[lk, hlx], [rk, hrx]], hemC = shade(pantsC, 0.78), stripeC = "#f2f2f4";
  for (i = 0; i < 2; i++) {
    var K = sides[i][0], hxL = sides[i][1];
    var pm = pt(K.ex, K.ey, K.tx, K.ty, 0.3);
    legs.push(seg(hxL, HIP_Y, K.ex, K.ey, 8.8, 9.8, 6.6, 0.38, pantsC, 1.12, 0.66));
    legs.push(seg(K.ex, K.ey, pm.x, pm.y, 6.8, 7, 6.5, 0.5, pantsC, 1.1, 0.68));
    legs.push(seg(pm.x, pm.y, K.tx, K.ty, 5.2, 5.8, 3.4, 0.3, trim, 1.2, 0.6));            // ストッキング(ふくらはぎのふくらみ)
  }
  drawSegs(legs);
  for (i = 0; i < 2; i++) {
    var KB = sides[i][0];
    band(KB.ex, KB.ey, KB.tx, KB.ty, 0.3, 6.6, 2.2, hemC);                                  // パンツのすそ
    band(KB.ex, KB.ey, KB.tx, KB.ty, 0.42, 5.8, 1.6, stripeC);                              // ストッキングの白いライン
    band(KB.ex, KB.ey, KB.tx, KB.ty, 0.5, 5.6, 1.6, stripeC);
  }
  // パンツのサイドライン・ひざのしわ・ふとももの陰影
  ctx.lineCap = "round";
  for (i = 0; i < 2; i++) {
    var KK = sides[i][0], hx0 = sides[i][1], sgn = i === 0 ? -1 : 1;
    var tdx = KK.ex - hx0, tdy = KK.ey - HIP_Y, tl = Math.sqrt(tdx * tdx + tdy * tdy) || 1, tnx = -tdy / tl, tny = tdx / tl;
    if (tnx * sgn < 0) { tnx = -tnx; tny = -tny; }      // 外側
    ctx.strokeStyle = trim; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(hx0 + tnx * 7.4, HIP_Y + tny * 7.4); ctx.lineTo(KK.ex + tnx * 5.6 + tdx * 0.02, KK.ey + tny * 5.6); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.17)"; ctx.lineWidth = 1;                          // ひざのしわ
    for (var q = 0; q < 3; q++) {
      var kx0 = KK.ex + 4 - q * 1.2, ky0 = KK.ey - 4 + q * 3.4;
      ctx.beginPath(); ctx.moveTo(kx0, ky0); ctx.quadraticCurveTo(kx0 - 3, ky0 + 1.4, kx0 - 5.4, ky0 + 0.6); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1.3;                 // ふとももの光
    ctx.beginPath(); ctx.moveTo(hx0 - tnx * 2 + tdx * 0.2, HIP_Y - tny * 2 + tdy * 0.2); ctx.lineTo(hx0 - tnx * 2 + tdx * 0.62, HIP_Y - tny * 2 + tdy * 0.62); ctx.stroke();
  }
  drawCleat(fl, tiltB, fl.x + 11, shoeC, trim); drawCleat(fr, tiltF, fr.x - 8, shoeC, trim);
  // ジャージの胴体: 肩の線と腰の線をつないだ形(ひねると幅が変わる。肩はなで肩、腰はしぼる)
  function torsoPath() {
    ctx.beginPath(); ctx.moveTo(sx - 5.6, sy - 3.6);
    ctx.quadraticCurveTo(slx + 3, sy - 2.6, slx - 3.5, sy + 3);
    ctx.bezierCurveTo(slx - 5, sy + 14, hlx - 6, HIP_Y - 26, hlx - 3.6, HIP_Y - 4);
    ctx.lineTo(hrx + 3.6, HIP_Y - 4);
    ctx.bezierCurveTo(hrx + 6, HIP_Y - 26, srx + 5, sy + 14, srx + 3.5, sy + 3);
    ctx.quadraticCurveTo(srx - 3, sy - 2.6, sx + 5.6, sy - 3.6);
    ctx.closePath();
  }
  torsoPath();
  gr = ctx.createLinearGradient(slx - 6, sy, srx + 6, sy + 10);
  gr.addColorStop(0, shade(jersey, 1.18)); gr.addColorStop(0.3, shade(jersey, 1.04)); gr.addColorStop(0.7, shade(jersey, 0.84)); gr.addColorStop(1, shade(jersey, 0.62));
  ctx.fillStyle = gr; ctx.fill();
  ctx.save(); torsoPath(); ctx.clip();
  var cxm = (slx + srx) / 2;
  // わきの下のかげ・腰まわりのかげ
  for (i = 0; i < 2; i++) {
    var axx = i ? srx - 1 : slx + 1;
    gr = ctx.createRadialGradient(axx, sy + 12, 0, axx, sy + 12, 10);
    gr.addColorStop(0, "rgba(10,10,30,0.3)"); gr.addColorStop(1, "rgba(10,10,30,0)");
    ctx.fillStyle = gr; ctx.fillRect(axx - 11, sy + 1, 22, 24);
  }
  gr = ctx.createLinearGradient(0, HIP_Y - 18, 0, HIP_Y - 3);
  gr.addColorStop(0, "rgba(10,10,30,0)"); gr.addColorStop(1, "rgba(10,10,30,0.26)");
  ctx.fillStyle = gr; ctx.fillRect(hlx - 12, HIP_Y - 18, hrx - hlx + 24, 16);
  // 肩ヨークの縫い目・背中の縫い目・サイドのパイピング
  ctx.lineCap = "round"; ctx.lineWidth = 0.9;
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.moveTo(slx + 1, sy + 7); ctx.quadraticCurveTo(cxm, sy + 11, srx - 1, sy + 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, sy + 9); ctx.lineTo((hlx + hrx) / 2, HIP_Y - 7); ctx.stroke();
  ctx.strokeStyle = trim; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(slx - 0.5, sy + 8); ctx.bezierCurveTo(slx - 1.5, sy + 16, hlx - 3, HIP_Y - 24, hlx - 1, HIP_Y - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(srx + 0.5, sy + 8); ctx.bezierCurveTo(srx + 1.5, sy + 16, hrx + 3, HIP_Y - 24, hrx + 1, HIP_Y - 5); ctx.stroke();
  // しわ: わきの下から斜めに・腰のたるみ(暗い線 + すぐ横に明るい線)
  var wr = [[slx + 3, sy + 13, sx - 4, sy + 20, 1], [srx - 3, sy + 13, sx + 4, sy + 20, -1],
            [slx + 5, sy + 17, sx - 6, sy + 26, 1], [srx - 5, sy + 17, sx + 6, sy + 26, -1],
            [hlx - 1, HIP_Y - 14, hx - 3, HIP_Y - 10, 1], [hrx + 1, HIP_Y - 14, hx + 3, HIP_Y - 10, -1],
            [hlx, HIP_Y - 19, hx - 5, HIP_Y - 15, 1], [hrx, HIP_Y - 19, hx + 5, HIP_Y - 15, -1]];
  for (i = 0; i < wr.length; i++) {
    var r0 = wr[i];
    ctx.strokeStyle = "rgba(10,10,40,0.17)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.quadraticCurveTo((r0[0] + r0[2]) / 2, (r0[1] + r0[3]) / 2 + 2, r0[2], r0[3]); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.beginPath(); ctx.moveTo(r0[0], r0[1] - 1.4); ctx.quadraticCurveTo((r0[0] + r0[2]) / 2, (r0[1] + r0[3]) / 2 + 0.6, r0[2], r0[3] - 1.4); ctx.stroke();
  }
  // 肩・背中のつや
  gr = ctx.createRadialGradient(slx + 3, sy + 5, 0, slx + 3, sy + 5, 14);
  gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gr; ctx.fillRect(slx - 12, sy - 6, 30, 28);
  // 背番号(ひねるとよこに細くなる)
  ctx.save(); ctx.translate(cxm + 1, (sy + HIP_Y) / 2 - 4); ctx.scale(Math.max(0.5, hw / 19), 1);
  ctx.font = "bold " + (LK.num.length > 1 ? 13 : 15) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineJoin = "round"; ctx.lineWidth = 2.2; ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.strokeText(LK.num, 0.6, 0.8);
  ctx.fillStyle = trim; ctx.fillText(LK.num, 0, 0);
  ctx.restore();
  ctx.restore();
  torsoPath(); ctx.lineWidth = 0.9; ctx.strokeStyle = shade(jersey, 0.42); ctx.lineJoin = "round"; ctx.stroke();
  // ベルト(ループ + バックル)
  var bl0 = hlx - 5.4, bl1 = hrx + 5.4;
  ctx.strokeStyle = "#1c1c24"; ctx.lineWidth = 4; ctx.lineCap = "butt";
  ctx.beginPath(); ctx.moveTo(bl0, HIP_Y - 4); ctx.lineTo(bl1, HIP_Y - 4); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(bl0, HIP_Y - 5.2); ctx.lineTo(bl1, HIP_Y - 5.2); ctx.stroke();
  ctx.strokeStyle = shade(pantsC, 0.6); ctx.lineWidth = 1.2;
  for (i = 0; i < 5; i++) { var lx = lerp(bl0 + 3, bl1 - 3, i / 4); ctx.beginPath(); ctx.moveTo(lx, HIP_Y - 6.4); ctx.lineTo(lx, HIP_Y - 1.4); ctx.stroke(); }
  gr = ctx.createLinearGradient(bl1 - 8, HIP_Y - 7, bl1 - 2, HIP_Y - 1);
  gr.addColorStop(0, "#f2dc8a"); gr.addColorStop(0.5, "#c9a64a"); gr.addColorStop(1, "#8a6a22");
  ctx.fillStyle = gr; roundRect(bl1 - 8, HIP_Y - 7.2, 6.4, 6.4, 1.2); ctx.fill();
  ctx.lineWidth = 0.7; ctx.strokeStyle = "#5a4010"; ctx.stroke();
  ctx.fillStyle = "#1c1c24"; ctx.fillRect(bl1 - 6.5, HIP_Y - 5.6, 3.4, 3.2);
  // 首(僧帽筋から) + 頭 + ヘルメット(ピッチャー側を向く)
  var hdx = sx + 20 * Math.sin(phi) + 3, hdy = sy - 20 * Math.cos(phi);
  drawSegs([seg(sx, sy - 1, hdx - 0.5, hdy + 8, 6.4, 5.4, 4.6, 0.5, skin, 1.0, 0.62)]);
  // えり(ネックバンド)
  ctx.lineCap = "round"; ctx.lineWidth = 2.6; ctx.strokeStyle = trim;
  ctx.beginPath(); ctx.moveTo(sx - 6, sy - 3.4); ctx.quadraticCurveTo(sx, sy + 1.6, sx + 6, sy - 3.4); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.strokeStyle = shade(trim, 0.5);
  ctx.beginPath(); ctx.moveTo(sx - 6, sy - 2); ctx.quadraticCurveTo(sx, sy + 3, sx + 6, sy - 2); ctx.stroke();
  drawBatterHead(hdx, hdy, phi * 0.5 - 0.04, LK);
  // うしろ側のうで(上腕 + 前腕)
  var a1 = ik(slx, sy + 3, gx, gy, ARM1, ARM2, -0.4, 1);
  drawArm(slx, sy + 3, a1, jersey, trim, skin);
  if (w2 <= 0.45) drawBatShape(gx, gy, th, BL, gh);
  // 前側のうで(両手でバットをにぎる)
  var a2 = ik(srx, sy + 3, gx + dxb * 8, gy + dyb * 8, ARM1, ARM2, 0.4, 1);
  drawArm(srx, sy + 3, a2, jersey, trim, skin);
  drawGlove(a1.tx, a1.ty, th, trim); drawGlove(a2.tx, a2.ty, th, trim);
  ctx.restore();
}
// 構えのままの立ち姿(タイトル・結果画面用)。足元(x, y)、大きさ sc。lk=ステージ番号(省略すると今のキャラ)
function drawBatterStand(x, y, sc, lk) {
  var keep = lookOverride;
  if (lk !== undefined) lookOverride = lk;
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-322, -412);
  drawBatter(395, ZONE_Y, null);
  ctx.restore();
  lookOverride = keep;
}

// ピッチャー(遠くのマウンド): 7頭身。足元(x, y)、大きさ s(s=1で身長 約145)。
// wind: 0〜1=ふりかぶり(1でリリース) / 1〜=リリース後の経過秒 / 2=フィニッシュ。左投げ。
// 流れ: セット → ひざを上げる → ステップ → 腕を回す → リリース → フォロースルー
var pitcherHand = { x: 404, y: 163 };      // 投げる手の画面上の位置(リリースのとき ballAt の開始点に合わせる)
// ---- 動物ピッチャーのパーツ(小さく描くので、耳・しっぽ・くちばしを大きく単純な形にしている) ----
function poly(pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function spikes(cx, cy, r0, r1, n, a0, a1, fill) {   // ギザギザの円(たてがみ・はり)
  ctx.beginPath();
  for (var i = 0; i <= n * 2; i++) {
    var a = a0 + (a1 - a0) * i / (n * 2), r = i % 2 ? r0 : r1;
    var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function curveTail(x0, y0, cx, cy, x1, y1, w, fill, edge) {
  ctx.lineCap = "round";
  ctx.strokeStyle = edge; ctx.lineWidth = w + 2.4;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
}
function ell(x, y, rx, ry, rot, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
// しっぽ・背中のはり(体のうしろ)。(tx, ty)=こしの右がわ
function drawAnimalTail(P, tx, ty, sr, hipTop) {
  switch (P.sp) {
    case "rabbit": circle(tx + 5, ty - 2, 7.5, P.dark); circle(tx + 5, ty - 2, 6, "#fff"); break;
    case "cat": curveTail(tx, ty, tx + 24, ty - 2, tx + 15, ty - 34, 6.5, P.fur, P.dark);
      ctx.strokeStyle = P.dark; ctx.lineWidth = 6.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tx + 18, ty - 22); ctx.quadraticCurveTo(tx + 15, ty - 28, tx + 15, ty - 34); ctx.stroke(); break;
    case "dog": curveTail(tx, ty, tx + 16, ty - 2, tx + 13, ty - 20, 6, P.fur, P.dark); break;
    case "fox": ctx.save(); ctx.translate(tx + 10, ty - 8); ctx.rotate(-0.8);
      ell(0, 0, 18, 9.5, 0, P.dark); ell(0, 0, 16.5, 8, 0, P.fur); ell(13, 0, 6.5, 6, 0, "#fff"); ctx.restore(); break;
    case "tanuki": ctx.save(); ctx.translate(tx + 10, ty - 6); ctx.rotate(-0.6);
      ell(0, 0, 13, 8.5, 0, P.dark); ell(0, 0, 11.5, 7, 0, P.fur);
      ctx.strokeStyle = P.dark; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-3, -6.5); ctx.lineTo(-3, 6.5); ctx.moveTo(4, -6); ctx.lineTo(4, 6); ctx.stroke(); ctx.restore(); break;
    case "penguin": poly([tx - 2, ty - 4, tx + 11, ty + 5, tx - 2, ty + 8], P.dark); break;
    case "hedgehog": {   // 背中のはり(肩からこしまで)
      var ex = 0, pts = [sr.x - 2, sr.y - 2];
      for (var k = 0; k <= 6; k++) {
        var t = k / 6, bx = lerp(sr.x + 4, tx - 1, t), by = lerp(sr.y, ty + 4, t);
        pts.push(bx + (k % 2 ? 6 : 15), by + (k % 2 ? 0 : -4));
      }
      pts.push(tx - 2, ty + 6); poly(pts, P.dark); break; }
    case "lion": curveTail(tx, ty, tx + 18, ty - 2, tx + 17, ty - 22, 3.6, P.fur, P.dark);
      circle(tx + 17, ty - 24, 6, P.dark); circle(tx + 17, ty - 24, 4.4, P.mane || "#c8742a"); break;
  }
}
// 頭のうしろにあるもの(たてがみ・はり)
function drawAnimalHeadBack(P, hx, hy) {
  if (P.sp === "lion") { spikes(hx, hy + 1, 15.5, 21, 9, 0, Math.PI * 2, P.dark); circle(hx, hy + 1, 15, "#c8742a"); }
  else if (P.sp === "hedgehog") spikes(hx, hy - 1, 17, 24, 8, Math.PI * 0.95, Math.PI * 2.05, P.dark);
}
// 顔(頭の丸 + 目・はな・くち)
function drawAnimalFace(P, hx, hy) {
  var sp = P.sp;
  if (sp === "dog") { ell(hx - 12.5, hy + 3, 4.8, 9.5, 0.22, P.dark); ell(hx + 12.5, hy + 3, 4.8, 9.5, -0.22, P.dark); }   // たれ耳
  circle(hx, hy, 12.8, P.fur);
  // 顔の白いところ
  if (sp === "penguin") { circle(hx - 5, hy + 4, 6.6, P.belly); circle(hx + 5, hy + 4, 6.6, P.belly); circle(hx, hy + 2, 6.4, P.belly); }
  else if (sp === "hedgehog") ell(hx, hy + 4, 9.8, 8.4, 0, P.belly);
  else if (sp === "fox") { poly([hx - 13, hy + 1, hx - 2, hy + 5, hx - 9, hy + 12], P.belly); poly([hx + 13, hy + 1, hx + 2, hy + 5, hx + 9, hy + 12], P.belly); ell(hx, hy + 6.8, 6.5, 4.8, 0, P.belly); }
  else if (sp === "tanuki") { ell(hx, hy + 6.5, 8.6, 5.6, 0, P.belly); ell(hx - 5, hy + 1.4, 4.4, 3.8, 0.5, P.dark); ell(hx + 5, hy + 1.4, 4.4, 3.8, -0.5, P.dark); }
  else ell(hx, hy + 6.4, sp === "dog" ? 8 : sp === "lion" ? 7.6 : 6.6, sp === "dog" ? 5.6 : 4.8, 0, P.belly);
  // 目
  var ey = hy + 1.4, er = sp === "penguin" ? 2.2 : 2.5;
  circle(hx - 4.8, ey, er, "#2b2b33"); circle(hx + 4.8, ey, er, "#2b2b33");
  circle(hx - 4.1, ey - 0.8, 0.9, "#fff"); circle(hx + 5.5, ey - 0.8, 0.9, "#fff");
  circle(hx - 8.4, hy + 5, 2.3, "rgba(255,110,140,0.5)"); circle(hx + 8.4, hy + 5, 2.3, "rgba(255,110,140,0.5)");
  // はな・くち
  ctx.strokeStyle = "#7a3a2a"; ctx.lineWidth = 1.1; ctx.lineCap = "round";
  if (sp === "penguin") {
    poly([hx - 4.6, hy + 5, hx + 4.6, hy + 5, hx, hy + 11], "#ffa51f");
    ctx.beginPath(); ctx.moveTo(hx - 3.6, hy + 6.8); ctx.lineTo(hx + 3.6, hy + 6.8); ctx.strokeStyle = "#d9760a"; ctx.stroke();
    return;
  }
  var nose = sp === "rabbit" ? "#ff8fa8" : sp === "cat" ? "#ff8fa8" : sp === "lion" ? "#6a3a1a" : sp === "tanuki" ? "#2b2b33" : "#2b2b33";
  var nr = sp === "dog" ? 2.7 : sp === "hedgehog" ? 2.2 : 1.9;
  circle(hx, hy + 5, nr, nose);
  ctx.beginPath(); ctx.arc(hx, hy + 7.2, 2.6, 0.25, Math.PI - 0.25); ctx.stroke();
  if (sp === "rabbit") { ctx.fillStyle = "#fff"; ctx.fillRect(hx - 1.4, hy + 9.2, 2.8, 2.6); ctx.strokeStyle = "#cfa0ae"; ctx.lineWidth = 0.7; ctx.strokeRect(hx - 1.4, hy + 9.2, 2.8, 2.6); }
  if (sp === "dog") ell(hx + 1, hy + 11, 1.8, 2.5, 0, "#ff7f9c");
  if (sp === "cat") {   // ひげ
    ctx.strokeStyle = "#5a4030"; ctx.lineWidth = 0.9;
    for (var wi = -1; wi <= 1; wi += 2) for (var wk = 0; wk < 2; wk++) {
      ctx.beginPath(); ctx.moveTo(hx + wi * 8, hy + 6 + wk * 2.2); ctx.lineTo(hx + wi * 16.5, hy + 4.2 + wk * 4.4); ctx.stroke();
    }
  }
}
// ぼうし(耳が出るところは耳を上からかさねる)
function drawAnimalCap(P, hx, hy) {
  var capc = P.cap;
  ctx.fillStyle = capc;
  ctx.beginPath(); ctx.arc(hx, hy - 3, 12.8, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx, hy - 3.6, 14, 3.4, 0, 0, Math.PI); ctx.fill();    // つば
  ctx.strokeStyle = P.trim; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(hx, hy - 3, 9.5, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  var sp = P.sp, i, sd;
  for (i = -1; i <= 1; i += 2) {
    sd = i;
    if (sp === "rabbit") {
      ctx.save(); ctx.translate(hx + sd * 5.4, hy - 11); ctx.rotate(sd * 0.2);
      ell(0, -11, 4.6, 13, 0, P.dark); ell(0, -11, 3.8, 12.2, 0, P.fur); ell(0, -10.5, 2, 9.4, 0, P.inner);
      ell(0, 0.5, 5.4, 1.8, 0, P.trim); ctx.restore();
    } else if (sp === "cat") {
      poly([hx + sd * 3.4, hy - 12, hx + sd * 13, hy - 7, hx + sd * 11.6, hy - 26], P.dark);
      poly([hx + sd * 4.8, hy - 12.5, hx + sd * 12, hy - 8.6, hx + sd * 10.8, hy - 23], P.fur);
      poly([hx + sd * 6.8, hy - 13, hx + sd * 11, hy - 10.5, hx + sd * 10.4, hy - 19.5], P.inner);
    } else if (sp === "fox") {
      poly([hx + sd * 2, hy - 12, hx + sd * 13, hy - 8, hx + sd * 10.5, hy - 29], P.dark);
      poly([hx + sd * 3.2, hy - 12.5, hx + sd * 12, hy - 9.2, hx + sd * 10.3, hy - 25], P.fur);
      poly([hx + sd * 6, hy - 13, hx + sd * 10.8, hy - 11, hx + sd * 10.2, hy - 21], P.inner);
      poly([hx + sd * 9.4, hy - 22, hx + sd * 11.1, hy - 23.2, hx + sd * 10.5, hy - 29], P.dark);
    } else if (sp === "tanuki") {
      circle(hx + sd * 10.5, hy - 12.5, 5.4, P.dark); circle(hx + sd * 10.5, hy - 12.5, 3, P.inner);
    } else if (sp === "lion") {
      circle(hx + sd * 11, hy - 13.5, 5.2, P.dark); circle(hx + sd * 11, hy - 13.5, 4.2, P.fur); circle(hx + sd * 11, hy - 13.5, 2, P.dark);
    } else if (sp === "hedgehog") {
      circle(hx + sd * 11.5, hy - 10, 3.8, P.dark); circle(hx + sd * 11.5, hy - 10, 3, P.fur); circle(hx + sd * 11.5, hy - 10, 1.4, P.inner);
    }
  }
}

function drawPitcher(x, y, s, wind) {
  var LK = lookFor().p;
  var skin = LK.fur, jersey = LK.jersey, trim = LK.trim;
  var pantsC = LK.pants, glove = "#8a5a2b", shoeC = LK.shoe || "#26262e";
  var FM = LK.form || "over";
  var u = Math.min(1, wind), fk = wind > 1 ? ss(0, 0.25, wind - 1) : 0;
  var cam = 0.2, ccs = Math.cos(cam), csn = Math.sin(cam);
  var turn = ss(0.1, 0.4, u) - ss(0.7, 0.95, u);        // 横向きになる度合い
  var A = ss(0.1, 0.42, u) * (FM === "quick" ? 0.25 : FM === "power" ? 1.1 : 1), B = ss(0.48, 0.88, u);       // A=ひざ上げ B=ステップ
  var Wd = FM === "bigwind" ? ss(0.04, 0.28, u) - ss(0.45, 0.72, u) : 0;               // 両手を頭の上にあげる度合い
  var Tw = FM === "tornado" ? ss(0.12, 0.38, u) - ss(0.52, 0.78, u) : 0;               // 背中をバッターに向ける度合い
  var leap = (FM === "tornado" ? 13 : FM === "power" ? 8 : 0) * Math.sin(Math.PI * clamp((u - 0.4) / 0.5, 0, 1));
  var cockP = ss(0.35, 0.72, u), acc = ss(0.72, 1, u);   // 腕の引き / 腕の振り
  var hipH = 71 - 2 * A - 9 * B - 3 * fk + leap;
  var hx = -2 * A + B;
  var hh = 9.5 - 3 * turn - 5 * Tw, hw = 17 - 7 * turn - 12 * Tw;
  var L = 0.04 + 0.12 * B + 0.28 * acc + 0.3 * fk - 0.24 * Wd - 0.2 * Tw + (FM === "under" ? 0.1 * acc : 0);       // 前傾
  var T = 0.1 * cockP + 0.18 * acc + 0.1 * fk + (FM === "side" ? 0.28 * acc : FM === "threeq" ? 0.1 * acc : 0);   // 投げる側の肩が下がる
  var sxc = hx, syc = -hipH - TORSO_L * Math.cos(L) + TORSO_L * Math.sin(L) * csn;
  var sg = { x: sxc - hw * Math.cos(T), y: syc - hw * Math.sin(T) };   // グラブ側の肩(画面左)
  var sr = { x: sxc + hw * Math.cos(T), y: syc + hw * Math.sin(T) };   // 投げる側の肩(画面右)
  var hdx = sxc - 6 * T, hdy = syc - 17 * Math.cos(L) + 17 * Math.sin(L) * csn;

  // 足の位置(ひざ上げ -> ステップ)
  var restF = { x: -11, y: 0 }, liftF = { x: -7, y: -36 }, landF = { x: -20, y: 9 };
  var f1x = lerp(restF.x, liftF.x, A), f1y = lerp(restF.y, liftF.y, A);
  var lead = { x: lerp(f1x, landF.x, B), y: lerp(f1y, landF.y, B) };
  var pivot = { x: 11 + 3 * fk, y: -13 * fk };
  lead.y -= leap; pivot.y -= leap;   // とびあがるときは足も浮く
  var lk = ik(hx - hh, -hipH, lead.x, lead.y - 5, LEG_L, LEG_L, -1, 0.2);
  var pk = ik(hx + hh, -hipH, pivot.x, pivot.y - 5, LEG_L, LEG_L, 1, 0.2);

  // 投げる腕: 3次元の向きで回し(長さは一定)、画面に投影する → 手前に向かうと短く見えるだけで伸びない
  var Udn = [0.15, -0.95, 0.2], Fdn = [0.1, -0.9, 0.35];
  var Uck = [0.97, 0.1, -0.2], Fck = [0.25, 0.88, -0.4];
  var Urel = [0.15, 0.5, 0.85], Frel = [-0.25, 0.5, 0.83];
  var Ufol = [-0.3, -0.6, 0.75], Ffol = [-0.85, -0.45, 0.3];
  if (FM === "side") { Urel = [0.92, 0.0, 0.4]; Frel = [0.9, 0.05, 0.45]; Ufol = [-0.5, -0.2, 0.84]; Ffol = [-0.8, -0.3, 0.5]; }
  else if (FM === "under") { Uck = [0.4, -0.6, -0.7]; Fck = [0.2, -0.5, -0.85]; Urel = [0.1, -0.75, 0.65]; Frel = [0.0, -0.55, 0.85]; Ufol = [-0.2, 0.2, 0.95]; Ffol = [-0.4, 0.5, 0.8]; }
  else if (FM === "threeq") { Uck = [0.95, 0.3, -0.2]; Urel = [0.25, 0.25, 0.93]; Frel = [-0.2, 0.25, 0.95]; }
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
  var chest = { x: sxc + 3 - 3 * Wd, y: syc + 14 - 46 * Wd };
  var ikR = ik(sr.x, sr.y, chest.x, chest.y, ARM1, ARM2, 0.3, 1);
  var bI = wind > 1 ? 0 : 1 - ss(0.25, 0.5, u);
  var rE = { x: lerp(fkE.x, ikR.ex, bI), y: lerp(fkE.y, ikR.ey, bI) };
  var rH = { x: lerp(fkH.x, ikR.tx, bI), y: lerp(fkH.y, ikR.ty, bI) };
  // グラブ側のうで
  var gOut = ss(0.4, 0.85, u);
  var gT = { x: lerp(sxc - 3, sxc - 26, gOut), y: lerp(syc + 14, syc + 4, gOut) };
  gT = { x: lerp(gT.x, sxc - 14, fk), y: lerp(gT.y, syc + 22, fk) };
  gT = { x: lerp(gT.x, sxc - 6, Wd), y: lerp(gT.y, syc - 32, Wd) };
  var ikG = ik(sg.x, sg.y, gT.x, gT.y, ARM1, ARM2, -0.4, 1);

  pitcherHand = { x: x + rH.x * s, y: y + rH.y * s };

  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // 影
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  // しっぽ・背中のはり(体のうしろ)
  drawAnimalTail(LK, hx + hh + 3, -hipH + 2, sr, -hipH);
  // 足 + スパイク
  drawLeg(hx - hh, -hipH, lk.ex, lk.ey, lk.tx, lk.ty, 14, pantsC, trim);
  drawLeg(hx + hh, -hipH, pk.ex, pk.ey, pk.tx, pk.ty, 14, pantsC, trim);
  drawShoe(lead.x, lead.y, -1, shoeC); drawShoe(pivot.x, pivot.y, 1, shoeC);
  // パンツ + ジャージ + ベルト
  ctx.fillStyle = pantsC;
  roundRect(hx - hh - 7, -hipH - 6, hh * 2 + 14, 16, 6); ctx.fill();
  ctx.fillStyle = jersey; ctx.strokeStyle = jersey; ctx.lineWidth = 9; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(sg.x, sg.y + 1); ctx.lineTo(sr.x, sr.y + 1); ctx.lineTo(hx + hh, -hipH - 6); ctx.lineTo(hx - hh, -hipH - 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx - hh - 5, -hipH - 4); ctx.lineTo(hx + hh + 5, -hipH - 4); ctx.stroke();
  drawNumber(sxc, (syc - hipH) / 2 - 2, LK.num, trim, LK.num.length > 1 ? 11 : 13);
  // 首 + 頭(動物) + ぼうし
  ctx.strokeStyle = LK.sp === "penguin" ? LK.dark : skin; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sxc, syc + 1); ctx.lineTo(hdx, hdy + 6); ctx.stroke();
  drawAnimalHeadBack(LK, hdx, hdy);
  drawAnimalFace(LK, hdx, hdy);
  drawAnimalCap(LK, hdx, hdy);
  // グラブ側のうで + グラブ
  limb(sg.x, sg.y + 1, ikG.ex, ikG.ey, ikG.tx, ikG.ty, 10, jersey, 7, skin);
  circle(sg.x, sg.y + 1, 5.5, jersey);
  circle(ikG.tx, ikG.ty, 6.5, glove);
  ctx.strokeStyle = "#5e3a18"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(ikG.tx, ikG.ty, 3.2, 0, Math.PI * 2); ctx.stroke();
  // 投げる側のうで
  limb(sr.x, sr.y + 1, rE.x, rE.y, rH.x, rH.y, 10, jersey, 7, skin);
  circle(sr.x, sr.y + 1, 5.5, jersey);
  circle(rH.x, rH.y, 4, skin);
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
// 投げ方ごとの、ボールが手をはなれる位置(drawPitcher の手の位置に合わせてある)
var FORM_REL = { over: { x: 404, y: 161 }, side: { x: 427, y: 173 }, bigwind: { x: 404, y: 161 }, under: { x: 406, y: 191 }, quick: { x: 405, y: 161 }, threeq: { x: 406, y: 169 }, tornado: { x: 404, y: 161 }, power: { x: 404, y: 161 } };
function ballAt(pitchT) {
  var T = g.ballTime, p = pitchT / T;
  if (p > 1) {
    var ex = Math.min(1, (pitchT - T) / PASS_T);
    return { x: g.bx, y: g.by + 28 * ex, r: 9 - ex, a: 1, sx: g.bx, sy: 400 };
  }
  // 球種ごとの軌道。どの球種も p=1 で必ず (g.bx, g.by) に着く(横・縦のズレは p=0 と p=1 で 0)
  var ty = g.type, rl = g.rel || FORM_REL.over, sd = g.side || 1;
  var e = Math.pow(p, ty === "change" ? 2.3 : ty === "slow" ? 1.15 : ty === "rising" ? 1.35 : 1.6);
  var dropAmt = ty === "drop" ? 60 : ty === "sinker" ? 34 : 0;
  var tgt = g.by - dropAmt;
  var x = rl.x + (g.bx - rl.x) * e;
  var line = rl.y + (tgt - rl.y) * e;
  var gy = 165 + (400 - 165) * e;      // その奥行きでの地面の高さ
  var y = line;
  var sn = Math.sin(Math.PI * p);
  if (ty === "bounce") {
    if (p < 0.55) {
      var s1 = p / 0.55;
      y = line + (gy - line) * s1 * s1;
    } else {
      var s2 = (p - 0.55) / 0.45;
      y = gy + (line - gy) * Math.sqrt(s2);
    }
  } else if ((ty === "drop" || ty === "sinker") && p > 0.65) {
    var s3 = (p - 0.65) / 0.35;
    y = line + dropAmt * s3 * s3;
    if (ty === "sinker") x += sd * 22 * sn * p;                  // シンカー: 横にもすこし沈む
  } else if (ty === "curve") {          // カーブ: 大きく山なりに曲がって落ちる
    x += sd * 60 * sn * (1 - p) * 1.6; y -= 50 * sn;
  } else if (ty === "slider") {         // スライダー: 後半に横へ鋭く曲がる
    x += sd * 78 * sn * p * p; y += 6 * sn;
  } else if (ty === "knuckle") {        // ナックル: ふらふら揺れる
    x += 15 * Math.sin(p * 21) * sn; y += 11 * Math.sin(p * 16 + 1) * sn;
  } else if (ty === "rising") {         // ライジング: 浮き上がって見える
    y -= 30 * sn;
  } else if (ty === "slow") {           // スローボール: ふわっと高く山なり
    y -= 86 * sn;
  }
  var a = (ty === "vanish" && p > 0.45 && p < 0.78) ? 0 : 1;
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
          text(st.name, x + w / 2, y + 44, 16, en ? "#4a3f8f" : "#8a8a9a", "center", null, w - 16);
          if (en) {
            drawPitcherIcon(i, x + w - 36, y + h - 6, 0.5);   // 動物ピッチャーのアイコン
            text("投手", x + 12, y + 66, 11, "#999", "left");
            text(LOOKS[i].p.pname, x + 12, y + 83, 14, "#d6336c", "left", null, 84);
            text("(" + LOOKS[i].p.jp + ")", x + 12, y + 98, 11, "#777", "left", null, 84);
            text("球数 " + st.pitches + " 目標HR " + st.target, x + 12, y + 111, 11, "#555", "left", null, 110);
            text("ベスト HR " + save.best[i], x + 12, y + 124, 11, "#888", "left");
          } else {
            text("球数 " + st.pitches + "  目標HR " + st.target, x + w / 2, y + 74, 14, "#8a8a9a", "center", null, w - 16);
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
  if (g.phase === "intro") { showPop = true; txt = "プレイボール!"; sub = "ピッチャーは " + pitcherLabel(g.idx); }
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
    drawBatterStand(400, 352, 0.9, r.idx);
    for (var i = 0; i < 12; i++) {
      var a = time * 1.5 + i * 0.52;
      circle(400 + Math.cos(a) * (130 + (i % 3) * 20), 220 + Math.sin(a) * 60, 5, ["#ff6f91", "#ffd23f", "#6a8cff", "#3ddc60"][i % 4]);
    }
  } else {
    text("ざんねん…", 400, 80, 54, "#ffffff", "center", "#6a5acd");
    drawBatterStand(400, 352, 0.9, r.idx);
  }
  text(st.name + "   ホームラン " + r.hr + " / " + r.target, 400, 130, 22, "#4a3f8f");
  text("あいて: " + pitcherLabel(r.idx), 640, 192, 14, "#d6336c", "center", null, 200);
  drawPitcherIcon(r.idx, 640, 346, 0.85);
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
