// Episode 2 — "What If You Could Hear Everyone's Thoughts?"
// Same beat format as ep01 (see ep01-never-sleep.beats.mjs), plus:
//   people  background stick figures: { x, pose, expr, acc: "cap:#hex" | "bun" | "glasses" | "beanie" | "pigtails", flip, s }
//   items   { type: "thought", arg: { t: "line|line", tail: -1|1 }, x, y, scale, delay } pops in at `delay` seconds
export const TITLE = "What If You Could Hear Everyone's Thoughts?";

export const VOICE = {
  id: "AzE4gnPtOs5n9KxfDW3S",
  model: "eleven_v4",
  settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 0.97 },
};

const studio = (tone) => ({ name: "studio", tone });
const board = (...lines) => ({
  name: "classroom",
  board: lines.map((l, i) => `<text x="1370" y="${290 + i * 110}" text-anchor="middle" font-size="${i === 0 ? 84 : 66}" fill="#f4f4ee" stroke="none">${l}</text>`).join(""),
});
const T = (t, x, y, delay = 0.3, tail = -1, scale = 1) => ({ type: "thought", arg: { t, tail }, x, y: y - 30, delay, scale: scale * 1.32 });
const DAY = { name: "street", day: true };
const CAFE = { name: "cafe" };
const LIVING = { name: "living" };
const barista = { x: 1600, acc: "cap:#e5584f", expr: "happy", flip: true };
const customer = { x: 1180, acc: "beanie", expr: "neutral" };
const friend = { x: 1300, acc: "glasses", expr: "happy", flip: true };
const mom = { x: 1300, acc: "bun", expr: "happy", flip: true };

export const BEATS = [
  // ---- Hook ----
  { pose: "shocked", x: 1080, scene: { name: "bedroom", clock: "7:00" }, text: "Tomorrow morning, you wake up… and you can hear everyone's thoughts." },
  { pose: "stand", expr: "shocked", look: true, x: 960, scene: DAY,
    people: [{ x: 380, acc: "cap:#5b8fd9" }, { x: 1520, acc: "pigtails", flip: true }],
    items: [T("forgot my keys…", 380, 230, 0.6, 1), T("is it Friday yet?", 1520, 230, 1.6, -1)],
    text: "Not their voices. Their thoughts. Every secret. Every opinion. Every random little idea." },
  { pose: "celebrate", scene: studio("#fbefc4"), card: "NEVER LIED TO AGAIN", text: "Sounds like the ultimate superpower, right? You'd never be lied to again." },
  { pose: "crossArms", x: 960, scene: studio("#f9dcd6"), text: "But by day thirty, you'll wish you could turn it off. Let's find out why." },

  // ---- Day 1 ----
  { pose: "wave", day: "DAY 1", x: 960, scene: DAY, people: [{ x: 1500, acc: "bun", flip: true, expr: "happy" }], items: [T("cute dog!", 1500, 240, 1.0, -1)], text: "Day one starts amazing." },
  { pose: "stand", expr: "happy", x: 760, scene: CAFE, people: [barista, customer],
    items: [T("nice shirt.", 1600, 220, 1.2, -1), T("please have cake…", 1180, 200, 3.6, 1)],
    text: "At the café, the barista thinks, 'Nice shirt.' You smile. The guy behind you is thinking, 'I hope they have cake.'" },
  { pose: "idea", x: 760, scene: CAFE, people: [{ ...friend, x: 1250 }], items: [T("an oat latte…", 1250, 210, 0.8, -1)],
    text: "You know what everyone wants before they say it. You order for your friend before they even open their mouth." },
  { pose: "shrug", expr: "happy", x: 330, scene: { name: "desk" }, people: [{ x: 860, pose: "type", acc: "glasses", expr: "focused", s: 0.85 }],
    items: [T("they're perfect.", 860, 300, 1.4, -1)], text: "A job interview? Easy. You can hear exactly what they want to hear." },

  // ---- Day 3 ----
  { pose: "think", day: "DAY 3", x: 960, scene: DAY, text: "But by day three, you notice something." },
  { pose: "explain", x: 620, scene: board("COCKTAIL PARTY", "EFFECT", "your brain filters voices"),
    text: "Your brain is built to filter sound. In a noisy room, you can tune out every voice except the one you care about. Scientists call it the cocktail party effect." },
  { pose: "scared", x: 760, scene: CAFE, people: [barista, customer], text: "But thoughts don't come with a volume knob." },
  { pose: "panic", x: 760, scene: CAFE, people: [barista, customer, { x: 300, acc: "pigtails", expr: "neutral" }],
    items: [T("milk, eggs, bread", 300, 220, 0.4, 1), T("did I leave the|oven on?", 1180, 190, 1.3, 1), T("rent is due…", 1600, 220, 2.1, -1),
      T("♪ la la la ♪", 560, 120, 2.8, 1, 0.9), T("so tired", 1000, 90, 3.4, -1, 0.9), T("what's that smell?", 1400, 80, 4.0, -1, 0.9)],
    text: "In a crowded café, twenty minds talk at once. Groceries. Song lyrics. Bills. Someone wondering if they left the oven on." },
  { pose: "explain", scene: studio("#fbefc4"), card: "6,000+ THOUGHTS A DAY",
    text: "And that's just the people around you. Researchers estimate the average person has over six thousand distinct thoughts a day." },
  { pose: "shocked", x: 960, scene: DAY, people: [{ x: 300, acc: "cap:#5b8fd9" }, { x: 600, acc: "bun" }, { x: 1350, acc: "glasses", flip: true }, { x: 1650, acc: "beanie", flip: true }],
    items: [T("lunch?", 300, 240, 0.2, 1), T("ugh, Monday", 600, 240, 0.5, 1), T("where's my phone", 1350, 240, 0.8, -1), T("I'm late!", 1650, 240, 1.1, -1)],
    text: "Now multiply that by a whole city." },

  // ---- Day 7 ----
  { pose: "crossArms", day: "DAY 7", x: 960, scene: LIVING, text: "A week in, you learn something nobody expects." },
  { pose: "walk", walk: [300, 820], scene: LIVING, people: [{ x: 1150, acc: "pigtails", flip: true }, { x: 1450, acc: "cap:#8fc49a", flip: true }],
    text: "You walk into a room, worried everyone is judging your outfit." },
  { pose: "stand", expr: "thinking", x: 820, scene: LIVING, people: [{ x: 1150, acc: "pigtails", flip: true }, { x: 1450, acc: "cap:#8fc49a", flip: true }],
    items: [T("do I look okay?", 1150, 230, 0.6, -1), T("what's for dinner?", 1450, 140, 1.4, -1)],
    text: "They're not. They're all thinking about themselves." },
  { pose: "explain", x: 620, scene: board("SPOTLIGHT EFFECT", "guessed: 50% noticed", "actually: ~25%"),
    text: "Psychologists call it the spotlight effect. In one famous study, students wore an embarrassing T-shirt into a room. They guessed half the people noticed. Only about a quarter did." },
  { pose: "think", scene: studio("#e3f2df"), card: "MINDS WANDER ~47% OF THE DAY",
    text: "And people spend nearly half their waking hours with their minds wandering somewhere else entirely." },
  { pose: "stand", expr: "calm", x: 960, scene: LIVING, text: "Weirdly… that's a relief." },

  // ---- Day 14 ----
  { pose: "scared", day: "DAY 14", x: 960, scene: LIVING, text: "Two weeks in, things get personal." },
  { pose: "facepalm", x: 760, scene: LIVING, people: [friend], items: [T("that wasn't funny.", 1300, 230, 1.6, -1)],
    text: "Your best friend laughs at your joke… and thinks, 'that wasn't funny.'" },
  { pose: "shrug", x: 760, scene: LIVING, people: [mom], items: [T("where do I put this?", 1300, 230, 1.8, -1)],
    text: "Your mom says she loves your gift. Her mind says, 'where am I going to put this?'" },
  { pose: "shocked", x: 960, scene: { name: "street" }, people: [{ x: 420, acc: "beanie" }, { x: 1520, acc: "cap:#e5584f", flip: true }],
    items: [T("what if I yelled|right now?", 420, 200, 1.2, 1), T("what if I licked|that pole?", 1520, 200, 2.2, -1)],
    text: "And then you hear the weird stuff. The random, out-of-nowhere thoughts that pop into every head." },
  { pose: "explain", x: 620, scene: board("INTRUSIVE THOUGHTS", "~94% of people", "13 countries"),
    text: "Here's the thing: almost everyone has them. In a study across thirteen countries, about ninety-four percent of people reported unwanted intrusive thoughts." },
  { pose: "shrug", expr: "calm", x: 960, scene: studio("#d9ecf7"), text: "They aren't wishes. They're just noise. But you can't un-hear them." },
  { pose: "walk", expr: "focused", walk: [1300, 500], scene: { name: "street" }, text: "You start avoiding people. Not because they're bad… but because you hear the unfiltered version of everyone." },

  // ---- Day 21 ----
  { pose: "panic", day: "DAY 21", x: 1100, scene: { name: "bedroom", night: true, clock: "2:00" },
    items: [T("TOO LOUD", 1480, 250, 0.3, -1), T("neighbors…", 700, 200, 0.8, 1)],
    text: "By day twenty-one, you'd pay anything for silence." },
  { pose: "think", x: 760, scene: LIVING, people: [{ ...friend, acc: "beanie" }], items: [T("…", 1300, 240, 1.0, -1)],
    text: "You find it in the strangest place: a friend who's thinking… almost nothing." },
  { pose: "explain", x: 620, scene: board("NO INNER VOICE?", "thinking in pictures", "and feelings"),
    text: "Some people report having little or no inner voice at all. Their thoughts work more like pictures, or feelings, than words." },
  { pose: "stand", expr: "calm", x: 760, scene: LIVING, people: [{ ...friend, acc: "beanie", expr: "calm" }],
    text: "Being near them feels like stepping out of a rock concert… into a library." },
  { pose: "idea", expr: "calm", x: 960, scene: studio("#e3f2df"), text: "And for the first time in weeks, you can hear your own thoughts again." },

  // ---- Day 30 ----
  { pose: "think", day: "DAY 30", x: 960, scene: studio("#fbefc4"), text: "One month in, you finally figure it out." },
  { pose: "stand", expr: "focused", x: 960, scene: DAY,
    people: [{ x: 300, acc: "cap:#5b8fd9" }, { x: 620, acc: "bun" }, { x: 1320, acc: "glasses", flip: true }, { x: 1640, acc: "pigtails", flip: true }],
    items: [T("am I enough?", 300, 240, 0.4, 1), T("so jealous…", 620, 240, 1.0, 1), T("hope they're ok", 1320, 240, 1.6, -1), T("ugh, petty me", 1640, 240, 2.2, -1)],
    text: "Everyone's mind is messy. Insecure. Distracted. Strange. Kind one second, petty the next." },
  { pose: "shocked", x: 960, scene: studio("#f9dcd6"), items: [T("wait… mine too?", 1340, 230, 1.0, -1)], text: "And here's the twist: so is yours." },
  { pose: "explain", x: 620, scene: board("THOUGHTS ≠ YOU", "just passing weather"), text: "Thoughts aren't who people are. They're more like weather passing through." },
  { pose: "crossArms", expr: "calm", x: 960, scene: LIVING, text: "What people choose to say and do… that's the real them." },

  // ---- Answer ----
  { pose: "celebrate", day: "-", x: 960, scene: studio("#fbefc4"), text: "So what if you could hear everyone's thoughts? At first, you'd feel like a genius." },
  { pose: "explain", scene: studio("#d9ecf7"), card: "THE FILTER", text: "But you'd lose the one thing that makes being around people easy: the filter." },
  { pose: "stand", expr: "calm", x: 760, scene: CAFE, people: [{ ...friend, x: 1250, expr: "happy" }],
    text: "The real superpower isn't reading minds. It's giving people the benefit of the doubt, because now you know how messy it is in there." },

  // ---- Outro ----
  { pose: "wave", x: 960, scene: LIVING, text: "So, would you want this power? Tell me in the comments." },
  { pose: "idea", scene: studio("#e3f2df"), card: "NEXT: NEVER FEEL PAIN", text: "And next time, Eddie finds out what happens if you never feel pain again." },
  { pose: "celebrate", x: 960, scene: studio("#fbefc4"), text: "Subscribe, so you don't miss it…" },
  { pose: "stand", expr: "happy", x: 760, scene: CAFE, people: [barista], items: [T("nice shirt.", 1600, 220, 0.4, -1)],
    text: "…and maybe don't say everything you think." },
];
