import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette Definitions
    C_NAVY_DARK = RGBColor(15, 23, 42)       # #0F172A
    C_NAVY_LIGHT = RGBColor(30, 41, 59)      # #1E293B
    C_WHITE = RGBColor(255, 255, 255)
    C_BG_LIGHT = RGBColor(248, 250, 252)     # #F8FAFC
    C_CARD_BG = RGBColor(255, 255, 255)
    C_CARD_BORDER = RGBColor(226, 232, 240)  # #E2E8F0
    C_ORANGE = RGBColor(249, 115, 22)        # #F97316
    C_AMBER = RGBColor(217, 119, 6)          # #D97706
    C_BLUE = RGBColor(14, 165, 233)          # #0EA5E9
    C_DARK_BLUE = RGBColor(3, 105, 161)      # #0369A1
    C_GREEN = RGBColor(22, 163, 74)          # #16A34A
    C_GREEN_BG = RGBColor(220, 252, 231)     # #DCFCE7
    C_TEXT_DARK = RGBColor(15, 23, 42)
    C_TEXT_MUTED = RGBColor(100, 116, 139)   # #64748B
    C_TEXT_LIGHT = RGBColor(241, 245, 249)

    blank_layout = prs.slide_layouts[6]

    def add_bg(slide, dark=False):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_NAVY_DARK if dark else C_BG_LIGHT
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text, dark=False):
        # Top category pill / breadcrumb
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.7), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_right = tf_cat.margin_top = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.name = "Segoe UI"
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = C_ORANGE if dark else C_DARK_BLUE

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.6))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.name = "Segoe UI"
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = C_WHITE if dark else C_NAVY_DARK

        # Accent underline
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.38), Inches(2.2), Inches(0.04))
        line.fill.solid()
        line.fill.fore_color.rgb = C_ORANGE
        line.line.fill.background()

    def add_card(slide, left, top, width, height, bg_color=C_CARD_BG, border_color=C_CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        return card

    # ==========================================
    # SLIDE 1: Title Slide (Dark, Academic/Tech)
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    add_bg(s1, dark=True)

    # Accent top border
    accent_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.12))
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = C_ORANGE
    accent_bar.line.fill.background()

    # Subject badge
    badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(1.0), Inches(4.5), Inches(0.42))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(30, 41, 59)
    badge.line.color.rgb = C_ORANGE
    badge.line.width = Pt(1)
    tf_b = badge.text_frame
    tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_b = tf_b.paragraphs[0]
    p_b.text = "SOFTWARE TESTING & QUALITY ASSURANCE"
    p_b.alignment = PP_ALIGN.CENTER
    p_b.font.name = "Segoe UI"
    p_b.font.size = Pt(11)
    p_b.font.bold = True
    p_b.font.color.rgb = C_ORANGE

    # Main Project Title
    tbox = s1.shapes.add_textbox(Inches(0.9), Inches(1.6), Inches(11.5), Inches(1.8))
    tf1 = tbox.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "ApnaWallet"
    p1.font.name = "Segoe UI"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = C_WHITE

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "Comprehensive STQA Case Study: Engineering Financial Integrity Through Systematic Verification"
    p1_sub.font.name = "Segoe UI"
    p1_sub.font.size = Pt(18)
    p1_sub.font.color.rgb = RGBColor(203, 213, 225)
    p1_sub.space_before = Pt(8)

    # Info Cards Container (Team Members + Tech Details)
    # Team Members Card
    add_card(s1, Inches(0.9), Inches(3.7), Inches(6.0), Inches(3.0), bg_color=C_NAVY_LIGHT, border_color=RGBColor(51, 65, 85))
    tm_box = s1.shapes.add_textbox(Inches(1.2), Inches(3.9), Inches(5.4), Inches(2.6))
    tf_tm = tm_box.text_frame
    p_tm_h = tf_tm.paragraphs[0]
    p_tm_h.text = "PROJECT TEAM (INVESTIGATORS)"
    p_tm_h.font.name = "Segoe UI"
    p_tm_h.font.size = Pt(12)
    p_tm_h.font.bold = True
    p_tm_h.font.color.rgb = C_ORANGE

    team_members = [
        "1.  Vishal Keshav Balaji",
        "2.  Yogesh S",
        "3.  Yuvaaraja N",
        "4.  Sujay B S"
    ]
    for mem in team_members:
        p_m = tf_tm.add_paragraph()
        p_m.text = mem
        p_m.font.name = "Segoe UI"
        p_m.font.size = Pt(15)
        p_m.font.bold = True
        p_m.font.color.rgb = C_WHITE
        p_m.space_before = Pt(8)

    # Project Context Card
    add_card(s1, Inches(7.2), Inches(3.7), Inches(5.2), Inches(3.0), bg_color=C_NAVY_LIGHT, border_color=RGBColor(51, 65, 85))
    ctx_box = s1.shapes.add_textbox(Inches(7.5), Inches(3.9), Inches(4.6), Inches(2.6))
    tf_ctx = ctx_box.text_frame
    p_ctx_h = tf_ctx.paragraphs[0]
    p_ctx_h.text = "ACADEMIC & TECHNICAL SCOPE"
    p_ctx_h.font.name = "Segoe UI"
    p_ctx_h.font.size = Pt(12)
    p_ctx_h.font.bold = True
    p_ctx_h.font.color.rgb = C_BLUE

    scope_items = [
        ("Discipline", "Software Testing and Quality Assurance (STQA)"),
        ("Application", "Multi-tenant Personal Finance & Ledger System"),
        ("Test Suite", "92 Automated Test Cases (Unit, Integration & Security)"),
        ("Architecture", "Django REST Framework 5.x + React 18 + Neon PostgreSQL")
    ]
    for title, val in scope_items:
        p_s = tf_ctx.add_paragraph()
        p_s.text = f"•  {title}: {val}"
        p_s.font.name = "Segoe UI"
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = RGBColor(226, 232, 240)
        p_s.space_before = Pt(8)

    # Speaker Notes Slide 1
    s1.notes_slide.notes_text_frame.text = (
        "Good morning/afternoon respected professor and evaluators. Today, our team—Vishal Keshav Balaji, "
        "Yogesh S, Yuvaaraja N, and Sujay B S—presents our project for Software Testing and Quality Assurance. "
        "Rather than delivering a generic product demonstration, our primary focus today is on how software testing, "
        "formal verification, and quality assurance principles were rigorously engineered into our personal finance "
        "application, ApnaWallet. We will demonstrate how unit, integration, boundary, and concurrency testing "
        "ensure financial ledger integrity and defect prevention across the entire development lifecycle."
    )

    # ==========================================
    # SLIDE 2: Project Overview & Test Context
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_bg(s2, dark=False)
    add_header(s2, "Project Overview & Financial Testing Context", "STQA Case Study Context")

    # 3 Column Cards
    col_w = Inches(3.68)
    h_top = Inches(1.65)
    card_h = Inches(5.3)

    # Col 1: Problem Statement & Domain
    add_card(s2, Inches(0.8), h_top, col_w, card_h)
    box1 = s2.shapes.add_textbox(Inches(1.0), h_top + Inches(0.2), col_w - Inches(0.4), card_h - Inches(0.4))
    tf2_1 = box1.text_frame
    tf2_1.word_wrap = True
    p = tf2_1.paragraphs[0]
    p.text = "Financial Ledger Domain"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_DARK_BLUE

    bullets_1 = [
        "Domain Complexity: Personal accounting requires strict dual-account balance integrity (Cash vs Bank).",
        "Critical Failure Modes: Floating point precision rounding errors, race conditions in double-spending, and silent balance desynchronization.",
        "Regulatory & User Trust: Even a one-cent (₹0.01) discrepancy invalidates user trust and financial records.",
        "Zero-Fault Requirement: Arithmetic operations must be strictly deterministic across all ledger transactions."
    ]
    for b in bullets_1:
        p = tf2_1.add_paragraph()
        p.text = "• " + b
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(12)

    # Col 2: ApnaWallet Solution Architecture
    add_card(s2, Inches(4.82), h_top, col_w, card_h)
    box2 = s2.shapes.add_textbox(Inches(5.02), h_top + Inches(0.2), col_w - Inches(0.4), card_h - Inches(0.4))
    tf2_2 = box2.text_frame
    tf2_2.word_wrap = True
    p = tf2_2.paragraphs[0]
    p.text = "Application Architecture"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ORANGE

    bullets_2 = [
        "Frontend Tier: React 18, Vite, Tailwind CSS with dynamic client-side input validations and step constraints.",
        "API Backend: Django 5.x REST Framework managing atomic state transitions and row-level locking.",
        "Persistent Store: Neon PostgreSQL (serverless cloud database with connection pooling and ACID compliance).",
        "Auxiliary Services: Brevo SMTP email pipeline for asynchronous transactional alerts.",
        "Security Barrier: Session authentication, CSRF cookie token protection, and strict tenant isolation."
    ]
    for b in bullets_2:
        p = tf2_2.add_paragraph()
        p.text = "• " + b
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(10)

    # Col 3: Testing Objectives
    add_card(s2, Inches(8.84), h_top, col_w, card_h)
    box3 = s2.shapes.add_textbox(Inches(9.04), h_top + Inches(0.2), col_w - Inches(0.4), card_h - Inches(0.4))
    tf2_3 = box3.text_frame
    tf2_3.word_wrap = True
    p = tf2_3.paragraphs[0]
    p.text = "STQA Objectives"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_GREEN

    bullets_3 = [
        "Mathematical Verification: Verify exact 2-decimal arithmetic using Python Decimal type.",
        "Concurrency Assurance: Ensure simultaneous ledger mutations execute atomically without race conditions.",
        "Data Isolation: Verify strict horizontal privilege boundaries so User A cannot read or mutate User B's accounts.",
        "Resilience & Sanitization: Defend against CSV injection, malicious date overflow, and database pooling timeouts."
    ]
    for b in bullets_3:
        p = tf2_3.add_paragraph()
        p.text = "• " + b
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(12)

    # Speaker Notes Slide 2
    s2.notes_slide.notes_text_frame.text = (
        "In Slide 2, we introduce the application domain and explain why ApnaWallet is an ideal subject for "
        "software testing. In financial software, testing is not an afterthought; software defects directly cause monetary "
        "discrepancies. A single floating-point inaccuracy or unhandled concurrent debit can corrupt a ledger. "
        "Our architecture decouples a high-speed React 18 frontend from a Django REST Framework backend backed by "
        "PostgreSQL. Our STQA objectives were straightforward: enforce exact two-decimal precision, verify atomic "
        "transaction boundaries, guarantee absolute multi-tenant data isolation, and sanitize all input vectors."
    )

    # ==========================================
    # SLIDE 3: SDLC and Testing Approach
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_bg(s3, dark=False)
    add_header(s3, "Software Development Life Cycle & QA Integration", "SDLC & Quality Strategy")

    # Top Flow: 4 Phase Cards
    phases = [
        ("Phase 1: Requirements & Model", "Define financial schemas, balance invariants, and ACID transaction rules."),
        ("Phase 2: Shift-Left Unit Tests", "Author test cases in parallel with business logic before frontend integration."),
        ("Phase 3: Integration & APIs", "Test full HTTP request-response cycles, serializers, and permission scopes."),
        ("Phase 4: Regression & Release", "Execute comprehensive 92-test suite before deployment to prevent regressions.")
    ]
    box_w = Inches(2.7)
    for i, (p_title, p_desc) in enumerate(phases):
        x = Inches(0.8) + i * Inches(2.98)
        card = add_card(s3, x, Inches(1.65), box_w, Inches(1.8), bg_color=C_CARD_BG, border_color=C_CARD_BORDER)
        # Accent top bar for card
        top_accent = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(1.65), box_w, Inches(0.08))
        top_accent.fill.solid()
        top_accent.fill.fore_color.rgb = C_ORANGE if i % 2 == 1 else C_BLUE
        top_accent.line.fill.background()

        tb = s3.shapes.add_textbox(x + Inches(0.15), Inches(1.8), box_w - Inches(0.3), Inches(1.5))
        tf_p = tb.text_frame
        tf_p.word_wrap = True
        p_t = tf_p.paragraphs[0]
        p_t.text = p_title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = C_NAVY_DARK

        p_d = tf_p.add_paragraph()
        p_d.text = p_desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = C_TEXT_MUTED
        p_d.space_before = Pt(6)

    # Bottom Split: Agile Milestones & Shift-Left QA Strategy
    add_card(s3, Inches(0.8), Inches(3.7), Inches(5.7), Inches(3.2))
    b_l = s3.shapes.add_textbox(Inches(1.0), Inches(3.85), Inches(5.3), Inches(2.9))
    tf_bl = b_l.text_frame
    tf_bl.word_wrap = True
    p = tf_bl.paragraphs[0]
    p.text = "Agile Iterative Delivery (Milestones 01–12)"
    p.font.name = "Segoe UI"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_DARK_BLUE

    sdlc_points = [
        "Iterative Milestones: Features evolved through 12 progressive milestones (Auth -> Ledger -> Lending -> Credit -> Savings/Investments -> Reports).",
        "Test-Driven Evolution: Each milestone appended dedicated automated test classes to 'backend/core/tests.py'.",
        "Continuous Quality Verification: Every code change executed 'manage.py check' and migration verification to avoid broken database schemas."
    ]
    for pt in sdlc_points:
        p = tf_bl.add_paragraph()
        p.text = "• " + pt
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)

    add_card(s3, Inches(6.8), Inches(3.7), Inches(5.7), Inches(3.2))
    b_r = s3.shapes.add_textbox(Inches(7.0), Inches(3.85), Inches(5.3), Inches(2.9))
    tf_br = b_r.text_frame
    tf_br.word_wrap = True
    p = tf_br.paragraphs[0]
    p.text = "The 'Shift-Left' Testing Paradigm"
    p.font.name = "Segoe UI"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_ORANGE

    shift_points = [
        "Early Defect Detection: Testing began at the data model layer with balance invariants before UI views were even mounted.",
        "Defect Cost Reduction: Catching insufficient fund validation errors at the serializer stage avoided expensive runtime rollbacks.",
        "Regression Protection: Running 92 tests after every UI update ensured that mobile layout adjustments never broke underlying API contracts."
    ]
    for pt in shift_points:
        p = tf_br.add_paragraph()
        p.text = "• " + pt
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)

    # Speaker Notes Slide 3
    s3.notes_slide.notes_text_frame.text = (
        "Slide 3 outlines our Software Development Life Cycle and Quality Assurance integration. We adopted "
        "an Agile iterative methodology spanning Milestones 01 through 12. Crucially, we implemented the 'Shift-Left' "
        "testing paradigm: instead of waiting for full frontend builds to begin testing, tests were written concurrently "
        "with our core financial models. When we implemented lending and debt repayment in Milestones 04 and 05, we wrote "
        "27 automated tests checking balance deductions and edge cases immediately. This drastically lowered defect remediation "
        "costs and ensured uninterrupted stability as savings, investments, and reporting were subsequently integrated."
    )

    # ==========================================
    # SLIDE 4: Types and Levels of Testing
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_bg(s4, dark=False)
    add_header(s4, "Testing Hierarchy: Types and Levels of Testing", "Test Architecture")

    # 4 Tier Horizontal Hierarchy Cards
    tiers = [
        ("Level 1: Unit Testing", "Lowest Level / Highest Isolation",
         "Tests atomic functions in isolation: decimal rounding, net worth calculation, date string normalization, and budget threshold percentage logic.", C_BLUE),
        ("Level 2: Integration Testing", "Component Interconnection",
         "Verifies multi-table transactions: e.g., deducting CASH balance, creating a Lending record, and updating user net balance in a single atomic database commit.", C_ORANGE),
        ("Level 3: System Testing", "End-to-End Ledger Workflows",
         "Evaluates complete user journeys: Authentication -> Cash deposit -> Bank transfer -> Recurring expense firing -> Monthly analytics PDF export.", C_DARK_BLUE),
        ("Level 4: Non-Functional Testing", "Security, Reliability & Performance",
         "Assesses SQL row locking (select_for_update), CSRF token enforcement, cross-user privacy boundaries, and database query optimizations.", C_GREEN)
    ]

    tier_w = Inches(11.7)
    tier_h = Inches(1.15)
    for i, (t_name, t_sub, t_desc, color) in enumerate(tiers):
        y = Inches(1.65) + i * Inches(1.35)
        add_card(s4, Inches(0.8), y, tier_w, tier_h)

        # Left color strip
        strip = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y, Inches(0.2), tier_h)
        strip.fill.solid()
        strip.fill.fore_color.rgb = color
        strip.line.fill.background()

        # Text inside
        tb = s4.shapes.add_textbox(Inches(1.2), y + Inches(0.12), Inches(11.1), tier_h - Inches(0.24))
        tf_t = tb.text_frame
        tf_t.word_wrap = True
        p_head = tf_t.paragraphs[0]
        p_head.text = f"{t_name}   |   "
        p_head.font.name = "Segoe UI"
        p_head.font.size = Pt(14)
        p_head.font.bold = True
        p_head.font.color.rgb = C_NAVY_DARK

        run_sub = p_head.add_run()
        run_sub.text = t_sub.upper()
        run_sub.font.size = Pt(11)
        run_sub.font.bold = True
        run_sub.font.color.rgb = color

        p_desc_txt = tf_t.add_paragraph()
        p_desc_txt.text = t_desc
        p_desc_txt.font.name = "Segoe UI"
        p_desc_txt.font.size = Pt(11.5)
        p_desc_txt.font.color.rgb = C_TEXT_MUTED
        p_desc_txt.space_before = Pt(4)

    # Speaker Notes Slide 4
    s4.notes_slide.notes_text_frame.text = (
        "In Slide 4, we examine our testing hierarchy across both types and levels of testing. At the foundation "
        "is Unit Testing, testing pure functions like decimal formatting, sanitized date inputs, and balance sums in isolation. "
        "Above that, Integration Testing verifies DRF endpoints and atomic database transactions where multiple models "
        "are coordinated simultaneously. Level 3 System Testing validates end-to-end user journeys, such as borrowing funds, "
        "making partial repayments, and generating monthly analytics reports. Finally, Non-Functional Testing addresses "
        "essential architectural attributes: preventing race conditions via database locks, securing sessions against CSRF "
        "attacks, and verifying strict multi-tenant authorization."
    )

    # ==========================================
    # SLIDE 5: Test Cases and Validation (Empirical Evidence)
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_bg(s5, dark=False)
    add_header(s5, "Practical Test Scenarios & Empirical Validation", "Test Execution Evidence")

    # Table of Actual Executed Tests
    t_left = Inches(0.8)
    t_top = Inches(1.6)
    t_width = Inches(11.7)
    t_height = Inches(5.1)

    table_shape = s5.shapes.add_table(7, 5, t_left, t_top, t_width, t_height)
    tbl = table_shape.table

    # Set column widths
    tbl.columns[0].width = Inches(1.3)   # Test ID
    tbl.columns[1].width = Inches(2.2)   # Module & Category
    tbl.columns[2].width = Inches(3.6)   # Test Scenario & Input
    tbl.columns[3].width = Inches(3.4)   # Expected Result & Assertion
    tbl.columns[4].width = Inches(1.2)   # Status

    headers = ["Test ID", "Module & Scope", "Test Scenario & Input", "Expected Verification Result", "Status"]
    for col_idx, text in enumerate(headers):
        cell = tbl.cell(0, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_NAVY_DARK
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = text
        p.alignment = PP_ALIGN.CENTER
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = C_WHITE

    test_data = [
        ("LEND-01", "Lending (Positive)", "Lend ₹500 from CASH with balance = ₹1,000", "CASH decrements to ₹500; lending record created; HTTP 201", "PASS"),
        ("LEND-02", "Lending (Negative)", "Lend ₹500 from CASH with balance = ₹0.00", "Rejected: Insufficient funds in CASH balance; HTTP 400", "PASS"),
        ("LEND-14", "Repayments (Boundary)", "Borrower repays ₹700 on a remaining debt of ₹500", "Repayment capped/rejected: cannot repay more than outstanding; HTTP 400", "PASS"),
        ("ACC-07", "Accounts (Concurrency)", "Simultaneous double-spend request on ₹1,000 balance", "DB row locked via select_for_update(); 2nd txn safely rejected", "PASS"),
        ("RPT-12", "Reports (Security)", "Export CSV containing '=1+1' or '@formula' in title", "Sanitizer prefixes leading apostrophe; formula injection neutralized", "PASS"),
        ("ISO-03", "Auth (Isolation)", "User A attempts GET /api/v1/accounts/ of User B", "HTTP 404/403: Multi-tenant tenant boundary enforced", "PASS")
    ]

    for row_idx, row in enumerate(test_data, start=1):
        bg_c = C_CARD_BG if row_idx % 2 == 1 else RGBColor(241, 245, 249)
        for col_idx, val in enumerate(row):
            cell = tbl.cell(row_idx, col_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg_c
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = val
            p.font.name = "Segoe UI"
            p.font.size = Pt(10.5)

            if col_idx == 0:
                p.alignment = PP_ALIGN.CENTER
                p.font.bold = True
                p.font.color.rgb = C_DARK_BLUE
            elif col_idx == 4:
                p.alignment = PP_ALIGN.CENTER
                p.font.bold = True
                p.font.color.rgb = C_GREEN
            else:
                p.font.color.rgb = C_TEXT_DARK

    # Speaker Notes Slide 5
    s5.notes_slide.notes_text_frame.text = (
        "Slide 5 provides empirical test execution evidence taken directly from our 92 automated test suite in "
        "backend/core/tests.py. Notice our coverage of positive, negative, boundary, and security test cases. "
        "In LEND-01, a positive scenario verifies accurate deduction and ledger posting. LEND-02 executes a negative test, "
        "ensuring the system refuses to debit a zero cash balance. LEND-14 is a critical boundary test verifying that a "
        "user cannot repay more than the outstanding debt. In ACC-07, we test concurrency protection using select_for_update "
        "to prevent double-spending. Furthermore, RPT-12 and ISO-03 confirm our security defenses against formula injection "
        "and horizontal privilege escalation."
    )

    # ==========================================
    # SLIDE 6: Black Box, White Box and API Testing
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_bg(s6, dark=False)
    add_header(s6, "Black Box, White Box & API Testing Methodologies", "Testing Methodologies")

    col_w = Inches(3.68)
    card_h = Inches(5.3)

    # Card 1: Black Box Testing
    add_card(s6, Inches(0.8), Inches(1.65), col_w, card_h)
    tb1 = s6.shapes.add_textbox(Inches(1.0), Inches(1.8), col_w - Inches(0.4), card_h - Inches(0.3))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p = tf1.paragraphs[0]
    p.text = "Black Box Testing"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_DARK_BLUE

    p_sub = tf1.add_paragraph()
    p_sub.text = "Behavioral & Boundary Analysis"
    p_sub.font.name = "Segoe UI"
    p_sub.font.size = Pt(11)
    p_sub.font.color.rgb = C_TEXT_MUTED
    p_sub.space_before = Pt(2)

    bb_items = [
        ("Equivalence Partitioning", "Partitioned transaction amounts into Valid (> ₹0.00), Invalid (≤ 0), and Over-Balance partitions."),
        ("Boundary Value Analysis (BVA)", "Tested precision at edge points: ₹0.00, ₹0.01, ₹0.99, and ₹999,999,999.99."),
        ("UI Input Validation", "Verified HTML5 step='any' and min='0.01' constraints to accept ₹450 and ₹450.55 while rejecting invalid character strings."),
        ("Temporal Boundary", "Constrained purchase date pickers to prevent 5-digit year inputs (e.g., year 12026 sanitization).")
    ]
    for title, desc in bb_items:
        p = tf1.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)

    # Card 2: White Box Testing
    add_card(s6, Inches(4.82), Inches(1.65), col_w, card_h)
    tb2 = s6.shapes.add_textbox(Inches(5.02), Inches(1.8), col_w - Inches(0.4), card_h - Inches(0.3))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p = tf2.paragraphs[0]
    p.text = "White Box Testing"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ORANGE

    p_sub = tf2.add_paragraph()
    p_sub.text = "Code Path & Concurrency Analysis"
    p_sub.font.name = "Segoe UI"
    p_sub.font.size = Pt(11)
    p_sub.font.color.rgb = C_TEXT_MUTED
    p_sub.space_before = Pt(2)

    wb_items = [
        ("Atomic Rollback Paths", "Inspected transaction.atomic() blocks ensuring that if a secondary table write fails, balance deductions rollback cleanly."),
        ("Row-Level Locking", "Verified database statement execution of 'SELECT ... FOR UPDATE' to ensure branch coverage during concurrent access."),
        ("Exception Path Coverage", "Simulated unhandled DB OperationalErrors (e.g. Neon connection drops) to verify failover handling."),
        ("Dead Code Removal", "Cleaned legacy duplicated serializers and obsolete model properties across refactoring cycles.")
    ]
    for title, desc in wb_items:
        p = tf2.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)

    # Card 3: API Testing
    add_card(s6, Inches(8.84), Inches(1.65), col_w, card_h)
    tb3 = s6.shapes.add_textbox(Inches(9.04), Inches(1.8), col_w - Inches(0.4), card_h - Inches(0.3))
    tf3 = tb3.text_frame
    tf3.word_wrap = True
    p = tf3.paragraphs[0]
    p.text = "API & Contract Testing"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_GREEN

    p_sub = tf3.add_paragraph()
    p_sub.text = "REST Endpoints & Payloads"
    p_sub.font.name = "Segoe UI"
    p_sub.font.size = Pt(11)
    p_sub.font.color.rgb = C_TEXT_MUTED
    p_sub.space_before = Pt(2)

    api_items = [
        ("HTTP Status Contracts", "Verified exact status semantics: 201 Created for new entries, 400 Bad Request for validation errors, 403/404 for authorization."),
        ("Schema & Serialization", "Validated JSON request/response contracts for portfolio assets, expense categories, and monthly summaries."),
        ("CSRF Token Enforcement", "Tested CSRF cookie validation across all unsafe HTTP verbs (POST, PUT, PATCH, DELETE)."),
        ("Query Limit Verification", "Tested API pagination contracts, confirming /transactions/?limit=100 delivers expected transaction history.")
    ]
    for title, desc in api_items:
        p = tf3.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)

    # Speaker Notes Slide 6
    s6.notes_slide.notes_text_frame.text = (
        "In Slide 6, we bridge STQA theory with concrete implementation examples across Black Box, White Box, and API testing. "
        "For Black Box testing, we applied Equivalence Partitioning and Boundary Value Analysis on monetary and temporal inputs. "
        "For example, resolving a frontend bug where entering ₹450 was erroneously rejected because the step attribute defaulted to 1. "
        "For White Box testing, we examined internal code logic, specifically testing transaction rollback paths within atomic blocks "
        "and evaluating select_for_update locking. Finally, in API testing, we validated REST status codes, JSON serialization schemas, "
        "and CSRF security tokens across our Django REST endpoints."
    )

    # ==========================================
    # SLIDE 7: Software Quality Assurance (Attributes)
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    add_bg(s7, dark=False)
    add_header(s7, "Software Quality Assurance: Core Quality Attributes", "Software Quality Factors")

    # 5 Key Attributes in structured cards
    # Top row: 3 cards
    w3 = Inches(3.68)
    h_top = Inches(1.65)
    card_h = Inches(2.45)

    attrs_top = [
        ("Reliability & Accuracy", "Mathematical Decimal Precision",
         "Replaced standard IEEE-754 floating point numbers with Python's Decimal type (DecimalField) across all ledger calculations, guaranteeing that arithmetic round-off errors never occur.", C_BLUE),
        ("Security & Tenant Privacy", "Zero Cross-User Data Leakage",
         "Implemented horizontal isolation filters across all ORM querysets: User.objects.filter(user=request.user). Tested with adversarial user tokens to ensure complete privacy.", C_ORANGE),
        ("Performance & Scalability", "Eliminated N+1 Query Bottlenecks",
         "Refactored report trend calculation from 62 sequential database queries down to a single batched query with in-memory grouping, reducing response times by 98%.", C_GREEN)
    ]

    for i, (a_title, a_sub, a_desc, color) in enumerate(attrs_top):
        x = Inches(0.8) + i * Inches(4.01)
        add_card(s7, x, h_top, w3, card_h)
        tb = s7.shapes.add_textbox(x + Inches(0.15), h_top + Inches(0.15), w3 - Inches(0.3), card_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = a_title
        p.font.name = "Segoe UI"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = color

        p_s = tf.add_paragraph()
        p_s.text = a_sub.upper()
        p_s.font.size = Pt(10)
        p_s.font.bold = True
        p_s.font.color.rgb = C_TEXT_MUTED
        p_s.space_before = Pt(2)

        p_d = tf.add_paragraph()
        p_d.text = a_desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = C_TEXT_DARK
        p_d.space_before = Pt(6)

    # Bottom row: 2 cards
    w2 = Inches(5.7)
    h_bot = Inches(4.35)
    card_h2 = Inches(2.55)

    attrs_bot = [
        ("Usability & Responsive Accessibility", "Context-Aware Interaction Design",
         "Engineered intelligent UX validations: when CASH balance is zero, the lending modal automatically defaults to BANK with live balance badges, eliminating user confusion and preventing rejected submissions.", C_DARK_BLUE),
        ("Maintainability & Verification vs Validation", "Clean Separation of Concerns",
         "Verification: Ensured software was built right according to technical specifications (92 unit tests passing). Validation: Ensured the right software was built to solve user financial challenges effectively.", C_AMBER)
    ]

    for i, (a_title, a_sub, a_desc, color) in enumerate(attrs_bot):
        x = Inches(0.8) + i * Inches(6.0)
        add_card(s7, x, h_bot, w2, card_h2)
        tb = s7.shapes.add_textbox(x + Inches(0.2), h_bot + Inches(0.15), w2 - Inches(0.4), card_h2 - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = a_title
        p.font.name = "Segoe UI"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = color

        p_s = tf.add_paragraph()
        p_s.text = a_sub.upper()
        p_s.font.size = Pt(10)
        p_s.font.bold = True
        p_s.font.color.rgb = C_TEXT_MUTED
        p_s.space_before = Pt(2)

        p_d = tf.add_paragraph()
        p_d.text = a_desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = C_TEXT_DARK
        p_d.space_before = Pt(6)

    # Speaker Notes Slide 7
    s7.notes_slide.notes_text_frame.text = (
        "Slide 7 highlights Software Quality Assurance through ISO/IEC 25010 software quality attributes. "
        "For Reliability, we completely avoided floating point numbers in favor of exact Python Decimals. "
        "For Security, multi-tenant ORM scopes prevent any cross-user data leakage. For Performance, we diagnosed "
        "and resolved a severe N+1 query issue in report generation, dropping query count from 62 down to 1. "
        "For Usability, we implemented smart UI defaults, such as automatically selecting Bank when Cash balance is zero. "
        "Finally, we distinguished Verification—confirming technical correctness against specifications—from Validation, "
        "confirming that the application genuinely fulfills real-world personal accounting needs."
    )

    # ==========================================
    # SLIDE 8: Defect Management and Testing Tools
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    add_bg(s8, dark=False)
    add_header(s8, "Defect Management Life Cycle & Diagnostic Tools", "Defect Management")

    # Left: Bug Life Cycle Diagram (Visual Chain)
    add_card(s8, Inches(0.8), Inches(1.65), Inches(4.6), Inches(5.3))
    tb_l = s8.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(4.2), Inches(5.0))
    tf_l = tb_l.text_frame
    tf_l.word_wrap = True
    p = tf_l.paragraphs[0]
    p.text = "Defect Life Cycle in Practice"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_DARK_BLUE

    steps = [
        ("1. Discovered", "Automated test failure or visual anomaly observed (e.g. 30s Report Timeout)."),
        ("2. Logged & Isolated", "Traceback captured; root cause isolated in Django view / ORM query loop."),
        ("3. Root Cause Analysis", "62 sequential DB round-trips over Neon connection pooler discovered."),
        ("4. Remediated", "Code refactored to single-batch SQL query with in-memory dictionary aggregation."),
        ("5. Regression Verified", "Automated test suite re-run; response time dropped to 0.4s; closed.")
    ]
    for s_title, s_desc in steps:
        p = tf_l.add_paragraph()
        p.text = s_title
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = C_ORANGE
        p.space_before = Pt(8)

        p_d = tf_l.add_paragraph()
        p_d.text = s_desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = C_TEXT_DARK
        p_d.space_before = Pt(2)

    # Right: Real Defects Resolved & Tool Suite
    add_card(s8, Inches(5.7), Inches(1.65), Inches(6.8), Inches(2.6))
    tb_r1 = s8.shapes.add_textbox(Inches(5.9), Inches(1.8), Inches(6.4), Inches(2.3))
    tf_r1 = tb_r1.text_frame
    tf_r1.word_wrap = True
    p = tf_r1.paragraphs[0]
    p.text = "Real Case Defects Resolved During SQA"
    p.font.name = "Segoe UI"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_NAVY_DARK

    real_defects = [
        "Defect 1 (Step Constraint): HTML input rejected valid ₹450 investment because min='0.01' lacked step='any'. Fixed across all investment modals.",
        "Defect 2 (Year Overflow): Native browser date pickers allowed accidental 5-digit years (e.g. 12026). Resolved with regex normalization and max bounds.",
        "Defect 3 (DB Connection Drops): Neon pooler dropped idle connections. Resolved via CONN_MAX_AGE=0 setting."
    ]
    for rd in real_defects:
        p = tf_r1.add_paragraph()
        p.text = "• " + rd
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(6)

    # Tools Box
    add_card(s8, Inches(5.7), Inches(4.45), Inches(6.8), Inches(2.5))
    tb_r2 = s8.shapes.add_textbox(Inches(5.9), Inches(4.6), Inches(6.4), Inches(2.2))
    tf_r2 = tb_r2.text_frame
    tf_r2.word_wrap = True
    p = tf_r2.paragraphs[0]
    p.text = "Development & Diagnostic Tool Suite"
    p.font.name = "Segoe UI"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_GREEN

    tools_list = [
        ("Django Test Runner", "Automated execution of 92 isolated database test cases."),
        ("Python unittest & coverage", "Assertion validation, mock requests, and code branch verification."),
        ("Chrome DevTools", "Network payload tracing, CSS responsive layout debugging, and console logging."),
        ("Git Version Control", "Systematic feature branching, regression rollback points, and clean commits.")
    ]
    for t_name, t_use in tools_list:
        p = tf_r2.add_paragraph()
        p.text = f"• {t_name}: {t_use}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(5)

    # Speaker Notes Slide 8
    s8.notes_slide.notes_text_frame.text = (
        "Slide 8 illustrates our defect management process and the diagnostic tools utilized. "
        "We followed a rigorous 5-stage defect lifecycle: discovery, logging, root cause analysis, remediation, and "
        "regression verification. We highlight three real defects resolved during verification: the HTML step validation bug "
        "rejecting round numbers like ₹450, the 5-digit year overflow bug, and cloud database pooling timeouts. "
        "Our tooling relied on the Django test runner, Python's unittest framework, Chrome DevTools for client performance, "
        "and Git for systematic change management and regression prevention."
    )

    # ==========================================
    # SLIDE 9: Testing Evaluation and Future Improvements
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    add_bg(s9, dark=False)
    add_header(s9, "Testing Evaluation, Limitations & Future Scope", "Project Evaluation")

    # Left Column: Actual Current Testing Achievements (Honest Evaluation)
    add_card(s9, Inches(0.8), Inches(1.65), Inches(5.7), Inches(5.3))
    tb_e = s9.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(5.3), Inches(5.0))
    tf_e = tb_e.text_frame
    tf_e.word_wrap = True
    p = tf_e.paragraphs[0]
    p.text = "Empirical Testing Achievements"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_DARK_BLUE

    achievements = [
        ("92 Automated Tests Passing", "100% pass rate across authentication, accounts, expenses, lending, credit, budgets, notifications, and reports."),
        ("Zero Startup & Migration Defects", "Clean 'manage.py check' execution with zero system errors and perfectly synchronized database schemas."),
        ("Zero Frontend Production Build Errors", "Vite production bundle generates clean chunks without any unresolved symbols or syntax errors."),
        ("Mobile & Usability Enhancements", "Full responsive viewport layout with mobile bottom navigation bar and accessible modal touch-targets.")
    ]
    for title, desc in achievements:
        p = tf_e.add_paragraph()
        p.text = f"✓  {title}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = C_GREEN
        p.space_before = Pt(10)

        p_d = tf_e.add_paragraph()
        p_d.text = desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = C_TEXT_DARK
        p_d.space_before = Pt(2)

    # Right Column: Current Limitations & Proposed Future Automation
    add_card(s9, Inches(6.8), Inches(1.65), Inches(5.7), Inches(5.3))
    tb_f = s9.shapes.add_textbox(Inches(7.0), Inches(1.8), Inches(5.3), Inches(5.0))
    tf_f = tb_f.text_frame
    tf_f.word_wrap = True
    p = tf_f.paragraphs[0]
    p.text = "Limitations & Proposed Future Scope"
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ORANGE

    future_items = [
        ("Automated E2E Browser Testing", "Current UI testing is executed manually; proposing Cypress or Playwright test suites for automated headless UI regression."),
        ("Continuous Integration (CI) Pipeline", "Automate GitHub Actions workflow to run the 92-test suite and Vite build on every pull request."),
        ("Load & High-Concurrency Stress Testing", "Introduce Locust or k6 performance tests to simulate 1,000+ simultaneous financial transactions."),
        ("Live SMS/WhatsApp Gateway Testing", "Expand notification verification beyond Brevo SMTP to verify mobile carrier API contracts.")
    ]
    for title, desc in future_items:
        p = tf_f.add_paragraph()
        p.text = f"→  {title}"
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = C_AMBER
        p.space_before = Pt(10)

        p_d = tf_f.add_paragraph()
        p_d.text = desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = C_TEXT_DARK
        p_d.space_before = Pt(2)

    # Speaker Notes Slide 9
    s9.notes_slide.notes_text_frame.text = (
        "Slide 9 presents an honest academic evaluation of our current test results alongside future quality engineering "
        "opportunities. Currently, our test suite boasts 92 automated tests with 100% pass rates, zero backend startup warnings, "
        "and clean Vite production builds. However, academic integrity requires acknowledging limitations: our UI testing currently "
        "relies on manual verification, and load testing under high concurrency has not yet been benchmarked with tools like Locust. "
        "As part of our future roadmap, we plan to implement Playwright for automated browser testing and integrate GitHub Actions "
        "for continuous integration testing on every commit."
    )

    # ==========================================
    # SLIDE 10: Conclusion and Q&A (Dark, Tech)
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    add_bg(s10, dark=True)

    # Accent top border
    accent_bar10 = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.12))
    accent_bar10.fill.solid()
    accent_bar10.fill.fore_color.rgb = C_ORANGE
    accent_bar10.line.fill.background()

    # Header
    tb10 = s10.shapes.add_textbox(Inches(0.9), Inches(0.7), Inches(11.5), Inches(1.2))
    tf10 = tb10.text_frame
    tf10.word_wrap = True
    p10_c = tf10.paragraphs[0]
    p10_c.text = "CONCLUSION & ACADEMIC TAKEAWAYS"
    p10_c.font.name = "Segoe UI"
    p10_c.font.size = Pt(11)
    p10_c.font.bold = True
    p10_c.font.color.rgb = C_ORANGE

    p10_t = tf10.add_paragraph()
    p10_t.text = "Key STQA Learnings & Core Takeaways"
    p10_t.font.name = "Segoe UI"
    p10_t.font.size = Pt(28)
    p10_t.font.bold = True
    p10_t.font.color.rgb = C_WHITE
    p10_t.space_before = Pt(4)

    # 3 Summary Cards
    col_w10 = Inches(3.68)
    h_top10 = Inches(2.2)
    card_h10 = Inches(3.2)

    takeaways = [
        ("Defect Prevention > Cure",
         "Shift-left testing and strict database schema constraints (such as select_for_update and Decimal arithmetic) prevented critical financial ledger errors before they reached end users.", C_ORANGE),
        ("Empirical Rigor",
         "Automated regression suites (92 test cases) provided the confidence to iteratively refactor, optimize database queries, and upgrade UI components without breaking existing contracts.", C_BLUE),
        ("Holistic Quality",
         "STQA encompasses far more than catching UI bugs; it ensures performance scalability, multi-tenant security isolation, input sanitization, and seamless user experience.", C_GREEN)
    ]

    for i, (t_title, t_body, col) in enumerate(takeaways):
        x = Inches(0.9) + i * Inches(4.0)
        add_card(s10, x, h_top10, col_w10, card_h10, bg_color=C_NAVY_LIGHT, border_color=RGBColor(51, 65, 85))

        tb = s10.shapes.add_textbox(x + Inches(0.2), h_top10 + Inches(0.2), col_w10 - Inches(0.4), card_h10 - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = t_title
        p.font.name = "Segoe UI"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = col

        p_b = tf.add_paragraph()
        p_b.text = t_body
        p_b.font.name = "Segoe UI"
        p_b.font.size = Pt(12)
        p_b.font.color.rgb = RGBColor(226, 232, 240)
        p_b.space_before = Pt(12)

    # Thank You Banner
    add_card(s10, Inches(0.9), Inches(5.7), Inches(11.533), Inches(1.2), bg_color=C_NAVY_LIGHT, border_color=C_ORANGE)
    tb_ty = s10.shapes.add_textbox(Inches(1.2), Inches(5.8), Inches(10.9), Inches(1.0))
    tf_ty = tb_ty.text_frame
    tf_ty.word_wrap = True
    p_ty = tf_ty.paragraphs[0]
    p_ty.text = "Thank You!   |   Questions & Answers"
    p_ty.font.name = "Segoe UI"
    p_ty.font.size = Pt(20)
    p_ty.font.bold = True
    p_ty.font.color.rgb = C_WHITE
    p_ty.alignment = PP_ALIGN.CENTER

    p_sub_ty = tf_ty.add_paragraph()
    p_sub_ty.text = "Presented by: Vishal Keshav Balaji • Yogesh S • Yuvaaraja N • Sujay B S"
    p_sub_ty.font.name = "Segoe UI"
    p_sub_ty.font.size = Pt(13)
    p_sub_ty.font.color.rgb = RGBColor(203, 213, 225)
    p_sub_ty.alignment = PP_ALIGN.CENTER
    p_sub_ty.space_before = Pt(4)

    # Speaker Notes Slide 10
    s10.notes_slide.notes_text_frame.text = (
        "In conclusion, our work on ApnaWallet demonstrated how Software Testing and Quality Assurance "
        "is fundamental to building dependable financial systems. By shifting testing left, enforcing atomic transaction "
        "invariants, and executing 92 automated regression tests, we guaranteed ledger precision and reliable user experiences. "
        "On behalf of Vishal Keshav Balaji, Yogesh S, Yuvaaraja N, and Sujay B S, we thank you for your time and "
        "welcome any questions."
    )

    # Save presentation
    output_path = os.path.abspath("ApnaWallet_STQA_Presentation.pptx")
    prs.save(output_path)
    print(f"Presentation successfully created at: {output_path}")

if __name__ == "__main__":
    create_deck()
