import { ChatbotUIContext } from "@/context/context"
import { useDataCollectionContext } from "@/context/datacollectioncontext"
import { DataCollectionItem as DataCollectionItemType } from "@/types/sidebar-data"
import { FC, useContext } from "react"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { UpdateDataCollection } from "./update-data-collection"
import { DeleteDataCollection } from "./delete-data-collection"

interface DataCollectionItemProps {
  dataCollection: DataCollectionItemType
}

export const DataCollectionItem: FC<DataCollectionItemProps> = ({
  dataCollection
}) => {
  const { selectedWorkspace } = useContext(ChatbotUIContext)
  const { setSelectedDataCollection } = useDataCollectionContext()

  const router = useRouter()
  const params = useParams()
  const isActive = params.datacollectionid === dataCollection.id

  const handleClick = () => {
    if (!selectedWorkspace) return
    setSelectedDataCollection(dataCollection)
    return router.push(
      `/${selectedWorkspace.id}/data-collection/${dataCollection.id}`
    )
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
        {dataCollection.name}
      </div>

      <div
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
        }}
        className={`ml-2 flex space-x-2 ${!isActive && "w-11 opacity-0 group-hover:opacity-100"}`}
      >
        <UpdateDataCollection dataCollection={dataCollection} />
        <DeleteDataCollection dataCollection={dataCollection} />
      </div>
    </div>
  )
}
