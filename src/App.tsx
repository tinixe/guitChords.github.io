import { useState, useEffect } from 'react';
import { Builder } from './components/Pages/Builder';
import { Navigation } from './components/Navigation';
import { MenuSettings } from './components/Pages/MenuSettings';

import type { AccidentalsPreference } from './components/Pages/MenuSettings';
import type { TabType } from './components/Navigation';
import { Trainer } from './components/Pages/Trainer';
import { HarmonicPath } from './components/Pages/HarmonicPath';
import type { ExerciseMode } from './components/Config';
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
    <div className="min-h-screen bg-white">
      {/* Selector Superior Fijo */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
   
      {/* Contenido Dinámico de la Página (con margen superior para no solaparse con el Navbar) */}
      <main className="h-full">
        {activeTab === 'builder' && <Builder accidentals={accidentals} colorful={colorful} onOpenSettings={() => setIsSettingsOpen(true)} strumSpeed={strumSpeed} />}
        {activeTab === 'trainer' && <Trainer accidentals={accidentals} colorful={colorful} exerciseMode={exerciseMode} strumSpeed={strumSpeed} onOpenSettings={() => setIsSettingsOpen(true)} />}
        {activeTab === 'harmonic-path' && <HarmonicPath accidentals={accidentals} colorful={colorful} exerciseMode={exerciseMode} onOpenSettings={() => setIsSettingsOpen(true)} />}
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