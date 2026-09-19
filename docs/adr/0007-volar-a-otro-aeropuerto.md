# 0007 — Volar a otro aeropuerto

Fecha: 2026-09-19
Estado: aceptado

## Contexto

Hasta aquí todos los vuelos empiezan y acaban en el mismo sitio. Se despega,
se da la vuelta, se aterriza en la pista de la que se salió. Eso está bien
para aprender el circuito —y el circuito es una lección de verdad, la primera
que da cualquier escuela— pero no es volar: **volar es ir a otro sitio**.

Contado jugando, y con la queja bien puesta:

> «Ah, que si voy de una isla a otra no encuentro nada más allá de
> "Finisterre".»

El mundo se acaba. Se ve la isla de al lado dibujada en el horizonte, se pone
rumbo a ella, y a los pocos minutos no hay nada: ni pista, ni aeropuerto, ni
sitio donde bajar. El juego enseña un sitio y luego no deja ir.

Y hay una lección detrás que ahora no se puede dar: **el aeropuerto alternativo**.
Un vuelo de verdad se planifica con un sitio al que ir si el de destino no
sirve —niebla, viento cruzado, una pista cerrada— y ese segundo sitio es parte
del plan desde antes de arrancar, no una improvisación. Es la regla de las tres
eses aplicada a la navegación, y no se puede enseñar en un mundo con un solo
aeropuerto.

## Lo que hay hoy

Cada escenario tiene **un** aeródromo (`Scenario.aerodrome`) y **una** pista
(`Scenario.runway`). El relieve va en dos capas:

- el **mapa fino**, 18 km de lado con 417 muestras — 43 m por muestra, que es
  lo que hace falta alrededor de una pista;
- el **mapa lejano**, el mismo sitio seis veces más ancho —108 km— con las
  mismas 417 muestras: 259 m por muestra. Existe porque el Teide no cabía en
  los 18 km del mapa fino (ADR 0006).

Es decir: **el terreno ya llega a 54 km de la pista**. Lo que no llega es nada
más.

Las distancias de verdad entre los aeródromos que ya están extraídos:

| ruta | km |
|---|---:|
| Tenerife Norte ↔ Tenerife Sur | 53,8 |
| Lanzarote ↔ Fuerteventura | 60,3 |
| Tenerife Sur ↔ La Gomera | 63,0 |
| La Gomera ↔ El Hierro | 70,3 |
| La Gomera ↔ La Palma | 84,9 |

Las cuatro primeras son vuelos reales, de los que se hacen todos los días con
turbohélice, y **tres de ellas cruzan agua**, que es exactamente lo que se
quería poder hacer.

## Decisión

Un escenario puede tener **más de un aeródromo**, y el vuelo puede terminar en
uno distinto del que salió.

Tres piezas, en este orden:

1. **El mundo se ensancha lo justo.** `VECES_LEJOS` deja de ser una constante
   única y pasa a ser propiedad del escenario, porque no todos necesitan lo
   mismo: un escenario sin destino sigue con seis, y uno con destino usa el
   ancho que hace falta para que el otro campo caiga dentro con margen. **Y se
   ensancha regenerando el mapa con más muestras, no repartiendo las mismas
   sobre más kilómetros**: el detalle por muestra no baja de los 259 m de hoy,
   porque ése es el que hace que el Teide se reconozca. Un mapa lejano de 144 km
   con 557 muestras son 620 KB, y se bajan cuando hacen falta.

2. **El aeródromo de destino se monta como el de salida.** Sale de su propio
   `.aero.json` —pista, calles, plataformas, umbrales medidos— y se asienta
   sobre el relieve con el mismo código que ya asienta el de casa. Sobre el
   mapa lejano el terreno de alrededor es grueso, y da igual: lo que se pisa lo
   pone el aeródromo, y lo que se mira desde el aire a 300 m por muestra es
   paisaje.

3. **El plan de vuelo sabe a dónde va.** Los puntitos llevan al otro campo, el
   embudo de final se construye sobre **su** pista y en el suelo espera **su**
   plataforma. La torre de destino habla en su frecuencia, que ya está en los
   datos.

### Lo que no se hace, y por qué

- **No se ensancha el mapa fino.** Cubrir 72 km con las 43 muestras por
  kilómetro de hoy son 2,8 millones de puntos: 5,6 MB de datos y una malla que
  no da 60 fps en una tablet de gama media. La regla 6 de AGENTS.md no es
  negociable y aquí se rompería sola.
- **No se inventa un aeródromo intermedio.** Si una ruta no tiene los dos
  extremos extraídos de datos reales, esa ruta no existe todavía. Regla 4: lo
  que se enseña es real.
- **No se genera terreno nuevo bajo demanda mientras se vuela.** Bajar teselas
  en pleno vuelo es un tirón garantizado justo cuando hay que estar volando. El
  mundo de un vuelo se decide antes de arrancar y no cambia.

## El tamaño del cambio, medido

No es una estimación: son los sitios que hoy dan por hecho que hay **un**
aeródromo y **una** pista, contados con `grep`.

| fichero | veces |
|---|---:|
| `src/game.ts` | 43 |
| `src/world/terrain.ts` | 16 |
| `src/flight/la-aproximacion.ts` | 12 |
| `src/dev/sondas.ts` | 11 |
| `src/world/vegetation.ts` | 10 |
| `src/ui/hangar.ts` | 9 |
| el resto —`cabe`, `teselas`, `superficie`, `asentar-aerodromo`— | 8 |

Casi todos quieren decir lo mismo: **el aeródromo en el que estoy ahora**. La
frecuencia de la torre, la matrícula, las ayudas visuales, las luces de
rodadura, el pavimento. Así que el cambio no es «meter un segundo aeródromo por
todas partes», sino **dar nombre a lo que ya se estaba diciendo sin nombre**:
el de salida hasta despegar, el de destino a partir de ahí. Los sitios que de
verdad necesitan ver los dos a la vez son tres —el relieve, el plan de vuelo y
el hangar— y son justo los que esta decisión toca.

## Consecuencias

- Aparece la primera lección de navegación que este juego puede dar de verdad:
  **poner un rumbo y mantenerlo hasta ver el destino**. Sin instrumentos de
  navegación todavía: rumbo, reloj y mirar por la ventana, que es como se
  aprende y como se hacía antes de que hubiera otra cosa.
- Y aparece el sitio donde enseñar el alternativo, que es la parte de seguridad
  de todo esto: **se elige antes de salir, y elegirlo bien es parte del vuelo**.
  Vale la misma regla que con la frustrada: desviarse al alternativo no es un
  fracaso, es la maniobra: se felicita.
- El presupuesto de un vuelo entero sube. Sesenta kilómetros a 200 nudos son
  diez minutos de reloj real; en el banco se vuela con el reloj acelerado y ya
  está contemplado.
- Cinco rutas nuevas sin extraer un aeródromo más, tres de ellas sobre agua.

## Referencias

- ADR 0006 — el mundo de verdad: de dónde sale el relieve y por qué hay dos capas.
- ADR 0005 — qué se puede comprar: la licencia de Copernicus DEM, que es la que
  permite bajar el trozo de mundo que haga falta.
