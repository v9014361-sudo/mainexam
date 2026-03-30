#!/usr/bin/env bash
# Render build script to install compilers

echo "📦 Installing dependencies..."
npm install

echo "🔧 Installing compilers for code execution..."

# Install Python (usually pre-installed on Render)
python3 --version || echo "⚠️ Python not found"

# Install GCC for C/C++
apt-get update
apt-get install -y build-essential g++ gcc

# Install Java
apt-get install -y default-jdk

echo "✅ Build complete!"
echo "Installed compilers:"
gcc --version
g++ --version
python3 --version
java -version
