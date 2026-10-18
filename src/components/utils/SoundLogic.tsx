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

const formatNoteForCDN = (noteName: string): string => {
  return noteName.replace(/^[A-G]#/, sharp => SHARP_TO_FLAT[sharp] ?? sharp);
};

/**
 * Carga y decodifica un archivo MP3 desde el CDN guardándolo en caché
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
 * Reproduce una muestra de audio real precargada
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
