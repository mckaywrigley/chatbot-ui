import { IconLoader2 } from "@tabler/icons-react"

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh)] w-full flex-col items-center justify-center">
      <IconLoader2 className="mt-4 size-12 animate-spin" />
    </div>
  )
}
