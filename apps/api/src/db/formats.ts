export interface QuizFormat {
  id: string;
  name: string;
  description: string;
  /** Scryfall set codes used to filter the card pool */
  setCodes: string[];
}

export const formats: QuizFormat[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Alpha through Fallen Empires (1993–1994)',
    setCodes: ['lea', 'leb', '2ed', '3ed', '4ed', 'arn', 'atq', 'leg', 'drk', 'fem'],
  },
  {
    id: 'middle',
    name: 'Middle Era',
    description: 'Ice Age through Urza\'s Destiny (1995–1999)',
    setCodes: ['ice', 'hml', 'all', 'chr', '5ed', 'mir', 'vis', 'wth', 'tmp', 'sth', 'exo', '6ed', 'usg', 'ulg', 'uds'],
  },
];

export function getFormat(id: string): QuizFormat | undefined {
  return formats.find((f) => f.id === id);
}

export const defaultFormat: QuizFormat = formats[0]!;
