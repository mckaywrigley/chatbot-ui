import { Tables } from "@/supabase/types"
import { createContext, useContext, useState } from "react"

interface DesignContextProps {
  selectedDesign: Tables<"designs"> | null
  setSelectedDesign: (
    design:
      | Tables<"designs">
      | null
      | ((prev: Tables<"designs"> | null) => Tables<"designs"> | null)
  ) => void
}

const DesignContext = createContext<DesignContextProps>({
  selectedDesign: null,
  setSelectedDesign: () => {}
})

export const DesignProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedDesign, setSelectedDesign] =
    useState<Tables<"designs"> | null>(null)

  return (
    <DesignContext.Provider
      value={{
        selectedDesign,
        setSelectedDesign
      }}
    >
      {children}
    </DesignContext.Provider>
  )
}

export const useDesignContext = () => {
  const context = useContext(DesignContext)
  if (!context) {
    throw new Error("useDesignContext must be used within a DesignProvider")
  }
  return context
}
