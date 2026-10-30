import { getNoteName, getNoteOctave } from "./AuxFunctions";
import { SOUNDFONT_CDN, audioBufferCache} from "../Config";
import type { AccidentalsPreference } from "../Pages/MenuSettings";

let audioCtx: AudioContext | null = null;

const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};

/**
 * Convierte una nota con sostenido a su equivalente en bemoles cuando el CDN
 * usa esa convención para nombrar los samples.
 * @precondition `noteName` es un nombre de nota en formato cromático estándar.
 * @postcondition Devuelve el nombre equivalente usado por el CDN o el nombre original si no requiere conversión.
 */
const formatNoteForCDN = (noteName: string): string => {
  return noteName.replace(/^[A-G]#/, sharp => SHARP_TO_FLAT[sharp] ?? sharp);
};

/**
 * Carga y decodifica un archivo MP3 desde el CDN, reutilizando la caché en
 * memoria si ya existe y guardando en ella las decodificaciones correctas.
 * @precondition `ctx` es un contexto de audio activo y `noteName` identifica un sample disponible en el CDN.
 * @postcondition Resuelve con el buffer decodificado o `null` ante errores de red, respuesta o decodificación; registra el error y solo almacena éxitos.
 */
const loadAudioBuffer = async (ctx: AudioContext, noteName: string): Promise<AudioBuffer | null> => {
  const formattedName = formatNoteForCDN(noteName);
  
  if (audioBufferCache.has(formattedName)) {
    return audioBufferCache.get(formattedName)!;
  }

  try {
    const response = await fetch(`${SOUNDFONT_CDN}/${formattedName}.mp3`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const decodedData = await ctx.decodeAudioData(arrayBuffer);
    audioBufferCache.set(formattedName, decodedData);
    return decodedData;
  } catch (error) {
    console.error(`Error al cargar el sample para ${formattedName}:`, error);
    return null;
  }
};


/**
 * Crea y conserva un único contexto de audio para toda la reproducción y lo
 * reanuda si el navegador lo mantiene suspendido.
 * @precondition Se ejecuta en un navegador que proporciona `AudioContext` o `webkitAudioContext`.
 * @postcondition Devuelve el contexto de audio compartido; solicita su reanudación si está suspendido.
 */
const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Conecta un buffer de muestra a la salida mediante una envolvente de volumen
 * decreciente y programa su reproducción durante la duración indicada.
 * @precondition `ctx` acepta nodos de audio, `buffer` está decodificado y `startTime` es un tiempo válido del contexto.
 * @postcondition Programa el inicio y la detención de la muestra; no espera a que termine la reproducción.
 */
const playStringSample = (
  ctx: AudioContext,
  buffer: AudioBuffer,
  startTime: number,
  duration = 3.0
) => {
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;

  // Envolvente suave para evitar chasquidos
  gainNode.gain.setValueAtTime(0.8, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(startTime);
  source.stop(startTime + duration);
};


/**
 * Obtiene los samples correspondientes a las notas no silenciadas de una
 * figura, los carga en paralelo y los reproduce en orden con el retardo de rasgueo.
 * @precondition `selectedFrets` contiene trastes numéricos o `'x'` en el orden de las cuerdas y `strumSpeedMs` está expresado en milisegundos.
 * @postcondition Resuelve cuando los buffers se han cargado y programado; las cuerdas silenciadas o los samples fallidos no se reproducen.
 */
export const playChordSound = async (
  selectedFrets: (number | 'x')[],
  strumSpeedMs = 150,
  accidentals: AccidentalsPreference = 'flats',
) => {
  const ctx = getAudioContext();

  // 1. Obtener los nombres de notas exactas
  const notesToLoad = selectedFrets.map((fret, idx) => {
    if (fret === 'x') return null;
    const name = getNoteName(idx, fret, accidentals);
    const octave = getNoteOctave(idx, fret);
    return name ? `${name}${octave}` : null;
  });

  // 2. Cargar en paralelo todos los samples necesarios (en memoria)
  const buffers = await Promise.all(
    notesToLoad.map(note => (note ? loadAudioBuffer(ctx, note) : null))
  );

  const now = ctx.currentTime;
  const delaySec = strumSpeedMs / 1000;

  // 3. Lanzar la secuencia de reproducción con el retardo de rasgueo
  let stringCount = 0;
  buffers.forEach((buffer) => {
    if (!buffer) return;

    const noteStartTime = now + stringCount * delaySec;
    playStringSample(ctx, buffer, noteStartTime);
    stringCount++;
  });
};
