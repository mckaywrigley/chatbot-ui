/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import "./side-menu.css"
import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import useHotkey from "@/lib/hooks/use-hotkey"
import { ContentType } from "@/types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faChevronLeft,
  faChevronRight
} from "@fortawesome/pro-regular-svg-icons"
import { localStorageCollapsed, useSideMenu } from "@/context/side-menu-context"

export interface MenuSubItem {
  label: string
  route: string
}

export interface MenuItem {
  label: string
  icon: string
  route: string
  subItems?: MenuSubItem[]
}

export default function SideMenu(): JSX.Element {
  const { isCollapsed, setIsCollapsed } = useSideMenu()

  const pathname = usePathname()

  useHotkey("s", () => setIsCollapsed(prevState => !prevState))

  const router = useRouter()
  const searchParams = useSearchParams()
  const tabValue = searchParams?.get("tab") || "chats"

  const [contentType, setContentType] = useState<ContentType>(
    tabValue as ContentType
  )

  const onClickSideMenuButton = () => {
    if (isCollapsed) {
      localStorage.removeItem(localStorageCollapsed)
      setIsCollapsed(false)
    } else {
      localStorage.setItem(localStorageCollapsed, "1")
      setIsCollapsed(true)
    }
  }

  useEffect(() => {
    console.log("isCollapsed", isCollapsed)
  }, [isCollapsed])

  return (
    //w-56
    <aside
      className={`bg-pixelspace-gray-90 h-[calc(100dvh)] text-white ${
        isCollapsed ? "side-menu" : "side-menu-collapsed"
      } `}
    >
      <div
        className={`bg-pixelspace-gray-90 flex h-[calc(100dvh)] flex-row items-center ${
          isCollapsed ? "items-center" : ""
        }`}
      >
        <nav>
          {isCollapsed && (
            <Tabs
              className="flex flex-row"
              value={contentType}
              onValueChange={tabValue => {
                setContentType(tabValue as ContentType)
                router.replace(`${pathname}?tab=${tabValue}`)
              }}
            >
              <SidebarSwitcher
                contentType={contentType}
                onContentTypeChange={setContentType}
              />

              <Sidebar contentType={contentType} showSidebar={isCollapsed} />
            </Tabs>
          )}
        </nav>
        <Button
          className="z-40"
          style={{
            marginLeft: isCollapsed ? `20px` : "20px"
          }}
          variant="ghost"
          size="icon"
          onClick={onClickSideMenuButton}
        >
          <FontAwesomeIcon
            icon={isCollapsed ? faChevronLeft : faChevronRight}
            className="hover:text-pixelspace-gray-40 text-[20px]"
          />
        </Button>
      </div>
      <label
        className={`pl-[ absolute bottom-1 left-0 text-sm uppercase text-gray-500${
          isCollapsed ? "2" : "4"
        }rem] ml-2`}
      ></label>
    </aside>
  )
}
