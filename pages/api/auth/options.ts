import type { NextAuthOptions } from "next-auth";
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from "next-auth/providers/credentials";

const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const options: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "用户名:",
          type: "text",
          placeholder: "输入应用名"
        },
        password: {
          label: "密码:",
          type: "password",
          placeholder: "输入密码"
        }
      },
      async authorize(credentials) {
        // This is where you need to retrieve user data
        // to verify with credentials
        // Docs: https://next-auth.js.org/configuration/providers/credentials
        try {
          const res = await fetch(`${backendURL}/api/login`, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: credentials?.username,
              password: credentials?.password,
            })
          });
          const user = await res.json();
          if (user && Object.keys(user).length !== 0) {
            return user;
          } else {
            return null;
          }
        } catch (error) {
          console.error('error', error)
          return null;
        }
      }
    }),

  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      let jsonuser = user;
      if (user && typeof user === 'string') {
        jsonuser = JSON.parse(user as any);
      }
      return { ...token, ...jsonuser }
    },
    async session({ token, session, user }) {
      session.user = token as any;
      return session;
    },
  }
}

