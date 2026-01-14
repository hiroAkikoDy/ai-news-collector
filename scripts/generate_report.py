#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI News Report Generator
Analyzes collected tweets and generates a report in Naru-sensei's style
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

import anthropic

# Configuration
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
if not ANTHROPIC_API_KEY:
    print("Warning: ANTHROPIC_API_KEY not set. Please set it to use Claude API.")
    print("   Set it with: export ANTHROPIC_API_KEY='your-api-key'")

NARU_SENSEI_PROMPT = """【ロール設定】
あなたは「ナル先生」というキャラクターとして振る舞ってください。
ナル先生の正体は、最新のAIトレンドに超詳しい「Harajuku-Girl（原宿系ギャル）」です。
難解なテクノロジーのニュースを、背景や周辺情報までたっぷり盛り込みつつ、原宿のカフェでおしゃべりしているような超ハイテンションでエモく解説するのがお仕事です。

【口調・キャラクタールール】
- 一人称/呼びかけ: 一人称は「ナル先生」。読者のことは「みんな」と呼びます。
- 挨拶: 冒頭は必ず「みんな、ハロー！ナル先生だよ！☀️💖」からスタート。
- ギャル語の使用: 「マジでヤバい」「レベチ」「超エモい」「宇宙級」「神進化」「～なの！」「～だよ！」「～してね！」など、明るくエネルギッシュな言葉遣いを徹底してください。
- 絵文字の魔法: ☀️💖🚀✨🌈🧠🦄💎🦋 などのキラキラ・ワクワクする絵文字を、文章のあちこちや見出しにたっぷり散りばめてください。
- ポジティブなスタンス: どんなニュースも「未来へのワクワク」に繋げて解説し、最後はみんなを応援するメッセージで締めてください。

【構成ルール】
- タイトル: 必ず「ナル先生の～」で始まり、指定された日付を入れてください。
- 見出し: Markdownの見出し（# や ##）を使い、見出し自体もテンション高めに設定してください。
- 解説の深さ: 単なる要約ではなく、「なぜこれがヤバいのか（背景）」や「これで未来がどう変わるのか（周辺情報）」をナル先生独自の視点（インサイト）として解説してください。

【出力形式】
- 本文はMarkdown形式で出力してください。
- 数式や科学的な式が必要な場合は、必ず LaTeX（$記号で囲む形式）を使用してください。"""


def load_tweet_data(filepath):
    """Load tweet data from JSON file"""
    print(f"Loading tweet data from: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {data.get('tweetCount', 0)} tweets")
    return data


def extract_ai_topics(tweets_data):
    """Extract AI-related topics from tweets and articles"""
    print("\nAnalyzing tweets for AI-related content...")

    topics = []

    for tweet in tweets_data.get('tweets', []):
        # Check if tweet mentions AI-related keywords
        text = tweet.get('text', '').lower()
        ai_keywords = ['ai', 'gpt', 'llm', 'machine learning', 'deep learning',
                      'neural', 'transformer', 'anthropic', 'openai', 'claude',
                      'gemini', 'chatgpt', 'vrchat', 'unity', 'vr', 'ar', 'xr',
                      'metaverse', 'webgl', '機械学習', '深層学習', 'ディープラーニング',
                      'メタバース', 'quest']

        is_ai_related = any(keyword in text for keyword in ai_keywords)

        if is_ai_related or tweet.get('linkedContent'):
            topic = {
                'author': tweet.get('author', 'unknown'),
                'text': tweet.get('text', ''),
                'timestamp': tweet.get('timestamp', ''),
                'urls': tweet.get('urls', []),
                'linked_content': []
            }

            # Add linked content information
            for content in tweet.get('linkedContent', []):
                topic['linked_content'].append({
                    'url': content.get('url', ''),
                    'title': content.get('title', ''),
                    'description': content.get('description', ''),
                    'content': content.get('content', '')[:500]  # First 500 chars
                })

            topics.append(topic)

    print(f"Found {len(topics)} AI-related topics")
    return topics


def prepare_analysis_prompt(topics, date_str):
    """Prepare the prompt for Claude analysis"""

    # Prepare topics summary
    topics_text = ""
    for i, topic in enumerate(topics, 1):
        topics_text += f"\n## トピック {i}\n"
        topics_text += f"**投稿者**: @{topic['author']}\n"
        topics_text += f"**ツイート**: {topic['text']}\n"
        topics_text += f"**日時**: {topic['timestamp']}\n"

        if topic['linked_content']:
            topics_text += f"\n**リンク先記事**:\n"
            for content in topic['linked_content']:
                topics_text += f"- **URL**: {content['url']}\n"
                topics_text += f"  **タイトル**: {content['title']}\n"
                if content['description']:
                    topics_text += f"  **説明**: {content['description']}\n"
                if content['content']:
                    topics_text += f"  **内容抜粋**: {content['content'][:300]}...\n"

        topics_text += "\n---\n"

    prompt = f"""以下のTwitterから収集したAI関連のツイートと記事を分析して、「ナル先生のAIニュースレポート」を作成してください。

収集日: {date_str}
収集したトピック数: {len(topics)}

{topics_text}

【レポート作成の指示】
1. 上記のトピックを分析して、重要度の高い順にランキング
2. 各トピックについて、ナル先生のスタイルで解説
3. 背景情報や周辺情報も含めて、「なぜヤバいのか」を説明
4. 最後にみんなを応援するメッセージで締める

タイトルは「ナル先生のAIニュース速報 - {date_str}」にしてください。

それでは、ナル先生になりきって、超ハイテンションでエモいレポートを作成してください！✨"""

    return prompt


def generate_report_with_claude(prompt):
    """Generate report using Claude API"""

    if not ANTHROPIC_API_KEY:
        print("\nSkipping Claude API call (no API key)")
        return None

    print("\nGenerating report with Claude API...")

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            temperature=1.0,
            system=NARU_SENSEI_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        report = message.content[0].text
        print("Report generated successfully!")
        return report

    except Exception as e:
        print(f"Error generating report: {e}")
        return None


def generate_fallback_report(topics, date_str):
    """Generate a simple fallback report without Claude API"""

    report = f"""# ナル先生のAIニュース速報 - {date_str}

みんな、ハロー！ナル先生だよ！

今日は{len(topics)}個のヤバいAIニュースを集めてきたよ！
マジでレベチな情報ばかりだから、最後まで読んでね！

## 今週の重要トピック

"""

    for i, topic in enumerate(topics[:5], 1):  # Top 5
        report += f"\n### {i}. 超エモい話題！\n\n"
        report += f"**投稿者**: @{topic['author']}\n\n"
        report += f"**ツイート内容**:\n{topic['text']}\n\n"

        if topic['linked_content']:
            report += f"**詳細記事**: \n"
            for content in topic['linked_content']:
                report += f"- [{content['title']}]({content['url']})\n"
                if content['description']:
                    report += f"  > {content['description']}\n"

        report += f"\n**ナル先生のインサイト**: このトピック、マジでヤバいの！未来のAIがどんどん進化してて、宇宙級にエモいよね！\n\n"
        report += "---\n"

    report += f"""

## ナル先生からみんなへ

今日紹介した{len(topics)}個のトピック、どれもこれも未来へのワクワクが詰まってるの！
AIの進化は止まらないし、みんなもこの波に乗って、一緒に未来を作っていこうね！

ナル先生は、いつでもみんなのこと応援してるよ！

次回のレポートもお楽しみに！バイバイ～！

---

*Generated by AI News Collector*
*Date: {date_str}*
"""

    return report


def save_report(report, date_str, output_dir):
    """Save report to markdown file"""

    output_path = output_dir / f"ai_news_{date_str}.md"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\nReport saved to: {output_path}")
    return output_path


def main():
    """Main function"""
    print("=" * 60)
    print("AI News Report Generator - Naru Sensei Edition")
    print("=" * 60)

    # Setup paths
    project_root = Path(__file__).parent.parent
    data_dir = project_root / 'data' / 'tweets'
    reports_dir = project_root / 'reports'
    reports_dir.mkdir(exist_ok=True)

    # Find the most recent tweet file
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
    else:
        # Find most recent file
        json_files = sorted(data_dir.glob('*.json'), reverse=True)
        if not json_files:
            print("No tweet data files found in data/tweets/")
            sys.exit(1)
        input_file = json_files[0]

    print(f"\nInput file: {input_file}")

    # Extract date from filename
    filename = input_file.stem  # e.g., "20260114_goromian"
    date_part = filename.split('_')[0]  # "20260114"
    date_str = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"  # "2026-01-14"

    # Load and analyze data
    tweets_data = load_tweet_data(input_file)
    topics = extract_ai_topics(tweets_data)

    if not topics:
        print("\nNo AI-related topics found!")
        sys.exit(0)

    # Generate report
    prompt = prepare_analysis_prompt(topics, date_str)

    # Try to generate with Claude API
    report = generate_report_with_claude(prompt)

    # Fallback to simple report if API fails
    if not report:
        print("\nGenerating fallback report...")
        report = generate_fallback_report(topics, date_str)

    # Save report
    output_path = save_report(report, date_part, reports_dir)

    print("\n" + "=" * 60)
    print("Report generation complete!")
    print("=" * 60)
    print(f"\nReport saved to: {output_path}")
    print(f"Analyzed {len(topics)} topics")
    print(f"Report date: {date_str}")
    print("\nTo view the report, run:")
    print(f"  type {output_path}")
    print()


if __name__ == '__main__':
    main()
