# ADR 0026 — El modelo de vuelo del helicóptero, sobre el Super Puma

**Fecha**: 2026-11-11 · **Estado**: aceptada; hechos los cuatro pasos, y desde el 12-11 en el hangar de Tenerife Norte como el JAZ 70 Kirikiri'i · **Amplía**: [ADR 0002](0002-modelo-de-vuelo-propio.md)

## Contexto

Jazlyn pidió un helicóptero en el juego, «grande». El modelo de vuelo de los aviones (`flight/fdm.ts`, ADR 0002) no
vale: un avión se sostiene porque avanza y su ala va fija; un helicóptero se sostiene porque gira su rotor, y lo que
mueven los mandos no son timones sino el paso de las palas. Hace falta un modelo propio, y el issue #109 ya decía por
dónde empezar.

El trabajo va en cuatro pasos, y cada uno se mira antes de lanzar el siguiente:

1. **El modelo de vuelo y este documento.** Hecho.
2. El helicóptero en Blender: por fuera, con el rotor girando, y la cabina con sus botones. **Hecho**: por fuera con
   el rotor de Gaudí (08a31e23, 4d4c2ff4) y la cabina por dentro, de pantallas, la familia D (b8cc1ba1, 4c16f8b2).
3. Los mandos —teclado, dedo y mando— y la pantalla: el par y las vueltas del rotor en vez de lo de un reactor; qué
   estabilización lleva cada peldaño; arrancar y rodar. **Hecho**: la pantalla de helicóptero en los cuatro peldaños
   y en el teléfono (6706ff99), el sonido (4616507d), y arrancar, parar y rodar (8c4a2764, 7a8cc0e8).
4. Una misión tranquila, con las frases de la instructora grabadas. **Hecha**: la de Teno
   (`?avion=super-puma&mision=teno`, y en el hangar), de Los Rodeos a Punta de Teno y al puerto de Garachico, como la
   evacuación de 2016 (f0951c83); ver `docs/misiones/super-puma-en-tenerife.md`. La gente que sube y baja
   (ddf83e12) y las dieciocho frases grabadas (57ea38fd).

## Qué helicóptero

**El Super Puma**, el AS 332 C1/L1 que desde 2016 se vende como H215. Es grande de verdad —8.600 kg al despegue,
un rotor de 15,60 m— y vuela en Canarias: el 802 Escuadrón del Ejército del Aire lo lleva para el rescate desde Gando,
y **el batallón de helicópteros del Ejército de Tierra (BHELMA VI) vuela tres AS332B1 en Los Rodeos**, junto a
Tenerife Norte, con la UME en el mismo acuartelamiento. El B1 es la versión militar del de la ficha, con los mismos
motores y el mismo rotor. En el juego vive en Los Rodeos, la casa del juego (Enrique, 11-11: «Hay una división de
helicópteros justo al lado de GCXO»), con la pintura de la flota y sus marcas de rescate. En Paraguay no hay uno tan
grande; lo que vuela allí es el Bell UH-1H de la Fuerza Aérea, que puede venir después sobre el mismo modelo con su
propia ficha.

## Decisión

**El modelo de mínima complejidad de la NASA** (Heffley y Mnich, CR-177476, 1988, de dominio público), en
`flight/helicoptero.ts`, con la ficha del Super Puma aparte en `flight/super-puma.ts`. Es deliberadamente mínimo y
aun así da el estacionario, la respuesta a los mandos y la maniobra moderada, y trae un procedimiento para ajustarlo a
un helicóptero concreto con lo que publica su manual, sin datos internos de nadie.

### Lo que lleva

- **El empuje del rotor**, por el elemento de pala, con el aire que baja por el disco sacado de la cantidad de
  movimiento; los dos se resuelven juntos por Newton-Raphson en cada paso. De ahí salen solos el efecto de la
  velocidad —a ochenta nudos se sostiene con la mitad de potencia que parado—, el de subir y el de bajar.
- **El disco sigue al cíclico** con un retraso de unas siete centésimas, se echa hacia atrás con la velocidad y se queda
  atrás cuando gira el fuselaje, que es de donde le viene su amortiguación.
- **El par y el rotor de cola.** Lo que el eje da al rotor lo devuelve el fuselaje girando al revés. El del Super Puma
  gira en horario visto desde arriba, como los de Aérospatiale y la mayoría de los europeos: al dar potencia el morro
  se va a la izquierda y se pisa el pedal derecho. Y cuelga en estacionario con el lado derecho un poco bajo, porque el
  rotor de cola empuja a la izquierda y el disco se inclina para pararlo.
- **El efecto suelo**, con la fórmula de Cheeseman y Bennett, que se apaga con la velocidad.
- **Los motores con su regulador**, y el rotor como un volante: si se pide más potencia de la que hay, las vueltas
  caen y el empuje con ellas; sin motor, el aire que sube por el disco lo hace girar. Eso es la autorrotación, y en
  ella el par cambia de lado: se pisa el otro pedal.
- **El fuselaje** con su resistencia de frente, de lado y por debajo —donde le da la estela del rotor en
  estacionario—, el estabilizador horizontal y la deriva.
- **Las ruedas**, con muelle y amortiguador, y agarradas a su punto del suelo hasta que la fuerza pasa de lo que
  agarran; hacia delante solo frenadas, que sin freno ruedan.

### La estabilización, por niveles

Un helicóptero sin aumentación es inestable en estacionario: con un empujón crece una oscilación que en el modelo pasa
de diez grados en unos diez segundos, como en uno de verdad. Por eso la estabilización **no es una trampa**: el Super
Puma lleva piloto automático de verdad —la ficha de la EASA permite volarlo con un solo piloto si funciona un canal de
cada eje (TCDS R.002, III.16)—. Va por capas, de menos a más (`Estabilizacion`):

| Nivel | Qué hace | De dónde sale |
| --- | --- | --- |
| `ninguna` | El helicóptero tal cual | — |
| `amortiguada` | Frena los giros, con autoridad limitada | El canal de amortiguación de cualquier piloto automático |
| `actitud` | El cíclico mueve la actitud y al soltarlo se queda; los pies sostienen el rumbo parado y el vuelo coordinado deprisa | El modo básico del piloto automático del Super Puma |
| `estacionario` | Además, el cíclico pide velocidad sobre el suelo —hasta los 136 kt del crucero; deprisa, a los lados inclina para virar— y al soltarlo se para y se queda, sople lo que sople; y el colectivo pide subir o bajar, con las vueltas guardadas | El modo de estacionario y el de mantener la altura de un sistema de mandos moderno |

**Qué nivel lleva cada peldaño, propuesto para juzgarlo volando** (`estabilizacionDelPeldano` en
`flight/fdm-helicoptero.ts`):

| Peldaño | Nivel | Qué se nota |
| --- | --- | --- |
| Guyrami | `estacionario` | Soltar el cíclico es pararse y quedarse quieto; empujarlo es pedir velocidad |
| Tukã | `estacionario` | Igual: es el peldaño en el que todavía se aprende qué hace cada mano |
| Taguato | `actitud` | El cíclico mueve el morro y al soltarlo se queda donde estaba; la deriva ya es de quien vuela |
| Taguato Ruvicha | `actitud` | Igual, como el modo básico del piloto automático del Super Puma |

**El colectivo, en la de estacionario, pide subir o bajar** (`SUBE_EN_ESTACIONARIO`). Con la palanca de verdad, la
tecla la llevaba a tope en dos segundos: el rotor pedía más potencia de la que hay, las vueltas caían al 77 %, el rotor
de cola —engranado— perdía la fuerza justo cuando más par había, y el helicóptero giraba sobre sí mismo a cien grados
por segundo (Enrique, probándolo: «va dando vueltas en el aire como un loco»). Es lo que le pasa de verdad a quien tira
del colectivo de golpe, y en los peldaños de abajo no tiene que poder pasar. Así que ahí:

- a media palanca se queda a la altura que tiene; arriba sube y abajo baja, hasta 4 m/s, y cerca del suelo la bajada se
  frena sola para posarse sin golpe;
- el paso lo pone la estabilización, suave, sin dejar caer las vueltas del 98,5 %, y el pie se adelanta al par cuando
  cambia el colectivo;
- **con la tecla, la palanca tiene muelle**: soltada, vuelve sola a media palanca (`Input.ponerMuelleDelColectivo`).
  Mantener X sube, mantener Z baja, soltar se queda: lo mismo que el cíclico en ese nivel. La palanca de la pantalla y
  la del mando se quedan donde se dejan.

En la de actitud la palanca es la de verdad, pero la tecla la mueve a un ritmo de colectivo (`RITMO_DEL_COLECTIVO`, de
abajo a tope en unos seis segundos) y no al del gas de un avión.

Es la misma idea que la escalera de los avisos (`flight/escalera.ts`): lo que crece con el peldaño es lo que se le deja
a quien vuela, no lo que hace el helicóptero. Ningún peldaño baja a `amortiguada` ni a `ninguna`: el Super Puma de
verdad no se vuela sin su automático, y aquí no se enseña lo que allí no se hace. Cambiar de peldaño en el aire cambia
el nivel sin soltar nada (`ponerEstabilizacion` se queda con la actitud y el rumbo de ese momento).

## En el juego, escondido, y después en el hangar

**Desde el 12-11 está en la flota y en el hangar** (Enrique: «Dale por ahí»): es el **JAZ 70 Kirikiri'i**, el
halconcito colorado que se queda quieto en el aire, con su silueta propia, entre el JAZ 60 y el JAZ 90 (ver
`flight/flota.ts`). Se elige en «¿Con qué volás?» **solo en Tenerife Norte**, donde tiene su helipuerto; ofrece su
vuelo libre y la misión de Teno, y la tecla de cambiar de aparato lo incluye allí. Sigue fuera de `AIRCRAFT`, que es lo
que recorren las lecciones, los ejercicios y las cuentas de pista: la lista de todo lo que se vuela es `AERONAVES`
(`flight/aeronaves.ts`), con la regla de dónde se ofrece cada uno. Lo que sigue es cómo entró, escondido, y sigue
valiendo con la dirección.

Para probarlo en la web y afinar los mandos antes de que llegue el modelo en 3D, el helicóptero se volaba con
**`?avion=super-puma`** en la dirección, y solo así. No estaba en `AIRCRAFT`: no salía en el hangar, ni en el cambio de
avión, ni en ninguna lección, y no se guardaba en el perfil. Entra directo en Tenerife Norte, **posado en el helipuerto
del Ejército** junto a Los Rodeos (GCXM, puesto a mano con los datos del AIP, que OpenStreetMap no lo trae: ver
`helipuertosAMano`), cara al viento, con el rotor en sus vueltas y el colectivo abajo. Se vuela suelto: la vuelta al campo, sin misión, sin destino y sin vecinos. Con `&mision=teno`, la suya, la única que se le ofrece.

- **El adaptador** (`flight/fdm-helicoptero.ts`) pone el modelo detrás del contrato `FlightModel` de los aviones. El
  gas es el colectivo (no vuelve solo, como la palanca de verdad, que tiene fricción); la profundidad, el cíclico
  adelante y atrás, con el mismo sentido —tirar es morro arriba—; los alerones, el cíclico a los lados; el timón, los
  pedales; el motor, los motores, y los frenos, los de las ruedas. Lo que el contrato pregunta y solo tiene sentido en
  un avión se contesta con lo que significa en un helicóptero, y cada método dice por qué: el gas «para una velocidad»
  es el colectivo del estacionario, la velocidad máxima es la VNE de la ficha, y los dos límites de la toma son los de
  la norma de certificación del tren (CS 29.725 y 29.727: unos 2,0 m/s de caída sin más y 2,4 de reserva). Una toma
  por encima de eso rompe el helicóptero, como en los aviones lo dice su modelo.
- **La ficha del juego** (`flight/helicoptero-en-el-juego.ts`) es lo que el juego pregunta a cualquier aeronave —el
  peso, el depósito, el sonido, las velocidades con que se juzga— contestado como un helicóptero, con la ficha del
  rotor colgada en `AircraftConfig.helicoptero`. El combustible se cuenta con el empuje, así que la potencia de los
  motores se pasa a un empuje equivalente con el consumo de un turboeje (unos 0,36 kg/kWh): en estacionario gasta del
  orden de 600 kg a la hora.
- **Lo de avión que sobra se aparta en su sitio**, mirando `aircraft.helicoptero`: sin plan de vuelo (ni fases, ni
  calles, ni lámpara de la torre, ni carrera con sus cantos), sin los juicios de la toma (en la pista o fuera, con
  tren), sin tope ni ayuda de rodaje, sin la mano del teclado, sin la nivelada ni el piloto automático del avión —su
  automático es la estabilización—, sin reversa y sin compensador; y sin lo que acompaña la vuelta a una pista: el
  circuito dibujado, la tarjeta del PAPI, los consejos de la recogida y la banda de velocidad lenta o rápida, que es
  de un ala que entra en pérdida. El choque contra un edificio y el golpe al tocar
  siguen: eso le pasa igual a un helicóptero. Posado, lleva el freno de estacionamiento puesto, que es como se despega
  en uno de verdad; rodar llega con el resto del paso 3.
- **En pantalla**, dos tarjetas con sus rótulos de cabina: **NR**, las vueltas del rotor, y **TQ**, el par de los
  motores, en tanto por ciento. Las agujas de los motores del cuadro marcan también el par, rotuladas TQ, y la tarjeta
  del gas se llama **COLL**: es el colectivo, no un gas. Velocidad, altura y velocidad vertical, las del cuadro de
  siempre. Ni flaps, ni tren, ni aerofrenos, ni reversa, ni piloto automático: no los lleva.
- **El modelo de verdad** (`modelos/jaz-super-puma.py`, el paso 2) se carga como los de los aviones, y la silueta de
  cajas se queda solo mientras llega. **Su rotor es el de Gaudí** (`world/rotor-del-helicoptero.ts`, del kit de arte
  de hq): parado, las palas caen sobre su bisagra; girando, se enderezan, suben al cono con el empuje y se funden en un
  disco translúcido con el aro de las puntas en terracota y cuatro sombras de pala que giran despacio. Nunca las palas
  de verdad a toda velocidad, que a sesenta imágenes por segundo harían la rueda de carro: mientras se ven, el eje no
  gira a más de 0,6 vueltas por segundo, y según se funden se para y giran las sombras. El disco toma el color de las
  palas y lleva luz, así que de noche se apaga con el helicóptero. Las luces de posición se buscan con los rotores
  quitados, que si no salían en las puntas de las palas.
- **La silueta provisional** (`world/silueta-de-helicoptero.ts`), hecha con piezas por código, es el respaldo mientras
  carga el modelo. Mide lo de la ficha —rotor de 15,60 m y cuatro palas, el de cola de 3,05 m y cinco, a 9,4 m
  detrás del mástil y a la derecha de la deriva— y **gira a las vueltas del modelo**, el principal en horario visto
  desde arriba: si caen las vueltas, se ve. La vista de cabina funciona sin cabina por dentro: los ojos van en el
  asiento de la derecha y se ve el mundo por donde iría el cristal.
- **El banco** `scripts/ver-helicoptero.mjs` lo vuela entero en el juego de verdad: posado, despega con el colectivo,
  estacionario, adelante con el cíclico, vuelta al helipuerto y toma, y mira la pantalla.

## Los números, y de dónde salen

Lo que publica la ficha se pone tal cual; lo que no publica nadie se supone con un valor normal para un helicóptero de
su tamaño; y unas pocas cosas se **ajustan** para que el modelo dé lo que dice la ficha, que es el procedimiento del
informe de la NASA. Cada número dice cuál es en `super-puma.ts`.

| Qué | Cuánto | De dónde |
| --- | --- | --- |
| Rotor principal | 15,60 m, 4 palas, 265 rpm | EASA, TCDS R.002 n.º 18, III.4.2 y III.9 |
| Rotor de cola | 3,05 m, 5 palas | TCDS, III.4.3 |
| Vueltas con motor | de 245 a 275 rpm | TCDS, III.9 |
| Vueltas sin motor | de 220 a 290 rpm por debajo de 100 kt | TCDS, III.9 |
| Peso máximo | 8.600 kg | TCDS, III.12 |
| Vacío | 4.711 kg: el máximo menos 3.889 kg de carga útil | Airbus, página técnica del H215 |
| Motores | 2 Makila 1A1, 1.357 kW al despegue cada uno | TCDS, III.5.1; Airbus |
| Del rotor al de cola | 9,4 m: la «D-value» de 18,70 m menos un radio de cada uno | Airbus |
| Techos en estacionario | 2.300 m fuera del efecto suelo; 3.250 m dentro | Airbus, sin decir a qué peso; se toman al máximo |
| Crucero recomendado | 136 kt | Airbus |
| Ruedas, altura del rotor y del rotor de cola | De rueda a rueda 5,2 m, vía de 3,1 m, el plano de las palas a 4,30 m del suelo | La muestra de Gaudí: el plano de tres vistas del AS 332 de fuselaje corto, a la escala de la ficha |
| Cuerda de la pala, torsión, perfil, inercias, centro de gravedad | Supuestos | Valores normales; las inercias, del orden del UH-60 del informe de la NASA |
| Sentido de giro | Horario visto desde arriba | aerospaceweb.org; tripulaciones del Puma |

**Lo que se ajusta, y con qué:**

- **Cómo cae la potencia con la altura**: casi como la densidad (exponente 1,07), para que el techo fuera del efecto
  suelo al peso máximo caiga en los 2.300 m de Airbus. Sale en **2.297 m**.
- **El paso mínimo del colectivo**: con la palanca abajo del todo y a 70 kt sin motor, las vueltas se quedan en 268 rpm
  al peso máximo y en 232 con 6.500 kg, dentro de las de la ficha sin motor a los dos pesos. Con un paso mínimo de 4°
  se embalaban a 390.

**Lo que no se ajusta, y se mira:**

- **El techo dentro del efecto suelo**: sale en **3.296 m** con las ruedas a un metro del suelo —el plano de las palas a
  5,3 m, con la altura de la muestra de Gaudí—, frente a los 3.250 de Airbus. Es la prueba de que el efecto suelo y la potencia
  están bien a la vez.
- **El estacionario a nivel del mar** pide 1.993 kW, el 73 % de la potencia de despegue, y volado pide lo mismo que la
  cuenta sin volarlo.
- **La curva de la potencia**, en vuelo nivelado al peso máximo: 1.306 kW a 40 kt, el mínimo de 1.019 kW hacia 80 kt,
  y 1.440 kW a 136 kt, con el morro 2,7° abajo. Con la autonomía y el alcance de Airbus —4 h 25 min y 866 km con el
  mismo combustible—, si el alcance se vuela a 136 kt se gasta allí un 29 % más que en el mínimo; el modelo da un 41 %.
  Es la placa plana del fuselaje, supuesta en 2,8 m²: si aparece una cifra pública del par en crucero, es con lo que
  se afina.
- **La autorrotación** baja a 11,6 m/s al peso máximo, unos 2.300 pies por minuto, a 70 kt; y con el pedal izquierdo
  pisado a media carrera, porque el par cambia de lado.

## Arrancar, parar y rodar

- **Arrancar lleva su rato.** Un motor parado no da nada mientras el arrancador lo mueve y se enciende, y después la
  potencia que puede dar sube hasta la de vuelo: medio minuto en total, supuesto. El regulador pide la que haga falta
  para las vueltas nominales, así que el rotor coge vueltas tan deprisa como deja esa potencia contra su inercia: a los
  27 s de empezar está en sus 265 rpm.
- **El freno del rotor** lo para desde el 40 % de sus vueltas en unos quince segundos, y por encima no se pone, que se
  quemaría. Puesto, los motores arrancan y se quedan al ralentí sin mover el rotor. Las dos cifras son supuestas.
- **Al parar los motores, el rotor sigue girando solo** minutos, frenado por el aire, como en uno de verdad, si no se le
  pone el freno.
- **Se rueda** con un poco de colectivo y el cíclico adelante, como se rueda un helicóptero con ruedas; la de morro se
  orienta sola y **se gira con los pedales**, que mueven el rotor de cola. Las principales agarran de lado y frenan.
- **Despegar sin corregir con el cíclico**: el helicóptero que se aligera se inclina sobre sus ruedas —el mástil cae
  hacia delante y el rotor de cola empuja a un lado—, sale torcido y, sin nadie que lo sostenga, en el aire se va. Con
  las medidas de la muestra de Gaudí se inclina veinte grados de morro antes de despegar; con las supuestas de antes,
  más estrechas, volcaba de lado, que es el vuelco dinámico. Con la estabilización sube derecho, porque posada sigue
  sosteniendo la actitud. Lo que no hace posada es acumular: la actitud que sostiene sigue despacio la que tiene sobre
  las ruedas, y en el modo de actitud el cíclico de la mano llega además tal cual al rotor para poder rodar.

## Lo que se prueba

`flight/helicoptero.test.ts`, sin pantalla, con pilotos de prueba sencillos que llevan el colectivo y el cíclico:

- **Estacionario estable** con su estabilización: medio minuto sin deriva, sin girar y con la actitud firme. Sin
  estabilización, un empujón de 3 °/s lo saca más de diez grados; amortiguado, no; con la actitud, vuelve.
- **De estacionario a crucero sin cosas raras**: hasta los 136 kt, sin perder más de 25 m, sin alabear más de 6°, con
  las vueltas siempre dentro de las de la ficha y acabando con el morro un poco abajo. Es el criterio de cierre del
  issue #109.
- **Los techos, la curva de la potencia y la autorrotación**, contra la ficha, como arriba.
- **El par**: al dar potencia sin pisar, el morro a la izquierda; con el pedal derecho, se para.
- **Por encima del techo**, pidiendo más de lo que hay, las vueltas caen por debajo de las 245 de la ficha y se hunde.
- **En el suelo**: posado con el rotor girando y el freno puesto, quieto; y despega con el colectivo más bajo que el del
  estacionario lejos del suelo, por el efecto suelo.
- **Arrancar, parar y rodar**: el rotor coge vueltas cuando los motores dan potencia; con el freno del rotor no gira;
  parado sigue girando solo y el freno no entra deprisa; rueda, gira con los pies y para con el freno; y sin
  estabilización ni mano en el cíclico, al despegar se va.

## Lo que no hace, todavía

- **El anillo turbillonario**, al bajar casi en vertical a la velocidad de lo que el rotor echa hacia abajo. La cantidad
  de movimiento no vale ahí; es real y es de las cosas que se enseñan, así que pide su propio modelo cuando haya misión
  que lo toque.
- **El acoplamiento entre cabeceo y alabeo** del rotor, que existe; la estabilización lo esconde y se deja para cuando
  haga falta.
- **La velocidad máxima** no la pone la potencia: el modelo pasaría de los 167 kt de la ficha (TCDS, III.8). Lo que
  limita de verdad es la pala que se retira; en el juego será un aviso, en el paso 3.
- **Cuánto tarda de verdad en arrancar** el Super Puma, y desde qué vueltas se pone su freno del rotor: son supuestos
  hasta que aparezca su manual de vuelo.
