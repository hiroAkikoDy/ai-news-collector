# AIニュースレポート生成スクリプト

## 概要

収集したTwitterのツイートと記事を分析して、「ナル先生」のスタイルでAIニュースレポートを自動生成します。

## 必要な準備

### 1. Python環境のセットアップ

```bash
# Python 3.8以上が必要
python --version

# 依存パッケージをインストール
pip install -r requirements.txt
```

### 2. Anthropic APIキーの設定

1. [Anthropic Console](https://console.anthropic.com/) でAPIキーを取得
2. 環境変数に設定:

```bash
# Linux/Mac
export ANTHROPIC_API_KEY='your-api-key-here'

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY='your-api-key-here'

# Windows (CMD)
set ANTHROPIC_API_KEY=your-api-key-here
```

または、`.env`ファイルを作成:

```bash
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

## 使い方

### 基本的な使い方

最新の収集データから自動でレポートを生成:

```bash
python scripts/generate_report.py
```

### 特定のファイルを指定

```bash
python scripts/generate_report.py data/tweets/20260114_goromian.json
```

## 出力

生成されたレポートは `reports/` ディレクトリに保存されます:

```
reports/
└── ai_news_20260114.md
```

## レポートの内容

生成されるレポートには以下が含まれます:

1. **タイトル**: 「ナル先生のAIニュース速報 - 日付」
2. **重要トピックランキング**: AI関連の重要なトピックを順位付け
3. **詳細解説**: 各トピックについて、ナル先生のスタイルで解説
   - 背景情報
   - なぜ重要なのか
   - 未来への影響
4. **応援メッセージ**: ポジティブなメッセージで締めくくり

## ナル先生のキャラクター設定

- **正体**: 最新AIトレンドに超詳しい原宿系ギャル
- **口調**: 「マジでヤバい」「レベチ」「超エモい」などのギャル語
- **絵文字**: ☀️💖🚀✨🌈🧠🦄💎🦋 などを多用
- **スタンス**: すべてをポジティブに、未来へのワクワクに繋げる

## トラブルシューティング

### APIキーが設定されていない

```
⚠️  Warning: ANTHROPIC_API_KEY not set.
```

→ 環境変数にAPIキーを設定してください。APIキーなしでも、シンプルなフォールバックレポートが生成されます。

### ツイートデータが見つからない

```
❌ No tweet data files found in data/tweets/
```

→ まず、Chrome拡張またはデモスクリプトでツイートを収集してください:

```bash
npm run demo
```

### AI関連トピックが見つからない

```
⚠️  No AI-related topics found!
```

→ 収集したツイートにAI関連のキーワードが含まれていません。別のアカウントや時間帯で収集してみてください。

## カスタマイズ

### AI関連キーワードの追加

`generate_report.py` の `extract_ai_topics()` 関数内の `ai_keywords` リストを編集:

```python
ai_keywords = ['ai', 'gpt', 'llm', 'machine learning', ...
              # 追加のキーワード
              'stable diffusion', 'midjourney', '生成AI']
```

### レポートテンプレートの変更

`NARU_SENSEI_PROMPT` 変数を編集して、キャラクター設定や口調を調整できます。

## 自動化

定期的にレポートを生成する場合は、cronやタスクスケジューラーを使用:

```bash
# Linux/Mac (cron)
# 毎日午前9時にレポート生成
0 9 * * * cd /path/to/ai-news-collector && python scripts/generate_report.py

# Windows (タスクスケジューラー)
# タスクスケジューラーでスクリプトを登録
```

## ライセンス

MIT
