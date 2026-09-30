# Speed is Everything

最新のフロントエンド・バックエンド技術を用いて構築された、スピードとレスポンスに特化したモダンなWebアプリケーションです。

## 技術スタック

- **フレームワーク**: [Next.js](https://nextjs.org/) (App Router)
- **UI / スタイリング**: [React](https://react.dev/) 19 & [Tailwind CSS](https://tailwindcss.com/) v4
- **データベース / ORM**: [Prisma](https://www.prisma.io/) (PostgreSQLアダプター)
- **認証 & バックエンド**: [Supabase](https://supabase.com/)
- **多言語対応**: [next-intl](https://next-intl-docs.vercel.app/)
- **テスト**:
  - ユニットテスト: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
  - E2Eテスト: [Playwright](https://playwright.dev/)

## 前提条件

- [Node.js](https://nodejs.org/) (v20+)
- npm, yarn, pnpm, または bun
- PostgreSQL データベース (または Supabase プロジェクト)

## 始め方

1. **リポジトリのクローン:**
   ```bash
   git clone git@github.com:koya-ido/speed-is-everything.git
   cd speed-is-everything
   ```

2. **依存関係のインストール:**
   ```bash
   npm install
   ```

3. **環境変数の設定:**
   `.env.example` をコピーして `.env` を作成し、必要な設定値（SupabaseのURLやデータベースURLなど）を入力します。
   ```bash
   cp .env.example .env
   ```

4. **データベースのセットアップ:**
   Prismaのマイグレーションを実行して、データベーススキーマを初期化します。
   ```bash
   npx prisma db push
   # または
   npx prisma migrate dev
   ```

5. **開発サーバーの起動:**
   ```bash
   npm run dev
   ```
   ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスすると、アプリケーションを確認できます。

## スクリプト一覧

- `npm run dev`: 開発サーバーを起動します。
- `npm run build`: 本番用のアプリをビルドします。
- `npm run start`: 本番用サーバーを起動します。
- `npm run lint`: ESLintを実行してコードの問題をチェックします。
- `npm run test`: Vitestを使用してユニットテストを実行します。
- `npm run test:e2e`: Playwrightを使用してE2Eテストを実行します。
- `npm run test:e2e:ui`: PlaywrightのUIモードを使用してE2Eテストを実行します。

## ライセンス

このプロジェクトは非公開のプロプライエタリ・ソフトウェアです。(Private and proprietary)
