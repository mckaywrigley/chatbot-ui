"use server"

import { createClient } from "@/utils/supabase/server"
import { get } from "@vercel/edge-config"
import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

export const login = async (formData: FormData) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return redirect(`/login?message=${error.message}`)
  }

  revalidatePath("/")
  return redirect("/")
}

export const signUp = async (formData: FormData) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const emailDomainWhitelistPatternsString = await getEnvVarOrEdgeConfigValue(
    "EMAIL_DOMAIN_WHITELIST"
  )
  const emailDomainWhitelist = emailDomainWhitelistPatternsString?.trim()
    ? emailDomainWhitelistPatternsString?.split(",")
    : []
  const emailWhitelistPatternsString =
    await getEnvVarOrEdgeConfigValue("EMAIL_WHITELIST")
  const emailWhitelist = emailWhitelistPatternsString?.trim()
    ? emailWhitelistPatternsString?.split(",")
    : []

  // If there are whitelist patterns, check if the email is allowed to sign up
  if (emailDomainWhitelist.length > 0 || emailWhitelist.length > 0) {
    const domainMatch = emailDomainWhitelist?.includes(email.split("@")[1])
    const emailMatch = emailWhitelist?.includes(email)
    if (!domainMatch && !emailMatch) {
      return redirect(
        `/login?message=Email ${email} is not allowed to sign up.`
      )
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    return redirect(`/login?message=${error.message}`)
  }

  revalidatePath("/")
  return redirect("/")
}

export const logout = async () => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("Error logging out:", error)
  }

  return redirect("/login")
}

export const handleResetPassword = async (formData: FormData) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const origin = headers().get("origin")
  const email = formData.get("email") as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/login/password`
  })

  if (error) {
    return redirect(`/login?message=${error.message}`)
  }

  revalidatePath("/")
  return redirect("/login?message=Check email to reset password")
}

const getEnvVarOrEdgeConfigValue = async (name: string) => {
  if (process.env.EDGE_CONFIG) {
    return await get<string>(name)
  }

  return process.env[name]
}
