from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from apps.demandes.models import Demande
from apps.consultations.models import Consultation

class RapportGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        rapport_type = request.query_params.get("type", "mensuel")

        try:
            d_from = datetime.strptime(date_from, "%Y-%m-%d")
            d_to = datetime.strptime(date_to, "%Y-%m-%d")
        except (ValueError, TypeError):
            return HttpResponse("Dates invalides", status=400)

        # ── Données ──────────────────────────────────────────
        demandes = Demande.objects.filter(
            created_at__date__gte=d_from,
            created_at__date__lte=d_to
        )
        consultations = Consultation.objects.filter(
            scheduled_at__date__gte=d_from,
            scheduled_at__date__lte=d_to
        )

        # ── Générer le PDF ───────────────────────────────────
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="rapport_{rapport_type}_{date_from}_{date_to}.pdf"'

        doc = SimpleDocTemplate(response, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        # Titre
        elements.append(Paragraph(f"Rapport JUSTIA — {rapport_type.capitalize()}", styles["Title"]))
        elements.append(Paragraph(f"Période : {date_from} → {date_to}", styles["Normal"]))
        elements.append(Spacer(1, 20))

        # Tableau Demandes
        elements.append(Paragraph("Demandes", styles["Heading2"]))
        elements.append(Spacer(1, 10))
        demandes_data = [
            ["Statut", "Nombre"],
            ["Total", str(demandes.count())],
            ["En attente", str(demandes.filter(status="en_attente").count())],
            ["En cours", str(demandes.filter(status="en_cours").count())],
            ["Traitées", str(demandes.filter(status="traitee").count())],
            ["Annulées", str(demandes.filter(status="annulee").count())],
        ]
        table_demandes = Table(demandes_data, colWidths=[300, 100])
        table_demandes.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(table_demandes)
        elements.append(Spacer(1, 20))

        # Tableau Consultations
        elements.append(Paragraph("Consultations", styles["Heading2"]))
        elements.append(Spacer(1, 10))
        consultations_data = [
            ["Statut", "Nombre"],
            ["Total", str(consultations.count())],
            ["Planifiées", str(consultations.filter(status="planifiee").count())],
            ["Terminées", str(consultations.filter(status="terminee").count())],
        ]
        table_consultations = Table(consultations_data, colWidths=[300, 100])
        table_consultations.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(table_consultations)

        doc.build(elements)
        return response