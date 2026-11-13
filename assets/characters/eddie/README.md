# Eddie — stickman mascot

A bald, black-and-white stickman: a big round white head, thick black stick limbs,
mitten hands and sneakers. He's built as a **poseable SVG rig**, so you don't need an AI
model, an API key, or a subscription to use him.

- `eddie-rig.mjs` holds the rig: `character(pose)`, `head(expr)`, `POSES`, `PALETTE`.
  Limbs take either absolute angles (`{a1, a2}`) or IK targets (`{target, bend}`).
- `build.mjs` runs with `node assets/characters/eddie/build.mjs` and writes `renders/`:
  - `eddie-sheet.png/svg` is the character sheet (poses + expressions)
  - `eddie-<pose>.png/svg` are single poses on a transparent background (840×1040 PNG), ready to
    overlay in Remotion, HyperFrames, CapCut, etc.

Poses: `wave`, `explain`, `think`, `shocked`, `scared`, `celebrate`, `hustle`, `laptop`.
Expressions: `neutral`, `happy`, `thinking`, `shocked`, `scared`, `angry`, `focused`, `strain`, `calm`.

To add a pose, add an entry to `POSES` and re-run the build. Because each pose is just
numbers, two poses can be tweened for animation.

## Making an episode

1. Write a beat sheet (see `content/ep01-never-sleep.beats.mjs`). Each beat has narration
   text, a pose, and optionally an expression, props, on-screen text and a "DAY X" stamp.
2. Get a Piper voice (free, local). Install it with `pip install piper-tts`, then download e.g.
   `en_US-ryan-high.onnx` and its `.onnx.json` from `huggingface.co/rhasspy/piper-voices` into
   `projects/<name>/voices/`.
3. Render:
   ```
   node assets/characters/eddie/render-episode.mjs assets/characters/eddie/content/ep01-never-sleep.beats.mjs projects/eddie-never-sleep
   ```
   Add `--only 0-5` to preview a range of beats. The output is `projects/<name>/episode.mp4`
   (1080p, 24fps), with narration, captions and tweened poses.
