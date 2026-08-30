# Contexto del repositorio

Notas para cualquiera —persona o herramienta de asistencia— que toque este
código sin haber estado en las conversaciones que lo originaron.

## Qué es

Simulador de vuelo para navegador. Producto de **Oksigenia SL**, publicado
bajo la marca **Granja Óga**. Público objetivo: chicos de 7 a 14 años en
Paraguay, y adultos que quieran volar sin leer un manual.

## Reglas que no se negocian

1. **Idioma de la interfaz**: español paraguayo y guaraní (`gug`). Sin
   españolismos. El registro es cercano, de tuteo, no formal.
2. **Test Ña Emy**: si una abuela paraguaya con WhatsApp como única
   referencia no puede usar una pantalla, la pantalla no está terminada.
3. **Rendimiento primero**: el objetivo es 60 fps en una tablet Android de
   gama media y en el portátil de un colegio. Antes de añadir un efecto
   visual, se mide.
4. **Sin telemetría de menores**: este juego no recoge datos personales, no
   pide registro y no lleva analítica de terceros. No se añade ninguna.
5. **Cada asset se anota en `CREDITOS.md`** con su licencia y su origen,
   antes de entrar. Sin licencia verificable, no entra.
6. **Los comentarios explican el porqué**, no el qué. El código ya dice qué
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
