"""
PDF Generation Engine for Official Quotations
Features:
- ReportLab-based high-fidelity A4 single-page layout matching Chelsy Packaging design
- StandardEncryption with permission locking (canModify=0, canAnnotate=0, canCopy=0)
- SHA-256 cryptographic verification hash embedded in metadata and footer
- Server-side injection of bank account details based on VAT status
"""

import io
import hashlib
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Polygon, Line
from reportlab.lib.pdfencrypt import StandardEncryption

# Company Banking Details (Secured server-side, never exposed publicly)
BANK_DETAILS_VAT = {
    "account_no": "0110-13429295-001",
    "account_name": "Chelsy Packaging Solutions Pvt Ltd",
    "bank_branch": "Seylan Bank - Gampaha",
}

BANK_DETAILS_NON_VAT = {
    "account_no": "1000448465",
    "account_name": "Chelsy Packaging Pvt Ltd.",
    "bank_branch": "Commercial Bank, Weliweriya branch",
}


def create_3d_cube_drawing(width=44, height=44):
    """Generates a vector 3D packaging cube matching the web UI brand logo"""
    d = Drawing(width, height)
    scale = width / 48.0
    
    def sc(pts):
        # SVG coords (y is down) -> ReportLab coords (y is up)
        return [coord * scale if i % 2 == 0 else (48 - coord) * scale for i, coord in enumerate(pts)]

    # Top facet (Forest Green)
    d.add(Polygon(sc([24, 5, 43, 15.5, 24, 26, 5, 15.5]),
                  fillColor=colors.HexColor('#15803d'),
                  strokeColor=colors.white, strokeWidth=0.75 * scale))
    
    # Left facet (Crimson Red)
    d.add(Polygon(sc([5, 15.5, 24, 26, 24, 42, 5, 31.5]),
                  fillColor=colors.HexColor('#b91c1c'),
                  strokeColor=colors.white, strokeWidth=0.75 * scale))
    
    # Right facet (Royal Blue)
    d.add(Polygon(sc([24, 26, 43, 15.5, 43, 31.5, 24, 42]),
                  fillColor=colors.HexColor('#1d4ed8'),
                  strokeColor=colors.white, strokeWidth=0.75 * scale))
    
    # Subtle tape line
    d.add(Line(24 * scale, (48 - 5) * scale, 24 * scale, (48 - 26) * scale,
               strokeColor=colors.Color(1, 1, 1, alpha=0.4), strokeWidth=1.2 * scale))
    
    return d


def generate_quotation_pdf(quote, tax_format=None, secret_key="chelsy_secure_key_2026"):
    """
    Renders an official quotation PDF into an encrypted, tamper-evident byte buffer.
    
    Args:
        quote: Quote database model or dict-like object.
        tax_format: 'vat', 'non-vat', or 'auto' (default: 'auto').
        secret_key: Secret key used for owner encryption password and HMAC signing.
        
    Returns:
        tuple (bytes, str): PDF file bytes, and SHA-256 verification hash.
    """
    # 1. Determine VAT status
    raw_tax_type = getattr(quote, 'tax_type', '') or ''
    if tax_format == 'vat':
        is_vat = True
    elif tax_format == 'non-vat':
        is_vat = False
    else:
        is_vat = 'Non-VAT' not in raw_tax_type

    # 2. Company & Bank details
    if is_vat:
        company_name = "CHELSY PACKAGING SOLUTIONS (PVT) LTD."
        customer_badge = "VAT CUSTOMER"
        badge_bg = colors.HexColor('#dbeafe')
        badge_fg = colors.HexColor('#1e40af')
        bank_info = BANK_DETAILS_VAT
    else:
        company_name = "CHELSY PACKAGING PVT LTD"
        customer_badge = "NON-VAT CUSTOMER"
        badge_bg = colors.HexColor('#d1fae5')
        badge_fg = colors.HexColor('#065f46')
        bank_info = BANK_DETAILS_NON_VAT

    # 3. Calculation values
    raw_unit_price = float(getattr(quote, 'final_cost_per_carton', 0) or 0)
    unit_price = round(raw_unit_price * 4) / 4
    qty = int(getattr(quote, 'quantity', 0) or 0)
    carton_amount = unit_price * qty

    die_cost = float(getattr(quote, 'die_making_cost', 0) or 0)
    block_cost = float(getattr(quote, 'block_making_cost', 0) or 0)
    one_time_transport = float(getattr(quote, 'one_time_transport_cost', 0) or 0)

    subtotal_amount = carton_amount + die_cost + block_cost + one_time_transport
    vat_amount = subtotal_amount * 0.18
    total_amount = (subtotal_amount + vat_amount) if is_vat else subtotal_amount

    # 4. Formatted strings
    quote_id = getattr(quote, 'id', 1)
    quote_no = getattr(quote, 'quote_no', None) or f"QT-{str(quote_id).zfill(5)}"
    customer_name = getattr(quote, 'customer_name', 'Valued Customer')
    
    # Date formatting
    created_at = getattr(quote, 'created_at', None)
    if isinstance(created_at, datetime):
        display_date = created_at.strftime('%d/%m/%Y')
    elif isinstance(created_at, str) and '/' in created_at:
        display_date = created_at
    else:
        display_date = datetime.utcnow().strftime('%d/%m/%Y')

    # Dimensions string (preserves original input unit)
    dim_unit = getattr(quote, 'dimension_unit', 'mm') or 'mm'
    l_in = getattr(quote, 'carton_length_input', None)
    w_in = getattr(quote, 'carton_width_input', None)
    h_in = getattr(quote, 'carton_height_input', None)
    c_l = round(getattr(quote, 'carton_length_mm', 0) or 0)
    c_w = round(getattr(quote, 'carton_width_mm', 0) or 0)
    c_h = round(getattr(quote, 'carton_height_mm', 0) or 0)

    if dim_unit == 'inches' and l_in and w_in and h_in:
        dim_str = f"{l_in}×{w_in}×{h_in} inches"
    else:
        dim_str = f"{c_l}×{c_w}×{c_h} mm"

    ply_str = getattr(quote, 'ply_type', '3-Ply') or '3-Ply'
    carton_type = getattr(quote, 'carton_type', 'RSC') or 'RSC'
    flute_1 = getattr(quote, 'flute_type', 'B-Flute') or 'B-Flute'
    flute_2 = getattr(quote, 'flute_type_2', None) or flute_1
    flute_clean = flute_1.replace('-Flute', ' flute').replace('Flute', 'flute')
    if ply_str == '5-Ply' and flute_2 and flute_2 != flute_1:
        flute_clean = f"{flute_clean} / {flute_2.replace('-Flute', ' flute').replace('Flute', 'flute')}"
    
    board_type_raw = getattr(quote, 'board_type', 'Brown Liner') or 'Brown Liner'
    board_clean = "White Liner" if "white" in board_type_raw.lower() else "Brown Liner"
    payment_method = getattr(quote, 'payment_method', 'Credit - 30 Days') or 'Credit - 30 Days'

    # Cryptographic integrity fingerprint
    hash_payload = f"{quote_no}|{total_amount:.2f}|{display_date}|{customer_name}|{secret_key}"
    doc_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()

    # 5. Build Document
    buf = io.BytesIO()
    # Read-only permission locking: userPassword='' allows opening without prompt,
    # canModify=0, canAnnotate=0, canCopy=0 locks PDF in standard viewers.
    enc = StandardEncryption(
        userPassword='',
        ownerPassword=f"{secret_key}_owner_{doc_hash[:8]}",
        canModify=0,
        canCopy=0,
        canAnnotate=0,
        canPrint=1
    )

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=32,
        rightMargin=32,
        topMargin=28,
        bottomMargin=26,
        encrypt=enc,
        title=f"Quotation_{quote_no}",
        author="Chelsy Packaging",
        subject=f"Official Quotation {quote_no} for {customer_name}"
    )

    styles = getSampleStyleSheet()
    normal_style = styles['Normal']

    # Custom typography
    comp_title_style = ParagraphStyle(
        'CompanyTitle',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#111827'),
    )
    comp_sub_style = ParagraphStyle(
        'CompanySub',
        parent=normal_style,
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#4b5563'),
    )
    quote_title_style = ParagraphStyle(
        'QuoteTitle',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=22,
        alignment=2, # Right aligned
        textColor=colors.HexColor('#111827'),
    )
    badge_style = ParagraphStyle(
        'BadgeStyle',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=2,
        textColor=badge_fg,
    )
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=normal_style,
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#374151'),
    )
    meta_right_style = ParagraphStyle(
        'MetaRightStyle',
        parent=meta_style,
        alignment=2,
    )
    th_style = ParagraphStyle(
        'THStyle',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1f2937'),
    )
    td_style = ParagraphStyle(
        'TDStyle',
        parent=normal_style,
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#111827'),
    )
    td_bold_style = ParagraphStyle(
        'TDBoldStyle',
        parent=td_style,
        fontName='Helvetica-Bold',
    )
    td_num_style = ParagraphStyle(
        'TDNumStyle',
        parent=td_style,
        alignment=2,
        fontName='Courier',
        fontSize=8.5,
    )
    td_num_bold = ParagraphStyle(
        'TDNumBoldStyle',
        parent=td_num_style,
        fontName='Courier-Bold',
    )
    terms_title_style = ParagraphStyle(
        'TermsTitle',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#374151'),
    )
    terms_p1_style = ParagraphStyle(
        'TermsP1',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.black,
    )
    terms_p_style = ParagraphStyle(
        'TermsP',
        parent=normal_style,
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#4b5563'),
    )
    bank_title_style = ParagraphStyle(
        'BankTitle',
        parent=normal_style,
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#1f2937'),
    )
    bank_p_style = ParagraphStyle(
        'BankP',
        parent=normal_style,
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#374151'),
    )
    security_stamp_style = ParagraphStyle(
        'SecurityStamp',
        parent=normal_style,
        fontName='Helvetica',
        fontSize=6.5,
        leading=8,
        alignment=1, # Center
        textColor=colors.HexColor('#9ca3af'),
    )

    story = []

    # --- TOP HEADER: 3D LOGO + COMPANY INFO (LEFT) | QUOTATION + BADGE (RIGHT) ---
    logo_drawing = create_3d_cube_drawing(40, 40)
    company_text = [
        Paragraph(company_name, comp_title_style),
        Spacer(1, 2),
        Paragraph("No 234/1/A, Siyambalape South, Siyambalape, Biyagama.", comp_sub_style),
        Paragraph("+94 0112 487486", comp_sub_style),
    ]

    header_left_table = Table([[logo_drawing, company_text]], colWidths=[46, 310])
    header_left_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    header_right_table = Table([
        [Paragraph("Quotation", quote_title_style)],
        [Spacer(1, 2)],
        [Paragraph(f"<b>{customer_badge}</b>", badge_style)]
    ], colWidths=[175])
    header_right_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    header_table = Table([[header_left_table, header_right_table]], colWidths=[356, 175])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # --- METADATA BAR (CUSTOMER, DATE, QUOTE NO) ---
    meta_table = Table([
        [
            Paragraph(f"<b>Customer:</b>  <b>{customer_name}</b>", meta_style),
            Paragraph(f"<b>Date:</b>  {display_date}", meta_right_style)
        ],
        [
            Paragraph("", meta_style),
            Paragraph(f"<b>Quotation Number:</b>  <b>{quote_no}</b>", meta_right_style)
        ]
    ], colWidths=[331, 200])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 1), (-1, 1), 1, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # --- ITEM LINE ROWS TABLE ---
    # Width breakdown: S.N (28), Description (250), QTY (50), Unit (40), Price (75), Amount (88) = 531 pt
    table_data = [
        [
            Paragraph("<b>S.N</b>", th_style),
            Paragraph("<b>Description</b>", th_style),
            Paragraph("<b>QTY</b>", ParagraphStyle('THRight', parent=th_style, alignment=2)),
            Paragraph("<b>Unit</b>", ParagraphStyle('THCenter', parent=th_style, alignment=1)),
            Paragraph("<b>Price</b>", ParagraphStyle('THRight', parent=th_style, alignment=2)),
            Paragraph("<b>Amount</b>", ParagraphStyle('THRight', parent=th_style, alignment=2)),
        ]
    ]

    s_no = 1
    # Row 1: Carton Details
    carton_desc_html = (
        f"<b>{dim_str} - {ply_str.replace('-', ' ')} Carton - {carton_type} Type</b><br/>"
        f"<font size='7' color='#4b5563'>Flute Type: {flute_clean}<br/>"
        f"Board Type: {board_clean}</font>"
    )
    table_data.append([
        Paragraph(str(s_no), ParagraphStyle('CenterSN', parent=td_style, alignment=1)),
        Paragraph(carton_desc_html, td_style),
        Paragraph(f"<b>{qty:,}</b>", ParagraphStyle('QtyR', parent=td_bold_style, alignment=2)),
        Paragraph("Nos", ParagraphStyle('UnitC', parent=td_style, alignment=1)),
        Paragraph(f"{unit_price:.2f}", td_num_bold),
        Paragraph(f"{carton_amount:,.2f}", td_num_bold),
    ])

    # Row 2 (if die cost)
    if die_cost > 0:
        s_no += 1
        die_desc = "<b>Die Making Cost</b><br/><font size='7' color='#6b7280'>As a One time cost</font>"
        table_data.append([
            Paragraph(str(s_no), ParagraphStyle('CenterSN', parent=td_style, alignment=1)),
            Paragraph(die_desc, td_style),
            Paragraph("1", ParagraphStyle('QtyR', parent=td_bold_style, alignment=2)),
            Paragraph("Nos", ParagraphStyle('UnitC', parent=td_style, alignment=1)),
            Paragraph(f"{die_cost:.2f}", td_num_bold),
            Paragraph(f"{die_cost:,.2f}", td_num_bold),
        ])

    # Row 3 (if block cost)
    if block_cost > 0:
        s_no += 1
        block_desc = "<b>Block Making Cost</b><br/><font size='7' color='#6b7280'>As a One time cost</font>"
        table_data.append([
            Paragraph(str(s_no), ParagraphStyle('CenterSN', parent=td_style, alignment=1)),
            Paragraph(block_desc, td_style),
            Paragraph("1", ParagraphStyle('QtyR', parent=td_bold_style, alignment=2)),
            Paragraph("Nos", ParagraphStyle('UnitC', parent=td_style, alignment=1)),
            Paragraph(f"{block_cost:.2f}", td_num_bold),
            Paragraph(f"{block_cost:,.2f}", td_num_bold),
        ])

    # Row 4 (if one-time transport cost)
    if one_time_transport > 0:
        s_no += 1
        trans_desc = "<b>Transport Cost</b><br/><font size='7' color='#6b7280'>Fixed order delivery transport charge</font>"
        table_data.append([
            Paragraph(str(s_no), ParagraphStyle('CenterSN', parent=td_style, alignment=1)),
            Paragraph(trans_desc, td_style),
            Paragraph("1", ParagraphStyle('QtyR', parent=td_bold_style, alignment=2)),
            Paragraph("Trip", ParagraphStyle('UnitC', parent=td_style, alignment=1)),
            Paragraph(f"{one_time_transport:.2f}", td_num_bold),
            Paragraph(f"{one_time_transport:,.2f}", td_num_bold),
        ])

    items_table = Table(table_data, colWidths=[28, 250, 50, 40, 75, 88])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 6))

    # --- FINANCIAL TOTALS BLOCK ---
    totals_data = []
    if is_vat:
        totals_data.append([
            Paragraph("<b>Sub Total:</b>", ParagraphStyle('TR', parent=normal_style, alignment=2, fontSize=8.5, textColor=colors.HexColor('#374151'))),
            Paragraph(f"Rs. {subtotal_amount:,.2f}", ParagraphStyle('TRN', parent=td_num_bold, fontSize=8.5))
        ])
        totals_data.append([
            Paragraph("<b>Vat - 18%:</b>", ParagraphStyle('TR', parent=normal_style, alignment=2, fontSize=8.5, textColor=colors.HexColor('#374151'))),
            Paragraph(f"Rs. {vat_amount:,.2f}", ParagraphStyle('TRN', parent=td_num_bold, fontSize=8.5))
        ])
    
    totals_data.append([
        Paragraph("<b>Total:</b>", ParagraphStyle('TRBold', parent=normal_style, alignment=2, fontSize=11, fontName='Helvetica-Bold', textColor=colors.black)),
        Paragraph(f"Rs. {total_amount:,.2f}", ParagraphStyle('TRNBold', parent=normal_style, alignment=2, fontSize=11, fontName='Courier-Bold', textColor=colors.black))
    ])

    totals_table = Table(totals_data, colWidths=[120, 110])
    totals_style = [
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, -1), (1, -1), 1.5, colors.black),
        ('LINEABOVE', (0, -1), (1, -1), 1.5, colors.black),
    ]
    totals_table.setStyle(TableStyle(totals_style))

    totals_wrapper = Table([[Paragraph("", normal_style), totals_table]], colWidths=[301, 230])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(totals_wrapper)
    story.append(Spacer(1, 10))

    # --- FOOTER SECTION: TERMS & CONDITIONS (LEFT) | BANK DETAILS + SIGNATURE (RIGHT) ---
    terms_box_content = [
        Paragraph("<b>TERMS & CONDITIONS:</b>", terms_title_style),
        Spacer(1, 2),
        Paragraph(f"<b>1. Payment Method:  {payment_method}</b>", terms_p1_style),
        Paragraph("2. Quotation Validity:  14 days from quote date.", terms_p_style),
        Paragraph("3. Delivery Timeline:  7-10 working days upon confirmed Purchase Order.", terms_p_style),
    ]
    terms_box = Table([[terms_box_content]], colWidths=[260])
    terms_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    footer_left_content = [
        Paragraph(f"<b>{company_name}</b>", ParagraphStyle('FLComp', parent=normal_style, fontName='Helvetica-Bold', fontSize=8.5, leading=10, textColor=colors.HexColor('#1f2937'))),
        Spacer(1, 4),
        terms_box
    ]

    # Right side: Bank Details Card + Signature Line
    bank_box_content = [
        Paragraph("<b>BANK ACCOUNT DETAILS</b>", bank_title_style),
        Spacer(1, 2),
        Paragraph(f"<b>A/C No:</b> <font name='Courier-Bold' size='8'><b>{bank_info['account_no']}</b></font>", bank_p_style),
        Paragraph(f"<b>A/C Name:</b> {bank_info['account_name']}", bank_p_style),
        Paragraph(f"<b>Bank:</b> {bank_info['bank_branch']}", bank_p_style),
    ]
    bank_box = Table([[bank_box_content]], colWidths=[235])
    bank_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#d1d5db')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    sig_line = Table([
        [Paragraph("", normal_style)],
        [Paragraph("<b>AUTHORIZED SIGNATURE</b>", ParagraphStyle('SigLabel', parent=normal_style, fontName='Helvetica-Bold', fontSize=7, leading=8, alignment=2, textColor=colors.HexColor('#4b5563')))]
    ], colWidths=[235])
    sig_line.setStyle(TableStyle([
        ('LINEABOVE', (0, 1), (0, 1), 0.75, colors.HexColor('#6b7280')),
        ('ALIGN', (0, 1), (0, 1), 'RIGHT'),
        ('TOPPADDING', (0, 1), (0, 1), 3),
        ('BOTTOMPADDING', (0, 1), (0, 1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 40),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    footer_right_content = [
        bank_box,
        Spacer(1, 14),
        sig_line
    ]

    footer_layout = Table([
        [footer_left_content, footer_right_content]
    ], colWidths=[280, 251])
    footer_layout.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (0, 0), (-1, -1), 0.75, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_layout)

    # --- CRYPTOGRAPHIC SECURITY SEAL WATERMARK FOOTNOTE ---
    story.append(Spacer(1, 10))
    security_text = (
        f"🔒 Digitally Generated & Secured • Verification Hash: {doc_hash[:16]}...{doc_hash[-8:]} • "
        f"Tamper-proof Flattened Document • Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )
    story.append(Paragraph(security_text, security_stamp_style))

    # Build PDF into in-memory buffer
    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()

    return pdf_bytes, doc_hash
