---
name: chrome-devtools-mcp
description: >-
  Windows側のGoogle Chromeを操作してWebアプリケーションの動作確認、UIテスト、DOM検証、スクリーンショット取得、コンソール・ネットワークデバッグを行うスキル。「Chromeで動作確認して」「ブラウザで表示を確認して」「DevToolsでテストして」「画面を操作して」などの依頼時に使用する。
---

# Chrome DevTools MCP 動作確認・ブラウザ操作スキル

Windows側のGoogle Chromeをリモートデバッグポート（`9235`）経由で操作し、開発中アプリケーションのUI検証や動作確認を行うためのガイドラインです。

---

## 1. 前提条件と接続確認

本環境は **WSL2 (Mirrored Networking)** により、WSL内から Windows の `127.0.0.1:9235` へ直接アクセスできる構成になっています。

### ブラウザ起動状態の確認

動作確認を行う前に、まずデバッグポートが応答するか確認します。

```bash
curl -s --connect-timeout 2 http://127.0.0.1:9235/json/version
```

- **応答がある場合**: そのままMCPツールで操作を開始できます。
- **応答がない（Chromeが未起動）場合**: 以下のコマンドでWindows側Chromeを起動します。

  ```bash
  npm run chrome:debug
  # または
  ./scripts/start-chrome-debug.sh
  ```

  - **プロファイルの独立性と永続化**:
    普段使いのChromeと干渉せず並行起動できるよう、独立プロファイル `C:\tmp\chrome-dev-profile` で起動します。
    Cookieや認証セッションはこのプロファイル内に保存されるため、一度認証を通した情報はChromeを再起動しても維持されます。

---

## 2. 主な DevTools MCP ツールと役割

| ツール名                | 用途                                              | 主要引数                                            |
| :---------------------- | :------------------------------------------------ | :-------------------------------------------------- |
| `list_pages`            | 開いているタブ一覧を取得                          | `{}`                                                |
| `new_page`              | 新規タブを開く（マルチプレイヤー検証等）          | `{"url": "https://..."}`                            |
| `select_page`           | 操作対象のタブをアクティブにする                  | `{"pageId": 1}`                                     |
| `navigate_page`         | 指定URLへの遷移、リロード                         | `{"pageId": 1, "url": "http://localhost:3000/..."}` |
| `take_snapshot`         | ページのアクセシビリティツリー（要素とuid）を取得 | `{"pageId": 1}`                                     |
| `take_screenshot`       | 画面キャプチャを画像として取得                    | `{"pageId": 1}`                                     |
| `click`                 | 指定要素をクリック                                | `{"pageId": 1, "uid": "1_..."}`                     |
| `fill` / `fill_form`    | 入力フィールドへの値入力                          | `{"pageId": 1, "uid": "...", "value": "..."}`       |
| `type_text`             | フォーカス要素へキーボード入力                    | `{"pageId": 1, "text": "..."}`                      |
| `press_key`             | 特定キー（Enter、Escape等）の押下                 | `{"pageId": 1, "key": "Enter"}`                     |
| `evaluate_script`       | ブラウザ内で任意のJS関数を実行                    | `{"pageId": 1, "function": "() => document.title"}` |
| `list_console_messages` | コンソールの警告・エラーログを取得                | `{"pageId": 1}`                                     |
| `list_network_requests` | ネットワーク通信履歴を取得                        | `{"pageId": 1}`                                     |

---

## 3. Vercel Preview環境（Deployment Protection）へのアクセス対応

VercelのPreview URL（ブランチプレビュー環境など）にアクセスする際、Deployment Protection（Vercel Authentication）によりログイン画面へリダイレクトされる場合があります。以下の方法で対応します。

1. **Shareable Link を利用する（推奨・最も手軽）**:
   - Vercel Toolbarの「Share」から発行できる共有リンク（`?_vercel_share=...` 付きURL）を使用します。
   - ログイン画面を経由せず直接プレビュー環境にアクセスできます。
   - 一度このURLを踏むと認証Cookieが独立プロファイルに保存されるため、以降は素のURL（パラメータなし）でもアクセス可能になります。
2. **起動したChrome画面上で1回ログインする**:
   - 素のURLで「Log in with Vercel」画面が表示された場合、Windows側のChromeウィンドウ上でユーザーに1度ログインを完了してもらいます。
   - 独立プロファイル（`C:\tmp\chrome-dev-profile`）内にセッションが保存されるため、次回以降は自動でアクセスできるようになります。

---

## 4. 標準的な動作確認ワークフロー

アプリケーションの動作確認を行う際は、以下の手順で進めます。

### ステップ 1: 開発サーバー/対象ページの準備

1. ローカル開発サーバーの場合は起動確認（必要に応じて `npm run dev`）。Vercelプレビューの場合は対象URLを準備。
2. `list_pages` で既存タブを確認。既存タブがあれば `navigate_page`、なければ `new_page` で対象ページを開く。

### ステップ 2: 画面状態の取得 (`take_snapshot`)

- UI操作を行う前に、必ず `take_snapshot` を実行します。
- スナップショットから、ボタン・入力フォーム・テキストなどの要素に対応する **`uid`** を特定します。
  _(※CSSセレクタではなく、スナップショットで付与される `uid` を使用して操作します)_

### ステップ 3: ユーザー操作の実行

- **テキスト入力**: `fill` または `fill_form` に `uid` と入力値を指定。
- **ボタンクリック**: `click` に `uid` を指定。
- **画面遷移やモーダル表示の待機**: 必要に応じて `wait_for` または操作直後の `take_snapshot` でDOMの更新を確認。

### ステップ 4: 結果の検証

- **DOM/表示の確認**: `take_snapshot` で期待するテキストや要素が表示されているか確認。
- **コンソールエラーの確認**: `list_console_messages` を実行し、JavaScriptの例外や警告が発生していないか検証。
- **API通信の確認**: 必要に応じて `list_network_requests` でリクエストの成否（ステータスコード等）を確認。
- **視覚的な確認**: ユーザーへの報告やレイアウト確認が必要な場合、`take_screenshot` で画面画像を撮影。

---

## 5. 関連スキル（機能特化型の検証スキル）

特定のゲームモードや複雑な複数クライアント検証については、本接続・操作スキルを基盤とする専用スキルに責務を分離しています。

- **バトルモード（マルチプレイヤー対戦・リアルタイム同期検証）**:
  - スキル: [.agents/skills/battle-mode-verification/SKILL.md](file:///home/koya_ido/practice/speed-is-everything/.agents/skills/battle-mode-verification/SKILL.md)
  - ホスト・ゲスト・観戦者のマルチタブ並行操作、20戦試行による同期検証、部屋人数上限、自動昇格、リロード離脱等の網羅的検証手順はこちらを参照してください。

---

## 6. トラブルシューティング

- **接続エラー (`Connection refused`)**:
  - `npm run chrome:debug` を実行してChromeが起動しているか確認してください。
  - Windows側でChromeをすべて終了させてから再度 `npm run chrome:debug` を試行してください。
- **要素が見つからない / 操作できない**:
  - `take_snapshot` を再実行して最新の `uid` を再取得してください（DOMが再レンダリングされるとuidが変わる場合があります）。
- **ダイアログ（Alert/Confirm）が表示されて停止する**:
  - `handle_dialog` ツールでダイアログを承認（accept）または破棄（dismiss）してください。
- **Vercelの認証画面で停止する**:
  - `?_vercel_share=...` 付きのShareable Linkを使用するか、Windows側のChrome上で一度ログインを完了させてください。
