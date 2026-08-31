import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext } from "react"
import { useDesignContext } from "@/context/designcontext"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { UpdateDesign } from "./update-design"
import { DeleteDesign } from "./delete-design"

interface DesignItemProps {
  design: Tables<"designs">
}

export const DesignItem: FC<DesignItemProps> = ({ design }) => {
  const { selectedWorkspace } = useContext(ChatbotUIContext)
  const { setSelectedDesign } = useDesignContext()

  const router = useRouter()
  const params = useParams()
  const isActive = params.designid === design.id

  const handleClick = () => {
    if (!selectedWorkspace) return
    setSelectedDesign(design)
    return router.push(`/${selectedWorkspace.id}/design/${design.id}`)
  }

  if (!selectedWorkspace) return null

  return (
    <div
      className={cn(
        "hover:bg-accent focus:bg-accent group flex w-full cursor-pointer items-center rounded p-2 hover:opacity-50 focus:outline-none"
      )}
      tabIndex={0}
      onClick={handleClick}
    >
      <div className="ml-3 flex-1 truncate text-sm font-semibold">
        {design.description}
      </div>

      <div
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
        }}
        className={`ml-2 flex space-x-2 ${!isActive && "w-11 opacity-0 group-hover:opacity-100"}`}
      >
        <UpdateDesign design={design} />
        <DeleteDesign design={design} />
      </div>
    </div>
  )
}
