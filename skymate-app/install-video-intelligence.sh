#!/bin/bash

# Video Intelligence Installation Script
# Automates the complete setup process

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🎥 Skymate Video Intelligence Installer              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil is not installed"
    exit 1
fi

echo "✅ All prerequisites installed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install
echo "✅ Backend dependencies installed"
echo ""

# Setup GCS bucket
echo "🪣 Setting up Google Cloud Storage..."
chmod +x setup-gcs.sh
./setup-gcs.sh
echo ""

# Enable Video Intelligence API
echo "🔧 Enabling Video Intelligence API..."
gcloud services enable videointelligence.googleapis.com --project=skymate-477913
echo "✅ Video Intelligence API enabled"
echo ""

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
PORT=3001
GOOGLE_CLOUD_PROJECT_ID=skymate-477913
GCS_BUCKET_NAME=skymate-video-analysis
FRONTEND_URL=http://localhost:5173
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi
echo ""

# Go back to root
cd ..

# Update frontend .env
echo "📝 Updating frontend .env..."
if [ ! -f .env ]; then
    cp env.example .env
fi

# Add video API URL if not present
if ! grep -q "VITE_VIDEO_API_URL" .env; then
    echo "VITE_VIDEO_API_URL=http://localhost:3001" >> .env
    echo "✅ Added VITE_VIDEO_API_URL to .env"
else
    echo "✅ VITE_VIDEO_API_URL already configured"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Installation Complete!                             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Start backend server:"
echo "   cd skymate-app/server"
echo "   npm run dev"
echo ""
echo "2. Start frontend (in another terminal):"
echo "   cd skymate-app"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:5173 and test!"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: VIDEO_INTELLIGENCE_QUICKSTART.md"
echo "   - Testing Guide: VIDEO_INTELLIGENCE_TESTING.md"
echo "   - Implementation: VIDEO_INTELLIGENCE_IMPLEMENTATION.md"
echo ""
echo "🎉 Happy coding!"
echo ""

