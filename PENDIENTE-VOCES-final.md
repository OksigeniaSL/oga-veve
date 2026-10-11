# Pendiente: las voces de la final (la ventanilla y el permiso anulado)

El código ya está hecho (11 de octubre de 2026): claves, textos en `es-PY` y
`en`, recetas y enganches en `game.ts`. Cada frase se pide **solo si su
grabación está en el pack**; hasta entonces la ventanilla cambia sin decirlo y
la pista ocupada se explica con `vuelo.mandanFrustrar`, que está grabada y
también es verdad. Falta grabar.

## Lo que hay que grabar

La instructora (`instructor`), 277 caracteres:

| Clave | Caracteres | Dónde suena |
|---|---|---|
| `vuelo.ventanillaFrustrada` | 135 | `ponerLaFrustradaEnLaVentanilla`, al cambiar la ventanilla en la final con el `G/S`: solo en Taguató, una vez por vuelo |
| `vuelo.permisoAnulado` | 142 | `mandaronIrseAlAire` con la pista ocupada y el permiso ya oído, en lugar de `vuelo.mandanFrustrar`, en los tres de abajo; la tarjeta lleva la misma frase (en calma) |

`vuelo.permisoAnulado` sigue sonando sin instructora, como la frase a la que
sustituye: está en `SEGURIDAD` de `src/flight/sin-instructora.ts`.

**La pista de al lado.** El tráfico dibujado usa solo la pista en uso, así
que nunca hay nadie en la paralela. Si algún día lo hay, hará falta una frase
que lo cuente, y no antes.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Las recetas **ya están** en `crudo/instructor/recetas.json`: hornear (no pasa
hasta que estén todas las tomas nuevas de la instructora), restaurar lo
re-codificado que no sea nuevo y `node scripts/verificar-voces.mjs`. No hay
que tocar código.
