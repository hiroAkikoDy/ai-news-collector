#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI News Scheduler
Automatically collects and processes AI news on a schedule
"""

import os
import sys
import time
import schedule
import subprocess
from datetime import datetime
from pathlib import Path

# Fix encoding for Windows
if sys.platform.startswith('win'):
    import codecs
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


class NewsScheduler:
    """Schedule and run AI news collection tasks"""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.scripts_dir = self.project_root / 'scripts'
        self.data_dir = self.project_root / 'data' / 'tweets'
        self.reports_dir = self.project_root / 'reports'

    def log(self, message):
        """Print timestamped log message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")

    def run_command(self, command, description):
        """Run a shell command and return result"""
        self.log(f"Running: {description}")
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                self.log(f"Success: {description}")
                return True, result.stdout
            else:
                self.log(f"Failed: {description}")
                self.log(f"Error: {result.stderr}")
                return False, result.stderr

        except subprocess.TimeoutExpired:
            self.log(f"Timeout: {description}")
            return False, "Command timed out"
        except Exception as e:
            self.log(f"Error running {description}: {e}")
            return False, str(e)

    def check_for_new_data(self):
        """Check if new tweet data is available"""
        json_files = sorted(self.data_dir.glob('*.json'), reverse=True)

        if not json_files:
            self.log("No tweet data found")
            return False, None

        latest_file = json_files[0]
        file_time = datetime.fromtimestamp(latest_file.stat().st_mtime)
        time_diff = datetime.now() - file_time

        self.log(f"Latest data: {latest_file.name} ({time_diff.total_seconds() / 3600:.1f} hours old)")

        # Consider data fresh if less than 24 hours old
        if time_diff.total_seconds() < 86400:
            return True, latest_file
        else:
            return False, latest_file

    def generate_report(self):
        """Generate AI news report"""
        self.log("Generating AI news report...")

        # Check for data
        has_fresh_data, data_file = self.check_for_new_data()

        if not data_file:
            self.log("No data available for report generation")
            return False

        if not has_fresh_data:
            self.log("Warning: Using data older than 24 hours")

        # Run report generation
        command = f'python "{self.scripts_dir / "generate_report.py"}"'
        success, output = self.run_command(command, "Report generation")

        if success:
            # Find the generated report
            reports = sorted(self.reports_dir.glob('ai_news_*.md'), reverse=True)
            if reports:
                self.log(f"Report generated: {reports[0].name}")
                return True

        return False

    def save_to_neo4j(self):
        """Save data to Neo4j"""
        self.log("Saving to Neo4j...")

        # Check if Neo4j is configured
        neo4j_uri = os.getenv('NEO4J_URI')
        if not neo4j_uri:
            self.log("Neo4j not configured (NEO4J_URI not set), skipping")
            return False

        # Run Neo4j save
        command = f'python "{self.scripts_dir / "save_to_neo4j.py"}"'
        success, output = self.run_command(command, "Neo4j save")

        return success

    def send_notification(self, message):
        """Send notification (placeholder for future implementation)"""
        self.log(f"Notification: {message}")
        # TODO: Implement email, Slack, or other notification methods

    def weekly_task(self):
        """Main weekly task"""
        self.log("=" * 60)
        self.log("Starting weekly AI news collection task")
        self.log("=" * 60)

        # Check for new data
        has_fresh_data, data_file = self.check_for_new_data()

        if not has_fresh_data:
            self.log("No fresh data available!")
            self.log("Please collect tweets using Chrome extension:")
            self.log("  1. Open https://x.com/home")
            self.log("  2. Click 'Collect Tweets from Timeline'")
            self.send_notification("AI News: Please collect new tweets")
            return

        # Generate report
        report_success = self.generate_report()

        # Save to Neo4j (optional)
        neo4j_success = self.save_to_neo4j()

        # Summary
        self.log("=" * 60)
        self.log("Weekly task complete!")
        self.log(f"  Report generation: {'Success' if report_success else 'Failed'}")
        self.log(f"  Neo4j save: {'Success' if neo4j_success else 'Skipped/Failed'}")
        self.log("=" * 60)

        if report_success:
            self.send_notification("AI News: Weekly report generated successfully")

    def daily_check(self):
        """Daily check for new data"""
        self.log("Running daily check...")

        has_fresh_data, data_file = self.check_for_new_data()

        if has_fresh_data:
            self.log("Fresh data available, generating report...")
            self.generate_report()
        else:
            self.log("No fresh data, waiting for collection")

    def run(self):
        """Start the scheduler"""
        self.log("AI News Scheduler started")
        self.log("Schedule:")
        self.log("  - Weekly report: Every Monday at 09:00")
        self.log("  - Daily check: Every day at 10:00")
        self.log("")
        self.log("Press Ctrl+C to stop")

        # Schedule tasks
        schedule.every().monday.at("09:00").do(self.weekly_task)
        schedule.every().day.at("10:00").do(self.daily_check)

        # For testing: run immediately
        if '--test' in sys.argv:
            self.log("Test mode: Running tasks immediately")
            self.weekly_task()
            return

        # Run scheduler loop
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            self.log("\nScheduler stopped by user")


def main():
    """Main function"""
    print("=" * 60)
    print("AI News Scheduler")
    print("=" * 60)
    print()

    # Check if schedule package is installed
    try:
        import schedule
    except ImportError:
        print("Error: schedule package not installed")
        print("Install with: pip install schedule")
        sys.exit(1)

    # Create and run scheduler
    scheduler = NewsScheduler()

    if '--help' in sys.argv:
        print("Usage:")
        print("  python scripts/news_scheduler.py         Start scheduler")
        print("  python scripts/news_scheduler.py --test  Run tasks immediately")
        print("  python scripts/news_scheduler.py --help  Show this help")
        print()
        print("Environment variables:")
        print("  NEO4J_URI      - Neo4j connection URI (optional)")
        print("  NEO4J_USER     - Neo4j username (optional)")
        print("  NEO4J_PASSWORD - Neo4j password (optional)")
        return

    scheduler.run()


if __name__ == '__main__':
    main()
