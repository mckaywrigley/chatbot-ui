import MD5 from "crypto-js/md5"
import urlJoin from "url-join"

export const getURL = () => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    `http://localhost:${process.env.DEV_PORT}/`
  // Make sure to include `https://` when not localhost.
  url = url.startsWith("http") ? url : `https://${url}`
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`
  return url
}

export const toSiteURL = (path: string) => {
  const url = getURL()
  return urlJoin(url, path)
}

export const toDateTime = (secs: number) => {
  const t = new Date("1970-01-01T00:30:00Z") // Unix epoch start.
  t.setSeconds(secs)
  return t
}

export const getUserAvatarUrl = ({
  email,
  profileAvatarUrl
}: {
  email: string
  profileAvatarUrl?: string | null | undefined
}) => {
  const placeholderAvatarUrl = `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp`
  const fallbackAvatarUrl = `https://www.gravatar.com/avatar/${MD5(email)}?d=mp`
  const isProfileAvatarUrlValid =
    profileAvatarUrl && profileAvatarUrl.length > 0
  return isProfileAvatarUrlValid
    ? profileAvatarUrl
    : fallbackAvatarUrl ?? placeholderAvatarUrl
}

export const getPublicUserAvatarUrl = (
  possibleAvatarUrl?: string | null | undefined
) => {
  const placeholderAvatarUrl = `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp`

  return possibleAvatarUrl ?? placeholderAvatarUrl
}

export const getValidDueDate = (daysFromNow = 0) => {
  const dueDate = new Date() // Gets today's date
  dueDate.setDate(dueDate.getDate() + daysFromNow) // Sets the due date 10 days from now
  const dueDateISO = dueDate.toISOString() // Converts to ISO 8601 format

  return dueDateISO
}
