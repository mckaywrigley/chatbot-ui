from pytrends.request import TrendReq


pytrends = TrendReq(hl='en-US', tz=360, timeout=None, proxies=[
    "https://85.25.4.27:8646",
    "https://158.69.73.79:9300",
    "https://64.225.8.191:9992",
    "https://118.69.111.51:8080",
    "https://8.219.97.248:80",
    "https://117.3.241.173:50003",
    "https://113.53.231.133:3129",
    "https://178.33.3.163:8080",
    "https://186.121.235.66:8080",
    "https://35.213.91.45:80",
    "https://47.74.226.8:5001",
    "https://157.245.27.9:3128",
    "https://107.148.94.92:80",
    "https://212.112.113.178:3128",
    "https://5.189.184.6:80",
    "https://115.96.208.124:8080",
    "https://171.227.4.40:50012",
    "https://171.227.6.79:50012",
    "https://117.251.103.186:8080",
    "https://190.61.88.147:8080",
    "https://110.34.3.229:3128",
    "https://185.78.29.99:3128",
    "https://5.161.207.168:3128",
    "https://43.241.69.35:80",
    "https://81.12.44.197:3129",
    "https://154.236.179.226:1981",
    "https://188.40.15.9:3128",
    "https://171.227.7.23:50003",
    "https://103.73.164.190:32650",
    "https://173.176.14.246:3128",
    "https://186.121.235.222:8080",
    "https://13.231.166.96:80",
    "https://3.96.207.185:80"
], retries=2, backoff_factor=0.1, requests_args={'verify': False})

kw_list = ["what"]
pytrends.build_payload(kw_list, cat=0, timeframe='now 4-H', geo='', gprop='')
print(pytrends.related_queries())
