from rest_framework.response import Response
from rest_framework.views import exception_handler


def _extract_message(data):
    if data is None:
        return "Error"
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return str(data[0]) if data else "Error"
    if isinstance(data, dict):
        if "detail" in data:
            d = data["detail"]
            return _extract_message(d)
        if "non_field_errors" in data:
            return _extract_message(data["non_field_errors"])
        for key, val in data.items():
            if isinstance(val, list) and val:
                return f"{key}: {val[0]}"
            if val is not None:
                return f"{key}: {val}"
    return str(data)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "error": True,
            "status": response.status_code,
            "message": _extract_message(response.data),
            "details": response.data,
        }
    return response
