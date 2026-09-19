# 0008 — Lo que se ve por la ventanilla

Fecha: 2026-09-19
Estado: aceptado

## Contexto

Con el ADR 0007 aparecieron los vuelos de verdad: cincuenta o sesenta
kilómetros de una isla a otra, diez o quince minutos de reloj. Y con ellos
apareció lo que no se había tenido nunca, porque nunca había habido sitio para
que apareciera: **el rato muerto**.

Contado al decidir por dónde seguir:

> «Durante los vuelos largos pueden pasar cosas, entretener a la niña que vuela
> mucho rato y al adulto que quiere más acción.»

Y antes, sobre a dónde va esto:

> «Quiero sobrevolar más zonas, contar historias, cambiar de época.»

El circuito no tiene rato muerto: se despega, se vira cuatro veces y se
aterriza, y en los tres minutos que dura siempre hay algo que hacer. Una ruta
sí lo tiene, y un crucero en el que no pasa nada durante doce minutos enseña
que volar es aburrido — que es falso y además es lo contrario de lo que este
juego quiere dejar.

## La decisión

Que la comandante señale lo que se pasa por debajo, como en un vuelo de verdad:
«miren por la ventanilla, a la izquierda: Teide, 3.715 metros».

Es la solución más barata de todas las que se consideraron y la única que suma
en las tres direcciones que importan a la vez:

- **Entretiene** sin pedir nada. No hay que apretar un botón ni acertar nada:
  pasa, y quien quiera mira.
- **Enseña geografía**, que es de las cosas que este juego puede dejar sin
  proponérselo — como la llegada que nombra el aeropuerto.
- **Da una razón para mirar por la ventana**, que en un simulador para niños no
  es poco: la tentación es mirar los relojes, y lo que hace a alguien piloto es
  mirar fuera.

Y es la primera pieza de «contar historias», que es a donde va esto: hoy el
nombre y la cota, mañana el sitio con algo que decir de sí mismo.

## Lo que se descartó

- **Misiones en ruta.** Aros que aparecen, cosas que recoger. Rompe la regla de
  que lo que se enseña es real: un vuelo entre Los Rodeos y Reina Sofía no
  tiene aros. Y compite con el paisaje en vez de enseñarlo.
- **Una avería programada.** Da acción, sí, y es exactamente lo que la regla de
  las tres eses no quiere de entrada: dramatizar por entretener. Una avería se
  entrena, y se entrena cuando toca, no para llenar un hueco.
- **Escribir la lista a mano.** Es lo que habría costado veinte minutos, y es
  lo que se rechaza en la regla 4. Un niño que aprenda aquí que ese volcán es
  el Teide tiene que acertar el día que lo vea desde un avión de verdad; una
  lista escrita de memoria acierta casi siempre, que es otra manera de decir que
  falla.

## Cómo está hecho

Tres piezas, separadas para poder comprobar cada una sin volar:

| Pieza | Qué hace |
| --- | --- |
| `scripts/osm-a-hitos.mjs` | Extrae de OpenStreetMap los puntos con nombre que se reconocen desde el aire dentro del cuadro del horizonte, y los versiona en `data/hitos/`. |
| `src/world/hitos.ts` | La geometría: qué hito se ve desde dónde y **por qué lado**. |
| `src/flight/lo-que-se-ve.ts` | El momento: en crucero, con altura, de uno en uno, nunca encima de otra voz y cada sitio una vez por vuelo. |

Tres clases, y ninguna más: **cumbres** de más de mil metros, **islas** y
**pueblos** de más de cinco mil habitantes. Es lo que se reconoce desde un
avión y es lo que OpenStreetMap trae como punto con nombre. Nada de polígonos:
un río es una geometría grande y lo que hace falta aquí es un sitio al que
apuntar.

Con cupo por clase, que es lo que evita el locutor: sin él, Tenerife daba
catorce montañas y ni una isla, porque tiene más cumbres mapeadas que ninguna
otra cosa y ordenar por altura se llevaba la lista entera. Y con ocho
kilómetros de separación dentro de cada clase, que el macizo del Teide trae el
pico, Pico Viejo y Montaña Blanca en un puñado de kilómetros y nombrarlas
seguidas no enseña nada.

**El lado, en flecha antes que en palabra.** La tarjeta lleva una flecha al
borde que corresponde y la figura de lo que es —montaña, isla, pueblo—, así que
funciona sin leer, que es la regla 2. El nombre lo dice la voz siempre y se
escribe a partir del segundo peldaño; la cota, a partir del tercero.

**Y lo dice quien lo diría.** Una avioneta no lleva megafonía ni tiene a quién
hablarle por ella: ahí quien señala el paisaje es la instructora, que va
sentada al lado, y entonces no es «miren», es «mirá». Son los dos registros de
la regla 1 dentro del mismo juego y no se mezclan.

## Consecuencias

- Aparece una razón para que las rutas sean largas, que es justo lo que el
  ADR 0007 dejó abierto y lo que hacía falta antes de estirarlas más.
- Y aparece el sitio donde colgar lo siguiente: un hito con algo que contar de
  sí mismo, un hito de otra época, un hito que solo se ve de noche. La estructura
  ya está; lo que falte será dato, y saldrá de donde se pueda citar.
- Cuesta unos kilobytes por escenario y ni un fotograma: son unos pocos puntos
  y una distancia por fotograma.
- Un escenario sin hitos extraídos no falla: la comandante calla, que es
  exactamente lo que hacía antes.

## Referencias

- ADR 0007 — volar a otro aeropuerto: de dónde salen los vuelos largos.
- ADR 0006 — el mundo de verdad: por qué los datos se extraen y se versionan.
- ADR 0004 — licencias: la ODbL de OpenStreetMap, anotada en `CREDITOS.md`.
