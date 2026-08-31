"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { ELNProvider, ELNConnection } from "@/types/eln"
import { getSupportedProviders } from "@/lib/eln/eln-providers"
import { SciNoteClient } from "@/lib/eln/scinote-client"
import { BenchlingClient } from "@/lib/eln/benchling-client"
import { createELNConnection } from "@/db/eln-connections"
import { toast } from "sonner"

interface ELNConnectModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onConnectionCreated: (connection: ELNConnection) => void
}

export function ELNConnectModal({
  isOpen,
  onOpenChange,
  userId,
  onConnectionCreated
}: ELNConnectModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [apiKey, setApiKey] = useState("")
  const [tenantUrl, setTenantUrl] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "none" | "testing" | "success" | "error"
  >("none")
  const [errorMessage, setErrorMessage] = useState("")

  const supportedProviders = getSupportedProviders()
  const selectedProviderInfo = supportedProviders.find(
    p => p.id === selectedProvider
  )

  const resetForm = () => {
    setSelectedProvider("")
    setApiKey("")
    setTenantUrl("")
    setDisplayName("")
    setConnectionStatus("none")
    setErrorMessage("")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const testConnection = async () => {
    if (!selectedProvider || !apiKey) {
      toast.error("Please select a provider and enter API key")
      return
    }

    setConnectionStatus("testing")
    setErrorMessage("")

    try {
      let isValid = false

      if (selectedProvider === "scinote") {
        const client = new SciNoteClient(apiKey, tenantUrl || undefined)
        isValid = await client.authenticate()
      } else if (selectedProvider === "benchling") {
        if (!tenantUrl) {
          throw new Error("Tenant URL is required for Benchling")
        }
        const client = new BenchlingClient(apiKey, tenantUrl)
        isValid = await client.authenticate()
      }

      if (isValid) {
        setConnectionStatus("success")
        toast.success("Connection successful!")
      } else {
        setConnectionStatus("error")
        setErrorMessage("Authentication failed. Please check your credentials.")
      }
    } catch (error) {
      setConnectionStatus("error")
      const message =
        error instanceof Error ? error.message : "Connection failed"
      setErrorMessage(message)
      toast.error(message)
    }
  }

  const handleSave = async () => {
    if (connectionStatus !== "success") {
      toast.error("Please test the connection first")
      return
    }

    setIsLoading(true)
    try {
      const connection = await createELNConnection({
        user_id: userId,
        provider: selectedProvider,
        access_token: apiKey,
        tenant_url: tenantUrl || undefined,
        display_name: displayName || `${selectedProviderInfo?.name} Connection`
      })

      onConnectionCreated(connection)
      toast.success("ELN connection saved successfully!")
      handleClose()
    } catch (error) {
      console.error("Failed to save connection:", error)
      toast.error("Failed to save connection. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect ELN</DialogTitle>
          <DialogDescription>
            Connect your Electronic Lab Notebook to export Shadow AI reports
            directly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">ELN Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your ELN provider" />
              </SelectTrigger>
              <SelectContent>
                {supportedProviders.map(provider => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      <span>{provider.icon}</span>
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {provider.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider === "benchling" && (
            <div className="grid gap-2">
              <Label htmlFor="tenant-url">Tenant URL</Label>
              <Input
                id="tenant-url"
                placeholder="https://your-tenant.benchling.com"
                value={tenantUrl}
                onChange={e => setTenantUrl(e.target.value)}
              />
            </div>
          )}

          {selectedProvider === "scinote" && (
            <div className="grid gap-2">
              <Label htmlFor="base-url">Base URL (Optional)</Label>
              <Input
                id="base-url"
                placeholder="https://www.scinote.net (default)"
                value={tenantUrl}
                onChange={e => setTenantUrl(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="display-name">Display Name (Optional)</Label>
            <Input
              id="display-name"
              placeholder="My Lab ELN"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={
                !selectedProvider || !apiKey || connectionStatus === "testing"
              }
            >
              {connectionStatus === "testing" && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Test Connection
            </Button>

            {connectionStatus === "success" && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="size-4" />
                <span className="text-sm">Connected</span>
              </div>
            )}

            {connectionStatus === "error" && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="size-4" />
                <span className="text-sm">Failed</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded bg-red-50 p-2 text-sm text-red-600">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={connectionStatus !== "success" || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
