"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Project } from "@/types/project"
import { IconX, IconTrash, IconPlus } from "@tabler/icons-react"

interface ProjectSettingsModalProps {
  project: Project
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: Partial<Project>) => void
  onDelete: () => void
}

export function ProjectSettingsModal({
  project,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: ProjectSettingsModalProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || "")
  const [tags, setTags] = useState<string[]>(project.tags || [])
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAddTag = () => {
    const tag = newTag.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await onUpdate({
        name: name.trim(),
        description: description.trim(),
        tags
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete()
    } finally {
      setLoading(false)
    }
  }

  const isChanged =
    name !== project.name ||
    description !== (project.description || "") ||
    JSON.stringify(tags.sort()) !== JSON.stringify((project.tags || []).sort())

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Update your project information and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Project Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter project name"
              className="w-full"
            />
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your project"
              className="w-full resize-none"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tags</Label>

            {/* Add new tag */}
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a tag"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
              >
                <IconPlus size={16} />
              </Button>
            </div>

            {/* Existing tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                    >
                      <IconX size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Project Info */}
          <div className="border-t border-slate-200 pt-4">
            <div className="space-y-1 text-sm text-slate-500">
              <p>
                <strong>Created:</strong>{" "}
                {new Date(project.created_at).toLocaleDateString()}
              </p>
              <p>
                <strong>Last updated:</strong>{" "}
                {new Date(project.updated_at).toLocaleDateString()}
              </p>
              <p>
                <strong>Project ID:</strong> {project.id}
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-red-200 pt-6">
            <div className="space-y-3">
              <div>
                <h4 className="mb-1 text-sm font-medium text-red-800">
                  Danger Zone
                </h4>
                <p className="mb-3 text-xs text-red-600">
                  This action cannot be undone. All conversations, files, and
                  reports will be permanently deleted.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <IconTrash size={16} />
                    Delete Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        This will permanently delete the project{" "}
                        <strong>&ldquo;{project.name}&rdquo;</strong> and all of
                        its data.
                      </p>
                      <p>
                        This action cannot be undone. All conversations, files,
                        and reports associated with this project will be lost.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      disabled={loading}
                    >
                      {loading ? "Deleting..." : "Delete Project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isChanged || !name.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
