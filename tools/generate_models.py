#!/usr/bin/env python3
"""
Dragon Nest Lite - Meshy API 3D Model Generation Script

Generates all 3D model assets using Meshy API (Image-to-3D and Text-to-3D).
Supports Refine, Rigging, and Animation steps.

Usage:
    python generate_models.py                    # Generate all models
    python generate_models.py --list             # List all models
    python generate_models.py --model fighter    # Generate a specific model
    python generate_models.py --model fighter mage enemy_slime  # Multiple models
    python generate_models.py --category characters  # By category
    python generate_models.py --category enemies npcs  # Multiple categories
    python generate_models.py --skip-refine      # Skip refine step
    python generate_models.py --skip-rigging     # Skip rigging step
    python generate_models.py --dry-run          # Print what would be done

Requires:
    pip install requests python-dotenv
"""

import argparse
import base64
import json
import os
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MESHY_BASE_URL = "https://api.meshy.ai/openapi"

# API endpoint paths
IMAGE_TO_3D_URL = f"{MESHY_BASE_URL}/v1/image-to-3d"
TEXT_TO_3D_URL = f"{MESHY_BASE_URL}/v2/text-to-3d"
RIGGING_URL = f"{MESHY_BASE_URL}/v1/rigging"

# Polling configuration
POLL_INTERVAL_SECONDS = 15
MAX_POLL_ATTEMPTS = 60  # 60 * 15s = 15 minutes max wait per step

# Common style keywords for all prompts
COMMON_STYLE = (
    "chibi, super deformed, 2.5 head ratio, low poly, game asset, "
    "cute stylized, clean topology, single mesh, solid colors"
)

# Project paths (relative to this script's location)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
MODELS_DIR = ASSETS_DIR / "models"
REFERENCE_DIR = ASSETS_DIR / "reference"
REFERENCE_FANTASY_DIR = ASSETS_DIR / "reference_fantasy"


# ---------------------------------------------------------------------------
# Enums and data classes
# ---------------------------------------------------------------------------

class GenerationMethod(Enum):
    IMAGE_TO_3D = "image-to-3d"
    TEXT_TO_3D = "text-to-3d"


class ModelCategory(Enum):
    CHARACTERS = "characters"
    ENEMIES = "enemies"
    NPCS = "npcs"
    ENVIRONMENT = "environment"
    ITEMS = "items"


@dataclass
class ModelDefinition:
    """Definition of a 3D model to generate."""
    name: str
    filename: str
    category: ModelCategory
    method: GenerationMethod
    target_polycount: int
    prompt: str
    needs_rigging: bool = False
    image_path: Optional[str] = None  # For Image-to-3D, relative to project root
    animations: list[str] = field(default_factory=list)
    priority: int = 0  # P0 = highest


# ---------------------------------------------------------------------------
# Model definitions
# ---------------------------------------------------------------------------

MODELS: list[ModelDefinition] = [
    # ===== Characters (Image-to-3D, rigging required) =====
    ModelDefinition(
        name="fighter",
        filename="fighter.glb",
        category=ModelCategory.CHARACTERS,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=5000,
        prompt=(
            f"chibi super deformed warrior girl, 2.5 head ratio, low poly game character, "
            f"large head, small body, wearing simple leather armor with shoulder pads, "
            f"holding a great sword, fantasy RPG adventurer style, "
            f"clean topology, solid colors, cute proportions, t-pose, "
            f"single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/mia_fantasy_sd.png",
        animations=["idle", "walk", "run", "attack1", "attack2", "skill", "hit", "die"],
        priority=0,
    ),
    ModelDefinition(
        name="mage",
        filename="mage.glb",
        category=ModelCategory.CHARACTERS,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=5000,
        prompt=(
            f"chibi super deformed mage girl, 2.5 head ratio, low poly game character, "
            f"large head, small body, wearing simple robe with hooded cloak, "
            f"holding a magic staff, fantasy RPG sorceress style, "
            f"clean topology, solid colors, cute proportions, t-pose, "
            f"single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/haru_fantasy_sd.png",
        animations=["idle", "walk", "run", "cast1", "cast2", "skill", "hit", "die"],
        priority=0,
    ),

    # ===== Enemies (Image-to-3D from concept art, rigging required) =====
    ModelDefinition(
        name="enemy_slime",
        filename="enemy_slime.glb",
        category=ModelCategory.ENEMIES,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=3000,
        prompt=(
            f"chibi super deformed cute slime monster, 2.5 head ratio, "
            f"low poly game enemy, translucent blue-green body, big round eyes, "
            f"small mouth, bouncy jelly creature, fantasy RPG style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/enemy_slime_concept.png",
        animations=["idle", "move", "attack", "die"],
        priority=0,
    ),
    ModelDefinition(
        name="enemy_goblin",
        filename="enemy_goblin.glb",
        category=ModelCategory.ENEMIES,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=3000,
        prompt=(
            f"chibi super deformed goblin, 2.5 head ratio, low poly game enemy, "
            f"large head, green skin, pointy ears, holding a crude wooden club, "
            f"ragged cloth armor, mischievous expression, fantasy RPG style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/enemy_goblin_concept.png",
        animations=["idle", "move", "attack", "die"],
        priority=1,
    ),
    ModelDefinition(
        name="enemy_skeleton",
        filename="enemy_skeleton.glb",
        category=ModelCategory.ENEMIES,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=3000,
        prompt=(
            f"chibi super deformed skeleton warrior, 2.5 head ratio, low poly game enemy, "
            f"large skull head, small bone body, holding a rusty sword and shield, "
            f"tattered cape, glowing eye sockets, fantasy RPG undead style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/enemy_skeleton_concept.png",
        animations=["idle", "move", "attack", "die"],
        priority=1,
    ),
    ModelDefinition(
        name="boss_dragon",
        filename="boss_dragon.glb",
        category=ModelCategory.ENEMIES,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=8000,
        prompt=(
            f"chibi super deformed dragon boss, 2.5 head ratio, low poly game boss monster, "
            f"large head with horns, small body with wings, red scales, "
            f"fire breathing pose, fierce but cute expression, "
            f"thick tail, clawed feet, fantasy RPG dragon style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/boss_dragon_concept.png",
        animations=["idle", "move", "attack", "breath", "die"],
        priority=1,
    ),

    # ===== NPCs (Image-to-3D from concept art, rigging for idle only) =====
    ModelDefinition(
        name="npc_blacksmith",
        filename="npc_blacksmith.glb",
        category=ModelCategory.NPCS,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=3000,
        prompt=(
            f"chibi super deformed blacksmith NPC, 2.5 head ratio, low poly game character, "
            f"large head, muscular small body, wearing leather apron, "
            f"holding a hammer, standing near an anvil, friendly expression, "
            f"fantasy RPG village blacksmith style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/npc_blacksmith_concept.png",
        animations=["idle"],
        priority=2,
    ),
    ModelDefinition(
        name="npc_skillmaster",
        filename="npc_skillmaster.glb",
        category=ModelCategory.NPCS,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=3000,
        prompt=(
            f"chibi super deformed wise old mage NPC, 2.5 head ratio, low poly game character, "
            f"large head with long white beard, small body wearing ornate wizard robe, "
            f"holding a glowing crystal orb, pointy hat, wise expression, "
            f"fantasy RPG skill master style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/npc_skillmaster_concept.png",
        animations=["idle"],
        priority=2,
    ),
    ModelDefinition(
        name="npc_potion",
        filename="npc_potion.glb",
        category=ModelCategory.NPCS,
        method=GenerationMethod.IMAGE_TO_3D,
        target_polycount=3000,
        prompt=(
            f"chibi super deformed potion shop girl NPC, 2.5 head ratio, low poly game character, "
            f"large head, small body wearing cute apron over simple dress, "
            f"holding a colorful potion bottle, cheerful expression, "
            f"surrounded by potion shelves, fantasy RPG style, "
            f"clean topology, solid colors, single mesh, game asset"
        ),
        needs_rigging=True,
        image_path="assets/reference_fantasy/npc_potion_concept.png",
        animations=["idle"],
        priority=2,
    ),

    # ===== Environment (Text-to-3D, no rigging) =====
    ModelDefinition(
        name="env_tree_01",
        filename="env_tree_01.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"stylized cute fantasy oak tree, {COMMON_STYLE}, "
            f"round leafy canopy, thick trunk, green leaves, brown bark, "
            f"fantasy RPG village decoration"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_tree_02",
        filename="env_tree_02.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"stylized cute fantasy pine tree, {COMMON_STYLE}, "
            f"triangular conifer shape, dark green needles, "
            f"fantasy RPG forest decoration"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_tree_03",
        filename="env_tree_03.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"stylized cute fantasy cherry blossom tree, {COMMON_STYLE}, "
            f"pink flower canopy, curved trunk, "
            f"fantasy RPG town decoration, spring feeling"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_rock_01",
        filename="env_rock_01.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"stylized mossy boulder rock, {COMMON_STYLE}, "
            f"grey stone with green moss patches, rounded shape, "
            f"fantasy RPG environment prop"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_rock_02",
        filename="env_rock_02.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"stylized rock cluster, {COMMON_STYLE}, "
            f"three small grey rocks grouped together, some moss, "
            f"fantasy RPG environment prop"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_house_01",
        filename="env_house_01.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"cute medieval cottage house, {COMMON_STYLE}, "
            f"thatched roof, stone walls, small wooden door, chimney, "
            f"fantasy RPG village building, warm cozy feeling"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_house_02",
        filename="env_house_02.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=1000,
        prompt=(
            f"cute medieval shop building, {COMMON_STYLE}, "
            f"wooden frame, plaster walls, shop sign hanging, two-story, "
            f"fantasy RPG village building"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_dungeon_wall",
        filename="env_dungeon_wall.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"stone dungeon wall tile segment, {COMMON_STYLE}, "
            f"dark grey stone blocks, cracks, torch bracket on wall, "
            f"modular piece, fantasy RPG dungeon"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_dungeon_floor",
        filename="env_dungeon_floor.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"stone dungeon floor tile, {COMMON_STYLE}, "
            f"flat square stone slab, slight cracks, dark color, "
            f"modular piece, fantasy RPG dungeon"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_cave_wall",
        filename="env_cave_wall.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"mossy cave wall segment, {COMMON_STYLE}, "
            f"rough stone with green moss and hanging vines, "
            f"natural rock formation, fantasy RPG cave dungeon"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_ruins_pillar",
        filename="env_ruins_pillar.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"crumbling ancient stone pillar, {COMMON_STYLE}, "
            f"broken top, vine-covered, mysterious rune carvings, "
            f"fantasy RPG ancient ruins"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="env_door",
        filename="env_door.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"medieval dungeon door with stone frame, {COMMON_STYLE}, "
            f"heavy wooden door with iron reinforcements, arch top, "
            f"iron ring handle, fantasy RPG dungeon entrance"
        ),
        priority=2,
    ),

    # ===== Dungeon Props (Text-to-3D, no rigging) =====
    ModelDefinition(
        name="env_rubble",
        filename="env_rubble.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"scattered stone rubble debris pile, {COMMON_STYLE}, "
            f"broken stone chunks and dust, collapsed wall remains, "
            f"fantasy RPG dungeon debris"
        ),
        priority=3,
    ),
    ModelDefinition(
        name="env_magic_circle",
        filename="env_magic_circle.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"glowing magic circle on ground, {COMMON_STYLE}, "
            f"flat circular arcane rune pattern, blue glow, "
            f"fantasy RPG summoning circle, magical symbols"
        ),
        priority=3,
    ),
    ModelDefinition(
        name="env_mural",
        filename="env_mural.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"ancient stone wall mural relief, {COMMON_STYLE}, "
            f"flat rectangular stone slab with carved dragon imagery, "
            f"faded paint, cracks, fantasy RPG dungeon decoration"
        ),
        priority=3,
    ),
    ModelDefinition(
        name="env_torch",
        filename="env_torch.glb",
        category=ModelCategory.ENVIRONMENT,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"wall-mounted torch sconce, {COMMON_STYLE}, "
            f"iron bracket holding wooden torch with flame, "
            f"medieval fantasy RPG dungeon lighting"
        ),
        priority=3,
    ),

    # ===== Items (Text-to-3D, no rigging) =====
    ModelDefinition(
        name="item_chest",
        filename="item_chest.glb",
        category=ModelCategory.ITEMS,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"cute treasure chest, {COMMON_STYLE}, "
            f"wooden chest with golden metal bands, open lid showing sparkle, "
            f"fantasy RPG loot container"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="item_potion_hp",
        filename="item_potion_hp.glb",
        category=ModelCategory.ITEMS,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"red health potion bottle, {COMMON_STYLE}, "
            f"round glass flask with cork, glowing red liquid inside, "
            f"heart label, fantasy RPG healing item"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="item_potion_mp",
        filename="item_potion_mp.glb",
        category=ModelCategory.ITEMS,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"blue mana potion bottle, {COMMON_STYLE}, "
            f"round glass flask with cork, glowing blue liquid inside, "
            f"star label, fantasy RPG mana item"
        ),
        priority=2,
    ),
    ModelDefinition(
        name="item_gold",
        filename="item_gold.glb",
        category=ModelCategory.ITEMS,
        method=GenerationMethod.TEXT_TO_3D,
        target_polycount=500,
        prompt=(
            f"pile of gold coins, {COMMON_STYLE}, "
            f"shiny golden coins stacked in small pile, "
            f"fantasy RPG treasure drop, sparkle effect"
        ),
        priority=2,
    ),
]


# ---------------------------------------------------------------------------
# Meshy API Client
# ---------------------------------------------------------------------------

class MeshyAPIError(Exception):
    """Custom error for Meshy API failures."""

    def __init__(self, message: str, status_code: int = 0, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class MeshyClient:
    """Client for interacting with the Meshy API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
        })

    def _check_response(self, response: requests.Response, context: str) -> dict:
        """Check API response and raise on error."""
        if response.status_code not in (200, 201, 202):
            raise MeshyAPIError(
                f"{context} failed: HTTP {response.status_code} - {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            )
        return response.json()

    # ----- Image-to-3D -----

    def create_image_to_3d(
        self,
        image_url: str,
        target_polycount: int = 5000,
        topology: str = "quad",
    ) -> str:
        """
        Create an Image-to-3D task.

        Args:
            image_url: URL of the input image, or a base64 data URI.
            target_polycount: Target polygon count.
            topology: Mesh topology type.

        Returns:
            Task ID string.
        """
        payload = {
            "image_url": image_url,
            "ai_model": "latest",
            "topology": topology,
            "target_polycount": target_polycount,
            "should_remesh": True,
        }

        response = self.session.post(IMAGE_TO_3D_URL, json=payload)
        data = self._check_response(response, "Image-to-3D creation")
        task_id = data.get("result")
        if not task_id:
            raise MeshyAPIError(f"No task ID in Image-to-3D response: {data}")
        return task_id

    def get_image_to_3d_status(self, task_id: str) -> dict:
        """Get status of an Image-to-3D task."""
        response = self.session.get(f"{IMAGE_TO_3D_URL}/{task_id}")
        return self._check_response(response, f"Image-to-3D status check ({task_id})")

    # ----- Text-to-3D -----

    def create_text_to_3d(
        self,
        prompt: str,
        target_polycount: int = 1000,
        topology: str = "quad",
        art_style: str = "realistic",
        negative_prompt: str = "high poly, complex, noisy, blurry, realistic human proportions",
    ) -> str:
        """
        Create a Text-to-3D task.

        Args:
            prompt: Text description of the model.
            target_polycount: Target polygon count.
            topology: Mesh topology type.
            art_style: Art style for generation.
            negative_prompt: What to avoid.

        Returns:
            Task ID string.
        """
        payload = {
            "mode": "preview",
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "ai_model": "latest",
            "art_style": art_style,
            "topology": topology,
            "target_polycount": target_polycount,
            "should_remesh": True,
        }

        response = self.session.post(TEXT_TO_3D_URL, json=payload)
        data = self._check_response(response, "Text-to-3D creation")
        task_id = data.get("result")
        if not task_id:
            raise MeshyAPIError(f"No task ID in Text-to-3D response: {data}")
        return task_id

    def get_text_to_3d_status(self, task_id: str) -> dict:
        """Get status of a Text-to-3D task."""
        response = self.session.get(f"{TEXT_TO_3D_URL}/{task_id}")
        return self._check_response(response, f"Text-to-3D status check ({task_id})")

    # ----- Refine -----

    def refine_text_to_3d(self, preview_task_id: str, texture_richness: str = "high") -> str:
        """
        Refine a Text-to-3D preview task for higher quality.

        Args:
            preview_task_id: The task ID of the completed preview.
            texture_richness: Texture quality level ("high", "medium", "low").

        Returns:
            New task ID for the refine job.
        """
        payload = {
            "mode": "refine",
            "preview_task_id": preview_task_id,
            "texture_richness": texture_richness,
        }

        response = self.session.post(TEXT_TO_3D_URL, json=payload)
        data = self._check_response(response, "Text-to-3D refine")
        task_id = data.get("result")
        if not task_id:
            raise MeshyAPIError(f"No task ID in refine response: {data}")
        return task_id

    # ----- Rigging -----

    def create_rigging(self, model_url: str) -> str:
        """
        Create a rigging task for a humanoid model.

        Args:
            model_url: URL of the GLB model to rig.

        Returns:
            Task ID string.
        """
        payload = {
            "model_url": model_url,
        }

        response = self.session.post(RIGGING_URL, json=payload)
        data = self._check_response(response, "Rigging creation")
        task_id = data.get("result")
        if not task_id:
            raise MeshyAPIError(f"No task ID in rigging response: {data}")
        return task_id

    def get_rigging_status(self, task_id: str) -> dict:
        """Get status of a rigging task."""
        response = self.session.get(f"{RIGGING_URL}/{task_id}")
        return self._check_response(response, f"Rigging status check ({task_id})")

    # ----- Polling helper -----

    def poll_until_complete(
        self,
        task_id: str,
        status_fn,
        label: str = "Task",
        poll_interval: int = POLL_INTERVAL_SECONDS,
        max_attempts: int = MAX_POLL_ATTEMPTS,
    ) -> dict:
        """
        Poll a task until it reaches a terminal state.

        Args:
            task_id: The task ID to poll.
            status_fn: Callable that takes task_id and returns status dict.
            label: Human-readable label for logging.
            poll_interval: Seconds between polls.
            max_attempts: Maximum number of poll attempts.

        Returns:
            The final status dict with 'SUCCEEDED' status.

        Raises:
            MeshyAPIError: If the task fails or times out.
        """
        print(f"  [{label}] Polling task {task_id}...")
        for attempt in range(1, max_attempts + 1):
            data = status_fn(task_id)
            status = data.get("status", "UNKNOWN")
            progress = data.get("progress", 0)

            print(f"  [{label}] Attempt {attempt}/{max_attempts}: "
                  f"status={status}, progress={progress}%")

            if status == "SUCCEEDED":
                print(f"  [{label}] Task completed successfully!")
                return data
            elif status in ("FAILED", "EXPIRED"):
                error_msg = data.get("task_error", {}).get("message", "Unknown error")
                raise MeshyAPIError(
                    f"{label} task {task_id} {status}: {error_msg}"
                )

            time.sleep(poll_interval)

        raise MeshyAPIError(
            f"{label} task {task_id} timed out after {max_attempts * poll_interval}s"
        )

    # ----- Download helper -----

    def download_glb(self, url: str, output_path: Path) -> None:
        """Download a GLB file from URL to local path."""
        print(f"  Downloading GLB to {output_path}...")
        response = self.session.get(url, stream=True)
        if response.status_code != 200:
            raise MeshyAPIError(
                f"GLB download failed: HTTP {response.status_code}",
                status_code=response.status_code,
            )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        file_size = output_path.stat().st_size
        print(f"  Downloaded: {output_path} ({file_size:,} bytes)")


# ---------------------------------------------------------------------------
# Image encoding helper
# ---------------------------------------------------------------------------

def image_to_data_uri(image_path: Path) -> str:
    """Convert a local image file to a base64 data URI."""
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    suffix = image_path.suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    mime_type = mime_map.get(suffix, "image/png")

    with open(image_path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("utf-8")
    return f"data:{mime_type};base64,{b64}"


# ---------------------------------------------------------------------------
# Generation pipeline
# ---------------------------------------------------------------------------

def generate_model(
    client: MeshyClient,
    model_def: ModelDefinition,
    output_dir: Path,
    skip_refine: bool = False,
    skip_rigging: bool = False,
    dry_run: bool = False,
) -> Optional[Path]:
    """
    Run the full generation pipeline for a single model.

    Steps:
        1. Create 3D model (Image-to-3D or Text-to-3D preview)
        2. Poll until complete
        3. Refine (Text-to-3D only, unless skipped)
        4. Poll refine until complete
        5. Rigging (if needed, unless skipped)
        6. Poll rigging until complete
        7. Download final GLB

    Args:
        client: MeshyClient instance.
        model_def: Model definition.
        output_dir: Directory to save GLB files.
        skip_refine: Skip the refine step.
        skip_rigging: Skip the rigging step.
        dry_run: If True, only print what would be done.

    Returns:
        Path to the downloaded GLB file, or None on failure.
    """
    output_path = output_dir / model_def.filename
    label = model_def.name

    print(f"\n{'='*60}")
    print(f"Generating: {label}")
    print(f"  Method:    {model_def.method.value}")
    print(f"  Polycount: {model_def.target_polycount}")
    print(f"  Rigging:   {model_def.needs_rigging and not skip_rigging}")
    print(f"  Output:    {output_path}")
    print(f"  Prompt:    {model_def.prompt[:100]}...")
    if model_def.image_path:
        print(f"  Image:     {model_def.image_path}")
    print(f"{'='*60}")

    if dry_run:
        print("  [DRY RUN] Skipping actual API calls.")
        return None

    if output_path.exists():
        print(f"  [SKIP] Already exists: {output_path}")
        return output_path

    try:
        # --- Step 1: Create the 3D generation task ---
        if model_def.method == GenerationMethod.IMAGE_TO_3D:
            # Resolve image path
            image_path = PROJECT_ROOT / model_def.image_path
            if not image_path.exists():
                print(f"  WARNING: Image file not found: {image_path}")
                print(f"  You need to generate fantasy reference images first.")
                print(f"  Run generate_images.py to create concept art, then retry.")
                return None

            image_data_uri = image_to_data_uri(image_path)
            print(f"  Step 1: Creating Image-to-3D task...")
            task_id = client.create_image_to_3d(
                image_url=image_data_uri,
                target_polycount=model_def.target_polycount,
            )
            print(f"  Task ID: {task_id}")

            # Poll for completion
            result = client.poll_until_complete(
                task_id,
                client.get_image_to_3d_status,
                label=f"{label}/Image-to-3D",
            )

        elif model_def.method == GenerationMethod.TEXT_TO_3D:
            print(f"  Step 1: Creating Text-to-3D preview task...")
            task_id = client.create_text_to_3d(
                prompt=model_def.prompt,
                target_polycount=model_def.target_polycount,
            )
            print(f"  Task ID: {task_id}")

            # Poll for completion
            result = client.poll_until_complete(
                task_id,
                client.get_text_to_3d_status,
                label=f"{label}/Text-to-3D",
            )

            # --- Step 2: Refine (Text-to-3D only) ---
            if not skip_refine:
                print(f"  Step 2: Creating Text-to-3D refine task...")
                refine_task_id = client.refine_text_to_3d(task_id)
                print(f"  Refine Task ID: {refine_task_id}")

                result = client.poll_until_complete(
                    refine_task_id,
                    client.get_text_to_3d_status,
                    label=f"{label}/Refine",
                )
            else:
                print(f"  Step 2: [SKIPPED] Refine (--skip-refine)")

        else:
            raise ValueError(f"Unknown generation method: {model_def.method}")

        # Extract the model URL from the result
        model_urls = result.get("model_urls", {})
        glb_url = model_urls.get("glb")
        if not glb_url:
            # Fallback: check other possible response structures
            glb_url = model_urls.get("obj") or result.get("model_url")
            if glb_url:
                print(f"  WARNING: GLB URL not found, using fallback: {glb_url}")
            else:
                raise MeshyAPIError(
                    f"No model URL found in result. Available keys: {list(model_urls.keys())}"
                )

        # --- Step 3: Rigging (if needed) ---
        if model_def.needs_rigging and not skip_rigging:
            try:
                print(f"  Step 3: Creating rigging task...")
                rigging_task_id = client.create_rigging(glb_url)
                print(f"  Rigging Task ID: {rigging_task_id}")

                rigging_result = client.poll_until_complete(
                    rigging_task_id,
                    client.get_rigging_status,
                    label=f"{label}/Rigging",
                )

                # The rigged model URL
                rigged_url = rigging_result.get("model_urls", {}).get("glb")
                if rigged_url:
                    glb_url = rigged_url
                    print(f"  Rigging complete. Using rigged model.")
                else:
                    print(f"  WARNING: Rigged GLB URL not found. Using unrigged model.")
            except MeshyAPIError as e:
                print(f"  WARNING: Rigging failed ({e}). Downloading unrigged model instead.")
        elif model_def.needs_rigging and skip_rigging:
            print(f"  Step 3: [SKIPPED] Rigging (--skip-rigging)")
        else:
            print(f"  Step 3: [N/A] Rigging not needed for this model.")

        # --- Step 4: Download the GLB ---
        print(f"  Step 4: Downloading GLB...")
        client.download_glb(glb_url, output_path)

        print(f"\n  SUCCESS: {label} -> {output_path}")
        return output_path

    except MeshyAPIError as e:
        print(f"\n  ERROR [{label}]: {e}")
        return None
    except FileNotFoundError as e:
        print(f"\n  ERROR [{label}]: {e}")
        return None
    except requests.RequestException as e:
        print(f"\n  ERROR [{label}]: Network error - {e}")
        return None


# ---------------------------------------------------------------------------
# CLI and main
# ---------------------------------------------------------------------------

def get_models_by_filter(
    model_names: Optional[list[str]] = None,
    categories: Optional[list[str]] = None,
) -> list[ModelDefinition]:
    """Filter model definitions by name and/or category."""
    result = MODELS

    if model_names:
        name_set = set(model_names)
        result = [m for m in result if m.name in name_set]
        found_names = {m.name for m in result}
        missing = name_set - found_names
        if missing:
            print(f"WARNING: Unknown model names: {', '.join(sorted(missing))}")

    if categories:
        cat_set = set()
        for c in categories:
            try:
                cat_set.add(ModelCategory(c))
            except ValueError:
                print(f"WARNING: Unknown category '{c}'. "
                      f"Valid: {', '.join(mc.value for mc in ModelCategory)}")
        if cat_set:
            result = [m for m in result if m.category in cat_set]

    return sorted(result, key=lambda m: (m.priority, m.name))


def print_model_list(models: list[ModelDefinition]) -> None:
    """Print a formatted table of models."""
    print(f"\n{'Name':<25} {'Category':<15} {'Method':<15} {'Poly':<8} {'Rig':<5} {'Pri'}")
    print("-" * 80)
    for m in models:
        print(
            f"{m.name:<25} {m.category.value:<15} {m.method.value:<15} "
            f"{m.target_polycount:<8} {'Yes' if m.needs_rigging else 'No':<5} P{m.priority}"
        )
    print(f"\nTotal: {len(models)} models")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate 3D models for Dragon Nest Lite using Meshy API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_models.py                          # Generate all models
  python generate_models.py --list                   # List all models
  python generate_models.py --model fighter          # One model
  python generate_models.py --model fighter mage     # Multiple models
  python generate_models.py --category characters    # All characters
  python generate_models.py --category enemies npcs  # Multiple categories
  python generate_models.py --dry-run                # Preview only
  python generate_models.py --skip-refine            # Skip refinement
  python generate_models.py --skip-rigging           # Skip rigging
        """,
    )
    parser.add_argument(
        "--model",
        nargs="+",
        metavar="NAME",
        help="Generate specific model(s) by name",
    )
    parser.add_argument(
        "--category",
        nargs="+",
        metavar="CAT",
        choices=[c.value for c in ModelCategory],
        help="Generate all models in category (characters, enemies, npcs, environment, items)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available models and exit",
    )
    parser.add_argument(
        "--skip-refine",
        action="store_true",
        help="Skip the refine step (Text-to-3D only)",
    )
    parser.add_argument(
        "--skip-rigging",
        action="store_true",
        help="Skip the rigging step",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be generated without making API calls",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=MODELS_DIR,
        help=f"Output directory for GLB files (default: {MODELS_DIR})",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=POLL_INTERVAL_SECONDS,
        help=f"Seconds between status polls (default: {POLL_INTERVAL_SECONDS})",
    )
    return parser.parse_args()


def main() -> int:
    """Main entry point."""
    args = parse_args()

    # Get filtered model list
    models = get_models_by_filter(
        model_names=args.model,
        categories=args.category,
    )

    # --list mode: just print and exit
    if args.list:
        print_model_list(models)
        return 0

    if not models:
        print("ERROR: No models matched the given filters.")
        print("Use --list to see available models.")
        return 1

    # Print what we're going to generate
    print("=" * 60)
    print("Dragon Nest Lite - 3D Model Generation")
    print("=" * 60)
    print_model_list(models)

    if args.dry_run:
        print("\n[DRY RUN MODE] No API calls will be made.\n")

    # Load API key
    if not args.dry_run:
        # Load .env from project root
        env_path = PROJECT_ROOT / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            print(f"\nLoaded .env from {env_path}")
        else:
            print(f"\nWARNING: .env file not found at {env_path}")
            print("Falling back to environment variables.")

        api_key = os.environ.get("MESHY_API_KEY")
        if not api_key:
            print("ERROR: MESHY_API_KEY not found in .env or environment variables.")
            print("Please set MESHY_API_KEY in your .env file:")
            print(f"  echo 'MESHY_API_KEY=msy_your_key_here' >> {env_path}")
            return 1

        # Validate API key format (basic check)
        if not api_key.startswith("msy_"):
            print("WARNING: MESHY_API_KEY does not start with 'msy_'. "
                  "This may not be a valid Meshy API key.")

        client = MeshyClient(api_key)
    else:
        client = None  # type: ignore[assignment]

    # Ensure output directory exists
    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Update global poll interval if specified
    global POLL_INTERVAL_SECONDS
    POLL_INTERVAL_SECONDS = args.poll_interval

    # Generate models
    results: dict[str, Optional[Path]] = {}
    total = len(models)

    for i, model_def in enumerate(models, 1):
        print(f"\n[{i}/{total}] Processing: {model_def.name}")

        output_path = generate_model(
            client=client,
            model_def=model_def,
            output_dir=args.output_dir,
            skip_refine=args.skip_refine,
            skip_rigging=args.skip_rigging,
            dry_run=args.dry_run,
        )
        results[model_def.name] = output_path

    # Print summary
    print("\n" + "=" * 60)
    print("GENERATION SUMMARY")
    print("=" * 60)

    succeeded = []
    failed = []
    skipped = []

    for name, path in results.items():
        if args.dry_run:
            skipped.append(name)
        elif path is not None:
            succeeded.append((name, path))
        else:
            failed.append(name)

    if succeeded:
        print(f"\nSucceeded ({len(succeeded)}):")
        for name, path in succeeded:
            print(f"  {name:<25} -> {path}")

    if failed:
        print(f"\nFailed ({len(failed)}):")
        for name in failed:
            print(f"  {name}")

    if skipped:
        print(f"\nSkipped - dry run ({len(skipped)}):")
        for name in skipped:
            print(f"  {name}")

    print(f"\nTotal: {len(succeeded)} succeeded, {len(failed)} failed, "
          f"{len(skipped)} skipped out of {total}")

    # Save generation log
    log_path = args.output_dir / "_generation_log.json"
    log_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_models": total,
        "succeeded": [name for name, _ in succeeded],
        "failed": failed,
        "skipped": skipped,
        "settings": {
            "skip_refine": args.skip_refine,
            "skip_rigging": args.skip_rigging,
            "dry_run": args.dry_run,
            "poll_interval": args.poll_interval,
        },
    }
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    print(f"\nGeneration log saved: {log_path}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
