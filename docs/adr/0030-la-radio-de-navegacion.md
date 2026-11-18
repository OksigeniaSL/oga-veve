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

## Enmienda H28d (17-11-2026): dónde va cada cosa cuando no cabe todo

H28c dejó medido lo que faltaba y lo dejó fallando a propósito: 31 de 909 en
`npm run carteles`, todas de piezas que se tocan. No eran de ancho: eran de
sitio. En cabina y en las pantallas bajas no caben a la vez el aviso, la
lámpara de la torre y el subtítulo, y además la tarjeta de la orden, la del
gas y el freno; y ningún ancho lo arregla. Lo que se decidió es **qué va
primero cuando no hay sitio para todo**, que es lo que resuelve un avión de
verdad: el aviso, que es seguridad; la lámpara, que es una orden; y el
subtítulo, que es la explicación y además se oye. Lo que se toca no se mueve.

### Lo que se cambió

- **El aviso, en una fila en todas las pantallas**: la flecha al lado del
  texto y no encima, como ya iba en cabina y con la pantalla grande. Mide lo
  mismo en todas partes (`--fila-del-aviso`, la flecha de 44, su relleno y un
  respiro), así que lo que va debajo de él se coloca sin medirlo y en el mismo
  fotograma en que sale. Con la flecha encima medía dos filas, y en una
  pantalla baja la de arriba era la que tocaba la lámpara.
- **Fuera, apoyado en el cuadro**, a 6 píxeles de su asa como el subtítulo de
  antes, y no a 46: esos 40 eran la fila del subtítulo, que vivía debajo del
  aviso hasta que se fue debajo de la barra («Fuera, el centro es del avión»).
  La fila se había quedado vacía y era justo lo que le faltaba al aviso en la
  tablet de 600 de alto.
- **Con un aviso, la tarjeta de la orden espera**, como ya esperaba el tutor:
  las dos dicen qué hacer y el aviso lo está diciendo («¡El suelo! Subí»). Se
  esconde sin dejar su sitio, como en el modo inicio, para que nada se mueva al
  volver.
- **Si coinciden los tres, el subtítulo espera** y la lámpara sube a su
  sitio. Con el aviso solo, el subtítulo se queda: la instructora explica lo
  que ha sonado justo detrás, que es como se enseña la calma, y así lo pide ya
  la comprobación de que el mensaje se ve por delante del cuadro con un aviso
  puesto. La voz sigue hablando; lo que espera es el cartel. Para saber si la
  lámpara está encendida sin `:has()`, el espejo pone `hay-torre`.
- **En cabina, lo que se lee va en una columna debajo de la barra**, por orden:
  el aviso, centrado; la lámpara, de la columna de la pausa a la de mandos
  (`--columna-izquierda`, que mide el HUD); y donde acaba la lámpara
  (`--torre-alto`, que también se mide), la tarjeta de la orden a la izquierda,
  como estaba, y el subtítulo a su lado, desde donde acaban la tarjeta y el
  tutor (`--rincon-derecha`) hasta los mandos. Antes la lámpara iba centrada
  de lado a lado encima de la tarjeta y de la del gas, el aviso encima de la
  lámpara y el subtítulo al 32 %, encima del freno. La lámpara va encima de la
  tarjeta y no al revés porque las dos dicen lo mismo —«esperá a la luz» y la
  luz— y así se leen juntas, de arriba abajo.
- **La columna de mandos no se mueve nunca**: ni cuando sale un aviso ni
  cuando se enciende la lámpara. Es lo que se toca, y un botón que salta en el
  momento en que hay que dar gas es un botón que no se acierta. Lo que baja es
  lo que se lee: la tarjeta de la orden, una vez, cuando se enciende la luz.
- **En el teléfono**, la tarjeta de la orden va en la fila de la barra, así que
  en cabina la columna es el aviso, la lámpara y el subtítulo, de lado a lado
  hasta los mandos.
- **De pie y con ratón**, el subtítulo y la lámpara van debajo del rincón y no
  a su lado, de la izquierda a la columna de mandos: a su lado quedaban 204
  píxeles.
- **`--torre-ancho` se ha quitado**: se escribía en cada luz que se ponía y no
  lo leía nadie desde que la tarjeta se fue al rincón. En su lugar,
  `--torre-alto`, que sí se lee, medido con un `ResizeObserver` como el
  subtítulo y escrito solo cuando cambia. `--subtitulo-alto` ya no es cero en
  cabina: allí no lo lee nadie, y la excepción sobraba.

### Lo que se prueba

`npm run carteles` mira, además de lo de H28c, **la cabina sin aviso**, que es
el punto de espera: la lámpara roja, la tarjeta de la orden y la instructora
hablando. Que ninguno pise a otro, a un botón redondo ni a la columna de
mandos entera —el gas, el destino, el freno y sus botones—, y que nada los
tape. Se miden dos fotogramas después de encenderlos, que es lo que tarda el
HUD en medir la lámpara; con el aviso se mide en el acto, como en H28c, porque
el aviso mide una constante.

### Lo medido

Con lo más largo que llevan, los tres encendidos a la vez, como H28c. Antes →
después, en píxeles de pantalla:

- **La tablet de 900 × 600, de fuera**: el aviso iba de 212 a 290, encima de la
  tercera línea de la lámpara y de la tarjeta de la orden; ahora de 270 a 325,
  apoyado en el cuadro. La lámpara sube al sitio del subtítulo, de 117 a 204.
  En la de 1024 × 600 con el dedo, el aviso de 245 a 300 y la lámpara de 122 a
  209: antes se montaban de 187 a 262.
- **El portátil de 1280 × 800 con el dedo, de fuera**: el aviso acababa a 4
  píxeles dentro de la lámpara aun con 800 de alto; con el subtítulo esperando
  a que pasen los tres, la lámpara sube a su sitio, debajo de la barra, y le
  deja al aviso la fila que le faltaba.
- **El teléfono de 780 × 360, de fuera**: el aviso iba de 107 a 168, encima de
  la tercera línea del subtítulo y la primera de la lámpara; ahora la lámpara
  de 65 a 119 y el aviso de 154 a 192. En el de 864 × 330, la lámpara de 65 a
  119 y el aviso de 128 a 167.
- **La cabina del portátil de 1280 × 800**: el aviso de 137 a 201, la lámpara
  de 209 a 293 y de 188 a 974, que es donde empieza la columna de mandos (en
  982). Sin aviso, la lámpara de 137 a 221, la tarjeta de la orden debajo y el
  subtítulo a su lado, de 515 a 974. Antes la lámpara iba de 188 a 1092,
  encima de la tarjeta de la orden y de la del gas, y el subtítulo encima del
  freno.
- **La cabina de la tablet de 900 × 600**, sin aviso: la lámpara de 164 a 251,
  la tarjeta de la orden de 255 a 460 y el subtítulo a su lado, de 340 a 636,
  en cuatro líneas. Con el aviso, el aviso de 164 a 219 y la lámpara de 226 a
  313.
- **De pie, 600 × 900 con ratón, de fuera**: el subtítulo en tres líneas y no
  en siete, la lámpara en cuatro y no en ocho, los dos de 16 a 436, debajo del
  rincón y antes de la columna de mandos.

`npm run carteles` daba 878 de 909. La primera tirada de esta tanda dio 907 de
925, con las dieciséis comprobaciones nuevas: no quedaba ninguna de las 31 de
H28c salvo la del portátil con el dedo, que es la que llevó a dejar esperar el
subtítulo en todas las pantallas; las dieciséis de la cabina sin aviso fallaban
por la comprobación, que dejaba que el juego apagase la lámpara entre
fotograma y fotograma y la buscaba en la esquina de la pantalla; y una era un
módulo que no llegó a bajar al arrancar la página (`Failed to fetch
dynamically imported module`), que no es de aquí. Con el subtítulo esperando
en todas las pantallas y la lámpara vuelta a encender en cada fotograma de la
pasada sin aviso, **925 de 925**.

### Lo que cuesta, y lo que queda

- **El subtítulo espera cuando coinciden los tres**, también donde caben, que es
  el portátil sin dedo: se probó a dejarlo solo para las pantallas bajas y la
  de 1280 × 800 con el dedo, con 800 de alto, tampoco cabía. Quien juega sin
  sonido no lee a la instructora mientras duren el aviso y la lámpara a la
  vez; el aviso dice ya qué hacer, y la lámpara, qué manda la torre.
- **En cabina la tarjeta de la orden baja** lo que mide la lámpara cuando se
  enciende, y en la tablet de 900 × 600 tapa más de la pantalla de vuelo que
  antes (de 255 a 460, antes de 158 a 358). Es lo que se lee lo que baja, y
  baja una vez, al encenderse la luz.
- **En cabina el aviso pasa por delante del borde de la columna de mandos**,
  que no se mueve: en la tablet de 900 × 600 tapa los 15 píxeles de la
  izquierda de la tarjeta del gas; en la de 1024 × 600 con el dedo, unos 50; y
  en el teléfono, el borde de la tarjeta del destino. El aviso tiene que ir en
  una línea y en el medio, y ahí la columna de mandos llega más allá de la
  mitad de su ancho. Bajar la columna de mandos una fila para siempre se
  descartó: tapaba para siempre los relojes de motor por un aviso que dura
  segundos. El aviso deja pasar el toque, así que el gas se sigue tocando.
- **En el teléfono, en cabina, el subtítulo de tres líneas llega a la caja de
  la palanca de pulgar** por la esquina de arriba a la derecha, donde la caja
  es cuadrada y la palanca redonda: no toca el dibujo.
- **De pie con ratón, el aviso de fuera pasa por delante del botón del tren**,
  que vive en la columna de mandos, como antes pasaba por delante del freno.
- **Con la pantalla en grande del teléfono** no se ha tocado nada: el aviso
  tiene su fila y la lámpara sigue encima de la pantalla, como estaba (H28c).

## Enmienda H26g (17-11-2026): «Dos radiales que se cortan»

La propuesta de H26e, hecha, y lo que cambió al hacerla. Es el cuarto
ejercicio de radio y el cierre del peldaño del VOR de #51: **saber dónde se
está sin ver nada**.

`flight/dos-radiales.ts`, otra entrada de `EJERCICIOS` —`cruce`, con
`escena: "radio"`, `acabaEnElAire` y su `colocacion` propia—, con su ficha en
el hangar («Dos radiales que se cortan»: dos VOR en el suelo, una raya de
cada uno y el avión dentro del aro del fijo, donde se cortan) y la misma
puerta que los otros tres: el hangar, `?ejercicio=cruce`, la presentación
antes y el panel del final con la traza.

### La pareja, y dónde se ofrece

`parejaDelCampo`: el VOR del campo, el que la radio pone al salir, y **otro
con el que se corte bien**: que en algún sitio a diez millas del primero las
dos rayas se corten entre sesenta y ciento veinte grados (`CORTE`, la regla de
manual de un fijo con dos marcaciones: fuera de eso el seno baja de 0,87), que
se oiga desde tres mil pies y que no se esté encima de él. De los que valen,
el que más sitios da para empezar, y a igualdad, el más cercano. Sale:

| Campo | Pareja |
| --- | --- |
| Fuerteventura | FTV y LTE, a 34 millas |
| Los Rodeos | TFN y TFS, a 39. **LRO no**: a cinco millas y media, se corta mal en todas partes |
| Tenerife Sur | TFS y LGM, a 28 (la propuesta decía TFN; LGM da más sitios donde empezar) |
| Gran Canaria | GDV y LPC, a 15, de norte a sur |
| Lanzarote | LTE y LZR, a 14 |
| La Gomera | LGM y TFS |
| Madrid | BRA y CNR |
| Asunción, Ciudad del Este, Encarnación | ninguna: VAS, VES y VEN están a más de lo que se oye. No se ofrece |

La propuesta pedía que el corte fuera «sobre lo bajo» ya en `dondeVale`, y
`dondeVale` solo tiene el indicativo: sin terreno. El suelo lo mira quien
coloca, que sí lo tiene, y entre los sitios que la geometría deja elige el
del camino más bajo.

### Dónde empieza: volando hacia la primera radio

`colocacionDelCruce`: a cuatro minutos del VOR del campo, entre diez y quince
millas (`LEJOS`) —cerca, porque cada raya se tuerce con la distancia a su
radio, y no tanto que se llegue a ella antes de leer las dos—, en un sitio
donde las dos rayas se cortan bien, el del camino más bajo y, a igualdad, el
del corte más cerca de noventa grados. A tres mil pies sobre la pista o mil
por encima de lo más alto del camino. La NAV con el VOR del campo, como la
deja la salida, y el OBS veinte grados apartado, con FROM y la barra a tope,
como en «¿En qué radial estoy?».

**Y volando hacia esa radio, con el morro corrigiendo el viento**, que la
propuesta no decía. Es lo que hace que el momento clave sea el que se ve casi
siempre: mientras se pone la otra radio y se gira el OBS pasa medio minuto o
uno, y en ese rato la primera raya no cambia, porque el avión va por ella. La
cruz cae encima del avión. Quien vira, o se aparta y tarda, ve la cruz lejos,
y entonces es cuando la instructora cuenta la lección de la propuesta: «leelas
rápido, o volá hacia una de las dos radios». En Fuerteventura con el alisio,
la avioneta empieza a diez millas en el 103 de FTV, con el morro en el 289 y
las rayas cortándose a 87°.

### Una sola NAV, como una avioneta

- **La primera**: centrar la barra con FROM. La raya sale **del número del
  OBS**, que es lo que el piloto lee y lleva a la carta, no del radial de la
  cuenta. Centrada es lo de «¿En qué radial estoy?», la barra a menos de un
  grado (`CENTRADA`).
- **La otra**: nueve segundos después, si no se ha puesto ya, la tarjeta la
  escribe con su frecuencia («LTE 114.40») y la instructora la pide; se pone
  tocándola en el plano o con el 7, y su morse la identifica.
- **La segunda raya**: centrar otra vez con FROM; la barra suele salir con TO
  —el OBS sigue en el primer radial— y la rueda apretada la trae.
- **La cruz**: el corte de los dos radiales **en la esfera**
  (`corteDeDosRadiales`, el de dos caminos de círculo máximo), puesto en el
  mundo con `dondeCae`. Con los radiales de verdad, sin redondear, cae a menos
  de cincuenta metros del avión; en el plano local la raya recta se desvía
  décimas de grado.

### Lo que da el VOR, y cuándo la cruz llega tarde

La propuesta pedía la cruz a menos de media milla del avión leyendo los dos a
la vez. **Media milla no la da el VOR**: con la barra centrada a menos de un
grado, cada raya puede ir un grado torcida, que a `d` de su radio la aparta
`d · sen 1°`, y dos rayas que se cortan con un ángulo `θ` mueven la cruz como
mucho la suma de las dos partida por `sen θ` (`loQueDaElVor`). A diez millas
de FTV y treinta de LTE, cortándose a noventa grados, son 0,73 millas. El
ejercicio juzga con eso: más lejos que lo que da el VOR es lo que voló el
avión entre una lectura y otra, y la frase es la de leerlas rápido; dentro,
«ahí estás». Y por eso un VOR casi en línea con el otro no sirve: con `θ`
pequeño el seno se va a cero y la cruz no dice nada.

### Lo que se ve y lo que se oye

- **En el plano en vuelo** (`Mapa.ponerRayas`): cada radial leído, de su radio
  a un poco más allá del avión, en la tinta de los datos aeronáuticos —la de
  los radiales de la carta—, fino como el lápiz y con su orla de papel; su
  número junto a la radio, «R-102 FTV», como se escribe en una carta; y donde
  se cortan, el fijo: un aro de lápiz con su punto. Por encima de la estela y
  por debajo de la flecha: si el fijo está bien, la flecha cae dentro del aro.
  Con rayas, el plano ancho encuadra también las dos radios y las rayas
  enteras. **Las rayas y la estela se quedan al cerrar**, al contrario que la
  estela de los otros tres: la cruz llega justo al cerrarse, y es lo que hay
  que mirar.
- **En la tarjeta**: el CDI a tope del lado de la barra mientras se busca, el
  CDI centrado con la primera raya escrita, y **un dibujo nuevo para la cruz**
  (`cruce-de-radiales`: las dos radios, las dos rayas y el aro del fijo). Lo
  escrito va delante de la frase: «FTV · LTE» al presentar, «LTE 114.40» al
  pedir la otra, y los dos radiales leídos al final.
- **La instructora**, cinco frases nuevas, genéricas, sin nombres ni números:
  presentar, la primera raya («con una sola raya, no se sabe en qué punto»),
  la otra, «¡ahí estás!» y la de leerlas rápido. Y dos de «¿En qué radial
  estoy?» tal cual: «poné el VOR del campo en la NAV» si se quita el primero,
  y la de identificada al oír el morse del segundo. Sin grabar: al final de
  `scripts/frases-para-grabar.mjs` (`DEL_CRUCE`); hasta entonces, la tarjeta
  y su texto. Un aviso vuelve cuando cambia algo que pasa: la otra se pide
  otra vez solo si se quita.
- **Nadie suspende**: con la cruz lejos se acaba igual, con el sonido del
  logro y el panel del final. Ver dónde cayó y por qué es la mitad de la
  lección.

### Lo que se prueba

- `flight/dos-radiales.test.ts`: dónde se ofrece y la pareja de cada campo;
  que TFN y LRO solos no se ofrecen y que en su prolongación el corte es cero;
  dónde empieza, con el camino de verdad derecho a la radio y el morro contra
  el alisio; que la cruz en la esfera, con los radiales de verdad, cae a
  menos de cincuenta metros del avión en cuatro sitios; y que leídos a la vez,
  con el número entero del OBS más apartado que todavía centra la barra —un
  grado de cada lado—, la cruz cae a menos de lo que da el VOR en cada sitio
  de entre diez y quince millas al este de FTV donde las rayas cortan bien, y
  en sus cuatro combinaciones. Y el vuelo, con **un piloto de prueba
  con la radio de verdad** (`leerNav` en las dos, una después de otra) y un
  avión de cinemática: con el alisio, en calma y con el reactor a doscientos
  cincuenta nudos desde quince millas, los dos radiales leídos son los de
  verdad a menos de un grado y la cruz cae encima del avión (con el alisio, a
  0,49 millas con el VOR dando 0,73, y 34,5 segundos entre una y otra);
  **quien vira hacia la otra radio** entre una y otra deja la cruz donde
  estaba al leer la primera, a lo que voló del avión (1,39 millas, un minuto
  largo), y oye la de leerlas rápido. Y que las rayas del plano salen de su
  radio y pasan por la cruz.
- `scripts/ver-dos-radiales.mjs`: el mismo vuelo en el juego, con las teclas
  de quien juega —el automático en el rumbo de la salida, el 9 y el 0 de
  toque en toque, el 7 hasta que la NAV tiene la otra y la rueda apretada con
  TO— y sus capturas, con el plano de cerca. Con `OGA_TARDE=1`, vira hacia la
  otra radio y tarda cuarenta segundos; con `OGA_VIENTO=000/0`, en calma.

Volado en el juego, con la avioneta en Fuerteventura y la Intel por ANGLE, de
una tirada:

- **Con el alisio**, quince de quince: empieza a 9,9 millas de FTV y a 947 m,
  con las rayas cortándose a 87°, la NAV con FTV, el OBS en el 083 y la barra
  a tope con FROM (−20,0°, en el radial 103,0). Se centra en el 102 con la NAV
  marcando 102,97; el 7 pone LTE y su morse la identifica; se centra en el 192
  con la NAV en 191,86. **La cruz cae a 0,19 millas del avión**, con el VOR
  dando 0,73, cortándose a 89°, con 29 segundos y 0,85 millas voladas entre
  una y otra: volando hacia FTV, su raya no cambió.
- **Tarde** (`OGA_TARDE=1`), quince de quince: vira hacia LTE al leer la
  primera y tarda; 69 segundos y 1,68 millas entre una y otra, y **la cruz a
  1,32 millas del avión**, más que las 0,74 que da el VOR. La frase es la de
  leerlas rápido.
- **En calma**, quince de quince: la cruz a 0,22 millas, con 28 segundos entre
  una y otra.

En las tres, la instructora dijo lo del ejercicio y nada más —lo grabado y lo
apuntado como «sin grabar»—, y nadie más dijo nada; las tarjetas, solo las
suyas. `npm run carteles`, 878 de 909: las 31 que fallan son las de H28c, el
aviso y la lámpara; el plano es un lienzo y no mueve nada del HUD.

Y una cosa que salió en las capturas y se arregló: el número de la raya,
horizontal y encima de ella, en el plano ancho quedaba debajo del avión en la
raya corta —FTV, a diez millas— y encima de los rótulos de su radio. Va ahora
girado con la raya, a medio camino entre la radio y la cruz y a un lado.
Volado otra vez con eso, con el alisio y tarde, y con dos pasos de lupa: de
cerca, la cruz queda centrada en la flecha con el alisio (a 0,21 millas), y
tarde se ve el aro donde la estela viró y la flecha encima, por la raya de
LTE (a 1,28). En esa segunda tirada, con el alisio, el banco dio catorce de
quince: otro avión dijo `otro.enCola` en la frecuencia, y el banco miraba lo
dicho al acabar las fotos, segundos después de cerrarse el ejercicio, cuando
la frecuencia del campo ya ha vuelto (H26f: lo que se vuele después ya es un
vuelo). Ahora lo mira en cuanto se cierra, y apunta aparte lo dicho después.
La tercera tirada lo confirma: quince de quince con el alisio y tarde, y
`otro.enCola` sale en lo dicho después de cerrar, no antes.

### Lo que queda

- **El panel del final** lleva la traza, como los otros, pero no las rayas ni
  la cruz: `plano()` del hangar no las sabe dibujar. Se ven en el plano en
  vuelo.
- **La cruz tarde, en el plano ancho, se ve poco apartada**: el plano ancho
  encuadra las dos radios —treinta y cinco millas o más— y 1,3 millas son unos
  pocos píxeles; la flecha queda en el borde del aro. Con la lupa se ve
  claro. Acercar el plano solo al cerrar, o pintar de la cruz al avión lo que
  se voló, es una decisión de cómo se mira el plano y no se ha tocado.
- **El número de la primera raya roza los rótulos de su radio** con una sola
  raya en el plano, que encuadra de cerca: en Fuerteventura, «R-102 FTV»
  toca el «TWR 118.475» de GCFV. Los rótulos de las radios van en su capa y
  no saben de las rayas; correr el número más hacia el avión lo aparta aquí,
  pero no se ha volado.
- **La cobertura de cada VOR** sigue sin transcribir (ver arriba): la pareja
  se elige con la línea de vista y el techo de ciento treinta millas.

### Propuesta para la tanda siguiente: el ILS con agujas

El peldaño 6 de #51: «los aros de senda que ya existen, hechos invisibles y
convertidos en dos agujas». Lo que ya hay: el rombo de la senda en la cabina
con la senda de cada pista de su AIP (`world/sendas-publicadas.ts`), la NAV
con el localizador y su barra (`leerNav`, `ESCALA_LOC`), los aros de la final
(`world/runway-guide.ts`), la capa de nubes (`world/capa-de-nubes.ts`) y la
altura de decisión con su regla (`flight/minimos.ts`).

- **Qué**: «Aterrizar con las agujas», en el peldaño de cabina, en todo avión
  con NAV y en todo campo con un ILS transcrito. Se ofrece por pista y no por
  campo: el ILS es de una cabecera.
- **Tres pasadas, la misma final**, como pide el issue: aros y agujas; las
  agujas solas, con los aros apagándose a medida que las dos barras se quedan
  dentro de un punto; y las agujas en nube, con la base a doscientos cincuenta
  pies, **rompiendo justo antes de los doscientos de la decisión y viendo
  aparecer la pista**: el momento que
  el issue llama el más emocionante que puede tener el simulador. La primera
  pasada se puede saltar si ya se hizo.
- **Se juzga** con `leerNav` (el localizador) y la senda de la pista: dentro
  de un punto en las dos agujas desde mil pies hasta los mínimos es
  estabilizada; fuera, a los mínimos, **la frustrada se felicita** y puntúa
  igual o más, que es la regla de AGENTS.md. *Minimums* lo canta la máquina en
  el avión que lo lleva, en los cuatro peldaños, y la instructora detrás.
- **Lo que no se dice**: las cifras. La tarjeta escribe el identificador, la
  frecuencia y el curso del localizador, como una carta de aproximación.
- **Prueba de mesa** con un piloto de cinemática que vuela las dos barras:
  que a los mínimos queda dentro de un punto con viento cruzado, que con la
  base a doscientos cincuenta pies la pista se ve antes de la altura de
  decisión, y que quien llega fuera de un punto oye la frustrada como un
  acierto.

## Enmienda H26h (17-11-2026): lo que quedó de «Dos radiales que se cortan»

Los tres flecos que H26g vio en sus capturas, arreglados, y el ejercicio
volado también con un reactor y en otro campo.

### El número de la raya, con los demás rótulos

El número de cada raya se pintaba encima del plano, en el lienzo de la flecha,
sin saber lo que había escrito debajo; con el plano de cerca, el «R-102 FTV»
rozaba el «TWR 118.475» de GCFV. **Ningún rótulo del plano pisa a otro**, así
que el número va ahora con los demás, en su lienzo y colocado por
`rotularElPlano` (`radiales`):

- **Dónde**: `sitiosEnElRadial` (`carta/rotulos.ts`), girado con su raya, a un
  lado y nunca boca abajo, como `sitiosEnLaRaya` con el rumbo de una ruta. El
  sitio preferido sigue siendo a medio camino entre la radio y la cruz, y de
  ahí se aparta por el tramo de la raya **que cae en el papel**: con la lupa,
  la radio se queda fuera y la raya entra por un borde. Pegado a la raya, a
  nueve píxeles y a veinte; lo último es para saltar por encima del avión en
  el plano del teléfono, donde la raya hasta él mide ochenta píxeles.
- **Con qué forma**: «R-102 FTV» y, si no cabe, «R-102»: de qué radio sale ya
  lo dice la raya. Si tampoco, no se escribe, como cualquier rótulo; acercando
  la lupa sale.
- **En qué orden**: detrás de casa y del destino y antes que las cajas de las
  radios, que saben quedarse sin el canal: el número es lo que se acaba de
  leer. Y las rayas se suman a las de la ruta, que los demás rótulos pagan
  por cruzar: así tampoco el nombre de un campo se queda debajo de una raya
  de lápiz. El aro de la cruz es un símbolo, y no se pisa.
- `pintarRotulo` sabe ya de cajas giradas, y `rotulosPuestos` las da al
  banco con las demás. Se rotula otra vez cuando llega una raya o la cruz
  (`claveDeLosRotulos`).

### Al cerrarse, el plano se acerca a la cruz y al avión

El plano ancho encuadra las dos radios, y la milla y pico de una cruz tarde
eran ocho píxeles: la flecha, en el borde del aro. **Al llegar la cruz, el
plano se acerca solo**, como si se hubiera tocado la lupa (`lupaDelFijo`, en
`encuadre-del-mapa.ts`): la más cerca de las lupas de siempre en la que

- la cruz cae en la mitad de en medio del papel, con el avión en el centro
  —el lado, cuatro veces lo que están apartados—, con sitio para seguir dentro
  mientras el avión vuela los doce segundos hasta el panel del final;
- y lo que da el VOR es como mucho la sexta parte del lado. Así una cruz buena
  cae con la flecha dentro o al borde de su aro, y una tarde, apartada de ella
  a simple vista: se entiende sin leer.

Una lupa y no un encuadre hecho a medida, porque las lupas son escalones a
propósito (ver `escalones`) y desde ahí quien juega sigue con las suyas: con la
de alejar vuelve al plano ancho de las dos radios. Se hace una vez, en cuanto
llega la cruz, esté el plano abierto o no.

En Fuerteventura, con FTV y LTE, es la segunda lupa, de 9,8 millas de lado: la
cruz tarde, a 1,22 millas, queda a treinta y cinco píxeles de la flecha en un
plano de 272, y la buena, a 0,59, a quince, en el borde de su aro.

### El panel del final, con el fijo

`plano()` del hangar lleva un argumento más, `fijo`, y lo dibuja
`fijo-en-el-plano.ts`: las dos rayas, debajo de la traza (ver abajo), y encima
la cruz con su aro, **el avión donde estaba al leer la segunda** —el mismo dibujo que la flecha
del plano, con el morro por donde iba la traza— y los números de las rayas,
colocados con `sitiosEnElRadial` sin pisarse ni pisar la cruz ni el avión.
Con su propio encuadre, el del fijo: la traza, la cruz y el avión, y como poco
dos millas y seis veces lo que da el VOR, como la lupa. Con el del aeródromo,
que está a diez millas, o con las dos radios, el resumen tenía el mismo
problema que el plano ancho. Las rayas entran por el borde, cada una desde su
radio, y su número dice de cuál.

En el panel, que es barro y no papel, las rayas y la cruz van en la tinta
suave, como el lápiz; el avión en la tinta, con un halo oscuro para que se vea
encima de la traza ocre. La letra de los números es parte del dibujo (DESIGN,
«Letra que es parte de un dibujo»): dieciséis píxeles en la tablet, y encoge
con el plano en el teléfono.

### Lo que se prueba

- `carta/rotulos-del-plano.test.ts`: en Fuerteventura, con las dos rayas y el
  plano de 12, 36 y 60 kilómetros en los cuatro tamaños de plano, ningún
  rótulo pisa a otro ni a un símbolo ni se sale, el R-102 se escribe, y va a
  un lado de su raya y girado con ella.
- `encuadre-del-mapa.test.ts`: `lupaDelFijo` con la cruz tarde, la buena y la
  del reactor: la más cerca que cumple las dos cosas, y la tarde a más de
  cuarenta píxeles de la flecha.
- `fijo-en-el-plano.test.ts`: el encuadre del fijo deja fuera las radios; el
  fijo dibuja las dos rayas, la cruz, el avión y los dos números, sin pisarse;
  y `plano()` lo lleva solo si se le da.
- `scripts/ver-dos-radiales.mjs`, además de lo de H26g: en cada foto del plano
  —la primera raya de lejos y con dos lupas, la cruz al cerrarse y la cruz con
  la lupa de alejar— **las cajas de lo escrito, medidas en la pantalla**, con
  el eje separador porque los números van girados; que al cerrarse la lupa se
  acerca, con la cruz dentro del papel y, tarde, apartada de la flecha más de
  treinta píxeles y más de lo que da el VOR en ese plano; encima, a menos de
  lo que da el VOR, que es como lo juzga el ejercicio; que alejando se vuelve
  al ancho; y en el panel del final, las dos rayas con su número, la cruz y
  el avión, ningún número pisando a otro ni a la cruz ni al avión, y la cruz
  apartada o encima con la misma regla. Con `OGA_ESCENARIO` y `OGA_AVION`, otro campo y otro
  avión.

### Volado

En el juego, con la Intel por ANGLE, de una tirada:

- **Fuerteventura, la avioneta, con el alisio**: la cruz a 0,59 millas del
  avión con el VOR dando 0,72, treinta segundos entre una y otra. Ningún
  rótulo pisa a otro en ninguna foto del plano (siete con la primera raya,
  tres con dos lupas, cuatro con la cruz y doce en el ancho), y el R-102 FTV
  va junto a su raya, apartado de la caja de GCFV. Al cerrarse, la segunda
  lupa, con la cruz a quince píxeles de la flecha; alejando, el ancho. En el
  panel del final, las dos rayas, el R-102 FTV y el R-193 corto, la cruz y el
  avión, sin pisarse, con la letra a dieciséis píxeles. Veintisiete de
  veintiocho: el avión quedaba a veinte píxeles de la cruz en el panel, y el
  banco pedía menos de veinte, un número puesto a ojo. Ahora el banco lo juzga
  como el ejercicio, con lo que da el VOR pasado a píxeles.
- **Tarde**, veintiocho de veintiocho: la cruz a 1,22 millas, más de las 0,73
  que da el VOR; al cerrarse, a treinta y cinco píxeles de la flecha, y en el
  panel, a cuarenta y tres, con la traza virando hacia LTE desde la raya de
  FTV.
- **Tenerife Norte con el JAZ 90**, veintiocho de veintiocho: TFN y TFS,
  empezando a 14,8 millas de TFN y a 1533 m, con las rayas cortándose a 92°.
  Lee el R-284 TFN y el R-020 TFS con treinta y dos segundos y 2,28 millas
  entre una y otra, y la cruz cae a 0,23 millas, con el VOR dando 0,84: volando
  hacia TFN, su raya no cambió, también a doscientos cincuenta nudos. Al
  cerrarse, la segunda lupa, de 10,4 millas, con la cruz a nueve píxeles de la
  flecha y el VOR dando veintidós; en el panel, a siete, con el VOR dando
  veinticinco. Nada que arreglar en el reactor ni en el otro campo.

En el panel de Tenerife Norte salió otra cosa, y se arregló: la traza iba por
la raya de TFN —se vuela hacia ella— y la raya, pintada encima, la tapaba. Las
rayas van ahora debajo de la traza, y la cruz, el avión y los números encima.
Eso está probado en la mesa (`fijo-en-el-plano.test.ts` mira el orden de las
capas) y **no se ha volado**: la segunda tirada se quedó en la cola del
navegador. Tampoco el banco con la cruz «encima» juzgada con lo que da el VOR
en píxeles; con esa regla, las tres tiradas de arriba habrían pasado. En
Fuerteventura, con el lado de cada encuadre, el VOR da unos veinte píxeles en
el plano y veinticinco en el panel, contra los quince y veinte medidos; en el
reactor el banco ya lo midió: nueve con veintidós, y siete con veinticinco.

### Lo que queda

- **Una raya puede cruzar la caja de una radio** en el plano ancho cuando no
  hay otro sitio para ella: con la cruz tarde, la de LTE pasa por «FTV
  114.100 / CH 88X». Cruzar una raya cuesta y no está prohibido; pisar otro
  rótulo, sí.
- **La estela del plano en vuelo va debajo de las rayas**, como la dejó H26g:
  volando hacia una radio queda tapada por su raya. En el panel del final ya
  no; en el plano en vuelo no se ha tocado.
- **La letra del panel del final en el teléfono** encoge con el dibujo y no se
  ha medido allí; en la tablet son dieciséis píxeles.

## Enmienda H28e (17-11-2026): lo que se toca no se tapa

H28d dejó medidos unos flecos que `npm run carteles` no miraba, y todos eran de
lo mismo: algo que se lee pasando por delante de algo que se toca. El aviso de
cabina, por el borde de la tarjeta del gas; la tarjeta de la orden, bajando al
encenderse la lámpara hasta la caja de la palanca de pulgar; el subtítulo del
teléfono, entrando en esa caja; la lámpara, rozando el volumen; y de pie, el
aviso de fuera, por delante del tren. Se había aceptado porque esas piezas
dejan pasar el toque. Pero un mando tapado, aunque sea a medias, es un mando
que no se encuentra: quien no sabe que debajo hay un botón no lo va a buscar.
Y quien juega sin sonido no leía a la instructora mientras coincidían el aviso
y la lámpara.

### Lo que se cambió

- **En cabina, la tarjeta de la orden no se mueve.** Se queda arriba a la
  izquierda, donde estaba antes de H28d, con el tutor debajo, y lo que se lee
  va en una columna a su derecha, hasta la columna de mandos: el aviso, la
  lámpara y el subtítulo, por ese orden. La lámpara va al lado de la tarjeta y
  no encima: las dos dicen lo mismo —«esperá a la luz» y la luz— y se leen
  juntas de izquierda a derecha igual que de arriba abajo. La tarjeta también
  se toca —para arrancar, para que explique—, así que es de lo que no se
  mueve. En ese hueco más estrecho la orden de la torre va debajo de la luz y
  de los aviones (`flex-wrap`), y con el redondeo de una tarjeta y no el de una
  píldora, que en dos filas se comía las esquinas de la orden.
- **En cabina y en una pantalla baja, el dibujo de la tarjeta de la orden al más
  pequeño de los suyos** (72 y no 96). En la tablet de 1024 × 600 con el dedo la
  barra va en cuatro filas, la tarjeta empieza a 226 y con el dibujo de 96 la
  frase iba en seis líneas y su borde tocaba el volumen, que vive encima de la
  palanca de pulgar; ya lo tocaba antes de H28d, sin lámpara.
- **En cabina, el aviso acaba donde empieza la columna de mandos**
  (`--lee-derecha`), centrado en el hueco que queda y no en la pantalla. Con el
  aviso, la tarjeta y el tutor esperan, así que por la izquierda empieza en la
  columna de la pausa y cabe en una línea.
- **En el teléfono, lo que baja hasta la palanca de pulgar empieza a su
  derecha**: la palanca no escala con el HUD, 150 píxeles de pantalla a 20 del
  borde, y su caja es cuadrada aunque la palanca sea redonda. En cabina, la
  lámpara y el subtítulo; de fuera, la lámpara, que baja debajo del subtítulo.
- **En el teléfono, de fuera, el subtítulo y la lámpara acaban donde empieza la
  columna de mandos**, y no pasan por delante del tren, los aerofrenos y la
  tarjeta del destino. Es lo que H28b dejó como coste («Si se prefiere no tapar
  ninguna…»): ya no quedan centrados sobre el avión. Con la pantalla en
  grande, como estaba.
- **En el teléfono, de fuera, el aviso baja hasta donde acaban el subtítulo o la
  lámpara**, si llegan a su fila, y nunca sube. Más estrechos, van en una línea
  más, y en el de 864 × 330 la última llegaba al aviso. Se coloca con lo que el
  HUD ya mide de ellos (`--subtitulo-alto`, `--torre-alto`).
- **En el teléfono, el aviso a la glosa** (16 píxeles de pantalla), como todo lo
  que se lee allí. Iba a 17, y en cabina del de 780 × 360, entre la columna de
  la pausa —con la vuelta al avión y el parte, antes de arrancar— y la de
  mandos, «Se rompió algo. Volvemos al helipuerto…» se pasaba ocho píxeles y se
  partía en dos.
- **De pie y con ratón, de fuera, el aviso acaba donde empieza la columna de
  mandos**, que de pie baja hasta el cuadro, y va en dos líneas que crecen
  hacia arriba desde el cuadro: de fuera nada se coloca debajo de él. En
  cabina, de pie, como estaba: al lado de la tarjeta, de 350 píxeles, no queda
  sitio en 600.
- **El subtítulo que espera, espera entero.** Con el aviso y la lámpara a la
  vez la hoja lo esconde, pero su reloj seguía corriendo detrás: una frase de
  la instructora dura menos que un aviso de suelo y se acababa sin que se
  leyera. Ahora no corre mientras está escondido (`Hud.subtituloEsperando`), y
  sale entero en cuanto se apaga uno de los dos. Si mientras tanto la
  instructora dice otra cosa, la nueva sustituye a la vieja, como sin aviso. La
  altura en grande no espera: una altura de hace diez segundos ya no es la del
  avión.

### Lo que se prueba

`npm run carteles` mira ahora, en cada pantalla y en las dos vistas, **lo que se
toca**: que el aviso, la lámpara, la tarjeta de la orden y el subtítulo, con lo
más largo que llevan, no pisen la columna de mandos —el gas, el destino, el
tren, el freno y sus botones—, las palancas de pulgar ni el volumen. Y en las
cuatro maneras en que coinciden, no solo en dos: los tres a la vez; **el aviso
con el subtítulo**, que es la final en que la máquina canta y la instructora
explica justo detrás, y que no se miraba; la lámpara con el subtítulo y la
tarjeta, el punto de espera; y **el subtítulo solo con la tarjeta**, que es lo de
casi siempre. En las tres últimas, además, que los que se leen no se pisen
entre sí. La tarjeta de la orden va con la que hay al arrancar el banco, que no
se fuerza a la más larga. El aviso se mira centrado en su hueco y no en la pantalla, y uno que no
cabe, pasando de medio hueco.

Y una vez por juego con letras, **sin sonido**: se encienden de verdad el aviso y
la lámpara —el HUD ve un avión roto y la torre en rojo en cada fotograma—, la
instructora dice una frase de un segundo y medio, se espera el doble y se apaga
el aviso. La frase tiene que estar esperando, salir entera y acabarse a su
tiempo.

### Lo medido

En píxeles de pantalla, con el reactor de Tenerife Norte en Taguato, antes →
después:

- **La cabina de la tablet de 900 × 600**: el aviso iba de 240 a 660, por delante
  de los 16 primeros píxeles de la tarjeta del gas (en 644); ahora de 188 a 609,
  centrado entre la columna de la pausa y la de mandos. Sin aviso, la tarjeta de
  la orden se queda de 164 a 323 —antes bajaba a 255–460—, la lámpara a su lado
  de 340 a 635, con la orden debajo de la luz, y el subtítulo debajo, de 316 a
  397.
- **La cabina de la tablet de 1024 × 600 con el dedo**: el aviso, de 302–722 sobre
  el gas a 205–625. La tarjeta, que bajaba a 320–463 y entraba en la caja de la
  palanca de pulgar (desde 430) y en el volumen (desde 368), se queda en
  226–346; la lámpara, que con el aviso llegaba al volumen, va a su lado.
- **La cabina del teléfono de 780 × 360**: el aviso, de 201–580 sobre la tarjeta
  del destino (desde 533) a 163–523, en una línea; el subtítulo, de 158 a 178 por
  la izquierda, fuera de la caja de la palanca (que acaba en 170). En el de 864 ×
  330 y el de 800 × 360, igual.
- **El teléfono de fuera**: el subtítulo y la lámpara iban hasta 622 (780 × 360),
  706 (864 × 330) y 752 (915 × 412), por delante del tren, los aerofrenos y el
  destino; ahora acaban en 519, 603 y 652. El subtítulo pasa de dos líneas a tres
  y la lámpara de dos a tres o cuatro. En el de 864 × 330 el aviso baja de 128 a
  139 con el subtítulo y a 144 con la lámpara.
- **De pie, 600 × 900 con ratón, de fuera**: el aviso iba de 55 a 545 en una línea,
  por delante del tren (desde 532); ahora de 16 a 434, en dos.
- **Sin sonido**: con el aviso y la lámpara encendidos, la frase de un segundo y
  medio ya no estaba a los tres segundos y no se llegaba a ver; ahora espera
  escondida, sale al apagarse el aviso y se acaba a su tiempo.

`npm run carteles` daba 925 de 925 con lo que miraba H28d. La primera tirada con
lo de esta tanda dio 983 de 990, y ninguna de las siete era de un mando tapado:
cuatro eran la comprobación del subtítulo largo de H28b, que lo quería centrado
en la pantalla y de más de media, y ahora acaba en la columna de mandos —se
mira centrado en su hueco y de más de medio hueco, como el aviso y la
lámpara—; dos, el aviso del teléfono encima de la lámpara, medido en el mismo
instante en que se encendía, antes de que el HUD midiera la lámpara —se miden
dos fotogramas después, como la pasada sin aviso de H28d—; y una, un módulo que
no llegó a bajar al arrancar (`Failed to fetch dynamically imported module`),
que no es de aquí. Con las dos comprobaciones corregidas, **990 de 990**.
`npm run acceso` da 90 de 90 y `npm run toque` 91 de 91, antes y después.

### Lo que cuesta, y lo que queda

- **En el teléfono, de fuera, el subtítulo y la lámpara ya no van centrados sobre
  el avión**, y van en una línea más: en 780 × 360 la lámpara pasa de dos líneas a
  cuatro. Es el precio de no tapar el tren.
- **El aviso, en el teléfono, a 16 y no a 17**, y en cabina centrado en su hueco y
  no en la pantalla, que lo corre a la izquierda de cincuenta (la tablet de
  900 × 600) a cien píxeles (el portátil con el dedo).
- **De pie y con ratón, el aviso de fuera va en dos líneas** y no centrado sobre
  el avión.
- **El asa del cuadro no está en la cuenta de carteles**, que mira los mandos que
  pidió la tanda —la columna, las palancas, el volumen—, y dos de los nuevos
  repartos la rozan: en el teléfono de 864 × 330, de fuera, con la lámpara y el
  subtítulo a la vez, la lámpara en tres líneas acaba en 213 y el asa empieza en
  202 (antes acababa en 173, pero tapando el tren, los aerofrenos y el destino);
  y en cabina del de 780 × 360, el subtítulo en cuatro líneas acaba en 234 y el
  asa empieza en 232. En el de 780 × 360, de fuera, la lámpara en cuatro líneas
  acaba un píxel dentro. No caben los dos encima del asa en ese alto con el ancho
  que les queda entre la palanca y los mandos; resolverlo es decidir qué espera,
  o medir la columna de mandos por tramos, no un ancho.
- **Con la pantalla en grande del teléfono** no se ha tocado nada, y ahí el
  subtítulo de dos o tres líneas sigue creciendo hacia arriba por delante de la
  barra —el piloto automático, el cinturón, el volumen—, y el aviso y la lámpara
  por delante del tren y de los aerofrenos, como estaba (H28b, H28c). Carteles
  no mira esa vista.
- **La cabina de pie y con ratón (600 × 900)** se queda como la dejó H28d, que es
  como estaba y está mal: la tarjeta de la orden, de 350 píxeles, y la columna
  de mandos se cruzan aun sin lámpara, la lámpara se aprieta en el hueco que deja
  `--columna-izquierda` (que de pie se mide a la derecha de la tarjeta del gas,
  que se le sale por la izquierda) y el aviso pasa por delante del gas. No es
  una pantalla de carteles. Resolverlo es un reparto de cabina para una ventana
  de pie, no un ancho.
- **En la tablet de 900 × 600, de fuera, la tarjeta de la orden pasa por delante
  del asa del cuadro**, como antes de esta tanda.

## Enmienda H28f (17-11-2026): lo que se lee, en un solo sitio

H28b, H28c, H28d y H28e arreglaron, uno detrás de otro, dónde va lo que se lee
cuando no cabe todo, y cada uno dejó al lado otro solape que su comprobación no
medía. H28e dejó escritos seis: el asa del cuadro fuera de la cuenta, la
pantalla en grande del teléfono sin mirar, la cabina de pie con ratón, la
tarjeta de la orden sobre el asa en la tablet de 900 × 600, la radio de la
barra sobre los botones de la columna de la pausa en cabina y la tarjeta de la
orden medida con la que hubiera al arrancar. Cuando una queja vuelve, el arreglo
anterior fue en el sitio equivocado, y el sitio equivocado era este: **cada
arreglo era una variable más de la hoja** (`--columna-izquierda`,
`--lee-izquierda`, `--lee-derecha`, `--rincon-derecha`, `--torre-alto`,
`--subtitulo-alto`…) **que apartaba una pieza de otra pieza concreta**, y el
día que salía un botón nuevo, o una vista nueva, nadie se apartaba de él. Y la
comprobación miraba esas mismas piezas, con una lista a mano.

### Lo que se cambió

- **La cuenta, entera y de una vez.** `npm run carteles` mira ahora
  (`mirarLoQueSeLee`) **todo lo que se lee contra todo lo que se toca**, en
  **las tres vistas** —fuera, cabina y, en el teléfono, la pantalla en
  grande—, en **las diez pantallas y los dos juegos**, más **la ventana de pie
  de 600 × 900 con ratón**, y en **las cuatro maneras** en que coinciden (los
  tres a la vez, el aviso con el subtítulo, la lámpara con el subtítulo y el
  subtítulo solo).
  - **Lo que se toca sale de la página**, no de una lista: todo `button` que no
    esté desactivado, `[role=button]`, campo, enlace, y las marcas que el juego
    ya usaba para lo que se toca —las losas del teléfono (`data-tel-grande`),
    la rueda y la ventanilla del MCP, los mandos de la radio, las piezas del
    cuadro que se explican al tocarlas (`data-explica`), las palancas de
    pulgar (`data-touch`)— y una nueva, `data-tocable`, para lo que se toca y
    no es nada de eso: las tarjetas del gas y del freno y la cápsula del
    volumen. El asa, la pausa, la radio, la tarjeta de la orden cuando se
    pulsa, la pantalla en grande: entran solas, y lo que se añada mañana con
    una de esas formas, también.
  - **Lo que se lee** es el aviso, la lámpara de la torre, la tarjeta de la
    orden, el subtítulo (y la altura en grande, que va en su caja), el tutor y
    la radio, cada uno **con lo más largo que lleva**: la orden, la más larga
    de todos los rótulos que `game.ts` le pasa, sacada del código al arrancar
    el banco (hoy, «Mirá el plano: la cruz quedó lejos del avión…», 234
    letras, cuatro veces la de arrancar el motor).
  - Que nada de lo que se lee pise nada de eso, ni se pisen entre sí. Lo que
    espera no cuenta, porque esperar es la respuesta cuando no cabe; pero **el
    aviso no espera nunca**, y el subtítulo solo y la lámpara con el subtítulo
    se tienen que ver, para que esconderlo todo no pase la cuenta.
- **El reparto, en un solo sitio** (`src/ui/reparto.ts`). La hoja sigue
  diciendo dónde *quiere* ir cada cosa —la columna de cabina, debajo de la
  barra, apoyado en el cuadro—, y `repartirLoQueSeLee` comprueba que ahí no pisa
  nada, con la misma regla de lo que se toca. Si pisa, la coloca **por
  prioridad: el aviso, la lámpara, la tarjeta de la orden, el subtítulo, el
  tutor y la radio**. Primero la estrecha en el tramo libre de su fila, nunca
  por debajo de la mitad de su hueco ni de lo que mide entera; luego la prueba
  en el sitio de una que va detrás (la lámpara sube al del subtítulo) o debajo
  de lo ya puesto; y si no cabe en ninguno, **espera** (`.lee-espera`:
  escondida sin dejar su sitio), como en un avión cuando no hay sitio para
  todo, uno a la vez y por orden. El subtítulo que espera no corre su reloj
  (`Hud.subtituloEsperando`), como ya pasaba con el aviso y la lámpara. La
  tarjeta de la orden, antes de esperar, **se recoge a su dibujo**
  (`.lee-recogida`): el dibujo es lo esencial (regla 2) y la frase la dice la
  instructora. **El aviso no espera nunca**: si no tiene sitio libre se queda
  en el suyo y lo demás se aparta de él.
- **Por qué midiendo y no con más CSS.** Lo que hay que esquivar depende de lo
  que esté encendido —el freno sale al tocar suelo, la barra se parte en
  filas, la pantalla se pone en grande, antes de arrancar hay dos botones más—
  y en la hoja cada combinación era una regla nueva. Medido, cualquier
  combinación sale de la misma cuenta. Y no se paga en cada fotograma
  (regla 6): el reparto corre solo cuando cambia algo de lo que se lee —se
  enciende, se apaga, cambia de texto o de clase—, cuando la raíz del HUD
  cambia de clase o cuando quien mide el HUD avisa de que algo de lo que se
  toca ha cambiado de tamaño; una vez por fotograma como mucho, y nada si la
  firma de lo que se mira no ha cambiado, que el juego vuelve a poner las
  mismas clases en cada fotograma. Cuando corre son unas decenas de cajas y
  una o dos maquetaciones.
- **Las variables de la hoja se quedan, con otro papel.** Dicen dónde prefiere
  ir cada pieza, que es diseño (la lámpara al lado de la tarjeta en cabina, el
  aviso apoyado en el cuadro), y así en el caso de siempre el reparto no mueve
  nada. Lo que ya no hacen es apartar una pieza de un mando: eso es del
  reparto. **Un solape nuevo se arregla ahí, no con otra variable.**
- **De pie y con ratón, en cabina, lo que se lee va debajo de la columna de
  mandos, de lado a lado.** Al lado no cabía nada: 600 de ancho, la columna en
  dos de fondo 284 y la tarjeta de la orden 350. Debajo de la columna
  (`--columna-abajo`, que mide el HUD con lo de dentro, que en dos de fondo se
  sale de su caja) empieza la franja de cabina con el mismo orden: el aviso,
  la lámpara, la tarjeta y el subtítulo. Esto sí es de la hoja, porque es
  dónde quiere ir; lo que aún choque, lo coloca el reparto.
- **Los bancos reparten con el estado que ponen** (`Hud.repartirAhora`). El
  juego apaga en cada fotograma el aviso y la lámpara que el banco enciende a
  mano, y el reparto del fotograma siguiente veía un estado a medias; antes de
  medir, el banco le pide que reparta ya.

- **Lo que se ve de lo que se toca, no su caja.** La caja de un grupo de SVG
  es la de todo su dibujo, también lo recortado: la cinta de velocidad lleva
  escritas todas las velocidades, y su caja subía por encima del cuadro hasta
  la barra. En la primera vuelta el subtítulo y la lámpara esperaban de fuera
  en la tablet de 900 × 600 sin nada encima, y el aviso se iba a la derecha
  huyendo de una cinta que no se veía. Las cajas se recortan por los `<svg>`
  que las contienen (`cajaQueSeVe`), y no cuenta lo transparente o lo que
  esconde quien lo contiene (`checkVisibility`). Igual en carteles.
- **Cada pieza busca fila hacia donde crece**: más abajo la que cuelga de la
  barra, más arriba la que se apoya en el cuadro. Al otro lado está aquello en
  lo que se apoya, y el aviso, buscando hacia abajo, caía sobre el asa. La
  excepción es el sitio de una que va detrás, que es un sitio pensado para leer.
- **La columna de mandos no baja por la frase de la tarjeta.** Donde hay alto
  va debajo del rincón, y con la frase más larga de la tarjeta (234 letras)
  bajaba hasta detrás del cuadro: lo que se lee movía lo que se toca. Se coloca
  con la tarjeta en su dibujo (`--rincon-alto-mandos`, que mide
  `escribirRincon`); si la frase no cabe, el reparto la recoge.

La regla va a DESIGN.md, §5 («Dónde va lo que se lee lo decide un solo
sitio»), y §4 y §8 la nombran.

### Lo que se prueba

- `npm run carteles`, `mirarLoQueSeLee`: en cada pantalla, juego y vista, dos
  comprobaciones —nada de lo que se lee pisa lo que se toca ni se pisan entre
  sí, en las cuatro maneras; y el aviso no espera, y fuera y en cabina se ven
  el subtítulo solo y la lámpara con el subtítulo—. De pie y con el dedo, en
  su lugar, que el cartel de girar la pantalla tape el vuelo: debajo no se
  juega. Las comprobaciones de H28c a H28e se quedan, y miden ahora el reparto
  del estado que ponen (`Hud.repartirAhora`).
- `src/ui/reparto.test.ts`: los tramos libres de una fila y `colocar` —en su
  sitio si no pisa, al sitio de la que va detrás si pisa el asa (el caso de
  864 × 330), esperar si no cabe en ninguna fila, no estrecharse por debajo de
  medio hueco, y subir desde el cuadro—.

### Lo medido

Con lo más largo que lleva cada cosa, todo lo que se lee contra todo lo que se
toca, en las vistas, pantallas y maneras de arriba, con el reactor de Tenerife
Norte en Taguato (la medida aparte de la tanda, `medir.mjs`, que cuenta pares
que se pisan):

- **Antes** (main en 4ec990ae): en 44 de 88 casos algo pisaba algo, 214 pares
  en total. Los que más: el subtítulo con la pantalla en grande por delante del
  piloto automático, el cinturón, la baliza, el sonido, el tren y los
  aerofrenos (doce casos cada uno); la tarjeta de la orden con su frase larga
  sobre el asa, la rueda del MCP, el volumen o las palancas; la radio sobre la
  vuelta al avión y el parte; la lámpara sobre el destino, el tren y el asa; y
  en cabina de pie, el aviso sobre el gas y la tarjeta sobre el gas y los
  aerofrenos.
- **La primera vuelta** del reparto dejó 15 de 1074 sin pasar en carteles: el
  subtítulo y la lámpara esperando de fuera en las tablets por la caja entera
  de la cinta de velocidad, y el aviso cayendo sobre el asa o quedándose sin
  sitio en la pantalla grande por lo mismo. De ahí el recorte por los `<svg>`
  y las filas hacia donde crece cada pieza.
- **Con todo**: `npm run carteles` da **1074 de 1074**: las 990 de antes y 84
  nuevas (42 vistas de pantalla y juego, dos cada una; de pie con el dedo no
  se llega a medir el vuelo, que lo tapa el cartel de girar). `npm run acceso`
  y `npm run toque` dan 90 de 90 y 91 de 91, como antes. Y vitest, 10368 de
  10368 (28 saltadas, como siempre).

### Lo que cuesta, y lo que queda

- **Lo que espera no se ve.** Es la regla de un avión cuando no hay sitio, y
  ahora se cumple sin excepciones de pantalla, pero tiene su precio:
  - **con la pantalla en grande del teléfono**, el subtítulo más largo y la
    lámpara esperan: encima de la pantalla queda la fila del subtítulo, la
    de la barra la lleva la tarjeta de la orden y a los lados hay mandos. Antes
    se leían, pasando por delante del piloto automático, el cinturón, la
    baliza, el sonido, el tren y los aerofrenos. Lo siguiente sería encoger la
    pantalla mientras está la lámpara, como ya se encoge una fila con el aviso;
  - **la radio** espera cuando la barra se parte en filas y la suya cae sobre
    la vuelta al avión y el parte, que solo están antes de arrancar: en las
    tablets, de fuera y en cabina. De fondo, la barra no sabe de la columna de
    la pausa;
  - **la tarjeta de la orden con su frase más larga** se queda en su dibujo
    donde la frase no cabe: la frase la dice la instructora.
- **Las variables de la hoja se quedan**, aunque ya no aparten nada de un
  mando: dicen dónde prefiere ir cada pieza. Las que solo apartaban
  (`--lee-derecha` con `--columna-izquierda`, el aparte del teléfono hasta la
  palanca) se pueden quitar cuando el reparto se haya visto en el juego, no
  en esta tanda.
- **El rendimiento no se ha medido en una tablet.** El reparto no corre en cada
  fotograma, solo cuando cambia lo que se lee o lo que se toca; queda medir en
  la tablet de gama media cuánto cuesta cuando corre.


## Enmienda H26i (17-11-2026): «Aterrizar con las agujas»

La propuesta de H26g, hecha en parte, y lo que cambió al hacerla. Es el quinto
ejercicio de radio y el peldaño 6 de #51: **bajar hasta una pista que no se
ve, con dos agujas**.

### La senda de planeo, en la radio

La NAV ya recibía el localizador; la senda solo estaba en el rombo de la
pantalla de vuelo, sacada de la geometría de la pista (`perfil-vertical.ts`),
y en un avión sin ella —la avioneta— no había ninguna. Ahora la NAV con un
localizador marca también su senda (`leerSenda`, en `LecturaNav.senda`), como
un receptor de verdad:

- **De su antena**: la posición de la senda del AD 2.19 (`Estacion.senda`), al
  lado de la pista y a unos trescientos metros del umbral. La aguja dice la
  elevación del avión vista desde su pie contra el ángulo: sobre el umbral, la
  senda pasa a unos quince metros, la altura de referencia del ILS.
- **Con el ángulo publicado**: el de la senda de esa cabecera en la tabla de
  sendas de su AIP (`SENDAS`, el mismo que pinta el rombo); si no se leyó, el
  de su PAPI, que en una pista con ILS se regla con la senda (Anexo 14,
  5.3.5); y si no hay ninguno de los dos —Mariscal Estigarribia—, sin senda.
  La 19 de Fuerteventura, 3,45°.
- **Con su escala**: a fondo a 0,24 veces el ángulo, el borde del sector de la
  senda (DDM 0,175; Anexo 10, vol. I, 3.1.5.6.4 y adjunto C): con tres grados,
  0,72° —el «±0,7°» y el haz de 1,4° de los manuales—, dos puntos, uno a 0,12
  veces el ángulo. Es el mismo número que ya usaba el rombo
  (`GRADOS_POR_PUNTO`, 0,35). El localizador sigue a tope a 2,5°: un punto,
  1,25°.
- **Con su alcance**: diez millas y ocho grados a cada lado del eje, y hasta
  1,75 veces el ángulo por arriba (Anexo 10, vol. I, 3.1.5.3.1); fuera,
  **bandera GS**. Por debajo no hay bandera: llega hasta el suelo, a fondo
  hacia arriba, que es la que dice «subí» a quien viene bajo y la que deja
  capturarla desde abajo.
- **Emparejada**: la frecuencia de la senda sale de su fila del AD 2.19
  (`Estacion.mhzSenda`), y el receptor la pone sola al sintonizar el
  localizador, con la tabla de emparejamiento del Anexo 10, vol. I, 3.1.6.1.1
  (`SENDA_EMPAREJADA`). Lo publicado casa con la tabla en todos los ILS del
  juego, y lo mira la prueba.

**En el HSI**, la escala de la senda a la derecha de la rosa, sin girar con
ella: cuatro puntos, la raya del centro y el rombo magenta, que baja cuando se
va alto; con la bandera, el rombo se esconde y sale «GS» en rojo. En la
pantalla de navegación de los de cristal y de línea, como el puntero de la
senda de un Boeing en modo de aproximación; en el direccional hecho HSI de los
de pistón, como el de una avioneta. Con un VOR no sale.

### «Aterrizar con las agujas»

`flight/ils-con-agujas.ts`, otra entrada de `EJERCICIOS` —`ils`, con
`escena: "radio"` y su `colocacion` propia—, con su ficha en el hangar (de
perfil, la capa de nubes arriba con las dos agujas en cruz dentro, la senda a
rayas bajando a la pista y el avión saliendo por la base de la nube) y la
misma puerta que los otros cuatro: el hangar, `?ejercicio=ils`, la
presentación y el panel del final con la traza.

- **Dónde se ofrece**: en el peldaño de cabina, en todo avión con NAV y en todo
  campo con un ILS cuya senda se sepa (`ilsDelCampo`): las dos cabeceras de
  Fuerteventura (la 19 a 3,45°), Los Rodeos y Tenerife Sur; la 03L y la 21R de
  Gran Canaria; la 03 de Lanzarote; las cuatro de llegadas de Barajas; la 23
  de Guaraní, y la 20 de Asunción y la de Encarnación, con el ángulo de su
  PAPI. Mariscal Estigarribia, que tiene ILS sin ángulo leído, no. Se vuela el
  de la cabecera en uso y, si ésa no tiene, el del campo. Se vende al mundo:
  Fuerteventura es donde lo vuela el banco.
- **No acaba en el aire**: es el primero de radio que baja hasta la pista, y
  no calla nada. La torre, su frecuencia, la fase de la final y la puerta de
  los quinientos pies son parte de la aproximación, como en el planeo. La
  prueba de lo que calla un ejercicio lo dice ya así.
- **Dónde empieza** (`colocacionDelIls`): a doce millas de la antena de la
  senda, fuera de sus diez —la bandera se ve al empezar y se va sola—, cinco
  grados apartado del eje visto desde el localizador **del lado del que viene
  el viento**, con el morro cortándolo a treinta grados (PANS-OPS: no más de
  treinta para el localizador), a la altura de la senda a siete millas y nunca
  a menos de quinientos pies del suelo del camino. A la velocidad del
  circuito, limpio, como los otros ejercicios en el aire. El ILS ya puesto en
  la NAV: identificar ya lo enseñaron los de antes.
- **Lo que pasa**, en sucesos, con la tarjeta (el indicador del ILS dibujado:
  la esfera con las dos escalas y las dos agujas, `cdiDelIls`) y la
  instructora: presentar, con «ILS 01 · IFV 109.50 · 005» escrito delante de
  la frase, como la cabecera de una carta de aproximación; **a tope**, «la
  pista queda de ese lado»; **se despega**, «virá ahora, que el localizador es
  cuatro veces más fino que un VOR»; **en el localizador**, la aguja a menos
  de medio punto diez segundos: «ahora la senda, que está arriba: seguí
  nivelado»; **capturada**, la aguja de la senda en el centro, con el sonido
  del logro: «las dos agujas en cruz»; y **los mínimos**, a doscientos pies
  sobre el umbral (`ALTURA_DE_DECISION`): con las dos dentro de un punto, «ahí
  está la pista»; si no, **frustrada**, «irse a tiempo también es ganar».
- **Cierra en el suelo o en el aire, y las dos cosas son acierto**: aterrizado
  —parado, o a los ocho segundos de tocar—, «pista»; subiendo cuarenta metros
  sobre lo más bajo de la final, que es el listón de `Frustrada`, «frustrada».
  La frustrada la celebra el juego como cualquier otra, con su voz y su
  sonido: el ejercicio no pone una segunda voz (un suceso, una voz), solo el
  panel del final. Si se pidió la frustrada y se aterrizó igual, se cierra con
  la pista, sin reñir: se ve la consecuencia.
- **Lo que ya mira la final de siempre no se repite**: la puerta de los
  quinientos pies, la velocidad y el ritmo (`flight/minimos.ts`). Los aros no
  salen en ningún ejercicio, y en éste eso es la lección: solo agujas.
- **Las frases**, ocho, genéricas, sin el nombre del ILS ni sus números, al
  final de `scripts/frases-para-grabar.mjs` (`DEL_ILS`). Sin grabar: hasta
  entonces, la tarjeta y su texto.

### Lo que se prueba

- `flight/ils-con-agujas.test.ts`: la senda de la 01 de Fuerteventura, IFV, a
  tres grados y con 332,6 emparejada con 109,5; **cada ILS del juego publica la
  senda emparejada con su localizador**; en la senda y en el eje, las dos
  agujas en el centro a dos, cinco y nueve millas; **un punto de senda son
  0,12 veces el ángulo y dos la aguja a fondo** (0,36° y 0,72°), y un punto de
  localizador 1,25°, con la aguja a la derecha a la izquierda del eje; la
  bandera de la senda a diez millas y media, a nueve grados del eje y por
  encima de 1,75 veces el ángulo, y sin bandera muy por debajo, a fondo
  arriba; con un VOR, sin senda. Dónde se ofrece y dónde empieza. Y el vuelo,
  con **un piloto de prueba con la radio de verdad** (`leerNav` y su senda) y
  un avión de cinemática: con el alisio de costado, en calma y con el reactor,
  los sucesos en su orden, la senda capturada desde abajo, **a los mínimos
  dentro de un punto** —y desde mil pies, las dos agujas siempre dentro— y
  cerrado con la pista; quien va un punto y seis apartado del localizador oye
  la frustrada en los mínimos, se va, y el ejercicio cierra con la frustrada.
- `flight/lo-que-calla-el-ejercicio.test.ts`: el ILS es de radio y no calla
  nada; los otros cuatro siguen callando.
- `scripts/ver-ils-con-agujas.mjs`: el mismo vuelo en el juego, con un piloto
  de banco que mira solo las dos agujas, como en una nube, y sus capturas.

### Volado

En el juego, con la avioneta en Fuerteventura, el alisio y la Intel por
ANGLE, de una tirada:

- **Con el alisio**, trece de catorce: empieza a 12,0 millas de la senda y a
  675 m sobre la pista (2.213 ft), cortando a treinta grados, con IFV en la
  NAV y el OBS en el 005; el localizador a tope (−3,9 puntos) y la bandera GS
  en el HSI, sin rombo. La aguja se despega con −2,0 puntos y la tarjeta la
  dibuja viniendo de su lado; establecido en el localizador a 9,8 millas, con
  la senda arriba (−2,5 puntos) y el rombo del HSI arriba; **la senda,
  capturada desde abajo a 7,3 millas**; en la final, las dos en cruz (0,00 y
  −0,01 puntos) y el rombo en el centro; desde mil pies lo peor, 0,03 de
  localizador y 0,12 de senda; **en los mínimos, 0,00 y −0,03**, «ahí está la
  pista», y aterrizado se cierra con la pista. La instructora dijo los seis
  pasos en su orden.
- **Apartado del localizador** (`OGA_FUERA=1`, un punto y siete desde
  ochocientos pies), trece de catorce: en los mínimos, −1,81 de localizador y
  −0,10 de senda, **la frustrada**, se va al aire y el ejercicio cierra con la
  frustrada. La puerta de los quinientos pies no mandó irse con ese
  apartamiento: lo decidió la regla de los mínimos del ejercicio.
- **La que falló en las dos, y se arregló**: «a tope» se decía en el mismo
  paso que la presentación —se empieza a tope—, y su tarjeta tapaba en el
  mismo fotograma la de la presentación, con el ILS escrito. Ahora «a tope»
  espera a que acabe la presentación (`PRESENTACION`, catorce segundos), y si
  la aguja se despega antes no se dice; la prueba de mesa lo mira.
- **Y una de «un suceso, una voz»**, vista en lo que se dijo con el alisio:
  en los mínimos, la instructora decía el «mirá la pista: ¿la ves?» de
  cualquier final (`vuelo.minimos`) y justo detrás el «mínimos, y ahí está la
  pista» del ejercicio. Mientras dura el ejercicio, los mínimos los cuenta él:
  la caja del avión que la lleva canta *minimums* igual, sin explicación
  detrás, y en el que no la lleva lo dice la frase del ejercicio. El banco lo
  mira ya.

**Los dos arreglos no han volado**: la tirada siguiente no cabía en la tanda.
Están en la prueba de mesa (el primero) y en el banco (los dos), sin volar.

Y dos cosas vistas que no son de este ejercicio, apuntadas y sin tocar: con
el alisio, entre lo que se dijo está `torre.canario.goAround` —el banco no
apunta a quién ni cuándo, y el avión aterrizó—, y al irse al aire la fase de
la final se volvió a anunciar dos veces (`vuelo.enVueloAterrizando` y
`vuelo.final`).

`npm run carteles`, 925 de 925, con la escala de la senda ya en el cuadro.
El vitest entero, antes de estos dos arreglos: 506 ficheros, 10.382 pruebas
bien; después, las del ILS, la radio y lo que calla un ejercicio.

### Lo que queda

- **La nube**. La propuesta pedía tres pasadas —aros y agujas, agujas solas y
  agujas en nube con la base a doscientos cincuenta pies— para **romper la
  nube justo antes de los mínimos y ver aparecer la pista**. Está hecha la
  segunda, que es la que enseña a volar las agujas, y sin nube: en los
  mínimos la pista se ve porque hoy no hay techo. La capa existe
  (`world/capa-de-nubes.ts`, con el techo del parte), y ponerle al ejercicio
  su día con un techo de doscientos cincuenta pies es una línea en `main.ts`;
  lo que no se ha mirado es qué más dice el juego con ese techo —la tarjeta
  del tiempo, la regla de los mínimos con `seVeLaPista`, la ventanilla— y
  cómo se ve dentro de la capa en la tablet. Es la tanda siguiente.
- **La primera pasada**, la de los aros con las agujas, no está: en un
  ejercicio no salen aros (`seVenLosAros`), y aquí se vuela ya la segunda.
- **La pantalla de navegación de la cabina en 3D** no lleva la escala de la
  senda: `pintarLaRadio` la da, y `world/pantallas-cabina.ts` no la pinta
  todavía. El rombo de la pantalla de vuelo de los de cristal sigue saliendo
  de la geometría de la pista (`desvioAhora`), no de la radio. Con un ILS
  puesto deberían decir casi lo mismo —la antena de la senda está donde la
  senda toca la pista—, pero no se ha medido cuánto se separan.
- **El panel del final repite la frase de los mínimos**: con la pista,
  «ahí está la pista: ahora mirá afuera y aterrizá», que se lee ya
  aterrizado. Le falta una frase de cierre propia, y una frase nueva es una
  grabación más; queda para la tanda de la nube.
- **La cobertura lateral de la senda se mide desde su antena**: a un punto y
  medio largo del localizador, cerca de la pista, ya se sale de sus ocho
  grados y sale la bandera. Es lo que garantiza el Anexo; una antena de verdad
  suele cubrir más.

### Propuesta para la tanda siguiente

Dos, y en este orden.

1. **La nube a los mínimos**, el cierre de este peldaño: el ejercicio trae su
   día como la tormenta y la aguja, con el viento del sitio y **un techo
   cubierto a doscientos cincuenta pies** (`Meteo.techoM` y su tapadura), para
   que la pista aparezca justo antes de los mínimos. Antes de ponerlo, mirar
   qué dice el juego con ese techo —la tarjeta del tiempo, `seVeLaPista`, la
   ventanilla, el consejo de la bajada— y que no diga «no se puede volar» a
   quien viene a practicar justo eso; y medir dentro de la capa en la tablet.
   Prueba de mesa: con la base a doscientos cincuenta pies, la pista se ve
   antes de la altura de decisión en la senda; banco: la foto a trescientos
   pies, dentro, y a doscientos, fuera, con la pista delante.
2. **La estima**, el peldaño 3 de #51, que es lo que más falta de la escalera
   y no pide ningún instrumento nuevo: «rumbo tanto durante tantos minutos y
   estás encima», sobre el Chaco sin referencias. De Mariscal Estigarribia a
   un sitio de verdad que se reconozca desde el aire —Filadelfia o Loma
   Plata—, con el viento del sitio; el juego da el rumbo corregido por el
   triángulo de vientos y el tiempo, y en la tarjeta **un cronómetro grande**
   que cuenta hacia atrás. Al llegar a cero, «mirá abajo»: el sitio debajo, o
   a un lado, y la distancia es lo que se voló mal. Sin radio ni GPS a la
   vista, que es la lección: así cruzaron océanos. Prueba de mesa con el piloto
   de cinemática: con el rumbo corregido llega a menos de una milla; sin
   corregir, se aparta el viento por el tiempo, y se dice hacia dónde. El
   cronómetro es una pieza nueva del HUD y pasa por `npm run carteles`.

## Enmienda H26j (18-11-2026): los flecos de «Aterrizar con las agujas»

Lo que H26i dejó apuntado del quinto ejercicio de radio, hecho o dicho por
qué no, en el orden en que se pidió.

### La frase de cierre

El panel del final repetía la frase de los mínimos —«ahora mirá afuera y
aterrizá»— leída ya aterrizado. Ahora el ejercicio tiene la suya, una por
cierre, y las dos aciertan:

- **La pista** (`ejercicio.ils.cierrePista`): «¡Aterrizaste con las agujas!
  Bajaste por el localizador y la senda hasta los mínimos, y ahí estaba la
  pista. Así se baja hasta una pista que no se ve». La dice la instructora al
  salir el panel, con el sonido del logro: es la celebración del aterrizaje.
  No nombra la nube, que la avioneta no la tiene (ver abajo).
- **La frustrada** (`ejercicio.ils.cierreFrustrada`): «¡Bien decidido! Con una
  aguja fuera del centro, o sin ver la pista, se sube y se vuelve a probar.
  Así lo hacen los pilotos de verdad, y eso también es ganar». Solo se lee:
  la frustrada ya la celebra `Frustrada` en el aire, en el mismo instante en
  que el ejercicio se cierra (los dos miran los mismos cuarenta metros), con
  su voz y su sonido. Una tercera voz en veinte segundos sobre la misma
  decisión sería ruido. Cuentan igual: la de los mínimos y una celebración en
  voz cada una, el sonido del logro y el panel con su frase.

Genérica, sin el nombre del ILS, porque se cierra igual en cualquiera. Y no
dice «en los mínimos»: la frustrada que cierra el ejercicio puede ser una de
antes, a ochocientos pies, de quien vio que no le salía.

### Tras irse al aire, la fase no repite la frustrada

Al irse al aire se volvían a oír «andá a la pista» (`vuelo.enVueloAterrizando`)
y «bajá suavecito» (`vuelo.final`). Las dos son la fase del plan: sale de la
final por arriba al subir veinte metros (`SUBIDA_QUE_SACA_DE_FINAL`) y
vuelve a entrar en cuanto el avión baja un poco antes del centro de la
pista, que en la subida de una frustrada pasa nivelando para coger
velocidad. Ninguna decía nada nuevo, y no es cosa del ejercicio: pasaba en
cualquier frustrada. Así que se arregla en la raíz, en `flight/la-final-tras-irse.ts`:

- **Salir de la final subiendo es la frustrada**, que ya tiene su voz y su
  tarjeta: la tarjeta de «en vuelo» sale, callada, sin voz ni rótulo. Un
  suceso, una voz. Subiendo es **lo subido desde lo más bajo de esa final**,
  quince metros (`SUBIDA_DE_IRSE`, los de irse con el gas de despegue), y no
  el variómetro de ese instante: la primera versión miraba el variómetro y el
  banco la tumbó, porque la avioneta se va a tirones, nivelando cada vez que
  se le cae la velocidad, y salía de la final justo en uno de ellos. Si se
  sale sin subir —quien flota y pasa la pista de largo—, no hay frustrada que
  lo diga, y se dice entero como siempre. Con la orden de la torre pasa
  igual: «andá a la pista» detrás de «go around» decía lo contrario de la
  orden.
- **La final no se vuelve a contar hasta que haya otra final**: la de la
  torre (`flight/final-de-la-torre.ts`) cogida otra vez **por delante del
  umbral**, dentro del cono de la aproximación, después de haber salido de
  ese lado. La de la torre sola no basta, y también lo enseñó el banco: cuenta
  siempre la fase «final» del plan, así que el parpadeo de esa fase subiendo
  encima de la pista la encendía, que es justo lo que no es otra
  aproximación. Un aviso vuelve cuando cambia algo que pasa, no por el reloj.
- En tierra se olvida, que el vuelo siguiente empieza de cero.

### La torre y su «go around»

Visto en el banco de H26i con el alisio: entre lo que se dijo estaba
`torre.canario.goAround`, y el banco no apuntaba a quién ni cuándo. No era
una frase sin destinatario: la frecuencia del campo sigue hablando en este
ejercicio —acaba en la pista y no calla nada—, y la torre manda al aire a un
tráfico del circuito que viene detrás con la pista ocupada, que es el guion
`frustrada` de `flight/radio.ts`. Esa frase se monta siempre con el
indicativo delante, como todas las de la torre: la receta grabada de la voz
canaria es `{c1}…{c5}` y «go around, runway occupied», y el texto, `deTorre`
con el indicativo de quien la recibe. Sin el indicativo la receta no se
monta y no suena. Lo que faltaba era que el banco lo mirara: ahora apunta a
quién y cuándo (`nombrados`) y comprueba que lo que sonó lleva sus piezas del
alfabeto (`dichoConPiezas`).

### La nube en los mínimos

La propuesta de H26i: el ejercicio trae su día, con el viento del sitio y un
techo cubierto justo por encima de los mínimos, para que la pista aparezca
ahí. Hecho con lo que ya había, sin ningún efecto nuevo: `elDiaDelIls` en
`flight/ils-con-agujas.ts` pone el techo y su tapadura en el `Meteo` del
ejercicio, en `main.ts`, como la tormenta y la aguja traen el suyo; la capa
es la de todos los días (`world/capa-de-nubes.ts`), solo que más baja. Con
el viento puesto a mano (`?viento=`) se queda el techo; con un METAR a mano,
manda el METAR.

**Y solo en un avión que vuela por instrumentos.** La propuesta no lo decía
y es lo primero: la avioneta de escuela vuela con reglas visuales
(`AircraftConfig.reglasDeVuelo`), «ni lleva con qué volar dentro de una
nube», y meterse en una con un avión así es lo que más mata en la aviación
ligera. Enseñarlo como ejercicio sería enseñar justo lo contrario de las tres
eses. Así que con la avioneta el ILS se practica como en cualquier escuela,
con buen tiempo y mirando solo las agujas —«como dentro de una nube», que es
lo que ya decía la presentación—, y el día es el de siempre del sitio; con
el bimotor, el turbohélice y los reactores, que vuelan por instrumentos, la
nube de verdad.

**Trescientos pies, y no los doscientos cincuenta de la propuesta**, por dos
motivos que dicen lo mismo:

- La capa **se deshilacha veinticinco metros por debajo de su base**
  (`BORDE_DE_LA_CAPA`), como el borde de una nube de verdad. Con la base a
  doscientos cincuenta, en los mínimos se seguiría entre jirones —en la mesa,
  un 30 % de nube de media y con sitios a más de la mitad—, y la pista se
  vería a ratos justo cuando hay que decidir. Con trescientos se va saliendo
  de los jirones desde ahí y se está fuera del todo a los doscientos veinte
  pies: unos segundos antes de la altura de decisión.
- Es **lo que diría el parte**: las bases van de cien en cien pies, y
  doscientos cincuenta salía en el ATIS del juego como trescientos. Ahora lo
  escrito y lo que se ve son lo mismo, OVC003.

Lo que dice el juego con ese techo, mirado antes de ponerlo, como pedía
H26i:

- **`seVeLaPista`**, la regla de los mínimos: con la base por encima de los
  doscientos pies de la decisión, la pista se ve en los mínimos; lo que se
  decide ahí es lo de las agujas, que es la lección.
- **La tarjeta del tiempo** no sale: sale sola solo en el puesto de
  estacionamiento, antes de salir, y el ejercicio empieza en el aire. Y los
  límites de un avión de instrumentos para salir son doscientos pies de techo
  (`MINIMOS.instrumentos`): con trescientos, se puede salir.
- **La ventanilla** calla lo que tapa la capa, como siempre (`laCapaTapa`).
- **El consejo de la bajada** (`porQueNoSeSigue`) mira el mismo techo con la
  misma regla, y no dice «sin pista».

En Fuerteventura el avión empieza a unos 675 m sobre la pista, por encima de la capa, que con su
grosor de siempre llega a unos 540: ve la alfombra blanca debajo, captura la
senda nivelado por encima de ella, entra en la nube bajando por la senda y
sale por debajo a los doscientos veinte pies. Es como se vuela un ILS con
techo bajo.

**El coste**: la capa es la misma de cinco láminas que se pinta cualquier
día, a otra altura; dentro se cierra la niebla, que es el peor caso del
tiempo y ya lo mide `verificar-rendimiento.mjs` con `OGA_METAR` («dentro de
la nube, a media capa sobre el campo»). No añade ninguna pieza que medir.

Prueba de mesa: el día del ejercicio con el viento del sitio; con la
avioneta, el de siempre, sin nube baja; con uno de instrumentos, cubierto a
trescientos pies, sin agua y a mano, y su ATIS dice «OVC 300FT»; con la
capa pintada como en el cielo, dentro en la base y fuera del todo a los
doscientos veinte pies y en los mínimos; y con doscientos cincuenta, todavía
en los jirones en los mínimos.

### La primera pasada con aros, no

H26g proponía tres pasadas, «como pide el issue»: aros y agujas, agujas
solas y agujas en nube. H26i hizo la segunda y escribió por qué la primera
no: los aros no salen en ningún ejercicio, y en éste **la lección es
precisamente quitarlos**, volar solo con las agujas. Su propuesta para la
tanda siguiente ya no la traía: la nube y la estima. No se pone, por eso y
por dos cosas más:

- **No hay peldaños de abajo donde ponerla.** El ejercicio solo se ofrece en
  el peldaño de cabina, que es el único con la NAV en el cuadro
  (`RADIO_DESDE`): en los de abajo no hay agujas con las que juntar los
  aros.
- **Y la pasada con aros ya existe**: es la lección de aterrizar en ese mismo
  peldaño, con los aros de la senda y, si se pone el ILS en la NAV, las dos
  agujas en el HSI marcando lo mismo.

### La senda en la pantalla de navegación de la cabina en 3D

H26i la dejó apuntada: el HSI del cuadro plano llevaba la escala de la senda
y la pantalla de navegación de la cabina en 3D no. Ahora la lleva, en
`world/pantallas-cabina.ts`, como la del cuadro plano: a la derecha de la
rosa y sin girar con ella, cuatro puntos, la raya del centro y el rombo
magenta, que baja cuando se va alto; con la bandera GS, el rombo se esconde
y sale «GS» en rojo. Dónde va y qué marca es una cuenta sin lienzo
(`escalaDeLaSendaEnLaRosa`), con su prueba: el mismo sitio y el mismo punto
que el cuadro plano.

Lo que sigue sin tocar, de lo mismo: el rombo de la pantalla de vuelo de los
de cristal sale todavía de la geometría de la pista (`desvioAhora`), no de
la radio, y no se ha medido cuánto se separan.

### Volado

En el juego, en Fuerteventura con el alisio, por la 01 (IFV) y la Intel por
ANGLE. El banco (`scripts/ver-ils-con-agujas.mjs`) mira ya los flecos de
esta tanda: el día según el avión y, con nube, la foto dentro a unos
trescientos treinta pies y fuera en los mínimos con la pista a la vista; a
quién manda al aire la torre, con sus piezas; que desde los mínimos no
vuelvan «andá a la pista» ni la final; y el panel con su frase. Con
`OGA_VIENTO`, el viento a mano.

- **La avioneta, a la pista**, 17 de 19 la primera tirada, y las dos que
  fallaron eran del banco: el panel se miraba en castellano y el navegador
  del banco va en inglés, y el orden de lo que dice la instructora mezclaba
  dos listas (ver abajo). Por lo demás como en H26i: a los mínimos con 0,02
  de localizador y −0,17 de senda, lo peor desde mil pies 0,06 y 0,16, y
  cerrado con la pista. Sin nube baja, que es una avioneta de reglas
  visuales. La torre mandó al aire a **EC-CHB** a los 255 s y a **EC-ZHF** a
  los 432 s, tráfico del circuito con la pista ocupada, y las dos veces con
  su indicativo en el alfabeto delante de «go around, runway occupied».
- **La avioneta, apartada del localizador**: antes del arreglo de la fase,
  desde los mínimos se volvieron a oír `vuelo.enVueloAterrizando` y
  `vuelo.final` —el variómetro casi a cero al salir de la final, y la final
  de la torre encendida por el parpadeo—; después, **18 de 19**, y desde los
  mínimos solo sonó *going around, good decision*. En los mínimos, −1,80 de
  localizador, la frustrada, y el panel con «¡Bien decidido!».
- **El bimotor, por instrumentos y con la nube** (`OGA_AVION=jaz-40`), 19 de
  20: cubierto a trescientos pies sobre la pista; **a 339 ft, dentro de la
  nube del todo** (1,00 en la cámara), y **a 197 ft, en los mínimos, fuera**
  (0,00), con la capa dejando ver la pista entera desde el avión; las fotos,
  gris y nada a trescientos cuarenta, y las luces de aproximación y la pista
  delante en los mínimos. A los mínimos con 0,00 y −0,01, lo peor desde mil
  pies 0,06 y 0,10, y cerrado con la pista y su panel. La torre mandó al aire
  a **EC-SQX**, con su indicativo.
- **La que falló en todas es la del orden de la instructora**, y no por el
  orden: la presentación, muda en las cuatro (ver abajo); y en tres, además,
  una de en medio que no sonó —`enElLocalizador`, que caducó esperando turno
  a los 31 s en el bimotor; `capturada` en las dos apartadas—. El banco vuela con el reloj
  por cuatro, y los pasos le llegan a la boca cuatro veces más juntos que la
  voz que los dice: todo apunta a eso, y no a este ejercicio, pero no se ha
  volado a reloj normal para saberlo.

### Lo que queda

- **Sin el alisio no ha volado**: el banco ya lo vuela con `OGA_VIENTO=0/0`,
  y la tirada no cupo en la tanda; la cola del navegador estuvo ocupada media
  hora. Tampoco se ha medido el coste dentro de la capa con
  `verificar-rendimiento.mjs` y `OGA_METAR`: no es un efecto nuevo —la misma
  capa de cinco láminas, a otra altura, y dentro la niebla cerrada que ese
  banco ya mide como el peor caso del tiempo—, pero con un avión de
  instrumentos ahora se vuelan dentro unos cuatro minutos de cada final, y
  eso en la tablet no se ha medido.
- **Ni `npm run carteles`**, por lo mismo: el panel del final lleva una frase
  más larga, en dos líneas a 1280 × 800 en la captura de la frustrada.
- **La presentación muda.** Con las ocho frases ya grabadas, en las cuatro
  tiradas `ejercicio.ils.antes` quedó en «sin grabar, se calla»: se pide en el
  primer paso del ejercicio y todo apunta a que la voz todavía no había
  cargado (`InstructorGrabado.vozDe` mira los manifiestos ya bajados). No es
  de este ejercicio: cualquiera que hable en su primer paso lo tendrá igual.
  No se ha tocado.
- **Las frases que caducan esperando** con el reloj por cuatro (arriba): el
  banco escribe ya lo que la boca apuntó o tiró; falta volarlo a reloj normal.
- **El rombo de la pantalla de vuelo** de los de cristal, de la geometría y no
  de la radio, sin medir cuánto se separan (de H26i).

## Enmienda H26k (18-11-2026): lo que H26j dejó del ILS, y que toca a todos los ejercicios

Lo que H26j dejó apuntado de «Aterrizar con las agujas», en el orden en que
se pidió. Dos de las cinco cosas no eran del ILS: eran de cualquier ejercicio.

### La primera frase, muda: se preguntaba antes de saber

En las cuatro tiradas de H26j la presentación del ILS quedó en «sin grabar,
se calla» con la frase grabada. Primero se midió: el banco
(`scripts/ver-ils-con-agujas.mjs`) mira ahora, dentro de la página y cada
cincuenta milisegundos, cuándo cambia el estado del pack y cuándo se pide la
presentación. Con la avioneta, antes del arreglo:

- **pedida a los 4.316 ms** de cargar la página, en el primer paso del
  ejercicio, con el pack en `manifiestos`;
- **los manifiestos, puestos a los 5.251 ms**: un segundo tarde.

No era que la voz no hubiera cargado, sino algo más fino: la decisión la
tomaba `decirDelEjercicio` preguntando `vozDe`, y `vozDe` mira los
manifiestos ya bajados. Antes de que lleguen contesta «nadie», que no quiere
decir «no está grabada» sino «todavía no lo sé». La boca ya sabía esperar a
su grabación —`estaLista`, con el tope de `ESPERA_A_SU_VOZ`, desde el
crosscheck de Jazlyn—, pero la frase no llegaba a pedirse: se callaba en la
puerta. Le pasaba a todo ejercicio que hable en su primer paso, que son los
cinco de radio y cualquiera que presente algo al empezar.

**El arreglo, en el sitio que sabe cómo va el pack**:
`InstructorGrabado.decirGrabada`, «solo con su grabación, y esperando a saber
si la tiene» (`sabeLoGrabado`):

- **ya se sabe** qué hay grabado —los manifiestos puestos, o sin pack que
  esperar—: sin receta no se pide y devuelve `false`, como antes;
- **todavía no**: se pide igual y espera en la cola de la boca a que lleguen
  los manifiestos y sus piezas, con el tope de siempre; si al saberlo no
  estaba grabada, o se acabó el tope, **se cae callada, nunca a la voz del
  navegador**, y quien la pidió se entera por `alSonar` («se-cae»,
  «sin-grabar»).

Lo usan `decirDelEjercicio`, que es por donde hablan todos los ejercicios, y
`decirLoGrabado`, que es el mismo patrón para las explicaciones de una vez.
No es un retraso a mano en cada ejercicio: es la pregunta bien hecha en un
sitio.

**Y el primer vuelo, fuera de los ejercicios, no lo tiene.** Para saberlo,
`vozDe` apunta en desarrollo quién le pregunta antes de saber
(`preguntadasSinSaber`, en la sonda `voz()`), y se miraron con una sonda de
un uso los primeros veinte segundos de dos arranques: un vuelo normal en
Fuerteventura con la avioneta y el modo inicio (Jazlyn y Ara). Ninguno
preguntó nada antes de que llegaran los manifiestos —a los 5,4 y a los 1,9
s—: el vuelo normal empieza en el puesto y lo primero que dice
(`vuelo.nuestroAvion`) llega después, y la escena del modo inicio pide sus
frases con `decir`, que ya esperaba al pack. Quedan setenta y siete
`vozDe` en `game.ts` con el mismo patrón; los que caen en mitad de un vuelo
tienen el pack sabido desde hace rato. Los cantos de un ejercicio
(`cantarDelEjercicio`, el «stop» y el «engine failure» de los de la V1) siguen
preguntando `vozDe`: se piden en la carrera de despegue, muchos segundos
después del arranque.

Volado, con el bimotor y el alisio a reloj normal: la presentación pedida a los 3.390 ms
con el pack en `manifiestos` —apuntada «espera a saber si está grabada»—,
los manifiestos a los 4.253 y **la presentación sonando a los 4.606 ms**. En
las tres tiradas con el arreglo sonó, la última esperando casi tres segundos.

### Las frases de en medio: no era el reloj

H26j sospechaba del reloj por cuatro del banco: los pasos del ejercicio
llegan cuatro veces más juntos que la voz que los dice. Se voló el bimotor a
**reloj normal** (`OGA_VECES=1`) para saberlo, y no: «ejercicio.ils.enElLocalizador:
caducó esperando» a los 106 s, igual. Delante, por lo que sonó en esa
tirada —el banco no apunta el instante de cada frase—, la torre pasando a su
frecuencia (`torre.canario.contactTower`) y dando el tráfico, y la
instructora con la ventanilla y los baches. Ninguna dura mucho; dos seguidas
pasan de los **cuatro segundos de `CADUCA`**, que es lo que aguantaba
cualquier frase de un ejercicio de radio esperando turno. Y la que
caducó es justo la que dice qué hacer ahora: «ahora la senda, que está
arriba: seguí nivelado».

Un aviso vuelve cuando cambia algo que pasa, no por el reloj, y lo mismo vale
para lo que se calla: **lo que cuenta un paso de un ejercicio de radio sigue
siendo verdad hasta el paso siguiente**. Así que:

- **Espera lo que haga falta** (`cuentaUnPasoDeRadio` en `audio/boca.ts`, en la
  lista de lo que aguanta sin reloj, con la fase y el punto de descenso): los
  cinco ejercicios de radio, `ejercicio.{aguja,radial,interceptar,cruce,ils}.*`.
  Los otros ejercicios no, que algunas de sus frases son correcciones de un
  instante —«ejercicio.velocidad»— y una corrección vieja enseña mal.
- **Y lo retira quien sabe que ya no vale**: el ejercicio, al pedir el paso
  siguiente (`decirDelEjercicio` retira lo que quedara por decir de los
  pasos de antes) o al cerrarse. **Salvo la presentación**, que no es un paso
  sino lo que los abre: en «interceptar» sale en el mismo fotograma que «a
  tope», y las dos se dicen, en su orden.

Volado, con la avioneta apartada del localizador (`OGA_FUERA=1`) y a reloj
normal, ya con el arreglo: la presentación, «a tope», «se despega», «en el
localizador» y **«capturada»** —la que en H26j no sonó en las dos tiradas
apartadas—, las cinco en su orden y ninguna caducada. Esa tirada no llegó a
los mínimos: el banco tenía nueve minutos de reloj de pared, que con el reloj
por cuatro sobran y a reloj normal no, que la avioneta tarda once. Ahora tiene
veinte cuando vuela a reloj normal.

**Lo que se descarta**: que fuera el reloj del banco. Con el reloj por cuatro
los pasos llegan más juntos y caducan más, pero a reloj normal caducaba
igual; el reloj lo hacía más frecuente, no lo causaba.

### Sin el alisio, apartado y con la nube

La tirada que H26j no pudo volar, juntada con las otras dos cosas que pedían
navegador, porque la cola del navegador estuvo ocupada cuarenta minutos: el
bimotor (`OGA_AVION=jaz-40`), en calma (`OGA_VIENTO=0/0`), apartado del
localizador (`OGA_FUERA=1`), con el reloj por cuatro y la foto desde el
asiento (`OGA_CABINA=1`). **16 de 20**:

- **Bien**: la presentación pedida a los 3.298 ms, esperando, y sonando a
  los 6.085; el día del ejercicio, cubierto a trescientos pies; la aguja que
  se despega, en el localizador a 9,4 millas con la senda arriba, la senda
  capturada desde abajo a 7,3, en la final las dos en cruz (−0,02 y 0,01);
  **a 339 ft dentro de la nube (1,00) y a 196 fuera (0,03)**, con la pista a la
  vista; en los mínimos, 1,75 de localizador y la frustrada; la torre manda al
  aire a **EC-RYP** con su indicativo en el alfabeto.
- **«A tope», retirada por el paso siguiente**: con el reloj por cuatro la
  aguja se despega mientras aún suena la presentación, y «la pista queda de
  ese lado» ya no era verdad. Es lo que se quiere, y el banco lo cuenta ya
  así («retiradas por el paso siguiente»).
- **Lo que falló, y no se ha arreglado en esta tanda** (ver «Lo que queda»):
  el ejercicio no llegó a cerrarse con la frustrada antes del tope del banco
  —se quedó en `frustrando`—; detrás de los mínimos sonó
  `ejercicio.ils.sintonizar`, «poné el ILS en la NAV», con el ILS puesto; y
  sonó `vuelo.enVueloAterrizando` antes del *go around* de la cabina.

### Lo que cuesta volar dentro de la nube

Con un avión de instrumentos el ejercicio vuela unos cuatro minutos dentro
de la capa, y H26j no lo midió. Ahora sí, con `verificar-rendimiento.mjs` en
Fuerteventura, el bimotor, el parte `OVC003` y la Intel con su reloj de GPU
(`OGA_GPU=1`), a uno y con la CPU frenada cuatro veces (CDP
`Emulation.setCPUThrottlingRate`, la tablet de gama media). Con esa capa,
«aire» —a 250 m sobre el campo— y «nube» —a media capa— caen dentro; «puesto»,
debajo, y «crucero», encima. Mediana de cuadro (p95) y GPU:

| sitio | ×1 | ×4 | GPU ×1 |
|---|---|---|---|
| puesto, bajo la capa | 2,3 ms (2,7) | 9,7 ms (12,7) | 1,23 ms |
| aire, dentro | 2,2 ms (3,4) | 10,1 ms (12,1) | 1,36 ms |
| nube, a media capa | 2,8 ms (5,8) | **11,2 ms (16,2)** | 1,57 ms |
| crucero, encima | 1,9 ms (3,1) | 10,2 ms (13,0) | 1,09 ms |

**Dentro de la nube, a ×4, 11,2 ms de mediana y 16,2 de p95**: dentro de los
16,7 de sesenta cuadros, por poco en los tirones, y lejos de los 33,3 que
exige el banco. Lo que pone la nube es un milisegundo de mediana y unos
tres de p95 sobre los otros sitios, y hasta medio milisegundo de GPU: la
niebla cerrada, las láminas y los jirones. No se ha tocado:
está dentro del presupuesto. Si una tablet de verdad se quedara corta, lo
primero que se puede quitar es lo que la niebla ya tapa —acortar el plano
lejano de la cámara con la nube cerrada, que deja de mandar el relieve
entero a la tarjeta— y, en GPU, los jirones, que son veinte cuadrados
transparentes y de cerca cada uno es la pantalla entera.

### La pantalla de navegación de la cabina en 3D, mirada

La foto desde el asiento salió en la final, con el ILS puesto y la Intel por
ANGLE, pero **con el bimotor no dice nada de la escala de la senda**: el JAZ
40 es de la familia de esferas (`familiaDe`, por el motor de pistón), su
cabina en 3D lleva los seis relojes de siempre y no tiene pantalla de
navegación; la escala de H26j está en la de los de cristal (turbohélice) y
la de línea (reactores). Hace falta otra tirada con el JAZ 60 o un reactor,
que no cupo.

Y la foto enseña otra cosa, que es más grave para este ejercicio: **desde el
asiento del JAZ 40 no se ven las agujas**. El cuadro plano, con su HSI y la
escala de la senda, no se pinta en la vista de cabina, y el panel en 3D no
lleva ni CDI ni HSI: el direccional es un giróscopo sin agujas. Un bimotor
como ése, en la realidad, lleva el indicador del VOR y el ILS en el panel.
Quien vuele el ILS desde el asiento con el bimotor no tiene con qué. No se
ha tocado.

### Lo que queda

- **El cierre de la frustrada con el bimotor en calma**: en los mínimos, a
  1,75 puntos, el ejercicio pidió la frustrada y se quedó en `frustrando`
  hasta el tope del banco, sin subir los cuarenta metros que la cierran. No
  se sabe si es el piloto de banco —que se pensó para la avioneta— o el
  avión; con la avioneta apartada, en H26j, sí cerraba.
- **«Poné el ILS en la NAV» con el ILS puesto**, detrás de los mínimos en
  esa misma tirada, antes del *go around* de la cabina. Sin comprobar. Lo
  que se sabe: el ejercicio da la radio por quitada si deja de oír su
  localizador (`sintonizada` en `practicarElIls` pide la frecuencia **y** la
  emisora oída), y perder la señal no es quitar la radio. Pero en los
  mínimos se leían 1,75 puntos —unos 2,2°, dentro de la cobertura—, así que
  falta saber qué la hizo perder, o si algo cambió la radio al irse al aire.
  Hay que apuntar en el banco la frecuencia y la emisora en ese instante.
- **«Andá a la pista» antes del *go around***: en esa tirada sonó
  `vuelo.enVueloAterrizando` justo después de los mínimos, antes de que la
  cabina cantara la frustrada. Por la regla de H26j —salir de la final sin
  haber subido quince metros se dice entero— puede ser correcto si el avión
  se salió de la final de lado antes de empezar a subir; sin mirar.
- **Las agujas desde el asiento del JAZ 40**, arriba.
- **La escala de la senda en la cabina en 3D**, con un avión que la tenga.
