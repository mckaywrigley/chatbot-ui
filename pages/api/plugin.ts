import { plugins as allPlugins } from "./plugins";

export async function choose_plugin(message: string, plugins: string[], api: string) {
  const plugins_with_description = allPlugins.filter(plugin => plugins.includes(plugin.id));
  if(plugins_with_description.length == 0) return "";
  let systemPrompt = `You are an AI assistant.
This is the start of conversation.
Here are list of plugins

${
  plugins_with_description.map((plugin, index) => {
    return `${index+1}.
Name: ${plugin.id}
Description: ${plugin.description}
Parameters: ${JSON.stringify(plugin.parameters)}\n`;
  }).join('\n')
}

You must respond only with json format with type of followings
{"plugin":PLUGIN_NAME, "parameters":{PARAM1:PARAM1_VALUE,PARAM2:PARAM2_VALUE,...}}`;
  const data = {
    roles: ["system", "user"],
    messages: [
      systemPrompt,
      message
    ],
    uids: (new Array(16)).fill(22),
    return_all: true
  }
  console.log("plugins", plugins_with_description)
  console.log("data", data)
  const response = await fetch(
    `https://api.bitapai.io/v2/conversation`,
    {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': api,
    },
    method: 'POST',
    body: JSON.stringify(data),
  }).then(res => res.json());
  console.log(response);
  const response_texts = response.assistant.map((each: any) => each.response);
  const valid_responses = response_texts.filter((each: string) => validate_response(each));
  if(valid_responses.length > 0) {
    console.log(valid_responses);
    const valid_response = JSON.parse(valid_responses[0]);
    console.log("valid response", valid_response);
    const plugin = allPlugins.find(plugin => plugin.id === valid_response.plugin);
    if(plugin) {
      const plugin_response = await plugin.run(valid_response.parameters);
      console.log("plugin response", plugin_response);
      return `This is response of ${plugin.id} plugin for "${message}"
${JSON.stringify(plugin_response)}
`;
    }
  }
  return "";
}

function validate_response(resp_text: string) {
  try {
    const resp_json = JSON.parse(resp_text);
    if(resp_json.plugin && resp_json.parameters) {
      const plugin = allPlugins.find(plugin => plugin.id === resp_json.plugin);
      if(!plugin) return false;
      if(Object.keys(plugin.parameters).some(key => !resp_json.parameters[key])) return false;
      return true;
    }
  } catch (error) {
  }
  return false;
}