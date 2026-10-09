import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Settings, Square } from 'lucide-react';
import { BASE_NOTES, BASE_OCTAVES, CHROMATIC_FLATS, CHROMATIC_SHARPS } from '../Config';
import { Fretboard } from '../utils/Fretboard';
import { playChordSound, playMetronomeClick } from '../utils/SoundLogic';
import { getChordTonePitchClasses, getDegreeLabel, SCALE_DEFINITIONS, spellScaleNotes, type ScaleId } from '../utils/ScaleTheory';
import {
  applySequencePattern,
  buildCagedChordGrip,
  buildCagedRoute,
  buildNpsRoute,
  CAGED_FORMS,
  type ScalePosition,
  type ScaleRouteMode,
  type SequencePattern,
} from '../utils/ScaleRoutes';
import type { AccidentalsPreference } from './MenuSettings';

interface ScalesProps {
  accidentals: AccidentalsPreference;
  colorful?: boolean;
  onOpenSettings: () => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  metronomeEnabled: boolean;
  autoTempo: boolean;
}

const EMPTY_FRETS: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x'];
const MAX_FRET = 15;
const MAX_BPM = 220;

const getOpenMidiNotes = () => BASE_NOTES.map((note, stringIndex) =>
  (BASE_OCTAVES[stringIndex] + 1) * 12 + CHROMATIC_SHARPS.indexOf(note)
);
const playScalePosition = (
  position: ScalePosition,
  accidentals: AccidentalsPreference,
) => {
  const frets = EMPTY_FRETS.map((_, stringIndex) =>
    stringIndex === position.stringIndex ? position.fretNumber : 'x' as const
  );
  void playChordSound(frets, 0, accidentals);
};

export const Scales: React.FC<ScalesProps> = ({
  accidentals,
  colorful,
  onOpenSettings,
  bpm,
  setBpm,
  metronomeEnabled,
  autoTempo,
}) => {
  const [rootIndex, setRootIndex] = useState(0);
  const [selectedScale, setSelectedScale] = useState<ScaleId>('ionian');
  const [routeMode, setRouteMode] = useState<ScaleRouteMode>('caged');
  const [pattern, setPattern] = useState<SequencePattern>('scale');
  const [cagedFormIndex, setCagedFormIndex] = useState(0);
  const [startDegreeIndex, setStartDegreeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePosition, setActivePosition] = useState<ScalePosition | null>(null);
  const [stepIndex, setStepIndex] = useState(1);
  const [direction, setDirection] = useState(1);
  const guidedCycles = useRef(0);
  const scale = accidentals === 'flats' ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  const openMidiNotes = useMemo(() => getOpenMidiNotes(), []);
  const definition = SCALE_DEFINITIONS[selectedScale];
  const scaleNotes = useMemo(
    () => definition.intervals.map(interval => (rootIndex + interval) % 12),
    [definition, rootIndex],
  );
  const spelledNotes = useMemo(() => spellScaleNotes(scale[rootIndex], definition), [scale, rootIndex, definition]);
  const noteNamesByPitchClass: (string | undefined)[] = Array(12).fill(undefined);
  scaleNotes.forEach((pitchClass, index) => { noteNamesByPitchClass[pitchClass] = spelledNotes[index]; });
  const chordTonePitchClasses = useMemo(
    () => getChordTonePitchClasses(scaleNotes, startDegreeIndex),
    [scaleNotes, startDegreeIndex],
  );
  const cagedGripPositions = useMemo(
    () => buildCagedChordGrip(scaleNotes, startDegreeIndex, cagedFormIndex, openMidiNotes, MAX_FRET),
    [scaleNotes, startDegreeIndex, cagedFormIndex, openMidiNotes],
  );
  const route = useMemo(
    () => {
      const baseRoute = routeMode === 'caged' || routeMode === 'caged-fixed'
        ? buildCagedRoute(scaleNotes, startDegreeIndex, cagedFormIndex, openMidiNotes, MAX_FRET)
        : routeMode === '3nps'
          ? buildNpsRoute(scaleNotes, startDegreeIndex, 3, openMidiNotes, MAX_FRET)
          : buildNpsRoute(scaleNotes, startDegreeIndex, 4, openMidiNotes, MAX_FRET);
      return applySequencePattern(baseRoute, pattern);
    },
    [routeMode, scaleNotes, startDegreeIndex, cagedFormIndex, openMidiNotes, pattern],
  );
  const cagedCommonToneNames = useMemo(() => {
    if (routeMode !== 'caged' && routeMode !== 'caged-fixed') return [];
    const previousForm = (cagedFormIndex + CAGED_FORMS.length - 1) % CAGED_FORMS.length;
    const currentPitches = new Set(buildCagedChordGrip(
      scaleNotes, startDegreeIndex, cagedFormIndex, openMidiNotes, MAX_FRET,
    ).map(position => position.midiNote));
    const previousPitches = buildCagedChordGrip(
      scaleNotes, startDegreeIndex, previousForm, openMidiNotes, MAX_FRET,
    ).map(position => position.midiNote);
    const previousPitchClasses = new Set(previousPitches.map(midiNote => midiNote % 12));
    return [...new Set([...currentPitches]
      .map(midiNote => midiNote % 12)
      .filter(pitchClass => previousPitchClasses.has(pitchClass)))]
      .map(pitchClass => noteNamesByPitchClass[pitchClass]!);
  }, [routeMode, scaleNotes, startDegreeIndex, cagedFormIndex, openMidiNotes, noteNamesByPitchClass]);

  const handlePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setActivePosition(null);
      return;
    }

    if (route.length === 0) {
      return;
    }

    setDirection(1);
    setStepIndex(route.length > 1 ? 1 : 0);
    setActivePosition(route[0]);
    if (metronomeEnabled) playMetronomeClick(true);
    playScalePosition(route[0], accidentals);
    guidedCycles.current = 0;
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || route.length === 0) return;

    const timeout = window.setTimeout(() => {
      const index = Math.min(stepIndex, route.length - 1);
      const position = route[index];
      setActivePosition(position);
      if (metronomeEnabled) playMetronomeClick(stepIndex % 4 === 0);
      playScalePosition(position, accidentals);

      if (direction > 0 && index === route.length - 1) {
        setDirection(-1);
        setStepIndex(Math.max(0, index - 1));
      } else if (direction < 0 && index === 0) {
        if (routeMode === 'caged') {
          const nextFormIndex = (cagedFormIndex + 1) % CAGED_FORMS.length;
          const nextFormRoute = applySequencePattern(
            buildCagedRoute(scaleNotes, startDegreeIndex, nextFormIndex, openMidiNotes, MAX_FRET),
            pattern,
          );
          const firstDifferentNote = nextFormRoute.findIndex(next => next.midiNote !== position.midiNote);
          setCagedFormIndex(nextFormIndex);
          setDirection(1);
          setStepIndex(firstDifferentNote >= 0 ? firstDifferentNote : 0);
        } else if (routeMode === 'caged-fixed') {
          setDirection(1);
          setStepIndex(Math.min(1, route.length - 1));
        } else {
          setDirection(1);
          setStepIndex(Math.min(1, route.length - 1));
        }
        guidedCycles.current++;
        if (autoTempo && guidedCycles.current % 2 === 0) {
          setBpm(Math.min(MAX_BPM, bpm + 4));
        }
      } else {
        setStepIndex(index + direction);
      }
    }, 60000 / bpm);

    return () => window.clearTimeout(timeout);
  }, [isPlaying, route, stepIndex, direction, routeMode, cagedFormIndex, pattern, rootIndex, scaleNotes, startDegreeIndex, openMidiNotes, bpm, accidentals, metronomeEnabled, autoTempo, setBpm]);

  const handleRootChange = (nextRoot: number) => {
    setRootIndex(nextRoot);
    setStartDegreeIndex(0);
    setActivePosition(null);
  };

  const handleScaleChange = (nextScale: ScaleId) => {
    setSelectedScale(nextScale);
    setStartDegreeIndex(0);
    setActivePosition(null);
  };

  const isActive = isPlaying;
  const currentForm = CAGED_FORMS[cagedFormIndex];

  return (
    <div className="relative min-h-screen overflow-y-auto bg-white text-black flex flex-col items-center p-8 font-sans pt-35">
      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        <div className="w-full flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-zinc-900">Scales</h1>
            <p className="text-sm text-zinc-500 mt-1">Explora las notas de cada escala en el diapasón.</p>
          </div>
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 shrink-0 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all"
            title="Ajustes"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Tónica
            <select
              value={rootIndex}
              onChange={event => handleRootChange(Number(event.target.value))}
              disabled={isActive}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800"
            >
              {scale.map((note, index) => <option key={note} value={index}>{note}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Escala
            <select
              value={selectedScale}
              onChange={event => handleScaleChange(event.target.value as ScaleId)}
              disabled={isActive}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800"
            >
              {Object.entries(SCALE_DEFINITIONS).map(([id, scaleDefinition]) => (
                <option key={id} value={id}>{scaleDefinition.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Grado inicial
            <select
              value={startDegreeIndex}
              onChange={event => setStartDegreeIndex(Number(event.target.value))}
              disabled={isActive}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
            >
              {definition.intervals.map((interval, index) => (
                <option key={`${interval}-${index}`} value={index}>
                  {getDegreeLabel(interval)} · {spelledNotes[index]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Recorrido
            <select
              value={routeMode}
              onChange={event => setRouteMode(event.target.value as ScaleRouteMode)}
              disabled={isActive}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
            >
              <option value="caged-fixed">Posiciones CAGED</option>
              <option value="caged">Posiciones CAGED enlazadas</option>
              <option value="3nps">3 notas por cuerda</option>
              <option value="4nps">4 notas por cuerda</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Secuencia
            <select
              value={pattern}
              onChange={event => setPattern(event.target.value as SequencePattern)}
              disabled={isActive}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
            >
              <option value="scale">Escala</option>
              <option value="thirds">Terceras</option>
              <option value="three-note">Grupos de tres</option>
              <option value="four-note">Grupos de cuatro</option>
            </select>
          </label>
          {(routeMode === 'caged' || routeMode === 'caged-fixed') && (
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Forma inicial
              <select
                value={cagedFormIndex}
                onChange={event => setCagedFormIndex(Number(event.target.value))}
                disabled={isActive}
                className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
              >
                {CAGED_FORMS.map((form, index) => (
                  <option key={form.id} value={index}>Forma {form.id}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="w-full min-h-10 text-sm text-zinc-600" aria-live="polite">
          {spelledNotes.map((note, index) => `${getDegreeLabel(definition.intervals[index])} ${note}`).join('  ·  ')}
          {route.length === 0 && (
            <span className="ml-3 text-rose-700">No hay una posición completa con ese grado inicial en el rango disponible.</span>
          )}
          {(routeMode === 'caged' || routeMode === 'caged-fixed') && (
            <span className="ml-3">
              Forma {currentForm.id} · tonos del acorde: {chordTonePitchClasses
                .map(pitchClass => noteNamesByPitchClass[pitchClass]).join(' ')}
              {' · '}Comunes con la forma anterior: {cagedCommonToneNames.length > 0 ? cagedCommonToneNames.join(' ') : 'ninguna en este registro'}
            </span>
          )}
        </div>

        <div className="w-full">
          <Fretboard
            selectedFrets={EMPTY_FRETS}
            readOnly
            accidentals={accidentals}
            rootIndex={rootIndex}
            colorful={colorful}
            totalFrets={MAX_FRET}
            highlightedNotes={scaleNotes}
            showMutedMarkers={false}
            activePosition={activePosition}
            dimmedHighlights
            noteNamesByPitchClass={noteNamesByPitchClass}
            chordTonePitchClasses={routeMode === 'caged' || routeMode === 'caged-fixed' ? chordTonePitchClasses : []}
            chordGripPositions={routeMode === 'caged' || routeMode === 'caged-fixed' ? cagedGripPositions : []}
            routePositions={route}
          />
        </div>

        <button
          onClick={handlePlayback}
          type="button"
          className={`w-14 h-14 ${isActive ? 'bg-red-700 hover:bg-red-800' : 'bg-zinc-900 hover:bg-zinc-800'} text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all`}
          title={isActive ? 'Detener escala' : 'Reproducir escala'}
        >
          {isActive ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
        </button>
      </div>
    </div>
  );
};