# 0027 — Enmienda H13d2 (15-11-2026): el circuito de un avión de pasaje, y el de su senda

Va aparte para no chocar con la de H13d1 en el mismo ADR; se junta al final de
`0027-el-despegue-y-la-toma-de-su-manual.md`.

La enmienda H11a dejó medido que, con el JAZ 50 en la flota, su avisador de
terreno daba la precaución al virar a final en los campos de
`aproximaciones-sobre-el-relieve.test.ts`, y que no se había mirado por qué.

### Por qué avisaba, y por qué el aviso se queda

Es la función de mirar delante del TAWS, «caution terrain», unos dos
kilómetros antes del umbral y a unos 390 ft, en once cabeceras. No lo
provocaban el relieve ni la velocidad: el circuito se escala con la velocidad
de aproximación (`escalaDeCircuito`), el Twin Otter se aproxima a 70 nudos como
el entrenador, y volaba su circuito, el de una escuela, con una escala de
1,09. Su base bajaba 150 m en 1.087, a 7,9°, y entraba en final a 338 ft
todavía virando. La precaución salía igual de 60 a 90 nudos y también sobre el
mar en la 03 de Lanzarote.

Uno de verdad la daría. La norma admite en la aproximación final una
precaución hasta 450 ft sobre el terreno bajando a 1.000 ft/min y hasta 550 a
1.500 (ETSO-C151b, apéndice 3, tabla E), y la del juego salía entre 375 y 409.
Lo que el equipo de Honeywell desensibiliza junto a la pista es aterrizar (MK V
y MK VII, *Pilot's Guide* 060-4241-000, p. 29; KGP 560/860, p. 29); para las
bajadas empinadas el MK VI tiene su propia entrada, «Steep Approach»
(*Line Maintenance Manual* 060-4199-180, 2.2.1 y 3.8.8). El aviso no se apaga.

### Lo que no era de verdad: el circuito

Un Twin Otter de línea no vuela el circuito de la escuela. Un avión de pasaje
entra en final estabilizado a 500 ft o más en vuelo visual, con las alas a
nivel, en la senda y sin bajar a más de 1.000 ft/min (Flight Safety
Foundation, *ALAR Briefing Note* 7.1). Desde aquí, `escalaDelCircuitoDe` le da
a todo avión con pasaje —lo dice su ficha: `ventanillas`, que son las del
pasaje, o `null` sin él— una escala que nunca baja de la que le hace entrar en
final a 500 ft: `ESTABILIZADO_EN_FINAL / (BASE_A_FINAL · tan senda)`, 1,62 con
la senda de tres grados. Las avionetas, el fumigador y el bimotor de pistón no
llevan pasaje y su circuito no se mueve.

| JAZ 50 | Antes | Ahora |
|---|---|---|
| Escala del circuito | 1,09 | 1,62 |
| Entrada en final | a 1.957 m del umbral y 338 ft | a 2.908 m y 500 ft |
| Base | 150 m en 1.087 m, 7,9° | 150 m en 1.789 m, 4,8° |
| Altura del circuito | 253 m | 302 m |

El JAZ 60, el 90, el 110 y el 120 ya iban por encima con su velocidad —el que
menos, el JAZ 60, entra a 518 ft— y con la senda de tres grados no se mueven.
Lo dicen `circuito-terreno.test.ts` y `circuito-escala.test.ts`, que no
cambian. La escala la piden igual el hilo ocre, el circuito de la torre, el
del tráfico que vuela contigo y las sondas de los bancos. Los tipos del
tráfico, que no son fichas, siguen con la de su velocidad: sus dos de pasaje,
el turbohélice y el reactor, se aproximan a 57 y 69 m/s, por encima del suelo.

### Y el circuito entra en final por la senda de su pista

El circuito era lo único que no miraba la senda publicada de su cabecera: las
luces, el rombo de la final, el G/S del automático y la instructora ya iban por
la del PAPI (`sendaDeLaCabecera`). En la 21 de Lanzarote, cuyo PAPI está a 3,7°
por la loma que hay a una milla del umbral (AIP España, AD 2-GCRR, 2.14), el
circuito entraba en final a tres grados y pasaba a treinta y cinco metros de
ella, y al JAZ 90 su avisador le daba «terrain, pull up» a 2.500 m del umbral
y 145 m, en el circuito que el propio juego le dibujaba. La prueba no lo veía
porque solo miraba al primer avión que avisaba, y ese era el JAZ 60 con su
precaución.

Desde aquí la pista del circuito lleva la senda de su cabecera (`sendaDe` en
`world/circuito.ts`, `pistaDelCircuito` en `Game`): la entrada en final cae en
ella, el circuito sube con ella y la base baja lo mismo. Cambia el circuito de
todos en las tres cabeceras que no publican tres grados: la 21 de Lanzarote
(3,7°), la 19 de Fuerteventura (3,45°) y la 09 de Cuatro Vientos (2,8°). En
esta última, además, el suelo de 500 ft pide más escala: también al JAZ 60, que
con 2,8° entraría a 485 ft.

La prueba mira ahora a todos los aviones que avisan, y no solo al primero.

### Lo que queda, con su porqué

Con las dos cosas, el «pull up» del JAZ 90 en la 21 de Lanzarote ya no sale, y
el JAZ 50 deja de avisar en nueve de las once cabeceras. Quedan precauciones,
nunca un «pull up», en tres circuitos, y cada una va en
`AVISA_EN_EL_CIRCUITO` con su porqué y la comprobación de que sigue haciendo
falta:

- **La 21 de Lanzarote**, al JAZ 60 y al JAZ 50 al entrar en final, a unos
  2.500 y 2.700 m del umbral: el suelo sube a 78 m sobre el umbral a dos
  kilómetros y a 95 a cuatro. Es la misma razón por la que su PAPI está a
  3,7°.
- **La 15 de SGOG**, al JAZ 50 al virar a final, a 3.400 m: el umbral está en
  una hondonada y el suelo bajo la final sube a 49 m sobre él a tres
  kilómetros.
- **La 16 de El Hierro**, al JAZ 50 al virar a final, a 3.400 m: la final va
  sobre el mar y lo que ve es la isla al lado de su viraje, más cerrado que el
  del JAZ 60.

### Lo que cambia en lo que vuelan los bancos

El circuito del JAZ 50, que todavía no vuela ningún banco de navegador
mientras esté en el taller, y el de todos en la 21 de Lanzarote, en la 19 de
Fuerteventura y en la 09 de Cuatro Vientos, más el del JAZ 60 en esta última.
Lo demás, igual.
