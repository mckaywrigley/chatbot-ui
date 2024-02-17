import { PROFILE_USERNAME_MAX, PROFILE_USERNAME_MIN } from "@/db/limits"
import { Tables } from "@/supabase/types"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLoader2
} from "@tabler/icons-react"
import { FC, useCallback, useState } from "react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { LimitDisplay } from "./ui/limit-display"

interface UsernameInputProps {
  profile: Tables<"profiles">
}

export const UsernameInput: FC<UsernameInputProps> = ({ profile }) => {
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [loadingUsername, setLoadingUsername] = useState(false)

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null

    return (...args: any[]) => {
      const later = () => {
        if (timeout) clearTimeout(timeout)
        func(...args)
      }

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (!username) return

      if (username.length < PROFILE_USERNAME_MIN) {
        setUsernameAvailable(false)
        return
      }

      if (username.length > PROFILE_USERNAME_MAX) {
        setUsernameAvailable(false)
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(username)) {
        setUsernameAvailable(false)
        alert(
          "Username must be letters, numbers, or underscores only - no other characters or spacing allowed."
        )
        return
      }

      setLoadingUsername(true)

      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username })
      })

      const data = await response.json()
      const isAvailable = data.isAvailable

      setUsernameAvailable(isAvailable)

      if (username === profile?.username) {
        setUsernameAvailable(true)
      }

      setLoadingUsername(false)
    }, 500),
    []
  )

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Label>Username</Label>

        <div className="text-xs">
          {username !== profile.username ? (
            usernameAvailable ? (
              <div className="text-green-500">AVAILABLE</div>
            ) : (
              <div className="text-red-500">UNAVAILABLE</div>
            )
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Input
          className="pr-10"
          name="username"
          placeholder="Username..."
          value={profile.username}
          onChange={e => {
            setUsername(e.target.value)
            checkUsernameAvailability(e.target.value)
          }}
          minLength={PROFILE_USERNAME_MIN}
          maxLength={PROFILE_USERNAME_MAX}
        />

        {username !== profile.username ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {loadingUsername ? (
              <IconLoader2 className="animate-spin" />
            ) : usernameAvailable ? (
              <IconCircleCheckFilled className="text-green-500" />
            ) : (
              <IconCircleXFilled className="text-red-500" />
            )}
          </div>
        ) : null}
      </div>

      <LimitDisplay used={username.length} limit={PROFILE_USERNAME_MAX} />
    </div>
  )
}
