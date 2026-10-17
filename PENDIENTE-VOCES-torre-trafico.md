# Pendiente: el «hold position» al que la torre retiene en su puesto

El código ya está (17 de octubre de 2026). El que va a salir y la torre no
deja rodar —porque uno aterriza y va a dejar la pista por su doble raya— ya no
espera callado: llama como siempre («rodando a la cabecera») y se le contesta
que espere, una vez por retención; se le dibuja en su puesto y de ahí no se
mueve hasta que le sueltan y vuelve a llamar. Ver `RETENIDO` en
`src/flight/radio.ts`, `sabeRetenerA` en `src/game.ts` y
`src/flight/torre-al-trafico.test.ts`.

**Se dice solo si su toma está en el pack**, y lo que se dice depende de quién
contesta:

- **Un AFIS** —Concepción, Pilar, Mariscal Estigarribia, Pedro Juan
  Caballero, La Gomera— no retiene a nadie: le da la pista en uso y el tráfico
  que aterriza, «{indicativo}, runway in use {pista}, landing traffic», y
  quien vuela espera. Eso **ya está grabado** (`torre.afisInUseLanding`), así
  que en esos campos suena desde ya.
- **Una torre** le dice «{indicativo}, hold position, landing traffic» (Doc
  4444, fraseología de rodaje, «HOLD POSITION»; el párrafo, por verificar). La
  pieza «hold position» no está grabada: hasta que lo esté, en un campo con
  torre el retenido no llama, como antes. Medido con el banco de la torre
  (`quienDejaLaPistaPorSuRaya` a un minuto de tu toma): pasa en Silvio
  Pettirossi, Guaraní, Encarnación, La Palma, Tenerife Sur, Gran Canaria,
  Lanzarote y El Hierro, según la cabecera y el avión.

## Lo que hay que grabar: 2 tomas, 26 caracteres

Están ya en `scripts/frases-para-grabar.mjs` y en `docs/voces/`.

**Torre** y **torre de Canarias**, 13 cada una (la pieza; el indicativo y el
porqué van en la receta):

| clave | texto | car. |
|---|---|---|
| `torre.solo.holdPosition` | hold position | 13 |
| `torre.canario.solo.holdPosition` | hold position | 13 |

## Después de grabar

1. `node scripts/voces-elevenlabs.mjs <voz>` con `torre` y `torre-canarias`.
2. Las recetas, **después** de grabar (una receta que nombra una pieza que no
   existe rompe el horneado):
   - `crudo/torre/recetas.json`: la pieza ella misma y la frase con
     indicativo y porqué, como `torre.holdShortLanding`:
     `"torre.solo.holdPosition": ["torre.solo.holdPosition"]` y
     `"torre.holdPosition": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.holdPosition", "torre.solo.landingTraffic"]`.
   - `crudo/torre-canarias/recetas.json`: igual, con `torre.canario.`.
3. Sacar `torre.holdPosition` de `ESPERAN_SU_TOMA` en `src/audio/torre.ts`: la
   prueba de `torre.test.ts` lo pide en cuanto la toma está.
4. Hornear, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## Lo que no pide toma

El «backtrack runway» al tráfico que remonta la pista usa la receta que ya te
dicen a ti al remontar (`torre.backtrack`, con su indicativo y su pista, en
las dos torres y con cada lado). Un AFIS no lo dice.

## Lo que falta: oírlo

En Pilar con el JAZ 20, aterrizando con uno de la frecuencia a punto de salir:
«…rodando a la cabecera» y el AFIS, «runway in use…, landing traffic»; el
avión, quieto en su puesto con el motor en marcha y el faro de rodaje apagado,
hasta que pasas por su doble raya y vuelve a llamar. Con la toma grabada, lo
mismo en Encarnación o en El Hierro con el «hold position» de la torre.
