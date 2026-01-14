# Neo4j グラフデータベース統合

## 概要

AI News CollectorはNeo4jグラフデータベースと統合し、ツイート、記事、トピック間の関係性を視覚化・分析できます。

## グラフモデル

### ノード

1. **Tweet** - ツイート
   - `id`: 一意ID（日付_インデックス）
   - `text`: ツイート本文
   - `timestamp`: 投稿日時
   - `collected_at`: 収集日時
   - `source`: 収集元（home_timeline等）
   - `index`: インデックス番号

2. **User** - ユーザー
   - `username`: ユーザー名

3. **Article** - 記事
   - `url`: URL（一意）
   - `title`: タイトル
   - `description`: 説明文
   - `content`: 本文抜粋
   - `updated_at`: 更新日時

4. **Topic** - トピック
   - `name`: トピック名

### 関係性

1. **POSTED** - 投稿関係
   ```
   (User) -[:POSTED]-> (Tweet)
   ```

2. **LINKS_TO** - リンク関係
   ```
   (Tweet) -[:LINKS_TO]-> (Article)
   ```

3. **MENTIONS** - 言及関係
   ```
   (Tweet) -[:MENTIONS]-> (Topic)
   ```

## セットアップ

### 1. Neo4jのインストール

#### Docker（推奨）

```bash
docker run \
  --name neo4j \
  -p7474:7474 -p7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  -v $HOME/neo4j/data:/data \
  neo4j:latest
```

#### デスクトップ版

[Neo4j Desktop](https://neo4j.com/download/) をダウンロードしてインストール

### 2. 環境変数の設定

```bash
export NEO4J_URI='bolt://localhost:7687'
export NEO4J_USER='neo4j'
export NEO4J_PASSWORD='your-password'
```

または `.env` ファイル:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### 3. Pythonパッケージのインストール

```bash
pip install neo4j
```

## データの保存

### 基本的な使用

```bash
# 最新のツイートデータを保存
python scripts/save_to_neo4j.py

# 特定のファイルを保存
python scripts/save_to_neo4j.py data/tweets/20260114_goromian.json

# または npm スクリプト
npm run neo4j
```

### 処理内容

1. **制約の作成**: 一意性制約とインデックス
2. **ツイートの保存**: Tweetノードとして保存
3. **ユーザーの作成**: Userノードとして保存
4. **記事の保存**: Articleノードとして保存
5. **トピックの抽出**: キーワードベースでTopicを抽出
6. **関係性の作成**: 各ノード間の関係を確立

## クエリ例

### 基本クエリ

#### すべてのツイートを取得

```cypher
MATCH (t:Tweet)
RETURN t
ORDER BY t.timestamp DESC
LIMIT 20
```

#### ユーザーのツイート数

```cypher
MATCH (u:User)-[:POSTED]->(t:Tweet)
RETURN u.username, count(t) as tweet_count
ORDER BY tweet_count DESC
```

#### トピック別ツイート数

```cypher
MATCH (topic:Topic)<-[:MENTIONS]-(t:Tweet)
RETURN topic.name, count(t) as mention_count
ORDER BY mention_count DESC
```

### 高度なクエリ

#### 特定トピックに関連する記事

```cypher
MATCH (topic:Topic {name: 'AI'})<-[:MENTIONS]-(t:Tweet)-[:LINKS_TO]->(a:Article)
RETURN DISTINCT a.title, a.url, a.description
LIMIT 10
```

#### ユーザーの関心トピック

```cypher
MATCH (u:User {username: 'GOROman'})-[:POSTED]->(t:Tweet)-[:MENTIONS]->(topic:Topic)
RETURN topic.name, count(*) as mentions
ORDER BY mentions DESC
```

#### 時系列分析

```cypher
MATCH (t:Tweet)-[:MENTIONS]->(topic:Topic {name: 'VR/AR'})
WITH date(t.timestamp) as day, count(t) as tweet_count
RETURN day, tweet_count
ORDER BY day DESC
LIMIT 30
```

#### 共起トピック分析

```cypher
MATCH (t:Tweet)-[:MENTIONS]->(topic1:Topic)
MATCH (t)-[:MENTIONS]->(topic2:Topic)
WHERE topic1.name < topic2.name
RETURN topic1.name, topic2.name, count(*) as cooccurrence
ORDER BY cooccurrence DESC
LIMIT 10
```

#### 最も共有されている記事

```cypher
MATCH (t:Tweet)-[:LINKS_TO]->(a:Article)
WITH a, count(t) as share_count
WHERE share_count > 1
RETURN a.title, a.url, share_count
ORDER BY share_count DESC
```

## 可視化

### Neo4j Browserで視覚化

1. http://localhost:7474 にアクセス
2. ログイン（neo4j / your-password）
3. クエリを実行:

```cypher
MATCH (u:User)-[:POSTED]->(t:Tweet)-[:MENTIONS]->(topic:Topic)
RETURN u, t, topic
LIMIT 50
```

4. グラフビューで確認

### トピックネットワーク

```cypher
MATCH (t:Tweet)-[:MENTIONS]->(topic:Topic)
WITH topic, count(t) as mentions
WHERE mentions > 2
MATCH (topic)<-[:MENTIONS]-(t:Tweet)
MATCH (t)-[:MENTIONS]->(related:Topic)
WHERE topic <> related
RETURN topic, related, count(*) as connection_strength
```

## データ分析例

### 1. トレンド分析

週ごとのトピック出現頻度:

```cypher
MATCH (t:Tweet)-[:MENTIONS]->(topic:Topic)
WITH topic, date.truncate('week', t.timestamp) as week, count(*) as mentions
RETURN topic.name, week, mentions
ORDER BY week DESC, mentions DESC
```

### 2. インフルエンサー分析

最も多くのトピックに言及しているユーザー:

```cypher
MATCH (u:User)-[:POSTED]->(t:Tweet)-[:MENTIONS]->(topic:Topic)
WITH u, count(DISTINCT topic) as topic_diversity, count(t) as tweet_count
RETURN u.username, topic_diversity, tweet_count
ORDER BY topic_diversity DESC
LIMIT 10
```

### 3. 記事の関連性

同じトピックで言及される記事:

```cypher
MATCH (a1:Article)<-[:LINKS_TO]-(t1:Tweet)-[:MENTIONS]->(topic:Topic)
MATCH (a2:Article)<-[:LINKS_TO]-(t2:Tweet)-[:MENTIONS]->(topic)
WHERE a1.url < a2.url
RETURN a1.title, a2.title, collect(DISTINCT topic.name) as shared_topics
LIMIT 20
```

## データのエクスポート

### JSON形式

```cypher
CALL apoc.export.json.all("ai_news_export.json", {})
```

### CSV形式

```cypher
// ツイートをCSVエクスポート
CALL apoc.export.csv.query(
  "MATCH (u:User)-[:POSTED]->(t:Tweet)
   RETURN u.username, t.text, t.timestamp, t.source",
  "tweets.csv",
  {}
)
```

## データのクリーンアップ

### 古いデータの削除

```cypher
// 30日以上前のツイートを削除
MATCH (t:Tweet)
WHERE t.timestamp < datetime() - duration({days: 30})
DETACH DELETE t
```

### 孤立ノードの削除

```cypher
// 関係のないArticleを削除
MATCH (a:Article)
WHERE NOT (a)<-[:LINKS_TO]-()
DELETE a
```

## パフォーマンス最適化

### インデックスの作成

```cypher
// 既に save_to_neo4j.py で作成済みですが、追加で:
CREATE INDEX IF NOT EXISTS FOR (t:Tweet) ON (t.timestamp)
CREATE INDEX IF NOT EXISTS FOR (t:Tweet) ON (t.source)
CREATE INDEX IF NOT EXISTS FOR (a:Article) ON (a.title)
```

### クエリ最適化のヒント

1. **LIMIT を使用**: 大量データの取得を避ける
2. **インデックスを活用**: WHERE句でインデックス化されたプロパティを使用
3. **EXPLAIN を使用**: クエリプランを確認

```cypher
EXPLAIN MATCH (t:Tweet)-[:MENTIONS]->(topic:Topic)
RETURN topic.name, count(t)
```

## トラブルシューティング

### 接続エラー

```bash
# Neo4jが起動しているか確認
curl http://localhost:7474

# Dockerの場合
docker ps | grep neo4j
```

### 認証エラー

```bash
# パスワードをリセット
docker exec -it neo4j cypher-shell -u neo4j -p old-password
CALL dbms.security.changePassword('new-password')
```

### メモリ不足

`neo4j.conf` を編集:

```
dbms.memory.heap.initial_size=1G
dbms.memory.heap.max_size=2G
dbms.memory.pagecache.size=1G
```

## まとめ

Neo4j統合により、AI News Collectorは:
- ツイートと記事の関係性を視覚化
- トピックのトレンド分析
- ユーザーの関心事を把握
- 記事の関連性を発見

グラフデータベースならではの強力な分析機能を活用できます。
