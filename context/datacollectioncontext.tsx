import { DataCollectionItem } from "@/types/sidebar-data"
import { createContext, useContext, useState } from "react"

interface DataCollectionContextProps {
  selectedDataCollection: DataCollectionItem | null
  setSelectedDataCollection: (
    dc:
      | DataCollectionItem
      | null
      | ((prev: DataCollectionItem | null) => DataCollectionItem | null)
  ) => void
}

const DataCollectionContext = createContext<DataCollectionContextProps>({
  selectedDataCollection: null,
  setSelectedDataCollection: () => {}
})

export const DataCollectionProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [selectedDataCollection, setSelectedDataCollection] =
    useState<DataCollectionItem | null>(null)

  return (
    <DataCollectionContext.Provider
      value={{
        selectedDataCollection,
        setSelectedDataCollection
      }}
    >
      {children}
    </DataCollectionContext.Provider>
  )
}

export const useDataCollectionContext = () => {
  const context = useContext(DataCollectionContext)
  if (!context) {
    throw new Error(
      "useDataCollectionContext must be used within a DataCollectionProvider"
    )
  }
  return context
}
