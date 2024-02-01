import { LLM } from "@/types"

const ZHIPU_PLATORM_LINK = "https://open.bigmodel.cn/dev/api"

// Zhipu Models (UPDATED 01/16/24) -----------------------------

// GLM-4 (UPDATED 01/16/24)
const GLM_4: LLM = {
  modelId: "glm-4",
  modelName: "GLM-4",
  provider: "zhipu",
  hostedId: "glm-4",
  platformLink: ZHIPU_PLATORM_LINK,
  imageInput: false
}

// GLM-4 Vision (UPDATED 01/16/24)
const GLM_4V: LLM = {
  modelId: "glm-4v",
  modelName: "GLM-4 Vision",
  provider: "zhipu",
  hostedId: "glm-4v",
  platformLink: ZHIPU_PLATORM_LINK,
  imageInput: true
}

// GLM-3-TURBO (UPDATED 01/16/24))
const GLM_3_TURBO: LLM = {
  modelId: "glm-3-turbo",
  modelName: "GLM-3 TURBO",
  provider: "zhipu",
  hostedId: "glm-3-turbo",
  platformLink: ZHIPU_PLATORM_LINK,
  imageInput: false
}

export const ZHIPU_LLM_LIST: LLM[] = [
  GLM_4,
  // some bugs in official api, release later
  // GLM_4V
  GLM_3_TURBO
]
