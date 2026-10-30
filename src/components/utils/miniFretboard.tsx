import React from 'react';
import { getNoteIndex } from './AuxFunctions';

interface MiniFretboardProps {
  rootIndex: number,
  figura: (number | 'x')[];
}

/**
 * Renderiza una vista compacta de la figura: calcula el rango visible a partir
 * de los trastes pisados y marca las notas tónicas en relación con `rootIndex`.
 * @precondition `figura` contiene una entrada por cuerda en el orden esperado y `rootIndex` es un índice cromático.
 * @postcondition Devuelve el diapasón compacto sin modificar la figura ni el estado de la aplicación.
 */
export const MiniFretboard: React.FC<MiniFretboardProps> = ({ rootIndex, figura }) => {
  // Extraemos únicamente los trastes pisados (> 0) para calcular el rango activo
  const fretsPushed = figura.filter((f): f is number => typeof f === 'number' && f > 0);
  
  const minFret = fretsPushed.length > 0 ? Math.min(...fretsPushed) : 1;
  const maxFret = fretsPushed.length > 0 ? Math.max(...fretsPushed) : 3;
  
  // Garantizamos mostrar al menos un bloque de 3 o 4 trastes de ancho
  const rangeLength = Math.max(4, maxFret - minFret + 1);
  const displayFrets = Array.from({ length: rangeLength }, (_, i) => minFret + i);

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-2">
      {/* Cuerdas (Renderizadas de 6ª a 1ª) */}
      <div className="flex flex-col gap-1.5 relative pt-1">
        {figura.slice().reverse().map((fret, reverseIdx) => {
          const stringIdx = 5 - reverseIdx;
          const isOpen = fret === 0;
          const isMuted = fret === 'x';

          return (
            <div key={stringIdx} className="flex items-center h-4 relative">
              {/* Marca en la cejuela (Nut): Cuerda Abierta 'O' o Muteada 'X' */}
              <div className="w-5 flex items-center justify-center font-mono text-xs font-bold">
                {isOpen && <span className="text-emerald-600">O</span>}
                {isMuted && <span className="text-rose-500">X</span>}
              </div>

              {/* Cejuela visual */}
              <div className="w-1 h-full bg-zinc-800 rounded-sm mr-1" />

              {/* Línea de la Cuerda + Trastes */}
              <div className="flex-1 flex items-center relative h-full">
                {/* Hilo de la cuerda */}
                <div 
                  className="absolute inset-x-0 bg-zinc-400 z-0" 
                   style={{ 
                              height: `${(1 + (5 - stringIdx) * 0.55) * 1.2}px`,
                              background: stringIdx < 3 
                                ? 'repeating-linear-gradient(90deg, #e1e1ec 0px, #cacad3 1px, #5b5b52 2px, #5b5256 3px)'
                                : 'linear-gradient(180deg, #d4d4d8 0%, #71717a 100%)'
                            }}  
                />

                {/* Casillas de los trastes mostrados */}
                {displayFrets.map((fretNum) => {
                  const isPushed = fret === fretNum;
                  const isRoot = getNoteIndex(stringIdx, fret) === rootIndex;

                  return (
                    <div 
                      key={fretNum} 
                      className="flex-1 h-full border-r border-zinc-300 flex items-center justify-center relative z-10"
                    >
                      {isPushed && (
                      <div 
                          className={`w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                            isRoot ? 'bg-rose-400' : 'bg-blue-800'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador del primer traste usado (debajo de la cuadrícula) */}
      <div className="flex pl-8 font-mono text-xs text-zinc-500 justify-between px-2 pt-1 border-t border-zinc-100">
        <span>{minFret}</span>
        {displayFrets.length > 1 && <span>{displayFrets[displayFrets.length - 1]}</span>}
      </div>
    </div>
  );
};