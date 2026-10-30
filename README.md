# GuitChords

GuitChords es una aplicación web para explorar, construir, guardar y practicar
acordes de guitarra. La interfaz se ejecuta en el navegador; React y TypeScript
gestionan las páginas y el estado, Vite sirve y empaqueta el proyecto, y Dexie
guarda los acordes en IndexedDB.

## Requisitos

- Node.js compatible con Vite 8.
- npm.

## Desarrollo

```bash
npm ci
npm run dev
```

Otros comandos disponibles:

```bash
npm run build    # Comprobación TypeScript y compilación de producción
npm run lint     # Análisis estático con Oxlint
npm run preview  # Sirve localmente la compilación de producción
```

## Organización

```text
.
├── public/
│   ├── favicon.svg                # Icono de la pestaña (referenciado por index.html)
│   └── icons.svg                  # Recurso SVG estático
├── src/
│   ├── App.tsx                   # Estado global, navegación entre páginas y tema
│   ├── App.css                   # Estilos residuales del template inicial de Vite
│   ├── index.css                 # Estilos globales y estilos de la aplicación
│   ├── main.tsx                  # Punto de entrada; monta React en #root
│   ├── assets/                   # hero.png, react.svg y vite.svg
│   └── components/
│       ├── Config.tsx            # Afinación base, notas cromáticas y tipos compartidos
│       ├── Database.tsx          # Esquema IndexedDB, persistencia y metadatos de acordes
│       ├── Navigation.tsx        # Selector de página
│       ├── Pages/
│       │   ├── Builder.tsx       # Constructor de acordes
│       │   ├── ChordLibrary.tsx  # Biblioteca, búsqueda y filtros
│       │   ├── Finder.tsx        # Buscador mediante cuerdas y trastes
│       │   ├── HarmonicPath.tsx  # Exploración de progresiones y voces
│       │   ├── MenuSettings.tsx  # Preferencias musicales y de práctica
│       │   └── Trainer.tsx       # Ejercicios de práctica
│       └── utils/
│           ├── AuxFunctions.tsx  # Cálculos musicales y nomenclatura
│           ├── Fretboard.tsx     # Diapasón interactivo/estático
│           ├── miniFretboard.tsx # Diagramas compactos
│           └── SoundLogic.tsx    # Reproducción de acordes
├── index.html                    # Documento HTML que contiene el nodo #root
├── package.json                  # Dependencias y comandos npm
├── package-lock.json             # Versiones exactas de dependencias
├── vite.config.ts                # Plugins y configuración del servidor/build de Vite
├── tailwind.config.js            # Configuración de Tailwind
├── tsconfig.json                 # Configuración TypeScript base
├── tsconfig.app.json             # Opciones TypeScript para la aplicación
├── tsconfig.node.json            # Opciones TypeScript para configuración/herramientas
├── .oxlintrc.json                # Configuración de Oxlint
└── .gitignore                    # Archivos y directorios excluidos de Git
```

## Páginas

- **Builder** (`src/components/Pages/Builder.tsx`): permite seleccionar notas en
  el diapasón para construir un acorde, ajustar su raíz y bajo, mostrar su
  nombre, escucharlo y guardarlo. También contempla acordes personalizados y
  posiciones móviles.
- **Trainer** (`src/components/Pages/Trainer.tsx`): genera ejercicios de
  reconocimiento/práctica usando los acordes guardados y filtros de ejercicio;
  gestiona la reproducción y el avance del ejercicio.
- **Finder** (`src/components/Pages/Finder.tsx`): busca acordes guardados que
  coinciden con las cuerdas y trastes seleccionados. Agrupa los resultados
  según la función de la nota más aguda y muestra diagramas y colores por
  calidad de acorde.
- **Harmonic Path** (`src/components/Pages/HarmonicPath.tsx`): explora
  progresiones y movimientos de voces, con controles de modo de ejercicio,
  tempo y reproducción.
- **Chord Library** (`src/components/Pages/ChordLibrary.tsx`): consulta los
  acordes almacenados, busca por nombre, filtra por etiquetas y permite
  administrar favoritos y acordes personalizados.
- **Menu Settings** (`src/components/Pages/MenuSettings.tsx`): panel compartido
  para preferencias musicales y de práctica, como alteraciones, colores,
  velocidad y modo/tempo de ejercicio.

## Módulos compartidos

- `src/components/Database.tsx` define `FlashChordsDB`, con las tablas
  `globalChords` y `customChords`, además de las operaciones para guardar y
  recuperar acordes, nombres, favoritos y etiquetas.
- `src/components/Config.tsx` define la afinación estándar de seis cuerdas
  (de 6.ª a 1.ª), sus octavas, las escalas cromáticas y los tipos compartidos
  usados por los selectores.
- `src/components/utils/AuxFunctions.tsx` reúne cálculos de nota, octava,
  intervalos, nombres/etiquetas de acordes y lógica musical reutilizada por las
  páginas.
- `src/components/utils/Fretboard.tsx` renderiza el diapasón interactivo o de
  solo lectura, en orientación horizontal o vertical.
- `src/components/utils/miniFretboard.tsx` dibuja una figura de acorde
  compacta para tarjetas y listados.
- `src/components/utils/SoundLogic.tsx` reproduce acordes usando muestras de
  guitarra y Web Audio API.
- `src/components/Navigation.tsx` presenta las páginas disponibles y comunica
  el cambio de página a `App`.
- `src/App.tsx` mantiene las preferencias y el estado de navegación compartido.
  La página activa y el tema se conservan en `localStorage` cuando está
  disponible.

## Persistencia y datos

- Los acordes globales y nombres personalizados se almacenan en IndexedDB a
  través de Dexie.
- La página actual y el tema visual se guardan en `localStorage`.
- La Biblioteca conserva su búsqueda/filtros localmente según su implementación.
- Los datos permanecen en el almacenamiento local del navegador; no se
  configura un servicio de usuario o sincronización remota en este proyecto.

## Recursos y estilos

- `src/index.css` contiene los estilos globales, de páginas y de los
  componentes compartidos.
- `src/App.css` conserva estilos del template inicial de Vite.
- `src/assets/hero.png`, `src/assets/react.svg` y `src/assets/vite.svg` son
  recursos de origen disponibles para importar desde el código.
- `public/` sirve recursos estáticos directamente desde la raíz de la web.
- `index.html` define el idioma, metadatos y elemento raíz.
- `vite.config.ts`, `tailwind.config.js` y `tsconfig*.json` configuran la
  compilación, los estilos y el análisis de TypeScript.
- `.oxlintrc.json` configura el linter; `.gitignore` excluye dependencias,
  artefactos generados y archivos locales.

## Notas de desarrollo

`FutureWork` contiene ideas pendientes de trabajo y está incluido en
`.gitignore` intencionadamente: el archivo queda local y no se añade a los
cambios versionados. Las dependencias se gestionan con npm; al modificar
`package.json`, actualiza también `package-lock.json`.
