"""
apps/invoices/invoice_pdf.py
════════════════════════════════════════════════════════════
Génération du PDF de facture — version professionnelle.

Remplace l'ancienne fonction `render_invoice_pdf_bytes` de
apps/invoices/tasks.py (qui utilisait canvas.drawString en
positions fixes, causant des chevauchements de texte quand
les descriptions étaient longues).

Cette version utilise reportlab.platypus (Table + Paragraph),
qui gère automatiquement le retour à la ligne dans les cellules
et empêche tout chevauchement, quelle que soit la longueur du
texte.
════════════════════════════════════════════════════════════
"""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate,
    PageTemplate,
    Frame,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)

# ── Identité visuelle ─────────────────────────────────────────
COMPANY_NAME = "JUSTIA"
COMPANY_TAGLINE = "Conseil & accompagnement juridique"
COMPANY_ADDRESS = "123 Avenue Hassan II, Fès, Maroc"
COMPANY_CONTACT = "contact@justia.ma · +212 5XX XX XX XX"

PRIMARY = colors.HexColor("#0E7490")     # cyan-700
PRIMARY_DARK = colors.HexColor("#155E75")
LIGHT_BG = colors.HexColor("#F1F5F9")    # slate-100
BORDER = colors.HexColor("#E2E8F0")      # slate-200
TEXT_MUTED = colors.HexColor("#64748B")  # slate-500
TEXT_DARK = colors.HexColor("#1E293B")   # slate-800

STATUS_STYLE = {
    "brouillon":  ("Brouillon",   colors.HexColor("#64748B"), colors.HexColor("#F1F5F9")),
    "envoyee":    ("Envoyée",     colors.HexColor("#1D4ED8"), colors.HexColor("#DBEAFE")),
    "en_attente": ("En attente",  colors.HexColor("#B45309"), colors.HexColor("#FEF3C7")),
    "payee":      ("Payée",       colors.HexColor("#15803D"), colors.HexColor("#DCFCE7")),
    "en_retard":  ("En retard",   colors.HexColor("#B91C1C"), colors.HexColor("#FEE2E2")),
    "annulee":    ("Annulée",     colors.HexColor("#94A3B8"), colors.HexColor("#F1F5F9")),
}

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


def _fmt_amount(value, currency="MAD") -> str:
    try:
        num = float(value)
    except (TypeError, ValueError):
        num = 0.0
    s = f"{num:,.2f}".replace(",", " ").replace(".", ",")
    return f"{s} {currency}"


def _fmt_date(d) -> str:
    if not d:
        return "—"
    return d.strftime("%d/%m/%Y")


def _styles():
    base = getSampleStyleSheet()
    styles = {
        "company": ParagraphStyle(
            "company", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=18, textColor=PRIMARY_DARK, leading=20,
        ),
        "tagline": ParagraphStyle(
            "tagline", parent=base["Normal"], fontName="Helvetica",
            fontSize=8.5, textColor=TEXT_MUTED, leading=11,
        ),
        "doc_title": ParagraphStyle(
            "doc_title", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=20, textColor=TEXT_DARK, alignment=TA_RIGHT, leading=22,
        ),
        "doc_number": ParagraphStyle(
            "doc_number", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=TEXT_MUTED, alignment=TA_RIGHT, leading=13,
        ),
        "label": ParagraphStyle(
            "label", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8, textColor=TEXT_MUTED, leading=11,
        ),
        "value": ParagraphStyle(
            "value", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.5, textColor=TEXT_DARK, leading=13,
        ),
        "value_bold": ParagraphStyle(
            "value_bold", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9.5, textColor=TEXT_DARK, leading=13,
        ),
        "th": ParagraphStyle(
            "th", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8.5, textColor=colors.white, leading=11,
        ),
        "th_right": ParagraphStyle(
            "th_right", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8.5, textColor=colors.white, leading=11, alignment=TA_RIGHT,
        ),
        "cell": ParagraphStyle(
            "cell", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=TEXT_DARK, leading=12.5,
        ),
        "cell_right": ParagraphStyle(
            "cell_right", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=TEXT_DARK, leading=12.5, alignment=TA_RIGHT,
        ),
        "total_label": ParagraphStyle(
            "total_label", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.5, textColor=TEXT_MUTED, alignment=TA_RIGHT, leading=14,
        ),
        "total_value": ParagraphStyle(
            "total_value", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9.5, textColor=TEXT_DARK, alignment=TA_RIGHT, leading=14,
        ),
        "ttc_label": ParagraphStyle(
            "ttc_label", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=11.5, textColor=colors.white, alignment=TA_RIGHT, leading=15,
        ),
        "ttc_value": ParagraphStyle(
            "ttc_value", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=11.5, textColor=colors.white, alignment=TA_RIGHT, leading=15,
        ),
        "notes": ParagraphStyle(
            "notes", parent=base["Normal"], fontName="Helvetica-Oblique",
            fontSize=8, textColor=TEXT_MUTED, leading=11,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontName="Helvetica",
            fontSize=7.5, textColor=TEXT_MUTED, alignment=TA_CENTER, leading=10,
        ),
    }
    return styles


def _header_footer(canvas, doc, invoice, styles):
    """Dessine l'en-tête (page 1 uniquement déjà géré via flowables) et le pied de page sur chaque page."""
    canvas.saveState()
    # Pied de page
    footer_y = 14 * mm
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, footer_y + 8, PAGE_W - MARGIN, footer_y + 8)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(
        PAGE_W / 2, footer_y,
        f"{COMPANY_NAME} · {COMPANY_ADDRESS} · {COMPANY_CONTACT}",
    )
    canvas.drawRightString(
        PAGE_W - MARGIN, footer_y - 10,
        f"Page {doc.page}",
    )
    canvas.restoreState()


def render_invoice_pdf_bytes(invoice) -> bytes:
    """Construit le PDF d'une facture et retourne les bytes."""
    styles = _styles()
    buf = BytesIO()

    frame = Frame(
        MARGIN, MARGIN + 12 * mm,
        PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN - 12 * mm,
        id="main",
    )
    doc = BaseDocTemplate(buf, pagesize=A4)
    doc.addPageTemplates([
        PageTemplate(
            id="invoice",
            frames=[frame],
            onPage=lambda c, d: _header_footer(c, d, invoice, styles),
        )
    ])

    story = []

    # ── En-tête : société + titre facture ────────────────────
    status_label, status_fg, status_bg = STATUS_STYLE.get(
        invoice.status, STATUS_STYLE["brouillon"]
    )
    header_tbl = Table(
        [[
            Paragraph(
                f'{COMPANY_NAME}<br/><font color="#64748B" size="8.5">{COMPANY_TAGLINE}</font>',
                styles["company"],
            ),
            Paragraph(
                f'FACTURE<br/><font color="#64748B" size="10">N° {invoice.number}</font>',
                styles["doc_title"],
            ),
        ]],
        colWidths=[(PAGE_W - 2 * MARGIN) * 0.55, (PAGE_W - 2 * MARGIN) * 0.45],
    )
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 4 * mm))

    # Ligne d'accent sous l'en-tête
    accent = Table([[""]], colWidths=[PAGE_W - 2 * MARGIN], rowHeights=[2.2])
    accent.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PRIMARY)]))
    story.append(accent)
    story.append(Spacer(1, 7 * mm))

    # ── Bloc Client / Méta facture ───────────────────────────
    client_name = getattr(invoice.client, "full_name", "") or getattr(invoice.client, "email", "")
    client_email = getattr(invoice.client, "email", "")

    left_block = [
        Paragraph("FACTURÉ À", styles["label"]),
        Spacer(1, 2),
        Paragraph(client_name, styles["value_bold"]),
        Paragraph(client_email, styles["value"]),
    ]

    status_chip = Table(
        [[Paragraph(status_label, ParagraphStyle(
            "chip", fontName="Helvetica-Bold", fontSize=8.5,
            textColor=status_fg, alignment=TA_CENTER,
        ))]],
        colWidths=[28 * mm], rowHeights=[6.5 * mm],
    )
    status_chip.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), status_bg),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))

    right_meta = Table(
        [
            [Paragraph("Date d'émission", styles["label"]), Paragraph(_fmt_date(getattr(invoice, "created_at", None)), styles["value"])],
            [Paragraph("Date d'échéance", styles["label"]), Paragraph(_fmt_date(invoice.due_date), styles["value"])],
            [Paragraph("Devise", styles["label"]), Paragraph(invoice.currency, styles["value"])],
            [Paragraph("Statut", styles["label"]), status_chip],
        ],
        colWidths=[32 * mm, 38 * mm],
    )
    right_meta.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    info_tbl = Table(
        [[left_block, right_meta]],
        colWidths=[(PAGE_W - 2 * MARGIN) * 0.55, (PAGE_W - 2 * MARGIN) * 0.45],
    )
    info_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(info_tbl)
    story.append(Spacer(1, 9 * mm))

    # ── Tableau des lignes ────────────────────────────────────
    col_widths = [
        (PAGE_W - 2 * MARGIN) * 0.46,
        (PAGE_W - 2 * MARGIN) * 0.14,
        (PAGE_W - 2 * MARGIN) * 0.20,
        (PAGE_W - 2 * MARGIN) * 0.20,
    ]

    rows = [[
        Paragraph("DESCRIPTION", styles["th"]),
        Paragraph("QTÉ", styles["th_right"]),
        Paragraph("P.U.", styles["th_right"]),
        Paragraph("TOTAL", styles["th_right"]),
    ]]
    for line in invoice.lines.all():
        rows.append([
            Paragraph(line.description or "—", styles["cell"]),
            Paragraph(f"{line.quantity}", styles["cell_right"]),
            Paragraph(_fmt_amount(line.unit_price, invoice.currency), styles["cell_right"]),
            Paragraph(_fmt_amount(line.total, invoice.currency), styles["cell_right"]),
        ])

    items_tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TOPPADDING", (0, 0), (-1, 0), 7),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    for i in range(1, len(rows)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT_BG))
    items_tbl.setStyle(TableStyle(style_cmds))
    story.append(items_tbl)
    story.append(Spacer(1, 6 * mm))

    # ── Totaux ─────────────────────────────────────────────────
    totals_inner = Table(
        [
            [Paragraph("Sous-total", styles["total_label"]), Paragraph(_fmt_amount(invoice.subtotal, invoice.currency), styles["total_value"])],
            [Paragraph(f"TVA ({invoice.tax_rate}%)", styles["total_label"]), Paragraph(_fmt_amount(invoice.tax_amount, invoice.currency), styles["total_value"])],
        ],
        colWidths=[35 * mm, 40 * mm],
    )
    totals_inner.setStyle(TableStyle([
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    ttc_box = Table(
        [[Paragraph("TOTAL TTC", styles["ttc_label"]), Paragraph(_fmt_amount(invoice.total, invoice.currency), styles["ttc_value"])]],
        colWidths=[35 * mm, 40 * mm],
    )
    ttc_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))

    totals_wrap = Table(
        [[totals_inner], [Spacer(1, 2)], [ttc_box]],
        colWidths=[75 * mm],
    )
    totals_wrap.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    align_right = Table(
        [["", totals_wrap]],
        colWidths=[(PAGE_W - 2 * MARGIN) - 75 * mm, 75 * mm],
    )
    align_right.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(align_right)

    # ── Notes ──────────────────────────────────────────────────
    if getattr(invoice, "notes", ""):
        story.append(Spacer(1, 8 * mm))
        notes_tbl = Table(
            [[Paragraph(f"<b>Notes —</b> {invoice.notes}", styles["notes"])]],
            colWidths=[PAGE_W - 2 * MARGIN],
        )
        notes_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ]))
        story.append(notes_tbl)

    if getattr(invoice, "payment_ref", ""):
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(
            f"Référence de paiement : {invoice.payment_ref}", styles["value"]
        ))

    doc.build(story)
    buf.seek(0)
    return buf.read()