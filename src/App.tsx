import { useState, useEffect } from 'react';
import { Builder } from './components/Pages/Builder';
import { Navigation } from './components/Navigation';
import { MenuSettings } from './components/Pages/MenuSettings';

import type { AccidentalsPreference } from './components/Pages/MenuSettings';
import type { TabType } from './components/Navigation';
import { Trainer } from './components/Pages/Trainer';
import { HarmonicPath } from './components/Pages/HarmonicPath';
import type { ExerciseMode } from './components/Config';
import { CircleHelp, Moon, Sun } from 'lucide-react';
import { ChordLibrary } from './components/Pages/ChordLibrary';
import { Finder } from './components/Pages/Finder';
// Persistencia
const NAVIGATION_STORAGE_KEY = 'active_tab_v1';
const THEME_STORAGE_KEY = 'color_theme_v1';

export const App = () => {
  const [accidentals, setAccidentals] = useState<AccidentalsPreference>('sharps');
  const [colorful, setColorful] = useState<boolean>(true);
  const [strumSpeed, setStrumSpeed] = useState<number>(100);
  const [tempoBpm, setTempoBpm] = useState(72);
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('common-tones');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'day' | 'night'>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'night' ? 'night' : 'day';
    } catch (error) {
      console.error('Error cargando el tema visual:', error);
      return 'day';
    }
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem(NAVIGATION_STORAGE_KEY);
      return saved === 'trainer' || saved === 'harmonic-path' || saved === 'library' || saved === 'finder'
        ? saved
        : 'builder';
    } catch { return 'builder'; }
  })

  useEffect(() => {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Error guardando el tema visual:', error);
    }
  }, [theme]);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'day' ? 'night' : 'day';
    const root = document.documentElement;
    root.dataset.themeTransitioning = 'true';
    root.dataset.theme = nextTheme;
    setTheme(nextTheme);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        delete root.dataset.themeTransitioning;
      });
    });
  };


  return (
    <div className="app-shell min-h-screen bg-[#f3f7fb] text-slate-900">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="fixed right-4 top-3 z-50 flex items-center gap-2 sm:right-6">
        <button
          type="button"
          aria-label={theme === 'day' ? 'Activar modo noche' : 'Activar modo día'}
          aria-pressed={theme === 'night'}
          title={theme === 'day' ? 'Activar modo noche' : 'Activar modo día'}
          onClick={handleThemeToggle}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 shadow-sm transition-colors hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          {theme === 'day'
            ? <Moon size={20} aria-hidden="true" />
            : <Sun size={20} aria-hidden="true" />}
        </button>
        <button
          type="button"
          aria-label="Ayuda"
          title="Ayuda"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 shadow-sm transition-colors hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <CircleHelp size={21} aria-hidden="true" />
        </button>
      </div>

      <main className="app-main h-full">
        {activeTab === 'builder' && <Builder accidentals={accidentals} colorful={colorful} onOpenSettings={() => setIsSettingsOpen(true)} strumSpeed={strumSpeed} />}
        {activeTab === 'trainer' && <Trainer accidentals={accidentals} colorful={colorful} exerciseMode={exerciseMode} strumSpeed={strumSpeed} tempoBpm={tempoBpm} onOpenSettings={() => setIsSettingsOpen(true)} />}
        {activeTab === 'harmonic-path' && <HarmonicPath accidentals={accidentals} colorful={colorful} exerciseMode={exerciseMode} tempoBpm={tempoBpm} onOpenSettings={() => setIsSettingsOpen(true)} />}
        {activeTab === 'library' && <ChordLibrary accidentals={accidentals}/>}
        {activeTab === 'finder' && <Finder accidentals={accidentals} />}
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
        tempoBpm={tempoBpm}
        setTempoBpm={setTempoBpm}
      />
    </div>
  );
}

export default App;