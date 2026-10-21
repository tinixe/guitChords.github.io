import type { FC } from 'react';
import { useState } from 'react';
import { Fretboard } from '../utils/Fretboard';
import type { AccidentalsPreference } from './MenuSettings';

interface FinderProps {
  accidentals: AccidentalsPreference;
}

export const Finder: FC<FinderProps> = ({ accidentals }) => {
  const [selectedFrets, setSelectedFrets] = useState<(number | 'x')[]>(
    Array.from({ length: 6 }, () => 'x')
  );

  const handleFretClick = (stringIndex: number, fretNumber: number) => {
    setSelectedFrets((currentFrets) =>
      currentFrets.map((fret, index) =>
        index === stringIndex ? (fret === fretNumber ? 'x' : fretNumber) : fret
      )
    );
  };

  return (
    <section className="finder-page">
      <div className="finder-layout">
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
        <div className="finder-empty-space" aria-hidden="true" />
      </div>
    </section>
  );
};
