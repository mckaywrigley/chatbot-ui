# Jarvis Client

React front-end for Jarvis AI.

## Building Locally

```shell
docker build -t jarvis-client .
docker run -e JARVISAI_API_HOST=xxxxxxxx JARVISAI_API_KEY=xxxxxxxx -p 3000:3000 jarvis-client
```

## Running Locally

**1. Clone Repo**

```bash
git clone git@github.com:nrccua/jarvis-client.git
```

**2. Install Dependencies**

```bash
npm i
```

**3. Provide API Credentials**

Create a .env.local file in the root of the repo with your API credentials:

```bash
JARVISAI_API_HOST=<API_HOST_HERE>
JARVISAI_API_KEY=<KEY_HERE>
```

**4. Run App**

```bash
npm run dev
```

**5. Use It**

You should be able to start chatting.
