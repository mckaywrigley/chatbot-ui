"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
  Filter,
  Search,
  Calendar as CalendarIcon,
  FolderOpen,
  X,
  SlidersHorizontal,
  Bot
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export interface ChatFilters {
  searchTerm: string
  projectId?: string
  model?: string
  dateRange?: { start: Date; end: Date }
  sortBy: "name" | "created_at" | "updated_at"
  sortOrder: "asc" | "desc"
}

interface ChatFiltersProps {
  filters: ChatFilters
  onFiltersChange: (filters: ChatFilters) => void
  availableProjects?: Array<{ id: string; name: string }>
  availableModels?: string[]
  className?: string
}

export const ChatFiltersComponent = ({
  filters,
  onFiltersChange,
  availableProjects = [],
  availableModels = [],
  className
}: ChatFiltersProps) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<{
    start?: Date
    end?: Date
  }>({})

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value })
  }

  const handleProjectChange = (value: string) => {
    onFiltersChange({
      ...filters,
      projectId: value === "all" ? undefined : value
    })
  }

  const handleModelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      model: value === "all" ? undefined : value
    })
  }

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-")
    onFiltersChange({
      ...filters,
      sortBy: sortBy as ChatFilters["sortBy"],
      sortOrder: sortOrder as ChatFilters["sortOrder"]
    })
  }

  const handleDateRangeApply = () => {
    if (tempDateRange.start && tempDateRange.end) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: tempDateRange.start,
          end: tempDateRange.end
        }
      })
    }
    setIsDatePickerOpen(false)
  }

  const clearDateRange = () => {
    onFiltersChange({ ...filters, dateRange: undefined })
    setTempDateRange({})
  }

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: "",
      projectId: undefined,
      model: undefined,
      dateRange: undefined,
      sortBy: "updated_at",
      sortOrder: "desc"
    })
    setTempDateRange({})
  }

  const hasActiveFilters =
    filters.searchTerm ||
    filters.projectId ||
    filters.model ||
    filters.dateRange

  const selectedProject = availableProjects.find(
    p => p.id === filters.projectId
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search chats..."
          value={filters.searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Project Filter */}
        {availableProjects.length > 0 && (
          <Select
            value={filters.projectId || "all"}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-40",
                filters.projectId && "border-blue-600 bg-blue-50"
              )}
            >
              <FolderOpen className="mr-2 size-3" />
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {availableProjects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Model Filter */}
        {availableModels.length > 0 && (
          <Select
            value={filters.model || "all"}
            onValueChange={handleModelChange}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-40",
                filters.model && "border-blue-600 bg-blue-50"
              )}
            >
              <Bot className="mr-2 size-3" />
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {availableModels.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range Filter */}
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8",
                filters.dateRange && "border-blue-600 bg-blue-50"
              )}
            >
              <CalendarIcon className="mr-2 size-3" />
              Date Range
              {filters.dateRange && (
                <span className="ml-2 text-xs">
                  {format(filters.dateRange.start, "MMM dd")} -{" "}
                  {format(filters.dateRange.end, "MMM dd")}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <div className="p-3">
              <div className="space-y-3">
                <h4 className="font-medium">Select date range</h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground text-sm">
                      From
                    </label>
                    <Calendar
                      mode="single"
                      selected={tempDateRange.start}
                      onSelect={date =>
                        setTempDateRange(prev => ({ ...prev, start: date }))
                      }
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground text-sm">To</label>
                    <Calendar
                      mode="single"
                      selected={tempDateRange.end}
                      onSelect={date =>
                        setTempDateRange(prev => ({ ...prev, end: date }))
                      }
                      className="rounded-md border"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleDateRangeApply}
                    disabled={!tempDateRange.start || !tempDateRange.end}
                  >
                    Apply
                  </Button>
                  {filters.dateRange && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearDateRange}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort Options */}
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="h-8 w-40">
            <SlidersHorizontal className="mr-2 size-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
            <SelectItem value="updated_at-asc">Oldest Updated</SelectItem>
            <SelectItem value="created_at-desc">Recently Created</SelectItem>
            <SelectItem value="created_at-asc">Oldest Created</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground h-8"
          >
            <X className="mr-1 size-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
          <span>Filtering by:</span>
          {selectedProject && (
            <Badge variant="secondary" className="text-xs">
              Project: {selectedProject.name}
            </Badge>
          )}
          {filters.model && (
            <Badge variant="secondary" className="text-xs">
              Model: {filters.model}
            </Badge>
          )}
          {filters.dateRange && (
            <Badge variant="secondary" className="text-xs">
              {format(filters.dateRange.start, "MMM dd")} -{" "}
              {format(filters.dateRange.end, "MMM dd")}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
