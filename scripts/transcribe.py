#!/usr/bin/env python3
"""
Transcribes F1 team radio clips with Whisper and writes one JSON file per
session, which the app reads from the `transcripts` branch.

Usage:
  python scripts/transcribe.py --check            # exit 0 if a session needs work, 1 if not (stdlib only)
  python scripts/transcribe.py --out DIR          # transcribe active/recent sessions into DIR/radio/
  python scripts/transcribe.py --out DIR --session 11416 [--limit 5]

Output: DIR/radio/<session_key>.json
  {"session_key": 11416, "model": "...", "updated": "...", "clips": {"<recording_url>": {
      "driver_number": 3, "date": "...", "text": "...", "status": "ok" | "no_speech" | "error"}}}
"""
import argparse
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

API = "https://api.openf1.org/v1"
MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
# Context that steers Whisper towards F1 radio vocabulary and spellings.
PROMPT = (
    "Formula 1 team radio between a driver and the race engineer. "
    "Box, box. Copy. Softs, mediums, hards, inters, wets. Tyres, deg, delta, gap, "
    "safety car, VSC, yellow flag, track limits, pit lane, P1, P2, P10, push, lift and coast."
)
# Keep working on a session for this long after it ends (clips are published with a delay).
AFTER_END = timedelta(hours=3)
BEFORE_START = timedelta(minutes=5)


def get(endpoint, **params):
    """OpenF1 request. A 404 means "no rows" on this API, so it returns []."""
    url = f"{API}/{endpoint}?{urllib.parse.urlencode(params)}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "pitwall-transcriber"}), timeout=30) as r:
                data = json.load(r)
                return data if isinstance(data, list) else []
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return []
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    return []


def parse(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def active_sessions(now):
    """Sessions of the latest meeting that are running, or ended within AFTER_END."""
    out = []
    for s in get("sessions", meeting_key="latest"):
        start, end = parse(s["date_start"]), parse(s["date_end"])
        if start - BEFORE_START <= now <= end + AFTER_END:
            out.append(s["session_key"])
    return out


def load(path, session_key):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"session_key": session_key, "model": MODEL, "clips": {}}


def save(path, doc):
    doc["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, path)


def transcribe_session(model, out_dir, session_key, deadline, limit=None):
    path = os.path.join(out_dir, "radio", f"{session_key}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    doc = load(path, session_key)
    clips = sorted(get("team_radio", session_key=session_key), key=lambda c: c["date"])
    todo = [c for c in clips if doc["clips"].get(c["recording_url"], {}).get("status") not in ("ok", "no_speech")]
    if limit:
        todo = todo[:limit]
    print(f"session {session_key}: {len(clips)} clips, {len(todo)} to transcribe", flush=True)
    drivers = get("drivers", session_key=session_key)
    # First names and surnames of this session's drivers help Whisper spell them.
    names = ", ".join(sorted({(d.get("first_name") or "") + " " + (d.get("last_name") or "").title() for d in drivers}))
    done = 0
    for c in todo:
        if time.time() > deadline:
            print("time budget reached; the next run continues", flush=True)
            break
        entry = {"driver_number": c["driver_number"], "date": c["date"]}
        try:
            with tempfile.NamedTemporaryFile(suffix=".mp3") as tmp:
                req = urllib.request.Request(c["recording_url"], headers={"User-Agent": "pitwall-transcriber"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    tmp.write(r.read())
                tmp.flush()
                segments, _ = model.transcribe(
                    tmp.name, language="en", beam_size=5, vad_filter=True, condition_on_previous_text=False,
                    initial_prompt=PROMPT + " " + names
                )
                # Drop segments Whisper itself flags as unlikely speech, a common source of invented text.
                text = " ".join(
                    s.text.strip() for s in segments if s.no_speech_prob < 0.6 and s.avg_logprob > -1.0
                ).strip()
            entry.update(text=text, status="ok" if text else "no_speech")
        except Exception as e:  # keep going; failed clips are retried next run
            entry.update(text="", status="error", error=str(e)[:200])
        doc["clips"][c["recording_url"]] = entry
        done += 1
        if done % 10 == 0:
            save(path, doc)
    doc["model"] = MODEL
    save(path, doc)
    return done


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--out", default="out")
    ap.add_argument("--session", type=int, action="append")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--minutes", type=float, default=25, help="time budget for one run")
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    sessions = args.session or active_sessions(now)
    if args.check:
        print("sessions to process:", sessions or "none")
        sys.exit(0 if sessions else 1)
    if not sessions:
        print("no active or recent session")
        return

    from faster_whisper import WhisperModel  # heavy import only when needed

    model = WhisperModel(MODEL, device="cpu", compute_type="int8")
    deadline = time.time() + args.minutes * 60
    for sk in sessions:
        transcribe_session(model, args.out, sk, deadline, args.limit)


if __name__ == "__main__":
    main()
