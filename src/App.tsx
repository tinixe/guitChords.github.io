import { useState, useEffect } from 'react';
import { Builder } from './components/Pages/Builder';
import { Navigation } from './components/Navigation';
import { MenuSettings } from './components/Pages/MenuSettings';

import type { AccidentalsPreference } from './components/Pages/MenuSettings';
import type { TabType } from './components/Navigation';
import { Trainer } from './components/Pages/Trainer';
import { HarmonicPath } from './components/Pages/HarmonicPath';
import type { ExerciseMode } from './components/Config';
import { CircleHelp } from 'lucide-react';
import { ChordLibrary } from './components/Pages/ChordLibrary';
// Persistencia
const NAVIGATION_STORAGE_KEY = 'active_tab_v1';

export const App = () => {
  const [accidentals, setAccidentals] = useState<AccidentalsPreference>('sharps');
  const [colorful, setColorful] = useState<boolean>(true);
  const [strumSpeed, setStrumSpeed] = useState<number>(100);
  const [scalesBpm, setScalesBpm] = useState(72);
  const [scalesMetronomeEnabled, setScalesMetronomeEnabled] = useState(true);
  const [scalesAutoTempo, setScalesAutoTempo] = useState(false);
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('common-tones');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem(NAVIGATION_STORAGE_KEY);
      return (saved as TabType) || 'builder';
    } catch { return 'builder'; }
  })

  useEffect(() => {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, activeTab);
  }, [activeTab]);


  return (
    <div className="app-shell min-h-screen bg-[#f3f7fb] text-slate-900">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <button
        type="button"
        aria-label="Ayuda"
        title="Ayuda"
        className="fixed right-4 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 shadow-sm transition-colors hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 sm:right-6 sm:top-4"
      >
        <CircleHelp size={21} aria-hidden="true" />
      </button>

      <main className="app-main h-full">
        {activeTab === 'builder' && <Builder accidentals={accidentals} colorful={colorful} onOpenSettings={() => setIsSettingsOpen(true)} strumSpeed={strumSpeed} />}
        {activeTab === 'trainer' && <Trainer accidentals={accidentals} colorful={colorful} exerciseMode={exerciseMode} strumSpeed={strumSpeed} onOpenSettings={() => setIsSettingsOpen(true)} />}
        {activeTab === 'harmonic-path' && <HarmonicPath accidentals={accidentals} colorful={colorful} exerciseMode={exerciseMode} onOpenSettings={() => setIsSettingsOpen(true)} />}
        {activeTab === 'library' && <ChordLibrary accidentals={accidentals}/>}
      </main>

      <MenuSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        strumSpeedMs={strumSpeed}
        setStrumSpeed={setStrumSpeed}
        accidentals={accidentals}
        setAccidentals={setAccidentals}
        colorful={colorful}
        setColorful={setColorful}
        exerciseMode={exerciseMode}
        setExerciseMode={setExerciseMode}
        scalesBpm={scalesBpm}
        setScalesBpm={setScalesBpm}
        scalesMetronomeEnabled={scalesMetronomeEnabled}
        setScalesMetronomeEnabled={setScalesMetronomeEnabled}
        scalesAutoTempo={scalesAutoTempo}
        setScalesAutoTempo={setScalesAutoTempo}
      />
    </div>
  );
}

export default App;