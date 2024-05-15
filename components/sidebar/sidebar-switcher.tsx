import { ContentType } from "@/types"
import {
  IconBooks,
  IconFile,
  IconMessage,
  IconPuzzle
} from "@tabler/icons-react"
import React, { FC, useContext, useState } from "react"
import { TabsList } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"
import { ProfileSettings } from "../utility/profile-settings"
import { SidebarSwitchItem } from "./sidebar-switch-item"
import { PlanDialog } from "../utility/plan-dialog"
import { ChatbotUIContext } from "@/context/context"
import PluginStoreModal from "@/components/chat/plugin-store"
import { PluginSummary } from "@/types/plugins"
import { availablePlugins } from "@/lib/plugins/available-plugins"
import { usePluginContext } from "@/components/chat/chat-hooks/PluginProvider"

export const SIDEBAR_ICON_SIZE = 28

interface SidebarSwitcherProps {
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitcher: FC<SidebarSwitcherProps> = ({
  onContentTypeChange
}) => {
  const { subscription } = useContext(ChatbotUIContext)
  const [isPluginStoreModalOpen, setIsPluginStoreModalOpen] = useState(false)
  const { state: pluginState, dispatch: pluginDispatch } = usePluginContext()
  const defaultPluginIds = [0, 99]

  const installPlugin = (plugin: PluginSummary) => {
    pluginDispatch({
      type: "INSTALL_PLUGIN",
      payload: { ...plugin, isInstalled: true }
    })
  }

  const uninstallPlugin = (pluginId: number) => {
    pluginDispatch({
      type: "UNINSTALL_PLUGIN",
      payload: pluginId
    })
  }

  const updatedAvailablePlugins = availablePlugins.map(plugin => {
    const isInstalled = pluginState.installedPlugins.some(
      p => p.id === plugin.id
    )
    return { ...plugin, isInstalled }
  })

  const selectorPlugins = updatedAvailablePlugins.filter(
    plugin => plugin.isInstalled || defaultPluginIds.includes(plugin.id)
  )

  return (
    <div className="flex flex-col justify-between border-r-2 pb-5">
      <PluginStoreModal
        isOpen={isPluginStoreModalOpen}
        setIsOpen={setIsPluginStoreModalOpen}
        pluginsData={updatedAvailablePlugins}
        installPlugin={installPlugin}
        uninstallPlugin={uninstallPlugin}
      />
      <TabsList className="bg-background grid h-[440px] grid-rows-7">
        <SidebarSwitchItem
          icon={<IconMessage size={SIDEBAR_ICON_SIZE} />}
          contentType="chats"
          onContentTypeChange={onContentTypeChange}
        />

        {subscription && (
          <SidebarSwitchItem
            icon={<IconFile size={SIDEBAR_ICON_SIZE} />}
            contentType="files"
            onContentTypeChange={onContentTypeChange}
          />
        )}

        {/* Imitating SidebarSwitchItem but without contentType */}
        <button
          onClick={() => setIsPluginStoreModalOpen(!isPluginStoreModalOpen)}
          className={
            "ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm"
          }
        >
          <IconPuzzle size={SIDEBAR_ICON_SIZE} />
        </button>
        {subscription && (
          <SidebarSwitchItem
            icon={<IconBooks size={SIDEBAR_ICON_SIZE} />}
            contentType="collections"
            onContentTypeChange={onContentTypeChange}
          />
        )}
      </TabsList>

      <div className="flex flex-col items-center space-y-4">
        {/* TODO */}
        {/* <WithTooltip display={<div>Import</div>} trigger={<Import />} /> */}
        {/* TODO */}
        {/* <Alerts /> */}

        {!subscription && <PlanDialog />}

        <WithTooltip
          display={<div>Profile Settings</div>}
          trigger={<ProfileSettings />}
        />
      </div>
    </div>
  )
}
