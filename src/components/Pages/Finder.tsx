import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { BASE_NOTES, CHROMATIC_FLATS, CHROMATIC_SHARPS } from '../Config';
import { db } from '../Database';
import type { GlobalChord } from '../Database';
import { getNoteIndex, getNoteOctave } from '../utils/AuxFunctions';
import { Fretboard } from '../utils/Fretboard';
import { MiniFretboard } from '../utils/miniFretboard';
import type { AccidentalsPreference } from './MenuSettings';

interface FinderProps {
  accidentals: AccidentalsPreference;
}

type LeadFunction = 'Root' | 'Third' | 'Fifth' | 'Other';
type ChordColor = 'major' | 'minor' | 'suspended' | 'diminished' | 'augmented';

interface FinderChord {
  chord: GlobalChord;
  name: string;
  leadFunction: LeadFunction;
  color: ChordColor;
}

type FinderResults = Record<LeadFunction, FinderChord[]>;

const EMPTY_RESULTS: FinderResults = {
  Root: [],
  Third: [],
  Fifth: [],
  Other: [],
};

/**
 * Asigna el color visual del buscador a partir de las etiquetas del acorde.
 * @param chord Acorde cuyas etiquetas determinan su categoría.
 * @precondition `chord.tags` contiene las etiquetas del acorde.
 * @postcondition Devuelve una categoría cromática, priorizando disminuidos, aumentados, suspendidos y menores.
 */
const getChordColor = (chord: GlobalChord): ChordColor => {
  if (chord.tags.includes('Disminuido') || chord.tags.includes('Semi-disminuido')) {
    return 'diminished';
  }
  if (chord.tags.includes('Aumentado')) return 'augmented';
  if (chord.tags.includes('Suspendido')) return 'suspended';
  if (chord.tags.includes('Menor')) return 'minor';
  return 'major';
};

/**
 * Clasifica la nota más aguda respecto a la raíz según el intervalo y las características del acorde.
 * @param chord Acorde que se compara con la nota guía.
 * @param leadNoteIndex Índice cromático de la nota más aguda.
 * @precondition El índice de la nota y el de la raíz pertenecen al rango cromático de 0 a 11.
 * @postcondition Devuelve Root, Third, Fifth u Other según las reglas de intervalos y etiquetas.
 */
const getLeadFunction = (chord: GlobalChord, leadNoteIndex: number): LeadFunction => {
  const distance = (leadNoteIndex - chord.rootIndex + 12) % 12;
  const extension = chord.extension.toLowerCase();

  if (distance === 0) return 'Root';
  if (distance === 2 && extension.includes('sus2')) return 'Third';
  if (distance === 3 && chord.tags.includes('Menor')) return 'Third';
  if (distance === 4 && chord.tags.includes('Mayor')) return 'Third';
  if (distance === 5 && extension.includes('sus4')) return 'Third';
  if (distance === 6 && (chord.tags.includes('Disminuido') || chord.tags.includes('Semi-disminuido'))) {
    return 'Fifth';
  }
  if (distance === 7) return 'Fifth';
  if (distance === 8 && chord.tags.includes('Aumentado')) return 'Fifth';
  return 'Other';
};

/**
 * Permite seleccionar cuerdas y trastes, busca acordes coincidentes y los agrupa por función de la nota guía.
 * @precondition La preferencia de alteraciones es válida y la base de datos de acordes puede consultarse.
 * @postcondition Renderiza los controles y resultados actuales, o el estado de carga/error correspondiente.
 */
export const Finder: FC<FinderProps> = ({ accidentals }) => {
  const [selectedFrets, setSelectedFrets] = useState<(number | 'x')[]>(
    Array.from({ length: 6 }, () => 'x')
  );

  const [selectedStrings, setSelectedStrings] = useState<boolean[]>(
    Array.from({ length: 6 }, () => false)
  );
  const [results, setResults] = useState<FinderResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [finderError, setFinderError] = useState<string | null>(null);

  /**
   * Alterna el traste de una cuerda sin cambiar si está seleccionada para el filtro.
   * @param stringIndex Índice de la cuerda modificada.
   * @param fretNumber Traste que se alterna.
   * @precondition `stringIndex` identifica una de las seis cuerdas y `fretNumber` es un traste válido.
   * @postcondition Actualiza la figura, borra errores/resultados anteriores y recalcula la carga sin modificar `selectedStrings`.
   */
  const handleFretClick = (stringIndex: number, fretNumber: number) => {
    const nextFrets = selectedFrets.map((fret, index) =>
      index === stringIndex ? (fret === fretNumber ? 'x' : fretNumber) : fret
    );
    setSelectedStrings(selectedStrings.map((isOn, index) => index === stringIndex ? nextFrets[stringIndex] === 'x' ? false : true : isOn))
    setSelectedFrets(nextFrets);
    setResults(EMPTY_RESULTS);
    setFinderError(null);
    setIsLoading(
      selectedStrings.some((isSelected, index) => isSelected && nextFrets[index] !== 'x')
    );
  };

  /**
   * Activa o desactiva una cuerda para incluirla en la búsqueda y descarta resultados anteriores.
   * @param stringIndex Índice de la cuerda que se alterna.
   * @precondition `stringIndex` identifica una de las seis cuerdas.
   * @postcondition Actualiza la selección, limpia errores/resultados y determina si hay una búsqueda pendiente.
   */
  const handleStringToggle = (stringIndex: number) => {
    const nextStrings = selectedStrings.map((isSelected, index) =>
      index === stringIndex ? !isSelected : isSelected
    );
    setSelectedStrings(nextStrings);
    setResults(EMPTY_RESULTS);
    setFinderError(null);
    setIsLoading(
      nextStrings.some((isSelected, index) => isSelected && selectedFrets[index] !== 'x')
    );
  };

  // Lógica de finder: encuentra los acordes que coinciden con la selección
  useEffect(() => {
    // Crea una constante con la nota más aguda de las obtenidas. Para ello, debes calcular el valor de la nota y de la octava. A esta nota la llamarás "lead_tone"

    // Haz una query a IndexedDB tal que cada cuerda coincida en traste o se ignore si no está seleccionada

    // Para cada acorde encontrado, calcula la distancia en semitonos entre la "root" del acorde y la "lead_tone"

    // Con la distancia en semitonos, comprueba si es tónica (0 semitonos), tercera (2 si es sus2; 3 si el acorde es menor; 4 si el acorde es mayor; 5 si el acorde es sus4), quinta (6 si es dim, 8 si es aug, 7 en cualquier otro caso). Si no coincide ninguno, lo categorizamos como "Otro"

    // Crea una estructura auxiliar que encapsule el acorde (nombre y figura), la función del lead_tone y el color correspondiente (según la leyenda que se encuentra en esta página)

    // Muestra en las tablas correspondientes cada acorde según la función del lead_tone, usando un miniFretboard para mostrar el diagrama, y poniendo el fondo del color correspondiente

    const activeStringIndexes = selectedStrings
      .map((isSelected, index) => (isSelected ? index : -1))
      .filter((index) => index !== -1);
    const selectedNotes = activeStringIndexes
      .map((stringIndex) => {
        const fret = selectedFrets[stringIndex];
        if (fret === 'x') return null;

        const noteIndex = getNoteIndex(stringIndex, fret);
        const octave = getNoteOctave(stringIndex, fret);
        return { noteIndex, octave, pitch: octave * 12 + noteIndex };
      })
      .filter((note): note is NonNullable<typeof note> => note !== null);
    const lead_tone = selectedNotes.reduce<(typeof selectedNotes)[number] | null>(
      (highest, note) => (highest === null || note.pitch > highest.pitch ? note : highest),
      null
    );

    let cancelled = false;
    if (activeStringIndexes.length === 0 || lead_tone === null) {
      return () => {
        cancelled = true;
      };
    }

    /**
     * Consulta los acordes y agrupa los que coinciden con todos los trastes de las cuerdas activas.
     * @precondition Hay al menos una cuerda activa con traste seleccionado y `lead_tone` ya está calculada.
     * @postcondition Publica resultados agrupados o un mensaje de error, salvo que el efecto haya sido cancelado.
     */
    const loadMatchingChords = async () => {
      try {
        const chords = await db.globalChords.toArray();
        const matchingChords = chords.filter((chord) =>
          activeStringIndexes.every(
            (stringIndex) => chord.figura[stringIndex] === selectedFrets[stringIndex]
          )
        );
        const scale = accidentals === 'flats' ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
        const categorizedChords: FinderChord[] = matchingChords.map((chord) => ({
          chord,
          name: `${scale[chord.rootIndex]}${chord.extension}`,
          leadFunction: getLeadFunction(chord, lead_tone.noteIndex),
          color: getChordColor(chord),
        }));
        const groupedResults = categorizedChords.reduce<FinderResults>(
          (groups, chord) => {
            groups[chord.leadFunction].push(chord);
            return groups;
          },
          { Root: [], Third: [], Fifth: [], Other: [] }
        );

        if (!cancelled) {
          setFinderError(null);
            setResults(groupedResults);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setFinderError('No se pudieron cargar los acordes guardados.');
          setIsLoading(false);
        }
        console.error('Error al buscar acordes en IndexedDB:', error);
      }
    };

    void loadMatchingChords();

    return () => {
      cancelled = true;
    };
  }, [selectedFrets, selectedStrings, accidentals]);

  const hasResults = Object.values(results).some((chords) => chords.length > 0);

  return (
    <section className="finder-page">
      <div className="finder-layout">
        <div className="finder-string-buttons" aria-label="Seleccionar cuerdas para el filtro">
          <span aria-hidden="true" />
          {BASE_NOTES.map((note, stringIndex) => {
            const isActive = selectedStrings[stringIndex];
            return (
              <button
                key={stringIndex}
                type="button"
                aria-pressed={isActive}
                aria-label={`Cuerda ${stringIndex + 1} (${note})`}
                className={`finder-string-button${isActive ? ' is-active' : ''}`}
                onClick={() => handleStringToggle(stringIndex)}
              />
            );
          })}
        </div>
        <div className="finder-column">
          <div className="finder-fretboard" aria-label="Diapasón vertical editable">
            <Fretboard
              selectedFrets={selectedFrets}
              onFretClick={handleFretClick}
              accidentals={accidentals}
              rootIndex={0}
              colorful={false}
              totalFrets={17}
              orientation="vertical"
            />
          </div>
        </div>


        <div className="finder-table">
          <div className="finder-results-grid" aria-label="Acordes agrupados por nota más aguda">
            {(['Root', 'Third', 'Fifth', 'Other'] as const).map((leadFunction) => (
              <section className="finder-result-column" key={leadFunction}>
                <h3>{leadFunction}</h3>
                <div className="finder-result-list">
                  {results[leadFunction].map(({ chord, name, color }) => (
                    <article
                      className={`finder-chord-card finder-chord-card--${color}`}
                      key={chord.id}
                    >
                      <strong>{name}</strong>
                      <MiniFretboard rootIndex={chord.rootIndex} figura={chord.figura} />
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {!isLoading && !finderError && !hasResults && (
              <p className="finder-results-empty">
                {selectedStrings.some(Boolean)
                  ? `No hay acordes coincidentes${selectedFrets.some((fret, index) => selectedStrings[index] && fret !== 'x') ? '' : ': selecciona al menos un traste en una cuerda activa'}.`
                  : 'Selecciona al menos una cuerda para filtrar los acordes.'}
              </p>
            )}
            {isLoading && <p className="finder-results-empty">Buscando acordes...</p>}
            {finderError && <p className="finder-results-empty">{finderError}</p>}
          </div>
          <div className="finder-type-legend" aria-label="Colores por tipo de acorde">
              <span className="finder-type-legend-item">
                <span className="finder-type-color finder-type-color--major" aria-hidden="true" />
                Major
              </span>
              <span className="finder-type-legend-item">
                <span className="finder-type-color finder-type-color--minor" aria-hidden="true" />
                Minor
              </span>
              <span className="finder-type-legend-item">
                <span className="finder-type-color finder-type-color--suspended" aria-hidden="true" />
                Suspended
              </span>
              <span className="finder-type-legend-item">
                <span className="finder-type-color finder-type-color--diminished" aria-hidden="true" />
                Diminished
              </span>
              <span className="finder-type-legend-item">
                <span className="finder-type-color finder-type-color--augmented" aria-hidden="true" />
                Augmented
              </span>
            </div>
        </div>



      </div>
    </section>
  );
};
