#!/usr/bin/env python3
"""
Dragon Nest Lite - Effect Texture Generation Script

Generates VFX textures using Gemini (gemini-3-pro-image-preview / NanoBanana Pro).
Outputs transparent PNG textures for use as billboard sprites in Three.js.

Usage:
    python generate_effects.py              # Generate all effect textures
    python generate_effects.py --list       # List all effects
    python generate_effects.py --effect slash_arc  # Generate a specific one

Requires:
    pip install google-genai python-dotenv Pillow
"""

import argparse
import io
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
    from PIL import Image
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Run: pip install google-genai python-dotenv Pillow")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
EFFECTS_DIR = ASSETS_DIR / "textures" / "effects"

MODEL_NAME = "gemini-3-pro-image-preview"
MAX_RETRIES = 3
RETRY_DELAY_BASE = 5
REQUEST_DELAY = 4  # seconds between requests

CLIENT = None

# ---------------------------------------------------------------------------
# Effect Texture Definitions
# ---------------------------------------------------------------------------

EFFECT_TEXTURES = {
    # --- Slash / Melee ---
    "slash_arc": {
        "filename": "fx_slash_arc.png",
        "prompt": (
            "game VFX slash effect, single dynamic curved sword slash trail, "
            "glowing white energy with light blue edge glow, motion blur trail, "
            "stylized anime action game style, clean sharp edges, "
            "transparent background (alpha channel), centered composition, "
            "512x512, no text, no watermark, no background noise"
        ),
    },
    "slash_heavy": {
        "filename": "fx_slash_heavy.png",
        "prompt": (
            "game VFX heavy sword slash, large powerful downward diagonal energy slash, "
            "glowing orange-gold energy with fire sparks, thick trail with dynamic motion, "
            "stylized fantasy RPG action game style, "
            "transparent background (alpha channel), centered, "
            "512x512, no text, no watermark"
        ),
    },
    "hit_spark": {
        "filename": "fx_hit_spark.png",
        "prompt": (
            "game VFX hit impact spark, radial burst of bright golden-white sparks, "
            "small explosion of light particles radiating outward, comic action style, "
            "transparent background (alpha channel), centered composition, "
            "256x256, no text, no watermark, clean edges"
        ),
    },

    # --- Fire ---
    "fireball": {
        "filename": "fx_fireball.png",
        "prompt": (
            "game VFX fireball projectile, bright burning orange-red fireball with trailing flames, "
            "hot glowing core with wispy fire edges, stylized cartoon flames, "
            "fantasy RPG magic spell style, dynamic motion feeling, "
            "transparent background (alpha channel), centered, "
            "256x256, no text, no watermark"
        ),
    },
    "fire_explosion": {
        "filename": "fx_fire_explosion.png",
        "prompt": (
            "game VFX fire explosion, large radial burst of flames and sparks, "
            "orange and red with bright yellow center, stylized cartoon explosion, "
            "fantasy RPG magic spell detonation, dynamic expanding shape, "
            "transparent background (alpha channel), centered, "
            "512x512, no text, no watermark"
        ),
    },

    # --- Ice ---
    "ice_shard": {
        "filename": "fx_ice_shard.png",
        "prompt": (
            "game VFX ice crystal shard, sharp translucent blue ice crystal, "
            "glowing icy blue with white frost highlights, faceted gem-like surface, "
            "cold mist wisps around edges, stylized fantasy RPG style, "
            "transparent background (alpha channel), centered, "
            "256x256, no text, no watermark"
        ),
    },
    "ice_explosion": {
        "filename": "fx_ice_explosion.png",
        "prompt": (
            "game VFX ice explosion, radial burst of ice crystals and snowflakes, "
            "light blue and white with frozen mist, sharp crystalline fragments flying outward, "
            "fantasy RPG frost magic spell effect, "
            "transparent background (alpha channel), centered, "
            "512x512, no text, no watermark"
        ),
    },
    "frost_ring": {
        "filename": "fx_frost_ring.png",
        "prompt": (
            "game VFX frost magic circle on ground, circular ice rune pattern, "
            "glowing icy blue lines forming an intricate circular pattern, "
            "frozen crystalline edges, snowflake motifs, top-down view, "
            "transparent background (alpha channel), "
            "512x512, no text, no watermark"
        ),
    },

    # --- Dark / Void ---
    "dark_orb": {
        "filename": "fx_dark_orb.png",
        "prompt": (
            "game VFX dark magic energy orb, swirling purple-black void sphere, "
            "glowing dark purple edges with violet energy wisps, "
            "ominous dark magic spell, gravitational distortion effect, "
            "transparent background (alpha channel), centered, "
            "256x256, no text, no watermark"
        ),
    },
    "dark_explosion": {
        "filename": "fx_dark_explosion.png",
        "prompt": (
            "game VFX dark magic explosion, expanding purple-black energy burst, "
            "violet and indigo swirling energy with dark center, "
            "dark magic spell detonation, ominous fantasy RPG style, "
            "transparent background (alpha channel), centered, "
            "512x512, no text, no watermark"
        ),
    },

    # --- Beam / Laser ---
    "beam_magic": {
        "filename": "fx_beam_magic.png",
        "prompt": (
            "game VFX magic beam laser ray, horizontal bright magenta-purple energy beam, "
            "glowing hot center with energy wisps along edges, straight line, "
            "stylized fantasy RPG magic beam attack, horizontal orientation, "
            "transparent background (alpha channel), "
            "512x128, no text, no watermark"
        ),
    },

    # --- Buff / Aura ---
    "buff_aura": {
        "filename": "fx_buff_aura.png",
        "prompt": (
            "game VFX buff aura ring, circular glowing magic ring, "
            "golden-green energy rune circle, mystical symbols on ring, "
            "power-up enhancement magic effect, top-down view, "
            "transparent background (alpha channel), "
            "512x512, no text, no watermark"
        ),
    },

    # --- Ground / Area ---
    "magic_circle": {
        "filename": "fx_magic_circle.png",
        "prompt": (
            "game VFX magic summoning circle, intricate arcane circle with runes, "
            "glowing blue-white magical lines forming concentric patterns, "
            "mystical symbols and geometric patterns, top-down view, "
            "transparent background (alpha channel), "
            "512x512, no text, no watermark"
        ),
    },
    "ground_impact": {
        "filename": "fx_ground_impact.png",
        "prompt": (
            "game VFX ground impact shockwave, expanding concentric ring on ground, "
            "dust and debris particles radiating outward, "
            "earth-toned energy ring with cracks, top-down view, "
            "transparent background (alpha channel), "
            "512x512, no text, no watermark"
        ),
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def init_genai():
    global CLIENT
    load_dotenv(PROJECT_ROOT / ".env")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in .env")
        sys.exit(1)
    CLIENT = genai.Client(api_key=api_key)
    print(f"[OK] Gemini SDK configured (model: {MODEL_NAME})")


def generate_image(prompt, output_path, retries=MAX_RETRIES):
    """Generate a single image using Gemini."""
    for attempt in range(1, retries + 1):
        try:
            response = CLIENT.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )

            # Extract image from response
            for part in response.candidates[0].content.parts:
                if part.inline_data is not None:
                    mime = part.inline_data.mime_type
                    if mime and mime.startswith("image/"):
                        img_data = part.inline_data.data
                        img = Image.open(io.BytesIO(img_data))
                        # Convert to RGBA for transparency
                        if img.mode != "RGBA":
                            img = img.convert("RGBA")
                        img.save(str(output_path), "PNG")
                        return True

            print(f"    No image in response (attempt {attempt})")

        except Exception as e:
            print(f"    Error (attempt {attempt}): {e}")
            if attempt < retries:
                delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))
                print(f"    Retrying in {delay}s...")
                time.sleep(delay)

    return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate effect textures using Gemini")
    parser.add_argument("--effect", nargs="+", help="Specific effect(s) to generate")
    parser.add_argument("--list", action="store_true", help="List all effects")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    if args.list:
        print(f"\n{'Name':<20} {'Filename':<30}")
        print("-" * 50)
        for name, config in EFFECT_TEXTURES.items():
            print(f"{name:<20} {config['filename']:<30}")
        print(f"\nTotal: {len(EFFECT_TEXTURES)} effects")
        return 0

    # Filter
    if args.effect:
        effects = {k: v for k, v in EFFECT_TEXTURES.items() if k in args.effect}
    else:
        effects = EFFECT_TEXTURES

    if not effects:
        print("No effects to generate")
        return 1

    EFFECTS_DIR.mkdir(parents=True, exist_ok=True)

    if not args.dry_run:
        init_genai()

    print(f"\nGenerating {len(effects)} effect textures...")
    succeeded = []
    failed = []

    for name, config in effects.items():
        output_path = EFFECTS_DIR / config["filename"]
        print(f"\n[{name}] -> {output_path.name}")

        if output_path.exists():
            print(f"  SKIP: Already exists")
            succeeded.append(name)
            continue

        if args.dry_run:
            print(f"  [DRY RUN] Would generate: {config['prompt'][:80]}...")
            succeeded.append(name)
            continue

        print(f"  Generating...")
        ok = generate_image(config["prompt"], output_path)
        if ok:
            print(f"  OK: {output_path}")
            succeeded.append(name)
        else:
            print(f"  FAILED")
            failed.append(name)

        time.sleep(REQUEST_DELAY)

    # Summary
    print(f"\n{'='*50}")
    print(f"EFFECT GENERATION SUMMARY")
    print(f"{'='*50}")
    print(f"Succeeded: {len(succeeded)}")
    print(f"Failed: {len(failed)}")
    if failed:
        print(f"Failed effects: {failed}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
