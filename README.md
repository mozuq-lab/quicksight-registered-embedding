# Amazon QuickSight Registered Embedding

このプロジェクトは、Amazon QuickSight の Registered 埋め込み機能を実装するサンプルアプリケーションです。

## 機能

- **RegisterUser API**: 初回のみユーザーを QuickSight Reader として登録
- **GenerateEmbedUrlForRegisteredUser API**: 登録済みユーザー用の埋め込み URL を生成
- **Web フロントエンド**: ユーザー情報を入力してダッシュボードを表示

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーし、適切な値を設定してください：

```bash
cp .env.example .env
```

`.env`ファイルの内容を編集：

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
QUICKSIGHT_ACCOUNT_ID=111122223333
QUICKSIGHT_NAMESPACE=default
QUICKSIGHT_DASHBOARD_ID=11111111-aaaa-2222-bbbb-ccccddddeeee
PORT=3000
```

### 3. QuickSight の権限設定

使用する IAM ユーザー/ロールに以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "quicksight:RegisterUser",
        "quicksight:GenerateEmbedUrlForRegisteredUser",
        "quicksight:DescribeUser",
        "quicksight:DeleteUser",
        "quicksight:UpdateDashboardPermissions"
      ],
      "Resource": "*"
    }
  ]
}
```

### 4. サーバーの起動

```bash
npm start
```

または開発モード：

```bash
npm run dev
```

### 5. アプリケーションへのアクセス

ブラウザで `http://localhost:3000` にアクセスしてください。

## API エンドポイント

### POST /api/register-user

ユーザーを QuickSight に登録します（初回のみ必要）。

**リクエスト:**

```json
{
  "userName": "user123",
  "email": "user@example.com"
}
```

### POST /api/embed-url

登録済みユーザー用の埋め込み URL を生成します。

**リクエスト:**

```json
{
  "userName": "user123",
  "email": "user@example.com"
}
```

**レスポンス:**

```json
{
  "embedUrl": "https://us-east-1.quicksight.aws.amazon.com/sn/embed/..."
}
```

### DELETE /api/delete-user

QuickSight からユーザーを削除します。

**リクエスト:**

```json
{
  "userName": "user123"
}
```

**レスポンス:**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

> **注意**: ユーザー削除時は、まずダッシュボード権限を削除してからユーザーを削除します。

## 実装の詳細

### Registered 埋め込みのフロー

1. **初回登録**: `RegisterUser` API でユーザーを QuickSight Reader として登録
2. **権限付与**: `UpdateDashboardPermissions` API でダッシュボードへの閲覧権限を付与
3. **URL 生成**: `GenerateEmbedUrlForRegisteredUser` API で埋め込み URL を生成
4. **埋め込み**: 生成された URL を iframe の src に設定

### ユーザー削除のフロー

1. **権限削除**: `UpdateDashboardPermissions` API でダッシュボード権限を削除
2. **ユーザー削除**: `DeleteUser` API で QuickSight からユーザーを削除
3. **キャッシュ更新**: サーバー内の登録済みユーザー情報を削除

### セキュリティ考慮事項

- AWS 認証情報は環境変数で管理
- 埋め込み URL には有効期限があります（デフォルト 600 分）
- CORS 設定により、適切なオリジンからのリクエストのみ許可

## トラブルシューティング

### よくあるエラー

1. **ResourceExistsException**: ユーザーが既に存在する場合（正常な動作）
2. **AccessDeniedException**: IAM 権限が不足している場合
3. **ResourceNotFoundException**: ダッシュボード ID が間違っている場合
4. **ConflictException**: ユーザー削除時に依存関係が残っている場合

### ユーザー削除に関する注意事項

- ユーザーを削除する前に、そのユーザーに付与されているすべてのリソース権限を削除する必要があります
- 削除されたユーザー名は再利用可能です
- アプリケーション再起動後は、サーバー内のユーザー登録状況キャッシュがリセットされます

### ログの確認

サーバーのコンソール出力でエラーの詳細を確認できます。
