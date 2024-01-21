import { IconLoader2 } from "@tabler/icons-react"

export default function Loading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <IconLoader2 className="mt-4 h-12 w-12 animate-spin" />
    </div>
  )
}
