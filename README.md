# Amazon QuickSight Embedding Demo

このプロジェクトは、Amazon QuickSight の埋め込み機能（Registered埋め込み・Anonymous埋め込み）を実装するサンプルアプリケーションです。

## 機能

### Registered埋め込み（登録埋め込み）
- **RegisterUser API**: 初回のみユーザーを QuickSight Reader として登録
- **GenerateEmbedUrlForRegisteredUser API**: 登録済みユーザー用の埋め込み URL を生成
- **ユーザー管理**: ユーザー削除機能
- **Web フロントエンド**: ユーザー情報を入力してダッシュボードを表示

### Anonymous埋め込み（匿名埋め込み）
- **GenerateEmbedUrlForAnonymousUser API**: 匿名ユーザー用の埋め込み URL を生成
- **セッション管理**: セッションIDによる一意なアクセス管理
- **簡単アクセス**: ユーザー登録不要でダッシュボードを表示

> **重要**: Anonymous埋め込みを使用するには、QuickSightの**キャパシティ料金プラン**（Enterprise Edition）での契約が必要です。従量課金プランでは利用できません。

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

# 匿名埋め込み用設定（オプション）
QUICKSIGHT_ALLOWED_DOMAINS=http://localhost:3000,https://your-domain.com
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
        "quicksight:GenerateEmbedUrlForAnonymousUser",
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

- **Registered埋め込み**: `http://localhost:3000`
- **Anonymous埋め込み**: `http://localhost:3000/anonymous.html`

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

### POST /api/anonymous-embed-url

匿名ユーザー用の埋め込み URL を生成します。

**リクエスト:**

```json
{
  "sessionId": "session-12345"  // オプション：指定しない場合は自動生成
}
```

**レスポンス:**

```json
{
  "embedUrl": "https://us-east-1.quicksight.aws.amazon.com/sn/embed/...",
  "sessionId": "session-1640995200000-abcd1234"
}
```

> **注意**: キャパシティ料金プランでの契約が必要です。

## 実装の詳細

### Registered 埋め込みのフロー

1. **初回登録**: `RegisterUser` API でユーザーを QuickSight Reader として登録
2. **権限付与**: `UpdateDashboardPermissions` API でダッシュボードへの閲覧権限を付与
3. **URL 生成**: `GenerateEmbedUrlForRegisteredUser` API で埋め込み URL を生成
4. **埋め込み**: 生成された URL を iframe の src に設定

### Anonymous 埋め込みのフロー

1. **セッション生成**: ユニークなセッションIDを自動生成
2. **URL 生成**: `GenerateEmbedUrlForAnonymousUser` API で匿名埋め込み URL を生成
3. **ドメイン制限**: 環境変数で指定したドメインからのみアクセス許可
4. **埋め込み**: 生成された URL を iframe の src に設定

### ユーザー削除のフロー

1. **権限削除**: `UpdateDashboardPermissions` API でダッシュボード権限を削除
2. **ユーザー削除**: `DeleteUser` API で QuickSight からユーザーを削除
3. **キャッシュ更新**: サーバー内の登録済みユーザー情報を削除

### セキュリティ考慮事項

- AWS 認証情報は環境変数で管理
- 埋め込み URL には有効期限があります（15分）
- CORS 設定により、適切なオリジンからのリクエストのみ許可
- Anonymous埋め込みはドメイン制限によりアクセス制御
- セッション管理によりユニークなアクセス提供

## トラブルシューティング

### よくあるエラー

1. **ResourceExistsException**: ユーザーが既に存在する場合（正常な動作）
2. **AccessDeniedException**: IAM 権限が不足している場合
3. **ResourceNotFoundException**: ダッシュボード ID が間違っている場合
4. **ConflictException**: ユーザー削除時に依存関係が残っている場合
5. **UnsupportedPricingPlanException**: Anonymous埋め込みでキャパシティ料金プランでない場合
6. **InvalidParameterValueException**: 許可ドメインが正しく設定されていない場合

### ユーザー削除に関する注意事項

- ユーザーを削除する前に、そのユーザーに付与されているすべてのリソース権限を削除する必要があります
- 削除されたユーザー名は再利用可能です
- アプリケーション再起動後は、サーバー内のユーザー登録状況キャッシュがリセットされます

### Anonymous埋め込み使用時の注意事項

- QuickSightアカウントがキャパシティ料金プラン（Enterprise Edition）である必要があります
- ダッシュボードに匿名アクセス用の権限設定が必要な場合があります
- セッション有効期限（15分）後は新しいURLの生成が必要です

### ログの確認

サーバーのコンソール出力でエラーの詳細を確認できます。
