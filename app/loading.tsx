import { IconLoader2 } from "@tabler/icons-react"

export default async function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <IconLoader2 className="animate-spin" />
    </div>
  )
}
