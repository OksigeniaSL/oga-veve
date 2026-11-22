# Mundo Tejido

*Óga Veve · Dirección de arte*

> Informe de diseño de agosto de 2026, uno de los ocho que recoge la [visión del proyecto](../vision.md) en su sección 10. Se conserva tal como se escribió; lo que el juego ha decidido después manda sobre lo que aquí se propone.

«El mundo es una tela teñida y bordada a mano; la aeronave es la aguja y su estela, el hilo.»

## 1. La tesis

El terreno de Óga Veve ya se pinta por bandas de altitud y pendiente, sin una sola foto. Eso no es una carencia que disimular: es la tesis. Paraguay es el país del ñandutí, del ao po’i y del encaje ju; visto desde el aire, un país tejido. La dirección de arte se llama **Mundo Tejido** y se resume en una frase: el mundo es una tela teñida a mano, la aeronave es la aguja y su estela es el hilo.

Todo se deriva de ahí. El terreno por bandas es tela teñida por franjas. Los ríos son cintas. Los cultivos, parches de ao po’i. Los pueblos, puntadas. Lo radial del juego —cargas, brújula, medallas— es ñandutí. La estela del avión es una puntada discontinua sobre el cielo.

Es defendible porque nadie la tiene: «low poly» es una técnica, esto es una cosmovisión anclada en un lugar real y su artesanía. Es alcanzable porque son colores planos Lambert, vertex colors y SVG: cero texturas, cero postproceso. Y escala sin romperse: un glaciar es la misma tela teñida de blanco; la noche, una tela verde bosque bordada de estrellas.

## 2. Referencias y qué se toma de cada una

- **Ñandutí de Itauguá**: la estructura radial sobre bastidor → todo lo circular de la interfaz: el spinner de carga que se teje en directo, la brújula, los marcadores de misión, las medallas.
- **Encaje ju**: hilo claro sobre fondo de color → las líneas de puntada blancas discontinuas: guías de pista, rutas del mapa, la estela.
- **Cerámica de Itá** (la gallinita) y la de **Julián de la Herrería y Josefina Plá**: volúmenes rechonchos y esmalte plano → el lenguaje de forma de las aeronaves: panzudas, redondas, «de barro esmaltado».
- **Barroco guaraní de las misiones** (Trinidad, Jesús): relieves de ángeles músicos y soles radiantes → iconografía de logros y los marcos «tallados» de los menús.
- **Alto’s Odyssey**: el cielo como protagonista y la silueta siempre legible. **Monument Valley**: un solo acorde cromático por pantalla. **Sable**: disciplina de paleta (su línea exige postpro; no se copia). **Alba: A Wildlife Adventure**: calidez doméstica sin texturas complejas. **Lonely Mountains: Downhill**: terreno facetado legible a 60 fps.
- **Mary Blair**: el color como emoción; cielos imposibles que se creen.

## 3. La flota: cinco aeronaves

Silueta ante todo: desde la cámara de persecución se ve la espalda del avión, así que cada uno tiene *un tipo de ala + un color dominante + un motivo ñandutí propio* en cola y extradós.

Escuela · ala alta

### Panambi

La mariposa. Beige con capó terracota, ala generosa, dócil y redonda. Sustituye a «Óga 172»: el 172 es de Cessna y el propio aviso legal marca el camino.

Fumigador · biplano

### Mainumby

El colibrí, que ya existe. Ocre y verde, hélice enorme, ágil, vuela casi parado. El avión de las acrobacias bajas.

Veloz · ala baja en flecha

### Taguato

El aguilucho. Terracota casi entero, morro afilado. El que se desbloquea, el que se desea.

Hidroavión · flotadores

### Jakare

El caimán. Verde bosque, panza plana, flotadores grandes. Abre los ríos y lagos como pistas.

Carguero · bimotor

### Tuka

El tucán. Morro grandote bicolor, dos motores, tripa de carga. Reparte cosas por el mapa.

Deseables sin ojos ni caras: proporción de cría (morro grande, cuerpo corto), hélices que se ven girar y nombres que un niño puede decir en voz alta. La personalidad va en la postura y el sonido, no en pegatinas de dibujo animado: este juego también enseña a volar de verdad.

## 4. Los personajes de la granja

Sí, pero diegéticos: la Granja Óga es el aeródromo base, no un anuncio. **Ña Emy es la instructora**: su retrato dibujado a mano vive en el tutor, habla es-PY y guaraní y es quien dice «tranquilo, levantá el morro». **Karai Guasu** es el mecánico: el menú de selección de avión es su hangar. **Luna y Spirit** galopan junto a la pista en el primer despegue. **Kuarahy-memby**, la ardilla, es la veleta viva del aeródromo y polizona del modo arcade. **Campanario** es el hito del indicador «casa» que ya existe en el HUD. Regla de oro: ningún personaje interrumpe el vuelo; todos viven en tierra.

## 5. Paleta y luz

Terracota `#BE5D38` · el avión y el hilo

Ocre `#DD923F` · acentos y luces

Verde Bosque `#2F5243` · noche y trim

Beige `#E4E2DA` · fuselajes y niebla

La marca no pinta el paisaje: pinta el hilo. Los cuatro colores viven en las aeronaves, la pista, el HUD y los bordados; el paisaje cambia por bioma. Cada escenario es «una tela teñida»: exactamente seis bandas de oscuro a claro —la estructura de valor es fija, rota el tono— más un acento. Lo que no cambia nunca: el sol cálido (el 0xfff1da que ya está en el cielo), la niebla con un punto de beige y la comprobación de que la avioneta terracota destaca sobre las seis bandas. Selva: verdes profundos con acento de lapacho rosa. Chaco: ya resuelto. Hielo: beige azulado donde la terracota arde. Noche: tela verde bosque casi negra, bordada de estrellas y de luces ocres de pueblo. La identidad cromática viaja en el avión, no en el suelo.

## 6. Interfaz como arte

El HUD actual ya tiene una idea buenísima —el doble rótulo IAS/palabra, que enseña la abreviatura real de cabina—: se conserva y se declara seña de identidad. Lo que se añade: la carga es un ñandutí tejiéndose (SVG animado de unos pocos KB); las barras de progreso son puntadas discontinuas; la selección de menús, una roseta radial; los marcos llevan ribete de encaje ju; los iconos van dibujados a mano, con el trazo redondo de Varela Round. Nada de paneles genéricos con desenfoque: fondo plano beige o verde bosque, e hilo.

## 7. Producción realista

### Qué se hace con qué

- **A mano** (SVG y PNG pequeño): logo, motivos ñandutí, retratos de personajes, iconos. Lo identitario y lo jurídicamente limpio.
- **Blender** (glTF + Draco, vertex colors, cero texturas): las cinco aeronaves (800–1500 triángulos), hangar, campanario y tres árboles de silueta paraguaya inconfundible: lapacho en flor, samu’u barrigudo y palmera karanda’y.
- **Código**: terreno (ya está), agua, nubes billboard, bandadas boids, partículas de pétalos y polvo, la estela-puntada.

### Orden

\(1\) Panambi modelada sustituyendo las cajas: es el 70 % de dejar de parecer prototipo, porque el avión está siempre en pantalla. (2) Árboles instanciados. (3) Kit ñandutí de interfaz. (4) Ña Emy en el tutor. (5) El resto de la flota y los biomas nuevos.

### Leonardo AI

Sirve para moodboards, variaciones de paleta y explorar volúmenes de las avionetas antes de Blender. No sirve para ningún asset final ni nada identitario: la titularidad de la imagen generada es jurídicamente incierta y los derechos comerciales dependen del plan contratado. Nada generado entra en el repo, en el juego ni en el logo. Se usa, se mira, se tira.

Presupuesto: vertex colors son cero KB de texturas; la flota entera ronda 250–350 KB comprimida y los SVG de interfaz, menos de 30 KB. Cabe en el bundle.

## 8. Cuatro momentos memorables

1.  **El primer despegue.** Amanecer en la pista de tierra de la granja, polvo tras la hélice, y Luna y Spirit galopando en paralelo tres segundos hasta quedarse atrás.
2.  **El lapachal.** Coronas una loma verde y la ladera de enfrente está rosa entera; al pasar bajo, los pétalos cruzan la cámara.
3.  **Las garzas del río.** Vuelas bajo sobre el río ancho y una bandada blanca se abre en dos justo bajo tus alas.
4.  **El ñandutí de estrellas.** De noche, las constelaciones se dibujan con hilo de encaje —puntadas uniendo estrellas— y abajo el pueblo, cosido con luces ocres. Nadie más tiene ese cielo.

## Seis propuestas listas para abrir como issue

1.  **Arte · Panambi jugable:** modelar la entrenadora en Blender (≤1500 tris, vertex colors), exportar glTF+Draco (\<80 KB) y sustituir `aircraft-mesh.ts` por un cargador; incluye retirar el nombre «Óga 172».
2.  **Mundo · Vegetación con silueta:** tres mallas (lapacho, samu’u, karanda’y) vía `InstancedMesh`, densidad y tinte por banda de bioma, presupuesto 60 fps en tablet media.
3.  **UI · Kit ñandutí:** spinner de carga que se teje, barra de progreso puntada y marcador de waypoint roseta, todo SVG \<30 KB, integrado en `hud.ts` y menús.
4.  **Personajes · Ña Emy instructora:** retrato dibujado a mano + integración en `tutor.ts` con voz cercana en es-PY y guaraní; Karai Guasu como marco del selector de avión.
5.  **Color · Sistema de telas por bioma:** formalizar la rampa de seis valores + acento en `scenarios.ts`, con test automático de contraste avioneta-terreno, y dos escenarios nuevos (Ybytyruzú, glaciar).
6.  **Momento · El lapachal:** ladera rosa señalizada en Valle de la Cordillera con partículas de pétalos económicas y misión del tutor que lleva hasta ella.

Óga Veve · Oksigenia SL / Granja Óga · Dirección de arte «Mundo Tejido» · agosto 2026
