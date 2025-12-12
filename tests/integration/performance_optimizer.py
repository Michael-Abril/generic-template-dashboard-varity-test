#!/usr/bin/env python3
"""
Comprehensive Performance Optimization Analyzer
Agent 5: Performance Optimizer

This script performs a comprehensive performance analysis of the generic template
to achieve Varity's value proposition of exponential cost savings.
"""

import os
import json
import time
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime
import sqlite3

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.END}\n")

def print_section(text: str):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'─'*80}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'─'*80}{Colors.END}")

def print_success(text: str):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_error(text: str):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text: str):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

class PerformanceOptimizer:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.frontend_dir = self.base_dir / "src"
        self.backend_dir = self.base_dir / "backend"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "frontend": {},
            "backend": {},
            "database": {},
            "smart_contracts": {},
            "cost_analysis": {},
            "recommendations": []
        }

    def analyze_bundle_size(self) -> Dict[str, Any]:
        """Analyze frontend bundle size"""
        print_section("Phase 1.2: Bundle Size Analysis")

        bundle_analysis = {
            "next_build_dir": str(self.base_dir / ".next"),
            "static_dir_exists": (self.base_dir / ".next" / "static").exists(),
            "analysis": {}
        }

        # Check if build exists
        next_dir = self.base_dir / ".next"
        if not next_dir.exists():
            print_warning("No .next build directory found. Build needed for analysis.")
            bundle_analysis["status"] = "build_required"
            return bundle_analysis

        # Analyze static JavaScript bundles
        static_js_dir = next_dir / "static" / "chunks"
        if static_js_dir.exists():
            js_files = list(static_js_dir.glob("**/*.js"))
            total_size = sum(f.stat().st_size for f in js_files)

            bundle_analysis["analysis"] = {
                "total_js_files": len(js_files),
                "total_size_bytes": total_size,
                "total_size_kb": round(total_size / 1024, 2),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "files": []
            }

            # Sort by size
            for js_file in sorted(js_files, key=lambda f: f.stat().st_size, reverse=True)[:10]:
                size_kb = round(js_file.stat().st_size / 1024, 2)
                bundle_analysis["analysis"]["files"].append({
                    "name": js_file.name,
                    "size_kb": size_kb,
                    "path": str(js_file.relative_to(self.base_dir))
                })

            # Evaluation
            if total_size / 1024 > 500:
                print_warning(f"Bundle size is {bundle_analysis['analysis']['total_size_kb']} KB (target: <500 KB)")
                self.results["recommendations"].append({
                    "category": "bundle_size",
                    "severity": "high",
                    "message": f"Bundle size ({bundle_analysis['analysis']['total_size_kb']} KB) exceeds target of 500 KB",
                    "suggestion": "Implement code splitting, lazy loading, and tree shaking"
                })
            else:
                print_success(f"Bundle size is {bundle_analysis['analysis']['total_size_kb']} KB (within target)")
        else:
            print_warning("No static JavaScript directory found")
            bundle_analysis["status"] = "no_static_dir"

        return bundle_analysis

    def analyze_image_optimization(self) -> Dict[str, Any]:
        """Analyze image optimization opportunities"""
        print_section("Phase 1.3: Image Optimization Analysis")

        image_analysis = {
            "public_images": [],
            "src_images": [],
            "recommendations": []
        }

        # Check public directory
        public_dir = self.base_dir / "public"
        if public_dir.exists():
            image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
            for ext in image_extensions:
                images = list(public_dir.rglob(f"*{ext}"))
                for img in images:
                    size_kb = round(img.stat().st_size / 1024, 2)
                    image_analysis["public_images"].append({
                        "name": img.name,
                        "extension": ext,
                        "size_kb": size_kb,
                        "path": str(img.relative_to(self.base_dir))
                    })

                    # Check if conversion to WebP would be beneficial
                    if ext in ['.png', '.jpg', '.jpeg'] and size_kb > 50:
                        image_analysis["recommendations"].append({
                            "file": img.name,
                            "current_size_kb": size_kb,
                            "recommendation": f"Convert {ext} to WebP for ~30% size reduction",
                            "estimated_savings_kb": round(size_kb * 0.3, 2)
                        })

        total_images = len(image_analysis["public_images"])
        total_size_kb = sum(img["size_kb"] for img in image_analysis["public_images"])

        print_info(f"Found {total_images} images totaling {round(total_size_kb, 2)} KB")

        if image_analysis["recommendations"]:
            print_warning(f"{len(image_analysis['recommendations'])} images could be optimized")
            self.results["recommendations"].append({
                "category": "image_optimization",
                "severity": "medium",
                "message": f"{len(image_analysis['recommendations'])} images should be converted to WebP",
                "estimated_savings_kb": sum(r["estimated_savings_kb"] for r in image_analysis["recommendations"])
            })
        else:
            print_success("All images are optimized")

        return image_analysis

    def analyze_database_performance(self) -> Dict[str, Any]:
        """Analyze database performance and indexing"""
        print_section("Phase 2.2: Database Query Optimization")

        db_analysis = {
            "marketplace_db": {},
            "test_db": {},
            "recommendations": []
        }

        # Check marketplace.db
        marketplace_db = self.backend_dir / "marketplace.db"
        if marketplace_db.exists():
            try:
                conn = sqlite3.connect(str(marketplace_db))
                cursor = conn.cursor()

                # Get all tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [row[0] for row in cursor.fetchall()]

                db_analysis["marketplace_db"]["tables"] = tables
                db_analysis["marketplace_db"]["table_count"] = len(tables)

                # Get indexes for each table
                indexes_by_table = {}
                for table in tables:
                    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='{table}';")
                    indexes = [row[0] for row in cursor.fetchall()]
                    indexes_by_table[table] = indexes

                db_analysis["marketplace_db"]["indexes"] = indexes_by_table

                # Count rows in each table
                row_counts = {}
                for table in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table};")
                        row_counts[table] = cursor.fetchone()[0]
                    except Exception as e:
                        row_counts[table] = f"Error: {str(e)}"

                db_analysis["marketplace_db"]["row_counts"] = row_counts

                # Check for missing indexes on common columns
                important_columns = {
                    "purchases": ["wallet_address", "product_id", "created_at"],
                    "oauth_tokens": ["wallet_address", "provider"],
                    "sync_jobs": ["wallet_address", "integration", "status"],
                    "products": ["category", "status"]
                }

                for table, columns in important_columns.items():
                    if table in tables:
                        cursor.execute(f"PRAGMA table_info({table});")
                        table_columns = [row[1] for row in cursor.fetchall()]

                        for col in columns:
                            if col in table_columns:
                                # Check if index exists
                                index_name = f"idx_{table}_{col}"
                                if index_name not in indexes_by_table.get(table, []):
                                    db_analysis["recommendations"].append({
                                        "table": table,
                                        "column": col,
                                        "recommendation": f"CREATE INDEX {index_name} ON {table}({col});",
                                        "reason": f"Improve query performance on {table}.{col}"
                                    })

                conn.close()
                print_success(f"Analyzed {len(tables)} tables in marketplace.db")

                if db_analysis["recommendations"]:
                    print_warning(f"{len(db_analysis['recommendations'])} indexes recommended")
                else:
                    print_success("Database indexes are properly configured")

            except Exception as e:
                print_error(f"Error analyzing marketplace.db: {str(e)}")
                db_analysis["marketplace_db"]["error"] = str(e)
        else:
            print_warning("marketplace.db not found")
            db_analysis["marketplace_db"]["status"] = "not_found"

        return db_analysis

    def analyze_api_endpoints(self) -> Dict[str, Any]:
        """Analyze backend API endpoints for optimization opportunities"""
        print_section("Phase 2.1: API Endpoint Analysis")

        api_analysis = {
            "endpoints": [],
            "total_endpoints": 0,
            "recommendations": []
        }

        # Scan API routes
        app_dir = self.backend_dir / "app"
        if app_dir.exists():
            api_files = list(app_dir.rglob("*routes*.py")) + list(app_dir.rglob("*api*.py"))

            for api_file in api_files:
                try:
                    content = api_file.read_text()

                    # Count endpoint definitions
                    endpoint_count = content.count("@router.") + content.count("@app.")

                    # Check for caching
                    has_caching = "cache" in content.lower() or "redis" in content.lower()

                    # Check for pagination
                    has_pagination = "limit" in content.lower() and "offset" in content.lower()

                    # Check for database query optimization
                    has_joinedload = "joinedload" in content
                    has_selectinload = "selectinload" in content

                    api_analysis["endpoints"].append({
                        "file": str(api_file.relative_to(self.backend_dir)),
                        "endpoint_count": endpoint_count,
                        "has_caching": has_caching,
                        "has_pagination": has_pagination,
                        "has_eager_loading": has_joinedload or has_selectinload
                    })

                    # Recommendations
                    if endpoint_count > 0 and not has_caching:
                        api_analysis["recommendations"].append({
                            "file": str(api_file.relative_to(self.backend_dir)),
                            "recommendation": "Implement Redis caching for frequently accessed endpoints",
                            "impact": "high"
                        })

                    if endpoint_count > 0 and not has_pagination:
                        api_analysis["recommendations"].append({
                            "file": str(api_file.relative_to(self.backend_dir)),
                            "recommendation": "Add pagination to prevent loading large result sets",
                            "impact": "medium"
                        })

                except Exception as e:
                    print_error(f"Error analyzing {api_file.name}: {str(e)}")

            api_analysis["total_endpoints"] = sum(e["endpoint_count"] for e in api_analysis["endpoints"])
            print_info(f"Found {api_analysis['total_endpoints']} API endpoints across {len(api_files)} files")

            if api_analysis["recommendations"]:
                print_warning(f"{len(api_analysis['recommendations'])} optimization opportunities found")
            else:
                print_success("API endpoints are well-optimized")
        else:
            print_warning("Backend app directory not found")

        return api_analysis

    def analyze_dependencies(self) -> Dict[str, Any]:
        """Analyze dependencies for optimization"""
        print_section("Dependency Analysis")

        dep_analysis = {
            "frontend": {},
            "backend": {},
            "recommendations": []
        }

        # Frontend dependencies
        package_json = self.base_dir / "package.json"
        if package_json.exists():
            try:
                with open(package_json) as f:
                    package_data = json.load(f)

                deps = package_data.get("dependencies", {})
                dev_deps = package_data.get("devDependencies", {})

                dep_analysis["frontend"] = {
                    "dependencies_count": len(deps),
                    "dev_dependencies_count": len(dev_deps),
                    "total_count": len(deps) + len(dev_deps),
                    "dependencies": list(deps.keys())[:20],  # First 20
                    "dev_dependencies": list(dev_deps.keys())[:20]
                }

                print_info(f"Frontend: {len(deps)} dependencies, {len(dev_deps)} dev dependencies")

            except Exception as e:
                print_error(f"Error analyzing package.json: {str(e)}")

        # Backend dependencies
        requirements_txt = self.backend_dir / "requirements.txt"
        if requirements_txt.exists():
            try:
                requirements = requirements_txt.read_text().strip().split('\n')
                requirements = [r.strip() for r in requirements if r.strip() and not r.startswith('#')]

                dep_analysis["backend"] = {
                    "dependencies_count": len(requirements),
                    "dependencies": requirements[:20]  # First 20
                }

                print_info(f"Backend: {len(requirements)} dependencies")

            except Exception as e:
                print_error(f"Error analyzing requirements.txt: {str(e)}")

        return dep_analysis

    def cost_analysis(self) -> Dict[str, Any]:
        """Analyze infrastructure costs"""
        print_section("Phase 4: Cost Optimization Analysis")

        cost_data = {
            "current_infrastructure": {
                "ollama_local": {"cost_month": 0, "description": "Local LLM (free in dev)"},
                "qdrant_local": {"cost_month": 0, "description": "Local vector DB (free in dev)"},
                "redis_local": {"cost_month": 0, "description": "Local caching (free in dev)"},
                "sqlite_local": {"cost_month": 0, "description": "Local database (free in dev)"}
            },
            "production_depin_estimate": {
                "akash_compute_non_gpu": {"cost_month": 41, "description": "Non-GPU compute on Akash"},
                "akash_gpu_llm": {"cost_month": 500, "description": "2 GPU instances for LLM"},
                "filecoin_pinata": {"cost_month": 50, "description": "Filecoin storage via Pinata"},
                "arbitrum_l3": {"cost_month": 80, "description": "L3 operations"},
                "celestia_da": {"cost_month": 100, "description": "Data availability"},
                "lit_protocol": {"cost_month": 20, "description": "Encryption"},
                "buffer": {"cost_month": 9, "description": "10% contingency"}
            },
            "google_cloud_comparison": {
                "vertex_ai": {"cost_month": 2000, "description": "Gemini 2.5 Flash API"},
                "cloud_run": {"cost_month": 100, "description": "Backend hosting"},
                "cloud_storage": {"cost_month": 50, "description": "Object storage"},
                "bigquery": {"cost_month": 50, "description": "Data warehouse"}
            }
        }

        # Calculate totals
        depin_total = sum(v["cost_month"] for v in cost_data["production_depin_estimate"].values())
        gcp_total = sum(v["cost_month"] for v in cost_data["google_cloud_comparison"].values())

        cost_data["comparison"] = {
            "depin_total_month": depin_total,
            "gcp_total_month": gcp_total,
            "savings_month": gcp_total - depin_total,
            "savings_percentage": round(((gcp_total - depin_total) / gcp_total) * 100, 1),
            "cost_per_100_users": {
                "depin": round(depin_total / 100, 2),
                "gcp": round(gcp_total / 100, 2)
            }
        }

        print_success(f"DePin Infrastructure: ${depin_total}/month")
        print_info(f"Google Cloud: ${gcp_total}/month")
        print_success(f"Savings: ${cost_data['comparison']['savings_month']}/month ({cost_data['comparison']['savings_percentage']}%)")

        # Check if we meet target
        if depin_total <= 100:
            print_success(f"✓ Within target infrastructure cost (<$100/month)")
        else:
            print_warning(f"⚠ Above target cost (${depin_total} vs $100 target)")
            self.results["recommendations"].append({
                "category": "cost",
                "severity": "high",
                "message": f"Infrastructure cost (${depin_total}/month) exceeds $100 target",
                "suggestion": "Consider optimizing GPU usage or exploring alternative LLM hosting"
            })

        return cost_data

    def generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate final recommendations based on all analyses"""
        print_section("Generating Optimization Recommendations")

        recommendations = []

        # Frontend recommendations
        recommendations.append({
            "category": "Frontend Performance",
            "priority": "HIGH",
            "items": [
                "Implement React.memo() for Dashboard, Marketplace, and AI Assistant components",
                "Add code splitting with dynamic imports for heavy routes",
                "Implement virtual scrolling for marketplace product lists",
                "Convert all PNG/JPG images to WebP format",
                "Enable HTTP/2 and configure cache headers",
                "Add service worker for offline caching"
            ]
        })

        # Backend recommendations
        recommendations.append({
            "category": "Backend Performance",
            "priority": "HIGH",
            "items": [
                "Implement Redis caching for marketplace products (1 hour TTL)",
                "Add caching for dashboard KPIs (5 minute TTL)",
                "Create database indexes on wallet_address, product_id, created_at",
                "Implement connection pooling (pool_size=10, max_overflow=20)",
                "Add pagination to all list endpoints (limit=50)",
                "Use eager loading (joinedload) for related objects"
            ]
        })

        # Database recommendations
        recommendations.append({
            "category": "Database Optimization",
            "priority": "MEDIUM",
            "items": [
                "Add composite indexes for multi-column queries",
                "Migrate to PostgreSQL for production (better concurrency)",
                "Implement query result caching",
                "Add database query monitoring",
                "Create materialized views for complex aggregations"
            ]
        })

        # Cost optimization recommendations
        recommendations.append({
            "category": "Cost Optimization",
            "priority": "HIGH",
            "items": [
                "Compress data before encryption (60-80% storage reduction)",
                "Implement deduplication for Filecoin uploads",
                "Use smaller LLM models for simple queries (mistral vs llama3.1)",
                "Batch embeddings generation to reduce compute costs",
                "Implement smart contract gas optimizations (batch operations)",
                "Add lifecycle policies to delete old sync data (90 days)"
            ]
        })

        # Monitoring recommendations
        recommendations.append({
            "category": "Monitoring & Profiling",
            "priority": "MEDIUM",
            "items": [
                "Enable Sentry performance monitoring (10% sample rate)",
                "Add Prometheus metrics for API latency",
                "Implement custom dashboards for cost tracking",
                "Add alerts for slow queries (>200ms)",
                "Profile slow endpoints with py-spy"
            ]
        })

        # Scalability recommendations
        recommendations.append({
            "category": "Scalability",
            "priority": "MEDIUM",
            "items": [
                "Design for horizontal scaling (stateless backend)",
                "Implement load balancing for multiple instances",
                "Use collection-per-business for Qdrant (easy sharding)",
                "Add rate limiting to prevent abuse",
                "Implement circuit breakers for external APIs"
            ]
        })

        return recommendations

    def run_full_analysis(self) -> Dict[str, Any]:
        """Run complete performance optimization analysis"""
        print_header("VARITY PERFORMANCE OPTIMIZATION ANALYSIS")
        print_info(f"Analyzing: {self.base_dir}")
        print_info(f"Timestamp: {self.results['timestamp']}")

        # Frontend Analysis
        print_header("PHASE 1: FRONTEND PERFORMANCE OPTIMIZATION")
        self.results["frontend"]["bundle_size"] = self.analyze_bundle_size()
        self.results["frontend"]["image_optimization"] = self.analyze_image_optimization()
        self.results["frontend"]["dependencies"] = self.analyze_dependencies()["frontend"]

        # Backend Analysis
        print_header("PHASE 2: BACKEND PERFORMANCE OPTIMIZATION")
        self.results["backend"]["api_endpoints"] = self.analyze_api_endpoints()
        self.results["backend"]["dependencies"] = self.analyze_dependencies()["backend"]

        # Database Analysis
        print_header("PHASE 2: DATABASE OPTIMIZATION")
        self.results["database"] = self.analyze_database_performance()

        # Cost Analysis
        print_header("PHASE 4: COST OPTIMIZATION")
        self.results["cost_analysis"] = self.cost_analysis()

        # Generate Recommendations
        print_header("FINAL RECOMMENDATIONS")
        recommendations = self.generate_recommendations()

        for rec in recommendations:
            print_section(f"{rec['category']} (Priority: {rec['priority']})")
            for item in rec["items"]:
                print_info(f"  • {item}")

        self.results["final_recommendations"] = recommendations

        # Save results
        output_file = self.base_dir / "optimization_results.json"
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        print_header("ANALYSIS COMPLETE")
        print_success(f"Results saved to: {output_file}")

        return self.results

def main():
    """Main entry point"""
    base_dir = os.getcwd()

    optimizer = PerformanceOptimizer(base_dir)
    results = optimizer.run_full_analysis()

    # Print summary
    print_header("EXECUTIVE SUMMARY")

    # Cost comparison
    if "cost_analysis" in results and "comparison" in results["cost_analysis"]:
        comparison = results["cost_analysis"]["comparison"]
        print_success(f"Cost Savings: ${comparison['savings_month']}/month ({comparison['savings_percentage']}%)")
        print_info(f"DePin: ${comparison['depin_total_month']}/month | GCP: ${comparison['gcp_total_month']}/month")

    # Total recommendations
    total_recs = len(results.get("recommendations", []))
    print_info(f"Total Optimization Opportunities: {total_recs}")

    print("\n")
    print_success("Performance optimization analysis complete!")
    print_info("Next steps:")
    print_info("  1. Review optimization_results.json for detailed analysis")
    print_info("  2. Implement high-priority recommendations first")
    print_info("  3. Run load testing to measure improvements")
    print_info("  4. Generate full report with PERFORMANCE_OPTIMIZATION_REPORT.md")

if __name__ == "__main__":
    main()
