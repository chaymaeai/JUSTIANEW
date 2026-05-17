def test_client_can_create_demande(auth_client, monkeypatch):
    from apps.demandes.models import Demande
    from apps.demandes import tasks as demande_tasks

    monkeypatch.setattr(
        demande_tasks.send_demande_confirmation_email, "delay", lambda *args, **kwargs: None
    )
    monkeypatch.setattr(
        demande_tasks.notify_fournisseur_team_new_demande,
        "delay",
        lambda *args, **kwargs: None,
    )
    response = auth_client.post(
        "/api/demandes/",
        {
            "domain": "rgpd",
            "description": "J'ai besoin d'assistance",
            "urgency": "normale",
        },
        format="json",
    )
    assert response.status_code == 201
    demande = Demande.objects.latest("created_at")
    assert demande.reference.startswith("JUS-")


def test_client_cannot_see_other_demande(auth_client, other_demande):
    response = auth_client.get(f"/api/demandes/{other_demande.id}/")
    assert response.status_code in (403, 404)
