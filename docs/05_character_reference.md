# Dragon Nest Lite — キャラクターデザインリファレンス

## 概要

本ドキュメントはキャラクターの参照画像とその使い方を定義する。
**Claude Codeはアセット生成時に必ずこのドキュメントを参照すること。**

---

## 🎨 全体のアートスタイル（★確定）

| 項目 | 方向性 |
|------|--------|
| **全体のスタイル** | **SDデフォルメ × ローポリ**（確定） |
| **頭身** | **2〜3頭身（chibi / super deformed）**（確定） |
| **衣装テーマ** | **シンプルなファンタジーRPG**（複雑な装飾は避ける）（確定） |
| **色調** | （ユーザー追記可） |
| **参考作品** | Dragon Nest |

---

## 📂 参照画像一覧

### ファイル配置

ユーザーのローカルにある参考画像を、プロジェクト開始前に `assets/reference/` へコピーすること。

| 元の場所 | コピー先 | 内容 |
|---------|---------|------|
| `O:\AI_\Claudecode\PJ_DN\siryou\Mia_SD.jpg` | `assets/reference/Mia_SD.jpg` | ★ ウォリアー SDイラスト |
| `O:\AI_\Claudecode\PJ_DN\siryou\Haru_SD.jpg` | `assets/reference/Haru_SD.jpg` | ★ ソーサレス SDイラスト |
| `O:\AI_\Claudecode\PJ_DN\siryou\CharacterSheet_Mia.png` | `assets/reference/CharacterSheet_Mia.png` | ウォリアー 通常等身 |
| `O:\AI_\Claudecode\PJ_DN\siryou\CharacterSheet_haru.png` | `assets/reference/CharacterSheet_haru.png` | ソーサレス 通常等身 |

### キャラ対応表

| ゲーム内名 | 参照画像（SD） | 参照画像（通常等身） | 役割 |
|-----------|---------------|-------------------|------|
| **ウォリアー（Mia）** | `Mia_SD.jpg` | `CharacterSheet_Mia.png` | 近接ファイター系 |
| **ソーサレス（Haru）** | `Haru_SD.jpg` | `CharacterSheet_haru.png` | 魔法使い系 |

---

## 画像の使い分けルール（★厳守）

### SD画像（`*_SD.jpg`）→ 3Dモデル生成に使用

| 項目 | 内容 |
|------|------|
| **用途** | Meshy Image-to-3D の入力画像 |
| **対象** | `Mia_SD.jpg`（ウォリアー）、`Haru_SD.jpg`（ソーサレス） |
| **注意** | **現代風の服装**のため、そのままMeshyに渡さない |
| **手順** | ① Geminiでファンタジー衣装に変換 → ② 変換後の画像をMeshyへ |
| **保存先** | 変換後の画像 → `assets/reference_fantasy/` |

### CharacterSheet画像（`CharacterSheet_*.png`）→ キービジュアル用

| 項目 | 内容 |
|------|------|
| **用途** | タイトル画面、キャラ選択画面、キャラ紹介ページの立ち絵・イラスト |
| **対象** | `CharacterSheet_Mia.png`、`CharacterSheet_haru.png` |
| **注意** | **通常等身＋現代服装**。3Dモデル生成には使用しない |
| **手順** | Geminiでファンタジー衣装に変換 → UI用画像として使用 |
| **保存先** | 変換後の画像 → `assets/ui/` |

### ❌ やってはいけないこと

1. SD画像を衣装変換せずにそのままMeshyに入力する
2. CharacterSheet画像を3Dモデル生成に使う（通常等身なのでSD 3Dモデルに合わない）
3. 参考画像なしにテキストプロンプトだけでプレイヤーキャラを生成する

---

## ⚔️ ウォリアー — Mia（ミア）

| 項目 | 内容 |
|------|------|
| **参照画像（SD）** | `assets/reference/Mia_SD.jpg` |
| **参照画像（等身）** | `assets/reference/CharacterSheet_Mia.png` |
| **役割** | 近接ファイター。剣で戦う |
| **現在の服装** | 現代風（→ファンタジー変換必須） |

### ファンタジー衣装変換プロンプト（Gemini用）

**SD版（3Dモデル用）— `Mia_SD.jpg` を入力して使用：**
```
この画像のキャラクター（Mia）の顔、髪型、体型はそのまま維持してください。
服装だけをシンプルなファンタジーRPGスタイルに変更してください。

衣装指示：
- シンプルな革鎧（leather armor）
- 軽めの肩当て（shoulder pads）
- 腰にベルト、短剣をぶら下げ
- 膝丈のブーツ
- 背中に大剣を背負う or 手に持つ

スタイル：chibi, super deformed, 2.5 head ratio, cute, clean simple design
複雑な装飾は不要。ローポリ3Dで再現しやすいすっきりとしたデザイン。
背景：白背景（white background）
正面向き全身図
```

**通常等身版（キービジュアル用）— `CharacterSheet_Mia.png` を入力して使用：**
```
この画像のキャラクター（Mia）の顔、髪型、体型、ポーズはそのまま維持してください。
服装だけをシンプルなファンタジーRPGスタイルに変更してください。

衣装指示：
- シンプルな革鎧（leather armor）
- 軽めの肩当て（shoulder pads）
- 腰にベルト、短剣をぶら下げ
- 膝丈のブーツ
- 大剣を持つ

スタイル：anime illustration, fantasy RPG, clean design
複雑な装飾は不要。シンプルでかっこいい冒険者スタイル。
背景：透過背景（transparent background）
高品質イラスト
```

---

## 🔮 ソーサレス — Haru（ハル）

| 項目 | 内容 |
|------|------|
| **参照画像（SD）** | `assets/reference/Haru_SD.jpg` |
| **参照画像（等身）** | `assets/reference/CharacterSheet_haru.png` |
| **役割** | 魔法使い。火・氷・重力魔法で攻撃 |
| **現在の服装** | 現代風（→ファンタジー変換必須） |

### ファンタジー衣装変換プロンプト（Gemini用）

**SD版（3Dモデル用）— `Haru_SD.jpg` を入力して使用：**
```
この画像のキャラクター（Haru）の顔、髪型、体型はそのまま維持してください。
服装だけをシンプルなファンタジーRPGスタイルに変更してください。

衣装指示：
- シンプルなローブ（robe）
- フード付きの短いマント
- 杖を持っている（木の杖 + 先端に宝石）
- ショートブーツ
- ベルトにポーチ

スタイル：chibi, super deformed, 2.5 head ratio, cute, clean simple design
複雑な装飾は不要。ローポリ3Dで再現しやすいすっきりとしたデザイン。
背景：白背景（white background）
正面向き全身図
```

**通常等身版（キービジュアル用）— `CharacterSheet_haru.png` を入力して使用：**
```
この画像のキャラクター（Haru）の顔、髪型、体型、ポーズはそのまま維持してください。
服装だけをシンプルなファンタジーRPGスタイルに変更してください。

衣装指示：
- シンプルなローブ（robe）
- フード付きの短いマント
- 杖を持っている（木の杖 + 先端に宝石）
- ショートブーツ
- ベルトにポーチ

スタイル：anime illustration, fantasy RPG, clean design
複雑な装飾は不要。シンプルでかわいい魔法使いスタイル。
背景：透過背景（transparent background）
高品質イラスト
```

---

## アセット生成ワークフロー（全体フロー図）

```
【プレイヤーキャラの3Dモデル】

  Mia_SD.jpg / Haru_SD.jpg（現代服SD）
       │
       ▼ Gemini（gemini-3-pro-image-preview）で衣装変換
  ファンタジー衣装版SD画像
       │  → assets/reference_fantasy/ に保存
       ▼ Meshy Image-to-3D（ai_model: "latest", model_type: "lowpoly"）
  3Dモデル（ローポリ、Tポーズ）
       │
       ▼ Meshy Refine
  テクスチャ付き3Dモデル
       │
       ▼ Meshy Rigging API
  リグ済みGLB
       │
       ▼ assets/models/ に配置


【キービジュアル / キャラ選択画面の立ち絵】

  CharacterSheet_Mia.png / CharacterSheet_haru.png（現代服・通常等身）
       │
       ▼ Gemini で衣装変換（ファンタジー衣装に）
  ファンタジー衣装版の通常等身イラスト
       │
       ▼ assets/ui/ に配置（タイトル画面、キャラ選択等に使用）


【敵・NPC・ボスの3Dモデル】

  （参照画像なし）
       │
       ▼ Gemini でコンセプト画を生成（SDスタイル、白背景）
  コンセプト画
       │  → assets/reference_fantasy/ に保存
       ▼ Meshy Image-to-3D
  3Dモデル → Refine → Rigging → GLB
       │
       ▼ assets/models/ に配置


【環境オブジェクト（木、岩、壁など）】

  Meshy Text-to-3D（プロンプトのみで生成）
       │
       ▼ assets/models/ に配置
```

---

## 👹 敵キャラクター

プレイヤーキャラと異なり、敵には参照画像がない。
**Geminiでコンセプト画を作成 → Meshy Image-to-3D** の流れで生成する。

### スライム

| 項目 | 説明 |
|------|------|
| **イメージ** | 緑色の半透明スライム、かわいい目付き |
| **スタイル** | chibi cute, low poly, simple shape |
| **カスタム要望** | （ユーザー追記可） |

### ゴブリン

| 項目 | 説明 |
|------|------|
| **イメージ** | 小柄な棍棒持ち、SD体型 |
| **スタイル** | chibi, super deformed, low poly |
| **カスタム要望** | （ユーザー追記可） |

### スケルトン

| 項目 | 説明 |
|------|------|
| **イメージ** | 剣持ちの骸骨戦士、SD体型 |
| **スタイル** | chibi, super deformed, low poly |
| **カスタム要望** | （ユーザー追記可） |

### ドラゴン（ボス）

| 項目 | 説明 |
|------|------|
| **イメージ** | 小型〜中型のかわいいドラゴン、大きな頭 |
| **色** | （ユーザー追記可。デフォルト：赤系） |
| **スタイル** | chibi cute, large head, low poly |
| **カスタム要望** | （ユーザー追記可） |

---

## 🏠 NPC

| NPC | イメージ | スタイル |
|-----|---------|---------|
| **鍛冶屋** | がっしり体型、エプロン、ハンマー | chibi, SD, low poly |
| **スキルマスター** | 老人の魔法使い、長いヒゲ、杖 | chibi, SD, low poly |
| **ポーション屋** | 小柄、フード付き、ポーション瓶を持つ | chibi, SD, low poly |

---

## 🌲 ダンジョン雰囲気

| ダンジョン | 雰囲気 |
|-----------|--------|
| **森の洞窟** | 苔むした洞窟、木漏れ日が差す、蔦が壁を覆う、自然光 |
| **古代遺跡** | 崩れた柱、光る魔法陣、蔦に覆われた壁画、神秘的 |
| **遺跡最深部（ボス部屋）** | 巨大な中央ホール、ドラゴンの巣、火/氷の視覚演出 |

---

## ✅ 準備チェックリスト

```
✅ アートスタイル確定（SDデフォルメ × ローポリ）
✅ 衣装方針確定（シンプルなファンタジーRPG、複雑な装飾NG）
✅ SD画像 → 3Dモデル用、CharacterSheet → キービジュアル用 の使い分け明確化
✅ 衣装変換プロンプト（Gemini用）作成済み

□ assets/reference/ に4ファイルをコピー配置（Phase 0開始前に実施）
  □ Mia_SD.jpg
  □ Haru_SD.jpg
  □ CharacterSheet_Mia.png
  □ CharacterSheet_haru.png
□ （任意）色調・追加参考作品の記入
□ （任意）敵/NPC/ドラゴンのカスタム要望記入
□ （任意）ダンジョン雰囲気の追加要望
```
