import NextAuth from "next-auth"
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_AUTH_ID,
        clientSecret: process.env.GOOGLE_AUTH_SECRET,
       }),
       GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET
      }),
      AzureADProvider({
        clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID,
        clientSecret: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_SECRET,
        tenantId: process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID
      })
  ],
  pages: {
    signIn: "/auth/login"
  }
}
export default NextAuth(authOptions)