from rest_framework.permissions import BasePermission
 
# Ensemble des rôles client (nouveau modèle)
_CLIENT_ROLES = {"client", "client_physique", "client_morale"}
_INTERNAL_ROLES = {"expert", "admin"}
 
 
class IsClient(BasePermission):
    """Client personne physique ou morale (ou ancien rôle 'client')."""
    message = "Accès réservé aux clients."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) in _CLIENT_ROLES
        )
 
 
class IsExpert(BasePermission):
    """Expert uniquement."""
    message = "Accès réservé aux experts."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) == "expert"
        )
 
 
class IsAdmin(BasePermission):
    """Admin uniquement."""
    message = "Accès réservé aux administrateurs."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) == "admin"
        )
 
 
# Alias explicite (utilisé par authentication/views.py)
IsAdminOnly = IsAdmin
 
 
class IsExpertOrAdmin(BasePermission):
    """Expert ou Admin (personnel interne)."""
    message = "Accès réservé au personnel interne."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) in _INTERNAL_ROLES
        )
 
 
# Alias (utilisé par authentication/views.py)
IsAdminOrExpert = IsExpertOrAdmin
 
 
class IsClientOrExpert(BasePermission):
    """Client, Expert ou Admin."""
    message = "Accès non autorisé."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) in (_CLIENT_ROLES | _INTERNAL_ROLES)
        )
 
 
class IsClientOrAdmin(BasePermission):
    """Client ou Admin."""
    message = "Accès non autorisé."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) in (_CLIENT_ROLES | {"admin"})
        )
 
 
# ── Fournisseur (alias vers Expert dans Justia) ────────────────
# apps.consultations.views importe IsFournisseur et
# IsFournisseurOrAdmin — ces alias maintiennent la compatibilité.
 
class IsFournisseur(BasePermission):
    """Alias de IsExpert. Compatibilité apps.consultations."""
    message = "Accès réservé aux experts."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) == "expert"
        )
 
 
# IsFournisseurOrAdmin existait déjà comme alias — on le garde cohérent
class IsFournisseurOrAdmin(BasePermission):
    """Alias de IsExpertOrAdmin. Compatibilité apps.consultations."""
    message = "Accès réservé aux experts et administrateurs."
 
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) in _INTERNAL_ROLES
        )
 
 
# ── Permissions sur objets ─────────────────────────────────────
 
class IsOwnerOrExpert(BasePermission):
    """Propriétaire de l'objet, ou Expert/Admin."""
    message = "Accès non autorisé."
 
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if getattr(request.user, "role", None) in _INTERNAL_ROLES:
            return True
        owner = getattr(obj, "client", None) or getattr(obj, "owner", None)
        return owner == request.user
 
 
# Alias (compatibilité avec l'ancien nom)
IsOwnerOrFournisseur = IsOwnerOrExpert