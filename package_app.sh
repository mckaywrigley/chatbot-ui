sudo lsof -i -P | grep LISTEN | grep :8001

lsof -P | grep ':8002' | awk '{print $2}' | xargs kill -9
lsof -P | grep ':8001' | awk '{print $2}' | xargs kill -9

wget https://github.com/PremAI-Org/the-ai-box/releases/download/v0.0.19/binaries-macOS.zip
mv binaries-macOS.zip ./src-tauri/binaries/binaries-macOS.zip
unzip ./src-tauri/binaries/binaries-macOS.zip -d ./src-tauri/binaries/

cp .env.local.prem .env.local

npm run tauri dev