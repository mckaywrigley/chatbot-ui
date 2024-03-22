import { ChangePassword } from "@/components/utility/change-password"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ChangePasswordPage({
  searchParams
}: {
  searchParams: { message: string }
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return redirect("/login")
  }

  return <ChangePassword message={searchParams.message} />
}
