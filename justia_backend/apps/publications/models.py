import uuid

from ckeditor_uploader.fields import RichTextUploadingField
from django.db import models
from django.utils.text import slugify

from apps.core.mixins import TimestampMixin


class Category(TimestampMixin):
    """Publication categories"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100)
    slug        = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    color       = models.CharField(max_length=7, default='#00B2FF')  # hex color
    icon        = models.CharField(max_length=50, blank=True)        # emoji or icon name
    order       = models.PositiveIntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table  = 'publication_categories'
        ordering  = ['order', 'name']
        verbose_name_plural = 'Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(models.Model):
    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True, blank=True)

    class Meta:
        db_table = 'publication_tags'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Publication(TimestampMixin):
    TYPE_CHOICES = [
        ('article',      'Article'),
        ('etude',        'Étude juridique'),
        ('bulletin',     'Bulletin réglementaire'),
        ('analyse',      'Analyse'),
        ('guide',        'Guide pratique'),
        ('jurisprudence','Jurisprudence commentée'),
        ('rapport',      'Rapport'),
    ]
    STATUS_CHOICES = [
        ('brouillon',  'Brouillon'),
        ('revision',   'En révision'),
        ('planifie',   'Planifié'),
        ('publie',     'Publié'),
        ('archive',    'Archivé'),
    ]
    LANGUAGE_CHOICES = [
        ('fr', 'Français'),
        ('ar', 'العربية'),
        ('en', 'English'),
    ]
    ACCESS_CHOICES = [
        ('public',   'Public — accessible à tous'),
        ('members',  'Membres — connectés uniquement'),
        ('premium',  'Premium — abonnés uniquement'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Content
    title         = models.CharField(max_length=300)
    slug          = models.SlugField(max_length=350, unique=True, blank=True)
    subtitle      = models.CharField(max_length=400, blank=True)
    excerpt       = models.TextField(max_length=600, blank=True)
    content       = RichTextUploadingField(
        config_name="default",
        blank=True,
    )
    reading_time  = models.PositiveIntegerField(default=0)  # auto-calculated (minutes)
    
    # Classification
    pub_type      = models.CharField(max_length=30, choices=TYPE_CHOICES, default='article')
    category      = models.ForeignKey(Category, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='publications')
    tags          = models.ManyToManyField(Tag, blank=True, related_name='publications')
    language      = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default='fr')
    
    # Authorship
    author        = models.ForeignKey('authentication.User', on_delete=models.SET_NULL,
                                       null=True, related_name='publications')
    author_name   = models.CharField(max_length=200, blank=True)  # override display name
    author_bio    = models.TextField(blank=True)                   # short bio for this pub
    
    # Media
    cover_image   = models.ImageField(upload_to='publications/covers/', blank=True, null=True)
    cover_alt     = models.CharField(max_length=200, blank=True)
    pdf_file      = models.FileField(upload_to='publications/pdf/', blank=True, null=True)
    
    # Publishing
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='brouillon')
    access        = models.CharField(max_length=20, choices=ACCESS_CHOICES, default='public')
    is_featured   = models.BooleanField(default=False)   # show in hero/featured row
    is_newsletter = models.BooleanField(default=False)   # include in next newsletter
    published_at  = models.DateTimeField(null=True, blank=True)
    scheduled_at  = models.DateTimeField(null=True, blank=True)  # auto-publish date
    
    # SEO
    meta_title       = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    canonical_url    = models.URLField(blank=True)
    
    # Engagement
    views_count    = models.PositiveIntegerField(default=0)
    shares_count   = models.PositiveIntegerField(default=0)
    
    # Related
    related_publications = models.ManyToManyField('self', blank=True, symmetrical=False)

    class Meta:
        db_table = 'publications'
        ordering = ['-published_at', '-created_at']
        indexes  = [
            models.Index(fields=['status', 'published_at']),
            models.Index(fields=['pub_type', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['is_featured', 'status']),
            models.Index(fields=['slug']),
        ]

    def save(self, *args, **kwargs):
        # Auto-generate slug from title
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            n = 1
            while Publication.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        
        # Auto-calculate reading time (avg 200 words/min)
        from django.utils.html import strip_tags

        raw = self.content or ""
        plain = strip_tags(raw).strip()
        word_count = len(plain.split()) if plain else 0
        self.reading_time = max(1, round(word_count / 200)) if word_count else 1

        # Auto-excerpt if empty
        if not self.excerpt and plain:
            self.excerpt = plain[:300] + "..." if len(plain) > 300 else plain
        
        # Set published_at on first publish
        if self.status == 'publie' and not self.published_at:
            from django.utils import timezone
            self.published_at = timezone.now()
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    def increment_views(self):
        Publication.objects.filter(pk=self.pk).update(
            views_count=models.F('views_count') + 1
        )


class Comment(TimestampMixin):
    """Optional: moderated comments on publications"""
    STATUS_CHOICES = [
        ('en_attente', 'En attente de modération'),
        ('approuve',   'Approuvé'),
        ('rejete',     'Rejeté'),
        ('spam',       'Spam'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    publication   = models.ForeignKey(Publication, on_delete=models.CASCADE,
                                       related_name='comments')
    author        = models.ForeignKey('authentication.User', on_delete=models.SET_NULL,
                                       null=True, blank=True)
    author_name   = models.CharField(max_length=100)
    author_email  = models.EmailField()
    content       = models.TextField(max_length=2000)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES,
                                      default='en_attente')
    parent        = models.ForeignKey('self', on_delete=models.CASCADE,
                                       null=True, blank=True, related_name='replies')
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    moderated_by  = models.ForeignKey('authentication.User', on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='moderated_comments')
    moderated_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'publication_comments'
        ordering = ['created_at']


class NewsletterSubscriber(models.Model):
    """Email subscribers for publication newsletter"""
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email        = models.EmailField(unique=True)
    first_name   = models.CharField(max_length=100, blank=True)
    language     = models.CharField(max_length=5, default='fr')
    is_active    = models.BooleanField(default=True)
    confirmed    = models.BooleanField(default=False)
    confirm_token = models.UUIDField(default=uuid.uuid4, unique=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'newsletter_subscribers'
        ordering = ['-subscribed_at']