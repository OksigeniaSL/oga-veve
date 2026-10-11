# Pendiente: las voces del automático, los gases y el combustible

El código ya está hecho (11 de octubre de 2026): claves, textos en `es-PY` y
`en`, recetas y enganches en `game.ts`. Cada frase se pide **solo si su
grabación está en el pack**; hasta entonces suena lo grabado que también es
verdad —«Se soltó el piloto automático», «Andá a la pista»— o nada, y se ve
en el panel y en la tira de la radio. Falta grabar.

## Lo que hay que grabar

La instructora (`instructor`), 606 caracteres:

| Clave | Caracteres | Dónde suena |
|---|---|---|
| `vuelo.niveladaAsistida` | 119 | `sostenerElNivel`, al capturar la ventanilla por debajo del crucero, una vez por vuelo (Guyrami y Tukã) |
| `vuelo.gasesAutomaticos` | 127 | `ponerPilotoAutomatico`, al ponerlo en un reactor, una vez por vuelo, en los tres de abajo |
| `vuelo.gasesSueltos` | 86 | `soltarLosGases`, la primera vez; si a la vez se suelta el gas de la final, lo cuenta ese |
| `vuelo.automaticoParaAterrizar` | 76 | detrás del «autopilot disconnect» de los 600 ft, en lugar de `vuelo.pilotoSuelto` (en calma) |
| `vuelo.reservaAqui` | 75 | la reserva llegando al destino, en lugar de «Andá a la pista» (en calma) |
| `vuelo.reservaMinimo` | 123 | detrás de la respuesta de la torre a «minimum fuel», en Taguató (en calma) |

`vuelo.reservaMinimo` ya no dice «ella nos pone primeros»: «minimum fuel» no
es una emergencia ni pide prioridad (OACI, Anexo 6, parte I, 4.3.7.2.2).
Ahora: «Nos queda justo, así que avisamos a la torre: combustible mínimo. No
es una emergencia: es avisarle que no podemos esperar.»

Las torres, 38 caracteres cada una: `torre.solo.minimumFuel` (`torre`) y
`torre.canario.solo.minimumFuel` (`torre-canarias`), «roger, minimum fuel, no
delay expected», que es la fraseología de la OACI y no «expect no delay».

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor torre torre-canarias
node scripts/voces-elevenlabs.mjs instructor torre torre-canarias
```

1. Las recetas **ya están** —`crudo/instructor/recetas.json` y las de las dos
   torres, con `torre.minimumFuel` y `torre.canario.minimumFuel` montadas con
   la matrícula delante—: el horneado de cada voz no pasa hasta que estén
   todas sus tomas nuevas, también las de los demás pendientes.
2. Hornear, restaurar lo re-codificado que no sea nuevo y
   `node scripts/verificar-voces.mjs`.
3. Sacar `torre.minimumFuel` de `ESPERAN_SU_TOMA` en `src/audio/torre.ts`; lo
   pide `torre.test.ts` en cuanto el manifiesto la trae.
