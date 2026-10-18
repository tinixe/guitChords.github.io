import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Trash2, ChevronDown, Star } from 'lucide-react';
import { db, CATEGORIES, deleteCustomChordName, setChordFavorite } from '../Database';
import { MiniFretboard } from '../utils/miniFretboard';
import { CHROMATIC_FLATS, CHROMATIC_SHARPS } from '../Config';
import type { GlobalChord } from '../Database';

const PAGE_SIZE = 8;
const LIBRARY_STORAGE_KEY = 'chord_library_state_v1';

interface ChordLibraryProps {
  accidentals?: 'sharps' | 'flats';
}

export const ChordLibrary: React.FC<ChordLibraryProps> = ({ accidentals = 'sharps' }) => {

  // Inicializador para la Biblioteca
  const getInitialLibraryState = () => {
    try {
      const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { searchTerm: '', selectedTags: [] };
  };

  const initLibState = getInitialLibraryState();

  // Cargamos el estado persistido
  const [searchTerm, setSearchTerm] = useState(initLibState.searchTerm);
  const [selectedTags, setSelectedTags] = useState<string[]>(initLibState.selectedTags);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  
  const SCALE = accidentals === 'sharps' ? CHROMATIC_SHARPS : CHROMATIC_FLATS;
  
  // Persiste cambios en filtros y búsqueda
  useEffect(() => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify({
      searchTerm, selectedTags
    }));
  }, [searchTerm, selectedTags]);


  // Activar una etiqueta en la biblioteca
  const toggleTag = (category: string) => {
    setSelectedTags(prev =>
      prev.includes(category)
        ? prev.filter(t => t !== category)
        : [...prev, category]
    )
  }

  // Consulta en vivo a IndexedDB mediante Dexie
  const chords = useLiveQuery(async () => {
      let results = await db.globalChords.toArray();
    
      if (selectedTags.length > 0) {
        results = results.filter(chord => 
            selectedTags.every(tag => chord.tags?.includes(tag))
        );
      }
      
      const term = searchTerm.trim();
      if (!term) return results;
      return results.filter(chord => {
        const rootIdx = chord.rootIndex ?? 0;
        const bassIdx = chord.bassIndex ?? rootIdx;
        const ext = (chord.extension || '').toLowerCase();
        
        /*  --- PARSER de term --- */
        // Root: primera nota (A-G) + # o b (opcionales)
        const startsWithNote = /^[a-g]/i.test(term);
        const termRoot = startsWithNote ? 
            term[0].toUpperCase() + // Primera nota
            ((term.length > 1 && (term[1] === '#' || term[1] === 'b')) ? // Tiene # o b ?
            term[1] // Accidental
            : '')   // Sin accidental
          : '';     // Sin nota

        // Bass: lo que va después del simbolo /
        const slashIdx = term.indexOf('/');
        const hasSlash = term.includes('/');
        const termBass = hasSlash ? 
            term.slice(slashIdx+1, term.length).toUpperCase() 
            : '';

        // Extensión: Todo lo que queda entre Root y /
        const termExt = term.slice(termRoot.length, hasSlash ? slashIdx : term.length).toLowerCase(); 

        // Búsqueda de indices en ambas escalas
        const findIndexInScales = (note: string) => {
          if (!note) return -1;
          const idxS = CHROMATIC_SHARPS.indexOf(note);
          return idxS !== -1 ? idxS : CHROMATIC_FLATS.indexOf(note);
        }
        
        const termRootIdx = findIndexInScales(termRoot);
        const termBassIdx = findIndexInScales(termBass);

        const matchesRoot = termRoot ? termRootIdx === rootIdx : true;
        
        // Si busca /X, exigir que la nota pedal coincida Y que sea una inversión real (bassIdx !== rootIdx)
        const matchesBass = hasSlash 
          ? ((termBassIdx === bassIdx && bassIdx !== rootIdx) || (termBassIdx === -1 && bassIdx !== -1))
          : true;

        // Si busca extensión, usar includes para ser flexible (ej: "maj7" coincide con "maj7")
        const matchesExt = termExt ? ext.includes(termExt) : true;

        return matchesRoot && matchesBass && matchesExt;
     });
  }, [searchTerm, selectedTags]);

  // Borrar un acorde desde la biblioteca
  const handleDeleteChord = async (
    e: React.MouseEvent,
    chord: GlobalChord
  ) => {
    e.stopPropagation(); // Previene otros eventos de la tarjeta si los hubiera
    
    try { 
      await db.globalChords.delete(chord.id); 
      deleteCustomChordName(chord.figura)
    } 
    catch (error) { console.error('Error al eliminar el acorde:', error); }
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    chord: GlobalChord
  ) => {
    e.stopPropagation();

    try {
      await setChordFavorite(chord.id, !chord.isFavorite);
    } catch (error) {
      console.error('Error al actualizar el favorito:', error);
    }
  };

  // PAGINACION: Filtramos los primeros PAGE_SIZE
  const visibleChords = chords?.slice(0, visibleCount) ?? [];
  const hasMore = (chords?.length ?? 0) > visibleCount;


  return (
    <section className="w-full bg-zinc-200 py-25 px-6 border-t border-zinc-300 min-h-[660px]">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
        
        {/* Título de la Sección */}
        <h2 className="text-3xl md:text-4xl font-serif text-zinc-900 tracking-wide text-center">
          Biblioteca de acordes
        </h2>

        {/* Barra de Búsqueda */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o tónica (ej: Cmaj7, F#)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-zinc-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 text-sm"
          />
        </div>

        {/* Filtros de Tipos de Acordes */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
          {CATEGORIES.map((category) => {
            const isActive = selectedTags.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleTag(category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                  isActive 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Cuadrícula de Acordes Guardados */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {visibleChords && visibleChords.length > 0 ? (
            visibleChords.map((chord) => (
              <div 
                key={chord.id} 
                className="relative group flex flex-col gap-2 p-4 bg-zinc-100 rounded-2xl border border-zinc-300/80 shadow-sm hover:shadow-md transition-shadow"
                >
                {/* Botón de Borrado */}
                <button
                  onClick={(e) => handleDeleteChord(e, chord)}
                  className="absolute top-3 right-3 w-7 h-7 bg-white/80 hover:bg-rose-500 text-zinc-500 hover:text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 z-10"
                  title="Eliminar acorde"
                >
                  <Trash2 className='w-3.5 h-3.5'/>
                </button>

                {/* Botón de Favorito */}
                <button
                  onClick={(e) => handleToggleFavorite(e, chord)}
                  className={`absolute top-3 right-12 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 z-10 ${
                    chord.isFavorite
                      ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                      : 'bg-white/80 text-amber-400 hover:bg-amber-100 hover:text-amber-500'
                  }`}
                  title={chord.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                >
                  <Star className="w-3.5 h-3.5" fill={chord.isFavorite ? 'currentColor' : 'none'} />
                </button>

                {/* Nombre del Acorde */}
                <h3 className="text-xl font-serif font-bold text-zinc-800 px-1 truncate">
                  {`${SCALE[chord.rootIndex]}${chord.extension}${chord.rootIndex === chord.bassIndex ? '' : '/' + SCALE[chord.bassIndex]}`}
                </h3>

                {/* Diagrama Adaptativo */}
                <MiniFretboard rootIndex={chord.rootIndex} figura={chord.figura} />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-zinc-500 font-sans">
              No se encontraron acordes en la biblioteca.
            </div>
          )}
        </div>
        {hasMore && (
          <button
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-zinc-300 text-zinc-800 font-medium text-sm rounded-full shadow-sm hover:bg-zinc-100 transition-all active:scale-95"
          >
            Cargar más acordes
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          </button>
        )}
      </div>
    </section>
  );
};