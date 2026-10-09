export interface ScaleDefinition {
  name: string;
  intervals: readonly number[];
  degreeLetters: readonly number[];
}

const sevenLetterSteps = [0, 1, 2, 3, 4, 5, 6] as const;

export const SCALE_DEFINITIONS = {
  ionian: { name: 'Mayor (jónico)', intervals: [0, 2, 4, 5, 7, 9, 11], degreeLetters: sevenLetterSteps },
  dorian: { name: 'Dórico', intervals: [0, 2, 3, 5, 7, 9, 10], degreeLetters: sevenLetterSteps },
  phrygian: { name: 'Frigio', intervals: [0, 1, 3, 5, 7, 8, 10], degreeLetters: sevenLetterSteps },
  lydian: { name: 'Lidio', intervals: [0, 2, 4, 6, 7, 9, 11], degreeLetters: sevenLetterSteps },
  mixolydian: { name: 'Mixolidio', intervals: [0, 2, 4, 5, 7, 9, 10], degreeLetters: sevenLetterSteps },
  aeolian: { name: 'Menor natural (eólico)', intervals: [0, 2, 3, 5, 7, 8, 10], degreeLetters: sevenLetterSteps },
  locrian: { name: 'Locrio', intervals: [0, 1, 3, 5, 6, 8, 10], degreeLetters: sevenLetterSteps },
  majorPentatonic: { name: 'Pentatónica mayor', intervals: [0, 2, 4, 7, 9], degreeLetters: [0, 1, 2, 4, 5] },
  minorPentatonic: { name: 'Pentatónica menor', intervals: [0, 3, 5, 7, 10], degreeLetters: [0, 2, 3, 4, 6] },
  harmonicMinor: { name: 'Menor armónica', intervals: [0, 2, 3, 5, 7, 8, 11], degreeLetters: sevenLetterSteps },
  melodicMinor: { name: 'Menor melódica', intervals: [0, 2, 3, 5, 7, 9, 11], degreeLetters: sevenLetterSteps },
  neapolitanMinor: { name: 'Menor napolitana', intervals: [0, 1, 3, 5, 7, 8, 11], degreeLetters: sevenLetterSteps },
  blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], degreeLetters: [0, 2, 3, 4, 4, 6] },
  freygish: { name: 'Freygish (frigio dominante)', intervals: [0, 1, 4, 5, 7, 8, 10], degreeLetters: sevenLetterSteps },
  miSheberach: { name: 'Mi-Shebarach (dórico #4)', intervals: [0, 2, 3, 6, 7, 9, 10], degreeLetters: sevenLetterSteps },
  adonaiMolokh: { name: 'Adonai Molokh (mixolidio)', intervals: [0, 2, 4, 5, 7, 9, 10], degreeLetters: sevenLetterSteps },
  hirajoshi: { name: 'Hirajoshi', intervals: [0, 2, 3, 7, 8], degreeLetters: [0, 1, 2, 4, 5] },
  kumoi: { name: 'In (Kumoi)', intervals: [0, 2, 3, 7, 9], degreeLetters: [0, 1, 2, 4, 5] },
  iwato: { name: 'Iwato', intervals: [0, 1, 5, 6, 10], degreeLetters: [0, 1, 3, 4, 6] },
  sakura: { name: 'Sakura', intervals: [0, 3, 5, 6, 10], degreeLetters: [0, 2, 3, 4, 6] },
  arabic: { name: 'Árabe (doble armónica mayor)', intervals: [0, 1, 4, 5, 7, 8, 11], degreeLetters: sevenLetterSteps },
} as const satisfies Record<string, ScaleDefinition>;

export type ScaleId = keyof typeof SCALE_DEFINITIONS;

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PITCHES: Record<(typeof LETTERS)[number], number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

export const getPitchClass = (noteName: string): number => {
  const match = noteName.match(/^([A-G])([#b]*)$/);
  if (!match) return 0;

  const [, letter, accidentals] = match;
  const offset = [...accidentals].reduce((total, accidental) => total + (accidental === '#' ? 1 : -1), 0);
  return (NATURAL_PITCHES[letter as (typeof LETTERS)[number]] + offset + 12) % 12;
};

const accidentalSuffix = (offset: number) =>
  offset > 0 ? '#'.repeat(offset) : offset < 0 ? 'b'.repeat(-offset) : '';

export const spellScaleNotes = (
  rootName: string,
  definition: ScaleDefinition,
): string[] => {
  const rootLetterIndex = LETTERS.indexOf(rootName[0].toUpperCase() as (typeof LETTERS)[number]);
  const rootPitchClass = getPitchClass(rootName);

  return definition.intervals.map((interval, degreeIndex) => {
    const letter = LETTERS[(rootLetterIndex + definition.degreeLetters[degreeIndex]) % LETTERS.length];
    const targetPitchClass = (rootPitchClass + interval) % 12;
    let accidental = (targetPitchClass - NATURAL_PITCHES[letter] + 12) % 12;
    if (accidental > 6) accidental -= 12;
    return `${letter}${accidentalSuffix(accidental)}`;
  });
};

export const getDegreeLabel = (interval: number): string => {
  const labels: Record<number, string> = {
    0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
    6: 'b5 / #4', 7: '5', 8: 'b6 / #5', 9: '6', 10: 'b7', 11: '7',
  };
  return labels[interval] ?? String(interval);
};

export const getChordTonePitchClasses = (scaleNotes: number[], startDegreeIndex: number): number[] => {
  if (scaleNotes.length === 0) return [];
  const root = scaleNotes[startDegreeIndex];
  const relativeIntervals = scaleNotes.map(note => (note - root + 12) % 12);

  if (scaleNotes.length <= 6) {
    const third = relativeIntervals.find(interval => interval === 3)
      ?? relativeIntervals.find(interval => interval === 4);
    const fifth = relativeIntervals.find(interval => interval === 7)
      ?? relativeIntervals.find(interval => interval === 6)
      ?? relativeIntervals.find(interval => interval === 8);
    const seventh = relativeIntervals.find(interval => interval === 10)
      ?? relativeIntervals.find(interval => interval === 11);
    return [0, third, fifth, seventh]
      .filter((interval): interval is number => interval !== undefined)
      .map(interval => (root + interval) % 12);
  }

  return [0, 2, 4, 6]
    .map(offset => scaleNotes[(startDegreeIndex + offset) % scaleNotes.length]);
};
