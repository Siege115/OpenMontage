# Kai — stickman mascot

A bald, black-and-white stickman: a big round white head, thick black stick limbs,
mitten hands and sneakers. He's built as a **poseable SVG rig**, so you don't need an AI
model, an API key, or a subscription to use him.

- `kai-rig.mjs` holds the rig: `character(pose)`, `head(expr)`, `POSES`, `PALETTE`.
  Limbs take either absolute angles (`{a1, a2}`) or IK targets (`{target, bend}`).
- `build.mjs` runs with `node assets/characters/kai/build.mjs` and writes `renders/`:
  - `kai-sheet.png/svg` is the character sheet (poses + expressions)
  - `kai-<pose>.png/svg` are single poses on a transparent background (840×1040 PNG), ready to
    overlay in Remotion, HyperFrames, CapCut, etc.

Poses: `wave`, `explain`, `think`, `shocked`, `scared`, `celebrate`, `hustle`, `laptop`.
Expressions: `neutral`, `happy`, `thinking`, `shocked`, `scared`, `angry`, `focused`, `strain`, `calm`.

To add a pose, add an entry to `POSES` and re-run the build. Because each pose is just
numbers, two poses can be tweened for animation.
