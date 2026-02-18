# Dragon Nest Lite — データスキーマ定義

## 概要

ゲームデータはすべてJSONファイルとして `js/data/` に配置する。
ハードコード禁止。バランス調整はJSONの数値変更のみで行う。

---

## 1. skills.json（★最重要）

スキルツリーの完全定義。詳細は `docs/02_skilltree_design.md` を参照。

### 構造

```json
{
  "warrior": {
    "base": [ /* 基底スキル8個 */ ],
    "swordmaster": {
      "blade": [ /* 物理列5個 */ ],
      "wave": [ /* 魔法剣列5個 */ ]
    },
    "mercenary": {
      "devastation": [ /* AoE列5個 */ ],
      "warcry": [ /* バフ列5個 */ ]
    }
  },
  "sorceress": {
    "base": [ /* 基底スキル8個 */ ],
    "elementalLord": {
      "flame": [ /* 火列5個 */ ],
      "frost": [ /* 氷列5個 */ ]
    },
    "forceUser": {
      "gravity": [ /* 暗黒列5個 */ ],
      "chrono": [ /* 時空列5個 */ ]
    }
  },
  "ultimateRule": {
    "description": "両究極スキルを習得可能。ただし一方を使用すると他方もCDに入る",
    "sharedCooldownMultiplier": 1.0
  }
}
```

### スキルオブジェクト定義

```json
{
  "id": "sm_dash_slash",
  "name": "ダッシュスラッシュ",
  "nameEN": "Dash Slash",
  "column": "blade",
  "type": "active",
  "icon": "icon_sm_dash_slash",
  "maxLevel": 5,
  "spPerLevel": 2,
  "prerequisite": {
    "skillId": "w_dash",
    "level": 1
  },
  "treeSpRequirement": null,
  "cooldown": 7000,
  "mpCost": 35,
  "input": "skill_slot",
  "animation": "anim_dash_slash",
  "sfx": "sfx_slash_heavy",
  "damageType": "physical",
  "aoeType": "line",
  "aoeAngle": null,
  "range": 6,
  "levels": [
    { "level": 1, "damageMultiplier": 2.0, "hits": 3, "description": "ATK×200% 前方突進3段" },
    { "level": 2, "damageMultiplier": 2.5, "hits": 3, "description": "ATK×250%" },
    { "level": 3, "damageMultiplier": 3.0, "hits": 3, "description": "ATK×300%" },
    { "level": 4, "damageMultiplier": 3.5, "hits": 3, "description": "ATK×350%" },
    { "level": 5, "damageMultiplier": 4.0, "hits": 3, "description": "ATK×400%" }
  ]
}
```

### フィールド定義

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✅ | 一意識別子（例: `w_impact_punch`, `sm_dash_slash`） |
| `name` | string | ✅ | 日本語表示名 |
| `nameEN` | string | ✅ | 英語表示名 |
| `column` | string | ✅ | `"base"`, `"blade"`, `"wave"`, `"devastation"`, `"warcry"`, `"flame"`, `"frost"`, `"gravity"`, `"chrono"` |
| `type` | string | ✅ | `"active"`, `"passive"`, `"buff"`, `"debuff"`, `"dodge"`, `"movement"` |
| `icon` | string | ✅ | アイコンファイル名（拡張子なし） |
| `maxLevel` | number | ✅ | 最大レベル（通常5） |
| `spPerLevel` | number | ✅ | 1レベルあたりの必要SP |
| `prerequisite` | object/null | ✅ | `{ "skillId": "xxx", "level": N }` or null |
| `treeSpRequirement` | number/null | ✅ | カラム内のSP投資合計要件（究極スキルのみ。例: 15） |
| `cooldown` | number | ✅ | ミリ秒 |
| `mpCost` | number | ✅ | MP消費 |
| `input` | string | ✅ | `"left_click"`, `"right_click"`, `"left_click_chain"`, `"skill_slot"`, `"space"`, `"passive"` |
| `animation` | string | ✅ | アニメーションクリップ名 |
| `sfx` | string | ✅ | SE ファイル名 |
| `damageType` | string | — | `"physical"`, `"magical"` |
| `aoeType` | string | — | `"cone"`, `"circle"`, `"line"`, `"point"`, `"self"` |
| `aoeAngle` | number/null | — | cone型のみ。角度（度） |
| `range` | number | — | 射程（ゲーム内単位） |
| `levels` | array | ✅ | レベルごとの効果定義 |

---

## 2. enemies.json

```json
[
  {
    "id": "slime",
    "name": "スライム",
    "hp": 30,
    "atk": 8,
    "def": 2,
    "speed": 40,
    "xpValue": 10,
    "goldDrop": { "min": 5, "max": 15 },
    "behavior": "chase",
    "attackCooldown": 2000,
    "attackRange": 1.5,
    "detectionRange": 10,
    "modelKey": "enemy_slime",
    "animations": {
      "idle": "idle",
      "move": "move",
      "attack": "attack",
      "die": "die"
    },
    "sfx": {
      "attack": "sfx_enemy_hurt",
      "die": "sfx_enemy_die"
    },
    "spawnDungeons": [1, 2]
  },
  {
    "id": "goblin",
    "name": "ゴブリン",
    "hp": 60,
    "atk": 15,
    "def": 5,
    "speed": 70,
    "xpValue": 20,
    "goldDrop": { "min": 10, "max": 30 },
    "behavior": "rush_retreat",
    "attackCooldown": 1500,
    "attackRange": 2,
    "detectionRange": 12,
    "modelKey": "enemy_goblin",
    "animations": {
      "idle": "idle",
      "move": "move",
      "attack": "attack",
      "die": "die"
    },
    "spawnDungeons": [1, 2, 3]
  },
  {
    "id": "skeleton",
    "name": "スケルトン",
    "hp": 80,
    "atk": 20,
    "def": 10,
    "speed": 55,
    "xpValue": 30,
    "goldDrop": { "min": 15, "max": 40 },
    "behavior": "guard_attack",
    "attackCooldown": 2500,
    "attackRange": 2.5,
    "detectionRange": 10,
    "modelKey": "enemy_skeleton",
    "spawnDungeons": [2, 3]
  },
  {
    "id": "dragon",
    "name": "ドラゴン",
    "hp": 500,
    "atk": 40,
    "def": 20,
    "speed": 60,
    "xpValue": 200,
    "goldDrop": { "min": 100, "max": 200 },
    "behavior": "boss_dragon",
    "isBoss": true,
    "attackPatterns": [
      { "id": "rush", "damage": 50, "cooldown": 5000, "range": 8 },
      { "id": "breath", "damage": 35, "cooldown": 8000, "range": 12, "aoeType": "cone", "aoeAngle": 60 },
      { "id": "tailswipe", "damage": 30, "cooldown": 3000, "range": 4, "aoeType": "circle" }
    ],
    "modelKey": "boss_dragon",
    "spawnDungeons": [3]
  }
]
```

### behaviorタイプ

| behavior | 説明 | 使用敵 |
|----------|------|--------|
| `chase` | プレイヤーに直線移動→範囲内で攻撃 | スライム |
| `rush_retreat` | 走り寄り→殴り→後退→繰り返し | ゴブリン |
| `guard_attack` | 待機→プレイヤー接近でガード→隙に攻撃 | スケルトン |
| `boss_dragon` | 3パターンローテーション（突進→ブレス→尻尾） | ドラゴン |

---

## 3. dungeons.json

```json
{
  "dungeon_1": {
    "id": 1,
    "name": "森の洞窟",
    "nameEN": "Forest Cave",
    "theme": "forest_cave",
    "bgm": "bgm_dungeon_forest",
    "firstClearSP": 5,
    "repeatClearSP": 2,
    "onFirstClear": {
      "event": "specialization_select",
      "description": "初回クリア時にホームタウンでスキルマスターNPCが特化選択イベントを発火"
    },
    "rooms": [
      {
        "id": "d1_room_1",
        "size": { "width": 20, "depth": 15 },
        "enemies": [
          { "type": "slime", "position": [5, 0, 3] },
          { "type": "slime", "position": [8, 0, 7] },
          { "type": "slime", "position": [12, 0, 5] }
        ],
        "props": [
          { "type": "rock", "model": "env_rock_01", "position": [3, 0, 10] },
          { "type": "tree", "model": "env_tree_01", "position": [15, 0, 2] }
        ],
        "exitDoor": { "position": [10, 0, 14], "locked": true }
      },
      {
        "id": "d1_room_2",
        "size": { "width": 25, "depth": 20 },
        "enemies": [
          { "type": "slime", "position": [5, 0, 5] },
          { "type": "slime", "position": [10, 0, 10] },
          { "type": "goblin", "position": [15, 0, 8] },
          { "type": "goblin", "position": [20, 0, 12] }
        ],
        "props": [],
        "exitDoor": { "position": [12, 0, 19], "locked": true }
      },
      {
        "id": "d1_room_3",
        "size": { "width": 30, "depth": 25 },
        "enemies": [
          { "type": "slime", "position": [5, 0, 5] },
          { "type": "slime", "position": [10, 0, 5] },
          { "type": "slime", "position": [15, 0, 5] },
          { "type": "goblin", "position": [20, 0, 10] },
          { "type": "goblin", "position": [25, 0, 15] }
        ],
        "chest": { "position": [15, 0, 20], "rewards": { "gold": [50, 100] } },
        "exitDoor": null
      }
    ]
  },
  "dungeon_2": {
    "id": 2,
    "name": "古代遺跡",
    "nameEN": "Ancient Ruins",
    "theme": "ruins",
    "bgm": "bgm_dungeon_ruins",
    "firstClearSP": 7,
    "repeatClearSP": 2,
    "rooms": [
      {
        "id": "d2_room_1",
        "size": { "width": 20, "depth": 15 },
        "enemies": [
          { "type": "goblin", "position": [5, 0, 5] },
          { "type": "goblin", "position": [10, 0, 8] },
          { "type": "skeleton", "position": [15, 0, 5] }
        ],
        "props": [
          { "type": "pillar", "model": "env_ruins_pillar", "position": [7, 0, 3] },
          { "type": "pillar", "model": "env_ruins_pillar", "position": [13, 0, 3] }
        ],
        "exitDoor": { "position": [10, 0, 14], "locked": true }
      }
    ]
  },
  "dungeon_3": {
    "id": 3,
    "name": "遺跡最深部",
    "nameEN": "Ruins Depths",
    "theme": "boss_lair",
    "bgm": "bgm_dungeon_ruins",
    "bossBgm": "bgm_boss",
    "firstClearSP": 10,
    "repeatClearSP": 2,
    "rooms": [
      {
        "id": "d3_boss",
        "size": { "width": 40, "depth": 40 },
        "isBossRoom": true,
        "enemies": [
          { "type": "dragon", "position": [20, 0, 30] }
        ],
        "props": [],
        "exitDoor": null
      }
    ]
  }
}
```

---

## 4. items.json

```json
{
  "consumables": [
    {
      "id": "potion_hp",
      "name": "HPポーション",
      "description": "HP 50回復",
      "cost": 50,
      "effect": { "type": "heal_hp", "value": 50 },
      "icon": "icon_potion_hp",
      "model": "item_potion_hp"
    },
    {
      "id": "potion_mp",
      "name": "MPポーション",
      "description": "MP 30回復",
      "cost": 30,
      "effect": { "type": "heal_mp", "value": 30 },
      "icon": "icon_potion_mp",
      "model": "item_potion_mp"
    }
  ],
  "weaponUpgrade": {
    "costPerLevel": [100, 200, 400, 800, 1600],
    "atkBonusPerLevel": 5,
    "matkBonusPerLevel": 5,
    "maxLevel": 5
  }
}
```

---

## 5. savedata 構造（localStorage）

キー: `dragon_nest_lite_save`

### 初期状態（新規セーブ）

```json
{
  "selectedClass": "warrior",
  "specialization": null,
  "level": 1,
  "exp": 0,
  "gold": 0,
  "skillPoints": 0,
  "totalSpEarned": 0,
  "skillLevels": {},
  "equippedSkills": [],
  "stats": {
    "maxHP": 100,
    "maxMP": 50,
    "atk": 15,
    "def": 10,
    "matk": 10,
    "mdef": 8
  },
  "weaponLevel": 0,
  "dungeonsCleared": {
    "1": { "cleared": false, "clearCount": 0, "bestTime": null },
    "2": { "cleared": false, "clearCount": 0, "bestTime": null },
    "3": { "cleared": false, "clearCount": 0, "bestTime": null }
  },
  "inventory": {
    "potion_hp": 3,
    "potion_mp": 1
  }
}
```

> **`specialization: null`** = 未選択状態。ダンジョン1初回クリア後にスキルマスターNPCが
> 特化選択イベントを発火し、選択後に `"swordmaster"` / `"mercenary"` / `"elementalLord"` / `"forceUser"` が設定される。
> **nullの間は特化スキルツリーがロックされ、基底8スキルのみ使用可能。**

### 進行後の例

```json
{
  "selectedClass": "warrior",
  "specialization": "swordmaster",
  "level": 5,
  "exp": 1200,
  "gold": 3500,
  "skillPoints": 4,
  "totalSpEarned": 40,
  "skillLevels": {
    "w_impact_punch": 3,
    "w_tumble": 3,
    "w_physical_mastery": 3,
    "sm_dash_slash": 3,
    "sm_triple_slash": 3,
    "sm_line_drive": 2,
    "sm_moonlight_splitter": 2
  },
  "equippedSkills": ["sm_dash_slash", "sm_triple_slash", "sm_line_drive", "sm_moonlight_splitter"],
  "stats": {
    "maxHP": 150,
    "maxMP": 80,
    "atk": 25,
    "def": 15,
    "matk": 10,
    "mdef": 12
  },
  "weaponLevel": 3,
  "dungeonsCleared": {
    "1": { "cleared": true, "clearCount": 3, "bestTime": 180 },
    "2": { "cleared": true, "clearCount": 2, "bestTime": 240 },
    "3": { "cleared": false, "clearCount": 0, "bestTime": null }
  },
  "inventory": {
    "potion_hp": 5,
    "potion_mp": 3
  }
}
```

---

## バランス調整の基準値

```
プレイヤー基礎HP: 100
プレイヤー基礎ATK: 15
プレイヤー基礎DEF: 10
プレイヤー基礎MATK: 15（ソーサレス）
1秒あたりの通常攻撃DPS: 約15
1ダンジョンの想定クリア時間: 3〜5分
```

| 敵 | 撃破時間目安 | 被ダメ/秒 |
|----|------------|----------|
| Slime | 2秒 | 4 |
| Goblin | 4秒 | 7.5 |
| Skeleton | 6秒 | 10 |
| Dragon（ボス） | 60-90秒 | 20 |
