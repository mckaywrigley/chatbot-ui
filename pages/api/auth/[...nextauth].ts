import NextAuth, { NextAuthOptions } from 'next-auth';
import AppleProvider from 'next-auth/providers/apple';
import Auth0Provider from 'next-auth/providers/auth0';
import CognitoProvider from 'next-auth/providers/cognito';
import DiscordProvider from 'next-auth/providers/discord';
import FacebookProvider from 'next-auth/providers/facebook';
import GithubProvider from 'next-auth/providers/github';
import GitlabProvider from 'next-auth/providers/gitlab';
import GoogleProvider from 'next-auth/providers/google';
import OktaProvider from 'next-auth/providers/okta';
import RedditProvider from 'next-auth/providers/reddit';
import SalesforceProvider from 'next-auth/providers/salesforce';
import SlackProvider from 'next-auth/providers/slack';
import SpotifyProvider from 'next-auth/providers/spotify';
import TwitchProvider from 'next-auth/providers/twitch';
import TwitterProvider from 'next-auth/providers/twitter';

import { dockerEnvVarFix } from 'chatbot-ui-core/utils/docker';

const authorization = {
  params: {
    prompt: 'login',
    access_type: 'offline',
    response_type: 'code',
  },
};
const providers = [];
if (dockerEnvVarFix(process.env.APPLE_CLIENT_ID)) {
  providers.push(
    AppleProvider({
      clientId: dockerEnvVarFix(process.env.APPLE_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.APPLE_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.AUTH0_CLIENT_ID)) {
  providers.push(
    Auth0Provider({
      clientId: dockerEnvVarFix(process.env.AUTH0_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.AUTH0_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.COGNITO_CLIENT_ID)) {
  providers.push(
    CognitoProvider({
      clientId: dockerEnvVarFix(process.env.COGNITO_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.COGNITO_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.DISCORD_CLIENT_ID)) {
  providers.push(
    DiscordProvider({
      clientId: dockerEnvVarFix(process.env.DISCORD_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.DISCORD_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.FACEBOOK_CLIENT_ID)) {
  providers.push(
    FacebookProvider({
      clientId: dockerEnvVarFix(process.env.FACEBOOK_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.FACEBOOK_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.GITHUB_CLIENT_ID)) {
  providers.push(
    GithubProvider({
      clientId: dockerEnvVarFix(process.env.GITHUB_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.GITHUB_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.GITLAB_CLIENT_ID)) {
  providers.push(
    GitlabProvider({
      clientId: dockerEnvVarFix(process.env.GITLAB_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.GITLAB_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.GOOGLE_CLIENT_ID)) {
  providers.push(
    GoogleProvider({
      clientId: dockerEnvVarFix(process.env.GOOGLE_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.GOOGLE_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.OKTA_CLIENT_ID)) {
  providers.push(
    OktaProvider({
      clientId: dockerEnvVarFix(process.env.OKTA_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.OKTA_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.REDDIT_CLIENT_ID)) {
  providers.push(
    RedditProvider({
      clientId: dockerEnvVarFix(process.env.REDDIT_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.REDDIT_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}
if (dockerEnvVarFix(process.env.SALESFORCE_CLIENT_ID)) {
  providers.push(
    SalesforceProvider({
      clientId: dockerEnvVarFix(process.env.SALESFORCE_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.SALESFORCE_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}

if (dockerEnvVarFix(process.env.SLACK_CLIENT_ID)) {
  providers.push(
    SlackProvider({
      clientId: dockerEnvVarFix(process.env.SLACK_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.SLACK_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}

if (dockerEnvVarFix(process.env.SPOTIFY_CLIENT_ID)) {
  providers.push(
    SpotifyProvider({
      clientId: dockerEnvVarFix(process.env.SPOTIFY_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.SPOTIFY_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}

if (dockerEnvVarFix(process.env.TWITCH_CLIENT_ID)) {
  providers.push(
    TwitchProvider({
      clientId: dockerEnvVarFix(process.env.TWITCH_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.TWITCH_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}

if (dockerEnvVarFix(process.env.TWITTER_CLIENT_ID)) {
  providers.push(
    TwitterProvider({
      clientId: dockerEnvVarFix(process.env.TWITTER_CLIENT_ID)!,
      clientSecret: dockerEnvVarFix(process.env.TWITTER_CLIENT_SECRET)!,
      authorization: authorization,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers: providers,
  session: { strategy: 'jwt' },
};

export default NextAuth(authOptions);
