# プロジェクト コーディング規約

## 1. アーキテクチャ・責務

- **Bulletproof React**: `src/features/` を中心に機能をカプセル化。外部からの参照は各機能の `index.ts` 経由に限定。
- **責務の分離**: UI、Hooks（状態・副作用）、API（通信）、Utils（純粋計算）のレイヤーを明確に分離。Fat Componentを禁止。
- **DRY原則**: 2箇所以上の重複は共通化。型や定数は単一の情報源（SSOT）に集約する。ただし性急な抽象化（過度な共通化）は避ける。

## 2. TypeScript & 構文

- **厳格な型安全**: `any` 型の使用を完全禁止。不明な値は `unknown` と型ガードを使用。`as` や `!` (非nullアサーション) は極力避ける。インラインでの警告無効化（eslint-disable）は原則禁止（詳細は「6. 静的解析・Linter運用」を参照）。
- **型定義の方針（原則 type 統一）**:
  - **原則**: すべての型定義（Props, State, 関数引数/戻り値, ドメインモデル, APIレスポンスなど）は `type` で統一する。意図しない同名衝突（宣言のマージ: Declaration Merging）を防止し、構文の一貫性を保つため。
  - **例外（interface を使用するケース）**: `interface` は以下の3つのケースに限定して使用し、それ以外の用途（Props定義やドメインモデル等）での使用は禁止とする。
    - **① グローバルオブジェクトの拡張**: `Window` や `NodeJS.ProcessEnv` などのグローバル型定義にプロパティを追加する場合（`global.d.ts` 等）。
      ```typescript
      // global.d.ts
      declare global {
        interface Window {
          dataLayer?: Record<string, unknown>[];
        }
      }
      ```
    - **② 外部ライブラリの型拡張（モジュール拡張）**: 既存ライブラリが提供する型に対して `declare module` を通じて項目を追加する場合。

      ```typescript
      // types/next-auth.d.ts
      import "next-auth";

      declare module "next-auth" {
        interface Session {
          user: {
            id: string;
            role: "admin" | "user";
          };
        }
      }
      ```

    - **③ クラス実装の契約**: オブジェクト指向のクラスに対して `implements` を用いて構造を強制する場合。

      ```typescript
      interface SoundEngine {
        play(): void;
        stop(): void;
      }

      class WebAudioSoundEngine implements SoundEngine {
        play = () => {
          /* ... */
        };
        stop = () => {
          /* ... */
        };
      }
      ```

- **関数の定義**: `function` 宣言は禁止。すべて `const` アロー関数に統一。
- **制御フロー**: `if` 文のネストは最大2段階まで。ガード節による早期リターンを徹底。
- **インポート**: 相対パス（`../`）を禁止し、エイリアス（`@/`）を使用。
- **エクスポート**: 原則 Named Export を使用（Next.jsの規約ファイル以外）。
- **文字列**: ダブルクォート（`"`）を優先。

## 3. 命名規則

- **コンポーネント・型**: `PascalCase`（例: `Button.tsx`, `UserProfileProps`）※型に `I` や `T` の接頭辞はつけない。
- **フック・関数・変数**: `camelCase`（例: `useAuth`, `handleSubmit`, `isEnabled`）
- **グローバル定数**: `UPPER_SNAKE_CASE`（例: `MAX_RETRY_COUNT`）

## 4. Next.js (App Router)

- **RSC デフォルト**: 基本は React Server Components (RSC) とする。
- **Client境界の最小化**: `useState` やイベントハンドラーが必要な末端のUI要素にのみ `'use client'` を宣言する。
- **サーバー責務**: API RouteやServer Actionsはオーケストレーションに専念させ、複雑なロジックは別関数に委譲。

## 5. 品質（A11y・エラー・テスト）

- **アクセシビリティ**: セマンティックなHTMLを使用。テキストのないボタンには `aria-label` を必須とし、キーボード操作性を担保。
- **エラーハンドリング**: `catch` の握りつぶし禁止。適切なログ出力やユーザーフィードバックを行う。予測可能なエラーは結果オブジェクト（Result型など）で返す。
- **テスト (Vitest)**: 複雑なロジックは純粋関数として切り出し、AAA（Arrange-Act-Assert）パターンでユニットテストを記述。

## 6. 静的解析・Linter運用

- **ESLint警告・エラーのインライン無効化（disable）規約**:
  - **基本方針（原則禁止）**:
    - `// eslint-disable-next-line` 等によるインラインでの警告・エラーの握りつぶし（無効化）は原則禁止とする。
    - 型の不整合（`any` の回避など）は型ガードや `unknown`、適切な型定義によって解決し、React Hooks の依存配列警告（`react-hooks/exhaustive-deps`）はロジックの再設計によって解消すること。
  - **例外適用時の厳格な基準（使用が許可されるケース）**:
    自前実装での解決が不可能な場合に限り、例外的な使用を認める。
    - ① **外部ライブラリ・SDK連携**: 外部ライブラリの型定義の不備や、構造上どうしても回避できないサードパーティ製SDKとの連携部。
    - ② **意図的な依存除外の証明**: アニメーションや計測処理など、意図的な依存除外であることが論理的・技術的に証明できる場合。
  - **使用時の必須遵守事項**:
    例外として無効化を行う場合は、以下を必須とする。
    - **① 対象ルールの明示**: 単なる `// eslint-disable-next-line` やブロック全体の無効化は禁止し、必ず `// eslint-disable-next-line @typescript-eslint/no-explicit-any` のように対象ルール名を特定すること。
    - **② 無効化理由（インライン理由コメント）の義務付け**: なぜ無効化が必要なのかを `-- ` 形式で必ず併記すること。
      ```tsx
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 外部SDKの戻り値型が未定義であり型ガードが困難なため暫定回避
      ```
    - **③ PR時の明記**: 当該コメントが含まれる場合は、プルリクエストの説明文に無効化した理由と代替案の検討結果を記載すること。
  - **コード例（Good / Bad）**:
    - **Bad**:

      ```tsx
      // Bad: ルール名の指定がなく、理由も記載されていない（全ルールの握りつぶし）
      // eslint-disable-next-line
      const user: any = response.data;

      // Bad: 理由が記載されておらず、単に警告を回避している
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = loadConfig();

      // Bad: 依存配列の警告をロジックの再設計（useCallback化や関数の分離）をせずに握りつぶしている
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => {
        fetchUserData(userId);
      }, []);
      ```

    - **Good**:

      ```tsx
      // Good (原則): unknown と型ガードを用いて安全に型を確定させ、disable を使わない
      const parseUserData = (data: unknown): UserData => {
        if (isUserData(data)) {
          return data;
        }
        throw new Error("Invalid user data format");
      };

      // Good (原則): 依存関係を正しく管理・再設計して警告を解消する
      const handleFetch = useCallback(() => {
        fetchUserData(userId);
      }, [userId]);

      useEffect(() => {
        handleFetch();
      }, [handleFetch]);

      // Good (例外): 外部SDKの型定義不備に対し、ルール特定と理由（-- 形式）を明記した上で最小限に適用
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 外部SDKの戻り値型が未定義であり型ガードが困難なため暫定回避
      const sdkResult = (window as any).legacySdk.init();

      // Good (例外): Canvasアニメーション等の初回マウント限定実行に対し、論理的理由を明記して適用
      // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回マウント時のみ Canvas アニメーションループを開始するため
      useEffect(() => {
        startAnimationLoop();
      }, []);
      ```
