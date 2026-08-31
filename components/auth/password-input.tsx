"use client"

import { IconEye, IconEyeOff } from "@tabler/icons-react"
import { FC, InputHTMLAttributes, useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type PasswordStrength = 0 | 1 | 2 | 3 | 4

/**
 * Lightweight strength score - no zxcvbn dep. Based on length + class
 * variety, which is enough to gate obviously-weak passwords (the
 * common pattern that gets B2C signups locked out on Supabase's
 * server-side check).
 */
export function scorePassword(pwd: string): PasswordStrength {
  if (!pwd) return 0
  let s = 0
  if (pwd.length >= 8) s++
  if (pwd.length >= 12) s++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++
  return Math.min(4, s) as PasswordStrength
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const
const STRENGTH_COLORS = [
  "bg-paper-2", // 0 - empty
  "bg-amber-500",
  "bg-amber-400",
  "bg-emerald-500",
  "bg-emerald-600"
] as const

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string
  showStrength?: boolean
  /** Helper text rendered below; replaced by strength meter when showStrength is on. */
  helper?: string
}

export const PasswordInput: FC<PasswordInputProps> = ({
  label = "Password",
  showStrength = false,
  helper,
  value,
  onChange,
  ...rest
}) => {
  const reactId = useId()
  const id = rest.id ?? `password-${reactId}`
  const [visible, setVisible] = useState(false)
  const pwd = typeof value === "string" ? value : ""
  const strength = scorePassword(pwd)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-ink text-[12.5px] font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="pr-10"
          autoComplete={
            rest.autoComplete ??
            (showStrength ? "new-password" : "current-password")
          }
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="text-ink-3 hover:text-ink absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors"
        >
          {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </button>
      </div>

      {showStrength ? (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map(seg => (
              <span
                key={seg}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  strength >= seg ? STRENGTH_COLORS[strength] : "bg-paper-2"
                )}
              />
            ))}
          </div>
          <span className="text-ink-3 w-[64px] text-right text-[11px] font-medium">
            {pwd ? STRENGTH_LABELS[strength] : ""}
          </span>
        </div>
      ) : helper ? (
        <p className="text-ink-3 text-[11.5px]">{helper}</p>
      ) : null}
    </div>
  )
}
