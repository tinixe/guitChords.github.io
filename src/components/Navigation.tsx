import { useState } from 'react';
import type { FC, MouseEvent } from 'react';
import { Guitar, Menu, X } from 'lucide-react';

// (D)rop (Voicings), (A)ll (C)hords
export type TabType = 'builder' | 'trainer' | 'harmonic-path' | 'library' | 'finder';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

/**
 * Renderiza la barra de navegación y el menú desplegable de secciones.
 * Mantiene localmente si el menú está abierto y comunica la selección al componente padre.
 * @precondition `activeTab` corresponde a una pestaña válida y `setActiveTab` acepta un `TabType`.
 * @postcondition Devuelve la navegación correspondiente al estado actual; al seleccionar una pestaña la comunica y cierra el menú.
 */
export const Navigation: FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tabs: { id: TabType; label: string }[] = [
    { id: 'builder', label: 'Builder' },
    { id: 'trainer', label: 'Trainer' },
    { id: 'finder', label: 'Finder' },
    { id: 'harmonic-path', label: 'Harmonic Path' },
    { id: 'library', label: 'Chord Library' },

  ];

  /**
   * Invierte el estado de apertura del menú conservando la actualización funcional
   * para evitar depender de un valor capturado por un render anterior.
   * @precondition React mantiene activo el estado local de este componente.
   * @postcondition El menú queda abierto si estaba cerrado y cerrado si estaba abierto.
   */
  const handleMenuToggle = () => setIsOpen((open) => !open);

  /**
   * Activa la pestaña elegida y cierra el menú de navegación.
   * @precondition El botón actual contiene en `data-tab` un identificador válido de `TabType`.
   * @postcondition Invoca `setActiveTab` con ese identificador y deja `isOpen` en `false`.
   */
  const handleTabSelection = (event: MouseEvent<HTMLButtonElement>) => {
    const tab = event.currentTarget.dataset.tab as TabType;
    setActiveTab(tab);
    setIsOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[68px] border-b border-white/[0.08] bg-[#090d14]/95 text-white shadow-[0_8px_28px_rgba(5,10,20,0.16)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-full max-w-[1440px] items-center px-4 sm:px-6">
        <button
          type="button"
          aria-label={isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          aria-expanded={isOpen}
          aria-controls="navigation-menu"
          onClick={handleMenuToggle}
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
                  data-tab={tab.id}
                  onClick={handleTabSelection}
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