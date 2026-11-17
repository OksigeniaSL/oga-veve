# 0030 — La radio de navegación: la NAV, el ADF y sus agujas

Fecha: 2026-11-17
Estado: aceptado · pieza nueva (`flight/radio-de-navegacion.ts`,
`ui/radio-en-la-rosa.ts`); enchufa el gancho de la carta que dejó la enmienda
H24c del ADR 0021; no toca la radio de hablar, que sigue sin sintonizarse

## Contexto

La escalera de la navegación instrumental (#51) tiene dos peldaños que el
juego no podía enseñar: el **NDB** (el cuarto: una aguja que apunta a una
radio) y el **VOR** (el quinto: no dice hacia dónde ir, dice en qué radial
estás). Los datos ya estaban: la enmienda H22c del ADR 0021 transcribió el
AD 2.19 de cada campo —posición, frecuencia, identificador y declinación de
cada estación— en `world/radioayudas-publicadas.ts`, y la H24c dejó en la
carta un gancho, `ponerRadioDeLaCarta({ lleva, poner })`, para cuando hubiera
una radio que sintonizar. No la había: ni NAV, ni ADF, ni agujas.

## Decisión

### Un modelo puro, con la geometría de verdad

`flight/radio-de-navegacion.ts`, sin DOM ni escena, con sus pruebas medidas a
mano (un NDB al norte con rumbo 360 da 000 de relativa; un VOR al este te pone
en el 270; TFN con su «4° W» te pone en el 094 a su este; el localizador del
12 de Los Rodeos da la aguja a la derecha dos grados al norte del eje):

- **El ADF** da la marcación relativa: del rumbo del avión a la estación. No
  corrige el viento ni sabe de rumbos, que es su lección.
- **La NAV con un VOR** da el radial en que se está, con **el norte de la
  estación**: la declinación que publica el AIP («4° W»), que es a la que se
  orientó al instalarla, y no la de hoy. La DINAC no la publica para VAS, VES
  ni VEN: ahí va la del WMM2025 del día (`ui/carta/declinacion.ts`), y así
  consta. Con un curso en el OBS, la desviación con su signo —positiva, la
  aguja a la derecha— y TO/FROM: FROM si el curso y el radial van del mismo
  lado, TO si no, y entonces la cuenta se hace por el radial opuesto, que es
  por donde se llega.
- **La NAV con un localizador** da a qué lado queda el eje de la final; el OBS
  no cuenta. Al sintonizarlo, el OBS se pone en el curso de la final.
- **La bandera** sale sin señal, en el cono de confusión encima de la
  estación (cincuenta grados alrededor de la vertical) y de través al curso
  (dos grados a cada lado de los noventa), que es cuando un CDI de verdad no
  sabe si TO o FROM.
- **El DME**, en las que lo llevan, mide la oblicua.
- **El morse** del identificador ya estaba en la estación (`morseDe`, UIT-R
  M.1677); el sonido, después.

**Gran círculo y no el plano del mundo**: el alcance de un VOR alto llega a
ciento treinta millas, y a esa distancia el plano local tuerce la marcación
unas décimas; y el radial se mide en la estación, con su norte, que entre
Lanzarote y El Hierro difiere casi dos grados del del avión. El rumbo inicial
de la ortodrómica es exacto en la esfera y cuesta cuatro senos.

### El alcance, por tipo, porque la cobertura no está transcrita

El AIP trae la cobertura de cada estación en sus observaciones («COV 40 NM
BTN R-270/R-005 at 6000 ft») y H22c la dejó fuera. Mientras:

| Estación | Alcance | Por qué |
| --- | --- | --- |
| VOR | la línea de vista, con techo de 130 NM | VHF va en recta: 1,23 por la raíz de los pies de cada antena (Tierra de cuatro tercios); el techo, el volumen de servicio «H» de la FAA (AIM 1-1-8) |
| Localizador | 25 NM a ±10° del eje, 17 NM a ±35°, y la línea de vista | Anexo 10, vol. I, 3.1.3.3 |
| NDB | 50 NM | onda media, pegada al suelo; un NDB de ruta de potencia media |

La antena del avión va a diez pies del suelo y la de la estación a quince.
La estación del campo en el que se está lleva su cota; las demás, el nivel del
mar. **No hay relieve que tape**: el Teide no se pone entre Los Rodeos y
Tenerife Sur. Haría falta muestrear el terreno en la recta, y no es de un
modelo puro.

Con la misma frecuencia en varios sitios —111.3 son tres localizadores— se oye
la más cercana de las que llegan.

### Qué lleva cada avión

Una tabla en el propio módulo (`RADIOS_A_BORDO`), porque es aviónica y no
aerodinámica, y la prueba mira que no falte ninguno de la flota: NAV y ADF en
todos menos en el biplano agrícola, que fumiga a vista y no lleva ninguna. El
helicóptero, como los de línea.

### Dónde se ve: sobre la rosa que ya había

Desde el peldaño que tiene **el calco de la radio** en la carta (`calcosDe`),
que es el de cabina: la radio sale en el cuadro el mismo día que en la carta.
No es una cabina nueva:

- **Los de cristal, los de línea y el helicóptero**: en su pantalla de
  navegación, como en la de un Boeing. La aguja del ADF en cian, el color del
  dato auxiliar y el de esas agujas en las pantallas de Boeing; el curso del
  OBS con su barra y sus dos puntos a cada lado en magenta, que es lo que se
  quiere; el TO/FROM en blanco; la bandera NAV roja con la palabra en tinta
  oscura, como las luces de aviso. A los lados de la rosa, la estación, su
  frecuencia y el DME a la izquierda y el ADF a la derecha: las esquinas de
  abajo ya eran del TCAS, las millas y el rango. Giran con la rosa, con la
  misma masa que la carta de rumbo.
- **El curso, en la visera**: una ventanilla CRS con su rueda en la punta
  derecha del MCP, que es donde va la COURSE en el panel del automático de un
  Boeing.
- **Los de pistón**: su direccional hace de HSI desde ese peldaño —el curso,
  la barra y la aguja encima de la rosa—, que es lo que lleva hoy la avioneta
  de escuela que ha cambiado el giróscopo por uno electrónico. Un VOR y un
  ADF sueltos no caben en el cuadro de seis sin mover el grupo, y el grupo no
  se mueve (`ui/familia.ts`). En las esquinas, el curso en magenta y los dos
  identificadores.

### Cómo se sintoniza

- **Tocando la carta**: la radioayuda o su frecuencia, en la ficha del campo,
  la carta de aproximación o el plano en vuelo, la ponen en su caja si el
  avión la lleva (el gancho de H24c). La de hablar no se pone: la torre que se
  oye sigue siendo la del campo.
- **Con el mando de la cabina**: la estación siguiente por cercanía —un
  selector y no un teclado de frecuencias, porque la lista la tiene la carta—
  con el 7 (NAV) y el 8 (ADF), o tocando la estación en la pantalla de
  navegación —en las de pistón, que no la llevan, con la carta y las
  teclas—; y el OBS
  de grado en grado con el 9 y el 0, o tocando una mitad de la ventanilla CRS
  o de la mitad de abajo del direccional. Los números porque no quedaba una
  letra; los corchetes no, porque en el teclado español uno da el «+» y
  subiría el motor a la vez. Cada diana mide ochenta del cuadro: cuarenta y
  cuatro píxeles en la tablet.
- **Sola al salir**: el VOR del campo de salida en la NAV y su NDB en el ADF,
  y el OBS en el radial donde se está, con la aguja en el centro. Lo puesto a
  mano no se pisa al volver a salir; solo al cambiar de avión.

## Consecuencias

- El cuadro gana dos piezas en el peldaño de arriba, que se pintan una vez y
  mueven cuatro atributos por imagen. La cuenta de la radio son unas decenas
  de senos por imagen, y solo en ese peldaño.
- **La pantalla de navegación de la cabina en 3D** (`world/pantallas-cabina.ts`)
  lleva la misma radio, de la misma cuenta: `Game` decide una vez por imagen
  lo que se pinta (`pintarLaRadio`) y se lo da a las dos superficies, que es
  lo que impide que digan cosas distintas. Allí el curso va escrito al lado
  de la rosa, encima de la estación: la ventanilla CRS es del cuadro plano. **Los
  relojes en 3D de las de pistón no la llevan todavía**: su direccional sigue
  siendo un direccional desde dentro. Queda apuntado.
- Sin ejercicios: seguir la aguja e interceptar un radial van en la tanda
  siguiente, con la propuesta de abajo.

## Propuesta para la tanda siguiente: los ejercicios

1. **Seguir la aguja** (peldaño 4). En Fuerteventura, que tiene NDB y VOR en
   el campo: despegar con el ADF en FV y volver a él siguiendo la aguja,
   «que apunte arriba». Con viento cruzado, la estela en el suelo dibuja la
   curva del perro, y la instructora lo cuenta. La segunda vez, corregir:
   apuntar un poco al viento y ver la aguja quieta a un lado. Se mide con
   `leerAdf` y el viento que ya sopla en el modelo de vuelo, sin más estado.
2. **¿En qué radial estoy?** (peldaño 5). Sobre la carta, la instructora pide
   girar el OBS hasta centrar la aguja con FROM, y dice el radial: el juego ya
   sabe cuál es. Luego volar hacia la estación con TO, y pasarla: la bandera
   y el FROM son el momento de la lección.
3. **Interceptar un radial**: «salí por el 094 de TFN». Con un ángulo de
   cortada de cuarenta y cinco grados, la aguja empieza a moverse y se vira
   antes de que llegue al centro. Se juzga con la desviación de `leerNav`.
4. **Dos radiales que se cortan**: TFN y LRO, o FTV y LTE, para saber dónde
   se está sin ver nada. Es el cierre del peldaño 5 que pide #51.

Y, por delante de los ejercicios, el **morse**: al poner una estación, su
identificador en tonos de mil veinte hercios, por la vía de la radio y nunca a
la vez que la instructora (un suceso, una voz). Sin grabar nada: se sintetiza.

## Enmienda H26b (17-11-2026): el morse al sintonizar y «Seguí la aguja»

La segunda mitad de #51 para estos dos peldaños: lo que la propuesta de arriba
ponía «por delante de los ejercicios», el morse, y el primero de ellos.

### El morse, para identificar

Un piloto no se cree una aguja hasta que ha oído el identificador de la
estación y lo ha comparado con el de la carta: puede haber otra con la misma
frecuencia, una en mantenimiento o ninguna. Por eso el morse no es un adorno:
es la mitad de usar el instrumento. `audio/morse.ts`:

- **Cuándo**: al sintonizar a mano —tocando la radioayuda o su frecuencia en
  la carta, con el 7 y el 8 o tocando la estación en la pantalla de
  navegación— y al volver a tocar en la carta la que ya está puesta, que es
  como se vuelve a oír. **No al salir**, cuando la radio se pone sola: el
  despegue es el momento con más voces, y un pitido más ahí es ruido.
- **Qué**: el identificador de `morseDe`, el mismo que dibuja la caja de la
  carta, **a 1.020 Hz y a unas siete palabras por minuto**, que es lo que pide
  el Anexo 10, vol. I, para el localizador (3.1.3.9), el VOR (3.3.6) y el NDB
  (3.4.5). La unidad de la palabra PARIS, 1,2 / ppm: 171 ms; la raya tres
  unidades, entre letras tres y entre palabras siete. **Dos veces**, con el
  hueco de una palabra: FV dura ocho segundos y medio.
- **Cómo suena**: un solo oscilador senoidal con su ganancia abriéndose en
  cada golpe —un nodo por identificador, no uno por punto—, con rampas de
  cinco milésimas para que no chasque, por el bus de la radio y bajo (0,07).
  Sin fichero: sintetizado.
- **Su turno** (`TurnoDelMorse`): espera a que no hable nadie, ni la torre ni
  la instructora, ni cante una caja ni suene un aviso; deja seis décimas de
  respiro, que tocar la carta hace que la instructora diga qué es y su
  grabación tarda en empezar; si empieza a hablar alguien mientras suena, se
  corta y se vuelve a pedir una vez. Lo que espera más de treinta segundos se
  cae: es lo que tarda una radioayuda en repetir su identificador, y una
  espera sin salida es un candado.
- **Sin señal, sin morse**: la estación lejos o tras la Tierra, la bandera NAV
  fuera, el ADF sin nada a lo que apuntar. Ese silencio es lo que enseña a no
  fiarse. La bandera de encima de la estación o de través no lo calla: la
  portadora llega, y un receptor de verdad sigue oyendo el identificador.

### «Seguí la aguja»

`flight/seguir-la-aguja.ts`, una entrada más de `EJERCICIOS` —`aguja`, con
`escena: "radio"`, como la tormenta y las del rotor, que no son averías—, con
su ficha en el hangar (la antena con sus ondas, la estela curvándose con el
viento y la avioneta que llega de cara a él) y la misma puerta: el hangar,
`?ejercicio=aguja`, la presentación antes y el panel del final con la traza.

- **Dónde se ofrece**: en el peldaño de cabina, que es el que tiene el ADF en
  el cuadro y su frecuencia en la carta; en los de abajo no hay aguja que
  seguir. En todo avión con ADF —no el biplano— y en todo campo con NDB, que
  es un filtro nuevo de la lista (`dondeVale`, por el OACI de casa): FV en
  Fuerteventura, que es para el que se pensó, y también BX, HIE, CVT, PJC y
  CON. Se vende al mundo: Fuerteventura es el ejemplo, no el límite.
- **El viento, el del sitio**: como la tormenta, el ejercicio trae su día —el
  `vientoDominante` del campo, a mano—, porque con el parte de hoy podría
  tocar la calma, y la lección es lo que hace el viento. En Fuerteventura, el
  alisio: del treinta a veinte nudos.
- **Dónde empieza** (`colocacionDeLaAguja`): a seis minutos de la estación a
  la velocidad del ejercicio —la de crucero, con el tope de 250 kt de por
  debajo de diez mil pies—, entre ocho y veinticinco millas; **con el viento
  de costado**, a noventa grados del camino, que es el que dibuja la curva; de
  los dos costados, el del camino más bajo —en Fuerteventura, el mar al
  sudeste de FV—; a tres mil pies sobre la pista o mil por encima de lo más
  alto del camino; equilibrado, limpio y con el morro treinta grados apartado
  de la radio, del lado al que va el viento, para que al sintonizar la aguja
  salga a un lado y lo primero sea ponerla arriba.
- **El ADF empieza vacío** (`RadioDeCabina.quitar`): sintonizar e identificar
  son la mitad del ejercicio. Cuenta como puesto a mano.
- **Lo que pasa**, en sucesos como los demás ejercicios, con la tarjeta (la
  aguja del ADF dibujada: arriba, o quieta a un lado) y la instructora:
  presentar; si a los doce segundos el ADF sigue sin la radio, «poné la radio
  del campo en el ADF», una vez y otra solo si se quita; al acabar el morse,
  «¿oíste los pitidos?» y la aguja arriba; **la curva**, cuando la estela se
  aparta de la recta —desde donde la aguja quedó arriba hasta la estación— un
  dos por ciento de lo que había, y como poco cuatrocientos metros, tras
  veinte segundos siguiéndola y con un tercio largo del camino hecho, que
  antes de eso la curva todavía parece una recta en el plano (medido: con el alisio, la curva se aparta unos
  mil trescientos metros a cualquier velocidad, que son seis minutos de viento
  empujando, un 7,5 % del camino a cien nudos y un 3 % a doscientos cincuenta;
  en calma, de veinte a cincuenta metros); catorce segundos después, **apuntar al viento**
  hacia el lado del que viene; **«así»**, con la aguja quieta (dos grados y
  medio en diez segundos) entre tres y cuarenta grados del lado al que empuja
  el viento; y **la pasada**: la aguja cruza los noventa grados a menos de
  tres millas de la estación. Ahí se acaba, con el sonido del logro, y el
  panel del final llega con la traza en el plano. Nadie suspende: quien no
  corrige llega igual, por la curva.
- **La estela, en el plano en vuelo** (`Mapa.ponerEstela`): la traza de la
  libreta pintada encima del papel, continua y en la tinta de los nombres,
  como el lápiz con el que se lleva la traza en una carta, por encima de la
  ruta y por debajo de la flecha. Desde la cabina se mira hacia delante, y la
  curva se ve desde arriba: es ahí donde la instructora dice que se mire.
  **Una estela dibujada en el suelo del mundo en 3D queda apuntada**: el plano
  ya la enseña, y una cinta de cientos de metros sobre el relieve hay que
  medirla antes en la tablet.
- **Las frases**, ocho, genéricas: sin el nombre de la estación, que lo dice
  su morse y lo escribe la carta. Sin grabar: están al final de
  `scripts/frases-para-grabar.mjs` (`DE_LA_AGUJA`); hasta entonces, la tarjeta
  y su texto, como todo ejercicio (`decirDelEjercicio`).

### Lo que se prueba

- `audio/morse.test.ts`: la unidad de siete palabras por minuto, los golpes de
  FV (··–· ···–) con sus huecos, las dos veces con el hueco de palabra, y el
  turno: espera a la boca, se corta y vuelve una vez, caduca y se pisa.
- `flight/seguir-la-aguja.test.ts`: **un piloto de prueba que vuela el
  ejercicio con la radio de verdad** (`leerAdf`) y un avión de cinemática —la
  velocidad de la avioneta, giros de régimen estándar como mucho y el viento
  sumado—, de Fuerteventura a FV. Con el alisio de costado, la curva del perro
  sale, hacia el sudoeste, y se acaba al pasar; sin viento, la estela sale
  recta y también se acaba; quien apunta al viento cuando se le pide oye el
  «así» y llega antes; con el reactor a 250 kt la curva es menor, y sale. Y
  dónde se ofrece y dónde empieza.
- `scripts/ver-seguir-la-aguja.mjs`: el mismo vuelo en el juego, con la tecla
  8, el morse y el automático siguiendo la aguja, con y sin viento, y sus
  capturas. Con el modelo de vuelo de verdad y la avioneta, a 11,6 millas de
  FV y a 948 m: con el alisio la estela se aparta 1.454 m de la recta (un 7 %)
  y en calma 91 (un 0,4 %), y en los dos se cierra al pasar, con la aguja a
  111° y a 180°. Y dos cosas que salieron ahí y se arreglaron: el plano ancho
  enseñaba el archipiélago entero y la estela era una raya de quince píxeles
  —con la estela puesta encuadra la casa y la estela (`camposConEstela`)—, y
  el depósito, cargado para el vuelo de casa a casa, declaraba «minimum fuel»
  a mitad de la curva: suma tres veces el tramo a lo que se quema esperando.

### Propuesta para la tanda siguiente: «¿En qué radial estoy?»

El peldaño del VOR, en el mismo marco: `escena: "radio"`, el peldaño de
cabina, los campos con VOR (`radioDeSalida(oaci).nav`).

- **Dónde empieza**: a unas quince millas del VOR del campo, en un radial
  redondo que no sea el de la pista —el 060 de FTV, por ejemplo—, con el
  morro de través al radial: así girar el avión no mueve la aguja, que es
  justo la lección.
- **Primero, identificar**, como en la aguja: la NAV vacía, sintonizar y oír
  el morse. Después, **girar el OBS hasta centrar la aguja con FROM**
  (9 y 0, o la ventanilla CRS): con `leerNav`, el suceso «centrada» es la
  desviación por debajo de un punto (dos grados) con FROM, y la instructora
  dice que ese número es el radial en que estás, lo mires como lo mires. Para
  verlo, que gire el avión noventa grados: la aguja no se mueve.
- **Luego, a la estación por ese radial**: girar el OBS ciento ochenta, TO,
  volar con la aguja centrada (con el alisio, otra vez la corrección de
  viento, ahora con una aguja que sí la dice), y **pasar**: la bandera en el
  cono de confusión y el FROM al otro lado son el final.
- **Frases**: identificar, girar el OBS, «ese es tu radial», girar el avión y
  ver que no se mueve, TO y el paso. Las cifras se escriben, no se dicen.
- **Prueba de mesa** con el mismo piloto de cinemática y `leerNav`: que el
  OBS que centra la aguja es el radial de la cuenta (±1°), que girar el avión
  no la mueve, y que al pasar sale la bandera y luego el FROM.

## Enmienda H26c (17-11-2026): «¿En qué radial estoy?»

La propuesta de arriba, hecha, y lo que cambió al hacerla.

`flight/en-que-radial-estoy.ts`, otra entrada de `EJERCICIOS` —`radial`, con
`escena: "radio"` y su `colocacion` propia—, con su ficha en el hangar (el
VOR visto desde arriba con sus radiales como los rayos de una rueda, uno
marcado, y el avión de través encima con la flecha del cuarto de vuelta) y la
misma puerta que la aguja: el hangar, `?ejercicio=radial`, la presentación
antes y el panel del final con la traza.

- **Dónde se ofrece**: en el peldaño de cabina, en todo avión con NAV —no el
  biplano— y en todo campo con VOR (`dondeVale` con `radioDeSalida(oaci).nav`):
  FTV en Fuerteventura, que es donde se pensó y donde lo vuela el banco, y
  también TFN en Los Rodeos, TFS, GDV, LTE, LGM, VAS, VES, VEN… Se vende al
  mundo: el campo es el ejemplo.
- **El viento, el del sitio**, como la aguja (`main.ts` ya lo hacía para toda
  `escena: "radio"`).
- **Dónde empieza** (`colocacionDelRadial`): en un radial redondo, de diez en
  diez y en magnético con el norte de la estación, **de costado al viento**,
  del lado más bajo de los dos —en Fuerteventura, el 120 de FTV, sobre el
  mar; el 300 es la isla—. Así la vuelta a la radio pide otra vez corregir el
  viento, ahora con una barra que dice si se acierta. Con el morro de través al
  radial, del lado que va contra el viento, a tres mil pies sobre la pista o
  mil por encima de lo más alto del camino. **A ocho minutos**, entre doce y
  treinta millas, y no a seis como la aguja ni a las quince de la propuesta a
  ojo: al girar noventa grados el avión no gira en el sitio, describe un
  cuarto de círculo, y visto desde la radio eso es un cambio de radial de su
  radio de viraje partido por la distancia. Con la avioneta a régimen estándar
  son 1.146 m: a seis minutos, tres grados; a ocho, 2,3. La barra tiene que
  quedarse casi quieta para que se vea que el rumbo no la mueve.
- **La NAV empieza vacía** (`RadioDeCabina.quitar`) y **el OBS veinte grados
  apartado** del radial, con FROM y la barra a tope: veinte toques la traen al
  centro. El ADF se deja como lo pone la salida.
- **La barra, no la aguja**: la propuesta pedía «la desviación por debajo de
  un punto (dos grados)», y el punto del VOR en este juego son cinco grados
  (`ESCALA_VOR`, a tope a diez, dos puntos). **Centrada es menos de un grado**,
  con FROM y sin bandera (`CENTRADA`): una décima de la escala, que en la
  pantalla ya es el centro, y con el OBS de grado en grado siempre hay un
  número que cae dentro. Con dos, el piloto de prueba se paraba en el borde,
  grado y medio antes del radial de verdad, porque el avión va cruzando
  radiales —de través, a ocho minutos, uno cada diez segundos—.
- **Lo que pasa**, en sucesos y con la tarjeta (el CDI dibujado: la barra a un
  lado, centrada con FROM o centrada con TO, el mismo de la pantalla) y la
  instructora: presentar; a los catorce segundos, si la NAV sigue sin el VOR,
  «poné el VOR en la NAV», una vez y otra solo si se quita; al acabar su morse,
  «¿oíste los pitidos?» y girar el OBS; **centrada**, con el sonido del logro:
  «el número del OBS es tu radial», y girar el avión un cuarto de vuelta;
  **el giro**, cuando el morro ha girado ochenta grados desde que se centró:
  «la barra casi no se movió: lo poquito que se mueve es lo que avanzaste, no
  lo que giraste», que es verdad en los dos casos; nueve segundos después,
  **a la radio**: el OBS media vuelta hasta TO y la barra en el centro; y **la
  pasada**: TO y FROM se dan la vuelta a menos de tres millas de la radio,
  con la bandera antes —la del cono de encima, o la de través si se pasa a un
  lado—. Ahí se acaba, con el sonido del logro y el panel del final. Las
  cifras no se dicen: el radial se lee en el OBS.
- **Nadie suspende**: quien va a la radio con FROM, siguiendo la barra del HSI
  con la flecha a la cola, también pasa, y la frase del paso vale igual («TO y
  FROM se dan vuelta»).
- **Las frases**, siete, genéricas: sin el nombre del VOR ni el número del
  radial. Sin grabar: al final de `scripts/frases-para-grabar.mjs`
  (`DEL_RADIAL`); hasta entonces, la tarjeta y su texto.

### La rueda del OBS sigue girando

Volver a la radio por el radial en que se está es media vuelta del OBS, y de
grado en grado eran ciento ochenta toques: en la tablet, imposible. Una rueda
de verdad se hace girar seguido. Ahora **la tecla apretada repite** el 9 y el
0 al ritmo del teclado —lo demás sigue siendo un toque, una acción— y **el
dedo puesto en una mitad de la ventanilla CRS** o del direccional, quieto
medio segundo, sigue girando a veinte grados por segundo hasta que se suelta
(`Hud`, el mando de la radio). Un toque sigue siendo un grado.

### Lo que se prueba

- `flight/en-que-radial-estoy.test.ts`: **un piloto de prueba con la radio de
  verdad** (`leerNav`) y un avión de cinemática, en Fuerteventura con FTV:
  dónde se ofrece; que la salida es el 120 y que el radial que marca la radio
  allí es ese, a menos de medio grado, con el OBS en el 100, FROM y la barra a
  tope, el morro de través y contra el viento; que **girar en el sitio no
  cambia nada** —veinticuatro rumbos en un punto, el mismo radial, la misma
  barra y el mismo TO/FROM—; y el vuelo entero: el OBS que centra la barra
  está a menos de un grado del radial de la cuenta, hecha sin `leerNav`; girar
  un cuarto de vuelta mueve la barra 1,8° con la avioneta y 2,4° con el
  reactor a doscientos cincuenta nudos desde treinta millas; y al pasar sale
  la bandera y TO pasa a FROM. En calma, igual; con FROM, FROM pasa a TO y
  también se acaba.
- `scripts/ver-en-que-radial-estoy.mjs`: el mismo vuelo en el juego, con las
  teclas de quien juega —el 7, el morse, el 9 y el 0 de toque en toque, el
  automático para el cuarto de vuelta y la tecla apretada para la media
  vuelta— y sus capturas. Con el modelo de vuelo de verdad y la avioneta,
  con el alisio: empieza a 15,6 millas de FTV y a 948 m, en el 120, con la
  NAV vacía y el OBS en el 100; el 7 pone FTV a la primera y su morse la
  identifica; la barra sale a tope con FROM (−18,9°) y se centra con el OBS
  en el 118, con la radio marcando el 118,75 —el avión ha cruzado radiales
  mientras se giraba la rueda, que es lo que se quería—; el cuarto de vuelta
  la mueve 1,76° con el morro girado ochenta grados (del 118,8 al 117,0); la
  tecla apretada lleva el OBS al 298 y dice TO; y con el reloj por ocho llega
  a FTV, sale la bandera encima y se cierra con FROM. Doce de doce, con la
  Intel por ANGLE. Lo que no ha volado el banco: la calma
  (`OGA_VIENTO=000/0`) y un reactor, que solo están en la prueba de mesa.

### Propuesta para la tanda siguiente: «Interceptar un radial»

El tercero de la lista de arriba, en el mismo marco: `escena: "radio"`, el
peldaño de cabina, los campos con VOR, el viento del sitio.

- **Qué se pide**: salir por un radial que no es el que se tiene debajo —el
  número escrito en la tarjeta, «R-094 TFN», que la voz no dice—, como pide
  una salida publicada. Sirve el de una SID transcrita del campo si la hay
  (TFN, LTE…), y si no, uno redondo de costado al viento, como aquí.
- **Dónde empieza**: a cinco millas de la radio, alejándose, con el morro a
  cuarenta y cinco grados del radial pedido, que es el ángulo de cortada de
  manual, y el OBS ya en otro curso: lo primero es ponerlo en el pedido, con
  la rueda que ahora gira seguida.
- **Lo que pasa**: «la barra está a tope: el radial queda de ese lado»; **se
  despega del tope** (la desviación baja de diez grados): «ya se mueve:
  empezá a virar antes de que llegue al centro»; y **establecido**, la barra a
  menos de un grado veinte segundos con el morro a menos de quince del curso.
  Con el viento de costado, el morro queda apartado del curso lo que pide el
  viento, y la instructora lo señala como en la aguja. Si se pasa al otro
  lado, se ve la barra cruzar, y se vuelve: nadie suspende.
- **Se juzga** con `leerNav` —la desviación y su ritmo— y el rumbo, sin más
  estado, como los dos de antes. La anticipación es lo que hay que medir: con
  la avioneta a régimen estándar, el viraje de cuarenta y cinco grados se
  acerca al radial unos trescientos cuarenta metros —el radio de viraje por
  uno menos el coseno de cuarenta y cinco—, y a cinco millas eso son dos
  grados de barra.
- **Prueba de mesa** con el mismo piloto de cinemática: que quien vira al
  despegarse la barra queda establecido sin pasarse más de un punto; que
  quien vira tarde cruza y vuelve, y también acaba; y que con el viento de
  costado el morro establecido no es el curso.

## Enmienda H26d (17-11-2026): tres flecos de H26a y H26b

### El viento de la pantalla de navegación en 3D, arriba

En la cabina en 3D la cifra del viento iba abajo a la izquierda, en la misma
raya que las millas al destino, y «039/12» se pintaba encima de «GCTS 79.1
NM». Con la cifra a la izquierda y las millas creciendo hacia la derecha no
había anchura que no se pisara, así que se cambió el sitio y no el tamaño:
**arriba a la izquierda, debajo de la GS, la cifra y debajo la flecha**, que
es donde los pone la pantalla de navegación de un Boeing y donde ya iba la
cifra en el cuadro plano. Las dos superficies dicen lo mismo en el mismo
sitio. Y en el de cristal, el modo del TCAS y las millas se cuentan desde
donde acaba la franja de motor: desde el borde caían encima de las luces del
tren. Mirado con los textos más largos que pueden salir —cuatro letras con
tres cifras de millas y un viento de tres cifras— en el JAZ 90 y el JAZ 60,
en tierra y en el aire.

### El subtítulo, encima de la pantalla grande del teléfono

Con una pantalla del cuadro en grande en el teléfono tumbado, el subtítulo
tapaba parte de ella: arriba el rumbo, y bajado al sitio de las losas, la
rosa y la radio. La pantalla grande deja ahora una fila para él
(`--fila-del-subtitulo` en `style.css`): mide una línea de subtítulo menos y
el subtítulo se apoya en su borde de arriba; si no cabe en una línea, crece
hacia arriba, sobre la fila de los botones, que deja pasar el toque; con dos
líneas roza el borde de abajo de los botones redondos de la barra, como ya
pasaba sin pantalla grande con los de la derecha. **Lo que cuesta**: la
pantalla grande mide una línea menos, de 234 a 200 px de alto en 844 × 390 y
de 174 a 140 en 864 × 330, que es el teléfono con la barra del navegador.
`npm run carteles` mira ya que el subtítulo no pise la pantalla grande entera,
no solo el «TCAS STBY».

### Cada ejercicio en el aire, con el combustible de su vuelo

El arreglo de la aguja (sumar tres veces su tramo al depósito) se ha llevado a
la raíz: **un ejercicio que empieza en el aire carga lo de su vuelo**, de donde
empieza hasta casa, con el alternativo de casa, la maniobra y la reserva, que
son las cuatro partidas de `cargaParaElPlan` con la salida donde de verdad
empieza el vuelo (`cargaDelEjercicio` en `flight/combustible.ts`). Se cargaba
el tramo desde casa, que sin destino es un vuelo local: en la avioneta, unos
minutos por encima de lo que dispara «minimum fuel».

- **La tormenta** no llegaba a pedirlo: solo se ofrece a los de turbina, y en
  ellos el vuelo local ya lleva de sobra para ochenta millas (el JAZ 60 sale
  con 583 kg, y «minimum fuel» es por debajo de 178 más lo que queda hasta
  tocar). Ahora lleva sus ochenta millas y el alternativo.
- **La aguja** sí, en los de pistón: la avioneta salía con 32 kg y la llamada
  salta por debajo de 30 más lo que falta, que a seis minutos de la radio ya
  no llegaba.
- **El planeo, el de un motor, la despresurización y la autorrotación** cargan
  igual; los de la pista (V1 y el simulador) salen de casa con su tramo, como
  cualquier vuelo.

Lo prueba `flight/combustible-del-ejercicio.test.ts`, que vuela en papel la
aguja y la tormenta en cada avión al que se le ofrecen, en un campo sin
alternativo, con un tercio más de camino por lo que el ejercicio vuela de más
y quemando lo más de la cuenta, sin que se llame nunca a la torre. Y los dos
bancos, `ver-seguir-la-aguja.mjs` y `verificar-tormenta.mjs`, miran ya que no
se haya dicho «minimum fuel»: rodeando la tormenta en Pettirossi con el JAZ 50,
el turbohélice más lento al que se le ofrece, acaba con 769 kg y sin llamada.

## Enmienda H28b (17-11-2026): los dos flecos que H26d dejó vistos

### El subtítulo, con el ancho que de verdad tiene

El subtítulo se centraba con `left: 50%` y el `translate` de centrar, y así el
navegador le daba para maquetar el ancho que queda a la derecha de `left`:
media pantalla. El `max-width` de casi toda nunca llegaba a usarse. En el
teléfono de 844 × 390 una frase larga de la instructora («Nos queda justo, así
que avisamos a la torre: combustible mínimo…») se partía a 422 px en tres
líneas, y con la pantalla puesta en grande esas tres líneas subían hasta media
altura de los botones redondos de la barra.

Ahora lleva **los dos bordes puestos, el ancho de lo que lleva escrito
(`fit-content`) y márgenes automáticos**, que lo centran entre ellos sin
quitarle ancho. Cada sitio pone sus bordes:

- **En el teléfono apaisado y en cabina**, apartado de los dos lados lo que
  ocupan los botones redondos de la izquierda —la cámara, la pausa y, antes de
  arrancar, la vuelta al avión y el parte—, que el HUD mide y escribe en
  `--vistas-derecha`. Así sigue centrado sobre el avión y sobre la pantalla
  grande, y no se pone encima de ningún botón redondo. A la derecha pasa por
  delante de las losas de mando —el tren, los aerofrenos, la tarjeta del
  destino—, que dejan pasar el toque, como ya pasaba con el tren.
- **En la tablet y el portátil**, en el hueco que deja el rincón a su
  izquierda, como estaba: allí el rincón ya le dejaba más de media pantalla.

Medido con la frase de arriba, antes de arrancar, que es cuando la columna de
la izquierda es más ancha: en 844 × 390 pasa de 422 px y tres líneas a 527 y
dos; en vuelo, sin los dos botones de antes de arrancar, a 728; en 864 × 330,
de 432 a 547; en cabina de la tablet, de 512 a 648. `npm run carteles` lo mira
en cada teléfono: más de medio ancho, centrado y sin tapar ningún botón
redondo. El peldaño de los pequeños no lleva subtítulos (`.hud--sin-letras`) y
ahí no se mira.

**Lo que cuesta**: en vuelo, con dos líneas, pasa por delante de las tres
losas de mando de la derecha —el tren, los aerofrenos y los flaps— y de la
tarjeta del destino, que se siguen tocando a través de él; antes tapaba solo
el tren, pero con tres líneas. Si se prefiere no tapar ninguna, el subtítulo
tendría que ir en el hueco entre las dos columnas, que no está centrado sobre
el avión y antes de arrancar no es más ancho que la media pantalla de antes.

**Lo que queda**: con la pantalla en grande, una frase que no cabe en una línea
sigue creciendo hacia arriba y, en dos, roza unos nueve píxeles el borde de
abajo de los botones redondos de la barra; antes, en tres, los tapaba hasta la
mitad. Darle dos líneas de fila le quitaría otra línea a la pantalla grande,
que en 864 × 330 ya mide 140 px, y eso es una decisión de diseño, no un
arreglo. **De pie y con el dedo** no se ve: lo tapa el cartel de girar la
pantalla (`.gira`).

### El vuelo local de los de pistón y el «minimum fuel»

H26d calculó que la carga de un vuelo local de la avioneta quedaba a unos
minutos del umbral de «minimum fuel». Volado en la mesa, avión por avión,
con la maniobra a lo más de la cuenta y a cinco minutos de tocar: la avioneta
lo pedía **a los siete minutos de despegar**, el JAZ 25 a los seis y el JAZ 40
a los diecisiete. Los de turbina, pasada la media hora larga.

La causa estaba en la carga, y en la vara con la que se medía la reserva. Un
vuelo local carga la media hora de maniobra y los cuarenta y cinco minutos de
reserva, **los dos al consumo de crucero**. En un reactor esos cuarenta y
cinco minutos son dos o tres veces la reserva final —su crucero gasta mucho
más que esperar— y ya llevan dentro la contingencia y lo de un cambio. En los
de pistón eran la reserva final de la ley y nada más; en la avioneta, ni eso,
porque su crucero gasta un poco menos que esperar. Y «minimum fuel» salta con
la reserva final más un margen: un vuelo local de pistón despegaba con el aviso
a la vuelta de la esquina.

Lo de verdad: un despacho carga el viaje, la contingencia —el 5 % del viaje,
nunca menos de cinco minutos esperando (Anexo 6, parte I, 4.3.6.3 c)—, el
alternativo y la reserva final; y «minimum fuel» se declara cuando cualquier
cambio dejaría aterrizar con menos de la reserva final (Anexo 6, 4.3.7.2.2;
Doc 4444; AIM 5-5-15). Así que:

- **El margen del aviso es lo que cuesta un cambio**, un cuarto de hora de
  espera para todos (`LO_QUE_CUESTA_UN_CAMBIO`). Era media reserva final, que
  en un avión de turbina es ese mismo cuarto de hora —no cambia nada— y en
  uno de pistón, veintidós minutos y medio: un cambio no cuesta más minutos en
  una avioneta que en un reactor.
- **La reserva que se carga nunca es menos que la reserva final, lo que cuesta
  un cambio y la contingencia**, contados como los cuenta el aviso. En los de
  turbina, en cada ruta del juego, ganan los cuarenta y cinco minutos a crucero
  y la carga es la de siempre; en los de pistón sube: la avioneta, de 32,5 a
  42,2 kg en local; el JAZ 25, de 108 a 142; el JAZ 40, de 62,5 a 73.
- **Y con el tope del peso máximo al despegue**, además del depósito
  (`loQueDejaElPeso`): con la reserva nueva, la avioneta de Mariscal
  Estigarribia a Asunción, con su alternativo de vuelta a casa —475 km cada
  tramo—, pedía más de lo que cabe en el peso. Sale con 148 kg: el viaje, la
  maniobra y la reserva final, sin lo de un cambio. Con la carga de antes, en
  esa ruta, el aviso saltaba ya en la cabecera.

Ahora, volando en local a lo más de la cuenta y a cinco minutos de tocar, la
avioneta lo pide a los 29 minutos, el JAZ 25 a los 29 y el JAZ 40 a los 30:
cuando se ha alargado lo planeado y se ha comido la contingencia, que es lo que
quiere decir la llamada. Un vuelo bien preparado que va como se planeó no lo
pide nunca. Lo prueba `flight/combustible-del-vuelo-local.test.ts`, que vuela
en papel la media hora de cada avión sin llamada, el vuelo que se alarga con
«minimum fuel» un cuarto de hora antes del MAYDAY, la carga de antes con su
llamada a los pocos minutos, y los de turbina con la carga de siempre en cada
ruta del juego.

## Enmienda H26e (17-11-2026): «Interceptar un radial»

La propuesta de arriba, hecha, y lo que cambió al hacerla.

`flight/interceptar-un-radial.ts`, otra entrada de `EJERCICIOS` —`interceptar`,
con `escena: "radio"` y su `colocacion` propia—, con su ficha en el hangar
(«Salí por un radial»: el VOR con un solo radial saliendo, la estela que baja
cortándolo y se curva antes de llegar, y el avión ya encima) y la misma
puerta que los otros dos: el hangar, `?ejercicio=interceptar`, la
presentación antes y el panel del final con la traza.

- **Dónde se ofrece**: donde «¿En qué radial estoy?» —el peldaño de cabina,
  todo avión con NAV y todo campo con VOR—. Fuerteventura es donde lo vuela
  el banco; Los Rodeos, Tenerife Sur, Gran Canaria, Lanzarote o Asunción
  valen igual.
- **Qué radial se pide**: uno redondo **de costado al viento**, del lado más
  bajo, con la misma cuenta que el radial de antes, que ahora es una pieza
  suelta (`radialDeCostadoAlViento`): en Fuerteventura, el 120 de FTV. La
  propuesta pedía el de una salida transcrita si la había, y no sirven: las
  dos que cortan un radial, las de Los Rodeos, **siguen el R-303 y el R-097
  de TFN hacia la radio** y los cortan a noventa grados largos (rumbo 028
  para el 303, rumbo 007 para el 097), y las que salen por un radial —el
  R-118 de LRO, el R-037 de LTE— lo hacen desde la pista, sin cortarlo. Ni
  una es «salir por un radial cortándolo a cuarenta y cinco», y la mayoría
  de los campos con VOR no tienen ninguna. **El número se escribe y no se
  dice**: «Salí por el R-120 FTV» en la tarjeta, delante de la frase, como
  en una carta de salida; la voz es genérica y vale en todo campo.
- **Dónde empieza** (`colocacionDelCorte`): a cinco millas de la radio —o a
  dos minutos y medio de vuelo si eso es más, que a doscientos cincuenta
  nudos cinco millas son un suspiro: el reactor, a diez y media—,
  alejándose, **treinta grados apartado del radial pedido y del lado del
  que viene el viento**, con el morro a cuarenta y cinco grados del curso,
  cortándolo. En Fuerteventura, en el 090 de FTV, al norte del 120. Del lado
  del viento a propósito: el aire empuja hacia el radial, el viraje para
  quedarse es la cortada más la corrección —cincuenta y cinco grados con la
  avioneta— y quien no anticipa se pasa de verdad. Treinta grados porque con
  el OBS en el pedido la barra sale a tope y queda casi un minuto, cortando,
  hasta que se despega: lo que hace falta para oír qué se pide y girar la
  rueda. A tres mil pies sobre la pista, o mil por encima de lo más alto del
  camino.
- **La NAV empieza con el VOR puesto** y el OBS en el radial de debajo, con la
  barra en el centro, como lo deja la radio al salir. Identificar ya lo
  enseñaron los dos de antes; si se quita el VOR, la instructora lo pide con
  la frase de «¿En qué radial estoy?», una vez por cada vez que se quita.
- **Lo que pasa**, en sucesos y con la tarjeta (el CDI dibujado: a tope,
  viniendo, cruzado al otro lado o centrado) y la instructora: presentar y
  pedir el número en el OBS; **a tope**, con el OBS en el pedido: «el radial
  queda de ese lado, seguí cortándolo de costado»; **se despega** (la barra
  por debajo de diez grados, `A_TOPE`): «empezá a virar ahora, de a poquito,
  antes de que llegue al centro»; **pasado**, si la barra cruza al otro lado
  más de un grado: «te pasaste un poquito, volvé de a poco», una vez y nunca
  más, que repetirlo sería reñir; y **establecido**: la barra a menos de un
  grado veinte segundos seguidos con el morro a menos de quince del curso,
  con el sonido del logro y el panel del final. Si el OBS se pone tarde, con
  la barra ya despegada, no dice «a tope» y sigue por «se despega». Nadie
  suspende: quien se pasa vuelve, y acaba igual.
- **Pasarse es un grado**, no el punto que pedía la propuesta. Con la
  avioneta a régimen estándar, el viraje de cuarenta y cinco se come el radio
  de viraje por uno menos el coseno: 336 m (`anticipacion`, la prueba lo
  fija); con el alisio y la corrección, cincuenta y cinco grados y la deriva
  mientras gira. Pero a seis millas eso son dos grados de barra, y quien vira
  con la barra ya en el centro se pasa dos grados la avioneta y uno y medio
  largo el reactor, que empieza más lejos: con un punto —cinco grados— nadie
  se pasaría nunca. Un grado es salir del centro (`EN_EL_CENTRO`) por el otro
  lado, y es lo que se ve.
- **La corrección de viento es el morro contra el camino**, no contra el
  curso. Medido como lo pedía la propuesta —el morro apartado del curso—, en
  calma salía casi cuatro grados: quien aún se está acercando a la barra lleva
  el morro hacia ella, y eso no es viento. El ejercicio promedia el morro en
  los veinte segundos y le resta hacia dónde fue el avión de verdad, que es la
  definición de la deriva. Con tres grados o más
  (`CORRIGE`), la frase del final señala el morro: «no apunta justo al número
  del OBS, apunta un poco contra el viento»; con menos, otra sin viento. **Un
  suceso, una voz**: son dos frases y se dice una.
- **Las frases**, seis, genéricas, sin el nombre del VOR ni el número del
  radial: al final de `scripts/frases-para-grabar.mjs` (`DEL_CORTE`), y
  hasta grabarlas, la tarjeta y su texto. La rueda del OBS suena con el clic
  de la carta, como desde 99fb22b2.

### Lo que se prueba

- `flight/interceptar-un-radial.test.ts`: **un piloto de prueba con la radio
  de verdad** (`leerNav`) y un avión de cinemática —la verdadera, el viento
  sumado y tres grados por segundo como mucho—, en Fuerteventura con FTV.
  Dónde se ofrece; que se pide el 120, que se empieza en el 090 a cinco
  millas, cortándolo a cuarenta y cinco y alejándose; que con el OBS en el
  090 la barra está en el centro y en el 120 a tope con FROM; que en calma se
  empieza del lado de más grados y el reactor más lejos; y lo que se come el
  viraje, 336 m. Y el vuelo: **quien vira en cuanto la barra se despega**
  —el rumbo del curso más cuatro veces y media la barra, que a tope son los
  cuarenta y cinco de la cortada— y apunta contra el viento lo que sabe que
  pide, **no la cruza** (cero grados), queda a menos de un grado del 120 de
  verdad y con el morro 9,9° contra el alisio (4,6° el reactor); **quien
  espera a ver la barra en el centro** se pasa 2,1° la avioneta y 1,7° el
  reactor, oye «te pasaste», vuelve y acaba igual; en calma, la corrección
  sale en cero; y el OBS puesto tarde no dice «a tope».
- `scripts/ver-interceptar-un-radial.mjs`: el mismo vuelo en el juego, con
  las teclas de quien juega —el 0 apretado para llevar el OBS al pedido, el
  automático para la cortada y el viraje, que quita lo que ve que el viento
  lo deriva— y sus capturas, con el reloj por cuatro desde que el OBS está
  puesto. Con el modelo de vuelo de verdad y la avioneta, con el alisio:
  empieza a 5,0 millas de FTV y a 948 m, en el 090 con el OBS en el 090 y la
  barra casi en el centro (−1,2°), la tarjeta escribe «R-120 FTV» y el
  morro va a cuarenta y cinco grados del curso; el 0 apretado lleva el OBS
  al 120 y la barra sale a tope con FROM (28,5°); se despega a 5,6 millas;
  **quien vira desde ahí no la cruza** (0,00°) y queda establecido en el
  119,6; **quien espera a verla en el centro se pasa 2,8°**, oye «te
  pasaste», vuelve y queda en el 120,3, con la frase del morro contra el
  viento. En calma (`OGA_VIENTO=000/0`) pide el 090 desde el 120, se despega
  a 5,9 millas, no la cruza, queda en el 90,5 y la frase del final no habla
  de viento. Diez de diez, once de once y diez de once, con la Intel por
  ANGLE: la que faltaba era del banco y no del juego, y dice lo mismo que la
  corrección de arriba. En calma, el morro iba 4,2° apartado del curso al
  cerrar, con la barra aún a medio grado: era el piloto acercándose, y el
  ejercicio, que mide contra el camino, ya había elegido la frase sin
  viento. El banco ahora mira lo mismo que el ejercicio, pero esa versión
  no ha volado todavía: la cola del navegador estaba llena, y queda para la
  ronda de cierre. Lo que no ha volado el banco: un reactor, que solo está en
  la prueba de mesa.

### Propuesta para la tanda siguiente: «Dos radiales que se cortan»

El cuarto de la lista de arriba y el cierre del peldaño 5 que pide #51:
**saber dónde se está sin ver nada**, con dos VOR. En el mismo marco:
`escena: "radio"`, el peldaño de cabina, el viento del sitio.

- **Dónde se ofrece**: en un campo con VOR que tenga **otro al alcance** y
  bien abierto, porque el corte de dos rectas casi paralelas no dice nada:
  `dondeVale` busca, entre las emisoras, otro VOR a menos de la línea de
  vista desde la altura del ejercicio y con los dos radiales cortándose
  entre sesenta y ciento veinte grados en algún sitio sobre lo bajo. En
  Fuerteventura, FTV y LTE, en Lanzarote, a treinta y cuatro millas; en
  Tenerife Sur, TFS y TFN, a treinta y nueve; en Gran Canaria, GDV y LPC, a
  quince de norte a sur, que se cortan bien al este y al oeste de la isla.
  TFN y LRO, a cinco millas y media una de otra, se cortan mal casi en todas
  partes: es justo lo que hay que enseñar a no hacer. Donde no haya pareja,
  no se ofrece.
- **Una sola NAV**, la que lleva el juego: centrar la barra con FROM en el
  primero y leer su radial —lo que enseñó «¿En qué radial estoy?»—, poner el
  segundo, oír su morse, centrar otra vez y leer el otro. **La carta lo
  dibuja**: cada radial leído, una raya de lápiz en el plano en vuelo desde su
  estación (`Mapa.ponerEstela` ya pinta a lápiz encima del papel), y donde se
  cortan, la cruz. La instructora: «ahí estás».
- **La lección de verdad**: entre leer uno y leer otro el avión vuela, y la
  cruz llega tarde. A cien nudos, un minuto entre los dos son casi dos
  millas. Se juzga la cruz contra dónde estaba el avión al leer el segundo,
  y se cuenta: «la próxima, leelos rápido, o volá hacia uno de los dos, que
  así ese radial no cambia».
- **Frases**: presentar, el primero centrado, poner el segundo, el segundo
  centrado, la cruz, y la de leerlos rápido si la cruz sale lejos. Las cifras,
  en la carta.
- **Prueba de mesa** con el mismo piloto de cinemática y `leerNav` en los
  dos: que la cruz cae a menos de media milla del avión si los dos se leen en
  el mismo instante; que leerlos con un minuto de vuelo entre medias la
  aparta lo que se voló; y que con dos estaciones a cinco millas y el avión
  en su prolongación el corte no se ofrece.

## Enmienda H28c (17-11-2026): el aviso y la lámpara, con el ancho que tienen

H28b vio dos cosas más con el mismo mal que el subtítulo y las dejó: el aviso
(`.aviso-hud`, la pérdida y el suelo) y la lámpara de la torre (`.torre`)
seguían centrados con `left: 50%` y el `translate`. Y en el portátil el
subtítulo de la vista de fuera tapaba la pausa y los botones de antes de
arrancar, que ya pasaba antes de H28b.

### Lo que se cambió

- **El aviso**, como el subtítulo: los dos bordes puestos, `fit-content` y
  márgenes automáticos. De borde a borde en la tablet y el portátil, donde ahí
  abajo no llega nada por los lados; en el teléfono y en cabina, apartado de
  los dos lados lo que ocupan los botones redondos de la izquierda
  (`--vistas-derecha`), para seguir en el medio. Y por delante de la lámpara
  (z 9 contra 8): si se tocan, el aviso no se queda detrás.
- **En cabina, el aviso se apoya encima del subtítulo**, que va al 32 %, con la
  flecha al lado del texto: colgado del 22 % y con la flecha encima, bajaba
  hasta la fila del subtítulo y se montaban.
- **Con la pantalla en grande del teléfono, una fila para el aviso** entre la
  pantalla y el subtítulo: se apoyaba en lo que miden las losas y caía en
  mitad de la pantalla de vuelo, encima de la cinta que lo explica. Mientras
  dura el aviso la pantalla mide esa fila menos.
- **La lámpara**, con los dos bordes en su hueco: de la columna de la pausa al
  rincón y, sin rincón —en el teléfono y en cabina—, de los dos lados lo mismo.
- **El subtítulo de fuera en el portátil**, a la derecha de la columna de la
  pausa. Esa columna y la lámpara se apartan **solo donde la columna baja
  hasta su fila**: el HUD escribe hasta dónde bajan sus botones
  (`--vistas-bajan`) y la hoja lo compara con `--arriba-alto` en
  `--aparte-arriba`. Apartarse siempre dejaba, en la tablet de 900 × 600, donde
  la barra va en dos filas y la columna acaba más arriba, la orden de la torre
  en ocho líneas.
- **La lámpara baja lo que el subtítulo ocupa**, no una línea contada a mano
  (36 px): el HUD lo mide en `--subtitulo-alto` (`medirElSubtitulo`). En
  cabina, cero salvo la altura en grande, que ahí es la única que va arriba.
- **El botón de la versión nueva**, con el dedo, centrado igual.

La regla general va a DESIGN.md, §5: lo que lleva texto no se centra con
`left: 50%` y `translate`.

### Lo medido

Con lo más largo que llevan, encendidos a la vez: el aviso «Se rompió algo.
Volvemos al helipuerto…», la lámpara roja con dos aviones en la fila y
«JAZ 9021, mantenga fuera de pista 12, número tres para la salida», y el
subtítulo largo de la instructora. Antes → después:

- **La lámpara en el teléfono**: en 844 × 390, de 422 px y tres líneas a 527 y
  dos; en 780 × 360, de 390 y tres a 463 y dos; en 864 × 330, de 432 a 547.
- **El portátil de 1280 × 800**, de fuera: el subtítulo iba de 16 a 828 y tapaba
  la pausa, la vuelta al avión y el parte; ahora de 188 a 828, sin tocar
  ninguno. La lámpara, igual, y debajo del subtítulo: antes se montaba en su
  segunda línea.
- **La tablet de 900 × 600**, de fuera: la columna de la pausa acaba por
  encima del subtítulo y no se aparta de ella. La lámpara ya llenaba su hueco
  —468 px, tres líneas— y sigue así, pero debajo del subtítulo y no encima de
  su segunda línea. Igual en la de 1024 × 600.
- **El aviso** cabía ya en una línea en toda pantalla tumbada (de 351 a
  443 px). Se partía a media pantalla en una ventana de pie: en 600 × 900, dos
  líneas de 300 px; ahora una de 443.
- **En cabina**, el aviso ya no pisa el subtítulo en ninguna de las siete
  pantallas medidas; antes lo pisaba en las siete.
- **Con la pantalla en grande** (844, 780 y 864 de ancho), el aviso queda
  encima de la pantalla y no dentro.
- **El botón de la versión nueva**, de pie en 360 × 740: de 180 px y dos líneas
  a 197 y una, en las tres lenguas.

`npm run carteles` lo mira en cada pantalla, de fuera y en cabina
(`medirAvisoYLampara`): el aviso más largo en una línea, centrado, y uno que no
cabe pasando de media pantalla; la orden de la torre usando más de medio
hueco; y ninguno de los tres pisando a otro, a un botón redondo, al rincón ni
al instrumento que explica el aviso, ni quedando detrás de nada.

### Lo que no era del caso

En la hoja quedan otros `left: 50%` con `translate`, y no se parten: o tienen
el ancho puesto (`.cuadro`, `.a-inicio`, `.inicio__tarjeta`, `.kit__panel`,
`.ficha__nocabe`), o no llevan texto que se parta (la fila de pasos de
`.vuelta__lista` y la `.consola__barra`, botones de ancho fijo; las piezas de
los mandos, el asa, la pinza, la cruz del horizonte; la «N» de la rosa del
mapa), o van en una línea a la fuerza (`.cruz__no-explicar`, con `nowrap`). La
regla base de `.tutor` sigue con `left: 50%`, pero no la usa nadie: la pisa
`.hud .tutor` en todas las pantallas.

### Lo que queda

Medido, y sin arreglar en esta tanda. `npm run carteles` da 878 de 909: las
31 que fallan son todas de esta comprobación nueva y todas de piezas que se
tocan: la lámpara, el aviso y el subtítulo cuando coinciden los tres, la
lámpara con la tarjeta del rincón en cabina, y en cabina de la tablet de
1024 × 600 el aviso con los botones de la barra, como ya estaba. Ninguna de
ancho, ninguna del instrumento, y el aviso no queda detrás de nada en
ninguna. Se dejan fallando a propósito: dicen lo que hay.

- **En cabina no caben los tres encima de la visera** en una pantalla baja.
  Con lámpara, aviso y subtítulo a la vez, la lámpara y el aviso se tocan en
  seis de las siete pantallas (el aviso queda delante); la lámpara pisa la
  tarjeta de la orden del rincón y la del gas de la columna de mandos, como ya
  pisaba la primera; y en la tablet de 1024 × 600, donde la barra va en varias
  filas y la franja de arriba empieza por debajo del 32 %, la lámpara cae
  encima del subtítulo, que antes bajaba 36 píxeles y quedaba debajo. En las
  de 900 × 600 y 1024 × 600 el aviso de cabina sigue encima de los botones de
  la barra, como estaba. Resolverlo es decidir dónde va cada uno en cabina, no
  un ancho.
- **El subtítulo de cabina** (de H28b) pasa por encima del freno, de la
  tarjeta del gas y de la tarjeta de la orden: va de lado a lado apartado solo
  de la columna de la pausa.
- **En el teléfono más bajo** (780 × 360 y 864 × 330), de fuera, el aviso,
  que va encima de las losas, toca la última línea del subtítulo cuando éste
  ocupa dos o tres, y la lámpara, que baja con él, llega a la tarjeta del
  destino y a la palanca de pulgar. Antes también se tocaban.
- **Con la pantalla en grande**, la lámpara sigue encima de la pantalla, como
  antes, y el aviso pasa por delante de las losas del tren y los aerofrenos,
  que dejan pasar el toque.
- **De pie, en una ventana de 600 × 900 con ratón**, el rincón deja a la
  izquierda 204 px: el subtítulo va en siete líneas y la lámpara en las que
  pida lo más ancho que lleva, como antes. El aviso, ahora en una línea, pasa
  por delante del freno. Con el dedo, de pie, lo tapa todo el cartel de girar
  la pantalla, y ahí no se mira.

## Enmienda H26f (17-11-2026): lo que estorba en los ejercicios de radio

Volando «Interceptar un radial» se vieron cosas que no eran del ejercicio y
una tarjeta que decía lo contrario de lo que pasaba; y quedaba por mirar la
corrección de viento que H26e había medido de dos maneras.

### Lo que no es del ejercicio, callado

Durante todo el ejercicio salía «Andá a la pista» —la tarjeta de la fase «en
vuelo» de la lección de aterrizar, con su voz y su rótulo— y la torre contaba
el tráfico de otros: «hold short», «go around, runway occupied». Los demás
ejercicios en el aire no lo callan, y hacen bien: el planeo, el de un motor,
la despresurización, la tormenta y la autorrotación **acaban en la pista**, y
«andá a la pista», la torre y su frecuencia son parte de lo que se practica.
Los de radio se cierran en el aire, lejos de ella.

Así que `Ejercicio` lleva ahora `acabaEnElAire` —los tres de radio, y la
prueba mira que sean ellos y ninguno más— y `flight/lo-que-calla-el-ejercicio.ts`
dice qué se calla mientras dura uno de esos:

- **La fase del plan**: su tarjeta, su voz y su rótulo (`callada` en
  `avanzarPlan`). La fase se apunta igual, y al cerrarse el ejercicio no se
  vuelve a anunciar hasta que cambie. El tutor de la tecla también, aunque en
  el aire ya estaba apagado.
- **La torre hablándote a vos** (`hayTorreQueHable`). En un ejercicio
  contestaba porque una emergencia se declara a ella, y en estos no se declara
  nada. Con eso caen el relevo de frecuencia —«Seguí la aguja» empieza fuera
  de las diez millas de su zona y entra en ella siguiendo la aguja—, los
  permisos y la pista ocupada.
- **La frecuencia del campo** (`oirElCampo`), como en el modo inicio, que
  partía la conversación. Aquí además cortaba el morse, que se corta si empieza
  a hablar alguien, y oír el identificador es la mitad del ejercicio. El turno
  se sigue oyendo, que es lo que mueve el tráfico: sigue volando su circuito,
  en el mundo y en el TCAS, callado para quien hace el ejercicio.
- **Lo que se ve por la ventanilla**, abajo.

**La seguridad no pasa por aquí**: la máquina del avión, los avisos del
cuadro y la información de tráfico, que sin torre la da la instructora
(`comoSeDiceElTrafico`). Y al cerrarse el ejercicio vuelve todo: lo que se
vuele después ya es un vuelo.

Y una cosa más que salió al mirarlo: **la flecha de casa latía** saliendo por
el R-120 de FTV, que es alejarse mar adentro con la casa detrás, lo que
`flight/perdido.ts` llama perderse. `mirarSiSePerdio` dejaba fuera los
ejercicios de avería y la tormenta, escritos uno a uno antes de que hubiera
ejercicios de radio; ahora deja fuera cualquier ejercicio (`ejercicioDeHoy`),
que es lo que ya decía su comentario.

### La ventanilla, no durante el ejercicio

«A la izquierda, la Isla de Lobos» tapó la tarjeta del ejercicio a quien
viraba para coger el radial: la del paisaje lleva prioridad cero y entra en
cuanto la del ejercicio caduca. Esperar a que el ejercicio no hable no basta,
porque el ejercicio sigue mirando la barra aunque calle y su tarjeta es lo que
hay que tener delante. Es lo mismo que con la tormenta del ejercicio por
delante (`tormentaPorDelante`): **mientras dura, por la ventanilla no se
señala nada**. Un suceso, una voz, y el suceso es el ejercicio.

### El CDI de la tarjeta, del lado de la barra

Había un dibujo a tope con la barra a la izquierda, uno viniendo desde la
izquierda y uno pasado a la derecha. En Fuerteventura con el alisio la barra
de verdad sale a la derecha (+28,5°): la tarjeta decía «el radial queda de
ese lado» señalando el otro, y la de «te pasaste» llevaba la barra del lado
del que venía. En calma acertaba por casualidad.

Ahora cada uno va de los dos lados (`cdi-a-la-izquierda`, `cdi-a-la-derecha`,
`cdi-viniendo-de-la-…`, `cdi-pasada-a-la-…`) y `dibujoDelCdi` elige por el
signo de la desviación: la que marcaría la NAV con el VOR del ejercicio y el
curso de ahora (`elCdiDelEjercicio`, con `leerNav`), también con la NAV vacía
—en la presentación de «¿En qué radial estoy?», adonde se irá la barra al
ponerla— y, en la de «Interceptar», con el radial pedido aunque el OBS siga
en el de debajo. Se descartó un dibujo sin lado: la tarjeta dice «de ese
lado», y quien no lee solo tiene el dibujo para saber cuál. La barra a medio
camino es la misma viniendo que pasada, así que lleva debajo una flecha
pequeña hacia donde se mueve: hacia el centro, viene; hacia fuera, se pasó.

### La corrección de viento en el juego: nada que arreglar

H26e midió el morro corrigiendo el alisio 5,9° en el juego, contra unos nueve
de la cinemática, y 13,4° en la tirada del que se pasa. Las dos cifras eran
**el morro contra el curso en el instante de cerrar**, y en ese instante el
avión todavía no va por el curso: llega con la barra a medio grado, cerrando
de un lado —o volviendo del otro, el que se pasó—, y lo que el morro se
aparta del curso es la corrección más o menos lo que todavía corta.

Medido ahora como lo mide el ejercicio —la media del morro contra el camino
en los veinte segundos de establecido— y muestra a muestra contra lo que pide
el viento que de verdad sopla en el modelo de vuelo, sumado a la verdadera
por el morro: **el ejercicio −9,8°, el banco −9,8° y el viento −9,8°**, con
20,0 kt de costado a 117 kt de verdadera (el arcoseno de 20/117 son 9,8°), y
de −9,9 a −9,8 muestra a muestra. En el mismo cierre, el morro iba −9,8° del
camino y −5,9° del curso: es la cifra de H26e, y es la vara, no el viento. La
prueba de mesa, con la verdadera de su cinemática, da 9,9°. El viento del
juego, la medida del ejercicio y la frase que elige están bien; lo que estaba
mal era mirar contra el curso, y el banco ya no lo hace desde H26e.

### Lo que se prueba

- `flight/lo-que-calla-el-ejercicio.test.ts`: que los tres de radio acaban en
  el aire, y ninguno más; que mientras duran se calla la fase, la torre, la
  frecuencia y la ventanilla, y cerrados nada; que el planeo, el de un motor,
  la despresurización, la tormenta y la autorrotación, que acaban en la pista,
  no callan nada. Y, mirando el texto de `game.ts` como
  `torre-de-cada-vuelo.test.ts`, que la tarjeta de la fase, la torre, la
  frecuencia —sin dejar de oír el turno, que mueve el tráfico— y la ventanilla
  pasan por `loQueCalla`. Esa mitad, roja antes del arreglo: cuatro de cuatro.
- `ui/dibujos.test.ts`: que `dibujoDelCdi` pinta la barra del lado de la
  desviación —a tope, viniendo y pasada, con 28,5° y −28,7°, con seis y con
  cuatro décimas—, y la flecha hacia el centro viniendo, hacia fuera pasada y
  ninguna a tope.
- Los tres bancos de radio miran ya lo que no es del ejercicio
  (`scripts/lo-ajeno-al-ejercicio.mjs`): lo que se le pidió a cada boca
  (`dichoTodo`), que no sea de nadie más que de la instructora y, de ella, del
  ejercicio o de la lista `SEGURIDAD` de `flight/sin-instructora.ts`; y lo que
  se vio mientras duraba: solo sus tarjetas o la del tráfico, ni rótulo, ni
  tira de la radio, ni la flecha de casa latiendo. El rótulo del destino al
  empezar —«Fuerteventura · GCFV», cuatro segundos— se deja: es la tarjeta de
  casa diciendo cuál es, como en todo vuelo, y no pide nada.

Volado en el juego, con la avioneta en Fuerteventura y la Intel por ANGLE,
de una tirada:

- **Interceptar, con el alisio**, catorce de catorce: la barra a tope con el
  OBS en el 120 sale a la derecha (+28,6°) y la tarjeta la dibuja a la derecha;
  se despega a 5,6 millas con `cdi-viniendo-de-la-derecha`; establecido en el
  119,6 sin pasarse, con la corrección de arriba (−9,8° los tres). La
  instructora dijo «a tope», «se mueve» y el final con el viento, y nadie más
  dijo nada: ni la torre, ni otro avión, ni «andá a la pista».
- **Interceptar, en calma** —la versión del banco que H26e dejó sin volar—,
  catorce de catorce: pide el 090 desde el 120, la barra a tope a la izquierda
  (−28,7°) y dibujada a la izquierda, se despega a 5,9 millas, establecido en
  el 90,5 sin pasarse, el morro 0,0° del camino (y −4,2° del curso al cerrar,
  la cifra que H26e daba por fallo) y la frase sin viento.
- **¿En qué radial estoy?**, quince de quince: la barra a tope a la izquierda
  (−18,9°) y dibujada a la izquierda; lo demás como en H26c (centrada en el 118
  con la radio en el 118,7, el cuarto de vuelta la mueve 1,75°, TO, la bandera
  encima y FROM). En la primera tirada, al pasar sobre FTV la instructora dijo
  «adelante y más abajo va otro avión»: es la información de tráfico, que sin
  torre da ella, y el banco la tomaba por ajena porque adivinaba qué era de
  seguridad con una expresión; ahora usa la lista `SEGURIDAD`.
- **Seguí la aguja**, veinte de veinte, con el alisio y en calma: la curva del
  perro 1.453 m (un 7,0 %), recta en calma (93 m, 0,4 %), y sin nada ajeno.
