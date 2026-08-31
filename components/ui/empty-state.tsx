"use client"

import React from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import {
  FolderOpen,
  MessageSquare,
  File,
  BarChart3,
  Plus,
  Search,
  Upload,
  Brain,
  Users,
  Settings
} from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string; size?: number | string }>
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  className = ""
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        {Icon && (
          <div className="mb-6 rounded-full bg-slate-100 p-6">
            <Icon className="size-12 text-slate-400" />
          </div>
        )}

        <h3 className="mb-3 text-xl font-semibold text-slate-800">{title}</h3>

        <p className="mb-6 max-w-md leading-relaxed text-slate-500">
          {description}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              size="lg"
              className="gap-2"
            >
              <Plus className="size-4" />
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              size="lg"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Predefined empty states for common scenarios
export function EmptyProjects({
  onCreateProject
}: {
  onCreateProject: () => void
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Create your first project to organize your conversations, files, and reports. Projects help you manage and track your AI workflow more effectively."
      action={{
        label: "Create First Project",
        onClick: onCreateProject
      }}
    />
  )
}

export function EmptyChats({
  onNewChat,
  onImport
}: {
  onNewChat: () => void
  onImport?: () => void
}) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No conversations yet"
      description="Start your first conversation with the AI assistant. Chat about anything - get answers, analyze data, or brainstorm ideas."
      action={{
        label: "Start First Chat",
        onClick: onNewChat
      }}
      secondaryAction={
        onImport
          ? {
              label: "Import Conversations",
              onClick: onImport,
              variant: "outline"
            }
          : undefined
      }
    />
  )
}

export function EmptyFiles({
  onUploadFile,
  onCreateFile
}: {
  onUploadFile: () => void
  onCreateFile?: () => void
}) {
  return (
    <EmptyState
      icon={File}
      title="No files uploaded"
      description="Upload documents, images, or other files to analyze them with AI. Supported formats include PDF, text files, images, and more."
      action={{
        label: "Upload First File",
        onClick: onUploadFile
      }}
      secondaryAction={
        onCreateFile
          ? {
              label: "Create New File",
              onClick: onCreateFile,
              variant: "outline"
            }
          : undefined
      }
    />
  )
}

export function EmptyReports({
  onCreateReport,
  onViewExamples
}: {
  onCreateReport: () => void
  onViewExamples?: () => void
}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No reports generated"
      description="Create detailed reports from your conversations and data. Generate insights, summaries, and analysis to track your progress."
      action={{
        label: "Create First Report",
        onClick: onCreateReport
      }}
      secondaryAction={
        onViewExamples
          ? {
              label: "View Examples",
              onClick: onViewExamples,
              variant: "outline"
            }
          : undefined
      }
    />
  )
}

export function EmptySearchResults({
  query,
  onClearSearch
}: {
  query?: string
  onClearSearch: () => void
}) {
  return (
    <EmptyState
      icon={Search}
      title={query ? `No results for "${query}"` : "No search results"}
      description={
        query
          ? "Try adjusting your search terms, checking for typos, or broadening your search criteria."
          : "Enter a search term to find projects, conversations, files, and reports."
      }
      action={{
        label: "Clear Search",
        onClick: onClearSearch,
        variant: "outline"
      }}
    />
  )
}

export function EmptyWorkspace({
  onCreateProject,
  onInviteUsers
}: {
  onCreateProject: () => void
  onInviteUsers?: () => void
}) {
  return (
    <EmptyState
      icon={Brain}
      title="Welcome to Shadow AI"
      description="Get started by creating your first project, uploading some files, or starting a conversation with the AI assistant."
      action={{
        label: "Create First Project",
        onClick: onCreateProject
      }}
      secondaryAction={
        onInviteUsers
          ? {
              label: "Invite Team Members",
              onClick: onInviteUsers,
              variant: "outline"
            }
          : undefined
      }
    />
  )
}
