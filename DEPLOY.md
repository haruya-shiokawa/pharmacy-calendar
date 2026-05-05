# Vercelへのデプロイ手順

## 準備（初回のみ）

### 1. GitHubアカウントの作成
1. https://github.com にアクセス
2. 「Sign up」をクリックして無料アカウントを作成
3. メールアドレスを確認

### 2. Vercelアカウントの作成
1. https://vercel.com にアクセス
2. 「Sign Up」をクリック
3. 「Continue with GitHub」を選択してGitHubアカウントでログイン

### 3. Gitのインストール確認
ターミナルで以下を実行:
```bash
git --version
```
表示されない場合は https://git-scm.com からインストール

## デプロイ手順

### ステップ1: GitHubリポジトリの作成

1. https://github.com にログイン
2. 右上の「+」→「New repository」をクリック
3. Repository name: `pharmacy-calendar`（任意の名前でOK）
4. 「Public」を選択（無料）
5. 「Create repository」をクリック

### ステップ2: コードをGitHubにアップロード

ターミナルで以下を実行:

```bash
# pharmacy-calendarディレクトリに移動
cd ~/Desktop/pharmacy-calendar

# Gitリポジトリを初期化
git init

# すべてのファイルを追加
git add .

# コミット
git commit -m "Initial commit"

# GitHubのリポジトリと接続（YOUR_USERNAMEを自分のGitHubユーザー名に変更）
git remote add origin https://github.com/YOUR_USERNAME/pharmacy-calendar.git

# メインブランチに変更
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

※ GitHubのユーザー名とパスワード（またはPersonal Access Token）を求められたら入力

### ステップ3: Vercelでデプロイ

1. https://vercel.com/dashboard にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」で先ほど作成した`pharmacy-calendar`を選択
4. 「Import」をクリック
5. 設定はそのままで「Deploy」をクリック

**完了！** 数分でデプロイが完了し、URLが発行されます。

例: `https://pharmacy-calendar-xxxx.vercel.app`

## 更新方法

コードを変更した後:

```bash
cd ~/Desktop/pharmacy-calendar
git add .
git commit -m "更新内容の説明"
git push
```

自動的にVercelが検知して再デプロイされます（1-2分）。

## 注意事項

⚠️ **重要**: Vercelの無料プランでは、データは一時的なストレージ（/tmp）に保存されるため、サーバーが再起動すると消える可能性があります。

### 恒久的なデータ保存が必要な場合:
- Vercel KV（有料）
- Supabase（無料枠あり）
- MongoDB Atlas（無料枠あり）

などのデータベースサービスの利用を検討してください。

## トラブルシューティング

### デプロイが失敗する場合
1. Vercelのログを確認
2. `vercel.json`と`api/data.js`が正しく配置されているか確認
3. `package.json`に`vercel-build`スクリプトがあるか確認

### データが保存されない場合
- ブラウザのローカルストレージにフォールバックされます
- 各ユーザーのブラウザに個別に保存されます

## サポート

問題が発生した場合は、Vercelのドキュメントを参照:
https://vercel.com/docs