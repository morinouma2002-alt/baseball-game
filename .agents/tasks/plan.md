> **Verification (iteration 1)**
> - 
ode is not installed here, so 
ode --check could not be run. Substitute: loaded game.js in headless Chrome (file:// URL, no server) via a temporary test page (deleted afterwards). No script errors were raised while the page ran and while synthetic pointer/keyboard events were driven through title -> stage select -> batting.
> - Test page checks, all PASS: classify() green=HR (>90m even at the zone edge, Lv0), early yellow=foul side -1, late yellow=foul side +1, outer early=ground, outer late=fly, far=miss; meet Lv10 turns a 0.1s offset into HR (Lv0 does not); power Lv10 adds >60m; eye raises ball-time factor; 6 stages with decreasing ballTime; save round-trip load (clamps levels 0..10, array lengths 6, mute) and corrupt JSON falls back to defaults.
> - Grep for pooh/disney/Japanese equivalents in index.html, style.css, game.js: 0 matches.
> - Traced by reading: stage unlock = cleared[i-1]; pitchesLeft decremented once at release; one swing per pitch (g.swung); clear ends at HR>=target, fail at 0 pitches; rewards first-clear full / repeat 30% / fail 5 per HR; upgrade cost 20+15*Lv deducts coins and saves.
> - Not verified: visual look and audio in a real browser, touch hardware.
# Implementation Plan: ホームランダービー (original human-character batting game)

Findings: workspace was empty (only this plan). `node` was NOT found on PATH in this environment, so `node --check` may be unavailable; see Verification fallback. Single implementation covers everything. No external libs, no build, must work via double-click (file://). Therefore: plain `<script src="game.js">` (NO ES modules, which fail on file://), no fetch, no external images/fonts. All UI text in Japanese. No Disney/Pooh references anywhere (code, comments, names). Characters are generic humans.

## Decisions
- Rendering: single `<canvas>` 800x450 logical size, scaled via CSS (`width:100%; max-height:100vh; aspect-ratio:16/9`), all screens drawn on canvas (buttons as canvas hit-rects). Reason: one input path for mouse/touch, no DOM sync.
- Characters: canvas primitives (circles, rounded rects, lines), parameterised draw functions with pose/frame arguments. Reason: no assets, easy animation.
- Timing model: ball travel time based, swing judged by offset from ideal time (not by a separate meter), plus a visible timing bar under the field showing the green zone. Reason: matches the reference ("timing + green part of bat") and is simple to test.
- Sound: WebAudio beeps, created lazily on first user gesture, mute toggle persisted.

## Files
- index.html: canvas, `<meta viewport>`, links style.css and game.js, lang="ja".
- style.css: black/pastel background, centered canvas, `touch-action:none`, `user-select:none`.
- game.js: everything, in one IIFE, `"use strict"`.

## Items

- [ ] 1. Create index.html and style.css.
      Files: index.html, style.css
      Verify: open index.html in a browser; canvas visible and scales on window resize.

- [ ] 2. game.js core: constants, state machine, main loop, input, save.
      State machine `scene` in: `title`, `stageSelect`, `status`, `batting`, `result`.
      Transitions: title -(タップ/Space/Enter)-> stageSelect; stageSelect -> batting (unlocked stage), -> status (ステータス button), -> title (もどる); batting -> result when pitchesLeft==0 and no ball in flight (or early clear when homeruns>=target is NOT ended early; finish all pitches? Decision: end immediately once target reached = clear, or pitches exhausted = fail); result -> batting (リトライ) / stageSelect (ステージ選択へ); status -> stageSelect.
      Loop: `requestAnimationFrame`, dt clamped to 0.05s, `update(dt)` then `draw()`.
      Canvas scaling: convert pointer coords with `getBoundingClientRect` -> logical 800x450.
      Verify: syntax check (see Verification); all scene transitions clickable.

- [ ] 3. Stage data table (STAGES array, 6 stages):
      | id | 名前 | pitches | target HR | ballTime(s, pitch→plate) | curve (px lateral) | reward coins |
      | 1 | はじめの公園 | 10 | 3 | 1.40 | 0 | 30 |
      | 2 | 商店街グラウンド | 10 | 4 | 1.25 | 0 | 50 |
      | 3 | 学校のグラウンド | 10 | 5 | 1.15 | 20 | 80 |
      | 4 | 河川敷スタジアム | 10 | 5 | 1.05 | 35 | 120 |
      | 5 | ドームスタジアム | 9 | 5 | 0.95 | 50 | 180 |
      | 6 | サークル決勝戦 | 9 | 6 | 0.85 | 65 | 260 |
      Stage i unlocked iff i==1 or cleared[i-1]. Locked stages show 🔒-style drawn lock and cannot be started. Ball speed also varies ±5% randomly per pitch; stages >=3 pick a pitch type randomly: straight or curve (lateral drift visible in ball path; hit timing judged on arrival time only, with the drawn ball offset so the player reads it).
      Verify: stage select shows 6 cards with pitches/target/locks; stage 2+ locked on fresh save.

- [ ] 4. Batting mechanics and hit classification.
      Per pitch: phase `windup` (0.6s pitcher animation) -> `pitch` (ball t from 0 to ballTime, position lerps pitcher→plate with curve offset `curve*sin(pi*p)`-style drift, scaled up as it approaches) -> after arrival, `miss` flight past the catcher unless swung.
      Swing: input sets `swingTime = now`. Swing animation lasts 0.25s (batter sprite shows bat arc). One swing per pitch; swinging before ball released (windup) is allowed but counts as a miss (swing wasted, pitch still proceeds and counts).
      Offset: `d = swingTime - ballArrivalTime` (seconds; negative = early).
      Green half-width `G = 0.045 + 0.012*meet` (meet level 0..10 → 0.045..0.165s)... capped so hardest stage is still possible. Yellow half-width `Y = G*2.2`. Timing bar shown: horizontal bar with center green zone proportional to G, yellow sides proportional to Y, a marker moving across as the ball approaches (marker position = (now - arrival)/ (Y*2.5)).
      Classification by `|d|`:
        - `|d| <= G`: ホームラン. Distance = `baseDist(power) * (1 - 0.35*(|d|/G)) ` roughly 70..140m+; minimum guaranteed to exceed fence (fence = 90m) so every green hit is HR.
        - `G < |d| <= Y`: d<0 (early) -> ファウル (flies to left side, no HR), d>0 (late) -> ファウル to right side; random 40% of these become 内野ゴロ / 外野フライ (out) instead. Not a HR.
        - `Y < |d| <= Y*1.8`: d<0 -> ゴロ, d>0 -> フライアウト (distance 30-70m, below fence).
        - otherwise or no swing: 空振り/見逃し (ストライク).
      HR distance: `dist = 90 + 6*power_level_bonus...` concretely `dist = (95 + 7*power) * (1 - 0.3*(|d|/G)) + rand(0..8)`, clamp >= 91. Power therefore visibly changes the displayed distance (e.g., 95m at Lv0 to 165m at Lv10).
      Result text popup (大きく表示): ホームラン!! / ファウル / ゴロ / フライ / 空振り, with 飛距離 in m. Ball flight animation: parabola from plate to the outfield/stands, camera-less (ball shrinks as it goes), 1.2s, then next pitch.
      HUD: 残り球数, ホームラン n / 目標, ステージ名, mute button, pause-free.
      Verify: manual (see below).

- [ ] 5. Status system.
      Stats (level 0..10 each): パワー (distance), ミート (green zone width), 選球眼 (slower ball + clearer ball/trail).
      Cost to go from level L to L+1: `20 + 15*L` coins.
      Effects: power → HR distance (item 4); meet → G as in item 4; 選球眼 → effective ballTime `= stage.ballTime * (1 + 0.025*eye)` (up to +25% slower) and the ball shows a trailing path/shadow of length proportional to eye level.
      Status screen: shows coins, three rows with current level bar, effect text (e.g. "ミート Lv3: ジャストゾーン +x%"), cost, [強化] button (disabled grey when insufficient coins or max), もどる button.
      Verify: see manual checks.

- [ ] 6. Save/load. localStorage key `circleHRDerby.save.v1`; mute in same object.
      Schema: `{ "v":1, "coins":number, "cleared":[bool x6], "best":[number x6 best HR count], "levels":{"power":0,"meet":0,"eye":0}, "mute":false }`.
      `loadSave()`: try/catch JSON.parse, validate types and clamp (levels 0..10, array lengths to STAGES.length), fall back to defaults on any error (also if localStorage throws, e.g. blocked under file://; then keep in-memory state). `saveGame()` called after: stage result, status upgrade, mute toggle. Reset button (on title screen or stage select, small "データを消す"): two-step confirm drawn on canvas (or `confirm()` with Japanese text), then removes key and restores defaults.
      Verify: see manual checks.

- [ ] 7. Human character drawing (canvas).
      `drawBatter(ctx, x, y, swingProgress)`: round head with simple face (dot eyes, smile, blush), cap in team color, body (rounded rect uniform), legs, arms holding a bat that rotates from back (-110deg) to follow-through (+70deg) by swingProgress; bat has a visible green band at the sweet spot.
      `drawPitcher(ctx, x, y, windupProgress)`: similar human with different cap/uniform color, arm rotates overhead during windup, releases ball at progress 1.
      Also catcher/umpire optional small figures, simple crowd of circle heads in stands. Field: sky gradient, grass, mound, home plate, fence with distance marker. All made from arc/rect/lines; nothing external.
      Verify: visually in browser; humans only.

- [ ] 8. Input handling.
      Pointer events (`pointerdown`) on canvas handle mouse and touch; `e.preventDefault()`; coordinate mapping to logical canvas. In batting scene any pointerdown on the field area = swing; HUD buttons (mute, 中断/もどる) take priority via hit-rect check. Keyboard: Space = swing / confirm (title tap, result), Enter = confirm, Escape = back, M = mute, ArrowUp/Down + Enter for stage/status menu selection (optional but required: keyboard can start a game: Space on title, arrows+Enter on stage select). `keydown` with `e.repeat` ignored; `preventDefault` for Space to avoid scroll. Audio context resume on first gesture.
      Verify: manually play with mouse only, touch emulation (devtools), keyboard only.

- [ ] 9. Result screen: clear (homeruns >= target) shows "ステージクリア!", HR count, coins earned (`stage.reward`, full on first clear, 30% on repeat clears), unlocks next stage, saves. Fail shows "ざんねん…" with HR count/target and 0 coins (consolation 5 coins per HR is allowed; decision: consolation = 5*HR). Buttons: もう一回(リトライ), ステージ選択へ. Final stage clear shows an all-clear message.

- [ ] 10. Sound: `beep(freq, dur, type)` helper via WebAudio: swing whoosh (noise-ish short square), hit crack, HR fanfare (3 ascending tones), miss low tone, UI click. All guarded by `muted` and try/catch.

## Verification
1. Syntax: `node --check game.js` must exit 0. NOTE: node was not on PATH when planned; if still missing, fallback: open index.html in a browser with devtools console and confirm no errors on load and while playing through all scenes (or use any available JS engine to parse). Report which was used.
2. Reference-grep sanity: search all files for "pooh", "プー", "disney", "ディズニー" (case-insensitive) → no matches.
3. Manual flow:
   - Stage flow: fresh load → title → stage select (only stage 1 unlocked, stage 2-6 locked) → play stage 1 → HR count reaches target → clear result with coins → stage 2 now unlocked; failing (use up pitches without enough HR) shows fail screen with retry and back buttons that work.
   - Swing/hit logic: swing at the moment the ball reaches the plate (marker in green) → ホームラン with distance > 90m; swing slightly early/late → ファウル; much early/late → ゴロ/フライ; no swing → 空振り/見逃し; pitches decrement exactly once per pitch; double-clicking only swings once. Optionally expose `window.__debug` is NOT required; instead, a temporary console check of the classify function (pure function `classify(d, G)`) may be done during dev.
   - Status upgrade effect: earn coins, upgrade パワー → next HR distance noticeably larger; ミート → green zone on timing bar visibly wider; 選球眼 → ball visibly slower (longer pitch time) with trail; coins decrease by the cost; button disabled when coins insufficient; max level 10 stops.
   - Save/load round-trip: clear stage 1, buy an upgrade, reload page (F5) → cleared stages, coins, levels, mute persist; press reset (confirm) → everything back to defaults, reload confirms defaults; corrupt the localStorage value manually → game loads with defaults without crashing.
   - Responsive/input: resize window and use devtools mobile emulation; tapping buttons and swinging work; keyboard-only run through title → stage select → batting → result works.
4. All UI strings Japanese; file:// double-click works (no modules, no fetch).
