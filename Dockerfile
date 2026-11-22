FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install GCC, G++, OpenJDK, Python 3, and essential tools
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    gcc \
    default-jdk \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app

ENV PORT=8085
EXPOSE 8085

CMD ["python3", "backend/app.py"]
