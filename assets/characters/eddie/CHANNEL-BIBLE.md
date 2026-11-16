# Stick With Eddie — channel bible

Short reference for everything decided so far. Update as things change.

## Channel
- **Name / handle:** Stick With Eddie (@stickwitheddie)
- **Niche:** "What If" stories told day by day (Day 1 → Day 30), built on real research.
- **Tagline:** What if? Eddie finds out.
- **Audience (from early data):** skews young / family — lots of TV and tablet viewing, suggested next to kids' and animation videos. Keep it clean, simple, big text.
- **Posting:** one full episode (16:9, ~4.5 min) plus 2–3 Shorts (9:16, 13–35 s) cut from it.

## Characters
- **Eddie:** bald black-and-white stickman, egg-shaped head, tapered limbs, sneakers. Always the "you" of the story.
- **Sam:** best friend, blue cap. **Mia:** quiet girl, purple beanie + glasses. **Mom:** hair bun. **Barista:** red cap (a guy).
- Extras get one accessory each (cap, beanie, glasses, pigtails, bun).

## Episodes
| # | Title | Status |
|---|---|---|
| 1 | What If You Never Had to Sleep Again? | Posted (full video + Short) |
| 2 | What If You Could Hear Everyone's Thoughts? | 2D version finished; 3D pilot Short made; not posted yet |
| 3 | What If You Never Felt Pain Again? | Teased at the end of ep 2 |

**Episode 2 story:** Day 1 fun (café, subway, interview, job) → Day 3 rush hour is too loud (quiz) → Day 7 party, nobody's watching you (quiz, spotlight effect) → Day 10 poker with Sam, "is he cheating?" → Day 14 Mom's gift, intrusive thoughts → Day 21 Mia, the one silent mind → Day 30 twist: Mia can hear thoughts too → lesson: thoughts aren't who people are → café tag: the barista can hear him.

## Script and hooks
- **Open mid-action or in the past, never at "day one".** Ep 2 opens on the Day 30 rooftop ("…somebody just thought back"), Day 1 starts by ~0:13.
- **Hook patterns** (full list in `content/HOOKS.md`): "Is it possible to [goal] in [time]?", "It's currently [time] and I just promised…", "I don't know who needs to hear this, but…", "[x] days ago I…", "If you've been [painful moment]…", and the Ricks Clips formula: concrete action in the first 4 s, then "You see…".
- **Story arc:** start high, then a new dip-and-spike every 8–15 s (question, twist or quiz); no flat stretch over ~12 s; payoff in the last line.
- **Every episode has:** day stamps, a Day 1→30 progress bar, two quizzes with a 3-2-1 countdown, fact cards with real sources, a twist, and a teaser for the next episode.
- **Shorts:** own first line, 13–35 s, end card "FULL STORY ON THE CHANNEL", set the full episode as the related video.

## Editing style (2D)
- 30 fps, every frame animated. Easing, anticipation and overshoot on pose changes (see `MOTION.md`).
- **Walking:** feet plant and roll, stride matches distance, both shoes face the walking direction.
- **Acting:** characters always do something real (hand over a coffee, high-five, fist bump, deal cards, read, sip, scroll a phone). No arm-waving. Idle characters stand still.
- **Mouths** follow the narration; blinks; small reaction icons (!, ?, sweat, sparkle).
- **Thought/speech bubbles:** pop in on the exact word, tail always points at the thinker, never cover a face, stay fully in frame.
- **Captions:** 1–3 bold words, white with black outline, spoken word turns yellow, numbers green. Placed where they cover no character (usually the floor strip).
- **Backgrounds:** every set is richly detailed (shelves, plants, lamps, posters, rugs, ambient motion). Explainer/quiz shots use a cozy tinted room.
- **Camera:** wide/medium/close cuts every ~2 s, steady on walking shots, crafted push-ins on key moments.
- **Motion graphics:** speed lines when running, sound-wave rings when covering ears, bursts on contact, confetti, kinetic captions.

## 3D style (pilot)
- Reference: Ricks Clips (@RicksClips3000) — flat outlined cartoon characters inside real 3D sets, dramatic camera, small captions.
- Ours: Three.js sets with perspective, coloured lights, shadows, depth; characters are cut-outs standing inside the scene; props in front hide them by true depth.
- **3D sets built:** library, sunset rooftop, explainer room. **Still to build:** café, subway, street, park, party, living room, office, concert, bedroom.
- Render with `--3d`. Pilot: `deliver/ep02-short-3D-pilot.mp4`.

## Sound
- **Voice:** Piper "ryan" (free, local). Every line is checked by transcription and redone if a word is swallowed. Wanted upgrade: ElevenLabs "Mark" (needs credits + voice ID).
- **SFX:** SFX Kit (CC0) cued on the exact frame — pops for bubbles, whooshes for cuts, quiz ticks and chime, cards, coins, page turns, footsteps on every step, duck quack.
- **Music:** light lo-fi bed that ducks under the voice. Quiet room tone per location (subway rumble, café murmur, park birds).
- Loudness: −14 LUFS.

## Packaging
- **Titles:** short and simple ("What If You Could Hear Everyone's Thoughts?").
- **Thumbnails (v2 rule):** bright flat colour, one giant face, 2–3 huge words. Ep 2 options: "SHE CAN HEAR ME?!", "I CAN HEAR EVERYONE", Day 1 vs Day 30. Ep 1 replacement: "30 DAYS NO SLEEP". Files in `brand/`.
- **Description:** hook paragraph, chapters, question for comments, sources. Pinned comment asks a question.

## Analytics so far (episode 1, first 27 hours)
- **Short:** 631 views, 70% stayed to watch, 0:46 average, +1 subscriber, 98% from the Shorts feed.
- **Full video:** 19 views, 734 impressions, 1.6% click-through, 0:37 average view.
- **Lessons applied to ep 2:** brighter thumbnails, faster hook, shorter Shorts with a pointer to the full video, simpler titles.
- **Routine:** check at 48 hours and 7 days (click-through, average view, retention graph, traffic sources); turn each finding into a change for the next episode.

## How it's made
- Code lives in `assets/characters/eddie/`. An episode is one "beats" file (`content/epNN-*.beats.mjs`): each beat has a pose, scene, people, bubbles, camera and the narration line.
- `render-episode.mjs <beats> <outDir> [--aspect 9:16] [--3d]` makes the voice, timing, captions, sound and video.
- Key files: `eddie-rig.mjs` (character), `scenes*.mjs` + `decor.mjs` (2D sets), `sets3d.js` + `stage3d.js` (3D), `build-brand.mjs` (thumbnails), `content/ep02-package.md` (title/description/chapters).
- Finished videos go in `deliver/`; working files in `projects/` (neither is committed).

## Open items
- Post episode 2 (final title, description and chapters need a refresh for the new hook).
- Re-render 2D Short A; decide 2D vs 3D for the full episode.
- Build the remaining 3D sets if going 3D.
- Connect @stickwitheddie to vidIQ for live analytics; send the retention graphs when they appear.
- Voice upgrade to "Mark" once ElevenLabs credits are topped up.
