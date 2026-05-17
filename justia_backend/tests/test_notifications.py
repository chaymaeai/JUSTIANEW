def test_unread_count_endpoint(auth_client, notification):
    response = auth_client.get("/api/notifications/unread-count/")
    assert response.status_code == 200
    assert response.data["count"] >= 1
