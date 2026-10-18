import { useState } from 'react';
import type { FC } from 'react';
import { Guitar, Menu, X } from 'lucide-react';

// (D)rop (Voicings), (A)ll (C)hords
export type TabType = 'builder' | 'trainer' | 'harmonic-path' | 'library';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navigation: FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tabs: { id: TabType; label: string }[] = [
    { id: 'builder', label: 'Builder' },
    { id: 'trainer', label: 'Trainer' },
    { id: 'harmonic-path', label: 'Harmonic Path' },
    { id: 'library', label: 'Chord Library' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[68px] border-b border-white/[0.08] bg-[#090d14]/95 text-white shadow-[0_8px_28px_rgba(5,10,20,0.16)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-full max-w-[1440px] items-center px-4 sm:px-6">
        <button
          type="button"
          aria-label={isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          aria-expanded={isOpen}
          aria-controls="navigation-menu"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          {isOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400 text-[#07111f] shadow-[0_0_24px_rgba(56,189,248,0.24)]">
            <Guitar size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white sm:text-xl">GuitChords</span>
        </div>

        {isOpen && (
          <nav
            id="navigation-menu"
            aria-label="Navegación principal"
            className="absolute left-4 top-[60px] min-w-56 rounded-2xl border border-white/10 bg-[#101722]/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl sm:left-6"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsOpen(false);
                  }}
                  className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-400/10 font-semibold text-sky-300'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};