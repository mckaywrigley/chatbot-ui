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

export class PromptScrappers {
  scrappers: ((model: OpenAIModel) => Promise<Prompt[]>)[];
  model: OpenAIModel;
  constructor(model: OpenAIModel) {
    this.model = model;
    this.scrappers = [
      this.awesomeChatGptPrompts,
    ];
  }

  init = async () => {
    var prompts = [] as Prompt[];
    for (const scrapper of this.scrappers) {
      const prompt = await scrapper(this.model) as Prompt[];
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
  awesomeChatGptPrompts = async (model: OpenAIModel) => {
    const url = "https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv";
    const description = "git:f/awesome-chatgpt-prompts";
    const csv = await fetch(url).then((res) => res.text());
    const prompts = [] as Prompt[];
    csv.split("\n").forEach((prompt) => {
      prompt = this.cleanCsvString(prompt);
      var [name, content] = this.safeSplit(prompt, `","`);
      if (!name || !content) return;
      name = this.replaceQuote(name);
      content = this.replaceQuote(content);
      console.log(name, content)
      const newPrompt: Prompt = {
        id: uuidv4(),
        name,
        description,
        content: content,
        model,
        folderId: null,
      };
      prompts.push(newPrompt);
    });
    return prompts;
  }
}



