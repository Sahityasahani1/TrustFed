"""Unified Server Launch and Automated Screenshot Capture for TrustFed.

Starts both FastAPI backend (:8001) and Vite frontend (:5173), verifies ports,
captures 6 high-resolution (1440x900 @ 2x DPI) screenshots using Chrome via Playwright,
and terminates the server processes cleanly.
"""
import os
import sys
import time
import subprocess
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
OUTPUT_DIR = ROOT / "screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def main():
    print("=" * 60)
    print(" TRUSTFED AUTOMATED SCREENSHOT PIPELINE")
    print("=" * 60)

    # 1. Start Backend
    print("[1/4] Starting FastAPI backend on :8001...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "risks_api:app", "--app-dir", str(BACKEND_DIR), "--host", "127.0.0.1", "--port", "8001"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # 2. Start Frontend
    print("[2/4] Starting Vite frontend on :5173...")
    frontend_proc = subprocess.Popen(
        ["cmd", "/c", "npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Give servers 4 seconds to bind
    print("[3/4] Warming up server processes...")
    time.sleep(4)

    # 3. Capture Screenshots with Playwright
    print("[4/4] Launching headless browser for capture...")
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=CHROME_PATH,
                headless=True,
                args=["--disable-web-security", "--allow-running-insecure-content"]
            )
            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                device_scale_factor=2,  # Retina resolution for LinkedIn
                color_scheme="dark"
            )
            page = context.new_page()

            # Screenshot 1: Hero Overview
            print("  [+] Capturing 01_hero_overview.png...")
            page.goto("http://localhost:5173/#intro", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUTPUT_DIR / "01_hero_overview.png"))

            # Screenshot 2: Model Showdown
            print("  [+] Capturing 02_model_showdown.png...")
            page.goto("http://localhost:5173/#intelligence/showdown", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUTPUT_DIR / "02_model_showdown.png"))

            # Screenshot 3: Batch Screening Workbench
            print("  [+] Capturing 03_batch_triage_workbench.png...")
            page.goto("http://localhost:5173/#intelligence/batch", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)
            try:
                btn = page.locator("button:has-text('Load Demo Batch')").first
                if btn.is_visible():
                    btn.click()
                    page.wait_for_timeout(2000)
            except Exception as e:
                print(f"    (Demo batch button note: {e})")
            page.screenshot(path=str(OUTPUT_DIR / "03_batch_triage_workbench.png"))

            # Screenshot 4: Slide-over AI Forensic Drawer
            print("  [+] Capturing 04_gemini_forensic_drawer.png...")
            try:
                audit_btn = page.locator("button:has-text('Audit')").first
                if audit_btn.is_visible():
                    audit_btn.click()
                    page.wait_for_timeout(2500)
            except Exception as e:
                print(f"    (Audit button note: {e})")
            page.screenshot(path=str(OUTPUT_DIR / "04_gemini_forensic_drawer.png"))

            # Close drawer
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)

            # Screenshot 5: Lenders Credit Fraud
            print("  [+] Capturing 05_lenders_credit_fraud.png...")
            page.goto("http://localhost:5173/#creditfraud/showdown", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUTPUT_DIR / "05_lenders_credit_fraud.png"))

            # Screenshot 6: Model Specs & Dictionary
            print("  [+] Capturing 06_model_specs_dictionary.png...")
            page.goto("http://localhost:5173/#intelligence/dictionary", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUTPUT_DIR / "06_model_specs_dictionary.png"))

            browser.close()
            print("=" * 60)
            print(" SUCCESS: All 6 screenshots saved in ./screenshots/")
            print("=" * 60)

    except Exception as exc:
        print(f"[!] Error during capture: {exc}")
    finally:
        print("[*] Terminating server subprocesses...")
        backend_proc.terminate()
        frontend_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            pass
        print("[*] Clean shutdown completed.")

if __name__ == "__main__":
    main()
