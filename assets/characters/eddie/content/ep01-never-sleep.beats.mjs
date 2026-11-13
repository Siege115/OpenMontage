// Episode 1 — "What If You Never Had to Sleep Again?"
// One entry per narration beat:
//   pose   POSES key in eddie-rig.mjs (or "stand"); expr overrides the face
//   scene  { name: bedroom|desk|living|street|classroom|road|studio, ...options } (scenes.mjs)
//   items  extra props in screen space; card = paper note on screen; day = section stamp
//   x/y    Eddie's pelvis position; walk = [fromX, toX]; look = glance around; blanket/blackout = gags
// Variety rule: never the same pose twice in a row, and change the scene often.
export const TITLE = "What If You Never Had to Sleep Again?";

// ElevenLabs voice. "George" (JBFqnCBsd6RMkjVDRZzb) is a warm, natural storyteller in the premade library.
export const VOICE = {
  id: "JBFqnCBsd6RMkjVDRZzb",
  model: "eleven_multilingual_v2",
  settings: { stability: 0.42, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 0.97 },
};

const bedNight = (clock = "3:00", dim = false) => ({ name: "bedroom", night: true, clock, dim });
const studio = (tone) => ({ name: "studio", tone });
const board = (...lines) => ({
  name: "classroom",
  board: lines.map((l, i) => `<text x="1370" y="${290 + i * 110}" text-anchor="middle" font-size="${i === 0 ? 92 : 72}" fill="#f4f4ee" stroke="none">${l}</text>`).join(""),
});
const LIE = { x: 470, y: 690, blanket: true };

export const BEATS = [
  // ---- Hook ----
  { pose: "lie", ...LIE, scene: bedNight(), text: "Tonight, you lie down, close your eyes… and nothing happens." },
  { pose: "lieAwake", expr: "shocked", ...LIE, scene: bedNight(), text: "Not tired. Not even a little. And you never will be again." },
  { pose: "stand", expr: "focused", look: true, x: 1080, scene: bedNight(), text: "No sleep. No dreams. No naps. Just… awake. Forever." },
  { pose: "celebrate", scene: studio("#fbefc4"), card: "+8 HOURS A DAY", text: "Sounds like a superpower, right? Eight extra hours, every single day." },
  { pose: "crossArms", x: 960, scene: studio("#f9dcd6"), text: "But by day thirty, your body will have a very different opinion. Let's find out what happens." },

  // ---- Day 1 ----
  { pose: "wave", day: "DAY 1", x: 1000, scene: { name: "living" }, text: "Day one is incredible." },
  { pose: "type", x: 960, scene: { name: "desk", night: true, clock: "11:00 PM" }, text: "It's eleven P.M. and everyone else is yawning. You're not. You clean your room. You finish that show." },
  { pose: "shrug", expr: "happy", x: 960, scene: { name: "desk", night: true, clock: "4:00 AM" }, text: "You beat the game. At four A.M., you're still fresh." },
  { pose: "explain", x: 620, scene: board("24h ÷ 3 = 8h", "asleep: 1/3 of life"), text: "You start doing the math. The average person sleeps about a third of their life away." },
  { pose: "shocked", x: 620, scene: board("≈ 26 YEARS", "with your eyes closed"), text: "Over a lifetime, that's roughly twenty-six years with your eyes closed." },
  { pose: "celebrate", x: 960, scene: studio("#d9ecf7"), text: "You just got all of that back. By sunrise, you've already lived a full extra day before breakfast." },

  // ---- Day 3 ----
  { pose: "walk", day: "DAY 3", walk: [260, 900], scene: { name: "street" }, text: "By night three, you notice something strange." },
  { pose: "stand", look: true, x: 900, scene: { name: "street" }, text: "From midnight to six A.M., the world is asleep. Shops are closed. Friends don't reply. The group chat is dead." },
  { pose: "shrug", expr: "calm", x: 900, scene: { name: "street" }, text: "You have all this time… and nobody to spend it with." },
  { pose: "read", x: 1000, scene: { name: "living", night: true }, text: "So you get creative. You learn guitar. You start a side hustle. You read an entire book in one night." },
  { pose: "explain", scene: studio("#fbefc4"), card: "8 × 365 = 2,920 HOURS", text: "Eight hours, times three hundred sixty-five, is two thousand nine hundred and twenty hours a year." },
  { pose: "type", x: 960, scene: { name: "desk" }, text: "That's like getting four extra months every year. You could learn a language. Build a business. Start a YouTube channel." },
  { pose: "idea", x: 960, scene: studio("#e3f2df"), text: "For now, it feels like you're winning at life." },

  // ---- Day 7 ----
  { pose: "crossArms", expr: "thinking", day: "DAY 7", x: 1000, scene: { name: "living" }, text: "A week in, you still don't feel tired. But your brain starts acting weird." },
  { pose: "read", expr: "thinking", x: 1000, scene: { name: "living" }, text: "You read a paragraph, then read it again, and none of it sticks." },
  { pose: "explain", x: 620, scene: board("TODAY'S MEMORIES", "→ sort → save"), text: "Here's why. Sleep isn't just rest. While you sleep, your brain sorts through everything you learned that day." },
  { pose: "think", x: 620, scene: board("NO SLEEP", "= NO SAVING"), text: "It decides what to keep, and moves it into long-term memory. No sleep means no sorting." },
  { pose: "facepalm", x: 1000, scene: { name: "living" }, text: "That guitar chord you practiced for three hours? Gone by the next day. The book you read? You remember the cover." },
  { pose: "shrug", x: 960, scene: studio("#f9dcd6"), text: "You have more time than ever… and you're learning less than ever." },

  // ---- Day 14 ----
  { pose: "scared", day: "DAY 14", x: 620, scene: board(""), items: [{ type: "brain", x: 1370, y: 440, arg: 0.15, scale: 2.2 }], text: "Two weeks in, things get stranger." },
  { pose: "explain", x: 620, scene: board("GLYMPHATIC SYSTEM"), items: [{ type: "brain", x: 1370, y: 470, arg: 0.08, scale: 2 }], text: "Scientists discovered that during deep sleep, your brain runs a kind of night shift cleaning crew, called the glymphatic system." },
  { pose: "think", expr: "focused", x: 620, scene: board("night shift", "cleaning crew"), items: [{ type: "brain", x: 1370, y: 545, arg: 0.05, scale: 1.6 }], text: "Fluid washes through your brain, and flushes out the waste your neurons made during the day." },
  { pose: "stand", expr: "focused", look: true, x: 900, scene: { name: "street" }, items: [{ type: "trash", x: 1250, y: 880, arg: 3 }], text: "Your brain cleans itself mostly while you sleep. Now picture a city where the garbage trucks never come." },
  { pose: "scared", x: 760, scene: { name: "street" }, items: [{ type: "trash", x: 1250, y: 880, arg: 12, scale: 1.6 }], text: "Day after day, the trash piles up." },
  { pose: "hustle", expr: "angry", x: 1000, scene: { name: "living" }, text: "You might not feel tired. But you get irritable. You snap at people over nothing." },
  { pose: "walk", expr: "thinking", walk: [760, 1180], scene: { name: "living" }, text: "You forget names. You forget why you walked into a room." },

  // ---- Day 21 ----
  { pose: "shocked", day: "DAY 21", x: 960, scene: studio("#d6dae6"), text: "Now for the creepiest part." },
  { pose: "explain", x: 1000, blackout: true, scene: { name: "living" }, text: "You're talking to a friend, and suddenly, they're halfway through a sentence you never heard start." },
  { pose: "panic", x: 1000, scene: { name: "living" }, text: "You just blinked for three seconds… and didn't notice." },
  { pose: "explain", x: 620, scene: board("MICROSLEEPS", "a split second to a few seconds"), text: "In real sleep research, people experience microsleeps. Tiny blackouts, from a fraction of a second to several seconds, even with their eyes open." },
  { pose: "scared", x: 1050, scene: { name: "road" }, text: "Your brain still tries to steal tiny scraps of rest. Behind the wheel, three seconds is enough to drift off the road." },
  { pose: "think", scene: studio("#fbefc4"), card: "REAL RECORD: ~11 DAYS", text: "In nineteen sixty-four, a seventeen-year-old named Randy Gardner stayed awake for about eleven days, for a science fair." },
  { pose: "crossArms", expr: "focused", x: 960, scene: studio("#fbefc4"), text: "By the end, he struggled to concentrate, had trouble with simple tasks, and was moody. And you're at day twenty-one." },

  // ---- Day 30 ----
  { pose: "hustle", day: "DAY 30", x: 1100, scene: bedNight("3:00", true), text: "One month, without a single minute of sleep." },
  { pose: "shrug", expr: "calm", x: 1100, scene: bedNight("3:00", true), card: "+240 HOURS", text: "You've lived ten more days than everyone around you. But it doesn't feel like a gift anymore." },
  { pose: "scared", look: true, x: 1100, scene: bedNight("3:00", true), text: "Colors look too bright. Shadows move in the corner of your eye. You hear your name when no one called it." },
  { pose: "facepalm", x: 1100, scene: bedNight("3:00", true), text: "Your immune system, which does much of its repair work during sleep, is struggling. You catch every cold that goes around." },
  { pose: "idea", expr: "focused", x: 960, scene: studio("#e3f2df"), text: "And here's the twist. You never felt tired. Not once." },
  { pose: "explain", x: 620, scene: board("TIRED = warning light", "SLEEP = repair shop"), text: "Because tiredness was never the problem. Tiredness is just the warning light. Sleep is the repair shop." },
  { pose: "shocked", x: 1050, scene: { name: "road" }, text: "You removed the warning light… and kept driving." },

  // ---- Answer ----
  { pose: "crossArms", expr: "calm", day: "-", x: 1000, scene: { name: "living" }, text: "So what if you never had to sleep again? At first, it's the ultimate life hack." },
  { pose: "explain", x: 620, scene: board("SLEEP:", "✓ saves memories", "✓ takes out the trash", "✓ repairs you"), text: "But your body doesn't treat sleep as wasted time. It's when your brain files your memories, takes out the trash, and repairs you." },
  { pose: "stand", expr: "calm", x: 960, scene: studio("#d9ecf7"), text: "The real superpower isn't skipping sleep. It's what you do with the hours you're already awake." },
  { pose: "type", expr: "happy", x: 960, scene: { name: "desk" }, card: "5,840 HOURS / YEAR", text: "Sixteen hours a day is still more than five thousand eight hundred hours a year. That's plenty of time to learn guitar, for real." },

  // ---- Outro ----
  { pose: "wave", x: 1000, scene: { name: "living" }, text: "So, would you take the deal? Eight extra hours a day, knowing what happens by day thirty? Tell me in the comments." },
  { pose: "think", expr: "happy", x: 1000, scene: { name: "living" }, text: "And tell me what 'what if' I should test next. Someone already asked: what if you could hear everyone's thoughts?" },
  { pose: "celebrate", x: 960, scene: studio("#fbefc4"), text: "Subscribe, so you don't miss it…" },
  { pose: "lie", ...LIE, scene: bedNight("10:30"), text: "…and get some sleep." },
];
