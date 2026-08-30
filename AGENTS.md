# Contexto del repositorio

Notas para cualquiera —persona o herramienta de asistencia— que toque este
código sin haber estado en las conversaciones que lo originaron.

## Qué es

Simulador de vuelo para navegador. Producto de **Oksigenia SL**, publicado
bajo la marca **Granja Óga**. Público objetivo: niños de 4 a 14 años en
Paraguay, y adultos que quieran volar sin leer un manual.

## Reglas que no se negocian

1. **Dos registros del castellano, y no se mezclan.**
   - *Texto de producto* —lo que lee quien juega: `src/i18n/es-PY.ts`, el
     título y la descripción de `index.html`— va en **castellano paraguayo**,
     con voseo y sin españolismos, junto al guaraní (`gug`).
   - *Texto de desarrollo* —README, ADR, este fichero, comentarios del
     código, mensajes de commit— lo escribe Oksigenia desde Canarias y va en
     **castellano peninsular**. No hay que fingir un acento que no es el
     nuestro para hablarnos entre nosotros.
2. **Se juega sin saber leer.** La jugadora más joven tiene cuatro años. Lo
   esencial —despegar, virar, aterrizar, entender que algo va mal— se
   comunica con iconos, color, movimiento y sonido. El texto acompaña, nunca
   es el único canal. Una pantalla que obliga a leer para avanzar está mal.
3. **Test Ña Emy**: si una abuela paraguaya con WhatsApp como única
   referencia no puede usar una pantalla, la pantalla no está terminada.
4. **Rendimiento primero**: el objetivo es 60 fps en una tablet Android de
   gama media y en el portátil de un colegio. Antes de añadir un efecto
   visual, se mide.
5. **Sin telemetría de menores**: este juego no recoge datos personales, no
   pide registro y no lleva analítica de terceros. No se añade ninguna.
6. **Cada asset se anota en `CREDITOS.md`** con su licencia y su origen,
   antes de entrar. Sin licencia verificable, no entra.
7. **Los comentarios explican el porqué**, no el qué. El código ya dice qué
   hace.

## Convenciones de código

- Identificadores y nombres de fichero en **inglés**; comentarios y
  documentación en **castellano**. Es un repositorio público que aspira a
  recibir contribuciones de fuera, pero el equipo piensa en castellano.
- TypeScript estricto. `noUncheckedIndexedAccess` está activo a propósito.
- Sin framework de UI: el HUD es DOM y CSS. Añadir React aquí sería pagar
  200 KB por un marcador de velocidad.
- Unidades **SI dentro del modelo de vuelo** (metros, m/s, newtons, radianes)
  y conversión a nudos/pies/km-h **solo en la capa de presentación**. Mezclar
  unidades dentro del FDM es la forma más rápida de romperlo.

## Dónde está el porqué

En `docs/adr/`. Antes de cambiar el motor de render, el modelo de vuelo o el
origen de los datos de terreno, lee el ADR correspondiente: la decisión ya se
tomó con argumentos, y si se cambia hay que escribir el ADR que la revierte.

## Publicación

Los créditos del juego y el `NOTICE` mencionan a Oksigenia SL y Granja Óga.
No se acreditan herramientas de desarrollo, ni de asistencia, ni de
generación, ni en el repositorio ni en el juego ni en los mensajes de commit.
