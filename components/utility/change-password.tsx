import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { FC } from "react"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog"
import { Input } from "../ui/input"

interface ChangePasswordProps {
  message: string
}

export const ChangePassword: FC<ChangePasswordProps> = async ({ message }) => {
  return (
    <form
      action={async (formData: FormData) => {
        const cookieStore = cookies()
        const supabase = createClient(cookieStore)

        if (formData.get("newPassword") !== formData.get("confirmPassword")) {
          return redirect("/change-password?message=Passwords do not match")
        }

        await supabase.auth.updateUser({
          password: formData.get("newPassword") as string
        })

        return redirect("/login")
      }}
    >
      <Dialog open={true}>
        <DialogContent className="h-[240px] w-[400px] p-4">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <Input
            name="newPassword"
            placeholder="New Password"
            type="password"
          />

          <Input
            name="confirmPassword"
            placeholder="Confirm Password"
            type="password"
          />

          {message && (
            <p className="bg-foreground/10 text-foreground mt-4 p-4 text-center">
              {message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit">Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
