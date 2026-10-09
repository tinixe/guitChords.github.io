import React, { useState } from 'react';
import { BASE_NOTES } from '../Config';
import { getNoteIndex, getNoteName, getNoteColorClass } from './AuxFunctions';


export interface FretboardProps {
  selectedFrets: (number | 'x')[]; // Array de 6 trastes ej: ['x', 3, 2, 0, 1, 0]
  onFretClick?: (stringIndex: number, fretNumber: number) => void;
  readOnly?: boolean;               // Si es true, inhabilita clics y preview hover
  accidentals?: 'sharps' | 'flats'; // Preferencia para bemoles o sostenidos
  rootIndex?: number;               // Índice de la tónica (0-11) para pintarla en dorado/ámbar
  colorful?: boolean;               // Coloreamos la primera y la tercera para que destaquen más
  totalFrets?: number;              // Total de trastes a renderizar (por defecto 17)
  highlightedNotes?: number[];      // Clases de altura que se muestran en todas sus posiciones
  showMutedMarkers?: boolean;
  activePosition?: { stringIndex: number; fretNumber: number } | null;
  dimmedHighlights?: boolean;
  noteNamesByPitchClass?: (string | undefined)[];
  chordTonePitchClasses?: number[];
  chordGripPositions?: { stringIndex: number; fretNumber: number }[];
  routePositions?: { stringIndex: number; fretNumber: number }[];
}

// Calcula el ancho del traste en función de su posición física
const getFretWidthPercent = (fretNum: number) => {
  if (fretNum === 0) return 7.5; // Cejuela
  const factor = Math.pow(2.2, -fretNum / 24);
  return factor * 8.05;
};

export const Fretboard: React.FC<FretboardProps> = ({
  selectedFrets,
  onFretClick,
  readOnly = false,
  accidentals = 'sharps',
  rootIndex,
  colorful,
  totalFrets = 17,
  highlightedNotes,
  showMutedMarkers = true,
  activePosition,
  dimmedHighlights = false,
  noteNamesByPitchClass,
  chordTonePitchClasses,
  chordGripPositions,
  routePositions,
}) => {
  // Estado para la previsualización del ratón (stringIdx y fretNum)
  const [hoveredPosition, setHoveredPosition] = useState<{
    stringIdx: number;
    fretNum: number;
  } | null>(null);

  const handleCellClick = (stringIndex: number, fretNumber: number) => {
    if (readOnly || !onFretClick) return;
    onFretClick(stringIndex, fretNumber);
  };

  return (
    <div className={`w-full p-6 bg-zinc-100 rounded-xl shadow-inner overflow-x-auto ${readOnly ? 'select-none' : ''}`}>
      <div className="min-w-[750px] relative flex flex-col gap-0 py-1">
        
        {/* Capa de líneas verticales (Trastes) */}
        <div className="absolute inset-y-0 left-10 right-0 flex pointer-events-none z-0">
          {Array.from({ length: totalFrets + 1 }).map((_, fretNum) => (
            <div
              key={fretNum}
              style={{ width: `${getFretWidthPercent(fretNum)}%` }}
              className={`h-full border-r ${
                fretNum === 0
                  ? 'border-r-8 border-zinc-900'
                  : fretNum === 12
                  ? 'border-r-2 border-zinc-500'
                  : 'border-r border-zinc-300'
              }`}
            />
          ))}
        </div>

        {/* Cuerdas e interacción (6ª cuerda abajo, 1ª cuerda arriba) */}
        <div className="flex flex-col-reverse">
          {BASE_NOTES.map((stringNote, stringIdx) => {
            const activeFret = selectedFrets[stringIdx];

            return (
              <div key={stringIdx} className="relative flex items-center h-8">
                
                {/* Nombre de la cuerda */}
                <span className="w-10 font-mono text-base md:text-lg font-bold text-zinc-700 select-none">
                  {stringNote}
                </span>

                {/* Contenedor de trastes de la cuerda */}
                <div className="relative flex-1 flex items-center h-full">
                  
                  {/* Cuerda metálica en segundo plano */}
                  <div
                    className="absolute w-full z-0 shadow-xs pointer-events-none"
                    style={{
                      height: `${(1 + (5 - stringIdx) * 0.55) * 1.2}px`,
                      background:
                        stringIdx < 3
                          ? 'repeating-linear-gradient(90deg, #e1e1ec 0px, #cacad3 1px, #5b5b52 2px, #5b5256 3px)'
                          : 'linear-gradient(180deg, #d4d4d8 0%, #71717a 100%)'
                    }}
                  />

                  {/* Trastes navegables */}
                  {Array.from({ length: totalFrets + 1 }).map((_, fretNum) => {
                    const isSelected = activeFret === fretNum;
                    const noteIndex = getNoteIndex(stringIdx, fretNum);
                    const isHighlighted = highlightedNotes?.includes(noteIndex) ?? false;
                    const isChordTone = chordTonePitchClasses?.includes(noteIndex) ?? false;
                    const isChordGripPosition = chordGripPositions?.some(position =>
                      position.stringIndex === stringIdx && position.fretNumber === fretNum
                    ) ?? false;
                    const isRoutePosition = routePositions?.some(position =>
                      position.stringIndex === stringIdx && position.fretNumber === fretNum
                    ) ?? false;
                    const isActivePosition = activePosition?.stringIndex === stringIdx
                      && activePosition.fretNumber === fretNum;
                    const isMuted = showMutedMarkers && activeFret === 'x' && fretNum === 0;

                    // Hover funcional (Inhabilitado si es readOnly o ya está activo)
                    const isHovered =
                      !readOnly &&
                      hoveredPosition?.stringIdx === stringIdx &&
                      hoveredPosition?.fretNum === fretNum &&
                      !isSelected;

                    // Obtención dinámica del nombre de la nota
                    const noteLabel = noteNamesByPitchClass?.[noteIndex] ?? getNoteName(stringIdx, fretNum, accidentals);
                    if (rootIndex === undefined) rootIndex = -1;

                    return (
                      <div
                        key={fretNum}
                        onClick={() => handleCellClick(stringIdx, fretNum)}
                        onMouseEnter={() => !readOnly && setHoveredPosition({ stringIdx, fretNum })}
                        onMouseLeave={() => !readOnly && setHoveredPosition(null)}
                        style={{ width: `${getFretWidthPercent(fretNum)}%` }}
                        className={`h-8 flex items-center justify-center z-10 relative ${
                          readOnly ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        {/* 1. NOTA SELECCIONADA */}
                        {(isSelected || isHighlighted || isActivePosition || isChordGripPosition) && (
                          <div
                            className={`w-7 h-7 rounded-full font-mono text-xs md:text-sm font-bold flex items-center justify-center shadow-md ${isActivePosition ? 'scale-[1.16] ring-2 ring-yellow-400 opacity-100 saturate-100' : `scale-105 transition-all ${dimmedHighlights && isHighlighted && !isRoutePosition ? 'opacity-40 saturate-50' : ''} ${isChordTone ? 'ring-1 ring-amber-400' : ''} ${isChordGripPosition ? 'border-2 border-white' : ''}`} ${
                              getNoteColorClass(getNoteIndex(stringIdx, fretNum), rootIndex, colorful)
                            }`
                          }
                          >
                            {noteLabel}
                          </div>
                        )}

                        {/* 2. NOTA EN PREVIEW (HOVER) */}
                        {isHovered && (
                          <div className="w-7 h-7 rounded-full bg-blue-600/40 text-white font-mono text-xs md:text-sm font-bold flex items-center justify-center shadow-xs pointer-events-none animate-in fade-in duration-100">
                            {noteLabel}
                          </div>
                        )}

                        {/* 3. CUERDA SILENCIADA ('X') */}
                        {isMuted && !isHovered && (
                          <div className="w-7 h-7 rounded-full border-2 border-rose-600 bg-white text-rose-600 font-mono text-xs md:text-sm font-extrabold flex items-center justify-center shadow-xs">
                            X
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Números de traste (0 a totalFrets) */}
        <div className="flex pl-10 font-mono text-sm md:text-base font-semibold text-zinc-500 pt-2 select-none">
          {Array.from({ length: totalFrets + 1 }).map((_, fretNum) => (
            <div
              key={fretNum}
              style={{ width: `${getFretWidthPercent(fretNum)}%` }}
              className="text-center"
            >
              {fretNum}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};