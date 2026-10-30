import { CHROMATIC_FLATS, CHROMATIC_SHARPS, BASE_NOTES, BASE_OCTAVES } from "../Config";
import { CATEGORIES, getCustomChordName } from "../Database";
import type { AccidentalsPreference } from "../Pages/MenuSettings";
import type { ChordColorOption, ChordTypeOption, ExerciseMode } from "../Config";
import { getAllChords } from "../Database";

// --- FUNCIONES DE NOTAS --- //

// Devuelve el nombre de una nota
/**
 * Obtiene el nombre de la nota que suena en una cuerda y traste usando la
 * preferencia indicada para representar alteraciones.
 * @precondition `stringIndex` identifica una cuerda de `BASE_NOTES`; `fret` es un traste no negativo o `'x'`.
 * @postcondition Devuelve el nombre cromático elegido o `''` si la cuerda está silenciada o no tiene nota base válida.
 */
export const getNoteName = (stringIndex: number, fret: number | 'x', accidentals: 'sharps' | 'flats' = 'sharps'): string => {
    if (fret === 'x') return '';
  
    const noteIndex = getNoteIndex(stringIndex, fret);
    if (noteIndex === -1) return '';

    const scale = accidentals == 'flats' ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
    return scale[noteIndex];
} 

// Devuelve el índice numérico cromático (0 = C, 1 = C#, ..., 11 = B) o null si es 'x'
/**
 * Calcula el índice cromático de una cuerda sumando el traste a su nota al aire.
 * @precondition `stringIndex` identifica una cuerda definida en `BASE_NOTES` y `fret` es un traste no negativo o `'x'`.
 * @postcondition Devuelve un valor de 0 a 11, o `-1` para una cuerda silenciada o una cuerda sin nota base reconocida.
 */
export const getNoteIndex = (stringIndex: number, fret: number | 'x'): number => {
  if (fret === 'x') return -1;

  const openNote = BASE_NOTES[stringIndex];
  const rootIndex = CHROMATIC_SHARPS.indexOf(openNote);

  if (rootIndex === -1) return -1;
  return (rootIndex + fret) % 12;
};

// Devuelve la octava de una determinada nota
/**
 * Calcula la octava de la nota de una cuerda según su nota al aire y el número de semitonos del traste.
 * @precondition `stringIndex` identifica una cuerda de `BASE_NOTES` y `fret` es un traste no negativo.
 * @postcondition Devuelve la octava resultante; si la nota al aire no se reconoce, usa la octava 4.
 */
export const getNoteOctave = (stringIndex: number, fret: number): number => {
  const openNote = BASE_NOTES[stringIndex];
  const rootIndex = CHROMATIC_SHARPS.indexOf(openNote);

  if (rootIndex === -1) return 4;

  const totalSemis = rootIndex + fret;
  return BASE_OCTAVES[stringIndex] + Math.floor(totalSemis / 12);
};

// Devuelve los índices de las notas activas (sin duplicados)
/**
 * Convierte una figura de trastes en sus índices cromáticos activos y elimina
 * duplicados y cuerdas silenciadas.
 * @precondition `selectedFrets` está ordenado por cuerda según `BASE_NOTES`.
 * @postcondition Devuelve índices cromáticos únicos; cada `'x'` y cada cuerda sin nota válida queda excluida.
 */
export const getActiveNotes = (selectedFrets: (number | 'x')[]): number[] => {
  return [... new Set(selectedFrets
    .map((fret, stringIdx) => getNoteIndex(stringIdx, fret))
    .filter((index): index is number => index !== -1))];
}

// Devuelve el color correspondiente a una nota según su función armónica
/**
 * Selecciona las clases CSS de una nota según su distancia cromática respecto
 * de la tónica y, opcionalmente, resalta funciones armónicas.
 * @precondition `noteIndex` y `rootIndex` son índices cromáticos, aunque `rootIndex` puede ser un valor centinela si no hay tónica.
 * @postcondition Devuelve una cadena de clases CSS sin modificar los argumentos.
 */
export const getNoteColorClass = (
  noteIndex: number, 
  rootIndex: number,
  colorful?: boolean,
): string => {
  const distance = (noteIndex - rootIndex + 12) % 12;

  // Sin colorines
  if(!colorful){
    if (distance === 0) return 'bg-blue-800 text-orange-200 font-bold';
    else return 'bg-blue-500 text-white';
  } 

  // Con colorines
  // 1. TÓNICA (0 semitonos) -> Rojo
  if (distance === 0) {
    return 'bg-red-500 text-white font-bold ring-2 ring-yellow-400'; 
  }

  // 2. TERCERA (O NOTA QUE LA SUSTITUYE) -> Color Especial (ej. Amarillo/Verde/Naranja)
  const isThird = distance === 3 || distance === 4 || distance === 2 || distance === 5; // b3 o 3
  const isSeventh = distance === 10 || distance === 11;


  if (isThird) {
    return 'bg-green-600 text-white'; // Marca la 3ª (o su sustituto sus)
  }

  if (isSeventh) {
    return 'bg-violet-600 text-white'
  }

  // 3. RESTO DE NOTAS (Quintas, 7mas, 9nas, etc.) -> Azul
  return 'bg-blue-800 text-white';
};

// Devuelve una nota en formato NotaOctava (A#4)
/**
 * Convierte cada traste de la figura a su número MIDI correspondiente y
 * conserva `null` en las cuerdas silenciadas.
 * @precondition `frets` está ordenado por cuerda y cada traste numérico no es negativo.
 * @postcondition Devuelve una posición MIDI o `null` por cada cuerda, manteniendo el orden de entrada.
 */
const getMidiNotes = (frets: (number | 'x')[]) => frets.map((fret, stringIndex) => {
  if (fret === 'x') return null;
  return (getNoteOctave(stringIndex, fret) + 1) * 12 + getNoteIndex(stringIndex, fret);
});


// --- FUNCIONES DE ACORDES --- //

interface RootCandidateProfile {
  rootIndex: number;         // Índice cromático de la tónica (0 a 11)
  intervals: number[];       // Intervalos en semitonos (ej: [0, 4, 7])
  ChordName: string;
}

// Dada una serie de intervalos, construye la cadena con las extensiones correspondientes
/**
 * Analiza una colección de intervalos cromáticos y compone el sufijo del acorde,
 * resolviendo cualidad, quinta, séptima y tensiones según las reglas armónicas del módulo.
 * @precondition `input_intervals` contiene los intervalos cromáticos únicos de un acorde, incluidos 0 para su tónica.
 * @postcondition Devuelve un sufijo de acorde; no modifica el array de entrada.
 */
const calculateChordName = (
  input_intervals: number[]
): string => {

  let intervals = input_intervals;

  /*
  Las extensiones que van con * van al final del nombre del acorde entre paréntesis

  0 = Tónica del acorde
  1 = "b9*" (es bastante raro pero habría que tenerlo en cuenta)
  2 => Si no hay tercera (3 o 4) -> "sus2"
       Si hay tercera y séptima, copia el nombre de la 7 y la sustituye: A7 + B = A9 ; Gmaj7 + A = Gmaj9
       Si no hay séptima, se añade al final "add9"*

  3 => Tercera menor. Simplemente poner "m" después de la tónica. Si hay tercera mayor, se convierte en "#9*"
  4 => Tercera mayor. No pone nada después de la tónica.
  5 => Se comporta igual que el 2, con "11" en lugar de "9"
  6 => Si el acorde no tiene quinta justa (7) b5, al final del acorde sin paréntesis. Si la tiene, "#11*"
  7 => Si no hay ninguna extensión más, se añade 5 después de la tónica. Si tiene 3º o 7º, se omite (va implicito)
  8 => aug o +. 
  9 => Si no tiene séptima, 6. Si la tiene: Si tiene 9º y 11º, 13 (sustituye séptimas, 9 y 11). Si no tiene alguno -> "add13". Si es un acorde menor con b5, al añadir esta nota se convierte en un acorde dim7
  10 => Séptima menor. Si el acorde es mayor produce un acorde dominante: X7 ; Si el acorde es menor, produce un acorde menor con séptima menor: Xm7
  11 => Séptima mayor: Si el acorde es mayor, produce un Xmaj7. Si el acorde es menor, produce un XmMaj7 

  EXTRAS:
  - Si no hay tercera y no hay ningún sus -> no3*
  - Si no hay quinta -> no5*
  - Si el acorde es Xm7b5, añadir entre paréntesis (semi-dim)
  - La fórmula (0, 2, 3/4, 9) es X6/9 
  */

  // === Casos especiales === //
  // Una sola nota
  if (intervals.length === 1) return '';

  // Helper rápido para comparar arrays exactamente
  /**
   * Comprueba si dos listas de intervalos tienen los mismos elementos en el mismo orden.
   * @precondition `a` y `b` son listas de números.
   * @postcondition Devuelve `true` solo si ambas listas tienen igual longitud y valores en cada posición.
   */
  const equals = (a: number[], b: number[]) => 
    a.length === b.length && a.every((val, idx) => val === b[idx]);

  // 0. CASOS ESPECIALES Y ESTRUCTURAS CERRADAS
  if (equals(intervals, [0, 7])) return "5";                   // Powerchord (ej: C5)
  if (equals(intervals, [0, 3, 6])) return "dim";              // Tríada disminuida
  if (equals(intervals, [0, 3, 6, 9])) return "dim7";          // Disminuido completo
  if (equals(intervals, [0, 3, 6, 10])) return "m7b5";         // Semidisminuido
  if (equals(intervals, [0, 4, 8])) return "aug";              // Tríada aumentada
  if (equals(intervals, [0, 2, 5, 7])) return "sus2sus4";      // Doble suspensión

  // 1. Determinamos la tercera/sus/no3
  let tercera = intervals.includes(4) 
    ? ''
    : intervals.includes(3) 
      ? 'm'
      : intervals.includes(2)
        ? intervals.includes(5)
          ? "sus2sus4"
          : "sus2"
        : intervals.includes(5)
          ? "sus4"
          : "no3*"

  // Eliminar las notas que hayamos encontrado
  let delTercera = 
    tercera === '' ? [4] :
    tercera === 'm' ? [3] :
    tercera === 'sus2' ? [2] :
    tercera === 'sus4' ? [5] :
    tercera === 'sus2sus4' ? [2, 5] : [];

  intervals = intervals.filter((item) => !delTercera.includes(item));
  
  // 2. Determinamos la quinta
  let quinta = intervals.includes(7)
    ? ''
    : intervals.includes(6)
      ? 'b5*'
      : intervals.includes(8)
        ? '#5*'
        : 'no5*';

  const delQuinta = 
    quinta === '' ? [7] :
    quinta === 'b5' ? [6] : 
    quinta === '#5' ? [8] : [];

  intervals = intervals.filter((item) => !delQuinta.includes(item));
  
  // 3. Determinamos la séptima
  const esDisminuido = tercera === 'm' && quinta === 'b5';

  let septima = intervals.includes(10)
    ? '7' // Aporta '7' independientemente de si la tercera es 'm' o '' (evita 'mm7')
    : intervals.includes(11)
      ? 'maj7'
      : (esDisminuido && intervals.includes(9))
        ? 'dim7'
        : '';

  const delSeptima = 
    septima === '7' ? [10] :
    septima === 'maj7' ? [11] :
    septima === 'dim7' ? [9] : [];

  intervals = intervals.filter((item) => !delSeptima.includes(item));
  
  // 5. Añadimos extensiones
  // 5. Añadimos extensiones
const haySeptima = septima !== '';
const extensiones: string[] = [];
const parentesis: string[] = [];

// Alteraciones y agregadas directas
if (intervals.includes(1)) parentesis.push(haySeptima ? 'b9' : 'addb9');
if (intervals.includes(3)) parentesis.push(haySeptima ? '#9' : 'add#9');
if (intervals.includes(6)) parentesis.push(haySeptima ? '#11' : 'add#11');
if (intervals.includes(8)) parentesis.push(haySeptima ? 'b13' : 'addb13');

// 1º Evaluamos la Novena (2)
if (intervals.includes(2)) {
  haySeptima 
    ? extensiones.push('9') 
    : intervals.includes(9) 
      ? extensiones.push('6/9') 
      : parentesis.push('add9');
}

// 2º Evaluamos la Onceava (5): Requiere estrictamente novena previa ('9') para ser '11'
if (intervals.includes(5)) {
  haySeptima && extensiones.includes('9') 
    ? extensiones.push('11') 
    : parentesis.push('add11');
}

// 3º Evaluamos la Trecena (9): Requiere estrictamente onceava previa ('11') para ser '13'
if (intervals.includes(9)) {
  haySeptima 
    ? extensiones.includes('11') 
      ? extensiones.push('13') 
      : parentesis.push('add13')
    : extensiones.includes('6/9') 
      ? '' 
      : extensiones.push('6');
}


  if (tercera === 'm' && septima === 'maj7') septima = 'Maj7';
  
  septima = extensiones.length > 0 
          ? haySeptima
            ? septima.slice(0, -1) + Math.max(...extensiones.map(Number))
            : extensiones[0] // Si no hay septima, en extensiones deberia haber solo '6' o '6/9'
          : septima;

  if (tercera.endsWith("*")){parentesis.push(tercera.slice(0,-1)); tercera = '';}
  if (quinta.endsWith("*")){parentesis.push(quinta.slice(0,-1)); quinta = '';}

  const str_parentesis = parentesis.length > 0 ? "(" + parentesis.join(", ") + ")" : ''

  return (tercera.includes('sus')? '': tercera) + quinta + septima + (tercera.includes('sus')? tercera : '') + str_parentesis;
}

// Elige el nombre más probable entre varias opciones, basándose en penalizaciones por alteración
/**
 * Puntúa nombres alternativos de acorde para preferir las notaciones menos
 * ambiguas y menos cargadas de excepciones.
 * @precondition `candidates` contiene al menos un nombre de acorde.
 * @postcondition Devuelve el nombre con menor penalización, conservando el orden en caso de empate.
 */
const selectChordName = (
  candidates: string[],
): string =>{

  const penalty : number[] = Array(candidates.length).fill(0);

  candidates.forEach((name, index) =>{
    // Priorizamos que el bajo sea la tónica
    if(name.includes('/')) penalty[index] += 8;
    // Penalizamos los acordes "muy raros"
    if(name.includes('no3')) penalty[index] += 8;
    if(name.includes('no5')) penalty[index] += 6;
    if(name.includes('b5')) penalty[index] += 8;
    if(name.includes('#5')) penalty[index] += 8;
    
    // Todas estas ya están incluidas en el apartado de paréntesis
    // if(name.includes('b9') || name.includes('#9') || name.includes('#11')) penalty[index] += 6;

    // Penalizaciones suaves
    if(name.includes('add')) penalty[index] += 2;
    if(name.includes('sus')) penalty[index] += 2;

    const parentesisMatches = name.match(/\((.*?)\)/);
    if (parentesisMatches) {
      const numMods = parentesisMatches[1].split(',').length;
      penalty[index] += numMods * 2;
    }
  });


  return candidates[penalty.indexOf(Math.min(...penalty))];

}

// Calcula las distancias interválicas de cada nota (únicas) tomando a todas como posibles centros tonales.
/**
 * Trata cada índice de nota como posible tónica y construye su lista ordenada
 * de intervalos cromáticos para generar perfiles candidatos.
 * @precondition `uniqueIndices` contiene índices cromáticos únicos entre 0 y 11.
 * @postcondition Devuelve un perfil por cada posible raíz, con intervalos ascendentes y su sufijo de acorde.
 */
const calculateIntervals = (
  uniqueIndices: number[],
): RootCandidateProfile[] => {
  return uniqueIndices.map((rootIndex) => {
    const intervals = uniqueIndices
      .map((noteIndex) => {
        let interval = noteIndex - rootIndex;
        if (interval < 0) {
          interval += 12; // Octavamos la nota si su índice es menor
        }
        return interval;
      })
      .sort((a, b) => a - b); // Ordenar numéricamente (0, 3, 7, etc.)

    return {
      rootIndex,
      intervals,
      ChordName: calculateChordName(intervals)
    };
  });
};

// Función principal para obtener el nombre del acorde. Devuelve el nombre más probable, dada una figura en el diapasón
/**
 * Obtiene el nombre del acorde de una figura: prioriza un nombre personalizado
 * y, en su ausencia, infiere la tónica y la cualidad a partir de sus notas activas.
 * @precondition `selectedFrets` está ordenado por cuerda y `accidentals` es `'sharps'` o `'flats'`.
 * @postcondition Resuelve con el nombre personalizado, el nombre inferido o `''` si no hay notas activas.
 */
export const getChordName = async (selectedFrets: (number | 'x')[], accidentals : AccidentalsPreference = 'sharps'): Promise<string> => {
  
  const customName = await getCustomChordName(selectedFrets);
  if (customName) return customName;

  
  const indices = getActiveNotes(selectedFrets); //, indices = [... new Set(temp)];
  if (indices.length === 0) return "";
  const candidates = calculateIntervals(indices);
  const SCALE = accidentals === 'sharps' ? CHROMATIC_SHARPS : CHROMATIC_FLATS;

  const fullChordNames = candidates.map((candidate) => {
    const rootNote = SCALE[candidate.rootIndex];
    return rootNote + candidate.ChordName;
  });

  return selectChordName(fullChordNames);
}

// --- FUNCIONES DE FILTROS --- //

export interface VisualFilter {
  root: string[];
  chordType: ChordTypeOption[];
  color: ChordColorOption[];
  extension: string[];
  stringGroup: string[];
}

export interface TrainerChord {
  id: string;
  rootIndex: number;
  bassIndex: number;
  extension: string;
  frets: (number | 'x')[];
  tags: string[];
  isFavorite: boolean;
}

export interface VoiceLeadingMetrics {
  totalMovement: number;
  maximumMovement: number;
  commonNotes: number;
  bassMovement: number;
  sopranoMovement: number;
  guideToneMovement: number;
  cost: number;
}

// Tags que no mostramos en "extensiones"
const filtro = ['Triada' , 'Normal' , 'Drop2' , 'Drop3' , 'Drop2&4' ,'Mayor' , 'Menor' , 'Suspendido' , 'Disminuido' , 'Aumentado' , 'Personalizado', 'Semi-disminuido'];
export const extensions = CATEGORIES.filter(el => !filtro.includes(el));
extensions.push('Ninguna');

// Permite obtener la clave primaria para indexar los acordes en tabu
/**
 * Serializa la figura de trastes para usarla como clave estable en los mapas
 * de penalización y en la lista tabú.
 * @precondition `frets` es la figura ordenada de un acorde.
 * @postcondition Devuelve la serialización JSON de la figura sin modificarla.
 */
export const getPenaltyKey = (frets: (number | 'x')[]) => JSON.stringify(frets);

/**
 * Comprueba si un acorde está etiquetado con el color pedido, considerando
 * que la categoría «Disminuido» también incluye los semidisminuidos.
 * @precondition `chord.tags` contiene las etiquetas del acorde y `color` es una etiqueta consultable.
 * @postcondition Devuelve si las etiquetas satisfacen la categoría solicitada; no cambia el acorde.
 */
const matchesChordColor = (chord: TrainerChord, color: string) =>
  chord.tags.includes(color) || (color === 'Disminuido' && chord.tags.includes('Semi-disminuido'));

/**
 * Determina la categoría de séptima del acorde usando primero sus etiquetas y,
 * si no bastan, interpretando la extensión registrada.
 * @precondition `chord` tiene una lista de etiquetas y una extensión textual.
 * @postcondition Devuelve la categoría identificada o `null` cuando la extensión no indica una séptima aplicable.
 */
const getChordSeventh = (chord: TrainerChord): string | null => {
  if (chord.tags.includes('Semi-disminuido')) return 'Semi-disminuido';
  if (chord.tags.includes('Séptima Mayor')) return 'Séptima Mayor';
  if (chord.tags.includes('Séptima Menor')) return 'Séptima Menor';

  const extension = chord.extension.toLowerCase();
  if (/6\/9|add/.test(extension) || !/(7|9|11|13)/.test(extension)) return null;
  if (extension.includes('dim')) return 'Disminuido';
  return extension.includes('maj') ? 'Séptima Mayor' : 'Séptima Menor';
};

/**
 * Compara la parte principal de la extensión de un acorde y la solicitada,
 * ignorando espacios y el contenido entre paréntesis.
 * @precondition `chord.extension` y `requestedExtension` son cadenas.
 * @postcondition Devuelve `true` si las bases normalizadas coinciden exactamente; no modifica los valores originales.
 */
const matchesRequestedExtension = (chord: TrainerChord, requestedExtension: string) => {
  const actual = chord.extension.toLowerCase().replace(/\s/g, '');
  const requested = requestedExtension.toLowerCase().replace(/\s/g, '');
  const actualBase = actual.split('(')[0];
  const requestedBase = requested.split('(')[0];
  return actualBase === requestedBase;
};

// Comprueba si los trastes activos de un acorde coinciden con la selección del grupo de cuerdas.
/**
 * Comprueba si las cuerdas no silenciadas de una figura corresponden al patrón
 * solicitado para tríadas o voicings Drop.
 * @precondition `frets` está ordenado de sexta a primera cuerda y `selectedStringGroup` es un patrón conocido o `null`.
 * @postcondition Devuelve `true` si coincide el patrón; sin filtro o con un patrón desconocido deja pasar el acorde.
 */
export const matchesStringGroup = (
  frets: (number | 'x')[],
  selectedStringGroup: string | null
): boolean => {
  if (!selectedStringGroup) return true; // Si no hay filtro de cuerdas, pasan todos

  // Mapeo de cuerdas activas (de 6ª a 1ª cuerda) -> Índices del array [6ª, 5ª, 4ª, 3ª, 2ª, 1ª]
  const activeStringIndices = frets
    .map((fret, idx) => (fret !== 'x' ? 6 - idx : null))
    .filter((stringNum): stringNum is number => stringNum !== null);

  const activePattern = activeStringIndices.join('-');

  switch (selectedStringGroup) {
    // Tríadas
    case '3ª-2ª-1ª': return activePattern === '3-2-1';
    case '4ª-3ª-2ª': return activePattern === '4-3-2';
    case '5ª-4ª-3ª': return activePattern === '5-4-3';
    case '6ª-5ª-4ª': return activePattern === '6-5-4';

    // Drop 2
    case '4ª-3ª-2ª-1ª': return activePattern === '4-3-2-1';
    case '5ª-4ª-3ª-2ª': return activePattern === '5-4-3-2';
    case '6ª-5ª-4ª-3ª': return activePattern === '6-5-4-3';

    // Drop 3
    case '5ª-x-3ª-2ª-1ª': return activePattern === '5-3-2-1';
    case '6ª-x-4ª-3ª-2ª': return activePattern === '6-4-3-2';

    // Drop 2&4
    case '6ª-x-4ª-3ª-x-1ª': return activePattern === '6-4-3-1';
    case '6ª-5ª-x-3ª-x-1ª': return activePattern === '6-5-3-1';

    default:
      return true;
  }
};

// Obtiene todos los acordes que coinciden con alguno de los filtros
/**
 * Consulta en paralelo los filtros recibidos y combina los resultados,
 * eliminando duplicados por identificador de acorde.
 * @precondition `filters` contiene filtros válidos y `acc` selecciona sostenidos o bemoles.
 * @postcondition Resuelve con los acordes coincidentes únicos; si el mismo acorde aparece varias veces conserva la última instancia recorrida.
 */
export const fetchAllMatchingChords = async (filters: VisualFilter[], acc: AccidentalsPreference) => {
  const chordPromises = filters.map(f => fetchMatchingChords(f, acc));
  const results = await Promise.all(chordPromises);
  const uniqueChords = new Map<string, TrainerChord>();

  results.flat().forEach(chord => uniqueChords.set(chord.id, chord));
  return [...uniqueChords.values()];
}

// Consulta en IndexedDB los acordes que coinciden exactamente con la selección de un filtro.
/**
 * Recupera los acordes almacenados y los filtra por tónica, cualidad, extensión,
 * tipo de voicing y grupo de cuerdas según la selección recibida.
 * @precondition `filters` contiene arrays de criterios y `acc` define la convención de nombres de las notas.
 * @postcondition Resuelve con los acordes que satisfacen todas las categorías configuradas; no modifica la base de datos.
 */
export const fetchMatchingChords = async (filters: VisualFilter, acc: AccidentalsPreference) => {
  const { root, chordType, color, extension, stringGroup } = filters;
  const rootNotes = acc === 'sharps' ? CHROMATIC_SHARPS : CHROMATIC_FLATS;
  const allChords = await getAllChords();

  return allChords.filter((chord) => {
    if (!root.some(root => rootNotes.indexOf(root) === chord.rootIndex)) return false;
    const isNormal = !(chord.tags.includes('Triada') 
                      || chord.tags.includes('Drop2') 
                      || chord.tags.includes('Drop3')
                      || chord.tags.includes('Drop2&4'));

    const matchesColor = color.some(c => matchesChordColor(chord, c));
    const hasNoExtension = !chord.tags.some(tag =>
      extensions.includes(tag) && tag !== 'Ninguna' && tag !== 'Abierto'
    );
    const matchesType = chordType.some(type => {
      if (type === 'Triada') return chord.tags.includes('Triada');

      const hasExtension = extension.some(ext =>
        ext === 'Ninguna' ? hasNoExtension : chord.tags.includes(ext)
      );
      if (type.includes('Drop')) return chord.tags.includes(type) && hasExtension;

      const hasTriad = chord.tags.includes('Triada');
      const hasAnyDrop = chord.tags.some((tag) => tag.startsWith('Drop'));
      return !hasTriad && !hasAnyDrop && hasExtension;
    });

    if (!matchesType || !matchesColor) return false;
    return isNormal || stringGroup.length === 0 || stringGroup.some(group => matchesStringGroup(chord.frets, group));
  });
};

// Usa la tercera y la séptima como notas guía. IA: Amplia información, no entiendo bien esta función
/**
 * Mide la menor distancia en semitonos entre una tercera o séptima de cada
 * acorde, usando las notas guía presentes en ambos conjuntos.
 * @precondition `currentNotes` y `nextNotes` contienen notas MIDI numéricas.
 * @postcondition Devuelve la mínima distancia entre notas guía o `0` si falta una nota guía en cualquiera de los acordes.
 */
const getGuideToneMovement = (currentNotes: number[], nextNotes: number[]) => {
  const currentGuides = currentNotes.filter(note => [3, 4, 10, 11].includes(note % 12));
  const nextGuides = nextNotes.filter(note => [3, 4, 10, 11].includes(note % 12));

  if (currentGuides.length === 0 || nextGuides.length === 0) return 0;
  return Math.min(...currentGuides.flatMap(current => nextGuides.map(next => Math.abs(current - next))));
};

// Devuelve las métricas que usamos para orientar la búsqueda del siguiente acorde
/**
 * Calcula movimiento total, máximo, bajo, soprano, notas comunes, movimiento
 * de notas guía y un coste combinado para comparar dos voicings consecutivos.
 * @precondition `currentFrets` y `nextFrets` representan figuras en el mismo orden de cuerdas.
 * @postcondition Devuelve todas las métricas en semitonos y el coste ponderado; no altera las figuras de entrada.
 */
export const getVoiceLeadingMetrics = (
  currentFrets: (number | 'x')[],
  nextFrets: (number | 'x')[],
): VoiceLeadingMetrics => {
  const currentNotes = getMidiNotes(currentFrets);
  const nextNotes = getMidiNotes(nextFrets);
  const movements: number[] = [];

  currentNotes.forEach((currentNote, index) => {
    const nextNote = nextNotes[index];
    // Coste de mutear
    if (currentNote === null && nextNote === null) return;
    movements.push(currentNote === null || nextNote === null ? 1 : Math.abs(currentNote - nextNote));
  });

  const commonNotes = currentFrets.reduce<number>(
    (count, fret, index) => count + (fret !== 'x' && fret === nextFrets[index] ? 1 : 0),
    0,
  );
  const activeCurrent = currentNotes.filter((note): note is number => note !== null);
  const activeNext = nextNotes.filter((note): note is number => note !== null);
  const currentBass = activeCurrent[0] ?? 0;
  const nextBass = activeNext[0] ?? 0;
  const currentSoprano = activeCurrent.at(-1) ?? 0;
  const nextSoprano = activeNext.at(-1) ?? 0;
  const totalMovement = movements.reduce((total, movement) => total + movement, 0);
  const maximumMovement = movements.length > 0 ? Math.max(...movements) : 0;
  const bassMovement = Math.abs(currentBass - nextBass);
  const sopranoMovement = Math.abs(currentSoprano - nextSoprano);
  const guideToneMovement = getGuideToneMovement(activeCurrent, activeNext);
  // Formula de calculo de movimiento
  const cost = totalMovement
    + maximumMovement * 1.5
    + bassMovement * 0.75
    + sopranoMovement * 0.75
    + guideToneMovement
    - commonNotes * 2;

  return { totalMovement, maximumMovement, commonNotes, bassMovement, sopranoMovement, guideToneMovement, cost };
};

// Devuelve el siguiente acorde a mostrar
/**
 * Selecciona el siguiente acorde elegible con el menor coste de conducción de
 * voces, aplicando los filtros opcionales de progresión, modo de ejercicio,
 * historial tabú y penalizaciones acumuladas.
 * @precondition `matchingChords` contiene acordes con figuras válidas; `tabu` y `penalty` son estructuras mutables de historial.
 * @postcondition Devuelve el acorde de menor puntuación o `null`; si encuentra uno, añade su clave a `tabu` y aumenta su penalización, limitando `tabu` a cinco claves.
 */
export const fetchNextChord = (
  currentFrets: (number | 'x')[],
  matchingChords: TrainerChord[],
  exerciseMode: ExerciseMode = 'common-tones',
  tabu: string[],
  penalty: Map<string, number>,
  progRoot?: number,
  progColor?: string,
  progSeventh?: string,
  progExtension?: string
) => {

  // Si es una progresión, nos quedamos solo con los que correspondan al acorde
  const matchingCandidates = matchingChords.filter(chord =>
    (progRoot === undefined || chord.rootIndex === progRoot)
    && (progColor === undefined || matchesChordColor(chord, progColor))
    && (progSeventh === undefined || getChordSeventh(chord) === null || getChordSeventh(chord) === progSeventh)
    && (progExtension === undefined || matchesRequestedExtension(chord, progExtension))
  );

  // Evita repetir el voicing actual solo cuando exista otra opción válida para este paso.
  const differentCandidates = matchingCandidates.filter(chord =>
    chord.frets.some((fret, index) => fret !== currentFrets[index])
  );
  const candidates = differentCandidates.length > 0 ? differentCandidates : matchingCandidates;
  const nonTabuCandidates = candidates.filter(chord => !tabu.includes(getPenaltyKey(chord.frets)));
  const finalCandidates = nonTabuCandidates.length > 0 ? nonTabuCandidates : candidates;

  // Ordenamos los acordes candidatos
  finalCandidates.sort((a, b) => {
    const metricsA = getVoiceLeadingMetrics(currentFrets, a.frets);
    const metricsB = getVoiceLeadingMetrics(currentFrets, b.frets);
    const modeBonusA = exerciseMode === 'common-tones'
      ? -metricsA.commonNotes * 3 // Priorizamos minimizar movimientos en general
      : exerciseMode === 'bass'
        ? metricsA.bassMovement * 2 // Priorizamos minimizar movimiento de bajo
        : exerciseMode === 'soprano'
          ? metricsA.sopranoMovement * 2 // Priorizamos minimizar movimiento de las dos cuerdas agudas
          : 0; // Opción extra que no aplica ningún bonus. De momento, no seleccionable
    const modeBonusB = exerciseMode === 'common-tones'
      ? -metricsB.commonNotes * 3
      : exerciseMode === 'bass'
        ? metricsB.bassMovement * 2
        : exerciseMode === 'soprano'
          ? metricsB.sopranoMovement * 2
          : 0; 

    // Calculamos el coste base (metrics.cost) + bonus de Ejercicio + (penalización por repetición * descuento si es favorito)
    const scoreA = metricsA.cost + modeBonusA + (penalty.get(getPenaltyKey(a.frets)) ?? 0) * (a.isFavorite ? 0.5 : 1);
    const scoreB = metricsB.cost + modeBonusB + (penalty.get(getPenaltyKey(b.frets)) ?? 0) * (b.isFavorite ? 0.5 : 1);
    return scoreA - scoreB;
  });

  // Nos quedamos con el que minimiza el coste de movimiento
  const selectedChord = finalCandidates[0];
  if (!selectedChord) return null;

  // Actualizamos la penalización por reaparición y el tabu (evitamos que salga en los proximos X turnos)
  const key = getPenaltyKey(selectedChord.frets);
  tabu.push(key);
  penalty.set(key, (penalty.get(key) ?? 0) + 1);
  if (tabu.length > 5) tabu.shift(); // TURNOS TABU

  return selectedChord;
};
