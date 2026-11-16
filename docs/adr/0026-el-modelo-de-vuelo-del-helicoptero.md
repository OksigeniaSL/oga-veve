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
- **El anillo turbillonario**, con el modelo empírico de Johnson (NASA/TP-2005-213477): bajando casi en vertical a
  la velocidad de su propia estela, el rotor deja de sostener y se hunde solo. Ver la enmienda H16b.
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

- ~~**El anillo turbillonario**~~: hecho, con el modelo de Johnson de la NASA. Ver la enmienda H16b, al final.
- **El acoplamiento entre cabeceo y alabeo** del rotor, que existe; la estabilización lo esconde y se deja para cuando
  haga falta.
- **La velocidad máxima** no la pone la potencia: el modelo pasaría de los 167 kt de la ficha (TCDS, III.8). Lo que
  limita de verdad es la pala que se retira; en el juego será un aviso, en el paso 3.
- **Cuánto tarda de verdad en arrancar** el Super Puma, y desde qué vueltas se pone su freno del rotor: son supuestos
  hasta que aparezca su manual de vuelo.

## Enmienda H16b (16-11-2026) — El anillo turbillonario

**Sale de «Lo que no hace, todavía».** Bajando casi en vertical a la velocidad del aire que echa el rotor, el
rotor se mete en su propia estela: los torbellinos de las puntas no se van, se juntan en un anillo, y el aire da
vueltas por el disco en vez de atravesarlo. Es real, es de lo que se enseña —el issue #111 lo pide como otra de la
familia de «lo instintivo es lo equivocado»— y la cantidad de movimiento no vale ahí: supone una estela limpia, con el
aire yendo en un solo sentido, y bajando entre 0 y 2 veces la inducida en estacionario no lo hay. La solución que daba
el modelo seguía la rama de subir, estable, como si no pasara nada.

### Con qué modelo

**El de Johnson** (W. Johnson, *Model for Vortex Ring State Influence on Rotorcraft Flight Dynamics*,
NASA/TP-2005-213477, 2005, de dominio público), tablas 3 y 4. Es una extensión paramétrica de la cantidad de
movimiento para la inducida media, hecha a propósito para la dinámica de vuelo y para simuladores en tiempo real
«including training simulations», y se construye con el **borde de la inestabilidad medido**: el Dauphin de los
ensayos de Taghizad y el V-22 en vuelo, y los rotores de túnel de Drees, Castles y Betzina. No pide nada del rotor
—ni solidez ni torsión—, solo vh = √(T/2ρA) del empuje del instante, así que vale para el Super Puma sin ajustar nada.
El modelo de la NASA (Heffley y Mnich) ya resuelve la inducida junto con el empuje de la pala; aquí solo cambia,
dentro de esa zona, la relación entre los dos.

Lo que dice, con la velocidad vertical Vz (positiva subiendo) y la del plano Vx en múltiplos de vh, y Vz + v el aire
que atraviesa el disco:

| Punto | Vz/vh | Qué es |
| --- | --- | --- |
| D | −0,2 | Donde empieza a apartarse de la cantidad de movimiento |
| N | −0,45 | Mínimo del aire total, 0,85: el borde de arriba de la inestabilidad |
| X | −1,5 | Máximo, 1,25: el borde de abajo |
| E | −2,0 | Donde vuelve a la base, ya con el aire subiendo por el disco |
| M | Vx/vh = 0,95 | Con esta velocidad en el plano el anillo ya no existe; N y X se juntan antes |

**Entre N y X, bajar más deprisa hace pasar más aire por el disco**, y con el mismo colectivo eso es menos empuje: bajar
hace bajar más. Ésa es la inestabilidad, y es lo que la cantidad de movimiento no puede dar. Más abajo de X el
modelo vuelve a ser estable, y ahí se queda el helicóptero hundiéndose deprisa.

Tres decisiones, todas para no tocar lo que ya estaba:

- **κ = 1 en la inducida y f = 1.** Las pérdidas de las puntas, el 1,15 de siempre, siguen en la potencia
  (`FACTOR_INDUCIDO`); Johnson las mete en la inducida, y meterlas aquí cambiaría el estacionario y los techos
  contrastados con Airbus. La f de Johnson, que deja rebajar la inestabilidad, entera.
- **Fuera de la zona, la cantidad de movimiento tal cual, al decimal.** Bajando menos de 0,2 vh o con más de
  0,95 vh en el plano, `resolverDisco` devuelve lo de siempre, y en el borde los dos modelos dan lo mismo —en D sin
  pendiente; en M lo que añade el anillo se anula—, así que no hay salto. Las pruebas de `helicoptero.test.ts` y
  `fdm-helicoptero.test.ts` pasan sin tocarlas, y `anillo-turbillonario.test.ts` comprueba la igualdad en estacionario,
  subidas, crucero, autorrotación y efecto suelo.
- **Sin el retraso de Johnson.** Él pone un retraso de primer orden a la inducida para el tiempo que tarda en formarse
  el anillo; aquí es casi estática, que con el paso de 1/240 s y la masa del Super Puma ya tarda segundos en notarse.
  Si hace falta afinar la entrada, es lo primero que se pone.

Solo en el rotor principal. **El de cola también entra en anillo** —es uno de los mecanismos de la pérdida de eficacia
del rotor de cola— pero no se ha medido aquí y es otra lección.

### Lo que da, al peso máximo y a 1.500 m

Con vh ≈ 14,4 m/s:

- **Quieto, el colectivo una décima por debajo del que sostiene, y suelto.** A los cuatro segundos baja a 5 m/s, a los
  seis pasa N, a unos 6,5 m/s, y sin tocar nada se va a 17 m/s a los doce y se queda en **26 m/s, unos 5.100 pies por
  minuto**, a 1,76 vh. El manual de la FAA: «a descent rate that may approach 6,000 feet per minute». Con la cantidad
  de movimiento de antes, el mismo colectivo se quedaba en 8,5 m/s, estable; con media décima, 4 m/s antes y ahora,
  que eso no llega a N.
- **Lo mismo volando a 40 nudos**: baja a 5 m/s y se queda; no entra.
- **Dentro, subir el colectivo no saca.** Bajando a 24 m/s, una décima y media, tres o la palanca entera: los motores
  al tope (de 2.350 a 2.470 kW), las vueltas del rotor a 250, 224 y 190 rpm —por debajo de las 245 de la ficha con
  motor—, y sigue bajando a 24 o 25 m/s.
- **Con el cíclico adelante sale**, el morro doce grados abajo y el colectivo donde estaba: fuera del anillo a los ocho
  segundos, a los diez baja a 6 m/s con 44 nudos, y se pierden unos doscientos metros, con el rotor en sus 265 rpm.
  Por eso se enseña con altura de sobra: la FAA pide practicarlo para salir por encima de mil pies.
- **En la estabilización de estacionario, la palanca abajo baja a 4 m/s y se queda**: 0,27 vh, entre D y N, nunca
  dentro.

**Y en el juego**, con un banco de navegador en Taguató, a 600 m sobre el helipuerto de Los Rodeos —unos 1.230 m de
altitud— y quieto sobre el sitio con el cíclico, como un piloto: el colectivo una décima abajo y suelto, entra a 5,9 m/s
(0,46 vh), sale la tarjeta y se pide la frase una vez, y en doce segundos baja a 20,6 m/s, 4.060 pies por minuto. Con
el cíclico adelante sale con 43 nudos, bajando a 5,9 m/s y 174 m más abajo, el rotor al 100 %. En Tukã, con la palanca
abajo, no pasa de 4,6 m/s ni entra.

En la primera pasada el banco no llevaba el cíclico, y el helicóptero, colocado en el aire con el morro a nivel, se fue
hacia delante a 9 m/s en doce segundos: con el mismo colectivo no entró, porque esa velocidad ya lo saca de la zona.
Por eso el banco sostiene el sitio con el cíclico, que es como se coge el anillo de verdad: queriendo quedarse quieto
fuera del efecto suelo mientras se baja, «attempting to hover OGE without maintaining precise altitude control».

**Lo que no da, y por qué.** El manual de la FAA dice que subir el colectivo, además de no sacar, **hunde más**:
«this only results in increasing the stalled area of the rotor, thereby increasing the rate of descent». Es la pérdida
de la parte de dentro de las palas, que con el aire subiendo por ahí trabaja con mucho ángulo. Este modelo no tiene
pérdida de pala —la sustentación del elemento de pala es lineal—, así que lo que da es lo que dice Johnson: «while the
response to control is still a positive acceleration increment, the control authority is not sufficient to reverse
the motion». O sea: no se sale, se gasta toda la potencia y las vueltas se caen del verde, que en el de verdad es
justo meter las palas en pérdida; pero la bajada no crece. Y al principio, antes de que se desarrolle —a 10 m/s—, un
colectivo a tiempo sí frena, que es lo que dice Johnson y en lo que se apoya la técnica de Vuichard, la que el manual
de 2019 recoge: potencia y cíclico **a un lado**, para salir de la columna de aire. Lo que saca siempre, a cualquier
altura de la entrada, es lo que dicen las dos fuentes y lo que se enseña: **cíclico adelante**.

### Dónde se ve

**El modelo es el mismo en los cuatro peldaños**, como todo el de este ADR: la física no cambia de peldaño. Lo que
cambia es la estabilización, y con ella sale sola la línea del #111, «con cuatro años esto no existe»:

- **Guyrami y Tukã** llevan la de estacionario, que manda la velocidad vertical y bajando no pide más de 4 m/s
  (`SUBE_EN_ESTACIONARIO`): de 0,27 a 0,34 vh según el peso y la altura, por debajo de N. No se entra, y no hay
  nada que esconder ni que falsear.
- **Taguató y Taguató Ruvicha** llevan la de actitud, con el colectivo de verdad: ahí se entra si se baja así.

**Ninguna caja suena.** No consta que el AS 332 L1 ni el H215 lleven un aviso de anillo turbillonario —no lo trae la
ficha de la EASA ni nada público de Airbus que se haya encontrado—, y lo que el avión no lleva no se inventa
(regla 4). Así que lo cuenta quien lo contaría sentada al lado, como en la avioneta (`flight/escalera.ts`):

- **La tarjeta**, al pasar N, con un dibujo nuevo, `ciclico-adelante`: el helicóptero de perfil con el morro abajo y
  una flecha hacia delante. El dibujo en los cuatro peldaños, «¡Adelante!» en Tukã y la frase desde Taguató: «Te
  hundís en el viento de tu rotor: cíclico adelante y ganá velocidad».
- **La instructora, con calma, en los tres de abajo** (`laInstructoraLoExplica`), que en la práctica es Taguató: qué
  pasa, que el colectivo no saca y cómo se sale (`vuelo.anillo`, al final de la lista de grabar y esperando su toma).
  En Taguató Ruvicha, la tarjeta sola, como toda explicación en el peldaño de cabina.
- **Solo con los motores dando potencia**, del 20 al 100 % de la que hay, que es la segunda condición del manual de
  la FAA. Bajando en vertical sin motor, el rotor cae en la misma zona de la curva —entre X y E—, pero eso es la
  autorrotación (#110), y lo que se cuenta ahí es otra cosa.
- **Se rearma al salir de la zona entera**, no con el reloj: un aviso vuelve cuando cambia algo que pasa.

Ver `inducidaEnDescenso` y `zonaDelAnillo` en `flight/helicoptero.ts`, `mirarElAnillo` en `game.ts`, y
`flight/anillo-turbillonario.test.ts`.

**Fuentes**

- W. Johnson, *Model for Vortex Ring State Influence on Rotorcraft Flight Dynamics*, NASA/TP-2005-213477, NASA Ames,
  diciembre de 2005: el modelo (tablas 3 y 4), la caída del Dauphin y la recuperación —«a drop in collective and
  forward cyclic for a helicopter»—.
- FAA, *Helicopter Flying Handbook*, FAA-H-8083-21B (2019), capítulo 11, «Vortex Ring State»: las tres condiciones
  —bajar casi en vertical al menos 300 pies por minuto, con del 20 al 100 % de la potencia y por debajo de la
  velocidad de sustentación por traslación—, los 6.000 pies por minuto, lo que hace el colectivo, la recuperación de
  siempre —ganar velocidad y bajar algo el colectivo— y la de Vuichard.

## Enmienda H16a (16-11-2026): la autorrotación hasta el suelo (#110)

**El criterio de cierre del #110 —cortar los motores a 500 ft y llegar entero— se cumple, y se prueba volándolo**
(`flight/autorrotacion.test.ts`). Se vuela como lo pide el manual de helicópteros de la FAA, de dominio público
(FAA-H-8083-21B, capítulo 11, «Straight-In Autorotation», págs. 11-1 a 11-5): colectivo abajo en cuanto se paran los
motores, las vueltas en su banda con él, la velocidad de planeo con el cíclico, la recogida a la altura del manual,
nivelar a la actitud de posarse y amortiguar con el colectivo, que gasta lo que guarda el rotor girando. El manual deja
las alturas y la velocidad al de cada tipo, y el del Super Puma no es público, así que:

| Qué | Cuánto | De dónde |
| --- | --- | --- |
| Velocidad del planeo | 70 kt | La que el modelo ya probaba contra las vueltas sin motor de la ficha (TCDS R.002, III.9); cerca de la de menos potencia, hacia 80 kt, que es la de menos bajada |
| Altura de la recogida | 100 ft de las ruedas | El alto de la horquilla de la FAA, de 40 a 100 ft según el helicóptero (FAA-P-8740-71, *Planning Autorotations*), porque este es de los pesados |
| Nivelar y amortiguar | 15 ft | El alto de los 3 a 15 ft de la FAA para el tren al nivelar (11-5) |
| Cuánto sube el morro | Hasta 20°, según lo que baja | Lo que dio la toma más suave; y no más, que una recogida que hace subir el helicóptero gasta las vueltas (11-4) |
| Entero | Toma por debajo de 2,0 m/s, morro entre 0 y 10°, alas a menos de 5°, y rueda y para | La toma, la de CS 29.725 que juzga el juego; el morro, por el rotor de cola, a 9,4 m del mástil y a 1,9 m del suelo, que toca pasados unos 14° |

**Lo que da**, al peso máximo y cortando a 500 ft desde 80 kt, salvo donde se dice:

| | Bajada en el planeo | Vueltas en el planeo | Toma | Morro al tocar | Velocidad al tocar | Vueltas al tocar |
| --- | --- | --- | --- | --- | --- | --- |
| Con la palanca de verdad (actitud, Taguató) | 8,9 m/s | 232–243 rpm | 1,37 m/s | 3,5° | 42 kt | 173 rpm |
| Con la ayuda (estacionario, Tukã), sin tocar nada | 9,9 m/s | 236–238 rpm | 1,51 m/s | 5,1° | 35 kt | 142 rpm |
| Con la ayuda, desde 40 kt | 12,0 m/s | 247–256 rpm | 1,68 m/s | 5,7° | 32 kt | 134 rpm |
| Con la ayuda, con 6.500 kg | 8,2 m/s | 203–225 rpm | 1,33 m/s | 4,8° | 32 kt | 130 rpm |
| Con la ayuda, parado a 1.000 ft | 15,3 m/s | 246–254 rpm | 1,54 m/s | 5,0° | 33 kt | 143 rpm |
| Con la ayuda, parado a 500 ft | — | — | 11,4 m/s: se rompe | | | |

Y en el suelo, con los frenos y el colectivo abajo, para en cinco a siete segundos sin ladearse más de un grado.

**Lo que hubo que arreglar, medido.** Con la palanca de verdad, el modelo ya llegaba. Con la ayuda de estacionario
—la de Guyrami y Tukã—, no:

- **Soltar el cíclico era pararse**, y parado en el aire sin motor se baja casi en vertical, a 41 m/s desde 500 ft; y
  **el colectivo guardaba el 98,5 % de las vueltas hasta el suelo**, de modo que desde 68 kt, con la palanca empujada
  hasta los cien pies, tocaba a 5 m/s con el rotor lleno. Ahora, sin motor (`faseDeAutorrotacion` en
  `flight/helicoptero.ts`: sin el mando de los motores o mientras no dan ni un cuarto de su potencia), la ayuda pide la
  velocidad de autorrotación con el cíclico como esté —empujado picaba a cien nudos y a 19 m/s—, sube el paso solo si
  las vueltas pasan de las nominales, recoge a cien pies, nivela a quince y gasta las vueltas en amortiguar. Es lo que
  hace un piloto; en estos peldaños la ayuda ya era dueña del colectivo, y ahora lo es también de la recogida.
- **El pie se adelantaba al par también sin motor**: al subir el colectivo para amortiguar metía todo el pedal, el morro
  giraba treinta grados por segundo y tocaba ladeado siete. Sin motor no hay par que adelantar.

La inercia del rotor y el embrague no se tocan: con los 10.000 kg·m² supuestos y la rueda libre de siempre —los motores
nunca frenan el rotor—, lo que guarda el rotor alcanza para pasar de unos 4 m/s a 1,4 en los últimos cuatro metros.

**Lo que dice el diagrama de altura y velocidad**, que cada helicóptero lleva en su manual (FAA-H-8083-21B, capítulo 7):
parado en el aire a 500 ft no da tiempo a coger la velocidad del planeo, y no se llega; a 1.000 ft, sí. Es real, y no se
le pone remedio: por eso el ejercicio empieza a mil pies.

**El ejercicio** (`autorrotacion` en `flight/ejercicios.ts`) se ofrece desde Tukã, como el planeo del avión: es el
mismo mensaje. Empieza a 1.000 ft sobre la cabecera de la pista en uso, a 70 kt y con el tren fuera —recogido, posarse
es de panza, y el juego lo rompe—; la instructora lo presenta, a los catorce segundos se paran los dos motores y se posa
en la pista, que es llano y sin casas. El hangar se lo ofrece al JAZ 70 junto a su vuelo libre y su misión, y deja de
ofrecerle los de avión: V1, el planeo de ala, un motor, el simulador y la tormenta se le colaban por `valePara` (ahora
`deHelicoptero` en `seOfrece`). Sin MAYDAY ni bomberos: a esa altura se vuela y nada más, y la frase de los bomberos es la
de un avión que vuelve a su pista.

**La explicación.** La presentación, en los peldaños donde se ofrece; al pararse los motores y al llegar a la recogida, la
instructora en los de abajo —en Tukã cuenta lo que hace la ayuda; en Taguató dice qué hacer—; y el cierre, con su
felicitación. El dibujo es el helicóptero de perfil con las dos zetas del motor dormido. El mensaje es el del #110: sin
motor no se cae, el aire que sube hace girar el rotor, y con su giro se posa.

**Lo que dice la máquina.** El Super Puma lleva aviso sonoro de vueltas bajas del rotor: en el AS332L2 G-CHCF, al caer las
vueltas en una toma de entrenamiento, «the low rotor speed aural warning activated» (AAIB Bulletin 2/2009,
EW/C2007/11/03). Suena en los cuatro peldaños por debajo de 220 rpm, el mínimo sin motor de la ficha, y la instructora lo
explica detrás en los de abajo: en el aire, colectivo abajo; en la toma sin motor, que es lo normal, porque las vueltas se
gastan en posarse. Se rearma cuando las vueltas pasan de 230, no con el reloj. Ni el umbral del de verdad ni cómo suena
están publicados: el sonido es una forma, como el pitido de precaución (`ROTOR_BAJO` en `audio/tonos-de-aviso.ts`). Y la
fuente es del L2, el Mk II de la misma familia: que el C1/L1 lo lleve igual se supone.

**En el juego de verdad**, con el banco del navegador (Tenerife Norte, sin viento, con la tarjeta Intel): en Tukã sin
tocar nada, la ayuda frena hasta casi pararse a mil pies antes del corte, coge la velocidad sin motor y se posa en la
pista a 1,57 m/s y 31 kt, con el aviso de vueltas bajas en los últimos cuatro metros; en Taguató, un piloto de banco
que hace el procedimiento con la palanca de verdad se posa a 1,32 m/s. Los dos cierran el ejercicio como hecho. Y el
banco encontró lo de avión que la lección de aterrizar traía al helicóptero, y se calla mientras dura el ejercicio
(`autorrotacionPracticada` en `game.ts`): «positive rate, gear up» y su «metélo» a mil pies, con el tren que hace falta
para posarse; los consejos de la final («vamos lentos, bajá la nariz»); el *sink rate*; y «terrain, pull up» con su
«Subí» a cuarenta metros del suelo, que sin motor es lo que no se puede hacer. Fuera del ejercicio esos avisos siguen
como estaban. También dos cosas del helicóptero en general: el marco rojo de la pérdida alrededor del horizonte —que
es de un ala, y se encendía bajando sin motor con el aire dando en el fuselaje desde abajo— ya no sale en el
helicóptero; y la palanca que pone el juego al empezar en el aire es la que sostiene la altura a esa velocidad
(`colectivoNivelado`), no la del estacionario, con la que subía a diez metros por segundo hasta el corte.

**Lo que queda:**

- ~~**El paso mínimo** se ajustó a 3.000 m.~~ Hecho: 8,5°, ver la enmienda H19c. A nivel del mar y con 6.500 kg, con la palanca abajo, las vueltas del planeo
  bajan a 203 rpm, por debajo de las 220 de la ficha; la FAA dice que los topes se ajustan para que con poco peso den el
  mínimo (11-4). Reajustarlo sube las vueltas arriba y cambia la prueba «sin motor» de `helicoptero.test.ts`.
- **El golpe de la cola** no lo lleva el modelo: la prueba lo mira por la actitud al tocar.
- ~~**Los motores se apagan como al pararlos**~~ (hecho: ver la enmienda H19c), en ocho segundos: un fallo de verdad es más brusco. La ayuda entra en
  autorrotación en cuanto se cortan; a mano, la potencia se va en unos cuatro.
- **La bajada vertical sin motor** cae en la zona del anillo turbillonario de la enmienda H16b. Medido con él dentro:
  desde 80 kt a 500 ft y en el ejercicio, que frena antes del corte, el rotor no entra nunca en ella; parado a 1.000 ft
  pasa 0,9 s «cerca» mientras coge velocidad y se posa a 1,54 m/s, como sin él; parado a 500 ft pasa 1,2 s, 0,3 de ellos
  dentro, y no llega, como no llegaba. Por eso la ayuda pide la velocidad de planeo hacia delante y no se baja en
  vertical.

## Enmienda H17a (16-11-2026): las cuatro lecciones del ala rotatoria (#113)

**Lo que faltaba no era física, eran lecciones.** El estacionario con su ayuda, el par y el pedal, el efecto suelo y la
autorrotación ya estaban en el modelo; faltaba darles un principio, un final y alguien que las cuente a quien no lee.
Salen del manual de helicópteros de la FAA (*Helicopter Flying Handbook*, FAA-H-8083-21B, 2019, de dominio público), que
se cita en `CREDITOS.md` sin su logotipo:

1. **Quedarse quieto** (`estacionario`): el estacionario es lo más difícil de volar un helicóptero —el rotor mueve su
   propio aire, y ese aire lo empuja—: «Hovering is the most challenging part of flying a helicopter. This is because a
   helicopter generates its own gusty air while in a hover» (capítulo 2, «Hovering Flight»). Así que sostenerlo diez
   segundos se celebra.
2. **El par** (`par`): más colectivo, más par, y el morro se va; el pedal mueve el rotor de cola, y se queda
   (capítulos 2 y 3).
3. **El efecto suelo** (`efecto-suelo`): cerca del suelo sostenerse cuesta menos (capítulo 2), y se ve en la aguja de la
   fuerza, el FLI.
4. **La autorrotación**: es el ejercicio de la enmienda H16a, y se enlaza tal cual. No se rehace.

### Cómo entran

**Por la puerta de los ejercicios, como la tormenta.** Son tres entradas más de `EJERCICIOS`, con `escena: "rotor"` y
`deHelicoptero`, delante de la autorrotación: el hangar del JAZ 70 las ofrece en ese orden detrás del vuelo libre y de
Teno, cada una con su dibujo; `?ejercicio=estacionario` las pone sin hangar, y el juego las presenta antes y las celebra
al acabar. No falla nada, así que no las lleva `practica.ts` sino su propia práctica, `flight/lecciones-del-rotor.ts`,
que como las otras dos lee el vuelo y devuelve sucesos; quién dice qué en cada peldaño lo decide `game.ts`
(`practicarElRotor`). Empiezan donde empieza el helicóptero: posado en su helipuerto con el rotor en marcha.

**Para quien no lee**: cada una tiene su dibujo en la ficha del hangar y en la tarjeta —el helicóptero quieto entre dos
flechas; visto desde arriba, con el morro que se va a la izquierda; el aire de su rotor que rebota en el suelo—, y la
tarjeta va diciendo qué toca con un dibujo nuevo para subir, para bajar y el pedal de siempre. La instructora presenta y
celebra en los cuatro peldaños, y lo de por el camino lo cuenta en los tres de abajo; en Taguató Ruvicha, la tarjeta
sola. Donde la ayuda lleva el colectivo se dice «soltalo»; con la palanca de verdad, soltar no para nada y se dice otra
frase. Trece frases nuevas, al final de `scripts/frases-para-grabar.mjs`, en calma; hasta que se graben, la lección se
cuenta con el dibujo y el texto, como todo ejercicio (`decirDelEjercicio`).

**El logro se celebra en el aire**, que es donde pasa: el sonido del logro, la tarjeta con el helicóptero y la marca
de hecho —no el dibujo de lo que se pedía, que en Guyrami, sin palabras, era la misma tarjeta otra vez— y la
instructora. El panel del
final espera a que se pose, como el de la tormenta: taparle la pantalla a quien está colgado a tres metros del suelo
sería dejarlo sin ver.

### La medida, que es la del juego

Lo que se celebra se juzga con números, y los números no se enseñan: se ve el helicóptero que no se mueve, el morro que
gira, la aguja que sube y baja.

| Lección | Se logra con | Por qué |
| --- | --- | --- |
| Quieto | 10 s sin apartarse 2 m de donde se paró, ni 1 m de alto, ni 10° de morro, con las ruedas entre 0,3 y 15 m, un diámetro del rotor | Los 10 s, del #113; 2 m es menos de lo que asoma la rueda de morro, y se ve contra el suelo. Supuestos: la norma ADS-33E-PRF tiene los suyos para su maniobra «Hover», y no se han copiado sin comprobarlos |
| El par | Subiendo, con el pie del lado que para el par y el morro girando a menos de 3 °/s, 2 s | El pie del otro lado: el derecho en el Super Puma, que gira en horario visto desde arriba |
| El suelo | Quieto abajo (ruedas por debajo de 3 m) y quieto arriba (por encima de 20 m), en cualquier orden, acabando abajo | Abajo, el buje queda a menos de un radio del suelo; arriba, a más de un diámetro, donde con Cheeseman y Bennett falta menos de un 1 % para lo de lejos |

«Quieto» se cuenta desde donde se para, y no desde la hache: el logro es quedarse, no llegar.

### Por peldaño, y lo que enseña en cada uno

El modelo es el mismo en los cuatro; lo que cambia es la estabilización, y con ella lo que cada lección enseña:

- **Quieto, en los cuatro.** Con la ayuda de estacionario (Guyrami y Tukã) soltar el cíclico es quedarse, y lo que se
  aprende es que un helicóptero se queda quieto en el aire —lo que no hace ningún avión— y que el colectivo dice a qué
  altura: subir un poco, soltar y no tocar. Con la de actitud (Taguató y Taguató Ruvicha) la deriva es de quien vuela, y
  quedarse es todo el oficio.
- **El par, desde Tukã.** Con el pie puesto por la estabilización —que sostiene el rumbo parado y se adelanta al par
  cuando cambia el colectivo— el morro no se movía en ningún peldaño, y la lección no tenía nada que enseñar. Así que
  **en esta lección los pedales pasan a quien vuela** (`piesDeQuienVuela` en `helicoptero.ts`): el eje de la guiñada se
  queda con la amortiguación de la tabla de arriba, `amortiguada`, y con el pie que ya ponía la ayuda, entero y quieto
  —lo aprendido, lo que sostenía el rumbo y lo que se adelantaba al par—; el cíclico y el colectivo siguen como
  estaban. Al devolverlos, la ayuda sigue desde ese pie, sin tirón. Es como se enseña el estacionario, un mando cada vez: el instructor da
  los pedales, y se los vuelve a quedar al acabar. Se dan **ya en estacionario**, a los dos segundos quieto, y no
  posado: con el pie aprendido en el suelo, el colectivo de despegar giraba el morro a sesenta grados por segundo. En
  Guyrami no se ofrece: pide dos manos a la vez —subir y pisar— y allí todo es un gesto cada vez, y los pies los lleva
  siempre la ayuda.
- **El efecto suelo, en los cuatro.** Se ve en la aguja del FLI, que tiene su dial y su cifra desde el primero
  (`ui/vms.ts`), con la ayuda o con la palanca de verdad.
- **La autorrotación, desde Tukã**, como estaba.

### Lo que da el modelo, al Super Puma con 7.500 kg y al nivel del mar

Sin pantalla, en `flight/lecciones-del-rotor.test.ts`:

- **El suelo.** Quieto con la ayuda, los motores dan 1.547 kW con las ruedas a 2,1 m, 1.595 a 3,7, 1.650 a 9, 1.674 a 21
  y 1.679 a 29: abajo, un 8 % menos. En el FLI, de 5,7 a 6,2, unos diez grados de aguja en el dial de la VMS.
- **El par.** En estacionario con la ayuda y los pedales suyos, la X —subir a 4 m/s— lleva el morro a la izquierda a
  hasta 11 °/s, veinte grados en tres segundos; ocho centésimas de pedal derecho lo paran. Con la palanca de verdad,
  cinco centésimas de colectivo lo llevan a unos 4 °/s. Sin tocar nada, quieto, se va despacio, menos de 1 °/s: los
  pies de un estacionario nunca están quietos.
- **Quieto.** Con la ayuda, la X tres segundos y soltarla lo logra hacia los treinta segundos: al despegar, la ayuda se
  desliza unos diez metros de lado y tarda en pararse del todo, y no se cuenta hasta que se para (ver abajo). Con la
  palanca de verdad, un piloto de prueba que sostiene el sitio con el cíclico también lo logra.

### En el juego de verdad

Con un banco de navegador (Tenerife Norte, sin viento, con la tarjeta Intel) y un piloto de banco en cada lección,
en el peldaño de fábrica y en Taguató:

- **El hangar**: en Tukã, «¿A qué jugás?» con el JAZ 70 ofrece el vuelo libre, Teno y las cuatro lecciones en su
  orden, cada una con su dibujo; en Guyrami, el vuelo libre, Teno, quieto y el suelo.
- **Quieto, en Guyrami**: la X hasta tres metros y soltarla; la ayuda sigue subiendo hasta once y se queda a diez,
  se para del todo a los veinte segundos y a los veintisiete lo ha logrado. En **Taguató**, colgado a tres metros con
  el colectivo de verdad, a los quince. Las dos, posadas después, con el panel del final.
- **El par, en Tukã**: quieto, los pedales pasan a quien vuela; la X lleva el morro a la izquierda, sale el pie
  derecho en la tarjeta, y con él subiendo se logra a los veinticinco segundos; los pedales vuelven a la ayuda.
- **El suelo, en Taguató**: quieto a dos metros pide el 56,0 % del par; a veinticinco, el 62,5 %; y de vuelta abajo se
  logra, a los cuarenta y ocho segundos.

Y lo que el banco no dejó probado:

- **El par, en Taguató**, con el pie congelado de la primera versión —lo aprendido solo—: el morro se siguió yendo a la
  izquierda a unos cuatro grados por segundo durante ochenta segundos, con el pie derecho del banco puesto. Sin
  pantalla, el mismo piloto de banco sí lo paraba, así que la diferencia estaba en lo que le faltaba a lo aprendido
  en el juego; ahora se congela el pie entero de la ayuda (arriba), con su prueba de que no salta, pero **no se ha
  vuelto a volar en el navegador**: el banco ya llevaba sus tres pasadas.
- **El suelo, en Guyrami**: quieto abajo sí (el 58,6 %), pero el piloto de banco no supo quedarse quieto arriba: con la
  ayuda cada toque de tecla se pasa unos ocho metros, y su corrección iba y venía entre 16 y 33 m. Es del piloto de
  banco, no de la lección —sin pantalla, la misma secuencia se logra—, y queda por volar en el navegador.

### Lo que queda

- ~~**Al soltar la X, la ayuda de estacionario sigue subiendo**~~ (hecho: ver la enmienda H19c) unos ocho metros: soltada a tres, se queda a diez u once.
  Es lo que tarda en frenar la subida pedida (metro y medio por segundo cada segundo) con el colectivo que la sigue. Por
  eso quieto vale hasta un diámetro del rotor; pero «subí un poquito» deja a quien empieza más alto de lo que quería.
- ~~**Al despegar con la ayuda de estacionario, el helicóptero se desliza**~~ (hecho: ver la enmienda H19c) unos diez metros de lado a casi 3 m/s antes de
  pararse, y no vuelve encima de la hache: la ayuda pide velocidad cero sobre el suelo, no un sitio. Es del despegue, no
  de estas lecciones, y para la de quedarse quieto no importa —se cuenta desde donde se para—, pero quien despegue en
  Guyrami no se queda encima de la hache. Va en el informe, para mirarlo aparte.
- **El progreso de los diez segundos** no se dibuja: se sabe que se va bien por la frase del principio y porque el
  helicóptero no se mueve. Un anillo que se llena en la tarjeta sería la medida del juego dicha también con dibujo.
- **Las trece frases**, por grabar.

## Enmienda H19c (16-11-2026): los flecos que vieron las tandas 7 y 8

Cinco cosas que no eran como en un Super Puma de verdad, cada una con su commit, su prueba y su fuente. Las dos de «Lo
que queda» de la enmienda H17a y las dos primeras de la H16a se cierran aquí.

### El anemómetro mide a lo largo del morro

**Contaba la velocidad vertical.** La velocidad del estado era el aire total, y bajando en vertical a 20 m/s el
anemómetro marcaba 38 nudos. Uno de verdad marca casi cero: el tubo de pitot apunta hacia delante, le entra el aire que
viene de frente, el que llega de lado o de abajo no le entra y el que viene de atrás deja la aguja en el tope. Y engañaba
justo en la lección del anillo turbillonario, que es donde la aguja tiene que estar abajo: una de las tres condiciones de
la FAA es ir por debajo de la velocidad de sustentación por traslación, y se entra sin darse cuenta porque no se mira.

Ahora `airspeed`, en el helicóptero, es la componente del aire a lo largo del eje, nunca negativa (`derivados` en
`flight/helicoptero.ts`), y de ella sale la indicada de todos los relojes, como en los aviones. Volando hacia delante es
lo mismo que antes a menos de un 3 %, que es el error que la norma deja al sistema (14 CFR 29.1323 (d)); en el planeo
de la autorrotación, con el aire viniendo unos catorce grados por debajo del morro, marca alrededor de un 3 % menos que el
aire total, y eso también es lo que marcaría.

**Por debajo de unos veinte nudos, el de verdad no es de fiar.** La norma lo calibra en vuelo nivelado de veinte nudos
para arriba (14 CFR 29.1323 (b)(1)), y el manual de helicópteros de la FAA lo dice así: «the airspeed indication might
be unreliable below a certain airspeed due to rotor downwash» (FAA-H-8083-21B, 12-1). **Ese error no se simula**: no se
sabe cuánto es en el Super Puma, y uno inventado sería enseñar mal. La cifra pequeña que queda es la del aire de frente.

Lo mismo lee el ruido del aire del juego (`audio.ts`), así que bajando en vertical suena menos que antes. No se ha
medido si se nota.

### La ayuda de estacionario se queda donde se suelta, y encima de la hache

Las dos de «Lo que queda» de la enmienda H17a. Medido sin pantalla con 7.500 kg, la X hasta tres metros y soltarla:

| | Lo más alto | Dónde se queda | Lo más lejos de la hache | Al final |
| --- | --- | --- | --- | --- |
| Antes | 11,3 m | 9,5 m | 10,2 m, a 2,8 m/s | a 4,9 m |
| Ahora | 6,0 m | 5,0 m | 1,0 m | encima, a menos de 0,1 m |

Con 8.600 kg, lo mismo: 5,9 y 5,0 m, y 1,2 m de lado. El par se mueve entre el 29 y el 87 % (antes, del 31 al 86 %).

**Pedía subida cero y velocidad cero; ahora pide una altura y un sitio.** Es la ayuda de los dos peldaños de abajo, que
ya era dueña del colectivo y del cíclico (ver la tabla de la estabilización), y lo que hace es lo que hacen los modos de
mantener la altura y el estacionario de un automático:

- **La altura**: a media palanca, la de donde se para la subida frenando como frena la ayuda, y lo que se pase de ahí se
  devuelve a no más de 2 m/s. No la de soltar justo: soltada a medio metro del suelo, lo que se pasaba lo devolvía hasta
  tocar, y un toque corto de X era un saltito. Ahora dos segundos de X lo dejan colgado a metro y medio.
- **Frenar la subida, más deprisa que empezarla**: a 4 m/s cada segundo y no a 1,5, que eran cinco metros solo en frenar
  (`FRENA_LA_SUBIDA`). El colectivo baja a 0,4 por segundo y sube a 0,25, como estaba: subirlo de golpe deja caer las
  vueltas, bajarlo no. Y en el lazo del colectivo lo que falta pesa más que lo aprendido (0,1 y 0,04, antes 0,04 y 0,05),
  que se cargaba de más mientras subía y al soltar lo seguía subiendo; y lo que se adelanta por la subida pedida es 0,02
  subiendo y 0,012 bajando, como antes, porque bajando parte del aire que atraviesa el disco lo pone la propia bajada.
  Con 0,02 también bajando, el banco del anillo encontró la palanca abajo pasándose a 5,4 m/s nada más colocar el
  helicóptero en el aire: con poco peso y al nivel del mar el anillo empieza hacia 5,5. Ahora se pasa a 4,4–4,9 m/s y se
  queda en 4, menos que antes de esta enmienda (4,6–5,0), y la prueba de `anillo-turbillonario.test.ts` lo mira con 7.000
  kg y sin dejar pasar de 5.
- **El sitio**: con el cíclico suelto, posado es donde está —la hache— y en el aire se queda ese; moviendo el cíclico no
  hay sitio, y al soltarlo se coge donde se para. Se vuelve a él a no más de 1,5 m/s (`VUELVE_AL_SITIO`). Sin motor no
  hay sitio: manda la autorrotación.
- **Y posado, el cíclico del estacionario ya puesto**, como en la de actitud: despegaba con el disco derecho y el rotor
  de cola lo empujaba de lado hasta que la ayuda lo aprendía en el aire, que es lo que se deslizaba.

La lección de quedarse quieto se logra ahora hacia los veintisiete segundos, y no los treinta. La prueba del cambio de
modo (`sin estabilización se va…`) entrega ahora también el colectivo que llevaba el rotor: la palanca de la de
estacionario pide subir o bajar, y donde la dejaba el piloto de prueba, en cualquier sitio de su media, no era un
colectivo.

### Lo de avión, fuera de todo el vuelo del helicóptero

La enmienda H16a lo calló en el ejercicio de la autorrotación; en el vuelo libre seguía. Ahora, en todo el vuelo del
helicóptero (`game.ts`):

- **El *sink rate* y el *bank angle*** (`cantarLaActitud`) y **el aviso de terreno con su «Subí»** son las envolventes
  del GPWS de un avión: avisar de lo bajo a ciento veinte metros y pedir subir bajando a sesenta, con la velocidad de
  aproximación de un ala. Un helicóptero vuela bajo por oficio y se posa en cualquier sitio.
- **Los consejos de la bajada** son los de una final a una pista por su senda.
- **El «metélo» del tren se queda, pero volando hacia delante.** El Super Puma sube el tren de verdad, en la lista de
  después de despegar, a 70 ft del radioaltímetro (boletín 11/99 de la AAIB, ya en su ficha: `meteElTrenA`). Lo que no
  era suyo es pedirlo en cada subida en vertical: en estacionario y encima del helipuerto el tren va fuera, que es donde
  se va a posar. Ahora se pide solo por encima de su velocidad de aproximación, la de llegar a un helipuerto; en la
  autorrotación, nunca. El «sacá el tren» al venir a posarse sin él sigue: posarse de panza rompe el helicóptero.

**Lo que el Super Puma lleva de verdad** y sigue sonando: el aviso de vueltas bajas del rotor (enmienda H16a, boletín
2/2009 de la AAIB). **Lo que no lleva**: un avisador de terreno. Los helicópteros que lo llevan llevan otra caja, el
HTAWS, con su propia norma (FAA TSO-C194, sobre RTCA DO-309) y sus propios modos y voces —el Mk XXII de Honeywell
dice, por ejemplo, *don't sink* si se hunde después de despegar y *tail too low* con la cola baja (*Aviation Today*, «A
TAWS for Rotorcraft», marzo de 2002)—. Que el AS 332 del juego lo lleve no lo dice su ficha de la EASA ni nada público
de Airbus que se haya encontrado, así que no suena, y la instructora tampoco lo imita: lo que el avión no lleva no se
inventa (regla 4). Si se encuentra que lo lleva, entra con sus envolventes y su voz, no con las del avión.

### El paso mínimo, de 9,5° a 8,5°

El primero de «Lo que queda» de la enmienda H16a. El tope de abajo del colectivo se ajusta, en uno de verdad, para que
**con poco peso y abajo** —que es cuando el rotor da menos vueltas sin motor— la palanca abajo dé el mínimo, y con más
peso o más arriba se sube el colectivo para no pasarse (FAA-H-8083-21B, 11-4). Estaba ajustado a 3.000 m, al revés.
Sin motor, a 70 kt y con la palanca abajo, sin pantalla:

| | 9,5° | 8,5° |
| --- | --- | --- |
| Nivel del mar, 6.500 kg | 204 rpm | **221 rpm** |
| Nivel del mar, 8.600 kg | 236 rpm | 255 rpm |
| 1.500 m, 7.500 kg | 237 rpm | 256 rpm |
| 3.000 m, 8.600 kg | 274 rpm | 297 rpm: se sube el colectivo |

Las de la ficha sin motor son de 220 a 290 (TCDS, III.9); los 6.500 kg ya están por debajo de los 7.000 sin combustible
de la ficha del juego. La prueba «sin motor» de `helicoptero.test.ts`, a 3.000 m y al peso máximo durante un minuto,
sigue dentro de la banda —baja a la vez que planea—; la nueva, «con poco peso y al nivel del mar…», mira los 220.

Dos cosas que arrastra: **la figura del plato** lleva la misma cifra (`CABEZA.pitch` en `ui/figuras/plato-dibujo.ts`,
que es el fichero generado de la entrega de arte: se ha cambiado ese número a mano, y la entrega tendría que traerlo así la
próxima vez), y el paso que lee en el 75 % del radio va ahora de 2,5° a 20°. Y **la palanca tarda algo más en despegar**,
porque el mismo paso es un poco más de palanca: la prueba de la lección del efecto suelo sube ahora hasta despegar, y
no un segundo y medio. Las cifras de la tabla de la enmienda H16a con la ayuda —que dependen del paso— no se han vuelto a
medir una a una; sus pruebas, `autorrotacion.test.ts`, pasan.

### Un fallo de motor es de golpe

El último de «Lo que queda» de la enmienda H16a. **Un fallo no es una parada**: un turboeje que se queda sin llama no da
potencia a la turbina libre aunque el generador de gas siga girando, y la norma trata el fallo como una pérdida de
potencia de golpe, con al menos un segundo antes de que nadie toque nada (14 CFR 29.143 (e)). Fallando como se paran a
mano, la potencia tardaba unos ocho segundos en irse y el rotor perdía vueltas despacio, que no es lo que hay que
aprender a contestar: colectivo abajo en cuanto se nota.

Ahora `fallanLosMotores` en `flight/helicoptero.ts`: lo que pueden dar se va en medio segundo (`SE_APAGA_DE_GOLPE`) y
lo que dan, detrás, en dos décimas; al segundo no queda ni un 5 %. Pararlos a mano sigue como estaba. Lo llaman **el
ejercicio de la autorrotación** —y cualquier fallo de todos los motores, que en el helicóptero entra por ahí
(`entrarEnAutorrotacion`)— y **quedarse sin combustible**. Arrancar otra vez lo olvida. Las pruebas de la autorrotación
cortan ahora con el fallo, y se siguen posando enteras.

No hay fallo de un solo motor: el Super Puma tiene dos, y que falle uno es otra cosa —sigue volando con el otro—, pero el
adaptador del helicóptero no lleva `pararMotor` y ese ejercicio no se le ofrece.

### En el juego de verdad

Con los bancos del navegador (Tenerife Norte, sin viento, con la tarjeta Intel), en una primera pasada con los cinco
cambios:

- **El anillo, en Taguató**: entra a 5,8 m/s, se hunde a 20,2 m/s y **el anemómetro marca 0,0 kt**; con el aire total
  habrían sido 39. La tarjeta, la frase una vez, y con el cíclico adelante sale con 43 kt, 178 m más abajo.
- **El banco de siempre del helicóptero** (`ver-helicoptero.mjs`), 19 de 19: despega, se queda a diez metros con 0,2 m de
  deriva, vuelve al helipuerto y se posa a 0,19 m/s. **El hangar**, 24 de 24. **La misión de Teno**, 42 de 42.
- **La autorrotación**: en Tukã, sin tocar nada, se posa a 1,52 m/s y 32 kt (antes 1,57 y 31); en Taguató, con el piloto
  de banco, a 1,04 m/s (antes 1,32). Las dos cierran el ejercicio como hecho, y lo único que suena por el camino es el
  aviso de vueltas bajas en los últimos metros: ni *sink rate*, ni «Subí», ni «metélo».
- **Las lecciones**, 44 de 44, y con dos de las que la enmienda H17a dejó sin probar: **el par en Taguató** se logra a los
  catorce segundos, y **el suelo en Guyrami**, a los treinta y seis, con el 54,8 % del par abajo y el 60,4 % arriba. Que
  el piloto de banco ya no vaya y venga arriba será porque al soltar la tecla la ayuda ya no se pasa ocho metros, pero
  no se ha mirado.

Y una que no pasó: **en Tukã, con la palanca abajo nada más colocarlo en el aire, bajó a 5,4 m/s**, y el banco no deja
pasar de 5. Es lo del colectivo bajando, más arriba. Arreglado, se midió sin pantalla con el mismo arranque —colocado
en el aire y la palanca abajo de inmediato—, de 4,4 a 4,9 m/s según el peso y la altura, y la prueba lo mira.
**No se ha vuelto a volar en el navegador**: la segunda pasada del banco del anillo se quedó esperando turno en la cola
del navegador, que compartían tres tandas a la vez.

### Lo que queda

- **El error del anemómetro por debajo de veinte nudos** no se simula: no se sabe cuánto es en el Super Puma.
- **El ruido del aire** sale de la misma cifra y baja en vertical suena menos. No se ha escuchado.
- **Un avisador de terreno de helicóptero**, si apareciera que el AS 332 del juego lo lleva: con sus envolventes y su
  voz, no con las de un avión.
- **El «metélo» volando hacia delante** está en el código y en las pruebas de siempre, pero ningún banco ha subido a
  más de cuarenta nudos con el tren fuera para oírlo.
- **La figura del plato** lleva el 8,5 a mano en un fichero generado: la entrega de arte tiene que traerlo.
- **Las cifras de la tabla de la enmienda H16a con la ayuda**, por volver a medir una a una con el paso nuevo y el
  fallo de golpe.
- **El fallo de un motor solo** del Super Puma, que no existe todavía.
- **Lo que se vio y no es de esta enmienda**: en la captura de Tukã justo después del fallo, el FLI de los dos motores
  marca 13,4 en rojo con el par a cero. Es la cuenta de `lecturaDeLaVms` (`flight/vms.ts`), que divide lo que dan los
  motores por lo que pueden dar mientras se apagan, y lo que pueden dar cae antes. Con el fallo de golpe dura menos de
  medio segundo; por la cuenta, con la parada a mano pasa lo mismo durante más rato. Un FLI de verdad, con el motor
  apagándose, baja.
