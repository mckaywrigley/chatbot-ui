import { dockerEnvVarFix } from 'chatbot-ui-core/utils/docker';

const authorization = {
  params: {
    prompt: 'consent',
    access_type: 'offline',
    response_type: 'code',
  },
};

export async function getProviders() {
  const providers = [];
  if (dockerEnvVarFix(process.env.APPLE_CLIENT_ID)) {
    const provider = await import('next-auth/providers/apple');
    const AppleProvider = provider.default;
    providers.push(
      AppleProvider({
        clientId: dockerEnvVarFix(process.env.APPLE_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.APPLE_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.AUTH0_CLIENT_ID)) {
    const provider = await import('next-auth/providers/auth0');
    const Auth0Provider = provider.default;
    providers.push(
      Auth0Provider({
        clientId: dockerEnvVarFix(process.env.AUTH0_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.AUTH0_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.COGNITO_CLIENT_ID)) {
    const provider = await import('next-auth/providers/cognito');
    const CognitoProvider = provider.default;
    providers.push(
      CognitoProvider({
        clientId: dockerEnvVarFix(process.env.COGNITO_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.COGNITO_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.DISCORD_CLIENT_ID)) {
    const provider = await import('next-auth/providers/discord');
    const DiscordProvider = provider.default;
    providers.push(
      DiscordProvider({
        clientId: dockerEnvVarFix(process.env.DISCORD_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.DISCORD_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.FACEBOOK_CLIENT_ID)) {
    const provider = await import('next-auth/providers/facebook');
    const FacebookProvider = provider.default;
    providers.push(
      FacebookProvider({
        clientId: dockerEnvVarFix(process.env.FACEBOOK_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.FACEBOOK_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.GITHUB_CLIENT_ID)) {
    const provider = await import('next-auth/providers/github');
    const GithubProvider = provider.default;
    providers.push(
      GithubProvider({
        clientId: dockerEnvVarFix(process.env.GITHUB_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.GITHUB_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.GITLAB_CLIENT_ID)) {
    const provider = await import('next-auth/providers/gitlab');
    const GitlabProvider = provider.default;
    providers.push(
      GitlabProvider({
        clientId: dockerEnvVarFix(process.env.GITLAB_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.GITLAB_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.GOOGLE_CLIENT_ID)) {
    const provider = await import('next-auth/providers/google');
    const GoogleProvider = provider.default;
    providers.push(
      GoogleProvider({
        clientId: dockerEnvVarFix(process.env.GOOGLE_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.GOOGLE_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.OKTA_CLIENT_ID)) {
    const provider = await import('next-auth/providers/okta');
    const OktaProvider = provider.default;
    providers.push(
      OktaProvider({
        clientId: dockerEnvVarFix(process.env.OKTA_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.OKTA_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.REDDIT_CLIENT_ID)) {
    const provider = await import('next-auth/providers/reddit');
    const RedditProvider = provider.default;
    providers.push(
      RedditProvider({
        clientId: dockerEnvVarFix(process.env.REDDIT_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.REDDIT_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }
  if (dockerEnvVarFix(process.env.SALESFORCE_CLIENT_ID)) {
    const provider = await import('next-auth/providers/salesforce');
    const SalesforceProvider = provider.default;
    providers.push(
      SalesforceProvider({
        clientId: dockerEnvVarFix(process.env.SALESFORCE_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.SALESFORCE_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }

  if (dockerEnvVarFix(process.env.SLACK_CLIENT_ID)) {
    const provider = await import('next-auth/providers/slack');
    const SlackProvider = provider.default;
    providers.push(
      SlackProvider({
        clientId: dockerEnvVarFix(process.env.SLACK_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.SLACK_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }

  if (dockerEnvVarFix(process.env.SPOTIFY_CLIENT_ID)) {
    const provider = await import('next-auth/providers/spotify');
    const SpotifyProvider = provider.default;
    providers.push(
      SpotifyProvider({
        clientId: dockerEnvVarFix(process.env.SPOTIFY_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.SPOTIFY_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }

  if (dockerEnvVarFix(process.env.TWITCH_CLIENT_ID)) {
    const provider = await import('next-auth/providers/twitch');
    const TwitchProvider = provider.default;
    providers.push(
      TwitchProvider({
        clientId: dockerEnvVarFix(process.env.TWITCH_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.TWITCH_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }

  if (dockerEnvVarFix(process.env.TWITTER_CLIENT_ID)) {
    const provider = await import('next-auth/providers/twitter');
    const TwitterProvider = provider.default;
    providers.push(
      TwitterProvider({
        clientId: dockerEnvVarFix(process.env.TWITTER_CLIENT_ID)!,
        clientSecret: dockerEnvVarFix(process.env.TWITTER_CLIENT_SECRET)!,
        authorization: authorization,
      }),
    );
  }

  return providers;
}
