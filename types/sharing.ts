export type Sharing = "private" | "public" | "unlisted"

export type CollaboratorRole = "viewer" | "editor"

export interface DesignPermission {
  id: string
  design_id: string
  user_id: string | null
  email: string
  role: CollaboratorRole
  invited_by: string
  invited_by_email: string | null
  created_at: string
  resolved_at: string | null
}

export interface DesignShareMeta {
  sharing: Sharing
  share_token: string | null
  shared_with: string[]
  forked_from: {
    design_id: string
    user_id: string
    name: string
  } | null
}

export const isPubliclyViewable = (sharing: Sharing | undefined) =>
  sharing === "public" || sharing === "unlisted"
