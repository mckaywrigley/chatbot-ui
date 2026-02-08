// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import Image from "next/image"
import { IconCheck } from "@tabler/icons-react"
import { LoginForm } from "@/components/ui/login-form"

export const metadata: Metadata = {
  title: "Sign Up - Rooftops AI | AI Tools for Roofing Contractors",
  description:
    "Create your free Rooftops AI account. Get instant roof reports, AI chatbots, and automation tools for your roofing business. 3-day free trial."
}

export default async function Login({
  searchParams
}: {
  searchParams: { message: string; type?: string }
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

    return redirect(`/${(homeWorkspace as any).id}/chat`)
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

    return redirect(`/${(homeWorkspace as any).id}/chat`)
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

    const headersList = headers()
    const host = headersList.get("host")
    const protocol = headersList.get("x-forwarded-proto") || "https"
    const origin = `${protocol}://${host}`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      console.error(error)
      return redirect(`/login?message=${error.message}`)
    }

    // Check if user already exists (Supabase returns empty identities for existing users)
    if (data?.user?.identities?.length === 0) {
      return redirect(
        "/login?message=An account with this email already exists. Please sign in instead."
      )
    }

    return redirect(
      "/login?message=Account created successfully! Check your email for a sign in link.&type=success"
    )

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

  const signInWithGoogle = async () => {
    "use server"

    const headersList = headers()
    const host = headersList.get("host")
    const protocol = headersList.get("x-forwarded-proto") || "https"
    const origin = `${protocol}://${host}`

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect(data.url)
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Hero section with background */}
      <div
        className="relative hidden min-h-screen flex-col justify-between p-12 text-white lg:flex lg:w-1/2"
        style={{
          backgroundImage: "url(/login-background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0f172a"
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-blue-900/80"></div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Logo */}
          <div>
            <Image
              src="/rooftops-logo-gr-master.png"
              alt="Rooftops AI"
              width={180}
              height={40}
              className="mb-16"
            />
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-6 text-5xl font-bold leading-tight">
              The future of
              <br />
              <span className="text-cyan-400">roof intelligence</span>
            </h1>

            <p className="mb-12 max-w-lg text-lg text-gray-300">
              Instantly analyze roof conditions, generate professional reports,
              and close deals faster with our AI-powered platform.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-400/20">
                  <IconCheck size={16} className="text-cyan-400" />
                </div>
                <span className="text-gray-200">
                  Custom AI Chat for your business
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-400/20">
                  <IconCheck size={16} className="text-cyan-400" />
                </div>
                <span className="text-gray-200">Instant Roof Measurements</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-400/20">
                  <IconCheck size={16} className="text-cyan-400" />
                </div>
                <span className="text-gray-200">AI Agent Library</span>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <Image
                src="/man-stock-1.jpg"
                alt="User"
                width={40}
                height={40}
                className="rounded-full border-2 border-slate-900"
              />
              <Image
                src="/man-stock-2.jpg"
                alt="User"
                width={40}
                height={40}
                className="rounded-full border-2 border-slate-900"
              />
              <div className="flex size-10 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-sm font-medium">
                +2k
              </div>
            </div>
            <p className="text-sm text-gray-300">
              Trusted by{" "}
              <span className="font-semibold text-white">
                hundreds of roofing pros
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex min-h-screen w-full flex-col items-center bg-white px-4 pb-16 pt-6 sm:p-8 lg:w-1/2 lg:justify-center lg:py-12 dark:bg-slate-950">
        {/* Mobile logo */}
        <div className="mb-6 flex w-full justify-center lg:hidden">
          <Image
            src="/rooftops-logo-gr-black.png"
            alt="Rooftops AI"
            width={150}
            height={35}
          />
        </div>

        <LoginForm
          signIn={signIn}
          signUp={signUp}
          signInWithGoogle={signInWithGoogle}
          searchParams={searchParams}
        />
      </div>
    </div>
  )
}
