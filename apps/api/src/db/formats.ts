export interface QuizFormat {
  id: string;
  name: string;
  description: string;
  setCodes: string[];
}

const eraFormats: QuizFormat[] = [
  {
    id: 'classic',
    name: 'Classic (93–94)',
    description: 'Alpha through Fallen Empires',
    setCodes: ['lea', 'leb', '2ed', '3ed', '4ed', 'arn', 'atq', 'leg', 'drk', 'fem'],
  },
  {
    id: 'ice-mirage',
    name: 'Ice Age / Mirage (95–98)',
    description: 'Ice Age through Exodus',
    setCodes: ['ice', 'hml', 'all', 'chr', '5ed', 'mir', 'vis', 'wth', 'tmp', 'sth', 'exo'],
  },
  {
    id: 'urza-masques',
    name: 'Urza / Masques (98–00)',
    description: 'Urza\'s Saga through Prophecy',
    setCodes: ['usg', 'ulg', 'uds', '6ed', 'mmq', 'nem', 'pcy'],
  },
  {
    id: 'invasion-odyssey',
    name: 'Invasion / Odyssey (00–02)',
    description: 'Invasion through Judgment',
    setCodes: ['inv', 'pls', 'apc', '7ed', 'ody', 'tor', 'jud'],
  },
  {
    id: 'onslaught-mirrodin',
    name: 'Onslaught / Mirrodin (02–04)',
    description: 'Onslaught through Fifth Dawn',
    setCodes: ['ons', 'lgn', 'scg', '8ed', 'mrd', 'dst', '5dn'],
  },
  {
    id: 'kamigawa-ravnica',
    name: 'Kamigawa / Ravnica (04–06)',
    description: 'Champions of Kamigawa through Dissension',
    setCodes: ['chk', 'bok', 'sok', '9ed', 'rav', 'gpt', 'dis'],
  },
  {
    id: 'timespiral-lorwyn',
    name: 'Time Spiral / Lorwyn (06–08)',
    description: 'Coldsnap through Morningtide',
    setCodes: ['csp', 'tsp', 'plc', 'fut', '10e', 'lrw', 'mor'],
  },
  {
    id: 'shadowmoor',
    name: 'Shadowmoor Block (08)',
    description: 'Shadowmoor and Eventide',
    setCodes: ['shm', 'eve'],
  },
];

/** All set codes across every era format */
export function allSetCodes(): string[] {
  return [...new Set(eraFormats.flatMap((f) => f.setCodes))];
}

export const formats: QuizFormat[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: `All ${allSetCodes().length} sets — the full mtg-quiz experience`,
    setCodes: allSetCodes(),
  },
  ...eraFormats,
];

export function getFormat(id: string): QuizFormat | undefined {
  return formats.find((f) => f.id === id);
}
