"use client"

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ExternalLink, CheckCircle } from "lucide-react"
import {
  ELNConnection,
  ELNProject,
  ELNExperiment,
  ELNExportResult
} from "@/types/eln"
import { getELNProvider } from "@/lib/eln/eln-providers"
import { SciNoteClient } from "@/lib/eln/scinote-client"
import { BenchlingClient } from "@/lib/eln/benchling-client"
import { toast } from "sonner"

interface ELNExportModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  connections: ELNConnection[]
  reportContent: string
  reportTitle: string
  onExportSuccess?: (result: ELNExportResult) => void
}

export function ELNExportModal({
  isOpen,
  onOpenChange,
  connections,
  reportContent,
  reportTitle,
  onExportSuccess
}: ELNExportModalProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>("")
  const [projects, setProjects] = useState<ELNProject[]>([])
  const [experiments, setExperiments] = useState<ELNExperiment[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedExperiment, setSelectedExperiment] = useState<string>("")
  const [createNewExperiment, setCreateNewExperiment] = useState(false)
  const [newExperimentName, setNewExperimentName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(false)
  const [exportResult, setExportResult] = useState<ELNExportResult | null>(null)

  const selectedConnectionInfo = connections.find(
    c => c.id === selectedConnection
  )
  const provider = selectedConnectionInfo
    ? getELNProvider(selectedConnectionInfo.provider)
    : null

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedConnection("")
      setProjects([])
      setExperiments([])
      setSelectedProject("")
      setSelectedExperiment("")
      setCreateNewExperiment(false)
      setNewExperimentName("")
      setExportResult(null)
    }
  }, [isOpen])

  // Load projects when connection changes
  useEffect(() => {
    if (selectedConnection && selectedConnectionInfo) {
      loadProjects()
    }
    // `loadProjects` / `selectedConnectionInfo` close over `selectedConnection`
    // already - the trigger is the connection switch itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnection])

  // Load experiments when project changes
  useEffect(() => {
    if (selectedProject && selectedConnectionInfo && !createNewExperiment) {
      loadExperiments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, createNewExperiment])

  // Set default experiment name when switching to create new
  useEffect(() => {
    if (createNewExperiment && !newExperimentName) {
      setNewExperimentName(
        `${reportTitle} - ${new Date().toLocaleDateString()}`
      )
    }
    // We only want to set the *default* name once on toggle-on; including
    // `newExperimentName` would prevent the user from clearing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewExperiment, reportTitle])

  const createClient = (connection: ELNConnection) => {
    if (connection.provider === "scinote") {
      return new SciNoteClient(connection.access_token, connection.tenant_url)
    } else if (connection.provider === "benchling") {
      if (!connection.tenant_url) {
        throw new Error("Tenant URL is required for Benchling")
      }
      return new BenchlingClient(connection.access_token, connection.tenant_url)
    }
    throw new Error(`Unsupported provider: ${connection.provider}`)
  }

  const loadProjects = async () => {
    if (!selectedConnectionInfo) return

    setIsLoadingProjects(true)
    try {
      const client = createClient(selectedConnectionInfo)
      const projectList = await client.listProjects()
      setProjects(projectList)
    } catch (error) {
      console.error("Failed to load projects:", error)
      toast.error("Failed to load projects. Please check your connection.")
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadExperiments = async () => {
    if (!selectedConnectionInfo || !selectedProject) return

    setIsLoadingExperiments(true)
    try {
      const client = createClient(selectedConnectionInfo)
      const experimentList = await client.listExperiments(selectedProject)
      setExperiments(experimentList)
    } catch (error) {
      console.error("Failed to load experiments:", error)
      toast.error("Failed to load experiments.")
    } finally {
      setIsLoadingExperiments(false)
    }
  }

  const handleExport = async () => {
    if (!selectedConnectionInfo || !selectedProject) {
      toast.error("Please select connection and project")
      return
    }

    if (!createNewExperiment && !selectedExperiment) {
      toast.error("Please select an experiment or create a new one")
      return
    }

    if (createNewExperiment && !newExperimentName.trim()) {
      toast.error("Please enter a name for the new experiment")
      return
    }

    setIsLoading(true)
    try {
      const client = createClient(selectedConnectionInfo)

      const result = await client.exportReport(
        reportContent,
        selectedProject,
        createNewExperiment ? undefined : selectedExperiment,
        createNewExperiment ? newExperimentName.trim() : undefined
      )

      setExportResult(result)

      if (result.success) {
        toast.success("Report exported successfully!")
        onExportSuccess?.(result)
      } else {
        toast.error(result.error || "Export failed")
      }
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Export failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (connections.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export to ELN</DialogTitle>
            <DialogDescription>
              No ELN connections found. Please connect an ELN first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export Report to ELN</DialogTitle>
          <DialogDescription>
            Export &ldquo;{reportTitle}&rdquo; to your Electronic Lab Notebook.
          </DialogDescription>
        </DialogHeader>

        {exportResult?.success ? (
          <div className="py-6">
            <div className="mb-4 flex items-center justify-center">
              <CheckCircle className="size-12 text-green-500" />
            </div>
            <div className="mb-4 text-center">
              <h3 className="mb-2 text-lg font-semibold">Export Successful!</h3>
              <p className="text-muted-foreground">
                Your report has been exported to {provider?.name}.
              </p>
            </div>
            {exportResult.entry_url && (
              <div className="text-center">
                <Button asChild>
                  <a
                    href={exportResult.entry_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in {provider?.name}
                    <ExternalLink className="ml-2 size-4" />
                  </a>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="connection">ELN Connection</Label>
              <Select
                value={selectedConnection}
                onValueChange={setSelectedConnection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ELN connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map(connection => {
                    const providerInfo = getELNProvider(connection.provider)
                    return (
                      <SelectItem key={connection.id} value={connection.id}>
                        <div className="flex items-center gap-2">
                          <span>{providerInfo?.icon}</span>
                          <span>
                            {connection.display_name ||
                              `${providerInfo?.name} Connection`}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedConnection && (
              <div className="grid gap-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingProjects
                          ? "Loading projects..."
                          : "Select project"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-muted-foreground text-sm">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedProject && (
              <div className="grid gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-new"
                    checked={createNewExperiment}
                    onCheckedChange={checked =>
                      setCreateNewExperiment(checked === true)
                    }
                  />
                  <Label htmlFor="create-new">Create new experiment</Label>
                </div>

                {createNewExperiment ? (
                  <div className="grid gap-2">
                    <Label htmlFor="experiment-name">Experiment Name</Label>
                    <Input
                      id="experiment-name"
                      placeholder="Enter experiment name"
                      value={newExperimentName}
                      onChange={e => setNewExperimentName(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="experiment">Experiment</Label>
                    <Select
                      value={selectedExperiment}
                      onValueChange={setSelectedExperiment}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingExperiments
                              ? "Loading experiments..."
                              : "Select experiment"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {experiments.map(experiment => (
                          <SelectItem key={experiment.id} value={experiment.id}>
                            <div>
                              <div className="font-medium">
                                {experiment.name}
                              </div>
                              {experiment.description && (
                                <div className="text-muted-foreground text-sm">
                                  {experiment.description}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {exportResult?.success ? "Close" : "Cancel"}
          </Button>
          {!exportResult?.success && (
            <Button
              onClick={handleExport}
              disabled={
                isLoading ||
                !selectedConnection ||
                !selectedProject ||
                (!createNewExperiment && !selectedExperiment) ||
                (createNewExperiment && !newExperimentName.trim())
              }
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Export Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
