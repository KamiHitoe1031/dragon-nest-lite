#!/usr/bin/env python3
"""
Dragon Nest Lite - Gemini Image Generation Script
==================================================

Generates all 2D image assets using the Gemini API (gemini-3-pro-image-preview / Nano Banana Pro).

Categories:
  A. Character Costume Conversion (Image-to-Image)
  B. Enemy/NPC Concept Art (Text-to-Image)
  C. Skill Icons (56 icons, 64x64)
  D. UI Elements
  E. Backgrounds & Textures

Usage:
  python generate_images.py --all
  python generate_images.py --characters
  python generate_images.py --enemies
  python generate_images.py --icons
  python generate_images.py --ui
  python generate_images.py --backgrounds

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

# Project root (one level up from tools/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
REFERENCE_DIR = ASSETS_DIR / "reference"
FANTASY_DIR = ASSETS_DIR / "reference_fantasy"
UI_DIR = ASSETS_DIR / "ui"
TEXTURES_DIR = ASSETS_DIR / "textures"

MODEL_NAME = "gemini-3-pro-image-preview"

# Retry settings
MAX_RETRIES = 3
RETRY_DELAY_BASE = 5  # seconds, exponential back-off base
REQUEST_DELAY = 3  # seconds between requests to avoid rate limits

# Global client
CLIENT = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ensure_dirs():
    """Create output directories if they do not exist."""
    for d in [FANTASY_DIR, UI_DIR, TEXTURES_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def init_genai():
    """Load API key and configure the Gemini SDK."""
    global CLIENT
    load_dotenv(PROJECT_ROOT / ".env")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in .env")
        sys.exit(1)
    CLIENT = genai.Client(api_key=api_key)
    print(f"[OK] Gemini SDK configured (model: {MODEL_NAME})")


def load_reference_image(filename: str) -> Image.Image:
    """Load a reference image from assets/reference/."""
    path = REFERENCE_DIR / filename
    if not path.exists():
        print(f"  WARNING: Reference image not found: {path}")
        return None
    img = Image.open(path)
    # Resize large images to reduce API payload (max 1024px on longest side)
    max_side = 1024
    if max(img.size) > max_side:
        ratio = max_side / max(img.size)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
    return img


def save_image_from_response(response, output_path: Path):
    """Extract image from Gemini response and save as PNG."""
    saved = False
    try:
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                mime = part.inline_data.mime_type
                if mime and mime.startswith("image/"):
                    img_data = part.inline_data.data
                    img = Image.open(io.BytesIO(img_data))
                    img.save(str(output_path), "PNG")
                    saved = True
                    break
    except (AttributeError, IndexError, TypeError) as exc:
        print(f"  ERROR parsing response: {exc}")
        return False

    if not saved:
        # Sometimes the model returns text instead of an image
        text_parts = []
        try:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "text") and part.text:
                    text_parts.append(part.text)
        except Exception:
            pass
        if text_parts:
            print(f"  Model returned text instead of image: {text_parts[0][:200]}")
        return False

    return True


def generate_image_text(prompt: str, output_path: Path, retries=MAX_RETRIES):
    """Generate an image from a text prompt and save it."""
    if output_path.exists():
        print(f"  [SKIP] Already exists: {output_path.name}")
        return True

    for attempt in range(1, retries + 1):
        try:
            response = CLIENT.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            if save_image_from_response(response, output_path):
                print(f"  [SAVED] {output_path.relative_to(PROJECT_ROOT)}")
                return True
            else:
                print(f"  [RETRY {attempt}/{retries}] No image in response for {output_path.name}")
        except Exception as exc:
            print(f"  [RETRY {attempt}/{retries}] Error: {exc}")

        if attempt < retries:
            delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))
            print(f"  Waiting {delay}s before retry...")
            time.sleep(delay)

    print(f"  [FAILED] Could not generate: {output_path.name}")
    return False


def generate_image_with_reference(reference_image: Image.Image, prompt: str, output_path: Path, retries=MAX_RETRIES):
    """Generate an image using a reference image (image-to-image) and save it."""
    if output_path.exists():
        print(f"  [SKIP] Already exists: {output_path.name}")
        return True

    for attempt in range(1, retries + 1):
        try:
            response = CLIENT.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt, reference_image],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            if save_image_from_response(response, output_path):
                print(f"  [SAVED] {output_path.relative_to(PROJECT_ROOT)}")
                return True
            else:
                print(f"  [RETRY {attempt}/{retries}] No image in response for {output_path.name}")
        except Exception as exc:
            print(f"  [RETRY {attempt}/{retries}] Error: {exc}")

        if attempt < retries:
            delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))
            print(f"  Waiting {delay}s before retry...")
            time.sleep(delay)

    print(f"  [FAILED] Could not generate: {output_path.name}")
    return False


# ---------------------------------------------------------------------------
# A. Character Costume Conversion (Image-to-Image)
# ---------------------------------------------------------------------------

CHARACTER_TASKS = [
    # (input_filename, output_filename, output_dir, prompt)
    (
        "Mia_SD.jpg",
        "mia_fantasy_sd.png",
        FANTASY_DIR,
        (
            "Keep the character's face, hairstyle, and body exactly the same. "
            "Change only the clothing to simple fantasy RPG style: leather armor, "
            "shoulder pads, belt with dagger, knee-high boots, greatsword. "
            "Style: chibi, super deformed, 2.5 head ratio, cute, clean simple design. "
            "White background. Full body front view."
        ),
    ),
    (
        "Haru_SD.jpg",
        "haru_fantasy_sd.png",
        FANTASY_DIR,
        (
            "Keep the character's face, hairstyle, and body exactly the same. "
            "Change only the clothing to simple fantasy RPG style: simple robe, "
            "hooded short cloak, wooden staff with gem, short boots, belt pouch. "
            "Style: chibi, super deformed, 2.5 head ratio, cute, clean simple design. "
            "White background. Full body front view."
        ),
    ),
    (
        "CharacterSheet_Mia.png",
        "chara_mia.png",
        UI_DIR,
        (
            "Keep the character's face, hairstyle, and body exactly the same. "
            "Change only the clothing to simple fantasy RPG style: leather armor, "
            "shoulder pads, belt with dagger, knee-high boots, greatsword. "
            "Style: cute, clean simple design, full body front view. "
            "White background."
        ),
    ),
    (
        "CharacterSheet_haru.png",
        "chara_haru.png",
        UI_DIR,
        (
            "Keep the character's face, hairstyle, and body exactly the same. "
            "Change only the clothing to simple fantasy RPG style: simple robe, "
            "hooded short cloak, wooden staff with gem, short boots, belt pouch. "
            "Style: cute, clean simple design, full body front view. "
            "White background."
        ),
    ),
]


def generate_characters():
    """Category A: Convert reference images to fantasy costumes."""
    print("\n" + "=" * 60)
    print("  A. Character Costume Conversion (Image-to-Image)")
    print("=" * 60)

    success = 0
    total = len(CHARACTER_TASKS)

    for i, (input_file, output_file, output_dir, prompt) in enumerate(CHARACTER_TASKS, 1):
        print(f"\n[{i}/{total}] {input_file} -> {output_file}")
        ref_img = load_reference_image(input_file)
        if ref_img is None:
            print("  SKIPPED (reference image not found)")
            continue

        output_path = output_dir / output_file
        if generate_image_with_reference(ref_img, prompt, output_path):
            success += 1

        if i < total:
            time.sleep(REQUEST_DELAY)

    print(f"\n  Characters done: {success}/{total}")
    return success


# ---------------------------------------------------------------------------
# B. Enemy / NPC Concept Art (Text-to-Image)
# ---------------------------------------------------------------------------

ENEMY_NPC_TASKS = [
    # (output_filename, prompt)
    (
        "enemy_slime.png",
        (
            "chibi cute green translucent slime monster, large cute eyes, "
            "2.5 head ratio, low poly style, fantasy RPG, white background, simple design"
        ),
    ),
    (
        "enemy_slime_concept.png",
        (
            "chibi cute green translucent slime monster, large cute eyes, "
            "2.5 head ratio, low poly style, fantasy RPG, white background, simple design, "
            "front view, full body, character concept art sheet"
        ),
    ),
    (
        "enemy_goblin.png",
        (
            "chibi super deformed goblin warrior, small body, large head, "
            "holding wooden club, green skin, 2.5 head ratio, low poly style, "
            "fantasy RPG, white background"
        ),
    ),
    (
        "enemy_goblin_concept.png",
        (
            "chibi super deformed goblin warrior, small body, large head, "
            "holding wooden club, green skin, 2.5 head ratio, low poly style, "
            "fantasy RPG, white background, front view, full body, character concept art sheet"
        ),
    ),
    (
        "enemy_skeleton.png",
        (
            "chibi super deformed skeleton warrior, bone armor, holding rusty sword, "
            "2.5 head ratio, low poly style, fantasy RPG, white background"
        ),
    ),
    (
        "enemy_skeleton_concept.png",
        (
            "chibi super deformed skeleton warrior, bone armor, holding rusty sword, "
            "2.5 head ratio, low poly style, fantasy RPG, white background, "
            "front view, full body, character concept art sheet"
        ),
    ),
    (
        "boss_dragon.png",
        (
            "chibi cute red dragon, large head, small wings, 2.5 head ratio, "
            "low poly style, fantasy RPG, white background, front view"
        ),
    ),
    (
        "boss_dragon_concept.png",
        (
            "chibi cute red dragon boss, large head, small wings, fire breathing, "
            "2.5 head ratio, low poly style, fantasy RPG, white background, "
            "front view, full body, character concept art sheet"
        ),
    ),
    (
        "npc_blacksmith.png",
        (
            "chibi super deformed blacksmith NPC, sturdy build, leather apron, "
            "holding hammer, 2.5 head ratio, low poly style, fantasy RPG, "
            "white background"
        ),
    ),
    (
        "npc_blacksmith_concept.png",
        (
            "chibi super deformed blacksmith NPC, sturdy build, leather apron, "
            "holding hammer, 2.5 head ratio, low poly style, fantasy RPG, "
            "white background, front view, full body, character concept art sheet"
        ),
    ),
    (
        "npc_skillmaster.png",
        (
            "chibi super deformed old wizard NPC, long beard, holding staff, "
            "pointed hat, 2.5 head ratio, low poly style, fantasy RPG, "
            "white background"
        ),
    ),
    (
        "npc_skillmaster_concept.png",
        (
            "chibi super deformed old wizard NPC, long beard, holding staff, "
            "pointed hat, 2.5 head ratio, low poly style, fantasy RPG, "
            "white background, front view, full body, character concept art sheet"
        ),
    ),
    (
        "npc_potion.png",
        (
            "chibi super deformed potion merchant NPC, hooded, holding potion bottle, "
            "2.5 head ratio, low poly style, fantasy RPG, white background"
        ),
    ),
    (
        "npc_potion_concept.png",
        (
            "chibi super deformed potion merchant NPC, hooded, holding potion bottle, "
            "2.5 head ratio, low poly style, fantasy RPG, white background, "
            "front view, full body, character concept art sheet"
        ),
    ),
]


def generate_enemies():
    """Category B: Generate enemy and NPC concept art."""
    print("\n" + "=" * 60)
    print("  B. Enemy / NPC Concept Art (Text-to-Image)")
    print("=" * 60)

    success = 0
    total = len(ENEMY_NPC_TASKS)

    for i, (output_file, prompt) in enumerate(ENEMY_NPC_TASKS, 1):
        print(f"\n[{i}/{total}] {output_file}")
        output_path = FANTASY_DIR / output_file
        if generate_image_text(prompt, output_path):
            success += 1

        if i < total:
            time.sleep(REQUEST_DELAY)

    print(f"\n  Enemies/NPCs done: {success}/{total}")
    return success


# ---------------------------------------------------------------------------
# C. Skill Icons (56 icons)
# ---------------------------------------------------------------------------

# Common prefix/suffix for all skill icon prompts
ICON_PREFIX = "game skill icon, "
ICON_SUFFIX = (
    ", dark background, clean edges, 64x64, vibrant colors, "
    "no text, centered composition, fantasy RPG style"
)

# All 56 skill icons grouped by class/tree
SKILL_ICON_TASKS = [
    # ---------------------------------------------------------------
    # Warrior Base (8)
    # ---------------------------------------------------------------
    ("icon_impact_punch.png", "fist impact with golden glowing energy, heavy punch"),
    ("icon_heavy_slash.png", "heavy sword downward slash, powerful strike, orange energy trail"),
    ("icon_rising_slash.png", "upward sword slash, rising arc, white energy trail"),
    ("icon_tumble.png", "dodge roll motion, evasive tumble, speed lines"),
    ("icon_aerial_evasion_w.png", "aerial recovery with glowing wings, mid-air dodge"),
    ("icon_dash.png", "speed dash with wind trail, forward burst movement"),
    ("icon_physical_mastery.png", "muscle power with red aura, physical strength symbol"),
    ("icon_mental_mastery.png", "mental energy with blue aura, mind power symbol"),

    # ---------------------------------------------------------------
    # Sword Master - Blade Column (5)
    # ---------------------------------------------------------------
    ("icon_dash_slash.png", "forward rushing three-hit sword slash, speed dash attack, blue energy"),
    ("icon_triple_slash.png", "triple consecutive sword slashes, three blade trails"),
    ("icon_line_drive.png", "piercing thrust attack, sword penetrating forward, green energy"),
    ("icon_hacking_stance.png", "rapid continuous overhead sword strikes, eight-hit combo"),
    ("icon_infinity_edge.png", "ultimate glowing sword, 20-hit super speed slash, purple legendary aura"),

    # ---------------------------------------------------------------
    # Sword Master - Wave Column (5)
    # ---------------------------------------------------------------
    ("icon_moonlight_splitter.png", "crescent moon energy blade projectile, silver moonlight"),
    ("icon_cyclone_slash.png", "spinning sword slash, surrounding cyclone, wind energy"),
    ("icon_halfmoon_slash.png", "large half-moon energy wave, massive crescent blade"),
    ("icon_crescent_cleave.png", "five consecutive shockwave slashes, crescents flying forward"),
    ("icon_great_wave.png", "ultimate sword energy explosion, omnidirectional blade aura, golden legendary"),

    # ---------------------------------------------------------------
    # Mercenary - Devastation Column (5)
    # ---------------------------------------------------------------
    ("icon_stomp.png", "foot stomping ground, shockwave rings, earth impact"),
    ("icon_whirlwind.png", "spinning axe whirlwind attack, four-hit rotation"),
    ("icon_circle_swing.png", "massive circular swing, heavy weapon full rotation"),
    ("icon_demolition_fist.png", "ground pound with fist, earth shattering upward debris"),
    ("icon_maelstrom_howl.png", "ultimate storm vortex area, raging purple tempest, legendary aura"),

    # ---------------------------------------------------------------
    # Mercenary - Warcry Column (5)
    # ---------------------------------------------------------------
    ("icon_iron_skin.png", "iron shield defensive buff, metallic silver armor glow"),
    ("icon_taunting_howl.png", "war cry taunt, red aggro shockwave, angry face"),
    ("icon_battle_howl.png", "battle cry buff, orange attack power boost aura"),
    ("icon_howling_charge.png", "charging forward with super armor glow, bull rush"),
    ("icon_fortress.png", "ultimate invincible fortress, golden shield dome, legendary aura"),

    # ---------------------------------------------------------------
    # Sorceress Base (8)
    # ---------------------------------------------------------------
    ("icon_magic_missile.png", "homing magic missile, glowing blue arcane projectile"),
    ("icon_void_blast.png", "void explosion, purple dark energy burst forward"),
    ("icon_glacial_spike.png", "ice spike projectile, frozen crystal shard, blue frost"),
    ("icon_teleport.png", "teleportation magic circle, instant blink, arcane symbols"),
    ("icon_aerial_evasion_s.png", "aerial magic recovery, floating arcane wings"),
    ("icon_poison_missile.png", "poison swamp puddle, toxic green bubbling area"),
    ("icon_intelligence_mastery.png", "intelligence book with arcane runes, magic power symbol"),
    ("icon_mind_conquer.png", "mind energy spiral, MP regeneration, cyan mana flow"),

    # ---------------------------------------------------------------
    # Elemental Lord - Flame Column (5)
    # ---------------------------------------------------------------
    ("icon_flame_spark.png", "double fire spark projectiles, orange flame balls"),
    ("icon_fireball.png", "large fireball with explosion aura, massive fire sphere"),
    ("icon_inferno.png", "fire pillar erupting from ground, triple flame column"),
    ("icon_flame_wall.png", "wall of fire, horizontal flame barrier, burning"),
    ("icon_phoenix_storm.png", "ultimate phoenix rising, fire bird descending, red golden legendary aura"),

    # ---------------------------------------------------------------
    # Elemental Lord - Frost Column (5)
    # ---------------------------------------------------------------
    ("icon_icy_shard.png", "scattering ice crystal shards, three frozen fragments"),
    ("icon_freezing_field.png", "area freeze circle, frozen ground, ice crystals expanding"),
    ("icon_frost_wind.png", "icy wind storm, four-hit blizzard gust, frost particles"),
    ("icon_elemental_shield.png", "magic absorption shield, blue crystal barrier, protective"),
    ("icon_blizzard_storm.png", "ultimate blizzard vortex, massive ice storm, blue legendary aura"),

    # ---------------------------------------------------------------
    # Force User - Gravity Column (5)
    # ---------------------------------------------------------------
    ("icon_gravity_ball.png", "dark gravity sphere, pulling force, purple distortion"),
    ("icon_summon_black_hole.png", "black hole vortex, dark void suction, space warp"),
    ("icon_nine_tail_laser.png", "nine homing laser beams, purple tracking rays"),
    ("icon_gravity_crush.png", "gravity compression crushing force, dark implosion"),
    ("icon_singularity.png", "ultimate singularity black hole, cosmic destruction, purple legendary aura"),

    # ---------------------------------------------------------------
    # Force User - Chrono Column (5)
    # ---------------------------------------------------------------
    ("icon_slow_area.png", "time slow zone, clock gears, distorted hourglass field"),
    ("icon_time_acceleration.png", "time speed up buff, fast forward clock, golden time aura"),
    ("icon_time_stop.png", "time freeze, shattered clock face, frozen moment"),
    ("icon_linear_ray.png", "straight penetrating energy beam, white laser line"),
    ("icon_time_break.png", "ultimate time shatter, broken clock explosion, golden legendary aura"),
]


def generate_skill_icons():
    """Category C: Generate all 56 skill icons."""
    print("\n" + "=" * 60)
    print("  C. Skill Icons (56 icons)")
    print("=" * 60)

    success = 0
    total = len(SKILL_ICON_TASKS)

    for i, (output_file, description) in enumerate(SKILL_ICON_TASKS, 1):
        print(f"\n[{i}/{total}] {output_file}")
        prompt = ICON_PREFIX + description + ICON_SUFFIX
        output_path = UI_DIR / output_file
        if generate_image_text(prompt, output_path):
            success += 1

        if i < total:
            time.sleep(REQUEST_DELAY)

    print(f"\n  Skill icons done: {success}/{total}")
    return success


# ---------------------------------------------------------------------------
# D. UI Elements
# ---------------------------------------------------------------------------

UI_TASKS = [
    # (output_filename, prompt)
    (
        "ui_hp_bar_bg.png",
        (
            "game UI health bar background frame, dark metallic border, "
            "256x32 pixels, horizontal rectangle, fantasy RPG style, "
            "ornate edges, transparent center area, clean design, no text"
        ),
    ),
    (
        "ui_hp_bar_fill.png",
        (
            "game UI health bar fill, smooth red to dark red gradient, "
            "252x28 pixels, horizontal rectangle, slight inner glow, "
            "clean edges, no border, no text, transparent background"
        ),
    ),
    (
        "ui_mp_bar_bg.png",
        (
            "game UI mana bar background frame, dark metallic border, "
            "256x32 pixels, horizontal rectangle, fantasy RPG style, "
            "ornate edges, transparent center area, clean design, no text"
        ),
    ),
    (
        "ui_mp_bar_fill.png",
        (
            "game UI mana bar fill, smooth blue to dark blue gradient, "
            "252x28 pixels, horizontal rectangle, slight inner glow, "
            "clean edges, no border, no text, transparent background"
        ),
    ),
    (
        "ui_skill_slot.png",
        (
            "game UI skill slot frame, ornate golden border, dark inner area, "
            "64x64 pixels, square, medieval RPG style, subtle glow, "
            "transparent center, no text, clean vector edges"
        ),
    ),
    (
        "ui_skill_slot_cd.png",
        (
            "game UI skill slot cooldown overlay, semi-transparent dark grey, "
            "clock-like sweep indicator, 64x64 pixels, square, "
            "cooldown timer visual, no text, dark overlay"
        ),
    ),
    (
        "ui_dialog_box.png",
        (
            "game UI dialog box, ornate wooden frame with golden trim, "
            "512x256 pixels, horizontal rectangle, fantasy RPG style, "
            "dark semi-transparent inner area, scroll-like edges, "
            "no text, clean design"
        ),
    ),
    (
        "ui_minimap_frame.png",
        (
            "game UI minimap frame, ornate circular border, golden compass edges, "
            "200x200 pixels, square with round inner cutout, fantasy RPG style, "
            "transparent center, no text, clean design"
        ),
    ),
    (
        "ui_btn_start.png",
        (
            "game UI start button, ornate golden fantasy button, "
            "200x60 pixels, horizontal pill shape, glowing edges, "
            "dark center gradient, medieval RPG style, no text, "
            "clean design, slight 3D bevel"
        ),
    ),
    (
        "ui_skilltree_bg.png",
        (
            "game UI skill tree background panel, dark parchment texture, "
            "1024x768 pixels, ornate border frame, medieval fantasy RPG style, "
            "subtle rune patterns, dark brown and gold tones, "
            "no text, clean design"
        ),
    ),
    (
        "ui_tab_active.png",
        (
            "game UI active tab button, bright golden glowing tab, "
            "150x40 pixels, horizontal rounded top rectangle, "
            "fantasy RPG style, selected state, bright, no text"
        ),
    ),
    (
        "ui_tab_inactive.png",
        (
            "game UI inactive tab button, dark grey muted tab, "
            "150x40 pixels, horizontal rounded top rectangle, "
            "fantasy RPG style, unselected state, dim, no text"
        ),
    ),
]


def generate_ui():
    """Category D: Generate UI elements."""
    print("\n" + "=" * 60)
    print("  D. UI Elements")
    print("=" * 60)

    success = 0
    total = len(UI_TASKS)

    for i, (output_file, prompt) in enumerate(UI_TASKS, 1):
        print(f"\n[{i}/{total}] {output_file}")
        output_path = UI_DIR / output_file
        if generate_image_text(prompt, output_path):
            success += 1

        if i < total:
            time.sleep(REQUEST_DELAY)

    print(f"\n  UI elements done: {success}/{total}")
    return success


# ---------------------------------------------------------------------------
# E. Backgrounds & Textures
# ---------------------------------------------------------------------------

BACKGROUND_TASKS = [
    # (output_filename, output_dir, prompt)
    (
        "bg_title.png",
        UI_DIR,
        (
            "dark fantasy castle on mountain peak, dragon silhouette flying across full moon, "
            "moonlit night sky, dramatic clouds, epic RPG title screen background, "
            "1920x1080 pixels, cinematic composition, stylized cartoon fantasy, "
            "vibrant colors, no text, no watermark"
        ),
    ),
    (
        "bg_town_sky.png",
        TEXTURES_DIR,
        (
            "fantasy village panoramic sky, warm sunset with orange and purple clouds, "
            "peaceful countryside vista, distant mountains, "
            "2048x1024 pixels, equirectangular panorama, stylized cartoon fantasy, "
            "vibrant warm colors, no text, no watermark"
        ),
    ),
    (
        "bg_dungeon.png",
        TEXTURES_DIR,
        (
            "dark dungeon cave interior panorama, flickering torch light, "
            "stone walls, mysterious shadows, stalactites, "
            "2048x1024 pixels, equirectangular panorama, stylized cartoon fantasy, "
            "moody atmosphere, no text, no watermark"
        ),
    ),
    (
        "tex_grass.png",
        TEXTURES_DIR,
        (
            "seamless grass texture, top down view, lush green grass blades, "
            "512x512 pixels, tileable seamless pattern, stylized cartoon style, "
            "game terrain texture, clean, no text"
        ),
    ),
    (
        "tex_cobblestone.png",
        TEXTURES_DIR,
        (
            "seamless cobblestone texture, medieval stone path, top down view, "
            "512x512 pixels, tileable seamless pattern, stylized cartoon style, "
            "warm grey and brown tones, game terrain texture, clean, no text"
        ),
    ),
    (
        "tex_dungeon_floor.png",
        TEXTURES_DIR,
        (
            "seamless dark stone floor texture, cracked ancient stone tiles, top down view, "
            "512x512 pixels, tileable seamless pattern, stylized cartoon style, "
            "dark grey with subtle moss, game terrain texture, clean, no text"
        ),
    ),
    (
        "tex_ruins_wall.png",
        TEXTURES_DIR,
        (
            "seamless ancient stone wall texture, front view, weathered stone blocks, "
            "faintly glowing blue runes, cracks and vines, "
            "512x512 pixels, tileable seamless pattern, stylized cartoon style, "
            "fantasy RPG dungeon wall, clean, no text"
        ),
    ),
]


def generate_backgrounds():
    """Category E: Generate backgrounds and textures."""
    print("\n" + "=" * 60)
    print("  E. Backgrounds & Textures")
    print("=" * 60)

    success = 0
    total = len(BACKGROUND_TASKS)

    for i, (output_file, output_dir, prompt) in enumerate(BACKGROUND_TASKS, 1):
        print(f"\n[{i}/{total}] {output_file}")
        output_path = output_dir / output_file
        if generate_image_text(prompt, output_path):
            success += 1

        if i < total:
            time.sleep(REQUEST_DELAY)

    print(f"\n  Backgrounds/Textures done: {success}/{total}")
    return success


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Dragon Nest Lite - Gemini Image Generation Script"
    )
    parser.add_argument("--all", action="store_true", help="Generate all categories")
    parser.add_argument("--characters", action="store_true", help="A. Character costume conversion")
    parser.add_argument("--enemies", action="store_true", help="B. Enemy/NPC concept art")
    parser.add_argument("--icons", action="store_true", help="C. Skill icons (56)")
    parser.add_argument("--ui", action="store_true", help="D. UI elements")
    parser.add_argument("--backgrounds", action="store_true", help="E. Backgrounds & textures")
    args = parser.parse_args()

    # If no flags provided, show help
    if not any([args.all, args.characters, args.enemies, args.icons, args.ui, args.backgrounds]):
        parser.print_help()
        print("\nExample: python generate_images.py --all")
        sys.exit(0)

    # Initialize
    ensure_dirs()
    init_genai()

    run_all = args.all
    results = {}

    total_assets = 0
    total_success = 0

    if run_all or args.characters:
        count = generate_characters()
        results["Characters"] = (count, len(CHARACTER_TASKS))
        total_assets += len(CHARACTER_TASKS)
        total_success += count

    if run_all or args.enemies:
        count = generate_enemies()
        results["Enemies/NPCs"] = (count, len(ENEMY_NPC_TASKS))
        total_assets += len(ENEMY_NPC_TASKS)
        total_success += count

    if run_all or args.icons:
        count = generate_skill_icons()
        results["Skill Icons"] = (count, len(SKILL_ICON_TASKS))
        total_assets += len(SKILL_ICON_TASKS)
        total_success += count

    if run_all or args.ui:
        count = generate_ui()
        results["UI Elements"] = (count, len(UI_TASKS))
        total_assets += len(UI_TASKS)
        total_success += count

    if run_all or args.backgrounds:
        count = generate_backgrounds()
        results["Backgrounds"] = (count, len(BACKGROUND_TASKS))
        total_assets += len(BACKGROUND_TASKS)
        total_success += count

    # Summary
    print("\n" + "=" * 60)
    print("  GENERATION SUMMARY")
    print("=" * 60)
    for category, (ok, total) in results.items():
        status = "OK" if ok == total else "PARTIAL"
        print(f"  {category:20s}: {ok}/{total}  [{status}]")
    print(f"\n  TOTAL: {total_success}/{total_assets}")
    print("=" * 60)

    if total_success < total_assets:
        print("\nSome images failed to generate. Re-run the specific category to retry.")
        sys.exit(1)
    else:
        print("\nAll images generated successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
