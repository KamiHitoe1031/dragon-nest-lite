# Dragon Nest Lite — Claude Code 実装プラン

## 🎮 プロジェクト概要

### コンセプト
Dragon Nestの爽快な3Dアクションを簡略化し、**ブラウザで動くハクスラ系アクションRPG**を作る。ホームタウンで準備→ダンジョンで戦闘→スキル成長のループ。キャラ2種×スキルツリーの深みで中毒性を確保しつつ、アクションパターンはシンプルに抑える。

### 基本情報

| 項目 | 内容 |
|------|------|
| **ジャンル** | 3Dアクション RPG（Dragon Nest簡易版） |
| **1ダンジョン時間** | 3〜5分 |
| **総ボリューム** | ホームタウン1 + ダンジョン3面 |
| **キャラクター** | ファイター / メイジ（各スキルツリー付き） |
| **アートスタイル** | **SDデフォルメ（2〜3頭身）× ローポリ**。リアル等身は不採用 |
| **特化選択（転職）** | **ダンジョン1クリア後**にスキルマスターNPCから2択分岐 |
| **視点** | 見下ろし型（クォータービュー or TPS風） |
| **ターゲット** | PC ブラウザ（モバイル後回し） |

### 技術スタック

| 用途 | 技術 |
|------|------|
| **3D描画** | Three.js（CDN）+ Cannon-es（物理） |
| **3Dモデル** | Meshy API（生成 + リギング + アニメーション） |
| **2D UI/テクスチャ** | Gemini（gemini-3-pro-image-preview） |
| **音声・SE** | ElevenLabs API（ボイス）+ 効果音ラボ/魔王魂（SE/BGM） |
| **言語** | JavaScript（ES6+） |
| **データ** | JSON + localStorage |

---

## 📐 全体アーキテクチャ

```
[ブラウザ]
├── index.html
├── Three.js（3D描画エンジン）
├── ゲームロジック（JS）
│   ├── シーンマネージャー（タイトル/タウン/ダンジョン/リザルト）
│   ├── プレイヤーコントローラー
│   ├── 敵AI
│   ├── スキルシステム
│   ├── UI マネージャー（HTML/CSS オーバーレイ）
│   └── セーブマネージャー（localStorage）
└── アセット
    ├── 3Dモデル（.glb）← Meshy APIで事前生成
    ├── UIテクスチャ（.png）← Geminiで生成
    ├── 音声（.mp3）← ElevenLabs + フリー素材
    └── データ（.json）← スキル/敵/ダンジョン定義

[外部API — 開発時に使用、ランタイムでは不要]
├── Meshy API → GLBモデルをダウンロードしてstaticに配置
├── Gemini → PNG画像を生成してstaticに配置
└── ElevenLabs → MP3音声を生成してstaticに配置
```

**重要**: APIは**開発時のアセット生成のみ**に使用。完成したゲームにはAPIコールなし（すべて静的ファイル）。

---

## 🔧 Phase 0: アセット生成パイプライン（Week 1-2）

ゲームコードを書く前に、必要な3Dモデル・画像・音声を全部生成するスクリプトをClaude Codeに作らせる。

### 0-1. Meshy APIによる3Dモデル生成

#### 生成するモデル一覧

| カテゴリ | モデル名 | 生成方式 | 入力ソース | リグ | アニメ |
|---------|---------|---------|-----------|------|-------|
| **プレイヤー** | Fighter (Mia) | **Image-to-3D** | `Mia_SD.jpg` → Gemini衣装変換 | ✅ | idle, walk, run, attack1, attack2, skill, hit, die |
| **プレイヤー** | Mage (Haru) | **Image-to-3D** | `Haru_SD.jpg` → Gemini衣装変換 | ✅ | idle, walk, run, cast1, cast2, skill, hit, die |
| **敵** | Slime | **Image-to-3D** | Geminiでコンセプト画生成 | ✅ | idle, move, attack, die |
| **敵** | Goblin | **Image-to-3D** | Geminiでコンセプト画生成 | ✅ | idle, move, attack, die |
| **敵** | Skeleton | **Image-to-3D** | Geminiでコンセプト画生成 | ✅ | idle, move, attack, die |
| **ボス** | Dragon | **Image-to-3D** | Geminiでコンセプト画生成 | ✅ | idle, move, attack, breath, die |
| **NPC** | Blacksmith | **Image-to-3D** | Geminiでコンセプト画生成 | ✅ | idle |
| **NPC** | Skill Master | **Image-to-3D** | Geminiでコンセプト画生成 | ✅ | idle |
| **環境** | Tree x3種 | Text-to-3D | プロンプトのみ | ❌ | — |
| **環境** | Rock x2種 | Text-to-3D | プロンプトのみ | ❌ | — |
| **環境** | House x2種 | Text-to-3D | プロンプトのみ | ❌ | — |
| **環境** | Dungeon Wall | Text-to-3D | プロンプトのみ | ❌ | — |
| **環境** | Dungeon Floor | Text-to-3D | プロンプトのみ | ❌ | — |
| **アイテム** | Chest | Text-to-3D | プロンプトのみ | ❌ | — |
| **アイテム** | Potion | Text-to-3D | プロンプトのみ | ❌ | — |
| **エフェクト用** | Sword Slash | Text-to-3D | プロンプトのみ | ❌ | — |
| **エフェクト用** | Fire Ball | Text-to-3D | プロンプトのみ | ❌ | — |

**合計**: 約20モデル + 各モデル複数アニメーション

#### Meshy API呼び出しフロー（Claude Codeが自動化）

```python
# ============================
# パターンA: Image-to-3D（キャラクター・敵・NPC）
# ============================

# Step 0: Geminiで参照画像を衣装変換（プレイヤー）
# または コンセプト画を新規生成（敵・NPC）
# → assets/reference_fantasy/ に保存
# ※ 05_character_reference.md のプロンプトテンプレートを使用

# Step 1: 画像→3Dモデル生成
task_id = meshy.image_to_3d(
    image_url="assets/reference_fantasy/mia_fantasy_sd.png",  # 衣装変換済み画像
    ai_model="latest",           # = Meshy-6-preview
    model_type="lowpoly",        # ★ローポリモード
    target_polycount=5000,       # キャラは5,000ポリゴン目安
    should_texture=True,
    enable_pbr=True,
)

# Step 2: 完了待ち → Refine（高品質化）
refined_id = meshy.refine(task_id)

# Step 3: リギング
rig_id = meshy.rigging(
    model_url=refined_model_url,
)

# Step 4: 追加アニメーション適用
for action_id in [92, 45, 12]:  # 攻撃, アイドル, etc.
    anim_id = meshy.animate(
        rig_task_id=rig_id,
        action_id=action_id
    )

# Step 5: GLBを assets/models/ に保存


# ============================
# パターンB: Text-to-3D（環境・アイテム）
# ============================

task_id = meshy.text_to_3d(
    prompt="stylized cute fantasy tree, low poly, solid colors, game asset",
    mode="preview",
    ai_model="latest",
    model_type="lowpoly",
    target_polycount=1000,
)
refined_id = meshy.refine(task_id)
# → GLBダウンロード → assets/models/ に保存
```

### 0-2. Gemini（gemini-3-pro-image-preview）によるキャラクター衣装変換 ★Meshy前に実施

**プレイヤーキャラの参照画像は現代風の服装**のため、Meshyに渡す前にファンタジー衣装に変換する。
詳細なプロンプトは `docs/05_character_reference.md` を参照。

| 変換対象 | 入力画像 | 出力先 | 用途 |
|---------|---------|--------|------|
| ウォリアー（SD版） | `assets/reference/Mia_SD.jpg` | `assets/reference_fantasy/mia_fantasy_sd.png` | Meshy Image-to-3D入力 |
| ソーサレス（SD版） | `assets/reference/Haru_SD.jpg` | `assets/reference_fantasy/haru_fantasy_sd.png` | Meshy Image-to-3D入力 |
| ウォリアー（等身版） | `assets/reference/CharacterSheet_Mia.png` | `assets/ui/chara_mia.png` | キービジュアル・キャラ選択画面 |
| ソーサレス（等身版） | `assets/reference/CharacterSheet_haru.png` | `assets/ui/chara_haru.png` | キービジュアル・キャラ選択画面 |
| 敵コンセプト画（各種） | なし（新規生成） | `assets/reference_fantasy/enemy_*.png` | Meshy Image-to-3D入力 |
| NPCコンセプト画（各種） | なし（新規生成） | `assets/reference_fantasy/npc_*.png` | Meshy Image-to-3D入力 |

**実行順序: 0-2（衣装変換）→ 0-1（Meshy 3D生成）**

### 0-3. Gemini（gemini-3-pro-image-preview）によるUI画像生成

| カテゴリ | 画像 | プロンプト案 | サイズ |
|---------|------|-------------|--------|
| **UI** | スキルアイコン×16 | "game skill icon, fire ball, pixel art style, transparent bg" | 64×64 |
| **UI** | HPバー背景 | "fantasy health bar frame, ornate, game UI" | 256×32 |
| **UI** | MPバー背景 | "fantasy mana bar frame, blue, game UI" | 256×32 |
| **UI** | ダイアログボックス | "medieval parchment dialog box, game UI" | 512×256 |
| **UI** | ミニマップ枠 | "ornate minimap border, fantasy game UI" | 200×200 |
| **背景** | タイトル画面 | "dark fantasy castle background, dragon silhouette" | 1920×1080 |
| **背景** | タウン背景（skybox用） | "fantasy village sky, sunset, peaceful" | 2048×1024 |
| **背景** | ダンジョン背景 | "dark dungeon cave background, torch light" | 2048×1024 |
| **テクスチャ** | 草地 | "seamless grass texture, top down, painterly" | 512×512 |
| **テクスチャ** | 石畳 | "seamless cobblestone texture, medieval" | 512×512 |
| **テクスチャ** | ダンジョン床 | "seamless dark stone floor texture" | 512×512 |

### 0-4. ElevenLabs APIによる音声生成

| カテゴリ | 内容 | 用途 |
|---------|------|------|
| **NPC音声** | 鍛冶屋の挨拶 "Welcome, adventurer!" | タウンNPC会話 |
| **NPC音声** | スキルマスター "Choose your path wisely." | スキルツリー画面 |
| **ナレーション** | ダンジョン導入 "A dark force awaits..." | ダンジョン開始時 |
| **ボス** | ドラゴン咆哮 (SFX生成) | ボス戦 |
| **プレイヤー** | ファイター掛け声 × 3パターン | 攻撃時 |
| **プレイヤー** | メイジ詠唱 × 3パターン | スキル使用時 |

**SE/BGM**は無料素材（効果音ラボ + 魔王魂）を使用。ElevenLabsはボイスのみ。

---

## ⚔️ Phase 1: コアエンジン（Week 3-4）

### 1-1. プロジェクト構造

```
dragon-nest-lite/
├── index.html
├── css/
│   └── style.css          # UI オーバーレイ用
├── js/
│   ├── main.js             # エントリーポイント、Three.js初期化
│   ├── config.js            # 定数（画面サイズ、物理定数）
│   ├── scenes/
│   │   ├── SceneManager.js  # シーン切り替え管理
│   │   ├── TitleScene.js
│   │   ├── TownScene.js
│   │   ├── DungeonScene.js
│   │   └── ResultScene.js
│   ├── entities/
│   │   ├── Player.js        # プレイヤー基底クラス
│   │   ├── Fighter.js       # ファイター固有
│   │   ├── Mage.js          # メイジ固有
│   │   ├── Enemy.js         # 敵基底クラス
│   │   └── NPC.js
│   ├── systems/
│   │   ├── InputManager.js  # キーボード/マウス入力
│   │   ├── CombatSystem.js  # ダメージ計算、ヒット判定
│   │   ├── SkillSystem.js   # スキルツリー、スキル発動
│   │   ├── UIManager.js     # HTML/CSS UI制御
│   │   ├── AudioManager.js  # BGM/SE/ボイス管理
│   │   └── SaveManager.js   # localStorage永続化
│   ├── data/
│   │   ├── skills.json      # スキルツリーデータ
│   │   ├── enemies.json     # 敵データ
│   │   ├── dungeons.json    # ダンジョン構成
│   │   └── items.json       # アイテムデータ
│   └── utils/
│       ├── ModelLoader.js   # GLB読み込みヘルパー
│       └── MathUtils.js
├── assets/
│   ├── models/              # Meshy生成GLB
│   ├── textures/            # Gemini生成PNG
│   ├── audio/
│   │   ├── bgm/            # 魔王魂BGM
│   │   ├── sfx/            # 効果音ラボSE
│   │   └── voice/          # ElevenLabs音声
│   └── data/               # JSONデータ
└── tools/
    ├── generate_models.py   # Meshy API一括生成
    ├── generate_images.py   # Gemini API一括生成
    └── generate_voices.py   # ElevenLabs API一括生成
```

### 1-2. Three.js 基本セットアップ

```javascript
// main.js 骨格（Claude Codeが実装）
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// カメラ: プレイヤー追従（見下ろし）
camera.position.set(0, 15, 10);
camera.lookAt(0, 0, 0);

// ライティング
const ambientLight = new THREE.AmbientLight(0x404040, 2);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

// GLBモデル読み込み
const loader = new GLTFLoader();
loader.load('assets/models/fighter.glb', (gltf) => {
    const model = gltf.scene;
    const mixer = new THREE.AnimationMixer(model);
    // アニメーション再生
});

// ゲームループ
function animate() {
    requestAnimationFrame(animate);
    // 入力処理
    // 物理更新
    // アニメーション更新
    renderer.render(scene, camera);
}
```

### 1-3. プレイヤー操作

| 入力 | アクション |
|------|----------|
| WASD | 8方向移動 |
| マウス移動 | カメラ回転 / キャラ向き変更 |
| 左クリック | 通常攻撃（コンボ2段） |
| 右クリック | 強攻撃 / チャージ攻撃 |
| 1, 2, 3, 4 | スキル発動（スロット） |
| Space | 回避ロール |
| E | NPC会話 / アイテム取得 |
| Tab | スキルツリー画面 |

---

## 🗡️ Phase 2: 戦闘システム（Week 5-6）

### 2-1. アクションパターン

**ファイター（近接物理）**

| アクション | 入力 | 挙動 | ダメージ |
|-----------|------|------|---------|
| 通常攻撃1 | 左クリック | 横斬り | ATK × 1.0 |
| 通常攻撃2 | 連打 | 突き | ATK × 1.2 |
| 強攻撃 | 右クリック（チャージ） | 大振り + ノックバック | ATK × 2.0 |
| 回避 | Space | 前方ロール（無敵0.5秒） | — |

**メイジ（遠距離魔法）**

| アクション | 入力 | 挙動 | ダメージ |
|-----------|------|------|---------|
| 通常攻撃 | 左クリック | マジックミサイル（追尾弾） | MATK × 0.8 |
| チャージ | 左長押し | 大型弾（範囲） | MATK × 1.5 |
| テレポート | Space | 短距離瞬間移動（無敵） | — |

### 2-2. 敵パターン

| 敵 | HP | 行動パターン | 出現ダンジョン |
|----|-----|-------------|---------------|
| Slime | 30 | 近寄って体当たり（2秒周期） | 1, 2 |
| Goblin | 60 | 走り寄り→殴り→後退 | 1, 2, 3 |
| Skeleton | 80 | 盾ガード→隙に斬撃 | 2, 3 |
| Dragon (Boss) | 500 | 3パターンローテ: 突進→ブレス→尻尾 | 3 |

### 2-3. ダメージ計算

```javascript
// シンプルな計算式
const damage = (attackerATK * skillMultiplier) - (defenderDEF * 0.5);
const finalDamage = Math.max(1, Math.floor(damage * (0.9 + Math.random() * 0.2)));
// クリティカル: 10%確率で1.5倍
```

---

## 🌲 Phase 3: スキルツリー（Week 6-7）★最重要

Dragon Nest最大の魅力はスキルツリーの分岐。ここだけしっかり作る。

> **⚠️ 注意**: スキルツリーの**正式仕様は `docs/02_skilltree_design.md`** を参照すること。
> 以下は概要のみ。スキル名・SP値・前提条件などで食い違いがある場合は02が正。

### 3-0. 転職（特化選択）イベント

- **トリガー**: ダンジョン1「森の洞窟」初回クリア時
- **演出**: スキルマスターNPCが語りかけ、2択の分岐UIを表示
- **選択後**: 選ばなかった側の特化スキルは以後SP投資不可
- **報酬**: 転職と同時にSP 5を獲得（ダンジョン1クリア報酬）

### 3-1. ファイター スキルツリー

```
[ファイター]
├── ⚔️ ソードマスター系（物理DPS特化）
│   ├── Lv1: パワースラッシュ — 前方扇形 ATK×2.5 CD:5s
│   ├── Lv3: ソードストーム — 周囲360° ATK×1.5×3hit CD:8s
│   ├── Lv5: ブレードダンス — 連続斬撃 ATK×0.8×8hit CD:12s
│   └── Lv8: [究極] ギガスラッシュ — 超前方直線 ATK×10 CD:30s
│
└── 🛡️ ガーディアン系（タンク/カウンター特化）
    ├── Lv1: シールドバッシュ — 前方小範囲 ATK×2.0+スタン1s CD:6s
    ├── Lv3: プロボーク — 敵ヘイト集中+DEF30%UP 5s CD:10s
    ├── Lv5: カウンターストライク — ガード成功で反撃 ATK×3.0 CD:0s(受動)
    └── Lv8: [究極] フォートレス — 5秒無敵+周囲回復 CD:45s
```

### 3-2. メイジ スキルツリー

```
[メイジ]
├── 🔥 エレメンタリスト系（範囲火力特化）
│   ├── Lv1: ファイアボール — 直線弾 MATK×2.5 CD:4s
│   ├── Lv3: メテオシャワー — 指定範囲 MATK×2.0×3hit CD:10s
│   ├── Lv5: フレイムウォール — 設置型 MATK×0.5/s 8s CD:15s
│   └── Lv8: [究極] インフェルノ — 画面全体 MATK×8 CD:35s
│
└── ❄️ ミスティック系（CC/デバフ特化）
    ├── Lv1: フロストボルト — 直線弾+スロウ30% MATK×1.5 CD:3s
    ├── Lv3: タイムストップ — 範囲凍結3s CD:12s
    ├── Lv5: カースフィールド — 設置型 DEF-30% 8s CD:15s
    └── Lv8: [究極] アブソリュートゼロ — 全凍結5s+MATK×5 CD:40s
```

### 3-3. スキルポイント経済（★02_skilltree_design.md参照）

| 要素 | 数値 |
|------|------|
| ダンジョン1初回クリア報酬 | 5 SP（＝転職イベント時） |
| ダンジョン2初回クリア報酬 | 7 SP |
| ダンジョン3初回クリア報酬 | 10 SP |
| 各ダンジョン周回1回 | 2 SP |
| **3面×3周合計** | **40 SP** |
| **やり込み上限（10周）** | **82 SP（全140SPの58%）** |

> 全スキルMAXに140SP必要だが最大82SPしか手に入らないため、ビルド選択の緊張感が生まれる。

### 3-4. skills.json データ構造

```json
{
  "fighter": {
    "swordmaster": [
      {
        "id": "power_slash",
        "name": "パワースラッシュ",
        "description": "前方扇形に強力な一撃",
        "requiredLevel": 1,
        "cost": 1,
        "cooldown": 5000,
        "damageMultiplier": 2.5,
        "range": 3,
        "aoeType": "cone",
        "aoeAngle": 60,
        "animation": "skill_slash",
        "sfx": "sfx_slash_heavy",
        "icon": "icon_power_slash"
      }
    ],
    "guardian": [ ... ]
  },
  "mage": {
    "elementalist": [ ... ],
    "mystic": [ ... ]
  }
}
```

---

## 🏘️ Phase 4: ホームタウン（Week 7-8）

### 4-1. タウン構成

```
┌──────────────────────────────────┐
│          ホームタウン              │
│                                  │
│   [鍛冶屋NPC]     [スキルマスター] │
│       ⚒️              📖         │
│                                  │
│           [プレイヤー]             │
│              🧙                  │
│                                  │
│   [ポーション屋]  [ダンジョン入口]  │
│       🧪            🚪           │
│                                  │
└──────────────────────────────────┘
```

### 4-2. NPC機能

| NPC | 機能 | ElevenLabsボイス |
|-----|------|-----------------|
| **鍛冶屋** | 武器強化（ゴールド消費でATK/MATK UP） | 低い男性声 |
| **スキルマスター** | スキルツリー画面を開く | 老人声 |
| **ポーション屋** | HP/MPポーション購入 | 明るい女性声 |
| **ダンジョン入口** | ダンジョン選択画面 | — |

---

## 🏰 Phase 5: ダンジョン3面（Week 8-10）

### 5-1. ダンジョン構成

| # | テーマ | 部屋数 | 雑魚 | ボス | BGM |
|---|--------|--------|------|------|-----|
| 1 | 森の洞窟 | 3部屋 | Slime×5, Goblin×3 | なし（最後に大量スポーン） | 魔王魂：ダンジョン系 |
| 2 | 遺跡地下 | 4部屋 | Goblin×4, Skeleton×4 | なし（中ボス的Skeleton隊長） | 魔王魂：緊張系 |
| 3 | ドラゴンの巣 | 3部屋+ボス部屋 | 全種混合 | Dragon | 魔王魂：ボス戦 |

### 5-2. ダンジョンの進行

```
部屋に入る → 扉が閉まる → 敵スポーン → 全撃破 → 扉が開く → 次の部屋
                                                    ↓
                                              宝箱出現（ランダム報酬）
```

### 5-3. マップ実装方式

**手作りレイアウト方式**（プロシージャルではない）
- 各部屋は**プリセット3Dシーン**として定義
- 部屋のつなぎは短い通路
- Three.jsのGroupで部屋を管理、プレイヤー位置でアクティブ部屋を切替

```javascript
// dungeons.json
{
  "dungeon_1": {
    "name": "森の洞窟",
    "rooms": [
      {
        "id": "room_1",
        "size": { "width": 20, "depth": 15 },
        "enemies": [
          { "type": "slime", "position": [5, 0, 3] },
          { "type": "slime", "position": [8, 0, 7] },
          { "type": "goblin", "position": [12, 0, 5] }
        ],
        "props": [
          { "type": "rock", "position": [3, 0, 10] },
          { "type": "tree", "position": [15, 0, 2] }
        ],
        "exitDoor": { "position": [10, 0, 14], "locked": true }
      }
    ]
  }
}
```

---

## 🔊 Phase 6: サウンド & ポリッシュ（Week 10-11）

### 6-1. サウンド設計

| カテゴリ | ソース | 実装 |
|---------|--------|------|
| **BGM** | 魔王魂（クレジット必須・無料） | Howler.jsでループ再生 |
| **攻撃SE** | 効果音ラボ（クレジット不要・無料） | ピッチ±5%ランダム変動 |
| **スキルSE** | 効果音ラボ | スキル発動と同期 |
| **UI SE** | 効果音ラボ | ボタンクリック、レベルアップ |
| **NPC声** | ElevenLabs API | 事前生成→MP3配置 |
| **プレイヤー声** | ElevenLabs API | 攻撃掛け声3バリエーション |

### 6-2. エフェクト

| エフェクト | 実装方式 |
|-----------|---------|
| 斬撃エフェクト | Three.js SpriteSheet アニメーション |
| 魔法弾 | Three.js PointLight + 球体 + パーティクル |
| ヒット衝撃 | 画面シェイク + フラッシュ |
| ダメージ数値 | HTML div を3D位置にオーバーレイ |
| レベルアップ | パーティクル噴水 + SE |

---

## 💾 Phase 7: セーブ & メタ進行（Week 11）

```javascript
// localStorage に保存する構造
const saveData = {
  selectedClass: "fighter",      // or "mage"
  level: 5,
  exp: 1200,
  gold: 3500,
  skillPoints: 4,
  unlockedSkills: ["power_slash", "sword_storm"],
  equippedSkills: ["power_slash", "sword_storm", null, null],
  stats: {
    maxHP: 150,
    maxMP: 80,
    atk: 25,
    def: 15,
    matk: 10,
    mdef: 12
  },
  weaponLevel: 3,
  dungeonsCleared: {
    "dungeon_1": { cleared: true, bestTime: 180 },
    "dungeon_2": { cleared: true, bestTime: 240 },
    "dungeon_3": { cleared: false }
  },
  potions: { hp: 5, mp: 3 }
};
```

---

## 📅 実装スケジュールまとめ

| Week | Phase | 内容 | 成果物 |
|------|-------|------|--------|
| **1-2** | Phase 0 | アセット生成パイプライン | Meshyモデル20体+テクスチャ+音声 |
| **3-4** | Phase 1 | Three.js基盤+移動+カメラ | プレイヤーがマップを歩ける |
| **5-6** | Phase 2 | 戦闘システム+敵AI | 敵を殴って倒せる |
| **6-7** | Phase 3 | スキルツリー（UI+ロジック） | スキル習得→発動できる |
| **7-8** | Phase 4 | ホームタウン+NPC | 拠点で準備できる |
| **8-10** | Phase 5 | ダンジョン3面+ボス | ゲームを通しでプレイ可能 |
| **10-11** | Phase 6 | サウンド+エフェクト+ポリッシュ | 見た目と手触り向上 |
| **11** | Phase 7 | セーブ+バランス調整 | 完成版 |

**合計: 約11週間（2.5ヶ月）**

---

## 🚀 Claude Codeへの指示方法

### 最初のメッセージ

```
このプロジェクトの実装指示書に従って、Dragon Nest Liteを開発してください。

まずPhase 0として、Meshy APIで3Dモデルを一括生成する
Pythonスクリプトを作成してください。

Meshy APIキー: [あなたのAPIキー]

最初に生成するモデル:
1. ファイター（A-pose、リギング+歩行/攻撃アニメ）
2. メイジ（A-pose、リギング+歩行/攻撃アニメ）
3. スライム（リギング+移動/攻撃アニメ）
```

### Phase ごとに進める

```
Phase 1が完了しました。次はPhase 2の戦闘システムを実装してください。

現在の状態:
- プレイヤーがWASDで移動、カメラ追従動作中
- GLBモデルの読み込みと表示OK

Phase 2で実装してほしいこと:
1. 左クリックで通常攻撃（アニメーション再生+ダメージ判定）
2. 敵のスポーンとチェイスAI
3. HP表示
```

---

## ⚠️ リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| Meshyモデル品質が低い | 見た目がチープ | ローポリスタイルで統一、トゥーンシェーダー適用 |
| アニメーション不自然 | 操作感悪化 | Meshyプリセットから選定、最悪は手動Blender調整 |
| Three.jsパフォーマンス | FPS低下 | LOD、フラスタムカリング、敵数上限設定 |
| ElevenLabs音声がゲームに合わない | 没入感低下 | フリー音声素材にフォールバック |
| スコープ肥大化 | 完成しない | 各Phaseで動くものを確認→次へ進む |

---

## 📝 あなた（デザイナー）のタスク

Claude Codeが開発中にあなたに依頼すること:

1. **Meshy WebUI でモデル確認** — API生成後にWebで見た目チェック、気に入らなければ再生成
2. **Gemini でUI画像微調整** — 自動生成の結果が気に入らない場合、手動プロンプト調整
3. **スキルツリーのバランスフィードバック** — テストプレイして「強すぎ/弱すぎ」を報告
4. **ダンジョンの敵配置確認** — テストプレイして難易度フィードバック
