#!/bin/bash
# Automated deployment script with D1 migrations
# This script should be used in Cloudflare Pages build settings

set -e  # Exit on error

echo "🔨 Building frontend..."
npm run build

echo "🗄️  Applying D1 migrations..."
npx wrangler d1 migrations apply ai-study-companion-db --remote

echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "✅ Deployment complete!"
