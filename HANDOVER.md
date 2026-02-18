# Dragon Nest Lite — 引継ぎ資料

**最終更新**: 2026-02-19
**最終コミット**: `76fcc09` (Add backup unrigged models for texture restoration)
**未コミット変更**: あり（9ファイル変更、334行追加）

---

## 1. プロジェクト概要

Dragon Nestの爽快な3Dアクションを再現した**ブラウザ3DアクションRPG**。
Three.js + 純粋JavaScript（ES6モジュール）で構築。ビルドツール不要。

- **公開URL**: https://testai3d.eteandran.workers.dev
- **リポジトリ**: https://github.com/KamiHitoe1031/dragon-nest-lite.git
- **ホスティング**: Cloudflare Workers Static Assets

---

## 2. 現在のステータス

### 完了済みフェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 0 | アセット生成パイプライン | **完了** |
| Phase 1 | Three.js基盤 + 移動 + カメラ | **完了** |
| Phase 2 | 戦闘システム + 敵AI | **完了** |
| Phase 3 | スキルツリー（UI + ロジック） | **完了** |
| Phase 4 | ホームタウン + NPC | **完了** |
| Phase 5 | ダンジョン3面 + ボス | **完了** |
| Phase 6 | サウンド + エフェクト + ポリッシュ | **完了** |
| Phase 7 | セーブ + バランス調整 | **基本完了** |

### 未コミットの変更（重要）

以下の修正がワーキングツリーに残っています。コミットしてからデプロイしてください。

| ファイル | 変更内容 |
|---------|---------|
| `js/main.js` | キャラ切替時の旧メッシュ削除処理を追加 |
| `js/entities/Player.js` | WASD移動の回転行列の符号を修正 |
| `js/entities/Fighter.js` | normalAttackをslashArc→punchImpactに変更、デフォルトフォールバック修正 |
| `js/scenes/DungeonScene.js` | exit()にプレイヤーメッシュ削除を追加 |
| `js/scenes/TownScene.js` | exit()にプレイヤーメッシュ削除を追加 |
| `js/systems/AudioManager.js` | ボイスピッチ 1.35→1.55 |
| `js/systems/EffectManager.js` | スプライトシートシステム追加、punchImpact()追加、5エフェクト変換 |
| `js/utils/ModelLoader.js` | 環境モデルのmetalness/roughness補正 |
| `tools/generate_images.py` | --effectsフラグとスプライトシート生成タスク追加 |

**未追跡ファイル（新規）:**
- `assets/textures/effects/fx_*_sheet.png` × 6枚（スプライトシート画像）
- `assets/models/_rigging_log.json`
- `blog_development_summary.md`

---

## 3. アーキテクチャ

### ファイル構成

```
dragon-nest-lite/
├── index.html                 # エントリーポイント（Three.js CDN importmap含む）
├── css/style.css              # UIオーバーレイ用CSS
├── js/
│   ├── main.js                # Game クラス（568行）— ゲームループ、カメラ、シーン管理
│   ├── config.js              # 全定数（105行）— バランス値はここに集約
│   ├── entities/
│   │   ├── Player.js          # プレイヤー基底（1,253行）— 移動、攻撃、スキル発動、バフ
│   │   ├── Fighter.js         # ウォリアー固有（253行）— 通常/強攻撃、スキルエフェクトルーティング
│   │   ├── Mage.js            # ソーサレス固有（326行）— 魔法攻撃、プロジェクタイル
│   │   ├── Enemy.js           # 敵AI（657行）— パターン行動、ボス特殊AI、ドロップ
│   │   └── NPC.js             # NPC（265行）— 会話、ショップ、転職
│   ├── scenes/
│   │   ├── SceneManager.js    # シーン切替（35行）
│   │   ├── TitleScene.js      # タイトル画面（133行）— キャラ選択、セーブロード
│   │   ├── TownScene.js       # ホームタウン（302行）— NPC配置、環境
│   │   ├── DungeonScene.js    # ダンジョン（643行）— 部屋生成、敵配置、進行管理
│   │   └── ResultScene.js     # リザルト（88行）— 報酬表示
│   ├── systems/
│   │   ├── InputManager.js    # 入力管理（130行）— キーボード、マウス、ポインターロック
│   │   ├── UIManager.js       # UI制御（386行）— HUD、ダメージ表示、スキルスロット
│   │   ├── AudioManager.js    # 音声管理（153行）— BGM、SFX、ボイストグル
│   │   ├── EffectManager.js   # VFX（906行）— スプライトシート、パーティクル、全エフェクト
│   │   ├── SkillSystem.js     # スキルツリー（469行）— SP管理、転職、スキルUI
│   │   ├── CombatSystem.js    # 戦闘判定（98行）— 範囲検索、ヒット判定
│   │   └── SaveManager.js     # セーブ（70行）— localStorage
│   ├── utils/
│   │   ├── ModelLoader.js     # GLB読込（714行）— キャッシュ、アニメーション、テクスチャ復元
│   │   └── MathUtils.js       # 数学ヘルパー（71行）
│   └── data/
│       ├── skills.json        # 全56スキル定義（1,620行）★最重要データ
│       ├── dungeons.json      # ダンジョン構成（221行）
│       ├── enemies.json       # 敵ステータス（111行）
│       └── items.json         # アイテム（28行）
├── assets/                    # 全アセット（約220点）
│   ├── models/                # GLBモデル 28体
│   ├── textures/effects/      # エフェクトPNG 20枚
│   ├── ui/                    # スキルアイコン等 71枚
│   └── audio/bgm/ sfx/       # 音声 63本
├── tools/                     # Python生成スクリプト 7本
├── docs/                      # 設計ドキュメント 5本
├── build.sh                   # ビルドスクリプト（dist/にコピー）
└── wrangler.jsonc             # Cloudflare Workers設定
```

### 主要クラスの関係図

```
Game (main.js)
├── renderer, scene, camera      ← Three.js コア
├── InputManager                 ← キー/マウス入力
├── UIManager                    ← HTML/CSS HUD
├── AudioManager                 ← BGM/SFX再生
├── EffectManager                ← VFXパーティクル
├── SkillSystem                  ← スキルツリーUI+ロジック
├── CombatSystem                 ← ヒット判定
├── SaveManager                  ← localStorage
├── SceneManager                 ← シーン管理
│   ├── TitleScene
│   ├── TownScene
│   ├── DungeonScene
│   └── ResultScene
└── Player (Fighter or Mage)
    ├── normalAttack() / heavyAttack() / dodge()
    ├── _executeSkill()            ← スキル発動
    └── equippedSkills[0..3]       ← スキルスロット
```

### ゲームループ

```
Game._gameLoop()
  ├── clock.getDelta() → dt (max 50ms)
  ├── sceneManager.update(dt)
  │   └── currentScene.update(dt)
  │       ├── player.update(dt)    ← 移動、攻撃、スキルCD
  │       ├── enemies[].update(dt) ← AI、移動、攻撃
  │       └── scene固有ロジック     ← 部屋進行、NPC等
  ├── effects.update(dt)           ← VFX更新+削除
  ├── renderer.render(scene, camera)
  └── input.endFrame()
```

---

## 4. 主要システムの実装詳細

### 4-1. スキルシステム（★最重要）

- **skills.json**: 全56スキル（ウォリアー28 + ソーサレス28）
- **構造**: 基底スキル8 + 特化A列10 + 特化B列10
- **特化分岐**: ダンジョン1クリア後、NPC（スキルマスター）で2択選択
  - ウォリアー → ソードマスター or マーセナリー
  - ソーサレス → エレメンタルロード or フォースユーザー
- **SP経済**: 全MAX=140SP、最大獲得=82SP（58%）→ ビルド選択が必須
- **スキルレベル**: Lv1〜5、前提条件あり（前スキルLv + カラムSP投資量）

**スキル発動の流れ:**
```
キー入力(1-4) → Player._useSkill(slotIndex)
  → SkillSystem.useSkill(skillId) → MP消費、CD開始
  → Player._executeSkill(skillId, skillData, level)
    → Fighter/Mage 固有処理
      → ダメージ計算 + hitSpark/explosion等のVFX
```

### 4-2. 戦闘システム

**ダメージ計算式:**
```javascript
damage = attackerATK * skillMultiplier * damageVariance(±10%)
finalDamage = max(1, floor(damage - defenderDEF * 0.5))
// クリティカル: 10%確率で1.5倍
```

**範囲判定**: `CombatSystem.getEnemiesInArea(origin, direction, range, aoeType, aoeAngle)`
- `aoeType`: `circle`（全周）、`cone`（扇形）、`line`（直線）

### 4-3. VFXシステム（EffectManager）

**スプライトシートアニメーション:**
- 4x4グリッド（16フレーム）のPNGアトラス
- UVオフセットでフレーム切替: `tex.offset.set(col/4, 1-(row+1)/4)`
- `AdditiveBlending` で黒背景が自動透過

**エフェクト種類:**
| メソッド | 用途 | スプライトシート |
|---------|------|----------------|
| `slashArc()` | 斬撃 | slash_arc_sheet |
| `hitSpark()` | ヒット火花 | hit_spark_sheet |
| `explosion()` | 炎/闇爆発 | fire/dark_explosion_sheet |
| `iceExplosion()` | 氷爆発 | ice_explosion_sheet |
| `groundImpact()` | 地面衝撃 | ground_impact_sheet |
| `punchImpact()` | 拳衝撃（ウォリアー通常攻撃用） | hit_spark_sheet |
| `fireball()` | 火の弾 | なし（静的テクスチャ） |
| `auraRing()` | バフリング | なし（ジオメトリ） |

### 4-4. モデルローダー（ModelLoader）

**注意すべきポイント:**
- Meshy生成GLBのmetalness値が高い → `metalness > 0.3` を `0.1` にキャップ
- リギング後のモデルはテクスチャが消失することがある → `_backup_unrigged/` から復元
- モデルキャッシュ: `ModelLoader._cache` に一度読み込んだGLBを保持、`_cloneCached()` で複製

### 4-5. カメラシステム

- マウス右ドラッグ or ポインターロックでカメラ回転
- スクロールホイールでズーム（0.4x〜2.0x）
- `cameraPitch` で上下角度調整（-0.5〜0.5）
- Lerp補間でスムーズ追従

### 4-6. セーブ/ロード

- **キー**: `dragon_nest_lite_save`（localStorage）
- **保存タイミング**: ダンジョンクリア時、タウン退出時
- **保存内容**: クラス、レベル、EXP、SP、スキルレベル、装備スキル、インベントリ、ゴールド、クリア状況、転職先

---

## 5. 既知の問題と改善余地

### 5-1. 直近で修正済み（未コミット）

| 問題 | 修正内容 | ファイル |
|------|---------|---------|
| キャラ切替で旧モデルが残る | `scene.remove(player.mesh)` 追加 | main.js, DungeonScene.js, TownScene.js |
| WASD移動が反転 | 回転行列の符号修正 `cos-sin/sin+cos` | Player.js |
| 環境モデルが灰色 | metalness上限を0.1にキャップ | ModelLoader.js |
| ボイスが男性的 | ピッチ1.35→1.55 | AudioManager.js |
| 全エフェクトが斬撃 | punchImpact新規追加、ルーティング修正 | EffectManager.js, Fighter.js |
| エフェクトに四角背景 | スプライトシート+AdditiveBlending | EffectManager.js |

### 5-2. 今後の改善候補

| 優先度 | 項目 | 詳細 |
|-------|------|------|
| **高** | モバイル対応 | タッチ操作、バーチャルスティック、レスポンシブUI |
| **高** | アニメーション品質 | 攻撃・スキルモーションの追加（現在は一部スケールバウンスのみ） |
| **中** | パフォーマンス最適化 | 同時敵20体以上でFPS低下の可能性、オブジェクトプーリング検討 |
| **中** | ボイス追加 | ElevenLabsでキャラクターボイス生成（掛け声・被弾音声） |
| **中** | アイテムドロップ拡充 | 装備品システム（武器・防具のステータス差分） |
| **低** | マルチプレイ | Socket.io でCo-op対応（設計書にはなし） |
| **低** | 追加ダンジョン | 4面以降のコンテンツ |

### 5-3. 既知の軽微な問題

- Q/Eキーの表示数字はポーション残数だが、初見ではわかりにくい
- Meshy生成モデルの一部はテクスチャ品質にばらつきがある
- ダンジョン部屋間の遷移時に一瞬ちらつく場合がある

---

## 6. ビルドとデプロイ

### ローカル開発

```bash
# ローカルサーバーで起動（ファイルプロトコルではESモジュールが動かない）
npx serve .
# or
python -m http.server 8000
```

### Cloudflare Workersへのデプロイ

```bash
# 1. ビルド（dist/ に成果物をコピー）
bash build.sh

# 2. デプロイ
npx wrangler deploy
```

**wrangler.jsonc:**
```jsonc
{
  "name": "testai3d",
  "compatibility_date": "2026-02-18",
  "assets": {
    "directory": "./dist"
  }
}
```

### ビルドに含まれるもの

- `index.html`, `css/`, `js/`（ソースコードそのまま）
- `assets/models/*.glb`（3Dモデル）
- `assets/models/_backup_unrigged/*.glb`（テクスチャ復元用バックアップ）
- `assets/textures/`, `assets/textures/effects/`（テクスチャ）
- `assets/ui/icon_*.png`, `assets/ui/chara_*.png`（UIアイコン）
- `assets/audio/bgm/*.mp3`, `assets/audio/sfx/*.mp3`（音声）

**含まれないもの**: `tools/`, `docs/`, `.env`, `node_modules/`

---

## 7. アセット生成パイプライン

開発時のみ使用。`.env` にAPIキーが必要。

```bash
# .env に以下を設定
MESHY_API_KEY=msy_xxxxxxxx
GEMINI_API_KEY=xxxxxxxx
ELEVENLABS_API_KEY=el_xxxxxxxx
```

| スクリプト | AI | 用途 | 実行コマンド |
|-----------|-----|------|-------------|
| `tools/generate_models.py` | Meshy | 3Dモデル生成 | `python tools/generate_models.py` |
| `tools/rig_models.py` | Meshy | リギング | `python tools/rig_models.py` |
| `tools/generate_images.py` | Gemini | スキルアイコン・テクスチャ | `python tools/generate_images.py --skills --textures` |
| `tools/generate_images.py --effects` | Gemini | エフェクトスプライトシート | `python tools/generate_images.py --effects` |
| `tools/generate_effects.py` | Gemini | エフェクト静的テクスチャ | `python tools/generate_effects.py` |
| `tools/generate_bgm.py` | ElevenLabs | BGM | `python tools/generate_bgm.py` |
| `tools/generate_sounds.py` | ElevenLabs | SFX | `python tools/generate_sounds.py` |
| `tools/generate_voices.py` | ElevenLabs | キャラクターボイス | `python tools/generate_voices.py` |

---

## 8. 設計ドキュメント

| ファイル | 内容 | 参照タイミング |
|---------|------|---------------|
| `docs/01_implementation_plan.md` | 全体実装プラン | 新機能追加時 |
| `docs/02_skilltree_design.md` | 全56スキル詳細仕様 | スキル調整・追加時 |
| `docs/03_asset_list.md` | アセット一覧 | アセット追加時 |
| `docs/04_data_schemas.md` | JSONスキーマ定義 | データファイル変更時 |
| `docs/05_character_reference.md` | キャラデザインリファレンス | モデル再生成時 |

---

## 9. 主要な技術的判断と理由

### Three.js CDN利用（ビルドツールなし）

- **理由**: 開発速度優先。npm/webpack/vite不要で、ファイル単位で即反映
- **制約**: Tree shakingできないため、Three.js全体がロードされる
- **バージョン**: `three@0.168.0`（importmap で固定）

### AdditiveBlendingによるエフェクト透過

- **理由**: AI画像生成で正確な透過PNGを作るのは困難。黒背景で生成し、AdditiveBlendingで黒→透明にする方が高品質
- **制約**: 暗いエフェクト（影・暗黒系）は黒背景と区別しにくい

### Meshyモデルのmetalness補正

- **理由**: Meshy生成GLBはPBRメタルネス値が高く設定されがち。環境マップなしのシーンでは金属部分が真っ黒に見える
- **対処**: ローダーで `metalness > 0.3 → 0.1` にキャップ

### リギング後テクスチャ消失への対処

- **理由**: Meshy Rigging APIでボーン付加後、一部モデルのPBRテクスチャが失われる
- **対処**: リギング前のモデルを `_backup_unrigged/` に保持し、ロード時にテクスチャを復元

### カメラ相対移動の回転行列

- **正しい式**: `x' = x*cos - z*sin`, `z' = x*sin + z*cos`
- **注意**: 符号を間違えるとWASDが反転する。dodge方向も同じ式を使用

---

## 10. Gitコミット履歴

```
11:11  d72b1cd  Initial commit: Dragon Nest Lite - Browser 3D Action RPG
11:18  1b2cff3  Add BGM tracks and scene-specific music playback
11:21  3f3c4e5  Wire 30+ SFX into game events
11:31  1cfba1a  Apply textures, ambient SFX, and fix critical bugs
11:54  d59b0ff  Add wrangler.jsonc for Cloudflare Pages deployment
12:00  f342174  Add build script for Cloudflare Pages deployment
13:14  4ee2285  Fix wrangler.jsonc for Cloudflare Pages
13:28  77e5092  Keep wrangler.jsonc for Pages Git integration
13:35  0413403  Rename project to testai3d for Cloudflare Pages
14:00  170f57e  Switch to Workers Static Assets for deployment
14:11  e482d4a  Fix gameplay bugs and add visual polish
14:15  7d3055b  Brighten dungeons, add walk animation, add camera zoom
14:21  c23ab56  Add bone-based skeletal animation for Player and Enemy
14:41  1a897c0  Fix attack direction, add rigged models, and upgrade VFX
15:41  238f76c  Complete Phase 3: skill tree buff/debuff, status effects
16:06  fe2af08  Fix specialization lock, prop collision, boss AI, weapons
16:34  f9419ec  Fix design docs and camera rotation bug
16:39  5501932  Add win/lose BGM, register dungeon prop models
17:14  0f363fc  Fix grey models, effect transparency, voice toggle, camera
17:14  76fcc09  Add backup unrigged models for texture restoration
---    (未コミット) VFXオーバーホール、バグ修正6件、スプライトシート6枚
```

---

## 11. 次に作業する人への注意点

1. **未コミット変更を先にコミット・デプロイしてください**（9ファイル変更 + 新規6スプライトシート）
2. **`.env` はGitに含まれません** — APIキーは別途共有してもらう必要があります
3. **Three.js CDNに依存** — オフラインでは動きません。ローカルテストにはHTTPサーバーが必要です
4. **skills.json（1,620行）が最重要データ** — スキルバランス調整はここを変更
5. **config.js にバランス値が集約** — ATK、DEF、クリティカル率等の全定数
6. **ModelLoader のキャッシュ** — 同じGLBの2回目以降のロードはクローンで返却。テクスチャが消えたらバックアップ復元ロジックを確認
