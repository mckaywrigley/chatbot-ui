import { getHomeWorkspace } from "@/actions/workspaces"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()

  if (data.user) {
    const homeWorkspace = await getHomeWorkspace(data.user.id)
    return redirect(`/${homeWorkspace.id}/chat`)
  } else {
    return redirect("/login")
  }

  return <></>
}
