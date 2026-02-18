# Dragon Nest Lite — スキルツリー詳細設計書

## Dragon Nestのスキルツリーの核心を理解する

Dragon Nestのスキルツリーには、単なる「スキルの木」ではない**5つの構造的特徴**がある。
これを忠実に再現することで、本家の「ビルド沼」の中毒性を引き継ぐ。

### 本家DN の構造的特徴

| 特徴 | 本家DNの仕組み | 本作での再現 |
|------|---------------|-------------|
| **3層のクラスツリー** | Base(Warrior) → 1st特化(Swordmaster) → 2nd特化(Gladiator/Moonlord) | Base → 1st特化の2択（2nd特化は将来拡張枠） |
| **複数カラム構成** | 同じツリー内に物理列・魔法列・防御列があり混在取得可能 | 各特化内に「メイン列」「サブ列」の2カラム |
| **SP希少性** | 全スキルMAXは不可能、取捨選択がビルドの個性 | 全ダンジョン制覇でも全スキルMAXは不可能に設計 |
| **前提条件（Prerequisite）** | スキルAのLv○以上が必要、前ツリーにSP○以上投資が必要 | 同じ仕組みを採用 |
| **スキルレベルアップ** | 同一スキルにSPを追加投入→ダメージ/効果が段階的UP | Lv1〜Lv5の5段階 |

### 本家DNのクラスツリー参考

**Warrior系**
```
Warrior（基底）
├── Sword Master（1st特化：剣術）
│   ├── [物理列] Dash Slash, Triple Slash, Line Drive, Hacking Stance
│   ├── [魔法列] Moonlight Splitter, Cyclone Slash, Halfmoon Slash, Crescent Cleave
│   └── [防御列] Parrying Stance, Counter Slash
│   ├──→ Gladiator（2nd: 物理DPS特化）— Finish Attack, Brave, Infinity Edge
│   └──→ Moonlord（2nd: 魔法剣特化）— Moon Blade Dance, Eclipse, Flash Stance
│
└── Mercenary（1st特化：重装）
    ├── [AoE列] Whirlwind, Stomp, Circle Swing
    ├── [前方列] Flying Swing, Demolition Fist
    └── [バフ列] Taunting Howl, Iron Skin, Battle Howl
    ├──→ Barbarian（2nd: AoE特化）
    └──→ Destroyer（2nd: 破壊特化）
```

**Sorceress系**
```
Sorceress（基底）
├── Elemental Lord（1st特化：元素魔法）
│   ├── [火列] Flame Spark, Fireball, Inferno, Fire Wall, Phoenix Storm
│   ├── [氷列] Glacial Spike, Icy Shards, Freezing Field, Blizzard Storm
│   └── [共通] Elemental Shield, Flame Worm
│   ├──→ Saleana（2nd: 火特化）— Ignition, Rolling Lava
│   └──→ Elestra（2nd: 氷特化）— Ice Stacker, Frost Wind
│
└── Force User（1st特化：力場魔法）
    ├── [暗黒列] Gravity Ball, Summon Black Hole, Poison Missile, Nine Tail Laser
    ├── [光列] Force Explosion, Linear Ray, Spectrum Shower, Laser Cutter
    └── [時空列] Time Stop, Time Acceleration, Slow Area
    ├──→ Majesty（2nd: 暗黒特化）
    └──→ Smasher（2nd: 光特化）
```

---

## 本作のスキルツリー全体設計

### クラス構成

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ⚔️ ウォリアー（Warrior）          🔮 ソーサレス（Sorceress）│
│   ├── 基底スキル (8スキル)           ├── 基底スキル (8スキル)  │
│   │                                │                        │
│   ├── ソードマスター                 ├── エレメンタルロード     │
│   │   (物理列5 + 魔法剣列5)         │   (火列5 + 氷列5)      │
│   │                                │                        │
│   └── マーセナリー                   └── フォースユーザー      │
│       (AoE列5 + バフ列5)                (暗黒列5 + 時空列5)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### SP経済設計（★超重要）

| 項目 | 数値 | 設計意図 |
|------|------|---------|
| 基底スキル総コスト（全Lv5） | 40 SP | 全MAXは絶対できない |
| 特化A 総コスト（全Lv5） | 50 SP | 同上 |
| 特化B 総コスト（全Lv5） | 50 SP | 同上 |
| **全スキル合計コスト** | **140 SP** | — |
| ダンジョン1初回クリア報酬 | 5 SP | — |
| ダンジョン2初回クリア報酬 | 7 SP | — |
| ダンジョン3初回クリア報酬 | 10 SP | — |
| ダンジョン周回1回あたり | 2 SP | — |
| **想定獲得SP（3面×3周）** | **40 SP** | 全体の28%しか振れない |
| **やり込み上限（10周想定）** | **82 SP** | 全体の58%。まだ足りない |

**この希少性が「次はどこに振ろう」の中毒性を生む。**
本家DNと同じく「全取り不可能」がビルドの個性＝リプレイ性。

---

## ⚔️ ウォリアー完全スキルツリー

### 基底スキル（Warrior Base）

全ウォリアーが最初から使用可能。特化選択前でもSPを振れる。

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 | 操作 |
|---|---------|--------|---------|---------|-------|---------|------|
| W1 | **インパクトパンチ** | アクティブ | ATK×80% 敵を浮かせる CD:6s | ATK×160% | 1 | なし | 左クリック後追加入力 |
| W2 | **ヘビースラッシュ** | アクティブ | ATK×155% 前方叩き CD:8s | ATK×310% | 1 | なし | 右クリック |
| W3 | **ライジングスラッシュ** | アクティブ | ATK×120% 打ち上げ CD:10s | ATK×240%+2段攻撃 | 2 | W1 Lv1 | スキルスロット |
| W4 | **タンブル** | 回避 | 回避ロール CD:4s | CD:2s | 1 | なし | Space |
| W5 | **エアリアルイベイジョン** | 回避 | 空中回復 CD:20s | CD:12s | 1 | W4 Lv1 | 被打ち上げ中Space |
| W6 | **ダッシュ** | 移動 | ダッシュ移動 MP微消費 | 消費-50% 速度+20% | 1 | W4 Lv2 | 方向キー2回 |
| W7 | **フィジカルマスタリー** | パッシブ | HP上限+5% | HP上限+25% | 1 | なし | — |
| W8 | **メンタルマスタリー** | パッシブ | MP上限+5% | MP上限+25% | 1 | なし | — |

**基底スキル設計の意図:**
- W1-W3が「コンボの土台」。本家DNの**Impact Punch → Rising Slash → Heavy Slash**の連携を再現
- W4-W6が「生存手段」。タンブルのCD短縮は本家でも最優先投資先
- W7-W8はステータスパッシブ。SP余りの受け皿（本家と同じ）

---

### ★ 特化選択（転職）イベント

| 項目 | 内容 |
|------|------|
| **トリガー** | **ダンジョン1「森の洞窟」初回クリア時** |
| **演出** | ホームタウンに戻った際、スキルマスターNPCが転職イベントを開始 |
| **選択肢** | ソードマスター or マーセナリー（ウォリアー）/ エレメンタルロード or フォースユーザー（ソーサレス） |
| **結果** | 選んだ側の特化スキルが解放。選ばなかった側は以後SP投資不可 |
| **報酬** | 転職と同時にダンジョン1クリア報酬の **SP 5** を獲得 |

> ダンジョン1は基底8スキルだけでクリアできるバランス。転職後のダンジョン2以降で特化スキルが活きる設計。

---

### ソードマスター特化（Sword Master）

本家DNのソードマスターは**物理列（左カラム）と魔法剣列（右カラム）**の2列構成。
物理列を極めればGladiator型、魔法列を極めればMoonlord型のプレイスタイルになる。

#### 物理列（Blade Column）— 近接コンボDPS

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| SM1 | **ダッシュスラッシュ** | アクティブ | ATK×200% 前方突進3段 CD:7s | ATK×400% | 2 | W6 Lv1 |
| SM2 | **トリプルスラッシュ** | アクティブ | ATK×80%×3hit 前方連斬 CD:6s | ATK×160%×3hit | 2 | SM1 Lv1 |
| SM3 | **ラインドライブ** | アクティブ | ATK×350% 突進貫通 CD:12s | ATK×700% ノックバック大 | 2 | SM2 Lv2 |
| SM4 | **ハッキングスタンス** | アクティブ | ATK×60%×8hit 連続叩き CD:15s | ATK×120%×8hit | 3 | SM3 Lv2 |
| SM5 | **★ インフィニティエッジ** | 🟣究極 | ATK×1200% 超高速20連斬 CD:35s | ATK×2400% | 5 | SM4 Lv3 + 物理列SP15以上 |

#### 魔法剣列（Wave Column）— 中距離範囲攻撃

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| SM6 | **ムーンライトスプリッター** | アクティブ | MATK×180% 三日月弾 CD:9s | MATK×360% 弾数3 | 2 | W3 Lv2 |
| SM7 | **サイクロンスラッシュ** | アクティブ | MATK×150% 周囲回転斬 CD:8s DEF-10%デバフ | MATK×300% DEF-20% | 2 | SM6 Lv1 |
| SM8 | **ハーフムーンスラッシュ** | アクティブ | MATK×400% 前方大半月 CD:14s | MATK×800% | 2 | SM7 Lv2 |
| SM9 | **クレセントクリーヴ** | アクティブ | MATK×200%×5wave 前方衝撃波 CD:12s | MATK×400%×5wave | 3 | SM8 Lv2 |
| SM10 | **★ グレートウェーブ** | 🟣究極 | MATK×1500% 全方位剣気解放 CD:40s | MATK×3000% | 5 | SM9 Lv3 + 魔法列SP15以上 |

**ソードマスター設計の意図:**
- **物理列**は本家Gladiatorの「高速連撃→Finish」の感触。Dash Slash→Triple Slash→Line Driveのコンボルート
- **魔法剣列**は本家Moonlordの「中距離から剣気を飛ばす」感触。Moonlight Splitter→Cyclone→Halfmoon Slash
- **両方の究極を取得可能だが、片方使うともう片方もCDに入る**（本家DN準拠）
- 物理列MAX（SP25）+ 魔法列MAX（SP25）= 50SP。獲得SP的にどちらかに寄せるしかない

---

### マーセナリー特化（Mercenary）

本家DNのマーセナリーは**AoE列と前方打撃列とバフ/デバフ列**の構成。
重い攻撃でスーパーアーマーを破壊し、仲間をバフする「タンク/サポート寄り」の戦士。

#### AoE列（Devastation Column）— 周囲殲滅

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| MC1 | **ストンプ** | アクティブ | ATK×150% 足元衝撃波+スロウ CD:8s | ATK×300% スロウ3s | 2 | W2 Lv2 |
| MC2 | **ワールウィンド** | アクティブ | ATK×100%×4hit 回転攻撃 CD:10s | ATK×200%×4hit | 2 | MC1 Lv1 |
| MC3 | **サークルスウィング** | アクティブ | ATK×500% 大回転 CD:15s SA破壊大 | ATK×1000% | 2 | MC2 Lv2 |
| MC4 | **デモリションフィスト** | アクティブ | ATK×600% 地面叩き+打ち上げ CD:18s | ATK×1200% 範囲+50% | 3 | MC3 Lv2 |
| MC5 | **★ メイルストロームハウル** | 🟣究極 | ATK×2000% 暴風域展開5s CD:45s | ATK×4000% | 5 | MC4 Lv3 + AoE列SP15以上 |

#### バフ列（Warcry Column）— 自己/味方強化 + 挑発

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| MC6 | **アイアンスキン** | バフ | DEF+15% 8秒間 CD:20s | DEF+40% 15秒間 | 2 | W7 Lv2 |
| MC7 | **トーンティングハウル** | デバフ | 敵ATK-10% 全ヘイト集中 CD:15s | ATK-25% 範囲拡大 | 2 | MC6 Lv1 |
| MC8 | **バトルハウル** | バフ | 自ATK+15% 10s CD:20s | ATK+35% 15s | 2 | MC7 Lv2 |
| MC9 | **ハウリングチャージ** | アクティブ | ATK×300% 突進+スーパーアーマー CD:12s | ATK×600% SA時間延長 | 3 | MC8 Lv1 |
| MC10 | **★ フォートレス** | 🟣究極 | 10秒無敵+DEF+50%オーラ+HP1%/s回復 CD:60s | DEF+100% HP3%/s | 5 | MC6 Lv3 + バフ列SP15以上 |

**マーセナリー設計の意図:**
- 本家Mercenaryの**Stomp→Whirlwind→Circle Swing**の「重い一撃」コンボを再現
- バフ列は本家の**Taunting Howl / Iron Skin / Battle Howl**を忠実に反映
- 究極2種が「AoE殲滅（攻）」vs「無敵要塞（防）」の明確な対比
- ソードマスターが「コンボ火力」ならマーセナリーは「耐久＋殲滅」の差別化

---

## 🔮 ソーサレス完全スキルツリー

### 基底スキル（Sorceress Base）

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 | 操作 |
|---|---------|--------|---------|---------|-------|---------|------|
| S1 | **マジックミサイル** | アクティブ | MATK×60% 追尾弾 CD:0s（通常攻撃） | MATK×120% | 1 | なし | 左クリック |
| S2 | **ボイドブラスト** | アクティブ | MATK×140% 前方爆発 CD:6s | MATK×280% 範囲+30% | 1 | なし | 右クリック |
| S3 | **グレイシャルスパイク** | アクティブ | MATK×100% 氷弾+スロウ20% CD:5s | MATK×200% スロウ40% | 2 | S1 Lv1 | スキルスロット |
| S4 | **テレポート** | 回避 | 短距離瞬間移動+無敵0.3s CD:5s | CD:2.5s 距離+50% | 1 | なし | Space |
| S5 | **エアリアルイベイジョン** | 回避 | 空中回復 CD:20s | CD:12s | 1 | S4 Lv1 | 被打ち上げ中Space |
| S6 | **ポイズンミサイル** | アクティブ | MATK×50%/s 毒沼設置3s CD:8s | MATK×100%/s 5s | 2 | S2 Lv2 | スキルスロット |
| S7 | **インテリジェンスマスタリー** | パッシブ | MATK+5% | MATK+25% | 1 | なし | — |
| S8 | **マインドコンカー** | パッシブ | MP回復速度+10% | MP回復速度+50% | 1 | なし | — |

**基底スキル設計の意図:**
- S1（マジックミサイル）が通常攻撃＝本家DNソーサレスの「杖通常が追尾弾」を再現
- S3（グレイシャルスパイク）は本家のGlacial Spike。低CD氷弾でスロウ→コンボ起点
- S4（テレポート）はウォリアーのタンブルと差別化。距離は短いが即座の無敵
- S6（ポイズンミサイル）は本家のPoison Missile。設置型DOT

---

### エレメンタルロード特化（Elemental Lord）

本家DNのエレメンタルロードは**火列（左）と氷列（右）**の2列構成。
火を極めればSaleana型（高火力DPS）、氷を極めればElestra型（凍結CC+サポート）。

#### 火列（Flame Column）— 高火力・燃焼

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| EL1 | **フレイムスパーク** | アクティブ | MATK×120% 火球2連射 CD:4s 燃焼2s | MATK×240% 燃焼4s | 2 | S2 Lv2 |
| EL2 | **ファイアボール** | アクティブ | MATK×350% 大火球+爆風 CD:10s | MATK×700% 爆風範囲+50% | 2 | EL1 Lv1 |
| EL3 | **インフェルノ** | アクティブ | MATK×200%×3hit 火柱 CD:12s 燃焼5s | MATK×400%×3hit 燃焼8s | 2 | EL2 Lv2 |
| EL4 | **フレイムウォール** | アクティブ | MATK×80%/s 炎壁設置 8s CD:18s | MATK×160%/s 12s | 3 | EL3 Lv2 |
| EL5 | **★ フェニックスストーム** | 🟣究極 | MATK×2500% 不死鳥降臨+全体燃焼 CD:40s | MATK×5000% | 5 | EL4 Lv3 + 火列SP15以上 |

#### 氷列（Frost Column）— 凍結CC・デバフ

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| EL6 | **アイシーシャード** | アクティブ | MATK×100%×3hit 氷片散射 CD:5s | MATK×200%×3hit 凍結1s | 2 | S3 Lv2 |
| EL7 | **フリージングフィールド** | アクティブ | MATK×250% 範囲凍結2s CD:14s | MATK×500% 凍結4s | 2 | EL6 Lv1 |
| EL8 | **フロストウィンド** | アクティブ | MATK×150%×4hit 氷嵐 CD:10s 氷耐性-15% | MATK×300%×4hit 氷耐性-30% | 2 | EL7 Lv2 |
| EL9 | **エレメンタルシールド** | バフ | ダメージ吸収シールド MATK×200%分 CD:25s | MATK×500%分 CD:18s | 3 | EL6 Lv2 |
| EL10 | **★ ブリザードストーム** | 🟣究極 | MATK×1800% 氷嵐+全体凍結3s CD:45s | MATK×3600% 凍結5s | 5 | EL8 Lv3 + 氷列SP15以上 |

**エレメンタルロード設計の意図:**
- 本家の**Flame Spark → Fireball → Inferno → Fire Wall → Phoenix Storm**の火列スキル進行を忠実に再現
- 氷列は本家の**Icy Shards → Freezing Field → Frost Wind → Elemental Shield → Blizzard Storm**を再現
- 火は「高ダメージ＋燃焼DOT」、氷は「凍結CC＋耐性デバフ」の本家準拠の対比
- EL9（エレメンタルシールド）は本家のElemental Shield。氷列だがDPS目的でなく生存用

---

### フォースユーザー特化（Force User）

本家DNのフォースユーザーは**暗黒/重力列と光/レーザー列と時空バフ列**の構成。
暗黒を極めればMajesty型（デバフ＋暗黒DPS）、時空を極めればSmasher型（光DPS＋バフ）。

#### 暗黒列（Gravity Column）— 重力・暗黒魔法

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| FU1 | **グラビティボール** | アクティブ | MATK×200% 重力弾+引き寄せ CD:7s | MATK×400% 引き寄せ範囲+50% | 2 | S6 Lv1 |
| FU2 | **サモンブラックホール** | アクティブ | MATK×100%/s 吸引3s CD:15s 集敵 | MATK×200%/s 5s | 2 | FU1 Lv2 |
| FU3 | **ナインテイルレーザー** | アクティブ | MATK×150%×9hit 追尾レーザー CD:12s | MATK×300%×9hit | 2 | FU2 Lv1 |
| FU4 | **グラビティクラッシュ** | アクティブ | MATK×600% 重力圧縮+スタン2s CD:18s | MATK×1200% スタン3s | 3 | FU3 Lv2 |
| FU5 | **★ シンギュラリティ** | 🟣究極 | MATK×3000% ブラックホール展開+全吸引+圧壊 CD:50s | MATK×6000% | 5 | FU4 Lv3 + 暗黒列SP15以上 |

#### 時空列（Chrono Column）— 時間操作・バフ/デバフ

| # | スキル名 | タイプ | Lv1効果 | Lv5効果 | SP/Lv | 前提条件 |
|---|---------|--------|---------|---------|-------|---------|
| FU6 | **スローエリア** | デバフ | 範囲内敵速度-30% 5s CD:12s | 速度-60% 8s | 2 | S3 Lv2 |
| FU7 | **タイムアクセラレーション** | バフ | 自分のCD-20% 10s CD:25s | CD-40% 15s | 2 | FU6 Lv2 |
| FU8 | **タイムストップ** | デバフ | 範囲内全敵3s停止 CD:20s | 5s停止 CD:15s | 2 | FU7 Lv2 |
| FU9 | **リニアレイ** | アクティブ | MATK×400% 直線貫通ビーム CD:10s | MATK×800% | 3 | FU6 Lv1 |
| FU10 | **★ タイムブレイク** | 🟣究極 | 全敵5s停止+MATK×2000% 時空崩壊 CD:55s | 8s停止+MATK×4000% | 5 | FU8 Lv3 + 時空列SP15以上 |

**フォースユーザー設計の意図:**
- 暗黒列は本家の**Gravity Ball → Summon Black Hole → Nine Tail Laser**を再現。「敵を集めて潰す」
- 時空列は本家の**Slow Area → Time Acceleration → Time Stop**を再現。「時を止める」快感
- FU7（タイムアクセラレーション）は本家の同名スキル。自分のCD短縮＝DPSループ加速
- 暗黒は「集敵→殲滅」、時空は「操作＋バフ」の本家準拠対比
- リニアレイは本家Force UserのLinear Ray。時空列だが攻撃手段として配置

---

## 🎮 スキルツリーUI設計

### 画面レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│  [基底スキル] [ソードマスター] [マーセナリー]  ← タブ切替     │
│                                                             │
│  SP残り: 12 / 合計投資: 28                                   │
│                                                             │
│  ┌──────────物理列──────────┐  ┌──────────魔法剣列─────────┐  │
│  │                          │  │                          │  │
│  │  [ダッシュスラッシュ]     │  │  [ムーンライトスプリッター]│  │
│  │  ★★★☆☆  SP: 6/10       │  │  ★★☆☆☆  SP: 4/10       │  │
│  │    ↓                     │  │    ↓                     │  │
│  │  [トリプルスラッシュ]     │  │  [サイクロンスラッシュ]   │  │
│  │  ★★☆☆☆  SP: 4/10       │  │  ☆☆☆☆☆  SP: 0/10       │  │
│  │    ↓                     │  │    ↓                     │  │
│  │  [ラインドライブ]         │  │  [ハーフムーンスラッシュ] │  │
│  │  ★☆☆☆☆  SP: 2/10       │  │  🔒 前提未達             │  │
│  │    ↓                     │  │    ↓                     │  │
│  │  [ハッキングスタンス]     │  │  [クレセントクリーヴ]     │  │
│  │  🔒 前提未達             │  │  🔒 前提未達             │  │
│  │    ↓                     │  │    ↓                     │  │
│  │  🟣 [インフィニティエッジ]│  │  🟣 [グレートウェーブ]   │  │
│  │  🔒 SP15以上必要         │  │  🔒 SP15以上必要         │  │
│  │                          │  │                          │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
│                                                             │
│  [リセット(全振り直し)]              [閉じる]                │
└─────────────────────────────────────────────────────────────┘
```

### スキル詳細ポップアップ（ホバー時）

```
┌──────────────────────────────────┐
│  ⚔️ ダッシュスラッシュ  Lv.3/5    │
│  ─────────────────────────────── │
│  前方に突進し3段斬りを繰り出す    │
│                                  │
│  ダメージ: ATK × 320%            │
│  クールダウン: 7秒                │
│  MP消費: 35                       │
│  範囲: 前方6m                     │
│                                  │
│  次レベル (Lv.4):                 │
│  ダメージ: ATK × 360% (+40%)     │
│  必要SP: 2                        │
│                                  │
│  前提: ダッシュ Lv.1              │
│  ─────────────────────────────── │
│  [+1 SP投資]  [−1 SP回収]         │
└──────────────────────────────────┘
```

---

## 📊 skills.json データ構造

```json
{
  "warrior": {
    "base": [
      {
        "id": "w_impact_punch",
        "name": "インパクトパンチ",
        "nameEN": "Impact Punch",
        "column": "base",
        "type": "active",
        "icon": "icon_impact_punch",
        "maxLevel": 5,
        "spPerLevel": 1,
        "prerequisite": null,
        "cooldown": 6000,
        "mpCost": 15,
        "input": "left_click_chain",
        "animation": "anim_impact_punch",
        "sfx": "sfx_punch",
        "levels": [
          { "level": 1, "damageMultiplier": 0.8,  "description": "ATK×80% 敵を浮かせる" },
          { "level": 2, "damageMultiplier": 1.0,  "description": "ATK×100%" },
          { "level": 3, "damageMultiplier": 1.2,  "description": "ATK×120%" },
          { "level": 4, "damageMultiplier": 1.4,  "description": "ATK×140%" },
          { "level": 5, "damageMultiplier": 1.6,  "description": "ATK×160%" }
        ],
        "aoeType": "cone",
        "aoeAngle": 45,
        "range": 2
      },
      {
        "id": "w_rising_slash",
        "name": "ライジングスラッシュ",
        "nameEN": "Rising Slash",
        "column": "base",
        "type": "active",
        "icon": "icon_rising_slash",
        "maxLevel": 5,
        "spPerLevel": 2,
        "prerequisite": { "skillId": "w_impact_punch", "level": 1 },
        "cooldown": 10000,
        "mpCost": 30,
        "input": "skill_slot",
        "animation": "anim_rising_slash",
        "sfx": "sfx_slash_heavy",
        "levels": [
          { "level": 1, "damageMultiplier": 1.2,  "hits": 1, "description": "ATK×120% 打ち上げ" },
          { "level": 2, "damageMultiplier": 1.5,  "hits": 1, "description": "ATK×150%" },
          { "level": 3, "damageMultiplier": 1.8,  "hits": 2, "description": "ATK×180% 2段攻撃解放" },
          { "level": 4, "damageMultiplier": 2.1,  "hits": 2, "description": "ATK×210%" },
          { "level": 5, "damageMultiplier": 2.4,  "hits": 2, "description": "ATK×240%" }
        ],
        "aoeType": "line",
        "range": 3
      }
    ],

    "swordmaster": {
      "blade": [
        {
          "id": "sm_dash_slash",
          "name": "ダッシュスラッシュ",
          "nameEN": "Dash Slash",
          "column": "blade",
          "type": "active",
          "maxLevel": 5,
          "spPerLevel": 2,
          "prerequisite": { "skillId": "w_dash", "level": 1 },
          "treeSpRequirement": null,
          "cooldown": 7000,
          "levels": [
            { "level": 1, "damageMultiplier": 2.0, "hits": 3 },
            { "level": 2, "damageMultiplier": 2.5, "hits": 3 },
            { "level": 3, "damageMultiplier": 3.0, "hits": 3 },
            { "level": 4, "damageMultiplier": 3.5, "hits": 3 },
            { "level": 5, "damageMultiplier": 4.0, "hits": 3 }
          ]
        }
      ],
      "wave": [
        {
          "id": "sm_moonlight_splitter",
          "name": "ムーンライトスプリッター",
          "nameEN": "Moonlight Splitter",
          "column": "wave",
          "type": "active",
          "maxLevel": 5,
          "spPerLevel": 2,
          "prerequisite": { "skillId": "w_rising_slash", "level": 2 },
          "treeSpRequirement": null,
          "cooldown": 9000,
          "damageType": "magical",
          "levels": [
            { "level": 1, "damageMultiplier": 1.8, "projectiles": 1 },
            { "level": 2, "damageMultiplier": 2.2, "projectiles": 1 },
            { "level": 3, "damageMultiplier": 2.6, "projectiles": 2 },
            { "level": 4, "damageMultiplier": 3.0, "projectiles": 2 },
            { "level": 5, "damageMultiplier": 3.6, "projectiles": 3 }
          ]
        }
      ]
    },

    "mercenary": {
      "devastation": [],
      "warcry": []
    }
  },

  "sorceress": {
    "base": [],
    "elementalLord": {
      "flame": [],
      "frost": []
    },
    "forceUser": {
      "gravity": [],
      "chrono": []
    }
  },

  "ultimateRule": {
    "description": "両究極スキルを習得可能。ただし一方を使用すると他方もCDに入る",
    "sharedCooldownMultiplier": 1.0
  }
}
```

---

## 🔄 ビルド例（想定プレイスタイル）

### 40SP（3面初回クリア）時点のビルド例

#### ビルドA: 「Gladiator型」物理ソードマスター

| ツリー | 投資先 | SP |
|--------|-------|-----|
| 基底 | Tumble Lv3, Rising Slash Lv3, Physical Mastery Lv3 | 12 |
| 物理列 | Dash Slash Lv3, Triple Slash Lv3, Line Drive Lv2 | 16 |
| 魔法列 | Moonlight Splitter Lv2 | 4 |
| **残り** | **8 SP（究極にはまだ届かない）** | |

→ 次の周回目標は物理列SP15達成→**インフィニティエッジ解放**

#### ビルドB: 「Elestra型」氷エレメンタルロード

| ツリー | 投資先 | SP |
|--------|-------|-----|
| 基底 | Teleport Lv3, Glacial Spike Lv3, Intelligence Mastery Lv3 | 11 |
| 火列 | Flame Spark Lv1（氷スキルの前提経由） | 2 |
| 氷列 | Icy Shard Lv3, Freezing Field Lv3, Frost Wind Lv2, Elemental Shield Lv1 | 20 |
| **残り** | **7 SP** | |

→ 氷列SP15達成→**ブリザードストーム解放可能！**（氷特化は究極が早い）

#### ビルドC: 「ハイブリッド」フォースユーザー

| ツリー | 投資先 | SP |
|--------|-------|-----|
| 基底 | Teleport Lv2, Poison Missile Lv3, Mind Conquer Lv3 | 10 |
| 暗黒列 | Gravity Ball Lv3, Black Hole Lv2, Nine Tail Laser Lv1 | 12 |
| 時空列 | Slow Area Lv2, Time Acceleration Lv3, Time Stop Lv1 | 12 |
| **残り** | **6 SP** | |

→ どちらの究極にも届かないが、**両方のユーティリティを使える万能型**

---

## ⚙️ 実装上の注意点

### スキル発動の入力体系

```
通常攻撃:   左クリック（W1 Impact Punch / S1 Magic Missile）
強攻撃:     右クリック（W2 Heavy Slash / S2 Void Blast）
スキル1-4:  キーボード 1, 2, 3, 4（スキルスロットに自由配置）
回避:       Space（W4 Tumble / S4 Teleport）
スキルツリー: Tab キー
```

### スキルスロット制限

- **4スロット**にセットしたスキルのみ戦闘で使用可能
- 基底スキル・特化スキル問わず自由に配置
- タウンでのみ変更可能（ダンジョン内は固定）
- 通常攻撃（左クリック）、強攻撃（右クリック）、回避（Space）は固定

### 前提条件チェックのロジック

```javascript
function canLearnSkill(skillId, currentBuild) {
  const skill = getSkillData(skillId);
  
  // 1. 前提スキルチェック
  if (skill.prerequisite) {
    const preReqLevel = currentBuild[skill.prerequisite.skillId] || 0;
    if (preReqLevel < skill.prerequisite.level) return false;
  }
  
  // 2. ツリーSP投資チェック（究極スキル用）
  if (skill.treeSpRequirement) {
    const columnSP = calcColumnSP(skill.column, currentBuild);
    if (columnSP < skill.treeSpRequirement) return false;
  }
  
  // 3. SP残量チェック
  if (remainingSP < skill.spPerLevel) return false;
  
  return true;
}
```

---

## 📝 前回プランからの変更点

| 項目 | 前回プラン | 今回（DN準拠版） |
|------|-----------|----------------|
| ツリー構造 | 2系統×4スキル＝8スキル/クラス | **基底8 + 特化A10 + 特化B10 = 28スキル/クラス** |
| スキルレベル | 習得のみ（ON/OFF） | **Lv1〜5の段階制（SP追加投入）** |
| 前提条件 | レベル制限のみ | **スキルLv前提 + ツリーSP投資前提** |
| SP経済 | 全スキル取得可能 | **全MAXは不可能（28%→58%のみ）** |
| 究極スキル | 系統ごと1つ | **両方取得可能、使用で両方CD** |
| カラム構成 | 1系統1列 | **1特化内に2カラム（物理/魔法、火/氷等）** |
| ビルド多様性 | 2パターン | **数十パターン（ハイブリッド含む）** |
