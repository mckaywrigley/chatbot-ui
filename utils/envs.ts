import { EnvKey } from "@/types/key-type"

// returns true if the key is found in the environment variables
export function isUsingEnvironmentKey(type: EnvKey) {
  return Boolean(process.env[type])
}
