# ADR 0001 — three.js como motor de render

**Fecha**: 2026-08-30 · **Estado**: aceptada

## Contexto

El juego se juega en la web de Granja Óga, sin descarga, en el navegador de
una tablet, de un portátil de colegio y de un móvil. Además es el escaparate
técnico público de Oksigenia SL, y a medio plazo puede venderse.

## Decisión

**three.js (MIT)**.

## Alternativas descartadas

**Godot 4** (MIT). Motor completo, con editor, y exporta a escritorio y móvil
—que es justo lo que querríamos si el juego llega a Steam—. Pero su export
web exige cabeceras de aislamiento de origen (COOP/COEP) en el servidor,
arrastra decenas de megas de WebAssembly y se comporta de forma irregular en
Safari de iOS. Para un juego cuya puerta de entrada es un enlace en una web,
eso es fricción en el peor sitio posible. **Se guarda como plan B para una
build de escritorio**, no como base.

**PlayCanvas** (MIT). Motor web excelente con editor visual colaborativo,
pero el editor es un servicio de pago alojado por un tercero. El motor es
libre; el flujo de trabajo, no. No queremos esa dependencia.

**Babylon.js** (Apache-2.0). Alternativa perfectamente válida y con mejor
sistema de física y GUI integrados. Pierde por ecosistema y por disponibilidad
de gente que ya lo conoce.

**Cesium** (Apache-2.0). El motor es libre pero el terreno y la imaginería
globales son un servicio con cuota de pago, y además a baja altura se ve mal.
Ver [ADR 0003](0003-terreno-nasadem.md).

## Consecuencias

- Cero obligaciones de licencia: MIT.
- Hay que construir a mano lo que un motor daría hecho: bucle de juego,
  escena, entrada, UI. Es más trabajo y es también donde está el mérito
  visible del escaparate.
- El *look* es enteramente nuestro. No parece "un juego hecho con X".
- Si algún día hace falta escritorio o móvil nativo, hay que reescribir la
  capa de render. El modelo de vuelo, que es lo valioso, es portable.
