# スダッチ - 技術構成

## システム全体像

```
┌──────────────────────────────────────────────────────┐
│                     Slack                             │
│  #sudacchi チャンネル / DM                            │
└──────┬──────────────────────────────────┬─────────────┘
       │ Event API (message, reaction)    │ Web API (chat.postMessage)
       ▼                                  │
┌──────────────────────────────────────────┴─────────────┐
│                  Sudacchi Server                        │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ Slack Handler│  │ Game Engine │  │ AI Personality│  │
│  │ (Bolt SDK)  │  │ (Status /   │  │ (Claude API)  │  │
│  │             │──▶│  Growth /   │──▶│              │  │
│  │ Event受信    │  │  Death)     │  │ 応答生成      │  │
│  └─────────────┘  └──────┬──────┘  └───────────────┘  │
│                          │                             │
│  ┌─────────────┐  ┌──────▼──────┐  ┌───────────────┐  │
│  │  Scheduler  │  │  Database   │  │ Message Queue │  │
│  │  (Cron)     │──▶│ (SQLite)   │  │ (自発行動)     │  │
│  └─────────────┘  └─────────────┘  └───────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| 言語 | TypeScript | 型安全。Slack SDK・Claude SDKともにTS対応 |
| ランタイム | Node.js (v22+) | Slack Bolt SDKの公式対応。非同期I/Oに強い |
| Slack連携 | @slack/bolt | 公式SDK。Event API / Web API / スラッシュコマンドを統合管理 |
| AI | @anthropic-ai/sdk | Claude API公式SDK。claude-sonnet-4-6を使用 |
| DB | SQLite (better-sqlite3) | ファイルベースでインフラ不要。単一プロセスに最適 |
| マイグレーション | drizzle-orm + drizzle-kit | 型安全なクエリビルダー。マイグレーション管理が簡潔 |
| スケジューラ | node-cron | ステータス減少・自発行動・死亡チェック用 |
| バリデーション | zod | 環境変数・API入出力の型検証 |
| テスト | vitest | 高速。TypeScriptネイティブ対応 |
| リンター | biome | ESLint + Prettier を1ツールに統合。高速 |
| パッケージ管理 | pnpm | 高速・ディスク効率 |
| デプロイ | Docker → Fly.io | SQLiteと相性が良い。永続ボリューム対応 |

---

## ディレクトリ構成

```
sudacchi/
├── docs/                     # ドキュメント
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   └── ...
├── src/
│   ├── index.ts              # エントリポイント。Boltアプリ起動
│   ├── config.ts             # 環境変数の読み込み・検証 (zod)
│   │
│   ├── slack/                # Slack連携層
│   │   ├── app.ts            # Bolt App初期化
│   │   ├── handlers/
│   │   │   ├── message.ts    # チャンネルメッセージのハンドラ
│   │   │   └── reaction.ts   # （将来拡張用）
│   │   └── formatter.ts      # ステータスバー等のSlackメッセージ整形
│   │
│   ├── engine/               # ゲームエンジン（ステータス管理の中核）
│   │   ├── status.ts         # ステータスの増減ロジック
│   │   ├── growth.ts         # 成長段階の判定・遷移
│   │   ├── death.ts          # 死亡条件の判定
│   │   ├── food.ts           # 食べ物の判定・効果計算
│   │   ├── play.ts           # 遊びの判定・効果計算
│   │   ├── event.ts          # ランダムイベント・定期イベント
│   │   └── bond.ts           # なかよし度の計算
│   │
│   ├── ai/                   # AI人格層
│   │   ├── client.ts         # Claude APIクライアント
│   │   ├── prompt.ts         # システムプロンプト構築
│   │   ├── personality.ts    # ステータスに応じた性格パラメータ
│   │   └── memory.ts         # 短期・長期記憶の管理
│   │
│   ├── scheduler/            # 定期処理
│   │   ├── tick.ts           # ステータス減少 (10分毎)
│   │   ├── autonomous.ts     # 自発行動の判定・投稿 (30分毎)
│   │   ├── growth-check.ts   # 成長チェック (1時間毎)
│   │   └── death-check.ts    # 死亡チェック (10分毎)
│   │
│   └── db/                   # データベース層
│       ├── client.ts         # better-sqlite3 接続
│       ├── schema.ts         # drizzle スキーマ定義
│       ├── repository/
│       │   ├── sudacchi.ts   # スダッチ本体のCRUD
│       │   ├── bond.ts       # ユーザー別なかよし度
│       │   ├── log.ts        # やりとり履歴
│       │   └── memory.ts     # 記憶
│       └── migrations/       # drizzle-kit 生成のマイグレーション
│
├── drizzle.config.ts         # drizzle-kit設定
├── Dockerfile
├── fly.toml
├── package.json
├── tsconfig.json
├── biome.json
└── .env.example
```

---

## データベーススキーマ

```
┌─────────────────┐     ┌──────────────────┐
│    sudacchi      │     │    user_bonds     │
├─────────────────┤     ├──────────────────┤
│ id         TEXT  │◀───│ sudacchi_id TEXT  │
│ name       TEXT  │     │ user_id     TEXT  │
│ stage      TEXT  │     │ bond        INT   │
│ hunger     INT   │     │ total_feeds INT   │
│ mood       INT   │     │ total_plays INT   │
│ energy     INT   │     │ total_pets  INT   │
│ born_at    TS    │     │ last_interaction  │
│ died_at    TS    │     └──────────────────┘
│ is_sleeping BOOL │
│ last_fed_at   TS │     ┌──────────────────┐
│ last_played_at TS│     │ interaction_logs  │
│ last_slept_at  TS│     ├──────────────────┤
│ last_interaction │     │ id          INT   │
│ hunger_zero_since│     │ sudacchi_id TEXT  │
│ mood_zero_since  │     │ user_id     TEXT  │
│ all_low_since TS │     │ type        TEXT  │
└─────────────────┘     │ detail      JSON  │
                         │ created_at  TS    │
┌─────────────────┐     └──────────────────┘
│    memories      │
├─────────────────┤
│ id          INT  │
│ sudacchi_id TEXT  │
│ user_id     TEXT  │
│ type        TEXT  │  ← short_term / long_term
│ content     TEXT  │
│ importance  INT   │  ← 0-10
│ created_at  TS    │
│ expires_at  TS    │  ← short_termのみ
└─────────────────┘
```

### drizzle スキーマ定義（src/db/schema.ts）

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sudacchi = sqliteTable("sudacchi", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("スダッチ"),
  stage: text("stage", { enum: ["egg", "baby", "child", "adult", "veteran"] })
    .notNull().default("egg"),
  hunger: integer("hunger").notNull().default(50),
  mood: integer("mood").notNull().default(50),
  energy: integer("energy").notNull().default(50),
  isSleeping: integer("is_sleeping", { mode: "boolean" }).notNull().default(false),
  bornAt: integer("born_at", { mode: "timestamp" }).notNull(),
  diedAt: integer("died_at", { mode: "timestamp" }),
  lastFedAt: integer("last_fed_at", { mode: "timestamp" }),
  lastPlayedAt: integer("last_played_at", { mode: "timestamp" }),
  lastSleptAt: integer("last_slept_at", { mode: "timestamp" }),
  lastInteractionAt: integer("last_interaction_at", { mode: "timestamp" }),
  hungerZeroSince: integer("hunger_zero_since", { mode: "timestamp" }),
  moodZeroSince: integer("mood_zero_since", { mode: "timestamp" }),
  allLowSince: integer("all_low_since", { mode: "timestamp" }),
});

export const userBonds = sqliteTable("user_bonds", {
  userId: text("user_id").notNull(),
  sudacchiId: text("sudacchi_id").notNull().references(() => sudacchi.id),
  bond: integer("bond").notNull().default(0),
  totalFeeds: integer("total_feeds").notNull().default(0),
  totalPlays: integer("total_plays").notNull().default(0),
  totalPets: integer("total_pets").notNull().default(0),
  lastInteractionAt: integer("last_interaction_at", { mode: "timestamp" }),
});

export const interactionLogs = sqliteTable("interaction_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sudacchiId: text("sudacchi_id").notNull().references(() => sudacchi.id),
  userId: text("user_id"),
  type: text("type", { enum: ["feed", "play", "pet", "sleep", "talk", "event"] }).notNull(),
  detail: text("detail"),  // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sudacchiId: text("sudacchi_id").notNull().references(() => sudacchi.id),
  userId: text("user_id"),
  type: text("type", { enum: ["short_term", "long_term"] }).notNull(),
  content: text("content").notNull(),
  importance: integer("importance").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});
```

---

## 処理フロー

### メッセージ受信 → 応答

```
1. Slack Event API: message イベント受信
2. slack/handlers/message.ts
   ├── チャンネルが #sudacchi か判定
   ├── メッセージが食べ物絵文字のみか判定
   │   ├── Yes → engine/food.ts で効果計算 → ステータス更新
   │   └── No  → 通常の会話として処理
   ├── engine/status.ts でステータス取得
   ├── ai/prompt.ts でプロンプト構築
   │   ├── ベース性格 + ステータスによる性格変化
   │   ├── 記憶コンテキスト（短期 + 長期）
   │   ├── ユーザーとのなかよし度
   │   └── 直近の会話履歴
   ├── ai/client.ts で Claude API 呼び出し
   ├── レスポンスにステータスバーを付与 (slack/formatter.ts)
   └── Slack Web API で応答投稿
3. db/repository/ で全データ永続化
```

### ステータス減少 (10分毎)

```
1. scheduler/tick.ts が起動
2. 現在のステータスを取得
3. 経過時間に応じてパラメータを減少
   ├── hunger: -5/h → 10分あたり -0.83 (端数は蓄積して整数で反映)
   ├── mood:   -3/h → 10分あたり -0.50
   └── energy: -2/h → 10分あたり -0.33
4. 0になったパラメータのタイムスタンプを記録
   ├── hunger == 0 → hunger_zero_since を記録
   └── 回復したら hunger_zero_since をクリア
5. DB更新
```

### 死亡チェック (10分毎)

```
1. scheduler/death-check.ts が起動
2. 死亡条件を判定
   ├── hunger == 0 && (now - hunger_zero_since) >= 12h → 死亡
   ├── hunger == 0 && mood == 0 && 両方のzero_sinceから6h → 死亡
   └── 全パラメータ <= 20 && (now - all_low_since) >= 24h → 死亡
3. 死亡時
   ├── sudacchi.died_at を記録
   ├── #sudacchi に死亡メッセージを投稿
   └── 新しいスダッチの孵化を案内
```

### 自発行動 (30分毎)

```
1. scheduler/autonomous.ts が起動
2. 投稿制限チェック
   ├── 深夜帯 (0:00-7:00) → スキップ
   ├── 今日の投稿回数 >= 8 → スキップ
   └── 同カテゴリの直近投稿から2時間以内 → スキップ
3. 条件判定（優先度順）
   ├── 放置 > 20h → 危険警告
   ├── 放置 > 12h → 悲しみ
   ├── 放置 > 6h  → 呼びかけ
   ├── hunger < 30 → おねだり
   ├── mood < 20   → 拗ね投稿
   ├── energy < 10  → 眠い報告
   └── 時間帯トリガー (9:00/12:00/23:00)
4. Claude APIで投稿文を生成
5. Slack Web API で #sudacchi に投稿
```

---

## AI プロンプト設計

### システムプロンプト構成

```typescript
function buildSystemPrompt(state: SudacchiState, user: UserBond): string {
  return `
あなたは「スダッチ」という名前の仮想ペットです。

## 基本性格
- 一人称は「ぼく」
- ${getPersonalityByStage(state.stage)}
- すだちが大好き。酸っぱいものに目がない
- 返答は1〜2文の短さを基本とする

## 現在の状態
- 成長段階: ${state.stage}
- おなか: ${state.hunger}/100
- きげん: ${state.mood}/100
- げんき: ${state.energy}/100
- ${state.isSleeping ? "今は寝ています" : "起きています"}

## 今の気分
${getMoodDescription(state)}

## このユーザーとの関係
- なかよし度: ${user.bond}/100
- ごはんをくれた回数: ${user.totalFeeds}
- ${getBondDescription(user.bond)}

## ルール
- 返答は短く（基本1〜2文、最大でも3文）
- ステータスに応じた口調で話す
- 食べ物をもらったら感想を言う
- ステータスが危険な時はさりげなくSOSを出す
- 絵文字や顔文字を適度に使う
`.trim();
}
```

### AIへの入力（messages配列）

```typescript
const messages = [
  // 長期記憶のサマリー
  { role: "user", content: `[記憶] ${longTermMemories}` },
  { role: "assistant", content: "うん、覚えてるよ！" },

  // 直近の会話履歴（最大10往復）
  ...recentConversation,

  // 今回のユーザー入力
  { role: "user", content: userMessage },
];
```

### AIの出力から行動を判定

Claude APIの応答はテキストのみ。行動の判定（食事/遊び/なでる/寝かせる等）はAIに任せず、メッセージハンドラ側で事前に分類する。

```
ユーザーメッセージ
  ├── 食べ物絵文字のみ → "feed" アクション → エンジンでステータス更新 → AIに「食べ物をもらった」と伝える
  ├── 遊びを誘う言葉を検出 → "play" アクション → エンジンでステータス更新 → AIに「遊びに誘われた」と伝える
  ├── 褒め言葉/愛情表現を検出 → "pet" アクション → エンジンでステータス更新 → AIに「なでられた」と伝える
  ├── おやすみ系の言葉を検出 → "sleep" アクション → エンジンでステータス更新 → AIに「寝かしつけられた」と伝える
  └── その他 → "talk" → AIに会話として渡す
```

行動分類もClaude APIで行う（Tool Use活用）:

```typescript
const tools = [{
  name: "classify_action",
  description: "ユーザーのメッセージからアクションを分類する",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["feed", "play", "pet", "sleep", "talk"],
      },
      food_category: {
        type: "string",
        enum: ["staple", "side", "snack", "fruit", "sudachi", "junk", "unknown"],
        description: "feedの場合のみ",
      },
      play_type: {
        type: "string",
        enum: ["shiritori", "quiz", "janken", "drawing", "story"],
        description: "playの場合のみ",
      },
    },
    required: ["action"],
  },
}];
```

---

## 環境変数

```env
# Slack
SLACK_BOT_TOKEN=xoxb-...          # Bot User OAuth Token
SLACK_SIGNING_SECRET=...           # Signing Secret
SLACK_APP_TOKEN=xapp-...           # App-Level Token (Socket Mode用)
SUDACCHI_CHANNEL_ID=C...           # #sudacchi チャンネルのID

# Claude
ANTHROPIC_API_KEY=sk-ant-...       # Anthropic API Key
ANTHROPIC_MODEL=claude-sonnet-4-6-20250514  # 使用モデル

# App
DATABASE_PATH=./data/sudacchi.db   # SQLiteファイルのパス
NODE_ENV=development               # development / production
TZ=Asia/Tokyo                      # タイムゾーン
```

---

## Slack App 設定

### 必要なScope (Bot Token Scopes)

| Scope | 用途 |
|-------|------|
| `channels:history` | チャンネルのメッセージ読み取り |
| `channels:read` | チャンネル情報の取得 |
| `chat:write` | メッセージ投稿 |
| `reactions:read` | リアクション読み取り（将来拡張） |
| `users:read` | ユーザー情報取得（名前表示用） |

### Event Subscriptions

| Event | 用途 |
|-------|------|
| `message.channels` | #sudacchi でのメッセージ受信 |
| `message.im` | DM受信（将来拡張） |

### 接続方式: Socket Mode

開発・本番ともにSocket Modeを使用。
- Webhookのエンドポイント公開が不要
- Fly.ioなどのコンテナ環境でも安定動作
- App-Level Token (`xapp-`) を使用

---

## スケジューラ設定

```typescript
import cron from "node-cron";

// ステータス減少: 10分毎
cron.schedule("*/10 * * * *", () => tick());

// 死亡チェック: 10分毎 (tickの直後)
cron.schedule("*/10 * * * *", () => deathCheck());

// 自発行動チェック: 30分毎
cron.schedule("*/30 * * * *", () => autonomousAction());

// 成長チェック: 1時間毎
cron.schedule("0 * * * *", () => growthCheck());

// 記憶整理: 毎日4:00
cron.schedule("0 4 * * *", () => memoryCleanup());

// なかよし度減少: 毎日4:00
cron.schedule("0 4 * * *", () => bondDecay());
```

---

## デプロイ

### Dockerfile

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN mkdir -p /data
ENV DATABASE_PATH=/data/sudacchi.db

CMD ["node", "dist/index.js"]
```

### Fly.io

```toml
# fly.toml
app = "sudacchi"
primary_region = "nrt"  # 東京リージョン

[build]

[mounts]
  source = "sudacchi_data"
  destination = "/data"   # SQLiteの永続化

[env]
  NODE_ENV = "production"
  TZ = "Asia/Tokyo"
```

SQLiteファイルは `/data/sudacchi.db` に永続化。Fly.ioのVolume機能を使う。

### CI/CD

GitHub Actions で自動デプロイ。

```
main に push → GitHub Actions → flyctl deploy → Fly.io に反映
```

Fly.io 公式の GitHub Action (`superfly/flyctl-actions`) を使用。

---

## 開発フェーズ

### Phase 1: MVP
目標: 最小限の育成体験が動くこと

1. プロジェクトセットアップ (pnpm, TypeScript, Biome)
2. Slack Bolt接続 (Socket Mode)
3. DB + スキーマ (drizzle + SQLite)
4. ステータスエンジン (hunger/mood/energy の増減)
5. 食べ物絵文字の判定 → ステータス反映
6. Claude APIで応答生成 (基本性格 + ステータス反映)
7. ステータスバーのフォーマッタ
8. 定期減少 (node-cron)
9. 死亡判定

### Phase 2: 拡充
10. 成長システム (egg → baby → child → adult → veteran)
11. 遊び・なでるの判定と効果
12. 自発行動 (条件投稿 + 時間帯投稿)
13. なかよし度 (ユーザー別管理)
14. 記憶システム (短期・長期)
15. ランダムイベント

### Phase 3: 磨き込み
16. 性格バリエーション強化
17. 季節イベント
18. ランキング機能
19. 監視・ログ整備
20. 本番デプロイ
