def test_documents_list_requires_auth(api_client):
    response = api_client.get("/api/documents/")
    assert response.status_code == 401
