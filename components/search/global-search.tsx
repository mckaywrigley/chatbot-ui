"use client"

import { useState, useContext, useEffect } from "react"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { Dialog, DialogContent } from "../ui/dialog"
import { Input } from "../ui/input"
import {
  Search,
  MessageSquare,
  FolderOpen,
  File,
  BarChart3,
  Calendar,
  User,
  Tag,
  ArrowRight
} from "lucide-react"
import { searchGlobalContent } from "@/db/search"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

export interface SearchResult {
  id: string
  type: "project" | "chat" | "file" | "report"
  title: string
  description?: string
  url: string
  metadata?: {
    model?: string
    date?: string
    size?: string
    author?: string
    tags?: string[]
    projectName?: string
  }
}

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { selectedWorkspace, profile } = useContext(ChatbotUIContext)
  const router = useRouter()

  // Global shortcut (Cmd+Shift+K - see lib/hooks/use-hotkey.tsx)
  useHotkey("k", () => setIsOpen(true))

  // Listen for programmatic "open-global-search" events, dispatched by the
  // sidebar search pill and other UI that can't use a keyboard shortcut.
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener("open-global-search", handler)
    return () => window.removeEventListener("open-global-search", handler)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (query.trim() && selectedWorkspace?.id) {
      performSearch(query)
    } else {
      setResults([])
    }
    // `performSearch` is locally defined and closes over the values we list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedWorkspace?.id])

  const performSearch = async (searchQuery: string) => {
    if (!selectedWorkspace?.id || !profile?.user_id) return

    setIsLoading(true)
    try {
      const searchResults = await searchGlobalContent(
        selectedWorkspace.id,
        profile.user_id,
        searchQuery
      )
      setResults(searchResults)
      setSelectedIndex(0)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
      return
    }

    if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelectResult(results[selectedIndex])
      return
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    setIsOpen(false)
    router.push(result.url)
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderOpen className="size-4" />
      case "chat":
        return <MessageSquare className="size-4" />
      case "file":
        return <File className="size-4" />
      case "report":
        return <BarChart3 className="size-4" />
      default:
        return <Search className="size-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "project":
        return "text-blue-600 bg-blue-50"
      case "chat":
        return "text-emerald-600 bg-emerald-50"
      case "file":
        return "text-orange-600 bg-orange-50"
      case "report":
        return "text-purple-600 bg-purple-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  if (!profile) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-2xl overflow-hidden p-0"
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="text-muted-foreground mr-3 size-4" />
            <Input
              placeholder="Search projects, chats, files, and reports..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="border-none p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query && results.length === 0 && !isLoading && (
              <div className="text-muted-foreground p-8 text-center">
                <Search className="mx-auto mb-3 size-8 opacity-50" />
                <p>No results found for &ldquo;{query}&rdquo;</p>
                <p className="mt-1 text-sm">
                  Try different keywords or check your spelling
                </p>
              </div>
            )}

            {isLoading && (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="text-muted-foreground">Searching...</p>
              </div>
            )}

            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                className={cn(
                  "hover:bg-muted/50 flex cursor-pointer items-start gap-3 border-l-2 p-4 transition-colors",
                  selectedIndex === index
                    ? "bg-muted border-l-blue-600"
                    : "border-l-transparent"
                )}
                onClick={() => handleSelectResult(result)}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    getTypeColor(result.type)
                  )}
                >
                  {getResultIcon(result.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium">
                      {result.title}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
                        getTypeColor(result.type)
                      )}
                    >
                      {result.type}
                    </span>
                  </div>

                  {result.description && (
                    <p className="text-muted-foreground mt-1 truncate text-sm">
                      {result.description}
                    </p>
                  )}

                  {result.metadata && (
                    <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                      {result.metadata.projectName && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="size-3" />
                          {result.metadata.projectName}
                        </span>
                      )}
                      {result.metadata.model && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {result.metadata.model}
                        </span>
                      )}
                      {result.metadata.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {result.metadata.date}
                        </span>
                      )}
                      {result.metadata.size && (
                        <span className="flex items-center gap-1">
                          <File className="size-3" />
                          {result.metadata.size}
                        </span>
                      )}
                      {result.metadata.tags &&
                        result.metadata.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="size-3" />
                            {result.metadata.tags.slice(0, 2).join(", ")}
                            {result.metadata.tags.length > 2 && "..."}
                          </span>
                        )}
                    </div>
                  )}
                </div>

                <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>

          {/* Footer */}
          {query && results.length > 0 && (
            <div className="text-muted-foreground bg-muted/30 border-t px-4 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span>
                  {results.length} result{results.length !== 1 ? "s" : ""} found
                </span>
                <span>
                  Use ↑↓ arrows to navigate, Enter to select, Esc to close
                </span>
              </div>
            </div>
          )}

          {!query && (
            <div className="text-muted-foreground p-6 text-center">
              <Search className="mx-auto mb-3 size-8 opacity-50" />
              <p>Search across all your projects, chats, files, and reports</p>
              <p className="mt-1 text-sm">Start typing to see results...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
