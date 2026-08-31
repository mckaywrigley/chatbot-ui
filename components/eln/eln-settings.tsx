"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { Plus, Trash2, ExternalLink, FlaskConical } from "lucide-react"
import { ELNConnection } from "@/types/eln"
import { getELNProvider } from "@/lib/eln/eln-providers"
import { getELNConnections, deleteELNConnection } from "@/db/eln-connections"
import { ELNConnectModal } from "./eln-connect-modal"
import { toast } from "sonner"

interface ELNSettingsProps {
  userId: string
}

export function ELNSettings({ userId }: ELNSettingsProps) {
  const [connections, setConnections] = useState<ELNConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadConnections = async () => {
    try {
      const elnConnections = await getELNConnections(userId)
      setConnections(elnConnections)
    } catch (error) {
      console.error("Failed to load ELN connections:", error)
      toast.error("Failed to load ELN connections")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadConnections()
    }
    // `loadConnections` is a stable component-local function; the only
    // real trigger is the userId changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const handleDelete = async (connectionId: string) => {
    setDeletingId(connectionId)
    try {
      await deleteELNConnection(connectionId, userId)
      setConnections(prev => prev.filter(conn => conn.id !== connectionId))
      toast.success("ELN connection removed successfully")
    } catch (error) {
      console.error("Failed to delete connection:", error)
      toast.error("Failed to remove ELN connection")
    } finally {
      setDeletingId(null)
    }
  }

  const handleConnectionCreated = (connection: ELNConnection) => {
    setConnections(prev => [...prev, connection])
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5" />
            ELN Integration
          </CardTitle>
          <CardDescription>
            Connect your Electronic Lab Notebooks to export reports directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="bg-muted h-16 rounded-lg"></div>
            <div className="bg-muted h-16 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5" />
            ELN Integration
          </CardTitle>
          <CardDescription>
            Connect your Electronic Lab Notebooks to export reports directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <div className="py-8 text-center">
              <FlaskConical className="text-muted-foreground mx-auto mb-4 size-12" />
              <h3 className="mb-2 text-lg font-medium">No ELN connections</h3>
              <p className="text-muted-foreground mb-4">
                Connect your first Electronic Lab Notebook to start exporting
                reports.
              </p>
              <Button onClick={() => setShowConnectModal(true)}>
                <Plus className="mr-2 size-4" />
                Connect ELN
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Connected ELNs ({connections.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConnectModal(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Add Connection
                </Button>
              </div>

              <div className="space-y-3">
                {connections.map(connection => {
                  const provider = getELNProvider(connection.provider)
                  return (
                    <Card key={connection.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{provider?.icon}</div>
                          <div>
                            <div className="font-medium">
                              {connection.display_name ||
                                `${provider?.name} Connection`}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {provider?.name}
                              {connection.tenant_url && (
                                <Badge variant="secondary" className="ml-2">
                                  {new URL(connection.tenant_url).hostname}
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Connected{" "}
                              {new Date(
                                connection.connected_at
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {connection.tenant_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={connection.tenant_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === connection.id}
                              >
                                <Trash2 className="text-destructive size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove ELN Connection
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this
                                  connection to{" "}
                                  <strong>{provider?.name}</strong>? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(connection.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Remove Connection
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              <Separator />

              <div className="text-muted-foreground rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/20">
                <strong>💡 Tip:</strong> Once connected, you can export any
                Shadow AI report directly to your ELN from the report review
                page. Look for the &ldquo;Export to ELN&rdquo; button next to
                the download option.
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ELNConnectModal
        isOpen={showConnectModal}
        onOpenChange={setShowConnectModal}
        userId={userId}
        onConnectionCreated={handleConnectionCreated}
      />
    </>
  )
}
