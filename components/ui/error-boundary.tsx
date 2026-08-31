"use client"

import React from "react"
import { Button } from "./button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback

      if (Fallback && this.state.error) {
        return (
          <Fallback
            error={this.state.error}
            retry={() => this.setState({ hasError: false, error: undefined })}
          />
        )
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          retry={() => this.setState({ hasError: false, error: undefined })}
        />
      )
    }

    return this.props.children
  }
}

export function DefaultErrorFallback({
  error,
  retry
}: {
  error?: Error
  retry: () => void
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="size-6 text-red-600" />
          </div>
          <CardTitle className="text-lg">Something went wrong</CardTitle>
          <CardDescription>
            {error?.message ||
              "An unexpected error occurred while loading this content."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Button onClick={retry} className="gap-2">
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
              Technical details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
              {error?.stack ||
                error?.toString() ||
                "No additional details available"}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}

export function AsyncErrorFallback({
  error,
  retry
}: {
  error: Error
  retry: () => void
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 size-8 text-red-500" />
      <h3 className="mb-2 text-lg font-medium text-red-800">
        Failed to load data
      </h3>
      <p className="mb-4 text-sm text-red-600">
        {error.message ||
          "There was an error loading the requested information."}
      </p>
      <Button
        onClick={retry}
        size="sm"
        variant="outline"
        className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
      >
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  )
}
