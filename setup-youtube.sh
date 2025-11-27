#!/bin/bash
# Quick setup script for YouTube API integration

echo "🚀 YouTube API Setup Script"
echo "================================"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file already exists"
    echo ""
    echo "Current content:"
    cat .env.local
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Ask for API key
echo ""
echo "📝 Please enter your YouTube API Key:"
echo "(You can find it in: youtube_implement/youtube_api_key.docx)"
echo ""
read -p "API Key: " api_key

# Validate API key format (basic check)
if [[ ! $api_key =~ ^AIza.{35}$ ]]; then
    echo ""
    echo "⚠️  Warning: API key doesn't match expected format (should start with 'AIza' and be 39 characters)"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Create or update .env.local
echo ""
echo "Creating .env.local file..."

# Check if ANTHROPIC_API_KEY already exists in .env.local
if [ -f ".env.local" ]; then
    existing_anthropic=$(grep "ANTHROPIC_API_KEY=" .env.local | cut -d'=' -f2-)
    if [ ! -z "$existing_anthropic" ]; then
        echo "# YouTube Data API v3" > .env.local
        echo "YOUTUBE_API_KEY=$api_key" >> .env.local
        echo "" >> .env.local
        echo "# Claude AI" >> .env.local
        echo "ANTHROPIC_API_KEY=$existing_anthropic" >> .env.local
    else
        echo "# YouTube Data API v3" > .env.local
        echo "YOUTUBE_API_KEY=$api_key" >> .env.local
    fi
else
    echo "# YouTube Data API v3" > .env.local
    echo "YOUTUBE_API_KEY=$api_key" >> .env.local
fi

echo "✅ .env.local created successfully!"
echo ""
echo "================================"
echo "🎉 Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Open: http://localhost:3000"
echo "3. Test YouTube scraping with real bike names"
echo ""
echo "📚 For detailed instructions, see:"
echo "   - YOUTUBE_SETUP_GUIDE.md"
echo "   - YOUTUBE_IMPLEMENTATION_COMPLETE.md"
echo ""

