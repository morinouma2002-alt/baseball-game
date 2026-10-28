# Home Run Derby v2: pointer-placed bat, real contact model, 8-stage table

v2 reworks batting around the confirmed parts of the original: the pointer places the bat, a click swings, and the green part of the bat sends the ball far. It adds 8 stages with distinct pitch types, a two-stat status screen (パワー / ミート), a points economy, a v1 save migration, and synthesized sound. The 8-stage count, stage numbers and pitch types come from research.md and are tagged UNCONFIRMED or ASSUMPTION there. Only the mechanics listed as CONFIRMED can be judged strictly. The code follows plan-v2 closely.

Watch for: (1) the review relies on the implementer's recorded headless-Chrome run (43 PASS, 0 FAIL, no window.onerror), not a re-run. Confidence: likely, since I read the code paths it covers. (2) Camera and hit presentation are a modest approximation of the original, which was never observed. (3) The tuning numbers are all assumptions, so expect a tuning pass after the user plays it.

**Verdict**: APPROVED

## High-level view

The swing lock is fixed by design. `g.swingT` is the only swing state. `updateBatting` ends the swing by time alone every frame, in every phase, and nothing depends on pointerup, pointercancel or keyup. blur and visibilitychange also reset it. A press is accepted whenever `swingT === null`, so the bat can be swung any number of times. This matches the user's top complaint and the plan.

Contact is now spatial and temporal. Ball height and x are compared against the bat position (`reachV`, `REACH_H`), and the timing offset maps to a point along the bat (`u = 0.75 + d * 2.8`). The visible green band is the same range, and Meet widens both. Distance is `150 * (0.4 + 0.6q) * (1 + 0.04 * power)` against a 100 m fence. Only the green zone gives home runs. A hit outside it is a worthless ヒット, which matches the one confirmed feedback text.

The 8 stages, the HUD (stage name, HR n / target, のこり n球), the 4x2 stage select, the two-row status screen and the flow title → stageSelect → batting → result are all in place. The timing bar and 選球眼 are gone. Unlock (`i == 0 || cleared[i-1]`), the upgrade cap, reset, and the v1 migration are intact. The migration refunds eye spend and rewrites the save as v2.

IP is clean. A grep for pooh, プー, disney, ディズニー, ティガー, ピグレット, オウル, ロビン, `fetch(`, and http(s) URLs over index.html, style.css and game.js returned no matches. Characters are canvas-drawn ordinary people. Stage names are generic (新人くん ... 最終ボス). The only script is a local `game.js` loaded with a plain `<script>`, so file:// works. Sound is WebAudio synthesis only.

<details>
<summary>Issues (6)</summary>

1. **Weak ball-follow camera** (possible, non-blocking) — HR flight scrolls the field only 28 px. The original probably follows the ball more strongly, but that was never observed. Revisit after the user plays it.
2. **Swing is press-only, not click-hold** (likely, non-blocking) — research marks hold semantics UNCONFIRMED. Press-to-swing with a time-based end is the safer choice and should stay.
3. **Stage numbers and pitch types are assumptions** (confirmed, non-blocking) — pitch counts, targets, ballTime and windup ranges are best guesses from comment inference. Tune after play.
4. **Leftover `window.__HRD` test hook** (confirmed, non-blocking) — it exposes `setSave` and `go`. It is harmless in a local single-player game, but can be removed for release.
5. **Evidence not re-run** (likely) — the zero-console-error claim rests on the coder's note in plan-v2. Not independently re-executed, per instructions.
6. **Audio and real touch hardware unverified** (confirmed, non-blocking) — the implementer states this explicitly.

</details>

<details>
<summary>Details</summary>

## Lock-proof swing

`doSwing` sets `swingT = 0` only when `swingT === null`. `updateBatting` increments it and nulls it at `SWING_DUR` (0.30 s) before the phase switch runs. A swing during intro, windup, flight or result just plays the animation and whiffs. `contactDone` limits a pitch to one hit. There is no `setPointerCapture` and no pointerup handler. The Space/Enter path ignores `e.repeat`, and the arrow keys are consumed for bat movement only during batting. The risk of a lockup would be a phase that waits for input, and none does. Every phase has a time-based exit and `pitchesLeft` decrements at release, so the stage always terminates. The implementer's spam-swing runs through stages 1-8 (30 pointerdowns with no pointerup, Space x15, a 3 s hold, blur) cover the same paths. Confidence: confirmed by reading the code.

One note on feel. A held mouse button gives one swing, and a second swing needs a release and a new press. This is the plan's stated behavior and does not lock.

## Fidelity gaps against research.md

Confirmed items are honored: mouse-driven bat placement, click swing, green sweet spot for distance, a hit target within a pitch limit, stage select then ステータス with パワー and ミート, browser auto-save, and a 「スタート!」 title.

Remaining 違和感 candidates are all in the UNCONFIRMED or ASSUMPTION area. The camera is a fixed behind-the-batter view with a small scroll on HRs. The vanish pitch leaves a ground shadow, which is an assumption. The batter is fixed at the left and only drifts slightly. Plain hits give no points. Nothing in research.md contradicts the implementation, and none of these is a blocker.

## Regression check

`loadSave` clamps and pads arrays to 8, keeps key and `v: 2`, and falls back to defaults on corrupt data. Upgrade cost is `50 * (lv + 1)` with a cap of 10. `resetData` confirms, rebuilds `defaultSave` and removes the key. Japanese UI strings are intact, including the renaming from コイン to ポイント. The save field stays `coins`.

</details>

<details>
<summary>File map</summary>

- index.html: canvas and a local script tag only, with Japanese title and noscript text
- style.css: layout for the canvas (not changed in behavior)
- game.js: whole game, with 8-stage table, classify, aim and swing, pitch types, status screen, HUD, noise SFX and the `__HRD` hook

</details>
