# Modelos de aeronave

Un fichero glTF binario por aeronave, con el nombre de su identificador:
`oga172.glb`, `mainumby.glb`.

**Si no hay ninguno, el juego vuela igual.** Monta la aeronave con cajas, que
es lo que ha hecho siempre. Es la misma regla que con las teselas de Google:
que falte un recurso externo no puede dejar a nadie sin volar.

## Qué se le hace al modelo al cargarlo

No hace falta prepararlo con las convenciones de este juego, porque se le
imponen al vuelo (ver `src/world/aeronave-modelo.ts`):

- **La escala sale de la envergadura** que declara la aeronave, no de la del
  fichero — que puede venir en metros, centímetros o pulgadas.
- **El morro se gira a la Z negativa**, que es adelante en este mundo.
- **Las ruedas se bajan al origen**, porque el juego coloca la aeronave por su
  tren de aterrizaje.
- **La hélice se busca por nombre**: `prop`, `helice`, `propeller`, `spinner` o
  `blade`. Si no aparece, se queda quieta y no pasa nada — es un adorno.

## Licencias

Lo mismo que el resto del proyecto: **si no se puede anotar la licencia, el
asset no entra**. Sirven CC0 y CC-BY, que conviven con Apache-2.0 sin
contagiar nada; CC-BY solo pide atribución y aquí se atribuye de todos modos.

No sirve GPL mientras el juego sea Apache-2.0.

Y una advertencia que **no es de licencia sino de marca**: «Cessna», «Piper» y
compañía son marcas registradas. La geometría de un modelo puede ser libre y
el nombre no serlo. Se usa la forma; el nombre y la librea, no. Por eso la
avioneta de este juego se llama Óga 172. Ver el apartado de marcas registradas
en `CREDITOS.md`.

## Tamaño

Esto tiene que abrir en una tablet. Un modelo de veinte mil triángulos está
bien; sus texturas de 4K, no — hay que bajarlas a 1K antes de meterlas.
