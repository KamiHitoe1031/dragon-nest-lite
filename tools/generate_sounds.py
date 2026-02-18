#!/usr/bin/env python3
"""
Dragon Nest Lite - ElevenLabs Sound Effects Generation Script
=============================================================

Generates all game sound effects using ElevenLabs Sound Effects API.
All generated audio is saved as MP3 to assets/audio/sfx/

Usage:
    python generate_sounds.py                  # Generate all sounds
    python generate_sounds.py --list           # List all sounds
    python generate_sounds.py --category combat    # By category
    python generate_sounds.py --category ui skill  # Multiple categories
    python generate_sounds.py --dry-run        # Print what would be done

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
OUTPUT_DIR = PROJECT_ROOT / 'assets' / 'audio' / 'sfx'

# Rate limiting
REQUEST_DELAY = 1.5  # seconds between requests

# ---------------------------------------------------------------------------
# Sound Effect Definitions
# ---------------------------------------------------------------------------

SOUND_EFFECTS = [
    # =====================================================================
    # COMBAT - Melee
    # =====================================================================
    {
        'id': 'sfx_sword_slash_01',
        'category': 'combat',
        'text': 'fast sharp sword slash cutting through air, metallic whoosh, fantasy game',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_sword_slash_02',
        'category': 'combat',
        'text': 'quick sword swing slash, light metallic cutting sound, action RPG',
        'duration_seconds': 0.7,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_sword_heavy',
        'category': 'combat',
        'text': 'heavy two-handed sword slam, powerful impact, deep metallic thud, fantasy',
        'duration_seconds': 1.2,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_hit_flesh',
        'category': 'combat',
        'text': 'melee hit impact on creature, blunt thud with slight squish, game combat',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_hit_critical',
        'category': 'combat',
        'text': 'critical hit impact, powerful smash with metallic ring, dramatic, game combat',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_hit_armor',
        'category': 'combat',
        'text': 'weapon hitting metal armor, sharp clang, brief, game combat sound effect',
        'duration_seconds': 0.6,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # COMBAT - Magic
    # =====================================================================
    {
        'id': 'sfx_magic_cast',
        'category': 'combat',
        'text': 'magical spell casting, mystical energy gathering, sparkle whoosh, fantasy RPG',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_fireball',
        'category': 'combat',
        'text': 'fireball launch, blazing fire whoosh projectile, fantasy magic spell',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_fire_explosion',
        'category': 'combat',
        'text': 'magical fire explosion, fiery burst with crackling flames, fantasy game',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_ice_freeze',
        'category': 'combat',
        'text': 'ice freezing crystallization, sharp cracking ice forming, magical frost spell',
        'duration_seconds': 1.2,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_ice_shatter',
        'category': 'combat',
        'text': 'ice shattering into pieces, glass-like breaking, frozen crystal destruction',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_lightning',
        'category': 'combat',
        'text': 'lightning bolt strike, electric zap with thunder crack, magical spell',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_dark_magic',
        'category': 'combat',
        'text': 'dark magic spell, ominous energy pulse, deep resonant void sound, fantasy',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_gravity_well',
        'category': 'combat',
        'text': 'gravity vortex pulling, deep humming suction, black hole energy, sci-fi fantasy',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_beam',
        'category': 'combat',
        'text': 'energy beam laser firing continuously, sustained magical ray, high pitched hum',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_heal',
        'category': 'combat',
        'text': 'healing magic, gentle sparkling chime, warm restoration, soft bells, fantasy RPG',
        'duration_seconds': 1.2,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_buff',
        'category': 'combat',
        'text': 'power-up buff activation, ascending magical chime, energy boost, fantasy game',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_debuff',
        'category': 'combat',
        'text': 'debuff curse applied, dark descending tone, negative magical effect, fantasy',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # SKILL - Warrior Specific
    # =====================================================================
    {
        'id': 'sfx_skill_rising_slash',
        'category': 'skill',
        'text': 'upward sword slash, rising metallic sweep, aerial attack, action game',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_dash_slash',
        'category': 'skill',
        'text': 'fast dash forward with sword cut, rushing wind slash, action RPG combat',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_ground_slam',
        'category': 'skill',
        'text': 'heavy ground slam impact, earth-shaking stomp with debris, powerful AoE attack',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_whirlwind',
        'category': 'skill',
        'text': 'spinning whirlwind attack, rapid rotating slash, continuous whooshing wind, combat',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_war_cry',
        'category': 'skill',
        'text': 'warrior battle cry shout with energy burst, powerful rallying yell, fantasy RPG',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # SKILL - Mage Specific
    # =====================================================================
    {
        'id': 'sfx_skill_meteor',
        'category': 'skill',
        'text': 'meteor falling from sky, burning descent whoosh then massive ground explosion, epic',
        'duration_seconds': 2.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_blizzard',
        'category': 'skill',
        'text': 'blizzard ice storm, howling frozen wind with ice crystals, sustained magic attack',
        'duration_seconds': 3.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_teleport',
        'category': 'skill',
        'text': 'magical teleport, quick spatial warp, brief phase-out shimmer then reappear, fantasy',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_time_slow',
        'category': 'skill',
        'text': 'time slowing down, deep resonant warble, temporal distortion, clock-like ticking fading',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # PLAYER - Movement & Actions
    # =====================================================================
    {
        'id': 'sfx_dodge_roll',
        'category': 'player',
        'text': 'quick dodge roll, body tumbling, light armor rustling, brief whoosh, action game',
        'duration_seconds': 0.6,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_footstep_stone',
        'category': 'player',
        'text': 'single footstep on stone floor, boot on cobblestone, dungeon, subtle echo',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_footstep_grass',
        'category': 'player',
        'text': 'single footstep on grass, soft step on earth and vegetation, outdoor',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_player_hurt',
        'category': 'player',
        'text': 'character getting hit, impact grunt, light armor crunch, brief pain reaction sound',
        'duration_seconds': 0.6,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_player_death',
        'category': 'player',
        'text': 'character death, body collapse on ground, dramatic low impact, armor clatter, somber',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_level_up',
        'category': 'player',
        'text': 'level up fanfare, triumphant ascending chime, sparkling magical bells, achievement, joyful',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_potion_drink',
        'category': 'player',
        'text': 'drinking potion, liquid gulping, glass bottle, brief magical sparkle after, RPG',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # ENEMY
    # =====================================================================
    {
        'id': 'sfx_enemy_hit',
        'category': 'enemy',
        'text': 'enemy creature getting hit, soft impact thud, slime-like squish, game combat',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_enemy_death',
        'category': 'enemy',
        'text': 'small monster dying, deflating poof with sparkle, cute creature defeat, game',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_slime_bounce',
        'category': 'enemy',
        'text': 'slime bouncing, wobbly jelly impact, soft squishy boing, cute monster, game',
        'duration_seconds': 0.6,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_goblin_attack',
        'category': 'enemy',
        'text': 'small goblin creature attack, quick rusty blade swipe, aggressive screech, fantasy',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skeleton_rattle',
        'category': 'enemy',
        'text': 'skeleton bones rattling, clattering undead movement, eerie bone clinking, fantasy',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_dragon_roar',
        'category': 'enemy',
        'text': 'dragon roar, deep powerful bestial roar with fire breath undertone, epic boss monster',
        'duration_seconds': 2.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_dragon_breath',
        'category': 'enemy',
        'text': 'dragon fire breath attack, sustained flame stream, roaring fire whoosh, epic boss',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_dragon_stomp',
        'category': 'enemy',
        'text': 'massive creature ground stomp, heavy earth-shaking impact, giant beast footfall',
        'duration_seconds': 1.0,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # UI
    # =====================================================================
    {
        'id': 'sfx_ui_click',
        'category': 'ui',
        'text': 'UI button click, soft mechanical click, clean interface tap, subtle',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_ui_open',
        'category': 'ui',
        'text': 'menu opening, soft magical chime, interface appear, gentle whoosh, game UI',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_ui_close',
        'category': 'ui',
        'text': 'menu closing, soft descending tone, interface dismiss, gentle reverse whoosh',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_ui_error',
        'category': 'ui',
        'text': 'error buzz, low negative tone, denied action, brief dull thud, game UI',
        'duration_seconds': 0.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_skill_learn',
        'category': 'ui',
        'text': 'learning new skill, magical scroll opening with sparkle, knowledge gained, fantasy RPG',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_equip',
        'category': 'ui',
        'text': 'equipping weapon or armor, metallic snap into place, gear slot click, RPG',
        'duration_seconds': 0.6,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_gold_pickup',
        'category': 'ui',
        'text': 'collecting gold coins, jingling metallic chime, treasure pickup, RPG reward',
        'duration_seconds': 0.8,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_chest_open',
        'category': 'ui',
        'text': 'treasure chest opening, wooden lid creak then magical sparkle reveal, RPG loot',
        'duration_seconds': 1.5,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # ENVIRONMENT
    # =====================================================================
    {
        'id': 'sfx_door_open',
        'category': 'environment',
        'text': 'heavy dungeon door opening, stone grinding, ancient mechanism, echo, fantasy',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_portal',
        'category': 'environment',
        'text': 'magical portal opening, swirling energy vortex, mystical hum, fantasy RPG gateway',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_dungeon_clear',
        'category': 'environment',
        'text': 'dungeon room cleared, triumphant short fanfare, victory chime, enemies defeated',
        'duration_seconds': 2.0,
        'prompt_influence': 0.5,
    },
    {
        'id': 'sfx_boss_intro',
        'category': 'environment',
        'text': 'boss encounter intro, dramatic ominous rumble building tension, epic confrontation',
        'duration_seconds': 3.0,
        'prompt_influence': 0.5,
    },

    # =====================================================================
    # AMBIENT (looping)
    # =====================================================================
    {
        'id': 'sfx_ambient_cave',
        'category': 'ambient',
        'text': 'cave dungeon ambience, dripping water echoes, distant wind, mysterious atmosphere',
        'duration_seconds': 10.0,
        'prompt_influence': 0.3,
    },
    {
        'id': 'sfx_ambient_town',
        'category': 'ambient',
        'text': 'peaceful medieval fantasy town, birds chirping, gentle breeze, distant chatter',
        'duration_seconds': 10.0,
        'prompt_influence': 0.3,
    },
    {
        'id': 'sfx_ambient_ruins',
        'category': 'ambient',
        'text': 'ancient ruins ambience, eerie wind, faint magical humming, crumbling stone echoes',
        'duration_seconds': 10.0,
        'prompt_influence': 0.3,
    },
]


# ---------------------------------------------------------------------------
# API Functions
# ---------------------------------------------------------------------------

def generate_sound(sfx_def: dict, dry_run: bool = False) -> bool:
    """Generate a single sound effect using ElevenLabs Sound Effects API."""
    output_path = OUTPUT_DIR / f"{sfx_def['id']}.mp3"

    if output_path.exists():
        print(f"  [SKIP] Already exists: {output_path.name}")
        return True

    if dry_run:
        print(f"  [DRY] Would generate: {sfx_def['id']}")
        print(f"        Text: \"{sfx_def['text']}\"")
        print(f"        Duration: {sfx_def['duration_seconds']}s")
        return True

    headers = {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
    }

    payload = {
        'text': sfx_def['text'],
        'duration_seconds': sfx_def['duration_seconds'],
        'prompt_influence': sfx_def.get('prompt_influence', 0.3),
    }

    try:
        print(f"  Generating ({sfx_def['duration_seconds']}s)...")
        resp = requests.post(API_URL, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()

        output_path.write_bytes(resp.content)
        size_kb = len(resp.content) / 1024
        print(f"  [OK] Saved: {output_path.name} ({size_kb:.1f} KB)")
        return True

    except requests.exceptions.HTTPError as e:
        error_body = ''
        try:
            error_body = e.response.text[:200]
        except Exception:
            pass
        print(f"  [ERROR] HTTP {e.response.status_code}: {error_body}")
        return False

    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Request failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Dragon Nest Lite - Sound Effects Generator (ElevenLabs)'
    )
    parser.add_argument('--list', action='store_true', help='List all sound effects')
    parser.add_argument('--category', nargs='+', default=['all'],
                        choices=['all', 'combat', 'skill', 'player', 'enemy', 'ui', 'environment', 'ambient'],
                        help='Categories to generate')
    parser.add_argument('--dry-run', action='store_true', help='Print what would be done')
    args = parser.parse_args()

    # List mode
    if args.list:
        categories = {}
        for sfx in SOUND_EFFECTS:
            cat = sfx['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(sfx)

        total_duration = 0
        for cat, items in sorted(categories.items()):
            print(f"\n=== {cat.upper()} ({len(items)} sounds) ===")
            for item in items:
                dur = item['duration_seconds']
                total_duration += dur
                exists = (OUTPUT_DIR / f"{item['id']}.mp3").exists()
                status = '[EXISTS]' if exists else '[TODO]'
                print(f"  {status} {item['id']} ({dur}s) - {item['text'][:60]}")

        print(f"\nTotal: {len(SOUND_EFFECTS)} sounds, {total_duration:.1f}s total duration")
        return

    # Check API key
    if not API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not set. Check .env file.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Filter by category
    if 'all' in args.category:
        sounds = SOUND_EFFECTS
    else:
        sounds = [s for s in SOUND_EFFECTS if s['category'] in args.category]

    if not sounds:
        print("No sounds match the specified categories.")
        return

    print("=" * 60)
    print("Dragon Nest Lite - Sound Effects Generation (ElevenLabs)")
    print("=" * 60)
    print(f"  Output: {OUTPUT_DIR}")
    print(f"  Sounds: {len(sounds)}")
    print(f"  Mode:   {'DRY RUN' if args.dry_run else 'GENERATE'}")
    print("=" * 60)

    success = 0
    failed = 0
    skipped = 0

    for i, sfx in enumerate(sounds):
        print(f"\n[{i+1}/{len(sounds)}] {sfx['id']} ({sfx['category']})")

        result = generate_sound(sfx, dry_run=args.dry_run)
        if result:
            if (OUTPUT_DIR / f"{sfx['id']}.mp3").exists() and not args.dry_run:
                success += 1
            else:
                skipped += 1
        else:
            failed += 1

        # Rate limiting (skip for dry run and already-existing files)
        if not args.dry_run and not (OUTPUT_DIR / f"{sfx['id']}.mp3").exists():
            time.sleep(REQUEST_DELAY)

    print(f"\n{'=' * 60}")
    print(f"Complete!")
    print(f"  Generated: {success}")
    print(f"  Skipped:   {skipped}")
    print(f"  Failed:    {failed}")
    print(f"  Output:    {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
