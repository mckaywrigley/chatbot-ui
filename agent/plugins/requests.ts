// This file is derived from:
// https://github.com/hwchase17/langchainjs/blob/main/langchain/src/tools/requests.ts
import { extractTextFromHtml } from '@/utils/server/webpage';

import { Plugin } from '@/types/agent';

import { ToolExecutionContext } from './executor';

export interface Headers {
  [key: string]: string;
}

export interface RequestTool {
  headers: Headers;
}

export class RequestsGetTool implements Plugin, RequestTool {
  nameForHuman = 'requests_get_api';
  nameForModel = 'requests_get_api';
  displayForUser = false;

  constructor(public headers: Headers = {}) {}

  async execute(context: ToolExecutionContext, input: string) {
    const res = await fetch(input, {
      headers: this.headers,
    });
    return res.text();
  }

  descriptionForHuman = 'Use this when you want to GET to a web using API.';
  descriptionForModel = `A portal to the internet. Use this when you need to get specific content using API. 
  Input should be a  url (i.e. https://www.google.com). The output will be the text response of the GET request.`;
}

export class RequestsPostTool implements Plugin, RequestTool {
  nameForHuman = 'requests_post_api';
  nameForModel = 'requests_post_api';
  displayForUser = false;

  constructor(public headers: Headers = {}) {}

  async execute(context: ToolExecutionContext, input: string) {
    try {
      const { url, data } = JSON.parse(input);
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      });
      return res.text();
    } catch (error) {
      return `${error}`;
    }
  }

  descriptionForHuman = 'Use this when you want to POST to an API endpoint.';
  descriptionForModel = `Use this when you want to POST to an API endpoint.
  Input should be a json string with two keys: "url" and "data".
  The value of "url" should be a string, and the value of "data" should be a dictionary of 
  key-value pairs you want to POST to the url as a JSON body.
  Be careful to always use double quotes for strings in the json string
  The output will be the text response of the POST request.`;
}

export class RequestsGetWebpageTool implements Plugin, RequestTool {
  nameForHuman = 'requests_get_webpage_content';
  nameForModel = 'requests_get_webpage_content';
  displayForUser = false;

  constructor(public headers: Headers = {}) {}

  async execute(context: ToolExecutionContext, input: string) {
    const res = await fetch(input, {
      headers: this.headers,
    });
    const html = await res.text();
    const text = extractTextFromHtml(context.encoding, html, 500);
    return text;
  }

  descriptionForHuman =
    'Use this when you want to GET to a text content of the webpage.';
  descriptionForModel = `A portal to the internet. Use this when you need to get specific content from a website. 
  Input should be a  url (i.e. https://www.google.com). The output will be the text response of the GET request.`;
}

export class RequestsPostWebpageTool implements Plugin, RequestTool {
  nameForHuman = 'requests_post_webpage';
  nameForModel = 'requests_post_webpage';
  displayForUser = false;

  constructor(public headers: Headers = {}) {}

  async execute(context: ToolExecutionContext, input: string) {
    try {
      const { url, data } = JSON.parse(input);
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      });
      return res.text();
    } catch (error) {
      return `${error}`;
    }
  }

  descriptionForHuman = 'Use this when you want to POST to a webpage.';
  descriptionForModel = `Use this when you want to POST to a webpage.
  Input should be a json string with two keys: "url" and "data".
  The value of "url" should be a string, and the value of "data" should be a dictionary of 
  key-value pairs you want to POST to the url as a JSON body.
  Be careful to always use double quotes for strings in the json string
  The output will be the text response of the POST request.`;
}
