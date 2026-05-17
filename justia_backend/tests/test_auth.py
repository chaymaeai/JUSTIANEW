def test_login_returns_tokens(api_client, client_user):
    response = api_client.post(
        "/api/auth/login/",
        {"email": client_user.email, "password": "testpass123"},
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data
