# Pendiente: la voz del automático del E-Jet

El JAZ 90, de la clase del E170, ya no dice «autopilot disconnect» al soltarse
el automático: dice lo que dice su tipo, «AUTOPILOT», dos veces. Lo oyó el
NTSB en el registrador del ERJ-170 de Shuttle America en Cleveland
—«auto-pilot, auto-pilot», con la nota «Voice identified as aircraft
mechanical voice» (AAR-08/01)— y lo escribe el manual de un operador de E195:
el botón «triggers the aural warning "AUTOPILOT"». Ver el ADR 0027, enmienda
H10a.

## Lo que falta: grabarla

| Voz | Clave | Texto | Caracteres |
|---|---|---|---|
| cabina | `cabina.autopilot` | autopilot, autopilot | 20 |

Con la voz de la cabina de siempre —seca, plana, sin emoción— y el mismo modelo
que el resto de su pack. No va en `CLAVE_DE_CABINA`: el juego no la pide por su
texto sino por el avión que se suelta (`VOZ_DEL_AUTOMATICO_DE_EMBRAER` en
`src/audio/cabina.ts`), igual que las del RA. La prueba «cada grabación de
cabina la pide alguien» ya la cuenta.

Mientras no esté en el pack, la máquina no puede decirla y en el JAZ 90 lo dice
la instructora, en casa, en los cuatro peldaños: «Se soltó el piloto
automático».

## Y después: oírla

En el JAZ 90, con el automático puesto, soltarlo con su botón: en el peldaño de
cabina, «autopilot, autopilot» y nada más; en los de abajo, detrás, la
instructora. En el JAZ 110 y el JAZ 120 tiene que sonar la sirena y no una voz.
