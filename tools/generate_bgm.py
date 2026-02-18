#!/usr/bin/env python3
"""
Dragon Nest Lite - BGM Generation Script (ElevenLabs Sound Generation API)
==========================================================================

Generates background music loops using ElevenLabs Sound Effects API.
Max duration is 22 seconds per clip. These are meant as placeholder loops.

Usage:
    python generate_bgm.py              # Generate all BGM
    python generate_bgm.py --list       # List tracks
    python generate_bgm.py --dry-run    # Preview only

Requires:
    pip install requests python-dotenv
"""

import argparse
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')

API_KEY = os.environ.get('ELEVENLABS_API_KEY', '')
API_URL = 'https://api.elevenlabs.io/v1/sound-generation'
OUTPUT_DIR = PROJECT_ROOT / 'assets' / 'audio' / 'bgm'

REQUEST_DELAY = 3.0  # seconds between requests (BGM takes longer)

# ---------------------------------------------------------------------------
# BGM Definitions
# ---------------------------------------------------------------------------

BGM_TRACKS = [
    {
        'name': 'bgm_title',
        'prompt': 'epic orchestral fantasy RPG title screen music, heroic brass fanfare with strings, adventurous and majestic, medieval fantasy game menu theme, slow tempo, grand and inspiring',
        'duration': 22,
    },
    {
        'name': 'bgm_town',
        'prompt': 'peaceful medieval fantasy town music, gentle acoustic guitar and flute melody, calm and cozy village atmosphere, warm strings background, relaxing RPG town theme, moderate tempo',
        'duration': 22,
    },
    {
        'name': 'bgm_dungeon_forest',
        'prompt': 'mysterious forest cave exploration music, ambient dark fantasy dungeon theme, eerie strings with subtle percussion, dripping water echoes, tense and atmospheric, slow tempo',
        'duration': 22,
    },
    {
        'name': 'bgm_dungeon_ruins',
        'prompt': 'ancient ruins dungeon music, dark orchestral fantasy theme, ominous choir and deep brass, echoing percussion in stone halls, mysterious and foreboding, moderate tempo',
        'duration': 22,
    },
    {
        'name': 'bgm_boss',
        'prompt': 'intense boss battle music, epic fast-paced orchestral combat theme, aggressive drums and brass, dramatic strings, high energy fantasy RPG boss fight, fast tempo, exciting and dangerous',
        'duration': 22,
    },
    {
        'name': 'bgm_result',
        'prompt': 'victory fanfare music, triumphant orchestral celebration theme, bright brass and strings, joyful and rewarding RPG clear screen music, moderate tempo, uplifting',
        'duration': 15,
    },
]

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def generate_bgm(track: dict) -> bytes | None:
    """Call ElevenLabs Sound Generation API and return MP3 bytes."""
    if not API_KEY:
        print('  [ERROR] ELEVENLABS_API_KEY not set in .env')
        return None

    headers = {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
    }
    payload = {
        'text': track['prompt'],
        'duration_seconds': track['duration'],
    }

    try:
        resp = requests.post(API_URL, json=payload, headers=headers, timeout=120)
        if resp.status_code == 200:
            return resp.content
        else:
            print(f'  [ERROR] HTTP {resp.status_code}: {resp.text[:200]}')
            return None
    except Exception as e:
        print(f'  [ERROR] {e}')
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='Generate BGM tracks')
    parser.add_argument('--list', action='store_true', help='List all tracks')
    parser.add_argument('--dry-run', action='store_true', help='Preview only')
    args = parser.parse_args()

    if args.list:
        print(f'BGM Tracks ({len(BGM_TRACKS)}):')
        for t in BGM_TRACKS:
            print(f'  {t["name"]:30s} {t["duration"]}s')
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Loaded .env from {PROJECT_ROOT / ".env"}')
    print(f'Output: {OUTPUT_DIR}')
    print(f'Tracks: {len(BGM_TRACKS)}')
    print()

    succeeded = 0
    skipped = 0
    failed = 0

    for i, track in enumerate(BGM_TRACKS):
        outfile = OUTPUT_DIR / f'{track["name"]}.mp3'
        print(f'[{i+1}/{len(BGM_TRACKS)}] {track["name"]}')

        if outfile.exists():
            print(f'  [SKIP] Already exists: {outfile.name}')
            skipped += 1
            continue

        if args.dry_run:
            print(f'  [DRY-RUN] Would generate: {track["prompt"][:80]}...')
            continue

        data = generate_bgm(track)
        if data:
            outfile.write_bytes(data)
            size_kb = len(data) / 1024
            print(f'  [SAVED] {outfile.name} ({size_kb:.1f} KB)')
            succeeded += 1
        else:
            print(f'  [FAILED] {track["name"]}')
            failed += 1

        if i < len(BGM_TRACKS) - 1:
            time.sleep(REQUEST_DELAY)

    print()
    print(f'Done: {succeeded} generated, {skipped} skipped, {failed} failed')


if __name__ == '__main__':
    main()
