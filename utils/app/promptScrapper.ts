import { v4 as uuidv4 } from 'uuid';

interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // maximum length of a message
  tokenLimit: number;
}

interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  model: OpenAIModel;
  folderId: string | null;
}

interface Scrapper {
  description: string;
  url: string;
}
export class PromptScrappers {
  model: OpenAIModel;
  scrappers: Scrapper[] = [];
  constructor(model: OpenAIModel) {
    this.model = model;
    this.scrappers.push({
      description: "git:f/awesome-chatgpt-prompts",
      url: "https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv"
    })
  }

  init = async () => {
    var prompts = [] as Prompt[];
    for (let i=0; i < this.scrappers.length; i++) {
      const scrapper = this.scrappers[i];
      const prompt = await this.runScrapper(scrapper.url, scrapper.description);
      prompts = prompts.concat(prompt);
    }
    return prompts;
  }
  
  cleanCsvString = (text: string) => text.trim().replace(/^"(.*)"$/, '$1');
  replaceQuote = (text: string) => text.replace(/`([^`]+)`/g, "{{ $1 }}");
  safeSplit = (text: string, separator: string) => { 
    const split = text.split(separator);
    if (split.length < 2) return [text, ''];
    return split;
  }
  getDescriptions = () => this.scrappers.map((scrapper) => scrapper.description);
  runScrapper = async (url: string, description: string) => {
    const csv = await fetch(url).then((res) => res.text());
    const prompts = [] as Prompt[];
    csv.split("\n").forEach((prompt) => {
      prompt = this.cleanCsvString(prompt);
      var [name, content] = this.safeSplit(prompt, `","`);
      if (!name || !content) return;
      name = this.replaceQuote(name);
      content = this.replaceQuote(content);
      const newPrompt: Prompt = {
        id: uuidv4(),
        name: name,
        description: description,
        content: content,
        model: this.model,
        folderId: null,
      };
      prompts.push(newPrompt);
    });
    return prompts;
  }
}
