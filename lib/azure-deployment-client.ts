let _cachedAzureDeploymentName: string | null | undefined = undefined
let _azureDeploymentFetchPromise: Promise<string | null> | null = null

/**
 * Client-side helper to fetch the active Azure deployment name from the server.
 * Cached for the lifetime of the page to avoid repeated requests.
 */
export async function getAzureDeploymentNameClient(): Promise<string | null> {
  if (_cachedAzureDeploymentName !== undefined)
    return _cachedAzureDeploymentName
  if (_azureDeploymentFetchPromise) return _azureDeploymentFetchPromise

  _azureDeploymentFetchPromise = (async () => {
    try {
      const res = await fetch("/api/chat/azure/deployment")
      if (!res.ok) return null
      const data = (await res.json()) as { deployment?: unknown }

      const deployment =
        typeof data.deployment === "string" ? data.deployment.trim() : ""

      return deployment ? deployment : null
    } catch {
      return null
    }
  })()

  const deployment = await _azureDeploymentFetchPromise
  _cachedAzureDeploymentName = deployment
  _azureDeploymentFetchPromise = null
  return deployment
}
