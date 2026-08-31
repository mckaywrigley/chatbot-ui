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
  Tag,
  X,
  SlidersHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export interface ProjectFilters {
  searchTerm: string
  tags: string[]
  dateRange?: { start: Date; end: Date }
  sortBy: "name" | "created_at" | "updated_at" | "activity"
  sortOrder: "asc" | "desc"
}

interface ProjectFiltersProps {
  filters: ProjectFilters
  onFiltersChange: (filters: ProjectFilters) => void
  availableTags?: string[]
  className?: string
}

export const ProjectFiltersComponent = ({
  filters,
  onFiltersChange,
  availableTags = [],
  className
}: ProjectFiltersProps) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<{
    start?: Date
    end?: Date
  }>({})

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value })
  }

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-")
    onFiltersChange({
      ...filters,
      sortBy: sortBy as ProjectFilters["sortBy"],
      sortOrder: sortOrder as ProjectFilters["sortOrder"]
    })
  }

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    onFiltersChange({ ...filters, tags: newTags })
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
      tags: [],
      dateRange: undefined,
      sortBy: "updated_at",
      sortOrder: "desc"
    })
    setTempDateRange({})
  }

  const hasActiveFilters =
    filters.searchTerm || filters.tags.length > 0 || filters.dateRange

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search projects..."
          value={filters.searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <Popover open={isTagPickerOpen} onOpenChange={setIsTagPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8",
                  filters.tags.length > 0 && "border-blue-600 bg-blue-50"
                )}
              >
                <Tag className="mr-2 size-3" />
                Tags
                {filters.tags.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5">
                    {filters.tags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium">Filter by tags</h4>
                <div className="grid grid-cols-2 gap-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-2 text-xs transition-colors",
                        filters.tags.includes(tag)
                          ? "border-blue-300 bg-blue-100 text-blue-800"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {tag}
                      {filters.tags.includes(tag) && <X className="size-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
            <SelectItem value="activity-desc">Most Active</SelectItem>
            <SelectItem value="activity-asc">Least Active</SelectItem>
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

      {/* Active Filter Tags */}
      {filters.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground text-sm">Tags:</span>
          {filters.tags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="hover:bg-destructive hover:text-destructive-foreground cursor-pointer text-xs"
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
              <X className="ml-1 size-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
