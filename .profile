# Heroku environment configuration
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/app/.chrome-for-testing/chrome-linux64/chrome
export CHROME_BIN=/app/.chrome-for-testing/chrome-linux64/chrome
export GOOGLE_CHROME_SHIM=/app/.chrome-for-testing/chrome-linux64/chrome

# Performance optimizations for Heroku
export NODE_OPTIONS="--max-old-space-size=460"
export WEB_MEMORY=512
export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# SSL and TLS settings for production
export NODE_TLS_REJECT_UNAUTHORIZED=1
export DISABLE_SSL_VERIFICATION=false

echo "Environment configured for Heroku deployment" 