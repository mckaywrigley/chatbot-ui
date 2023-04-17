import { Plugin, RemotePluginTool } from '@/types/agent';

import { ToolExecutionContext } from './executor';
import search from './search';

import pluginsJson from '@/plugins.json';

interface PluginsJson {
  urls: string[];
}

function snakeToCamel(obj: Record<string, any>) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const camelObj: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
    camelObj[camelKey] = snakeToCamel(obj[key]);
  });

  return camelObj;
}

const loadFromUrl = async (url: string): Promise<Plugin> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch plugin from ${url} with status ${res.status}`,
    );
  }
  const plugin = snakeToCamel(await res.json()) as RemotePluginTool;
  const apiSpecRes = await fetch(plugin.api.url);
  if (!apiSpecRes.ok) {
    throw new Error(
      `Failed to fetch API spec from ${plugin.api.url} with status ${apiSpecRes.status}`,
    );
  }
  const apiUrlJson = (await apiSpecRes.text()).trim();
  const apiSpec = `Usage Guide: ${plugin.descriptionForHuman}\n\nOpenAPI Spec: ${apiUrlJson}`;
  return {
    ...plugin,
    // override description for model.
    descriptionForModel: `Call this tool to get the OpenAPI spec (and usage guide)
for interacting with the ${plugin.nameForHuman} API.
You should only call this ONCE! What is the "
${plugin.nameForHuman} API useful for? "
${plugin.descriptionForHuman}`,
    apiSpec: `Usage Guide: ${plugin.descriptionForHuman}\n\nOpenAPI Spec: ${apiUrlJson}`,
    displayForUser: true,
    execute: async (ctx: ToolExecutionContext, input: string) => apiSpec,
  };
};

let cache: Plugin[] | null = null;
export const listTools = async (): Promise<Plugin[]> => {
  if (cache !== null) {
    return cache;
  }

  const plugins = pluginsJson as PluginsJson;
  const result: Plugin[] = [search];
  for (const url of plugins.urls) {
    const tool = await loadFromUrl(url);
    result.push(tool);
  }

  cache = result;
  return result;
};
