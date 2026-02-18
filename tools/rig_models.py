#!/usr/bin/env python3
"""
Dragon Nest Lite - Meshy Rigging Script

Rigs existing GLB models using Meshy's Auto-Rigging API.
Downloads rigged GLB files (with skeleton bones) to replace the originals.

Usage:
    python rig_models.py                    # Rig all character models
    python rig_models.py --model fighter    # Rig a specific model
    python rig_models.py --dry-run          # Preview only
"""

import argparse
import base64
import json
import os
import shutil
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MESHY_BASE_URL = "https://api.meshy.ai/openapi"
RIGGING_URL = f"{MESHY_BASE_URL}/v1/rigging"

POLL_INTERVAL = 10  # seconds
MAX_POLL_ATTEMPTS = 90  # 90 * 10s = 15 minutes max

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
MODELS_DIR = PROJECT_ROOT / "assets" / "models"
BACKUP_DIR = MODELS_DIR / "_backup_unrigged"

# Base URL for deployed models (Cloudflare Workers)
DEPLOYED_BASE_URL = "https://testai3d.eteandran.workers.dev/assets/models"

# Models to rig: name -> { filename, height_meters }
# height_meters should reflect the model's real-world height for proper rigging
MODELS_TO_RIG = {
    "fighter": {
        "filename": "fighter.glb",
        "height_meters": 1.0,  # SD/chibi character
    },
    "mage": {
        "filename": "mage.glb",
        "height_meters": 1.0,
    },
    "enemy_goblin": {
        "filename": "enemy_goblin.glb",
        "height_meters": 0.8,
    },
    "enemy_skeleton": {
        "filename": "enemy_skeleton.glb",
        "height_meters": 1.0,
    },
    "boss_dragon": {
        "filename": "boss_dragon.glb",
        "height_meters": 2.0,
    },
    # Slime is non-humanoid, rigging will likely fail. Include with fallback.
    "enemy_slime": {
        "filename": "enemy_slime.glb",
        "height_meters": 0.5,
    },
}


def poll_rigging(session, task_id):
    """Poll a rigging task until completion."""
    for attempt in range(1, MAX_POLL_ATTEMPTS + 1):
        resp = session.get(f"{RIGGING_URL}/{task_id}")
        if resp.status_code != 200:
            print(f"    Poll error: HTTP {resp.status_code}")
            time.sleep(POLL_INTERVAL)
            continue

        data = resp.json()
        status = data.get("status", "UNKNOWN")
        progress = data.get("progress", 0)
        preceding = data.get("preceding_tasks", 0)

        queue_info = f", queue: {preceding}" if preceding > 0 else ""
        print(f"    [{attempt}/{MAX_POLL_ATTEMPTS}] status={status} progress={progress}%{queue_info}")

        if status == "SUCCEEDED":
            return data
        elif status in ("FAILED", "EXPIRED", "CANCELED"):
            error_msg = data.get("task_error", {}).get("message", "Unknown error")
            raise RuntimeError(f"Rigging failed: {error_msg}")

        time.sleep(POLL_INTERVAL)

    raise TimeoutError(f"Rigging task {task_id} timed out")


def rig_model(session, name, config, use_local=False, dry_run=False):
    """Rig a single model."""
    filename = config["filename"]
    height = config["height_meters"]
    local_path = MODELS_DIR / filename

    if not local_path.exists():
        print(f"  SKIP: {filename} not found locally")
        return False

    print(f"\n{'='*50}")
    print(f"Rigging: {name} ({filename})")
    print(f"  Height: {height}m")

    if dry_run:
        print(f"  [DRY RUN] Would rig {filename}")
        return True

    # Build payload
    if use_local:
        # Use base64 data URI for local file
        print(f"  Encoding {filename} as base64...")
        with open(local_path, "rb") as f:
            data = f.read()
        b64 = base64.b64encode(data).decode("utf-8")
        model_url = f"data:model/gltf-binary;base64,{b64}"
        print(f"  Encoded ({len(data):,} bytes -> {len(b64):,} chars)")
    else:
        # Use deployed URL
        model_url = f"{DEPLOYED_BASE_URL}/{filename}"
        print(f"  Using deployed URL: {model_url}")

    payload = {
        "model_url": model_url,
        "height_meters": height,
    }

    # Create rigging task
    print(f"  Creating rigging task...")
    resp = session.post(RIGGING_URL, json=payload)
    if resp.status_code not in (200, 201, 202):
        print(f"  ERROR: HTTP {resp.status_code} - {resp.text[:200]}")
        return False

    task_id = resp.json().get("result")
    if not task_id:
        print(f"  ERROR: No task ID returned: {resp.json()}")
        return False

    print(f"  Task ID: {task_id}")

    # Poll for completion
    try:
        result = poll_rigging(session, task_id)
    except (RuntimeError, TimeoutError) as e:
        print(f"  ERROR: {e}")
        return False

    # Extract rigged GLB URL
    result_data = result.get("result", {})
    rigged_url = result_data.get("rigged_character_glb_url")
    if not rigged_url:
        print(f"  ERROR: No rigged GLB URL in result")
        print(f"  Result keys: {list(result_data.keys())}")
        return False

    # Log basic animations if available
    basic_anims = result_data.get("basic_animations", {})
    if basic_anims:
        print(f"  Basic animations available:")
        for key in basic_anims:
            if basic_anims[key]:
                print(f"    - {key}")

    # Backup original
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = BACKUP_DIR / filename
    if not backup_path.exists():
        shutil.copy2(local_path, backup_path)
        print(f"  Backed up original to {backup_path}")

    # Download rigged model
    print(f"  Downloading rigged GLB...")
    dl_resp = session.get(rigged_url, stream=True)
    if dl_resp.status_code != 200:
        print(f"  ERROR: Download failed: HTTP {dl_resp.status_code}")
        return False

    with open(local_path, "wb") as f:
        for chunk in dl_resp.iter_content(chunk_size=8192):
            f.write(chunk)

    file_size = local_path.stat().st_size
    print(f"  Downloaded rigged model: {local_path} ({file_size:,} bytes)")

    # Also download walking animation GLB if available
    walking_url = basic_anims.get("walking_glb_url")
    if walking_url:
        anim_path = MODELS_DIR / f"{name}_walk.glb"
        try:
            dl2 = session.get(walking_url, stream=True)
            if dl2.status_code == 200:
                with open(anim_path, "wb") as f:
                    for chunk in dl2.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"  Downloaded walk animation: {anim_path}")
        except Exception as e:
            print(f"  Warning: Failed to download walk animation: {e}")

    print(f"  SUCCESS: {name} rigged!")
    return True


def main():
    parser = argparse.ArgumentParser(description="Rig GLB models using Meshy API")
    parser.add_argument("--model", nargs="+", help="Specific model(s) to rig")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--use-local", action="store_true",
                        help="Upload local files via base64 instead of using deployed URLs")
    args = parser.parse_args()

    # Load API key
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    api_key = os.environ.get("MESHY_API_KEY")
    if not api_key:
        print("ERROR: MESHY_API_KEY not found")
        return 1

    # Setup session
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    })

    # Filter models
    if args.model:
        models = {k: v for k, v in MODELS_TO_RIG.items() if k in args.model}
        missing = set(args.model) - set(models.keys())
        if missing:
            print(f"Unknown models: {missing}")
            print(f"Available: {list(MODELS_TO_RIG.keys())}")
    else:
        models = MODELS_TO_RIG

    print("="*50)
    print("Dragon Nest Lite - Model Rigging")
    print("="*50)
    print(f"Models to rig: {list(models.keys())}")
    if args.dry_run:
        print("[DRY RUN MODE]")

    succeeded = []
    failed = []

    for name, config in models.items():
        ok = rig_model(session, name, config, use_local=args.use_local, dry_run=args.dry_run)
        if ok:
            succeeded.append(name)
        else:
            failed.append(name)

    # Summary
    print(f"\n{'='*50}")
    print("RIGGING SUMMARY")
    print(f"{'='*50}")
    print(f"Succeeded: {succeeded}")
    print(f"Failed: {failed}")

    # Save log
    log_path = MODELS_DIR / "_rigging_log.json"
    with open(log_path, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "succeeded": succeeded,
            "failed": failed,
        }, f, indent=2)

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
