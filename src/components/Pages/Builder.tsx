import React, { useState, useEffect } from 'react';
import { CheckCircle2, Pencil, Play, Save, Settings, Trash2} from 'lucide-react';
import { playChordSound } from '../utils/SoundLogic';
import { CHROMATIC_FLATS, CHROMATIC_SHARPS } from '../Config';
import { saveChord, generateChordTags, saveCustomChordName } from '../Database';
import { getActiveNotes, getNoteName, getChordName } from '../utils/AuxFunctions';
import { Fretboard } from '../utils/Fretboard';

import type { AccidentalsPreference } from './MenuSettings';

const BUILDER_STORAGE_KEY = 'chord_builder_state_v1';

interface BuilderPersistedState{
  selectedFrets: (number | 'x')[];
  customChord: { rootIndex: number; extension: string } | null;
  activeRootIndex: number;
  activeExtension: string;
}

interface BuilderProps {
  accidentals: AccidentalsPreference;
  onSave?: (chordData: { name: string; notes: string[] }) => void;
  colorful: boolean;
  onOpenSettings: () => void;
  strumSpeed: number;
}

export const Builder: React.FC<BuilderProps> = ({
  accidentals,
  onSave,
  colorful,
  onOpenSettings,
  strumSpeed
}) => {

  // Carga inicial desde localStorage con fallback a valores por defecto
  const getInitialBuilderState = (): BuilderPersistedState => {
    try {
      const saved = localStorage.getItem(BUILDER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error cargando estado del Builder:', e);
    }
    return {
      selectedFrets: ['x', 'x', 'x', 'x', 'x', 'x'], // o tu estado inicial por defecto
      customChord: null,
      activeRootIndex: 0,
      activeExtension: ''
    };
  };

  const initBuilderState = getInitialBuilderState();
  // Incialización de estados usando el valor persisitido
  const [selectedFrets, setSelectedFrets] = useState<(number | 'x')[]>(initBuilderState.selectedFrets);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [saveNotification, setSaveNotification] = useState<{ message: string } | null>(null);
  const [isSaveNotificationVisible, setIsSaveNotificationVisible] = useState(false);
  const [customChord, setCustomChord] = useState<{ rootIndex: number, extension: string } | null>(initBuilderState.customChord);
  const [tempRootIndex, setTempRootIndex] = useState<number>(0);
  const [tempExtension, setTempExtension] = useState<string>('');
  const [chordName, setChordName] = useState('');

  useEffect(() => {
    if (!saveNotification) return;

    const enterFrame = window.requestAnimationFrame(() => {
      setIsSaveNotificationVisible(true);
    });
    const hideTimeout = window.setTimeout(() => setIsSaveNotificationVisible(false), 2700);
    const removeTimeout = window.setTimeout(() => setSaveNotification(null), 3000);
    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.clearTimeout(hideTimeout);
      window.clearTimeout(removeTimeout);
    };
  }, [saveNotification]);

  // Extraemos el nombre del acorde
  const SCALE = accidentals === 'flats' ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  const hasSelectedNotes = selectedFrets.some(fret => fret !== 'x');

  // Pone el nombre corresponiente. Si es custom, lo busca en la bd
  useEffect(() => {
      let cancelled = false;

      if (!hasSelectedNotes) {
        setChordName('');
        return;
      }

      getChordName(selectedFrets, accidentals).then(name => {
        if (!cancelled) {
          setChordName(name);
        }
      });

      return () => {
        cancelled = true;
      };
  }, [selectedFrets, accidentals, hasSelectedNotes]);

  // Extreamos los componentes
  const autoRootStr = chordName.match(/^[A-G][#b]?/)?.[0] || 'C';
  const autoRootIdx = accidentals === 'sharps' ? CHROMATIC_SHARPS.indexOf(autoRootStr) : CHROMATIC_FLATS.indexOf(autoRootStr);
  const autoExtension = chordName.replace(/^[A-G][#b]?/, '');

  // Determinamos los valores activos
  const activeRootIndex = customChord ? customChord.rootIndex : Math.max(0, autoRootIdx);
  const activeExtension = customChord ? customChord.extension : autoExtension;
  const activeBassIndex = getActiveNotes(selectedFrets).at(0)!;

  // Nombre para renderizar en pantalla
  const displayChordName = hasSelectedNotes || customChord ? `${SCALE[activeRootIndex]}${activeExtension}${activeBassIndex === activeRootIndex ? '' : '/'+SCALE[activeBassIndex]}` 
      : 'Introduce un acorde!'; // Título por defecto (sin notas)

  // Guardado automático de estado persistido cada vez que cambie cualquier parámetro del Builder
  useEffect(() => {
    const stateToSave: BuilderPersistedState = {
      selectedFrets,
      customChord,
      activeRootIndex,
      activeExtension
    };
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [selectedFrets, customChord, activeRootIndex, activeExtension]);

  // Si el usuario cambia las notas en el mástil, reseteamos el nombre personalizado
  useEffect(() => {
    if (customChord) {
      setCustomChord(null);
    }
  }, [selectedFrets]);

  // Gestiona la interacción con el diapasión
  const handleFretClick = (stringIndex: number, fret: number) => {
    const updated = [...selectedFrets];
    // Si ya está seleccionado ese traste, silenciamos la cuerda ('x')
    updated[stringIndex] = updated[stringIndex] === fret ? 'x' : fret;
    setSelectedFrets(updated);
  };

  // Guarda el acorde en IndexedDB. Si el acorde no tiene cuerdas al aire, lo transpone por toda el mástil
  const handleSaveClick = async () => {
    if (!chordName) return

    const chordId = `${activeRootIndex}_${JSON.stringify(selectedFrets)}`;
    const customNameStr = customChord ? `${SCALE[activeRootIndex]}${activeExtension}` : '';
    const tags = generateChordTags(SCALE[activeRootIndex], displayChordName, selectedFrets, customNameStr);

    try {
      if (customChord) {
        await saveCustomChordName(customNameStr, selectedFrets);
      }

      // 1. Comprobamos si tiene cuerdas al aire (traste 0)
      const tieneAire = selectedFrets.includes(0);

      if (tieneAire) await saveChord(chordId, activeRootIndex, activeBassIndex, activeExtension, selectedFrets, tags);
      else {
        // Figura móvil: calculamos la posición base y transponemos hasta el traste 12
        const fretsNumericos = selectedFrets.filter((f): f is number => typeof f === 'number');
        if (fretsNumericos.length === 0) return; // Si no hay notas activas
        const minFret = Math.min(...fretsNumericos);
        const baseFigura = selectedFrets.map(f => (typeof f === 'number' ? f - minFret : 'x'));
        const baseRootIndex = ((activeRootIndex - minFret) % 12 + 12) % 12;
        const baseBassIndex = ((activeBassIndex - minFret) % 12 + 12) % 12;
        

        for(let offset = 0; offset <= 12; offset++)
        {
          const currentFigura = baseFigura.map(f => (typeof f === 'number' ? f + offset : 'x')); 
          const currentRootIndex = (baseRootIndex + offset) % 12;
          const currentBassIndex = (baseBassIndex + offset) % 12;
          const currentChordId = `${currentRootIndex}_${JSON.stringify(currentFigura)}`;

          await saveChord(currentChordId, currentRootIndex, currentBassIndex, activeExtension, currentFigura, tags)
        }
      }

      if (onSave) {
        const notes = selectedFrets.map((fret, idx) => getNoteName(idx, fret, accidentals));
        onSave({ name: displayChordName, notes });
      }

      setSaveNotification({ message: 'Acorde guardado con éxito' });

    } catch(error) {
      console.error('Error al guardar el acorde en IndexedDB: ', error);
    }
  };

  // Acciona el sonido del acorde
  const handlePlayClick = async () => {
    if (isPlayingSound) return;
    setIsPlayingSound(true);
    await playChordSound(selectedFrets, strumSpeed, accidentals);
    
    // Calculamos el tiempo de espera para rearmar el botón
    const activeStrings = selectedFrets.filter(f => f !== 'x').length;
    const totalDurationMs = (activeStrings * strumSpeed) + 20;

    setTimeout(() => {
      setIsPlayingSound(false);
    }, totalDurationMs);
  };

  // Resetea el diapasón
  const handleResetBuilder = () => {
    setSelectedFrets(['x', 'x', 'x', 'x', 'x', 'x']);
    setCustomChord(null);
    localStorage.removeItem(BUILDER_STORAGE_KEY);
  };

  return (
        <div className="relative min-h-screen overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-white text-black flex flex-col items-center p-8 font-sans pt-0">
          <div className="app-fretboard-layout w-full max-w-5xl flex flex-col items-center gap-8">
            {/* Contenedor del Título + Botón Lápiz */}
            <div className="app-fretboard-header group flex w-full items-center justify-center gap-2">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-wide text-center font-serif whitespace-nowrap overflow-visible">
                {displayChordName}
              </h2>

              <button
                onClick={() => {
                    setTempRootIndex(activeRootIndex);
                    setTempExtension(activeExtension);

                    if(hasSelectedNotes) setIsEditingName(true);
                  }
                }
                className="w-8 h-8 shrink-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full flex items-center justify-center transition-colors shadow-sm"
                title="Personalizar nombre del acorde"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            
            <Fretboard 
              selectedFrets={selectedFrets}
              onFretClick={handleFretClick}
              readOnly={false}
              accidentals={accidentals}
              rootIndex={activeRootIndex}
              colorful={colorful}
              totalFrets={17}
              />

            {/* Botonera de acciones (Settings, Play, Guardar, Borrar) */}
            <div className="flex items-center justify-center gap-6 mt-2 mb-16">
              {/* Botón de Settings */}
              <button
                onClick={onOpenSettings}
                className="w-14 h-14 bg-zinc-100 hover:bg-zinc-200 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95"
                title="Ajustes"
              >
                <Settings className="w-7 h-7 text-black" />
              </button>
              
              {/* Botón Reproducir Sonido */}
              <button
                onClick={handlePlayClick}
                className="w-14 h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95"
                title="Escuchar acorde"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>

              {/* Botón Guardar Acorde (Disquete) */}
              <button
                onClick={handleSaveClick}
                className="w-14 h-14 bg-zinc-100/80 hover:bg-zinc-200 text-zinc-900 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95"
                title="Guardar acorde"
              >
                <Save className="w-8 h-8" />
              </button>

              {/* Botón Resetear Diapasón
              <button
                onClick={handleResetBuilder}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95"
                title="Resetear diapasón"
              >
                <Trash2 className="w-6 h-6" />
              </button> */}
              </div>
            </div>

          {/* Modal de edición de nombre con Selector + Texto */}
          {isEditingName && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-5">
                <h3 className="text-lg font-serif font-semibold text-zinc-900">
                  Editar nombre del acorde
                </h3>
                
                <div className="flex items-center gap-2">
                  <select
                    value={tempRootIndex}
                    onChange={(e) => setTempRootIndex(Number(e.target.value))}
                    className="bg-zinc-100 border border-zinc-300 rounded-lg px-3 py-2 text-base font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                  >
                    {SCALE.map((note, idx) => (
                      <option key={idx} value={idx}>{note}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    autoFocus
                    placeholder="Extensión (ej: m7, maj9)"
                    value={tempExtension}
                    onChange={(e) => setTempExtension(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setCustomChord({ rootIndex: tempRootIndex, extension: tempExtension });
                        setIsEditingName(false);
                      }
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    className="flex-1 px-3 py-2 border bg-zinc-100 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 text-base"
                  />
                </div>

                {/* Preview en el modal */}
                <div className="text-sm text-zinc-500 font-mono text-center">
                  Resultado: <span className="font-bold text-zinc-900">{SCALE[tempRootIndex]}{tempExtension}</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setCustomChord(null); // Restablecer al automático
                      setIsEditingName(false);
                    }}
                    className="mr-auto px-3 py-1.5 text-sm text-zinc-600 hover:text-blue-400 transition-all active:scale-95 duration-150"
                  >
                    Restablecer
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1.5 text-sm text-zinc-600 hover:text-blue-400 transition-all active:scale-95 duration-150"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setCustomChord({ rootIndex: tempRootIndex, extension: tempExtension });
                      setIsEditingName(false);
                    }}
                    className="px-4 py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-blue-400 transition-all active:scale-95 duration-150"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {saveNotification && (
            <div
              role="status"
              aria-live="polite"
              className={`fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-3rem)] items-center gap-1 rounded-2xl border border-sky-300/20 bg-[#101722] px-6 py-4 text-sm font-medium text-white shadow-2xl shadow-slate-950/25 transition-all duration-300 ease-out motion-reduce:transition-none ${
                isSaveNotificationVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-left rounded-xl bg-sky-400/15 text-sky-300">
                <CheckCircle2 size={20} aria-hidden="false" />
              </span>
              <span>{saveNotification.message}</span>
            </div>
          )}
        </div>


      );
};
