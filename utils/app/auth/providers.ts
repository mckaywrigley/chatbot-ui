import {
  APPLE_CLIENT_ID,
  APPLE_CLIENT_SECRET,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  COGNITO_CLIENT_ID,
  COGNITO_CLIENT_SECRET,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITLAB_CLIENT_ID,
  GITLAB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  OKTA_CLIENT_ID,
  OKTA_CLIENT_SECRET,
  REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET,
  SALESFORCE_CLIENT_ID,
  SALESFORCE_CLIENT_SECRET,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET,
} from './constants';

const authorization = {
  params: {
    prompt: 'consent',
    access_type: 'offline',
    response_type: 'code',
  },
};

export async function getProviders() {
  const providers = [];
  if (APPLE_CLIENT_ID) {
    const provider = await import('next-auth/providers/apple');
    const AppleProvider = provider.default;
    providers.push(
      AppleProvider({
        clientId: APPLE_CLIENT_ID!,
        clientSecret: APPLE_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (AUTH0_CLIENT_ID) {
    const provider = await import('next-auth/providers/auth0');
    const Auth0Provider = provider.default;
    providers.push(
      Auth0Provider({
        clientId: AUTH0_CLIENT_ID!,
        clientSecret: AUTH0_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (COGNITO_CLIENT_ID) {
    const provider = await import('next-auth/providers/cognito');
    const CognitoProvider = provider.default;
    providers.push(
      CognitoProvider({
        clientId: COGNITO_CLIENT_ID!,
        clientSecret: COGNITO_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (DISCORD_CLIENT_ID) {
    const provider = await import('next-auth/providers/discord');
    const DiscordProvider = provider.default;
    providers.push(
      DiscordProvider({
        clientId: DISCORD_CLIENT_ID!,
        clientSecret: DISCORD_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (FACEBOOK_CLIENT_ID) {
    const provider = await import('next-auth/providers/facebook');
    const FacebookProvider = provider.default;
    providers.push(
      FacebookProvider({
        clientId: FACEBOOK_CLIENT_ID!,
        clientSecret: FACEBOOK_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (GITHUB_CLIENT_ID) {
    const provider = await import('next-auth/providers/github');
    const GithubProvider = provider.default;
    providers.push(
      GithubProvider({
        clientId: GITHUB_CLIENT_ID!,
        clientSecret: GITHUB_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (GITLAB_CLIENT_ID) {
    const provider = await import('next-auth/providers/gitlab');
    const GitlabProvider = provider.default;
    providers.push(
      GitlabProvider({
        clientId: GITLAB_CLIENT_ID!,
        clientSecret: GITLAB_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (GOOGLE_CLIENT_ID) {
    const provider = await import('next-auth/providers/google');
    const GoogleProvider = provider.default;
    providers.push(
      GoogleProvider({
        clientId: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (OKTA_CLIENT_ID) {
    const provider = await import('next-auth/providers/okta');
    const OktaProvider = provider.default;
    providers.push(
      OktaProvider({
        clientId: OKTA_CLIENT_ID!,
        clientSecret: OKTA_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (REDDIT_CLIENT_ID) {
    const provider = await import('next-auth/providers/reddit');
    const RedditProvider = provider.default;
    providers.push(
      RedditProvider({
        clientId: REDDIT_CLIENT_ID!,
        clientSecret: REDDIT_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (SALESFORCE_CLIENT_ID) {
    const provider = await import('next-auth/providers/salesforce');
    const SalesforceProvider = provider.default;
    providers.push(
      SalesforceProvider({
        clientId: SALESFORCE_CLIENT_ID!,
        clientSecret: SALESFORCE_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (SLACK_CLIENT_ID) {
    const provider = await import('next-auth/providers/slack');
    const SlackProvider = provider.default;
    providers.push(
      SlackProvider({
        clientId: SLACK_CLIENT_ID!,
        clientSecret: SLACK_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (SPOTIFY_CLIENT_ID) {
    const provider = await import('next-auth/providers/spotify');
    const SpotifyProvider = provider.default;
    providers.push(
      SpotifyProvider({
        clientId: SPOTIFY_CLIENT_ID!,
        clientSecret: SPOTIFY_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (TWITCH_CLIENT_ID) {
    const provider = await import('next-auth/providers/twitch');
    const TwitchProvider = provider.default;
    providers.push(
      TwitchProvider({
        clientId: TWITCH_CLIENT_ID!,
        clientSecret: TWITCH_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (TWITTER_CLIENT_ID) {
    const provider = await import('next-auth/providers/twitter');
    const TwitterProvider = provider.default;
    providers.push(
      TwitterProvider({
        clientId: TWITTER_CLIENT_ID!,
        clientSecret: TWITTER_CLIENT_SECRET!,
        authorization: authorization,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  return providers;
}
