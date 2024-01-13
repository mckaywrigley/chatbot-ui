import { KeyTypeT } from "@/types/key-type"

// returns true if the key is found in the environment variables
export function isUsingEnvironmentKey(type: KeyTypeT) {
  return Boolean(process.env[type])
}
