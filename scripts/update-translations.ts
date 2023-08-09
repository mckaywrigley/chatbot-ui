import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

import { Configuration, OpenAIApi } from 'openai';

dotenv.config({ path: '.env.local' });
const dirPath = './public/locales';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('You need to set OPENAI_API_KEY in the .env.local file');
}
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

interface JSONData {
  [key: string]: string;
}

async function fixTranslation(
  languageCode: string,
  translations: JSONData,
): Promise<JSONData | undefined> {
  const prompt =
    `TARGET LANGUAGE: "${languageCode}".
CONTENT:\n` + JSON.stringify(translations, null, '  ');

  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are a translator and know all languages. 
You are tasked with maintaining an application locale translation files expressed in JSON.
The JSON content is composed of keys representing English label that must not change, and values that represent the translation of those labels.
The labels are meant to be displayed on the application user interface, as such they must be concise.
If the translations are already correct, return the JSON content unchanged. Only update entries that obviously aren't already translated or are misleading.
Remember to always respond with a JSON document, no matter what.
Respond in JSON format.`,
      },
      { role: 'user', content: prompt },
    ],
  });
  const data = response?.data?.choices?.[0]?.message?.content;
  if (data) {
    try {
      return JSON.parse(data);
    } catch (err) {
      console.error(`failed to parse JSON ${data}`);
    }
  }
}

async function updateTranslations() {
  const directories = fs.readdirSync(dirPath);

  for (const directory of directories) {
    if (directory === 'en') continue;
    console.info(`Checking transalations in ${directory}`);

    const subdir = path.join(dirPath, directory);
    const jsonFiles = fs.readdirSync(subdir);

    for (const file of jsonFiles) {
      console.info(`\t${file}`);
      const filePath = path.join(subdir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      const jsonData: JSONData = JSON.parse(fileContent);
      if (Object.keys(jsonData).length === 0) continue;

      const translation = await fixTranslation(directory, jsonData);
      if (translation) {
        console.log(`\t\t\ttranslation: ${JSON.stringify(translation)}`);
        fs.writeFileSync(
          filePath,
          JSON.stringify(translation, null, 2),
          'utf-8',
        );
      } else {
        console.error(`\t\t\tno data received`);
      }
    }
  }
}

// Invoke the function
updateTranslations();