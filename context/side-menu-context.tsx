import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode
} from "react"

export const localStorageCollapsed = "chat-menu-collapsed"

interface SideMenuContextType {
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

const SideMenuContext = createContext<SideMenuContextType | undefined>(
  undefined
)

interface SideMenuProviderProps {
  children: ReactNode
}

export const SideMenuProvider: React.FC<SideMenuProviderProps> = ({
  children
}) => {
  const storedValue =
    typeof window !== "undefined"
      ? window.localStorage.getItem(localStorageCollapsed)
      : false
  const defaultCollapsed = Boolean(storedValue)

  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed)

  useEffect(() => {
    localStorage.setItem(localStorageCollapsed, String(isCollapsed))
  }, [isCollapsed])

  return (
    <SideMenuContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SideMenuContext.Provider>
  )
}

export const useSideMenu = (): SideMenuContextType => {
  const context = useContext(SideMenuContext)
  if (context === undefined) {
    throw new Error("useSideMenu must be used within a SideMenuProvider")
  }
  return context
}
