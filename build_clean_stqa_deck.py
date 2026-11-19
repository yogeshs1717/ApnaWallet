import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Clean Palette (Warm White / Cream, ApnaWallet Orange, Dark Charcoal)
    C_BG_CREAM = RGBColor(250, 248, 245)       # #FAF8F5 warm cream
    C_CARD_BG = RGBColor(255, 255, 255)        # Pure white
    C_CARD_BORDER = RGBColor(229, 231, 235)    # #E5E7EB light gray
    C_CARD_ALT = RGBColor(245, 243, 239)       # Warm light gray-cream
    
    C_TEXT_PRIMARY = RGBColor(30, 41, 59)      # #1E293B dark charcoal
    C_TEXT_HEADING = RGBColor(15, 23, 42)      # #0F172A rich dark
    C_TEXT_MUTED = RGBColor(100, 116, 139)     # #64748B medium slate
    
    C_ORANGE = RGBColor(234, 88, 12)           # #EA580C warm orange
    C_GOLD = RGBColor(217, 119, 6)             # #D97706 warm amber/gold
    C_BLUE = RGBColor(37, 99, 235)             # #2563EB clean blue
    C_GREEN = RGBColor(22, 163, 74)            # #16A34A soft green

    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG_CREAM
        bg.line.fill.background()
        return bg

    def add_header_and_branding(slide, slide_num, title, subtitle):
        # Top Orange Accent Line
        top_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.08))
        top_line.fill.solid()
        top_line.fill.fore_color.rgb = C_ORANGE
        top_line.line.fill.background()

        # Branding in top right
        brand_box = slide.shapes.add_textbox(Inches(9.0), Inches(0.35), Inches(3.5), Inches(0.4))
        tf_b = brand_box.text_frame
        p_b = tf_b.paragraphs[0]
        p_b.alignment = PP_ALIGN.RIGHT
        p_b.text = "ApnaWallet  •  STQA Project"
        p_b.font.name = "Segoe UI"
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = C_ORANGE

        # Slide Title & Subtitle
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(8.5), Inches(1.1))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(24)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_HEADING

        p_s = tf.add_paragraph()
        p_s.text = subtitle
        p_s.font.name = "Segoe UI"
        p_s.font.size = Pt(13)
        p_s.font.color.rgb = C_TEXT_MUTED
        p_s.space_before = Pt(4)

        # Slide Number in footer
        foot_box = slide.shapes.add_textbox(Inches(11.0), Inches(7.05), Inches(1.5), Inches(0.3))
        tf_f = foot_box.text_frame
        p_f = tf_f.paragraphs[0]
        p_f.alignment = PP_ALIGN.RIGHT
        p_f.text = f"{slide_num} / 12"
        p_f.font.name = "Segoe UI"
        p_f.font.size = Pt(10)
        p_f.font.color.rgb = C_TEXT_MUTED

    def create_card(slide, left, top, width, height, bg_color=C_CARD_BG, border_color=C_CARD_BORDER, roundness=True):
        shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if roundness else MSO_SHAPE.RECTANGLE
        card = slide.shapes.add_shape(shape_type, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        return card

    # ==============================================================
    # SLIDE 1: Title Slide
    # ==============================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Top Accent bar
    top_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.12))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = C_ORANGE
    top_bar.line.fill.background()

    # Main Card
    main_card = create_card(s1, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9), bg_color=C_CARD_BG, border_color=C_CARD_BORDER)

    # Left Side: Project Branding & Titles
    tbox = s1.shapes.add_textbox(Inches(1.3), Inches(1.3), Inches(6.2), Inches(4.8))
    tf1 = tbox.text_frame
    tf1.word_wrap = True

    # Subject badge
    p_badge = tf1.paragraphs[0]
    p_badge.text = "SOFTWARE TESTING & QUALITY ASSURANCE"
    p_badge.font.name = "Segoe UI"
    p_badge.font.size = Pt(11)
    p_badge.font.bold = True
    p_badge.font.color.rgb = C_ORANGE

    p_title = tf1.add_paragraph()
    p_title.text = "ApnaWallet"
    p_title.font.name = "Segoe UI"
    p_title.font.size = Pt(46)
    p_title.font.bold = True
    p_title.font.color.rgb = C_TEXT_HEADING
    p_title.space_before = Pt(8)

    p_tag = tf1.add_paragraph()
    p_tag.text = "Your Money. Your Rules."
    p_tag.font.name = "Segoe UI"
    p_tag.font.size = Pt(20)
    p_tag.font.bold = True
    p_tag.font.color.rgb = C_GOLD
    p_tag.space_before = Pt(4)

    p_sub = tf1.add_paragraph()
    p_sub.text = "A practical demonstration of Software Testing and Quality Assurance principles in personal financial management."
    p_sub.font.name = "Segoe UI"
    p_sub.font.size = Pt(13)
    p_sub.font.color.rgb = C_TEXT_MUTED
    p_sub.space_before = Pt(16)

    # Right Side: Team Members & Project Info
    team_card = create_card(s1, Inches(7.8), Inches(1.3), Inches(4.2), Inches(4.8), bg_color=C_CARD_ALT, border_color=C_CARD_BORDER)
    tm_box = s1.shapes.add_textbox(Inches(8.1), Inches(1.6), Inches(3.6), Inches(4.2))
    tf_tm = tm_box.text_frame
    tf_tm.word_wrap = True

    p_th = tf_tm.paragraphs[0]
    p_th.text = "PROJECT TEAM"
    p_th.font.name = "Segoe UI"
    p_th.font.size = Pt(12)
    p_th.font.bold = True
    p_th.font.color.rgb = C_ORANGE

    members = [
        "1.  Vishal Keshav Balaji",
        "2.  Yogesh S",
        "3.  Yuvaaraja N",
        "4.  Sujay B S"
    ]
    for mem in members:
        p_m = tf_tm.add_paragraph()
        p_m.text = mem
        p_m.font.name = "Segoe UI"
        p_m.font.size = Pt(15)
        p_m.font.bold = True
        p_m.font.color.rgb = C_TEXT_HEADING
        p_m.space_before = Pt(10)

    p_div = tf_tm.add_paragraph()
    p_div.text = "─────────────────────"
    p_div.font.size = Pt(10)
    p_div.font.color.rgb = RGBColor(203, 213, 225)
    p_div.space_before = Pt(12)

    p_tech = tf_tm.add_paragraph()
    p_tech.text = "React + Vite  •  Django REST  •  PostgreSQL"
    p_tech.font.name = "Segoe UI"
    p_tech.font.size = Pt(11)
    p_tech.font.color.rgb = C_TEXT_MUTED
    p_tech.space_before = Pt(4)

    s1.notes_slide.notes_text_frame.text = (
        "Welcome everyone. Today our team presents ApnaWallet for our Software Testing and Quality Assurance project. "
        "We will explain how our personal finance website works, and how software testing ensures accurate calculations and reliable performance."
    )

    # ==============================================================
    # SLIDE 2: Problem Statement
    # ==============================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header_and_branding(s2, 2, "Problem Statement", "Why Personal Finance Tracking Needs Quality Assurance")

    # 4 Problem Cards
    problems = [
        ("Daily Expense Confusion", "People find it difficult to track daily cash spending versus bank account balances, leading to untracked expenses.", C_ORANGE),
        ("Lending & Borrowing Chaos", "Informal loans between friends and family are often forgotten or tracked inaccurately on paper and chat messages.", C_GOLD),
        ("Zero Budget Visibility", "Without clear summaries, individuals cannot see whether they are overspending or meeting their monthly savings targets.", C_BLUE),
        ("Need for Reliable Records", "Financial records require 100% mathematical accuracy. Even small calculation bugs damage user confidence.", C_TEXT_PRIMARY)
    ]

    card_w = Inches(2.7)
    card_h = Inches(4.9)
    top_pos = Inches(1.8)

    for i, (title, desc, accent_col) in enumerate(problems):
        x = Inches(0.8) + i * Inches(2.98)
        c = create_card(s2, x, top_pos, card_w, card_h)

        # Top Accent Strip
        strip = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, top_pos, card_w, Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = accent_col
        strip.line.fill.background()

        tb = s2.shapes.add_textbox(x + Inches(0.2), top_pos + Inches(0.3), card_w - Inches(0.4), card_h - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p_num = tf.paragraphs[0]
        p_num.text = f"0{i+1}"
        p_num.font.name = "Segoe UI"
        p_num.font.size = Pt(28)
        p_num.font.bold = True
        p_num.font.color.rgb = accent_col

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(15)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_HEADING
        p_t.space_before = Pt(14)

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = C_TEXT_PRIMARY
        p_d.space_before = Pt(10)

    s2.notes_slide.notes_text_frame.text = (
        "Many people struggle to track their money across cash and bank accounts, leading to confusion and forgotten debts. "
        "In financial apps, calculations must be completely accurate. These real-world problems motivated our design and testing of ApnaWallet."
    )

    # ==============================================================
    # SLIDE 3: Our Solution: ApnaWallet
    # ==============================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header_and_branding(s3, 3, "Our Solution: ApnaWallet", "Simple, Transparent, and Reliable Money Management")

    features = [
        ("Dual-Account Wallet", "Tracks Cash and Bank accounts separately with real-time balance updates and transfers.", C_ORANGE),
        ("Lending & Debt Ledger", "Records money lent to friends and borrowed from others, supporting partial repayments.", C_GOLD),
        ("Savings & Budgets", "Set monthly spending limits by category and track personal savings and investments.", C_BLUE),
        ("Reports & Reminders", "Visual monthly spending charts, downloadable PDF/CSV reports, and payment notifications.", C_GREEN)
    ]

    card_w3 = Inches(5.65)
    card_h3 = Inches(2.3)

    for i, (title, desc, col) in enumerate(features):
        x = Inches(0.8) if (i % 2 == 0) else Inches(6.85)
        y = Inches(1.8) if (i < 2) else Inches(4.4)

        c = create_card(s3, x, y, card_w3, card_h3)

        # Left color bar
        bar = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Inches(0.18), card_h3)
        bar.fill.solid()
        bar.fill.fore_color.rgb = col
        bar.line.fill.background()

        tb = s3.shapes.add_textbox(x + Inches(0.4), y + Inches(0.25), card_w3 - Inches(0.6), card_h3 - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_HEADING

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = C_TEXT_PRIMARY
        p_d.space_before = Pt(8)

        p_sub = tf.add_paragraph()
        p_sub.text = "• Fully validated inputs   • Immediate balance sync"
        p_sub.font.name = "Segoe UI"
        p_sub.font.size = Pt(10.5)
        p_sub.font.bold = True
        p_sub.font.color.rgb = C_TEXT_MUTED
        p_sub.space_before = Pt(6)

    s3.notes_slide.notes_text_frame.text = (
        "ApnaWallet solves these challenges by combining dual cash and bank tracking, a lending ledger, savings goals, and visual reports. "
        "Every feature is designed to give the user immediate feedback and clear visibility over their financial life."
    )

    # ==============================================================
    # SLIDE 4: Technology and Architecture
    # ==============================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header_and_branding(s4, 4, "Technology & Architecture", "Clean Full-Stack Architecture Designed for Reliability")

    # 3 Main Architecture Cards + Flow Arrows
    arch_blocks = [
        ("Frontend Tier", "React + Vite + Tailwind", [
            "Fast, reactive user interface",
            "Client-side input validation",
            "Responsive layout for mobile & web"
        ], C_BLUE),
        ("Backend API", "Django REST Framework", [
            "Secure RESTful API endpoints",
            "Central balance calculation engine",
            "Session authentication & CSRF protection"
        ], C_ORANGE),
        ("Database Tier", "Neon PostgreSQL", [
            "Serverless cloud database",
            "ACID transactions (no money lost)",
            "Multi-tenant user data isolation"
        ], C_GREEN)
    ]

    card_w4 = Inches(3.6)
    card_h4 = Inches(3.8)
    top_pos4 = Inches(1.8)

    for i, (layer, tech, points, col) in enumerate(arch_blocks):
        x = Inches(0.8) + i * Inches(4.05)
        create_card(s4, x, top_pos4, card_w4, card_h4)

        # Header accent
        head = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, top_pos4, card_w4, Inches(0.12))
        head.fill.solid()
        head.fill.fore_color.rgb = col
        head.line.fill.background()

        tb = s4.shapes.add_textbox(x + Inches(0.25), top_pos4 + Inches(0.3), card_w4 - Inches(0.5), card_h4 - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p_l = tf.paragraphs[0]
        p_l.text = layer
        p_l.font.name = "Segoe UI"
        p_l.font.size = Pt(16)
        p_l.font.bold = True
        p_l.font.color.rgb = C_TEXT_HEADING

        p_t = tf.add_paragraph()
        p_t.text = tech
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(12)
        p_t.font.bold = True
        p_t.font.color.rgb = col
        p_t.space_before = Pt(4)

        for pt in points:
            p_p = tf.add_paragraph()
            p_p.text = "•  " + pt
            p_p.font.name = "Segoe UI"
            p_p.font.size = Pt(11.5)
            p_p.font.color.rgb = C_TEXT_PRIMARY
            p_p.space_before = Pt(10)

    # Bottom Auxiliary Bar: Brevo + Git/GitHub
    aux_card = create_card(s4, Inches(0.8), Inches(5.85), Inches(11.733), Inches(0.95), bg_color=C_CARD_ALT)
    tb_aux = s4.shapes.add_textbox(Inches(1.1), Inches(5.95), Inches(11.1), Inches(0.75))
    tf_aux = tb_aux.text_frame
    tf_aux.word_wrap = True
    p_aux = tf_aux.paragraphs[0]
    p_aux.text = "Supporting Tools:  Brevo SMTP for secure password recovery emails  •  Git & GitHub for version control and change verification"
    p_aux.font.name = "Segoe UI"
    p_aux.font.size = Pt(11.5)
    p_aux.font.bold = True
    p_aux.font.color.rgb = C_TEXT_PRIMARY
    p_aux.alignment = PP_ALIGN.CENTER

    s4.notes_slide.notes_text_frame.text = (
        "Our architecture connects a React frontend with a Django REST backend and a Neon PostgreSQL database. "
        "Separating the frontend and backend allows us to test each layer independently, verifying both user inputs and database transactions."
    )

    # ==============================================================
    # SLIDE 5: What Is STQA?
    # ==============================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header_and_branding(s5, 5, "What Is STQA?", "Quality Assurance vs Software Testing Explained Simply")

    # 2 Column Cards: QA vs ST
    col_w5 = Inches(5.65)
    col_h5 = Inches(3.2)
    top_5 = Inches(1.8)

    # Card 1: Quality Assurance (QA)
    create_card(s5, Inches(0.8), top_5, col_w5, col_h5)
    strip_qa = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), top_5, col_w5, Inches(0.12))
    strip_qa.fill.solid()
    strip_qa.fill.fore_color.rgb = C_BLUE
    strip_qa.line.fill.background()

    tb_qa = s5.shapes.add_textbox(Inches(1.1), top_5 + Inches(0.25), col_w5 - Inches(0.6), col_h5 - Inches(0.5))
    tf_qa = tb_qa.text_frame
    tf_qa.word_wrap = True
    p_qa_h = tf_qa.paragraphs[0]
    p_qa_h.text = "Quality Assurance (QA)"
    p_qa_h.font.name = "Segoe UI"
    p_qa_h.font.size = Pt(18)
    p_qa_h.font.bold = True
    p_qa_h.font.color.rgb = C_BLUE

    qa_bullets = [
        "Focus: Process-oriented (Preventing defects).",
        "Goal: Establish standards and best practices before writing code.",
        "Method: Code reviews, architecture design, and systematic planning."
    ]
    for b in qa_bullets:
        p = tf_qa.add_paragraph()
        p.text = "•  " + b
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(8)

    # Card 2: Software Testing (ST)
    create_card(s5, Inches(6.85), top_5, col_w5, col_h5)
    strip_st = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), top_5, col_w5, Inches(0.12))
    strip_st.fill.solid()
    strip_st.fill.fore_color.rgb = C_ORANGE
    strip_st.line.fill.background()

    tb_st = s5.shapes.add_textbox(Inches(7.15), top_5 + Inches(0.25), col_w5 - Inches(0.6), col_h5 - Inches(0.5))
    tf_st = tb_st.text_frame
    tf_st.word_wrap = True
    p_st_h = tf_st.paragraphs[0]
    p_st_h.text = "Software Testing (ST)"
    p_st_h.font.name = "Segoe UI"
    p_st_h.font.size = Pt(18)
    p_st_h.font.bold = True
    p_st_h.font.color.rgb = C_ORANGE

    st_bullets = [
        "Focus: Product-oriented (Finding bugs).",
        "Goal: Verify the application behaves according to specifications.",
        "Method: Executing test scenarios with valid and invalid inputs."
    ]
    for b in st_bullets:
        p = tf_st.add_paragraph()
        p.text = "•  " + b
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(8)

    # Bottom Banner: Why STQA Matters for ApnaWallet
    banner = create_card(s5, Inches(0.8), Inches(5.25), Inches(11.733), Inches(1.55), bg_color=C_CARD_ALT)
    tb_ban = s5.shapes.add_textbox(Inches(1.1), Inches(5.35), Inches(11.1), Inches(1.35))
    tf_ban = tb_ban.text_frame
    tf_ban.word_wrap = True

    p_bh = tf_ban.paragraphs[0]
    p_bh.text = "Why STQA Matters for ApnaWallet:"
    p_bh.font.name = "Segoe UI"
    p_bh.font.size = Pt(13)
    p_bh.font.bold = True
    p_bh.font.color.rgb = C_TEXT_HEADING

    why_points = [
        "1. Accurate Calculations: Guarantee that every rupee and paise is accounted for correctly.",
        "2. Security & Privacy: Ensure user credentials and personal ledger records remain isolated.",
        "3. Application Reliability: Ensure smooth daily operations without crashes or data corruption."
    ]
    for wp in why_points:
        p = tf_ban.add_paragraph()
        p.text = wp
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(4)

    s5.notes_slide.notes_text_frame.text = (
        "STQA has two parts: Quality Assurance prevents bugs through good development processes, while Software Testing finds bugs by running the code. "
        "In ApnaWallet, STQA is critical because incorrect calculations or data leaks destroy user trust."
    )

    # ==============================================================
    # SLIDE 6: Black Box vs White Box Testing
    # ==============================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header_and_branding(s6, 6, "Black Box vs White Box Testing", "Testing From the Outside vs Testing the Code Within")

    col_w6 = Inches(5.65)
    col_h6 = Inches(5.0)
    top_6 = Inches(1.8)

    # Column 1: Black Box Testing
    create_card(s6, Inches(0.8), top_6, col_w6, col_h6)
    strip_bb = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), top_6, col_w6, Inches(0.12))
    strip_bb.fill.solid()
    strip_bb.fill.fore_color.rgb = C_ORANGE
    strip_bb.line.fill.background()

    tb_bb = s6.shapes.add_textbox(Inches(1.1), top_6 + Inches(0.25), col_w6 - Inches(0.6), col_h6 - Inches(0.5))
    tf_bb = tb_bb.text_frame
    tf_bb.word_wrap = True

    p_bbh = tf_bb.paragraphs[0]
    p_bbh.text = "Black Box Testing"
    p_bbh.font.name = "Segoe UI"
    p_bbh.font.size = Pt(18)
    p_bbh.font.bold = True
    p_bbh.font.color.rgb = C_ORANGE

    p_bbs = tf_bb.add_paragraph()
    p_bbs.text = "Testing functionality from the user perspective"
    p_bbs.font.size = Pt(12)
    p_bbs.font.color.rgb = C_TEXT_MUTED
    p_bbs.space_before = Pt(2)

    bb_points = [
        "Examines behavior without knowing internal code.",
        "Focuses on user inputs, UI buttons, and visible outputs.",
        "Validates that requirements are satisfied."
    ]
    for pt in bb_points:
        p = tf_bb.add_paragraph()
        p.text = "•  " + pt
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(8)

    # Example Card Box inside
    ex_bb = create_card(s6, Inches(1.1), Inches(4.3), Inches(5.05), Inches(2.2), bg_color=C_CARD_ALT)
    tb_exbb = s6.shapes.add_textbox(Inches(1.3), Inches(4.45), Inches(4.65), Inches(1.9))
    tf_exbb = tb_exbb.text_frame
    tf_exbb.word_wrap = True
    p_exh = tf_exbb.paragraphs[0]
    p_exh.text = "ApnaWallet Practical Example:"
    p_exh.font.name = "Segoe UI"
    p_exh.font.size = Pt(12)
    p_exh.font.bold = True
    p_exh.font.color.rgb = C_ORANGE

    p_exp = tf_exbb.add_paragraph()
    p_exp.text = "User inputs ₹500 in 'Add Cash' and clicks Submit.\nTester verifies the wallet balance badge immediately displays an increase of ₹500."
    p_exp.font.name = "Segoe UI"
    p_exp.font.size = Pt(11.5)
    p_exp.font.color.rgb = C_TEXT_PRIMARY
    p_exp.space_before = Pt(4)

    # Column 2: White Box Testing
    create_card(s6, Inches(6.85), top_6, col_w6, col_h6)
    strip_wb = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), top_6, col_w6, Inches(0.12))
    strip_wb.fill.solid()
    strip_wb.fill.fore_color.rgb = C_BLUE
    strip_wb.line.fill.background()

    tb_wb = s6.shapes.add_textbox(Inches(7.15), top_6 + Inches(0.25), col_w6 - Inches(0.6), col_h6 - Inches(0.5))
    tf_wb = tb_wb.text_frame
    tf_wb.word_wrap = True

    p_wbh = tf_wb.paragraphs[0]
    p_wbh.text = "White Box Testing"
    p_wbh.font.name = "Segoe UI"
    p_wbh.font.size = Pt(18)
    p_wbh.font.bold = True
    p_wbh.font.color.rgb = C_BLUE

    p_wbs = tf_wb.add_paragraph()
    p_wbs.text = "Testing internal code structure and logic"
    p_wbs.font.size = Pt(12)
    p_wbs.font.color.rgb = C_TEXT_MUTED
    p_wbs.space_before = Pt(2)

    wb_points = [
        "Examines internal source code paths and branches.",
        "Verifies functions handle boundary conditions cleanly.",
        "Ensures database queries rollback if an error occurs."
    ]
    for pt in wb_points:
        p = tf_wb.add_paragraph()
        p.text = "•  " + pt
        p.font.name = "Segoe UI"
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(8)

    # Example Card Box inside
    ex_wb = create_card(s6, Inches(7.15), Inches(4.3), Inches(5.05), Inches(2.2), bg_color=C_CARD_ALT)
    tb_exwb = s6.shapes.add_textbox(Inches(7.35), Inches(4.45), Inches(4.65), Inches(1.9))
    tf_exwb = tb_exwb.text_frame
    tf_exwb.word_wrap = True
    p_exh2 = tf_exwb.paragraphs[0]
    p_exh2.text = "ApnaWallet Practical Example:"
    p_exh2.font.name = "Segoe UI"
    p_exh2.font.size = Pt(12)
    p_exh2.font.bold = True
    p_exh2.font.color.rgb = C_BLUE

    p_exp2 = tf_exwb.add_paragraph()
    p_exp2.text = "Tester directly calls calculate_balance() with positive amounts, zero, and negative values to verify the function raises a validation error for negative numbers."
    p_exp2.font.name = "Segoe UI"
    p_exp2.font.size = Pt(11.5)
    p_exp2.font.color.rgb = C_TEXT_PRIMARY
    p_exp2.space_before = Pt(4)

    s6.notes_slide.notes_text_frame.text = (
        "In Black Box testing, we test like a user without looking at code—for instance, checking if depositing ₹500 increases the balance by ₹500. "
        "In White Box testing, we look inside the code, testing individual functions and ensuring negative numbers or database errors are handled safely."
    )

    # ==============================================================
    # SLIDE 7: Levels of Software Testing
    # ==============================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header_and_branding(s7, 7, "Levels of Software Testing", "Building Quality Step-by-Step From Functions to User Acceptance")

    levels = [
        ("1. Unit Testing", "Testing individual functions",
         "ApnaWallet Example: Test the arithmetic function that calculates total net worth = Cash + Bank.", C_BLUE),
        ("2. Integration Testing", "Testing connected modules",
         "ApnaWallet Example: When money is lent, verify Cash is deducted and a Lending record is created simultaneously.", C_ORANGE),
        ("3. System Testing", "Testing the entire application",
         "ApnaWallet Example: Test complete workflow: Register -> Add Cash -> Transfer to Bank -> Export Monthly Report.", C_GOLD),
        ("4. Acceptance Testing", "Checking user satisfaction",
         "ApnaWallet Example: Users confirm the dashboard is easy to understand and accurate for daily budget tracking.", C_GREEN)
    ]

    tier_w7 = Inches(11.733)
    tier_h7 = Inches(1.15)

    for i, (lvl, purpose, ex, col) in enumerate(levels):
        y = Inches(1.75) + i * Inches(1.3)
        create_card(s7, Inches(0.8), y, tier_w7, tier_h7)

        # Left color strip
        strip = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y, Inches(0.2), tier_h7)
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()

        tb = s7.shapes.add_textbox(Inches(1.2), y + Inches(0.12), Inches(11.1), tier_h7 - Inches(0.24))
        tf = tb.text_frame
        tf.word_wrap = True

        p_h = tf.paragraphs[0]
        p_h.text = lvl + "   —   "
        p_h.font.name = "Segoe UI"
        p_h.font.size = Pt(14)
        p_h.font.bold = True
        p_h.font.color.rgb = C_TEXT_HEADING

        run_p = p_h.add_run()
        run_p.text = purpose
        run_p.font.size = Pt(12)
        run_p.font.bold = False
        run_p.font.color.rgb = col

        p_ex = tf.add_paragraph()
        p_ex.text = ex
        p_ex.font.name = "Segoe UI"
        p_ex.font.size = Pt(11)
        p_ex.font.color.rgb = C_TEXT_PRIMARY
        p_ex.space_before = Pt(4)

    s7.notes_slide.notes_text_frame.text = (
        "We test software at four distinct levels. First, Unit tests check small functions. Next, Integration tests verify that modules work together properly. "
        "System testing verifies the entire application end-to-end, and Acceptance testing ensures real users find the app easy and practical."
    )

    # ==============================================================
    # SLIDE 8: Practical Test Scenarios
    # ==============================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header_and_branding(s8, 8, "Practical Test Scenarios", "Core Test Scenarios Executed in ApnaWallet")

    # Table of Scenarios
    t_left = Inches(0.8)
    t_top = Inches(1.8)
    t_width = Inches(11.733)
    t_height = Inches(4.9)

    table_shape = s8.shapes.add_table(6, 4, t_left, t_top, t_width, t_height)
    tbl = table_shape.table

    tbl.columns[0].width = Inches(1.5)   # Test Type
    tbl.columns[1].width = Inches(4.5)   # Scenario / Action
    tbl.columns[2].width = Inches(4.3)   # Expected Result
    tbl.columns[3].width = Inches(1.433) # Status

    headers = ["Test Type", "Action / Test Scenario", "Expected Result", "Status"]
    for col_idx, text in enumerate(headers):
        cell = tbl.cell(0, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_TEXT_HEADING
        tf = cell.text_frame
        p = tf.paragraphs[0]
        p.text = text
        p.alignment = PP_ALIGN.CENTER
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.bold = True
        p.font.color.rgb = RGBColor(255, 255, 255)

    scenarios = [
        ("Positive", "Add ₹1,000 cash to wallet", "Cash balance increases by ₹1,000 immediately", "Verified"),
        ("Positive", "Record ₹200 expense for groceries", "Selected account balance decreases by ₹200", "Verified"),
        ("Arithmetic", "Transfer ₹500 from Cash to Bank", "Cash decreases ₹500, Bank increases ₹500; total unchanged", "Verified"),
        ("Boundary", "Repay ₹300 against a ₹500 lent record", "Remaining outstanding debt updates to ₹200", "Verified"),
        ("Security", "Login with an incorrect password", "Access denied with a clear, user-friendly error message", "Verified")
    ]

    for row_idx, (t_type, scn, exp, st) in enumerate(scenarios, start=1):
        bg_col = C_CARD_BG if row_idx % 2 == 1 else C_CARD_ALT
        row_vals = [t_type, scn, exp, st]

        for col_idx, val in enumerate(row_vals):
            cell = tbl.cell(row_idx, col_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg_col
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = val
            p.font.name = "Segoe UI"
            p.font.size = Pt(11)

            if col_idx == 0:
                p.alignment = PP_ALIGN.CENTER
                p.font.bold = True
                p.font.color.rgb = C_ORANGE
            elif col_idx == 3:
                p.alignment = PP_ALIGN.CENTER
                p.font.bold = True
                p.font.color.rgb = C_GREEN
            else:
                p.font.color.rgb = C_TEXT_PRIMARY

    s8.notes_slide.notes_text_frame.text = (
        "Here are five practical test scenarios we executed in ApnaWallet. "
        "We tested positive cases like deposits and expenses, mathematical checks like account transfers, boundary conditions on loan repayments, and security checks on login authentication."
    )

    # ==============================================================
    # SLIDE 9: Testing Process
    # ==============================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header_and_branding(s9, 9, "The Testing Process", "How We Continually Improved ApnaWallet's Quality")

    # 6 Process Step Cards
    steps = [
        ("1. Plan", "Identify what features need testing before coding.", C_BLUE),
        ("2. Design", "Define test scenarios, valid inputs, and expected outcomes.", C_BLUE),
        ("3. Execute", "Run tests across the frontend UI and backend API.", C_ORANGE),
        ("4. Find Bugs", "Log discrepancies, calculation errors, or display issues.", C_ORANGE),
        ("5. Fix", "Resolve the root cause in Django code or React components.", C_GOLD),
        ("6. Retest", "Rerun tests to verify the fix works and nothing broke.", C_GREEN)
    ]

    s_w = Inches(1.8)
    s_h = Inches(3.2)
    top_9 = Inches(1.8)

    for i, (title, desc, col) in enumerate(steps):
        x = Inches(0.8) + i * Inches(1.98)
        create_card(s9, x, top_9, s_w, s_h)

        # Top indicator bar
        bar = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, top_9, s_w, Inches(0.12))
        bar.fill.solid()
        bar.fill.fore_color.rgb = col
        bar.line.fill.background()

        tb = s9.shapes.add_textbox(x + Inches(0.1), top_9 + Inches(0.2), s_w - Inches(0.2), s_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = col
        p_t.alignment = PP_ALIGN.CENTER

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = C_TEXT_PRIMARY
        p_d.space_before = Pt(12)
        p_d.alignment = PP_ALIGN.CENTER

    # Bottom Summary Box
    sum_card = create_card(s9, Inches(0.8), Inches(5.25), Inches(11.733), Inches(1.5), bg_color=C_CARD_ALT)
    tb_sum = s9.shapes.add_textbox(Inches(1.1), Inches(5.4), Inches(11.1), Inches(1.2))
    tf_sum = tb_sum.text_frame
    tf_sum.word_wrap = True

    p_sh = tf_sum.paragraphs[0]
    p_sh.text = "Key Takeaways From Our Testing Process:"
    p_sh.font.name = "Segoe UI"
    p_sh.font.size = Pt(13)
    p_sh.font.bold = True
    p_sh.font.color.rgb = C_TEXT_HEADING

    p_sb1 = tf_sum.add_paragraph()
    p_sb1.text = "• Early Testing: Planning tests before completing features helped avoid major design mistakes."
    p_sb1.font.name = "Segoe UI"
    p_sb1.font.size = Pt(11.5)
    p_sb1.font.color.rgb = C_TEXT_PRIMARY
    p_sb1.space_before = Pt(4)

    p_sb2 = tf_sum.add_paragraph()
    p_sb2.text = "• Retesting: Whenever a bug was fixed, retesting ensured no regressions were introduced to existing modules."
    p_sb2.font.name = "Segoe UI"
    p_sb2.font.size = Pt(11.5)
    p_sb2.font.color.rgb = C_TEXT_PRIMARY
    p_sb2.space_before = Pt(4)

    s9.notes_slide.notes_text_frame.text = (
        "We followed a straightforward six-step testing workflow: Plan, Design, Execute, Find Bugs, Fix, and Retest. "
        "Retesting is especially important because fixing one bug should never accidentally break another working feature."
    )

    # ==============================================================
    # SLIDE 10: Defect Management and Security
    # ==============================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header_and_branding(s10, 10, "Defect Management & Security Testing", "Resolving Bugs and Protecting Financial Data")

    col_w10 = Inches(5.65)
    col_h10 = Inches(5.0)
    top_10 = Inches(1.8)

    # Left: Defect Management
    create_card(s10, Inches(0.8), top_10, col_w10, col_h10)
    strip_dm = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), top_10, col_w10, Inches(0.12))
    strip_dm.fill.solid()
    strip_dm.fill.fore_color.rgb = C_ORANGE
    strip_dm.line.fill.background()

    tb_dm = s10.shapes.add_textbox(Inches(1.1), top_10 + Inches(0.25), col_w10 - Inches(0.6), col_h10 - Inches(0.5))
    tf_dm = tb_dm.text_frame
    tf_dm.word_wrap = True

    p_dmh = tf_dm.paragraphs[0]
    p_dmh.text = "Defect Management"
    p_dmh.font.name = "Segoe UI"
    p_dmh.font.size = Pt(18)
    p_dmh.font.bold = True
    p_dmh.font.color.rgb = C_ORANGE

    p_dms = tf_dm.add_paragraph()
    p_dms.text = "Systematic resolution of issues"
    p_dms.font.size = Pt(12)
    p_dms.font.color.rgb = C_TEXT_MUTED
    p_dms.space_before = Pt(2)

    dm_steps = [
        "1. Identify: A user reported that entering ₹450 was unexpectedly rejected by the investment modal.",
        "2. Diagnose: Found that HTML min='0.01' without step='any' restricted entries to decimal increments.",
        "3. Fix & Retest: Added step='any' constraint; verified both ₹450 and ₹450.55 save cleanly."
    ]
    for stp in dm_steps:
        p = tf_dm.add_paragraph()
        p.text = stp
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(10)

    # Right: Security Testing
    create_card(s10, Inches(6.85), top_10, col_w10, col_h10)
    strip_sec = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), top_10, col_w10, Inches(0.12))
    strip_sec.fill.solid()
    strip_sec.fill.fore_color.rgb = C_BLUE
    strip_sec.line.fill.background()

    tb_sec = s10.shapes.add_textbox(Inches(7.15), top_10 + Inches(0.25), col_w10 - Inches(0.6), col_h10 - Inches(0.5))
    tf_sec = tb_sec.text_frame
    tf_sec.word_wrap = True

    p_sech = tf_sec.paragraphs[0]
    p_sech.text = "Security Testing"
    p_sech.font.name = "Segoe UI"
    p_sech.font.size = Pt(18)
    p_sech.font.bold = True
    p_sech.font.color.rgb = C_BLUE

    p_secs = tf_sec.add_paragraph()
    p_secs.text = "Protecting personal user records"
    p_secs.font.size = Pt(12)
    p_secs.font.color.rgb = C_TEXT_MUTED
    p_secs.space_before = Pt(2)

    sec_points = [
        "Authentication Security: Password hashing with Django PBKDF2 and protected HTTP session cookies.",
        "Data Isolation: Verified that User A cannot view, edit, or delete accounts belonging to User B.",
        "Input Sanitization: All financial inputs reject negative values, text strings, and malicious script characters."
    ]
    for pt in sec_points:
        p = tf_sec.add_paragraph()
        p.text = "•  " + pt
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(10)

    s10.notes_slide.notes_text_frame.text = (
        "Slide 10 highlights defect management and security testing. When we discovered a bug rejecting ₹450 investments, we quickly identified the HTML step attribute, fixed it, and retested. "
        "For security, we verified password protection, multi-user data isolation, and input sanitization."
    )

    # ==============================================================
    # SLIDE 11: Project Status and Future Improvements
    # ==============================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header_and_branding(s11, 11, "Project Status & Future Scope", "Current Working State and Next Steps")

    col_w11 = Inches(5.65)
    col_h11 = Inches(5.0)
    top_11 = Inches(1.8)

    # Left: Completed / Working Prototype
    create_card(s11, Inches(0.8), top_11, col_w11, col_h11)
    strip_st1 = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), top_11, col_w11, Inches(0.12))
    strip_st1.fill.solid()
    strip_st1.fill.fore_color.rgb = C_GREEN
    strip_st1.line.fill.background()

    tb_st1 = s11.shapes.add_textbox(Inches(1.1), top_11 + Inches(0.25), col_w11 - Inches(0.6), col_h11 - Inches(0.5))
    tf_st1 = tb_st1.text_frame
    tf_st1.word_wrap = True

    p_c1 = tf_st1.paragraphs[0]
    p_c1.text = "Completed & Working Prototype"
    p_c1.font.name = "Segoe UI"
    p_c1.font.size = Pt(18)
    p_c1.font.bold = True
    p_c1.font.color.rgb = C_GREEN

    completed_items = [
        "Core Finance Features: Cash & bank balances, expenses, lending ledger, savings, and investments are fully operational.",
        "Full-Stack Integration: Seamless communication between React UI and Django REST APIs.",
        "Database Persistence: Verified storage and retrieval in cloud PostgreSQL.",
        "Defect Resolution: Resolved input validation and balance calculation issues through testing."
    ]
    for ci in completed_items:
        p = tf_st1.add_paragraph()
        p.text = "✓  " + ci
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(10)

    # Right: Future Improvements
    create_card(s11, Inches(6.85), top_11, col_w11, col_h11)
    strip_st2 = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), top_11, col_w11, Inches(0.12))
    strip_st2.fill.solid()
    strip_st2.fill.fore_color.rgb = C_GOLD
    strip_st2.line.fill.background()

    tb_st2 = s11.shapes.add_textbox(Inches(7.15), top_11 + Inches(0.25), col_w11 - Inches(0.6), col_h11 - Inches(0.5))
    tf_st2 = tb_st2.text_frame
    tf_st2.word_wrap = True

    p_c2 = tf_st2.paragraphs[0]
    p_c2.text = "Planned Future Improvements"
    p_c2.font.name = "Segoe UI"
    p_c2.font.size = Pt(18)
    p_c2.font.bold = True
    p_c2.font.color.rgb = C_GOLD

    future_items = [
        "Mobile UI Polish: Further refinement of mobile bottom navigation and modal layouts.",
        "Performance Optimization: Additional query caching for instant report rendering.",
        "Automated Test Expansion: Adding browser-based automated tests for continuous integration.",
        "SMS Reminders: Direct notifications for pending debts and recurring bill due dates."
    ]
    for fi in future_items:
        p = tf_st2.add_paragraph()
        p.text = "→  " + fi
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_PRIMARY
        p.space_before = Pt(10)

    s11.notes_slide.notes_text_frame.text = (
        "ApnaWallet is currently a working personal finance web application with core features tested and functional. "
        "In the future, we plan to refine mobile responsiveness, expand automated tests, and add direct SMS notifications."
    )

    # ==============================================================
    # SLIDE 12: Conclusion and Thank You
    # ==============================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)

    # Top Bar
    top_bar12 = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.12))
    top_bar12.fill.solid()
    top_bar12.fill.fore_color.rgb = C_ORANGE
    top_bar12.line.fill.background()

    # Main Center Card
    main_12 = create_card(s12, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9), bg_color=C_CARD_BG)

    tb12 = s12.shapes.add_textbox(Inches(1.2), Inches(1.1), Inches(10.933), Inches(5.3))
    tf12 = tb12.text_frame
    tf12.word_wrap = True

    p_badg12 = tf12.paragraphs[0]
    p_badg12.text = "CONCLUSION"
    p_badg12.font.name = "Segoe UI"
    p_badg12.font.size = Pt(12)
    p_badg12.font.bold = True
    p_badg12.font.color.rgb = C_ORANGE
    p_badg12.alignment = PP_ALIGN.CENTER

    p_quote = tf12.add_paragraph()
    p_quote.text = '"ApnaWallet combines practical personal finance management with software testing principles to improve correctness, reliability and security."'
    p_quote.font.name = "Segoe UI"
    p_quote.font.size = Pt(19)
    p_quote.font.bold = True
    p_quote.font.color.rgb = C_TEXT_HEADING
    p_quote.alignment = PP_ALIGN.CENTER
    p_quote.space_before = Pt(12)

    p_div = tf12.add_paragraph()
    p_div.text = "─────────────────────────────────────────"
    p_div.font.size = Pt(11)
    p_div.font.color.rgb = RGBColor(226, 232, 240)
    p_div.alignment = PP_ALIGN.CENTER
    p_div.space_before = Pt(14)

    p_ty = tf12.add_paragraph()
    p_ty.text = "Thank You!"
    p_ty.font.name = "Segoe UI"
    p_ty.font.size = Pt(36)
    p_ty.font.bold = True
    p_ty.font.color.rgb = C_ORANGE
    p_ty.alignment = PP_ALIGN.CENTER
    p_ty.space_before = Pt(10)

    p_qa = tf12.add_paragraph()
    p_qa.text = "Questions & Answers"
    p_qa.font.name = "Segoe UI"
    p_qa.font.size = Pt(16)
    p_qa.font.color.rgb = C_GOLD
    p_qa.font.bold = True
    p_qa.alignment = PP_ALIGN.CENTER
    p_qa.space_before = Pt(4)

    p_team_end = tf12.add_paragraph()
    p_team_end.text = "Presented by: Vishal Keshav Balaji  •  Yogesh S  •  Yuvaaraja N  •  Sujay B S"
    p_team_end.font.name = "Segoe UI"
    p_team_end.font.size = Pt(13)
    p_team_end.font.color.rgb = C_TEXT_MUTED
    p_team_end.alignment = PP_ALIGN.CENTER
    p_team_end.space_before = Pt(14)

    s12.notes_slide.notes_text_frame.text = (
        "In conclusion, ApnaWallet demonstrates that good software testing is essential for building trustworthy financial tools. "
        "By verifying calculations and securing user data, we ensure our users can manage their money with confidence. "
        "Thank you, and we are happy to answer any questions."
    )

    # Save
    out_path = os.path.abspath("ApnaWallet_STQA_Presentation.pptx")
    prs.save(out_path)
    print(f"Deck saved to: {out_path}")

if __name__ == "__main__":
    build_presentation()
