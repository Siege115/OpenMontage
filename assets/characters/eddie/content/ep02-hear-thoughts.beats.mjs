// Episode 2 — "What If You Could Hear Everyone's Thoughts?"  (v2: longer story + plot twist)
// Beat format: see ep01-never-sleep.beats.mjs, plus
//   people  background stick figures: { x, pose, expr, acc, flip, s, anim: "talk"|"dance"|"wave"|"walk", walk: [from, to], y }
//   items   thought / say bubbles: { type, arg: { t: "line|line", tail }, x, y, scale, delay }  (pop in at `delay` s)
//   cam     crafted camera move for the beat: { from: [x, y], to: [x, y], z0, z1 }
// Cast: Eddie · Sam (best friend, blue cap) · Mia (quiet girl, purple beanie + glasses) · Mom (bun)
export const TITLE = "What If You Could Hear Everyone's Thoughts?";

export const VOICE = {
  id: "AzE4gnPtOs5n9KxfDW3S",
  model: "eleven_v4",
  settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 0.97 },
};

const T = (t, x, y, delay = 0.3, tail = -1, scale = 1) => ({ type: "thought", arg: { t, tail }, x, y: y - 30, delay, scale: scale * 1.3 });
const SAY = (t, x, y, delay = 0.3, tail = -1, scale = 1) => ({ type: "say", arg: { t, tail }, x, y, delay, scale: scale * 1.25 });
const SAM = { acc: "cap:#5b8fd9", expr: "happy" };
const MIA = { acc: ["beanie:#a98bd6", "glasses"], expr: "calm" };
const MOM = { acc: "bun", expr: "happy" };
const BARISTA = { x: 1600, acc: "cap:#e5584f", expr: "happy", flip: true, anim: "talk" };
const studio = (tone) => ({ name: "studio", tone });

export const BEATS = [
  // ================= HOOK =================
  { pose: "lieAwake", expr: "neutral", x: 470, y: 690, blanket: true, scene: { name: "bedroom", clock: "7:02" },
    items: [T("where are my socks?!", 1500, 260, 1.2, -1)], text: "Tomorrow morning, you wake up… and you hear a voice. It's your neighbor. Through the wall. Thinking." },
  { pose: "shocked", x: 1080, scene: { name: "bedroom", clock: "7:03" }, text: "You can hear everyone's thoughts." },
  { pose: "walk", walk: [200, 900], scene: { name: "street", day: true },
    people: [{ x: 1300, ...SAM, anim: "wave", flip: true }, { walk: [1900, 1500], acc: "pigtails", anim: "walk", flip: true }],
    items: [T("is it Friday yet?", 1600, 230, 1.6, -1), T("cute dog!", 1300, 230, 2.6, -1)],
    text: "Not their voices. Their thoughts. Every secret. Every opinion. Every random little idea." },
  { pose: "celebrate", scene: studio("#fbefc4"), card: "NEVER LIED TO AGAIN", text: "It sounds like the ultimate superpower. You'd never be lied to again." },
  { pose: "crossArms", x: 960, scene: studio("#f9dcd6"), cam: { from: [960, 520], to: [960, 330], z0: 1.0, z1: 1.6 },
    text: "But by day thirty, you'll discover something about this power that changes everything. Let's find out." },

  // ================= DAY 1: the fun =================
  { pose: "coffee", day: "DAY 1", x: 760, scene: { name: "cafe" }, people: [BARISTA, { x: 1180, acc: "beanie", expr: "neutral" }],
    items: [T("nice shirt.", 1600, 230, 1.0, -1), T("please have cake…", 1180, 210, 3.2, 1)],
    text: "Day one is amazing. The barista thinks, 'Nice shirt.' The guy behind you is praying they have cake." },
  { pose: "phone", x: 960, scene: { name: "subway", ad: "NEXT STOP: DOWNTOWN", ad2: "MIND THE GAP" },
    people: [{ x: 520, acc: "glasses", pose: "sitBench", expr: "focused" }, { x: 1360, acc: "pigtails", flip: true }, { x: 1500, pose: "sitBench", acc: "cap:#8fc49a", flip: true }],
    items: [T("did I lock the door?", 520, 300, 0.8, 1), T("♪ dun dun dun ♪", 1360, 210, 2.0, -1), T("that guy has|a phone too", 1500, 330, 3.2, -1)],
    text: "On the subway, the whole car is a radio. Locked doors. Song lyrics. Someone judging your phone." },
  { pose: "sitBench", x: 700, scene: { name: "office", board: ["INTERVIEW", "10:00 AM"] }, people: [{ x: 1300, acc: "glasses", expr: "focused", flip: true, anim: "talk" }],
    items: [{ type: "chair", x: 700, y: 870, scale: 1.05 }, T("I hope they say|'teamwork'…", 1300, 250, 0.9, -1), SAY("Teamwork!", 700, 240, 3.0, 1)],
    text: "At a job interview, you hear the answer they want before they even ask the question." },
  { pose: "highFive", x: 820, scene: { name: "rooftop" }, people: [{ x: 1120, ...SAM, flip: true }],
    items: [SAY("YOU GOT THE JOB?!", 1120, 240, 0.6, -1)], text: "You get the job. Day one, and you're already winning at life." },

  // ================= DAY 3: too loud =================
  { pose: "phone", expr: "focused", day: "DAY 3", x: 960, scene: { name: "subway", ad: "YOUR BRAIN FILTERS VOICES", ad2: "…BUT NOT THOUGHTS" },
    people: [{ x: 420, acc: "bun" }, { x: 640, acc: "cap:#e5584f" }, { x: 1280, acc: "glasses", flip: true }, { x: 1520, acc: "beanie", flip: true }],
    text: "By day three, rush hour hits. Normally, your brain filters noise. Scientists call it the cocktail party effect: you can tune out a room and hear one voice." },
  { pose: "coverEars", x: 960, scene: { name: "subway", ad: "YOUR BRAIN FILTERS VOICES", ad2: "…BUT NOT THOUGHTS" },
    people: [{ x: 420, acc: "bun" }, { x: 640, acc: "cap:#e5584f" }, { x: 1280, acc: "glasses", flip: true }, { x: 1520, acc: "beanie", flip: true }],
    items: [T("milk, eggs, bread", 420, 230, 0.2, 1), T("rent is due…", 640, 120, 0.6, 1), T("so tired", 1280, 230, 1.0, -1), T("I'm late!!", 1520, 120, 1.4, -1),
      T("is that guy ok?", 960, 90, 1.8, -1, 0.9), T("what's that smell", 230, 110, 2.2, 1, 0.9)],
    text: "But thoughts have no volume knob. Fifty minds, all talking at once." },
  { pose: "think", x: 960, scene: studio("#e3f2df"), quiz: { q: "THOUGHTS PER DAY?", options: ["600", "6,000", "60,000"], answer: 1 },
    text: "Quick guess. How many thoughts does the average person have in a single day? Six hundred? Six thousand? Or sixty thousand?" },
  { pose: "explain", scene: studio("#fbefc4"), card: "6,000+ THOUGHTS A DAY",
    text: "Researchers estimate it's over six thousand distinct thoughts a day. And you're hearing all of them." },
  { pose: "run", walk: [300, 1500], scene: { name: "park" }, text: "You run. Somewhere. Anywhere quiet." },
  { pose: "sitBench", x: 1150, scene: { name: "park" }, items: [T("…", 760, 300, 1.5, 1, 0.8)],
    text: "The park helps. Turns out, ducks don't think in words." },

  // ================= DAY 7: the party =================
  { pose: "stand", expr: "scared", day: "DAY 7", x: 960, scene: { name: "party" },
    people: [{ x: 320, ...SAM, anim: "dance" }, { x: 620, acc: "pigtails", anim: "dance" }, { x: 1300, acc: "glasses", anim: "dance", flip: true }, { x: 1500, acc: "bun", anim: "dance", flip: true }],
    text: "A week in, Sam drags you to a party. You're terrified. Everyone's going to judge your dancing." },
  { pose: "dance", x: 960, scene: { name: "party" }, cam: { from: [520, 430], to: [1400, 430], z0: 1.3, z1: 1.3 },
    people: [{ x: 320, ...SAM, anim: "dance" }, { x: 620, acc: "pigtails", anim: "dance" }, { x: 1300, acc: "glasses", anim: "dance", flip: true }, { x: 1500, acc: "bun", anim: "dance", flip: true }],
    items: [T("do I look dumb?", 320, 230, 0.6, 1), T("is my hair ok?", 620, 230, 1.6, 1), T("everyone's|watching me", 1300, 220, 2.6, -1), T("hope nobody|noticed my shoes", 1500, 120, 3.6, -1)],
    text: "But nobody's watching you. They're all thinking about themselves." },
  { pose: "crossArms", expr: "thinking", x: 960, scene: studio("#f9dcd6"), quiz: { q: "HOW MANY NOTICED?", options: ["~75%", "~50%", "~25%"], answer: 2 },
    text: "Try this. You walk into a room wearing an embarrassing T-shirt. How many people actually notice? Most of them? Half? Or a quarter?" },
  { pose: "explain", scene: studio("#e3f2df"), card: "THE SPOTLIGHT EFFECT",
    text: "Psychologists call it the spotlight effect. In one famous study, students wearing an embarrassing T-shirt guessed half the room noticed. Only about a quarter did." },
  { pose: "think", x: 960, scene: studio("#d9ecf7"), card: "MINDS WANDER ~47% OF THE TIME",
    text: "And people spend nearly half their waking hours with their minds wandering somewhere else entirely." },
  { pose: "dance", expr: "happy", x: 960, scene: { name: "party" },
    people: [{ x: 320, ...SAM, anim: "dance" }, { x: 620, acc: "pigtails", anim: "dance" }, { x: 1300, acc: "glasses", anim: "dance", flip: true }, { x: 1500, acc: "bun", anim: "dance", flip: true }],
    text: "So for the first time in your life… you dance like nobody's watching. Because nobody is." },

  // ================= DAY 10: the temptation =================
  { pose: "sneak", day: "DAY 10", x: 760, scene: { name: "living", night: true }, people: [{ x: 1260, ...SAM, expr: "focused", flip: true }],
    items: [T("I have nothing.|Bluff it.", 1260, 230, 1.0, -1)],
    text: "Day ten. Game night with Sam. You can hear exactly when he's bluffing." },
  { pose: "celebrate", x: 760, scene: { name: "living", night: true }, people: [{ x: 1260, ...SAM, expr: "neutral", flip: true }],
    text: "You win. Again. And again. And again." },
  { pose: "stand", expr: "focused", x: 760, scene: { name: "living", night: true }, cam: { from: [1000, 450], to: [1180, 330], z0: 1.2, z1: 1.45 },
    people: [{ x: 1260, ...SAM, expr: "thinking", flip: true }], items: [T("he's been weird lately.|Is he… cheating?", 1260, 220, 1.2, -1)],
    text: "Then you hear Sam think something that stops you cold." },
  { pose: "facepalm", x: 760, scene: { name: "living", night: true }, people: [{ x: 1260, ...SAM, expr: "neutral", flip: true }],
    text: "You weren't playing with your best friend. You were reading him. And it doesn't feel like winning." },

  // ================= DAY 14: unfiltered =================
  { pose: "giveGift", day: "DAY 14", x: 760, scene: { name: "living" }, people: [{ x: 1300, ...MOM, flip: true }],
    items: [SAY("I love it!", 1300, 250, 1.2, -1), T("where am I going|to put this?", 1300, 90, 2.6, -1, 0.9)],
    text: "Two weeks in, the unfiltered truth arrives. Your mom loves your gift. Out loud." },
  { pose: "shrug", x: 960, scene: { name: "street", day: true },
    people: [{ x: 420, acc: "beanie" }, { x: 1520, acc: "cap:#e5584f", flip: true }],
    items: [T("what if I yelled|right now?", 420, 210, 0.8, 1), T("what if I licked|that pole?", 1520, 210, 2.2, -1)],
    text: "And then there's the weird stuff. The random, out-of-nowhere thoughts that pop into every head." },
  { pose: "explain", x: 1300, scene: { name: "office", board: ["INTRUSIVE THOUGHTS", "~94% of people", "13 countries"] },
    text: "Here's the thing: almost everyone has them. In a study across thirteen countries, about ninety-four percent of people reported unwanted intrusive thoughts." },
  { pose: "walk", expr: "focused", walk: [1500, 500], scene: { name: "street" },
    text: "They're just noise. But you can't un-hear any of it. So you start avoiding people." },

  // ================= DAY 21: silence, and Mia =================
  { pose: "coverEars", day: "DAY 21", x: 960, scene: { name: "concert" }, text: "By day twenty-one, the world feels like a rock concert that never ends." },
  { pose: "sneak", x: 640, scene: { name: "library" }, people: [{ x: 1500, ...MIA, pose: "read" }],
    text: "So you hide in the one place that should be quiet. And there, you find something impossible." },
  { pose: "listen", x: 640, riser: 1.6, scene: { name: "library" }, people: [{ x: 1500, ...MIA, pose: "read" }],
    cam: { from: [900, 420], to: [1500, 360], z0: 1.2, z1: 1.9 }, items: [T("…", 1500, 230, 1.6, -1)],
    text: "A girl named Mia. Reading. And her mind is… completely silent." },
  { pose: "explain", scene: studio("#e3f2df"), card: "SOME PEOPLE HAVE NO INNER VOICE",
    text: "It's real: some people report having little or no inner voice at all. Their thoughts work more like pictures, or feelings, than words." },
  { pose: "sitBench", x: 1150, scene: { name: "park" }, people: [{ x: 1500, ...MIA, pose: "sitBench", flip: true }],
    items: [SAY("you don't talk much.", 1150, 300, 0.6, 1), SAY("don't need to.", 1500, 170, 2.8, -1)],
    text: "So you start spending every day with her. Being near Mia is like stepping out of a concert, into a library." },
  { pose: "idea", expr: "calm", x: 960, scene: { name: "park" }, text: "For the first time in weeks, you can hear your own thoughts again." },

  // ================= DAY 30: the twist =================
  { pose: "stand", expr: "thinking", day: "DAY 30", x: 800, scene: { name: "rooftop" }, people: [{ x: 1160, ...MIA, flip: true }],
    text: "Day thirty. Sunset. You finally ask yourself the obvious question." },
  { pose: "think", x: 800, scene: { name: "rooftop" }, people: [{ x: 1160, ...MIA, flip: true }],
    items: [T("why is her mind|so quiet?", 800, 150, 1.0, 1)], text: "Why is Mia's mind the only one you can't hear?" },
  { pose: "shocked", x: 800, riser: 1.2, scene: { name: "rooftop" }, people: [{ x: 1160, ...MIA, expr: "happy", flip: true }],
    cam: { from: [980, 450], to: [1160, 330], z0: 1.2, z1: 1.9 }, items: [T("because I'm listening|too, Eddie.", 1160, 200, 1.2, -1)],
    text: "And then, for the very first time… you hear her think. Directly at you." },
  { pose: "scared", x: 800, scene: { name: "rooftop" }, people: [{ x: 1160, ...MIA, expr: "happy", flip: true }],
    items: [T("you've been really|loud for 30 days.", 1160, 200, 0.8, -1)],
    text: "Mia can hear thoughts too. She's had it for years. Her mind isn't empty. She just learned to keep it quiet." },
  { pose: "facepalm", x: 800, scene: { name: "rooftop" }, people: [{ x: 1160, ...MIA, expr: "happy", flip: true }],
    text: "Which means she heard everything you thought. The panic. The party. The poker games. All of it." },
  { pose: "shrug", expr: "calm", x: 800, scene: { name: "rooftop" }, people: [{ x: 1160, ...MIA, expr: "happy", flip: true, anim: "talk" }],
    items: [T("everyone's mind is messy.|Even yours. It's okay.", 1160, 200, 0.8, -1)],
    text: "And she's still here. Because she figured out what you're only just learning." },
  { pose: "explain", x: 960, scene: studio("#fbefc4"), card: "THOUGHTS ≠ WHO YOU ARE",
    text: "Thoughts aren't who people are. They're weather. What people choose to say, and do… that's the real them." },

  // ================= THE ANSWER =================
  { pose: "crossArms", expr: "calm", day: "-", x: 960, scene: studio("#d9ecf7"),
    text: "So, what if you could hear everyone's thoughts? You'd win every game, and ace every interview." },
  { pose: "stand", expr: "calm", x: 960, scene: { name: "street", day: true }, people: [{ x: 1350, ...SAM, flip: true, anim: "talk" }],
    text: "But the real superpower isn't reading minds. It's giving people the benefit of the doubt, because now you know how messy it is in there." },

  // ================= OUTRO + mini twist =================
  { pose: "coffee", x: 760, scene: { name: "cafe" }, people: [BARISTA], items: [T("nice shirt.", 1600, 230, 0.6, -1)],
    text: "Next morning. Same café. Same barista." },
  { pose: "shocked", x: 760, scene: { name: "cafe" }, people: [{ ...BARISTA, anim: undefined, expr: "focused" }],
    cam: { from: [1200, 450], to: [1600, 340], z0: 1.2, z1: 2.0 }, items: [T("…wait. Can HE hear me?", 1600, 230, 0.8, -1)],
    text: "And then you hear her think something new." },
  { pose: "wave", x: 960, scene: studio("#fbefc4"), text: "Would you want this power? Tell me in the comments. And who do you think the barista is?" },
  { pose: "idea", scene: studio("#e3f2df"), card: "NEXT: NEVER FEEL PAIN", text: "Next time, Eddie finds out what happens if you never feel pain again. Subscribe, so you don't miss it." },
];
