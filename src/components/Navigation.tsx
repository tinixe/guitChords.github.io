import React from 'react';

// (D)rop (Voicings), (A)ll (C)hords
export type TabType = 'builder' | 'trainer' | 'harmonic-path' | 'scales'; 

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'builder', label: 'Builder' },
    { id: 'trainer', label: 'Trainer' },
    { id: 'harmonic-path', label: 'Harmonic Path' }
  ];

  return (
    <header className="absolute top-4 left-0 right-0 z-40 flex justify-center items-center pointer-events-none scale-[0.85] px-4">
      {/* Contenedor Exterior (Doble Borde Ovalado) */}
      <div className="pointer-events-auto bg-white/80 backdrop-blur-md p-1 rounded-full border-2 border-zinc-200/80 shadow-sm">
        {/* Contenedor Interior del Selector */}
        <nav className="flex items-center bg-[#b8d8dd] rounded-full p-1 relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 px-6 py-2.5 rounded-full text-base font-medium transition-all duration-300 ease-in-out cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#e0f8ff] text-zinc-900 shadow-md scale-100 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-800 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};