#!/usr/bin/env bash
# Windows側のChromeをDevTools用リモートデバッグポート（9235）付きで起動するスクリプト

CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA_DIR="C:\tmp\chrome-dev-profile"
PORT=9235

echo "Starting Windows Chrome with remote debugging on port ${PORT}..."
powershell.exe -NoProfile -Command "
  Start-Process '${CHROME_PATH}' -ArgumentList '--remote-debugging-port=${PORT}', '--user-data-dir=${USER_DATA_DIR}', 'about:blank'
"

echo "Windows Chrome started."
echo "Checking connection to http://127.0.0.1:${PORT}/json/version..."
sleep 2

if curl -s --connect-timeout 3 http://127.0.0.1:${PORT}/json/version > /dev/null; then
  echo "Successfully connected to Chrome DevTools on port ${PORT}!"
else
  echo "Note: If connection fails from WSL, please restart WSL (wsl --shutdown) to apply mirrored networking mode."
fi
