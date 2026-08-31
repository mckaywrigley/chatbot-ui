/**
 * Date formatting helpers used in list slabs across the app.
 *
 * The product wants explicit dates (mm/dd/yy) instead of relative
 * ("2 hr ago") strings - scientists compare runs by date and the relative
 * format makes it hard to tell whether something was modified yesterday
 * or a week ago.
 *
 * `formatShortDate` and `formatCreatedModified` both tolerate null /
 * undefined / invalid input and return an em-dash placeholder; callers
 * can render the result directly without guarding.
 */

const PLACEHOLDER = "-"

/** mm/dd/yy - short, ambiguous-month-free for US users, no locale variance. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return PLACEHOLDER
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

/**
 * dd/mm/yy variant used by the chat list slabs (the user explicitly
 * asked for that ordering on chats, while keeping the design/report
 * slabs on mm/dd/yy).
 */
export function formatShortDateEU(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return PLACEHOLDER
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

/**
 * Same data as {@link formatCreatedModified} but split into two lines
 * for slabs that stack the dates vertically in the right corner.
 *
 * Returns `["Created mm/dd/yy", "Modified mm/dd/yy"]` (or a single-entry
 * array when no modification or the same calendar day). Callers render
 * one `<div>` per entry to get the stacked layout the scientist asked
 * for.
 */
export function formatCreatedModifiedStacked(
  createdAt: string | null | undefined,
  modifiedAt: string | null | undefined
): string[] {
  const created = formatShortDate(createdAt)
  const modified = formatShortDate(modifiedAt)
  if (created === PLACEHOLDER && modified === PLACEHOLDER) return [PLACEHOLDER]
  if (
    modified === PLACEHOLDER ||
    modified === created ||
    !modifiedAt ||
    !createdAt
  ) {
    return [`Created ${created}`]
  }
  return [`Created ${created}`, `Modified ${modified}`]
}

/**
 * "Created mm/dd/yy · Modified mm/dd/yy" - the canonical row caption.
 *
 * If the two timestamps are the same calendar day, we drop "Modified" so
 * the caption stays short and doesn't repeat the same date twice. If the
 * modified date is missing, only Created is shown.
 */
export function formatCreatedModified(
  createdAt: string | null | undefined,
  modifiedAt: string | null | undefined
): string {
  const created = formatShortDate(createdAt)
  const modified = formatShortDate(modifiedAt)
  if (created === PLACEHOLDER && modified === PLACEHOLDER) return PLACEHOLDER
  if (
    modified === PLACEHOLDER ||
    modified === created ||
    !modifiedAt ||
    !createdAt
  ) {
    return `Created ${created}`
  }
  return `Created ${created} · Modified ${modified}`
}
