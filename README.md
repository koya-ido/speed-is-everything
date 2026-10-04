# Speed is Everything

反射神経を測定するブラウザゲームです。シングルモードとリアルタイム1対1バトルを備え、ログインするとスコアやプレイデータを記録し、ランキングに参加できます。日本語と英語に対応しています。

## 主な機能

- 反射神経を試すシングルモード
- ルームを作成・参加して遊ぶリアルタイム1対1バトル
- 対戦中の観戦と、待機列からのプレイヤー交代
- PC・モバイル別のランキングとスコア詳細
- Supabase認証、プロフィール、プレイデータの記録
- 日本語・英語の表示

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI / スタイリング**: React 19、Tailwind CSS 4
- **データベース / ORM**: PostgreSQL、Prisma ORM 7 (`@prisma/adapter-pg`)
- **認証**: Supabase Auth (`@supabase/ssr`)
- **多言語対応**: next-intl 4
- **テスト**: Vitest、React Testing Library、Playwright

## 必要な環境

- [Node.js](https://nodejs.org/) 20.9.0以上
- npm
- PostgreSQLデータベース
- Supabaseプロジェクト（認証機能を利用する場合）

## セットアップ

1. リポジトリを取得して依存関係をインストールします。

   ```bash
   git clone git@github.com:koya-ido/speed-is-everything.git
   cd speed-is-everything
   npm install
   ```

2. プロジェクトルートに `.env` ファイルを作成し、次の値を設定します。`.env.example` はリポジトリに含まれていません。値は各サービスの設定から取得してください。

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
   DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   GAME_JWT_SECRET="ランダムな長い秘密鍵"
   ```

   `DATABASE_URL` または `DIRECT_URL` のいずれかが必要です。接続方式に応じて設定してください。Prisma CLIは `DIRECT_URL` が設定されている場合、そちらを優先します。`NEXT_PUBLIC_APP_URL` はサイトの公開URLを明示する場合のみ設定します。秘密鍵や接続文字列を公開リポジトリへコミットしないでください。

3. PostgreSQLにスキーマを反映し、Prisma Clientを生成します。

   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. 開発サーバーを起動します。

   ```bash
   npm run dev
   ```

   [http://localhost:3000/ja](http://localhost:3000/ja) または [http://localhost:3000/en](http://localhost:3000/en) を開きます。

## スクリプト一覧

- `npm run dev`: 開発サーバーを起動します。
- `npm run build`: Prisma Clientを生成して本番ビルドを作成します。
- `npm run start`: 本番ビルドを起動します。
- `npm run lint`: ESLintを実行します。
- `npm run test`: Vitestでユニットテストを実行します。
- `npm run test:e2e`: PlaywrightでE2Eテストを実行します。初回は `npx playwright install` でブラウザーをインストールしてください。
- `npm run test:e2e:ui`: PlaywrightのUIモードでE2Eテストを実行します。

## ライセンス

非公開のプロプライエタリ・ソフトウェアです。(Private and proprietary)
