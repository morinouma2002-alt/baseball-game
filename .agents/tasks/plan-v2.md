# Delta Plan v2: 「違和感」を消して原作(Flash版ホームランダービー)に近づける

Base: index.html / style.css / game.js (v1, single IIFE, 800x450 canvas, scenes title/stageSelect/status/batting/result). Read: research.md (tags CONFIRMED / UNCONFIRMED / ASSUMPTION are carried over below), plan.md, current game.js.
Honest note: research.md has NO screenshots and NO per-stage numbers. Only these are CONFIRMED: mouse-driven (move = mouse, swing = click-hold); green part of bat = far; hit target HR count within a set pitch count to clear; stage select -> ステータス (パワー / ミート); auto-save in the browser; stage select after title "スタート！". Everything else is the best reasonable clone choice and is marked ASSUMPTION.

## HARD CONSTRAINTS (must be preserved, reviewer checks each)
1. Characters stay ordinary PEOPLE (human batter, human pitcher), drawn with canvas primitives. NO Pooh/Disney characters, names, or assets. No external images or sounds (WebAudio synthesis only). Copy gameplay feel and UI structure, not IP. Pitcher names are "ピッチャー1..8"-style generic labels or generic human nicknames (e.g. 「新人くん」), never IP names.
2. Japanese UI, localStorage save, mouse + touch + keyboard input, file:// double-click operation: plain `<script src="game.js">`, no ES modules, no fetch, no external assets, no libs, no build.
3. Swing must be repeatable any number of times and must NEVER lock up (do not regress commit aa2a70d). See item M2 for the lock-proof design; this is the highest-priority test.
4. Do not regress: stage unlock flow (stage i open iff i==0 or cleared[i-1]), status upgrades, save / load / reset (データを消す).
5. Single-file architecture stays (game.js IIFE, "use strict", var/function style as in v1). This work is one coherent rewrite of batting + data tables, so it is NOT split into FEATs; the existing implement-and-review loop runs this plan.

## A. Mechanics

### M1. Bat is positioned by the pointer (move = mouse)
- Current: bat is fixed at the batter's side; pointer position is ignored; only timing matters (doSwing in game.js). This is the biggest gap from the original, where the mouse moves the batter/bat (CONFIRMED: "移動〔マウス〕"; UNCONFIRMED that it is the stand position).
- Target: the pointer (mouse hover, touch drag, or Arrow keys) moves a bat ready-position inside a "batter zone" around the plate (x 250..550, y 300..420 logical). The batter sprite follows the pointer x and the bat height follows pointer y (ASSUMPTION: bat position, not whole-body stance).
- Change: add `aim = {x, y}` state updated on `pointermove` (all pointer types, also `pointerdown`, so a tap positions and swings at that spot), clamped to the zone; Arrow keys move aim by 6 px/frame while held (use a keys-down set read in updateBatting). Draw a faint bat-reach marker (strike zone box) at the plate. Initial aim = plate center.

### M2. Swing: press to swing, lock-proof (CONFIRMED click swing; hold semantics UNCONFIRMED)
- Current: `swingT < 0.2` cooldown plus `g.swung`/`g.wasted` flags; a tap-then-can't-swing bug existed before aa2a70d; the logic is spread across flags.
- Target: swing starts on `pointerdown` / Space / Enter-in-batting and plays a fixed 0.30 s animation (windup-to-follow-through) that ends BY TIME ALONE. Holding the button does nothing extra and releasing does nothing needed. A new press is accepted when the previous swing is no longer active (swingT === null).
- Change (anti-lock design, mandatory):
  - Single source of truth: `g.swingT` (null = ready, number 0..SWING_DUR = swinging). `updateBatting` ends the swing with `if (g.swingT !== null && g.swingT >= SWING_DUR) g.swingT = null;` EVERY frame, in every phase, independent of any pointerup/keyup/blur event.
  - No dependency on `pointerup`, `pointercancel`, `blur`, `lostpointercapture`. Do not call `setPointerCapture`. Additionally on `window blur` and `visibilitychange` set `g.swingT = null`.
  - Delete `g.swung`/`g.wasted` gates for allowing swings; keep only `g.contactDone` (set when this pitch already produced a contact so one pitch yields at most one hit). A swing during windup / result / flight is allowed and simply whiffs (plays animation, plays swing sound), never blocks the next one.
  - Phase machine must always reach the next pitch: every phase has a time-based exit; no phase waits for input.
  - Swing key repeat ignored (`e.repeat`), as v1.
- Note: with a mouse hold you only get one swing per press; to swing again, release and press again (a fast double-click gives two swings 0.30 s apart or later). Mention nothing else to the player.

### M3. Contact model: where the ball meets the bat decides distance (CONFIRMED green zone = far)
- Current: pure time offset d -> classify(d, meet, power); a separate timing bar HUD; the bat's green band is cosmetic.
- Target: a real contact test. During the swing the bat sweeps; the contact moment is `swingT` in [0.08, 0.20] (bat passes through the plate). Compute at the moment the ball is at the plate region (ball progress p ~ 1):
  - Vertical/horizontal miss: `ev = |ball.y - aim.y|` (ball height vs bat height) and `ex = |ball.x - aim.x|`. If `ev > REACH_V(meet)` or `ex > REACH_H` -> miss (空振り).
  - Along-bat contact point: `u = clamp(0.5 + d / (2 * O(meet)), 0, 1)` where d = timing offset (early = nearer the handle side, late = nearer the tip; ASSUMPTION), and the bat's green sweet spot sits at `u in [0.62, 0.88]` (visible on the bat sprite; keep v1's drawn green band, aligned with this range, widened by meet).
  - Quality `q` (0..1) = 1 at green center, falling linearly to 0 at bat ends; green zone = `|u - 0.75| <= 0.13 * (1 + 0.06*meetLv)` (research assumption: Meet +6% green width per level).
  - Outcome: q >= 0.75 -> HR candidate (distance formula below); 0.35 <= q < 0.75 -> ヒット (no HR, worthless); q < 0.35 or ev slightly over reach -> ファウル (side by sign of d); beyond -> 空振り.
- Change: replace `classify(d, meet, power, rnd)` with `classify(d, ev, ex, meetLv, powerLv, rnd)` (pure, exposed for tests). Remove drawTimingBar and the ±ms HUD; instead show the green zone on the bat only (the original shows no timing meter; ASSUMPTION). Keep a small optional on-screen hint only in the stage intro ("緑のところに当てるととおくへ飛ぶ").

### M4. Distance, HR threshold, points
- Current: dist = (95 + 7*power) * (1 - 0.3*|d|/G); fence 90 m; every green hit is a HR; reward = fixed coins per stage.
- Target (ASSUMPTION, research §5): exit distance = `base * (0.4 + 0.6*q) * (1 + 0.04*powerLv)` with base 150 m at q=1, fence = 100 m on all stages (HR iff dist >= fence). Distances displayed in m. At Lv0 a perfect green hit ~150 m, edge of green ~125 m, ヒット < 100 m.
- Points: each HR gives `10 + floor((dist - 100) / 10)` pts into the stage score; stage clear adds a bonus `50 * stageNo` (first clear), 30% on repeat; a failed stage keeps the HR points earned (so the player can still buy upgrades). Currency is renamed コイン -> ポイント in UI strings; the save field stays `coins` to avoid breaking old saves.

## B. Timing model
- Current: windup 0.6 s fixed, ballTime 0.85..1.4 s with 4 pitch behaviors (straight / sinusoid curve), +/-5% random, 0.9 s intro, result delay 0.9-1.2 s, "pitch count decremented at release".
- Target (ASSUMPTION; research gives no numbers): keep the decrement-at-release rule; windup 0.55 s (stage 6-8: random 0.35..0.8 s to match "hard to read the delivery"); `PASS_T` unchanged; between-pitch gap shortened to 0.5 s for a non-HR result and 1.0 s for HR so rhythm feels like the original's quick loop; intro 0.7 s with 「プレイボール!」.
- Per-pitch ball height: `ballY` varies by +/- 28 px around the strike zone center (random per pitch), so aim.y matters (ties to M1/M3). Pitch lateral offset +/- 14 px.

## C. Stage table (8 stages; REPLACES the 6 in game.js STAGES)
Tags: pitch/target numbers = ASSUMPTION from research §3 (S1 10/6 ... S8 40/28); style order = UNCONFIRMED single comment; 8 stages = UNCONFIRMED. ballTime values are ASSUMPTION.

| # | 名前(人間・IPなし) | 球数 | 目標HR | ballTime(s) | 球種 (research style) |
|---|---|---|---|---|---|
| 1 | 新人くん | 10 | 6 | 1.60 | ストレート(遅い) |
| 2 | 草野球の先輩 | 12 | 8 | 1.40 | ストレート(速め) |
| 3 | 商店街のエース | 15 | 10 | 1.25 | ストレート(さらに速い) |
| 4 | 河川敷のトリックスター | 20 | 13 | 1.15 | バウンド球(ワンバン=地面で1回はねる) + ストレート |
| 5 | 大学の左腕 | 25 | 17 | 1.10 | フォーク(終盤で落ちる) + ストレート |
| 6 | ベテラン投手 | 30 | 20 | 1.00 | 投球フォームが読みにくい(windup可変) + 全球種 |
| 7 | 魔球使い | 35 | 24 | 0.95 | 消える魔球(途中で姿が見えなくなる) + 全球種 |
| 8 | 最終ボス | 40 | 28 | 0.80 | 速球 + 消える魔球 |

- Current behavior: 6 stages, 9-10 pitches, 3-6 HR targets, curve only; stages 5-6 differ only by speed.
- Change: new `STAGES` entries `{name, pitches, target, ballTime, types:[...], windup:[min,max]}`; stage select grid 4 columns x 2 rows (or 3x3 grid with the 9th slot empty; choose 4x2, card 180x130); `defaultSave()` arrays length 8; type behaviors implemented in `setupPitch` + `ballAt`:
  - straight: linear in progress with perspective easing (see D).
  - bounce: ball lands at p=0.55 (ground shadow visible, small hop) and rises to bat height at p=1.
  - drop: follows straight until p=0.65, then y increases (falls) by +60 px relative path.
  - vanish: ball alpha 0 for p in [0.45, 0.78] (the shadow on the ground stays visible; ASSUMPTION), reappears before the plate.
  - Random mix per pitch: stages choose uniformly among `types`.
- Unlock flow stays identical: stage i enabled iff i==0 or cleared[i-1]; locked cards show a lock and "前のステージをクリア".

## D. Camera / view and ball presentation
- Current: static view from behind the pitcher side? (pitcher small at center-back, batter at left of the plate); ball grows linearly 3..13 px, linear lerp (feels weightless); background never moves; flight is a parabola on the same still screen.
- Target (UNCONFIRMED view, ASSUMPTION): behind-the-batter, slightly elevated fixed view: pitcher centered far, plate near, strike-zone box drawn. Perspective easing `e = p^1.6` for size and y (ball speeds up as it nears, which is how the original ball "feels fast"); ball shadow on the ground. Pitcher sprite size 0.6 -> 0.7 for readability.
- Hit presentation: on contact freeze ~60 ms (hit-stop), bat/ball spark burst, then ball flight with the background scrolling UP/zooming toward the fence (camera follows ball; simple `camY` offset of the field layers + ball shrinking). HR: ball clears the fence, crowd jumps, screen-wide flash, `fence` marker label updates with distance. Non-HR hit: ball lands in the field (no scroll) with bounce. Foul: lands out of the baselines on the left/right with small dust.
- Remove in HUD: 選球眼 trail (eye stat removed, see E).

## E. Status upgrades (CONFIRMED: パワー, ミート only; ASSUMPTION costs/effects)
- Current: three stats (パワー/ミート/選球眼), cost 20 + 15*Lv, power +7 m per level, meet +10 ms, eye slows ball.
- Target: only パワー and ミート (research confirms just these two; 選球眼 is not in the original). Cost per level = `50 * (Lv + 1)`, level cap 10 (ASSUMPTION). Power: +4% distance per level. Meet: +6% green width per level and slightly larger vertical reach (`REACH_V = 22 + 1.5*Lv` px).
- Status screen layout: two big rows (パワー/ミート) with level bar, effect text ("飛距離 +x%", "グリーン +x%"), cost, [強化] button, ポイント balance on top, もどる.
- Save migration: `loadSave` keeps key `circleHRDerby.save.v1` but sets `v: 2`; accept v1 data: clamp cleared/best to 8 entries (pad false/0), keep power/meet, ignore `eye` (refund `sum of eye costs` into coins so no player loses value), keep mute. Corrupt/blocked storage still falls back to defaults.

## F. HUD layout
- Current: top-left white card (stage name, のこり n球, HR n / 目標), mute and やめる at top right, bottom timing bar and hint text.
- Target (ASSUMPTION; research §7): top bar: left = ステージ名, center = 「HR n / 目標 m」 (large), right = 「のこり n球」; below-left small 「ポイント」; timing bar removed; bottom center hint only during the first pitch of a stage. Keep やめる and おと buttons (top right corner, small). Show last-hit distance near the fence.

## G. Feedback texts (research: only "ヒット" confirmed)
- Current: ホームラン!! / ファウル / ゴロ / フライ / 空振り! / 見逃し / プレイボール! / ステージクリア! / ざんねん…
- Target: ホームラン!! (with 飛距離 xxxm), ヒット (CONFIRMED text; worthless, not a HR), ファウル, 空振り!, 見逃し (no swing at all on a pitch), ナイスバッティング (optional, q>0.95 "ジャストミート!"), プレイボール!, ステージクリア!, ざんねん…, all-clear message after stage 8. Remove ゴロ/フライ (map both to ヒット).
- Change: update `popupText`; popup size 64 px for HR, 44 px otherwise; HR popup bounces in (scale animation, as v1).

## H. Sound feel (all ASSUMPTION; synthesized only)
- Current: square/triangle beeps only.
- Target: add a noise-burst helper (`noiseBurst(dur, filterFreq, vol)` using `actx.createBuffer` + `createBufferSource` + BiquadFilter, still behind `save.mute`, try/catch): pitch whoosh (short filtered noise sweep at release), swing whoosh, bat crack (noise 25 ms + 1.2 kHz tick, louder on green), catcher mitt pop on 空振り/見逃し (low noise + 180 Hz thump), crowd cheer on HR (longer filtered noise swell 1.2 s + fanfare), soft groan on fail. Keep UI click / clear / fail jingles. No samples, no external files.

## I. Screen flow
- Current: title -> stageSelect -> (status) -> batting -> result -> (retry | stageSelect).
- Target (research §8, first half CONFIRMED): ロード風の短い起動表示 not needed; title with 「スタート！」 (full-width button label 「スタート!」) -> stageSelect with a prominent 「ステータス」 button and 8 stage cards -> batting -> result -> back to stageSelect (also keep retry). Keep `やめる` mid-game returning to stageSelect without counting the stage as failed. No new scenes.
- Escape/back and focus navigation stay as in v1.

## Implementation order (each step leaves the page loadable)
1. Data layer: STAGES (8), STATS (power/meet), formulas, `defaultSave` v2, `loadSave` migration, cost function. Verify: V1 pure-function checks.
2. Batting core: aim state, M2 lock-proof swing state, M3 `classify` rewrite, pitch types in `setupPitch`/`ballAt`, timing constants. Verify: V2 + V3.
3. Rendering: stage select 4x2, status screen (2 rows), HUD, strike zone, perspective ball, camera scroll, feedback texts, hit-stop and effects. Verify: V4.
4. Sound helpers and wiring. Verify: no exceptions with audio muted and unmuted (actx may be absent in headless).
5. Re-run the full regression list and clean up temp files.

## Verification (node is NOT installed; use headless Chrome on file://)
Do NOT use `node --check`. Locate Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`, or Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`). To make the IIFE testable, add at the end of game.js a tiny read-only hook `window.__HRD = { STAGES, classify, loadSave, upgradeCost, state: function(){return {scene:scene,g:g,save:save};}, step: function(dt){update(dt);} }` (guarded; harmless in production) so a temporary `test.html` (same folder, deleted afterwards) can drive the game. Run:
`chrome --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=20000 --dump-dom "file:///C:/Users/morin/Desktop/サークルゲーム/test.html"` and have test.html write PASS/FAIL lines plus any `window.onerror` messages into the DOM. Also run the same against index.html and confirm the dump has no script error text.
- V1 (data/pure): 8 stages with the table values; `classify` returns HR for a green hit (u in 0.62..0.88, ev small) with dist >= 100 and ヒット for q 0.35-0.75; miss when ev > reach; power Lv10 raises dist by ~40%; meet Lv10 widens green; upgradeCost(0)=50, (9)=500; old v1 save JSON (6 stages, eye level) loads with arrays length 8 and no exception; corrupt JSON -> defaults.
- V2 (NEVER LOCK UP, critical): dispatch `pointerdown` on the canvas 30 times in a row with `__HRD.step(0.05)` between them across several pitches, including (a) without ever dispatching `pointerup`, (b) with `pointercancel`/`blur` only, (c) holding for 3 s; assert `g.swingT` returns to null within 0.30 s each time and that each press after 0.30 s starts a new swing (count swings >= expected). Also Space keydown/keyup equivalents.
- V3 (flow): drive title -> stageSelect (stage 2+ locked on fresh save) -> batting stage 1 -> forced-HR sequence clears the stage -> result, stage 2 unlocked, points added and persisted in localStorage; fail path (pitches run out) shows fail and keeps points; 入力 `pointermove` changes aim; pitchesLeft decrements exactly once per pitch.
- V4 (save/reset/upgrade): buy パワー and ミート (balance decreases by cost, button disabled when short, stops at Lv10); reload page and check persistence; reset via stubbed `window.confirm` returns defaults.
- V5 (constraints grep, sanity only): no matches in index.html/style.css/game.js for pooh, プー, disney, ディズニー, ピグレット, ティガー, オウル, ロビン, `import `, `fetch(`, `http://`/`https://` asset URLs.
- Not verifiable headless: how it LOOKS and SOUNDS in a real browser, real touch hardware, feel of tuning. State this clearly in the final report.

## Out of scope / known gaps
- Exact original numbers, art, camera, and sounds were never observed (research limits); this plan is a best-effort approximation tagged above. Tuning constants (base 150 m, fence 100 m, ballTime, windup ranges) are expected to be adjusted after the user plays it.

## Verification note (implementer)
Ran headless Chrome (file://, --dump-dom) on a temporary test.html that loads game.js and drives window.__HRD: 43 checks PASS, 0 FAIL, no window.onerror. Covered: 8-stage table, classify (green HR, ヒット, ファウル, 空振り), power/meet scaling, v1 save migration, corrupt save fallback, 30 consecutive pointerdowns without pointerup, Space x15, 3s hold, blur, swingT always returns to null, spam-swing runs through stages 1-8 to result with no lockup, pitchesLeft decrements once per pitch, stage1 clear unlocks stage 2 and persists, upgrades/cap/reset, render of all scenes. Batter-left-fixed change (ZONE x350-440, pointer x mapped proportionally) re-tested: aim stays in zone, ball x (386-414) within reach. Screenshots (title, select, status, batting, swing, hr, result) inspected; batter stands left of the plate. Grep for pooh/プー/disney/ディズニー/ティガー/ピグレット/import/fetch/http returned nothing.
NOT verified: real touch hardware, audio (WebAudio output), real-play feel/tuning.
