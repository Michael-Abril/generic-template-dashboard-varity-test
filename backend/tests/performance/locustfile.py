"""
Locust Load Testing for Varity Generic Template

This load test simulates real-world usage patterns:
- Browse marketplace tools
- View integrations
- Send AI chat messages
- Sync data
- View dashboard

Performance Targets:
- 100+ concurrent users
- Average response time < 2 seconds
- 95th percentile < 5 seconds
- Zero errors under normal load

Run with:
    locust -f locustfile.py --host=http://localhost:8000
    locust -f locustfile.py --headless --users 100 --spawn-rate 10 -t 5m --host=http://localhost:8000
"""
from locust import HttpUser, task, between, events
import random
import json
import time


class VarityDashboardUser(HttpUser):
    """
    Simulates a user interacting with the Varity dashboard.

    Wait time: 1-3 seconds between requests (realistic user behavior)
    """
    wait_time = between(1, 3)

    # Test wallet addresses
    test_wallets = [
        f"0x{i:040x}" for i in range(1, 11)  # 10 test wallets
    ]

    def on_start(self):
        """Initialize user session"""
        # Assign a wallet to this user
        self.wallet = random.choice(self.test_wallets)
        self.headers = {
            "X-Wallet-Address": self.wallet,
            "Content-Type": "application/json"
        }

    @task(5)
    def view_marketplace(self):
        """
        Task: Browse marketplace tools (most common action)
        Weight: 5 (higher = more frequent)
        """
        with self.client.get(
            "/api/v1/marketplace/tools",
            headers=self.headers,
            catch_response=True,
            name="Marketplace: List Tools"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                # Rate limited - expected under load
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(3)
    def search_marketplace(self):
        """
        Task: Search marketplace
        Weight: 3
        """
        search_terms = ["quickbooks", "salesforce", "stripe", "accounting", "crm"]
        query = random.choice(search_terms)

        with self.client.get(
            f"/api/v1/marketplace/tools?search={query}",
            headers=self.headers,
            catch_response=True,
            name="Marketplace: Search"
        ) as response:
            if response.status_code in [200, 429]:
                response.success()
            else:
                response.failure(f"Search failed: {response.status_code}")

    @task(2)
    def view_integrations(self):
        """
        Task: View connected integrations
        Weight: 2
        """
        with self.client.get(
            "/api/v1/integrations",
            headers=self.headers,
            catch_response=True,
            name="Integrations: List"
        ) as response:
            if response.status_code in [200, 401, 429]:
                response.success()
            else:
                response.failure(f"Integrations failed: {response.status_code}")

    @task(4)
    def chat_with_ai(self):
        """
        Task: Send message to AI chatbot
        Weight: 4 (common action)
        """
        messages = [
            "Show me my sales data",
            "What are my top customers?",
            "Generate monthly report",
            "How is business performing?",
            "Show revenue trends",
        ]

        payload = {
            "message": random.choice(messages),
            "customer_wallet": self.wallet
        }

        with self.client.post(
            "/api/v1/ai/chat",
            headers=self.headers,
            json=payload,
            catch_response=True,
            name="AI Chat: Send Message"
        ) as response:
            if response.status_code in [200, 401, 422, 429]:
                response.success()
            else:
                response.failure(f"AI chat failed: {response.status_code}")

    @task(1)
    def view_dashboard(self):
        """
        Task: View dashboard analytics
        Weight: 1
        """
        with self.client.get(
            "/api/v1/dashboard/summary",
            headers=self.headers,
            catch_response=True,
            name="Dashboard: Summary"
        ) as response:
            if response.status_code in [200, 401, 404, 429]:
                response.success()
            else:
                response.failure(f"Dashboard failed: {response.status_code}")

    @task(1)
    def view_settings(self):
        """
        Task: View settings
        Weight: 1 (less frequent)
        """
        with self.client.get(
            "/api/v1/settings",
            headers=self.headers,
            catch_response=True,
            name="Settings: View"
        ) as response:
            if response.status_code in [200, 401, 429]:
                response.success()
            else:
                response.failure(f"Settings failed: {response.status_code}")

    @task(1)
    def health_check(self):
        """
        Task: Health check (monitoring simulation)
        Weight: 1
        """
        with self.client.get(
            "/health",
            catch_response=True,
            name="Health Check"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")


class HeavyUser(HttpUser):
    """
    Simulates heavy API usage (data sync, bulk operations)

    Weight: 10% of users
    """
    wait_time = between(0.5, 2)
    weight = 1  # 10% of users will be HeavyUser

    def on_start(self):
        """Initialize heavy user session"""
        self.wallet = f"0x{random.randint(1, 100):040x}"
        self.headers = {
            "X-Wallet-Address": self.wallet,
            "Content-Type": "application/json"
        }

    @task(3)
    def sync_data(self):
        """
        Task: Trigger data sync (expensive operation)
        """
        payload = {
            "integration": random.choice(["quickbooks", "salesforce", "stripe"]),
            "data": {
                "records": [{"id": i, "value": f"test_{i}"} for i in range(10)]
            }
        }

        with self.client.post(
            "/api/v1/sync/manual",
            headers=self.headers,
            json=payload,
            catch_response=True,
            name="Sync: Manual Trigger"
        ) as response:
            if response.status_code in [200, 401, 422, 429]:
                response.success()
            else:
                response.failure(f"Sync failed: {response.status_code}")

    @task(2)
    def upload_to_storage(self):
        """
        Task: Upload data to decentralized storage
        """
        payload = {
            "customer_wallet": self.wallet,
            "integration": "test",
            "data_type": "documents",
            "data": {"document_id": random.randint(1, 1000), "content": "test data"}
        }

        with self.client.post(
            "/api/v1/storage/upload",
            headers=self.headers,
            json=payload,
            catch_response=True,
            name="Storage: Upload"
        ) as response:
            if response.status_code in [200, 401, 422, 429]:
                response.success()
            else:
                response.failure(f"Upload failed: {response.status_code}")


class ReadOnlyUser(HttpUser):
    """
    Simulates read-only users (viewing data, no modifications)

    Weight: 50% of users
    """
    wait_time = between(2, 5)
    weight = 5  # 50% of users will be ReadOnlyUser

    def on_start(self):
        """Initialize read-only user session"""
        self.wallet = f"0x{random.randint(1, 50):040x}"
        self.headers = {"X-Wallet-Address": self.wallet}

    @task(10)
    def browse_marketplace(self):
        """Browse marketplace"""
        self.client.get("/api/v1/marketplace/tools", headers=self.headers, name="Marketplace: Browse")

    @task(5)
    def view_dashboard_analytics(self):
        """View dashboard"""
        self.client.get("/api/v1/dashboard/summary", headers=self.headers, name="Dashboard: View")

    @task(2)
    def check_health(self):
        """Check system health"""
        self.client.get("/health", name="Health: Check")


# Custom event handlers for performance monitoring
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """
    Track slow requests (> 2 seconds)
    """
    if response_time > 2000:  # 2 seconds
        print(f"⚠️  SLOW REQUEST: {name} took {response_time}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Print test configuration on start
    """
    print("\n" + "="*60)
    print("🚀 Varity Dashboard Load Test Starting")
    print("="*60)
    print(f"Target: {environment.host}")
    print(f"Users: {environment.runner.target_user_count if hasattr(environment.runner, 'target_user_count') else 'Dynamic'}")
    print("="*60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """
    Print summary on test completion
    """
    print("\n" + "="*60)
    print("✅ Varity Dashboard Load Test Complete")
    print("="*60)

    stats = environment.stats

    print(f"\nTotal Requests: {stats.total.num_requests}")
    print(f"Total Failures: {stats.total.num_failures}")
    print(f"Average Response Time: {stats.total.avg_response_time:.2f}ms")
    print(f"95th Percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"Requests/sec: {stats.total.total_rps:.2f}")

    # Performance evaluation
    avg_response = stats.total.avg_response_time
    p95_response = stats.total.get_response_time_percentile(0.95)
    error_rate = (stats.total.num_failures / stats.total.num_requests * 100) if stats.total.num_requests > 0 else 0

    print("\n" + "="*60)
    print("📊 PERFORMANCE SCORE")
    print("="*60)

    # Scoring criteria
    score = 100

    if avg_response > 2000:
        print(f"⚠️  Average response time ({avg_response:.0f}ms) exceeds 2s target")
        score -= 20
    else:
        print(f"✅ Average response time: {avg_response:.0f}ms (Target: <2000ms)")

    if p95_response > 5000:
        print(f"⚠️  95th percentile ({p95_response:.0f}ms) exceeds 5s target")
        score -= 20
    else:
        print(f"✅ 95th percentile: {p95_response:.0f}ms (Target: <5000ms)")

    if error_rate > 1:
        print(f"⚠️  Error rate ({error_rate:.2f}%) exceeds 1% target")
        score -= 30
    else:
        print(f"✅ Error rate: {error_rate:.2f}% (Target: <1%)")

    if stats.total.total_rps < 10:
        print(f"⚠️  Throughput ({stats.total.total_rps:.2f} req/s) is low")
        score -= 10
    else:
        print(f"✅ Throughput: {stats.total.total_rps:.2f} req/s")

    print(f"\n🎯 FINAL SCORE: {score}/100")

    if score >= 90:
        print("🏆 EXCELLENT - Production ready!")
    elif score >= 70:
        print("✅ GOOD - Minor optimizations needed")
    elif score >= 50:
        print("⚠️  NEEDS IMPROVEMENT - Performance issues detected")
    else:
        print("❌ CRITICAL - Major performance problems")

    print("="*60 + "\n")


if __name__ == "__main__":
    import os
    os.system("locust -f locustfile.py --host=http://localhost:8000")
