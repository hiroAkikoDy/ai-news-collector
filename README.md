# AI News Collector - Twitter Tweet Collector

[![GitHub](https://img.shields.io/badge/GitHub-hiroAkikoDy%2Fai--news--collector-blue?logo=github)](https://github.com/hiroAkikoDy/ai-news-collector)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)

Twitter (X) から最新ツイートを収集し、含まれるURLのコンテンツを自動取得するシステムです。

## 機能

1. **Chrome拡張でTwitterページにアクセス**
   - タイムライン（フォロー中のアカウント）から収集
   - 特定のプロフィールページからも収集可能
   - 最新20ツイートを自動収集

2. **アカウント設定**
   - Xアカウント（@username）を保存
   - Googleアカウント（メールアドレス）を保存
   - ログイン状態で自分のタイムラインを収集

3. **ツイートデータ収集**
   - ツイート本文
   - 投稿者（author）
   - 投稿日時
   - 含まれるURL

4. **URL先のコンテンツ取得**
   - 各ツイート内のURLにアクセス
   - タイトル、説明文、本文を抽出

5. **JSONファイルとして保存**
   - `data/tweets/YYYYMMDD_username.json` 形式で保存
   - 構造化されたデータで後から分析可能
   - 収集元（タイムライン/プロフィール）も記録

6. **AIニュースレポート自動生成**
   - ナル先生のキャラクターでレポート作成
   - AI関連トピックを自動抽出
   - Markdown形式で出力

7. **Neo4jグラフDB統合（オプション）**
   - ツイート、記事、トピックをグラフとして保存
   - 関係性の可視化と分析
   - 高度なクエリによるインサイト抽出

8. **自動化・スケジューリング**
   - 毎週自動でレポート生成
   - Claudeコマンドで統合実行
   - カスタマイズ可能なスケジュール

## プロジェクト構造

```
ai-news-collector/
├── extension/              # Chrome拡張
│   ├── manifest.json      # 拡張の設定
│   ├── background.js      # バックグラウンドスクリプト
│   ├── content.js         # ページ内で動作するスクリプト
│   ├── popup.html         # ポップアップUI
│   └── popup.js           # ポップアップのロジック
├── backend/               # Node.jsバックエンド
│   └── server.js          # APIサーバー
├── scripts/               # Python スクリプト
│   ├── generate_report.py # レポート生成
│   ├── save_to_neo4j.py   # Neo4j保存
│   └── news_scheduler.py  # 自動スケジューラー
├── demo/                  # デモスクリプト
│   └── collect-demo.js    # デモ実行用スクリプト
├── data/tweets/           # 収集データ
├── reports/               # 生成レポート
├── docs/                  # ドキュメント
│   ├── AUTOMATION.md      # 自動化ガイド
│   └── NEO4J.md           # Neo4j統合ガイド
├── .claude/commands/      # Claudeコマンド
│   └── collect-ai-news.md # AI収集コマンド
├── requirements.txt       # Python依存
├── package.json
├── README.md
└── QUICKSTART.md
```

## セットアップ

### 1. Node.js依存パッケージのインストール

```bash
npm install
```

### 2. Python依存パッケージのインストール（レポート生成用）

```bash
pip install -r requirements.txt
```

### 3. Anthropic APIキーの設定（オプション）

レポート生成にClaude APIを使用する場合:

```bash
# Linux/Mac
export ANTHROPIC_API_KEY='your-api-key-here'

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY='your-api-key-here'
```

### 4. Chrome拡張のインストール

1. Chromeを開く
2. `chrome://extensions/` にアクセス
3. 右上の「デベロッパーモード」をONにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `extension` フォルダを選択

### 5. バックエンドサーバーの起動（オプション）

```bash
npm start
```

サーバーは `http://localhost:3000` で起動します。

## 使い方

### デモ実行（推奨）

まずはデモスクリプトでシステムの動作を確認できます。

```bash
npm run demo
```

このコマンドで：
- サンプルツイートデータを処理
- URL先のコンテンツを取得
- `data/tweets/YYYYMMDD_goromian.json` にJSON形式で保存

### Chrome拡張で実際のTwitterデータを収集

#### アカウント設定（初回のみ）

1. Chrome拡張のアイコンをクリック

2. "Account Settings" セクションで情報を入力:
   - **X Account**: `@YourUsername`
   - **Google Account**: `your-email@gmail.com`

3. 「Save Settings」ボタンをクリック

#### タイムラインからツイートを収集

1. **Xにログイン**
   - https://x.com にアクセス
   - あなたのアカウントでログイン

2. **タイムラインを開く**
   - https://x.com/home にアクセス
   - フォロー中のアカウントのツイートが表示されます

3. **ツイートを収集**
   - Chrome拡張のアイコンをクリック
   - 「Collect Tweets from Timeline」ボタンをクリック
   - 最新20ツイートが収集されます

4. **データ確認**
   - 「View Saved Data」ボタンで保存されたデータを確認
   - ファイル名: `YYYYMMDD_username.json`

#### 特定アカウントのツイートを収集

1. Twitterで収集したいアカウントのページを開く
   - 例: https://x.com/GOROman

2. Chrome拡張のアイコンをクリック

3. 「Collect Tweets from Timeline」ボタンをクリック

4. そのアカウントのツイートが収集されます

### AIニュースレポートの生成

収集したツイートから、ナル先生のスタイルでレポートを自動生成:

```bash
# レポート生成
npm run report

# または直接実行
python scripts/generate_report.py
```

生成されたレポートは `reports/ai_news_YYYYMMDD.md` に保存されます。

**ナル先生のキャラクター**:
- 最新AIトレンドに超詳しい原宿系ギャル
- 「マジでヤバい」「レベチ」「超エモい」などのギャル語を使用
- すべてをポジティブに、未来へのワクワクに繋げる解説スタイル

詳細は [scripts/README.md](scripts/README.md) を参照。

### Neo4jへのデータ保存（オプション）

グラフデータベースに保存して関係性を分析:

```bash
# Neo4jに保存
npm run neo4j

# または直接実行
python scripts/save_to_neo4j.py
```

詳細は [docs/NEO4J.md](docs/NEO4J.md) を参照。

### 自動化（推奨）

#### Claudeコマンドで統合実行

```bash
/collect-ai-news
```

このコマンドで自動的に:
1. データ確認
2. レポート生成
3. Neo4j保存
4. 結果サマリー表示

#### スケジューラーで定期実行

```bash
# 常時実行（毎週月曜日09:00にレポート生成）
npm run scheduler

# テスト実行（即座に実行）
npm run scheduler:test
```

詳細は [docs/AUTOMATION.md](docs/AUTOMATION.md) を参照。

## データフォーマット

保存されるJSONファイルの構造:

```json
{
  "username": "your_username",
  "source": "home_timeline",
  "collectedAt": "2026-01-14T03:51:00.000Z",
  "tweetCount": 5,
  "tweets": [
    {
      "author": "example_user",
      "text": "ツイート本文...",
      "timestamp": "2026-01-14T03:51:00.000Z",
      "urls": ["https://example.com/article"],
      "index": 0,
      "linkedContent": [
        {
          "url": "https://example.com/article",
          "title": "記事タイトル",
          "description": "記事の説明",
          "content": "記事本文の抜粋..."
        }
      ]
    }
  ]
}
```

### フィールド説明

- **username**: 収集者のXアカウント名
- **source**: 収集元（`home_timeline` = タイムライン、または特定アカウント名）
- **collectedAt**: 収集日時
- **tweetCount**: 収集したツイート数
- **tweets**: ツイートの配列
  - **author**: ツイート投稿者のアカウント名
  - **text**: ツイート本文
  - **timestamp**: 投稿日時
  - **urls**: 含まれるURL一覧
  - **linkedContent**: URL先の取得コンテンツ

## API エンドポイント（バックエンド使用時）

- `POST /api/tweets/save` - ツイートを保存
- `POST /api/fetch-url` - URL先のコンテンツを取得
- `GET /api/tweets/list` - 保存済みファイル一覧
- `GET /api/tweets/:filename` - 特定ファイルを取得
- `GET /health` - ヘルスチェック

## 技術スタック

- **Chrome Extension**: Manifest V3
- **Backend**: Node.js + Express
- **Data Storage**: JSON files
- **Content Extraction**: Fetch API + HTML parsing

## 注意事項

- Twitterの利用規約を遵守してください
- 大量のリクエストを短時間に送るとレート制限される可能性があります
- 個人利用・研究目的での使用を推奨します

## ライセンス

MIT
