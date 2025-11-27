# Quick setup script for YouTube API integration (PowerShell version)

Write-Host "🚀 YouTube API Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local file already exists" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current content:"
    Get-Content ".env.local"
    Write-Host ""
    $update = Read-Host "Do you want to update it? (y/n)"
    if ($update -ne "y" -and $update -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit
    }
}

# Ask for API key
Write-Host ""
Write-Host "📝 Please enter your YouTube API Key:" -ForegroundColor Yellow
Write-Host "(You can find it in: youtube_implement/youtube_api_key.docx)"
Write-Host ""
$api_key = Read-Host "API Key"

# Validate API key format (basic check)
if ($api_key -notmatch "^AIza.{35}$") {
    Write-Host ""
    Write-Host "⚠️  Warning: API key doesn't match expected format (should start with 'AIza' and be 39 characters)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit
    }
}

# Create or update .env.local
Write-Host ""
Write-Host "Creating .env.local file..." -ForegroundColor Cyan

$content = @"
# YouTube Data API v3
YOUTUBE_API_KEY=$api_key

# Claude AI (add your key if you have one)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
"@

Set-Content -Path ".env.local" -Value $content

Write-Host "✅ .env.local created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run dev"
Write-Host "2. Open: http://localhost:3000"
Write-Host "3. Test YouTube scraping with real bike names"
Write-Host ""
Write-Host "📚 For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "   - YOUTUBE_SETUP_GUIDE.md"
Write-Host "   - YOUTUBE_IMPLEMENTATION_COMPLETE.md"
Write-Host ""

