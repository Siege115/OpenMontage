# Eddie motion design: the rules the renderer follows

Distilled from this repo's motion references (`.agents/skills/hyperframes-creative/references/motion-principles.md`,
`.agents/skills/framer-motion` (Disney's 12 principles), `skills/creative/sound-design.md`) and the
SFX Kit guide. The code lives in `motion.mjs` (easings, springs, keyframes, staggers) and is applied in `render-episode.mjs`.

## 1. Easing is emotion
| Situation | Curve | Why |
|---|---|---|
| Something **enters** | `.out` (power3/expo/back) | fast start, gentle settle, so it feels responsive |
| Something **leaves** | `.in` (power2.in / accelerate) | gentle start, then thrown off |
| A move **between two positions** | `.inOut` / `standard` / `cinematic` | slow in, slow out |
| Something should feel **alive or springy** | `back.out`, `spring()` | overshoot then settle (follow-through) |

**Never use one ease or one speed for everything.** Vary the adverb: expo = confident, sine = dreamy, back/elastic = playful.

## 2. Timing communicates weight
- 0.15–0.3 s is fast (urgent, UI pops, exits)
- 0.3–0.5 s is the default (cards, bubbles, poses)
- 0.5–0.8 s is weighty (big reveals, the camera settling)
- 0.8–2 s is cinematic (slow push-ins on a twist)

**Asymmetry:** entrances take longer than exits (a card enters in 0.42 s and leaves in 0.22 s).

## 3. Character acting (Disney principles in the rig)
- **Anticipation:** before a pose change, the body moves a little the *opposite* way first, with a slight squash.
- **Follow-through and overlapping action:** the body leads, the arms trail it by about 40–80 ms and the head by about 60 ms, and every part overshoots slightly before settling.
- **Squash and stretch:** squash on the anticipation, stretch on the release, then settle. Volume stays constant (sx = 1/√sy).
- **Arcs:** joints rotate (angle interpolation), so hands travel on arcs, never in straight lines.
- **Secondary action:** breathing, blinks, head bobs on stressed syllables, gestures while talking.
- **Staging:** depth-of-field blur on the background, one focal point per shot, and bubbles always on top.

## 4. Choreography
- What moves first reads as most important: stagger in order of importance.
- Keep a whole stagger under about 0.45 s, so it reads as one gesture.
- Overlap entries; don't wait for one to finish.
- Each scene runs **build → breathe → resolve**: elements enter, live with one ambient motion, then exit decisively.

## 5. The camera
- Vary the ambient move per shot: a push in, a pull out, a lateral drift, or a near-still hold. Stillness after motion is powerful.
- Crafted moves (the reveals) use the `cinematic` curve.
- A slight handheld drift keeps it alive but never distracting.

## 6. Transitions carry meaning
| Transition | Meaning | Used when |
|---|---|---|
| Hard cut + impact | "wake up!", a disruption | a shock or panic beat starts a new scene |
| Dip to black | time passes ("next morning") | the same place at a later time |
| Whip-pan | energy, travel | normal scene changes |
| Slide | "and then…" | normal scene changes |
| Iris | a reveal or focus | a beat can request it |

## 7. Sound is part of the motion
- Every SFX is placed by its **sync point** (SFX Kit `sync.at`), not its file start:
  - a **whoosh** peaks at the move's fastest frame (about 25% into an ease-out move);
  - **pops and impacts** land on the frame something appears or hits;
  - **risers** arrive *at* the reveal;
  - **typing and writing** start with the action.
- Under narration, each sound comes down by its `under_voiceover_db`.
- Levels: narration at about −16 LUFS, effects 6 dB or more under it, music 18–20 dB under it. Master to −14 LUFS with a true peak at or below −1.2 dBTP.
