FROM python:3.13-alpine

WORKDIR /app

COPY requirements.txt .
RUN apk add --no-cache tzdata && pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY static ./static

ENV PORT=8050
ENV DB_PATH=/app/data/takip.db
ENV TZ=Europe/Istanbul

EXPOSE 8050

VOLUME /app/data

CMD ["python", "app.py"]