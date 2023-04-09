lsof -P | grep ':8002' | awk '{print $2}' | xargs kill -9
lsof -P | grep ':8001' | awk '{print $2}' | xargs kill -9

git clone https://github.com/PremAI-Org/the-ai-box.git
cd ./the-ai-box/cpu/
pip install -r requirements.txt
pyinstaller apis.py

cd ../../

mkdir ./src-tauri/binaries/
cp -r ./the-ai-box/cpu/dist ./src-tauri/binaries/
cp -r ./the-ai-box/cpu/build ./src-tauri/binaries/
cp -r ./the-ai-box/cpu/chat ./src-tauri/
cp ./the-ai-box/cpu/apis.spec ./src-tauri/binaries/

cp .env.local.prem .env.local

npm run tauri dev