"""Generates 6 production-grade, 1200x675 (16:9) LinkedIn Presentation Cards.

Rendered in Deep Obsidian (#09090B) with Segoe UI and Consolas typography,
hairline borders, and semantic financial accents (Emerald, Crimson, Cyan).
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)

# Colors
BG_DARK = "#09090B"
CARD_BG = "#121215"
BORDER_COLOR = "#27272A"
TEXT_WHITE = "#FAFAFA"
TEXT_MUTED = "#A1A1AA"
TEXT_DIM = "#71717A"
ACCENT_EMERALD = "#10B981"
ACCENT_CRIMSON = "#F43F5E"
ACCENT_CYAN = "#06B6D4"
ACCENT_AMBER = "#F59E0B"

# Fonts
FONT_DIR = r"C:\Windows\Fonts"
try:
    font_title = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 38)
    font_subtitle = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 20)
    font_heading = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 22)
    font_body = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 16)
    font_mono_lg = ImageFont.truetype(os.path.join(FONT_DIR, "consola.ttf"), 32)
    font_mono_md = ImageFont.truetype(os.path.join(FONT_DIR, "consola.ttf"), 18)
    font_mono_sm = ImageFont.truetype(os.path.join(FONT_DIR, "consola.ttf"), 14)
except Exception:
    font_title = ImageFont.load_default()
    font_subtitle = font_heading = font_body = font_mono_lg = font_mono_md = font_mono_sm = font_title

def create_base_canvas(category_tag: str):
    img = Image.new("RGB", (1200, 675), color=BG_DARK)
    draw = ImageDraw.Draw(img)

    # Hairline outer border
    draw.rounded_rectangle([(24, 24), (1176, 651)], radius=16, outline=BORDER_COLOR, width=2)

    # Top brand bar
    draw.text((60, 50), "TRUSTFED", fill=TEXT_WHITE, font=font_mono_md)
    draw.text((155, 50), "•", fill=TEXT_DIM, font=font_mono_md)
    draw.text((175, 50), category_tag.upper(), fill=ACCENT_EMERALD, font=font_mono_md)

    # Right indicator
    draw.ellipse([(1080, 56), (1090, 66)], fill=ACCENT_EMERALD)
    draw.text((1100, 52), "SecAgg 3/3", fill=TEXT_MUTED, font=font_mono_sm)

    # Hairline divider
    draw.line([(60, 85), (1140, 85)], fill=BORDER_COLOR, width=1)

    # Footer
    draw.line([(60, 600), (1140, 600)], fill=BORDER_COLOR, width=1)
    draw.text((60, 615), "TrustFed Financial Intelligence • Rényi DP (ε=2.45, δ=1e-5) • Zero Plain-Text Egress", fill=TEXT_DIM, font=font_mono_sm)
    draw.text((980, 615), "github.com/TrustFed", fill=TEXT_MUTED, font=font_mono_sm)

    return img, draw

# -----------------------------------------------------------------------------
# CARD 1: PLATFORM ARCHITECTURE & OVERVIEW
# -----------------------------------------------------------------------------
def make_card_1():
    img, draw = create_base_canvas("Platform Architecture")

    # Main titles
    draw.text((60, 115), "Decentralized Financial Fraud Intelligence", fill=TEXT_WHITE, font=font_title)
    draw.text((60, 168), "Collaborative cross-institutional anomaly detection without pooling raw customer records.", fill=TEXT_MUTED, font=font_subtitle)

    # 3 Architecture Pillars (Cards)
    pillars = [
        ("01 • Multi-Party Consensus", "SecAgg+ 4-Phase Quorum", "Banks, Lenders, and Insurers compute local GBDT/XGBoost gradients. Aggregated through cryptographic Shamir secret sharing with zero plain-text data sharing.", ACCENT_EMERALD),
        ("02 • Sub-Millisecond Inference", "ONNX Runtime FP16", "Vectorized inference engine screening payment transactions at <0.45ms per row with 42,000+ rps throughput, fully in-memory.", ACCENT_CYAN),
        ("03 • Explainable Forensics", "TreeSHAP + Gemini 2.5", "Authoritative regulatory briefs streamed via Server-Sent Events (SSE) with TTFT < 300ms, mapping exact log-odds feature attribution drivers.", ACCENT_AMBER)
    ]

    card_w = 340
    card_h = 340
    start_y = 225

    for i, (tag, header, desc, accent) in enumerate(pillars):
        x = 60 + i * (card_w + 30)
        # Card background
        draw.rounded_rectangle([(x, start_y), (x + card_w, start_y + card_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
        # Accent top bar
        draw.rounded_rectangle([(x + 2, start_y + 2), (x + card_w - 2, start_y + 6)], radius=2, fill=accent)
        # Card content
        draw.text((x + 24, start_y + 28), tag, fill=accent, font=font_mono_sm)
        draw.text((x + 24, start_y + 60), header, fill=TEXT_WHITE, font=font_heading)

        # Word wrap description
        words = desc.split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 32:
                lines.append(" ".join(cur[:-1]))
                cur = [w]
        if cur:
            lines.append(" ".join(cur))

        for j, line in enumerate(lines[:6]):
            draw.text((x + 24, start_y + 115 + j * 26), line, fill=TEXT_MUTED, font=font_body)

    out = OUTPUT_DIR / "01_trustfed_architecture.png"
    img.save(str(out), "PNG")
    print(f"[OK] Generated: {out.name}")

# -----------------------------------------------------------------------------
# CARD 2: THE DESTINATION BLIND SPOT (MODEL SHOWDOWN)
# -----------------------------------------------------------------------------
def make_card_2():
    img, draw = create_base_canvas("Model Showdown")

    draw.text((60, 115), "Solving The Destination Blind Spot", fill=TEXT_WHITE, font=font_title)
    draw.text((60, 168), "Why siloed anti-fraud models fail against coordinated mule account rings.", fill=TEXT_MUTED, font=font_subtitle)

    # 2 Comparison Columns
    col_w = 515
    col_h = 300
    start_y = 225

    # Left Column: Isolated Silo
    draw.rounded_rectangle([(60, start_y), (60 + col_w, start_y + col_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
    draw.rounded_rectangle([(62, start_y + 2), (60 + col_w - 2, start_y + 6)], radius=2, fill=ACCENT_CRIMSON)
    draw.text((90, start_y + 25), "ISOLATED SILO MODEL (SINGLE BANK)", fill=ACCENT_CRIMSON, font=font_mono_sm)
    draw.text((90, start_y + 55), "Destination Blind Spot", fill=TEXT_WHITE, font=font_heading)
    draw.text((90, start_y + 95), "• Only observes origin account history", fill=TEXT_MUTED, font=font_body)
    draw.text((90, start_y + 125), "• Destination mule account balance unverified", fill=TEXT_MUTED, font=font_body)
    draw.text((90, start_y + 155), "• High false positive rate on legitimate transfers", fill=TEXT_MUTED, font=font_body)
    draw.text((90, start_y + 185), "• Fails against rapid 90-second mule cash-outs", fill=TEXT_MUTED, font=font_body)
    draw.rounded_rectangle([(90, start_y + 230), (90 + col_w - 60, start_y + 275)], radius=8, fill="#1F1315", outline=ACCENT_CRIMSON, width=1)
    draw.text((115, start_y + 246), "Verdict: High False Positives • Mule Drain Missed", fill=ACCENT_CRIMSON, font=font_mono_sm)

    # Right Column: TrustFed Consensus
    x2 = 625
    draw.rounded_rectangle([(x2, start_y), (x2 + col_w, start_y + col_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
    draw.rounded_rectangle([(x2 + 2, start_y + 2), (x2 + col_w - 2, start_y + 6)], radius=2, fill=ACCENT_EMERALD)
    draw.text((x2 + 30, start_y + 25), "TRUSTFED COLLABORATIVE QUORUM", fill=ACCENT_EMERALD, font=font_mono_sm)
    draw.text((x2 + 30, start_y + 55), "Federated Quorum Consensus", fill=TEXT_WHITE, font=font_heading)
    draw.text((x2 + 30, start_y + 95), "• SecAgg+ encrypted consensus across all silos", fill=TEXT_MUTED, font=font_body)
    draw.text((x2 + 30, start_y + 125), "• Joint feature distribution without PII transfer", fill=TEXT_MUTED, font=font_body)
    draw.text((x2 + 30, start_y + 155), "• Detects synthetic accounts & laundering rings", fill=TEXT_MUTED, font=font_body)
    draw.text((x2 + 30, start_y + 185), "• Zero raw transaction egress (Rényi DP ε=2.45)", fill=TEXT_MUTED, font=font_body)
    draw.rounded_rectangle([(x2 + 30, start_y + 230), (x2 + col_w - 30, start_y + 275)], radius=8, fill="#0D1E16", outline=ACCENT_EMERALD, width=1)
    draw.text((x2 + 55, start_y + 246), "Verdict: +185.3% PR-AUC Lift • Verified Quorum", fill=ACCENT_EMERALD, font=font_mono_sm)

    # Highlight Ribbon
    draw.rounded_rectangle([(60, 545), (1140, 585)], radius=8, fill="#121215", outline=BORDER_COLOR, width=1)
    draw.text((80, 555), "COLLABORATIVE CONSENSUS: +185.3% PR-AUC LIFT  |  -64.2% FALSE DECLINES  |  0 RAW DATA EGRESS", fill=TEXT_WHITE, font=font_mono_sm)

    out = OUTPUT_DIR / "02_the_destination_blind_spot.png"
    img.save(str(out), "PNG")
    print(f"[OK] Generated: {out.name}")

# -----------------------------------------------------------------------------
# CARD 3: SUB-MILLISECOND VECTORIZED INFERENCE
# -----------------------------------------------------------------------------
def make_card_3():
    img, draw = create_base_canvas("Inference Engine")

    draw.text((60, 115), "Sub-Millisecond Vectorized Inference", fill=TEXT_WHITE, font=font_title)
    draw.text((60, 168), "ONNX Runtime FP16 engine tailored for high-frequency payment rails.", fill=TEXT_MUTED, font=font_subtitle)

    # 4 Big Metric Cards
    metrics = [
        ("< 0.45 ms", "P50 INFERENCE SLA", "Microsecond vectorized tensor execution per transaction row.", ACCENT_EMERALD),
        ("2.15 ms", "P95 TAIL LATENCY", "Strict boundary guarantee under heavy concurrent batch load.", ACCENT_CYAN),
        ("42,000+", "THROUGHPUT (RPS)", "In-memory tensor batch evaluation on commodity x86 server.", ACCENT_EMERALD),
        ("< 85 MB", "PROCESS MEMORY (RSS)", "Lean FP16 memory quantization with zero disk serialization.", ACCENT_AMBER),
    ]

    card_w = 250
    card_h = 240
    start_y = 225

    for i, (stat, label, desc, color) in enumerate(metrics):
        x = 60 + i * (card_w + 30)
        draw.rounded_rectangle([(x, start_y), (x + card_w, start_y + card_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
        draw.text((x + 20, start_y + 25), label, fill=TEXT_DIM, font=font_mono_sm)
        draw.text((x + 20, start_y + 60), stat, fill=color, font=font_mono_lg)

        words = desc.split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 24:
                lines.append(" ".join(cur[:-1]))
                cur = [w]
        if cur:
            lines.append(" ".join(cur))

        for j, line in enumerate(lines[:4]):
            draw.text((x + 20, start_y + 130 + j * 24), line, fill=TEXT_MUTED, font=font_body)

    # Bottom Banner
    draw.rounded_rectangle([(60, 500), (1140, 570)], radius=10, fill=CARD_BG, outline=BORDER_COLOR, width=1)
    draw.text((80, 515), "VECTORIZED ONNX PIPELINE", fill=ACCENT_CYAN, font=font_mono_sm)
    draw.text((80, 538), "Native C++ ONNX Runtime runtime bindings • SSE / AVX-512 tensor SIMD vectorization • Zero Python GIL stalls", fill=TEXT_WHITE, font=font_body)

    out = OUTPUT_DIR / "03_submillisecond_vectorized_inference.png"
    img.save(str(out), "PNG")
    print(f"[OK] Generated: {out.name}")

# -----------------------------------------------------------------------------
# CARD 4: EXPLAINABLE FORENSICS (TREESHAP + GEMINI)
# -----------------------------------------------------------------------------
def make_card_4():
    img, draw = create_base_canvas("Explainable AI & Forensics")

    draw.text((60, 115), "TreeSHAP Attributions + Google Gemini 2.5", fill=TEXT_WHITE, font=font_title)
    draw.text((60, 168), "Authoritative regulatory briefs generated with real-time mathematical feature importance.", fill=TEXT_MUTED, font=font_subtitle)

    start_y = 225

    # Left Box: TreeSHAP Feature Drivers
    col_w = 515
    col_h = 330
    draw.rounded_rectangle([(60, start_y), (60 + col_w, start_y + col_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
    draw.text((85, start_y + 25), "LOCAL MATHEMATICAL ATTRIBUTION (TREESHAP)", fill=ACCENT_EMERALD, font=font_mono_sm)
    draw.text((85, start_y + 55), "Exact Log-Odds Contribution Drivers", fill=TEXT_WHITE, font=font_heading)

    drivers = [
        ("newbalanceOrig == 0.0", "+0.42 log-odds", "Complete sender balance depletion", ACCENT_CRIMSON),
        ("amount > 10,000 TRANSFER", "+0.38 log-odds", "Exceeds daily baseline velocity", ACCENT_CRIMSON),
        ("oldbalanceDest == 0.0", "+0.29 log-odds", "Uninitialized recipient account", ACCENT_CRIMSON),
        ("step == 142 (Day 6, Hour 22)", "-0.11 log-odds", "Standard operating hour window", ACCENT_EMERALD),
    ]

    for k, (feat, impact, note, clr) in enumerate(drivers):
        y = start_y + 105 + k * 52
        draw.rounded_rectangle([(85, y), (85 + col_w - 50, y + 42)], radius=6, fill="#18181B", outline=BORDER_COLOR, width=1)
        draw.text((100, y + 12), feat, fill=TEXT_WHITE, font=font_mono_sm)
        draw.text((360, y + 12), impact, fill=clr, font=font_mono_sm)
        draw.text((100, y + 26), note, fill=TEXT_DIM, font=font_mono_sm)

    # Right Box: Gemini Forensic Intelligence Brief
    x2 = 625
    draw.rounded_rectangle([(x2, start_y), (x2 + col_w, start_y + col_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
    draw.text((x2 + 25, start_y + 25), "GOOGLE GEMINI 2.5 FLASH SSE STREAMING", fill=ACCENT_CYAN, font=font_mono_sm)
    draw.text((x2 + 25, start_y + 55), "Real-Time Regulatory Audit Rationale", fill=TEXT_WHITE, font=font_heading)

    brief_lines = [
        "\"The transaction exhibits high-confidence characteristics of an",
        "account drain attack. The sender completely emptied their available",
        "balance ($250,000) to an uninitialized recipient account (dest balance $0),",
        "yielding a 71.5% fraud probability.",
        "",
        "TreeSHAP attributes 58% of anomalous risk to origin drain velocity.",
        "Under FinCEN AML and NIST AI RMF guidelines, immediate quarantine is",
        "recommended pending multi-party consensus verification.\""
    ]

    for k, line in enumerate(brief_lines):
        if line:
            draw.text((x2 + 25, start_y + 110 + k * 22), line, fill=TEXT_MUTED, font=font_body)

    draw.rounded_rectangle([(x2 + 25, start_y + 270), (x2 + col_w - 25, start_y + 305)], radius=6, fill="#0B1A24", outline=ACCENT_CYAN, width=1)
    draw.text((x2 + 40, start_y + 280), "TTFT < 300ms • SSE Token Stream • Resilient Circuit Breaker", fill=ACCENT_CYAN, font=font_mono_sm)

    out = OUTPUT_DIR / "04_explainable_ai_and_gemini.png"
    img.save(str(out), "PNG")
    print(f"[OK] Generated: {out.name}")

# -----------------------------------------------------------------------------
# CARD 5: PRODUCTION ZERO-TRUST SECURITY
# -----------------------------------------------------------------------------
def make_card_5():
    img, draw = create_base_canvas("Security & Production Standard")

    draw.text((60, 115), "Production Zero-Trust Security Standard", fill=TEXT_WHITE, font=font_title)
    draw.text((60, 168), "Hardened across 8 systematic phases with 35 passing tests and GitHub Actions CI.", fill=TEXT_MUTED, font=font_subtitle)

    items = [
        ("HMAC & JWT Authentication", "Timing-safe SHA-256 key hashing & HS256 PyJWT tokens with strict role hierarchy (admin > operator > auditor)."),
        ("Strict Input Safety & Caps", "Pydantic V2 domain validation schemas, 10MB streaming file cap, 1,000 max batch rows, path traversal guard."),
        ("Rate Limiting & Shield", "Sliding window token bucket (auth=10/min, ai=15/min), Gemini circuit breaker, and LRU explanation cache."),
        ("Concurrency & Crash Safety", "threading.RLock() on multi-party coordinator state with crash-resilient atomic file writes (tempfile + os.replace)."),
        ("PII Data Sanitization", "Recursive redaction of SSNs, PAN cards, phone numbers, and identities before disk persistence or logging."),
        ("Observability & Probes", "X-Request-ID distributed tracing, zero 500 stack trace leaks, deep /health diagnostics, and K8s /health/live probes."),
    ]

    start_y = 225
    card_w = 515
    card_h = 105

    for i, (title, desc) in enumerate(items):
        col = i % 2
        row = i // 2
        x = 60 if col == 0 else 625
        y = start_y + row * 118

        draw.rounded_rectangle([(x, y), (x + card_w, y + card_h)], radius=10, fill=CARD_BG, outline=BORDER_COLOR, width=1)

        # Draw crisp green dot indicator
        draw.ellipse([(x + 22, y + 20), (x + 32, y + 30)], fill=ACCENT_EMERALD)
        draw.text((x + 42, y + 14), title, fill=TEXT_WHITE, font=font_heading)

        words = desc.split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 46:
                lines.append(" ".join(cur[:-1]))
                cur = [w]
        if cur:
            lines.append(" ".join(cur))

        for j, line in enumerate(lines[:3]):
            draw.text((x + 42, y + 44 + j * 18), line, fill=TEXT_MUTED, font=font_mono_sm)

    out = OUTPUT_DIR / "05_production_zero_trust_security.png"
    img.save(str(out), "PNG")
    print(f"[OK] Generated: {out.name}")

# -----------------------------------------------------------------------------
# CARD 6: MULTI-DOMAIN FINANCIAL INTELLIGENCE
# -----------------------------------------------------------------------------
def make_card_6():
    img, draw = create_base_canvas("Multi-Domain Coverage")

    draw.text((60, 115), "Cross-Sector Collaborative Detection", fill=TEXT_WHITE, font=font_title)
    draw.text((60, 168), "Unified federated defense across banking, digital lending, and insurance claims.", fill=TEXT_MUTED, font=font_subtitle)

    domains = [
        ("BANKS & WALLETS", "PaySim Mobile Money", "Trained on millions of mobile wallet transactions. Detects rapid account drains, mule networks, and layered synthetic cash-outs.", "LightGBM / GBDT", "SLA: 0.42ms", ACCENT_EMERALD),
        ("DIGITAL LENDERS", "Home Credit Default Risk", "Screened across 307,511 loan files. Platt-calibrated cutoff scoring to detect synthetic identity manipulation and default risk.", "XGBoost Classifier", "307k Cohort", ACCENT_CYAN),
        ("INSURANCE SIU", "Claims Fraud Detection", "Screened across 1,000,000 policy records across 20 synthetic carriers. Flags delayed injury claims and property anomalies.", "GBDT Classifier", "1M Policies", ACCENT_AMBER),
    ]

    start_y = 225
    card_w = 340
    card_h = 340

    for i, (tag, name, desc, model, metric, accent) in enumerate(domains):
        x = 60 + i * (card_w + 30)
        draw.rounded_rectangle([(x, start_y), (x + card_w, start_y + card_h)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=1)
        draw.rounded_rectangle([(x + 2, start_y + 2), (x + card_w - 2, start_y + 6)], radius=2, fill=accent)
        draw.text((x + 24, start_y + 25), tag, fill=accent, font=font_mono_sm)
        draw.text((x + 24, start_y + 55), name, fill=TEXT_WHITE, font=font_heading)

        words = desc.split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 30:
                lines.append(" ".join(cur[:-1]))
                cur = [w]
        if cur:
            lines.append(" ".join(cur))

        for j, line in enumerate(lines[:5]):
            draw.text((x + 24, start_y + 110 + j * 24), line, fill=TEXT_MUTED, font=font_body)

        draw.rounded_rectangle([(x + 20, start_y + 250), (x + card_w - 20, start_y + 300)], radius=6, fill="#18181B", outline=BORDER_COLOR, width=1)
        draw.text((x + 32, start_y + 265), f"Model: {model}", fill=TEXT_WHITE, font=font_mono_sm)
        draw.text((x + 32, start_y + 280), f"Status: {metric} • Active", fill=accent, font=font_mono_sm)

    out = OUTPUT_DIR / "06_multi_domain_intelligence.png"
    img.save(str(out), "PNG")
    print(f"[OK] Generated: {out.name}")

if __name__ == "__main__":
    print("[*] Generating all 6 LinkedIn presentation cards...")
    make_card_1()
    make_card_2()
    make_card_3()
    make_card_4()
    make_card_5()
    make_card_6()
    print("[+] All 6 cards generated in screenshots/!")
