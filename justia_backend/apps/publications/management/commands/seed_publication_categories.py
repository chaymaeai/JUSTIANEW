from django.core.management.base import BaseCommand

from apps.publications.models import Category


class Command(BaseCommand):
    help = "Seed default publication categories"

    def handle(self, *args, **options):
        categories = [
            {"name": "Droit des affaires", "slug": "droit-affaires", "color": "#00B2FF", "icon": "⚖️", "order": 1},
            {"name": "RGPD & Cybersécurité", "slug": "rgpd", "color": "#00D4AA", "icon": "🔒", "order": 2},
            {"name": "Droit de l'IA", "slug": "droit-ia", "color": "#8B5CF6", "icon": "🤖", "order": 3},
            {"name": "Propriété intellectuelle", "slug": "propriete-intel", "color": "#F59E0B", "icon": "💡", "order": 4},
            {"name": "Droit du numérique", "slug": "droit-numerique", "color": "#2979FF", "icon": "🌐", "order": 5},
            {"name": "Immobilier & Urbanisme", "slug": "immobilier", "color": "#10B981", "icon": "🏠", "order": 6},
            {"name": "Gouvernance & Conformité", "slug": "gouvernance", "color": "#EF4444", "icon": "🏛️", "order": 7},
        ]
        for cat in categories:
            Category.objects.get_or_create(slug=cat["slug"], defaults=cat)
        self.stdout.write(self.style.SUCCESS(f"Categories ready ({Category.objects.count()} total)."))
