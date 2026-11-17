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
