import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Settings } from 'lucide-react';
import { CHROMATIC_FLATS, CHROMATIC_SHARPS } from '../Config';
import { Fretboard } from '../utils/Fretboard';
import { playChordSound } from '../utils/SoundLogic';
import type { AccidentalsPreference } from './MenuSettings';
import { resetVoiceLeadingSession } from './Trainer';
import { extensions, fetchAllMatchingChords, fetchNextChord, getVoiceLeadingMetrics } from '../utils/AuxFunctions';
import type { ChordColorOption, ExerciseMode } from '../Config';
import type { TrainerChord, VisualFilter, VoiceLeadingMetrics } from '../utils/AuxFunctions';

// Penalizaciones por aparecer
const tabu: string[] = [];
const penalty = new Map<string, number>();

interface HarmonicPathProps {
  accidentals: AccidentalsPreference;
  colorful?: boolean;
  exerciseMode: ExerciseMode;
  onOpenSettings: () => void;
}

const STARTING_FRETS: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x'];
const HARMONIC_PATH_STORAGE_KEY = 'harmonic_path_progression_v1';

export const roman2interval = (s: string): { interval: number; color: ChordColorOption; seventh: string } => {
  const match = s.match(/^([b#]*)(vii|vi|iv|v|iii|ii|i)(.*)$/i);
  if (!match) return { interval: -1, color: 'Mayor', seventh: '' };

  const [, accidentals, numeral, suffix] = match;
  const degreeIntervals: Record<string, number> = {
    i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11,
  };
  let interval = degreeIntervals[numeral.toLowerCase()];
  interval += [...accidentals].reduce((offset, accidental) => offset + (accidental === 'b' ? -1 : 1), 0);

  const normalizedSuffix = suffix.toLowerCase();
  const isDiminished = normalizedSuffix.includes('dim') || normalizedSuffix.includes('\u00b0');
  let color: ChordColorOption = isDiminished
    ? 'Disminuido'
    : normalizedSuffix.includes('aug') || normalizedSuffix.includes('+')
      ? 'Aumentado'
      : normalizedSuffix.includes('sus')
        ? 'Suspendido'
        : numeral === numeral.toLowerCase() ? 'Menor' : 'Mayor';

  let seventh = color === 'Disminuido'
    ? 'Semi-disminuido'
    : color === 'Menor' || numeral.toLowerCase() === 'v'
      ? 'S\u00e9ptima Menor'
      : 'S\u00e9ptima Mayor';

  return { interval: (interval + 12) % 12, color, seventh };
}

interface ParsedProgressionChord {
  rootIndex: number;
  color: ChordColorOption;
  seventh?: string;
  extension?: string;
}

const parseProgressionChord = (
  token: string,
  exerciseTone: number,
): ParsedProgressionChord | null => {
  const roman = roman2interval(token);
  if (roman.interval !== -1) {
    return {
      rootIndex: (exerciseTone + roman.interval) % 12,
      color: roman.color,
      seventh: roman.seventh,
    };
  }

  const symbol = token.replace(/\/[A-G](?:[#b])?$/i, '');
  const match = symbol.match(/^([A-G](?:[#b])?)(.*)$/i);
  if (!match) return null;

  const [, root, suffix] = match;
  const naturalNotes: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const accidental = root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0;
  const rootIndex = (naturalNotes[root[0].toUpperCase()] + accidental + 12) % 12;
  const normalizedSuffix = suffix.toLowerCase();
  const isSemiDiminished = normalizedSuffix.includes('m7b5') || normalizedSuffix.includes('\u00f8');
  const isDiminished = isSemiDiminished || normalizedSuffix.includes('dim') || normalizedSuffix.includes('\u00b0');
  const isMinor = /^m(?!aj)|^min|^-/.test(normalizedSuffix);
  const color: ChordColorOption = isDiminished
    ? 'Disminuido'
    : normalizedSuffix.includes('aug') || normalizedSuffix.includes('+')
      ? 'Aumentado'
      : normalizedSuffix.includes('sus')
        ? 'Suspendido'
        : isMinor ? 'Menor' : 'Mayor';
  const hasExtension = /(?:6|7|9|11|13|add|b5|#5)/.test(normalizedSuffix);
  const hasSeventh = hasExtension && !/6\/9|add/.test(normalizedSuffix) && /(?:7|9|11|13)/.test(normalizedSuffix);
  const seventh = !hasSeventh
    ? undefined
    : isSemiDiminished
      ? 'Semi-disminuido'
      : isDiminished
        ? 'Disminuido'
        : normalizedSuffix.includes('maj')
          ? 'S\u00e9ptima Mayor'
          : 'S\u00e9ptima Menor';
  const extension = hasExtension ? suffix : undefined;

  return { rootIndex, color, seventh, extension };
};


export const HarmonicPath: React.FC<HarmonicPathProps> = ({
  accidentals,
  colorful,
  exerciseMode,
  onOpenSettings,
}) => {
  const [currentFrets, setCurrentFrets] = useState<(number | 'x')[]>(STARTING_FRETS);
  const [matchingChords, setMatchingChords] = useState<TrainerChord[]>([]);
  const [exerciseTone, setExerciseTone] = useState(0);
  const [progression, setProgression] = useState(() => {
    try {
      return localStorage.getItem(HARMONIC_PATH_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [chordName, setChordName] = useState('');
  const [currentRoot, setCurrentRoot] = useState(0);
  
  const [roots, setRoots] = useState<number[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sevenths, setSevenths] = useState<(string | undefined)[]>([]);
  const [requestedExtensions, setRequestedExtensions] = useState<(string | undefined)[]>([]);
  const [progrCounter, setProgCounter] = useState(0);

  const [lastTransition, setLastTransition] = useState<VoiceLeadingMetrics | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const scale = accidentals === 'flats' ? CHROMATIC_FLATS : CHROMATIC_SHARPS;

  useEffect(() => {
    try {
      localStorage.setItem(HARMONIC_PATH_STORAGE_KEY, progression);
    } catch (error) {
      console.error('Error guardando la progresión de Harmonic Path:', error);
    }
  }, [progression]);

  const handleFretClick = (stringIndex: number, fret: number) => {
    if (isPlaying) return;
    setCurrentFrets(previous => {
      const next = [...previous];
      next[stringIndex] = next[stringIndex] === fret ? 'x' : fret;
      return next;
    });
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    // ASSERTS DE SEGURIDAD
    if (progression.trim() === '') {
      alert("Introduce una progresión válida!");
      return;
    }

    // PARSEAMOS EL INPUT DE TEXTO
    const elementos = progression.trim().split(/\s+/);
    const datos = elementos.map(token => parseProgressionChord(token, exerciseTone));

    if (datos.some(value => value === null)) {
      alert("Hay un error en tu progresión!");
      return;
    }
    const progressionChords = datos.filter((value): value is ParsedProgressionChord => value !== null);

    // CREAMOS LA SELECCION DE FILTROS
    const Roots = progressionChords.map(value => value.rootIndex);
    const Colors = progressionChords.map(value => value.color);
    const Sevenths = progressionChords.map(value => value.seventh);
    const RequestedExtensions = progressionChords.map(value => value.extension);

    const filters: VisualFilter[] = Roots.map((rootIndex, index) => ({
      root: [scale[rootIndex]],
      chordType: ['Normal', 'Triada', 'Drop2', 'Drop3', 'Drop2&4'],
      color: [Colors[index]],
      extension: extensions,
      stringGroup: [],
    }));

    // HACEMOS EL FETCH GENERAL
    const chords = await fetchAllMatchingChords(filters, accidentals);
    if (chords.length === 0) {
      alert('No hay acordes guardados para recomendar.');
      return;
    }
    
    resetVoiceLeadingSession();
    setMatchingChords(chords);
    setLastTransition(null);
    setIsPlaying(true);
    setProgCounter(0);
    setRoots(Roots);
    setColors(Colors);
    setSevenths(Sevenths);
    setRequestedExtensions(RequestedExtensions);
  };

  useEffect(() => {
    if (!isPlaying || matchingChords.length === 0) return;

    const timeout = window.setTimeout(async () => {
      const selectedChord = fetchNextChord(
        currentFrets,
        matchingChords,
        exerciseMode,
        tabu,
        penalty,
        roots[progrCounter % roots.length],
        colors[progrCounter % colors.length],
        sevenths[progrCounter % sevenths.length],
        requestedExtensions[progrCounter % requestedExtensions.length]
      ); 

      if (!selectedChord) {
        setIsPlaying(false);
        alert('No hay acordes guardados disponibles para este paso de la progresi\u00f3n.');
        return;
      }
      const chordRoot = scale[selectedChord.rootIndex];
      const bassNote = scale[selectedChord.bassIndex];
      const bassSuffix = selectedChord.bassIndex === selectedChord.rootIndex ? '' : `/${bassNote}`;
      setChordName(`${chordRoot}${selectedChord.extension}${bassSuffix}`);
      setCurrentRoot(selectedChord.rootIndex);
      setProgCounter(progrCounter + 1);

      setLastTransition(getVoiceLeadingMetrics(currentFrets, selectedChord.frets));
      setCurrentFrets(selectedChord.frets);
      playChordSound(selectedChord.frets, 150, accidentals);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [currentFrets, matchingChords, isPlaying, exerciseMode, tabu, penalty, accidentals, scale, roots, colors, sevenths, requestedExtensions, progrCounter]);

  const handleReset = () => {
    setIsPlaying(false);
    setMatchingChords([]);
    setCurrentFrets(STARTING_FRETS);
    setLastTransition(null);
    resetVoiceLeadingSession();
  };

  return (
    <div className="relative min-h-screen overflow-y-auto bg-white text-black flex flex-col items-center p-8 font-sans pt-35">
      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-zinc-900">Harmonic Path</h1>
            <p className="text-sm text-zinc-500 mt-1">Construye el punto de partida y deja que la armonía encuentre el siguiente movimiento.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="w-11 h-11 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all"
              title="Ajustes"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleReset}
              className="w-11 h-11 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all"
              title="Reiniciar acorde inicial"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Division de las columnas superiores (Tonalidad, progresion y chordname) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[3fr_5.5fr_1.5fr] gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Tonalidad
            <select
              value={exerciseTone}
              onChange={event => setExerciseTone(Number(event.target.value))}
              disabled={isPlaying}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
            >
              {scale.map((note, index) => <option key={note} value={index}>{note}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Progresión
            <input
              type="text"
              value={progression}
              onChange={event => setProgression(event.target.value)}
              placeholder="IV V iii vi"
              disabled={isPlaying}
              className="w-full min-w-0 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Acorde actual
            {/* Sección que muestra el nombre del acorde */}
            <div className="w-full min-w-0 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-1000">
              {`${chordName}`}
            </div>
          </label>
        </div>

        <div className="w-full relative">
          <Fretboard
            selectedFrets={currentFrets}
            onFretClick={handleFretClick}
            readOnly={true}
            accidentals={accidentals}
            rootIndex={currentRoot}
            colorful={colorful}
            totalFrets={17}
          />
          {!isPlaying && (
            <p className="text-center text-xs text-zinc-500 mt-3">
              Selecciona el acorde inicial directamente en el diapasón.
            </p>
          )}
          {lastTransition && (
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{lastTransition.commonNotes} notas comunes</span>
              <span>Bajo: {lastTransition.bassMovement}</span>
              <span>Soprano: {lastTransition.sopranoMovement}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleTogglePlay}
          className="w-14 h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all"
          title={isPlaying ? 'Detener recorrido' : 'Iniciar recorrido'}
        >
          <Play className={`w-6 h-6 fill-current ${isPlaying ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  );
};
