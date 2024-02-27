import React, { useContext, useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContentTop,
  DropdownMenuItem
} from "../ui/dropdown-menu"
import {
  IconChevronDown,
  IconLock,
  IconBuildingStore
} from "@tabler/icons-react"

import PluginStoreModal from "./plugin-store"
import { availablePlugins } from "./plugin-store"
import { PluginID } from "@/types/plugins"
import { ChatbotUIContext } from "@/context/context"

interface PluginSelectorProps {
  onPluginSelect: (type: string) => void
}

const PluginSelector: React.FC<PluginSelectorProps> = ({ onPluginSelect }) => {
  const { subscription, setSelectedPlugin, selectedPlugin, chatSettings } =
    useContext(ChatbotUIContext)
  const [selectedPluginName, setSelectedPluginName] =
    useState("No plugin selected")
  const [isPluginStoreModalOpen, setIsPluginStoreModalOpen] = useState(false)

  const isPremium = subscription !== null

  useEffect(() => {
    const foundPlugin = availablePlugins.find(
      plugin => plugin.value === selectedPlugin
    )
    if (foundPlugin) {
      setSelectedPluginName(foundPlugin.selectorName)
    }
  }, [selectedPlugin])

  const renderPluginOptions = () => {
    return availablePlugins.map(plugin => (
      <DropdownMenuItem
        key={plugin.id}
        onSelect={() => {
          if (!plugin.isPremium || isPremium) {
            if (plugin.value === PluginID.PLUGINS_STORE) {
              setIsPluginStoreModalOpen(true)
            } else {
              onPluginSelect(plugin.value)
              setSelectedPluginName(plugin.selectorName)
              setSelectedPlugin(plugin.value)
            }
          }
        }}
        className={`flex items-center justify-between ${(plugin.isPremium && !isPremium) || (plugin.isPremium && chatSettings?.model === "mistral-medium") ? "cursor-not-allowed opacity-50" : ""}`}
        disabled={
          (plugin.isPremium && !isPremium) ||
          (plugin.isPremium && chatSettings?.model === "mistral-medium")
        }
      >
        <span>{plugin.selectorName}</span>
        {(plugin.isPremium && !isPremium) ||
        (plugin.isPremium && chatSettings?.model === "mistral-medium") ? (
          <IconLock size={18} className="ml-2" />
        ) : plugin.value === PluginID.PLUGINS_STORE ? (
          <IconBuildingStore size={18} className="ml-2" />
        ) : null}
      </DropdownMenuItem>
    ))
  }

  return (
    <div className="flex items-center justify-start space-x-4">
      <span className="text-sm font-medium">Plugins</span>
      <div className="flex items-center space-x-2 rounded border border-gray-300 p-2">
        <span className="text-sm">{selectedPluginName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center border-none bg-transparent p-0">
              <IconChevronDown size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContentTop side="top" className="mb-3 mr-6">
            {renderPluginOptions()}
          </DropdownMenuContentTop>
        </DropdownMenu>
      </div>
      <PluginStoreModal
        isOpen={isPluginStoreModalOpen}
        setIsOpen={setIsPluginStoreModalOpen}
        installPlugin={undefined}
        uninstallPlugin={undefined}
      />
    </div>
  )
}

export default PluginSelector
