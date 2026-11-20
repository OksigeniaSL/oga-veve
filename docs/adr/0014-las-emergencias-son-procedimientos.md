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
