FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
RUN mkdir -p /app/data
RUN chmod +x /app/entrypoint.sh
EXPOSE 5000
ENV DATABASE_URL="sqlite:////app/data/carton_costing.db"
ENV JWT_SECRET_KEY="change-me-in-production-use-a-long-random-string"
CMD ["/app/entrypoint.sh"]
