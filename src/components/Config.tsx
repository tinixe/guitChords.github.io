// Nombres de las notas de las cuerdas al aire (6ª a 1ª) y octava. Para hacer notación MIDI: BASE_NOTE + string(BASE_OCTAVE)
export const BASE_OCTAVES = [2, 2, 3, 3, 3, 4]; //['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
export const BASE_NOTES = ['E', 'A', 'D', 'G', 'B', 'E'];

// Notas en orden cromático para calcular la nota por traste
export const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHROMATIC_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Base URL del CDN con muestras reales de guitarra acústica (MP3)
export const SOUNDFONT_CDN = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3';

// Caché en RAM de los AudioBuffers descargados para 0 ms de latencia
export const audioBufferCache = new Map<string, AudioBuffer>();

// Datos SELECTORES
export type ChordTypeOption = 'Triada' | 'Normal' | 'Drop2' | 'Drop3' | 'Drop2&4';
export type ChordColorOption = 'Mayor' | 'Menor' | 'Suspendido' | 'Disminuido' | 'Aumentado';
export type ExerciseMode = 'common-tones' | 'bass' | 'soprano';
