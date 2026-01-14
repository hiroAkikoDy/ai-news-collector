#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Save AI News to Neo4j
Stores tweets, articles, and topics in Neo4j graph database
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Fix encoding for Windows
if sys.platform.startswith('win'):
    import codecs
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from neo4j import GraphDatabase
except ImportError:
    print("Warning: neo4j package not installed.")
    print("Install with: pip install neo4j")
    GraphDatabase = None

# Configuration
NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')


class Neo4jSaver:
    """Save AI news data to Neo4j"""

    def __init__(self, uri, user, password):
        if not GraphDatabase:
            raise ImportError("neo4j package is required")

        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        print(f"Connected to Neo4j at {uri}")

    def close(self):
        if self.driver:
            self.driver.close()

    def create_constraints(self):
        """Create constraints and indexes"""
        with self.driver.session() as session:
            # Create constraints
            constraints = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Tweet) REQUIRE t.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Article) REQUIRE a.url IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (topic:Topic) REQUIRE topic.name IS UNIQUE"
            ]

            for constraint in constraints:
                try:
                    session.run(constraint)
                except Exception as e:
                    print(f"Note: {e}")

            print("Constraints and indexes created")

    def save_tweet(self, tweet_data, collection_info):
        """Save a tweet to Neo4j"""
        with self.driver.session() as session:
            # Create tweet ID from timestamp and index
            tweet_id = f"{collection_info['date']}_{tweet_data['index']}"

            query = """
            MERGE (t:Tweet {id: $tweet_id})
            SET t.text = $text,
                t.timestamp = datetime($timestamp),
                t.collected_at = datetime($collected_at),
                t.source = $source,
                t.index = $index

            MERGE (u:User {username: $author})
            MERGE (u)-[:POSTED]->(t)

            RETURN t
            """

            result = session.run(
                query,
                tweet_id=tweet_id,
                text=tweet_data['text'],
                timestamp=tweet_data['timestamp'],
                collected_at=collection_info['collected_at'],
                source=collection_info['source'],
                index=tweet_data['index'],
                author=tweet_data['author']
            )

            return result.single()[0]

    def save_article(self, article_data, tweet_id):
        """Save an article and link to tweet"""
        with self.driver.session() as session:
            query = """
            MATCH (t:Tweet {id: $tweet_id})

            MERGE (a:Article {url: $url})
            SET a.title = $title,
                a.description = $description,
                a.content = $content,
                a.updated_at = datetime()

            MERGE (t)-[:LINKS_TO]->(a)

            RETURN a
            """

            result = session.run(
                query,
                tweet_id=tweet_id,
                url=article_data['url'],
                title=article_data.get('title', ''),
                description=article_data.get('description', ''),
                content=article_data.get('content', '')
            )

            return result.single()[0] if result.single() else None

    def extract_and_save_topics(self, tweet_text, tweet_id):
        """Extract topics from tweet and create relationships"""
        # Simple keyword-based topic extraction
        topic_keywords = {
            'AI': ['ai', 'artificial intelligence', 'machine learning', 'deep learning'],
            'VR/AR': ['vr', 'ar', 'xr', 'virtual reality', 'augmented reality', 'vrchat', 'quest'],
            'Unity': ['unity', 'unity3d', 'game engine'],
            'WebGL': ['webgl', 'web graphics', 'three.js'],
            'Metaverse': ['metaverse', 'メタバース'],
            'GPT': ['gpt', 'chatgpt', 'llm', 'claude', 'gemini'],
            'Development': ['開発', 'development', 'coding', 'programming']
        }

        text_lower = tweet_text.lower()
        found_topics = []

        for topic_name, keywords in topic_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                found_topics.append(topic_name)

        # Save topics to Neo4j
        with self.driver.session() as session:
            for topic_name in found_topics:
                query = """
                MATCH (t:Tweet {id: $tweet_id})
                MERGE (topic:Topic {name: $topic_name})
                MERGE (t)-[:MENTIONS]->(topic)
                RETURN topic
                """

                session.run(query, tweet_id=tweet_id, topic_name=topic_name)

        return found_topics

    def get_statistics(self):
        """Get database statistics"""
        with self.driver.session() as session:
            stats_query = """
            MATCH (t:Tweet) WITH count(t) as tweets
            MATCH (a:Article) WITH tweets, count(a) as articles
            MATCH (u:User) WITH tweets, articles, count(u) as users
            MATCH (topic:Topic) WITH tweets, articles, users, count(topic) as topics
            MATCH ()-[r]->() WITH tweets, articles, users, topics, count(r) as relationships
            RETURN tweets, articles, users, topics, relationships
            """

            result = session.run(stats_query)
            record = result.single()

            return {
                'tweets': record['tweets'],
                'articles': record['articles'],
                'users': record['users'],
                'topics': record['topics'],
                'relationships': record['relationships']
            }


def load_tweet_data(filepath):
    """Load tweet data from JSON file"""
    print(f"Loading data from: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {data.get('tweetCount', 0)} tweets")
    return data


def main():
    """Main function"""
    print("=" * 60)
    print("Save AI News to Neo4j")
    print("=" * 60)

    # Check if Neo4j is available
    if not GraphDatabase:
        print("\nError: neo4j package not installed")
        print("Install with: pip install neo4j")
        sys.exit(1)

    # Setup paths
    project_root = Path(__file__).parent.parent
    data_dir = project_root / 'data' / 'tweets'

    # Find the most recent tweet file
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
    else:
        json_files = sorted(data_dir.glob('*.json'), reverse=True)
        if not json_files:
            print("\nNo tweet data files found in data/tweets/")
            sys.exit(1)
        input_file = json_files[0]

    print(f"\nInput file: {input_file}")

    # Load data
    tweets_data = load_tweet_data(input_file)

    # Extract collection info
    filename = input_file.stem
    date_part = filename.split('_')[0]

    collection_info = {
        'date': date_part,
        'collected_at': tweets_data.get('collectedAt', datetime.now().isoformat()),
        'source': tweets_data.get('source', 'unknown'),
        'username': tweets_data.get('username', 'unknown')
    }

    # Connect to Neo4j
    try:
        saver = Neo4jSaver(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    except Exception as e:
        print(f"\nError connecting to Neo4j: {e}")
        print("\nMake sure Neo4j is running and credentials are correct:")
        print(f"  URI: {NEO4J_URI}")
        print(f"  User: {NEO4J_USER}")
        print("\nSet environment variables:")
        print("  export NEO4J_URI='bolt://localhost:7687'")
        print("  export NEO4J_USER='neo4j'")
        print("  export NEO4J_PASSWORD='your-password'")
        sys.exit(1)

    try:
        # Create constraints
        saver.create_constraints()

        # Process tweets
        print(f"\nProcessing {len(tweets_data['tweets'])} tweets...")

        tweet_count = 0
        article_count = 0
        topic_count = 0

        for tweet in tweets_data['tweets']:
            # Save tweet
            tweet_id = f"{date_part}_{tweet['index']}"
            saver.save_tweet(tweet, collection_info)
            tweet_count += 1

            # Save linked articles
            for article in tweet.get('linkedContent', []):
                saver.save_article(article, tweet_id)
                article_count += 1

            # Extract and save topics
            topics = saver.extract_and_save_topics(tweet['text'], tweet_id)
            topic_count += len(topics)

            if (tweet_count % 5) == 0:
                print(f"  Processed {tweet_count} tweets...")

        # Get statistics
        stats = saver.get_statistics()

        print("\n" + "=" * 60)
        print("Save complete!")
        print("=" * 60)
        print(f"\nDatabase Statistics:")
        print(f"  Total Tweets: {stats['tweets']}")
        print(f"  Total Articles: {stats['articles']}")
        print(f"  Total Users: {stats['users']}")
        print(f"  Total Topics: {stats['topics']}")
        print(f"  Total Relationships: {stats['relationships']}")
        print()

    finally:
        saver.close()


if __name__ == '__main__':
    main()
