import { getPluginUrl } from '@/utils/app/plugins';

import { KeyValuePair } from './data';
import { OpenAIFunction } from './openai';

export interface Plugin {
  id: string;
  name: string;
  requiredKeys?: KeyValuePair[];
  url?: string;
  logo?: string;
  description?: string;
}

export interface PluginKey {
  pluginId: PluginID;
  requiredKeys: KeyValuePair[];
}

export enum PluginID {
  GOOGLE_SEARCH = 'google-search',
}

export enum PluginName {
  GOOGLE_SEARCH = 'Google Search',
}

export const Plugins: Record<PluginID, Plugin> = {
  [PluginID.GOOGLE_SEARCH]: {
    id: PluginID.GOOGLE_SEARCH,
    name: PluginName.GOOGLE_SEARCH,
    requiredKeys: [
      {
        key: 'GOOGLE_API_KEY',
        value: '',
      },
      {
        key: 'GOOGLE_CSE_ID',
        value: '',
      },
    ],
  },
};

export const PluginList = Object.values(Plugins);

export interface PluginApiOperation {
  operationId: string;
  nameForModel: string;
  serverUrl: string;
  apiPath: string;
  method: string;
  summary?: string;
  parameters?: [
    {
      name: string;
      in: string;
      description?: string;
      required?: boolean;
      schema: {
        type: string;
      };
    },
  ];
  requestBody?: {
    required?: boolean;
    content: {
      [key: string]: {
        schema: {
          type: string;
          required?: string[];
          properties: {
            [key: string]: {
              type: string;
              description?: string;
              required?: boolean;
            };
          };
        };
      };
    };
  };
  responses?: {
    [key: string]: {
      description?: string;
      content?: {
        [key: string]: {
          schema: {
            type: string;
            required?: string[];
            properties?: {
              [key: string]: {
                type: string;
                description?: string;
              };
            };
          };
        };
      };
    };
  };
}

export interface PluginApiOperationList {
  [operationId: string]: PluginApiOperation;
}

export function resolveRef(ref: string, document: any): any {
  if (!ref.startsWith('#')) {
    throw new Error(`Unsupported reference: ${ref}`);
  }

  const refPath = ref.substring(1).split('/');
  let current = document;
  for (const refPathPart of refPath) {
    if (refPathPart === '') {
      continue;
    }
    if (current === undefined) {
      throw new Error(`Cannot resolve reference: ${ref}`);
    }
    current = current[refPathPart];
  }
  return current;
}

export async function getPluginApiOperationsFromUrl(
  url: string,
): Promise<PluginApiOperationList | null> {
  const pluginUrl = getPluginUrl(url);
  const plugin = await fetch(pluginUrl, { method: 'GET' }).then((response) =>
    response.json(),
  );
  const result = await fetch(plugin.api.url, { method: 'GET' });
  const yamlContent = await result.text();

  const yaml = require('js-yaml');

  const document = yaml.load(yamlContent);
  if (!document) return null;

  const pluginApiOperationList: PluginApiOperationList = {};

  for (const path in document.paths) {
    const apiPath = path;
    for (const method in document.paths[path]) {
      const operationObject = document.paths[path][method];
      let serverUrl;
      if (document.servers && document.servers[0]?.url) {
        serverUrl = document.servers[0]?.url;
      } else {
        serverUrl = url.substring(0, url.lastIndexOf('.well-known/ai-plugin.json'));
      }
      const parameters = operationObject.parameters?.map((param: any) => ({
        name: param.name,
        in: param.in,
        description: param.description,
        required: param.required,
        schema: param.schema,
      }));

      const pluginApiOperation: PluginApiOperation = {
        operationId: operationObject.operationId,
        nameForModel: plugin.name_for_model,
        serverUrl: serverUrl,
        apiPath,
        method,
        summary: operationObject.summary,
        parameters,
      };

      const contentObject = operationObject.requestBody?.content;
      if (contentObject) {
        let content: any = {};
        for (const key in contentObject) {
          if (contentObject[key].schema?.hasOwnProperty('$ref')) {
            contentObject[key].schema = resolveRef(
              contentObject[key].schema.$ref,
              document,
            );
          }
          content[key] = {
            schema: contentObject[key].schema,
          };
        }
        pluginApiOperation.requestBody = {
          required: operationObject.requestBody.required,
          content,
        };
      }

      pluginApiOperation.responses = {};
      for (const key in operationObject.responses) {
        pluginApiOperation.responses[key] = {
          description: operationObject.responses[key].description,
        };
        const response = operationObject.responses[key];
        const contentObject = response.content;
        if (contentObject) {
          let content: any = {};
          for (const key in contentObject) {
            if (contentObject[key].schema?.hasOwnProperty('$ref')) {
              contentObject[key].schema = resolveRef(
                contentObject[key].schema.$ref,
                document,
              );
            }
            content[key] = {
              schema: contentObject[key].schema,
            };
          }
          pluginApiOperation.responses[key].content = content;
        }
      }

      pluginApiOperationList[operationObject.operationId] = pluginApiOperation;
    }
  }

  return pluginApiOperationList;
}

export function getOpenAIFunctionFromPluginApiOperation(
  pluginApiOperation: PluginApiOperation,
): OpenAIFunction {
  const {
    operationId: id,
    summary,
    parameters,
    requestBody,
  } = pluginApiOperation;

  // Build the properties object for OpenAIFunction
  const properties: { [key: string]: {} } = {};
  if (parameters) {
    for (const parameter of parameters) {
      properties[parameter.name] = parameter.schema;
    }
  }

  // Build the required array for OpenAIFunction
  const required =
    parameters
      ?.filter((parameter) => parameter.required)
      .map((parameter) => parameter.name) || [];

  if (requestBody) {
    for (const key in requestBody.content) {
      for (const propertyKey in requestBody.content[key].schema.properties) {
        properties[propertyKey] = {
          type: requestBody.content[key].schema.properties[propertyKey].type,
          description:
            requestBody.content[key].schema.properties[propertyKey]
              .description || '',
        };
        if (requestBody.content[key].schema.properties[propertyKey].required) {
          required.push(propertyKey);
        }
      }
    }
  }

  // Create OpenAIFunction object
  const openAIFunction: OpenAIFunction = {
    name: id,
    description: summary || '',
    parameters: {
      type: 'object',
      properties: properties,
      required: required,
    },
  };

  return openAIFunction;
}

export const runPluginApiOperation = async (
  operation: PluginApiOperation,
  args: string,
) => {
  let query: { [key: string]: string } = {};
  if (operation.parameters) {
    for (const parameter of operation.parameters) {
      if (parameter.in === 'path' && args.includes(parameter.name)) {
        const newPath = JSON.parse(args)[parameter.name];
        operation.apiPath = operation.apiPath.replace(
          `{${parameter.name}}`,
          newPath,
        );
      }
      if (parameter.in === 'query' && args.includes(parameter.name)) {
        const newQuery = JSON.parse(args)[parameter.name];
        query[parameter.name] = newQuery;
      }
    }
  }

  let body: any = {};
  if (operation.requestBody) {
    for (const key in operation.requestBody.content) {
      for (const propertyKey in operation.requestBody.content[key].schema
        .properties) {
        if (args.includes(propertyKey)) {
          body[propertyKey] = JSON.parse(args)[propertyKey];
        }
      }
    }
    body = JSON.stringify(body);
  } else {
    body = undefined;
  }

  let url = operation.serverUrl + operation.apiPath;
  if (query) {
    url = url + '?' + new URLSearchParams(query).toString();
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: operation.method,
    body: body,
  });

  if (operation.responses) {
    for (const key in operation.responses) {
      if (response.status === parseInt(key)) {
        if (operation.responses[key].content) {
          const data = await response.json();
          return data;
        } else {
          return response.statusText;
        }
      }
    }
  }
  try {
    const data = await response.json();
    return data;
  } catch (err) {
    return response.statusText;
  }
};
