# Dragon Nest Lite — アセット一覧

## 概要

すべてのアセットは**開発時にAPI/ツールで生成**し、静的ファイルとして配置する。
ランタイムでのAPI呼び出しは一切なし。

### アートスタイル

- **SDデフォルメ（2〜3頭身）× ローポリ**
- リアル等身は不採用。かわいい＋ファンタジーの統一感
- Meshy生成時は全プロンプトに `chibi, super deformed, 2.5 head ratio, low poly, game asset, cute stylized` を含める
- `model_type: "lowpoly"` + `ai_model: "latest"`（Meshy-6-preview）を使用

---

## 1. 3Dモデル（Meshy API生成 → assets/models/）

### キャラクター（リギング+アニメーション必須）

| モデル名 | ファイル名 | 生成方式 | 入力 | target_polycount | 必要アニメーション |
|---------|-----------|---------|------|-----------------|-----------------|
| ウォリアー | `fighter.glb` | **Image-to-3D** | `Mia_SD.jpg` → Gemini衣装変換 → Meshy | 5,000 | idle, walk, run, attack1, attack2, skill, hit, die |
| ソーサレス | `mage.glb` | **Image-to-3D** | `Haru_SD.jpg` → Gemini衣装変換 → Meshy | 5,000 | idle, walk, run, cast1, cast2, skill, hit, die |
| スライム | `enemy_slime.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 3,000 | idle, move, attack, die |
| ゴブリン | `enemy_goblin.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 3,000 | idle, move, attack, die |
| スケルトン | `enemy_skeleton.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 3,000 | idle, move, attack, die |
| ドラゴン（ボス） | `boss_dragon.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 8,000 | idle, move, attack, breath, die |

### NPC（リギング+idleアニメのみ）

| モデル名 | ファイル名 | 生成方式 | 入力 | target_polycount | アニメ |
|---------|-----------|---------|------|-----------------|-------|
| 鍛冶屋 | `npc_blacksmith.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 3,000 | idle |
| スキルマスター | `npc_skillmaster.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 3,000 | idle |
| ポーション屋 | `npc_potion.glb` | **Image-to-3D** | Geminiでコンセプト画生成 → Meshy | 3,000 | idle |

### 環境オブジェクト（リギング不要、Text-to-3Dで生成）

| モデル名 | ファイル名 | プロンプト案 | target_polycount |
|---------|-----------|-------------|-----------------|
| 木（バリエーション） | `env_tree_01.glb` 〜 `03` | "stylized cute fantasy tree, low poly, solid colors" | 1,000 |
| 岩 | `env_rock_01.glb` 〜 `02` | "stylized mossy rock, low poly, solid colors" | 1,000 |
| 家 | `env_house_01.glb` 〜 `02` | "cute medieval house, low poly, fantasy village" | 1,000 |
| ダンジョン壁 | `env_dungeon_wall.glb` | "stone dungeon wall tile, low poly, dark" | 500 |
| ダンジョン床 | `env_dungeon_floor.glb` | "stone dungeon floor tile, low poly" | 500 |
| 森の洞窟壁 | `env_cave_wall.glb` | "mossy cave wall, vines, low poly, stylized" | 500 |
| 遺跡柱 | `env_ruins_pillar.glb` | "crumbling ancient pillar, low poly, stylized" | 500 |
| 扉 | `env_door.glb` | "medieval dungeon door, iron, low poly" | 500 |

### アイテム・小物（リギング不要）

| モデル名 | ファイル名 | プロンプト案 |
|---------|-----------|-------------|
| 宝箱 | `item_chest.glb` | "treasure chest, low poly fantasy" |
| HPポーション | `item_potion_hp.glb` | "red health potion bottle, low poly" |
| MPポーション | `item_potion_mp.glb` | "blue mana potion bottle, low poly" |
| 金貨（ドロップ用） | `item_gold.glb` | "gold coin, low poly, spinning" |

**合計: 約25モデル**

---

## 2. UI画像（Gemini生成 → assets/ui/）

### スキルアイコン（64×64px、PNG透過）

**ウォリアー基底**

| アイコン名 | ファイル名 | プロンプト案 |
|-----------|-----------|-------------|
| インパクトパンチ | `icon_w_impact_punch.png` | "game skill icon, fist punch impact, golden glow, dark bg, 64x64" |
| ヘビースラッシュ | `icon_w_heavy_slash.png` | "game skill icon, heavy sword downward slash, dark bg" |
| ライジングスラッシュ | `icon_w_rising_slash.png` | "game skill icon, upward sword slash, launch effect" |
| タンブル | `icon_w_tumble.png` | "game skill icon, dodge roll, motion blur" |
| エアリアルイベイジョン | `icon_w_aerial_evasion.png` | "game skill icon, aerial recovery, wings" |
| ダッシュ | `icon_w_dash.png` | "game skill icon, speed dash, wind trail" |
| フィジカルマスタリー | `icon_w_physical_mastery.png` | "game skill icon, muscle power up, red aura, passive" |
| メンタルマスタリー | `icon_w_mental_mastery.png` | "game skill icon, mental energy, blue aura, passive" |

**ソードマスター（10スキル）、マーセナリー（10スキル）** — 同様の形式で各スキルのアイコン

**ソーサレス基底（8スキル）、エレメンタルロード（10スキル）、フォースユーザー（10スキル）** — 同様

**合計: 56アイコン**（クラス2種×28スキル）

### UIフレーム・パーツ

| 要素 | ファイル名 | サイズ | プロンプト案 |
|------|-----------|--------|-------------|
| HPバー背景 | `ui_hp_bar_bg.png` | 256×32px | "fantasy health bar frame, ornate, red" |
| HPバー中身 | `ui_hp_bar_fill.png` | 252×28px | "red health bar fill, gradient" |
| MPバー背景 | `ui_mp_bar_bg.png` | 256×32px | "fantasy mana bar frame, ornate, blue" |
| MPバー中身 | `ui_mp_bar_fill.png` | 252×28px | "blue mana bar fill, gradient" |
| スキルスロット枠 | `ui_skill_slot.png` | 64×64px | "fantasy skill slot frame, ornate border" |
| スキルスロット枠(CD) | `ui_skill_slot_cd.png` | 64×64px | "fantasy skill slot frame, dark, cooldown" |
| ダイアログボックス | `ui_dialog_box.png` | 512×256px | "medieval parchment dialog box, game UI" |
| ミニマップ枠 | `ui_minimap_frame.png` | 200×200px | "ornate minimap border, fantasy game UI" |
| スタートボタン | `ui_btn_start.png` | 200×60px | "fantasy game start button, golden" |
| スキルツリー背景 | `ui_skilltree_bg.png` | 1024×768px | "dark parchment skill tree background, fantasy" |
| タブ（選択中） | `ui_tab_active.png` | 150×40px | "fantasy tab button, active, glowing" |
| タブ（非選択） | `ui_tab_inactive.png` | 150×40px | "fantasy tab button, inactive, dark" |

### 背景・テクスチャ

| 要素 | ファイル名 | サイズ | プロンプト案 |
|------|-----------|--------|-------------|
| タイトル画面 | `bg_title.png` | 1920×1080px | "dark fantasy castle, dragon silhouette, moonlit" |
| タウンスカイボックス | `bg_town_sky.png` | 2048×1024px | "fantasy village sky, sunset, peaceful" |
| ダンジョンスカイボックス | `bg_dungeon.png` | 2048×1024px | "dark dungeon cave background, torch light" |
| 草地テクスチャ | `tex_grass.png` | 512×512px | "seamless grass texture, top down, painterly" |
| 石畳テクスチャ | `tex_cobblestone.png` | 512×512px | "seamless cobblestone texture, medieval" |
| ダンジョン床テクスチャ | `tex_dungeon_floor.png` | 512×512px | "seamless dark stone floor texture" |
| 遺跡壁テクスチャ | `tex_ruins_wall.png` | 512×512px | "seamless ancient stone wall, glowing runes" |

---

## 3. 音声素材

### ボイス（ElevenLabs API生成 → assets/audio/voice/）

| 内容 | ファイル名 | ボイスタイプ |
|------|-----------|------------|
| 鍛冶屋挨拶 | `voice_blacksmith_greet.mp3` | 低い男性声 |
| 鍛冶屋強化完了 | `voice_blacksmith_done.mp3` | 低い男性声 |
| スキルマスター挨拶 | `voice_skillmaster_greet.mp3` | 老人声 |
| スキルマスター分岐 | `voice_skillmaster_choose.mp3` | 老人声 |
| ポーション屋挨拶 | `voice_potion_greet.mp3` | 明るい女性声 |
| ダンジョン導入 | `voice_narrator_dungeon.mp3` | ナレーション |
| ウォリアー掛け声×3 | `voice_fighter_atk_01〜03.mp3` | 男性戦士 |
| ソーサレス詠唱×3 | `voice_mage_cast_01〜03.mp3` | 女性魔法使い |
| ドラゴン咆哮 | `voice_dragon_roar.mp3` | モンスター |

### BGM（魔王魂 → assets/audio/bgm/ ※クレジット必須）

| 用途 | ファイル名 | 選定方向 |
|------|-----------|---------|
| タイトル画面 | `bgm_title.mp3` | 壮大・ファンタジー系 |
| タウン | `bgm_town.mp3` | 穏やか・日常系 |
| ダンジョン1（森の洞窟） | `bgm_dungeon_forest.mp3` | 探索系・緊張感控えめ |
| ダンジョン2（古代遺跡） | `bgm_dungeon_ruins.mp3` | 緊張系・ミステリアス |
| ボス戦 | `bgm_boss.mp3` | 激しいバトル系 |
| リザルト（勝利） | `bgm_result_win.mp3` | 達成感・ファンファーレ |
| リザルト（敗北） | `bgm_result_lose.mp3` | 静か・リトライ促す |

### SE（効果音ラボ → assets/audio/sfx/ ※クレジット不要）

| 用途 | ファイル名 | 説明 |
|------|-----------|------|
| 剣攻撃 | `sfx_slash_01〜03.mp3` | 3バリエーション |
| 重い斬撃 | `sfx_slash_heavy.mp3` | ヘビースラッシュ等 |
| 魔法弾発射 | `sfx_magic_fire.mp3` | |
| 魔法着弾 | `sfx_magic_hit.mp3` | |
| 炎系スキル | `sfx_fire.mp3` | |
| 氷系スキル | `sfx_ice.mp3` | |
| ダメージ（プレイヤー） | `sfx_player_hurt.mp3` | |
| ダメージ（敵） | `sfx_enemy_hurt.mp3` | |
| 敵死亡 | `sfx_enemy_die.mp3` | |
| 回避 | `sfx_dodge.mp3` | |
| レベルアップ | `sfx_levelup.mp3` | |
| SPポイント取得 | `sfx_sp_get.mp3` | |
| スキル習得 | `sfx_skill_learn.mp3` | |
| UIボタン | `sfx_ui_click.mp3` | |
| 宝箱オープン | `sfx_chest_open.mp3` | |
| ゴールド取得 | `sfx_gold.mp3` | |
| ポーション使用 | `sfx_potion.mp3` | |
| 扉開閉 | `sfx_door.mp3` | |
| 究極スキル発動 | `sfx_ultimate.mp3` | 特別感のある音 |

---

## 4. Meshy APIによる生成フロー

### キャラクター・敵・NPC（Image-to-3D）★推奨

```
Step 0: 参照画像を用意
  - プレイヤー → assets/reference/ のSD画像をGeminiでファンタジー衣装に変換
  - 敵/NPC → Geminiでコンセプト画を新規生成
  → 変換/生成した画像を assets/reference_fantasy/ に保存
  ↓
Step 1: Meshy Image-to-3D（変換後の画像を入力）
  ↓
Step 2: Refine（高品質化）
  ↓
Step 3: Rigging（リグ付け）← ヒューマノイドモデルのみ
  ↓ → 歩行/走行アニメ自動生成
Step 4: Animation（追加アニメ適用）
  ↓ → Meshy Animation Library から action_id 指定
Step 5: GLBダウンロード → assets/models/ に配置
```

### 環境オブジェクト・武器・アイテム（Text-to-3D）

```
Step 1: Meshy Text-to-3D（テキストプロンプトのみ）
  ↓
Step 2: Refine（高品質化）
  ↓
Step 3: GLBダウンロード → assets/models/ に配置
```

**★重要**: プレイヤーキャラは必ず `docs/05_character_reference.md` の参照画像を使い、
Geminiで衣装変換してからMeshy Image-to-3Dに入力すること。Text-to-3D単独での生成は禁止。

---

## 5. 生成優先度

| 優先度 | カテゴリ | 理由 |
|--------|---------|------|
| **P0（最優先）** | ウォリアー、ソーサレス、スライム | Phase 1-2のテストに必須 |
| **P1** | ゴブリン、スケルトン、ドラゴン | Phase 2 戦闘テストに必要 |
| **P1** | HP/MPバー、スキルスロット | Phase 2-3 UIに必要 |
| **P2** | NPC 3体、環境オブジェクト | Phase 4-5 で使用 |
| **P2** | スキルアイコン56枚 | Phase 3 スキルツリーUIで使用 |
| **P3** | BGM/SE、ボイス | Phase 6 ポリッシュで使用 |
