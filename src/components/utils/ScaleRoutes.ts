import { getChordTonePitchClasses } from './ScaleTheory';

export interface ScalePosition {
  stringIndex: number;
  fretNumber: number;
  midiNote: number;
}

export const CAGED_FORMS = [
  { id: 'C', anchorString: 1, fretsBeforeRoot: 3, shapeOffsets: [null, 0, -1, -3, -2, -3] },
  { id: 'A', anchorString: 1, fretsBeforeRoot: 0, shapeOffsets: [null, 0, 2, 2, 2, 0] },
  { id: 'G', anchorString: 0, fretsBeforeRoot: 3, shapeOffsets: [0, -1, -3, -3, -3, 0] },
  { id: 'E', anchorString: 0, fretsBeforeRoot: 0, shapeOffsets: [0, 2, 2, 1, 0, 0] },
  { id: 'D', anchorString: 2, fretsBeforeRoot: 0, shapeOffsets: [null, null, 0, 2, 3, 2] },
] as const;

export type CagedFormId = (typeof CAGED_FORMS)[number]['id'];
export type SequencePattern = 'scale' | 'thirds' | 'three-note' | 'four-note';
export type ScaleRouteMode = 'caged' | 'caged-fixed' | '3nps' | '4nps';

const findRootAnchorFret = (
  rootPitchClass: number,
  anchorString: number,
  fretsBeforeRoot: number,
  openMidiNotes: number[],
  maxFret: number,
): number | null => {
  for (let fret = 0; fret <= maxFret; fret++) {
    const boxStart = fret - fretsBeforeRoot;
    if (boxStart < 0 || boxStart + 4 > maxFret) continue;
    if ((openMidiNotes[anchorString] + fret) % 12 === rootPitchClass) return fret;
  }
  return null;
};

export const buildCagedRoute = (
  scaleNotes: number[],
  startDegreeIndex: number,
  formIndex: number,
  openMidiNotes: number[],
  maxFret: number,
): ScalePosition[] => {
  const form = CAGED_FORMS[formIndex % CAGED_FORMS.length];
  const rootPitchClass = scaleNotes[startDegreeIndex];
  const rootFret = findRootAnchorFret(rootPitchClass, form.anchorString, form.fretsBeforeRoot, openMidiNotes, maxFret);
  if (rootFret === null) return [];

  const boxStart = rootFret - form.fretsBeforeRoot;
  const boxEnd = boxStart + 4;
  const scalePitchClasses = new Set(scaleNotes);
  const positions: ScalePosition[] = [];

  openMidiNotes.forEach((openMidi, stringIndex) => {
    for (let fretNumber = boxStart; fretNumber <= boxEnd; fretNumber++) {
      const midiNote = openMidi + fretNumber;
      if (scalePitchClasses.has(midiNote % 12)) positions.push({ stringIndex, fretNumber, midiNote });
    }
  });

  const uniquePitches = new Map<number, ScalePosition>();
  positions
    .sort((left, right) => left.midiNote - right.midiNote
      || left.fretNumber - right.fretNumber
      || left.stringIndex - right.stringIndex)
    .forEach(position => {
      if (!uniquePitches.has(position.midiNote)) uniquePitches.set(position.midiNote, position);
    });

  return startAtDegree([...uniquePitches.values()], scaleNotes[startDegreeIndex]);
};

export const buildCagedChordGrip = (
  scaleNotes: number[],
  startDegreeIndex: number,
  formIndex: number,
  openMidiNotes: number[],
  maxFret: number,
): ScalePosition[] => {
  const form = CAGED_FORMS[formIndex % CAGED_FORMS.length];
  const rootPitchClass = scaleNotes[startDegreeIndex];
  const rootFret = findRootAnchorFret(rootPitchClass, form.anchorString, form.fretsBeforeRoot, openMidiNotes, maxFret);
  if (rootFret === null) return [];

  const rootMidi = openMidiNotes[form.anchorString] + rootFret;
  const chordTones = getChordTonePitchClasses(scaleNotes, startDegreeIndex);
  const chordIntervals = chordTones.map(pitchClass => (pitchClass - rootPitchClass + 12) % 12);
  const thirdInterval = chordIntervals.find(interval => interval === 3 || interval === 4) ?? 4;
  const fifthInterval = chordIntervals.find(interval => interval === 6 || interval === 7 || interval === 8) ?? 7;

  return form.shapeOffsets.flatMap((shapeOffset, stringIndex) => {
    if (shapeOffset === null) return [];
    const baseMidi = openMidiNotes[stringIndex] + rootFret + shapeOffset;
    const baseInterval = (baseMidi - rootMidi + 12) % 12;
    const adjustment = baseInterval === 4 ? thirdInterval - 4
      : baseInterval === 7 ? fifthInterval - 7
        : 0;
    const fretNumber = rootFret + shapeOffset + adjustment;
    if (fretNumber < 0 || fretNumber > maxFret) return [];

    return [{ stringIndex, fretNumber, midiNote: openMidiNotes[stringIndex] + fretNumber }];
  });
};

const startAtDegree = (positions: ScalePosition[], pitchClass: number): ScalePosition[] => {
  const startIndex = positions.findIndex(position => position.stringIndex === 0 && position.midiNote % 12 === pitchClass);
  const fallbackIndex = positions.findIndex(position => position.midiNote % 12 === pitchClass);
  const index = startIndex >= 0 ? startIndex : fallbackIndex;
  return index > 0 ? positions.slice(index) : positions;
};

export const buildNpsRoute = (
  scaleNotes: number[],
  startDegreeIndex: number,
  notesPerString: 3 | 4,
  openMidiNotes: number[],
  maxFret: number,
): ScalePosition[] => {
  const scalePitchClasses = new Set(scaleNotes);
  const startPitchClass = scaleNotes[startDegreeIndex];
  let bestRoute: ScalePosition[] = [];

  for (let startString = 0; startString < openMidiNotes.length; startString++) {
    for (let startFret = 0; startFret <= maxFret; startFret++) {
      const startMidi = openMidiNotes[startString] + startFret;
      if (startMidi % 12 !== startPitchClass) continue;

      const route: ScalePosition[] = [];
      let currentMidi = startMidi;
      for (let stringIndex = startString; stringIndex < openMidiNotes.length; stringIndex++) {
        const stringPositions: ScalePosition[] = [];
        for (let noteIndex = 0; noteIndex < notesPerString; noteIndex++) {
          if (route.length > 0 || stringPositions.length > 0) {
            do {
              currentMidi++;
            } while (!scalePitchClasses.has(currentMidi % 12));
          }

          const fretNumber = currentMidi - openMidiNotes[stringIndex];
          if (fretNumber < 0 || fretNumber > maxFret) break;
          stringPositions.push({ stringIndex, fretNumber, midiNote: currentMidi });
        }

        if (stringPositions.length !== notesPerString) break;
        route.push(...stringPositions);
      }

      if (route.length > bestRoute.length) bestRoute = route;
    }
  }

  return bestRoute;
};

export const applySequencePattern = (
  positions: ScalePosition[],
  pattern: SequencePattern,
): ScalePosition[] => {
  if (pattern === 'scale') return positions;

  const sequenced: ScalePosition[] = [];
  for (let start = 0; start < positions.length; start++) {
    if (pattern === 'thirds') {
      sequenced.push(positions[start]);
      if (positions[start + 2]) sequenced.push(positions[start + 2]);
    } else {
      const groupSize = pattern === 'three-note' ? 3 : 4;
      sequenced.push(...positions.slice(start, start + groupSize));
    }
  }
  return sequenced;
};
