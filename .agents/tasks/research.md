# Research: Flash「くまのプーさんのホームランダービー」(Winnie The Pooh's Home Run Derby) – gameplay only

Scope: mechanics and feel only. No Disney/Pooh assets, names, art, or sound are to be reused. The clone uses generic human characters.

Tags: **CONFIRMED** = stated by a fetched source. **UNCONFIRMED** = a single weak source or an inference from comments. **ASSUMPTION** = nothing found, plausible default chosen.

## Method and limits
- Fetched the reference page and its 101 reader comments (comments are the richest source on stage order, pitch types and stats).
- Found the embedded host page and the SWF URL: `https://berrysgame.web.fc2.com/Home_Run_Derby.html` (loads `Home_Run_Derby.swf` through `ruffle.js`).
- I downloaded the SWF (Flash 8, about 2 MB). Reading its strings failed because the data came out unreadable, so I stopped. I did not run it in a browser, so there are **no screenshots** and nothing was seen directly. I had no search engine tool, only direct page fetches, so no video or walkthrough pages were found. Everything below is from the reference page text and reader comments.
- No SWF content or assets were saved into the workspace. Temp files are outside the workspace.

## Sources
- S1: https://hitoikigame.com/blog-entry-3652.html (description + 101 comments, 2017–2026)
- S2: https://berrysgame.web.fc2.com/Home_Run_Derby.html (host page for the SWF; contains no gameplay text)
- S3: https://game-io.net/blog-entry-2255.html (linked from S1; not fetched)

## 1. Control scheme
| Item | Finding | Tag |
|---|---|---|
| Input device | Mouse only. Page lists "移動〔マウス〕 / スイング〔クリック長押し〕" (move = mouse, swing = hold click). | CONFIRMED (S1) |
| Moving | The mouse moves the batter/bat position. A commenter says "立ち位置の調整がムズい" (adjusting where you stand is hard), which fits moving the stance. | CONFIRMED that mouse moves; UNCONFIRMED that it is the batter's stand position (S1) |
| Swing | Hold the click to swing. Whether the swing starts on press or on release, and whether the hold length changes anything, is not stated. | UNCONFIRMED |
| Green part of the bat | "バットの緑の位置に当てると遠くに飛びます": the ball goes farther when it meets the green spot on the bat. So the bat has a sweet-spot zone, and where the ball meets it decides distance. It is not described as a timing gauge. | CONFIRMED (S1) |
| Touch/mobile | Original is mouse-based. Commenters ask for a phone version. | CONFIRMED (S1 comments) |
| Clone mapping | Move pointer/finger to place the bat. Press and hold to swing. A tap that swings once and then locks is the bug the user complained about. The bat must be reusable on every pitch. | ASSUMPTION |

## 2. Core rules
- A pitcher throws; you time the swing. CONFIRMED (S1)
- Hit with the green part for distance. CONFIRMED (S1)
- "既定数の投球で目標数のホームランを打てばステージクリア": hit a target number of home runs within a set number of pitches to clear the stage. CONFIRMED as a host-page summary (S1). Actual numbers per stage were not found.
- Comments about HR counts: "ホームラン27本で負けた" (lost on the Tigger-type stage with 27 HR), "オウル18本までいったけど" (reached 18 HR on the owl-type stage), "ロビカス…24本（自己ベスト32本）" (24 HR on the last stage, best 32), "最初は5球…20球打てた" (counts of hit balls on the stage-7 pitcher). Together these suggest the late-stage target is high (roughly 30 or more) and the pitch limit is large (likely 40–60). UNCONFIRMED (inferred from S1 comments).
- Result is pass/fail per stage; failing means retrying that stage. CONFIRMED by comments such as "ティガー倒せなくて4時間".
- A plain hit scores almost nothing: a commenter wrote "ヒット(無価値)", meaning a non-HR hit is shown as "ヒット" and is worthless. UNCONFIRMED (one comment).

## 3. Stages and pitchers
- Stage select screen exists; the stage is chosen on it after the title/load screen. CONFIRMED (S1: "ロード終了⇒スタート！⇒ステージ選択")
- Each stage is a different opponent pitcher, with a distinct throwing style, ordered easy to hard. Eight opponents are listed in order by one commenter ("ボールの投げ方別自分の反応"). **Number of stages = 8: UNCONFIRMED** (single comment; other comments mention only those same opponents).
- Order and style (names are IP, so use "Pitcher 1…8" in the clone):

| # | Style described by a commenter | Tag |
|---|---|---|
| 1 | Easy, slow | UNCONFIRMED |
| 2 | Faster than 1, still easy | UNCONFIRMED |
| 3 | Faster again | UNCONFIRMED |
| 4 | Ball seems to jump; one-bounce pitch ("ワンバン") that people dislike hitting | UNCONFIRMED |
| 5 | Adds a ball that drops (forkball-like) | UNCONFIRMED |
| 6 | Hard to read the delivery; a big difficulty wall ("オウルからが本番") | UNCONFIRMED |
| 7 | Ball that disappears mid-flight ("消える魔球"); very hard | UNCONFIRMED |
| 8 | Final boss; fast ball plus very hard to hit. One commenter says its vanishing ball is the easiest part and the fast ball is the problem | UNCONFIRMED |

- Difficulty wall: stages 6–8 are widely called hard; a player advice says the owl-type fast ball "若干早く打てばいける" (swing slightly early). UNCONFIRMED.
- A character stands behind the pitcher/at the back of the field. A commenter notes a "ゴーファー" behind the main character; this is background and not mechanical. UNCONFIRMED.
- Per-stage pitch speeds, pitch counts and exact HR targets: **NOT FOUND**.
- Clone ASSUMPTION for numbers (pitch limit / HR target): S1 10/6, S2 12/8, S3 15/10, S4 20/13, S5 25/17, S6 30/20, S7 35/24, S8 40/28. These are tuned so a decent player can clear stages 1–5 with starting stats and later stages need upgrades. Speeds rise per stage.

## 4. Status / upgrades / economy
- A "ステータス" menu on the stage select screen lets you level up batting. CONFIRMED (S1)
- The upgraded stats are "パワー" (power) and "ミート" (contact/meet). CONFIRMED by comment: "他でポイント稼いでパワーとミート上げまくってくる" (earn points elsewhere and raise power and meet).
- Upgrades cost points earned by playing (points from stages, probably earned from hits/HRs). UNCONFIRMED. Costs, level caps, and per-level effects: **NOT FOUND**.
- Likely effect of Power = more distance; Meet = larger or more forgiving green zone / contact window. ASSUMPTION.
- Clone ASSUMPTION: points per HR scaled by distance; upgrade cost = 50 × (level+1) per stat, level cap 10, each Power level +4% distance, each Meet level +6% green zone width.

## 5. Distance, score, coins
- Distance is determined by where on the bat the ball is hit (green = far). CONFIRMED (S1). The numeric formula is **NOT FOUND**.
- Whether a distance in meters/feet is shown on screen: UNCONFIRMED.
- Clone ASSUMPTION: contact quality q (0–1) from distance to the green zone center; exit speed = base × (0.4 + 0.6q) × power factor; HR if the carry exceeds the fence distance; show the distance in meters.

## 6. Save
- Auto-save, stored in the browser (so clearing cookies/cache loses it). CONFIRMED (S1 comments, including the 管理人-adjacent reply "セーブは自動ですがブラウザに保存されます"). Several users reported lost data.
- Clone: localStorage auto-save of cleared stages, points, and stat levels. ASSUMPTION (storage mechanism chosen by us).

## 7. Screen layout, camera, ball flight
- Not directly observed. A commenter mentions "立ち位置" (stance position), and another says the ball has "ワンバン", "ジャンプ", "落ちる", "消える" behaviors; these imply a view where the ball's height and depth are readable, which fits a behind-the-batter or side-on pitcher-and-batter view.
- Camera angle: UNCONFIRMED. Most plausible is a fixed, mostly side-on or slightly elevated view with the pitcher on the right/far side and the batter on the left/near side, and the screen following the ball after contact. ASSUMPTION.
- HUD: ASSUMPTION – HR count / target and balls left at the top; stage name at the top; upgrade menu button on the stage select screen.
- Ball flight: after a hit the ball arcs with the distance determined by contact; a bad hit stays in the field. Flight presentation details: ASSUMPTION.

## 8. Feedback text, sound, flow
- Texts: "ヒット" (one comment) is the only text mentioned. Others ("Home Run!", "Strike", "Foul") are **UNCONFIRMED / ASSUMPTION**. The clone should show HOME RUN / HIT / MISS / FOUL style labels and the final result (CLEAR / FAILED).
- Sound/effects: not found. ASSUMPTION – light cartoon bat crack, crowd cheer on HR. Do not copy any original sound.
- Flow: loading → title "スタート！" → stage select (with ステータス menu and stage list) → stage play → result (clear or fail) → back to stage select. The first part is CONFIRMED (S1); the rest is ASSUMPTION.
- Difficulty: reputed as very hard from stage 6; reaching stage 7 or 8 is celebrated by commenters. CONFIRMED as sentiment (S1 comments).

## 9. Takeaways for the clone (priority order)
1. Mouse-driven: move bat/stance with the pointer, hold-click to swing, and allow swinging on every pitch with no lock-up.
2. A bat with a visible green sweet spot; contact position on the green zone sets distance.
3. 8 stages with distinct pitchers; add pitch types over time: fast, slower, bounce, drop, vanish.
4. Per-stage HR target within a limited number of pitches; clear unlocks the next stage; stage select screen.
5. Status menu: Power and Meet, bought with points earned in play.
6. Auto-save to the browser.
7. Keep generic human characters; no Disney/Pooh names, art or sound.
