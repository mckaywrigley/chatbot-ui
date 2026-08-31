"use client"

import { DataCollectionChat } from "./components/data-collection-chat"

const DEFAULT_COLUMNS = [
  "Sample ID",
  "Date",
  "Condition",
  "Time Point",
  "Measurement 1",
  "Measurement 2",
  "Temperature (°C)",
  "pH",
  "Notes"
]

const DEFAULT_ROWS = Array.from({ length: 5 }, () =>
  DEFAULT_COLUMNS.map(() => "")
)

export default function DataCollectionPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DataCollectionChat
        initialTemplateColumns={DEFAULT_COLUMNS}
        initialTemplateRows={DEFAULT_ROWS}
      />
    </div>
  )
}
