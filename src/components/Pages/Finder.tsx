import type { FC } from 'react';
import { useState } from 'react';
import { BASE_NOTES } from '../Config';
import { Fretboard } from '../utils/Fretboard';
import type { AccidentalsPreference } from './MenuSettings';

interface FinderProps {
  accidentals: AccidentalsPreference;
}

export const Finder: FC<FinderProps> = ({ accidentals }) => {
  const [selectedFrets, setSelectedFrets] = useState<(number | 'x')[]>(
    Array.from({ length: 6 }, () => 'x')
  );
  
  const [selectedStrings, setSelectedStrings] = useState<(Boolean)[]>(
    Array.from({ length: 6 }, () => false)
  )

  const handleFretClick = (stringIndex: number, fretNumber: number) => {
    setSelectedFrets((currentFrets) =>
      currentFrets.map((fret, index) =>
        index === stringIndex ? (fret === fretNumber ? 'x' : fretNumber) : fret
      )
    );
  };

  const handleStringToggle = (stringIndex: number) => {
    setSelectedStrings(selectedStrings.map((isOn, index) => stringIndex === index ? !isOn : isOn));
  };

  return (
    <section className="finder-page">
      <div className="finder-layout">
        <div className="finder-string-buttons" aria-label="Activar o silenciar cuerdas">
          <span aria-hidden="true" />
          {BASE_NOTES.map((note, stringIndex) => {
            const isActive = selectedFrets[stringIndex] !== 'x';
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
            <section className="finder-result-column">
              <h3>Root</h3>
            </section>
            <section className="finder-result-column">
              <h3>Third</h3>
            </section>
            <section className="finder-result-column">
              <h3>Fifth</h3>
            </section>
            <section className="finder-result-column">
              <h3>Other</h3>
            </section>
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
