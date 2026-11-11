// Episode 1 — "What If You Never Had to Sleep Again?"
// One entry per narration beat. pose = a POSES key (or "stand"), expr overrides the
// pose's face, scene = props drawn in screen space (1920x1080), card = big on-screen
// text, day = section stamp, night = dim background.
export const TITLE = "What If You Never Had to Sleep Again?";

const bedroom = [{ type: "bed", x: 470, y: 860 }, { type: "clock", x: 1460, y: 330, arg: "3:00" }];
const street = [{ type: "moon", x: 1560, y: 200 }, { type: "house", x: 380, y: 860 }, { type: "house", x: 1560, y: 860 }];
const brainFx = (lvl) => [{ type: "brain", x: 1380, y: 600, arg: lvl, scale: 2.2 }];

export const BEATS = [
  // ---- Hook ----
  { pose: "shocked", night: true, scene: bedroom, text: "Tonight, you lie down, close your eyes… and nothing happens." },
  { pose: "think", night: true, scene: bedroom, text: "Not tired. Not even a little. And you never will be again." },
  { pose: "think", expr: "focused", night: true, scene: bedroom, text: "No sleep. No dreams. No naps. Just… awake. Forever." },
  { pose: "celebrate", text: "Sounds like a superpower, right? Eight extra hours, every single day.", card: "+8 HOURS A DAY" },
  { pose: "explain", text: "But by day thirty, your body will have a very different opinion. Let's find out what happens." },

  // ---- Day 1 ----
  { pose: "celebrate", day: "DAY 1", text: "Day one is incredible." },
  { pose: "laptop", expr: "happy", night: true, scene: [{ type: "clock", x: 1460, y: 330, arg: "11:00" }], text: "It's eleven P.M. and everyone else is yawning. You're not. You clean your room. You finish that show." },
  { pose: "laptop", expr: "happy", night: true, scene: [{ type: "clock", x: 1460, y: 330, arg: "4:00" }], text: "You beat the game. At four A.M., you're still fresh." },
  { pose: "explain", text: "You start doing the math. The average person sleeps about a third of their life away.", card: "1/3 OF YOUR LIFE" },
  { pose: "shocked", text: "Over a lifetime, that's roughly twenty-six years with your eyes closed.", card: "≈ 26 YEARS ASLEEP" },
  { pose: "wave", text: "You just got all of that back. By sunrise, you've already lived a full extra day before breakfast." },

  // ---- Day 3 ----
  { pose: "think", day: "DAY 3", night: true, scene: street, text: "By night three, you notice something strange." },
  { pose: "stand", expr: "neutral", night: true, scene: street, text: "From midnight to six A.M., the world is asleep. Shops are closed. Friends don't reply. The group chat is dead." },
  { pose: "think", expr: "calm", night: true, scene: street, text: "You have all this time… and nobody to spend it with." },
  { pose: "explain", text: "So you get creative. You learn guitar. You start a side hustle. You read an entire book in one night.", scene: [{ type: "book", x: 1420, y: 520, scale: 1.8 }] },
  { pose: "laptop", expr: "happy", text: "Eight hours, times three hundred sixty-five, is two thousand nine hundred and twenty hours a year.", card: "8 × 365 = 2,920 HOURS" },
  { pose: "explain", text: "That's like getting four extra months every year. You could learn a language. Build a business. Start a YouTube channel." },
  { pose: "celebrate", text: "For now, it feels like you're winning at life." },

  // ---- Day 7 ----
  { pose: "think", day: "DAY 7", scene: [{ type: "book", x: 1420, y: 520, scale: 1.8 }], text: "A week in, you still don't feel tired. But your brain starts acting weird." },
  { pose: "think", expr: "focused", scene: [{ type: "book", x: 1420, y: 520, scale: 1.8 }], text: "You read a paragraph, then read it again, and none of it sticks." },
  { pose: "explain", text: "Here's why. Sleep isn't just rest. While you sleep, your brain sorts through everything you learned that day." },
  { pose: "explain", expr: "focused", text: "It decides what to keep, and moves it into long-term memory. No sleep means no sorting.", card: "NO SLEEP = NO SAVING" },
  { pose: "shocked", text: "That guitar chord you practiced for three hours? Gone by the next day. The book you read? You remember the cover." },
  { pose: "scared", text: "You have more time than ever… and you're learning less than ever." },

  // ---- Day 14 ----
  { pose: "scared", day: "DAY 14", scene: brainFx(0.15), text: "Two weeks in, things get stranger." },
  { pose: "explain", scene: brainFx(0.1), text: "Scientists discovered that during deep sleep, your brain runs a kind of night shift cleaning crew, called the glymphatic system.", card: "THE GLYMPHATIC SYSTEM" },
  { pose: "explain", expr: "focused", scene: brainFx(0.1), text: "Fluid washes through your brain, and flushes out the waste your neurons made during the day." },
  { pose: "think", scene: brainFx(0.3), text: "Your brain cleans itself mostly while you sleep. Now picture a city where the garbage trucks never come." },
  { pose: "scared", scene: brainFx(0.6), text: "Day after day, the trash piles up." },
  { pose: "hustle", expr: "angry", scene: brainFx(0.75), text: "You might not feel tired. But you get irritable. You snap at people over nothing." },
  { pose: "think", expr: "shocked", scene: brainFx(0.85), text: "You forget names. You forget why you walked into a room." },

  // ---- Day 21 ----
  { pose: "shocked", day: "DAY 21", text: "Now for the creepiest part." },
  { pose: "explain", blackout: true, text: "You're talking to a friend, and suddenly, they're halfway through a sentence you never heard start." },
  { pose: "scared", text: "You just blinked for three seconds… and didn't notice." },
  { pose: "explain", text: "In real sleep research, people experience microsleeps. Tiny blackouts, from a fraction of a second to several seconds, even with their eyes open.", card: "MICROSLEEPS" },
  { pose: "scared", text: "Your brain still tries to steal tiny scraps of rest. Behind the wheel, three seconds is enough to drift off the road." },
  { pose: "think", text: "In nineteen sixty-four, a seventeen-year-old named Randy Gardner stayed awake for about eleven days, for a science fair.", card: "REAL RECORD: ~11 DAYS" },
  { pose: "think", expr: "focused", text: "By the end, he struggled to concentrate, had trouble with simple tasks, and was moody. And you're at day twenty-one." },

  // ---- Day 30 ----
  { pose: "hustle", day: "DAY 30", night: true, text: "One month, without a single minute of sleep." },
  { pose: "hustle", night: true, text: "You've lived ten more days than everyone around you. But it doesn't feel like a gift anymore.", card: "+240 HOURS" },
  { pose: "scared", night: true, text: "Colors look too bright. Shadows move in the corner of your eye. You hear your name when no one called it." },
  { pose: "scared", expr: "strain", night: true, text: "Your immune system, which does much of its repair work during sleep, is struggling. You catch every cold that goes around." },
  { pose: "think", text: "And here's the twist. You never felt tired. Not once." },
  { pose: "explain", text: "Because tiredness was never the problem. Tiredness is just the warning light. Sleep is the repair shop.", card: "SLEEP = REPAIR SHOP" },
  { pose: "shocked", text: "You removed the warning light… and kept driving." },

  // ---- Answer ----
  { pose: "explain", expr: "calm", text: "So what if you never had to sleep again? At first, it's the ultimate life hack." },
  { pose: "explain", text: "But your body doesn't treat sleep as wasted time. It's when your brain files your memories, takes out the trash, and repairs you." },
  { pose: "stand", expr: "calm", text: "The real superpower isn't skipping sleep. It's what you do with the hours you're already awake." },
  { pose: "laptop", expr: "happy", text: "Sixteen hours a day is still more than five thousand eight hundred hours a year. That's plenty of time to learn guitar, for real.", card: "5,840 HOURS / YEAR" },

  // ---- Outro ----
  { pose: "wave", text: "So, would you take the deal? Eight extra hours a day, knowing what happens by day thirty? Tell me in the comments." },
  { pose: "think", expr: "happy", text: "And tell me what 'what if' I should test next. Someone already asked: what if you could hear everyone's thoughts?" },
  { pose: "celebrate", text: "Subscribe, so you don't miss it…" },
  { pose: "stand", expr: "calm", night: true, scene: [{ type: "bed", x: 470, y: 860 }, { type: "zzz", x: 1120, y: 330, scale: 1.6 }], text: "…and get some sleep." },
];
