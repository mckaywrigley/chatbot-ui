import { IconLoader2 } from "@tabler/icons-react"
import { FC } from "react"

interface ScreenLoaderProps {}

export const ScreenLoader: FC<ScreenLoaderProps> = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <IconLoader2 className="mt-4 h-12 w-12 animate-spin" />
    </div>
  )
}
