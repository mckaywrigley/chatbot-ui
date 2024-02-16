# Chatbot UI

The open-source AI chat app for everyone.

<img src="./public/readme/screenshot.png" alt="Chatbot UI" width="600">

## Demo

View the latest demo [here](https://x.com/mckaywrigley/status/1738273242283151777?s=20).

## Official Hosted Version

You can find the official hosted version of Chatbot UI [here](https://chatbotui.com).

Basic features are free to use.

We offer a premium tier for advanced features and faster messages to help pay for hosting costs.

## Sponsor

If you find Chatbot UI useful, please consider [sponsoring](https://github.com/sponsors/mckaywrigley) me to support my open-source work :)

## Issues

We restrict "Issues" to actual issues related to the codebase.

We're getting escessive amounts of issues that amount to things like feature requests, cloud provider issues, etc.

If you are having issues with things like setup, please refer to the "Help" section in the "Discussions" tab above.

Issues unrelated to the codebase will likely be closed immediately.

## Discussions

We highly encourage you to participate in the "Discussions" tab above!

Discussions are a great place to ask questions, share ideas, and get help.

Odds are if you have a question, someone else has the same question.

## Legacy Code

Chatbot UI was recently updated to its 2.0 version.

The code for 1.0 can be found on the `legacy` branch.

## Updating

In your terminal at the root of your local Chatbot UI repository, run:

```bash
npm run update
```

If you run a cloud instance of Supabase you'll need to also run:

```bash
npm run db-push
```

If you run a self hosted instance of Supabase you'll need to also run:

```bash
supabase db push --db-url postgres://{user}:{password}@{hostname}:{port}/{database-name}
```

These values can at https://YOUR_SELF_HOSTED_SUPABASE_URL/project/default/settings/database

## Local Quickstart

Follow these steps to get your own Chatbot UI instance running locally.

You can watch the full video tutorial [here](https://www.youtube.com/watch?v=9Qq3-7-HNgw).

### 1. Clone the Repo

```bash
git clone https://github.com/mckaywrigley/chatbot-ui.git
```

### 2. Install Dependencies

Open a terminal in the root directory of your local Chatbot UI repository and run:

```bash
npm install
```

### 3. Install Supabase & Run Locally

#### Why Supabase?

Previously, we used local browser storage to store data. However, this was not a good solution for a few reasons:

- Security issues
- Limited storage
- Limits multi-modal use cases

We now use Supabase because it's easy to use, it's open-source, it's Postgres, and it has a free tier for hosted instances.

We will support other providers in the future to give you more options.

#### 1. Install Docker

You will need to install Docker to run Supabase locally. You can download it [here](https://docs.docker.com/get-docker) for free.

#### 2. Install Supabase CLI

**MacOS**

```bash
brew install supabase/tap/supabase
```

**Linux (Ubuntu)**

Go [here](https://github.com/supabase/cli/releases) and install via package download.

```bash
sudo apt install ./PATH_TO_SUPABASE_CLI.deb
```

**Windows**

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 3. Start Supabase

In your terminal at the root of your local Chatbot UI repository, run:

```bash
supabase start
```

### 4. Fill in Secrets

#### 1. Environment Variables

In your terminal at the root of your local Chatbot UI repository, run:

```bash
cp .env.local.example .env.local
```

Get the required values by running:

```bash
supabase status
```

Note: Use `API URL` from `supabase status` for `NEXT_PUBLIC_SUPABASE_URL`

Now go to your `.env.local` file and fill in the values.

If the environment variable is set, it will disable the input in the user settings.

#### 2. SQL Setup

In the 1st migration file `supabase/migrations/20240108234540_setup.sql` you will need to replace 2 values with the values you got above:

- `project_url` (line 53): `http://supabase_kong_chatbotui:8000` (default) can remain unchanged if you don't change your `project_id` in the `config.toml` file
- `service_role_key` (line 54): You got this value from running `supabase status`

This prevents issues with storage files not being deleted properly.

### 5. Install Ollama (optional for local models)

Follow the instructions [here](https://github.com/jmorganca/ollama#macos).

### 6. Run app locally

In your terminal at the root of your local Chatbot UI repository, run:

```bash
npm run chat
```

Your local instance of Chatbot UI should now be running at [http://localhost:3000](http://localhost:3000). Be sure to use a compatible node version (i.e. v18).

You can view your backend GUI at [http://localhost:54323/project/default/editor](http://localhost:54323/project/default/editor).

## Hosted Quickstart

Follow these steps to get your own Chatbot UI instance running in the cloud.

Video tutorial coming soon.

### 1. Follow Local Quickstart

Repeat steps 1-4 in "Local Quickstart" above.

You will want separate repositories for your local and hosted instances.

Create a new repository for your hosted instance of Chatbot UI on GitHub and push your code to it.

### 2.1 Setup Backend with Cloud Supabase

#### 2.1.1. Create a new project

Go to [Supabase](https://supabase.com/) and create a new project.

#### 2.1.2. Get Project Values

Once you are in the project dashboard, click on the "Project Settings" icon tab on the far bottom left.

Here you will get the values for the following environment variables:

- `Project Ref`: Found in "General settings" as "Reference ID"

- `Project ID`: Found in the URL of your project dashboard (Ex: https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>/settings/general)

While still in "Settings" click on the "API" text tab on the left.

Here you will get the values for the following environment variables:

- `Project URL`: Found in "API Settings" as "Project URL"

- `Anon key`: Found in "Project API keys" as "anon public"

- `Service role key`: Found in "Project API keys" as "service_role" (Reminder: Treat this like a password!)

#### 2.1.3. Configure Auth

Next, click on the "Authentication" icon tab on the far left.

In the text tabs, click on "Providers" and make sure "Email" is enabled.

We recommend turning off "Confirm email" for your own personal instance.

#### 2.1.4. Connect to Hosted DB

Open up your repository for your hosted instance of Chatbot UI.

In the 1st migration file `supabase/migrations/20240108234540_setup.sql` you will need to replace 2 values with the values you got above:

- `project_url` (line 53): Use the `Project URL` value from above
- `service_role_key` (line 54): Use the `Service role key` value from above

Now, open a terminal in the root directory of your local Chatbot UI repository. We will execute a few commands here.

Login to Supabase by running:

```bash
supabase login
```

Next, link your project by running the following command with the "Project ID" you got above:

```bash
supabase link --project-ref <project-id>
```

Your project should now be linked.

Finally, push your database to Supabase by running:

```bash
supabase db push
```

Your hosted database should now be set up!

### 2.2 Setup Backend with Self Hosted Supabase

Generally following [these instructions](https://supabase.com/docs/guides/self-hosting). The instructions below are supposed to be done on a different machine than your frontend. I tested this with Ubuntu 22.04

#### 2.2.1. Install Docker

You will need to install Docker to run Supabase locally. You can download it [here](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) for free.

To get permissions to interact with Docker without needing root access for every command, run

```
sudo usermod -aG docker $USER
```

Then, to log out and log back in for the changes to take effect, run

```
newgrp docker
```

#### 2.2.2. Running Supabase

```bash
# Get the code

git clone --depth 1 https://github.com/supabase/supabase

# Go to the docker folder

cd supabase/docker

# Copy the fake env vars

cp .env.example .env

# Pull the latest images

docker compose pull

# Start the services (in detached mode)

docker compose up -d
```

#### 2.2.3. Install Supabase CLI (Ubuntu)

Go [here](https://github.com/supabase/cli/releases) and install via package download.

```bash
sudo apt install ./PATH_TO_SUPABASE_CLI.deb
```

#### 2.2.4. Secure your services

Create a JWT token

```bash
openssl rand -hex 32
```

Go [here](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys) and create JWT service and anon keys. Follow the rest of the instructions to update API keys and secrets.

When restarting services

```bash
# Stop docker and remove volumes:
docker compose down -v
# Turn docker back on
docker compose up -d
```

#### 2.2.5. Updating the database

If you need to make modifications to the database, use the [Supabase CLI](https://supabase.com/docs/guides/cli). Attach the argument `db-url` when possible with the following value:

```
postgresql://postgres:PASSWORD@IP_ADDR:5432/postgres
```

#### 2.2.6. Updating database environment variables

##### POSTGRES PASSWORD

You can create any POSTGRES_PASSWORD

##### General settings

```
SITE_URL= where the client/frontend is hosted
...
API_EXTERNAL_URL= where the database is hosted
```

If you want to modify the email templates (signup, forget password...), then you'll have to modify the mailer config to point to an HTML function ([resource](https://stackoverflow.com/questions/75236832/how-to-customize-supabase-selfhosted-on-docker-email))

### 3. Setup Frontend with Vercel

**Note**: If you self hosted your database, you'll need to add your database URL to the allowed origins.

```ts
// next.config.js
  experimental: {
    serverActions: {
      allowedOrigins: [
        "http://localhost:3000",
        // add your database url here
      ]
    },
    serverComponentsExternalPackages: ["sharp", "onnxruntime-node"]
  }
```

Go to [Vercel](https://vercel.com/) and create a new project.

In the setup page, import your GitHub repository for your hosted instance of Chatbot UI. Within the project Settings, in the "Build & Development Settings" section, switch Framework Preset to "Next.js".

In environment variables, add the following from the values you got above:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_OLLAMA_URL` (only needed when using local Ollama models; default: `http://localhost:11434`)

You can also add API keys as environment variables.

- `OPENAI_API_KEY`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_GPT_45_VISION_NAME`

For the full list of environment variables, refer to the '.env.local.example' file. If the environment variables are set for API keys, it will disable the input in the user settings.

Click "Deploy" and wait for your frontend to deploy.

Once deployed, you should be able to use your hosted instance of Chatbot UI via the URL Vercel gives you.

## Contributing

We are working on a guide for contributing.

## Contact

Message Mckay on [Twitter/X](https://twitter.com/mckaywrigley)
