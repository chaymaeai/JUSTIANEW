from django.utils import timezone


def test_expert_can_create_invoice(auth_expert, client_user):
    response = auth_expert.post(
        "/api/invoices/",
        {
            "client_id": str(client_user.id),
            "lines": [
                {"description": "Consulting", "quantity": "2.00", "unit_price": "500.00"}
            ],
            "due_date": (timezone.now().date() + timezone.timedelta(days=10)).isoformat(),
            "notes": "Merci",
            "currency": "MAD",
            "send_to_client": False,
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.data["number"].startswith("FAC-")
