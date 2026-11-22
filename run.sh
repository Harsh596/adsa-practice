#!/usr/bin/env bash
set -e

PORT=${1:-${PORT:-8085}}
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================================="
echo "⚡ Starting GCC Code - LeetCode C++ Practice Platform ⚡"
echo "=========================================================="
echo "Requested Port: ${PORT} (auto-fallback if occupied)"
echo "Runtimes:       C++ (g++), Java (OpenJDK), Python 3 (python3), C#"
echo "Problems:       27 questions loaded with multi-language starter templates"
echo "=========================================================="

python3 "${DIR}/backend/app.py" "${PORT}"
