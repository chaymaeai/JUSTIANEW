"""Download URLs: local redirect vs S3 presigned."""

from django.conf import settings


def get_presigned_or_media_url(request, document, expires: int = 300) -> str:
    """Return a time-limited S3 URL when using S3 storage; else absolute media URL."""
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or ""
    if bucket and document.file.name:
        try:
            import boto3
            from botocore.client import Config

            s3 = boto3.client(
                "s3",
                region_name=getattr(settings, "AWS_S3_REGION_NAME", "eu-west-1"),
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4"),
            )
            return s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": bucket,
                    "Key": document.file.name,
                },
                ExpiresIn=expires,
            )
        except Exception:
            pass
    if request and document.file:
        return request.build_absolute_uri(document.file.url)
    return document.file.url if document.file else ""
