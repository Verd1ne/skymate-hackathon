#!/bin/bash

# Google Cloud Storage Setup Script
# Creates bucket for video analysis with lifecycle policy

set -e

PROJECT_ID="skymate-477913"
BUCKET_NAME="skymate-video-analysis"
REGION="us-central1"

echo "🪣 Setting up Google Cloud Storage for Video Intelligence"
echo ""
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed"
    echo "Install from: https://cloud.google.com/storage/docs/gsutil_install"
    exit 1
fi

echo "✅ gcloud and gsutil are installed"
echo ""

# Set project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Check if bucket already exists
if gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    echo "⚠️  Bucket gs://$BUCKET_NAME already exists"
    read -p "Do you want to continue and update lifecycle policy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
else
    # Create bucket
    echo "🔨 Creating bucket gs://$BUCKET_NAME..."
    gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME
    echo "✅ Bucket created successfully"
fi

# Set lifecycle policy
echo ""
echo "⚙️  Setting lifecycle policy (auto-delete after 1 day)..."
gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME
echo "✅ Lifecycle policy applied"

# Set CORS policy (if needed for direct uploads from browser)
echo ""
echo "🌐 Setting CORS policy..."
cat > cors.json << EOF
[
  {
    "origin": ["http://localhost:5173", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://$BUCKET_NAME
echo "✅ CORS policy applied"

# Clean up temp file
rm cors.json

# Verify bucket configuration
echo ""
echo "📊 Bucket configuration:"
gsutil ls -L -b gs://$BUCKET_NAME

echo ""
echo "✅ Setup complete!"
echo ""
echo "Bucket URI: gs://$BUCKET_NAME"
echo "Console: https://console.cloud.google.com/storage/browser/$BUCKET_NAME?project=$PROJECT_ID"
echo ""
echo "⚠️  Note: Make sure your service account has the following roles:"
echo "   - Storage Object Admin"
echo "   - Storage Object Creator"
echo ""

