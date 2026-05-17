from django.utils import timezone


def test_client_cannot_create_consultation(auth_client, demande, expert_user):
    response = auth_client.post(
        "/api/consultations/",
        {
            "demande": str(demande.id),
            "expert": str(expert_user.id),
            "consultation_type": "visio",
            "scheduled_at": (timezone.now() + timezone.timedelta(days=2)).isoformat(),
            "duration": 45,
        },
        format="json",
    )
    assert response.status_code == 403
