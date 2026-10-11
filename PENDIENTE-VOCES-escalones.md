# Pendiente: el número de la velocidad, dicho en el peldaño de las cifras

El código ya está hecho (11 de octubre de 2026). En Taguató, detrás de los
pasos de velocidad de la cadena —acelerar, frenar, mantener—, la instructora
dice la cifra de la marca: «Ahora vamos más despacio: menos gas, hasta la
marca rosa. Son trescientos noventa kilómetros por hora.» Se monta como las
alturas de la torre: la frase del paso, ya grabada, con un hueco
`{velocidad?}` en su receta, y una pieza por cifra en la voz de la
instructora. Ver `velocidadEnVoz` en `game.ts` y `src/flight/velocidad-dicha.ts`.

La tarjeta lleva la misma cifra que la voz, a la decena: «(390 km/h)» y no
«(393 km/h)».

## Lo que hay que grabar

La instructora (`instructor`): **29 piezas**, 1.223 caracteres,
`vuelo.paso.velocidad.<n>` para n = 110, 130–280 de diez en diez, 310, 340,
350, 360, 390, 410, 420, 440, 460, 480, 520 y 540. Son **las cifras que el
juego puede pedir**, sacadas de la escalera de velocidades de los seis aviones
(`KMH_QUE_SE_DICEN`, que comprueba `velocidad-dicha.test.ts`), y solo en km/h:
el único peldaño que dice cifras y todavía explica es Taguató, que vuela en el
sistema métrico. En nudos no se graba ninguna; si algún día un peldaño de
cifras vuela en nudos, la misma prueba lo dice.

Mientras no estén, la frase del paso suena entera y sin número, como ahora.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Las recetas **ya están** en `crudo/instructor/recetas.json` —las 29 piezas y el
hueco en los siete pasos de velocidad—: hornear (no pasa hasta que estén todas
las tomas nuevas de la instructora), restaurar lo re-codificado que no sea
nuevo y `node scripts/verificar-voces.mjs`. No hay que tocar código. Si cambia
un avión o un peldaño de la escalera, `velocidad-dicha.test.ts` dice qué
cifras faltan o sobran.
