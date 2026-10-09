import React, { useState, useEffect } from 'react';
import { Fretboard } from '../utils/Fretboard';
import { Play, Settings, Minus, Plus, X } from 'lucide-react';
import { CHROMATIC_SHARPS, CHROMATIC_FLATS } from '../Config';
import { extensions, fetchAllMatchingChords, fetchNextChord, getChordName, getVoiceLeadingMetrics } from '../utils/AuxFunctions';
import { playChordSound } from '../utils/SoundLogic';

import type { AccidentalsPreference } from './MenuSettings';
import type { ChordTypeOption, ChordColorOption, ExerciseMode } from '../Config';
import type {TrainerChord, VisualFilter, VoiceLeadingMetrics} from '../utils/AuxFunctions';
import { getCustomChordName } from '../Database';

const TRAINER_STORAGE_KEY = 'trainer_state_v1';

// Penalizaciones por aparecer
const tabu: string[] = [];
const penalty = new Map<string, number>();

export const resetVoiceLeadingSession = () => {
  tabu.length = 0;
  penalty.clear();
};

// Interfaces
interface TrainerProps {
    accidentals: AccidentalsPreference;
    colorful?: boolean;
    exerciseMode: ExerciseMode;
    strumSpeed: number;
  onOpenSettings: () => void;
}

interface TrainerPersistedState{
  activeFrets: (number | 'x')[];
  dotCount: number;
  visualFilters: VisualFilter[];
}


export const Trainer: React.FC<TrainerProps> = ({
  accidentals,
  colorful,
  exerciseMode,
  strumSpeed,
  onOpenSettings,
}) => {

  // Carga inicial desde localStorage con fallback a valores por defecto
  const getInitialTrainerState = (): TrainerPersistedState => {
    try {
      const saved = localStorage.getItem(TRAINER_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        return {
          activeFrets: Array.isArray(state.activeFrets) ? state.activeFrets : [0, 0, 0, 0, 0, 0],
          dotCount: typeof state.dotCount === 'number' ? state.dotCount : 2,
          visualFilters: Array.isArray(state.visualFilters) ? state.visualFilters : [],
        };
      }
    } catch (e) {
      console.error('Error cargando estado del Trainer:', e);
    }
    return {
      activeFrets: ([0, 0, 0, 0, 0, 0]),
      dotCount: 1,
      visualFilters: [],
    };
  };

  const initTrainerState = getInitialTrainerState();

  // Estados de los selectores superiores
  const [selectedRoot, setSelectedRoot] = useState<string[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string[]>([]);
  const [selectedChordType, setselectedChordType] = useState<ChordTypeOption[]>([]);
  const [selectedColor, setselectedColor] = useState<ChordColorOption[]>([]);
  const [selectedStringGroup, setSelectedStringGroup] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'root' | 'chordtype' | 'color' | 'extension' | 'strings' | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [visualFilters, setVisualFilters] = useState<VisualFilter[]>(initTrainerState.visualFilters);
  const [lastTransition, setLastTransition] = useState<VoiceLeadingMetrics | null>(null);

  // Estados para el contador de puntos
  const [dotCount, setDotCount] = useState<number>(initTrainerState.dotCount);
  const [activeDotIndex, setActiveDotIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Estados de control de funcionalidad principal
  const [matchingChords, setMatchingChords] = useState<TrainerChord[]>([]);
  const [currentFrets, setCurrentFrets] = useState<(number | 'x')[]>(initTrainerState.activeFrets);
  const [currentChord, setChordName] = useState('');

  // Pone el nombre corresponiente. Si es custom, lo busca en la bd
  useEffect(() => {
      let cancelled = false;

      getCustomChordName(currentFrets).then(name => {
        if (!cancelled && name) {
          setChordName(name);
        }
      })

      getChordName(currentFrets, accidentals).then(name => {
        if (!cancelled) {
          setChordName(name);
        }
      });

      return () => {
        cancelled = true;
      };
  }, [currentFrets, accidentals]);


  const SCALE = accidentals === 'sharps' ? CHROMATIC_SHARPS : CHROMATIC_FLATS;
  const currentRoot = SCALE.indexOf(currentChord.match(/^[A-G][#b]?/)?.[0] || 'C');
  
  // Opciones disponibles para "Cuerdas"
  const getStringOptions = (): string[] => {
    return selectedChordType.flatMap(type => {
      switch (type) {
        case 'Triada': return ['3ª-2ª-1ª', '4ª-3ª-2ª', '5ª-4ª-3ª', '6ª-5ª-4ª'];
        case 'Drop2': return ['4ª-3ª-2ª-1ª', '5ª-4ª-3ª-2ª', '6ª-5ª-4ª-3ª'];
        case 'Drop3': return ['5ª-x-3ª-2ª-1ª', '6ª-x-4ª-3ª-2ª'];
        case 'Drop2&4': return ['6ª-x-4ª-3ª-x-1ª', '6ª-5ª-x-3ª-x-1ª'];
        default: return [];
      }
    }).filter((option, index, options) => options.indexOf(option) === index);
  };

  const stringOptions = getStringOptions();
  const isCuerdasDisabled = stringOptions.length === 0; // Habilitado si es Tríada o si hay un Drop elegido
  const isExtensionDisabled = selectedChordType.length > 0 && selectedChordType.every(type => type === 'Triada');

  /* UseEffect y Handlers*/
  // Guardado automático de estado persistido
  useEffect(() => {
    const stateToSave: TrainerPersistedState = {
      activeFrets: currentFrets,
      dotCount: dotCount,
      visualFilters: visualFilters,
    };
    localStorage.setItem(TRAINER_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [currentFrets, dotCount, visualFilters]);

  // Sincronización automática del tipo de accidentales
  useEffect(() => {
    if (selectedRoot.length === 0) return;

    setSelectedRoot(prev => prev.map(note => {
      const sharpsIndex = CHROMATIC_SHARPS.indexOf(note);
      const flatsIndex = CHROMATIC_FLATS.indexOf(note);
      if (accidentals === 'flats' && sharpsIndex !== -1) return CHROMATIC_FLATS[sharpsIndex];
      if (accidentals === 'sharps' && flatsIndex !== -1) return CHROMATIC_SHARPS[flatsIndex];
      return note;
    }));
  }, [accidentals]);

  // Efecto para hacer avanzar el punto activo
  useEffect(() => {
    if (!isPlaying) { // Detiene los puntos
      setActiveDotIndex(null);
      return;
    }

    // Si no había ningún punto activo, empezamos por el primero (0)
    setActiveDotIndex((prev) => (prev === null ? 0 : prev));

    const interval = setInterval(() => {
      setActiveDotIndex((prev) => {
        if (prev === null) return 0;
        // Avanza al siguiente punto y vuelve al 0 al llegar al total (dotCount)
        return (prev + 1) % dotCount;
      });
    }, Math.max(600, strumSpeed*3)); // Cambia cada 3x el strum speed

    return () => clearInterval(interval);
  }, [isPlaying, dotCount]);

  // SELECCION DE ACORDE EN CADA CICLO
  useEffect(() => {
    if (isPlaying && activeDotIndex === 0 && matchingChords.length > 0) {
      const selectedChord = fetchNextChord(currentFrets, matchingChords, exerciseMode, tabu, penalty);

      // Si encontramos un acorde válido, lo aplicamos y reproducimos
      if (selectedChord) {
        setLastTransition(getVoiceLeadingMetrics(currentFrets, selectedChord.frets));
        setCurrentFrets(selectedChord.frets);
        playChordSound(selectedChord.frets, strumSpeed, accidentals);
      }
    }
  }, [activeDotIndex, isPlaying, matchingChords, accidentals, exerciseMode]);

  // Manejador del botón Play / Stop
  const handleTogglePlay = async () => {
    if(!isPlaying)
    {
      const chords = await fetchAllMatchingChords(visualFilters, accidentals);
    
      if (chords.length === 0)
      { return; }
      tabu.length = 0;
      penalty.clear();
      setLastTransition(null);
      setMatchingChords(chords);
      setIsPlaying(true);
    } else setIsPlaying(false);
  };

  // Manejadores de desplegables
  const handleSelectChordType = (type: ChordTypeOption) => {
    setselectedChordType(prev => prev.includes(type) ? prev.filter(value => value !== type) : [...prev, type]);
    setSelectedStringGroup([]);
  };

  const handleSelectColor = (color: ChordColorOption) => {
    setselectedColor(prev => prev.includes(color) ? prev.filter(value => value !== color) : [...prev, color]);
  };

  const handleSelectExtension = (ext: string) => {
    setSelectedExtension(prev => prev.includes(ext) ? prev.filter(value => value !== ext) : [...prev, ext]);
  };

  const handleSelectStringGroup = (strOption: string) => {
    setSelectedStringGroup(prev => prev.includes(strOption) ? prev.filter(value => value !== strOption) : [...prev, strOption]);
  };

  const handleDecreaseDots = () => setDotCount((prev) => Math.max(2, prev - 1));
  const handleIncreaseDots = () => setDotCount((prev) => Math.min(8, prev + 1));

  const toggleDropdown = (menu: 'root' | 'chordtype' | 'color' |'extension' | 'strings') => {
    setActiveDropdown((prev) => (prev === menu ? null : menu));
  };

  return (
    <div 
      className="relative min-h-screen overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-white text-black flex flex-col items-center justify-between p-8 font-sans pt-35"
      onClick={() => setActiveDropdown(null)} // Cierra dropdowns al hacer clic fuera
    >
      <div className="w-full max-w-4xl flex flex-col items-center gap-8" onClick={(e) => e.stopPropagation()}>

        <div className="w-full text-center">
          <h1 className="text-3xl md:text-4xl font-serif text-zinc-900">Trainer</h1>
          <p className="text-sm text-zinc-500 mt-1">Practica transiciones entre acordes con filtros y ejercicios de conducción de voces.</p>
        </div>

        {/* Sección superior: nombre del acorde y puntos indicadores */}
        <div className="w-full flex items-center justify-between gap-4 px-2">
          {/* Sección que muestra el nombre del acorde */}
          <div className="min-w-0 flex items-center bg-white px-5 py-1.5 rounded-full shadow-xs border border-zinc-200">
            {`${currentChord}`}
          </div>

          {/* Selector de Puntos (- [• • •] +) en Esquina Superior Derecha */}
          <div className="shrink-0 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-xs border border-zinc-200">
            <button
              onClick={handleDecreaseDots}
              disabled={dotCount <= 2 || isPlaying}
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-700 transition-all cursor-pointer"
              title="Disminuir puntos"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Puntos Indicadores */}
            <div className="flex items-center gap-1.5 px-1">
              {Array.from({ length: dotCount }).map((_, index) => {
                const isActive = index === activeDotIndex;
                return (
                  <div
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-500 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                        : 'bg-zinc-400'
                    }`}
                  />
                );
              })}
            </div>

            <button
              onClick={handleIncreaseDots}
              disabled={dotCount >= 8 || isPlaying}
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-700 transition-all cursor-pointer"
              title="Aumentar puntos"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* --- 2. CONTENEDOR DIAPASÓN --- */}
        <div className="relative w-full">
          <Fretboard
            selectedFrets={currentFrets}
            readOnly={true}
            accidentals={accidentals}
            rootIndex={currentRoot}
            colorful={colorful}
            totalFrets={17}
          />
          {lastTransition && (
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{lastTransition.commonNotes} notas comunes</span>
              <span>Bajo: {lastTransition.bassMovement}</span>
              <span>Soprano: {lastTransition.sopranoMovement}</span>
            </div>
          )}
        </div>

        {/* --- 3. CONTROLES INFERIORES --- */}
        <div className="flex flex-col items-center gap-4 mt-2">
          <div className="flex items-center justify-center gap-6 mb-16">
            {/* Botón de Settings */}
            <button
              onClick={onOpenSettings}
              className="w-14 h-14 bg-zinc-100 hover:bg-zinc-200 text-black rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              title="Ajustes"
            >
              <Settings className="w-7 h-7 text-black" />
            </button>

            {/* Botón Comenzar */}
            <button
              className="w-14 h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              title={isPlaying ? 'Detener' : 'Iniciar'}
              onClick={handleTogglePlay}
            >
              <Play className={`w-6 h-6 fill-current ml-0.5 ${isPlaying ? 'animate-pulse' : ''}`} />
            </button>

            {/* Botón para editar los filtros */}
            <button
              onClick={() => {
                setActiveDropdown(null);
                setIsFilterDialogOpen(true);
              }}
              className="w-14 h-14 bg-zinc-100 hover:bg-zinc-200 text-black rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              title="Editar filtros"
            >
              <Plus className="w-8 h-8 text-black" />
            </button>
          </div>

          {visualFilters.length > 0 && (
            <div className="w-full flex flex-wrap justify-center gap-3 -mt-10 mb-8">
              {visualFilters.map((filter, index) => (
                <div
                  key={index}
                  className="relative flex flex-wrap items-center justify-center gap-2 px-4 pt-5 pb-3 bg-white border border-zinc-200 rounded-2xl shadow-sm"
                >
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-900 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                    title="Borrar filtro"
                    onClick={() => {setVisualFilters(prev => prev.filter((_, id) => id !== index));}}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Filtro {index + 1}
                  </span>
                  {filter.root.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-[#e0f8ff] text-xs font-medium text-zinc-800">
                      Tónica: {filter.root.join(', ')}
                    </span>
                  )}
                  {filter.chordType.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-[#e0f8ff] text-xs font-medium text-zinc-800">
                      Tipo: {filter.chordType.join(', ')}
                    </span>
                  )}
                  {filter.color.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-[#e0f8ff] text-xs font-medium text-zinc-800">
                      Color: {filter.color.join(', ')}
                    </span>
                  )}
                  {filter.extension.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-[#e0f8ff] text-xs font-medium text-zinc-800">
                      Extensión: {filter.extension.join(', ')}
                    </span>
                  )}
                  {filter.stringGroup.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-[#e0f8ff] text-xs font-medium text-zinc-800">
                      Cuerdas: {filter.stringGroup.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isFilterDialogOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setActiveDropdown(null);
            setIsFilterDialogOpen(false);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl flex flex-col gap-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-serif font-semibold text-zinc-900">
              Configurar filtros
            </h3>

            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <button onClick={() => toggleDropdown('root')} className="px-5 py-2.5 rounded-full bg-[#e0f8ff] hover:bg-[#cbf2fc] text-zinc-800 text-sm font-medium transition-all shadow-xs cursor-pointer">
                  {selectedRoot.length > 0 ? selectedRoot.join(', ') : 'Tónica'}
                </button>
                {activeDropdown === 'root' && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-lg z-30 p-2 grid grid-cols-3 gap-1">
                    <button onClick={() => setSelectedRoot([])} className="col-span-3 p-2 text-xs font-medium rounded-xl text-left text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer">Borrar filtros</button>
                    {SCALE.map(note => (
                      <button key={note} onClick={() => setSelectedRoot(prev => prev.includes(note) ? prev.filter(value => value !== note) : [...prev, note])} className={`p-2 text-xs font-semibold rounded-xl text-center hover:bg-zinc-100 transition-colors cursor-pointer ${selectedRoot.includes(note) ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'text-zinc-700'}`}>{note}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => toggleDropdown('chordtype')} className="px-5 py-2.5 rounded-full bg-[#e0f8ff] hover:bg-[#cbf2fc] text-zinc-800 text-sm font-medium transition-all shadow-xs cursor-pointer">
                  {selectedChordType.length > 0 ? selectedChordType.join(', ') : 'Tipo'}
                </button>
                {activeDropdown === 'chordtype' && (
                  <div className="absolute left-0 mt-2 w-40 bg-white border border-zinc-200 rounded-2xl shadow-lg z-30 p-2 flex flex-col gap-1">
                    <button onClick={() => setselectedChordType([])} className="p-2.5 text-xs font-medium rounded-xl text-left text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer">Borrar filtros</button>
                    {(['Normal', 'Triada', 'Drop2', 'Drop3', 'Drop2&4'] as ChordTypeOption[]).map(type => (
                      <button key={type} onClick={() => handleSelectChordType(type)} className={`p-2.5 text-sm font-medium rounded-xl text-left hover:bg-zinc-100 transition-colors cursor-pointer ${selectedChordType.includes(type) ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'text-zinc-700'}`}>{type}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => toggleDropdown('color')} className="px-5 py-2.5 rounded-full bg-[#e0f8ff] hover:bg-[#cbf2fc] text-zinc-800 text-sm font-medium transition-all shadow-xs cursor-pointer">
                  {selectedColor.length > 0 ? selectedColor.join(', ') : 'Color'}
                </button>
                {activeDropdown === 'color' && (
                  <div className="absolute left-0 mt-2 w-40 bg-white border border-zinc-200 rounded-2xl shadow-lg z-30 p-2 flex flex-col gap-1">
                    <button onClick={() => setselectedColor([])} className="p-2.5 text-xs font-medium rounded-xl text-left text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer">Borrar filtros</button>
                    {(['Mayor', 'Menor', 'Suspendido', 'Disminuido', 'Aumentado'] as ChordColorOption[]).map(color => (
                      <button key={color} onClick={() => handleSelectColor(color)} className={`p-2.5 text-sm font-medium rounded-xl text-left hover:bg-zinc-100 transition-colors cursor-pointer ${selectedColor.includes(color) ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'text-zinc-700'}`}>{color}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button disabled={isExtensionDisabled} onClick={() => toggleDropdown('extension')} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-xs ${isExtensionDisabled ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60' : 'bg-[#e0f8ff] hover:bg-[#cbf2fc] text-zinc-800 cursor-pointer'}`}>
                  {selectedExtension.length > 0 ? selectedExtension.join(', ') : 'Extensión'}
                </button>
                {activeDropdown === 'extension' && !isExtensionDisabled && (
                  <div className="absolute left-0 mt-2 w-40 max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-lg z-30 p-2 flex flex-col gap-1">
                    <button onClick={() => setSelectedExtension([])} className="p-2.5 text-xs font-medium rounded-xl text-left text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer">Borrar filtros</button>
                    {extensions.map(extension => (
                      <button key={extension} onClick={() => handleSelectExtension(extension)} className={`p-2.5 text-sm font-medium rounded-xl text-left hover:bg-zinc-100 transition-colors cursor-pointer ${selectedExtension.includes(extension) ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'text-zinc-700'}`}>{extension}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button disabled={isCuerdasDisabled} onClick={() => toggleDropdown('strings')} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-xs ${isCuerdasDisabled ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60' : 'bg-[#e0f8ff] hover:bg-[#cbf2fc] text-zinc-800 cursor-pointer'}`}>
                  {selectedStringGroup.length > 0 ? selectedStringGroup.join(', ') : 'Cuerdas'}
                </button>
                {activeDropdown === 'strings' && !isCuerdasDisabled && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-lg z-30 p-2 flex flex-col gap-1">
                    <button onClick={() => setSelectedStringGroup([])} className="p-2.5 text-xs font-medium rounded-xl text-left text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer">Borrar filtros</button>
                    {stringOptions.map(option => (
                      <button key={option} onClick={() => handleSelectStringGroup(option)} className={`p-2.5 text-sm font-medium rounded-xl text-left hover:bg-zinc-100 transition-colors cursor-pointer ${selectedStringGroup.includes(option) ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'text-zinc-700'}`}>{option}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedRoot([]);
                  setselectedChordType([]);
                  setselectedColor([]);
                  setSelectedExtension([]);
                  setSelectedStringGroup([]);
                }}
                className="mr-auto px-3 py-1.5 text-sm text-zinc-600 hover:text-blue-400 transition-all active:scale-95"
              >
                Borrar filtros
              </button>
              <button
                onClick={() => {
                  // ASSERT: Comprobamos que los filtros estén bien!
                  const hasNotNormal = selectedChordType.includes('Triada') 
                      || selectedChordType.includes('Drop2')
                      || selectedChordType.includes('Drop3')
                      || selectedChordType.includes('Drop2&4');
                  if (selectedRoot.length === 0) { alert("Selecciona una tónica!"); return []; }
                  if (selectedChordType.some(type => type !== 'Triada') && selectedExtension.length === 0) { alert("Selecciona una extensión!"); return []; }
                  if (selectedColor.length === 0) { alert("Selecciona un color!"); return []; }
                  if (hasNotNormal && selectedStringGroup.length === 0)  { alert("Selecciona un conjunto de cuerdas!"); return []; };

                  // Reiniciamos el recorrido al cambiar el conjunto de acordes.
                  tabu.length = 0;
                  penalty.clear();
                  setMatchingChords([]);
                  setIsPlaying(false);
                  setLastTransition(null);

                  setVisualFilters(prev => [...prev, {
                    root: [...selectedRoot],
                    chordType: [...selectedChordType],
                    color: [...selectedColor],
                    extension: [...selectedExtension],
                    stringGroup: [...selectedStringGroup],
                  }]);
                  setActiveDropdown(null);
                  setIsFilterDialogOpen(false);
                }}
                className="px-4 py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-blue-400 transition-all active:scale-95"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};