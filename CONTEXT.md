# Project glossary

Domain language used in this codebase. Keep this file authoritative - when a new term becomes load-bearing, add it here.

## Owned Resource

A Firestore document with a single owner. Every Owned Resource has:

- `id` - uuid, server-assigned on create
- `user_id` - the **Owner**. Source of truth for access.
- `workspace_id` - the workspace context the resource was created in. Membership scope only; not the access oracle.
- `created_at`, `updated_at` - ISO-8601 strings, server-assigned

Current Owned Resources: `reports`, `designs`, `projects`, `data_collections`.

The shape is enforced by `lib/server/firestore-resource.ts` (server primitives) and per-domain modules (`lib/report/`, `lib/design/`, ...). HTTP routes under `app/api/{collection}/` are thin adapters over the domain modules.

## Owner

The user identified by `user_id` on an Owned Resource. The Owner is the only user authorized to read, update, or delete the resource (today). Workspace membership does **not** grant access - `user_id` is the access oracle.

`workspace_id` is validated only on create (the caller must own the workspace). On read, `workspace_id` is treated as a filter, not an access check.

## Why this matters

Before this convention, ownership was checked inconsistently - some routes filtered by `user_id`, others trusted workspace membership, some did both. The Owned Resource pattern collapses that into one rule: **Owner = `user_id`. Period.** Everything else (workspace, sharing, project) is an attribute on top.
