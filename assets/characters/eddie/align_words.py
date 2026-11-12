"""Script-word timestamps for narration audio (word-by-word captions + beat timing).

    python3 align_words.py <out.json> <audio> <script.txt>

Transcribes <audio> with faster-whisper (base.en, CPU int8, word timestamps), then aligns
the transcript to the script's own words (difflib on normalized tokens), so captions show
the exact script text even where Whisper writes "365" for "three hundred sixty-five".
Unmatched script words are interpolated between matched neighbours.
Output: [{"w": "Tonight,", "s": 0.12, "e": 0.55}, ...] in script order.
"""
import difflib
import json
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9']", "", w.lower())


def main() -> None:
    out, audio_path, script_path = sys.argv[1:4]
    script = open(script_path).read().split()
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio_path, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    duration = len(audio) / 16000
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio, word_timestamps=True, beam_size=1, vad_filter=False,
                                   initial_prompt=" ".join(script[:60]))
    heard = [(w.word.strip(), w.start, w.end) for seg in segments for w in (seg.words or [])]

    a = [norm(w) for w in script]
    b = [norm(w) for w, _, _ in heard]
    times = [None] * len(script)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            _, s, e = heard[blk.b + k]
            times[blk.a + k] = (s, e)
    # interpolate gaps between anchors
    anchors = [i for i, t in enumerate(times) if t]
    if not anchors:
        step = duration / max(1, len(script))
        times = [(i * step, (i + 1) * step) for i in range(len(script))]
    else:
        first, last = anchors[0], anchors[-1]
        for i in range(first):
            times[i] = (times[first][0] * i / max(1, first), times[first][0] * (i + 1) / max(1, first))
        for i in range(last + 1, len(script)):
            span = duration - times[last][1]
            n = len(script) - last - 1
            k = i - last
            times[i] = (times[last][1] + span * (k - 1) / n, times[last][1] + span * k / n)
        for x, y in zip(anchors, anchors[1:]):
            gap = y - x
            if gap > 1:
                t0, t1 = times[x][1], times[y][0]
                for k in range(1, gap):
                    times[x + k] = (t0 + (t1 - t0) * (k - 1) / (gap - 1), t0 + (t1 - t0) * k / (gap - 1))
    json.dump([{"w": w, "s": round(t[0], 3), "e": round(t[1], 3)} for w, t in zip(script, times)], open(out, "w"))
    matched = len(anchors)
    json.dump({"matched": matched, "total": len(script)}, open(out + ".meta.json", "w"))
    print(f"aligned {len(script)} words ({matched} matched)", file=sys.stderr)


if __name__ == "__main__":
    main()
