
export interface PrivateAIModel {
  id: string;
  name: string;
}

export enum PrivateAIModelID {
  PRIVATE_IA = 'privateIA',
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = PrivateAIModelID.PRIVATE_IA;

export const PrivateAIModels: Record<PrivateAIModelID, PrivateAIModel> = {
  [PrivateAIModelID.PRIVATE_IA]: {
    id: PrivateAIModelID.PRIVATE_IA,
    name: PrivateAIModelID['PRIVATE_IA']
  },
};
