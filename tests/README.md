# AnyWhereDoor API Tests

このディレクトリには、AnyWhereDoor APIの包括的なテストスイートが含まれています。

## テストの種類

### 1. ユニットテスト (`api.test.ts`)
- モックを使用したAPI エンドポイントのテスト
- データベースやファイルシステムの依存関係をモック化
- 高速で独立したテスト

**テスト対象のエンドポイント:**
- `GET /health` - ヘルスチェック
- `GET /api/videos` - 動画一覧（ページング、フィルタ、検索）
- `GET /api/categories` - カテゴリ一覧
- `GET /api/videos/featured` - 注目動画
- `GET /api/videos/:id` - 単一動画取得
- `POST /api/upload` - 動画アップロード
- `GET /api/local-videos` - ローカル動画ファイル一覧

### 2. インテグレーションテスト (`integration.test.ts`)
- 実際のデータベースを使用
- 実際のHTTPサーバーを起動してテスト
- エンドツーエンドの動作確認

### 3. テストユーティリティ (`test-utils.ts`)
- テストデータの作成
- データベースのセットアップとクリーンアップ
- モックデータファクトリ

### 4. テストサーバー (`test-server.ts`)
- インテグレーションテスト用のサーバー管理
- ポートの動的割り当て

## テストの実行

```bash
# 全テストを実行
npm test

# テストをwatch モードで実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage

# 特定のテストファイルのみ実行
npm test api.test.ts

# 特定のテストケースのみ実行
npm test -- --testNamePattern="health"
```

## 環境設定

### データベース設定
インテグレーションテストを実行するには、環境変数でテスト用データベースを設定してください：

```bash
# .env ファイルまたは環境変数
TEST_DATABASE_URL=postgresql://username:password@localhost:5432/anywheredoor_test
# または
DATABASE_URL=postgresql://username:password@localhost:5432/anywheredoor_test
```

テスト用データベースが設定されていない場合、インテグレーションテストはスキップされます。

### モック設定
ユニットテストでは以下がモック化されています：
- PostgreSQL データベース接続
- ファイルシステム操作
- 環境変数読み込み
- Honoサーバーの起動

## テストカバレッジ

現在のテストは以下をカバーしています：

### 機能テスト
- ✅ 正常なレスポンス
- ✅ エラーハンドリング
- ✅ バリデーション
- ✅ ページネーション
- ✅ 検索機能
- ✅ カテゴリフィルタリング
- ✅ ファイルアップロード

### パフォーマンステスト
- ✅ レスポンス時間
- ✅ 並行リクエスト処理

### セキュリティテスト
- ✅ CORS設定
- ✅ 不正なリクエストの処理

## テストデータ

テストでは以下のデータが使用されます：
- テストユーザー: `testuser`
- テストカテゴリ: `Travel`
- テストビデオ: `Test Video 1`
- テストタグ: `test`, `video`

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   ```
   error: database "anywheredoor_test" does not exist
   ```
   → テスト用データベースを作成してください

2. **ポート衝突エラー**
   ```
   EADDRINUSE: address already in use :::3001
   ```
   → 他のプロセスがポートを使用していないか確認してください

3. **UUIDエラー**
   ```
   error: invalid input syntax for type uuid
   ```
   → データベースでUUID拡張が有効になっているか確認してください
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### テスト実行時の注意点

- インテグレーションテストは実際のデータベースに対して実行されます
- テストデータは各テスト前にリセットされます
- テスト用データベースは本番データベースとは別にしてください

## 今後の改善予定

- [ ] E2Eテストの追加
- [ ] パフォーマンステストの拡張
- [ ] セキュリティテストの強化
- [ ] CI/CDパイプラインとの統合