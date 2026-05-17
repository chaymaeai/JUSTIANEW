from django.conf import settings
from django.contrib import admin, messages
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html, strip_tags

from .models import Publication, Category, Tag, Comment, NewsletterSubscriber

admin.site.site_header = "🏛️ JUSTIA — Administration"
admin.site.site_title = "JUSTIA Admin"
admin.site.index_title = "Tableau de bord administrateur"


class TagInline(admin.TabularInline):
    model = Publication.tags.through
    extra = 1


def _publication_has_body(pub: Publication) -> bool:
    return bool(strip_tags(str(pub.content or "")).strip())


@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    # List view
    list_display = [
        'title_preview', 'pub_type', 'category', 'author_display',
        'language', 'status_badge', 'access', 'is_featured',
        'views_count', 'published_at', 'actions_col'
    ]
    list_filter  = ['status', 'pub_type', 'category', 'language', 
                    'access', 'is_featured', 'is_newsletter']
    search_fields = ['title', 'subtitle', 'excerpt', 'content', 'author__email']
    ordering     = ['-created_at']
    date_hierarchy = 'published_at'
    
    # Detail view
    readonly_fields  = ['slug', 'reading_time', 'views_count', 'shares_count',
                        'created_at', 'updated_at', 'published_at', 'cover_preview']
    prepopulated_fields = {}  # slug is auto-generated
    
    fieldsets = [
        ('📝 Contenu', {
            'fields': ['title', 'slug', 'subtitle', 'excerpt', 'content']
        }),
        ('🏷️ Classification', {
            'fields': ['pub_type', 'category', 'tags', 'language']
        }),
        ('👤 Auteur', {
            'fields': ['author', 'author_name', 'author_bio']
        }),
        ('🖼️ Médias', {
            'fields': ['cover_image', 'cover_preview', 'cover_alt', 'pdf_file']
        }),
        ('🚀 Publication', {
            'fields': ['status', 'access', 'is_featured', 'is_newsletter',
                       'published_at', 'scheduled_at']
        }),
        ('🔍 SEO', {
            'fields':  ['meta_title', 'meta_description', 'canonical_url'],
            'classes': ['collapse']
        }),
        ('📊 Statistiques', {
            'fields':  ['views_count', 'shares_count', 'reading_time',
                        'created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]

    # Custom column: title preview
    def title_preview(self, obj):
        return format_html(
            '<strong style="max-width:200px;display:block;overflow:hidden;'
            'text-overflow:ellipsis;white-space:nowrap">{}</strong>'
            '<small style="color:#666">{}</small>',
            obj.title, obj.get_pub_type_display()
        )
    title_preview.short_description = 'Titre'

    # Custom column: author
    def author_display(self, obj):
        name = obj.author_name or (obj.author.full_name if obj.author else '—')
        return name
    author_display.short_description = 'Auteur'

    # Custom column: colored status badge
    def status_badge(self, obj):
        colors = {
            'brouillon': '#6B7280',
            'revision':  '#F59E0B',
            'planifie':  '#8B5CF6',
            'publie':    '#10B981',
            'archive':   '#EF4444',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:12px;font-size:11px;font-weight:600">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    # Cover image preview in form
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="max-height:200px;border-radius:8px"/>',
                obj.cover_image.url
            )
        return '—'
    cover_preview.short_description = 'Aperçu couverture'

    # Quick action column
    def actions_col(self, obj):
        if obj.status == 'brouillon':
            return format_html(
                '<a href="/admin/publications/publication/{}/change/" '
                'style="background:#001A33;color:white;padding:3px 8px;'
                'border-radius:4px;font-size:11px">✏️ Éditer</a>',
                obj.pk
            )
        elif obj.status == 'publie':
            base = settings.FRONTEND_URL.rstrip('/')
            return format_html(
                '<a href="{}/publications/{}" target="_blank" '
                'style="background:#10B981;color:white;padding:3px 8px;'
                'border-radius:4px;font-size:11px">👁️ Voir</a>',
                base, obj.slug
            )
        return '—'
    actions_col.short_description = 'Action'

    # Bulk admin actions
    actions = ['publish_selected', 'archive_selected', 
               'mark_featured', 'unmark_featured',
               'include_newsletter', 'exclude_newsletter']

    @admin.action(description='✅ Publier les sélectionnés')
    def publish_selected(self, request, queryset):
        total = queryset.count()
        eligible_pks = [
            str(p.pk)
            for p in queryset.exclude(status="publie")
            if _publication_has_body(p)
        ]
        eligible = len(eligible_pks)
        count = (
            Publication.objects.filter(pk__in=eligible_pks).update(
                status="publie", published_at=timezone.now()
            )
            if eligible_pks
            else 0
        )
        skipped = total - eligible
        if skipped:
            self.message_user(
                request,
                f'{count} publication(s) publiée(s). {skipped} ignorée(s) (déjà publiées ou contenu vide).',
            )
        else:
            self.message_user(request, f'{count} publication(s) publiée(s).')

    @admin.action(description='📦 Archiver les sélectionnés')
    def archive_selected(self, request, queryset):
        count = queryset.update(status='archive')
        self.message_user(request, f'{count} publication(s) archivée(s).')

    @admin.action(description='⭐ Marquer comme featured')
    def mark_featured(self, request, queryset):
        count = queryset.update(is_featured=True)
        self.message_user(request, f'{count} marquée(s) en featured.')

    @admin.action(description='☆ Retirer du featured')
    def unmark_featured(self, request, queryset):
        count = queryset.update(is_featured=False)
        self.message_user(request, f'{count} retirée(s) du featured.')

    @admin.action(description='📧 Inclure dans la newsletter')
    def include_newsletter(self, request, queryset):
        queryset.update(is_newsletter=True)

    @admin.action(description='🔕 Exclure de la newsletter')
    def exclude_newsletter(self, request, queryset):
        queryset.update(is_newsletter=False)

    def get_urls(self):
        urls = super().get_urls()
        info = self.model._meta.app_label, self.model._meta.model_name
        custom = [
            path(
                "dashboard/",
                self.admin_site.admin_view(self.publication_dashboard),
                name="%s_%s_dashboard" % info,
            ),
            path(
                "<uuid:pk>/publish/",
                self.admin_site.admin_view(self.quick_publish),
                name="%s_%s_quick_publish" % info,
            ),
        ]
        return custom + urls

    def publication_dashboard(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        pending_n = Comment.objects.filter(status="en_attente").count()
        subscribers_n = NewsletterSubscriber.objects.filter(
            is_active=True, confirmed=True
        ).count()

        moderation_queue = (
            Comment.objects.filter(status="en_attente")
            .select_related("publication")
            .order_by("-created_at")[:5]
        )

        context = {
            **self.admin_site.each_context(request),
            "title": "📊 Tableau de bord Publications",
            "stats": {
                "total": Publication.objects.count(),
                "publie": Publication.objects.filter(status="publie").count(),
                "brouillon": Publication.objects.filter(status="brouillon").count(),
                "planifie": Publication.objects.filter(status="planifie").count(),
                "this_month": Publication.objects.filter(
                    published_at__gte=month_start,
                    status="publie",
                ).count(),
                "total_views": Publication.objects.aggregate(t=Sum("views_count"))["t"] or 0,
                "pending_comments": pending_n,
                "subscribers": subscribers_n,
            },
            "drafts": Publication.objects.filter(status__in=["brouillon", "revision"])
            .order_by("-updated_at")[:5],
            "scheduled": Publication.objects.filter(status="planifie", scheduled_at__gte=now)
            .order_by("scheduled_at")[:5],
            "top_views": Publication.objects.filter(status="publie")
            .order_by("-views_count")[:5],
            "recent": Publication.objects.filter(status="publie")
            .order_by("-published_at")[:5],
            "moderation_queue": moderation_queue,
        }
        return TemplateResponse(
            request,
            "admin/publications/dashboard.html",
            context,
        )

    def quick_publish(self, request, pk):
        pub = get_object_or_404(Publication, pk=pk)
        if not _publication_has_body(pub):
            messages.error(
                request,
                "Impossible de publier : le contenu est vide.",
            )
            return redirect("admin:publications_publication_changelist")
        pub.status = "publie"
        pub.published_at = timezone.now()
        pub.save()
        if pub.is_newsletter:
            from .tasks import enqueue_publications_task, send_newsletter

            enqueue_publications_task(send_newsletter, str(pub.id))
        messages.success(request, f'✅ « {pub.title} » a été publiée avec succès.')
        return redirect("admin:publications_publication_changelist")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'color_preview', 'icon', 
                     'publications_count', 'is_active', 'order']
    list_editable = ['order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}

    def color_preview(self, obj):
        return format_html(
            '<span style="background:{};width:20px;height:20px;'
            'display:inline-block;border-radius:50%"></span> {}',
            obj.color, obj.color
        )
    color_preview.short_description = 'Couleur'

    def publications_count(self, obj):
        return obj.publications.filter(status='publie').count()
    publications_count.short_description = 'Publications'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'publications_count']
    prepopulated_fields = {'slug': ('name',)}

    def publications_count(self, obj):
        return obj.publications.filter(status='publie').count()
    publications_count.short_description = 'Publications'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display  = ['author_name', 'publication', 'content_preview',
                     'status_badge', 'created_at', 'moderate_actions']
    list_filter   = ['status', 'created_at']
    search_fields = ['author_name', 'author_email', 'content']
    actions       = ['approve_comments', 'reject_comments', 'mark_spam']
    readonly_fields = ['ip_address', 'created_at']

    def content_preview(self, obj):
        return obj.content[:80] + '...' if len(obj.content) > 80 else obj.content
    content_preview.short_description = 'Contenu'

    def status_badge(self, obj):
        colors = {
            'en_attente': '#F59E0B',
            'approuve':   '#10B981',
            'rejete':     '#EF4444',
            'spam':       '#6B7280',
        }
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:12px;font-size:11px">{}</span>',
            colors.get(obj.status, '#6B7280'), obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    def moderate_actions(self, obj):
        if obj.status == 'en_attente':
            return format_html(
                '<a href="?action=approve&id={}" style="color:green">✅ Approuver</a> | '
                '<a href="?action=reject&id={}"  style="color:red">❌ Rejeter</a>',
                obj.pk, obj.pk
            )
        return obj.get_status_display()
    moderate_actions.short_description = 'Actions'

    @admin.action(description='✅ Approuver les commentaires')
    def approve_comments(self, request, queryset):
        queryset.update(status='approuve', moderated_by=request.user,
                        moderated_at=timezone.now())

    @admin.action(description='❌ Rejeter les commentaires')
    def reject_comments(self, request, queryset):
        queryset.update(status='rejete', moderated_by=request.user,
                        moderated_at=timezone.now())

    @admin.action(description='🚫 Marquer comme spam')
    def mark_spam(self, request, queryset):
        queryset.update(status='spam')


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display  = ['email', 'first_name', 'language', 
                     'confirmed', 'is_active', 'subscribed_at']
    list_filter   = ['is_active', 'confirmed', 'language']
    search_fields = ['email', 'first_name']
    readonly_fields = ['confirm_token', 'subscribed_at', 'unsubscribed_at']
    actions = ['export_emails']

    @admin.action(description='📤 Exporter les emails (CSV)')
    def export_emails(self, request, queryset):
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="subscribers.csv"'
        writer = csv.writer(response)
        writer.writerow(['Email', 'Prénom', 'Langue', 'Confirmé', 'Date'])
        for sub in queryset:
            writer.writerow([sub.email, sub.first_name, sub.language,
                             sub.confirmed, sub.subscribed_at])
        return response