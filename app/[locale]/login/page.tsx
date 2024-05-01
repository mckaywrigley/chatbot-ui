import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoginBrand } from "@/components/ui/login-brand"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Login"
}

export default async function Login({
  searchParams
}: {
  searchParams: { message: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  if (session) {
    const { data: homeWorkspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(error.message)
    }

    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const signIn = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    const { data: homeWorkspace, error: homeWorkspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(
        homeWorkspaceError?.message || "An unexpected error occurred"
      )
    }

    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const getEnvVarOrEdgeConfigValue = async (name: string) => {
    "use server"
    if (process.env.EDGE_CONFIG) {
      return await get<string>(name)
    }

    return process.env[name]
  }

  const signUp = async (formData: FormData) => {
    "use server"

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

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // USE IF YOU WANT TO SEND EMAIL VERIFICATION, ALSO CHANGE TOML FILE
        // emailRedirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      console.error(error)
      return redirect(`/login?message=${error.message}`)
    }

    return redirect("/setup")

    // USE IF YOU WANT TO SEND EMAIL VERIFICATION, ALSO CHANGE TOML FILE
    // return redirect("/login?message=Check email to continue sign in process")
  }

  const handleResetPassword = async (formData: FormData) => {
    "use server"

    const origin = headers().get("origin")
    const email = formData.get("email") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect("/login?message=Check email to reset password")
  }

  return (
    <div className="flex h-[calc(100dvh)] w-full flex-1 flex-col items-center justify-center gap-2 px-8 sm:max-w-md ">
      <form
        className="animate-in text-foreground flex w-full flex-1 flex-col justify-center gap-2 space-y-8"
        action={signIn}
      >
        <LoginBrand />

        <div className="bg-pixelspace-gray-80 flex flex-col p-8 ">
          <Label
            className="text-pixelspace-gray-10 text-sm font-normal leading-[25.20px]"
            htmlFor="email"
          >
            Email
          </Label>
          <Input
            className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 file:bg-pixelspace-pink mb-4 h-[42px] border`}
            name="email"
            placeholder="you@example.com"
            required
          />

          <Label
            className="text-pixelspace-gray-10 text-sm font-normal leading-[25.20px]"
            htmlFor="password"
          >
            Password
          </Label>
          <Input
            className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 mb-8 h-[42px] border`}
            type="password"
            name="password"
            placeholder="••••••••"
          />

          <SubmitButton className="bg-pixelspace-gray-10 text-pixelspace-gray-90 mb-4 rounded-md px-4 py-2">
            Login
          </SubmitButton>

          <SubmitButton
            formAction={signUp}
            className="border-pixelspace-gray-90 border-pixelspace-gray-40 hover:bg-pixelspace-gray-80 bg-pixelspace-gray-90 text-pixelspace-gray-3 mb-4 rounded-md border px-4 py-2"
          >
            Sign Up
          </SubmitButton>

          <div className="text-pixelspace-gray-20 mt-1 flex justify-center text-sm">
            <span className="mr-1">Forgot your password?</span>
            <button
              formAction={handleResetPassword}
              className="text-pixelspace-gray-10 underline-custom ml-1 hover:opacity-80"
            >
              Reset
            </button>
          </div>
        </div>

        {searchParams?.message && (
          <p className="bg-pixelspace-gray-80 text-foreground mt-4 p-4 text-center">
            {searchParams.message}
          </p>
        )}
      </form>
    </div>
  )
}
