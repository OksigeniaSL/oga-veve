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
  que es la regla de esas tablas. Se grabaron el 11 de octubre de 2026, y
  entraron con su toma.
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

## Enmienda H37e (19-11-2026): el bimotor de pistón no tiene V1

### Lo que pasaba

El ejercicio de después de V1 le paraba un motor al JAZ 40 rodando a 69
nudos, tres por encima de su V1 del juego —que es su Vmc, 66—, y le pedía
seguir. Su manual dice otra cosa, y la FAA también:

- **Piper, PA-34-220T Seneca III** (VB-1110, sección 3): «If engine failure
  occurs during takeoff and 85 KIAS has not been attained: Throttles — CLOSE
  both immediately. Stop straight ahead», y si no queda pista, se para igual,
  frenando a fondo y esquivando lo que haya delante. Por encima de 85 con el
  tren todavía fuera, «if adequate runway remains, CLOSE both throttles
  immediately, land if airborne and stop straight ahead»; solo sin pista se
  decide seguir, y entonces «after establishing a climb, retract landing gear,
  accelerate to 92 KIAS and feather inoperative engine prop». El del Seneca I
  (VB-423), lo mismo con 100 mph.
- **FAA, *Airplane Flying Handbook*** (FAA-H-8083-3C, cap. 13, p. 13-12):
  «if the landing gear has not been selected up, the takeoff should be
  rejected, even if airborne». Con el tren pedido dentro y si el avión puede
  subir, se sigue: identificar, verificar, bandera y la línea azul.
- **El modelo lo dice igual**: con un motor en molinete y el tren fuera, el
  JAZ 40 no sube a ninguna velocidad (ADR 0027, enmienda H37b). El banco
  pasaba en Gran Canaria porque la pista es larga: volvía a tocar a los 670 m
  y se iba del todo a los 2.900.

Y la compañera ponía la bandera tarde: el procedimiento no empezaba hasta que
el ejercicio daba el avión por volando, a quince metros, y en ese avión la
bandera va en cuanto se ha identificado el motor.

### Qué manda cada tipo

| | V1 en su manual | Fuente | Ejercicios del despegue |
|---|---|---|---|
| JAZ 40 (PA-34 Seneca II) | no: decide con 85 KIAS y el tren | POH del Seneca III, VB-1110, sec. 3; del I, VB-423; FAA-H-8083-3C, cap. 13 | «Motor en la carrera» (se para), «Motor con el tren arriba» (se sigue) |
| JAZ 50 (DHC-6 -400) | sí, igual a la Vr, 73 kt | PSM 1-64-1A, fig. 4-1 | antes y después de V1 |
| JAZ 60 (1900D) | sí, 100 kt a 16.000 lb | su AFM, citado por TSB A97C0229 | antes y después de V1 |
| JAZ 90, 110 y 120 | sí, la de transporte | CS-25.107 / 14 CFR 25.107 | antes y después de V1 |

Todos siguen con «Volar con un motor parado» y, en Taguató Ruvichá, con la
sesión de simulador.

### El cambio

- **`conV1`** (`ejercicios.ts`): los multimotores de turbina. Los ejercicios
  de antes y después de V1 solo se les ofrecen a ellos.
- **Dos ejercicios del bimotor de pistón**, con los dibujos de los de V1:
  - **«Motor en la carrera»** (`en-la-carrera`): falla donde fallaba el de
    después de V1 —a medio camino entre su V1 del juego y la rotación, o al
    irse del suelo si rota antes—, que es donde un reactor ya seguiría. En
    este avión se para, y parar se felicita: es lo que se enseña.
  - **«Motor con el tren arriba»** (`tren-arriba`): falla subiendo con el tren
    ya dentro del todo, desde quince metros, que es el único fallo del
    despegue en que su manual deja seguir. Se sigue a la línea azul.
- **`Practica` decide por el tipo** (`seParaAqui`): en los de turbina, antes
  de V1 en el suelo; en el bimotor de pistón, en el suelo siempre —rota a 72
  nudos, por debajo de los 85 de su manual— y en el aire mientras el tren siga
  pedido fuera y no vuele todavía. Lo mira con lo que el juego le cuenta del
  tren, `fuera`, `entrando` o `dentro`.
- **La bandera, enseguida**: si el bimotor de pistón sigue, el procedimiento
  empieza en el fallo, sin esperar a los quince metros, y la compañera
  identifica, verifica y pone la bandera a los cuatro segundos
  (`IDENTIFICAR_Y_BANDERA`), a la altura que sea.
- **La sesión de simulador** tiene los mismos tres momentos en todos, y lo que
  toca en cada uno lo dice su manual: en el bimotor de pistón, los dos de la
  carrera se paran y el de la subida se sigue.
- **El «seguí» de V1 se calla en esos ejercicios.** El destello de V1 sale en
  todos los aviones, que así se pidió (ver `hud.ts`), y no se toca. Pero en el
  JAZ 40 la instructora decía «ya despegamos: seguí» a 66 nudos y «paramos» a
  69. Mientras dura un ejercicio del despegue del bimotor de pistón, la voz y
  la tarjeta de «seguí» se callan; el destello sale igual.

### Lo que se dice

Cada frase de estos ejercicios tiene que ser verdad en cada avión que la oye:

- **Nuevas para el bimotor de pistón**: las presentaciones de los dos
  ejercicios; «falló un motor con el tren todavía fuera: los dos gases atrás,
  derecho por la pista, y paramos» (`ejercicio.paramosConElTren`); y el cierre
  de quien siguió con el tren fuera, que en ese avión lo seguro era parar
  (`ejercicio.seguidoConElTrenFuera`). «Antes de V1» no sale en ninguna.
- **La bandera con identificar y verificar** (`ejercicio.bandera`, que solo
  oye el de pistón): el motor parado es el del pie que no pisa, se verifica
  con su gas y se pone en bandera.
- **Las del cuatrimotor**: al JAZ 120 le quedan tres, y «sigue volando con el
  otro», «con un motor se sube» o «el avión vuela con un motor» no son verdad
  en él. Tiene las suyas (`CON_MAS_DE_DOS` en `game.ts`), y las del bimotor se
  quedan como estaban, que están grabadas. En el hangar, «Volar con un motor»
  pasa a «Volar con un motor parado», que es verdad en los dos.

Ninguna de las nuevas o cambiadas está grabada todavía, así que hasta que lo
esté se queda en el dibujo y en el texto de la tarjeta (ver
`decirDelEjercicio`).

### Volado

`verificar-emergencias.mjs` aprende `carrera` y `tren`, los dos del bimotor
de pistón, y `OGA_MOTOR=izquierdo|derecho` para elegir qué motor se para
—el ejercicio lo sortea—. En Gran Canaria, en Taguató:

- **Motor en la carrera** (`carrera gran-canaria jaz-40`), **7 de 7**: el
  derecho se para a 69 nudos rodando, la instructora pide parar con el tren
  fuera, y se para a 447 m del umbral, de 3.104. Cierre «parado», con los
  bomberos a mirar los frenos y la felicitación. Ni «V one» ni «seguí».
- **Motor con el tren arriba** (`tren gran-canaria jaz-40`), **11 de 11**:
  despega con los dos, mete el tren, y el derecho se para a 98 m, a 94 nudos.
  La compañera pone la bandera **a los 4,0 s del fallo**; sube a la línea
  azul —87 a 94 nudos, de 0,2 a 4,6 m/s— con el pie a 0,45, da la vuelta a
  mil pies y toca a 155 m del umbral, con MAYDAY, prioridad y bomberos.
- **Los de turbina, con el código nuevo**, siguen igual: el JAZ 60 después de
  V1 (`despues gran-canaria jaz-60`), **10 de 10**, con el izquierdo, toca a
  311 m del umbral; el JAZ 90 (`despues gran-canaria jaz-90`, con
  `OGA_MOTOR=derecho`), **10 de 10**, toca a 202 m. Ver el ADR 0027, enmienda
  H37e, por qué el derecho.
- **Las pruebas** (`practica.test.ts`): qué se ofrece a cada tipo; el de
  pistón para rodando pasada su V1 del juego y recién despegado con el tren
  fuera; si sigue con el tren fuera, se cierra contando que tocaba parar; con
  el tren fuera o entrando no falla el de la subida, y dentro sí; la bandera a
  los cuatro segundos a dieciséis metros; y la sesión de simulador del de
  pistón para los dos de la carrera y sigue el de la subida.

## Enmienda H37i (19-11-2026): «ya despegamos: seguí», solo donde es verdad

### Lo que pasaba

H37e calló el «V one… ya despegamos: seguí» del JAZ 40 **solo dentro de sus
ejercicios del despegue**. En un vuelo normal seguía sonando en su V1 del
juego, que es su Vmc, 66 nudos: justo donde su manual manda cerrar los dos
gases y parar. Y en los monomotores sonaba igual, con una frase que cuenta una
decisión —«pase lo que pase, se vuela»— que en un avión de un motor no existe.

El destello de V1 sale en todos los aviones porque así se pidió (ver
`hud.ts`), y eso no se toca. Lo que tiene que ser verdad en cada tipo es lo
que se **dice**.

### Qué se dice en el despegue de cada tipo

| | Antes, en V1 · en Vr | Su manual o su tripulación | Ahora |
|---|---|---|---|
| JAZ 20 (clase Cessna 172S), monomotor | destello y nota; «V one» arriba, «ya despegamos: seguí» abajo · «rotate» / «tirá para arriba» y la flecha | Sin V1, que es de la norma de transporte (14 CFR 1.2 y 25.107; CS-25.107). Motor que falla rodando: gas al ralentí y frenos; recién despegado, «Land STRAIGHT AHEAD» (C172S, manual de vuelo, sección 3). Se rota a 55 KIAS (sección 4) | V1: destello y nota, sin frase · Vr: igual |
| JAZ 25 (clase Ag-Cat), monomotor | lo mismo | Lo mismo: un motor, nada con lo que seguir | V1: destello y nota, sin frase · Vr: igual |
| JAZ 40 (clase PA-34 Seneca II), bimotor de pistón | lo mismo, callado solo en sus ejercicios (H37e) | Sin V1. Por debajo de 85 KIAS, «CLOSE both immediately. Stop straight ahead»; por encima con el tren fuera, parar si queda pista; seguir con la subida hecha y el tren arriba, a 92 (Seneca III, VB-1110, sección 3). «If the landing gear has not been selected up, the takeoff should be rejected, even if airborne» (FAA-H-8083-3C, p. 13-12) | V1: destello y nota, sin frase, siempre · Vr: igual · **con el tren pedido arriba, en el aire y a 85 nudos o más**: la tarjeta de «ya no se para» en los cuatro peldaños y «ya despegamos: seguí» de la instructora en los tres de abajo |
| JAZ 50 (DHC-6 -400) | «V one» / «seguí» · «rotate» | V1 igual a la Vr (PSM 1-64-1A, fig. 4-1) | igual |
| JAZ 60 (1900D) | igual | V1 de su AFM, 100 kt a 16.000 lb | igual |
| JAZ 90, 110 y 120 | igual | V1 de transporte, CS-25.107 / 14 CFR 25.107 | igual |

Los de turbina cantan además los ochenta nudos en sus procedimientos; el
juego no los canta, ni antes ni ahora, y eso queda fuera de esta enmienda.

### Por qué en el bimotor de pistón se dice con el tren

La frase de V1 es «la decisión ya está tomada». En el Seneca esa decisión no
se toma con una velocidad en la carrera sino **con el tren**: hasta que se pide
arriba, un motor que falla se para —en la pista o en lo que quede de ella—, y
desde que se pide arriba, con la subida hecha, se sigue. Los 85 nudos son los
de su manual para la carrera, y son también los que pide sostener al asegurar
un motor («Maintain direction and airspeed above 85 KIAS», *Engine Securing
Procedure*) y su velocidad mínima para parar uno a propósito. El JAZ 40 rota
a 72, así que con las ruedas en el suelo no llega nunca.

Así que en ese avión «ya despegamos: seguí» se dice donde es verdad, con la
misma frase de los de turbina, que está grabada: lo que se aprende es que en
ese avión la decisión la marca el tren. Se dice una vez por despegue —no en
una frustrada—, hasta mil quinientos pies, y no si el motor ya ha fallado en
un ejercicio, que entonces lo que se dice es el procedimiento. En el peldaño
de cabina no se canta nada: la tripulación de un Seneca ya ha dicho «positive
rate, gear up», y un canto inventado habría que desaprenderlo.

En los monomotores no se dice nada en su lugar. El momento de su despegue es
la Vr, que ya tiene su canto y su flecha, y llega dos nudos después.

La tarjeta de la fase «comprometido» —la de la pista que ya no da para parar,
calculada con la frenada— no cambia: dice «seguí» en un despegue normal en el
que ya no cabe parar, y eso es verdad en todos. En el JAZ 40 casi nunca sale,
porque a su Vr le bastan 540 m para parar.

### Y el ejercicio del tren arriba, si nadie lo mete

«Motor con el tren arriba» fallaba solo con el tren dentro, y si nadie lo
metía se quedaba armado el resto del vuelo. Ahora hace lo que un instructor:
**a 650 pies sobre el campo, con el tren todavía fuera, falla igual**
(`sinTrenA` en `ejercicios.ts`). Es una altura por la que se pasa siempre
—por encima de donde se pide el tren en todos los peldaños, 60 m o 120, y por
debajo del circuito, 250— y a la que ya no queda pista por delante para
posarse y parar. Ahí su
manual manda seguir y meter el tren: «If decision is made to continue,
maintain heading. After establishing a climb, retract landing gear,
accelerate to 92 KIAS and feather inoperative engine prop», y su *Engine
Securing Procedure* pone «Gear — retract» antes de identificar.

Se sigue como siempre —el pie, la bandera a los cuatro segundos, MAYDAY y la
vuelta— con dos cosas más: después del pie, «gear up» arriba y «metélo, el
tren te frena» abajo, y la tarjeta del tren; y «con un motor se sube despacio,
pero se sube» espera a que el tren entre, que con él fuera no es verdad. Se
ve por qué se mete: con un motor y el tren fuera, ese avión apenas sube.

### Frases

Ninguna nueva ni cambiada: «ya despegamos: seguí», «metélo, el tren te
frena» y «gear up» ya estaban, y grabadas.

### Comprobado

- **Las pruebas**: `lo-que-se-dice-al-despegar.test.ts`, qué tipo dice qué y
  dónde —«seguí» en V1 solo los de turbina; con el tren, solo el de pistón,
  en el aire, con el tren pedido arriba, desde 85 nudos y hasta mil
  quinientos pies—; y en `practica.test.ts`, el ejercicio del tren arriba sin
  tren: nada a 190 m, nada entrando, falla a 200 m con el tren fuera, la
  bandera a los cuatro segundos igual, «se sube» solo con el tren dentro, y
  con el tren metido a tiempo, nada cambia.
- **`verificar-emergencias.mjs tren gran-canaria jaz-40 taguato`**, 13 de 13:
  en V1, a 65 nudos indicados, se calla y queda apuntado; «ya despegamos:
  seguí» al meter el tren, a 103 nudos y 11 m, y el fallo después; la bandera
  a los 4,0 s, MAYDAY y toca a 49 m del umbral.
- **El mismo sin meter el tren** (`OGA_SIN_TREN=1`), 14 de 15: en V1 se
  calla, nadie dice «seguí» porque el tren no sube antes del fallo, y el
  motor falla a 198 m sobre el campo con el tren fuera; detrás de «engine
  failure» se pide meter el tren, la bandera va a los 4,0 s, MAYDAY, y toca
  a 135 m del umbral. La que no pasó era del banco y no del juego: medía la
  altura desde la cota del umbral, siete metros por encima de la del campo,
  y vio 191 m. Se le dio margen y no se ha vuelto a volar. Por el camino, el
  piloto del banco, buscando la línea azul con el tren todavía entrando,
  oyó «stall, stall» a 78 nudos: es su tirón, pero dice lo justo que va ese
  avión con un motor y las patas fuera.
- **`verificar-despegue.mjs tenerife-norte guyrami "" jaz-40`**, 20 de 20: el
  destello de V1 y el de Vr salen, la flecha de tirar también, y en V1 —63
  nudos indicados— no se dice nada. Y el JAZ 20, en el mismo sitio, 20 de
  20: destello de V1 y de Vr, la flecha, y en V1 —48 nudos— nada dicho.
- **Los de turbina no se han vuelto a volar** en esta enmienda: lo suyo no
  cambia —`seSigueEnV1` es `conV1`, que ya decidía sus ejercicios— y lo
  sujetan las pruebas. La tirada del JAZ 60 después de V1 se quedó en la
  cola del navegador.
- Los bancos del despegue, de las emergencias y del vuelo entero miran ahora
  qué se dice en V1 según el tipo (`seSigueEnV1` en la sonda `avion`), y el de
  las emergencias aprende `OGA_SIN_TREN=1`: en `tren`, nadie mete el tren
  hasta que lo piden después del fallo.

## Enmienda H44a (20-11-2026): lo que el juego hace detrás del destello

### Lo que pasaba

H37i dejó bien lo que se **dice** en V1 según el tipo, y dejó tres cosas en las
que el juego seguía **haciendo** lo del avión de turbina en los que no deciden
con V1 —el JAZ 20, el JAZ 25 y el JAZ 40—:

1. **El botón del freno se despedía en V1**, a 53 nudos en el 172 y a 66 en el
   Seneca, que es justo donde su manual sigue mandando frenar si algo va mal.
2. **La fase «comprometido»** —la de la pista que ya no da para parar,
   calculada con la frenada— sacaba la tarjeta y la voz de «ya despegamos:
   seguí». H37i la dejó con este argumento: «dice "seguí" en un despegue normal
   en el que ya no cabe parar, y eso es verdad en todos». No lo es: la frase
   cuenta una decisión —pase lo que pase, se sigue— y en esos aviones su
   manual no la toma. El Seneca, sin pista para parar: «Throttles — CLOSED.
   Brakes — APPLY max braking […] Continue straight ahead, turning to avoid
   obstacles» (PA-34, sección 3, *Engine Failure During Takeoff*); el 172, gas
   al ralentí y frenos rodando, y recién despegado, «Land STRAIGHT AHEAD»
   (C172S, sección 3).
3. **Los ochenta nudos no se cantaban en ningún avión**, y H37i lo dejó fuera.

El destello de V1 en pantalla, en todos los aviones, sigue como Enrique lo
pidió.

### Un solo criterio

`conV1` se ha ido de `ejercicios.ts` a `flight/decide-con-v1.ts`, que no
depende de nada (los ejercicios lo reexportan). De ahí leen el HUD
(`pasadaLaV1`: destello, freno y aviso de fin de pista), la máquina de fases
(`decideConV1` en la `Situacion`, que pone el plan de vuelo) y lo que se dice
al despegar. Ningún `if` por avión.

### Qué hace cada tipo pasada la aguja por V1

| | Destello y nota | Botón del freno | Fase de la carrera | «Se acaba la pista, frená» |
|---|---|---|---|---|
| JAZ 20, JAZ 25, JAZ 40 | sí | **se queda** hasta volar | **«despegando»** hasta volar: «motor a fondo», nunca «seguí» | calla mientras se siga con gas; **avisa a quien corta el gas** |
| JAZ 50, 60, 90, 110, 120 | sí | se despide | «comprometido» si la pista ya no da para parar, como antes | calla, como antes |

El aviso de fin de pista no puede pedir frenar en mitad de un despegue que va
bien —en Yvytu Rape salía a la vez que el destello—, pero en el 172 y en el
Seneca quien corta el gas pasado el destello está parando, que es lo que manda
su manual, y a ése sí hay que decirle que la pista se acaba.

En el JAZ 40 el «seguí» sigue llegando con el tren, como dejó H37i. Y el
silencio de la tarjeta de «comprometido» en sus ejercicios del despegue
(`elV1MentiriaEnElEjercicio`, H37e) se quita: esa tarjeta ya no puede salir
en él.

### Quién lee la fase «comprometido»

Antes de quitársela a tres tipos se miraron todos: la torre (`CALLADAS` y
`PISTA_TUYA` en `radio.ts`), la tripulación y la cabina de pasaje
(`cinturon.ts`, `dependencia.ts`, `cabina-de-pasaje.ts`), el TCAS en tierra,
el plan de vuelo, el cuaderno de despegues, los ejercicios (`corriendo`) y los
bancos. Todos la tratan igual que «despegando», así que nada cambia para
ellos. Los únicos que la leían sola eran la tarjeta y su voz, y el silencio
del ejercicio de arriba. `flaps-de-despegue.ts` mira «despegando» para el
aviso de configuración, que solo llevan los de transporte.

### Los ochenta nudos, por tipo

Son un canto de la tripulación —quien vigila, al ver pasar la aguja—, no de
una caja, así que suben por la escalera: en inglés en el peldaño de cabina, y
en los de abajo no los dice nadie, como los sesenta nudos de la carrera de
aterrizaje. Se canta solo donde se ha leído en su manual (20-11-2026):

| Tipo | Lo que canta | Fuente |
|---|---|---|
| JAZ 90 (clase E170) | **«eighty knots»**, quien vigila, al pasar de 80 KIAS; quien vuela contesta «checked» | SOPM-1755 de Embraer, rev. 19, 3-15-01, *Takeoff – Actions and Callouts*: «Airplane accelerates past 80 KIAS — EIGHTY KNOTS — CHECKED». Y su porqué, en 3-15-05: «pilot incapacitation check, airspeed crosscheck and the transition from Low to High Energy speed» |
| JAZ 110 (clase 787) | nada | El FCTM del 777/787 (rev. 14, 2021, cap. 3) pide el empuje puesto «by 80 knots» y no escribe el canto; el FCOM no se ha leído |
| JAZ 120 (clase 747-100) | nada | No se ha encontrado manual del 747 clásico, y el procedimiento de despegue del FCOM del 747-400 no se ha podido leer. Que se canta lo dicen foros y columnas, y eso no es fuente |
| JAZ 60 (clase 1900D) | nada | No se ha leído su POH/AFM ni un SOP. La grabadora de un accidente (NTSB NYC97FA045, 1997) recoge «eighty knots cross checked»: es lo que hizo una tripulación, no lo que manda su manual |
| JAZ 50 (DHC-6 -400) | nada | No se ha leído un SOP ni el AFM con sus cantos |

Lo lleva `CANTOS_DEL_DESPEGUE` en `audio/cabina.ts`, con la misma familia de
procedimiento que la carrera de aterrizaje (`cantosDeLaCarrera`), y cuándo se
canta, `flight/los-ochenta-nudos.ts`: una vez por carrera, al pasar la aguja
**del reloj** —con la funda del pitot no pasa nunca—, y se rearma al volar o
al pararse, no con un reloj. Cuando se lea el FCOM de un Boeing, su canto
entra en `CANTOS_DEL_DESPEGUE.boeing` y en nada más.

### Frases

Ninguna nueva ni cambiada en `es-PY.ts` ni en `en.ts`. Una toma de cabina por
grabar: **`cabina.eightyKnots`**, «eighty knots», en `ESPERAN_SU_TOMA` y al
final de la lista de `frases-para-grabar.mjs` para no renumerar las grabadas.
Hasta que se grabe, `cantarLoGrabado` no la pide.

### Comprobado

- **Las pruebas**: `decide-con-v1.test.ts` —quién decide con V1, y que los
  ejercicios leen el mismo `conV1`; pasada la V1, el destello en todos, el
  freno que se queda en el JAZ 20, el 25 y el 40 y se va en el JAZ 90 y los
  demás de turbina, y el aviso de fin de pista que en los de pistón calla con
  gas y avisa sin él—; `vuelo.test.ts` —sin V1 no hay «comprometido» con 200 m
  de pista por delante, con V1 sí, y la tarjeta de esa carrera es «motor a
  fondo» con torre, AFIS o sin nadie—; `los-ochenta-nudos.test.ts` —una vez
  por carrera, hacia arriba, ni en un bandazo ni en la carrera de aterrizaje
  ni con la funda del pitot, y solo en el JAZ 90—. Y `cabina.test.ts` sujeta
  que «eighty knots» espera su toma y solo se pide por `cantarLoGrabado`.
- **Antes y después de la fase**, con la máquina de fases vieja y la nueva y
  la situación de la prueba (el 172 a 100 km/h con 200 m de pista): antes,
  «comprometido»; ahora, «despegando».
- **`verificar-despegue.mjs yvytu-rape guyrami "" jaz-20`**, 22 de 22: el
  destello de V1 a 26,1 m/s de aguja y el de Vr a 28,2, la flecha de tirar,
  en V1 nada dicho, **el freno se quedó hasta volar** y la carrera fue
  «alineando → despegando». El banco mira ahora el freno con las ruedas en el
  suelo —al volar se va en todos— y, en los que no deciden con V1, que la
  carrera no pase por «comprometido». En esta tirada rotó con 438 m por
  delante, que le bastan para parar, así que ahí la fase no habría cambiado
  tampoco con el código de antes: lo de la fase lo sujetan la prueba y la
  comparación de arriba.
- **`verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`**, 22 de 22:
  destellos de V1 a 61,4 m/s y de Vr a 66,6, «V one» con «ya despegamos:
  seguí» en V1 —119 nudos—, **el freno se despide en V1** con las ruedas en
  la pista, y los ochenta nudos detectados a 80 de aguja y no dichos, que en
  Guyrami no los dice nadie («abajo no lo explica nadie»).
- **El vitest entero**, 549 ficheros y 11.015 pruebas, en verde.
- **Sin volar**: el peldaño de cabina con el JAZ 90, donde «eighty knots»
  saldría si estuviera grabado; hoy queda apuntado «sin grabar, no se pide».
  Lo sujetan `cabina.test.ts` y `los-ochenta-nudos.test.ts`. Y el banco con el
  código de antes no llegó a volar: la cola del navegador iba llena.

## Enmienda H44b (20-11-2026): la carrera del JAZ 90 en el peldaño de cabina

### Lo que pasaba

En la ronda de la tanda 20 se voló por primera vez el banco de despegue en
Taguató Ruvichá —`verificar-despegue.mjs tenerife-norte taguato-ruvicha ""
jaz-90`—, para oír el «eighty knots» de H44a, que solo suena en ese peldaño.
Salió 11 de 14: el avión no despegó —empezó la carrera en «autorizado», siete
grados torcido y veintisiete metros fuera del eje, llegó a 100,8 m/s sin rotar
y acabó a doscientos cincuenta metros de la pista—, no se apuntó ningún
«eighty knots», y la verde llegó a los 292,7 s de juego esperando detrás del
primero de la fila, más que los tres minutos de `PACIENCIA_EN_LA_FILA`.

### Del juego, los ochenta nudos: se cantan

El JAZ 90 en Taguató Ruvichá pasa las tres preguntas de `cantarLoGrabado`:
en ese peldaño canta la tripulación (`cantaLaCabina`), la del E-Jet los lleva
(`CANTOS_DEL_DESPEGUE.embraer`) y la toma `cabina.eightyKnots` está en el pack
de cabina desde que se grabó, después de H44a. En los tres peldaños de abajo
no los dice nadie. Lo sujeta ahora `los-ochenta-nudos.test.ts`, con una
carrera que pasa por las fases de verdad —autorizado, alineando, despegando y
comprometido— y canta una vez, a los ochenta.

Que el banco no los apuntara no era del juego: la carrera no lo era. Los
ochenta se cuentan en «despegando» y «comprometido», como V1 y Vr, y un avión
a veintisiete metros del eje está «alineando» —doce metros y ocho grados,
`alineado` en `flight/vuelo.ts`—; lo más probable es que la aguja pasara por
los ochenta antes de que el avión, cruzando el eje de lado, entrara en la
carrera. No se ha cambiado.

### Del juego, la fila: no es la red

`PACIENCIA_EN_LA_FILA` no es lo más que se espera en la doble raya. Es la red
del candado entre el dibujo y la frecuencia: pasados tres minutos detrás de
uno de la fila al que la frecuencia no da su salida, ése deja de contar como
fila. Lo demás que sujeta la roja sigue: la pista ocupada en el dibujo —el
que se alinea y corre, el que aterriza y la deja— y la frecuencia. Medido en
la mesa, como `fila-de-salida.test.ts` pero en Los Rodeos y con quien juega en
el JAZ 90, con trescientas frecuencias sorteadas y el reloj a una vez, sin
voz: de 223 con alguien delante, la verde llega con una mediana de 148 s, el
percentil 90 en 228 y lo más largo en 280; la fila sola, hasta 166 s, y la
pista ocupada en el dibujo, hasta 180. Los 292,7 s del banco caben en eso más
la radio: con el reloj corrido a ocho veces la voz va a su ritmo —ver «el
reloj acelerado no acelera lo que se oye» en `game.ts`— y cada segundo de
voz son ocho de juego. Lo confirma la tercera tirada de abajo: 271,5 s de
juego fueron 48 de pared, y los ratos de fila eran de radio. No se ha
cambiado. El banco apunta ahora la espera en los dos relojes.

### El banco

`verificar-despegue.mjs` no tenía nada para el modelo completo sin ayudas:

- **Se alinea por la raya hasta el eje**, como el del vuelo entero
  (`EN_EL_EJE`, tres metros): daba gas en cuanto el morro miraba a la pista,
  todavía pisando el borde.
- **Fuera de Guyrami, lleva la carrera con los pies del vuelo entero.** Solo
  tenía el mando de alabeo, que en Ruvichá pasados los veintiocho metros por
  segundo no gira nada. El pie y la mano de la etapa «despegar» de
  `verificar-vuelo-entero.mjs` están ahora en `scripts/el-eje-de-la-carrera.mjs`,
  que vuelan los dos bancos —el del vuelo entero, sin cambiar una cuenta— y
  que `el-eje-de-la-carrera.test.mjs` prueba contra el modelo: el JAZ 90 en la
  12 de Los Rodeos con su viento de casa, desde el eje y desde doce metros y
  ocho grados, llega a la Vr a menos de un metro del eje.
- **Pone los flaps de despegue si la lista los pide**, que en el peldaño de
  cabina no los pone la instructora.
- **Apunta los cantos de cabina de la carrera** —«eighty knots», «V one»,
  «rotate»: lo pedido por la voz de cabina, lo que sonó y lo que la boca
  tiró— y comprueba que suenan los que tocan a ese tipo, y en ese orden.
- **Y la espera en la doble raya, en los dos relojes**: cuándo empezó y acabó
  cada porqué, con el de juego, el de pared y si la boca hablaba.

### Comprobado

- **`verificar-despegue.mjs tenerife-norte taguato-ruvicha "" jaz-90`**, con
  el banco nuevo y sin voces: 21 de 22. Despega —se alinea por la raya y
  suelta frenos 115 m más allá de donde pisa la pista, a 85,5 m/s a los quince
  metros de altura, 1.091 m desde el punto de espera en una pista de 3.168, con los
  destellos de V1 a 61,1 m/s de aguja y de Vr a 66,5, y sube a 26,6 m/s
  soltando los mandos—, pero los tres cantos salieron «eighty knots: sin
  grabar, no se pide» y «V one» y «rotate» a la voz del navegador: el pack se
  baja con el primer gesto, y el banco no hacía ninguno. Ahora, en Ruvichá,
  pulsa una tecla que no hace nada y espera al pack, como
  `verificar-tormenta.mjs`. Quien juega ha hecho muchos gestos antes de
  despegar, así que en el juego el pack siempre está.
- **La misma, con las voces**: 22 de 22. «eighty knots» a 80 nudos de aguja,
  «V one» a 119 y «rotate», pedidos por la voz de cabina y sonados en ese
  orden —a los 290,5, 296,8 y 298,6 s de la conversación—; la carrera
  «alineando → despegando → comprometido», a 84,8 m/s a los quince metros. La
  torre dio la verde a los 14 s, esperando a uno que despegaba.
- **Y otra vez, con las voces**: 22 de 22, los tres cantos en orden —a los
  323,7, 329,8 y 331,9 s— y **con fila**: la verde a los 271,5 s de juego,
  que fueron **48 s de pared**. La línea de la espera lo cuenta: hasta los 36
  s de juego, uno que aterriza; de los 42 a los 148, la fila sola —número dos
  detrás de EC-JVO—, que son 13 s de pared con la torre diciendo «pista
  libre», «hold short, number two» y su explicación; a los 148, el «line up
  and wait» de EC-JVO, a los 208 su «cleared for take-off», y a los 270 la
  pista libre. La fila no llegó a la red de los tres minutos: ciento seis
  segundos de juego, casi todos de radio.
- **`verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`**, para ver que
  abajo no se rompe nada: 22 de 22, como en H44a. Allí no lleva los pies
  nuevos —la ayuda de rodaje lleva el avión a la raya— pero sí se alinea por
  la raya hasta el eje: suelta frenos 124 m más allá de donde pisa la pista,
  a 73,7 m/s a los quince metros. «eighty knots: abajo no lo explica nadie»,
  y «V one» y «rotate» los explica la instructora.
- **Las pruebas**: `los-ochenta-nudos.test.ts` y `el-eje-de-la-carrera.test.mjs`,
  nuevas, y el vitest entero, 560 ficheros y 11.180 pruebas en verde (32
  saltadas).
- **Sin comprobar**: el banco del vuelo entero con los pies desde su módulo;
  las cuentas son las mismas, letra a letra, pero no se ha volado.

## Enmienda H70 (23-11-2026): el tren de morro que no sale

### El caso

Del catálogo del #90 faltaba, del aterrizaje, esto: «**El tren de morro no
sale.** Se aterriza con las principales y se mantiene el morro arriba todo lo
que aguante, para posarlo lo más despacio posible. Es una maniobra de pura
finura, y sale bien casi siempre». En Taguató, como dice el issue, y en
Taguató Ruvichá, que lleva el catálogo entero.

### El avión

**El JAZ 40**, el bimotor de pistón de la clase del Seneca II: es el único de
Taguató con una rueda de morro que se mete y un manual que se puede leer. El
JAZ 20 y el JAZ 25 llevan el tren fijo, y un tren fijo no puede dejar de
salir. Los de turbina también la meten, pero de sus procedimientos de tren no
hay nada leído aquí. La ficha lleva dos cosas nuevas, opcionales y solo en
él: `morroSinRueda`, hasta dónde baja el morro sin su rueda, y
`extensionDeEmergenciaHasta`, la velocidad de su manual. Sin las dos, el
ejercicio no se ofrece.

### De dónde sale el procedimiento

Leídas, no de memoria:

- **Piper, *Pilot's Operating Handbook* del PA-34-220T Seneca III**
  (VB-1110, 1981, con revisiones hasta 2004; la copia de
  `longislandaviators.com`). El del Seneca II no se ha podido leer, como ya
  decía la H14a del ADR 0027; el tren de los dos es hidráulico y con caída
  libre.
  - Sección 3, p. 3-8, la lista: «MANUAL EXTENSION OF LANDING GEAR […]
    Airspeed — reduce (85 KIAS max.) · Gear selector — GEAR DOWN LOCKED
    position · Emerg. gear extend knob — pull · Indicator lights — 3 green ·
    Leave emergency gear extension knob out». Y en la misma página y la 3-9,
    «GEAR UP LANDING: Approach — Normal · Flaps — as desired · Throttles —
    closed prior to touchdown · Battery switch — OFF · Fuel selector — OFF ·
    Touch down at minimum airspeed».
  - Sección 3, 3.15 a 3.19, pp. 3-19 y 3-20: la luz roja de tren y
    «recycle the landing gear»; la extensión manual, «power should be reduced
    to maintain airspeed below 85 KIAS»; y la toma sin tren, «Contact to the
    surface should be made at a minimum airspeed».
  - Sección 7, p. 7-6b: «should the hydraulic system fail for any reason,
    gravity will allow the gear to extend […] the nose wheel retracts forward
    into the nose section»; p. 7-7: «Emergency gear extension must not be
    attempted at airspeeds in excess of 85 KIAS. […] Pulling this knob
    releases the hydraulic pressure holding the gear in the up position and
    allows the gear to fall free»; y junto a la figura 7-8, las tres luces
    verdes, «A convex mirror on the left engine nacelle […] allows the pilot
    to visually confirm the condition of the nose gear» y «If the gear is in
    neither the full up nor the full down position, a red warning light on
    the instrument panel illuminates».
  - Sección 4, 4.41, p. 4-32: «check for three green lights on the panel and
    look for the nose wheel in the nose wheel mirror».
  - Sección 2, 2.5, p. 2-3: «White Arc (Flap Down) 64 to 115» KIAS. El
    principio del arco blanco es la pérdida con todo fuera.
- **Piper, manual del PA-34-200 Seneca** (VB-423, 1972, rev. 1977; la copia
  de la Delaware State University), capítulo 3, p. 3-14: la misma extensión
  manual con «airspeed not to exceed 100 MPH», 87 nudos, y la misma toma sin
  tren.
- **FAA, *Airplane Flying Handbook* (FAA-H-8083-3C)**, capítulo 18, p. 18-12,
  «Landing Gear Malfunction», con la figura 18-8 en la 18-13:
  - «Once the pilot has confirmed that the landing gear has in fact
    malfunctioned and that one or more gear legs refuses to respond to the
    conventional or alternate methods of gear extension contained in the
    AFM/POH, a gear-up landing is considered inevitable. The pilot should
    select an airport with crash and rescue facilities, if possible. The
    pilot should not hesitate to request that emergency equipment is
    standing by.»
  - «When landing with a retracted nose-wheel (and the main gear extended and
    locked), the pilot should hold the nose off the ground until almost full
    up-elevator has been applied. [Figure 18-8] The pilot should then release
    back pressure in such a manner that the nose settles slowly to the
    surface. Applying and holding full up-elevator results in the nose
    abruptly dropping to the surface as airspeed decays, possibly resulting
    in burrowing and/or additional damage. Brake pressure should not be
    applied during the landing roll unless absolutely necessary to avoid a
    collision with obstacles.»

O sea, y en este orden: **antes de aterrizar sin el morro se intenta la
extensión de emergencia**, por debajo de 85 nudos; si tampoco, se pide a los
bomberos que esperen; y se toma con la nariz arriba, sostenida hasta casi
todo el timón y soltada después para que baje despacio, sin frenos.

**Lo que no se enseña, y por qué:** el «recycle» de la luz roja (3.15), que
el ejercicio se salta para ir a lo que se practica; la batería y el
combustible cortados de la toma sin tren, que son de la toma con las tres
patas dentro y el juego no los tiene como mandos en este ejercicio; y
cualquier cifra de «despacio» para la nariz, que ninguna de las tres fuentes
da. La velocidad con la que se mide, abajo, es la del arco blanco.

**PAN PAN y no MAYDAY**: la FAA pide los bomberos esperando, y eso es
declarar; pero el avión vuela bien y hay tiempo, que es la urgencia y no el
socorro —el mismo criterio que el cuatrimotor que pierde un motor—. La
llamada dice «nose gear unsafe».

### El ejercicio

`tren-de-morro`, en `flight/ejercicios.ts`: la lección de dar una vuelta y
una avería nueva, `que: "morro"`, que llega **al pedir el tren fuera con el
tren ya metido antes** (`Momento` `en: "tren"`): sin haberlo metido no hay
pata que no salga.

1. **La instructora lo presenta** antes de soltar frenos, con el dibujo del
   tren: `ejercicio.tren-de-morro.antes`.
2. **Sale el tren y la de morro no**: en el avión se ve la pata de morro en
   su pozo (`poner(donde, sinMorro)` en `world/patas.ts`) y la luz roja del
   tren se queda encendida, como dice su manual. La instructora:
   `ejercicio.morro.noSale` —la rueda no salió, la roja sigue prendida, más
   despacio—. Las dos verdes de su manual no se cuentan todavía: ver «Lo que
   queda».
3. **La compañera prueba la de emergencia**, a los diez segundos y por
   debajo de los 85 nudos de su ficha: `ejercicio.morro.emergencia`. Se
   espera lo que tarda su tren en salir, siete segundos, y no sale.
4. **Tampoco**: `ejercicio.morro.tampoco` —avisamos a la torre, las ruedas
   de atrás, la nariz arriba todo lo que aguante, abajo despacito, sin
   frenos— con el dibujo de la nariz arriba; PAN PAN en la tira de la radio
   y la torre contestando; y en la final, los bomberos de ese aeródromo
   junto a la pista. La instructora no dice además «declaramos»: ya va en su
   frase, y un paso nuevo retiraría ese de la cola.
5. **El cierre**, parado en la pista: `ejercicio.morro.bien`, celebrándolo.
   Sin música, sin rojo, y si sale mal, sale mal el ejercicio.

Los cuatro pasos valen hasta el siguiente o el cierre
(`valeHastaElPasoSiguiente`), como los de la carga suelta (ADR 0033, H67):
se piden en la final, cuando más habla la torre. El «bien» cierra el vuelo
porque lleva «bien» en su clave.

### El modelo, solo lo que hace falta

En `fdm.ts`, con `ponerSinRuedaDeMorro`, y solo en el avión con
`morroSinRueda`:

- **Lo que para el morro es la panza**, más abajo: el mismo apoyo que la
  pata —cargado con el par del peso, con muelle y amortiguador— pero en
  `morroSinRueda` y con medio grado de recorrido (`RECORRIDO_DE_LA_PANZA`).
  Hasta llegar ahí no hay nada debajo: lo que sostiene la nariz es el timón
  de profundidad contra el peso que cargan las principales, y cuando la
  velocidad ya no le da, baja. No hay ninguna regla nueva para eso: es el par
  del tren de siempre (`momentoDelTren`) sin la pata.
- **17,6°**, medidos en su dibujo: girando sobre las principales, lo primero
  que llega a la pista es la panza del morro, debajo de la bodega
  (`sin-rueda-de-morro.test.ts` lo mide en el `.glb`). Las palas, quietas como
  las deja el modelo, quedan por encima.
- **El roce frena**: lo que carga la panza no rueda, se arrastra, con el 0,4
  de lo que carga (`ROCE_DE_LA_PANZA`). **Sin fuente leída**: es el orden del
  freno a fondo de una rueda en seco; lo que se enseña —la nariz que toca
  pronto frena antes y más rato— no depende de la cifra.
- **Y tuerce**: el roce va por delante del centro, así que si la panza va
  torcida respecto a su camino la tuerce más —lo contrario de una flecha—, y
  recta no hace nada. Y sin rueda de morro el volante no gira el avión en el
  suelo: queda el pie.
- **Sin percance que no tocaría**: tocar sobre las principales es una toma
  como cualquiera —el tren está fuera, `trenAlTocar`—, y la nariz en la
  pista no rompe nada. El percance de siempre sigue: tocar duro o fuera.

Medido en vitest con el JAZ 40 en Taguató, todo fuera, sin gas y sin frenos,
tocando a 71 nudos con 3,3° de nariz:

| | la nariz en la pista | lo que bajaba la panza | hasta pararse |
|---|---|---|---|
| Con la rueda | — | — | no se para en 60 s: 1.206 m y 18 kt |
| Soltada al tocar | a 69 kt | 2,8 m/s | 20,6 s, 410 m |
| Sostenida hasta casi todo el timón y soltada a 2°/s | a 46 kt | 2,4 m/s | 32 s, 740 m |

El timón, sosteniendo la nariz a +2°, se queda sin recorrido a 48,7 nudos.

**Lo que el modelo no distingue**: el manual de la FAA dice que sostener todo
el timón hasta el final deja caer la nariz «abruptly». Aquí, con la nariz
por debajo de la horizontal el peso gana brazo —el centro va 1,6 m por
encima de las ruedas y se adelanta al inclinarse—, y la panza llega a la
pista a unos 2–2,4 m/s la sueltes como la sueltes. Lo que sí cambia, y mucho,
es **a qué velocidad llega**: por eso el banco mide eso.

### El banco

`verificar-emergencias.mjs morro`, con el JAZ 40 en Taguató: despega, mete
el tren, da el circuito y en la final lo saca. Desde que la rueda no sale
hasta que la compañera tira de la perilla vuela a 80 nudos, por debajo de
los 85 de la de emergencia, y después la final de siempre; recoge como dice
su manual, con la nariz arriba y a la mínima; y en la pista hace lo del
manual de la FAA —la nariz sostenida hasta nueve décimas de timón, soltada a
dos grados por segundo—, sin frenos y por el eje con el pie. Mira:

- que se presente, y que la avería llegue al sacar el tren, sin motor parado;
- que la rueda de morro se quede dentro y se diga;
- que la compañera pruebe la de emergencia por debajo de 85 nudos, y se diga;
- que tampoco salga: el «tampoco», PAN PAN con la torre contestando y los
  bomberos esperando;
- que toque en la pista sobre las principales, con la nariz arriba;
- que la nariz llegue a la pista **por debajo de 64 KIAS**, el arco blanco
  del POH: aguantó arriba hasta que el ala ya no volaba;
- sin percance, y el cierre celebrado con `ejercicio.morro.bien`;
- y **nada del ejercicio tirado por la boca**: una frase pedida que caduca
  en la cola es un fallo, como enseñó la H67 del ADR 0033.

### Comprobado

- **La primera tirada**, en Gran Canaria, dio 8 de 10. El tren salió a 272 m
  en la final y la rueda de morro se quedó dentro; la compañera tiró de la
  perilla a 85 nudos indicados; PAN PAN, la torre contestó
  (`torre.canario.panpan`) y salieron los tres camiones de Gando; la nariz
  llegó a la pista a 47 nudos, bajando 2,15 m/s, soltada a 50; sin percance,
  y el cierre con `ejercicio.morro.bien`. Los dos rojos eran del banco:
  - la extensión se miraba con la verdadera, 87 nudos en Gando, y su manual
    habla de indicada: ahora lee `indicada()`;
  - y la final entera a 80 nudos, con todo fuera, es lenta para este avión
    —la instructora dijo «lento» y «lento y bajo»—: tocó plano y a 3,2 m/s
    («tocaste duro», sin percance). El manual dice «Approach — Normal»: a 80
    solo hasta probar la de emergencia, y después la de siempre.
- **La segunda**, con los dos arreglos, 9 de 10: la perilla a 85 nudos
  indicados, el «tampoco» un segundo después a 86, PAN PAN contestado, tres
  camiones, la nariz en la pista a 53 nudos bajando 1,9 m/s —soltada a 55—,
  sin percance y celebrado. El rojo, otra vez del banco: su recogida, la de
  siempre, hecha para los de línea, tocó a 75 nudos con la nariz 2,6° abajo
  y cayendo 2,6 m/s —sobre las principales, pero no con la nariz arriba—. La
  de este modo es ahora la de su manual, «Touch down at minimum airspeed»:
  por debajo de ocho metros la nariz sube grado y medio por segundo mientras
  el avión se hunda, hasta ocho grados.
- **La tercera, con esa recogida, no voló**: esperó memoria detrás del
  vitest entero y se quitó de la cola al acabarse el tiempo del encargo.
- **Lo que tira la boca**: nada del ejercicio en las dos tiradas. Con las
  frases sin grabar la comprobación no puede ver nada —se callan en la
  puerta y no entran en la cola—; vale el día que se graben, que es para lo
  que está (H67).
- `tsc --noEmit -p .`, en verde, y **el vitest entero**: 579 de 579 ficheros
  y 11.563 pruebas en verde, con 32 saltadas y una pendiente. Dentro,
  `sin-rueda-de-morro.test.ts` —el tope en el dibujo, el avión que con la
  rueda no cambia, el que sin ella apoya la panza parado, la nariz sostenida
  que se posa por debajo de 64 nudos y la soltada que se posa por encima, el
  roce que frena más del doble que la rueda, el giro de la panza torcida y el
  volante sin rueda— y las nuevas de `practica.test.ts`, `boca.test.ts` y
  `patas.test.ts`. El cambio de la frase de la roja llegó después del vitest:
  es solo texto.

### Lo que queda

- **Las luces del tren**: el cuadro pinta las tres luces con una sola
  posición del tren, así que con la rueda de morro dentro siguen saliendo
  tres verdes, aunque la roja se quede encendida. Hacen falta las luces por
  pata para enseñar las dos verdes de su manual; mientras tanto la frase no
  las cuenta y habla de la roja.
- **La tercera tirada del banco**, con la recogida de su manual.
- **Las palas**: en el dibujo, una pala en vertical llegaría a la pista a
  unos 10,8° de nariz —0,42 m de holgura a 2,2 m por delante de las
  principales—, antes que la panza. El modelo dibuja la hélice girando y no
  tiene golpe de hélice; ninguna de las fuentes leídas dice qué toca primero
  en uno de verdad.
- Las cinco frases, por grabar.
- El «recycle» del tren antes de la de emergencia (3.15), fuera del
  ejercicio.

### Las frases

Cinco, de la instructora y en calma, en `es-PY` y en `en`; el guaraní no se
toca. «Tren de nariz», que es como se dice de este lado del mar, y sin cifras
en la voz: las unidades cambian con el peldaño. Van en `LOS_EJERCICIOS` de
`sin-instructora.ts` —son de seguridad— y en `DEL_TREN_DE_NARIZ`, al final de
`frases-para-grabar.mjs`. **Sin grabar**: hasta que se graben se ven en la
tarjeta y la voz se calla.

- `ejercicio.tren-de-morro.antes`
- `ejercicio.morro.noSale`
- `ejercicio.morro.emergencia`
- `ejercicio.morro.tampoco`
- `ejercicio.morro.bien`

Y en el hangar, que solo se lee: `hangar.ejercicio.tren-de-morro`.

## Enmienda H70b (23-11-2026): una luz por pata, y el banco con las voces grabadas

### Las luces mentían

La H70 dejó escrito en «Lo que queda» que el cuadro pintaba las tres luces
del tren con una sola posición: con la rueda de morro en su pozo salían
**tres verdes**, que es justo lo que este ejercicio enseña a no creerse. La
fuente es la misma de la H70, el POH del Seneca III (Piper, VB-1110), en la
p. 7-10a, junto a la figura 7-8:

- «The three green lights to the left of the landing gear selector switch
  illuminate to indicate that each of the three landing gears is down and
  locked.»
- «If one or two of the three green lights do not illuminate when the gear
  down position has been selected, any of the following conditions could
  exist for each light that is out: (a) The gear is not locked down […]»
- «If the gear is in neither the full up nor the full down position, a red
  warning light on the instrument panel illuminates.»

O sea: **una verde por pata y una roja aparte**. Con la de morro dentro, dos
verdes y la roja.

### Cómo quedan

`lucesDeLasPatas` en `flight/tren.ts`: una luz por pata, cada una con su
`luzDeTren`. Las luces van en fila y en fila el avión se lee desde arriba,
así que **la de morro es la de en medio** (`laDeMorro`), también en el de
cinco, con las dos del ala y las dos del fuselaje a los lados. El POH dice
cuántas son y qué dice cada una, no cómo van colocadas; la fila ya estaba.

Lo pintan, cada rueda con la suya, todos los sitios donde hay luces del tren,
en todos los aviones que las llevan —los de tren que se mete; el de tren fijo
no lleva ninguna—:

- el cuadro plano (`lucesDeTren` en `ui/cristal.ts`, cada rueda en su
  `data-pata`) y el del teléfono;
- las pantallas de la cabina de los de cristal;
- y la esfera del tren de los de esferas (`relojes-cabina.ts`).

Con el tren sano todas dicen lo mismo que antes. Solo cambia con la rueda de
morro en su pozo: `Game.trenDeMorro` la deja en cero.

**Y dos cosas que salieron al mirarlo:**

- **La roja no se veía desde la cabina.** El panel de avisos del cuadro plano
  no se pinta desde el asiento de un avión de esferas, y el JAZ 40 lo es: la
  instructora decía «la luz roja del tren sigue prendida» y dentro no había
  ninguna. Ahora va en la esfera del tren, encima de las tres ruedas, con su
  hueco de rueda para que no sea solo un color, y se enciende con lo mismo
  que la del panel de avisos (`trenFueraDeSitio`).
- **El botón del tren de la pantalla se ponía verde** con la rueda de morro
  dentro: tres verdes en un botón. Su regla era la de las luces, «verde solo
  cuando de verdad está trabado», y ahora es de todas las patas
  (`luzDelMando`): con una en su pozo, ámbar, que es «el tren no está donde
  lo pediste».

### La frase

`ejercicio.morro.noSale` decía «la luz roja del tren sigue prendida», que con
las luces nuevas sigue siendo verdad, pero se callaba lo que más se ve y lo
que enseña la lección del tren: que antes de aterrizar se cuentan tres
verdes. Vuelve a contarlas, sin el espejo de la góndola, que el juego no
tiene:

> Bajó el tren, pero la rueda de adelante no salió: hay dos luces verdes y no
> tres, y la roja sigue prendida. Andá más despacio, que la compañera prueba
> la bajada de emergencia

**Por regrabar**, en la voz de la instructora; hasta entonces suena la toma de
antes, que no dice nada falso.

### El banco

`verificar-emergencias.mjs morro gran-canaria jaz-40 taguato`, con las cinco
frases grabadas (09faba00). Lo que se vio, tirada a tirada:

- **La primera, 6 de 10**, la que la H70 esperaba: «ejercicio.morro.emergencia:
  ya no es verdad» y «ejercicio.morro.tampoco: no cabía en la cola». Grabadas,
  entran en la cola: «la perilla» esperaba detrás de «la rueda no salió» —ocho
  segundos y medio— y la retiraba el «tampoco» al llegar, que es lo que hace
  un paso nuevo con los que valen hasta el siguiente; y el «tampoco», detrás
  de la llamada de PAN PAN y su respuesta, era lo que sobraba en la cola. Y la
  recogida nueva, volada por primera vez, tocó con la nariz 0,9° abajo.
- **El arreglo, con la regla que ya había**: las frases del ejercicio, **de
  una en una** (`FrasesEnFila`, la del GPS y la pista corta, que nació de lo
  mismo en el altímetro, H26t del ADR 0031): cada una se pide cuando la
  anterior ha acabado. Lo que se ve no espera: la pata en su pozo, las luces
  y el dibujo de la nariz arriba salen en su instante. La fila se olvida al
  cerrar el ejercicio y al volver a empezar.
- **Y el banco**: la recogida, desde diez metros y a cuatro grados por
  segundo, sin el morro abajo que la parte lenta del lazo de actitud traía de
  la final —a grado y medio el objetivo subía más despacio de lo que ese
  resto soltaba, y el timón casi no se movía—.
- **La segunda, 8 de 10**: tocó a 1,5° de nariz sobre las principales, «la
  perilla» se dijo, y el «tampoco» se pidió con el avión ya parado y lo
  retiró el cierre. Ya no era la cola: **a cuatro por uno no cabe**. El banco
  vuela acelerado, y desde la avería la final dura unos veinte segundos de
  pared; lo que la instructora tiene que decir, con el PAN PAN y la torre en
  medio, pasa de veinticuatro. Las voces no van más deprisa con el reloj. En
  `morro`, desde la avería, el banco vuela a uno por uno.
- **La tercera, 10 de 10**: la rueda dentro y dicha; la perilla a 85 nudos
  indicados y dicha; el «tampoco», PAN PAN con la torre contestando
  (`torre.canario.panpan`) y tres camiones; tocó a 351 m del umbral con 1,7°
  de nariz, sobre las principales y cayendo 1,4 m/s; la nariz en la pista a
  46 nudos, bajando 2,21 m/s, soltada a 48; sin percance; **nada tirado por
  la boca**, y el cierre con `ejercicio.morro.bien`.

### Mirado con la tarjeta

`scripts/ver-el-tren-de-morro.mjs`, con `OGA_GPU=1` (Intel Iris Xe por
ANGLE): despega unos segundos —el ejercicio solo cuenta un tren metido
después de correr—, se pone en el aire a 450 m en la final de Gando, mete el
tren y lo saca. Mira y fotografía:

- **la pata de morro en su pozo**, de costado y desde abajo por delante: las
  dos principales fuera y el morro limpio, sin pata;
- **las luces en el cuadro plano**: dos verdes, la de en medio apagada, y la
  roja «TREN» del panel de avisos encendida —el banco lo lee en las clases de
  cada rueda y en la luz—;
- **y en la cabina**, la esfera del tren de cerca: dos verdes, la de en medio
  apagada y la roja encima;
- **el dibujo del ejercicio en el hangar**, en «¿A qué jugás?» con el JAZ 40 y
  Taguató.

Lo que se veía mal era el dibujo: a diez grados la cola quedaba a punto de
rozar el asfalto, la rueda era una bola suelta debajo de la panza y la de
morro, rayada, estaba en el suelo y no debajo del morro —se leía como una
rueda que se cae—. A siete grados la nariz sigue arriba y la cola, lejos; la
rueda cuelga de su pata, y la rayada, de la panza, donde tendría que estar.

Y **el vitest entero**, con todo lo de arriba menos el último cambio del
banco: 579 de 579 ficheros y 11.569 pruebas en verde, con 32 saltadas y una
pendiente. Dentro, «una luz por pata» en `tren.test.ts`. `tsc --noEmit -p .`
en verde antes de cada commit.

### Lo que queda

- **La frase `ejercicio.morro.noSale`, por regrabar** con el texto nuevo.
- **Dónde va cada luz en el panel del Seneca III**: el POH dice tres verdes
  «to the left of the landing gear selector switch» y una roja aparte, no en
  qué orden; la de morro en medio es la fila que ya había, leída desde
  arriba. Y el ámbar de tránsito sigue siendo del juego: en el Seneca, en
  tránsito, las verdes se apagan y se enciende la roja, que aquí también lo
  hace.
- **El espejo de la góndola** (p. 4-32, «look for the nose wheel in the nose
  wheel mirror»), que el modelo no tiene y la frase ya no nombra.
- Lo que ya quedaba de la H70: las palas y el «recycle».

## Enmienda H71 (23-11-2026): el fallo de radio

### El caso

Del catálogo del #90, en vuelo: «**Fallo de radio.** Hay un número que se
pone en el transpondedor y que lo dice por ti (#83). De las cosas que más
gustan al descubrirlas». Y del #83, el transpondedor: «si se pierde la radio,
hay un número que decirlo por ti». Lo que se descubre son dos cosas: que un
número habla por ti y que una luz te contesta.

### De dónde sale el procedimiento

Leídas, no de memoria, y en el PDF oficial de cada una:

- **SERA**, Reglamento de Ejecución (UE) n.º 923/2012, texto consolidado
  02012R0923 — 01.05.2025 — 012.001 (el último; recoge hasta el 2024/1111),
  en español y en inglés, con la misma paginación. Bajado del repositorio de
  la Oficina de Publicaciones de la UE, que es de donde lo sirve EUR-Lex: la
  página de EUR-Lex no se dejó leer por un programa.
  - SERA.13005 a) 2), p. 69: el piloto de una aeronave con SSR «seleccionará
    el código 7600 para indicar un estado de fallo de la radiocomunicación».
  - SERA.14083 c), pp. 80–81: con la radio fallida, «1) La aeronave, cuando
    forme parte del tránsito de aeródromo en un aeródromo controlado, se
    mantendrá alerta a la espera de las instrucciones que puedan emitir las
    señales visuales. 2) La aeronave regulará el transpondedor en código
    7600, modo A […]. 3) Un vuelo VFR seguirá volando en condiciones
    meteorológicas de vuelo visual, aterrizará en el aeródromo adecuado más
    próximo y notificará su llegada […]». Y la g), p. 83: las señales, las del
    apéndice 1. SERA.8035 b), p. 53, remite aquí.
  - Apéndice 1, 3.1.1, tabla AP 1-1, p. 94, **a las aeronaves en vuelo**:
    verde fija, «Autorizado para aterrizar»; roja fija, «Ceda el paso a las
    otras aeronaves y siga en el circuito»; serie de destellos verdes,
    «Regrese para aterrizar (\*)»; serie de destellos rojos, «Aeródromo
    peligroso, no aterrice»; serie de destellos blancos, «Aterrice en este
    aeródromo y diríjase a la plataforma (\*)»; luz pirotécnica roja, «A pesar
    de las instrucciones previas, no aterrice por ahora». «(\*) A su debido
    tiempo se le dará permiso para aterrizar y para el rodaje».
  - Apéndice 1, 3.1.2 a), p. 95, el acuse de recibo en vuelo: «1) durante las
    horas de luz diurna: — alabeando, excepto en los tramos básicos y final
    de la aproximación; 2) durante las horas de oscuridad: — emitiendo
    destellos dos veces con los faros de aterrizaje de la aeronave, o si no
    dispone de ellos, encendiendo y apagando, dos veces, las luces de
    navegación».
  - SERA.3225, p. 29: en un aeródromo, ajustarse al circuito de las otras
    aeronaves o evitarlo, y virajes a la izquierda salvo que el ATC diga otra
    cosa.
- **OACI, Anexo 2**, undécima edición (julio de 2024, en vigor desde el
  28-11-2024; la décima ya no lo está y su enlace en la OACI está caído), en
  inglés, la copia que distribuye la autoridad suiza; recoge hasta la
  enmienda 48, y la 49 no se ha leído.
  - 3.6.5.2, p. 3-13: «when forming part of the aerodrome traffic at a
    controlled aerodrome, shall keep a watch for such instructions as may be
    issued by visual signals», y en VMC, seguir en VMC y aterrizar en el
    aeródromo adecuado más próximo. El 7600 solo sale en el caso IFR
    (3.6.5.2.2 b) 2)), como hito de tiempo, no como orden de marcarlo.
  - Apéndice 1, 4.1.1, p. APP 1-4: la misma tabla que el SERA. 4.1.2 a) 1),
    p. APP 1-5: «by rocking the aircraft's wings», con su *Note.— This signal
    should not be expected on the base and final legs of the approach*.
- **DINAC R 2**, *Reglamento del Aire*, séptima edición (2024), Resolución
  1854/2024: 3.6.5.2, p. 16/19, como el Anexo 2, y el 7600 solo en el caso
  IFR (p. 17/19); apéndice 1, 4.1.1, p. 4/22, y 4.1.2, p. 5/22, la tabla y el
  alabeo con la misma nota que la OACI.
- **FAA, *Aeronautical Information Manual***, edición básica del 20-2-2025
  con los cambios 1, 2 y 3 (este, del 9-7-2026):
  - 4-2-13, p. 4-2-9: con el transmisor y el receptor averiados, «Remain
    outside or above the Class D surface area until the direction and flow of
    traffic has been determined; then, join the airport traffic pattern and
    maintain visual contact with the tower to receive light signals»; de día,
    «rocking your wings», sin salvedad para la base ni la final; de noche,
    «blinking the landing or navigation lights». El 4-2-13 no nombra el 7600.
  - 4-3-13, pp. 4-3-20 y 4-3-21, tabla 4-3-1, en vuelo: verde fija, «Cleared
    to land»; verde a destellos, «Return for landing (to be followed by
    steady green at the proper time)»; roja fija, «Give way to other aircraft
    and continue circling»; roja a destellos, «Airport unsafe, do not land»;
    blanca a destellos, «Not applicable»; roja y verde alternas, «Exercise
    extreme caution». Y en la b): el piloto puede no estar mirando a la torre,
    y la luz solo aprueba o deniega.
  - 6-4-1, p. 6-4-1: en condiciones VFR, «continue the flight under VFR and
    land as soon as practicable». El 7600 está en el 6-4-2, p. 6-4-2: «the
    pilot should adjust the transponder to reply on Mode A/3, Code 7600».

### Lo que no coincide, y cuál gana

Gana la del espacio aéreo donde se vuela, y el ejercicio se vuela en
Canarias: **el SERA**. Dónde no coinciden:

- **La blanca a destellos en vuelo**: la FAA dice que no se usa; la OACI, la
  DINAC y el SERA, «aterrice en este aeródromo y diríjase a la plataforma».
  No sale en el ejercicio, pero si saliera sería la del SERA.
- **El alabeo para contestar**: la FAA no pone salvedad; la OACI y la DINAC
  ponen una nota; el SERA lo sube a la norma, «excepto en los tramos básicos
  y final». Aquí no se pide alabear en la base ni en la final, y la torre no
  enciende los destellos ahí: en la final lo que toca es la fija.
- **La roja y verde alternas** solo existe en la FAA; la pirotecnia roja,
  solo en la OACI, la DINAC y el SERA. Ninguna sale.
- **El 7600**: el SERA lo manda (*shall*); la FAA lo aconseja (*should*); el
  Anexo 2 y la DINAC leídos no lo mandan en VFR, y la DINAC remite a su R10,
  volumen II, que no se ha leído.
- **Cómo se llega**: solo la FAA da el paso a paso —quedarse fuera hasta ver
  el flujo del tráfico, entrar en el circuito y mirar a la torre—. Aquí se
  sale del propio campo y se está ya en su circuito, que es justo donde el
  SERA pide estar atento a las señales.

### El campo, el avión y el peldaño

- **El campo**: uno con torre —con lámpara: ni AFIS ni sin servicio— de los
  que vuelan con el SERA, los de España (`campoConLamparaYSera`). **En
  Paraguay todavía no**: el 7600 en VFR no está en lo leído de la DINAC, y lo
  que no está en una fuente leída no entra. Cuando se lea su R10, se abre.
  La aeronáutica no cambia de un lado al otro del mar —la tabla de las luces
  es la misma—, pero lo que se dice tiene que estar escrito.
- **El avión**: las avionetas de pistón, el JAZ 20 y el JAZ 40. Son las que
  vuelan circuitos en visual, que es donde se aterriza con la lámpara. Un
  avión de línea vuela por instrumentos y, sin radio, sigue su autorización
  —es otra lección, la de la parte IFR del 6-4-1 y del SERA.14083 c) 4)—; el
  fumigador no es de campos con torre.
- **El peldaño**: Taguató y Taguató Ruvichá. El #90 deja abajo solo el motor
  parado, y el 7600 es un número que se ve marcar, del peldaño de las cifras.
  La lámpara se entiende sin leer, y lo esencial va por ella —color y si
  destella—, pero el procedimiento entero lleva su número.

### El ejercicio

`fallo-de-radio`, en `flight/ejercicios.ts`, con la avería `que: "radio"`, en
la vuelta al campo y a los cuatrocientos pies de la subida, como la carga
suelta: el despegue está hecho y queda el circuito entero.

1. **La instructora lo presenta** en la pista, con el dibujo del
   transpondedor: `ejercicio.fallo-de-radio.antes`.
2. **Se calla la radio**: lo que se decía se corta, lo que esperaba turno se
   retira, y desde ahí ni la torre ni la frecuencia suenan ni se escribe nada
   en la tira (`seCallaLaRadio`). La instructora: `ejercicio.radio.callada`
   —se calló, marco siete seis cero cero, seguimos el circuito mirando la
   torre—, y en la tarjeta del transpondedor se ven las cifras una a una,
   7, 76, 760, 7600, en el hueco de la letra, que un número se reconoce sin
   leer. Lo marca ella, como el transpondedor de después de aterrizar.
3. **La torre lo ve** a los diez segundos de tener el código entero
   (`LA_TORRE_LO_VE`, sin fuente: lo que tarda una pantalla en refrescarse y
   alguien en coger la lámpara) y, si te cuenta en su circuito y no vas en la
   base ni en la final, **enciende los destellos verdes**: regrese para
   aterrizar. La instructora: `ejercicio.radio.destellos` —quiere decir que
   volvamos para aterrizar, y se contesta moviendo las alas—, o de noche
   `ejercicio.radio.destellosDeNoche`, que contesta ella con los faros: el
   juego no tiene interruptor de faros en la mano de quien vuela.
4. **Las alas contestan**: más de diez grados a un lado y, en menos de cuatro
   segundos, al otro (`AlasQueContestan`); un viraje del circuito, largo y
   siempre del mismo lado, no cuenta. La instructora: `ejercicio.radio.alas`.
   Si no se contesta no pasa nada: la torre sigue igual, que la luz no espera
   respuesta para ser verdad.
5. **En la final**, la regla de siempre: la **verde fija** con el permiso de
   aterrizar (`ejercicio.radio.verde`) o la **roja fija** si te manda irte
   (`ejercicio.radio.roja`: ceder el paso, subir y otra vuelta mirando la
   torre). Tras la roja, de nuevo en su circuito, los destellos otra vez.
6. **El cierre**, parado en la pista: `ejercicio.radio.bien` si se tocó con
   la verde fija; si no, `ejercicio.radio.bienSinLaVerde`, que lo cuenta sin
   reproche —sin radio, la pista es tuya con la verde; la próxima, otra
   vuelta—. La radio vuelve al cerrarse.

Sin llamada ni bomberos: no hay radio con qué llamar, y nada se ha roto.

### La lámpara, con la regla de los permisos

`flight/fallo-de-radio.ts`, sin dibujo, con su prueba. **No decide nada
nuevo**: lee la orden de irse y el permiso de aterrizar que el juego ya
decide con su tráfico (`turno-de-pista.ts`, `la-aproximacion.ts`) y los
enciende. En orden: la roja si hay orden de irse —gana a un permiso viejo—,
la verde fija con el permiso, y los destellos si te cuenta en su circuito con
el 7600 visto y fuera de la base y la final. En tierra, ninguna: las de en
vuelo no dicen lo mismo en el suelo.

Para que haya permiso y orden en la vuelta al campo, que no lleva torre
(`VUELTA.torre` es `false`), **con la radio callada la torre lleva el turno de
la pista** (`laTorreTeLleva`): un 7600 en su pantalla es alguien que vuelve a
aterrizar sin radio, y se le hace sitio como a cualquiera. Ver la enmienda
H71 del ADR 0029.

En el HUD, la lámpara de siempre, **grande y sin letras** (`torre--sin-radio`):
las letras serían la radio hablando. La roja lleva la mano de parar y no la
flecha de subir, para que la forma la distinga de la verde sin el color.

### Lo que se calla

- **La voz de la torre y la del otro avión**, en su boca (`callaSalvo`): lo
  que pida decir se cae antes de entrar en la cola, con su apunte.
- **La frecuencia**, con `loQueCalla.laFrecuencia`: el tráfico sigue volando y
  la torre turnándolo; solo deja de oírse.
- **La tira de la radio** (`Hud.ponerSinRadio`).
- **Lo que la instructora diría de una frustrada o de una pista que vuelve a
  estar libre**: lo cuenta el paso de la luz. Un suceso, una voz.

### El banco

`verificar-emergencias.mjs radio`, con el JAZ 20 en Gran Canaria y Taguató.
Despega, sube a 74 nudos, y a los cuatrocientos pies se calla la radio; da el
circuito y, al ver los destellos en la subida, el tramo cruzado o el viento
en cola, alabea dieciocho grados a cada lado; en la final, si a sesenta
metros no tiene la verde, o si tiene la roja, se va y da otra vuelta. Con
`OGA_PISTA_OCUPADA=1` pone a uno a despegar en la final antes de la verde.
Mira:

- que se presente y que se calle subiendo, sin motor parado, y se diga;
- el 7600 marcado cifra a cifra;
- que ni la torre ni la frecuencia digan nada desde que se calla hasta que
  vuelve, ni se escriba en la tira;
- la lámpara grande y sin letras;
- las luces en su orden: destellos y verde fija, sin roja; y con la pista
  ocupada, destellos, la roja con alguien en la pista y la verde tras otra
  vuelta;
- que a los destellos se conteste alabeando y se explique cada luz;
- que toque en la pista con la verde fija y sin percance;
- sin llamada ni bomberos, el cierre celebrado con `ejercicio.radio.bien`;
- y nada del ejercicio tirado por la boca (H67 del ADR 0033).

### Comprobado

Cuatro tiradas, todas con el JAZ 20 en Gran Canaria y en Taguató:

- **La primera, 11 de 13.** La radio se calló a 115 m, el 7600 se marcó
  cifra a cifra, nadie habló y la lámpara salió grande y sin letras; pero
  la torre encendió la **verde fija a 170 m, en la subida**. Subiendo por
  el eje, un bache dejó la vertical por debajo de `SIN_SUBIR` y la torre te
  metió en su final: la vuelta al campo no llevaba torre y nadie lo había
  visto, y con la torre llevando el turno daba el permiso subiendo. Ahora,
  al callarse la radio, la torre te trata como recién despegado
  (`FinalDeLaTorre.despegado`): no hay final hasta haberse dado la vuelta,
  como tras irse al aire (H69 del ADR 0029). Con su prueba.
- **La segunda, 9 de 13**: los destellos a 177 m, las alas contestaron a
  los tres segundos y la verde en la final; pero a 130 m el piloto del
  banco, lento, pidió todo el gas, subió quince metros y la torre lo dio por
  ido al aire (`seVaDeVerdad`): se apagó la verde, se fue a los sesenta
  metros sin ella y no le dio tiempo a otra vuelta. Era del banco: en la
  final sin radio ya no pide más de 0,85 de gas.
- **La tercera, 13 de 13**: destellos a 179 m, las alas a los 3,0 s, la
  verde fija a 297 m al entrar en la final, tocó en la pista a 96 m del
  umbral con la verde, sin percance, y `ejercicio.radio.bien`. Ni la torre
  ni la frecuencia dijeron nada mientras duró, y nada del ejercicio se cayó
  de la cola.
- **La de la pista ocupada, 13 de 13**: destellos, alas, la verde en la
  final; a 75 m del suelo despega EC-PSO, la torre pone la **roja** a 67 m
  con EC-PSO en la pista, el banco se va, los **destellos** vuelven a 106 m
  en la subida, otra vuelta y la **verde**; tocó a 223 m del umbral con
  ella. La torre volvió a hablar —«expedite vacating»— al cerrarse el
  ejercicio, parado en la pista, con la radio ya de vuelta.

Las frases están sin grabar, así que se callan en la puerta y no entran en
la cola: lo que tira la boca (H67 del ADR 0033) no se puede ver hasta
grabarlas, y es para entonces.

`tsc --noEmit -p .` en verde, y **el vitest entero** de la rama: 583 de 583
ficheros y 11.605 pruebas en verde, con 32 saltadas y una pendiente. Dentro,
`fallo-de-radio.test.ts`: la regla de la lámpara —destellos en su circuito
con el código visto, nada antes ni fuera ni en la base y la final, la verde
con el permiso, la roja que gana a un permiso viejo, nada en tierra—, las
cifras del 7600, las alas que contestan y el viraje que no, dónde y con qué
se ofrece, `hayLampara` contra `sinTorre` y `esAfis` en todos los
escenarios, la frecuencia que se calla y la torre que sigue viendo su final,
la final que no se coge recién despegado y la práctica paso a paso.

### Lo que queda

- **Grabar las frases** de abajo.
- **Paraguay**: abrir el ejercicio en Asunción, Encarnación y Minga Guazú
  cuando se lea dónde manda la DINAC el 7600 en VFR (su R10, volumen II).
- **Los faros**: de noche contesta la instructora, porque quien vuela no
  tiene interruptor de faros. El día que lo tenga, se contestan con dos
  destellos suyos.
- **El receptor solo o el transmisor solo**, que la FAA separa y el SERA
  cuenta en el SERA.14085: aquí falla todo.

### Las frases

Nueve, de la instructora y en calma, en `es-PY` y en `en`; el guaraní no se
toca. «Siete seis cero cero» con letras. Van en `LOS_EJERCICIOS` de
`sin-instructora.ts` y en `DEL_FALLO_DE_RADIO`, al final de
`frases-para-grabar.mjs`. **Sin grabar**: hasta que se graben, se ven en la
tarjeta y la voz se calla.

- `ejercicio.fallo-de-radio.antes`
- `ejercicio.radio.callada`
- `ejercicio.radio.destellos`
- `ejercicio.radio.destellosDeNoche`
- `ejercicio.radio.alas`
- `ejercicio.radio.roja`
- `ejercicio.radio.verde`
- `ejercicio.radio.bien`
- `ejercicio.radio.bienSinLaVerde`

Y en el hangar, que solo se lee: `hangar.ejercicio.fallo-de-radio`.

### Al juntar con la H70b: las frases en fila y la lámpara que no se apaga

- **Las frases van de una en una**, por la misma vía que las del tren de
  nariz desde la H70b: `frasesSinRadio`, una `FrasesEnFila` que pide cada
  una cuando la anterior del ejercicio ha acabado, con `decirDelEjercicio`
  debajo. La de una luz vale mientras esa luz siga encendida: si la torre
  cambia de señal antes de que le toque, no se dice. La de la radio callada
  y la de las alas, mientras dure el fallo.
- **La verde fija ya no parpadea** cuando se acaba el rato de la tarjeta del
  permiso: con la radio callada ese apagado no toca la lámpara, que sin
  radio la verde es la autorización entera y se queda mientras valga el
  permiso. En los bancos salía como «apagada» y «verde» a la misma altura.
- **La lámpara no se apaga por geometría** (`LamparaSinRadio`). Los
  destellos se apagaban unos segundos en la esquina del tramo cruzado y en
  todo el viento en cola del banco, donde la torre deja de contarte en su
  circuito, y una lámpara de verdad no se apaga y se enciende por dónde vas;
  el SERA no pide apagarla en ningún sitio. Ahora, llamado una vez con los
  destellos, en el aire la lámpara siempre dice algo, y lo último se queda
  hasta que la torre mande otra cosa. Lo que no se queda es lo que dejó de
  ser verdad: la verde sin permiso o la roja sin orden vuelven a los
  destellos, «regrese para aterrizar». Los primeros destellos siguen sin
  encenderse en la base y en la final; y si vuelven ahí de día —un permiso
  que se fue sin orden—, la instructora no pide alabear, que ahí no se
  contesta, y no dice nada: se ven.
- **Ni entre una señal y otra, ni en un bote.** Al levantarse la orden de
  irse, la lámpara se apagaba un fotograma antes de los destellos; ya no. Y
  al tocar se gasta el permiso, así que el bote de la toma —un segundo, a
  siete metros— encendía los destellos encima de la pista: el primer banco
  de después del juntado acabó en «destellos» y no en la verde. En los cinco
  segundos de después de tocar (`REBOTE`) se queda lo que había; pasado eso,
  seguir en el aire ya es irse.

Comprobado tras el juntado: el banco con la pista ocupada, 13 de 13, con
las luces destellos → verde → roja con EC-PSO en la pista → destellos →
verde y ni un apagado en el aire; y el vitest entero de la rama juntada,
583 de 583 ficheros y 11.616 pruebas en verde, con 32 saltadas y una
pendiente.

## Enmienda H71c (23-11-2026): sin radio, la verde fija subiendo, otra vez

### El caso

Con las nueve frases grabadas, sobre 0ce0af63, `verificar-emergencias.mjs
radio gran-canaria jaz-20 taguato` dio 11 de 13: la radio se calló a 120 m,
el 7600 quedó marcado a 136 m y la torre encendió la **verde fija a 176 m,
subiendo a 69 nudos**. El juego celebró una frustrada a 213 m («going
around. good decision») y no hubo un solo destello en todo el circuito: la
verde se quedó puesta hasta la toma. Con la pista ocupada, en la misma
copia, 13 de 13. Es lo que vio el primer banco de la H71 a 170 m, y lo que
la H71 creyó arreglar.

### Por qué

La H71 lo achacó a la final de la torre y la cerró al callarse la radio
(`FinalDeLaTorre.despegado`). No salía de ahí. El permiso se pide cuando la
torre te ve en final, y **la torre mira la fase del plan antes que su propia
final** (`faseQueVeLaTorre`, en `flight/lo-que-calla-el-ejercicio.ts`): si
el plan dice «final», es final, esté cerrada la suya o no. Y el plan lo
decía:

- `deducir`, en `flight/vuelo.ts`, da «final» a quien ya ha volado —más de
  120 m y quince segundos en el aire—, alineado, a menos de 400 m del eje,
  por debajo de 300 m, **antes del centro de la pista** y bajando.
- La 03L de Gando mide 3.104 m. El JAZ 20 se va del suelo a unos 300 m del
  umbral y sube al doce por ciento: pasa los 120 m unos 300 m antes del
  centro. En ese trozo, un bache que deja el variómetro medio segundo por
  debajo de cero lo cumple todo.
- Y una vez en «final», encima del asfalto se sigue en ella aunque se pase
  el centro (`posandose`, pensado para quien flota en la recogida, que no
  mira la altura), mientras no se suban veinte metros.

La traza del banco cuadra con eso, aunque no apuntaba de dónde le salía la
final a la torre: la verde a 176 m, pasado ya el centro, que es lo que da
una «final» cogida antes y sostenida encima del asfalto; a los 72 s, a
186 m y 1.859 m del umbral, el variómetro en −4,6; la frustrada a 213 m,
que son los cuarenta metros sobre lo más bajo del bache que pide el
detector, armado porque la fase era «final»; y `vuelo.enVuelo` detrás, la
fase saliendo de ella. El permiso no se cayó al salir, porque lo que lo
retira al dejar la final mira la de la torre, que no se había abierto: por
eso la verde duró el circuito entero y no hubo destellos.

No es del fallo de radio: es de cualquier despegue por una pista larga con
un bache antes del centro. En una lección con torre habría sido un «cleared
to land» subiendo; en la vuelta al campo, una «final» del plan con su
detector de frustradas armado. Sin radio se vio porque la torre lleva el turno también
en la vuelta al campo (H71) y enciende el permiso sin esperar a una voz.

Un banco de diagnóstico de 170 s, con un apunte de dónde salía la final de
la torre, no tuvo bache en la subida y no lo reprodujo. Lo reproduce la
mesa de abajo, con la máquina de fases de verdad.

### La regla

**Recién despegado no hay final ni permiso de aterrizar hasta haberse dado
la vuelta.** Va en `Vuelo`, al lado de `trasIrse`, la de la frustrada (H69
del ADR 0029): `recienDespegado`.

- **Se pone** al dejar el suelo después de haberlo tocado: un despegue o un
  toque y despegue. Un bote no, que no pasa de los doce metros de
  `EN_EL_AIRE`; y quien empieza en el aire sin haber pisado, tampoco.
- **Se quita** al darse la vuelta (120°, `TORCIDO_PARA_SALIR`), al salir del
  pasillo de la final (400 m del eje), al estar por delante de la pista o al
  volver al suelo. Pasar el centro no lo quita, al revés que en la
  frustrada: encima del asfalto se seguía en «final». «Por delante de la
  pista» es lo que no deja sin final a quien llega a la pista de otro campo,
  ni al avión que se coloca en una final desde el suelo.

Como la torre lee esa fase, vale para ella y para todo lo que cuelga de
«final» —la instructora, los aros, el detector de frustradas—, con radio y
sin ella. `FinalDeLaTorre.despegado` se queda: cierra la final propia de la
torre al callarse la radio, y no estorba. Y para el banco, un apunte nuevo:
«la torre te ve en final: la fase del plan» o «su final», que habría dicho
esto a la primera.

### La prueba

`flight/final-recien-despegado.test.ts`: la subida del banco con la máquina
de fases y la torre como la mira el juego —la fase del plan y su propia
final, cerrada como la cierra el fallo de radio—, por la 03L de Gando, con
dos segundos de bache a 140 m antes del centro.
Detrás, diez segundos subiendo a menos de un metro por segundo, como a los
64 s del banco. Con el `vuelo.ts` de antes, la fase entra en «final» a
139 m, 243 m antes del centro, y sigue en ella hasta 245 m pasado el centro,
a 155 m: la verde del banco. Cuatro de ocho en rojo: la subida con el bache,
la torre sin radio, la torre con radio y el toque y despegue. Las otras
cuatro, en verde en los dos, son lo que no tiene que cambiar: la final de
vuelta del circuito, la de quien empieza en el aire en una final y la de
quien se coloca en una desde el suelo, de un salto o tras otro vuelo.

### Comprobado

En el navegador, con las voces grabadas y sobre una copia fija de la rama
con el arreglo:

- **`radio gran-canaria jaz-20 taguato`, dos veces seguidas: 13 de 13 y 13
  de 13.** Destellos a 172 m y a 174 m en la subida —la primera luz, como
  debe ser—, las alas a los 5,8 s y a los 2,8 s, la verde fija en la final a
  293 m y a 199 m, y la toma con ella a 124 m y a 229 m del umbral, cerrada
  con `ejercicio.radio.bien`. Ni la torre ni la frecuencia dijeron nada, y
  nada del ejercicio se cayó de la cola.
- **El mismo con `OGA_PISTA_OCUPADA=1`: 13 de 13.** Destellos a 188 m,
  verde a 262 m en la final, EC-PSO despega delante a 75 m y la torre pone
  la roja a 67 m; la frustrada, los destellos otra vez a 105 m, otra vuelta y
  la verde a 301 m; tocó con ella a 108 m del umbral.
- **`radio gran-canaria jaz-40 taguato`: 13 de 13.** Destellos a 221 m,
  alas a los 6,0 s, la verde a 303 m y la toma con ella a 222 m del umbral.
- **`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-20`, porque
  se toca la fase: 58 de 58** (dos sin medir). Un permiso, en la final, a
  los 547 y 554 s, a 198 y 182 m; nadie de frente; apagado a los 968 s.

`tsc --noEmit -p .` en verde, y **el vitest entero** de la rama: 584 de 584
ficheros y 11.624 pruebas en verde, con 32 saltadas y una pendiente.

Lo que no se ha podido ver: el bache del banco cae cuando cae, y en estas
cinco tiradas no se sabe si lo hubo antes del centro —sin «final» en la
subida no queda apunte que lo diga—; lo que lo fija es la mesa. El apunte
nuevo de la torre solo sale en la traza de un banco que falla o con
`OGA_TRAZA=1`.

### Lo que queda

- **El permiso dado con una «final» que solo era del plan no se retira al
  salir de ella**: en `game.ts` lo retira la salida de la final de la torre
  («El permiso es de una aproximación»). Con esta regla y la de la H69 no se ha encontrado otra
  «final» del plan sin la de la torre, pero si apareciera, la verde duraría
  el circuito entero, como en el banco de arriba. Ver la enmienda H71c del
  ADR 0029.

## Enmienda H73 (24-11-2026): sin radio, la verde fija dura su aproximación y no el circuito

Lo que dejó la H71c: un permiso dado con una «final» que solo era la del plan
no se retiraba al salir de ella, y con la radio callada la verde fija habría
durado el circuito entero. No hacía falta tanto: en la mesa se quedaba verde
también quien **pasaba la pista de largo sin subir**, quien **rompía la final
a un lado** y quien **cruzaba el eje bajo en un viraje**. La regla y los
casos, en el ADR 0029, enmienda H73; aquí, lo que toca al fallo de radio:

- La lámpara no cambia: enciende el permiso que haya (`LamparaSinRadio`). Lo
  que cambia es que el permiso se retira al dejar su aproximación, y entonces
  vuelven los destellos —«regrese para aterrizar»—, que es lo que la torre
  está diciendo, hasta la verde de la final siguiente.
- **Por un bache no se apaga ni cambia**: veinticinco metros corrigiendo la
  senda son la misma aproximación, y la mesa lo mira paso a paso.
- Un permiso que se retira ya no apaga la lámpara por su cuenta sin radio
  (`retirarElPermisoSinOir`): la lleva `encenderSinRadio`, y apagarla desde
  ahí era un parpadeo.
- **Al levantarse una orden de irse sin volver a darte la pista, no vuelve la
  verde**: la orden anuló el permiso. Quien no había subido los quince metros
  que son irse la veía pasar de roja a verde.

Sin frases nuevas. La prueba, `flight/permiso-de-una-aproximacion.test.ts`.

## Enmienda H74 (24-11-2026): el reventón en la carrera

### El caso

Del catálogo del #90 faltaba, del despegue, esto: «**Reventón de neumático.**
Un golpe seco, el avión tira hacia un lado y hay que mantener el eje con el
timón. Y complica la decisión de V1: con un neumático menos, frenar es mucho
más largo».

### De dónde sale el procedimiento

Leídas, no de memoria:

- **FAA y la industria, *Takeoff Safety Training Aid***, sección 2, *Pilot
  Guide to Takeoff Safety* (la copia de `faa.gov`, de 2007), 2.3.5.3.4,
  «Wheels, Tires, and Brakes», pp. 2.25 a 2.27. Es el documento que anuncia la
  **AC 120-62** (12-9-1994), que en su apartado 8 b (3), p. 9, pide practicar en
  el simulador «appropriate crew responses for engine failure, tire failure,
  […] in both the high and low speed regimes».
  - **Cómo se nota** (p. 2.26): «A tire burst may be loud enough to be confused
    with an engine compressor stall, may just be a loud noise, or may not be
    heard. A tire failure may not be felt at all, may cause the airplane to
    pull to one side, or can cause the entire airplane to shake and shudder».
  - **Despacio se para** (p. 2.26): «If a tire failure is suspected at fairly
    low speeds, it should be treated the same as any other rejectable failure
    and the takeoff should be rejected promptly». Y al parar, «directional
    control may be difficult» y «the crew should not relax from a maximum
    effort RTO until the airplane is stopped on the pavement».
  - **Deprisa se sigue** (p. 2.26): «Rejecting a takeoff from high speeds with
    a failed tire is a much riskier proposition, especially if the weight is
    near the Field Limit Weight. The chances of an overrun are increased simply
    due to the loss of braking force from one wheel. If additional tires should
    fail during the stop attempt, the available braking force is even further
    reduced. In this case, it is generally better to continue the takeoff». La
    figura 17 (p. 2.27), con la pista justa y parando desde V1 con reversa: se
    sale de 300 a 500 pies, a 40-60 nudos; siguiendo, pasa el final a unos 150
    pies.
  - **Hasta dónde** (p. 2.27): «it is not a straightforward issue to define
    when a takeoff should be continued or rejected after a suspected tire
    failure. It is fairly obvious however, that an RTO initiated at high speed
    with a suspected tire failure is not a preferred situation», y la de
    McDonnell Douglas: «a policy of not rejecting a takeoff for a suspected tire
    failure at speeds above V1−20 knots».
  - **Dirección** (p. 2.26): «Failed tires do not in themselves usually create
    directional control problems»; la pierden los trozos que salen disparados.
  - **El tren** (p. 2.26): «leaving the gear down after a suspected tire failure
    will not jeopardize the aircraft if all engines are operating. […] The
    decision to retract the gear with a suspected tire problem should be in
    accordance with the airline's/manufacturer's recommendations».
  - **La vuelta** (pp. 2.26 y 2.27): menos peso y menos velocidad, la
    tripulación preparada, y «most important, […] the entire runway will be
    available for the stop maneuver instead of perhaps, as little as 40% of it».
- **NTSB, AAR-10/02** (Learjet 60, Columbia), p. 36, que cita lo mismo; y p. 69:
  con dos ruedas por eje, perder una «can increase the load on the remaining
  properly inflated tire on that axle to a factor of about 1.2».
- **AAIB, *Bulletin* 1/2003, G-BZAY** (Avro 146-RJ100, Gatwick, 8-5-2002), un
  reventón de verdad en la carrera: un ruido y una vibración que se oían atrás y
  no en la cabina de mando, y un temblor al rotar (pp. 1 y 2). Metieron el tren
  y **los restos del neumático, probablemente, no dejaron cerrar la compuerta y
  la dañaron** (p. 6); al volver,
  «landing was to be made using minimum braking» y «gentle wheel braking»
  (p. 3). Y aquí no coincide con lo de arriba: lo recogieron otra vez para que
  la goma suelta no golpeara en el aire, y el informe lo da por entendido
  (p. 7), con «normally […] having successfully lowered the landing gear, it
  remains down».
- **14 CFR 25.729 (f)**: lo que va en el hueco del tren y hace falta para seguir
  tiene que estar protegido de «a bursting tire» y de «a loose tire tread»; y
  **25.733 (c)**, el neumático de una pata de dos, para 1,07 veces su carga, menos
  que ese 1,2 que recibe cuando se va el de al lado.

**Lo que no se ha leído:** el manual del E170, que no está en línea. La guía deja
lo del tren en lo que diga el fabricante; se enseña **dejarlo fuera**, que es lo
que la guía da por seguro con los dos motores, y lo que evita lo del G-BZAY. Y
«no meter el tren» como lista de otro avión solo se ha visto citado en foros:
no entra.

### El avión, el peldaño y el momento

- **El JAZ 90**, de la clase del E170: la guía es de reactores de transporte, y
  en él una rueda principal es una de cuatro. En el JAZ 120, de dieciséis,
  apenas se notaría; el JAZ 110 no tiene sus ruedas en la ficha. Los de pistón no
  deciden con V1. La ficha lleva `ruedasPrincipales`, cuántas y a qué media vía,
  las de su dibujo (`VIA` en `modelos/jaz-90-arai.py`); sin ella no se ofrece.
- **Desde Taguató**, que es donde el #90 pone «V1, fallo asimétrico, regreso»: el
  reventón es una pregunta sobre V1 y un regreso declarado. El texto del #90 no
  lo nombra en un peldaño; el «catálogo entero» es el de Ruvichá, y ahí también
  está.
- **A dieciocho nudos de V1**: dentro de los veinte en que se recomienda seguir
  y todavía antes de V1, que es donde está la pregunta. Con las V del JAZ 90,
  cinco segundos antes de rotar.

### El ejercicio

`reventon`, en `flight/ejercicios.ts`: la lección de dar una vuelta y una avería
nueva, `que: "neumatico"`, con su `Momento`: en la carrera, a `aFaltaDe` de V1.

1. **La instructora lo presenta** antes de soltar frenos, con el dibujo.
2. **El golpe**: seco, grave y corto (`golpeDeRueda`), por debajo de lo que suena
   un calzo y por el bus que se agacha cuando alguien habla. Sin alarma: en
   ninguna fuente leída la lleva ese avión. El traqueteo de la pista, al doble.
3. **Sin leer**: la tarjeta del avión por detrás con la rueda de ese lado
   aplastada y la flecha de hacia dónde tira, que se mueve; y al segundo y medio,
   el pedal que se pisa, el del otro lado. La instructora: «se reventó una rueda
   de la izquierda: pie derecho, y seguimos», una frase corta por lado.
4. **Se decide.** Si para en la pista sin haber volado, se cierra ahí, felicitado
   y con los bomberos a mirar los frenos; «parado» si no llegó a V1 —cuenta en el
   cuaderno como parar a tiempo— y «paradoTrasV1» si llegó, con la misma frase.
   Nadie le pide parar ni le dice que hizo mal.
5. **Si sigue**, al volar de verdad, el tren se queda fuera y se cuenta por qué;
   el juego no pide meterlo en ese vuelo (`trenSeQuedaFuera`). Si se mete igual,
   se cuenta una vez y se invita a sacarlo.
6. **PAN PAN** a los cuatrocientos pies, «burst tire, returning», con la torre
   contestando, la prioridad y, en la final, los bomberos de ese aeródromo.
7. **La toma se cuenta en la final**, y al tocar vuelve la tarjeta del pie.
8. **El cierre**, parado en la pista: `ejercicio.reventon.bien`.

Los pasos valen hasta el siguiente o el cierre (`valeHastaElPasoSiguiente`),
menos la del golpe, que pide el pie en el instante, y van en fila
(`FrasesEnFila`), como las de la H70b y la H71.

### El modelo

En `fdm.ts`, con `ponerNeumaticoReventado`, y solo en el avión con
`ruedasPrincipales`:

- **Roza**: un décimo de lo que carga su pata (`ROCE_DEL_REVENTADO`), cinco veces
  lo que rueda una sana. **Sin fuente leída.** Queda entre las dos cosas que sí
  dice la guía: se va a un lado si no se hace nada, y se sostiene con poco pie.
  Y mucho más arriba no puede: con 0,245 el roce devolvería todo lo que se pierde
  de freno y parar costaría lo mismo que con las cuatro, que es lo contrario de lo
  que dice.
- **Frena menos**: falta el freno de una rueda, un cuarto de lo que dan las
  cuatro con el pie a fondo.
- **Y tuerce**: las dos fuerzas van a 2,55 m del eje. Rodando y con poco freno
  tira hacia la reventada; a fondo, la pata sana frena más y tira hacia la otra.
  Por eso se frena suave y parejo.
- **La ayuda del timón en tierra no sostiene el rumbo** con una rueda reventada
  (`timonEnTierra`): en Taguató ponía el pie ella sola y el avión no se iba a
  ningún lado, que era quitarle el ejercicio a quien vuela. El volante sigue
  dando el timón, que es con lo que lo lleva quien no tiene pedales.
- **El autofreno** cuenta con las dos cosas: pide su deceleración y la da.

Medido en la mesa, en llano y a su masa:

| | con las cuatro | con una reventada |
|---|---|---|
| De 122 a 152 nudos, a fondo | 4,7 s, 333 m | 5,0 s, 354 m |
| Esos segundos sin tocar nada | en el eje | 2,9 m y 0,85° yéndose |
| Y con el pie en el eje | — | 0,5 m, pedal hasta 0,05 |
| Parar desde 140 nudos, frenos a fondo, sin reversa | 520 m | 597 m; pedal hasta 0,17 (sin pie, a 32 m del eje) |
| Parar desde 140, a fondo y con reversa | 395 m | 438 m |
| Parar desde 115, frenos a 0,4 | 766 m | 763 m, casi sin pie |
| Rodar desde 115 sin frenos ni pie | en el eje | 313 m fuera |

Lo de la figura 17 —salirse de 300 a 500 pies— no se reproduce: es de un avión
con la pista justa y unos frenos que no son los de este, y el juego no baja la V1
por la reventada, como no la baja ningún piloto en la carrera.

**Neutral al bit sin el ejercicio**: `reventado` es `null` y cada cuenta nueva va
detrás de ese `null`. Comprobado huella a huella contra 7b60ea6d, posición,
velocidad, orientación, ritmos y velocidad del aire de **cada paso**: los ocho
aviones, 60 finales con rachas hasta veinticinco segundos después de tocar
—frenos a fondo, a medias y autofreno, con y sin reversa y con y sin pie— y 120
carreras con rachas y viento cruzado, la mitad abortadas a fondo, en Tukã, Taguató
y Taguató Ruvichá por turno. Las dieciséis huellas, iguales. **El control**: un
empujón de 1e-15 rad/s en un paso de una carrera cambia las ocho de las carreras
y ninguna de las finales.

### El banco

`verificar-emergencias.mjs reventon`, con el JAZ 90 en Taguató. El piloto del
banco no toca nada ocho décimas, sostiene el eje con el pie, sigue, no mete el
tren, da el circuito con él fuera, toma y frena a cuatro décimas, por el eje. A
la velocidad de verdad lo que se dice —del golpe a la llamada, y la final—, y a
cuatro por uno el circuito. Con `OGA_PARAR=1` para en la pista; con
`OGA_METE_TREN=1` mete el tren al volar y lo saca cuando se lo cuentan;
`OGA_MOTOR` elige el lado y `OGA_FOTOS` deja las tarjetas. Mira:

- que se presente y que reviente rodando, dentro de los veinte nudos de V1;
- el golpe, su tarjeta en pantalla y la frase del lado que toca;
- hacia dónde se va en ocho décimas sin tocar nada, el pie del otro lado y el eje
  a menos de diez metros hasta irse del suelo, con la rueda en el modelo. En
  calma, que es como vuela (`OGA_VIENTO` para otro viento);
- que el tren se quede fuera, se cuente y **nadie pida meterlo**;
- PAN PAN con la torre contestando, la prioridad y los bomberos;
- la toma contada en la final, en la pista, y el eje sostenido hasta parar sin
  alejarse de donde se tocó;
- sin percance, y el cierre con `ejercicio.reventon.bien` (o `bienParado`);
- y **nada del ejercicio tirado por la boca** (ADR 0033, enmienda H67).

### Comprobado

- **La primera tirada**, en Gran Canaria con la rueda izquierda y las voces sin
  grabar, **10 de 13**. Reventó a 101 nudos con V1 a 119; la tarjeta y la frase
  de la izquierda; «V one» y «rotate» en su sitio; el tren fuera y nadie pidió
  meterlo; PAN PAN contestado (`torre.canario.panpan`), tres camiones; tocó a
  190 m del umbral cayendo 1,6 m/s; cierre «vuelta» con `ejercicio.reventon.bien`.
  Los tres rojos:
  - **`ejercicio.declarar` caducó una vez** esperando detrás de la torre —se
    volvió a pedir y se dijo—: ahora «avisamos a la torre» va en la frase del
    tren, como en el «tampoco» de la H70. Un suceso, una voz.
  - **El eje en la carrera**, del banco: los doce metros eran los de la toma, que
    se contaban como carrera; rodando, la traza no pasa de dos. Y lo que tira en
    ocho décimas, tres centésimas de grado con rachas y viento cruzado, no se
    puede exigir con ese viento.
  - **El eje al tocar**, del banco: tocó a doce metros del eje en la racha y su
    palanca pedía el pedal entero. Se sostiene con menos.

  Y la final larga, a 1,1 de la Vref con los flaps de despegue, hacía sonar el
  avisador de pérdida: va a la del circuito hasta los cuatro mil metros.
- **Las tarjetas**, en las fotos de esa tirada: la del golpe, con la rueda
  aplastada y la flecha a la izquierda, y la del pedal derecho, segundo y medio
  después. La ficha del hangar se miró dibujada aparte, sin navegador.
- `tsc --noEmit -p .`, en verde antes de cada commit, y **el vitest entero**, con
  el código terminado: 586 de 586 ficheros y 11.685 pruebas en verde, 32
  saltadas y una por hacer. Dentro, `neumatico-reventado.test.ts` —las ruedas del
  dibujo, el lado al que tira, el poco pie, la ayuda que no lo sostiene y el
  volante que sí, la parada más larga, el freno suave y el de a fondo, el
  autofreno y el modelo de siempre al quitarla— y las nuevas de
  `practica.test.ts` y `boca.test.ts`.
- **La segunda, con los arreglos y la rueda derecha, 12 de 13**: reventó a 101
  nudos; la tarjeta y la frase de la derecha, con el pie izquierdo; el tren fuera,
  PAN PAN contestado y tres camiones; tocó a 302 m del umbral cayendo 2,1 m/s y a
  15,7 m del eje —la final del banco, no la rueda—, volvió a él y paró a 717 m,
  a medio metro; **nada tirado por la boca**; cierre «vuelta» con
  `ejercicio.reventon.bien`, y el avisador de pérdida, callado. El rojo, del banco:
  pedía que el pie medio de después fuera más a la izquierda que el de antes, y en
  Gando, con sus veinte nudos y sus rachas, el pie del viento es tan grande como
  el de la rueda. Las dos tiradas juntas sí lo enseñan: 0,144 de pie medio con la
  izquierda y 0,018 con la derecha, o sea seis centésimas a cada lado de las ocho
  del viento. Desde entonces **el banco vuela en calma** (`OGA_VIENTO` para otro)
  y ahí pide las dos cosas: hacia dónde se va en ocho décimas sin tocar nada y el
  pie del otro lado.
- **Parando** (`OGA_PARAR=1`, la izquierda, con el viento de Gando), **9 de 9**: se
  fue 0,39° a la izquierda en ocho décimas, el pie a la derecha, nunca a más de
  2,4 m del eje; parado a 795 m del umbral, de 3.104; cierre «parado», con los
  bomberos a mirar los frenos y `ejercicio.reventon.bienParado`.
- **En calma no se ha volado todavía**: la tercera tirada se quedó en la cola del
  navegador al acabarse el tiempo del encargo.

### Lo que queda

- **Las ocho frases, por grabar.** Hasta entonces se ven en la tarjeta y la voz
  se calla; y con ellas sin grabar el banco no puede ver si la boca las tira.
- **La frase del golpe es corta porque no cabe más**: en esos cinco segundos van
  también «ya despegamos: seguí» y «tirá para arriba». Al grabarla hay que
  volver a volar el banco.
- **El neumático en el dibujo**: las dos ruedas de una pata son una sola malla, y
  la reventada no se ve aplastada en el avión; se ve en la tarjeta.
- **Los trozos que saltan** —lo que la guía dice que de verdad da problemas, en
  flaps, hidráulica y motores— no están: es una avería cada vez.
- **El roce, sin fuente, y el tirón, suave**: seis centésimas de pie, lo que pide
  una racha de Gando. Es lo que dice la guía —no suele dar problemas de
  dirección—, y en calma se ve: casi tres metros y un grado en cinco segundos.
  Si se quiere más, es un solo número, `ROCE_DEL_REVENTADO`: con 0,15 se va 4,6 m
  y 1,3° en esos segundos y parar desde 140 cuesta un 9 % más en vez de un 15; con
  0,2, 6,6 m, 1,8° y un 4 %.
- **El reventón al tomar**, el otro del #90, en el aterrizaje: la mitad está —la
  toma con la rueda ya rota—; falta que reviente al tocar.

### Las frases

Ocho, de la instructora y en calma, en `es-PY` y en `en`; el guaraní no se toca.
Van en `LOS_EJERCICIOS` de `sin-instructora.ts` y en `DEL_REVENTON`, al final de
`frases-para-grabar.mjs`. **Sin grabar.**

- `ejercicio.reventon.antes`
- `ejercicio.reventon.izquierda` y `ejercicio.reventon.derecha`
- `ejercicio.reventon.tren`
- `ejercicio.reventon.sacalo`
- `ejercicio.reventon.toma`
- `ejercicio.reventon.bien` y `ejercicio.reventon.bienParado`

Y en el hangar, que solo se lee: `hangar.ejercicio.reventon`.

## Enmienda H77 (24-11-2026): un ave en el motor, con su petardeo

### El caso

Del catálogo del #90, dos cosas que van juntas: «**Ave dentro del motor.** Los
motores se certifican metiéndoles aves. Se puede perder empuje y hay que apagar;
el avión sigue volando» y «**El petardeo del motor, con llamarada.** […] es el
flujo de aire dentro del compresor que se **invierte** momentáneamente. Suena a
catástrofe, se ve fuego por la toma, y **casi nunca es catastrófico**. Saberlo
cambia por completo cómo se vive». Un ave en la toma es una causa corriente del
petardeo, y por eso son un solo ejercicio.

### De dónde sale

Leídas, no de memoria:

- **FAA, *Airplane Turbofan Engine Operation and Malfunctions: Basic
  Familiarization for Flight Crews***, capítulo 4 y fichas del apéndice. En
  `faa.gov` ya no está en su dirección; se ha leído la copia que guarda el
  Internet Archive de su `.doc` de 2001, de 38 páginas al imprimirla, y con esa
  paginación van las citas.
  - **Qué es** (p. 18): el aire que pasa por las palas del compresor puede entrar
    en pérdida «just as the air over the wing of an airplane can», y entonces
    «the high-pressure air behind the stall further back in the engine escapes
    forward through the compressor and out the inlet»; y el aviso que importa:
    se ha tomado por un reventón o por una bomba, y «in many cases, this has led
    to a rejected takeoff above V1».
  - **Cómo se nota**: «a very loud bang, which will be accompanied by yaw and
    vibration» (p. 18); «visible flames forward out the inlet and rearward out
    the tailpipe» (p. 19); y en la ficha (p. 31), «loud bang and yaw (may be
    repetitive). Flames from inlet and tailpipe. Vibration. High EGT/TGT.
    Parameter fluctuation».
  - **Si es grave** (p. 19): «rarely does a single compressor surge CAUSE severe
    engine damage, but sustained surging will eventually overheat the turbine».
  - **Las cuatro maneras** (p. 19): uno que se recupera solo, varios que se
    recuperan solos, varios que piden al piloto, y el que no se recupera.
  - **Las cifras** (p. 20): cada estallido, «separated by a couple of seconds»,
    unos dos segundos de *surge* y vuelta «to 98% of the pre-surge power for a
    few seconds»; el ejemplo de los repetidos, el EPR entre 1,6 y 1,3, la EGT
    subiendo 5 °C/s y el N1 entre el 103 y el 95 %, «with no change in thrust
    lever position»; y en el de uno solo, el EPR que cae en dos décimas y el N1
    en cinco.
  - **Qué se hace**: lo primero, volar —«their most important task is to fly the
    airplane» (p. 20); «regardless of the fact that a bird ingestion has resulted
    in an engine surge, the first priority task of the flight crew is to "fly
    the airplane." Once the airplane is in stable flight at a safe altitude, the
    appropriate procedures […] can be accomplished» (p. 24)—. Después, esa
    palanca: «retard the thrust lever until the engine recovers. The flight crew
    should then SLOWLY re-advance the thrust lever» (p. 19); los estallidos
    siguen «until the flight crew retards the thrust lever to idle», y si al
    avanzarla vuelven, «the engine may be left at idle, or left at some
    intermediate power, or shutdown, according to the checklists» (p. 20).
  - **El ave** (pp. 23 y 24): casi siempre cerca de los aeropuertos, despegando o
    aterrizando; en más de la mitad, la tripulación ni se entera; con una grande,
    «a thud, bang or vibration»; el motor «may surge once and recover; it may
    surge continuously until the flight crew takes action; or it may surge once
    and not recover». La ficha (p. 35): «after stabilizing airplane flight path,
    watch engine instruments for anomalies. If the engine surges, throttle back
    or shut down as necessary».
  - **Los mensajes** (pp. 31 y 35) van como «possible messages»: ENG STALL, EGT
    OVERLIMIT, ENG FAIL, VIB; o ninguno, «parameters may look normal».
- **El procedimiento de un manual**, el del A320, tal como lo cita la **AAIB,
  *Bulletin* 11/2004, G-EUUI** (pp. 3 y 4): la palanca de ese motor al ralentí;
  comprobados sus parámetros, «THR LEVER (affected engine) … SLOWLY ADVANCE»; «if
  stall recurs: THR LEVER (affected engine) … REDUCE. Reduce thrust and operate
  below the stall threshold». Y al principio, «abnormal engine noises,
  accompanied by flame from the engine exhaust (and possibly from the engine
  inlet in [a] severe case)».
- **14 CFR 33.76**, la ingestión de aves:
  - (a)(1) y (c)(1): a no menos del 100 % del empuje de despegue, y las
    velocidades de hasta 1.500 pies sobre el suelo.
  - (b): un ave grande, de 1,85 a 3,65 kg según la toma (tabla 1). Lo que no
    puede pasar (b)(3) es nada de 33.75 (g)(2): restos que se escapen, fuego sin
    control, o no poder pararlo, entre otras.
  - (c)(6): tras las pequeñas y medianas, ni «more than a sustained 25-percent
    power or thrust loss» ni pararse en la prueba de después; (c)(7): 2 minutos
    sin tocar la palanca, 3 al 75 %, 6 al 60 %, 6 al 40 %, 1 al ralentí de
    aproximación y 2 al 75 %. Son **veinte minutos**.
- **14 CFR 25.571 (e)(1) y 25.631**, del avión y no del motor: completar el vuelo
  tras un ave de 4 libras, y la cola, de 8. Leídas; no hacen falta para esto.
- **FAA, *Takeoff Safety Training Aid***, sección 2: el *No Go* pasada V1 «will
  not leave sufficient runway remaining» (p. 2.11); y el caso que lo enseña, en
  2.2.3 (p. 2.5): gaviotas «very near V1», «the number one engine surged and
  flamed out, and the takeoff was rejected. The airplane overran the end of the
  wet 6,000 foot runway». Y «virtually no revenue flight was found where a "Go"
  decision was made and the airplane was incapable of continuing the takeoff»
  (p. 2.5). Lo que se pedía, el 2.3.5, es de lo que cambia las cuentas de la
  pista —flaps, sangrado, ruedas, frenos— y de V1 no habla.

**Lo que no se ha leído:** el manual del E170, que no está en línea, y con él si
su EICAS escribe algo. Por eso no se escribe nada. El procedimiento del A320 se
ha leído citado por la AAIB, no en su FCOM.

### El avión, el peldaño y el momento

- **Los reactores de dos motores**, el JAZ 90 y el JAZ 110: la guía y el 33.76
  son de turbofanes. Volado en el banco, el JAZ 90; el JAZ 110, en la mesa. El
  JAZ 120, de cuatro, no: un motor a media potencia casi no le pide pie.
- **Desde Taguató**, que es donde el #90 pone el fallo asimétrico y el regreso:
  es un motor que da menos que el otro, sostenido con el pie, y una vuelta
  declarada. El #90 no nombra el ave en ningún peldaño; el «catálogo entero» es
  de Ruvichá, y ahí también está. En Tukã, solo el motor parado en vuelo.
- **A cien metros sobre el campo, subiendo**: después de despegar, que es lo que
  pide el encargo, con el tren ya pedido y metido, y antes de los cuatrocientos
  pies, que es donde se toca un motor.

### El ejercicio

`ave`, en `flight/ejercicios.ts`: la lección de dar una vuelta y una avería nueva,
`que: "ave"`. No es `"motor"`: el motor sigue en marcha.

1. **La instructora lo presenta** en la pista, con el dibujo.
2. **El golpe**, sordo y corto, y a los ocho décimas el primer **estallido**:
   seco, sin cola, cada cuatro segundos, por el bus que se agacha cuando alguien
   habla. Sin alarma ni mensaje. En el dibujo del avión, un **fogonazo** de un
   cuarto de segundo por la toma y por la tobera de ese motor
   (`world/llamarada.ts`): ni humo ni fuego que se quede. Y **su aguja de N1** se
   va de la otra a golpes, que es como se reconoce cuál es. De la EGT, nada: en
   los cuadros del juego ese reloj no está.
3. **Sin leer**: la tarjeta del avión por detrás con ese motor en rojo oscuro, el
   fogonazo que se enciende y se apaga —cada dos segundos, nunca más deprisa— y
   la flecha hacia donde tira; a los tres segundos y medio, el pedal del otro
   lado. La instructora: «entró un ave en el motor izquierdo: pie derecho, y
   seguimos subiendo», una por lado, y detrás qué son esos estallidos.
4. **Primero se vuela.** Nadie toca la palanca hasta catorce segundos después
   del ave, a cuatrocientos pies y con el avión sujeto —menos de veinticinco
   grados de alabeo y sin caer—. Si no se sujeta, a los treinta se toca igual.
5. **Esa palanca**, que la mueve la compañera y lo va contando, con su dibujo: las
   dos palancas, la de ese lado en rojo oscuro yéndose atrás y la otra quieta. A
   los cinco segundos, otra vez el pedal, que con ella atrás es cuando más tira.
   Diez segundos al ralentí, y adelante despacio, en diez.
6. **Si aguanta**, se queda en seis décimas y **PAN PAN**: con los dos en marcha,
   algo va mal y hay tiempo. **Si vuelve a estallar**, atrás, se para, y entonces
   es un bimotor con uno: **MAYDAY**, como en todo este ADR. Ninguna de las
   fuentes leídas dice qué llamada se hace; es la regla de aquí. En la pantalla,
   al pararlo, lo que se hizo —«THR LEVER 1 · IDLE», «FUEL CONTROL 1 · CUTOFF»— y
   no «ENG 1 FAIL», que lo paró la tripulación. Salen las dos, dos de cada tres
   veces aguanta: ese reparto **no tiene fuente**.
7. **La vuelta**, con la prioridad, los bomberos de ese aeródromo y la toma de
   siempre: con los gases bajos los dos motores dan lo mismo.
8. **El cierre** cuenta el ensayo: con los dos, los veinte minutos que tienen que
   seguir andando; con uno parado, que con la más grande lo que se pide es poder
   pararlo sin peligro.

El ave no se dibuja en el vuelo. En la ficha del hangar, una silueta que vuela.

**La palanca es de la compañera** y no de quien vuela porque en el juego el gas
es uno para todos los motores. Lo que sí es suyo es lo que la guía pone primero:
el pie y la velocidad. Y si quien vuela quita gas, ese motor también baja y se
calla, que es lo que pasaría.

### El modelo

`flight/ave-en-el-motor.ts`, sin three.js: el petardeo —lo que le queda de empuje
y de vueltas en cada instante— y la palanca. Lo vuela `fdm.ts`
(`ponerMotorTocado`): ese motor lleva su propio giro, que sigue a su palanca con
la inercia de siempre (H64, ADR 0034), y lo que le falta de empuje se resta por
su lado.

| Cifra | Valor | De dónde |
|---|---|---|
| Entre estallidos | 4 s | «a couple of seconds» y «a few seconds» (p. 20); lo menos que cabe en las dos |
| Dura | 2 s, y vuelve al 98 % | p. 20 |
| Empuje en el estallido | la mitad, en dos décimas | EPR de 1,6 a 1,3 (p. 20), contado por lo que pasa de uno |
| N1 en el estallido | del 103 al 95 %, en cinco décimas | p. 20 |
| Estalla recién entrada el ave | por encima de 0,3 | el «to idle» de la p. 20; el número, nuestro |
| Estalla después, si se recupera | por encima de 0,75 | 33.76 (c)(6)(i) |
| Donde se deja | 0,6 | 33.76 (c)(7)(iv) y «below the stall threshold» (G-EUUI, p. 4) |
| Al ralentí | 10 s | los de la p. 20 para que los instrumentos vuelvan |
| La palanca | 3 s atrás, 10 s adelante | «SLOWLY» (p. 19); los números, nuestros |
| Del golpe al primer estallido, y hasta tocar la palanca | 0,8 s y 14 s | nuestros |

Medido en la mesa, el JAZ 90 a fondo a 600 m, el motor izquierdo:

| | Empuje medio | Rumbo en 2 s sin pie, en Taguató | en Ruvichá |
|---|---|---|---|
| Los dos bien | 104 kN | 0° | 0° |
| Petardeando | 96 kN; el suyo da el 83 % | 3,7° a la izquierda | 6,0° |
| Su palanca al ralentí | 53 kN | 10,6° | 28,3° |
| Dejado en 0,6 | 84 kN | 4,1° | 11,1° |

Con el pie, el derrape no pasa de 2,4° en Taguató y 3,1° en Ruvichá, con seis
décimas de pedal y la palanca atrás. Y sube: 22 a 27 m/s petardeando.

**Neutral al bit sin el ejercicio**: `tocado` es `null` y cada cuenta nueva va
detrás de ese `null`. Comprobado huella a huella contra 809545a4 —posición,
velocidad, orientación, ritmos, velocidad del aire, empuje y gas del motor de
**cada paso**—: los ocho aviones, 60 finales con rachas hasta veinte segundos
después de tocar y 120 carreras con rachas y viento cruzado hasta setenta y cinco
segundos —la mitad abortadas y una de cada cuatro con un motor parado de verdad
subiendo—, en Tukã, Taguató y Ruvichá por turno y llamando a
`ponerMotorTocado(null)` en cada paso, como hace el juego. Las dieciséis huellas,
iguales. **El control**: un empujón de 1e-15 rad/s en un paso de una carrera
cambia las ocho de las carreras y ninguna de las finales.

### El banco

`verificar-emergencias.mjs ave`, con el JAZ 90 en Taguató y en calma
(`OGA_VIENTO` para otro). El piloto del banco sube recto con el pie y la nariz
hasta que se sabe cómo queda el motor, da el circuito y aterriza. A la velocidad
de verdad del ave a la llamada y en la final, y a cuatro por uno el circuito.
`OGA_MOTOR` elige el lado, `OGA_NO_AGUANTA=1` hace que vuelva a estallar, y
`OGA_FOTOS` deja las tarjetas y seis cuadros del lienzo en el segundo estallido.
Mira:

- que se presente, y que el ave entre subiendo, entre 80 y 160 m;
- el golpe, la tarjeta de qué motor y la frase del pie que toca;
- tres estallidos o más antes de la palanca, a más de tres segundos y medio uno
  de otro, con su fogonazo, y la aguja de ese motor cinco puntos por debajo de la
  otra; y que se cuente qué es;
- que la palanca no se toque hasta los catorce segundos, a 122 m o más y con menos
  de veinticinco grados de alabeo;
- esa y no la otra, en la tarjeta; callado con ella atrás, y el otro motor dando
  lo suyo;
- el pie del otro lado, en la subida y con la palanca atrás;
- si aguanta o si se para, contado;
- que no salga ningún mensaje ni alarma, y al pararlo, lo que se hizo y no «FAIL»;
- PAN PAN o MAYDAY con la torre contestando, la prioridad, los bomberos, la toma
  en la pista y el cierre que toca;
- y **nada del ejercicio tirado por la boca** (ADR 0033, enmienda H67).

### Comprobado

- **La primera tirada**, en Gran Canaria con el motor izquierdo y aguantando, con
  las voces sin grabar, **14 de 16**. El ave, a 93 m sobre el umbral —cien sobre la
  cota del campo, siete más abajo— y a 160 nudos; cinco estallidos, a los 1,0, 4,8, 8,8,
  12,8 y 16,8 s, con cinco fogonazos; las agujas se separaron 5,8 puntos y, con
  el pie, la guiñada no pasó de 2,7°; con la palanca atrás, ningún
  estallido y el otro al 100 %; aguantó a los 40,9 s; PAN PAN contestado
  (`torre.canario.panpan`), tres camiones; tocó a 458 m del umbral cayendo 1,1 m/s;
  cierre «vuelta» con `ejercicio.ave.bien`. Los dos rojos, del banco: el pie máximo
  contaba el del suelo, y los catorce segundos, medidos con el reloj del piloto
  del banco, salían trece. Y lo que se vio en las fotos: el banco subía a fondo
  con la nariz a veinte grados y sonaba la pérdida encima de la tarjeta. Desde
  entonces sube con nueve décimas y la nariz despacio.
- **La segunda**, con el derecho y sin aguantar (`OGA_NO_AGUANTA=1`), **16 de 16**:
  la palanca a los 14,0 s y 392 m, al ralentí a 468 m; al avanzarla vuelve a
  estallar a los 35,7 s y se para a los 37,7; el pie, −0,37 de media y 0,47 como
  mucho; MAYDAY contestado (`torre.canario.mayday`) y tres camiones; en la
  pantalla, «THR LEVER 2 · IDLE / FUEL CONTROL 2 · CUTOFF»; tocó a 418 m del umbral
  cayendo 1,7 m/s; cierre «vuelta» con `ejercicio.ave.bienParado`. **Nada tirado por
  la boca** en ninguna de las dos, aunque con las frases sin grabar eso dice poco.
- **Las tarjetas**, en las fotos de las dos tiradas: el motor con su fogonazo y la
  flecha, el pedal, la palanca atrás y la palanca adelante, y las agujas a 19 y
  100 con ella al ralentí. La ficha del hangar, dibujada aparte.
- **El fogonazo** se dibujaba y no se veía desde detrás: en los seis cuadros del
  lienzo de la segunda tirada no está. La tobera va por debajo del ala y acaba a
  2,9 m de su borde de salida, y la llama medía 2,55. Ahora mide seis radios y
  medio —5,5 m en el JAZ 90, 12 en el 110— y la toma lleva un resplandor mayor que
  la boca. Dibujado aparte con su profundidad, sin navegador, asoma por
  encima de la góndola y por detrás del ala; **en el juego, con el arreglo, no se
  ha visto todavía**: la tercera tirada se quedó en la cola del navegador.
- `tsc --noEmit -p .`, en verde antes de cada commit. **El vitest entero** se corrió dos
  veces: la primera, con todo menos la llamarada larga, 587 de 588 ficheros y
  11.740 pruebas en verde, con un rojo —la hoja de estilos declaraba dos veces la
  clase de la palanca—, arreglado; la segunda, con el código terminado, 588 de 588 ficheros
  y 11.741 pruebas en verde, con 32 saltadas y una por hacer. Dentro,
  `ave-en-el-motor.test.ts` —los estallidos espaciados, lo que le quitan, el umbral,
  la palanca y sus dos finales, hacia dónde tira y que lo sujeta el pie del otro
  lado, que se calla con su palanca atrás y el otro sigue, el modelo de siempre al
  quitarla, y la llamarada en el motor de su lado— y las nuevas de
  `practica.test.ts` y `boca.test.ts`.

### Lo que queda

- **Las diez frases, por grabar**, y volver a volar el banco con ellas: entonces se
  ve si la boca tira alguna entre el golpe, los estallidos, la palanca y la
  llamada.
- **La palanca, en la mano de quien vuela.** El juego lleva un gas para todos los
  motores; el día que haya una palanca por motor, la que se lleva atrás es suya y
  la compañera confirma cuál.
- **El JAZ 110**, sin volar en el banco: la misma cuenta, en la mesa.
- **Con viento** y en Ruvichá, sin volar en el banco.
- **La luz ámbar de MOTOR** se enciende al parar el motor, con las dos líneas de lo
  hecho, como en todo motor parado de este juego: en el E170 el mensaje de un motor
  parado a propósito es otro, y sin su manual no se ha puesto.
- **La EGT**, que es lo que más se mueve en un petardeo (5 °C por segundo, p. 20):
  los cuadros del juego no la llevan.
- **El olor**, que la guía nombra (p. 23), no tiene canal aquí ni falta que hace.

### Las frases

Diez, de la instructora y en calma, en `es-PY` y en `en`; el guaraní no se toca.
Van en `LOS_EJERCICIOS` de `sin-instructora.ts` y en `DEL_AVE`, al final de
`frases-para-grabar.mjs`. Las de los pasos valen hasta el siguiente
(`valeHastaElPasoSiguiente`), menos las dos del golpe, y van en fila
(`FrasesEnFila`). «Avisamos a la torre» va en la frase del motor, como en la H70
y la H74: un suceso, una voz. **Sin grabar**: hasta entonces se ven en la tarjeta
y la voz se calla, y el banco no puede ver si la boca las tira.

- `ejercicio.ave.antes`
- `ejercicio.ave.izquierdo` y `ejercicio.ave.derecho`
- `ejercicio.ave.petardeo`
- `ejercicio.ave.palanca`, `ejercicio.ave.adelante`, `ejercicio.ave.aguanta` y
  `ejercicio.ave.noAguanta`
- `ejercicio.ave.bien` y `ejercicio.ave.bienParado`

Y en el hangar, que solo se lee: `hangar.ejercicio.ave`.

## Enmienda H84 (24-11-2026): el reventón al tomar

### El caso

Del catálogo del #90 faltaba, del aterrizaje, esto: «**Reventón al tomar.**
Mantener el eje, frenar con cabeza, no corregir de más». La mitad ya estaba en la
H74 —el modelo de la rueda rota, el golpe, sus tarjetas y la toma con ella rota—;
faltaba que reviente al tocar, y lo que se hace entonces.

### De dónde sale el procedimiento

Leídas, no de memoria:

- **Boeing, *737 NG Flight Crew Training Manual*** (FCT 737 NG (TM), revisión 20,
  30-6-2021; una copia en línea, que no es de Boeing), «Landing on a Flat Tire»,
  **p. 8.40**:
  - «Boeing airplanes are designed so that the landing gear and remaining tire(s)
    have adequate strength to accommodate a flat nose gear tire or main gear
    tire». Y, sabiéndolo antes de aterrizar: aproximación y recogida normales, «use
    the center of the runway» y «differential braking as needed for directional
    control».
  - «Flat main gear tire(s) cause a general loss of braking effectiveness and a
    **yawing moment toward the flat tire with light or no braking and a yawing
    moment away from the flat tire if the brakes are applied harder**. **Maximum
    use of reverse thrust is recommended. Do not use autobrakes**.»
  - «With a single tire failure, towing is not necessary unless unusual vibration
    is noticed or other failures have occurred», y la nota: «Extended taxi
    distances or fast taxi speeds can cause significant increases in temperatures
    on the remaining tires». En la p. 8.39, que haya quien mire «the wheels, tires,
    and brakes before continued taxi».
  - Y en «Reverse Thrust and Crosswind», **p. 6.45**, de recuperar el eje rodando:
    «Use rudder pedal steering and differential braking as required, **to prevent
    over correcting past the runway centerline**» y «symmetrical reverse thrust».
  - Es de quien ya sabe antes de tomar que la lleva desinflada, o de una pista
    resbaladiza; aquí revienta al tocar, y lo que se aplica es lo de la rodadura.
- **FAA y la industria, *Takeoff Safety Training Aid***, 2.3.5.3.4, **p. 2.26**
  —la del despegue, la misma copia de la H74—: «Failed tires do not in themselves
  usually create directional control problems»; que el golpe puede oírse o no, y
  no notarse nada, tirar a un lado o temblar el avión entero; y que al parar hay
  que estar preparado para «the possible loss of hydraulic systems which may cause
  speedbrake or thrust reverser problems».
- **AAIB, *Bulletin* 12/2008, VP-CRC** (Global Express, Luton, 29-1-2008), un
  reventón al tomar con el avión parado en la pista: «Shortly after a normal
  touchdown […] a rumbling noise which they identified as a burst tyre»; «applied
  normal braking»; a los quince segundos, dos sistemas hidráulicos sin presión; y
  «brought the aircraft to a stop on the runway using normal brakes and, as fire
  vehicles approached, shut down both engines» (p. 21). Los daños los hizo **la goma
  suelta al girar la rueda**: «flailing of a substantial section of both tread and
  carcass when the wheel then began to rotate», que rompió tuberías hidráulicas y
  el mando de los flaps (p. 22).
- **AAIB, *Bulletin* 4/2006, EI-WJN** (HS125, Prestwick, 20-9-2005), otro, con las
  dos ruedas de la pata izquierda: «as the aircraft touched down […] it pulled
  sharply to the left and […] the application of right rudder pedal and right brake
  were needed»; lo avisaron a la torre y **dejaron la pista rodando**, por la última
  salida (p. 35). La torre cerró la pista por los restos, y la llanta dañada dice que
  la rueda fue girando al rodar y al salir (p. 36).
- **14 CFR 25.735 (c)(2)**: quien vuela puede armar y desarmar el autofreno y
  mandar sobre él con el pie; **(e)(2)**: el antideslizante manda siempre sobre el
  autofreno. **25.733 (c)**, la de la H74: el neumático de al lado, para 1,07 veces
  su carga.

**La reversa, con cabeza, es esto**: entera, la misma en los dos motores, porque no
depende de las ruedas; y sin contar con que salga, que una goma suelta puede
haberse llevado un sistema hidráulico. Si el eje se va, se suelta el freno y se
lleva al ralentí (p. 6.45): eso es de pista resbaladiza y no se enseña aquí.

**Lo que no coincide, y cuál gana.** El manual de Boeing deja rodar con una sola
rueda desinflada si no vibra; el EI-WJN rodó y acabó bien; el VP-CRC paró en la
pista. El ejercicio enseña a parar: la de aquí vibra —el traqueteo va al doble—,
nadie la ha mirado todavía, y lo que se ve de rodar con ella es la goma golpeando.
Quien la deja rodando **no lo hace mal**: se le cuenta por qué es mejor parar.

**Lo que no se ha leído**: el manual del E170, que no está en línea —ni el AOM ni el
QRH—, y un informe de un E-Jet que revienta al tomar, que no se ha encontrado. El de
9V-MBF (737-8, TSIB de Singapur) se ha buscado y su copia no se deja bajar.

### El avión, el peldaño y el momento

- **El JAZ 90**, por lo mismo que en la H74: dos ruedas por pata, que es lo que
  tienen los aviones de las fuentes, y su tren medido (`ruedasPrincipales`).
- **Desde Taguató**: el #90 no lo nombra en un peldaño; es la pareja del de la
  carrera, y abajo solo deja el motor parado en vuelo. En Ruvichá, el catálogo
  entero.
- **Al tocar**, seis décimas después de que las ruedas se queden en la pista y
  habiendo dado la vuelta (`Momento` `en: "toma"`, `REVIENTA_TRAS_TOCAR`): el golpe
  llega detrás del de la toma, y no encima. Un bote no lo suelta, ni tocar fuera.

### El ejercicio

`reventon-al-tomar`, en `flight/ejercicios.ts`: la lección de dar una vuelta y la
misma avería de la H74, `que: "neumatico"`.

1. **La instructora lo presenta** antes de soltar frenos, con el dibujo.
2. **El golpe** de la H74, sin alarma, y el traqueteo al doble. **Sin leer**: la
   rueda aplastada y la flecha de hacia dónde tira; al segundo y medio, el pedal del
   otro lado. «Se reventó una rueda de la izquierda: pie derecho, suavecito».
3. **A los cuatro segundos y medio, el freno** (`ANTES_DEL_FRENO`; **sin fuente**, lo
   que dura la frase del pie): la tarjeta nueva de los dos pedales pisados igual y
   poco, con la escalera de dos peldaños de cuatro y la tecla; y «frená suave y
   parejo, y sacá toda la reversa, que no es de las ruedas».
4. **A treinta nudos, parar ahí** (`CASI_PARADO`): la tarjeta de la pista con la mano,
   y «pará acá, en la pista. No hay apuro por salir».
5. **Parado en la pista**, los bomberos de ese aeródromo junto al avión, se lee en la
   tira «burst tire, stopped on the runway» —sin PAN PAN ni 7700: el avión está
   parado en el suelo— y se celebra (`ejercicio.rueda.bien`).
6. **Si se deja la pista rodando** —un segundo fuera—, la tarjeta de la goma que
   golpea por debajo del ala, el traqueteo que sigue, y se cuenta una vez por qué es
   mejor parar. Al pararse, los bomberos y el cierre, también hecho: «vuelta», con
   `ejercicio.rueda.bienFuera`.
7. **Si se va al aire** con la rueda rota, es la vuelta de la H74: el tren fuera, PAN
   PAN, los bomberos esperando y la toma.

**El juego no pide lo contrario.** Desde que se tocaba, pedía «frená» para la salida,
«salí de la pista, que viene otro», «salí por la siguiente» y la torre «expedite
vacating». Con este ejercicio, y las ruedas en el suelo (`paraEnLaPista`), se calla la
fase del plan y lo suyo, como en la H26m (`SOLO_LA_FASE`), y no se pide nada de eso;
sigue así después del cierre, que con la rueda rota no se rueda. Y **el autofreno no
se arma** en la lista de antes de aterrizar (`sinAutofreno`): «do not use autobrakes».
Quien lo arme lo lleva, y se suelta con el pie, como siempre.

### El modelo

**No se ha tocado**: es el de la H74, y sin el ejercicio el de siempre. Lo que aquella
dejó sin fuente queda a medias resuelto: el roce sigue siendo un número sin fuente,
pero **hacia dónde tira** —a la reventada con poco freno o ninguno, y a la otra
frenando fuerte— es lo que dice la p. 8.40.

Medido en la mesa, en llano, desde 125 nudos y con los aerofrenos fuera:

| | con las cuatro | con una reventada |
|---|---|---|
| Freno a 0,4 y reversa, desde el principio | 658 m | 656 m, casi sin pie |
| Freno a 0,4 desde los 4,5 s, y reversa | 769 m | 738 m; pie hasta 0,15, a 1,7 m del eje |
| Freno a 0,4, sin reversa | 893 m | 890 m |
| A fondo y con reversa | 359 m | 403 m; pie hasta 0,23, a 2,7 m |
| A fondo, sin reversa | 414 m | 477 m; lo mismo |
| Sin pie ni freno, seis segundos | en el eje | a 6,5 m y yéndose |
| Sin pie, freno a 0,4 desde los 4,5 s | en el eje | a 17,9 m del eje |
| Sin pie, freno a 0,4 desde el principio | en el eje | a 0,7 m |

A cuatro décimas el roce y el freno que falta se compensan casi del todo: **el freno
suave es también lo que más recto lo lleva**. Y corregir de más se ve en cuanto el pie
llega tarde: con ocho décimas de retraso, el pie suave lo tiene a 2,1 m del eje y el
pie a fondo lo lleva a 7,8; con un segundo, a 2,3 y a 11,1.

### El banco

`verificar-emergencias.mjs toma`, con el JAZ 90 en Taguató y en calma. Da la vuelta a
cuatro por uno; la final y la rodadura, a la velocidad de verdad. Desde el golpe no
toca nada ocho décimas; sostiene el eje con el pie, saca la reversa y a los cuatro
segundos y medio frena a cuatro décimas hasta parar. `OGA_DEJA_LA_PISTA=1` deja la
pista por su raya; `OGA_MOTOR`, `OGA_VIENTO` y `OGA_FOTOS`, como en `reventon`. Mira:

- que se presente, y que reviente al poco de tocar y no en la carrera;
- el golpe, su tarjeta y la frase del lado que toca;
- hacia dónde se va sin tocar nada, el pie del otro lado sin pasar de seis décimas, y el
  eje;
- las tarjetas en su orden —rueda, pie, freno suave, parar en la pista— y lo dicho, sin
  autofreno armado;
- que **nadie pida dejar la pista**, ni con voz ni con tarjeta;
- que pare en la pista y por el eje, los bomberos junto al avión y nada declarado;
- sin percance, el cierre con `ejercicio.rueda.bien` (o `bienFuera`), y **nada del
  ejercicio tirado por la boca** (ADR 0033, enmienda H67).

### Comprobado

- `tsc --noEmit -p .`, en verde antes de cada commit, y **el vitest entero**, con el
  código terminado: 594 de 594 ficheros y 11.954 pruebas en verde, 32 saltadas y una
  por hacer. Dentro, las nuevas de `practica.test.ts` —cuándo revienta y cuándo no, el
  orden, quien deja la pista, quien se va al aire—, de `neumatico-reventado.test.ts`
  —el freno suave y el de a fondo, la reversa que no es de las ruedas, el pie de más—,
  de `lo-que-calla-el-ejercicio.test.ts` y de `boca.test.ts`.
- **Las tres tarjetas nuevas**, dibujadas aparte y miradas, sin navegador.
- **Volado en el banco, en calma, con la rueda izquierda: 12 de 12.** Gran Canaria,
  el JAZ 90 en Taguató. Reventó a 124 nudos y a 37 m de tocar; se fue 0,48° a la
  izquierda en ocho décimas sin tocar nada; el pie a la derecha, hasta 0,10, y nunca
  más lejos del eje que donde tocó (4,3 m). Las tarjetas, rueda → pie → freno suave →
  parar en la pista → bomberos; «autofreno off»; nadie pidió dejar la pista. Tocó a
  418 m del umbral y paró a 1.297 de 3.104, a un metro del eje, con tres camiones al
  lado; cierre «vuelta» con `ejercicio.rueda.bien`, y nada tirado por la boca.
- **Miradas las fotos de esa tirada**, dos cosas de más, arregladas: la megafonía dio
  la bienvenida a Gran Canaria a treinta nudos, encima del «pará acá» —callada con la
  fase—, y las gafas de sol, si se ganan en esa toma, se celebraban rodando: ahora,
  detrás del cierre. Después de eso, `tsc` en verde y vitest en parte: 564 de 564 en
  `practica`, `lo-que-calla-el-ejercicio`, `neumatico-reventado`, `boca`, `dibujos`,
  `hangar` y `torre-de-cada-vuelo`, y 424 de 424 en los nueve ficheros que leen
  `game.ts`.
- **Sin volar todavía**: la segunda tirada, con la rueda derecha, dejando la pista
  (`OGA_DEJA_LA_PISTA=1`) y con la megafonía ya callada, se quedó en la cola del
  navegador al acabarse el tiempo del encargo. Dejar la pista está probado en
  `practica.test.ts`; su tarjeta, mirada dibujada y no en el juego.
### Lo que queda

- **Las ocho frases, por grabar**, y volver a volar el banco con ellas: sin grabar se
  callan en la puerta, y el banco no puede ver si la boca tira alguna entre el golpe,
  el freno y el «pará acá», que van en veinte segundos.
- **La raya verde sigue dibujada** hasta la salida mientras se para en la pista: nadie
  la nombra, pero se ve.
- **El manual del E170**, sin leer, como en la H74.
- **El neumático en el dibujo** y **los trozos que saltan**, lo mismo que en la H74.
- **La hidráulica que se pierde** por la goma —lo del VP-CRC— no está: es una avería
  cada vez.
- **Quien se va al aire** con la rueda rota, con prueba y sin volar en el banco.

### Las frases

Ocho, de la instructora y en calma, en `es-PY` y en `en`; el guaraní no se toca. Van en
`LOS_EJERCICIOS` de `sin-instructora.ts` y en `DE_LA_RUEDA`, al final de
`frases-para-grabar.mjs`. Las de los pasos valen hasta el siguiente
(`valeHastaElPasoSiguiente`), menos las dos del golpe, y van en fila (`FrasesEnFila`,
la misma del reventón). **Sin grabar.**

- `ejercicio.reventon-al-tomar.antes`
- `ejercicio.rueda.izquierda` y `ejercicio.rueda.derecha`
- `ejercicio.rueda.freno`
- `ejercicio.rueda.para`
- `ejercicio.rueda.rodando`
- `ejercicio.rueda.bien` y `ejercicio.rueda.bienFuera`

Y en el hangar, que solo se lee: `hangar.ejercicio.reventon-al-tomar`.
