# かおジャンプ

子どもの写真をブラウザ内だけで使って遊べる、スマホ縦画面向けのミニゲームWebアプリです。

## 特徴

- 写真はサーバーへ送信・保存しません。
- アップロード画像は `URL.createObjectURL` とReactの画面状態だけで扱います。
- 顔の丸抜きはブラウザの Canvas API で行います。
- ページを閉じるとアップロード画像と切り抜き画像は消えます。
- ログイン機能、外部API、画像保存処理はありません。
- タップだけで遊べます。

## 実行方法

Node.js 18以上をインストールしてから実行します。

```bash
npm install
npm run dev
```

pnpmを使う場合は次の通りです。

```bash
pnpm install
pnpm run dev
```

表示されたURLをブラウザで開きます。

## ビルド

```bash
npm run build
```

本番用ファイルは `dist` フォルダに出力されます。

## Vercelへのデプロイ

1. このフォルダをGitHubなどのリポジトリへアップロードします。
2. Vercelで「Add New Project」を選び、リポジトリを選択します。
3. Framework Preset は `Vite` を選びます。
4. Build Command は `pnpm run build`、Output Directory は `dist` にします。
5. Deploy を押します。

`vercel.json` に同じ設定を入れているため、通常は自動認識されます。

## 主要ファイル

- `src/App.jsx`
  - 画面遷移、写真アップロード、顔調整、Canvas切り抜き、ゲーム処理をまとめています。
  - `CropScreen` が顔の位置調整と丸抜きを担当します。
  - `CanvasGame` がジャンプゲームとシューティングゲームの共通描画入口です。
- `src/styles.css`
  - スマホ縦画面向けのレイアウト、ボタン、ゲーム画面の見た目を定義しています。
- `package.json`
  - Vite + React の実行・ビルド設定です。
- `vercel.json`
  - Vercel公開用の設定です。

## 今後拡張しやすい点

- 顔の自動検出を追加する場合は、`CropScreen` の初期 `crop` 値を検出結果で更新します。
- ゲームを増やす場合は、`gameType` を追加し、`CanvasGame` 内で状態作成・更新・描画関数を増やします。
- 画像を保存しない方針を保つため、顔画像はサーバーへ送信せず、ブラウザ内のCanvas結果だけを使ってください。
