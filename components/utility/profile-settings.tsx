import { ChatbotUIContext } from "@/context/context"
import {
  PROFILE_CONTEXT_MAX,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { uploadProfileImage } from "@/db/storage/profile-images"
import { exportLocalStorageAsJSON } from "@/lib/export-old-data"
import { OPEN_BILLING_EVENT } from "@/lib/billing/handle-budget-error"
import { supabase } from "@/lib/supabase/browser-client"
import { cn } from "@/lib/utils"
import {
  IconBell,
  IconChartBar,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconDatabase,
  IconFileDownload,
  IconFlask,
  IconLoader2,
  IconLogout,
  IconPalette,
  IconShieldLock,
  IconSparkles,
  IconTrash,
  IconUser,
  IconX,
  type TablerIconsProps
} from "@tabler/icons-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  FC,
  FunctionComponent,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react"
import { toast } from "sonner"
import { AffiliatePanel } from "../billing/affiliate-panel"
import { UsageBillingPanel } from "../billing/usage-billing-panel"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog"
import ImagePicker from "../ui/image-picker"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import { TextareaAutosize } from "../ui/textarea-autosize"
import {
  DEFAULT_LAB_STANDARDS,
  DEFAULT_NOTIFICATIONS,
  getLabStandards,
  getNotificationPrefs,
  setLabStandards,
  setNotificationPrefs,
  type LabStandards,
  type NotificationPrefs
} from "@/lib/settings/preferences"

interface ProfileSettingsProps {
  /**
   * When supplied, makes the dialog a controlled component. The default
   * built-in trigger (user avatar) is hidden - caller renders their own
   * trigger and calls `onOpenChange(true)`. Used by the sidebar
   * Settings + 3-dot-menu buttons in the app-sidebar.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type PageId =
  | "account"
  | "personalization"
  | "appearance"
  | "lab"
  | "notifications"
  | "usage"
  | "data"

interface NavItemDef {
  id: PageId
  label: string
  icon: FunctionComponent<TablerIconsProps>
  title: string
  subtitle: string
}

// Claude-style settings: a left nav rail of pages + a content pane. Each page
// is a focused slice of profile/app settings. (The old per-provider "API Keys"
// tab was removed - Shadow AI uses server-side keys, users never set their own.)
const NAV: NavItemDef[] = [
  {
    id: "account",
    label: "Account",
    icon: IconUser,
    title: "Account",
    subtitle: "Your profile and how you appear across Shadow AI."
  },
  {
    id: "personalization",
    label: "Personalization",
    icon: IconSparkles,
    title: "Personalization",
    subtitle: "Help the AI tailor its responses to you and your work."
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: IconPalette,
    title: "Appearance",
    subtitle: "Customize how Shadow AI looks."
  },
  {
    id: "lab",
    label: "Lab standards",
    icon: IconFlask,
    title: "Lab standards & defaults",
    subtitle:
      "Defaults applied to every generated design - replicates, statistics, controls, and documentation."
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: IconBell,
    title: "Notifications",
    subtitle: "Choose when Shadow AI lets you know about long-running work."
  },
  {
    id: "usage",
    label: "Usage & billing",
    icon: IconChartBar,
    title: "Usage & billing",
    subtitle: "Track usage, manage your plan, and the creator program."
  },
  {
    id: "data",
    label: "Data & account",
    icon: IconDatabase,
    title: "Data & account",
    subtitle: "Export your data, manage your session, or delete your account."
  }
]

export const ProfileSettings: FC<ProfileSettingsProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const { profile, setProfile } = useContext(ChatbotUIContext)

  const router = useRouter()

  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = (next: boolean) => {
    if (isControlled) controlledOnOpenChange?.(next)
    else setInternalOpen(next)
  }

  // Active page - controlled so the "out of credits" toast can deep-link
  // straight to Usage & billing via the OPEN_BILLING_EVENT window event.
  const [page, setPage] = useState<PageId>("account")
  useEffect(() => {
    const openBilling = () => {
      setPage("usage")
      setIsOpen(true)
    }
    window.addEventListener(OPEN_BILLING_EVENT, openBilling)
    return () => window.removeEventListener(OPEN_BILLING_EVENT, openBilling)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [loadingUsername, setLoadingUsername] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(
    profile?.image_url || ""
  )
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)

  // The signed-in email lives on the auth user, not the profile row. Load it
  // lazily when the dialog opens so the Account page can show it (read-only).
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? "")
    })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      let profileImageUrl = profile.image_url
      let profileImagePath = ""

      if (profileImageFile) {
        const { path, url } = await uploadProfileImage(
          profile,
          profileImageFile
        )
        profileImageUrl = url ?? profileImageUrl
        profileImagePath = path
      }

      const updatedProfile = await updateProfile(profile.id, {
        ...profile,
        display_name: displayName,
        username,
        profile_context: profileInstructions,
        image_url: profileImageUrl,
        image_path: profileImagePath
      })

      setProfile(updatedProfile)
      toast.success("Settings saved")
      setIsOpen(false)
    } catch (e) {
      console.error("Failed to save settings:", e)
      toast.error("Couldn't save your settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

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

  // STABLE debounced check so successive keystrokes coalesce into one request.
  const checkUsernameAvailability = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!value) return

        if (value.length < PROFILE_USERNAME_MIN) {
          setUsernameAvailable(false)
          return
        }

        if (value.length > PROFILE_USERNAME_MAX) {
          setUsernameAvailable(false)
          return
        }

        const usernameRegex = /^[a-zA-Z0-9_]+$/
        if (!usernameRegex.test(value)) {
          setUsernameAvailable(false)
          toast.error(
            "Username must be letters, numbers, or underscores only - no other characters or spacing allowed."
          )
          return
        }

        setLoadingUsername(true)

        const response = await fetch(`/api/username/available`, {
          method: "POST",
          body: JSON.stringify({ username: value })
        })

        const data = await response.json()
        const isAvailable = data.isAvailable

        setUsernameAvailable(isAvailable)

        if (value === profile?.username) {
          setUsernameAvailable(true)
        }

        setLoadingUsername(false)
      }, 500),
    // Built once for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  if (!profile) return null

  const usernameChanged = username !== profile.username
  const canSave = usernameAvailable && !loadingUsername && !saving
  const showFooter = page === "account" || page === "personalization"
  const meta = NAV.find(n => n.id === page) ?? NAV[0]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {profile.image_url ? (
            <Image
              className="mt-2 size-[34px] cursor-pointer rounded hover:opacity-50"
              src={profile.image_url + "?" + new Date().getTime()}
              height={34}
              width={34}
              alt={"Profile"}
            />
          ) : (
            <Button size="icon" variant="ghost">
              <IconUser size={26} />
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent
        aria-describedby={undefined}
        className="bg-paper flex h-[82vh] max-h-[680px] w-full max-w-[940px] gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* ---- Left nav rail ---- */}
        <aside className="border-line bg-paper-2 flex w-[230px] shrink-0 flex-col border-r">
          <div className="px-4 pb-1 pt-5">
            <div className="text-ink text-[15px] font-semibold tracking-tight">
              Settings
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {NAV.map(item => {
              const active = item.id === page
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[14px] transition-colors",
                    active
                      ? "bg-paper-3 text-ink font-medium"
                      : "text-ink-2 hover:bg-paper-3"
                  )}
                >
                  <span className={active ? "text-ink" : "text-ink-3"}>
                    <Icon size={17} />
                  </span>
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Account chip + sign out */}
          <div className="border-line border-t p-3">
            <div className="flex items-center gap-2.5 px-1 pb-2">
              {profile.image_url ? (
                <Image
                  className="size-8 shrink-0 rounded-full object-cover"
                  src={profile.image_url + "?" + new Date().getTime()}
                  height={32}
                  width={32}
                  alt="You"
                />
              ) : (
                <div className="bg-paper-3 text-ink-2 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <IconUser size={16} />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-ink truncate text-[13px] font-medium">
                  {profile.display_name || profile.username || "You"}
                </div>
                {email && (
                  <div className="text-ink-3 truncate text-[11px]">{email}</div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-ink-2 hover:bg-paper-3 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors"
            >
              <IconLogout size={15} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ---- Content pane ---- */}
        <section className="bg-paper flex min-w-0 flex-1 flex-col">
          <header className="border-line flex items-start justify-between border-b px-6 py-4">
            <div className="min-w-0">
              <h2 className="text-ink text-lg font-semibold tracking-tight">
                {meta.title}
              </h2>
              <p className="text-ink-3 mt-0.5 text-[13px]">{meta.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close settings"
              className="text-ink-3 hover:bg-paper-3 hover:text-ink -mr-1 ml-3 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <IconX size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {page === "account" && (
              <div className="max-w-xl space-y-6">
                <div className="flex items-center gap-4">
                  <ImagePicker
                    src={profileImageSrc}
                    image={profileImageFile}
                    height={64}
                    width={64}
                    onSrcChange={setProfileImageSrc}
                    onImageChange={setProfileImageFile}
                  />
                  <div className="min-w-0">
                    <div className="text-ink font-medium">
                      {displayName || username || "Your profile"}
                    </div>
                    {email && (
                      <div className="text-ink-3 truncate text-sm">{email}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label>Username</Label>
                    {usernameChanged && (
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          usernameAvailable ? "text-success" : "text-danger"
                        )}
                      >
                        {usernameAvailable ? "AVAILABLE" : "UNAVAILABLE"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      className="pr-10"
                      placeholder="username"
                      value={username}
                      onChange={e => {
                        setUsername(e.target.value)
                        checkUsernameAvailability(e.target.value)
                      }}
                      minLength={PROFILE_USERNAME_MIN}
                      maxLength={PROFILE_USERNAME_MAX}
                    />
                    {usernameChanged && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {loadingUsername ? (
                          <IconLoader2 className="animate-spin" size={18} />
                        ) : usernameAvailable ? (
                          <IconCircleCheckFilled
                            className="text-success"
                            size={18}
                          />
                        ) : (
                          <IconCircleXFilled
                            className="text-danger"
                            size={18}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <LimitDisplay
                    used={username.length}
                    limit={PROFILE_USERNAME_MAX}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Display name</Label>
                  <Input
                    placeholder="Your name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={PROFILE_DISPLAY_NAME_MAX}
                  />
                  <p className="text-ink-3 text-xs">
                    How you appear in chats and on shared work.
                  </p>
                </div>

                {email && (
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={email} disabled readOnly />
                  </div>
                )}
              </div>
            )}

            {page === "personalization" && (
              <div className="max-w-xl space-y-2">
                <Label>What should the AI know about you?</Label>
                <p className="text-ink-3 text-[13px]">
                  Shared with the AI to tailor its responses - your field,
                  methods, or preferences. Optional.
                </p>
                <TextareaAutosize
                  value={profileInstructions}
                  onValueChange={setProfileInstructions}
                  placeholder="e.g. I'm a wet-lab molecular biologist. Prefer rigorous, citation-backed answers and SI units."
                  minRows={8}
                  maxRows={16}
                />
                <LimitDisplay
                  used={profileInstructions.length}
                  limit={PROFILE_CONTEXT_MAX}
                />
              </div>
            )}

            {page === "appearance" && <AppearancePage />}

            {page === "lab" && <LabStandardsPage />}

            {page === "notifications" && <NotificationsPage />}

            {page === "usage" && (
              <div className="space-y-6">
                <UsageBillingPanel />
                <AffiliatePanel />
              </div>
            )}

            {page === "data" && (
              <div className="max-w-xl space-y-4">
                <div className="border-line bg-surface flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="min-w-0">
                    <div className="text-ink text-sm font-medium">
                      Export your data
                    </div>
                    <p className="text-ink-3 mt-0.5 text-[13px]">
                      Download your Shadow AI 1.0 data as a JSON file.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLocalStorageAsJSON}
                  >
                    <IconFileDownload size={15} className="mr-1.5" />
                    Export
                  </Button>
                </div>

                <div className="border-line bg-surface flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="min-w-0">
                    <div className="text-ink text-sm font-medium">Sign out</div>
                    <p className="text-ink-3 mt-0.5 text-[13px]">
                      End your session on this device.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <IconLogout size={15} className="mr-1.5" />
                    Sign out
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50/60 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-red-700">
                      Delete account
                    </div>
                    <p className="mt-0.5 text-[13px] text-red-600/80">
                      Permanently removes your account and data. This can’t be
                      undone - we’ll confirm and process it over email.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => {
                      const ok = window.confirm(
                        "Request account deletion? We’ll email you to confirm before anything is removed."
                      )
                      if (!ok) return
                      const subject = encodeURIComponent(
                        "Delete my Shadow AI account"
                      )
                      const body = encodeURIComponent(
                        `Please delete my account${email ? ` (${email})` : ""} and all associated data.`
                      )
                      window.location.href = `mailto:support@shadowai.app?subject=${subject}&body=${body}`
                    }}
                  >
                    <IconTrash size={15} className="mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>

          {showFooter && (
            <footer className="border-line flex items-center justify-end gap-2 border-t px-6 py-3">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                {saving ? (
                  <>
                    <IconLoader2 size={16} className="mr-1.5 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </footer>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Appearance - light/dark theme picker (persists like the old ThemeSwitcher:
// localStorage "theme" + next-themes setTheme).
// ---------------------------------------------------------------------------
const AppearancePage: FC = () => {
  const { theme, setTheme } = useTheme()
  const choose = (value: "light" | "dark") => {
    try {
      localStorage.setItem("theme", value)
    } catch {
      /* ignore */
    }
    setTheme(value)
  }
  const current = theme === "dark" ? "dark" : "light"

  return (
    <div className="max-w-xl space-y-3">
      <Label>Theme</Label>
      <div className="border-line bg-surface inline-flex gap-1 rounded-md border p-1">
        {(["light", "dark"] as const).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            className={cn(
              "rounded px-4 py-1.5 text-[13px] font-medium capitalize transition-colors",
              current === value
                ? "bg-paper-3 text-ink"
                : "text-ink-2 hover:text-ink"
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lab standards - defaults injected into design generation + chat (localStorage
// via lib/settings/preferences; read by the design page at generation time).
// ---------------------------------------------------------------------------
const SegField: FC<{
  label: string
  hint?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}> = ({ label, hint, value, options, onChange }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {hint && <p className="text-ink-3 text-[12.5px]">{hint}</p>}
    <div className="border-line bg-surface inline-flex flex-wrap gap-1 rounded-md border p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded px-3 py-1.5 text-[12.5px] font-medium transition-colors",
            value === o.value
              ? "bg-paper-3 text-ink"
              : "text-ink-2 hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
)

const LabStandardsPage: FC = () => {
  const [ls, setLs] = useState<LabStandards>(DEFAULT_LAB_STANDARDS)
  useEffect(() => setLs(getLabStandards()), [])
  const update = (patch: Partial<LabStandards>) =>
    setLs(prev => {
      const next = { ...prev, ...patch }
      setLabStandards(next)
      return next
    })

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-ink-3 text-[13px]">
        Applied as defaults to every new generated design and the design chat.
        Saved automatically, on this device.
      </p>
      <SegField
        label="Replicates"
        value={ls.replicates}
        onChange={v => update({ replicates: v as LabStandards["replicates"] })}
        options={[
          { value: "auto", label: "Let the model decide" },
          { value: "require", label: "Always include" },
          { value: "single", label: "Single run (n=1)" }
        ]}
      />
      <SegField
        label="Statistical rigor"
        value={ls.statistics}
        onChange={v => update({ statistics: v as LabStandards["statistics"] })}
        options={[
          { value: "auto", label: "Model decides" },
          { value: "standard", label: "Standard (α 0.05, power 0.8)" },
          { value: "strict", label: "Strict (α 0.01, power 0.9)" }
        ]}
      />
      <SegField
        label="Controls"
        value={ls.controls}
        onChange={v => update({ controls: v as LabStandards["controls"] })}
        options={[
          { value: "auto", label: "Model decides" },
          { value: "require", label: "Require vehicle + pos + neg" }
        ]}
      />
      <SegField
        label="Documentation detail"
        value={ls.documentation}
        onChange={v =>
          update({ documentation: v as LabStandards["documentation"] })
        }
        options={[
          { value: "concise", label: "Concise" },
          { value: "detailed", label: "Detailed" },
          { value: "regulatory", label: "Regulatory / SOP-grade" }
        ]}
      />
      <div className="space-y-1.5">
        <Label>House rules (optional)</Label>
        <TextareaAutosize
          value={ls.notes}
          onValueChange={v => update({ notes: v })}
          placeholder="e.g. Always log lot numbers; use WFI for all buffers; cap at 12 conditions."
          minRows={3}
          maxRows={8}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notifications - device-local preferences.
// ---------------------------------------------------------------------------
const ToggleSwitch: FC<{ on: boolean; onClick: () => void }> = ({
  on,
  onClick
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className={cn(
      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
      on ? "bg-rust" : "bg-line-strong"
    )}
  >
    <span
      className={cn(
        "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
        on ? "left-[18px]" : "left-0.5"
      )}
    />
  </button>
)

const NotificationsPage: FC = () => {
  const [np, setNp] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS)
  useEffect(() => setNp(getNotificationPrefs()), [])
  const toggle = (key: keyof NotificationPrefs) =>
    setNp(prev => {
      const next = { ...prev, [key]: !prev[key] }
      setNotificationPrefs(next)
      return next
    })

  const rows: {
    key: keyof NotificationPrefs
    title: string
    desc: string
  }[] = [
    {
      key: "emailOnComplete",
      title: "Email when work finishes",
      desc: "Get an email when a long design or report finishes generating."
    },
    {
      key: "inAppOnComplete",
      title: "In-app alerts",
      desc: "Show a notification in the app when work completes."
    },
    {
      key: "weeklyDigest",
      title: "Weekly digest",
      desc: "A weekly summary of your designs, reports, and usage."
    }
  ]

  return (
    <div className="max-w-xl space-y-3">
      <p className="text-ink-3 text-[13px]">
        Preferences saved on this device.
      </p>
      {rows.map(r => (
        <div
          key={r.key}
          className="border-line bg-surface flex items-center justify-between gap-4 rounded-lg border p-4"
        >
          <div className="min-w-0">
            <div className="text-ink text-sm font-medium">{r.title}</div>
            <p className="text-ink-3 mt-0.5 text-[13px]">{r.desc}</p>
          </div>
          <ToggleSwitch on={np[r.key]} onClick={() => toggle(r.key)} />
        </div>
      ))}
    </div>
  )
}
