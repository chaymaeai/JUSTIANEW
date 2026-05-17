from django.contrib import admin

from .models import ExpertProfile


@admin.register(ExpertProfile)
class ExpertProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "years_experience", "rating_avg", "is_available")
    raw_id_fields = ("user",)
    search_fields = ("user__email", "bio", "bar_number")
