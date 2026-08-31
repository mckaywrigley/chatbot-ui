"use client"

import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Check,
  Link as LinkIcon,
  Loader2,
  Lock,
  Share2,
  Trash2,
  X
} from "lucide-react"
import type {
  CollaboratorRole,
  DesignPermission,
  Sharing
} from "@/types/sharing"
import type { ExportableDesign } from "@/lib/design/export"
import { ChatbotUIContext } from "@/context/context"
import { supabase } from "@/lib/supabase/browser-client"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designId: string
  design: ExportableDesign & {
    sharing?: Sharing
    share_token?: string | null
  }
  onSharingChange?: (next: {
    sharing: Sharing
    share_token: string | null
  }) => void
  pdfTargetRef?: React.RefObject<HTMLElement>
}

interface OwnerInfo {
  name: string
  email: string
  avatar: string | null
}

export default function ShareDialog({
  open,
  onOpenChange,
  designId,
  design,
  onSharingChange
}: ShareDialogProps) {
  const { profile } = useContext(ChatbotUIContext)

  const [sharing, setSharing] = useState<Sharing>(design.sharing ?? "private")
  const [shareToken, setShareToken] = useState<string | null>(
    design.share_token ?? null
  )
  const [isTogglingLink, setIsTogglingLink] = useState(false)
  const [copyOk, setCopyOk] = useState(false)

  const [collaborators, setCollaborators] = useState<DesignPermission[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>("editor")
  const [isInviting, setIsInviting] = useState(false)
  const [notify, setNotify] = useState(true)
  const [owner, setOwner] = useState<OwnerInfo | null>(null)

  useEffect(() => {
    setSharing(design.sharing ?? "private")
    setShareToken(design.share_token ?? null)
  }, [design.sharing, design.share_token])

  // Resolve the owner (current user) for the top "People with access" row.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()
        if (cancelled || !user) return
        const meta = (user.user_metadata ?? {}) as any
        setOwner({
          name:
            profile?.display_name ||
            meta.full_name ||
            user.email?.split("@")[0] ||
            "You",
          email: user.email ?? "",
          avatar: profile?.image_url || meta.avatar_url || null
        })
      } catch {
        // best-effort: fall back to profile-only display
        if (!cancelled)
          setOwner({
            name: profile?.display_name || "You",
            email: "",
            avatar: profile?.image_url || null
          })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, profile?.display_name, profile?.image_url])

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    // Anyone-with-link mode hands out the public share-token URL. Restricted
    // mode hands out the access-gated resolver link (invited collaborators get
    // in; everyone else is blocked) — mirrors how the invite emails link out.
    if (sharing !== "private" && shareToken) {
      return `${window.location.origin}/share/design/${shareToken}`
    }
    return `${window.location.origin}/en/open/design/${designId}`
  }, [sharing, shareToken, designId])

  const loadCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/design/${designId}/collaborators`)
      if (!res.ok) throw new Error("Failed to load collaborators")
      const data = await res.json()
      setCollaborators(data.collaborators ?? [])
    } catch (err: any) {
      toast.error(err?.message || "Could not load collaborators")
    }
  }, [designId])

  useEffect(() => {
    if (open) loadCollaborators()
  }, [open, loadCollaborators])

  // Flip between "Restricted" (private) and "Anyone with the link" (unlisted).
  const changeVisibility = useCallback(
    async (next: Sharing) => {
      setIsTogglingLink(true)
      try {
        if (next === "private") {
          const res = await fetch(`/api/design/${designId}/share`, {
            method: "DELETE"
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to update access")
          setSharing("private")
          setShareToken(null)
          onSharingChange?.({ sharing: "private", share_token: null })
        } else {
          const res = await fetch(`/api/design/${designId}/share`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sharing: next })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to update access")
          setSharing(data.sharing)
          setShareToken(data.share_token)
          onSharingChange?.({
            sharing: data.sharing,
            share_token: data.share_token
          })
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update access")
      } finally {
        setIsTogglingLink(false)
      }
    },
    [designId, onSharingChange]
  )

  const copyLink = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyOk(true)
      setTimeout(() => setCopyOk(false), 1500)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy link")
    }
  }, [shareUrl])

  const invite = useCallback(async () => {
    const email = inviteEmail.trim()
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email")
      return
    }
    setIsInviting(true)
    try {
      const res = await fetch(`/api/design/${designId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole, notify })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add")
      setInviteEmail("")
      setCollaborators(prev => {
        const next = prev.filter(p => p.email !== data.collaborator.email)
        return [data.collaborator, ...next]
      })
      // The collaborator now HAS access (the permission row is the source of
      // truth). Only claim an email was sent if it actually was.
      if (!notify) {
        toast.success(`${email} added`)
      } else if (data.emailDelivered) {
        toast.success(
          data.collaborator.user_id
            ? `Invited ${email}`
            : `Invite emailed to ${email} — they'll get access after signing up with that address`
        )
      } else {
        toast.warning(
          `${email} now has ${data.collaborator.role} access, but the invite email couldn't be sent${
            data.emailError ? ` (${data.emailError})` : ""
          }. Use Copy link to send it manually.`
        )
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to add")
    } finally {
      setIsInviting(false)
    }
  }, [designId, inviteEmail, inviteRole, notify])

  // Role change re-upserts the permission (POST merges by design+email) without
  // re-emailing — a silent update.
  const changeRole = useCallback(
    async (email: string, role: CollaboratorRole) => {
      const prev = collaborators
      setCollaborators(cs =>
        cs.map(c => (c.email === email ? { ...c, role } : c))
      )
      try {
        const res = await fetch(`/api/design/${designId}/collaborators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role, notify: false })
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to update role")
        }
      } catch (err: any) {
        setCollaborators(prev)
        toast.error(err?.message || "Failed to update role")
      }
    },
    [designId, collaborators]
  )

  const removeCollaborator = useCallback(
    async (email: string) => {
      const prev = collaborators
      setCollaborators(cs => cs.filter(c => c.email !== email))
      try {
        const res = await fetch(
          `/api/design/${designId}/collaborators?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to remove")
        }
        toast.success(`Removed ${email}`)
      } catch (err: any) {
        setCollaborators(prev)
        toast.error(err?.message || "Failed to remove")
      }
    },
    [designId, collaborators]
  )

  const designName = design.name || "this design"
  const initial = (email: string) => (email[0] || "?").toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5">
          <Share2 className="text-ink-500 size-5 shrink-0" />
          <h2 className="text-ink-900 min-w-0 flex-1 truncate text-lg font-semibold">
            Share &ldquo;{designName}&rdquo;
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-ink-400 hover:bg-ink-100 hover:text-ink-700 -mr-1 rounded-full p-1.5"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Add people.

            The submit control used to live INSIDE the field's border, sharing
            the row with the role Select - so it read as part of the input
            chrome rather than as the action, and the researcher reported
            typing an address and finding "no share button available". The
            action is now its own full-width primary button below the field,
            appearing the moment an address is typed, and it names the person
            it is about to invite. Enter still submits. */}
        <div className="space-y-2 px-6 pb-2">
          <div className="border-ink-200 focus-within:border-ink-400 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 transition-colors">
            <Input
              type="email"
              placeholder="Add people by email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !isInviting) invite()
              }}
              className="h-9 min-w-[160px] flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Select
              value={inviteRole}
              onValueChange={v => setInviteRole(v as CollaboratorRole)}
            >
              <SelectTrigger className="h-8 w-[104px] shrink-0 border-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inviteEmail.trim().length > 0 && (
            <Button
              onClick={invite}
              disabled={isInviting}
              className="w-full gap-2 rounded-xl"
            >
              {isInviting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sharing…
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Share with {inviteEmail.trim()} as {inviteRole}
                </>
              )}
            </Button>
          )}
        </div>

        {/* People with access */}
        <div className="px-6 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-ink-900 text-[15px] font-semibold">
              People with access
            </h3>
            <label className="text-ink-600 flex cursor-pointer select-none items-center gap-2 text-sm">
              Notify people
              <Checkbox
                checked={notify}
                onCheckedChange={v => setNotify(v === true)}
              />
            </label>
          </div>

          <div className="max-h-[220px] space-y-1 overflow-auto">
            {/* Owner row */}
            <div className="flex items-center gap-3 py-1.5">
              {owner?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={owner.avatar}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="bg-ink-200 text-ink-700 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {initial(owner?.email || owner?.name || "Y")}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-ink-900 truncate text-sm font-medium">
                  {owner?.name || "You"}
                </div>
                {owner?.email && (
                  <div className="text-ink-500 truncate text-[13px]">
                    {owner.email}
                  </div>
                )}
              </div>
              <span className="text-ink-500 shrink-0 text-sm">Owner</span>
            </div>

            {/* Collaborators */}
            {collaborators.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-1.5">
                <div className="bg-ink-100 text-ink-700 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {initial(c.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-ink-900 truncate text-sm font-medium">
                    {c.email}
                  </div>
                  <div className="text-ink-500 truncate text-[13px]">
                    {c.user_id ? "Has access" : "Pending invite"}
                  </div>
                </div>
                <Select
                  value={c.role}
                  onValueChange={v =>
                    changeRole(c.email, v as CollaboratorRole)
                  }
                >
                  <SelectTrigger className="h-8 w-[104px] shrink-0 border-0 shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeCollaborator(c.email)}
                  aria-label={`Remove ${c.email}`}
                  className="text-ink-400 hover:bg-ink-100 hover:text-ink-700 shrink-0 rounded-full p-1.5"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* General access */}
        <div className="border-ink-100 mt-4 border-t px-6 py-4">
          <h3 className="text-ink-900 mb-3 text-[15px] font-semibold">
            General access
          </h3>
          <div className="flex items-center gap-3">
            <div className="bg-ink-100 text-ink-600 flex size-10 shrink-0 items-center justify-center rounded-full">
              {sharing === "private" ? (
                <Lock className="size-5" />
              ) : (
                <LinkIcon className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Select
                value={sharing === "private" ? "private" : "unlisted"}
                onValueChange={v => changeVisibility(v as Sharing)}
                disabled={isTogglingLink}
              >
                <SelectTrigger className="h-8 w-auto gap-1 border-0 px-1 font-medium shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Restricted</SelectItem>
                  <SelectItem value="unlisted">Anyone with the link</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-ink-500 mt-0.5 px-1 text-[13px]">
                {sharing === "private"
                  ? "Only people with access can open with the link"
                  : "Anyone on the internet with the link can view"}
              </p>
            </div>
            {isTogglingLink && (
              <Loader2 className="text-ink-400 size-4 shrink-0 animate-spin" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="outline"
            onClick={copyLink}
            className="gap-2 rounded-full"
          >
            {copyOk ? (
              <Check className="size-4" />
            ) : (
              <LinkIcon className="size-4" />
            )}
            Copy link
          </Button>
          {/* An address still sitting unsent in the box would be silently
              discarded by Done. Send it first rather than losing it. */}
          <Button
            onClick={async () => {
              if (inviteEmail.trim()) {
                await invite()
                return
              }
              onOpenChange(false)
            }}
            disabled={isInviting}
            className="rounded-full px-6"
          >
            {inviteEmail.trim() ? "Share & close" : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
