import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { Adapter } from "next-auth/adapters";

const prisma = new PrismaClient();

export default NextAuth({
    adapter: PrismaAdapter(prisma) as Adapter<boolean>,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
          if (account) {
            token.accessToken = account.access_token
            token.id = user?.id
          }
          return token
        },
        async session({ session, user, token }) {
            session = {
                ...session,
                user: {
                    id: user.id,
                    ...session.user
                }
            }
            return session
          },
      }      
})