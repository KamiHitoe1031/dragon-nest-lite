#!/usr/bin/env python3
"""
Dragon Nest Lite - ElevenLabs Voice Generation Script
Generates NPC voices, player battle cries, and narration using ElevenLabs API.
All generated audio is saved as MP3 to assets/audio/voice/
"""

import os
import sys
import time
import requests
from pathlib import Path

# Load .env
def load_env():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip()

load_env()

API_KEY = os.environ.get('ELEVENLABS_API_KEY', '')
BASE_URL = 'https://api.elevenlabs.io/v1'
OUTPUT_DIR = Path(__file__).parent.parent / 'assets' / 'audio' / 'voice'

# ElevenLabs voice IDs (use pre-made voices)
# These are common pre-made voice IDs available on ElevenLabs
VOICES = {
    'male_deep': None,       # Blacksmith - deep male
    'male_old': None,        # Skill Master - elderly male
    'female_bright': None,   # Potion Shop - bright female
    'narrator': None,        # Narration - dramatic
    'male_warrior': None,    # Fighter battle cries
    'female_mage': None,     # Mage casting
    'monster': None,         # Dragon roar
}

# Voice lines to generate
VOICE_LINES = [
    # NPC Voices
    {
        'id': 'voice_blacksmith_greet',
        'text': "Welcome, adventurer! Need your weapon sharpened?",
        'voice_type': 'male_deep',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.3}
    },
    {
        'id': 'voice_blacksmith_done',
        'text': "There you go! Good as new, maybe even better!",
        'voice_type': 'male_deep',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.3}
    },
    {
        'id': 'voice_skillmaster_greet',
        'text': "Ah, young one. The path of power awaits. Choose wisely.",
        'voice_type': 'male_old',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.6, 'similarity_boost': 0.7, 'style': 0.4}
    },
    {
        'id': 'voice_skillmaster_choose',
        'text': "The time has come to choose your destiny. Two paths lie before you. Which will you walk?",
        'voice_type': 'male_old',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.6, 'similarity_boost': 0.7, 'style': 0.5}
    },
    {
        'id': 'voice_potion_greet',
        'text': "Hello there! Potions, elixirs, all you need for your adventure!",
        'voice_type': 'female_bright',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.6}
    },
    # Narration
    {
        'id': 'voice_narrator_dungeon',
        'text': "A dark force stirs in the depths below. Steel your resolve, adventurer.",
        'voice_type': 'narrator',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.7, 'similarity_boost': 0.6, 'style': 0.5}
    },
    {
        'id': 'voice_narrator_boss',
        'text': "The ancient dragon awakens. Prepare for the fight of your life!",
        'voice_type': 'narrator',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.7, 'similarity_boost': 0.6, 'style': 0.6}
    },
    {
        'id': 'voice_narrator_victory',
        'text': "Victory! The darkness recedes... for now.",
        'voice_type': 'narrator',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.7, 'similarity_boost': 0.6, 'style': 0.4}
    },
    # Fighter battle cries
    {
        'id': 'voice_fighter_atk_01',
        'text': "Haaah!",
        'voice_type': 'male_warrior',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.3, 'similarity_boost': 0.9, 'style': 0.8}
    },
    {
        'id': 'voice_fighter_atk_02',
        'text': "Take this!",
        'voice_type': 'male_warrior',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.3, 'similarity_boost': 0.9, 'style': 0.8}
    },
    {
        'id': 'voice_fighter_atk_03',
        'text': "Hyaaa!",
        'voice_type': 'male_warrior',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.3, 'similarity_boost': 0.9, 'style': 0.8}
    },
    # Mage casting
    {
        'id': 'voice_mage_cast_01',
        'text': "By the elements!",
        'voice_type': 'female_mage',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.7}
    },
    {
        'id': 'voice_mage_cast_02',
        'text': "Feel my power!",
        'voice_type': 'female_mage',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.7}
    },
    {
        'id': 'voice_mage_cast_03',
        'text': "Burn!",
        'voice_type': 'female_mage',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.7}
    },
    # Dragon roar (use sound effect style)
    {
        'id': 'voice_dragon_roar',
        'text': "RRRROOOAAAARRRR!",
        'voice_type': 'monster',
        'model': 'eleven_multilingual_v2',
        'settings': {'stability': 0.2, 'similarity_boost': 0.5, 'style': 0.9}
    },
]


def get_available_voices():
    """Fetch available voices from ElevenLabs and assign to voice types."""
    headers = {'xi-api-key': API_KEY}
    resp = requests.get(f'{BASE_URL}/voices', headers=headers)
    resp.raise_for_status()
    voices = resp.json().get('voices', [])

    # Map voice types to available voices by labels/description
    assigned = {}
    for voice in voices:
        name = voice['name'].lower()
        labels = voice.get('labels', {})
        gender = labels.get('gender', '').lower()
        age = labels.get('age', '').lower()
        use_case = labels.get('use_case', '').lower()

        vid = voice['voice_id']

        # Assign based on characteristics
        if 'deep' in name or (gender == 'male' and 'deep' in str(labels)):
            if 'male_deep' not in assigned:
                assigned['male_deep'] = vid
        if 'old' in name or 'elder' in name or ('male' in gender and 'old' in age):
            if 'male_old' not in assigned:
                assigned['male_old'] = vid
        if gender == 'female' and ('bright' in name or 'young' in age or 'cheerful' in name):
            if 'female_bright' not in assigned:
                assigned['female_bright'] = vid
        if 'narrator' in name or 'narration' in use_case:
            if 'narrator' not in assigned:
                assigned['narrator'] = vid

    # Fallback: use first available voices for unassigned types
    all_voice_ids = [v['voice_id'] for v in voices]
    male_voices = [v['voice_id'] for v in voices if v.get('labels', {}).get('gender', '').lower() == 'male']
    female_voices = [v['voice_id'] for v in voices if v.get('labels', {}).get('gender', '').lower() == 'female']

    defaults = {
        'male_deep': male_voices[0] if male_voices else all_voice_ids[0],
        'male_old': male_voices[1] if len(male_voices) > 1 else (male_voices[0] if male_voices else all_voice_ids[0]),
        'female_bright': female_voices[0] if female_voices else all_voice_ids[0],
        'narrator': male_voices[0] if male_voices else all_voice_ids[0],
        'male_warrior': male_voices[0] if male_voices else all_voice_ids[0],
        'female_mage': female_voices[0] if female_voices else all_voice_ids[0],
        'monster': male_voices[0] if male_voices else all_voice_ids[0],
    }

    for key in VOICES:
        if key not in assigned:
            assigned[key] = defaults.get(key, all_voice_ids[0] if all_voice_ids else None)

    return assigned


def generate_voice(voice_line, voice_id):
    """Generate a single voice line using ElevenLabs TTS."""
    if not voice_id:
        print(f"  [SKIP] No voice ID for {voice_line['id']}")
        return False

    output_path = OUTPUT_DIR / f"{voice_line['id']}.mp3"
    if output_path.exists():
        print(f"  [SKIP] Already exists: {output_path.name}")
        return True

    headers = {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
    }

    payload = {
        'text': voice_line['text'],
        'model_id': voice_line.get('model', 'eleven_multilingual_v2'),
        'voice_settings': voice_line.get('settings', {
            'stability': 0.5,
            'similarity_boost': 0.75,
        })
    }

    url = f'{BASE_URL}/text-to-speech/{voice_id}'

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()

        output_path.write_bytes(resp.content)
        print(f"  [OK] Generated: {output_path.name} ({len(resp.content)} bytes)")
        return True

    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Failed to generate {voice_line['id']}: {e}")
        return False


def main():
    if not API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not set. Check .env file.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Filter by category if specified
    categories = sys.argv[1:] if len(sys.argv) > 1 else ['all']

    print("=" * 50)
    print("Dragon Nest Lite - Voice Generation")
    print("=" * 50)

    # Get available voices
    print("\nFetching available voices...")
    try:
        voice_map = get_available_voices()
        print(f"  Assigned {len(voice_map)} voice types")
        for vtype, vid in voice_map.items():
            print(f"    {vtype}: {vid}")
    except Exception as e:
        print(f"  ERROR fetching voices: {e}")
        print("  Using fallback - will attempt generation anyway")
        voice_map = {}

    # Filter voice lines by category
    lines_to_generate = []
    for line in VOICE_LINES:
        line_cat = 'all'
        if 'blacksmith' in line['id'] or 'skillmaster' in line['id'] or 'potion' in line['id']:
            line_cat = 'npc'
        elif 'narrator' in line['id']:
            line_cat = 'narration'
        elif 'fighter' in line['id']:
            line_cat = 'fighter'
        elif 'mage' in line['id']:
            line_cat = 'mage'
        elif 'dragon' in line['id']:
            line_cat = 'monster'

        if 'all' in categories or line_cat in categories:
            lines_to_generate.append(line)

    print(f"\nGenerating {len(lines_to_generate)} voice lines...")

    success = 0
    failed = 0
    for i, line in enumerate(lines_to_generate):
        print(f"\n[{i+1}/{len(lines_to_generate)}] {line['id']}")
        print(f"  Text: \"{line['text']}\"")
        print(f"  Voice: {line['voice_type']}")

        voice_id = voice_map.get(line['voice_type'])
        if generate_voice(line, voice_id):
            success += 1
        else:
            failed += 1

        # Rate limiting
        time.sleep(0.5)

    print(f"\n{'=' * 50}")
    print(f"Complete! Success: {success}, Failed: {failed}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"{'=' * 50}")


if __name__ == '__main__':
    main()
