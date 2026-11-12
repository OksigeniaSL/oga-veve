# La misión del Super Puma, en Tenerife

**Estado**: aprobada por Enrique el 11-11, con los cambios del 12-11 que salen de las fuentes: el destino es el puerto
de Garachico y no Buenavista, se sabe por qué estaban aislados, y no hay grúa. Hecha la misión en `src/content/missions.ts`
(`TENO`) y su banco en `scripts/ver-mision-teno.mjs`; las voces, por grabar. Es el paso 4 del helicóptero (ADR 0026). La
primera versión iba en Gran Canaria, con el 802 Escuadrón de Gando; Enrique, 11-11: «Hay una división de helicópteros
justo al lado de GCXO», «La UME del ejército, junto al matadero municipal».

## Dónde vive el Super Puma: Los Rodeos

- **El acuartelamiento de Los Rodeos**, pegado a Tenerife Norte y junto al matadero insular, al norte de la Montaña del
  Aire, tiene un regimiento de artillería, el **batallón de helicópteros de maniobra VI** (BHELMA VI) del Ejército de
  Tierra y un **destacamento de la UME** (Revista Española de Defensa; Cabildo de Tenerife).
- **El BHELMA VI vuela Super Pumas**: tres AS332B1, la versión militar del AS 332 de la ficha, con los mismos motores
  y el mismo rotor, más cinco AB-212 (defensa.com). Así que la ficha del modelo de vuelo vale tal cual.
- **Su helipuerto está publicado**: GCXM en el AIP de ENAIRE (AD 3), de uso militar, a 638 m. Tiene una franja de toma
  de 257 × 22 m, orientada 114°/294° magnéticos, y siete puestos de estacionamiento de 16 m. Se dibuja con esos datos.
- **Es la casa del juego**: Tenerife Norte es el campo mejor dibujado, con el Teide, Anaga y la costa norte.

Va con la pintura de nuestra flota y sus marcas de rescate (decidido por Enrique el 11-11).

## La misión: Punta de Teno

**Lo que pasó de verdad**: el 12 de julio de 2016 se hundió un tramo de la TF-445, la carretera entre Buenavista del Norte
y Punta de Teno, en una curva sobre el acantilado. La gente que estaba en Punta de Teno se quedó aislada: se descartó pasar
andando junto al derrumbe y sacarla por mar, que estaba mal. Cuatro helicópteros del Ejército de Tierra del BHELMA VI de
Los Rodeos —dos Super Puma y dos AB-212— y uno de la Guardia Civil la llevaron al **puerto de Garachico**: 123 personas y
cinco perros (defensa.com; The Local, 13-07-2016). El Diario de Avisos del 13-07-2016 habla de 174 aisladas: la cifra
cambia según la fuente, y se usa la de los rescatados. **Ninguna fuente habla de grúa**: esta misión no la usa, y la grúa
queda para otra.

**La misión**, tranquila: día claro, el alisio de siempre y sin prisa. Se lanza con `?avion=super-puma&mision=teno`; sin
`mision`, el helicóptero sigue en vuelo libre.

1. **Despegar** del helipuerto del Ejército en Los Rodeos (GCXM).
2. **Llegar a Teno**: unos 58 km al oeste por la costa norte, con el Teide a la izquierda.
3. **Posarse junto al faro**, en el llano, de cara al viento.
4. **Esperar a que suba la gente**, unos 25 s, con el rotor girando y la tripulación ayudando. A la mitad se cuenta que la
   gente se acerca por delante y nunca por la cola, por el rotor de cola.
5. **Despegar** de Teno.
6. **Posarse en el puerto de Garachico**, en la explanada del aparcamiento.
7. **Esperar a que baje la gente**, unos 20 s. Y el final: el sonido de logro y el dato real, 123 personas y cinco perros
   en dos Super Puma como este y otros helicópteros.

**Los dos sitios**, con coordenadas de OpenStreetMap llevadas al mundo con la proyección de `huecosDeLaCiudad` y el origen
de GCXO, y medidos en el relieve del juego —menos de 5° en un círculo de 20 m, seco, sin edificios ni árboles—:

- **El faro de Teno**, 28,34209 N 16,92286 O. Junto a Los Rodeos quedaba en el mar: el horizonte, a trescientos metros
  por muestra, hundía la punta entera. Hizo falta un parche de relieve fino, `data/terrain/parches/teno.bin` (MDT05 del
  PNOA-LiDAR), y que el horizonte deje asomar la tierra de un parche en un cuadro que él da por mar abierto.
- **La explanada del puerto de Garachico**, el aparcamiento de tierra compactada (vía 888471906), 28,37389 N 16,75652 O.

**La gente** que sube y baja la pone otro encargo: figuras junto al faro que suben por la puerta corredera del costado
derecho y bajan en Garachico. El enganche está en `src/missions/gente.ts`.

**Lo que enseña**: despegar y posarse en altura, donde hay menos aire; posarse en un sitio que no es un aeropuerto, de
cara al viento; para qué sirve un helicóptero grande —llevar a mucha gente de una vez—; que la gente se acerca por
delante, nunca por la cola; y que la tripulación es seguridad.

## La otra: la grúa en el mar

Un pesquero frente a Los Gigantes con un marinero que se ha hecho daño en una pierna, y al helipuerto de un hospital de
Tenerife: el Universitario de Canarias o el de La Candelaria, los dos en OurAirports (GCHU y GCDC). Es lo que hace el
Super Puma del 802 desde Gando (RTVC: un marinero llevado al Doctor Negrín en Gran Canaria; una pasajera de un crucero,
a Tenerife). El barco sigue rumbo y velocidad de proa al viento mientras trabaja la grúa, como pidió el avión de
vigilancia en el rescate del crucero a 500 km de Canarias (El Debate).

## Por peldaño

Decidido por Enrique: **la instructora cuenta los pasos en Guyrami, Tukã y Taguató**, con la tarjeta de siempre —el dibujo
en los tres, la palabra en Tukã y la frase en Taguató—; **en Taguató Ruvicha habla la tripulación**, como la persona de
tierra en el peldaño de cabina, con el registro corto de una cabina, y ella calla. La tripulación, con una voz que ya
existe: la de Airam (`tierra-canarias`), un hombre canario de unos treinta y cinco, por el interfono.

## Lo que falta

- **La gente**, que sube y baja: otro encargo, con el enganche ya puesto.
- **Las voces**: nueve frases de la instructora y nueve de la tripulación, en la lista de `scripts/frases-para-grabar.mjs`.
- **Las frases y el faro**: se escribieron cuando el faro no estaba dibujado, y dicen Punta de Teno y el aro verde, no
  «ahí está el faro». Ahora el faro está (ver abajo); si se quiere que lo nombren, son frases nuevas que grabar.

## El faro

Es un sitio con modelo desde el 12 de noviembre de 2026 (`data/sitios/sitios.json`, `modelos/sitio-faro-de-teno.py`):
la torre de 1978 y, pegado al oeste, el faro de 1897 con su casa y su torre de piedra, sobre el parche fino de la punta y
a más de veinte metros del borde del llano. De noche destella con su ritmo publicado, tres destellos blancos cada
veinte segundos. Fotos y coste con `scripts/ver-faro-de-teno.mjs`.
- **La grúa**, para la otra misión.

## Lo que decidió Enrique

1. **Teno.**
2. **Las voces de la tripulación**: de las que ya hay.
3. **Quién habla en cada peldaño**: la instructora abajo, la tripulación en el de cabina.

## Fuentes

- AIP de España, AD 3 GCXM (ENAIRE): https://aip.enaire.es/AIP/contenido_AIP/AD/AD3/GCXM/LE_AD_3_GCXM_en.html
- Revista Española de Defensa, el acuartelamiento de Los Rodeos:
  https://ume.defensa.gob.es/Galerias/Descargas/PRENSA/010923_red_408_2.pdf
- Diario de Avisos, la UME en Los Rodeos en el incendio de 2023:
  https://diariodeavisos.elespanol.com/2023/08/piscina-fuego-izana/
- Cabildo de Tenerife, el matadero insular junto a las instalaciones militares:
  https://tenerife.es/documents/d/portal/residuos-tfe-anexo_ambitos10
- defensa.com, la flota del BHELMA VI y las 123 personas de Teno:
  https://www.defensa.com/espana/helicopteros-ejercito-tierra-protagonizaron-rescate-123-personas
- helis.com, la evacuación de Punta de Teno (12-13 de julio de 2016): https://www.helis.com/database/news/tenerife_evac
- The Local, el derrumbe de la carretera y la evacuación (13-07-2016):
  https://www.thelocal.es/20160713/tenerife-road-collapse-evacuation
- Diario de Avisos, las personas aisladas en Punta de Teno (13-07-2016): https://diariodeavisos.elespanol.com/
- OpenStreetMap, el faro de Teno y la explanada del puerto de Garachico (vía 888471906): https://www.openstreetmap.org/way/888471906
- PNOA-LiDAR MDT05 (IGN), el relieve fino de Punta de Teno: https://www.idee.es/csw-inspire-idee/srv/spa/catalog.search#/metadata/spaignMDT05
- RTVC, el marinero llevado al Doctor Negrín:
  https://rtvc.es/trasladan-al-hospital-en-helicoptero-a-un-marinero-herido-grave/
- RTVC, la pasajera del crucero llevada a Tenerife: https://rtvc.es/evacuada-una-pasajera-de-un-crucero-12-enero-2025/
- El Debate, el rescate del crucero (10-04-2024):
  https://www.eldebate.com/espana/defensa/20240410/helicoptero-super-puma-rescata-mujer-ictus-crucero-lujo-500-kilometros-canarias_188006.html
- OurAirports, datos abiertos (GCHU, GCDC, GCXM): https://davidmegginson.github.io/ourairports-data/airports.csv
