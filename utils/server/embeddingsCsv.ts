import fs from 'fs';

const csv = require('csv');

const CSV_FILE = `${process.cwd()}/data/embedded_sections.csv`;

export interface Section {
  type: 'section';
  title: string;
  content: string;
}

export type SectionWithEmbedding = Section & {
  embedding: number[];
};

export async function writeEmbeddingsToCSV(embeddings: SectionWithEmbedding[]) {
  const columns = ['title', 'content', 'embedding'];

  const writeStream = fs.createWriteStream(CSV_FILE);
  const stringifier = csv.stringify({ header: true, columns });

  for await (const { title, content, embedding } of embeddings) {
    stringifier.write([title, content, embedding]);
  }

  stringifier.pipe(writeStream);
}

export async function readEmbeddingsFromCSV() {
  const readStream = fs
    .createReadStream(CSV_FILE)
    .pipe(csv.parse({ from_line: 2 }));

  const data = [];

  for await (const row of readStream) {
    const [title, content, embedding] = row;
    data.push({
      title,
      content,
      embedding: JSON.parse(embedding),
      similarity: 0,
    });
  }

  return data;
}
