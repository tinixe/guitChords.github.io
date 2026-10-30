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
  orientation?: 'horizontal' | 'vertical';
}

// Calcula el ancho del traste en función de su posición física
/**
 * Calcula el ancho porcentual de una casilla según su posición en el diapasón,
 * usando un ancho fijo para la cejuela y una reducción progresiva en los trastes.
 * @precondition `fretNum` es un número entero no negativo que identifica un traste.
 * @postcondition Devuelve un porcentaje numérico positivo sin modificar el estado.
 */
const getFretWidthPercent = (fretNum: number) => {
  if (fretNum === 0) return 7.5; // Cejuela
  const factor = Math.pow(2.2, -fretNum / 24);
  return factor * 8.05;
};

/**
 * Renderiza el diapasón en orientación horizontal o vertical, con las notas,
 * selecciones y previsualizaciones permitidas por las propiedades recibidas.
 * @precondition `selectedFrets` representa las cuerdas del instrumento y las propiedades opcionales cumplen sus tipos.
 * @postcondition Devuelve la vista del diapasón; solo delega la edición al callback cuando no está en modo de solo lectura.
 */
export const Fretboard: React.FC<FretboardProps> = ({
  selectedFrets,
  onFretClick,
  readOnly = false,
  accidentals = 'sharps',
  rootIndex,
  colorful,
  totalFrets = 17,
  orientation = 'horizontal',
}) => {
  // Estado para la previsualización del ratón (stringIdx y fretNum)
  const [hoveredPosition, setHoveredPosition] = useState<{
    stringIdx: number;
    fretNum: number;
  } | null>(null);

  /**
   * Procesa la selección de una casilla y no hace nada cuando el diapasón es
   * de solo lectura o no se proporcionó un callback de selección.
   * @precondition Los índices de cuerda y traste corresponden a la casilla renderizada.
   * @postcondition Invoca `onFretClick` una vez con ambos índices solo si la edición está habilitada.
   */
  const handleCellClick = (stringIndex: number, fretNumber: number) => {
    if (readOnly || !onFretClick) return;
    onFretClick(stringIndex, fretNumber);
  };

  /**
   * Construye la casilla visual para una cuerda y un traste, incluyendo su
   * nota, selección, silenciamiento y controles de interacción.
   * @precondition `stringIndex` y `fretNum` identifican una cuerda y traste válidos.
   * @postcondition Devuelve el elemento visual de esa casilla sin cambiar los trastes seleccionados.
   */
  const renderFretCell = (stringIndex: number, fretNum: number) => {
    const activeFret = selectedFrets[stringIndex];
    const isSelected = activeFret === fretNum;
    const noteIndex = getNoteIndex(stringIndex, fretNum);
    const isMuted = activeFret === 'x' && fretNum === 0;
    const isHovered =
      !readOnly &&
      hoveredPosition?.stringIdx === stringIndex &&
      hoveredPosition?.fretNum === fretNum &&
      !isSelected;
    const noteLabel = getNoteName(stringIndex, fretNum, accidentals);

    /**
     * Adapta el clic de la casilla a sus índices de cuerda y traste.
     * @precondition La casilla pertenece a la cuerda y al traste capturados.
     * @postcondition Delega en `handleCellClick`, que respeta el modo de solo lectura.
     */
    const onCellClick = () => handleCellClick(stringIndex, fretNum);

    /**
     * Actualiza la previsualización al entrar el puntero en la casilla editable.
     * @precondition La casilla actual corresponde a los índices capturados.
     * @postcondition Guarda la posición de esta casilla si la edición está habilitada; en solo lectura no altera el estado.
     */
    const onCellMouseEnter = () => {
      if (!readOnly) setHoveredPosition({ stringIdx: stringIndex, fretNum });
    };

    /**
     * Limpia la previsualización al salir el puntero de la casilla editable.
     * @precondition La casilla actual forma parte del diapasón renderizado.
     * @postcondition Borra la posición previsualizada si la edición está habilitada; en solo lectura no altera el estado.
     */
    const onCellMouseLeave = () => {
      if (!readOnly) setHoveredPosition(null);
    };

    return (
      <div
        key={`${stringIndex}-${fretNum}`}
        onClick={onCellClick}
        onMouseEnter={onCellMouseEnter}
        onMouseLeave={onCellMouseLeave}
        style={orientation === 'horizontal'
          ? { width: `${getFretWidthPercent(fretNum)}%` }
          : undefined}
        className={`flex items-center justify-center z-10 relative ${
          orientation === 'horizontal' ? 'h-8' : 'h-full flex-1'
        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {isSelected && (
          <div
            className={`w-7 h-7 rounded-full font-mono text-xs md:text-sm font-bold flex items-center justify-center shadow-md scale-105 transition-all ${
              getNoteColorClass(noteIndex, rootIndex ?? -1, colorful)
            }`}
          >
            {noteLabel}
          </div>
        )}
        {isHovered && (
          <div className="w-7 h-7 rounded-full bg-blue-600/40 text-white font-mono text-xs md:text-sm font-bold flex items-center justify-center shadow-xs pointer-events-none animate-in fade-in duration-100">
            {noteLabel}
          </div>
        )}
        {isMuted && !isHovered && (
          <div className="w-7 h-7 rounded-full border-2 border-rose-600 bg-white text-rose-600 font-mono text-xs md:text-sm font-extrabold flex items-center justify-center shadow-xs">
            X
          </div>
        )}
      </div>
    );
  };

  if (orientation === 'vertical') {
    return (
      <div className={`fretboard-vertical w-fit p-3 bg-zinc-100 rounded-xl shadow-inner ${readOnly ? 'select-none' : ''}`}>
        <div className="fretboard-vertical-labels" aria-hidden="true">
          <span />
          {BASE_NOTES.map((stringNote, stringIdx) => (
            <span key={stringIdx}>{stringNote}</span>
          ))}
        </div>
        <div className="fretboard-vertical-rows">
          <div className="fretboard-vertical-strings" aria-hidden="true">
            {BASE_NOTES.map((_, stringIdx) => {
              const halfThickness = (1 + (5 - stringIdx) * 0.55) * 0.6;
              return (
                <span
                  className="fretboard-vertical-string"
                  key={stringIdx}
                  style={{
                    background: `linear-gradient(90deg, transparent calc(50% - ${halfThickness}px), #d4d4d8 calc(50% - ${halfThickness}px), #71717a 50%, #d4d4d8 calc(50% + ${halfThickness}px), transparent calc(50% + ${halfThickness}px))`,
                  }}
                />
              );
            })}
          </div>
          {Array.from({ length: totalFrets + 1 }, (_, fretNum) => (
            <div
              className={`fretboard-vertical-row${fretNum === 0 ? ' fretboard-vertical-nut' : ''}${fretNum === 12 ? ' fretboard-vertical-octave' : ''}`}
              key={fretNum}
              style={{ flex: `${getFretWidthPercent(fretNum)} 0 0%` }}
            >
              <span className="fretboard-vertical-number">{fretNum}</span>
              {BASE_NOTES.map((_, stringIdx) =>
                renderFretCell(stringIdx, fretNum)
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
                  {Array.from({ length: totalFrets + 1 }, (_, fretNum) =>
                    renderFretCell(stringIdx, fretNum)
                  )}
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