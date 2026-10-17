# Pendiente: oír el RA completo

Las 16 tomas (ocho de cabina y ocho de la instructora, `vuelo.ra.*`) se grabaron el
17 de octubre de 2026 con eleven_multilingual_v2, con sus recetas en la instructora.

## Lo que falta: oírlo

`verificar-radar.mjs` mira el RA de frente —orden, cuadrado, franja y
tarjeta—, pero su tráfico no maniobra contra ti, así que no da ni el refuerzo
ni la inversión: ésos los prueban `src/flight/tcas.test.ts` con el otro
subiendo o tirándose hacia ti. Con la voz, en un reactor y en los tres
peldaños de abajo: la caja, y detrás, nunca a la vez, la instructora; el
refuerzo y la inversión cortan a la orden que suene (prioridad 36 en
`audio/maquina.ts`). En el de cabina, la caja sola.

## Lo que el RA sigue sin hacer

- **Coordinarse con el TCAS del otro**: el tráfico del juego no lleva TCAS ni
  maniobra por él, y su vuelo lo lleva `src/world/trafico.ts`.
- **Más de un tráfico a la vez**: un RA contra un solo tráfico; las órdenes de
  varios piden otra franja y otra tarjeta.
- **Volver a reforzar una aflojada**: la de «level off» que sale al aflojar se
  queda hasta el final.
