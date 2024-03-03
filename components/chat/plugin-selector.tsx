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
import { PluginID, PluginSummary } from "@/types/plugins"
import { ChatbotUIContext } from "@/context/context"
import Modal from "./dialog-portal"
import { PlanDialog } from "../utility/plan-dialog"
import { usePluginContext } from "./chat-hooks/PluginProvider"

interface PluginSelectorProps {
  onPluginSelect: (type: string) => void
}

const PluginSelector: React.FC<PluginSelectorProps> = ({ onPluginSelect }) => {
  const { subscription, setSelectedPlugin, selectedPlugin, chatSettings } =
    useContext(ChatbotUIContext)
  const [selectedPluginName, setSelectedPluginName] =
    useState("No plugin selected")
  const [isPluginStoreModalOpen, setIsPluginStoreModalOpen] = useState(false)
  const [showLockedPluginDialog, setShowLockedPluginDialog] = useState(false)
  const [currentPlugin, setCurrentPlugin] = useState<PluginSummary | null>(null)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const { state: pluginState, dispatch: pluginDispatch } = usePluginContext()

  const defaultPluginIds = [0, 99]

  const isPremium = subscription !== null

  const handleUpgradeToPlus = () => {
    setShowLockedPluginDialog(false)
    setShowPlanDialog(true)
  }

  useEffect(() => {
    const foundPlugin = availablePlugins.find(
      plugin => plugin.value === selectedPlugin
    )
    if (foundPlugin) {
      setSelectedPluginName(foundPlugin.selectorName)
    }
  }, [selectedPlugin])

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

  const renderPluginOptions = () => {
    return selectorPlugins.map(plugin => (
      <DropdownMenuItem
        key={plugin.id}
        onSelect={() => {
          if (
            !plugin.isPremium ||
            (isPremium && chatSettings?.model !== "mistral-medium")
          ) {
            if (plugin.value === PluginID.PLUGINS_STORE) {
              setIsPluginStoreModalOpen(true)
            } else {
              onPluginSelect(plugin.value)
              setSelectedPluginName(plugin.selectorName)
              setSelectedPlugin(plugin.value)
            }
          } else {
            setCurrentPlugin(plugin)
            setShowLockedPluginDialog(true)
          }
        }}
        className={`flex items-center justify-between ${(plugin.isPremium && !isPremium) || (plugin.isPremium && chatSettings?.model === "mistral-medium") ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span>{plugin.selectorName}</span>
        {plugin.isPremium && !isPremium ? (
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
        pluginsData={updatedAvailablePlugins}
        installPlugin={installPlugin}
        uninstallPlugin={uninstallPlugin}
      />
      <LockedPluginModal
        isOpen={showLockedPluginDialog}
        currentPlugin={currentPlugin}
        handleCancelUpgrade={() => setShowLockedPluginDialog(false)}
        handleUpgradeToPlus={handleUpgradeToPlus}
        isPremium={isPremium}
      />
      <PlanDialog
        showIcon={false}
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
      />
    </div>
  )
}

const LockedPluginModal = ({
  isOpen,
  currentPlugin,
  handleCancelUpgrade,
  handleUpgradeToPlus,
  isPremium
}: {
  isOpen: boolean
  currentPlugin: any
  handleCancelUpgrade: () => void
  handleUpgradeToPlus: () => void
  isPremium: boolean
}) => {
  return (
    <Modal isOpen={isOpen}>
      <div className="bg-background/20 size-screen fixed inset-0 z-50 backdrop-blur-sm"></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background w-full max-w-lg rounded-md p-10 text-center">
          {isPremium ? (
            <>
              <p>
                Use the <b>GPT-4 Turbo</b> model for the{" "}
                <b>{currentPlugin?.name}</b> plugin.
              </p>
            </>
          ) : (
            <>
              <p>
                The <b>{currentPlugin?.name}</b> plugin is only accessible with
                a <b>Plus</b> plan.
              </p>
              <p>Ready to upgrade for access?</p>
            </>
          )}
          <div className="mt-5 flex justify-center gap-5">
            <button
              onClick={handleCancelUpgrade}
              className="ring-offset-background focus-visible:ring-ring bg-input text-primary hover:bg-input/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            {!isPremium && (
              <button
                onClick={handleUpgradeToPlus}
                className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PluginSelector
