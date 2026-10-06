# 0014 — Las emergencias son procedimientos: el marco de práctica y el motor parado

Fecha: 2026-09-29 · juntado con main el 2026-10-06
Estado: aceptado · desarrolla el #90 y la parte de velocidades del #95 ·
completa los ADR 0002 y 0011 (modelo de vuelo) · lleva el peso del ADR 0019

El número es el que tenía al escribirse: main lo dejó libre al numerar el 0015
y siguientes, y no choca con ninguno.

## Contexto

El #90 dejó escrito el marco antes que el catálogo, y es lo que manda aquí:
**son procedimientos, no espectáculo**. Un piloto de línea pasa cada seis
meses por un simulador a practicar exactamente esto, y eso es lo que es este
juego. De ahí cuatro reglas que no se negocian:

1. **Nunca por sorpresa en un vuelo tranquilo.** Las averías se eligen, o se
   anuncian antes de empezar.
2. **Nadie muere. Nunca.** Ni se sugiere. Si sale mal, sale mal el ejercicio.
3. **Sin morbo.** Ni humo, ni gritos, ni música: la calma es el contenido.
4. **Cada avería enseña una cosa concreta.**

Lo único que había era el vuelo sin motor por falta de combustible
(`sin-motor.ts`), que llega por el camino largo —reserva, luz, flecha— y no se
puede elegir. Y el modelo de vuelo llevaba **un solo empuje** para todo el
avión: con todos los motores en marcha es exacto, porque los pares se anulan;
con uno parado deja de serlo, y lo que aparece —el avión guiñando hacia el
motor parado— es justo lo que hay que enseñar.

## Decisión

### El marco: se elige, se presenta, se hace y se cierra

- **`src/flight/ejercicios.ts`** es el registro: qué se puede practicar, en qué
  peldaños, con qué aviones, desde dónde empieza y qué falla y cuándo
  (`Averia` y `Momento`). Una avería nueva —aves, tren de morro— es una entrada
  más, y así entró la despresurización: ver «La cabina sin aire», abajo.
- **Por peldaños**, como dice el #90: Guyrami, ninguna; Tukã, solo el planeo,
  avisado y como juego —llegar a la pista—; Taguato, V1 (parar antes, seguir
  después) y un motor parado en vuelo; Taguato Ruvicha, además, la **sesión de
  simulador**: se sabe que es un ejercicio y no qué va a fallar ni cuándo.
- **Se elige en el hangar**, en «¿A qué jugás?», en un grupo propio con un
  dibujo por ejercicio —el motor dormido son dos zetas, no humo—. El grupo
  solo aparece con los ejercicios de ese peldaño y ese avión, y un ejercicio
  deja de valer si se cambia a un peldaño o a un avión que no lo tiene. **No se
  recuerda** de una partida a otra: encontrárselo puesto sería la sorpresa que
  el marco no admite. Se practica en casa: el destino es la vuelta al campo.
- **La instructora lo presenta con calma antes** —qué va a pasar y qué se
  hace— en los cuatro peldaños, con el dibujo en la tarjeta. La avería llega
  después de contarla: en el aire, a los catorce segundos; en la carrera, en la
  carrera.
- **`src/flight/practica.ts`** lo hace pasar y no habla: devuelve sucesos
  (`fallo`, `velocidad`, `asegurar`, `declarar`, `bomberos`, `cerrar`) y el
  juego decide quién los dice en cada peldaño. Se prueba sin navegador.
- **El cierre nunca es un reproche.** Parar a tiempo antes de V1 se felicita
  y cuenta en el cuaderno como una frustrada: renunciar a tiempo es ganar.
  Volver y aterrizar, también. Parar pasada V1, o seguir antes de ella, se
  cierra bien y se cuenta con calma qué se hace la próxima vez. Y si hay un
  percance durante un ejercicio no se dice «se rompió»: **el ejercicio no
  salió, y en el simulador se repite**, con la flecha de volver a empezar y sin
  el avión torcido. Ni pantalla roja en ningún caso.

### El modelo: los motores uno a uno

`src/flight/motores.ts` y `fdm.ts`:

- **Cada motor en marcha da su parte** del empuje de la ficha desde su sitio,
  `motoresA` —el mismo que dibuja su modelo, y lo comprueba una prueba que lee
  el `.py`—. Uno parado no empuja y **frena**: en molinete mucho, en bandera
  casi nada (`MotorParado` en la ficha). El par de guiñada es la suma de los
  dos, y con todos en marcha es cero: el avión vuela igual que antes.
- **Qué hace la hélice**, por tipo: el bimotor de pistón la pone en bandera
  a mano (sin ella, con un motor no sube: el manual de la FAA cuenta unos
  doscientos pies por minuto de molinete); el turbohélice, sola a los dos
  segundos (*autofeather*); un fan no tiene bandera y sigue en molinete
  (resistencia de Torenbeek, apéndice G).
- **Sin ningún motor** no hay par: es el planeo de `sin-motor.ts`, con la llave
  quitada, que ya se calculaba con la polar que vuela el modelo.

### Las velocidades, del avión que vuela

`src/flight/velocidades-de-despegue.ts`, con las reglas de la CS-25/FAR-25:

- **Vmc**: el timón a fondo contra el par del motor crítico parado y el otro a
  tope. Con el timón de las fichas, el JAZ 40 salía a 72 kt —por encima de su
  V1— y el JAZ 90 a 154 —por encima de su Vr—: aviones que no se certificarían.
  **El timón de los dos se corrigió** a lo que tiene un avión de su clase
  (`cnRudder` 0,04 y 0,07, dentro de la banda del Navion), y quedan en 62 y
  110 kt.
- **V1 por pista y por aire**: la de la ficha, salvo que acelerar hasta ella,
  dos segundos decidiendo y frenar sin reversa no quepa en la pista; entonces
  baja a la que cabe, y nunca por debajo de la Vmc. La cuenta usa el empuje y
  la frenada del modelo de vuelo, y la prueba de `motores.test.ts` para el
  avión de verdad en la pista más corta que se le deja.
- **V2**: la mayor de 1,2 veces la pérdida con los flaps de despegue, 1,1 veces
  la Vmc y la Vr. **En el bimotor de pistón no hay V2**: se vuela la línea
  azul, la Vyse, sacada de la polar y del empuje.

| | Vmc | V1 (pista mínima) | Vr | V2 / Vyse | sube con uno |
|---|---|---|---|---|---|
| JAZ 40 | 62 kt | 66 kt | 72 kt | Vyse 91 kt | 0,9 m/s en bandera, −0,2 en molinete |
| JAZ 60 | 65 kt | 74 kt | 80 kt | V2 87 kt | 1,3 m/s |
| JAZ 90 | 110 kt | 136 kt (140 en pista larga) | 152 kt | V2 162 kt | 10 m/s |
| JAZ 120 | 139 kt | 156 kt | 167 kt | V2 177 kt | 13 m/s, con tres |

El HUD enseña ya la V1 de la pista de hoy, no la de la ficha. Y se cuenta al
empezar a correr, con **la pista que queda por delante** —la de la
intersección, si se sale de una— y **el peso de ese momento**, con el
combustible que lleva (ADR 0019): antes de eso el depósito no tiene todavía
lo del tramo.

### El procedimiento, por tipo

- **Antes de V1**: se para. Gas atrás, frenos y reversa donde la hay.
- **Pasada V1**: se vuela. El pie del lado del motor bueno —«pie muerto, motor
  muerto»—, la nariz a la V2 o a la línea azul, el tren dentro, y **nada con el
  motor hasta los cuatrocientos pies** en los de turbina; allí la compañera lo
  asegura. En el de pistón, la bandera enseguida, porque sin ella no sube.
- **Se declara**: MAYDAY con un motor o ninguno, PAN PAN en el cuatrimotor que
  pierde uno, y 7700 en el transpondedor. La llamada se ve escrita en la tira
  de la radio —aquí nadie habla por quien vuela— y la torre contesta con su
  voz, **da prioridad** —la misma `conPrioridad` del MAYDAY y del «minimum
  fuel»: a quien la tiene no se le inventa una frustrada, y la cabecera que
  elija se le autoriza al alinearse, como sin motor; pero la pista ocupada de
  verdad y los mínimos siguen mandando, que con un motor se puede ir al aire—
  y **pone a los bomberos** junto a la pista. Tras un despegue abortado van al
  avión, a mirarle los frenos.

### Quién dice qué, con la escalera

- **La máquina**, al instante y **solo donde la hay**: en los de pantallas, una
  campanada de precaución, «ENG 1 FAIL» en el EICAS con lo que se va haciendo
  debajo y la luz ámbar con el maestro. **No hay voz de «engine fail»**: los
  aviones de su clase no la llevan —suenan y escriben—, y lo que se enseña es
  real. El bimotor de pistón no tiene nada de eso: se nota en los pies, en el
  oído —se oye la mitad de motor— y en la aguja que cae.
- **La tripulación**, detrás y no a la vez: en el peldaño de cabina, *engine
  failure* y, antes de V1, *stop*, en inglés; en los de abajo, la instructora
  en casa con qué ha pasado, qué pedal pisar, qué velocidad sostener, qué hace
  la compañera con el motor y por qué se declara. La explicación crece con el
  peldaño; el sonido de la máquina, no.
- **Todo se graba**, en calma y con la voz de cada sitio: las frases de la
  instructora, los dos cantos de cabina y la respuesta a un PAN PAN de las dos
  torres, con los ajustes de las tomas en calma y «V1» leído «ve uno». Están
  en `frases-para-grabar.mjs`, y **lo que no está grabado no suena**: se queda
  en el dibujo y el texto de la tarjeta y no pasa a la voz del navegador, que
  en Brave para Linux es muda y en el resto es un robot —justo en lo que más
  importa de un ejercicio, la calma—. Los cantos de cabina y el PAN PAN no
  entran en sus tablas —`CLAVE_DE_CABINA`, `CLAVE_DE_TORRE`— hasta tener toma,
  que es la regla de esas tablas. Ver `PENDIENTE-VOCES-emergencias.md`.
- **Sin instructora** —el modo del grado de comandante— las emergencias siguen
  sonando, porque son seguridad: la presentación, lo que se hace y el cierre
  están en la lista de `flight/sin-instructora.ts`. Se callan las que explican
  sin que haga falta para volar: los bomberos y por qué se avisa a la torre.

### Los bomberos, sin drama, y los de ese aeródromo

Camiones de pista, rojos, parados y apartados de la pista, con la baliza del
techo girando despacio. **Salen los de ese aeródromo**: tantos como pide la
categoría de bomberos que publica su AIP —la misma de la regla de qué avión va
adónde, `world/bomberos-publicados.ts`— con la tabla 9-2 del Anexo 14 de la
OACI: uno hasta la 5, dos en la 6 y la 7, tres de la 8 a la 10. Tres en
Asunción y en Gran Canaria, dos en La Palma, uno en El Hierro, y ninguno donde
no hay servicio —Concepción, Pilar, la granja— ni en los escenarios sin AIP:
no hay quien salga, y enseñarlo sería mentir. Con ellos, la tarjeta del camión
—la categoría escrita desde el peldaño de las cifras— y, en los peldaños que
explican, la instructora contando lo que se ve. Son trece llamadas de dibujo
con tres camiones y ninguna cuando no están. Ver `src/world/bomberos.ts`.

### La cabina sin aire, un ejercicio más

La despresurización y el descenso de emergencia se escribieron después, con su
propio procedimiento —`flight/despresurizacion.ts`: el aviso de cabina, las
máscaras, la bajada a donde se respira, el MAYDAY— y con su ficha lista para
este registro, `EJERCICIO_DE_DESPRESURIZACION`. Al juntarlos:

- Es una entrada de `EJERCICIOS` cuyos peldaños y aviones salen de esa ficha:
  Taguató y Taguató Ruvichá, y solo los presurizados.
- **Empieza arriba, en crucero** (`colocacion: "crucero"`), tan lejos de casa
  como para que quepan el descenso de emergencia y una bajada normal hasta la
  pista: al llegar a donde se respira, el aeropuerto más cercano es el de casa
  y está delante. La instructora lo presenta y, a los dieciocho segundos, se va
  el aire (`Averia` `presion`); lo demás lo lleva `despresurizar` como siempre.
- Lo de toda emergencia declarada: el MAYDAY da prioridad —también fuera del
  ejercicio, que un MAYDAY es un MAYDAY—, los bomberos esperan junto a la
  pista y el ejercicio se cierra al pararse en tierra, con su propia
  felicitación: máscara primero, abajo rápido y al más cercano.

## Lo que no, todavía

- **El resto del catálogo**: fuego de motor, petardeo, aves, reventón, tren de
  morro, regreso con sobrepeso, amerizaje. El registro está hecho para que
  entren sin tocar el marco.
- **El encadenado**: la sesión de simulador sortea una avería y no encadena
  dos. La lista de averías de un ejercicio ya lo admite.
- **El factor P** —por qué el crítico es el izquierdo— y el alabeo de cinco
  grados de la Vmc en vuelo: el modelo no lleva lo primero y la cuenta ya es la
  del derrape cero, que es lo que consigue lo segundo.
- **La despresurización en la sesión de simulador**: el simulador empieza en
  la pista, y la cabina sin aire se practica arriba. Se queda en su ejercicio.

## Consecuencias

- El bimotor de pistón y el reactor pesan algo más en los pies que antes: su
  timón es el de su clase. Las pruebas de siempre del modelo siguen pasando.
- **Y el pie de tecla en la carrera es el mismo en toda la flota.** Con el
  timón del JAZ 90 al doble, la tecla daba el pedal entero a 127 nudos por la
  pista: 0,7 g de lado y un piloto a toques que no volvía al eje
  (`carrera-fina.test.ts`, escrita después con el timón viejo). Un pie de verdad
  corrige el eje con poco pedal a esa velocidad, así que en la carrera la tecla
  pide el pedal que en ese avión da lo que el timón de 0,04 da entero
  (`pieDeTecla`); y mantenida más de un segundo, aprieta hasta el fondo, que es
  lo que hace falta para sujetar un motor parado. El dedo y el mando dan la
  posición que tienen, como siempre.
- Con un motor parado el avión vuela, sube a su V2 con el timón que haga falta
  y por encima de la Vmc en toda la flota multimotor; antes de V1 se para en la
  pista más corta que se le deja, y sin motores se planea a la velocidad de
  mejor planeo. Lo comprueba `motores.test.ts`.
- `scripts/verificar-emergencias.mjs` vuela los tres casos dentro del juego:
  parar antes de V1, seguir después con vuelta y aterrizaje, y el planeo de
  Tukã con la avioneta.

## Referencias

- #90 (el marco y el catálogo) y #95 (las velocidades y por qué nudos).
- EASA CS-25.107 y .109; FAA 14 CFR 25.107 y 25.149.
- FAA, *Airplane Flying Handbook* (FAA-H-8083-3), capítulo de bimotores.
- E. Torenbeek, *Synthesis of Subsonic Airplane Design* (1982), apéndice G.
- DINAC R 4444 y RD 1180/2018, para la fraseología; el 7700 del Doc 4444.
