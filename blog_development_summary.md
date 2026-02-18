# Dragon Nest Lite — AI駆動ブラウザ3DアクションRPG 開発記録

## 概要

**Dragon Nest Lite**は、人気オンラインゲーム「Dragon Nest」の爽快な3Dアクションを再現した**ブラウザ3DアクションRPG**です。このプロジェクトは**1日（約7時間）**で、**複数のAIツールを組み合わせて**ゼロからプレイアブルなゲームを完成させました。

- **公開URL**: https://testai3d.eteandran.workers.dev
- **開発期間**: 2026年2月18日 11:00〜18:00（約7時間）
- **コード量**: JavaScript 7,625行 / 21ファイル
- **総アセット数**: 約220点（3Dモデル・画像・音声）

---

## 使用したAIツール一覧

| AIツール | 用途 | 生成物 |
|---------|------|--------|
| **Claude Code（Claude Opus 4.6）** | コード生成・設計・デバッグ全般 | JS 7,625行、JSON 1,980行、設計書5本 |
| **Meshy API（Meshy-6-preview）** | 3Dモデル生成（Text-to-3D / Image-to-3D） | GLBモデル 28体 + リギング済みモデル |
| **Gemini（gemini-3-pro-image-preview）** | 2D画像生成（UI・テクスチャ・エフェクト） | PNG画像 約97枚（アイコン71 + テクスチャ26） |
| **ElevenLabs** | BGM・効果音生成 | MP3ファイル 63本（BGM 6 + SFX 57） |

---

## 完成したゲームの内容

### ゲームシステム
- **2キャラクター**: ウォリアー（近接物理）/ ソーサレス（遠距離魔法）
- **各4つの転職先**: ソードマスター / マーセナリー / エレメンタルロード / フォースユーザー
- **56種類のスキル**: 各クラス28スキル（基底8 + 特化A10 + 特化B10）のスキルツリー
- **3つのダンジョン**: 森の洞窟 → 古代遺跡 → ドラゴンボス戦
- **ホームタウン**: NPC（鍛冶屋・ポーション屋・スキルマスター）
- **装備・アイテムシステム**: ドロップ、ポーション、ゴールド
- **セーブ/ロード**: localStorageによる永続化

### 操作体系
- WASD移動、マウスでカメラ回転
- 左クリック通常攻撃、右クリック強攻撃
- 1〜4キーでスキル発動、Spaceで回避
- Tabでスキルツリー画面

---

## 開発タイムライン（時系列）

### Phase 1: 基盤構築とアセット生成（11:00〜11:30）

#### 1-1. 設計ドキュメント作成（Claude Code）

最初にClaude Codeで5本の設計ドキュメントを作成しました。

| ドキュメント | 内容 |
|-------------|------|
| `01_implementation_plan.md` | 全体アーキテクチャ、Phase 0〜7の実装計画 |
| `02_skilltree_design.md` | 全56スキルの詳細仕様、SP経済、ビルド例 |
| `03_asset_list.md` | 必要な3Dモデル・画像・音声の一覧 |
| `04_data_schemas.md` | JSONデータの完全スキーマ定義 |
| `05_character_reference.md` | キャラクターデザインの方向性 |

#### 1-2. ゲームコア実装（Claude Code）

Three.jsベースの3Dゲームエンジンをゼロから構築しました。

**主要ファイルと行数:**

| ファイル | 行数 | 役割 |
|---------|------|------|
| `Player.js` | 1,253行 | プレイヤー基底クラス（移動・攻撃・スキル発動・回避） |
| `EffectManager.js` | 906行 | VFXシステム（スプライトシート・パーティクル） |
| `ModelLoader.js` | 714行 | GLB読み込み・キャッシュ・アニメーション管理 |
| `Enemy.js` | 657行 | 敵AI・ボスAI・パターン行動 |
| `DungeonScene.js` | 643行 | ダンジョン部屋生成・敵配置・進行管理 |
| `main.js` | 568行 | エントリーポイント・ゲームループ |
| `SkillSystem.js` | 469行 | スキルツリーUI・SP管理・スキルロック |
| `UIManager.js` | 386行 | HP/MPバー・ダメージ数字・スキルスロット |

#### 1-3. ゲームデータ作成（Claude Code）

JSONデータファイルも全てAIで生成しました。

| ファイル | 行数 | 内容 |
|---------|------|------|
| `skills.json` | 1,620行 | 全56スキルの詳細定義（ダメージ倍率・範囲・CD・Lv1〜5データ） |
| `dungeons.json` | 221行 | 3ダンジョン×複数部屋の敵配置・環境構成 |
| `enemies.json` | 111行 | 敵5種（スライム・ゴブリン・スケルトン・オーク・ドラゴン）のステータス |
| `items.json` | 28行 | アイテムデータ |

#### 1-4. BGM生成（ElevenLabs）

Pythonスクリプト `generate_bgm.py` でBGMを一括生成しました。

| ファイル | シーン | 雰囲気 |
|---------|--------|--------|
| `bgm_title.mp3` | タイトル画面 | 壮大・ファンタジー |
| `bgm_town.mp3` | ホームタウン | 穏やか・平和 |
| `bgm_dungeon_forest.mp3` | 森の洞窟 | 緊張・探索 |
| `bgm_dungeon_ruins.mp3` | 古代遺跡 | 神秘・緊迫 |
| `bgm_boss.mp3` | ボス戦 | 激しい・アドレナリン |
| `bgm_result.mp3` | リザルト画面 | 達成感 |

#### 1-5. 効果音生成（ElevenLabs）

`generate_sounds.py` で57種類のSFXを生成しました。

**生成した効果音の例:**
- 戦闘系: `sfx_sword_slash_01/02`, `sfx_sword_heavy`, `sfx_fireball`, `sfx_ice_freeze`, `sfx_fire_explosion`
- 環境系: `sfx_footstep_grass`, `sfx_footstep_stone`, `sfx_door_open`, `sfx_chest_open`
- アンビエント: `sfx_ambient_cave`, `sfx_ambient_ruins`, `sfx_ambient_town`
- ボス系: `sfx_dragon_roar`, `sfx_dragon_breath`, `sfx_dragon_stomp`, `sfx_boss_intro`
- UI系: `sfx_gold_pickup`, `sfx_equip`, `sfx_heal`, `sfx_buff`, `sfx_dungeon_clear`
- キャラ系: `sfx_player_hurt`, `sfx_player_death`, `sfx_dodge_roll`

---

### Phase 2: 3Dモデル生成（Meshy API）

#### 2-1. 3Dモデル生成スクリプト（Claude Code + Meshy API）

`generate_models.py` でMeshy APIを使い、全3Dモデルを一括生成しました。

**Meshy APIの設定:**
```python
{
    "ai_model": "latest",          # Meshy-6-preview
    "model_type": "lowpoly",       # ローポリモード
    "should_texture": True,
    "enable_pbr": True,            # PBRマップ生成
    "target_polycount": 3000-8000  # アセット種別による
}
```

**生成した3Dモデル一覧（28体）:**

| カテゴリ | モデル名 | ポリゴン目安 |
|---------|----------|------------|
| **プレイヤー** | `fighter.glb`（ウォリアー）, `mage.glb`（ソーサレス） | 5,000 |
| **歩行アニメ** | `fighter_walk.glb`, `mage_walk.glb` | 5,000 |
| **敵キャラ** | `enemy_slime.glb`, `enemy_goblin.glb`, `enemy_skeleton.glb` | 3,000 |
| **敵歩行** | `enemy_goblin_walk.glb` | 3,000 |
| **ボス** | `boss_dragon.glb` | 8,000 |
| **NPC** | `npc_blacksmith.glb`, `npc_potion.glb`, `npc_skillmaster.glb` | 3,000 |
| **環境** | `env_tree_01/02/03.glb`, `env_rock_01/02.glb`, `env_cave_wall.glb` | 1,000 |
| **建物** | `env_house_01/02.glb`, `env_door.glb` | 1,000 |
| **ダンジョン** | `env_dungeon_wall.glb`, `env_dungeon_floor.glb`, `env_ruins_pillar.glb` | 1,000 |
| **アイテム** | `item_chest.glb`, `item_gold.glb`, `item_potion_hp/mp.glb` | 500 |

#### 2-2. リギング（Meshy Rigging API）

キャラクターモデルにはMeshyのRigging APIで自動ボーン設定を適用しました。

`rig_models.py` で以下のモデルをリギング:
- `fighter.glb` → ボーン付きTポーズ
- `mage.glb` → ボーン付きTポーズ
- `enemy_goblin.glb` → 歩行アニメーション用

**発見した問題**: リギング後のモデルはPBRテクスチャが失われることがある。対策として、リギング前のモデルをバックアップとして保持し、テクスチャ復元に使用する仕組みを実装しました。

---

### Phase 3: 2D画像生成（Gemini gemini-3-pro-image-preview）

#### 3-1. スキルアイコン生成（71枚）

`generate_images.py` でGemini APIを使い、スキルアイコンを一括生成しました。

**プロンプトのテンプレート:**
```
game skill icon, fantasy RPG style, [スキル名と説明],
vibrant colors, dark background, clean edges,
64x64, no text, centered composition
```

**生成したスキルアイコンの例:**
- ウォリアー系: `icon_dash_slash.png`, `icon_cyclone_slash.png`, `icon_demolition_fist.png`
- ソーサレス系: `icon_fireball.png`, `icon_flame_wall.png`, `icon_blizzard_storm.png`
- 共通系: `icon_dash.png`, `icon_fortress.png`, `icon_battle_howl.png`

#### 3-2. エフェクトテクスチャ生成（20枚）

静的エフェクトテクスチャとスプライトシートの2種類を生成しました。

**静的テクスチャ（14枚）:**
- `fx_slash_arc.png` — 斬撃エフェクト
- `fx_fire_explosion.png` — 炎爆発
- `fx_ice_explosion.png` — 氷爆発
- `fx_fireball.png` — ファイアボール弾
- `fx_magic_circle.png` — 魔法陣
- `fx_buff_aura.png` — バフオーラ
- その他: `fx_dark_orb.png`, `fx_frost_ring.png`, `fx_hit_spark.png`, etc.

**スプライトシート（6枚、4x4グリッド = 16フレーム）:**

| ファイル | エフェクト | 説明 |
|---------|----------|------|
| `fx_fire_explosion_sheet.png` | 炎爆発 | 点火→炎→消散の16フレーム |
| `fx_hit_spark_sheet.png` | ヒット火花 | フラッシュ→スターバースト→フェード |
| `fx_ice_explosion_sheet.png` | 氷爆発 | 結晶→破片→霜フェード |
| `fx_dark_explosion_sheet.png` | 闇爆発 | 歪み→触手→崩壊 |
| `fx_slash_arc_sheet.png` | 斬撃アーク | エネルギー線→三日月→残光 |
| `fx_ground_impact_sheet.png` | 地面衝撃 | 衝撃→リング→粉塵 |

**スプライトシートのプロンプト戦略:**
```
4x4 grid sprite sheet, 1024x1024, 16 frames 256x256 each,
pure black background, [エフェクトの説明],
game VFX, stylized, vibrant glowing colors, no text, no labels
```

> **重要な技術ポイント**: スプライトシートの背景は**黒**で生成します。Three.jsの`AdditiveBlending`モードで描画すると、黒い部分が自然に透明になります。透過PNGを生成するよりも、この方法の方がAI画像生成では圧倒的に高品質な結果が得られます。

#### 3-3. 環境テクスチャ（4枚）

- `tex_grass.png` — 草地テクスチャ
- `tex_cobblestone.png` — 石畳
- `tex_dungeon_floor.png` — ダンジョン床
- `tex_ruins_wall.png` — 遺跡壁

#### 3-4. 背景・UI画像

- `bg_title.png` — タイトル画面背景
- `bg_dungeon.png` — ダンジョン背景
- `bg_town_sky.png` — ホームタウン空
- `chara_haru.png` — ソーサレス立ち絵（キャラ選択画面用）
- `chara_mia.png` — ウォリアー立ち絵（キャラ選択画面用）

---

### Phase 4: 組み立て・統合（11:30〜14:00）

#### 4-1. オーディオ統合

- BGM 6曲をシーンごとに自動再生（タイトル・タウン・ダンジョン・ボス・リザルト）
- SFX 57種を30以上のゲームイベントに配線（攻撃・被弾・スキル・環境音など）
- アンビエントSFX（洞窟・遺跡・タウン）をシーンに合わせてループ再生
- ボイスのピッチ調整（1.55倍で女性的な音声に）

#### 4-2. テクスチャ・マテリアル適用

- 環境テクスチャを地面・壁に適用
- エフェクトテクスチャをVFXシステムに統合
- 3Dモデルのマテリアル修正（Meshy生成モデルのメタルネス問題に対処）

#### 4-3. 初回デプロイ（Cloudflare Workers）

- ビルドスクリプト `build.sh` で `dist/` ディレクトリに成果物をパッケージング
- Cloudflare Workers Static Assets としてデプロイ
- URL: `https://testai3d.eteandran.workers.dev`

---

### Phase 5: 機能追加とバグ修正（14:00〜16:00）

#### 5-1. スケルタルアニメーション実装

- ボーンベースの歩行アニメーション（プレイヤー・敵）
- Meshyリギング済みモデルからAnimationClipを抽出して再生
- 待機時の呼吸アニメーション（スケールで擬似表現）

#### 5-2. スキルツリー完全実装

- バフ/デバフスキルの効果処理（攻撃力UP・防御力UP・速度UP等）
- ステータスエフェクトシステム（燃焼・凍結・暗黒ダメージ等）
- 転職システム（ダンジョン1クリア後にスキルマスターNPCから2択分岐）
- SP経済バランス（全スキルMAXに140SP必要、最大獲得82SP = 58%）

#### 5-3. ボスAI改良

- ドラゴンボスのパターン行動（ブレス・ストンプ・テイルスイープ・チャージ）
- フェーズ遷移（HP50%以下で攻撃パターン変化）

#### 5-4. 武器モデルとプロップ

- 武器の装備ビジュアル
- ダンジョン内のプロップオブジェクト（岩・柱・樽など）の配置と当たり判定

---

### Phase 6: VFXオーバーホール（16:00〜17:15）

#### 6-1. スプライトシートアニメーションシステム

Three.jsでスプライトシートアニメーションを実装しました。

**技術的アプローチ:**
```javascript
// テクスチャのUVオフセットでフレームを切り替え
texture.repeat.set(1 / cols, 1 / rows);  // 1フレーム分のUV範囲
const col = frameIndex % cols;
const row = Math.floor(frameIndex / cols);
texture.offset.set(col / cols, 1 - (row + 1) / rows);
```

- 6種類のスプライトシート（各4x4 = 16フレーム）
- `AdditiveBlending`で黒背景を自然に透過
- 既存5エフェクトをスプライトシートアニメーションにアップグレード
- フォールバック: スプライトシートがなければ静的テクスチャ → ジオメトリ

#### 6-2. 新エフェクト追加: punchImpact()

ウォリアーの通常攻撃（Impact Punch）用に、斬撃とは異なる**拳衝撃エフェクト**を新規作成。
- 放射状のショックウェーブバースト
- 拡大するトーラスリング + 8方向パーティクル

#### 6-3. クリティカルバグ修正

| バグ | 原因 | 修正 |
|-----|------|------|
| キャラ切替で旧モデルが残る | 新Player作成時に旧meshをsceneから未削除 | `scene.remove(player.mesh)` を追加 |
| WASD移動が反転 | カメラ相対の回転行列の符号が逆 | `cos-sin/sin+cos` に修正 |
| 環境モデルが灰色 | Meshy GLBのmetalness値が高すぎ | metalness上限を0.1にキャップ |
| ボイスが男性的 | ピッチ倍率1.35xでは不十分 | 1.55xに変更 |
| 全エフェクトが斬撃 | Fighter.normalAttackがslashArcを呼出 | punchImpactに変更 |

---

### Phase 7: 最終ビルド・デプロイ（17:15〜18:00）

- 全修正を統合してビルド
- Cloudflare Workersに再デプロイ
- 動作確認

---

## 技術スタック

| 技術 | 用途 |
|------|------|
| **Three.js** | 3D描画エンジン（CDN読み込み） |
| **JavaScript（ES6+）** | ゲームロジック（ビルドツールなし、純粋ESモジュール） |
| **HTML/CSS** | UIオーバーレイ（HP/MPバー、スキルスロット等） |
| **JSON** | ゲームデータ（スキル・敵・ダンジョン定義） |
| **localStorage** | セーブデータ永続化 |
| **Cloudflare Workers** | ホスティング・デプロイ |
| **Python** | アセット生成スクリプト（開発時のみ） |

---

## AI活用のポイントと学び

### 1. Claude Codeの活用法

- **設計ファースト**: コードを書く前に5本の設計書を作成。スキルツリーだけで56スキル分の仕様をJSON構造まで含めて設計
- **一括生成**: ゲームの全21ファイル（7,625行）を一貫したアーキテクチャで生成
- **デバッグ**: バグ報告に対して根本原因を分析し、修正コードを提示。例: WASD反転は回転行列の数学的検証で発見
- **リファクタリング**: VFXシステムの全面改修（スプライトシートシステム導入）を既存コードとの整合性を保ちながら実施

### 2. Meshy APIの活用法

- **ローポリモード必須**: `model_type: "lowpoly"` でブラウザ負荷を抑制
- **PBR問題への対処**: Meshy生成モデルはmetalness値が高く、環境マップなしでは灰色に見える。ローダー側でmetalness/roughnessを補正
- **リギングの落とし穴**: リギング後にテクスチャが消失することがある。バックアップモデルからのテクスチャ復元機構が必要

### 3. Gemini画像生成の活用法

- **黒背景戦略**: エフェクト画像は透過PNGではなく黒背景で生成し、AdditiveBlendingで合成。AI画像生成で「透過」を正確に出力させるのは困難だが、黒背景なら高品質に生成できる
- **スプライトシート**: 「4x4 grid, 16 frames」でアニメーションアトラスを1枚の画像として生成。フレーム間の連続性はプロンプトで制御
- **スタイル統一**: 全プロンプトに共通キーワード（`fantasy RPG, stylized, vibrant colors`）を含めて統一感を確保

### 4. ElevenLabs音声生成の活用法

- BGM 6曲 + SFX 57種を一括生成
- ピッチバリアンス（±5%）で繰り返し疲労を防止
- キャラクターボイスはpaybackRateで1.55倍にピッチアップして女性的な声質に変換

---

## 生成パイプライン（アセット生成スクリプト一覧）

| スクリプト | AI | 生成物 |
|-----------|-----|--------|
| `tools/generate_models.py` | Meshy API | 3Dモデル（GLB） |
| `tools/rig_models.py` | Meshy Rigging API | リギング済みモデル |
| `tools/generate_images.py` | Gemini API | スキルアイコン・テクスチャ・エフェクト |
| `tools/generate_effects.py` | Gemini API | エフェクトスプライトシート |
| `tools/generate_bgm.py` | ElevenLabs | BGM |
| `tools/generate_sounds.py` | ElevenLabs | SFX |
| `tools/generate_voices.py` | ElevenLabs | キャラクターボイス |

全スクリプトは `.env` ファイルからAPIキーを読み込む設計で、APIキーがコードにハードコードされることはありません。

---

## 成果物サマリー

| カテゴリ | 数量 |
|---------|------|
| JavaScriptソースコード | 21ファイル / 7,625行 |
| JSONデータ | 4ファイル / 1,980行 |
| 3Dモデル（GLB） | 28体 |
| スキルアイコン（PNG） | 71枚 |
| エフェクトテクスチャ（PNG） | 20枚（静的14 + スプライトシート6） |
| 環境テクスチャ（PNG） | 4枚 |
| 背景・UI画像（PNG） | 5枚 |
| BGM（MP3） | 6曲 |
| SFX（MP3） | 57本 |
| 設計ドキュメント（MD） | 5本 |
| アセット生成スクリプト（Python） | 7本 |
| **合計アセット** | **約220点** |

---

## Git コミット履歴（時系列）

```
11:11  Initial commit: Dragon Nest Lite - Browser 3D Action RPG
11:18  Add BGM tracks and scene-specific music playback
11:21  Wire 30+ SFX into game events
11:31  Apply textures, ambient SFX, and fix critical bugs
11:54  Add wrangler.jsonc for Cloudflare Pages deployment
12:00  Add build script for Cloudflare Pages deployment
13:14  Fix wrangler.jsonc for Cloudflare Pages
13:28  Keep wrangler.jsonc for Pages Git integration
13:35  Rename project to testai3d for Cloudflare Pages
14:00  Switch to Workers Static Assets for deployment
14:11  Fix gameplay bugs and add visual polish
14:15  Brighten dungeons, add walk animation, add camera zoom
14:21  Add bone-based skeletal animation for Player and Enemy
14:41  Fix attack direction, add rigged models, and upgrade VFX
15:41  Complete Phase 3: skill tree buff/debuff, status effects
16:06  Fix specialization lock, prop collision, boss AI, weapons
16:34  Fix design docs and camera rotation bug
16:39  Add win/lose BGM, register dungeon prop models
17:14  Fix grey models, effect transparency, voice toggle, camera
17:14  Add backup unrigged models for texture restoration
```

全20コミット、約7時間の開発サイクル。

---

## まとめ

このプロジェクトは**「複数のAIツールを組み合わせれば、1日でプレイアブルな3Dゲームを作れる」**ことの実証です。

- **コード**: Claude Code（Claude Opus 4.6）が設計からデバッグまで一貫して担当
- **3Dモデル**: Meshy APIがローポリモデルを自動生成、リギングまで対応
- **2D画像**: Gemini（gemini-3-pro-image-preview）がアイコン・テクスチャ・スプライトシートを生成
- **音声**: ElevenLabsがBGM・SFXを生成

人間の役割は**方向性の指示・品質チェック・バグ報告**に集中し、実装の大部分をAIが担いました。
