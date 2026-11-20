"""Automated High-Resolution Screenshot Capture for TrustFed LinkedIn Post.

Uses Playwright with local Chrome to capture 6 ultra-crisp (1920x1080 @ 2x DPI) screenshots:
1. 01_hero_overview.png - Landing page with 3D topology & floating HUD
2. 02_model_showdown.png - Isolated Silo vs Federated Quorum comparison
3. 03_batch_triage_workbench.png - High-density financial batch triage ledger (40 rows)
4. 04_gemini_forensic_drawer.png - Slide-over AI forensic audit with TreeSHAP drivers
5. 05_lenders_credit_fraud.png - Digital lenders (Home Credit default risk)
6. 06_model_specs_dictionary.png - Model specifications & feature dictionary
"""
import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def capture_all():
    print(f"[*] Starting screenshot capture pipeline...")
    print(f"[*] Output directory: {OUTPUT_DIR}")
    print(f"[*] Browser executable: {CHROME_PATH}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=["--disable-web-security", "--allow-running-insecure-content"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,  # 2x Retina rendering for crisp LinkedIn graphics
            color_scheme="dark"
        )
        page = context.new_page()

        # 1. Hero Overview
        print("[1/6] Capturing 01_hero_overview.png...")
        page.goto("http://localhost:5173/#intro", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=str(OUTPUT_DIR / "01_hero_overview.png"), full_page=False)

        # 2. Single Sandbox & Model Showdown
        print("[2/6] Capturing 02_model_showdown.png...")
        page.goto("http://localhost:5173/#intelligence/showdown", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=str(OUTPUT_DIR / "02_model_showdown.png"), full_page=False)

        # 3. Batch Screening Workbench
        print("[3/6] Capturing 03_batch_triage_workbench.png...")
        page.goto("http://localhost:5173/#intelligence/batch", wait_until="networkidle")
        page.wait_for_timeout(1500)
        # Click "Load Demo Batch (40)" if visible
        try:
            demo_btn = page.locator("button:has-text('Load Demo Batch')").first
            if demo_btn.is_visible():
                demo_btn.click()
                page.wait_for_timeout(2500)
        except Exception as e:
            print(f"  Note: Demo button click: {e}")
        page.screenshot(path=str(OUTPUT_DIR / "03_batch_triage_workbench.png"), full_page=False)

        # 4. Slide-over AI Forensic Drawer
        print("[4/6] Capturing 04_gemini_forensic_drawer.png...")
        try:
            audit_btn = page.locator("button:has-text('Audit')").first
            if audit_btn.is_visible():
                audit_btn.click()
                page.wait_for_timeout(2500)
        except Exception as e:
            print(f"  Note: Audit button click: {e}")
        page.screenshot(path=str(OUTPUT_DIR / "04_gemini_forensic_drawer.png"), full_page=False)

        # Close drawer if open
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # 5. Lenders Credit Fraud
        print("[5/6] Capturing 05_lenders_credit_fraud.png...")
        page.goto("http://localhost:5173/#creditfraud/showdown", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=str(OUTPUT_DIR / "05_lenders_credit_fraud.png"), full_page=False)

        # 6. Model Specs & Dictionary
        print("[6/6] Capturing 06_model_specs_dictionary.png...")
        page.goto("http://localhost:5173/#intelligence/dictionary", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=str(OUTPUT_DIR / "06_model_specs_dictionary.png"), full_page=False)

        browser.close()
        print("[+] All 6 screenshots successfully captured and saved to screenshots/!")

if __name__ == "__main__":
    capture_all()
