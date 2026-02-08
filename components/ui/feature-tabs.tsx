"use client"

import { useRouter, usePathname } from "next/navigation"
import { IconMessageCircle, IconHome } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useChatbotUI } from "@/context/context"

interface FeatureTabsProps {
  activeTab: "chat" | "report"
  className?: string
}

export function FeatureTabs({ activeTab, className }: FeatureTabsProps) {
  const router = useRouter()
  const { selectedWorkspace } = useChatbotUI()

  const handleTabClick = (tab: "chat" | "report") => {
    if (!selectedWorkspace) return

    if (tab === "chat") {
      router.push(`/${selectedWorkspace.id}/chat`)
    } else {
      router.push(`/${selectedWorkspace.id}/explore`)
    }
  }

  return (
    <div
      className={cn("relative z-10 -mb-[1px] flex items-end gap-0", className)}
    >
      {/* Chat Tab */}
      <div
        className={`rounded-t-xl transition-all duration-200 ${
          activeTab === "chat"
            ? "z-20 bg-[#24BDEB] p-[1px] pb-0"
            : "mb-[1px] py-[1px]"
        }`}
      >
        <button
          onClick={() => handleTabClick("chat")}
          className={`flex size-full items-center gap-1.5 whitespace-nowrap rounded-t-[11px] px-3 py-2 text-sm font-medium sm:gap-2 sm:px-4 sm:py-2.5 ${
            activeTab === "chat"
              ? "border-b border-white bg-white pb-2.5 pt-2 text-gray-900 sm:pb-3 sm:pt-2.5"
              : "border border-transparent bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900"
          }`}
        >
          <IconMessageCircle className="size-4" />
          <span>Rooftops Chat</span>
        </button>
      </div>

      {/* Report Tab */}
      <div
        className={`ml-[-1px] rounded-t-xl transition-all duration-200 ${
          activeTab === "report"
            ? "z-20 bg-[#4FEBBC] p-[1px] pb-0"
            : "mb-[1px] py-[1px]"
        }`}
      >
        <button
          onClick={() => handleTabClick("report")}
          className={`flex size-full items-center gap-1.5 whitespace-nowrap rounded-t-[11px] px-3 py-2 text-sm font-medium sm:gap-2 sm:px-4 sm:py-2.5 ${
            activeTab === "report"
              ? "border-b border-white bg-white pb-2.5 pt-2 text-gray-900 sm:pb-3 sm:pt-2.5"
              : "border border-transparent bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900"
          }`}
        >
          <IconHome className="size-4" />
          <span>Instant Roof Report</span>
        </button>
      </div>
    </div>
  )
}
