# La revisión de septiembre de 2026

Una revisión de **todo el proyecto de cabo a rabo**, encargada así:

> «Ahora es el momento de lanzar un batallón (…) y que revisen todo, de cabo a
> rabo, desde el diseño Blender de los objetos, los cuadros de mandos, las
> rutas, las etiquetas, el diseño de los vuelos, el diseño del juego, los
> aeropuertos, los paisajes, las misiones, las voces e instrucciones, TODO. (…)
> quiero nuevas ideas, mejorar las que están, que el juego funcione, que se
> detecten errores de todo tipo, que se agreguen mejoras.»

## Cómo se hizo, y qué vale y qué no

Veintiséis frentes en paralelo, uno por dominio, cada uno leyendo el código de
verdad —corriendo pruebas, midiendo con los bancos, abriendo los `.glb`, leyendo
los issues— y devolviendo hallazgos e ideas por separado. Después, **cada
hallazgo grave pasó por un verificador adversarial**: un segundo lector cuyo
encargo no era confirmarlo sino **tumbarlo**, con la instrucción de refutar ante
la duda.

Eso importa para leer esto:

- **479 hallazgos** en total: 116 graves, 216 medios, 147 leves.
- **139 pasaron por verificación**: 107 se sostuvieron, **32 se cayeron**.
- **403 ideas**, de las que 84 salieron con mucho valor y poco coste.

Los que se cayeron se cayeron por cosas que conviene saber: síntomas reales con
la causa mal señalada, cosas ya arregladas que el revisor no vio, decisiones
deliberadas con su porqué escrito al lado, y alguna opinión disfrazada de fallo.
Este documento recoge **lo que quedó en pie**, y en los hallazgos verificados los
verificadores dejaron además matices que corrigen al primer revisor: están en el
diario del run, junto a los 340 que no cupieron aquí.

**Lo que este informe no es**: no está priorizado por quien manda en el
proyecto, y varios frentes se quedaron sin verificar por límite de cupo — los de
rendimiento, accesibilidad, issues abiertos e issues cerrados llegaron con sus
hallazgos pero sin refutar. Léanse esos con más prudencia que el resto.

## Lo que ya está arreglado

Antes de nada, lo que salió de aquí y ya está hecho. Cada uno con su commit y su
banco:

| qué | dónde |
|---|---|
| Un turbofán no pierde empuje como una hélice — **el JAZ 120 no despegaba en ningún escenario del juego** | `fa3028a` |
| Un 747 giraba como un kart; `ENTRADA_EN_FINAL` existía dos veces con dos valores | `a0ddf5e` |
| Todo lo que tenía que estar de pie estaba tumbado a lo largo del fuselaje | `747c869` |
| Tres comprobaciones **mías** que no podían fallar | `5d3a0a0` |
| Tres aviones sin tono de motor · el pack de voz no llegaba a producción · las nubes no pasaban | `6f73e8c` |
| Si un avión no cabe en la pista, no se ofrece | `c18c902` |
| La torre habla, y por radio | `ba66cc5` |
| El guion del Panambi no corría y nadie se enteraba | `878ef1d` |

## Lo que queda


### Los paneles de información

> He leído los ocho ficheros del frente más su cableado en `game.ts`, `hud.ts`, `fdm.ts`, `scenarios.ts` y `terrain.ts`, he pasado los 75 tests unitarios de paneles/ala/manga/meteo (todos en verde) y he lanzado `scripts/verificar-paneles.mjs`, que hoy revienta antes de medir nada. Estado del frente: l

**Graves**

- **El banco de paneles (y el de acceso) revientan hoy al pulsar el botón de misión escondido**
  - Dónde: `scripts/verificar-paneles.mjs:112 y scripts/verificar-acceso.mjs:667`
  - Arreglo: Que la sonda devuelva también `visible: !boton.hidden` y los bancos salten (con aviso) los que no lo estén; o que el banco cargue una misión (`?mision=…`) para poder medir ese panel también.
- **El viento del panel no sopla: el motor de vuelo no lo conoce**
  - Dónde: `src/flight/fdm.ts:329-331`
  - Arreglo: Restar el vector de viento en `integrate` (velocidad aire = velocidad − viento), con un perfil por altura (fracción en suelo, entero a 100 m) para que el rodaje no se vaya solo.
- **El esquema del ala abre con el JAZ 90 y el JAZ 120 «cayéndose» y nunca llegan a volar**
  - Dónde: `src/ui/pantalla-ala.ts:61-62`
  - Arreglo: Derivar el rango del avión: Vs = sqrt(m·g / (½ρ·S·CLmax)); tirador de 0,9·Vs a 2,5·Vs, abrir en 1,3·Vs y con el alfa que dé exactamente 1× (despejar CL).

**Medias**

- **Arrastrar la flecha del viento rehace el aeródromo, el plan y la senda decenas de veces por segundo**
  - Dónde: `src/ui/tiempo.ts:258-260 y 439-446`
  - Arreglo: En `ponerTiempo` comparar `cabeceraEnUso` antes/después y saltar los rehaceres si no cambió (solo girar la manga, que es una malla con nombre `mangas` y se puede reorientar sola).
- **El mapa rodea de mar a ocho escenarios de interior**
  - Dónde: `src/ui/mapa.ts:469-480 y 433-438`
  - Arreglo: Fuera del escenario, pintar `esc.fill` (o el color de la banda de la cota media del borde) salvo que el escenario declare `mar: true`; si las teselas tienen relieve, consultar su cota.
- **El mapa no dice por qué cabecera se entra, ni dibuja circuito, senda ni ruta de rodaje**
  - Dónde: `src/ui/mapa.ts:592-604 y 198-205`
  - Arreglo: Pasarle al mapa `scenario.runway` ya orientada y pintar una punta de flecha blanca en el umbral por el que se aterriza; el circuito con `verticesDelCircuito` en línea de puntos; la ruta del plan en verde y la senda en amarillo cuando existan.
- **La rosa del viento y el sol no se pueden manejar con teclado ni con mando**
  - Dónde: `src/ui/tiempo.ts:93-96 y 129-132`
  - Arreglo: `tabindex="0"` en los dos SVG y flechas: ←/→ giran 10°, ↑/↓ suben o bajan 2 kt (sol: ←/→ una hora), con `aria-valuetext` («del oeste, 15 nudos»).
- **«El tiempo de ahora mismo» sin proxy borra lo que puso el niño, y tras un METAR los tres cielos quedan mal pulsados**
  - Dónde: `src/game.ts:66 y 3450-3453 y 3508-3514`
  - Arreglo: Esconder `tiempo-real` cuando `PROXY_METEO` es null (la regla de los galones y las gafas: no está, no se enseña) y, si la petición cae al defecto, no aplicarlo.
- **La única explicación del ala es una frase escrita que nadie dice**
  - Dónde: `src/ui/pantalla-ala.ts:158 y 216-217 y 368-374`
  - Arreglo: Inyectar `decir` (como el tutor) y decir la frase al cambiar de estado, con antirrebote de 1,5 s para que arrastrar no tartamudee; sustituir los rótulos por las propias flechas de color (verde arriba, rojo atrás) junto a la cifra, y dejar las cifras como detal.

### Qué avión cabe dónde

> He leído el hangar, `carrera.ts`, el plan de vuelo, `conViento`, las fichas de los seis aviones, los once escenarios con sus ficheros `.aero.json`, las misiones, el circuito escalado y el arranque en final, y he medido con el propio código lo que rueda cada avión y lo que hay en cada campo. El estad

**Graves**

- **El hangar ofrece los seis aviones en los once campos, y el JAZ 120 solo cabe en cuatro**
  - Dónde: `src/ui/hangar.ts:1095-1097 (`AIRCRAFT.map(fichaDeAvion)` sin filtro)`
  - Arreglo: Un veredicto `cabeEn(avion, escenario)` en un fichero nuevo (`src/flight/cabe.ts`) que use `carreraHastaVr` con la pista **disponible** (`pistaTrasLaCalle` + si se puede hacer back-taxi) y lo consulten `fichaDeAvion`, `fichaDeSitio`, `recientes()`, el arranque.

**Medias**

- **El JAZ 120 rueda 3.000 m, el doble que un 747 de verdad, y eso decide mal qué campos se le ofrecen**
  - Dónde: `src/flight/aircraft.ts:640 (`maxThrust: 430000`, T/W 0,17)`
  - Arreglo: Antes de estrenar el filtro, acotar la carrera del 120 por arriba en `carrera.test.ts` (rodadura entre 1.400 y 2.200 m a nivel del mar) y arreglar la causa en el FDM: un `speedFactor` por tipo de motor (`sound.engine === 'turbofan'` → caída mucho más plana) y .
- **`carreraHastaVr` ignora la cota del campo, y el FDM no: un 10-12 % de pista que no se cuenta**
  - Dónde: `src/flight/carrera.ts:33 (`RHO = 1.225` fijo) y :63 (empuje sin densidad)`
  - Arreglo: `carreraHastaVr(a, superficie, { cotaM, pendiente, vientoDeFrente })`: `rho = airDensity(cotaM)`, empuje × `(rho/1.225)^0.7` (la misma ley que `fdm.ts`), integrar desde `−viento` hasta `Vr − viento` en velocidad respecto al suelo, y sumar `g·sin(pendiente)` a .
- **No existe distancia de aterrizaje en ningún sitio, y «caber» es ida y vuelta**
  - Dónde: `src/flight/fdm.ts:682 (`rolling = ROZAMIENTO + 0.28·brakes`, sin reversa)`
  - Arreglo: `carreraDeAterrizaje(a, superficie, condiciones)` en `carrera.ts`, medida contra el FDM igual que la de despegue (una prueba nueva en `prestaciones.test.ts` que frene desde `velocidadDeEntradaEnFinal`).
- **Dos verdades para «pista para entrar y despegar»: la cabecera en uso se elige con la del Pykasu**
  - Dónde: `src/world/aerodrome.ts:1935 (`PARA_ENTRAR_Y_DESPEGAR = 600`) usado en src/world/scenarios.ts:346-352 (`conVien`
  - Arreglo: `conViento(esc, meteo, avion)` y sustituir la constante por `paraEntrarYDespegar(avion)`; retirar `PARA_ENTRAR_Y_DESPEGAR` de `aerodrome.ts` y dejar en `back-taxi.test.ts` `paraEntrarYDespegar(PYKASU)` para que los diez veredictos medidos sigan protegidos.
- **El ancho no existe: un fuselaje ancho de 60 m de envergadura rueda por una calle de hierba de 12 m**
  - Dónde: `data/aerodromes/yvytu.aero.json (pista 900×18 hierba, calles 12 m)`
  - Arreglo: `codigoOACI(avion)` por envergadura en `cabe.ts`, con tabla de ancho mínimo de pista y de calle; el veredicto lo usa.
- **El JAZ 60, cuya lección es «pistas cortas y de tierra», no cabe en la única pista de hierba del juego**
  - Dónde: `docs/matriz.md:31 («Pistas cortas y de tierra: sí, es su lección» para el JAZ 60)`
  - Arreglo: Separar el veto: `puedeDarLaVuelta(avion, pista)` por vía y radio, y resolver el dibujo aparte (en pista estrecha, una sola raya de ida con el bucle al final, sin raya de vuelta).
- **Las misiones se ofrecen a cualquier avión y están hechas para el radio de viraje de una avioneta**
  - Dónde: `src/ui/hangar.ts:1057 (`missionsFor(sitio.id)` sin avión)`
  - Arreglo: Campo `para?: readonly string[]` (ids de avión) en `Mission`, o mejor una regla calculada en `cabe.ts`: una misión vale para un avión si cada radio de aceptación ≥ 0,25·radio de viraje a Vref y la distancia entre puntos ≥ 2 radios.
- **La lección de aterrizar arranca a la misma distancia para todos, aunque el circuito ya se escale**
  - Dónde: `src/game.ts:86 (`APROXIMACION = ENTRADA_EN_FINAL`, 1.800 m, sin escala) y :2747 (`puntoDePista(runway, runway.`
  - Arreglo: `const distancia = APROXIMACION * escalaDeCircuito(this.aircraft.approachSpeed)` en `startPosition()` y en `ALTURA_DE_FINAL` (game.ts:97), y comprobar que ese punto cae dentro del mundo (`scenario.size/2`) — en Yvytu con el 120 queda a 200 m del borde..

### Textos e idiomas

> He leído los tres diccionarios (es-PY 328 claves, en 323, gug 194), `index.ts`, la prueba de i18n (pasa, 7 tests), `flota.ts` y su prueba, los guiones de voz, el pack grabado en `data/voces`, y cómo se usan las claves en HUD, hangar, ajustes, cuaderno, pausa y voz. No hay claves muertas: las 104 que

**Graves**

- **El instructor grabado habla castellano aunque la pantalla esté en inglés o guaraní**
  - Dónde: `src/audio/instructor-grabado.ts:96-115 y src/audio/banco-de-voz.ts:188-197`
  - Arreglo: En `quienLaDice` (o en `cargar`) saltar los manifiestos cuyo `idioma` no sea el activo, salvo los de cabina/torre en inglés que son iguales en todos los idiomas.
- **Los créditos en pantalla nombran «Cessna 172Kr» y el JAZ 20 sigue siendo esa silueta**
  - Dónde: `src/i18n/es-PY.ts:201-202, en.ts:191-192, gug.ts:276-277 (`credits.modelo`)`
  - Arreglo: Escribir `modelos/jaz-20-pykasu.py` con `comun.py` (ala alta, monomotor, tren fijo: es el más sencillo de los seis), regenerar `jaz-20.glb`, retirar el modelo de TonyWony, quitar `credits.modelo` de los tres diccionarios y su fila en CREDITOS.md.

**Medias**

- **El otro avión de la radio saluda al «Óga uno siete dos», el indicativo que el #69 retiró por citar al Cessna**
  - Dónde: `src/i18n/es-PY.ts:236 (`otro.buenosDias`), docs/voces/guion-otro.txt:1, y ya grabado en data/voces/otro/otro.b`
  - Arreglo: Cambiar la frase a algo que no cite el 172 —«Buenos días, JAZ veinte» o, mejor, saludar con el indicativo del piloto compuesto por piezas («Buenos días, Tero Rojo»), que es lo que el #126 prepara— y regrabar `otro.buenosDias` (el LEEME dice que regrabar es bar.
- **El guaraní deja sin traducir justo lo que su propia cabecera declara prioritario**
  - Dónde: `src/i18n/gug.ts:22-27 (la promesa) frente a lo que falta: las 14 `palabra.*`, `vuelo.rotar`, `vuelo.comprometi`
  - Arreglo: Traducir primero las 14 `palabra.*` y los avisos de vuelo (unas 35 claves, todas de una o dos palabras), después pilotos/pausa/ajustes.
- **Errores de sentido en el guaraní que hay que enseñar al hablante nativo (#6)**
  - Dónde: `src/i18n/gug.ts:68 (`percance.coche`), :69 (`percance.edificio`), :124 (`tactil.motor`), :127 (`galon.toma`), `
  - Arreglo: Lista concreta para el revisor del #6 con estas seis primero.
- **Españolismos en el castellano paraguayo: gafas, coche, morro**
  - Dónde: `src/i18n/es-PY.ts:341-344 (`hud.gafas`, `gafas.*`), :368 (`percance.coche`), :33, :63, :149, :150, :270, :273 `
  - Arreglo: «Lentes de sol» / «¡Tus lentes de sol!» / «Lentes puestos»; «Le pasaste por encima al auto»; «Bajá la nariz», «Subir y bajar la nariz».
- **El marco «gratis para la educación paraguaya» es más estrecho de lo que quien encarga quiere**
  - Dónde: `src/i18n/es-PY.ts:175-176 (`credits.educational`), en.ts:181-182, gug.ts:265-267`
  - Arreglo: En el producto (créditos, manifiesto, llms.txt, og) decir lo que se quiere decir: «Gratis, para siempre, para todos» y, si acaso, añadir «y con licencia educativa escrita para el Paraguay».

### La sensación de vuelo

> He leído entero `src/cameras/` (tipos, index, dentro, fuera y sus pruebas), `updateCamera`/`ajustarElAngulo`/`syncAircraftMesh`/`updateBlobShadow` en `game.ts`, el sintetizador de `audio/audio.ts`, el cielo y las nubes de `world/sky.ts`, la superficie de `world/superficie.ts`, y he corrido las prueb

**Graves**

- **La cámara de detrás pega un tirón de 12,7° cada vez que el avión arranca o se para**
  - Dónde: `src/cameras/fuera.ts:119-128`
  - Arreglo: Guardar `mirando` como estado de la vista y llevarlo hacia el deseado con el mismo `1 − exp(−k·dt)` que la posición (k≈4).
- **El traqueteo, el retroceso, el ángulo y el viento están calibrados para el Pykasu y no escalan a los otros cinco aviones**
  - Dónde: `src/cameras/fuera.ts:16-20 (ACCELERATION_LAG, SHAKE_AMPLITUDE, SHAKE_REFERENCE), src/cameras/tipos.ts:74 (FOV_`
  - Arreglo: Pasar por `Contexto` la `rotationSpeed` y la `cruiseSpeed` del avión (ya están en `AircraftConfig`) y expresar las referencias como fracciones: traqueteo saturando en `rotationSpeed`, FOV en `rotationSpeed·1,5`, viento en `cruiseSpeed`.
- **Los tres aviones de turbina no tienen tono de motor: `cylinders: 0` da una frecuencia de encendido de 0 Hz**
  - Dónde: `src/audio/audio.ts:495 (`firing = (rpm / 60) * (spec.cylinders / 2)`), src/flight/aircraft.ts:529-536, 607-614`
  - Arreglo: Mientras llega #62, una receta mínima de turbina en `build()/update()`: para `turbofan`/`turboprop` un tono de pala de fan (`rpm/60 · 20` palas ≈ 3 kHz a régimen, que es el silbido) más el ruido de chorro con el paso bajo que se abre con el gas; y el «buzz-saw.
- **Las nubes van clavadas a la cámara: no pasan nunca**
  - Dónde: `src/world/sky.ts:565-571 (`banco.position.x = cameraPosition.x`
  - Arreglo: Recentrar por baldosas: `banco.position.x = camera.x − (camera.x mod L)` con `L = lado / repeat`, o dejar el banco quieto y desplazar `textura.offset` en `−Δcámara / L`.

**Medias**

- **La cámara de fuera nunca alabea con el avión: el horizonte va siempre a nivel**
  - Dónde: `src/cameras/fuera.ts:128 (`camera.lookAt`) — `camera.up` no se toca en ningún sitio (`grep camera.up src/` → n`
  - Arreglo: Alabear la cámara una fracción del alabeo del avión (30-40 %, suavizado con el mismo `1 − exp`), poniendo `camera.up` al vector arriba del avión mezclado con (0,1,0), y cero con movimiento reducido.
- **La cabina y la vista de pájaro no traquetean nunca: ruedan por un campo como por un cristal**
  - Dónde: `src/cameras/dentro.ts:30-52`
  - Arreglo: Un pequeño bote vertical y de balanceo en ejes cuerpo (2-4 cm, 0,3° de alabeo), con las mismas tres senos y el mismo `shake` que `fuera.ts` (sacar `traquetear` a una función compartida en `tipos.ts`).
- **No hay viento ni turbulencia en el modelo: el aire es un sólido perfecto**
  - Dónde: `src/flight/fdm.ts:329 («Sin viento todavía: el día que se añada, se resta aquí el vector de viento»)`
  - Arreglo: Un primer paso barato antes del campo de viento completo: ruido 1/f en tres ejes (`noise.ts` ya tiene `ValueNoise2D`) sumado como viento en ejes cuerpo en fdm.ts:329, con amplitud por peldaño (Guyrami 0,3 m/s; Taguató 1 m/s) y que crezca cerca del suelo con el.
- **Nada del avión se mueve con el mando: ni alerones, ni timón, ni la palanca de la cabina**
  - Dónde: `src/game.ts (HEAD) :5296-5310 `syncAircraftMesh` (solo hélices)`
  - Arreglo: En `comun.py` nombrar `aleron-izq`, `aleron-der`, `timon-prof`, `timon-dir`, `flap-*` y exportarlos como piezas con origen en la bisagra (igual que se hizo con el eje de la hélice).
- **El toque de ruedas no se siente: solo suena**
  - Dónde: `src/game.ts `announce` (busca `state.onGround && !this.wasOnGround`), src/cameras/fuera.ts `traquetear``
  - Arreglo: Un impulso en la cámara al tocar: hundir la cámara `0,05 · touchdownSinkRate` m (con tope) y recuperar en 0,3 s, más un pico de `shake` a 1 en ese fotograma.

### Voces, radio y torre

> He leído entero el frente de audio (`src/audio/*`, `src/flight/radio.ts`, `docs/voces/`, `CREDITOS.md`, los packs de `data/voces/` y los enganches en `src/game.ts`), corrido las 107 pruebas de audio y radio (pasan; hay trabajo sin confirmar de otro agente en `instructor.ts`, `audio.ts` y un `src/aud

**Graves**

- **El pack de voz no llega a producción: se pide por fetch y vite build no copia data/**
  - Dónde: `src/audio/banco-de-voz.ts:98 (BASE = "data/voces"), src/audio/instructor-grabado.ts:186-200 (traer(`${base}/${`
  - Arreglo: Mover `data/voces` a `public/data/voces` (y ajustar BASE, `hacer-pack-de-voz.mjs`, `verificar-voz.mjs` y la regla del service worker en scripts/plantilla-sw.js:140), o copiarlo en el build.
- **Se bajan cuatro packs y solo suena uno: cabina, torre y otro avión se descargan para nada**
  - Dónde: `src/audio/instructor-grabado.ts:170-200 (cargar baja [instructor, cabina, torre, otro])`
  - Arreglo: Un `Locutorio` único que reparte por prefijo de clave: `instructor.*`/`vuelo.*` → pack instructor, `otro.*` → pack otro, `torre.*` → pack torre, `cabina.*` → pack cabina, cada uno con su suplente de navegador y su timbre.
- **La torre sigue siendo una lámpara con texto; sus siete frases grabadas no tienen emisor**
  - Dónde: `src/ui/hud.ts:1633-1635 (t("torre.verde") / t("torre.roja") solo como texto), data/voces/torre/manifiesto.json`
  - Arreglo: Emisor `torre` (pack torre) disparado desde `setLuzDeTorre` y los hechos: verde → `torre.verde` en Guyrami/Tukã y `torre.clearedTakeoff`/`lineUpWait` en Ruvicha; roja → `torre.roja` / `holdShort`; `mandanFrustrar` → `torre.goAround`; `pistaLibreOtraVez` → `tor.

**Medias**

- **La cuenta atrás de la toma en castellano no está grabada y cae siempre al robot**
  - Dónde: `src/game.ts:3825 (this.cantar(aviso.dice, aviso.encasa) sin clave), src/flight/avisos-de-altura.ts:36-41 y 58-`
  - Arreglo: Añadir `clave` al `Escalon` (`vuelo.altura.quinientos`… 8 piezas), meterlas en es-PY.ts y en `frases-para-grabar.mjs`, y grabarlas (`voces-elevenlabs.mjs instructor` salta lo ya hecho).
- **La Boca no sabe que la voz grabada está sonando: cabina y grabado se pisan**
  - Dónde: `src/audio/instructor-grabado.ts:127-141 (encadenarVoz sin pasar por BOCA`
  - Arreglo: Que `InstructorGrabado.decir` pida `BOCA.pedir(urgencia, listo => encadenarVoz(cadena, listo))` como todos, y que el `Reloj.cancelar` de la boca sepa cortar también lo grabado (registrar el `cortar`).
- **El peldaño «bajo» no baja ninguna voz del navegador salvo la cabina**
  - Dónde: `src/audio/instructor.ts (VozDelNavegador.decir no asigna frase.volume), src/audio/voz.ts:143 (solo la cabina p`
  - Arreglo: Exportar `volumenDeVoz()` de voz.ts y ponerlo en `frase.volume` dentro de `VozDelNavegador.decir`.
- **El pack grabado ignora el idioma del juego**
  - Dónde: `src/audio/instructor-grabado.ts:96-106 (quienLaDice no mira manifiesto.idioma ni getLocale()), src/audio/instr`
  - Arreglo: Filtrar manifiestos por `idioma === locale` (cabina y torre inglesa valen en los tres).
- **El motor suena a cuatro cilindros en los seis aviones, incluido el de números de 747**
  - Dónde: `src/flight/aircraft.ts:132 (engine: piston | radial | turboprop | turbofan`
  - Arreglo: Ramificar `build()`/`update()` por `spec.engine`: turbofan = ruido filtrado con silbido que sube (N1) y sin encendido; turboprop = silbido más hélice; radial = pistón con más armónicos graves y golpe.
- **El otro avión saluda a un avión que ya no existe, y el saludo está horneado**
  - Dónde: `src/i18n/es-PY.ts:236 («Buenos días, Óga uno siete dos»), data/voces/otro/otro.buenosDias.ogg, crudo/otro/otro`
  - Arreglo: Trocear el saludo: `[Buenos días,] + {avion}` con seis piezas de nombre (Pykasu, Mainumby, Panambi, Arasunu, Arai, Yvága); es el primer uso real del hueco `{…}` que ya soporta `banco-de-voz.ts`.

### Terreno y paisaje

> He leído entero el frente del mundo (`terrain.ts`, `ortofoto.ts`, `relieve.ts`, `vegetation.ts`, `ciudad.ts`/`ciudades.ts`, `sky.ts`, `superficie.ts`, `obstaculos.ts`, `scenarios.ts`, `teselas.ts` en cabecera, `docs/pipeline-terreno.md`, ADR 0003/0005/0006, `CREDITOS.md`, los datos de `data/terrain|

**Graves**

- **La ortofoto de EOX con licencia sin resolver se sirve por defecto y está versionada**
  - Dónde: `src/ui/mundo.ts:28 (por defecto «foto»), src/main.ts:229-241, src/world/ortofoto.ts:129-147, data/ortho/pettir`
  - Arreglo: Mientras Oksigenia decide (issue 155): en `cargarOrtofoto` devolver `undefined` si `ficha.licencia` empieza por «SIN RESOLVER», y una prueba que lo compruebe; sacar el JPEG del repositorio (y valorar si hace falta reescribir el historial).
- **El relieve del horizonte se ve pero no se pisa: el Teide es un fantasma**
  - Dónde: `src/world/terrain.ts:436-460 (`sueloLejano`, `sampleHeight`), src/game.ts:4293-4297 (único `ponerSueloLejano`,`
  - Arreglo: En `sampleHeight`, si el punto cae fuera de `half` y hay `relieveLejano`, interpolar bilinealmente en ese mapa (mismo código que `desdeRelieve`, con el paso del anillo).
- **La cúpula del cielo se desplaza con la cámara: el sol pintado no está donde alumbra**
  - Dónde: `src/world/sky.ts:63-70 (VERTEX_SHADER), 76-99 (fragment), 428 (`offset: 0.12`), 441 (`dome.scale = size`), 560`
  - Arreglo: Pasar `position` (espacio de objeto, ya unitario) como varying en vez de la posición de mundo, o restar `cameraPosition` con un uniform; entonces `offset` vuelve a ser un desplazamiento en la esfera unidad y tiene sentido.

**Medias**

- **Las nubes viajan clavadas al avión, son blancas de noche y del tamaño de una provincia**
  - Dónde: `src/world/sky.ts:388-416 (`nubes`), 565-572 (`updateSky` mueve el banco en X/Z con la cámara), 536-552 (`poner`
  - Arreglo: En `updateSky`, `textura.offset = cameraPosition.xz / (lado/repeat)` (más el viento del METAR, que ya está en `Meteo`, para que las nubes se muevan solas); en `ponerHora`, `material.color` = mezcla de `m.sol` y `m.horizonte` con la opacidad de estrellas como n.
- **El agua parpadea: lámina plana a 2 m del fondo con el plano cercano a 0,6 m**
  - Dónde: `src/game.ts:1020-1037 (near 0,6 m, far 105–120 km), src/world/terrain.ts:861-882 (`buildWater`, plano único, o`
  - Arreglo: `logarithmicDepthBuffer: true` en el `WebGLRenderer` (game.ts:1006) resuelve todo el rango de una vez y three.js lo soporta en todos los materiales usados; si se quiere evitar el coste (pequeño) en tablets, alternativa: hundir también el mapa fino bajo el agua.
- **Las paletas de cielo y el color de niebla de cada escenario están muertos**
  - Dónde: `src/world/sky.ts:424-425 (uniforms iniciales de `scenario.sky`), 512-521 (`ponerHora` sobrescribe horizonte, c`
  - Arreglo: O quitar `sky` y `fog.colour` de `Scenario` (y de los once escenarios) para no mentir, o —mejor— usarlos como tinte del mediodía: `momentoDe(altura)` mezcla `MOMENTOS` y luego multiplica horizonte/cenit por la razón entre el color del escenario y el del mediod.
- **El relieve lleva horneado un sol fijo mientras la luz de verdad se mueve con la hora**
  - Dónde: `src/world/terrain.ts:674 (`sunVector(this.scenario)`), 694 (`sunlightAt` en el color de vértice), 843-854 (`su`
  - Arreglo: Quitar `sunlightAt` del color de vértice y dejar que la luz direccional + `HemisphereLight` modelen (que es lo que ya pasa cuando hay ortofoto, porque `vertexColors=false`), o, si se quiere conservar el «volumen barato», recalcular el atributo de color al camb.
- **La ortofoto se carga sin mipmaps: moiré y centelleo a media distancia**
  - Dónde: `src/world/ortofoto.ts:151-156 (`minFilter = LinearFilter`, `generateMipmaps = false`)`
  - Arreglo: `generateMipmaps = true`, `minFilter = LinearMipmapLinearFilter`, `anisotropy = renderer.capabilities.getMaxAnisotropy()` (pasarlo desde `main.ts` o fijarlo al ponerla en `Terrain.ponerOrtofoto`).
- **Flora equivocada: lapachos en Madrid y La Palma, y Estigarribia sin quebrachos**
  - Dónde: `src/world/vegetation.ts:204-216 (`FLORA` solo tiene `tenerife-norte` y `chaco``
  - Arreglo: Añadir `estigarribia: [QUEBRACHO, KARANDAY]`, `"la-palma": [PINO_CANARIO, PALMERA_CANARIA]`, `"cuatro-vientos": [ENCINA, PINO_PINONERO]` (dos especies nuevas de diez líneas) y una prueba en `vegetation.test.ts` que recorra `SCENARIOS` y falle si alguno con `pa.
- **Solo dos escenarios tienen ciudad: Ciudad del Este, Encarnación y Madrid se vuelan «en el Pleistoceno»**
  - Dónde: `data/cities/ (solo `pettirossi` y `tenerife-norte`), src/world/ciudades.ts:24-27, scripts/osm-a-ciudad.mjs:84-`
  - Arreglo: `npx tsx scripts/osm-a-ciudad.mjs guarani encarnacion pedro-juan estigarribia cuatro-vientos la-palma` (unos 150–250 KB cada uno), y una prueba que exija ciudad para cada escenario con `pais` real.
- **El agua de OpenStreetMap se extrae y se tira: la bahía de Asunción y 51 lagunas no existen**
  - Dónde: `scripts/osm-a-ciudad.mjs:258-301 (escribe `agua`), src/world/ciudad.ts:47-58 (`Ciudad` sin campo `agua`), src/`
  - Arreglo: Añadir `agua` a `Ciudad` y a `cargarCiudad`; en `Terrain`, por cada polígono, `ShapeUtils.triangulateShape` y una malla plana a `cota mínima del polígono + 0,3` con el material del agua; y ampliar el recuadro del extractor al anillo lejano para el río del 135.

### Misiones y progresión

> He leído entero el motor de misiones (`src/missions/`), las cuatro lecciones, los tramos, la agenda, la máquina de fases de `vuelo.ts`, el panel de misión, galones, gafas, cuaderno y bitácora, más el cableado en `game.ts`, `hangar.ts` y `main.ts`; he corrido las 93 pruebas del frente (todas pasan) y

**Graves**

- **Una misión cumplida —y cualquier «dar una vuelta»— no deja rastro: ni bitácora, ni vuelo completo, ni galón de rodaje**
  - Dónde: `src/ui/hangar.ts:1323 (`if (mision) leccion = VUELTA`), src/flight/lecciones.ts:60-66 (VUELTA.guiaEnTierra = f`
  - Arreglo: Que `terminarElVuelo()` tenga una segunda entrada: misión terminada (evento `finished` del runner) o motor apagado en tierra sin plan (mirar `controls.engineOn` y `onGround` en la propia rama sin `vista`).
- **El objetivo «aterrizar» de una misión se cumple posándose en un potrero, no en la pista**
  - Dónde: `src/missions/runner.ts:138-144`
  - Arreglo: En `satisfied('land')`: `if (!state.onRunway || state.crashed) return false;`.
- **La lección «Rodar» no tiene final que se vea: se queda pidiendo una luz que no va a llegar**
  - Dónde: `src/flight/lecciones.ts:44-58 (`acabaEnLaEspera`), src/flight/vuelo.ts atenderALaTorre (`if (this.acabaEnLaEsp`
  - Arreglo: En `Vuelo.paso`, cuando `acabaEnLaEspera && parado && restante < LLEGADA` durante `ESPERA_MINIMA`, devolver una fase nueva `leccion-hecha` (o un `hecho` aparte) con tarjeta de visto verde, cue `achieved`, el señalero cruzando los bastones, y `terminarElVuelo().
- **Los aros invisibles juzgan, suenan y dan galón en las lecciones donde no se dibujan**
  - Dónde: `src/game.ts ~1256 (`if (this.leccion.id === "aterrizaje") this.scene.add(this.runwayGuide.group)`), src/game.t`
  - Arreglo: Que `runwayGuide.check` solo se llame cuando `this.runwayGuide.group.parent !== null` (o `leccion.id === 'aterrizaje'`), y que `galones.paso` reciba `aro: null` fuera de esa lección.

**Medias**

- **Ocho de once escenarios no tienen ninguna misión, y entre ellos está Yvytu Rape, el campo de la granja**
  - Dónde: `src/content/missions.ts:242-256 (`MISSIONS`, `missionsFor`), src/ui/hangar.ts:810 («Un grupo vacío no se dibuj`
  - Arreglo: Ver las ideas: tres misiones por campo paraguayo medidas sobre `data/terrain/*.bin` y `data/cities/*.city.json` con el mismo método que las de Pettirossi.
- **La lección «Aterrizar» es dos tercios de rodaje en los campos grandes**
  - Dónde: `src/flight/lecciones.ts:88-94 (ATERRIZAJE.guiaEnTierra = true), src/game.ts startPosition (final a 3 km, APROX`
  - Arreglo: Separar `guiaEnTierra` en `senda` y `rodaje`; en «Aterrizar», al pasar a `abandonando` (pista libre), dar la lección por hecha con el visto y ofrecer «otra vez» (reiniciarEnFinal) con un botón grande y sin palabras.
- **Un vuelo entero por defecto dura de 7 a 12,5 minutos y hasta un 37 % es rodaje; y la escalera de dificultad no acorta nada en Guyrami**
  - Dónde: `src/flight/lecciones.ts:98 (LECCION_POR_DEFECTO = DESPEGUE), src/flight/tiers.ts DEFAULT_TIER = GUYRAMI, src/m`
  - Arreglo: Decidir la opción 3 + 4 del issue 156 para Guyrami: el hangar de un perfil nuevo abre en Yvytu Rape (no en `SCENARIOS[0]`, que es el valle inventado sin aeródromo), y en Guyrami la vuelta termina en la primera plataforma que encuentre el grafo (`rutaEntre` a l.
- **Las lecciones «Rodar» y «Despegar» se ofrecen en escenarios sin aeródromo y ahí no hacen nada**
  - Dónde: `src/ui/hangar.ts:1051 (`LECCIONES.map(...)` sin filtrar por `sitio.aerodrome`), src/game.ts resetFlight (`cons`
  - Arreglo: En el hangar, ocultar (no apagar) las fichas de rodar/despegar cuando `!sitio.aerodrome`, con la misma regla de los galones («lo que no hay, no se enseña»); o mejor, darles aeródromo a los dos inventados con el formato `.aero.json`, que es lo que pide el issue.
- **El «techo» de un objetivo no se ve ni se dice: se pasa por encima y no cuenta sin explicación**
  - Dónde: `src/missions/types.ts:23-24 (`maxHeight`), src/content/missions.ts:49, 69, 141-142 (techos de 260-320 m), src/`
  - Arreglo: Que `MissionMarker.moveTo` reciba `maxHeight` y pinte el aro a esa altura (y el haz solo hasta ahí); en el panel un dibujo distinto para «bajito» (la diana con una flecha hacia abajo); y en `advanceMission`, si se está dentro del radio pero por encima del tech.
- **La bitácora se escribe y nadie la lee; y de dieciséis sellos, cero**
  - Dónde: `src/flight/bitacora.ts:78-96 (`leerBitacora` solo se usa dentro del propio fichero), src/ui/cuaderno.ts:73-104`
  - Arreglo: 1) Lista de vuelos en `ui/cuaderno.ts` con la traza como SVG (el hangar ya sabe dibujar rutas: `planoDeMision`).

### Los personajes

> He leído entero `src/world/sigueme.ts`, `src/world/senalero.ts`, `src/flight/senalero.ts`, el bloque de `game.ts` que los gobierna (4500-4740), sus pruebas, el banco `verificar-vuelo-entero.mjs` y los issues 71, 80, 84, 104, 143, 154 y 157; he pasado las 23 pruebas del señalero (verdes), he reproduc

**Graves**

- **El coche vuelve a casa ya apartado: guía once metros fuera de la raya y sin la lección del atropello**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/world/sigueme.ts:131 (CEDE_AL_FINAL), :370-384 (ponerRuta ya no pone `ap`
  - Arreglo: Poner `aparte = 0` cuando el coche pasa de inactivo a activo (en la rama `!activo` de `paso`, sigueme.ts:420-423): un coche que no está fuera no está apartado, y así la ida y la vuelta empiezan limpias sin tocar lo que arregló #154 (una raya recalculada dentro.
- **Coche y señalero están calibrados al Pykasu: con el Arai y el Yvága el coche cae dentro del fuselaje y el señalero debajo del ala**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/world/sigueme.ts:62 (ADELANTO=30)`
  - Arreglo: Que los dos personajes cuenten desde el morro, no desde el centro: exponer el largo del avión (añadir `length` a `AircraftConfig` junto a `wingSpan`, o leer `Box3` del modelo cargado en `aeronave-modelo.ts` y guardar `morro = -min.z`) y calcular `ADELANTO = mo.

**Medias**

- **«Frenos puestos» no es la señal OACI, y faltan las tres que cierran de verdad una llegada**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/world/senalero.ts:164-183 (POSTURAS.frenos y ESPERANDO)`
  - Arreglo: Sustituir `frenos` por `calzos` (brazos rectos arriba, bastones que se tocan: legible con la figura actual, sin manos) y añadir `motor` (bastón cruzando la garganta) como gesto de «en-puesto», que retira la contradicción con la tarjeta de la llave.
- **Los dos personajes siguen siendo cajas mientras los seis aviones ya tienen modelo, y la cara del señalero es una bola oscura**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/world/senalero.ts:293-311 (piernas BoxGeometry, torso BoxGeometry, cabez`
  - Arreglo: Un `modelos/personajes.py` que reutilice `comun.py`: cuerpo base de pocas caras (cabeza con piel, casco, chaleco, brazos como nodos con nombre `hombro_izq`/`hombro_der` para que `senalero.ts` siga girando los hombros por nombre, igual que `pantallas-cabina.ts`.
- **La traducción al guaraní del percance del coche dice «animales», no «coche»**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/i18n/gug.ts:68`
  - Arreglo: Corregirla y apuntarla en la lista de #6 para que la revise la hablante nativa.
- **Un nombre propio real aparece en los comentarios del código público**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/world/sigueme.ts:227`
  - Arreglo: Decisión del fundador: sustituir en los dos comentarios por «alguien de la casa» o «la dueña del campo».

### Las fichas de los seis aviones

> He repasado las seis fichas de `src/flight/aircraft.ts` y `src/flight/flota.ts` número a número, las he contrastado con datos públicos de su clase (Roskam App. B para el 172 y el 310, TCDS/POH del DHC-6 y del Seneca, NASA CR-2144 y las tablas de Nelson para el 747, TCDS del E-170 como clase del regi

**Graves**

- **Los dos reactores llevan la mitad del empuje de su clase y el JAZ 120 no cabe en ninguna pista del juego**
  - Dónde: `src/flight/aircraft.ts:592 (ARAI maxThrust 58000), src/flight/aircraft.ts:694 (YVAGA maxThrust 430000), src/fl`
  - Arreglo: Ley de empuje por tipo de motor en `fdm.ts:390`, leyendo `sound.engine` o un campo nuevo `motor: 'helice' | 'turbina'`: para turbofán algo como `max(0,5; 1 − 0,3·v/Vc)`.
- **Con los flaps puestos, los dos reactores no despegan nunca**
  - Dónde: `src/flight/aircraft.ts:600 (ARAI flapsDrag 0.1), src/flight/aircraft.ts:705 (YVAGA flapsDrag 0.13), src/flight`
  - Arreglo: Flaps por etapas (lo pide ya #46 en «flaps por etapas»): `flaps: [{lift, drag}]` con al menos despegue y aterrizaje, y que la tecla recorra las etapas.
- **Las velocidades de aproximación de los reactores son de avión sin flaps: 175 y 191 nudos donde la realidad son 130 y 145**
  - Dónde: `src/flight/aircraft.ts:594 (ARAI approachSpeed 90), src/flight/aircraft.ts:697 (YVAGA approachSpeed 98), src/f`
  - Arreglo: Definir `approachSpeed` (y `rotationSpeed`) contra la pérdida en configuración: Arai ≈ 74 m/s (144 kt) y Yvága ≈ 76 m/s (148 kt) con los flaps de hoy, y subir `flapsLift` del Arai a ~1,1 para que su CLmax de aterrizaje ronde 2,5 y Vref baje a ~125 kt.

**Medias**

- **A medio recorrido de elevador cuatro de los seis entran en pérdida, contra la regla escrita en la propia ficha**
  - Dónde: `src/flight/aircraft.ts:52-58 (la regla), src/flight/aircraft.ts:468 (PANAMBI cmElevator 0.46), :547 (ARASUNU 0`
  - Arreglo: Para el Yvága poner `cmAlpha: -1.26` (el de su fuente, con lo que el margen sube al 26 % y el medio recorrido queda en 11°).
- **La inercia de alabeo del bimotor es de monomotor: tres veces y media menos que un bimotor ligero real**
  - Dónde: `src/flight/aircraft.ts:422-428 (PANAMBI inertia xx 3400)`
  - Arreglo: `inertia: { xx: 11000, yy: 3000, zz: 13500 }` (redondeando Roskam a la masa de 2.000 kg).
- **La inercia de cabeceo del reactor regional es tres veces baja, y por eso cabecea como un turbohélice**
  - Dónde: `src/flight/aircraft.ts:591 (ARAI inertia yy 300000)`
  - Arreglo: `inertia: { xx: 243000, yy: 950000, zz: 1150000 }`, comprobar que el corto período sigue dentro de 0,35-1,3 de amortiguamiento (subirá el período, bajará ζ; puede hacer falta cmQ −22) y que `prisa()` del banco sigue midiendo la pérdida.
- **El biplano se dibuja con un 50 % más de ala de la que vuela**
  - Dónde: `src/flight/aircraft.ts:328-330 (MAINUMBY wingArea 24.0, chord 1.7), modelos/jaz-25-mainumby.py:126-129`
  - Arreglo: Decidir una: o la ficha sube a ~34 m² y masa ~2.000 kg (Ag Cat con tolva media: 30,4 m², 1.270 vacío / 2.040 máx.; TCDS FAA 1A16) con `chord: 1.5`, o el guion reduce la cuerda de cada plano a ~1,0 m.

### Las cartas de navegación

> He leído los siete issues del frente (75, 76, 77, 78, 83, 93, 100) y los que cuelgan de ellos (72, 74, 51, 38, 59, 48, 91), la matriz, la visión, el ADR 0005, y todo el código que hoy dibuja un aeródromo desde arriba: el mapa del HUD (`src/ui/mapa.ts`, canvas), el plano SVG del hangar (`src/ui/hanga

**Graves**

- **El circuito muere a 1800 m y la senda de aros empieza a 3200: tres aros se dan por perdidos en cada vuelta**
  - Dónde: `src/world/circuito.ts:119 (ENTRADA_EN_FINAL = 1800) frente a src/world/runway-guide.ts:125 (FIRST_RING_DISTANC`
  - Arreglo: Una sola ENTRADA_EN_FINAL, la de runway-guide, importada por circuito.ts y escalada con escalaDeCircuito (la base pasaría a bajar desde 3600·escala, que además cuadra mejor con los 94 m de senda que el comentario reclama).

**Medias**

- **El plan de cartas pide frecuencias y radioayudas y el extractor no lee ninguna de las dos fuentes públicas que las tienen**
  - Dónde: `scripts/osm-a-aerodromo.mjs (solo cruza runways.csv`
  - Arreglo: Ampliar osm-a-aerodromo.mjs para descargar navaids.csv y airport-frequencies.csv junto a runways.csv, escribir `frequencies: [{type, description, mhz}]` y `navaids: [{ident, type, khz, xy, elevM}]` en el .aero.json (xy en el mismo plano local que el resto), y .
- **Yvytu Rape lleva «SGOG», un código OACI inventado que parece real, y el hangar lo pinta como matrícula**
  - Dónde: `data/aerodromes/yvytu.aero.json:2 («id»: «SGOG»)`
  - Arreglo: Cambiar el id a algo que no tenga forma de OACI (por ejemplo «YVYTU») y que la ficha del hangar (y la futura carta) solo pinte el código cuando el aeródromo venga de OurAirports (source.ourairports presente).
- **El mapa del HUD no dice qué cabecera está en uso, aunque su comentario asegura que sí**
  - Dónde: `src/ui/mapa.ts:190-205 (rehacer: «la pista del mapa es la que se está usando… el mapa mentiría») frente a src/`
  - Arreglo: Es el velo 1 de la carta y se puede hacer hoy en el mapa: marcar la cabecera en uso con el mismo verde de las luces de umbral y una punta de flecha hacia dentro, y a partir del alcance 2 pintar los designadores a cada extremo (salen de aero.runways[0].threshol.
- **La escalera de la carta está escrita tres veces con tres órdenes distintos, y ninguna coincide con lo que el juego ya hace**
  - Dónde: `Issue 72 (Tukã: número y norte`
  - Arreglo: Decidir el orden en un solo sitio, una tabla `VELOS` en src/ui/carta/velos.ts que tiers.ts referencie (`carta: 1..4`) igual que hace con `avisos`.
- **Los cuatro velos del issue 77 se dejan fuera la carta que un prelector sí puede leer: la de aproximación visual**
  - Dónde: `Issue 77 (velos: pista y torre`
  - Arreglo: Meter el entorno visual como velo propio (ver hallazgo anterior) reutilizando lo que mapa.ts ya sabe pintar, más los hitos de la misión activa.
- **Tres dibujos del mismo aeródromo, desde los mismos datos, en dos tecnologías; la carta sería el cuarto**
  - Dónde: `src/ui/mapa.ts (canvas, HUD, 4 alcances), src/ui/hangar.ts:237-340 (SVG, `plano()`, con `vector-effect: non-sc`
  - Arreglo: Construir la carta sobre `plano()` de hangar.ts sacándolo a src/ui/carta/ con grupos `<g data-lod>`, y que el mapa del HUD pase a ser ese SVG con el relieve del canvas debajo como fondo (un `<image>` o el canvas actual detrás).

### Rutas y navegación

> He leído entero el frente de navegación (circuito, senda de aros, PAPI, embudo de final, plan de vuelo, mapa, misiones) en /home/eraorahan/Downloads/flyjazz, he corrido las 104 pruebas de Vitest del frente (todas en verde), he medido con un guion propio (tsx, leyendo los .bin de data/terrain) la hol

**Graves**

- **Los aros, el hilo y el PAPI enseñan tres sendas distintas: siguiendo los aros, el PAPI marca cuatro rojas**
  - Dónde: `src/world/runway-guide.ts:1032 y :911 (altura = d·tan 3° desde el umbral a cota 0)`
  - Arreglo: Un solo origen de senda.
- **El circuito no mira el terreno: en Encarnación 20 la base acaba seis metros bajo tierra**
  - Dónde: `src/world/circuito.ts:278-335 (verticesDelCircuito: alturas solo desde la cota de pista)`
  - Arreglo: Muestrear `suelo` a lo largo de cada tramo en `verticesDelCircuito`/`crearCircuito` y levantar el tramo como hacen los aros (holgura mínima de, digamos, 100 m en cruzado/en cola y la de la senda en base), o subir ALTURA_DE_CIRCUITO en ese aeródromo.
- **El hangar deja llevar el JAZ 120 a pistas donde, según carrera.ts, no cabe: se sale por el final de La Palma**
  - Dónde: `src/ui/hangar.ts:1096 (fichaDeAvion sin ninguna comprobación)`
  - Arreglo: En el hangar, por cada par avión×sitio, un pictograma «no cabe» (avión sobre una pista corta tachada) cuando carreraHastaVr(a, superficie)·1,2 > longitud de la pista, y no dejar seleccionar; en el peldaño alto, dejarlo con aviso, que es la lección de #91 («pes.

**Medias**

- **La lección de aterrizar arranca a 1,5·Vref y a 3600 m fijos: para el reactor son 25 segundos a 286 nudos**
  - Dónde: `src/flight/fdm.ts:286 (velocidadDeEntradaEnFinal = vref·1,5)`
  - Arreglo: Escalar la distancia de arranque y ENTRADA_EN_FINAL del embudo con `escalaDeCircuito(approachSpeed)` (la lección debería durar los mismos ~90 s en los seis aviones) y bajar la entrada a 1,3·Vref con `gasPara` acorde.
- **Las tarjetas y la voz del circuito dicen «girá a la izquierda» aunque el circuito vaya por la derecha**
  - Dónde: `src/i18n/es-PY.ts:320-321, src/i18n/en.ts:263-264, src/i18n/gug.ts:45`
  - Arreglo: Añadir `mano` al hecho, claves `circuito.cruzado.derecha` / `circuito.encola.derecha` en los tres idiomas, pictograma espejado, y las dos frases nuevas al pack de voz (docs/voces, scripts/frases-para-grabar.mjs)..
- **La mano del circuito se decide con el circuito de la avioneta, no con el del avión que lo vuela**
  - Dónde: `src/world/circuito.ts:194-275 (holguraDelViento y manoDelCircuito no reciben `escala`)`
  - Arreglo: Pasar `escala` a `holguraDelViento`/`manoDelCircuito` y multiplicar SEPARACION, RECTO_TRAS_LA_PISTA, ENTRADA_EN_FINAL y la altura igual que en `verticesDelCircuito`.
- **Dos ENTRADA_EN_FINAL con el mismo nombre y distinto valor, y el comentario apunta a un aro que no está ahí**
  - Dónde: `src/world/circuito.ts:115-119 (1800 m, «donde está el segundo aro»)`
  - Arreglo: Renombrar el de circuito.ts a FIN_DE_LA_BASE, derivarlo de la senda (un aro concreto) o al menos un test que diga que cae entre dos aros y por delante de LAST_RING_DISTANCE; y corregir el comentario..
- **El mapa pinta mar alrededor de aeródromos de interior aunque el juego ya tiene relieve lejano**
  - Dónde: `src/ui/mapa.ts:478-486 (`dentro ? cota(x,z) : esc.waterLevel`) y el comentario «el día que haya uno de interio`
  - Arreglo: Si `esc.relieveLejano` existe, no recortar: usar `cota(x,z)` siempre (y opcionalmente el color de las bandas lejanas).
- **Misiones solo en 3 de 11 escenarios, y «aterrizar» se cumple parando en cualquier campo**
  - Dónde: `src/content/missions.ts (valle-cordillera, pettirossi, tenerife-norte)`
  - Arreglo: Añadir a la actualización del runner un `enLaPista: boolean` (o pasar el predicado) y exigirlo en `land`; escribir al menos una misión por aeródromo con el método de las de Pettirossi (puntos medidos sobre los .bin, radios generosos), y actualizar el comentari.

### Los modelos de Blender

> He leído los cinco guiones de Blender y `comun.py`, el cargador `aeronave-modelo.ts` y lo que lo rodea (pantallas, cámara de cabina, siluetas del hangar, bancos), he medido los seis `.glb` pieza a pieza con un lector propio (triángulos, nodos, caja de cada malla en el mundo), he regenerado los model

**Graves**

- **Todos los cilindros «verticales» de la flota están tumbados a lo largo del fuselaje**
  - Dónde: `modelos/comun.py:360-382 (`cilindro`, `montante` con `rotation_euler=(0,0,0)`) y :487 (`palanca`)`
  - Arreglo: En `montante` y en `cilindro` girar 90° en X (`rotation_euler=(math.radians(90),0,0)`), o mejor: un ayudante `vertical(nombre, radio, y0, y1, x, z)` que lo haga siempre y que `montante` y las patas usen; la palanca igual pero inclinada hacia atrás.
- **Los conos de hélice apuntan hacia abajo, no hacia delante**
  - Dónde: `modelos/jaz-25-mainumby.py:190-193`
  - Arreglo: Sin `rotation` y con los radios intercambiados (`radius1` la punta, `radius2` la base) o `rotation=(math.radians(180),0,0)`.
- **El guion del Panambi ya no se puede ejecutar y su .glb es de una versión anterior**
  - Dónde: `modelos/jaz-40-panambi.py:28-31 (import) y :230 (uso de `caja`)`
  - Arreglo: Añadir `caja` al import y regenerar.
- **La hélice del Mainumby mide la mitad, son dos palas superpuestas y la ficha dice tres**
  - Dónde: `modelos/jaz-25-mainumby.py:189-208`
  - Arreglo: Usar la `helice(lado, z)` del Panambi con tres palas radiales y `RADIO_HELICE = 1.35`; subir `TREN` a ~1,6 para que el eje quede a 1,7-1,8 m del suelo; y una comprobación en `exportar`: punta de pala más baja − punto más bajo del avión ≥ 0,2 m..

**Medias**

- **El «parabrisas» envuelve el morro entero y en los grandes es dos o tres veces más largo que uno real**
  - Dónde: `modelos/jaz-40-panambi.py:159-195 (`carlinga`), jaz-60-arasunu.py:93-113, jaz-90-arai.py:85-98, jaz-120-yvaga.`
  - Arreglo: Construir el cristal como arco superior (solo los aros entre ~15° y ~165°, o `perfil` con un parámetro de arco) y con un largo fijo de ~2 m para todos; en el Yvága subir el centro para que quede en el cuarto de arriba del fuselaje, que es donde va la cabina de.
- **Desde el asiento la cabina flota: panel, silla y cielo, sin marco, pilares ni morro**
  - Dónde: `modelos/comun.py:95-104 (cara de atrás quitada en todos los materiales) y :419-489 (`cabina` sin cascarón)`
  - Arreglo: En `cabina()` un tramo de fuselaje interior (los mismos aros de `carlinga`, normales invertidas: `bm.faces.new(reversed(...))` o `bmesh.ops.reverse_faces`) del panel hacia atrás medio metro, con dos pilares de parabrisas como `caja` y una losa de capó/morro po.
- **Los retratos del hangar salen de las cajas, no del modelo que se vuela**
  - Dónde: `src/ui/siluetas.ts:74-100 (`fabricarAeronave` con `modelo.silueta`)`
  - Arreglo: Hornear el retrato en Blender al generar cada modelo (`comun.exportar` renderiza tres cuartos a `public/assets/aeronaves/<id>-retrato.png` con Workbench, ~20 líneas; lo he hecho en el scratchpad para este informe) y que `retratosDeLaFlota` cargue la imagen y s.
- **Las alas son losas redondas: sin perfil ni borde de salida**
  - Dónde: `modelos/comun.py:196-204 (`perfil_ala`, cuatro puntos) y :113-138 (`suavizar` con subsurf)`
  - Arreglo: Ocho o diez puntos de un NACA 2412 (tablas de dominio público) en `perfil_ala`, con el borde de salida a espesor cero y crease 1 en esa arista (`bm.edges.layers.float.new('crease_edge')` en 4.x) para que el subsurf lo respete; t/c 0,11 para los reactores..
- **Proporciones contra la clase real: lo que está fuera de banda con número**
  - Dónde: `modelos/jaz-90-arai.py:44 (`ANCHO_FUSELAJE = 3.00`)`
  - Arreglo: Arai: `ANCHO_FUSELAJE` 3,4 y `ALTO_FUSELAJE` 3,6.
- **El Pykasu de fuera cuesta cinco veces más llamadas de dibujo que el Yvága, y es la silueta de un Cessna 172**
  - Dónde: `public/assets/aeronaves/jaz-20.glb`
  - Arreglo: Modelar el JAZ 20 con `comun.py` como los otros cinco (ala alta con montantes, tren triciclo con carenados, cola convencional): un día de guion, y desaparecen las texturas, los 241 draw calls, el CC-BY y la silueta ajena a la vez.

### El motor de vuelo

> He leído entero el motor (fdm.ts, arcade.ts, tiers.ts, referencia.ts, gobernador.ts, tope-de-rodaje.ts, carrera.ts, aircraft.ts), he corrido prestaciones.test.ts (94 pasan, 2 saltadas) y he medido con el FDM real, desde un guion de solo lectura en el scratchpad, lo que el banco no mide: frenada a ga

**Graves**

- **El compensador automático (climbHold) estrella al JAZ 120 y bambolea al JAZ 90 en Tukã y Taguato**
  - Dónde: `src/flight/fdm.ts:507-521 (ganancias 0,12 y 0,75 fijas`
  - Arreglo: Escalar la ganancia con la dinámica del avión, que ya está calculada: usar `derivadasDeLaFicha`+`modosDe` (referencia.ts) para sacar el corto período y dividir las ganancias por (ω_corto/6,2), o normalizar por Iyy/(qS·c̄).
- **El JAZ 120 no puede despegar de ninguna pista del juego en los tramos de coeficientes (y el JAZ 90 por los pelos)**
  - Dónde: `src/flight/fdm.ts:390 (caída de empuje de hélice aplicada a turbofanes)`
  - Arreglo: Una sola función `empujeDisponible(ficha, v, ρ)` con curva por tipo de motor (`sound.engine` ya lo dice): turbofán casi plano con la velocidad y cayendo con σ; turbohélice y pistón como ahora.
- **El tope de rodaje no limita nada en el modelo de coeficientes: con el gas «tapado» el Pykasu rueda a 32 m/s**
  - Dónde: `src/flight/fdm.ts:304-309 (`gasParaRodar`, suelo 0,2 y recta v/(0,5·crucero))`
  - Arreglo: `gasParaRodar` en el FDM debe despejar el gas de equilibrio: `(μ·m·g + ½ρv²·S·cd) / (maxThrust·speedFactor(v))`, con un suelo solo para arrancar parado que desaparezca por encima de 3-4 m/s.
- **La rueda de morro del FDM gira un 747 como un karting: 45°/s con un tercio de palanca, radio 5,6 m, y a fondo el avión se clava**
  - Dónde: `src/flight/fdm.ts:719-720 (ganancia 2,2 y fundido 8→28 m/s iguales para los seis)`
  - Arreglo: Rueda de morro como ángulo de dirección con geometría Ackermann: `yawRate = v·tan(δ)/batalla`, con `batalla` y `δmax` en la ficha (70° en un grande, 30° en avioneta); el radio, el ritmo y la g lateral salen correctos por avión sin ningún tope escrito a mano.

**Medias**

- **En Guyrami el avión más grande es el que menos pista necesita: el JAZ 120 se va en 233 m y 4,9 s tirando 2,6 g**
  - Dónde: `src/flight/arcade.ts:371 (ritmo 0,18/s hacia la velocidad pedida), 43 (`CRUISE_FRACTION`), 157-161 (`MAX_TURN_`
  - Arreglo: `MAX_TURN_RATE` calculado: `g·tan(VISUAL_BANK)/velocidad` (una línea, deja el Pykasu igual).
- **La banda de velocidad del compensador va en fracción del crucero y deja a los reactores fuera de su propia aproximación**
  - Dónde: `src/flight/fdm.ts:502-505 (`floor = 0,42·crucero`, `safe = 0,58·crucero`)`
  - Arreglo: Expresar la banda desde la ficha: `floor = 0,76·approachSpeed`, `safe = 1,05·approachSpeed` (deja al Pykasu exactamente donde estaba).
- **Flaps binarios e instantáneos sin límite de velocidad: el freno más eficaz del juego, y meterlos a 174 m/s da 3,2 g**
  - Dónde: `src/flight/input.ts:303 (conmuta 0↔1)`
  - Arreglo: Flaps con recorrido (posición pedida y ritmo de despliegue: 10-20 s en un grande, 3-5 en avioneta), posiciones (0/10/20/30 o 0/½/1) y `vfe` en la ficha; aviso en la escalera de avisos y percance «flaps» solo en los dos peldaños de arriba.
- **El freno de rueda ignora cuánto peso llevan las ruedas: frena igual con el ala sustentando todo**
  - Dónde: `src/flight/fdm.ts:682-688 (deceleración μ·g fija) frente a src/flight/carrera.ts:64 y prestaciones.test.ts:618`
  - Arreglo: `fuerza = μ·max(0, W − L)` con la sustentación ya calculada en el paso; y spoilers de suelo (idea) para que el freno vuelva a morder al tocar.
- **Sin envolvente: los seis pasan de 1,3-1,8 veces el crucero en picado y aguantan 12-14 g sin consecuencia**
  - Dónde: `src/flight/fdm.ts (no hay Vne/Vmo ni límite de g en ningún sitio`
  - Arreglo: `vne`/`vmo` y `gLimite` en la ficha (hechos públicos por categoría: normal +3,8/−1,5; transporte +2,5/−1); claxon de sobrevelocidad y percance «estructura» solo en los dos peldaños de arriba, según `escalera.ts`; en los de abajo, el avión simplemente no aceler.
- **El alabeo de rotura en la toma es 29° para los seis: el 747 puede posarse con el ala 8 m bajo el asfalto**
  - Dónde: `src/flight/fdm.ts:74 (`CRASH_BANK = 0,5`), 790-795 (`crashLimits`, en Tukã sube a 137°)`
  - Arreglo: Límite geométrico por avión: `asin(gearHeight/(b/2))` más un margen por ala alta/diedro en la ficha; la tolerancia de Tukã que multiplique ese número, no uno fijo..
- **Pista para #158: el motor con ayudas despega igual que sin ellas; la trampa es el bloqueo del elevador fuera de la pista**
  - Dónde: `src/flight/fdm.ts:886-887 (`onGround && !onRunway` → elevador ≤ 0)`
  - Arreglo: Registrar `onRunway` y `controls.aileron` en verificar-vuelo-entero; apagar `asistirRodaje` por encima del fundido de la rueda de morro (o cuando la fase sea de carrera); y que el bloqueo del elevador solo actúe por debajo de, por ejemplo, 0,5·Vr — un avión a .

### Los aeródromos

> He leído los nueve `.aero.json`, `aerodrome.ts`, `scenarios.ts`, `rodaje.ts`, `plan-de-vuelo.ts`, `carrera.ts`, `circuito.ts`, las marcas y las luces, y he medido con vite-node lo que el juego decide para cada avión en cada campo, he catado el relieve Copernicus/PNOA en los umbrales y he contrastado

**Graves**

- **Encarnación está a 199 m y el juego la pone a 85: el «río a dos metros» es un error de datos**
  - Dónde: `data/aerodromes/sgen.aero.json:14 (elevationM 85, umbrales 85/85)`
  - Arreglo: Poner elevationM 199 y umbrales 198/187 (del DEM) con "manual": true; quitar `orilla` y rehacer las bandas de color (empiezan en 84).
- **Mariscal Estigarribia dibuja el contorno de la pista como una segunda pista de 40 m**
  - Dónde: `data/aerodromes/sgme.aero.json (runways[1]: ref "", 9 puntos cerrados, 7180 m)`
  - Arreglo: En el extractor descartar ways de pista cerrados (primer punto == último) o con `area=yes`, y fusionar ways consecutivos que comparten extremo (arregla también el tocón de La Palma).
- **En Guaraní los JAZ 60, 90 y 120 no pueden rodar: arrancan en pista con el motor puesto**
  - Dónde: `data/aerodromes/sges.aero.json:2533 (holdingPositions: [])`
  - Arreglo: Re-extraer SGES (`node scripts/osm-a-aerodromo.mjs SGES`) para que entren los seis puntos de espera derivados.
- **El back-taxi del JAZ 90/120 se dibuja aunque ya estés en la cabecera: sale por la hierba de antes del umbral**
  - Dónde: `src/world/plan-de-vuelo.ts:1775-1830 (backTaxiDesde), 1825 (primer punto a along−60)`
  - Arreglo: En `backTaxiDesde`: si `along − giro < 2·radio + 20`, devolver null (ya estás donde toca); y `Math.max(−mitad + HUECO_PARA_GIRAR, along − 60)` para el primer punto.

**Medias**

- **Faltan filas de luces de cabecera: 02 de Pettirossi, 01 de Estigarribia y 18 de La Palma; las de la 36 de La Palma están 83 m dentro**
  - Dónde: `src/world/aerodrome.ts:1108-1131 (sobreElEje), 1213-1214 y 1258-1275 (luces)`
  - Arreglo: `sobreElEje` que extrapole por los dos extremos (ya lo hace por d<0 sin querer) o que use `Math.min(d, largo − 1e-6)`; y fusionar en el extractor los ways de pista contiguos.
- **Los JAZ 90 y 120 no caben en ninguna pista del juego con los factores de `carrera.ts`, y nada lo dice**
  - Dónde: `src/flight/carrera.ts:88-89 (×2,4) y 100-101 (×4,8)`
  - Arreglo: Separar «lo que necesita» (carrera × 1,3 + 15 m de obstáculo, que es lo real) de «lo que se quiere para elegir intersección» (× 2).
- **La pista de hierba militar de Cuatro Vientos se dibuja como asfalto de 45 m, más ancha que la de verdad**
  - Dónde: `data/aerodromes/lecu.aero.json (runways[1]: 09/27, compacted, 45 m, 1.135 m, umbrales copiados de la 09/27 asf`
  - Arreglo: `compacted`/`ground`/`grass` → color de hierba y superficie `hierba`; no copiar umbrales a una pista con otro eje; marcar `cerrada: true` y no dibujarle marcas ni luces (o no dibujarla)..

### Pantallas y jugabilidad

> He leído entera la capa de interfaz (hud, concha, paneles, panel, hangar, pausa, misión, ajustes, pilotos, ala, mando, pictogramas, señal, tutor, mapa, manga, actitud, cuaderno y las 5.200 líneas de style.css), he pasado las 171 pruebas unitarias de src/ui (todas en verde) y he medido con un guion p

**Graves**

- **La columna derecha del HUD no cabe y empuja el aviso de peligro fuera de la pantalla**
  - Dónde: `src/style.css:234-243 (.hud, filas auto 1fr auto) · src/ui/hud.ts:494-586 (.hud__derecha: ALT, HDG, THR, BRK, `
  - Arreglo: Sacar el aviso de la rejilla: position: fixed abajo-centro con su propio z-index por encima de la señal y el tutor (mismo patrón que .senal), y darle a la rejilla grid-template-rows: auto minmax(0,1fr) auto con las columnas a max-height: 100% y un reparto en d.
- **La señal tapa el aviso de peligro: el tutor se calla cuando hay aviso, la señal no**
  - Dónde: `src/style.css:3485-3489 (.senal bottom: 9%, z-index 5) · src/ui/hud.ts:1930-1941 (hud--avisando) · src/style.c`
  - Arreglo: Que la señal publique --senal-alto (ya lo hace) y el aviso fijo (ver hallazgo anterior) se coloque encima con calc(); o, mientras dure el aviso, subir la señal con .hud--avisando .senal { bottom: calc(9% + var(--aviso-alto)) } midiendo el aviso como se mide la.
- **La luz de la torre se planta sobre los pictogramas y sobre la segunda fila de botones**
  - Dónde: `src/style.css:3352-3357 (.torre top: 14%, z-index 6) · src/style.css:1910-1917 (.pictos top: calc(var(--alto-d`
  - Arreglo: Anclar la torre a la misma variable: top: calc(var(--alto-de-la-barra) + 16px), y que publique --torre-alto para que .pictos baje lo que ocupe mientras esté visible (mismo patrón que --senal-alto).
- **La regla táctil que sube la señal por encima del timón está muerta: la pisa la regla general que va después**
  - Dónde: `src/style.css:1507-1511 (@media (pointer: coarse) .senal { bottom: calc(20px + 56px + 34px + …) }) frente a sr`
  - Arreglo: Mover la regla táctil detrás del bloque .senal (o darle más especificidad: .tactil ~ .hud .senal), y mejor: una sola variable --franja-de-mandos que en táctil valga la altura de los pads y que señal, tutor y aviso sumen a su bottom..
- **El six-pack se sale de la pantalla en tablet y en 1366×768**
  - Dónde: `src/style.css:1690-1712 (.seispack dentro de .hud__abajo) · src/style.css:1708 (@media (max-height: 620px) una`
  - Arreglo: Six-pack position: fixed abajo-centro con bottom: var(--franja-de-mandos) y escala clamp() por vh; en pantalla baja + táctil, poner los pads a los lados y el panel entre ellos, y que --panel-alto se mida de verdad (hoy se calcula aunque el panel esté fuera de .

**Medias**

- **Rehacer el HUD con el plano o el tiempo abiertos deja un panel fantasma que se come Escape y mantiene el vuelo «recto» para siempre**
  - Dónde: `src/ui/mapa.ts:118-128 y src/ui/tiempo.ts:210-218 (bind crea new Panel en cada render) · src/ui/panel.ts:213-2`
  - Arreglo: Panel.destruir() que lo saca de todos/pilaDePaneles, llama a encierro.soltar() y recuenta; Mapa.bind y PanelDelTiempo.bind lo llaman antes de crear otro.
- **El «×» de borrar piloto: 32 px, sin confirmación, en la esquina del botón del avión, y se lleva el cuaderno entero**
  - Dónde: `src/ui/pantalla-pilotos.ts:128-133 · src/style.css:4510-4523 (32×32, top:-6px right:-6px) · src/datos/guardado`
  - Arreglo: Dos pasos sin leer: tocar × gira la ficha y muestra dos botones grandes (papelera roja / flecha atrás), o borrar con pulsación larga; mantener el perfil borrado en oga-veve:guardado.bak durante la sesión para poder «deshacer» desde la misma rejilla; y subir el.
- **El tutor no sabe qué avión vuela: rotación a 30 m/s y frenada desde 45 m/s fijas para toda la flota**
  - Dónde: `src/ui/tutor.ts:42 (ROTATION_SPEED = 30), :133, :464 · src/ui/tutor.ts:197 (airspeed / 45) · src/ui/hud.ts:179`
  - Arreglo: Tutor.setAeronave(vref, vr): rotar en vr, «esperá» hasta vr, barra de frenar de vref*1.3 hasta RODAJE.
- **En táctil, el tutor repite el mismo dibujo en dos pasos seguidos y usa la mano ✋ para frenar que la casa ya desechó**
  - Dónde: `src/ui/tutor.ts:127-131 (throttle: ⇡), :139-143 (pull: ⇡), :195-199 (frenar: ✋), :204-207 (⤳) · contraste con `
  - Arreglo: touchCue con los SVG de la casa: HELICE_MAS (pictogramas.ts) para el gas, TIRAR (senal.ts) para rotar, FRENO para frenar, RAYA para salir; y en el gas dibujar una miniatura del pad de motor con la flecha..
- **Tocar el velo del final lo cierra sin empezar otro vuelo, y el vuelo siguiente ya no tiene final**
  - Dónde: `src/ui/hud.ts:786-787 (click en .fin → cerrarFinDeVuelo) · src/game.ts:2294-2295 (vueloTerminado se queda a tr`
  - Arreglo: Que el velo haga lo mismo que «Otro vuelo» (resetFlight), o rearmar vueloTerminado=false en toggleEngine cuando el motor vuelve a arrancar desde el puesto..
- **Las flechas del hangar rompen el foco en las rejillas de avión, misión, idioma y mundo; y el mando no funciona en el hangar ni en pilotos**
  - Dónde: `src/ui/hangar.ts:1354-1377 (keydown: elegir(atributo) solo conoce data-sitio/data-leccion/data-tramo) · src/ui`
  - Arreglo: Que elegir() mire el atributo de la tarjeta destino (data-avion, data-mision, data-idioma, data-mundo) o, mejor, que las flechas solo muevan el foco sin repintar; y hacer Navegable al hangar y a pilotos (mandos() = botones visibles, cerrar() = volver a inicio).
- **En táctil el tutor abandona el apilado con la señal y se planta en el centro de la vista**
  - Dónde: `src/style.css:1553-1557 (@media (pointer: coarse) .tutor { bottom: auto`
  - Arreglo: Mantenerlo abajo también en táctil: bottom: calc(var(--franja-de-mandos) + var(--senal-alto)) y sin top; si se quiere fuera del centro, arriba a la derecha bajo la barra, pero nunca en el eje de la pista..

### Los cuadros de mandos

> He leído `modelos/comun.py` y los cinco guiones de avión, `pantallas-cabina.ts`, `aeronave-modelo.ts`, `cameras/dentro.ts`, `six-pack.ts`, la matriz y los issues #46/#106/#107, y he medido la cabina de los seis aviones con una sonda propia en el scratchpad (el banco oficial `verificar-cabina.mjs` ca

**Graves**

- **Todo cilindro sin `giro` sale tumbado a lo largo del fuselaje: montantes, cabañas, patas de tren y la palanca**
  - Dónde: `modelos/comun.py:360-369 (`cilindro`), :372-382 (`montante`, con `rotation_euler = (0, 0, 0)` explícito), :487`
  - Arreglo: Dar a `cilindro()` un parámetro `eje="y"` que ponga `rotation_euler = (math.radians(90), 0, 0)` por defecto (montante, palanca, patas) y `eje="z"` para lo que de verdad va a lo largo; hacer que `montante()` lo use; rehacer los seis `.glb` con `blender --backgr.
- **El ojo del piloto va siempre a x=0: en los cuatro aviones de dos pilotos la cámara se sienta encima del pedestal, entre los dos asientos**
  - Dónde: `src/world/aeronave-modelo.ts:347 (`x: 0`), :338 (el `local.x` del asiento ya está calculado y se tira)`
  - Arreglo: Devolver `x: local.x` del asiento elegido (ya calculado en la línea 338) y, en `verificar-cabina.mjs`, comprobar que `|ojo.x − centro del asiento| < 0,05`.
- **Las pantallas caen en el borde de abajo del cuadro y justo debajo de las tarjetas del HUD**
  - Dónde: `modelos/comun.py:466-477 (`alto_panel - 0.18`, panel a 0,58 m fijo)`
  - Arreglo: En `cabina()`, subir las pantallas a `alto_panel - 0.11` e inclinar el plano del panel 12-15° hacia el piloto (girar el `cuadro` en X); y en `hud.ts`, cuando `cameraMode === "cockpit"`, apartar las tarjetas a las esquinas de arriba u ocultar las que repiten lo.
- **Una sola anatomía de cabina para seis clases: el fumigador de radial y el cuatrimotor llevan las mismas dos pantallas G1000 y ninguna palanca de gas**
  - Dónde: `modelos/comun.py:419-489 (`cabina()`: suelo, panel, visera, dos `cuadro` de 0,28×0,20 y sillas)`
  - Arreglo: Ver las ideas: ficha de cabina en `aircraft.ts`, piezas componibles en `comun.py` (cuadrante de N palancas, pedestal, yugo/palanca, seis esferas, N pantallas, palanca de flaps y de tren, overhead) y un montaje por clase..

**Medias**

- **La visera queda a 1,8° por debajo del ojo en los seis: se ve la mitad de la pantalla de salpicadero y casi nada de suelo por delante**
  - Dónde: `modelos/comun.py:456-463 (panel hasta `alto_panel`, visera hasta `alto_panel + 0.04`)`
  - Arreglo: Por clase: visera 12 cm bajo el ojo en el entrenador y el biplano (≈ −10°), 18-20 cm en turbohélice/reactores (≈ −15°); bajar `alto_panel` en cada guion y compensar con pantallas más arriba en el panel (hallazgo anterior).
- **Las pantallas no enseñan el motor, que es uno de los tres instrumentos vivos del primer peldaño según #106**
  - Dónde: `src/world/pantallas-cabina.ts:54-76 (`DatosDeCabina`: velocidad, altura, vertical, rumbo, declinación, cabeceo`
  - Arreglo: Añadir `gas`, `motorEncendido`, `flaps` a `DatosDeCabina`, pasarlos desde `game.ts` (`this.input.controls`), y pintar en la pantalla derecha una columna EIS: arco de RPM (pistón/radial), de torque/Ng (turbohélice) o de N1 (turbofán) según `aircraft.sound.engin.
- **El banco `verificar-cabina.mjs` casca con un TypeError en vez de decir «modelo no cargado», y deja Chrome huérfano**
  - Dónde: `scripts/verificar-cabina.mjs:60-71 (`waitForFunction(...).catch(() => {})` seguido de `page.evaluate` que lee `
  - Arreglo: Guardar el resultado del `waitForFunction` en una variable y, si falla, `comprobar("el modelo carga", false, ...)` y `continue`; envolver el bucle en `try/finally` con `navegador.close()`.

### Arquitectura y código

> He leído `src/game.ts` entero por su esqueleto (5.812 líneas, 102 campos, 88 métodos, 126 de los últimos 200 commits lo tocan, y ningún test unitario lo importa: solo `main.ts` y `dev/sondas.ts`), los seis ADR, el issue 30 con su plan de doce cortes, el guardado, el service worker y las costuras ent

**Graves**

- **ENTRADA_EN_FINAL existe dos veces con dos valores: 3.600 m en la senda y 1.800 m en el circuito**
  - Dónde: `src/world/runway-guide.ts:143 (`FIRST_RING_DISTANCE + 400` = 3.600) y src/world/circuito.ts:119 (`= 1800`)`
  - Arreglo: Borrar `ENTRADA_EN_FINAL` y `SENDA` de circuito.ts e importar las de runway-guide.ts; si el circuito de verdad tiene que entrar en final a otra distancia, que sea otro nombre (`BASE_A_FINAL`) derivado de `FIRST_RING_DISTANCE` con un comentario que diga por qué.
- **La distancia de parada se calcula con dos fórmulas distintas: el HUD avisa a 304 m y la máquina de fases se compromete a 378 m**
  - Dónde: `src/ui/hud.ts:2009-2023 (REACCION 1,5 s, FRENADA 2,5, MARGEN 1,35) frente a src/flight/vuelo.ts:153-170 (FRENA`
  - Arreglo: Una función pura `distanciaDeParada(v, aircraft)` en `src/flight/parada.ts` con la reacción por peldaño (la de 3 s es la pedagógica y está justificada en vuelo.ts) y la frenada leída de `AircraftConfig` (nuevo campo `brakingDecel`, con cada avión anotado como .
- **Cambiar de viento o de avión deja geometría y texturas en la GPU sin liberar**
  - Dónde: `src/game.ts:3346-3355 (`rehacerLaSenda`), 3375-3394 (`rehacerPlanDeVuelo`), 3357-3365 (`ponerModeloSiLoHay`), `
  - Arreglo: (1) `RunwayGuide.dispose()` y `PlanDeVuelo.dispose()` públicos que recorran el grupo y liberen; llamarlos en los cuatro sitios.
- **Cambiar de avión en vuelo deja el plan, el circuito y la aproximación del avión anterior**
  - Dónde: `src/game.ts:5493-5529 (`cycleAircraft`)`
  - Arreglo: Extraer `montarLoQueDependeDelAvion()` que haga `rehacerPlanDeVuelo()`, `ponerAproximacion()` (que ya rehace el circuito), reconstruya `laAproximacion` (o le dé un setter de avión), la sombra y el ala, y llamarlo desde el constructor y desde `cycleAircraft`.
- **Cambiar de peldaño reconstruye a medias: el circuito no aparece ni desaparece, y los avisos de altura se quedan en las unidades del peldaño inicial**
  - Dónde: `src/game.ts:5531-5567 (`cycleTier`)`
  - Arreglo: El mismo patrón que el hallazgo anterior: `montarLoQueDependeDelPeldano(tier)` con `ponerCircuito()`, `avisosDeAltura.ponerEscalones(...)` (o reconstrucción), `pausa.ponerLetras(...)`, y llamarlo desde el constructor y desde `cycleTier`.
- **Cambiar de avión en vuelo deja el mundo calibrado para el avión anterior**
  - Dónde: `src/game.ts:5508-5544 (cycleAircraft)`
  - Arreglo: Un solo método `ponerAeronave(next)` que haga lo que hace `ponerTiempo` con el viento: rehacer plan, circuito, aproximación (o darle un `ponerAeronave` a `LaAproximacion`), sombra y ala, y llamarlo desde el constructor y desde `cycleAircraft`.
- **Los modelos glTF se sirven desde una caché que nunca los invalida**
  - Dónde: `scripts/plantilla-sw.js:150-165 (caché primero, para siempre, en `oga-veve-uso`)`
  - Arreglo: Lo más barato: mover los glb a `src/modelos/` e importarlos con `?url` (Vite les pone hash y el `HEAD` sigue funcionando sobre la URL resultante).
- **game.ts sigue siendo el dios que #30 avisó: 5.827 líneas, 56 % de los commits, 40 campos públicos y una máquina de estados de cinco booleanos**
  - Dónde: `src/game.ts (unPaso 3707-4562`
  - Arreglo: El refactor de la sección de ideas, en ese orden.

**Medias**

- **Subir de peldaño deja la cuenta atrás de altura y las unidades a medias**
  - Dónde: `src/game.ts:5531-5560 (`cycleTier`), 989-994 (construcción de `avisosDeAltura` y `alturaEnGrande`), 3421 (`apl`
  - Arreglo: Un único `ponerPeldano(tier)` que haga todo lo que depende del peldaño (modelo de vuelo, unidades vía `aplicarAjustes`, escalera, instrumentos, avisos de altura, menú de pausa) y que llamen tanto el constructor como `cycleTier`.
- **Tres caminos de reinicio que siguen divergiendo: resetFlight, reiniciarEnFinal y el `colocar` de la sonda**
  - Dónde: `src/game.ts:2892-2996 (`resetFlight`), 3587-3640 (`reiniciarEnFinal`), src/dev/sondas.ts:118-140 (`colocar`)`
  - Arreglo: `reiniciarLoDeEsteVuelo()` con todo lo que hoy se reinicia en cualquiera de los dos, llamado por `resetFlight` y `reiniciarEnFinal`; y `Game.colocar(pos, rumbo, velocidad)` público que la sonda llame en vez de tocar campos.
- **El estado de partida sigue siendo siete variables sueltas y `quedarQuieto` duplica a `stop`**
  - Dónde: `src/game.ts campos `running`, `quieto`, `pausadoAdrede`, `hayPanelAbierto`, `hayInstrumentoAbierto`, `percance`
  - Arreglo: Un `type EstadoDePartida = "volando" | "quieto" | "pausado" | "terminado"` con un solo `ponerEstado(nuevo)` que haga enter/exit (reloj, audio, animation loop), y que `start`, `stop`, `quedarQuieto`, `pausar`, `sufrirPercance` y `terminarElVuelo` llamen.
- **unPaso mide 857 líneas y el constructor 622: game.ts pide cinco cortes concretos**
  - Dónde: `src/game.ts: constructor 978-1600 (622 líneas), `escucharLosHechos` 2422-2731 (309), `unPaso` 3692-4549 (857),`
  - Arreglo: Sin cambiar comportamiento, partir `unPaso` en métodos privados nombrados por bloque (`vigilarLaPista`, `apuntarLaTraza`, `avisar`, `seguirLaSenda`, `traerElMundoReal`, `cerrarElPaso`) llamados en el mismo orden; luego sacar `traerElMundoReal` a `src/world/mun.
- **La distancia de aproximación del entrenador está copiada a mano: 33 en circuito.ts y 33 en aircraft.ts**
  - Dónde: `src/world/circuito.ts:155 (`APROXIMACION_DEL_ENTRENADOR = 33`) frente a src/flight/aircraft.ts:269 (`PYKASU.ap`
  - Arreglo: `import { PYKASU } from "../flight/aircraft"` (world ya importa flight en otros cinco ficheros) o que `escalaDeCircuito` reciba la referencia como segundo argumento por defecto `PYKASU.approachSpeed`.
- **Ninguna regla dice qué capa puede importar a cuál, y ya hay cruces: flight→world y audio→ui**
  - Dónde: `src/flight/la-aproximacion.ts:35-41 (siete imports de `../world/`), src/flight/fdm.ts:144, src/flight/carrera.`
  - Arreglo: ADR 0007 corto con el grafo permitido (datos ← flight ← world ← audio/ui ← game) y un test en `src/meta.test.ts` que recorra los imports con una expresión regular y falle en cada cruce nuevo, con una lista de excepciones fechadas para los tres que hay hoy.
- **Fugas de GPU al cambiar de avión, al llegar el modelo y al cambiar el viento**
  - Dónde: `src/game.ts:5501 y :3360-3364 (`scene.remove` de la malla sin dispose), src/world/aeronave-modelo.ts:408 (`new`
  - Arreglo: (1) `AircraftMesh.dispose()` que recorra el grupo y libere geometrías, materiales y texturas; llamarlo antes de cada `scene.remove`.
- **El proxy del METAR se resuelve en dos sitios con dos reglas: el botón «tiempo de verdad» ignora `?meteo=`**
  - Dónde: `src/main.ts:72 (`q.get("meteo") ?? import.meta.env.VITE_METEO`) frente a src/game.ts:66 (`PROXY_METEO = import`
  - Arreglo: `world/meteo.ts` exporta `proxyDeMeteo(): string | null` (dirección, después variable) y los dos sitios lo llaman.

_Y 13 medias más en este frente, en el diario del run._

### Licencias y marcas

> He leído CREDITOS.md, LICENSE, LICENSE-CONTENIDO.md, NOTICE, docs/claves.md, los ADR 0003/0004/0005, las fichas de procedencia de data/terrain, data/ortho, data/aerodromes y data/cities, los seis glb (metadatos y texturas del jaz-20 extraídas), los guiones de modelos/, la pantalla de créditos en los

**Graves**

- **Cuatro PNG de arte ajeno (personajes y capturas de una plataforma educativa comercial) viven en la raíz del repositorio público**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/guardians.png, healer.png, illus.png, slider.png (añadidos en el commit 1982`
  - Arreglo: Borrarlos del árbol y, como el repositorio es público desde el 31 de agosto, también del historial (git filter-repo --path guardians.png ...
- **El JAZ 20 Pykasu sigue siendo la Cessna 172 de Sketchfab: silueta, librea, panel Garmin y la palabra «Cessna» en la pantalla de créditos**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/public/assets/aeronaves/jaz-20.glb (asset.extras.title «Cessna 172Kr (with c`
  - Arreglo: 1) Modelar el JAZ 20 en casa con modelos/comun.py como los otros cinco: ala alta con montantes, dos plazas (como dice #69), deriva recta sin aleta dorsal, ruedas sin carenado, cabina con las dos pantallas del juego.
- **La ortofoto NC-SA de EOX no está «bloqueada»: se despliega a la demo pública en cada push y el jpg lleva en el repositorio desde ea141f9**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/data/ortho/pettirossi-lejos.jpg (1,4 MB)`
  - Arreglo: Puerta en ortofoto.ts: no cargar fichas cuya `licencia` empiece por «SIN RESOLVER» (y un test en Vitest que lo compruebe con la ficha real).
- **El extractor de ortofotos sigue declarando CC BY 4.0 para EOX: la próxima regeneración deshace la corrección del #155**
  - Dónde: `scripts/ortofoto-publica.mjs:8 y scripts/ortofoto-publica.mjs:76`
  - Arreglo: Cambiar `licencia` del proveedor `sentinel` al texto de «sin resolver» (o al de la licencia comercial cuando se firme), y añadir un test en Vitest que lea cada `data/ortho/*.json` y `data/terrain/*.json` y falle si el campo `licencia`/`atribucion` no está en u.
- **La ortofoto de EOX ya está redistribuida: en el repositorio público y en la demo de GitHub Pages**
  - Dónde: `data/ortho/pettirossi-lejos.jpg (commit ea141f9, 2026-09-04) y .github/workflows/deploy.yml`
  - Arreglo: Decisión de Oksigenia, pero mientras se toma: retirar `pettirossi-lejos.jpg` del árbol (dejando el `.json` como ficha de lo que hubo) y que el escenario caiga al relieve dibujado, como hacen los otros ocho.
- **El JAZ 20 Pykasu es la silueta distintiva de un Cessna 172, con cabina, y la regla de la casa lo prohíbe**
  - Dónde: `public/assets/aeronaves/jaz-20.glb (asset.extras.title = «Cessna 172Kr (with cockpit) (ver III)», generator Sk`
  - Arreglo: Escribir `modelos/jaz-20-pykasu.py` con los ayudantes de `comun.py` —ala alta, tren triciclo, dos plazas— como los otros cinco, y retirar el GLB de Sketchfab del repo.
- **Dentro del GLB del Pykasu hay una fotografía de producto de un horizonte artificial que el autor del modelo no puede licenciar**
  - Dónde: `public/assets/aeronaves/jaz-20.glb, imagen 4 (material `mech_intr_hor`, JPEG de 100 KB)`
  - Arreglo: Lo resuelve el hallazgo anterior (modelo propio).
- **327 de 407 commits públicos acreditan una herramienta de IA como coautora**
  - Dónde: `git log --format=%b | grep -c 'Co-Authored-By: Claude' → 327`
  - Arreglo: Decisión de Oksigenia: (a) reescribir el historial con git filter-repo quitando los dos trailers y forzar el push (el repo es de un solo autor, así que el coste es bajo), y (b) un hook commit-msg más un paso de CI que rechace cualquier commit con 'Co-Authored-.
- **El nombre de la niña de cuatro años está en el código público y en un commit**
  - Dónde: `src/world/sigueme.ts:227, src/game.ts:850, y el mensaje del commit ccbcfe8 («feat(sígame): en un campo particu`
  - Arreglo: Sustituir el nombre por «la nena de la granja» en los dos comentarios; reescribir el mensaje del commit ccbcfe8 (va con la reescritura del hallazgo anterior).
- **La ortofoto de EOX «que bloquea la publicación» ya está publicada en GitHub Pages**
  - Dónde: `dist/assets/pettirossi-lejos-B4NvwNyT.jpg (1,4 MB, generado por src/world/ortofoto.ts:96 con import.meta.glob)`
  - Arreglo: Hasta que Oksigenia resuelva #155: que ortofoto.ts lea la ficha y no cargue ninguna imagen cuya 'licencia' empiece por 'SIN RESOLVER' (y una prueba en vitest que falle si un .jpg de data/ortho tiene ficha sin resolver), o mover pettirossi-lejos.jpg fuera de da.
- **El JAZ 20 Pykasu es la silueta y el título de la avioneta que la casa decidió no citar**
  - Dónde: `public/assets/aeronaves/jaz-20.glb — asset.extras.title = «Cessna 172Kr (with cockpit) (ver III)», con la URL `
  - Arreglo: Hacer el Pykasu en casa como los otros cinco: modelos/jaz-20-pykasu.py sobre comun.py (ala alta, sí; carenados, montantes y proporciones del 172, no).

**Medias**

- **CREDITOS.md y LICENSE-CONTENIDO.md se contradicen sobre la licencia de los modelos hechos en casa**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/CREDITOS.md:191-192 frente a /home/eraorahan/Downloads/flyjazz/LICENSE-CONTE`
  - Arreglo: Decidir y escribir la misma frase en los dos ficheros.
- **La nota de exclusión de LICENSE está incompleta y apunta a una ruta que no existe**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/LICENSE:1-12`
  - Arreglo: Reescribir la nota con la lista de carpetas y su licencia (una línea cada una) y remitir a CREDITOS.md para el detalle; o, más robusto, un `LICENSE` por carpeta de datos como ya hace data/aerodromes/..
- **Tres de los seis glb no tienen procedencia anotada en CREDITOS.md**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/CREDITOS.md:171-195`
  - Arreglo: Una tabla con los seis: id, guion de origen, fecha, licencia (la que salga del hallazgo anterior).
- **La atribución CC BY del modelo en pantalla no cumple la 4.0: falta el enlace al material y a la licencia**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/ui/credits.ts:52`
  - Arreglo: Se resuelve solo si se retira el modelo (hallazgo del JAZ 20).
- **Las condiciones de Google Map Tiles no están comprobadas y el HUD pinta solo el texto de getAttributions, sin logotipo**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/ui/hud.ts:1818-1824`
  - Arreglo: Leer developers.google.com/maps/documentation/tile/policies antes de activar la clave en granjaoga.com y anotar la fecha en CREDITOS como se hizo con ElevenLabs y EOX.
- **Herramientas de IA y rutas de su cuaderno nombradas en ficheros públicos del repositorio**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/docs/vision.md:283-290 (ocho enlaces a claude.ai/code/artifact/…)`
  - Arreglo: Copiar los ocho informes a docs/informes/ (o a un sitio de Oksigenia) y enlazarlos ahí; ver.mjs y ver-kimi.mjs fuera del árbol o renombrados a «maquetas» con el directorio parametrizado; en los bancos, un directorio de salida relativo e ignorado (salida/ o el .
- **La pantalla de créditos del juego imprime «Cessna» en tres idiomas, y CC BY 4.0 no lo exige**
  - Dónde: `src/i18n/es-PY.ts:201, src/i18n/en.ts:191, src/i18n/gug.ts:276, src/i18n/i18n.test.ts:115`
  - Arreglo: Reescribir la frase como «Modelo de la avioneta de TonyWony (sketchfab.com/TonyWony), bajo CC BY 4.0» y quitar la excepción `!c.startsWith("credits.")` del test para que la regla valga en toda la interfaz.
- **Los modelos hechos en casa tienen dos licencias contradictorias: CREDITOS dice Apache-2.0 y LICENSE-CONTENIDO dice propietario**
  - Dónde: `CREDITOS.md:191 frente a LICENSE-CONTENIDO.md:29 y LICENSE:8`
  - Arreglo: Decidir una y escribirla en los dos sitios.

_Y 8 medias más en este frente, en el diario del run._

### El producto

> He mirado el juego como producto: `docs/vision.md`, `docs/matriz.md`, `README.md`, los issues de metajuego (25, 26, 27, 29, 107, 136, 152, más 53, 28, 71, 84, 87, 145, 153, 156), y el código que decide qué ve un niño de cuatro años en su primer minuto (`main.ts`, `ui/pantalla-pilotos.ts`, `ui/hangar

**Graves**

- **La bitácora se escribe en cada vuelo y no se enseña nunca**
  - Dónde: `src/flight/bitacora.ts:110-116 (leerBitacora) · src/ui/cuaderno.ts:63-105 · src/game.ts:2304-2312`
  - Arreglo: En `ui/cuaderno.ts` pintar `leerBitacora()` como lista de tarjetas: `plano(escenario, size, traza)` ya existe en `ui/hangar.ts:230` y es el mismo dibujo del fin de vuelo; al lado, la manga de ese vuelo y el día como sol/luna.
- **Cero sellos: entre el primer aterrizaje y el tercero no pasa nada nuevo en la vida del perfil**
  - Dónde: `src/flight/cuaderno.ts:93-98 (REQUISITOS) · src/flight/gafas.ts:88-100 · grep de «sello|logro» en src → solo c`
  - Arreglo: `src/flight/sellos.ts` como suscriptor de `hechos` + fin de vuelo, con los seis de escuela primero (¡Veve!, Karumbe, Mainumby, Ñandutí, La vuelta al tajamar, Tres toques), guardado en `progreso` por perfil, y una página de álbum con huecos en silueta.
- **Cumplir una misión no deja rastro y, en Guyrami, ni siquiera se entiende**
  - Dónde: `src/game.ts:5659-5665 · src/ui/hud.ts:1846-1849 · src/flight/bitacora.ts:53-70`
  - Arreglo: Emitir `hechos.emit("misionCumplida", {id})`; añadir `mision?: string` a `Vuelo`; marcar en `fichaDeMision` (hangar.ts) las hechas con un visto dibujado; que el instructor diga `mission.done` y que la pantalla de fin muestre el sello de la misión..
- **Se arranca en un valle inventado, no en casa, y la granja no tiene ni una misión**
  - Dónde: `src/world/scenarios.ts:1125-1131 · src/main.ts (recordado ?? SCENARIOS[0]) · src/ui/hangar.ts:784 (PAISES) · s`
  - Arreglo: Poner `YVYTU_RAPE` primero en `SCENARIOS`, `PAISES = ["py","es","inventado"]`, y reescribir `PRIMER_VUELO` sobre `data/terrain/yvytu-rape.bin` con puntos medidos como se hizo con Pettirossi (el casco de la granja, la loma, el camino).
- **El pack de voces grabadas no se publica: la demo devuelve 404 y Guyrami se queda con la voz del sistema**
  - Dónde: `src/audio/banco-de-voz.ts:98 (BASE = "data/voces"), .github/workflows/deploy.yml:45-62 (publica solo dist de n`
  - Arreglo: Mover data/voces a public/data/voces (o declarar publicDir/copiar en el build) y que el service worker lo siga excluyendo como hoy (plantilla-sw.js:140).
- **El primer vuelo de un niño nuevo es en un valle inventado, sin puesto ni calles, y no en Paraguay ni en la granja**
  - Dónde: `src/main.ts (const recordado = … ?? SCENARIOS[0]), src/world/scenarios.ts:1125-1127 (VALLE_CORDILLERA primero)`
  - Arreglo: Que el escenario por defecto de un perfil nuevo sea yvytu-rape (y probablemente que vaya el primero en SCENARIOS), con la lección Despegar de verdad: puesto a 150 m del punto de espera, hierba, vaca, casa de la granja.
- **En Guyrami sale la orden de irse al aire una de cada cuatro veces, y desobedecerla termina el vuelo con percance; la matriz dice que ahí no entra ninguna emergencia**
  - Dónde: `src/flight/la-aproximacion.ts:58 (UNA_DE_CADA = 0.25), :130 (ordenes = "auto", sin tier), :276-284`
  - Arreglo: Añadir a Tier un campo (p.
- **Cumplir una misión no deja rastro en ningún sitio y se celebra solo con texto**
  - Dónde: `src/game.ts:5664-5680 (advanceMission), src/flight/bitacora.ts:44-58 (Vuelo), src/flight/cuaderno.ts:34-52 (Cu`
  - Arreglo: Emitir un hecho `misionCumplida {id}` en el bus, apuntar `misiones: string[]` en `Cuaderno`, guardar `mision` en `Vuelo`, decirlo con el instructor (`instructor.decir(t("mission.done"), "mission.done")`, con su frase en el pack de voz), marcar la ficha del han.
- **Nada de lo que hace un niño puede salir de la tablet: ni compartir, ni imprimir, ni QR**
  - Dónde: `src/ui/hud.ts:684-725 (pantalla de fin), grep de navigator.share / window.print / @media print en src: cero re`
  - Arreglo: Nueva pieza `src/ui/postal-de-vuelo.ts`: pintar en un canvas el plano+traza (ya existe como SVG en `hangar.ts` `planoDeAerodromo`/`dibujarTraza`), el avión del perfil (bicho y color), los galones, la fecha y «Óga Veve · granjaoga.com/recorrida», y ofrecer `nav.

**Medias**

- **Nada sale de la tablet: ni carné, ni foto del vuelo, ni compartir**
  - Dónde: `grep de navigator.share / print / QR en src → nada · src/ui/hud.ts:705-722 (botones del fin) · index.html:33`
  - Arreglo: Ver idea «La postal del vuelo».
- **Los percances no conocen el peldaño: a un niño de cuatro años se le termina el vuelo**
  - Dónde: `src/game.ts:1914,1915,1930,2111,3767,3869,4798,5337 (llamadas a sufrirPercance) · src/game.ts:2227-2253 · src/`
  - Arreglo: Que `sufrirPercance` consulte el peldaño: en Guyrami, coche/edificio/pasada = «topecito» (freno puesto, señalero que hace «alto», tres segundos, se sigue), sinpermiso = la torre te para y te devuelve a la raya sin terminar, y `ordenes = "nunca"` para la vaca.
- **Misiones en tres escenarios de once, todas «ir a un punto», ninguna de servicio**
  - Dónde: `src/content/missions.ts (MISSIONS) · src/missions/types.ts:28-38 · src/world/scenarios.ts:1125-1155`
  - Arreglo: Objetivo nuevo `{kind:'carry', que:'chipa'|'persona'|'correo'|'pieza'}` con estado visible en el HUD como dibujo (la chipa humea o no según `touchdownSinkRate` y aceleraciones), y una misión por aeródromo paraguayo medida sobre su `.bin`.
- **La bitácora no apunta el avión: con seis aviones, el cuaderno no sabe cuál volaste**
  - Dónde: `src/flight/bitacora.ts:53-70 (interface Vuelo) · src/game.ts:2304-2312`
  - Arreglo: Añadir `avion: string` a `Vuelo` (opcional para los guardados viejos; `esVuelo` ya es tolerante), pasarlo desde `terminarElVuelo`, y contar por avión en `cuaderno.ts`..
- **Nada se abre ni crece: los seis aviones y los cuatro peldaños están todos desde el minuto uno**
  - Dónde: `src/ui/hangar.ts:1088-1094 (AIRCRAFT.map sin condición) · src/flight/tiers.ts (elección libre) · #107 sin nada`
  - Arreglo: Ver idea «Habilitaciones por avión».
- **El adulto no tiene ningún papel: ni copiloto, ni «tus mandos / mis mandos»**
  - Dónde: `grep de copiloto / segundo jugador en src → nada · src/flight/input.ts · #27`
  - Arreglo: Ver idea «Copiloto en la misma tablet»..
- **El guaraní es una casilla de idioma al 59 %, no una mecánica**
  - Dónde: `node scripts/i18n-pendiente.mjs → 328 textos, 194 traducidos, faltan 134 (hangar incluido) · #28 y #6 a cero ·`
  - Arreglo: No espera a la traducción completa: diez palabras grabadas por una persona (ysyry, yvyty, ka'aguy, ñu, kokue, tape, óga, vaka, guyra, arai) ancladas al terreno de Yvytu Rape ya son la mecánica.
- **Volver al hangar recarga la página y obliga a volver a elegir piloto cada vez**
  - Dónde: `src/game.ts:1398 y :1481 (hangar: () => location.reload()), src/main.ts (elegirPiloto siempre que no hay ?esce`
  - Arreglo: Al recargar desde el juego, guardar una marca (sessionStorage) y saltar la pantalla de pilotos si el perfil activo existe; y en general saltarla cuando hay un solo perfil, dejando un botón «cambiar de piloto» en el hangar (junto a Ajustes).

_Y 12 medias más en este frente, en el diario del run._

### Las ideas de futuro

> He leído los ocho bloques (#96-#103), el orden de #153 y los diecinueve issues grandes del frente, y he contrastado cada premisa contra el código: la interfaz `FlightModel`, el hueco del viento en el FDM, la flota, el cielo, el guardado, la entrada, la triangulación de three.js y las pruebas (86 fic

**Graves**

- **El sol de mediodía en Paraguay pasa por el sureste: el cielo enseña un hemisferio que no es**
  - Dónde: `src/world/sky.ts:252-259 (`solALaHora`) y src/world/scenarios.ts:490 (`sun.azimuth: 140` en Pettirossi`
  - Arreglo: Derivar el azimut de mediodía de la latitud del escenario (`origin.lat` del aeródromo, que ya está): 0 si lat < 0, 180 si lat > 0; y dejar `sun.azimuth` solo como luz de arte o eliminarlo.
- **El viento existe para el aeródromo pero no para el avión, y eso rompe la regla de lo real antes de llegar a #35**
  - Dónde: `src/flight/fdm.ts:329-331 («Sin viento todavía: el día que se añada, se resta aquí el vector»), src/world/mete`
  - Arreglo: Partir #35 en dos: primero el viento uniforme del METAR restado en fdm.ts:329 (ejes cuerpo) y en tierra como fuerza lateral sobre el tren, y en `arcade.ts` como deriva puramente cinemática (sumar W a la velocidad suelo, sin cambiar la actitud); después, en otr.
- **Las gafas de físico prometen «lectura del estado real», pero el estado no lleva fuerzas y en Guyrami no hay fuerzas que leer**
  - Dónde: `src/flight/model.ts:60-125 (`FlightState`, sin sustentación, resistencia, empuje ni peso), src/flight/fdm.ts:1`
  - Arreglo: (1) Añadir a `FlightState` un bloque opcional `fuerzas: { sustentacion, resistencia, empuje, peso } | null` en coordenadas de mundo, rellenado por `CoefficientFlightModel` y `null` en `ArcadeFlightModel`; que las gafas se apaguen solas cuando sea `null`.
- **El JAZ 20 Pykasu sigue siendo la Cessna 172 de Sketchfab en silueta y cabina**
  - Dónde: `CREDITOS.md:145-166 · public/assets/aeronaves/jaz-20.glb (2,5 MB, del 2 de septiembre) · modelos/ (no hay jaz-`
  - Arreglo: modelos/jaz-20-pykasu.py con los ayudantes de comun.py: ala alta genérica, tren fijo, cabina de seis esferas (que es lo que el peldaño alto ya enseña en ui/six-pack.ts).
- **La manga enseña un viento que el avión no siente**
  - Dónde: `src/flight/fdm.ts:329-331 · src/world/meteo.ts:79 (leerMetar) y :170 (deFrente) · src/game.ts:588 · src/ui/man`
  - Arreglo: Paso cero de #35, separado del resto: un `viento: Vector3` que el juego pone en el modelo (mismo patrón que `ponerSuperficie`), restado en `integrate` antes de calcular u/v/w.
- **En HEAD los dos reactores no despegan sin ayudas en ningún escenario (arreglo en curso, sin commit)**
  - Dónde: `src/flight/fdm.ts (diff sin commitear) · src/flight/aircraft.ts (diff sin commitear) · src/flight/prestaciones`
  - Arreglo: No tocar: hay alguien en ello.
- **El viento elige la cabecera y mueve la manga, pero el avión no lo nota**
  - Dónde: ``src/flight/fdm.ts:387-393` («Sin viento todavía: el día que se añada, se resta aquí»), `src/world/meteo.ts:16`
  - Arreglo: Una función `viento(x,y,z,t)` en `meteo.ts` que hoy devuelve el vector constante del METAR, restada en `fdm.ts:390` (u,v,w) y en `arcade.ts`; con eso la deriva, el cangrejo de #92 y la manga se vuelven reales en una tarde.

**Medias**

- **Los bloques, #153 y la matriz cuentan una flota que ya no existe: «0 de 9», «cinco aviones» y «JAZ 90 Kuarahy»**
  - Dónde: `Issue #98 (0 de 9, «cinco aviones»), #153 («la flota, que es el bloque a cero»), #96 (#36 sin marcar, está cer`
  - Arreglo: Marcar #8, #36, #54, #57 en sus bloques; cerrar #69 con un enlace a flota.ts; cerrar #2 si el botón del HUD existe (gafas.ts dice que sí); en docs/matriz.md añadir la columna del JAZ 120 Yvága (presurización sí, tripulación sí, «es su lección» de hoja de carga.
- **El helicóptero no es «una tercera implementación y el resto no se entera»: los mandos, la interfaz y toda la cadena de llegada son de avión**
  - Dónde: `src/flight/model.ts:20-40 (`ControlInputs`: elevator, aileron, rudder, throttle, flaps), model.ts:138-260 (`se`
  - Arreglo: Antes del código, un ADR corto «ala rotatoria»: (a) `ControlInputs` v2 con `colectivo` y `pedales` opcionales, o un tipo de mandos por familia; (b) un `PerfilDeOperacion` (`pista` | `plataforma`) que la cadena de llegada consulte; (c) dos modelos, no uno; (d) .
- **El laboratorio no puede existir tal como está el motor: gravedad y densidad son constantes importadas, y sus vuelos contarían como horas de piloto**
  - Dónde: `src/flight/atmosphere.ts:11-12 (`SEA_LEVEL_DENSITY`, `GRAVITY` constantes), src/flight/fdm.ts:31 (import direc`
  - Arreglo: Inyectar una `Atmosfera { densidadEscala, gravedad }` en el constructor de `CoefficientFlightModel` (con `airDensity` recibiendo la escala), marcar el vuelo como `laboratorio: true` en `Vuelo` de bitacora.ts para que cuaderno no lo sume, y responder la pregunt.
- **El rayo de la tormenta, tal como está escrito, es un destello de pantalla completa sin límite: choca con la accesibilidad que ya se paga**
  - Dónde: `Issue #49 («Rayo como pulso de la luz direccional más un destello»)`
  - Arreglo: Escribir en #49 la regla desde el principio: un rayo como mucho cada dos segundos, nunca más del 30 % de subida de luminancia en el cielo, y con `prefers-reduced-motion` el rayo es solo el trueno con su cuenta de segundos (que es la lección buena de todas form.
- **Ni la tormenta ni el tráfico se pueden jugar porque no existe el objetivo «esperar»**
  - Dónde: `src/missions/types.ts:27-36 (`Objective`: solo `takeoff`, `reach`, `land`)`
  - Arreglo: Un cuarto objetivo `{ kind: 'esperar', hasta: 'pista-libre' | 'tormenta-pasa' | 'cinturones' | 'torre', maximo?: segundos }` que se cumple por un hecho de `src/hechos.ts` y no por posición.
- **La contabilidad de bloques está dos semanas atrasada y el orden de #153 apunta a lo que ya está hecho**
  - Dónde: `Issue #98 («0 de 9», «cinco aviones») · #153 («la flota, que es el bloque a cero») · #8, #54, #57 cerrados · #`
  - Arreglo: Cerrar #69, #46 y #2 citando el commit; reescribir #98 como «6 de 9» y lo que queda (#55 clean room, #56 OpenVSP, #91 peso y centrado); y en #153 sustituir «la flota» por lo que hoy desatasca más: viento en el FDM, sellos, tipos de objetivo..
- **Visión, matriz y cabecera de flota.ts se contradicen sobre nombres que ya están decididos**
  - Dónde: `docs/matriz.md:20 («JAZ 90 Kuarahy», sin JAZ 120) · docs/vision.md:104 (tramo «Mainumby (4-6)») · src/flight/t`
  - Arreglo: Una pasada de documentación: columna JAZ 90 Arai y JAZ 120 Yvága en la matriz (con su fila «tripulación y avisos cantados: es su lección» repartida entre los dos), Guyrami en la visión, la cabecera de flota.ts, y la regla de las gafas tal como quedó..
- **«El mundo es una tela» y Mundo Tejido (#37) quedaron revertidos por el ADR 0006 y nadie lo ha escrito**
  - Dónde: `docs/vision.md:51-56 («sin una sola fotografía») · docs/adr/0006-el-mundo-de-verdad.md · src/ui/mundo.ts:22-24`
  - Arreglo: Una nota en vision.md §1 y en #37: Mundo Tejido gobierna todo lo que no es suelo de Google (cielo, HUD, medallas, brújula, aviones, vegetación del mundo dibujado) y es la dirección completa del mundo dibujado, que es el de los colegios sin red y sin clave.

_Y 10 medias más en este frente, en el diario del run._

### Accesibilidad y entrada

> He leído el banco de acceso (pasa 90 de 90), input.ts, keymap.ts, mando.ts, panel.ts, pantalla-ajustes.ts, el CSS entero y las pantallas de entrada, he corrido las 42 pruebas unitarias del frente (pasan) y he medido con un guion propio de Playwright cuatro viewports táctiles, la tecla Espacio sobre 

**Graves**

- **Un mando conectado y quieto anula el teclado y el táctil en los tres ejes**
  - Dónde: `src/flight/input.ts:183-189 (y readGamepad, 342-360)`
  - Arreglo: En `readGamepad` devolver `undefined` por eje cuando el valor tras la zona muerta es 0, o mejor: sumar las tres fuentes y recortar (`clamp(gamepad.pitch + touchPitch + teclado)`), que es lo que ya se hace entre táctil y teclado.
- **En un móvil apaisado la tarjeta de aviso y la columna derecha quedan fuera de pantalla**
  - Dónde: `src/style.css:1532-1560 (`@media (pointer: coarse) .hud`, `.tutor { top: 44% }`), .pad--* con píxeles fijos (1`
  - Arreglo: Una capa `@media (pointer: coarse) and (max-height: 420px)`: pads en `vmin` (palanca `clamp(96px, 28vmin, 150px)`), timón más corto, barra de botones en una sola fila desplazable o plegada tras un botón, tutor y señal ancladas por encima de los pads con `botto.
- **En vertical no hay aviso de girar y el juego se apila hasta ser inutilizable**
  - Dónde: `index.html:30 (manifest `orientation: landscape`), src/style.css sin ninguna regla `(orientation: portrait)`, `
  - Arreglo: Una capa `@media (orientation: portrait) and (pointer: coarse)` que tapa el vuelo con un pictograma animado de tablet girando (sin texto, con `aria-label` traducido) y congela el vuelo por la misma vía que un panel (`LaConcha.alAbrirseOCerrarse`).
- **Un mando enchufado y quieto deja el teclado y el táctil sin cabeceo, alabeo ni timón**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/flight/input.ts:171-176 y 318-340`
  - Arreglo: Que `readGamepad` devuelva `undefined` por eje cuando está dentro de la zona muerta, o mejor sumar las tres fuentes (`clamp(pad + touch + teclado)`) como ya se hace con táctil y teclado.
- **Espacio sobre un botón enfocado frena a tope y no activa el botón**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/flight/input.ts:229-230 y 388-392`
  - Arreglo: En `leTocaAlDeLaPantalla` incluir `button, summary, [role="radio"], [role="slider"], a[href]` al menos para Space y Enter; solo hacer `preventDefault` de Space cuando el objetivo es `body` o el lienzo.
- **En un móvil apaisado el freno y media columna del HUD quedan fuera de pantalla, y la tarjeta de arranque cae sobre el timón**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/style.css:1455-1481 (pads en píxeles fijos) y 1532-1536 (`padding` del H`
  - Arreglo: Pads en `vmin` con mínimo `--tacto`; por debajo de 700 px de ancho, la barra de arriba se pliega en el menú de pausa (que ya congela y ya se recorre) y el HUD baja a horizonte + velocidad + señal; `@media (orientation: portrait)` con un velo y el dibujo de la .
- **Portátil táctil o tablet con ratón: los mandos táctiles desaparecen y los botones del motor bajan a 26 px**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/style.css:1398-1402, 1495-1499 y 1532`
  - Arreglo: Enseñar los mandos con `@media (any-pointer: coarse)` y esconderlos solo con `(hover: hover) and (pointer: fine) and (not (any-pointer: coarse))`; mejor aún, decidir en tiempo real: aparecen al primer `pointerdown` con `pointerType === "touch"` y se atenúan tr.
- **El mando de consola solo vuela: no arranca el motor, no pausa, no cambia de cámara y no pasa del hangar**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/flight/input.ts:318-340`
  - Arreglo: Un mapa de botones al lado del de teclas (`Start`→pausa, `Y`→engine, `X`→flaps, `LB/RB`→camera, `Back`→reset) con detección de flanco en `update`; gas del gatillo con `LT` como «bajar» simétrico o eje 3 cuando exista; hacer `Navegable` al hangar y a los piloto.

**Medias**

- **La regla que sube la señal por encima del timón táctil está muerta por orden de cascada**
  - Dónde: `src/style.css:1507-1511 frente a src/style.css:3484-3488`
  - Arreglo: Mover la regla táctil detrás de la base, o subir la especificidad (`.hud ~ .senal`, o `.senal.senal`), y añadir al banco una comprobación de solape entre mandos táctiles y tarjetas pulsables.
- **Los mandos táctiles desaparecen sobre cielo claro: contraste no textual de 1,0:1**
  - Dónde: `src/style.css:1405-1411 (`.pad`), 1442-1452 (`.pad__punto`)`
  - Arreglo: Aplicar aquí la regla de la casa: «si algo lleva información, es opaco».
- **El zoom por pellizco está bloqueado en todo el juego, al contrario de lo que promete index.html**
  - Dónde: `src/style.css:222 (`html, body { touch-action: none }`) frente a index.html:5-10`
  - Arreglo: En `html, body` poner `touch-action: pinch-zoom` (bloquea el desplazamiento accidental pero deja el pellizco), y dejar `none` solo en `.pad`, `.boton-tactil` y los tiradores del ala.
- **Portátil táctil, Chromebook o tablet con ratón: los mandos táctiles se esconden**
  - Dónde: `src/style.css:1398-1402 (`@media (pointer: fine) .tactil { display: none }`), src/ui/hud.ts:156-157, src/game.`
  - Arreglo: Mostrar `.tactil` con `@media (any-pointer: coarse)` y ocultarlo solo con `(pointer: fine) and (not (any-pointer: coarse))`; ajustar el reparto del HUD igual.
- **Con solo un mando no se puede pausar, ni elegir piloto, ni salir del hangar**
  - Dónde: `src/flight/input.ts:342-360 (readGamepad: solo ejes 0-2 y botones 0, 6, 7), src/ui/mando.ts:1-8, src/ui/pantal`
  - Arreglo: Mapear Start (9) a `togglePausa`, Y (3) a cámara, X (2) a motor, LB (4) a flaps, con flanco de subida en `readGamepad`.
- **Espacio no activa un botón enfocado: la barra del HUD solo responde a Enter**
  - Dónde: `src/flight/input.ts:244-246 y 407-411 (`leTocaAlDeLaPantalla`)`
  - Arreglo: Añadir `button, summary, [role='button'], [role='radio'], a[href]` a `leTocaAlDeLaPantalla`, limitando la excepción a Space/Enter para no perder las flechas de vuelo cuando el foco cae en un botón del HUD.
- **«Tamaño: grande» no agranda lo único que toca un niño de cuatro años: los mandos táctiles**
  - Dónde: `src/style.css:1454-1476 (`.pad--stick` 150px, `.pad--throttle` 74×190, `.pad--rudder` 220×56), 1442-1447 (`.pa`
  - Arreglo: Expresar los pads en función de `--escala-hud` y del viewport: `width: calc(clamp(110px, 24vmin, 150px) * var(--escala-hud))`, punto `calc(34px * var(--escala-hud))`, y el `padding` táctil del HUD (1533-1536) derivado de las mismas medidas con una variable `--.
- **Los radios de ajustes se recorren pero no se eligen con las flechas, y tabulan 16 paradas**
  - Dónde: `/home/eraorahan/Downloads/flyjazz/src/ui/pantalla-ajustes.ts:105-116 y /home/eraorahan/Downloads/flyjazz/src/u`
  - Arreglo: Extraer el tabindex rotatorio + flechas del hangar a un ayudante `radiogrupo(el)` y usarlo en ajustes, pilotos (bicho y color) y hangar; que `seQuedaConLasFlechas` en panel.ts devuelva `true` dentro de un `[role="radiogroup"]`..

_Y 3 medias más en este frente, en el diario del run._

### Despegue y aterrizaje por avión

> He leído entero el frente (plan-de-vuelo.ts, carrera.ts, runway-guide.ts, aproximacion.ts, circuito.ts, la-aproximacion.ts, vuelo.ts, hud.ts, aerodrome.ts, scenarios.ts) y he medido con un guion de vite-node el punto de entrada real de los seis aviones en los once escenarios instanciando PlanDeVuelo

**Graves**

- **La senda de aros e hilo apunta al umbral a cota cero: contradice al PAPI y hunde al avión grande antes de la pista**
  - Dónde: `src/world/runway-guide.ts:852 (umbral como origen), :911 (hilo: y + d·tan 3°), :1072 (aros: y + height)`
  - Arreglo: Mover el origen de aros e hilo al **punto de toma**: pie = umbral + TCH/tan 3° ≈ 286 m adentro (o exactamente donde `sitiarPapi` coloque el PAPI, que ya sabe si viene de OSM), de modo que la senda cruce el umbral a 15 m; que `explicarElPapi` mida desde ese mis.
- **No hay puerta de «este avión no cabe en este campo»: la tabla de entrada por avión y campo**
  - Dónde: `src/ui/hangar.ts:1095 (cualquier avión con cualquier escenario)`
  - Arreglo: Una función `cabeEn(avion, escenario)` en carrera.ts (rodadura·1,15 + tramo de rotación ≤ largo, con la superficie del campo) y su hermana de aterrizaje (ver hallazgo de la distancia de aterrizaje); usarla en el hangar para atenuar/marcar la ficha del campo (s.
- **Guaraní con JAZ 60, 90 y 120: sin punto de espera, el vuelo arranca en cabecera con el motor en marcha y sin rodaje**
  - Dónde: `src/world/plan-de-vuelo.ts:1136 (filtro de intersecciones), :1036-1059 (esperasPosibles), :1170-1180 (reinicia`
  - Arreglo: Si ninguna intersección pasa el listón de `pistaQueHaceFalta`, quedarse con la que más pista deje siempre que supere `paraEntrarYDespegar` (1072 m para el JAZ 60: 1862 vale) y, si tampoco, con la más cercana a la cabecera y hacer back-taxi.
- **Los puntos de espera publicados entran sin comprobar la pista que dejan: back-taxi de 1,1 a 2,6 km en Tenerife Norte con calle paralela hasta la cabecera**
  - Dónde: `src/world/plan-de-vuelo.ts:1057 (sitios.push(e.xy) sin pistaQueQueda), :962 (LO_MAXIMO_DE_IDA sólo mira la ida`
  - Arreglo: Aplicar `pistaQueQueda(e.xy) >= pistaQueHaceFalta(avion)` también a los publicados (salvo el de la cabecera); sumar la longitud del back-taxi a `ida`/`viaje` al elegir el par; y sólo permitir back-taxi cuando ninguna espera alcanzable por calle dé pista sufici.
- **En Guaraní los tres grandes no tienen ruta y el vuelo arranca ya en pista**
  - Dónde: `src/world/plan-de-vuelo.ts:1037-1061 (esperasPosibles) y :1120-1141 (esperasPorInterseccion)`
  - Arreglo: Si ninguna intersección pasa el filtro, quedarse con la que más pista deja (la más cercana a la cabecera) sin filtrar, y dejar que `backTaxiDesde` haga el resto; y que `reiniciar()` distinga «no hay calles» (arrancar en pista) de «hay calles pero ninguna esper.
- **Tenerife Norte: el reactor hace 2 km de back-taxi con una calle paralela hasta la cabecera**
  - Dónde: `src/world/plan-de-vuelo.ts:906-943 (parDeSalida no cuenta el back-taxi), :1056-1059 (esperas publicadas sin fi`
  - Arreglo: En `parDeSalida`, sumar a `ida` la longitud del back-taxi que `backTaxiDesde(along de la espera)` devolvería (o su estimación `along − giro`); y filtrar las esperas publicadas igual que las intersecciones cuando exista alguna alternativa que sí deja pista.
- **Pettirossi con el JAZ 120: el back-taxi arranca 52 m fuera de la pista y da una vuelta sobre sí mismo**
  - Dónde: `src/world/plan-de-vuelo.ts:1780 (disparo), :1819-1826 (umbral y primer punto), :1832-1839`
  - Arreglo: En `backTaxiDesde`: devolver `null` si `along − (giro + radio) < 2·RADIO_CURVA` (no hay nada que deshacer) y acotar el primer punto a `≥ −mitad + HUECO_PARA_GIRAR`.
- **Los aros y el hilo apuntan al umbral a cota cero, y el PAPI está 300 m adentro: quien sigue la senda ve rojo**
  - Dónde: `src/world/runway-guide.ts:852-853, :911, :1032 (senda = d·tan3° desde el umbral)`
  - Arreglo: Apuntar la senda al punto de toma: `altura = (d + adentro)·tan(GLIDE_SLOPE)` con `adentro` = lo que devuelve `sitiarPapi` (300 calculado, 162 en Cuatro Vientos, 297/284 en La Palma), y colocar el último aro y el hilo con esa cota.
- **El hangar deja subir al JAZ 120 a Yvytu Rape, y allí no rota; nadie lo dice**
  - Dónde: `src/ui/hangar.ts:1095 (lista AIRCRAFT sin filtro por escenario), src/flight/carrera.ts:53-71`
  - Arreglo: En el hangar, con `carreraHastaVr(avion, superficie)·1,15` y la distancia de aterrizaje (hallazgo siguiente) contra el largo de la pista del escenario: atenuar la tarjeta del campo y poner un pictograma (avión con la pista corta debajo, sin texto).

**Medias**

- **El back-taxi se dispara aunque ya se esté en el umbral: la raya sale del asfalto por detrás de la cabecera**
  - Dónde: `src/world/plan-de-vuelo.ts:1780 (mitad − along ≥ paraEntrarYDespegar), :1820 (giro = max(umbral, …)), :1825 (p`
  - Arreglo: No hacer back-taxi si `along − umbral < LO_MINIMO_QUE_SE_RUEDA` (ya se está en cabecera) o si lo que se ganaría es menor que, digamos, 100 m; acotar el primer punto a `max(−mitad + HUECO_PARA_GIRAR, along − 60)`; prueba en back-taxi.test.ts con un avión que ne.
- **La distancia de aterrizaje no se calcula en ningún sitio, y tres constantes del Pykasu hacen su papel**
  - Dónde: `src/world/plan-de-vuelo.ts:197 y :896 (TRAS_TOMAR_TIERRA = 1000)`
  - Arreglo: Añadir a carrera.ts `distanciaDeAterrizaje(a, superficie)` = 15/tan 3° + recogida (≈ 1 s a Vtd) + Vtd²/(2·(μ + 0,28)·g), con Vtd = 0,95·Vref; fuente: FAA Pilot's Handbook of Aeronautical Knowledge cap.
- **carrera.ts calcula con la ley de empuje de hélice también para los reactores; el FDM (árbol de trabajo) ya distingue chorro**
  - Dónde: `src/flight/carrera.ts:61 (max(0,2, 1 − v/(2,4·cruise)))`
  - Arreglo: Una sola función `factorDeEmpuje(a, v)` (en aircraft.ts junto a `esDeChorro`) que usen fdm.ts, carrera.ts y prestaciones.test.ts; actualizar la expectativa de carrera.test.ts al número nuevo con su porqué; y extender la prueba «rueda hasta Vr lo que dicen el e.
- **La superficie del campo no llega a la cuenta del plan: en Yvytu Rape se decide con asfalto**
  - Dónde: `src/world/plan-de-vuelo.ts:1136, :1780, :1820 (paraEntrarYDespegar(this.avion) / pistaQueHaceFalta(this.avion)`
  - Arreglo: Pasar la `Superficie` a PlanDeVuelo (o el `Aerodrome` ya la lleva: `superficieDe(aero)`) y usarla en las tres llamadas; prueba en carrera.test.ts de que en Yvytu el listón es el de hierba..
- **Punto de toma pintado a 400 m, PAPI a 300 y pista procedimental a 300: tres números para el mismo sitio, todos fijos y no todos correctos**
  - Dónde: `src/world/aerodrome.ts:1823 (400 m, todas las pistas reales)`
  - Arreglo: Una función `puntoDeToma(largo)` con la tabla del Anexo 14 en un sitio (aproximacion.ts o runway-markings.ts) que usen la pintura de aerodrome.ts, la de runway-markings.ts, `sitiarPapi` cuando no hay OSM, y la senda de aros (hallazgo 1).
- **La tabla: dónde entra cada avión en cada campo (viento de casa)**
  - Dónde: `src/world/plan-de-vuelo.ts:875-968 (parDeSalida), :1037-1061 (esperasPosibles), :1775-1841 (backTaxiDesde), :1`
  - Arreglo: Convertir esta tabla en prueba: `carrera.test.ts` (o uno nuevo `entrada-en-pista.test.ts`) que construya `PlanDeVuelo` por cada par avión × aeródromo y afirme que `porDelante >= carreraHastaVr(avion)·1,15` o que el par está vetado en el hangar.
- **La distancia de aterrizaje no existe en ninguna parte**
  - Dónde: `src/flight/carrera.ts (solo despegue)`
  - Arreglo: `distanciaDeAterrizaje(a, superficie)` en `carrera.ts`, misma integral que la de despegue pero al revés: Vs con CLmax de aterrizaje (cl0 + clAlpha·alphaStall + flapsLift, como mide `prestaciones.test.ts`), Vtd = 1,15·Vs (Vref = 1,3·Vs, ya en la ficha), rodadur.
- **El factor 2,4 y los comentarios de «casi seis mil» ya no cuentan la verdad: el JAZ 120 está «corto» en todos los campos menos uno**
  - Dónde: `src/flight/carrera.ts:75-80 y :86`
  - Arreglo: Sustituir el factor fijo por `rodadura + tramo aéreo hasta 15 m (≈ Vr²·0,3/g + 15·(L/D))`, todo ×1,15 (FAR 23/25), con suelo de 600 para el Pykasu; reescribir las dos notas con los números de hoy y añadir un `expect(paraEntrarYDespegar(grande)).toBeLessThan(31.

_Y 3 medias más en este frente, en el diario del run._

### Pruebas y bancos

> He corrido la suite entera (86 ficheros, 1135 pruebas verdes, 2 saltadas, 8,5 s), el typecheck (limpio), tres bancos cortos (percance 3/3, viento 3/3, carteles 12/12) y el vuelo entero de Tenerife Norte en Tukã con el JAZ 20, que reproduce el 10 de 14 con percance «fuera». La causa está localizada y

**Graves**

- **Tenerife Norte en Tukã: el piloto del banco baja toda la final sin gas y toca corto; el juego hace bien en darlo por «fuera»**
  - Dónde: `scripts/verificar-vuelo-entero.mjs:1143 (ley de gas), :142 (flaps siempre 0), :1150-1160 (palanca por altura)`
  - Arreglo: En el piloto del banco: (1) que el gas en final apunte a `suyas.aproximacion` (Vref de la ficha) y no a 30/24 escritos; (2) mejor aún, que el gas corrija la senda —si `alto < objetivo` se sube gas, si se va alto se baja—, que es como se vuela una final con mot.
- **Las luces del PAPI y la tarjeta del PAPI miden sendas distintas: 300 m de diferencia en el punto de mira**
  - Dónde: `src/world/aproximacion.ts:78 (PAPI_ADENTRO = 300) y :333-339 (ángulo desde cada luz)`
  - Arreglo: Una única función `alturaDeSenda(metrosAlUmbral)` (o `puntoDeMira` en el aeródromo) que usen aros, tarjeta y luces; probablemente mover el punto de mira de aros y tarjeta a donde estén las luces (300 m o lo que diga el fichero), que es lo real y además regala .
- **Tenerife Norte en Tukã acaba en percance porque el piloto del banco vuela el final a ralentí**
  - Dónde: `scripts/verificar-vuelo-entero.mjs:1143 (`const quiere = falta < 60 ? 24 : 30`
  - Arreglo: `const vapp = suyas.aproximacion ?? 30; const quiere = falta < 60 ? vapp * 0.8 : vapp;` y que el piloto obedezca la tarjeta «flaps» (`c.flaps = 1` cuando `tarjeta.dibujo === "flaps"`), que es lo que haría el niño.
- **El juego pide frenar con el avión todavía en el aire, a 11 m, 221 m antes del umbral**
  - Dónde: `src/flight/vuelo.ts:179 (`EN_EL_AIRE = 12`) y :464-466`
  - Arreglo: En vuelo.ts, para la rama «volviendo de volar» exigir `estado.onGround` (o `sobreElSuelo < gearHeight + 1`), dejando los 12 m solo para dar por despegado.

**Medias**

- **«Ya podés tocar» sale con el PAPI en cuatro rojas y 292 m antes del umbral, cuatro segundos antes del percance «fuera»**
  - Dónde: `src/game.ts:4062-4078 (`puedeTocar`), :487 (ANTES_DEL_UMBRAL = 300), :4898 (`sobreLaPista`)`
  - Arreglo: Añadir a `puedeTocar` que la trayectoria proyectada (altura / tan(ángulo de descenso actual), con `verticalSpeed` y `airspeed`) caiga dentro de la pista, o al menos que no se esté con el PAPI en 0 blancas cuando hay PAPI.
- **El banco de percance dice comprobar «salirse por el final de la pista» y pasa con cualquier percance: hoy sale «edificio»**
  - Dónde: `scripts/verificar-percance.mjs:142-146`
  - Arreglo: Comparar `golpe.percance === "pasada"` y elegir un escenario y punto de colocación donde no haya edificio detrás (o Yvytu Rape, que es hierba).
- **Nadie vigila los seis .glb: el del JAZ 20 no es de casa (es un Cessna 172 de Sketchfab de 2,5 MB) y el README lo cuenta a medias**
  - Dónde: `public/assets/aeronaves/jaz-20.glb (asset.extras.title = «Cessna 172Kr (with cockpit) (ver III)», 2.506.196 by`
  - Arreglo: Una prueba `src/world/modelos.test.ts` que lea la cabecera JSON de cada `.glb` con `fs` (12 líneas, ya lo he hecho a mano para este informe): un fichero por id de `FLOTA`; nodo `avion` en todos salvo una lista explícita de ajenos con su entrada en CREDITOS.md;.
- **Lo que decide el juego vive en `game.ts` y ninguna prueba lo importa: percances, «ya podés tocar», tocar en el campo, pasada, reloj acelerado**
  - Dónde: `src/game.ts (5.812 líneas, 0 pruebas)`
  - Arreglo: Por orden de lo que más protege: (1) `LaAproximacion` es construible con un mundo de mentira —`MundoDeLaAproximacion` es una interfaz—: probar `mirarSiMandanFrustrar` con `ordenes: "siempre"`, el levantamiento, y `explicarElPapi` contra las luces (hallazgo 2);.
- **Media docena de pruebas de vuelo siguen escritas para el JAZ 20 y la flota son seis; #158 es exactamente el hueco**
  - Dónde: `src/flight/tramos.test.ts (asistencias por peldaño), aterrizajes.test.ts (`limiteDeCaida` por modo), frenos.te`
  - Arreglo: Convertir `tramos.test.ts` en `describe.each` sobre la flota para las cuatro capas de asistencia, con al menos «con todas las ayudas puestas, a todo gas y tirando en Vr, el avión se va del suelo antes de 1,3× su carrera limpia» — esa sola prueba habría cazado .
- **Los bancos de Playwright no están en la CI y la mayoría solo saben volar el JAZ 20**
  - Dónde: `.github/workflows/ci.yml (typecheck + vitest + build)`
  - Arreglo: Un segundo workflow nocturno (o en `workflow_dispatch`) con `npx playwright install chromium` y los bancos cortos en serie (percance, viento, carteles, pictos, frenos, quien-habla, sin-red); y un tercero semanal con `npm run barrido` subiendo la tabla como art.
- **La comprobación «el vuelo termina contando lo que te llevás» da verde aunque el vuelo acabe en percance**
  - Dónde: `scripts/verificar-vuelo-entero.mjs:1576`
  - Arreglo: `vuelo.fin && !vuelo.percance && vuelo.galones.length > 0`, o que la sonda devuelva `{ que: "fin" | "percance" }` en vez de un booleano..
- **El banco mide dónde se toca de lado, pero no de largo: 886 m pasado el umbral pasa como buena toma**
  - Dónde: `scripts/verificar-vuelo-entero.mjs:1536-1541 (solo `Math.abs(tocoDesviado) < 9`)`
  - Arreglo: Exigir además `0 <= tocoPasadoElUmbral <= min(600, 0.4 * pista.length)`, que es la zona de toma; y que salga en rojo si toca antes del umbral aunque sea a 0 m del eje..

_Y 4 medias más en este frente, en el diario del run._

### Rendimiento

> He medido el juego compilado (dist/ de hoy) y el escenario en vivo con Playwright: peso de descarga por escenario, tiempo hasta poder volar con la CPU estrangulada ×4, inventario de la escena por grupos (llamadas de dibujo, triángulos, materiales, texturas en GPU), perfil de CPU del arranque y anato

**Graves**

- **El banco de rendimiento dibuja con la GPU del escritorio y cree que es SwiftShader**
  - Dónde: `scripts/verificar-rendimiento.mjs:20-31 (cabecera «aquí se dibuja por software») y :68-75 (banderas de Chrome)`
  - Arreglo: Forzar software con `--use-angle=swiftshader` (o `--disable-gpu`) en una pasada aparte, medir también con `deviceScaleFactor: 2` en el viewport, e imprimir el UNMASKED_RENDERER en el informe para que la hipótesis quede a la vista.
- **El Pykasu —el primer avión del niño de cuatro años— es 241 mallas, 30 materiales, 14 texturas y 2,45 MB**
  - Dónde: `public/assets/aeronaves/jaz-20.glb (generator «Sketchfab-12.66.0»), CREDITOS.md:147, src/world/aeronave-modelo`
  - Arreglo: Lo que más rinde por lo que cuesta: escribir `modelos/jaz-20-pykasu.py` con los ayudantes de `modelos/comun.py`, como los otros cinco (cabina incluida, que ya lo hacen).
- **El avión empieza a descargarse solo cuando el mundo ya está construido, y el mundo solo cuando se ha elegido en el hangar**
  - Dónde: `src/main.ts:213-245 (Promise.all de relieve, ciudad, tiempo y ortofotos) y src/game.ts:3358-3360 (`ponerModelo`
  - Arreglo: Meter `fetch(url del glb)` en el `Promise.all` de main.ts (o un `<link rel="preload" as="fetch">` disparado al elegir el avión en el hangar) y pasarle el `ArrayBuffer` a `GLTFLoader.parse`; quitar el `HEAD` (un 404 en el `fetch` se distingue igual).

**Medias**

- **Entre el hangar y el vuelo hay 2–7 segundos de pantalla en negro sin ninguna señal**
  - Dónde: `src/ui/hangar.ts:1342 (`root.hidden = true` antes de resolver) → src/main.ts:213-260 (carga y construcción)`
  - Arreglo: Dejar el hangar visible con una hélice girando (CSS, sin texto) hasta el primer `pintar()`; y repartir la construcción: subir la ortofoto con `renderer.initTexture` después del primer cuadro, construir las nubes solo cuando haya techo, y precalcular en `script.
- **Relieves, ciudad y modelos viajan sin comprimir: 0,6 MB por escenario que podrían ser 0,12**
  - Dónde: `data/terrain/*.bin y data/cities/*.json (importados con `?url`), public/assets/aeronaves/*.glb`
  - Arreglo: Un paso más en `npm run build` (sin dependencias, con `zlib.brotliCompressSync`/`gzipSync`) que deje `.br` y `.gz` junto a cada fichero, y `gzip_static on; brotli_static on;` en el nginx del VPS.
- **La ortofoto se sube a la GPU a 2816²–3072² sin mipmaps**
  - Dónde: `src/world/ortofoto.ts:154-156 (`minFilter = LinearFilter`, `generateMipmaps = false`), data/ortho/*.jpg (2304²`
  - Arreglo: `generateMipmaps = true`, `minFilter = LinearMipmapLinearFilter`, `anisotropy = min(4, renderer.capabilities.getMaxAnisotropy())`; limitar la ortofoto lejana a 2048² (a 8 m/px sobre 18 km son 2.250 px: casi no se pierde nada).
- **Las pantallas de la cabina se repintan y resuben a la GPU 12 veces por segundo aunque se mire desde fuera**
  - Dónde: `src/game.ts:4466-4477 (llamada incondicional) y src/world/pantallas-cabina.ts:41-46, 257-268`
  - Arreglo: Pasarle a `actualizar` si la cámara está dentro (`this.cameraMode`) y saltarse el repintado —o bajar a 2 Hz— cuando está fuera; y solo mientras el modelo tiene pantallas..
- **El terreno, la ciudad y el bosque son mallas únicas del tamaño del mapa: el recorte por frustum nunca quita nada**
  - Dónde: `src/world/terrain.ts:657 (`buildTerrainMesh`, 385² nudos = 295k △), :760-860 (horizonte 87k △), :529-640 (mant`
  - Arreglo: Partir en teselas de 4×4 o 6×6: el terreno en `buildTerrainMesh` (mismos búferes, varios `BufferGeometry` con `drawRange` o índices por tesela), la ciudad fusionando por celda en vez de todo junto, y los árboles en un `InstancedMesh` por especie y celda.
- **El banco de nubes son cinco planos translúcidos de 64 km apilados: la mayor sobrecarga de relleno del juego, y nunca se mide**
  - Dónde: `src/world/sky.ts:380-414 (`nubes`: `capas = 5`, `PlaneGeometry(lado, lado)` con `lado = size*4`, `transparent``
  - Arreglo: Bajar a 2 capas (o una con dos texturas mezcladas en el material) y `side: FrontSide` con la cámara siempre bajo o sobre el banco; generar las texturas al primer `visible = true`; añadir al banco un caso `?metar=` con techo bajo.

### El backlog abierto

> He leído los 95 issues abiertos con sus comentarios (volcados por la API REST, porque `gh issue view` se rompe con los Projects clásicos), los 63 cerrados, los ocho bloques y el #153, y he contrastado cada afirmación de estado contra el código de HEAD (fa3028a): la batería unitaria pasa entera sobre

**Graves**

- **#153, el issue del orden, está consumido: sus tres pasos ya están hechos y el cuarto (bloque C «0 de 9») es falso**
  - Dónde: `Issue #153`
  - Arreglo: Reescribir #153 con el orden nuevo (lo propongo entero en las ideas) y corregir la tabla de #98 a «6 de 9».
- **Siete issues hechos en código y todavía abiertos: #2, #46, #145, #65, #126, #39 y #26**
  - Dónde: `src/flight/gafas.ts (commit ce8869f) · src/flight/aircraft.ts:608,713 · commit 411f3cb («Cierra lo de #145») y`
  - Arreglo: Cerrar los siete con un comentario que enlace el commit.
- **Treinta issues abiertos no cuelgan de ningún bloque, y entre ellos están la tesis del juego y el fallo más grave**
  - Dónde: `Issues #96-#103 (ninguno los enlaza): 158 156 155 145 143 136 135 131 126 123 113 112 111 110 109 108 107 106 `
  - Arreglo: Un bloque I «El avión del pueblo» con #29, #28, #27, #84 y #131; un bloque J «El helicóptero» con #108-#113; #106/#107 a A (son arquitectura del panel); #158, #156, #145 a B; #155 a B con etiqueta `legal`; #22/#23 a H; los de infraestructura (#19, #21, #11, #1.
- **#158 (el turbohélice no despega con ayudas) no lo vigila ningún banco porque el barrido solo vuela Guyrami**
  - Dónde: `scripts/barrido.mjs:27-61 (todas las filas con «guyrami», una sola con avión y también en guyrami: línea 61 co`
  - Arreglo: Añadir al barrido una fila por modelo de vuelo y avión, no por escenario: al menos `[tenerife-norte, taguato, jaz-60]`, `[pettirossi, tuka, jaz-90]` y `[estigarribia, taguato-ruvicha, jaz-120]`.
- **La flota promete distinguirse «por sonido» y el sintetizador tiene una sola receta, la del pistón; el JAZ 60 lleva cylinders: 0**
  - Dónde: `src/audio/audio.ts:495 (`firing = (rpm / 60) * (spec.cylinders / 2)`), :512`
  - Arreglo: Subir #62 al orden, justo detrás de #158.
- **#155 (licencia de EOX) bloquea publicar Pettirossi y está sin bloque, sin etiqueta y fuera del orden**
  - Dónde: `Issue #155`
  - Arreglo: Etiqueta `legal`, meter en el orden como paso 2 con dueño (Oksigenia) y una decisión por defecto si no hay respuesta de EOX en dos semanas: la opción 3 (volar sobre relieve dibujado, como los otros ocho), que además es coherente con «Mundo Tejido» (#37)..

**Medias**

- **Dos taxonomías que se contradicen: los hitos 0.2–0.5 y los bloques A–H**
  - Dónde: `Hitos de GitHub: 0.2.0 (1 abierto: #2, hecho), 0.3.0 (27 abiertos), 0.4.0 (14), 0.5.0 (16)`
  - Arreglo: Quedarse con una: cerrar los hitos 0.2 y 0.3 (lo que queda de ellos se mueve a los bloques) o convertir los hitos en fechas de publicación («granjaoga.com/recorrida, primera versión») y dejar los bloques como temas..
- **Los cinco bloques con contador están desfasados en la misma dirección: computan como pendiente lo hecho**
  - Dónde: `#96 (lista `[ ] #36`, cerrado)`
  - Arreglo: Un guion `scripts/bloques.mjs` que lea los ocho cuerpos, consulte el estado de cada `#N` por la API y reescriba casillas y contador (ver ideas).
- **Contradicción sin resolver: los cantos «V1» y «rotate» van por peldaño, y la matriz y la regla 4 dicen que van por avión**
  - Dónde: `Issue #45, comentario del 08-09: «V one y rotate … van por el peldaño y no por el avión»`
  - Arreglo: Que cada canto tenga dos llaves: el peldaño mínimo (escalera) y un `avisos:` en la ficha del avión (aircraft.ts) que diga si ese avión lo lleva; y un test que recorra la matriz.
- **docs/matriz.md y README describen una flota y un estado que ya no son**
  - Dónde: `docs/matriz.md:20 («JAZ 90 *Kuarahy*», sin columna del JAZ 120 Yvága)`
  - Arreglo: Columna JAZ 120 en la matriz (¿qué enseña que no enseñe el 90? cuatro motores, inercia, pista larga, presurización) y renombrar Kuarahy → Arai; README con nueve aeródromos y las voces; #19 ya lista los cuatro sitios del `og:url`..
- **Tres issues de escenarios se solapan y el más viejo dice «hay dos escenarios» cuando hay once**
  - Dónde: `#14 («Hay dos escenarios, el valle y el Chaco»), #39 (completo salvo la pista de tierra), #115 (selector mundi`
  - Arreglo: Cerrar #14 y #39; un issue «Catálogo de escenarios: los que faltan y lo que cuesta cada uno» con la lista y el coste medido (20 min una isla con el mar arreglado; 2-3 h un paraguayo); #115 se queda como lo que es, un selector para después..
- **La regla de #55 («un número sin procedencia no entra en main») no la vigila ninguna prueba y las fichas no tienen bloque sources:**
  - Dónde: `src/flight/aircraft.ts (cinco menciones a CR-/NASA en comentarios`
  - Arreglo: Añadir `sources: { cl0: "CR-96008 p.12", ...

### Los issues cerrados

> He revisado los treinta y tantos issues cerrados más recientes o más prometedores (157, 154, 151, 150, 149, 148, 147, 146, 144, 142, 141, 140, 139, 138, 137, 134, 133, 132, 130, 129, 128, 127, 125, 122, 121, 119, 116, 114, 105, 104, 94, 86, 85, 64, 61, 57, 54, 47, 43, 42, 38, 36, 34, 33, 32, 24, 20,

**Graves**

- **#148 se cerró y verificar-rodaje.mjs sigue sin poder fallar: imprime, sale con 0 y nadie lo lanza**
  - Dónde: `scripts/verificar-rodaje.mjs (todo el fichero`
  - Arreglo: Convertirlo en banco de verdad: umbral por escenario (por ejemplo «en el aire ≤ 5 de 600 fotogramas y se levanta < 0,25 m»), lista de `comprobar(...)`, `process.exit(1)` si falla, entrada `"rodaje"` en package.json y que el barrido o un `npm run bancos` lo enc.

**Medias**

- **#128 y #146: la escalera de asistencia de rodaje no se lee, y el banco la da por buena porque acepta el empate**
  - Dónde: `scripts/verificar-asistencia.mjs:288-296 (`medido.tuka <= medido.taguato + 0.2`), src/game.ts:4972-4999 (`asis`
  - Arreglo: Decidir la promesa medible de cada peldaño y escribirla como umbral estricto (p.
- **#86 cerrado con las órdenes de frustrar y el percance «ocupada» encendidos en Guyrami, contra lo que dice la matriz**
  - Dónde: `src/flight/la-aproximacion.ts:58 (`UNA_DE_CADA = 0.25`), :277 (sorteo sin mirar el peldaño), :323-410 (`mirarL`
  - Arreglo: Meter la decisión en `escalera.ts`: en Guyrami la vaca puede salir (es graciosa y enseña) pero sin `peligro`, sin percance y con la torre levantando la orden en cuanto se toca; en Tukã orden y felicitación; en Taguato la altura de decisión.
- **#154 y #157: el sígame no tiene ni una prueba unitaria; lo que se prometió vive solo en un banco de diez minutos**
  - Dónde: `src/world/sigueme.ts:319 (`aparte`), :333 (`yaSeAparto`), :121 (`SITIO_PARA_LA_BICI`), :360-384 (`ponerRuta` y`
  - Arreglo: `src/world/sigueme.test.ts` con cuatro casos: `ponerRuta` con `aparte` a 1 lo conserva; `yaSeAparto` con el avión a 8 m no se cuenta como atropello (la cuenta está en game.ts:4810, sacarla a una función pura); la bici de frente a 14 m/s de cierre queda ≥ 9 m d.
- **#147: «se toca cerca del eje y dentro de la pista» acepta tocar en el último cuarto de la pista de Granja Óga**
  - Dónde: `scripts/verificar-vuelo-entero.mjs (comprobación «se toca cerca del eje y dentro de la pista»)`
  - Arreglo: Añadir «y en el primer tercio en pistas de menos de 1.200 m» (umbral en metros, no en porcentaje, para que Estigarribia no lo herede) y que el piloto apunte la senda a la diana que el juego ya pinta en vez de al filo; de paso sale gratis el galón de aproximaci.
- **#141 se cerró «hecho y en producción» con la ortofoto de Pettirossi bajo una licencia que CREDITOS.md declara sin resolver**
  - Dónde: `CREDITOS.md:54 («Sentinel-2 cloudless — EOX… **Sin resolver.**») y :56`
  - Arreglo: Mientras #155 no se cierre, mover `pettirossi-lejos.jpg` fuera del despliegue (o cambiar la fuente a Sentinel-2 L2A directo del Copernicus Data Space, cuya licencia sí se puede anotar literal).

## Las ideas

Cuatrocientas tres, quitadas las repetidas. Van agrupadas por lo que dan frente
a lo que cuestan, que es el único orden útil cuando hay tantas. El número de
issue es con el que engancha; «nuevo» quiere decir que no existe todavía.


### Mucho valor, poco coste — por aquí se empieza · 84

- **Panel de rendimiento: la pista que hace falta contra la pista que hay** · #91
  Un panel instrumento con dos barras horizontales: la pista del aeródromo (gris, con el número) y la que necesita este avión hoy (verde si cabe, rojo si no), que crece con la temperatura del parte (`meteo.temp`, hoy sin uso), la al
- **El ala en vivo: un botón «lo de ahora» y el esquema que sigue al vuelo** · #40
  En el panel del ala, un botón con el avión que pone los tiradores en el alfa y la velocidad que llevaba el avión al abrir (`flight.state.alpha`, `airspeed`), y un modo en el que, si se abre como instrumento (`congela: false`), el 
- **El selector de idioma se oye: tocar «Avañe'ẽ» lo dice en guaraní** · #6
  Los tres botones de idioma del hangar (`hangar.ts:1118-1125`) son solo texto: «Español», «Avañe'ẽ», «English». Un prelector no puede elegir idioma. Propuesta: al enfocar o tocar cada botón suena su nombre en su propia lengua (tres
- **Repaso de registro paraguayo con lista cerrada y un hablante** · #6
  Enviar a alguien de Paraguay (Granja Óga tiene gente) `es-PY.ts` con las 328 líneas y una pregunta por línea: «¿así lo dirías vos?». Antes, corregir lo evidente (gafas, coche, morro) y marcar las dudosas: «aparato», «bicho», «Ajus
- **Alabeo y retardo de mirada en la cámara de detrás: que el mundo se incline** · nuevo
  La cámara de cola alabea un 35 % del alabeo del avión y su punto de mira se suaviza (arregla también el tirón de 12,7°). En picado y encabritado, cabecea un 20 %. Todo a cero con movimiento reducido.
- **La sensación escala con cada avión: traqueteo, retroceso, ángulo y viento por ficha** · nuevo
  Las referencias de velocidad pasan a ser fracciones de `rotationSpeed`/`cruiseSpeed` del avión, y las amplitudes de cámara son proporcionales a la distancia de la cámara. Prueba que recorre los seis y exige los mismos píxeles de t
- **Nubes que pasan, y entrar en una funde a blanco** · #9
  Recentrar el banco por baldosas para que las nubes queden en el mundo, deriva lenta con el viento, y al cruzar una capa subir la densidad de niebla hacia el color del horizonte (funde a blanco, sale el sol al otro lado). Cúmulos s
- **El toque de ruedas se ve y se nota: hundimiento de cámara, pico de traqueteo y vibración del mando** · #22
  Al tocar, la cámara se hunde `0,05·sinkRate` m y vuelve en 0,3 s; el `shake` salta a 1 y decae; y si hay mando con `vibrationActuator`, un pulso proporcional a la velocidad de descenso. Lo mismo, en suave, para la pérdida (pulsos 
- **Banco de reparto de voces contra el paquete de producción** · nuevo
  Extender `verificar-voz.mjs` para (a) servir `dist` con `vite preview` además de dev y exigir que el manifiesto cargue; (b) volar un circuito en Pettirossi y contar `decir` por emisor, fallando si torre u otro avión dan cero o si 
- **Detalle del suelo a menos de 500 m: la textura que falta para rodar** · nuevo
  Una textura de detalle procedimental (ruido tileable de 512 px generado en un lienzo, como ya se hace con las nubes) multiplicando el color del terreno en un `onBeforeCompile` del `MeshLambertMaterial`, con desvanecido por distanc
- **Mundo Tejido, redefinido: lo tejido es lo nuestro, el suelo es Paraguay** · #37
  Reescribir el issue 37 y el párrafo de `docs/vision.md:51-56` en una decisión (ADR 0007): el suelo es el país de verdad (Copernicus + Sentinel-2 + OSM), y «Mundo Tejido» pasa a ser el lenguaje de todo lo que dibujamos nosotros: el
- **«Jasy»: el primer vuelo de noche, con las luces de rodadura y el PAPI como única guía** · #50
  Misión que arranca a las 21:00 (`?hora=` y `sky.ponerHora` ya existen; `luces-de-rodadura.ts` también): despegar, un `reach` sobre las luces del pueblo y volver a aterrizar buscando la pista por sus luces y el PAPI. En Guyrami el 
- **«Tres toques»: aterrizar, despegar y volver tres veces sin salir del circuito** · #25
  Un `Objective { kind: 'touchAndGo' }` repetido tres veces y un `land` final. El circuito ya se dibuja en Guyrami/Tukã y se escala por avión. En Taguato hay que sabérselo.
- **Guyrami termina en la primera plataforma y el hangar nuevo abre en Yvytu Rape** · #156
  Dos decisiones del issue 156 tomadas: (a) para un perfil nuevo, `sitio` inicial = Yvytu Rape y no `SCENARIOS[0]`; (b) en Guyrami, la ruta de vuelta va a la plataforma más cercana a la salida de pista, no al puesto de casa, y el se
- **«Otra vez» sin salir del juego: repetir la aproximación con un botón grande** · nuevo
  En la lección «Aterrizar» y en «Tres toques», al tocar y frenar aparece un botón redondo con la flecha circular (sin palabras): pulsarlo llama a `reiniciarEnFinal()`. En Guyrami, si no se pulsa nada en diez segundos de juego (agen
- **Las señales OACI que faltan: «este es tu puesto», «calzos» y «cortá motores»** · nuevo
  Tres posturas nuevas en `POSTURAS` y tres dibujos en `senal.ts`: brazos rectos arriba mientras el avión viene de lejos, bastones juntándose por encima de la cabeza al parar, y el bastón cruzando la garganta en «en-puesto». Quitar 
- **«¿Cabe en esta pista?» en el hangar, con una barra y sin una letra** · #91
  Al elegir avión y aeródromo, una barra horizontal con la pista a escala y encima la carrera que este avión necesita (`carreraHastaVr·2,4` de `carrera.ts`) en verde si cabe y ámbar si no, con el pictograma del avión al final. En Gu
- **Guardas de flota en el banco: T/W por clase, cabe en la pista más larga, medio recorrido no pierde** · #57
  Tres pruebas cortas en `prestaciones.test.ts` que hoy no existen y que habrían cazado los tres hallazgos grandes: (1) empuje/peso estático dentro de la banda de su clase de motor; (2) cada avión se va del suelo, limpio y con flaps
- **El velo 1 hoy mismo, en el mapa que ya existe: cabecera en uso, aros y circuito** · #77
  Pintar en la capa «encima» del mapa (mapa.ts:284-422) tres cosas que el juego ya tiene calculadas: el umbral en uso en verde con flecha, la hilera de aros de la senda (posiciones en RunwayGuide.rings, userData.distancia) y los vér
- **Frecuencias y radioayudas al .aero.json desde OurAirports, y las radioayudas de verdad puestas en el mundo** · #75
  Extractor: bajar navaids.csv y airport-frequencies.csv, escribir `navaids` (ident, tipo, kHz, xy local, cota) y `frequencies` (TWR, GND, APP, AFIS…). Mundo: un cono blanco con su rótulo donde está el VOR VAS de Asunción (522 m del
- **Lo que no merece la pena del plan, y por qué** · #100
  (1) Rasterizar la carta a textura para una tablet en el salpicadero (#76, «dónde vive»): el panel entero (#106) ya está dibujado como pantallas de cabina y nadie de 4 a 14 años va a leer una carta a 512 px en un salpicadero; sobre
- **Objetivos de misión nuevos: volar el circuito, toques y despegues, y aterrizar en otro sitio** · #29
  Tres tipos más en `Objective` (types.ts:27): `{ kind: 'circuito' }` (pasar por subida→cruzado→encola→base en orden; `Circuito.tramoEn` ya lo sabe), `{ kind: 'toques', veces: 3 }` (tocar, dar gas y volver a despegar N veces: la tar
- **El «¿cabe?» del hangar: un pictograma por avión y sitio sacado de carrera.ts** · #91  
  Al lado de cada ficha de avión, un dibujo pista/avión: verde si carreraHastaVr(a, superficie)·1,2 cabe, ámbar si cabe justo (la lección de #91) y tachado si no; y la ficha del sitio muestra la longitud como una barra proporcional 
- **Banco de maqueta en Blender: mide y fotografía cada avión sin abrir el navegador** · nuevo
  `modelos/verificar.py` que carga cada `.glb` en Blender sin ventana y comprueba lo que hoy se cuela: que el punto más bajo sea una rueda, que patas y montantes midan más en Y que en Z, que el cono de hélice mida más en Z que en Y,
- **Que el fumigador parezca fumigador: tolva, barras de aspersión y rueda de cola** · #   29
  En el Mainumby, la tolva (un lomo abultado entre el motor y la carlinga, que es lo que un Ag Cat tiene en vez de plazas), las dos barras de aspersión bajo el ala baja con sus boquillas, una rueda de cola de verdad en el patín, y l
- **Flecha de tendencia de velocidad en la cinta IAS, para quien no lee números** · nuevo
  Junto a la aguja de velocidad, una flecha que crece hacia arriba o hacia abajo con la aceleración prevista a 10 s (lo que hace el vector de tendencia de cualquier PFD), en pictórico desde Tukã.
- **Ganancias del compensador sacadas de los modos de cada avión, y una prueba de manos fuera por tramo** · nuevo
  `climbHold` y `wingLeveller` con ganancias normalizadas por el corto período y la convergencia de alabeo que `referencia.ts` ya calcula para cada ficha; y una prueba por avión y tramo: 90 s con las manos fuera, n entre 0,8 y 1,2, 
- **Arcade honesto con la flota: aceleración y viraje por avión** · nuevo
  En el modelo sencillo, la aceleración en tierra sale de la ficha (T/W y rozamiento, o directamente de `carreraHastaVr`) y el ritmo de viraje de la inclinación dibujada (`g·tan(φ)/v`). El resto queda igual.

_Y 56 más de este grupo en el diario del run._

### Mucho valor, coste medio · 125

- **Viento de verdad en el motor, con deriva que se ve y una manguita en el HUD** · #35  92
  Restar el campo de viento en `integrate` (uniforme por ahora, con perfil por altura), leer las ráfagas del METAR (`G22` ya se captura en `meteo.ts:331` y se tira) como `rachaKt`, y poner en la esquina del HUD una manga pequeña que
- **El plano se vuelve carta viva: cabecera, circuito, raya verde, senda y tráfico** · #100  77
  Sobre el mismo mapa: punta de flecha en el umbral por el que se entra, el rectángulo del circuito en puntos (con la mano izquierda/derecha correcta), la raya verde del plan de rodaje, los aros de la senda en amarillo, y, cuando ex
- **Checklist en pictogramas que se encienden solos** · #79  81
  Una fila de fichas (cinturón, frenos, flaps, motor, luces, «pista libre») que se encienden cuando el estado real del avión lo cumple, y el instructor lee cada una al encenderse. Dos listas: antes de despegar y antes de aterrizar. 
- **El veredicto: un fichero que dice si un avión cabe en un campo y por qué** · #91
  `src/flight/cabe.ts` con `cabeEn(avion, escenario, meteo?) → Veredicto`: `{ despegue: {necesita, hay}, aterrizaje: {necesita, hay}, ancho: {pista, calle, minimo}, puesto: boolean, global: 'cabe' | 'justo' | 'no' }`. «Hay» es la pi
- **Contarlo sin palabras: el avión que se sale de la pista** · nuevo
  En la ficha de cada avión (`fichaDeAvion`, hangar.ts:494), debajo del retrato, la pista del sitio elegido como una barra a escala en el color de suelo del escenario, y encima **lo que necesita ese avión** como un tramo en su color
- **Y al revés: en cada campo, con este avión, cómo se vuela** · #92
  La misma barra en la ficha de sitio (`fichaDeSitio`, hangar.ts:420) cuando ya hay avión elegido, y una tira de tres pictogramas de condiciones que crece con el peldaño: **pista** (barra necesita/hay), **viento** (la manga de `ui/m
- **El banco recorre la matriz entera y comprueba que la regla no miente en ningún sentido** · #158
  `scripts/barrido.mjs` con el par avión×campo: para cada par que el veredicto dice «cabe», el vuelo entero tiene que completar despegue y aterrizaje; para cada «no cabe», el despegue tiene que acabar en «pasada» o el aterrizaje sal
- **Todo lo que se abre se dice: el título de cada panel, hablado en Guyrami** · nuevo
  `armarPanel` en `ui/concha.ts` es la única puerta por la que pasan pausa, ajustes, créditos, cuaderno, misión, ala y teclas. Añadirle que, al abrirse, el instructor diga el título (`pausa.titulo`, `ajustes.titulo`, `cuaderno.title
- **Cada avión con su postal: el nombre guaraní, dibujado y dicho** · #53
  En la ficha del hangar (`hangar.ts:484-510`) aparece el retrato del avión y el nombre «Pykasu». Añadir en una esquina el dibujo de lo que nombra —una paloma, un colibrí, una mariposa, un rayo, una nube, un cielo— y que al elegirlo
- **Un poco de aire: turbulencia ligera por peldaño, antes del campo de viento completo** · #82
  Ruido 1/f en tres ejes sumado como viento en `fdm.ts:329`, con amplitud por peldaño (Guyrami 0,3 m/s, Taguató 1 m/s, arriba 2 m/s), más fuerte a baja cota con sol alto y sobre campo seco, más suave sobre el río. El HUD no cambia; 
- **La cabina se siente: bote de rodadura, cabeza que se hunde con la g, y la palanca que se mueve** · nuevo
  En `CamaraDeDentro`: el mismo traqueteo que fuera pero en ejes cuerpo (2-4 cm), la cabeza baja 3 cm por cada g por encima de una y sube al aligerar (empuje negativo), un latido de 10 Hz en pérdida sincronizado con el bataneo sonor
- **Receta mínima de turbina para que los tres grandes tengan nota** · #62
  Para `turboprop`: tono de pala casi constante y volumen que sube con el gas (como manda #62). Para `turbofan`: tono de fan (`rpm/60·palas`), ruido de chorro con paso bajo que se abre con el gas, y buzz-saw por encima del 85 %. Sin
- **Un locutorio con cuatro sillas: cada voz grabada tiene su emisor y su suplente** · #126
  Sustituir los tres campos de game.ts (instructor, vozDelSistema, otroAvion) por un `Locutorio` que reparte cada clave por prefijo al pack que toca —instructor, cabina, torre, otro—, cada uno con su suplente de navegador (timbre y 
- **La torre manda y el instructor calla: la primera lección de radio** · #48
  Cuando la lámpara cambia, habla la torre (grabada, con chasquido y filtro) y el instructor no repite la orden; solo interviene si el niño no obedece en unos segundos («¿Oíste? Podés entrar»). En Ruvicha, colación: el jugador conte
- **Trocear lo que cambia: nombre del avión y número de pista en la radio** · #126
  Piezas de hueco `{avion}` (seis nombres) y `{pista}` (los dígitos cero-nueve dichos como en radio: «cero dos», «uno cinco») para que el otro avión diga «Buenos días, Pykasu» y «viento en cola pista cero dos», y la torre «pista cer
- **Mosaico Sentinel-2 propio para los siete escenarios paraguayos** · #155
  Un script `sentinel-a-ortofoto.mjs` que baje una escena L2A sin nubes del Copernicus Data Space Ecosystem (registro gratuito, API STAC), recorte el cuadrado del escenario y del anillo a 10 m/px, aplique el true-color (B4/B3/B2 con
- **Agua con vida: orilla, ondas y el color del cielo** · nuevo
  Sustituir la lámina Lambert por un `ShaderMaterial` pequeño: color por profundidad (la cota del terreno bajo cada vértice de la lámina ya se puede muestrear al construirla → verde-turbio en la orilla, azul-oscuro en el centro), do
- **Parcelario ao po'i desde OSM: los cultivos como parches de color** · #37
  En el extractor de ciudad, bajar `landuse=farmland|forest|meadow|orchard` y guardarlos en la rejilla (ya hay `clase` por celda; añadir clases 5–8) o como polígonos simplificados; en `colourFor` teñir el vértice por clase con una p
- **Sombras que cuentan la hora: el avión, el aeródromo y las nubes** · #9
  Un `shadowMap` pequeño (1024, `PCFSoft`, frustum ortográfico de 300 m que sigue al avión) para que el avión proyecte sombra sobre la pista y los edificios del aeródromo la reciban —`aerodrome.ts:695-706` ya marca `castShadow`/`rec
- **Árboles con silueta propia hechos en Blender, como la flota** · #37
  Sustituir los octaedros por seis mallas glTF de 80–150 triángulos generadas con guiones en `modelos/arboles/*.py` (lapacho de copa irregular y ramas visibles, samu'u con el tronco panzudo de verdad, karanda'y con hojas en abanico,
- **Tres misiones de Yvytu Rape: «La vaca que se escapó», «La chipa a la escuela» y «La vuelta al tajamar»** · #29
  Las primeras misiones del campo de la granja, medidas sobre `data/terrain/yvytu-rape.bin` como las de Pettirossi. (1) «La vaca que se escapó»: dos `reach` con techo de 80 m sobre los potreros —el modelo de vaca (`world/vaca.ts`) p
- **«Seguí al coche»: una misión de rodaje en la que el sígame te lleva a otro puesto** · #145
  Misión solo de tierra: el coche del sígame sale del puesto y te lleva por las calles hasta una plataforma distinta (Pettirossi tiene varias; Guaraní también), donde el señalero te para con los bastones. Tres etapas: seguir, parar 
- **«Niebla sobre el Ypacaraí»: la misión de la frustrada** · #29
  Se empieza en final (arranque `aire`) con `meteo` de visibilidad baja: la pista no se ve hasta muy tarde. `minimos.ts` ya pregunta «Mirá la pista: ¿la ves?». Si no se ve al llegar a mínimos, lo correcto es irse al aire (`frustrada
- **La pantalla de misión cumplida: la ruta que acabas de volar, con sello** · #25
  Al terminar una misión, en vez de un flash de cinco segundos, la misma pantalla que el ascenso: la traza real del vuelo dibujada sobre el plano del campo (la bitácora ya la guarda; el hangar ya dibuja rutas), el avión con el que s
- **Sellos como datos: dieciséis predicados sobre lo que el juego ya mide** · #25
  `src/content/sellos.ts` con una lista de sellos, cada uno con dibujo y un predicado puro sobre `{ cuaderno, vuelo, hechos }`: ¡Veve! (primer despegue), Karumbe (rodar sin salirse: galón `rodaje` la primera vez), Mainumby (10 s en 
- **Señaleros de punta de ala para el Arai y el Yvága** · nuevo
  Con los dos aviones grandes, además del señalero del puesto salen dos figuras en los extremos del puesto, a la envergadura del avión, con los bastones en alto (es la señal 1 del Apéndice 1: «wingwalker»), y bajan los bastones cuan
- **Los personajes en Blender con la misma cadena que la flota** · nuevo
  `modelos/personajes.py` con un cuerpo base (cabeza con piel, casco, chaleco, brazos como nodos `hombro_izq`/`hombro_der`) y variantes por color y accesorio: señalero, la de la bici, el de la escalerilla, el de repostar, dos bomber
- **El de la escalerilla y los pasajeros que bajan** · #79
  Al llegar a «apagado», una escalerilla (o el mismo coche con remolque en los campos pequeños) se acerca al lado izquierdo, se abre la puerta y bajan tres o cuatro figuras pequeñas que saludan y se van hacia la terminal o hacia la 

_Y 97 más de este grupo en el diario del run._

### Mucho valor, coste grande — los saltos de verdad · 28

- **Peso y centrado con una balanza que se toca** · #91
  Pantalla con la silueta del avión de lado sobre una balanza: se arrastran siluetas de pasajeros, maletas y bidones a los asientos y a la bodega; el avión se inclina hacia el morro o la cola, una aguja recorre el arco de centrado (
- **Misiones para los grandes: el viaje de un aeropuerto a otro** · #46
  Hoy un vuelo es un escenario (`abrirHangar` devuelve uno). Las misiones de los JAZ 90 y 120 no son «ir al cerro y volver»: son **Asunción – Ciudad del Este** (Pettirossi → Guaraní) y **Tenerife Norte – La Palma** (solo para 40 y 6
- **Voz de instructor en guaraní, grabada por una persona** · #6
  El LEEME de voces dice que «el guaraní no entra» porque no hay sintetizador; pero el pack ya se graba con personas por ElevenLabs y el mecanismo por manifiestos admite un pack por idioma. Grabar las 83 frases del instructor en gua
- **Hitos modelados a mano: tres por escenario paraguayo** · #28
  Palacio de López y el puente Remanso en Pettirossi; la presa de Itaipú y los saltos del Monday en Guaraní; el puente San Roque y la costanera en Encarnación; el cerro Corá en Pedro Juan; el hangar y la casa de la granja ya están e
- **Los bomberos: el arco de agua y el que no pasa nada** · #143
  Dos camiones (chasis del sígame, rojos) a los lados de la calle de rodaje de vuelta, con dos arcos de agua de partículas que se cruzan sobre la raya, la primera vez que aterrizás un avión nuevo de la flota y a las N horas de la li
- **Un planeador en la flota: JAZ 10, remolcado por el Mainumby** · nuevo
  El hueco por debajo del 20 es suyo: un planeador de escuela de dos plazas (clase ASK-21: 360 kg, 17,9 m² , 17 m, planeo 34:1; datos de vuelo públicos en su TCDS EASA A.221) con nombre de ave planeadora en guaraní. Sin motor: la pa
- **El mapa del tesoro: planificar la ruta con el dedo sobre la carta antes de despegar** · #38
  En el velo 3, arrastrar el dedo por la carta deja una cadena de puntos (el puente, el cerro, el lago) que se convierte en los objetivos «reach» de una misión propia. En vuelo, la carta dibuja la traza real encima (ya existe en fin
- **El viaje: de Encarnación a Posadas (o de Guaraní a Foz, de Cuatro Vientos a Getafe, de Tenerife Norte a Tenerife Sur)** · #  14, 39, 115, 29
  Un tipo de escenario nuevo, `Ruta`, con dos aeródromos sobre un mismo corredor de terreno, y un objetivo de misión `aterrizarEn: 'SARP'`. Pares reales y cortos, calculados con las coordenadas de los .aero.json y las de OurAirports
- **Copiloto en la misma tablet** · #27
  Un modo «de dos» en el que el niño lleva solo la palanca (vision: Mainumby «solo el morro») y el adulto, en el lado derecho, gas, freno y flaps con pads propios más una lupa de señalar; los dos se ven en pantalla con su escarapela
- **Tocá el mundo y se nombra** · #28
  Tocar el río, un cerro o el pueblo en la vista (raycast) dibuja una onda, dice la palabra en guaraní y castellano y la tarjeta con su dibujo entra en un álbum del cuaderno. Sin misión ni premio que exigirlo.
- **Fase 2 · `comun.py` deja de tener una cabina y pasa a tener piezas: cuadrante, pedestal, yugo, esferas, pantallas, flaps, tren, overhead** · #98
  Sustituir `cabina()` por `cabina_base()` (suelo, panel inclinado 12-15°, visera a la altura que diga la clase, sillas con el nombre `asiento` en la plaza izquierda) más piezas con nombre fijo que el juego pueda buscar: `cuadrante_
- **Fase 4 · Encender por peldaño y tocar para que diga su nombre** · #107
  Cada pieza de panel tiene un estado `dormida | viva` que decide el peldaño (Guyrami: gas, horizonte, altura y motor vivos; Tuká: + rumbo, flaps; Taguató: + V/S, tren, hélice/mezcla; Ruvichá: todo). Una pieza dormida se dibuja igua
- **El refactor que más alivia, en el orden que no rompe nada** · #30
  Terminar los cortes de #30 que quedan, pero empezando por los que arreglan hallazgos de arriba y dejando cada paso en verde antes del siguiente: (1) `flight/unidades.ts` y unificar `ENTRADA_EN_FINAL`/`SENDA`/`APROXIMACION_DEL_ENTR
- **El bucle de juego propuesto: repetir, crecer, coleccionar, sorprender** · #25
  Un bucle explícito de cuatro capas sobre lo que ya existe. Se repite: el vuelo completo (puesto → circuito → puesto), que ya es bueno. Crece: el avión (mandos que se encienden, #107) y la flota (habilitaciones). Se colecciona: sel
- **Copiloto en la misma tablet: la niña lleva el morro, el adulto los gases** · #27
  Segundo jugador táctil sin pantalla nueva: la palanca izquierda es de la niña (morro y alabeo), la derecha del adulto (gases, flaps, frenos). Un botón grande «tus mandos / mis mandos» cambia quién lleva el morro, y la voz del inst
- **El salto en crucero: que el reactor y el Yvága tengan a dónde ir** · #  46, 84, 93
  Un vuelo entre dos aeródromos del juego (SGAS → SGEN, por ejemplo) con la fase de crucero como un paso de tiempo sobre el anillo lejano —el mapa de 132 km ya existe— y la llegada en el mapa fino del destino.
- **La tormenta por capas, y en este orden** · #49
  (1) El cúmulo que se enciende sobre la térmica, que llega con la segunda mitad de #35. (2) Rayo y trueno con cuenta de segundos, con tope de destellos y apagable. (3) El reventón como un término más del campo de viento. (4) La mis
- **El bucle: una tarde en la granja** · nuevo
  Definir y construir el bucle de juego alrededor de Yvytu Rape como casa. Se REPITE: un vuelo de cinco minutos (arrancar, rodar medio minuto, despegar, un circuito, aterrizar, apagar). CRECE: el avión (los mandos que se encienden, 
- **El JAZ 20 de casa y el panel entero apagado** · #106
  Modelar el Pykasu con los guiones de Blender como el resto (ala alta, tren fijo, seis esferas), retirar el modelo ajeno y, con él, empezar #106: la cabina completa dibujada en los cuatro peldaños y en Guyrami solo tres instrumento
- **El refactor que más alivia, en nueve pasos que no rompen nada: de `unPaso` a un índice, y de `Game` a un ensamblador** · #30
  No es «partir `game.ts` en ficheros», que ya se ha intentado y cuesta 300 líneas por commit. Es cambiar el orden: primero dar a `Game` los métodos que le faltan para no reconstruir a medias, luego convertir el bucle en un índice d
- **La lógica de decisión de `game.ts` sale a funciones puras con sus siete casos** · #30
  `queSePercance(...)`, `puedeTocar(...)`, `tocoEnElCampoDeVuelo(pista, x, z)` y `sePasoDelFinal(pista, rumbo, x, z, airspeed)` en `flight/percance.ts` y `flight/toma.ts`, con pruebas de mesa; `game.ts` solo las llama. Y pruebas de 
- **El laboratorio como capa de ambiente sobre lo que ya hay** · #41
  Un `Ambiente {densidadAlSuelo, gravedad}` que sustituye a las constantes de atmosphere.ts, cinco deslizadores (masa, superficie, densidad, gravedad, potencia) que sobrescriben la ficha en caliente, los cuatro preajustes honestos, 
- **El mundo se nombra en guaraní: las primeras diez palabras** · #28
  Diez palabras que ya tienen objeto en el mundo: ysyry (río, lámina de agua del terreno), yvyty (loma, celdas por encima de un umbral), ka'aguy (bosque, densidad de vegetación), tape (camino, de `ciudad.ts`), óga (casa), pista, ara
- **El mando entero: botones, calibración por movimiento y hangar recorrible** · #22
  Mapa de botones del mando junto al de teclas; calibración sin texto («mové lo que quieras usar para subir» con el avión cabeceando en pantalla, se asigna el eje que más varía) guardada por `pad.id`; todos los dispositivos conectad
- **El helicóptero, en el orden que no se atasca** · #108
  Antes del modelo (#109): (1) `puntoDeToma` en `.aero.json` desde `aeroway=helipad` y una plataforma marcada con la H de verdad; (2) una senda vertical en `plan-de-vuelo.ts` que sustituya al circuito; (3) `FlightState.fuerzas` para
- **El correo aéreo de 1929: un avión de época que une #84, #131, #50 y #53** · #84
  Un séptimo aparato fuera de la serie JAZ: un biplano de correo genérico (silueta de familia, que es libre), sin radio ni instrumentos de vuelo a ciegas, y un escenario del lago Ypacaraí con San Bernardino y el Cerro Patiño sobre r
- **El refactor que más alivia: terminar los cortes de #30 en el orden que menos riesgo tiene** · #30
  Ocho pasos, cada uno un commit que no cambia comportamiento y que los bancos y las pruebas vigilan: (1) `flight/guion.ts` — tabla `POR_FASE` con atributos y `fasesQue()`; sustituye las nueve listas (game.ts:349, 561, 4611, 4715-47
- **Vuelo entero sin navegador: el piloto del banco en TypeScript contra el FDM y la máquina de fases** · nuevo
  Extraer las leyes del piloto (subirDeVerdad, aLaAltura, alRumbo, timon, el circuito por vértices) a `src/dev/piloto-de-banco.ts` y correr en Vitest un `describe.each(TIERS × AIRCRAFT)` que despegue, vuele el circuito y aterrice us

### Valor medio y baratas · 99

- **Banco del mapa que mira píxeles, no solo capturas** · nuevo
  Convertir `ver-mapa.mjs` en `verificar-mapa.mjs`: leer del lienzo el color en la esquina (no puede ser agua en un escenario de interior), que el umbral en uso tenga la marca, que la flecha esté donde está el avión, y el tiempo de 
- **Las misiones de siempre saben para qué avión son** · #29
  Regla calculada, no lista a mano: una misión vale para un avión si cada radio de aceptación es al menos un cuarto del radio de viraje a Vref y los puntos distan más de dos radios. Las que no valen se atenúan en «¿A qué jugás?» con
- **Pesado, caliente, alto y corto: la temperatura del día en el veredicto** · #91
  El FDM es ISA pura; la meteo de la partida ya trae METAR real (`pedirMetar`). Con la temperatura del parte, la densidad del campo cambia (a 35 °C en Asunción, un 7 % menos) y la barra de pista del hangar se alarga. Es el cuarto en
- **Una prueba que cierra la matriz avión × campo × misión × lección en `docs/matriz.md`** · nuevo
  Un tercer eje en la matriz —el campo— generado desde `cabe.test.ts` (un guion `scripts/matriz-de-cabida.mjs` que vuelque la tabla en markdown), para que el documento no pueda discrepar del código: qué avión se ofrece dónde, con qu
- **El cuaderno de vuelo con dibujos en vez de glosas** · #25
  `cuaderno.ts:66-90` muestra cinco cifras con una palabra debajo («horas», «despegues», «aterrizajes», «frustradas», «aeródromos») y un párrafo «Para Piloto te falta: 3 × aterrizajes». Cambiar las glosas por pictogramas (reloj, avi
- **Prueba que impide que un texto de producto cite una marca real o un nombre retirado** · #69
  Una prueba en `i18n.test.ts` (o en `meta.test.ts`, que ya mira ficheros) con una lista de palabras que no pueden aparecer en `es-PY.ts`, `en.ts`, `gug.ts`, `index.html`, `manifest.webmanifest`, `llms.txt` ni en `docs/voces/guion-*
- **Guion de normalización y prueba de forma del guaraní** · #6
  Un test en `i18n.test.ts` que compruebe reglas de forma del guaraní que no necesitan hablante: un solo carácter de puso en todo el fichero, que las nasales lleven la tilde que les toca en las palabras repetidas (`pistápe`, `ko'ápe
- **Preguntar al hablante por Yvága y por Arai, antes de que los nombres se asienten** · #6
  Dos nombres de la flota merecen una pregunta concreta al revisor nativo. *Yvága* significa cielo, pero en el uso paraguayo carga sobre todo con el sentido de «cielo» religioso (*Ñande Ru yvágape*); para el cielo físico lo cotidian
- **Referencias cercanas en la carrera: postes, conos y matas a lo largo de la pista** · #34
  Una `InstancedMesh` de postes de borde cada 60 m, conos en las intersecciones y matas/termiteros en la franja de hierba (a tamaño real, no fijo), fuera de la franja de seguridad que ya respeta la vegetación.
- **El motor se acopla al aire: vueltas con la velocidad, y la hélice con el interruptor** · nuevo
  En hélice de paso fijo las vueltas suben con la velocidad (molinete) y caen al encabritar; el tono del motor baja un poco al subir el morro y sube en picado con gas cerrado. Y la hélice visual solo gira con motor encendido, con de
- **Sombra que se va con el sol y sol que deslumbra en final** · #2
  Desplazar la mancha de sombra según `sky.sunDirection` (a 22° de altura solar la sombra real está a 2,5 veces la altura de distancia) con un tope para que siga siendo referencia cerca del suelo; y un velo suave de deslumbre cuando
- **Quién habla, dibujado: tres caritas que se encienden** · #75
  Tres pictogramas fijos en el HUD —instructora, torre, otro avión— que se iluminan mientras dura cada voz, y en Guyrami sustituyen al subtítulo de radio. Con el otro avión, el picto de lo que está haciendo (rodando, en cola, final,
- **Portadora de fondo mientras hable la radio** · nuevo
  Un siseo de banda estrecha (300-3400 Hz, muy bajo) por el bus de avisos que se abre con el chasquido de apertura y se cierra con el de cierre.
- **Chirrido de ruedas proporcional a la toma** · #79
  Al tocar, un chirrido corto de neumático cuya fuerza y duración salen de la velocidad vertical en el contacto: casi nada en una toma suave, largo y agudo en una dura.
- **Nubes que van con el viento y cúmulos donde hay térmicas** · #35
  Además de arreglar el anclaje (hallazgo 4): desplazar las láminas con `Meteo.vientoDe/vientoKt` para que las nubes crucen el campo a la velocidad real, y sobre el terreno de tierra colorada/ciudad a mediodía sembrar cúmulos indivi
- **Banco de rendimiento con GPU real y presupuesto por capa** · nuevo
  Un banco que corra en un Android de aula por depuración remota (o en un PC con GPU con `--use-gl=egl`) y registre ms de cuadro, draw calls y triángulos por capa (`terreno`, `horizonte`, `agua`, `arboles:*`, `edificios:*`, `nubes`)
- **«¿Cuál cabe?»: la flota como lección de pista, con el número de `carrera.ts` en la ficha** · #107
  Una misión por avión grande —«Llevá el Yvága a Pettirossi»— que solo está en los campos donde cabe, y en el hangar, al elegir un avión, la ficha del escenario enseña con un dibujo si la pista alcanza (`pistaQueHaceFalta(a)` contra
- **Que el coche y el señalero suenen desde donde están** · #45
  Un ralentí diésel suave y el tic de la baliza del coche, y un silbato corto del señalero al pasar a «alto», con el paneo estéreo del motor de audio hacia su posición relativa al avión.
- **En el campo particular, la de la bici es también la señalera** · nuevo
  En Yvytu Rape, quien sale en bici se baja de ella al lado del puesto y saca los bastones: es la misma persona, no dos. En un campo privado hay una sola persona que lo hace todo.
- **Cada ficha lleva su bloque de fuentes, y una prueba lo exige** · #56
  Un campo `fuentes: { geometria, masa, inercias, derivadas, empuje, velocidades }` en `AircraftConfig`, cada uno con documento y página (NASA CR-2144 fig. X; Roskam App. B; TCDS A9EA; POH). Lo que se estimó (inercias por radio de g
- **Reservar hoy el nombre y la familia del helicóptero, antes de construirlo** · #108
  Añadir a `flota.ts` un campo `familia: 'avion' | 'helicoptero' | 'planeador'` y una fila reservada para el helicóptero (número fuera de la serie JAZ o serie propia, como propone #108) con `enDisputa` hasta que se bautice. `flota.t
- **El límite de viento cruzado y la Vne van en la ficha** · #92
  Dos campos: `vientoCruzadoMax` (Pykasu 15 kt, Mainumby 12, Panambi 17, Arasunu 20, Arai 30, Yvága 30; son las cifras demostradas de sus clases) y `vne` (172: 163 kt; Seneca: 195; DHC-6: 170; reactores su Vmo). `velocidadMaxima()` 
- **El largo del fuselaje en la ficha, y con él tres cosas dejan de estar a ojo** · #68
  Un campo `largo` (hoy sólo está en cada `modelos/*.py`). De él salen comprobaciones que hoy no existen: Iyy por radio de giro (hallazgo 6), `maxGroundPitch` por geometría del tren (ángulo desde la rueda principal al cono de cola),
- **02 y 20 son la misma pista: tocar un número en la carta gira la cámara al mundo** · #78
  En el velo 2, tocar un designador ilumina ese extremo en la carta y en el mundo (la cámara exterior se pone mirando a esa cabecera con el número pintado del derecho), y el instructor dice el número. Tocar el otro hace lo mismo. Si
- **Un banco que fotografíe la carta en los cuatro velos y en los nueve aeródromos** · #76
  scripts/ver-carta.mjs, hermano de ver-mapa.mjs: abre cada escenario, fuerza cada tramo, abre la carta y captura los cuatro alcances; además cuenta los elementos con área de toque menor de 48 px y falla si hay alguno.
- **El mapa como carta de Guyrami: circuito, senda, viento y la ruta entera, y un quinto alcance para el viaje** · #72  76
  Pintar en mapa.ts lo que ya existe como datos: los vértices del circuito con su mano, el hilo de la senda, el punto de espera, una flecha de viento (de `scenario.meteo`) y la polilínea completa de la misión con la parada actual en
- **Una prueba de holgura del circuito sobre los nueve relieves, en Node** · nuevo
  El equivalente para el circuito de «ningún aro queda dentro del terreno» de runway-guide.test.ts: leer data/terrain/<id>.bin con readFileSync (hoy lo hice con tsx y funciona: Terrain se construye en Node sin WebGL), construir el c
- **Luces de navegación, baliza y estrobos con nombre** · #   53
  Esferas pequeñas emisivas en las puntas de ala (`luz-roja` izquierda, `luz-verde` derecha), cola (`luz-blanca`), lomo y panza (`baliza`), con un material `luz` que el juego pone en `emissive` y parpadea: baliza roja lenta, estrobo

_Y 71 más de este grupo en el diario del run._

---

El diario completo del run —los 479 hallazgos, las 403 ideas y los 139
veredictos con sus matices— está en el transcript de la sesión que lo lanzó.
