from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    rate = "5/min"


class SensitiveUserRateThrottle(UserRateThrottle):
    rate = "60/hour"
