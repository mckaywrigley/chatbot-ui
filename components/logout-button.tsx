import { logout } from "@/actions/auth"
import { IconLogout } from "@tabler/icons-react"
import { FC } from "react"
import { Button } from "./ui/button"

export const LogoutButton: FC = () => {
  return (
    <Button
      className="text-xs"
      size="sm"
      onClick={async () => {
        await logout()
      }}
    >
      <IconLogout className="mr-1" size={20} />
      Logout
    </Button>
  )
}
