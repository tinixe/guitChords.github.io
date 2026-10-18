import React from 'react';
import { X, Gauge, Music2, Palette } from 'lucide-react';
import type { ExerciseMode } from '../Config';

export type AccidentalsPreference = 'sharps' | 'flats';

interface SettingsBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  strumSpeedMs: number;
  setStrumSpeed: (speed: number) => void;
  accidentals: AccidentalsPreference;
  setAccidentals: (preference: AccidentalsPreference) => void;
  colorful: boolean;
  setColorful: (colorful: boolean) => void;
  exerciseMode: ExerciseMode;
  setExerciseMode: (mode: ExerciseMode) => void;
  scalesBpm: number;
  setScalesBpm: (bpm: number) => void;
  scalesMetronomeEnabled: boolean;
  setScalesMetronomeEnabled: (enabled: boolean) => void;
  scalesAutoTempo: boolean;
  setScalesAutoTempo: (enabled: boolean) => void;
}

export const MenuSettings: React.FC<SettingsBuilderProps> = ({
  isOpen,
  onClose,
  strumSpeedMs,
  setStrumSpeed,
  accidentals,
  setAccidentals,
  colorful,
  setColorful,
  exerciseMode,
  setExerciseMode,
  scalesBpm,
  setScalesBpm,
  scalesMetronomeEnabled,
  setScalesMetronomeEnabled,
  scalesAutoTempo,
  setScalesAutoTempo,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
      >
      
      <div 
        className="w-full max-w-sm bg-white h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabecera */}
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-zinc-200">
            <h2 className="text-xl font-serif font-semibold text-zinc-900">
              Ajustes generales
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Opciones */}
          <div className="flex flex-col gap-6 pt-6">
            
            {/* 1. Selector de Velocidad de Arpegio */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-zinc-500" />
                  Velocidad de rasgueo
                </label>
                <span className="text-xs font-mono text-zinc-500">
                  {strumSpeedMs} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={500 - strumSpeedMs}
                onChange={(e) => setStrumSpeed(500 - Number(e.target.value))}
                className="w-full accent-zinc-900 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Lento</span>
                <span>Rápido</span>
              </div>
            </div>

            {/* 2. Selector de Nomenclatura (# / b) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                <Music2 className="w-4 h-4 text-zinc-500" />
                Alteraciones (Nomenclatura)
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-lg">
                <button
                  onClick={() => setAccidentals('sharps')}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${
                    accidentals === 'sharps'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Sostenidos (#)
                </button>
                <button
                  onClick={() => setAccidentals('flats')}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${
                    accidentals === 'flats'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Bemoles (b)
                </button>
              </div>
            </div>

            {/* 3. Selector de colores del diapasón */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                <Palette className="w-4 h-4 text-zinc-500" />
                Colores del diapasón
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-lg">
                <button
                  onClick={() => setColorful(true)}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${
                    colorful
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Colorido
                </button>
                <button
                  onClick={() => setColorful(false)}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${
                    !colorful
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Monocromo
                </button>
              </div>
            </div>

            {/* 4. Selector del modo de ejercicio */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700">
                Modo de ejercicio
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-lg">
                {([
                  ['common-tones', 'Common tones'],
                  ['soprano', 'Soprano'],
                  ['bass', 'Bass'],
                ] as [ExerciseMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setExerciseMode(mode)}
                    aria-pressed={exerciseMode === mode}
                    className={`py-2 px-1 text-xs font-medium rounded-md transition-all ${
                      exerciseMode === mode
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500" aria-live="polite">
                {exerciseMode === 'common-tones'
                  ? 'Favorece acordes que comparten más notas con el acorde actual.'
                  : exerciseMode === 'soprano'
                    ? 'Favorece acordes que reducen el movimiento de la voz superior.'
                    : 'Favorece acordes que reducen el movimiento de la nota más grave.'}
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-zinc-200 pt-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-zinc-500" />
                  Tempo
                </label>
                <span className="text-xs font-mono text-zinc-500">{scalesBpm} BPM</span>
              </div>
              <input
                type="range"
                min="40"
                max="220"
                step="2"
                value={scalesBpm}
                onChange={event => setScalesBpm(Number(event.target.value))}
                className="w-full accent-zinc-900 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                aria-label="Tempo de escalas"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>40 BPM</span>
                <span>220 BPM</span>
              </div>
              <label className="flex items-center justify-between text-sm text-zinc-700">
                Metrónomo
                <input type="checkbox" checked={scalesMetronomeEnabled} onChange={event => setScalesMetronomeEnabled(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between text-sm text-zinc-700">
                Aumentar tempo automáticamente
                <input type="checkbox" checked={scalesAutoTempo} onChange={event => setScalesAutoTempo(event.target.checked)} />
              </label>
            </div>

          </div>
        </div>

        {/* Cierre inferior */}
        <div className="pt-4 border-t border-zinc-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-900 text-white rounded-lg font-medium text-sm hover:bg-zinc-800 transition-colors"
          >
            Aceptar
          </button>
        </div>

      </div>
    </div>
  );
};