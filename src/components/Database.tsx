import Dexie, { type Table } from 'dexie';
import { getActiveNotes } from './utils/AuxFunctions';

export interface GlobalChord {
  id: string;         // "2_[1,4,3,1,2,1]"
  rootIndex: number;  // Tónica del acorde
  extension: string;  // "maj7"  
  bassIndex: number;
  figura: (number | 'x')[];   // [-1, 4, 3, 1, 1, 1]
  tags: string[];     // Categorías indexables ("Mayor", "Séptima")
  isFavorite: boolean;
}

export interface CustomChord {
  name: string;
  frets: (number | 'x')[];
}

export const CATEGORIES = [
  'Mayor', 'Menor', 'Séptima Mayor', 'Séptima Menor',  'Suspendido', 'Disminuido', 'Semi-disminuido', 'Aumentado',  'Sexta', 'Extendido', 'Novena y Superiores', 'Otras tensiones', 'Power Chord', 'Abierto', 'Triada', 'Drop2', 'Drop3', 'Drop2&4', 'Personalizado'
];

// Máscaras de Drop Voicings (1 = Muteada 'x', 0 = Nota sonando)
export const DROP_MASKS: Record<string, number[][]> = {
  // Drop 2 (4 cuerdas consecutivas)
  Drop2: [
    [1, 1, 0, 0, 0, 0], // Cuerdas 4-3-2-1
    [1, 0, 0, 0, 0, 1], // Cuerdas 5-4-3-2
    [0, 0, 0, 0, 1, 1], // Cuerdas 6-5-4-3
  ],
  // Drop 3 (Salto de 1 cuerda en el bajo)
  Drop3: [
    [1, 0, 1, 0, 0, 0], // Cuerdas 5-x-3-2-1
    [0, 1, 0, 0, 0, 1], // Cuerdas 6-x-4-3-2
  ],
  // Drop 2&4 (Salto doble típico en la armadura)
  "Drop2&4": [
    [0, 1, 0, 0, 1, 0], // Cuerdas 6-x-4-3-x-1
    [0, 0, 1, 0, 1, 0], // Cuerdas 6-5-x-3-x-1
  ]
};

// Helper para aplicar las máscaras de Drop Voicings 
export const getDropVoicing = (figura: (number | 'x')[]) : string => {

  // Si hay exactamente 3 notas en 3 cuerdas, es una tríada (puede ser mayor, menor, dim, aug, sus)
  if (getActiveNotes(figura).length === 3 && figura.filter(e => e === 'x').length === 3) return 'Triada';

  // Si no hay 4 notas activas, no es Drop Voicing
  if (getActiveNotes(figura).length !== 4) return '';
  // Mapeamos la figura a una máscara binaria
  const currentMask = figura.map(fret => fret === 'x' ? 1 : 0); 
  
  for(const [type, masks] of Object.entries(DROP_MASKS)) {
    const isMatch = masks.some(mask =>
      mask.every((val, index) => val === currentMask[index])
    );
    if (isMatch) return type;
  }

  return '';
};

// Helper para guardar acordes en la IndexedDB
export const saveChord = async (chordId: string, rootIndex: number, bassIndex: number, extension: string, figura:(number | 'x')[], tags: string[]) => {
  const existingChord = await db.globalChords.get(chordId);

    // Guardamos el acorde en la tabla global
      await db.globalChords.put({
        id: chordId,
        rootIndex: rootIndex,
        bassIndex: bassIndex,
        extension: extension.trim(),
        figura: figura,
        tags: tags,
        isFavorite: existingChord?.isFavorite ?? false,
      });
  }

export const setChordFavorite = async (chordId: string, isFavorite: boolean) => {
  await db.globalChords.update(chordId, { isFavorite });
};

export class FlashChordsDB extends Dexie {
  globalChords!: Table<GlobalChord>;
  customChords!: Table<CustomChord, (number|'x')[]>;

  constructor() {
    super('FlashChordsDB');
    
    // Indexamos los campos que necesitaremos filtrar frecuentemente
    // this.version(1).stores({
    //   globalChords: 'id, rootIndex, *tags', // *tags permite buscar dentro de arrays
    // });

    this.version(2).stores({
      globalChords: 'id, rootIndex, *tags',
      customChords: 'frets',
    });
  }
}

export const db = new FlashChordsDB();

// --- FUNCIONES AUXILIARES ---

export const getAllChords = async () => {
  const chords = await db.globalChords.toArray();
  return chords.map((chord) => ({
    id: chord.id,
    rootIndex: chord.rootIndex,
    bassIndex: chord.bassIndex,
    extension: chord.extension,
    frets: chord.figura, // Mapeo clave para evitar undefined en el diapasón
    tags: chord.tags,
    isFavorite: chord.isFavorite ?? false,
  }));
};

export const getCustomChordName = async (frets: (number | 'x')[]): Promise<string | null> => {
  const customChord = await db.customChords.get(frets);
  return customChord?.name ?? null;
};

export const saveCustomChordName = async (name: string, frets: (number | 'x')[]) => {
  await db.customChords.put({
    name: name.trim(),
    frets,
  });
};

export const deleteCustomChordName = async (frets: (number | 'x')[]) => {
  await db.customChords.delete(frets);
};

export const generateChordTags = (
  root: string,
  chordName: string, 
  figura: (number | 'x')[], 
  customName?: string
): string[] => {
  const tags: string[] = [];

  // Personalizado
  if (customName && customName.trim() !== '') {
    tags.push('Personalizado');
    chordName = customName;
  }

  // Abierto: si usa cuerdas al aire (traste 0)
  const numericFrets = figura.filter((f): f is number => typeof f === 'number');
  if (numericFrets.includes(0)) tags.push('Abierto');

  // Parseo por sufijos en el nombre del acorde
  const baseName = chordName.split('/')[0]; // Ignoramos el bajo en el parseo armónico

  // Power Chord
  if (baseName === root + '5') tags.push('Power Chord');

  // Disminuidos / Semi-disminuidos
  if (baseName.includes('m7b5')) { tags.push('Semi-disminuido'); } 
  else if (baseName.includes('dim')) { tags.push('Disminuido'); }

  // Aumentado
  if (baseName.includes('aug') || baseName.includes('#5')) tags.push('Aumentado');

  // Suspendido
  if (baseName.includes('sus')) tags.push('Suspendido');

  // Sexta
  if (baseName.includes('6') && !baseName.includes('6/9')) tags.push('Sexta')

  // Séptima
  if (baseName.includes('7') && !baseName.includes('m7b5') && !baseName.includes('dim7')) {
    if(baseName.toLowerCase().includes('maj')) tags.push('Séptima Mayor');
    else tags.push('Séptima Menor');
  }

  // Novena y Superiores
  const parentesis = baseName.split('('), sinParentesis = parentesis[0];
  const conParentesis = parentesis.length > 1 ? parentesis[1] : '';
  if (sinParentesis && (sinParentesis.includes('9') || sinParentesis.includes('11') || sinParentesis.includes('13') || sinParentesis.includes('6/9'))) tags.push('Novena y Superiores');

  // Ampliados
  if (conParentesis.includes('add')) tags.push("Extendido")

  // Otras tensiones
  if (baseName.includes('b9') || baseName.includes('#9') || baseName.includes('#11') || baseName.includes('b13')) tags.push('Otras tensiones');

  // Mayor vs Menor (Evaluación de cualidad principal)
  if (baseName.includes('m') && !baseName.includes('maj') && !baseName.includes('dim')) tags.push('Menor');
  else if (!baseName.includes('m') || baseName.includes('maj')) 
    if (!tags.includes('Power Chord') && !tags.includes('Suspendido') && !tags.includes('Disminuido') && !tags.includes('Aumentadod')) tags.push('Mayor'); 

  // Drop Voicings
  const dropVoicing = getDropVoicing(figura);
  if (dropVoicing !== '') tags.push(dropVoicing);

  

  return [...new Set(tags)];
};

