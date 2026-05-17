"""
apps/demandes/state_machine.py
═══════════════════════════════════════════════════════════════
State Machine — Cycle de vie d'un dossier Justia

États réels du modèle Demande.STATUS_CHOICES :
    en_attente  → Dossier créé, en attente d'assignation
    assignee    → Expert désigné
    en_cours    → Expert travaille dessus
    en_revision → En cours de révision
    traitee     → Dossier terminé (état final)
    annulee     → Annulé (état final)

Transitions autorisées :
    en_attente  ──► assignee   (admin)
    assignee    ──► en_cours   (expert, admin)
    en_cours    ──► en_revision (expert, admin)
    en_cours    ──► traitee    (expert, admin)
    en_revision ──► en_cours   (expert, admin)
    en_revision ──► traitee    (expert, admin)
    en_attente  ──► annulee    (client, admin)
    assignee    ──► annulee    (admin)

KPI : 100% valid transitions — aucun saut d'état interdit
═══════════════════════════════════════════════════════════════
"""
from __future__ import annotations
from typing import Dict, List
from django.utils import timezone


# ══════════════════════════════════════════════════════════════
# ÉTATS
# ══════════════════════════════════════════════════════════════

class DS:
    """DossierStatus — valeurs identiques au modèle Demande."""
    EN_ATTENTE  = "en_attente"
    ASSIGNEE    = "assignee"
    EN_COURS    = "en_cours"
    EN_REVISION = "en_revision"
    TRAITEE     = "traitee"
    ANNULEE     = "annulee"

    LABELS = {
        EN_ATTENTE:  "En attente",
        ASSIGNEE:    "Assignée",
        EN_COURS:    "En cours",
        EN_REVISION: "En révision",
        TRAITEE:     "Traitée",
        ANNULEE:     "Annulée",
    }

    COLORS = {
        EN_ATTENTE:  "yellow",
        ASSIGNEE:    "blue",
        EN_COURS:    "purple",
        EN_REVISION: "amber",
        TRAITEE:     "emerald",
        ANNULEE:     "slate",
    }

    # Ordre linéaire pour la timeline (hors annulée)
    TIMELINE = [EN_ATTENTE, ASSIGNEE, EN_COURS, EN_REVISION, TRAITEE]

    # États finaux — aucune transition possible
    FINAL = {TRAITEE, ANNULEE}


# ══════════════════════════════════════════════════════════════
# RÈGLES DE TRANSITION
# ══════════════════════════════════════════════════════════════

# { état_actuel: [états_suivants_autorisés] }
ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    DS.EN_ATTENTE:  [DS.ASSIGNEE, DS.ANNULEE],
    DS.ASSIGNEE:    [DS.EN_COURS, DS.ANNULEE],
    DS.EN_COURS:    [DS.EN_REVISION, DS.TRAITEE],
    DS.EN_REVISION: [DS.EN_COURS, DS.TRAITEE],
    DS.TRAITEE:     [],   # final
    DS.ANNULEE:     [],   # final
}

# { (de, vers): [rôles_autorisés] }
TRANSITION_PERMISSIONS: Dict[tuple, List[str]] = {
    (DS.EN_ATTENTE,  DS.ASSIGNEE):    ["admin"],
    (DS.EN_ATTENTE,  DS.ANNULEE):     ["client", "admin"],
    (DS.ASSIGNEE,    DS.EN_COURS):    ["expert", "admin"],
    (DS.ASSIGNEE,    DS.ANNULEE):     ["admin"],
    (DS.EN_COURS,    DS.EN_REVISION): ["expert", "admin"],
    (DS.EN_COURS,    DS.TRAITEE):     ["expert", "admin"],
    (DS.EN_REVISION, DS.EN_COURS):    ["expert", "admin"],
    (DS.EN_REVISION, DS.TRAITEE):     ["expert", "admin"],
}


# ══════════════════════════════════════════════════════════════
# EXCEPTIONS
# ══════════════════════════════════════════════════════════════

class InvalidTransitionError(Exception):
    def __init__(self, from_status: str, to_status: str):
        self.from_status = from_status
        self.to_status   = to_status
        allowed = ALLOWED_TRANSITIONS.get(from_status, [])
        allowed_labels = [DS.LABELS.get(s, s) for s in allowed]
        super().__init__(
            f"Transition interdite : «{DS.LABELS.get(from_status, from_status)}» "
            f"→ «{DS.LABELS.get(to_status, to_status)}». "
            f"Transitions autorisées : {allowed_labels or 'aucune (état final)'}"
        )


class TransitionPermissionError(Exception):
    def __init__(self, role: str, from_status: str, to_status: str):
        allowed = TRANSITION_PERMISSIONS.get((from_status, to_status), [])
        super().__init__(
            f"Le rôle «{role}» ne peut pas effectuer cette transition. "
            f"Rôles autorisés : {allowed}"
        )


class FinalStateError(Exception):
    def __init__(self, status: str):
        super().__init__(
            f"Le dossier est dans un état final «{DS.LABELS.get(status, status)}». "
            f"Aucune modification possible."
        )


# ══════════════════════════════════════════════════════════════
# STATE MACHINE
# ══════════════════════════════════════════════════════════════

class DossierStateMachine:
    """
    Service centralisé — valide et exécute les transitions d'état.

    Usage :
        from .state_machine import state_machine
        state_machine.transition(demande, "en_cours", request.user)
    """

    def is_valid(self, from_s: str, to_s: str) -> bool:
        return to_s in ALLOWED_TRANSITIONS.get(from_s, [])

    def can_role(self, from_s: str, to_s: str, role: str) -> bool:
        return role in TRANSITION_PERMISSIONS.get((from_s, to_s), [])

    def available(self, current: str) -> List[str]:
        return ALLOWED_TRANSITIONS.get(current, [])

    def available_for_role(self, current: str, role: str) -> List[str]:
        return [t for t in self.available(current) if self.can_role(current, t, role)]

    def transition(self, demande, new_status: str, user) -> dict:
        """
        Valide et applique la transition.

        Returns : dict avec les infos de la transition
        Raises  : FinalStateError | InvalidTransitionError | TransitionPermissionError
        """
        current = demande.status
        role    = getattr(user, "role", "")

        # 1 — État final ?
        if current in DS.FINAL:
            raise FinalStateError(current)

        # 2 — Transition valide structurellement ?
        if not self.is_valid(current, new_status):
            raise InvalidTransitionError(current, new_status)

        # 3 — Rôle autorisé ?
        if not self.can_role(current, new_status, role):
            raise TransitionPermissionError(role, current, new_status)

        # 4 — Appliquer
        now = timezone.now()
        demande.status = new_status

        if new_status == DS.TRAITEE:
            demande.treated_at = now
        elif new_status == DS.EN_COURS and not demande.assigned_at:
            demande.assigned_at = now

        demande.save()

        # 5 — Historique
        self._log(demande, user, current, new_status)

        return {
            "from_status":  current,
            "from_label":   DS.LABELS.get(current, current),
            "to_status":    new_status,
            "to_label":     DS.LABELS.get(new_status, new_status),
            "changed_by":   getattr(user, "full_name", str(user)),
            "changed_at":   now.isoformat(),
            "message":      (
                f"Dossier {demande.reference} : "
                f"{DS.LABELS.get(current)} → {DS.LABELS.get(new_status)}"
            ),
        }

    def _log(self, demande, user, old: str, new: str):
        try:
            from .models import DemandeActivity
            DemandeActivity.objects.create(
                demande   = demande,
                user      = user,
                action    = "status_changed",
                old_value = old,
                new_value = new,
                comment   = (
                    f"Transition : {DS.LABELS.get(old, old)} "
                    f"→ {DS.LABELS.get(new, new)}"
                ),
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception("state_machine._log failed")


# Singleton
state_machine = DossierStateMachine()