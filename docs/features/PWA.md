# PWA Feature
This feature adds PWA support to application. 

| Feature name  | Description               | Date       | Contributor |
| ------------- | ------------------------- | ---------- | ----------- |
| PWA      | PWA Support via shadowwalker/next-pwa.     |    2023-08-09     |     [martwozniak](https://github.com/martwozniak)        |


## Dependencies

| Name | Link |
| ---- | ---- |
| next-pwa | [repo](https://github.com/shadowwalker/next-pwa)


## manifest.json
```json
{
    "name": "ZENO Chatbot",
    "short_name": "Zeno",
    "description": "ZENO Chatbot is an open source chat for internal AI models.",
    "icons": [
      {
        "src": "/favicon-64x64.png",
        "sizes": "64x64",
        "type": "image/png"
      },
      {
        "src": "/favicon-128x128.png",
        "sizes": "128x128",
        "type": "image/png"
      },
      {
        "src": "/favicon-256x256.png",
        "sizes": "256x256",
        "type": "image/png"
      }
    ],
    "theme_color": "#FFFFFF",
    "background_color": "#FFFFFF",
    "start_url": "/",
    "display": "standalone",
    "orientation": "portrait"
  }
```

---
[Back to all features](../features.md)