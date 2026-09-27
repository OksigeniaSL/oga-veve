# 0010 — El país entero

Fecha: 2026-09-27
Estado: aceptado · revisa el ancho del mundo del ADR 0007

## Contexto

> «No me deja elegir otro aeropuerto y quiero viajar por todo Paraguay.»

Tenía razón las dos veces. Pedro Juan Caballero y Mariscal Estigarribia eran
campos sin ninguna ruta: en el hangar no aparecía el paso de «¿a dónde vas?».
Y de los cuatro que sí tenían, faltaba la ruta más transitada del país,
Asunción–Ciudad del Este, que se había dejado fuera por el tamaño del mundo.

Cómo es ese mundo (ADR 0007): un cuadrado centrado en la salida, cuyo lado lo
fija el eje más largo hasta un destino más nueve kilómetros para aproximar. El
relieve lejano lleva siempre las mismas muestras; la foto del horizonte baja un
nivel de zoom cuando el lado se duplica; y **cada destino se monta entero** —su
relieve fino, su foto, su aeródromo— al arrancar. Asunción–Ciudad del Este
pide 556 km, y se dio por hecho que pasar de trescientos a quinientos era caro.
No se había medido.

## Lo que se midió

Con `scripts/medir-mundo.mjs`: compilaciones servidas como en producción, un
Chrome con la GPU del portátil (Iris Xe, ANGLE sobre GL), la **CPU estrangulada
cuatro veces desde antes de pedir la página** —la tablet de gama media—, 1280 ×
720, tres cargas de cada variante alternadas y la mediana. Salida en
Pettirossi con el JAZ 20, que cabe en todos los campos y por tanto monta más
vecinos que ningún otro avión.

| | mundo | vecinos | arranque | texturas | mallas | JS¹ | navegador² | cuadro³ |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Asunción, antes | 462 km | 2 | 5,5 s | 157 MB | 42 MB | 23 + 61 MB | 478 MB | 12,0 · 13,8 · 10,7 ms |
| con Ciudad del Este | 572 km | 3 | 6,0 s | 193 MB | 49 MB | 23 + 73 MB | 493 MB | 11,6 · 13,0 · 10,6 ms |
| el país entero⁴ | 748 km | 5 | 6,4 s | 256 MB | 60 MB | 24 + 91 MB | 517 MB | 11,7 · 12,9 · 11,1 ms |
| Gran Canaria, la vara | 380 km | 4 | 11,9 s | 245 MB | 138 MB | 17 + 166 MB | 687 MB | 16,2 · 17,4 · 11,8 ms |

¹ Montón de JavaScript más los `ArrayBuffer` de fuera del montón.
² Memoria proporcional (PSS) del navegador entero: proceso, GPU y página.
³ Mediana del cuadro en el puesto, sobre el campo a 250 m y en crucero a
2.500 m mirando al vecino más lejano. El p95 queda en 14-16, 27-30 y 13-14 ms
en las tres variantes de Asunción; los triángulos son 1.242.000 en tierra en
las tres, y el crucero pasa de 89 llamadas de dibujo a 91.
⁴ Con el relieve y la foto del horizonte de 748 km sustituidos por unos del
mismo tamaño —mismas muestras, foto de 2.816 píxeles—, que es lo que cuesta;
el dato de verdad, extraído después, tiene la foto de 3.072 (5 MB más).

Gran Canaria está en la tabla porque es **el mundo más gordo que ya se
publica**: cuatro vecinos, el relieve lejano a 1.025 muestras y las fotos del
PNOA. Es la vara con la que se mide qué es caro.

## Lo que dicen los números

1. **El ancho no cuesta cuadro.** El relieve lejano tiene las mismas muestras
   en 462 km que en 748, así que son los mismos triángulos. Lo que cuesta el
   ancho es **resolución**: el relieve pasa de 1,2 a 1,9 km por muestra, y la
   foto del horizonte de 16 a 36 MB al mismo zoom (z9, 277 m por píxel). En
   Guaraní la foto sí baja un nivel —de 138 a 276 m por píxel—, y queda como
   ya estaban Asunción y Encarnación: cinco veces más fina que el relieve que
   viste, que es lo que tiene que cumplir (ver `ortofoto-publica.mjs`).
2. **Lo que cuesta es cada vecino**: unos 30 MB de foto en la tarjeta, 6 de
   mallas, 12 de ArrayBuffer y entre dos y cuatro décimas de arranque con la
   CPU de la tablet. El cuadro no se entera: un vecino lejano son dos
   llamadas de dibujo.
3. **La precisión tampoco es el límite.** A 374 km del origen un `float32`
   tiene pasos de 3 cm. Los mundos vecinos van en su grupo con sus vértices
   en coordenadas propias, three.js compone la matriz de vista en doble
   precisión, y el modelo de vuelo va en `number`, que es doble. Hasta unos
   mil kilómetros (6 cm) no hace falta **origen flotante**, y no se hace.
4. **Todo el país cabe dentro de la vara.** Con cinco vecinos y 748 km,
   Asunción arranca en la mitad que Gran Canaria, con menos de la mitad de
   mallas y 170 MB menos de navegador; solo las texturas quedan un 4 % por
   encima.

## Decisión

1. **El mundo se ensancha lo que pidan las rutas de verdad**, con las mismas
   muestras de relieve lejano: Asunción 748 km, Mariscal Estigarribia 740,
   Ciudad del Este 660, Pedro Juan Caballero 648, Concepción 420.
2. **Se montan como mucho cuatro vecinos a la vez** —los de Gran Canaria—.
   Hasta cuatro, todos, como siempre. Por encima, el destino elegido, su
   alternativo —el mismo que calcula el hangar, que es el que lleva el
   combustible cargado— y los más cercanos a la salida. Ver
   `world/vecinos-del-vuelo.ts`. Con eso el vuelo más gordo de Asunción son
   unos 240 MB de texturas: por debajo de Gran Canaria.
3. **Las rutas son las que el país vuela o ha volado**, y ninguna más:

   | ruta | quién | km |
   |---|---|---:|
   | Asunción ↔ Ciudad del Este | Paranair (CRJ-200) y Sol del Paraguay | 270 |
   | Asunción ↔ Encarnación | Sol del Paraguay | 277 |
   | Asunción ↔ Pedro Juan Caballero | Sol del Paraguay | 336 |
   | Ciudad del Este ↔ Pedro Juan Caballero | Sol del Paraguay | 329 |
   | Asunción ↔ Concepción | Transporte Aéreo Militar (CASA 212) | 200 |
   | Asunción ↔ Mariscal Estigarribia | anunciada en 2024 por el gobernador de Boquerón | 475 |

   Más las que ya había con la granja y entre Encarnación y Ciudad del Este.
   Fuentes: InfoNegocios, «¿Cuáles son los vuelos nacionales de pasajeros en
   Paraguay?» (noviembre de 2019); la ficha de Sol del Paraguay; Agencia IP,
   23 de abril de 2024.
4. **Concepción entra como campo nuevo**, con los mismos guiones que los
   demás. Ayolas (SGAY) y Pilar (SGPI) quedan extraídos del aeródromo y nada
   más: ver el plan.

## Lo que no se hace, y por qué

- **Origen flotante.** No hace falta hasta el millar de kilómetros (punto 3).
- **Montar todos los vecinos.** Cabría —cinco vecinos quedan dentro de la
  vara—, pero es pagar treinta megas de tarjeta por cada campo al que ese
  vuelo no va. El tope cuesta poco y se quita solo con el paso 2.
- **Centrar el mundo en el punto medio de la ruta.** Partiría el lado por dos,
  pero exige un relieve lejano y una foto del horizonte por ruta y no por
  campo: quince pares de ficheros en vez de siete, para ahorrar resolución que
  el paso 3 da más barata.

## El plan, por pasos

1. **Hecho aquí**: el ancho, el tope de vecinos, las rutas de la tabla,
   Concepción, y el país dibujado en el hangar con las rutas de cada avión.
2. **Vecinos por tramos.** Bajar al arrancar los bytes de todos los campos de
   la ruta —son dos megas cada uno y la red se sigue pidiendo solo al
   principio, como quería el ADR 0007— pero **subir a la tarjeta** solo los
   que estén a menos de unos 120 km, y soltar los que queden a más de 180.
   Quita el tope. Revisa del ADR 0007 la frase «el mundo de un vuelo se decide
   antes de arrancar y no cambia»: el dato no cambia; cambia lo que está en la
   tarjeta. Antes de hacerlo hay que medir el tirón de montar un vecino en
   pleno vuelo con la CPU de la tablet, y trocearlo si se ve.
3. **Más muestras de relieve lejano donde el relieve tiene forma.** A 748 km
   la muestra mide 1,9 km, y la sierra de Amambay o la cordillera de los Altos
   lo notan; el Chaco no. Volver a 1,2 km pide unas 625 muestras por lado y
   2,6 veces los triángulos del anillo: se mide antes, contra la vara.
4. **Los campos que faltan**: Ayolas (asfalto de 1.850 m, pero OpenStreetMap
   no le mapea plataforma), Pilar (1.500 m de hormigón, sin cotas de umbral en
   OurAirports), y el norte del transporte militar —Vallemí, Fuerte Olimpo,
   Bahía Negra—, que es la ruta que sigue a Concepción.

## Consecuencias

- Desde cualquier campo paraguayo con aeródromo extraído se puede ir a otro,
  y desde Asunción a todos.
- El relieve lejano es más grueso en los mundos anchos. Donde se mira de
  cerca —el aeródromo y los 54 km de la foto de en medio— no cambia nada.
- Cada mundo tiene una sola lámina de agua, a la cota de su río: volando de
  Mariscal Estigarribia a Asunción, el río Paraguay es agua dentro del mapa
  fino de Asunción y foto fuera de él. Ya pasaba entre Asunción y Encarnación.
- Un campo que el tope deja fuera no está en el mundo de ese vuelo: desde
  Asunción con destino a Encarnación, Mariscal Estigarribia no se monta. Está
  a 475 km en la otra dirección.

## Referencias

- ADR 0007 — volar a otro aeropuerto: el mundo cuadrado y los vecinos.
- ADR 0006 — el mundo de verdad: de dónde sale el relieve.
- `scripts/medir-mundo.mjs` — el banco con el que se midió.
