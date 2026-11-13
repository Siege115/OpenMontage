// Episode 2 Shorts: 20-35 s cuts with a hook in the first second and a pointer to the full video.
//   node render-episode.mjs content/ep02-short-a.beats.mjs <outDir> --aspect 9:16
import { BEATS as B, VOICE as V } from "./ep02-hear-thoughts.beats.mjs";
export const VOICE = V;
const find = (re) => { const b = B.find((x) => re.test(x.text)); if (!b) throw new Error("beat not found: " + re); return structuredClone(b); };
const END = (text, tone = "#fbefc4") => ({ pose: "explain", scene: { name: "studio", tone }, card: "FULL STORY ON THE CHANNEL", text });
const strip = (b) => { delete b.day; return b; };

export const SHORTS = {
  // A: the subway + the "thoughts per day" quiz
  a: [
    { ...strip(find(/no volume knob/)), text: "What if you could hear everyone's thoughts… on a packed subway?" },
    strip(find(/^Quick guess/)),
    strip(find(/^Six thousand!/)),
    END("And that's only day three. See what happens by day thirty."),
  ],
  // B: the party + the "who noticed" quiz
  b: [
    { ...strip(find(/drags you to a party/)), text: "You can hear everyone's thoughts. And you're about to dance at a party." },
    strip(find(/^But nobody's watching you/)),
    strip(find(/^Try this\./)),
    strip(find(/^The answer: only about a quarter/)),
    END("But on day thirty, someone IS listening. Full story on the channel.", "#e3f2df"),
  ],
  // C: Mia, the one silent mind (teases the twist without giving it away)
  c: [
    { ...strip(find(/the one place that should be quiet/)), text: "For three weeks, you've heard every thought of every person you meet." },
    { ...strip(find(/A girl named Mia/)), text: "Except one. A girl named Mia. Her mind is… completely silent." },
    { ...strip(find(/somebody just thought back/)), riser: 0.2, text: "And on day thirty, you find out why." },
    END("Watch the full story on the channel.", "#d9ecf7"),
  ],
};
