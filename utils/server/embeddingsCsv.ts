import fs from 'fs';

const csv = require('csv');

const SWIZ_CSV_FILE = `${process.cwd()}/data/embedded_sections.csv`;
const JSTARK_CSV_FILE = `${process.cwd()}/data/jstark_embedded_sections.csv`;

export interface Section {
  type: 'section';
  title: string;
  content: string;
}

export type SectionWithEmbedding = Section & {
  embedding: number[];
};

export async function readEmbeddingsFromCSV() {
  const readStream = fs
    .createReadStream(JSTARK_CSV_FILE)
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
