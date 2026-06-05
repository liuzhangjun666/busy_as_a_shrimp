FROM python:3.11-slim

WORKDIR /workspace/services/ai-engine-python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY services/ai-engine-python/app ./app
COPY services/ai-engine-python/config ./config
COPY services/ai-engine-python/workflows ./workflows
COPY services/ai-engine-python/pyproject.toml ./pyproject.toml
COPY services/ai-engine-python/README.md ./README.md

RUN pip install --no-cache-dir \
  fastapi \
  uvicorn \
  apscheduler \
  pydantic \
  python-dotenv \
  sqlalchemy \
  pymysql \
  httpx \
  beautifulsoup4 \
  pika \
  aio-pika

EXPOSE 8088
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]
