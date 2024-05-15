import { Dialog, Transition, Tab } from "@headlessui/react"
import React, { useState, useEffect, Fragment, useContext } from "react"
import {
  IconX,
  IconSearch,
  IconCode,
  IconCircleX,
  IconCloudDownload
} from "@tabler/icons-react"

import { PluginSummary } from "@/types/plugins"
import Image from "next/image"
import { ChatbotUIContext } from "@/context/context"

function getPluginsPerPage() {
  const width = window.innerWidth
  if (width < 768) return 2
  if (width >= 768 && width < 1024) return 4
  return 6
}

interface PluginStoreModalProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  pluginsData: PluginSummary[]
  installPlugin: any
  uninstallPlugin: any
}

function PluginStoreModal({
  isOpen,
  setIsOpen,
  pluginsData,
  installPlugin,
  uninstallPlugin
}: PluginStoreModalProps) {
  const categories = ["Free", "Popular", "New", "All", "Installed"]
  const { isMobile } = useContext(ChatbotUIContext)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Free")
  const [currentPage, setCurrentPage] = useState(1)
  const [pluginsPerPage, setPluginsPerPage] = useState(getPluginsPerPage())
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory("Free")
      setCurrentPage(1)
    }
  }, [isOpen])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory])

  useEffect(() => {
    function handleResize() {
      setPluginsPerPage(getPluginsPerPage())
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const [noPluginsMessage, setNoPluginsMessage] = useState("")

  // Update this state whenever the selectedCategory or searchTerm changes
  useEffect(() => {
    if (selectedCategory === "Installed" && searchTerm === "") {
      setNoPluginsMessage("No plugins installed")
    } else {
      setNoPluginsMessage(`No plugins found for "${searchTerm}"`)
    }
  }, [selectedCategory, searchTerm])

  const excludedPluginIds = [0, 99]

  const filteredPlugins = pluginsData
    .filter(plugin => !excludedPluginIds.includes(plugin.id))
    .filter(plugin => {
      const matchesSearch = plugin.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesCategory =
        selectedCategory === "All" ||
        plugin.categories.includes(selectedCategory)
      const isInstalledCategory = selectedCategory === "Installed"

      if (isInstalledCategory) {
        return plugin.isInstalled
      }

      return matchesSearch && matchesCategory
    })

  const pageCount = Math.ceil(filteredPlugins.length / pluginsPerPage)
  const currentPagePlugins = filteredPlugins.slice(
    (currentPage - 1) * pluginsPerPage,
    currentPage * pluginsPerPage
  )

  const handlePreviousPage = () =>
    setCurrentPage(currentPage > 1 ? currentPage - 1 : currentPage)
  const handleNextPage = () =>
    setCurrentPage(currentPage < pageCount ? currentPage + 1 : currentPage)

  const closeModal = () => setIsOpen(false)

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="bg-popover w-full max-w-md overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all sm:max-w-lg md:max-w-3xl lg:max-w-5xl">
                  <Dialog.Title
                    as="h3"
                    className="text-primary flex justify-between text-lg font-medium leading-6"
                  >
                    Plugin store
                    <button
                      onClick={closeModal}
                      className="text-gray-300 hover:text-gray-500"
                    >
                      <IconX className="size-6" aria-hidden="true" />
                    </button>
                  </Dialog.Title>

                  <hr className="my-4 border-gray-300" />

                  <div className="mt-2">
                    {/* Search and Category Selection */}
                    <div
                      className={`mb-4 ${
                        isMobile
                          ? "flex flex-col items-center space-y-2"
                          : "flex items-center"
                      }`}
                    >
                      <Tab.Group>
                        <Tab.List
                          className={`mr-2 flex ${
                            isMobile ? "space-x-1" : "space-x-2"
                          } rounded-xl p-1`}
                        >
                          {categories.map(category => (
                            <Tab
                              key={category}
                              className={({
                                selected
                              }: {
                                selected: boolean
                              }) =>
                                `rounded-lg border border-hgpt-light-gray px-3 py-2 text-sm font-medium ${
                                  selected
                                    ? "bg-muted shadow"
                                    : "bg-primary text-secondary hover:bg-primary/[0.40] hover:text-primary"
                                }`
                              }
                              onClick={() => setSelectedCategory(category)}
                            >
                              {category}
                            </Tab>
                          ))}
                        </Tab.List>
                      </Tab.Group>

                      {/* Search Bar */}
                      <div
                        className={`relative ${
                          isMobile ? "w-50 mt-2" : "w-60"
                        }`}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <IconSearch
                            className="size-5 text-gray-500"
                            aria-hidden="true"
                          />
                        </div>
                        <input
                          type="search"
                          placeholder="Search plugins"
                          className="bg-secondary text-primary block w-full rounded-lg py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Plugin List */}
                    <div className="grid min-h-[460px] grow grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {currentPagePlugins.length > 0 ? (
                        currentPagePlugins.map(plugin => (
                          <div
                            key={plugin.id}
                            className="border-hgpt-light-gray flex h-[200px] w-full flex-col justify-between rounded-lg border p-4 shadow"
                          >
                            <div className="flex items-center">
                              <div className="mr-4 size-[70px] shrink-0">
                                <Image
                                  src={
                                    plugin.icon ||
                                    "https://avatars.githubusercontent.com/u/50994705"
                                  }
                                  alt={plugin.name}
                                  width={70}
                                  height={70}
                                  className="size-full rounded object-cover"
                                />
                              </div>

                              <div className="flex flex-col justify-between">
                                <h4 className="text-primary flex items-center text-lg">
                                  {plugin.name}
                                  {plugin.isPremium && (
                                    <span className="ml-2 rounded bg-yellow-200 px-2 py-1 text-xs font-semibold uppercase text-yellow-700 shadow">
                                      Pro
                                    </span>
                                  )}
                                </h4>
                                <button
                                  className={`mt-2 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm ${
                                    plugin.isInstalled
                                      ? "bg-red-500 text-white hover:bg-red-600"
                                      : "bg-blue-500 text-white hover:bg-blue-600"
                                  }`}
                                  onClick={() =>
                                    plugin.isInstalled
                                      ? uninstallPlugin(plugin.id)
                                      : installPlugin(plugin)
                                  }
                                >
                                  {plugin.isInstalled ? (
                                    <>
                                      Uninstall
                                      <IconCircleX
                                        className="ml-1 size-4"
                                        aria-hidden="true"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      Install
                                      <IconCloudDownload
                                        className="ml-1 size-4"
                                        aria-hidden="true"
                                      />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            {/* Description and Premium badge */}
                            <p className="text-primary/70 line-clamp-3 h-[60px] text-sm">
                              {plugin.description}
                            </p>

                            <div className="text-primary/60 h-[14px] text-xs">
                              <a
                                href={plugin.githubRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5"
                              >
                                View on GitHub
                                <IconCode
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full flex flex-col items-center justify-center p-10">
                          <p className="text-primary text-lg font-semibold">
                            {noPluginsMessage}
                          </p>
                          {selectedCategory !== "Installed" && (
                            <p className="mt-2 text-sm text-gray-400">
                              Try a different query or category.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Pagination Controls */}
                    {pageCount > 1 && (
                      <div
                        className={`flex items-center ${
                          isMobile ? "justify-center" : "justify-start"
                        }`}
                      >
                        <button
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className="mr-4 rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-300 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-300">
                          Page {currentPage} of {pageCount}
                        </span>
                        <button
                          onClick={handleNextPage}
                          disabled={currentPage === pageCount}
                          className="ml-4 rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-300 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default PluginStoreModal
