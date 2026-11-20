# 0020 — El modo inicio: el primer vuelo, paso a paso y esperando

Fecha: 2026-10-17
Estado: aceptado · sustituye a la pantalla de teclas como primera experiencia,
cuando la escena tiene voz

## Contexto

La primera vez que alguien jugaba, el juego le abría **la pantalla de las
teclas**: un teclado dibujado con los mandos encima, que se encienden al
apretarlos. Sirve para quien ya sabe para qué es cada cosa. A los cuatro años
es un dibujo que hay que mirar y relacionar con otro dibujo, y luego con el
vuelo; y con el dedo o con un mando de juego, ni eso.

Enrique lo pidió así (punto 232 de su lista): «que haga algo indicando al
niño "ahora para despegar pulsa la flecha de subir", y el juego para y se
mueve cuando lo hace. Como un modo de vuelo súper guiado que le enseñe a mover
el avión y a que pruebe las teclas, mejor que un teclado con instrucciones,
con una voz amable (la instructora no, por favor). Podría ser Jazlyn
enseñando a su hijo». Y después: «también habrá quien juegue con joystick».

## Decisión

### Una escena, paso a paso, con el mundo esperando

Jazlyn, la comandante, le enseña a volar a **Ara**: Ara pregunta y ella
enseña. Nueve pasos y siete gestos, en este orden —`GUION_DEL_INICIO` en
`src/flight/inicio.ts`—:

1. el saludo;
2. **arrancar** el motor: la llave;
3. **dar gas**;
4. la carrera, mirando —sin gesto—;
5. **despegar** en la Vr: la flecha de subir;
6. la subida, mirando, hasta sesenta metros;
7. **virar a la izquierda**;
8. **virar a la derecha**;
9. **enderezar**: alas derechas y vuelo nivelado;

y el final: la felicitación y **el primer sello del cuaderno**.

En cada paso que pide algo, **el mundo se queda quieto** hasta que se hace: no
corre el modelo de vuelo, ni el gas, ni la mano que sostiene; se mira lo que
pide quien juega —la tecla, el dedo o el mando— y en cuanto pide lo que toca,
el mundo se suelta. Quieto no es colgado: la escena sigue hablando y, si pasa
un rato sin que se haga nada o se aprieta otra cosa, **se le vuelve a pedir
con otras palabras**. Nunca un error: las normas se muestran, no se imponen.

**Cada paso sale a la primera con un dedo torpe.** Lo que se pide es el gesto,
no la puntería: un toque de la flecha de subir en la Vr basta y la mano de la
mamá sostiene el morro hasta que el avión se va del suelo; un empujón del gas
basta y ella lo lleva hasta arriba y lo sostiene hasta el final de la escena
—con un mando de consola el gas es el gatillo, y soltarlo para virar dejaría
el avión sin motor—; al enderezar, en cuanto se empieza, ella termina de
llevar la palanca al centro. Es lo que hace una instructora con doble mando el
primer día, y es lo que ya hace la de la final de Guyrami con el gas.

### Ara, ni niño ni niña

Quien aprende se llama **Ara** y no es niño ni niña: su voz es blanca, su
nombre no lo dice, su cara tampoco, y nada de lo que dice o se dice de Ara
lleva género —«¡Volé yo, sin ayuda!», no «yo solito»—. Así quien juega se
pone en su sitio, sea quien sea. Lo vigila una prueba de `inicio.test.ts`.

### Dónde, y con qué

En **el Chaco** —«el escenario fácil: no hay contra qué chocar», dice su
ficha, «para el primer vuelo de alguien que no ha volado nunca»—, con la
avioneta de escuela, en el peldaño de los pequeños, **alineado en la cabecera
y con el motor parado**, y un día sin viento ni nubes, que es el que elige un
instructor para la primera clase. Rodar por las calles es otra lección.

No en la granja, aunque por cariño era la primera candidata: al volver allí,
**Jazlyn sale a buscarte en bici**, y en esta escena va en el asiento de al
lado. La misma persona en dos sitios a la vez no es algo que un niño deje
pasar.

El modo es **su propio vuelo**: no cambia el sitio, el avión ni el peldaño que
tenga guardados quien juega.

### Sin leer, con el mando que se tenga en la mano

La tarjeta del modo dibuja **el mando que se está usando**, con la parte que
hay que tocar latiendo, moviéndose como hay que moverla, y al lado lo que
pasa en el avión —la nariz que sube, el ala que baja—:

- **teclado**: las teclas dibujadas como en la pantalla de teclas, la llave en
  la I y las cuatro flechas juntas, como están, con la buena encendida;
- **dedo**: la palanca o el gas de la pantalla dibujados con un dedo encima, y
  **otro dedo sobre el mando de verdad** de la pantalla haciendo el gesto; la
  llave se toca en el propio dibujo, como la tarjeta de siempre;
- **mando de consola**: la palanca izquierda, el gatillo derecho y el botón de
  empezar;
- **joystick de vuelo** (el HOTAS X, reconocido por `pad.id`): la palanca de
  gases y la de mando, moviéndose las dos.

Lo que manda es **el último mando que se tocó** (`InputManager.ultimoMando`):
una tecla, un dedo, o un mando de juego que se mueve —un botón que se aprieta o
una palanca que se va de donde estaba, no uno enchufado y quieto—. Cambiar de
mando a mitad cambia el dibujo al momento.

Para que el modo se pudiera hacer con un mando de juego hicieron falta dos
cosas fuera de él, en `src/flight/mandos-fisicos.ts`:

- **La llave en el botón de empezar** —el de las tres rayas en uno de consola,
  el ST en el HOTAS X—: con un mando en la mano no había forma de arrancar el
  motor. Solo responde parado en el suelo, como la tecla.
- **El cabeceo del HOTAS X, al derecho**: tirar de la palanca hacia uno es
  morro arriba, como en cualquier avión y como decía la tabla de su cabecera.
  Estaba con el signo del mando de consola y subía empujando. Sigue escrito sin
  el aparato delante.

### La voz

Jazlyn habla con **la voz de la comandante**, pero **sin megafonía**: aquí no
le habla al pasaje, le habla a Ara, en el asiento de al lado. Ara, con **una
voz nueva del pack, `ara`**. Mientras dura la escena **la instructora se
calla**, y también la tarjeta de la señal y el tutor: un suceso, una voz, y
también un dibujo.

Las frases van una detrás de otra, nunca dos a la vez; si quien juega hace lo
que se pedía antes de que acabe de pedirse, lo que quedaba se calla. Y sin
voz, la siguiente espera el rato de leer la anterior en voz alta: el subtítulo
es lo que queda para quien acompañe al niño.

**Y la conversación no la corta nadie.** Enrique lo probó: «las radios de
otros pilotos cortan la conversación». El Chaco no tiene aeródromo, y su
frecuencia sonaba igual —el «buenos días» de otro avión, la torre mandándole
esperar— sin un solo avión a la vista, metiéndose entre la pregunta de Ara y
la respuesta de Jazlyn. Así que en el vuelo del modo inicio **no hay
frecuencia**: es la primera lección de alguien, en un campo del Chaco, y van
solos, como en la granja. Y de red, mientras dura la escena **la boca es
suya** (`reservar` en `audio/boca.ts`): ni la radio, ni la megafonía, ni los
cantos de cabina piden turno, tampoco lo urgente. La máquina no pasa por la
boca, y el JAZ 20 no la lleva.

### La carrera, con tiempo para explicarla

Del gas a la Vr el JAZ 20 tarda 13,75 s en este peldaño y rueda 226 m; lo
que se dice en ese rato —«¡muy bien! Yo te sostengo el gas…», «¡mamá, vamos
rapidísimo!», «todavía no… yo te aviso»— son 11,5 s de grabación con sus
silencios: unos 14,5. La Vr llegaba a mitad de «yo te aviso» y el «¡ahora!»
lo cortaba: «a mamá no le da tiempo de explicar que un avión necesita
velocidad».

Jazlyn lleva el gas, así que hace lo que haría una instructora con doble
mando: **no deja que el avión llegue a la rotación hasta que acaba de
explicarla**. La mano va aflojando el gas al acercarse y deja el avión
rodando un metro por segundo por debajo de la Vr; al acabar la frase, gas a
fondo, y en un segundo y poco la Vr y el «¡ahora!», con el mundo esperando la
flecha (`SOSTIENE_POR_DEBAJO` en `flight/inicio.ts`). Lo que suelta la mano
es que acabe la frase —sin voz, el rato de leerla—, no un reloj. Medido con
las grabaciones: el «¡ahora!» a los 16,1 s del gas, con 288 m rodados, y los
quince metros de altura a los 450, en una pista de 1.400.

Y la pista manda sobre la frase: si quedan 600 m o menos, se despega aunque
no haya acabado de hablar (`PISTA_QUE_SE_GUARDA`). Con una frase colgada, el
«¡ahora!» llega a los 827 m y los quince metros a los 989.

### Cuándo es la primera experiencia

**Solo cuando sus frases están grabadas en el pack, y eso lo decide el pack**,
no una bandera: `main.ts` lee los manifiestos de las dos voces mientras se
elige piloto y pregunta si cada frase de la escena tiene su receta
(`inicioGrabado`). Un modo guiado sin voz, para quien no lee y en un navegador
sin voces del sistema —el Brave de Linux—, no guía a nadie.

Con voz, el primer vuelo de un piloto nuevo es el modo inicio, en lugar del
hangar y de la pantalla de las teclas; la pantalla sigue en su botón para quien
la quiera. Sin voz, todo sigue como estaba, y el modo está en el hangar —la
ficha de Jazlyn, en «¿A qué jugás?»— y en la dirección, con `?inicio=1`.

## Consecuencias

- Hay **una voz más** que bajar, `ara`, y treinta frases más de la
  comandante. Están las cuarenta en el pack, así que el modo ya es la primera
  experiencia; falta oírlas en el juego: `PENDIENTE-VOCES-inicio.md`.
- El modo se prueba con `scripts/verificar-inicio.mjs`: que un piloto nuevo
  entra solo en él, la escena entera con teclado, con dedo y con los dos mandos
  de juego de mentira, y la tarjeta en las pantallas donde se juega. Y, con
  las voces del pack, que la carrera no pasa de Vr mientras se habla de ella,
  que el «¡ahora!» no pisa al «todavía no» y que en toda la escena no habla
  nadie más.
- El HOTAS X sigue sin probarse con el aparato de verdad.

## La segunda escena: aterrizar con Jazlyn

Fecha: 2026-10-17

### Contexto

La primera escena gustó —«Lindísimo», «estoy emocionado escuchando a mamá
enseñando»— y Enrique pidió la segunda: **Ara aprende a aterrizar con
Jazlyn**, con el mismo tono, los mismos personajes y el mismo mecanismo. Con
una condición que cambia el mecanismo por dentro: **en el aire el mundo no
puede pararse como en tierra**. La primera paraba el avión en el aire para
virar; eso es un truco, y un avión que se queda quieto en el aire es justo lo
que no hay que aprender.

### Decisión

**Una final larga, ya en el aire.** La de la lección de aterrizar —a 3,6 km
del umbral, sobre la senda de los aros— en el Chaco, con el JAZ 20, en
Guyrami y sin viento: el mismo vuelo de la primera, pero llegando. Ocho pasos
y cuatro gestos, en el orden en que aterriza una avioneta de escuela
(`GUION_DE_ATERRIZAR` en `src/flight/inicio-aterrizar.ts`):

1. el saludo, y por qué el avión lo lleva ella mientras habla;
2. **un poquito menos de gas**: se entra algo rápido —35 m/s para una
   aproximación de 33— y en la final se vuela a la velocidad de aproximación;
3. **la nariz un poquito abajo**, apuntando a la pista por dentro de los
   aros: desde ahí la nariz es de quien juega;
4. la senda, mirando: a mitad, qué son los aros —para aprender; en un
   aeropuerto ese caminito lo marcan unas luces, el PAPI—, y cerca de la
   pista, lo que va a pasar;
5. **la recogida**: «¡ahora!, levantá la nariz un poquito, suave», a la
   altura de su manual —quince pies en los de hélice, ver
   `flight/recogida.ts`—, con el gas fuera, que lo saca ella;
6. tocar, primero las ruedas de atrás;
7. **frenar**, en el suelo, y parar en la pista;
8. la felicitación y el sello.

**En el aire, la mano de Jazlyn lleva el avión mientras espera el gesto.**
Es su mano y no un truco: lo que hace una instructora con doble mando. Lleva
el avión por la senda de los aros —la del rombo y la del automático, contada
por el eje y en cero pasadas las luces— y por el eje de la pista, con calma:
nunca corrige más de metro y medio por segundo ni inclina más de doce
grados. Pide a la profundidad un ritmo de subida y al alerón una
inclinación, y el modelo de vuelo dice qué palanca da cada cosa
(`enLosMandos`). Y **solo cede lo que se hace bien**:

- pedido el gas, lo lleva ella a la velocidad de la final y de ahí no se
  mueve, ni para arriba ni para abajo;
- pedida la nariz, es de quien juega, dentro de un pasillo alrededor de la
  senda —un cuarto de la altura, de metro y medio a ocho— que se estrecha
  al acercarse al suelo; lo que se sale, no se cede;
- el alabeo no se pide, y no se cede nunca: el avión va por el eje.

**La final manda sobre el gesto**, como la pista mandaba sobre la frase en
la carrera. Si el gas no llega antes de 2.200 m del umbral o la nariz antes de
1.200, lo hace ella y lo cuenta —«esta vez el gas lo bajo yo, mirá la
palanca»—, sin drama: la próxima lo hacés vos. Medido con las frases al ritmo
de leerlas, que es lo más despacio que va la escena: el gas se pide hacia los
3.000 m y quedan dos «otra vez» antes de su sitio; la nariz, hecho el gas por
ella, hacia los 1.700, y queda una.

**La recogida no espera a nadie.** Se pide tres segundos antes de su altura,
cortando lo que se estuviera diciendo —no corta nada: lo de la senda acaba
muy por encima—, y la mano recoge siempre: en cuanto bajar menos que la senda
es lo suyo, pide de lo que baja la senda a casi nada al tocar, y saca el gas
con la altura, al ralentí al tocar, que es lo que dice el manual. La nariz de
quien juega no se suma a nada: hace empezar la recogida un metro más arriba y
acabar más suave. Medido con el JAZ 20 en Guyrami: sola toca a 0,6-0,7 m/s y
con la nariz de quien juega a 0,3, a unos 350 m del umbral de una pista de
1.400, y se para con más de 600 por delante. Si no tiró, lo cuenta ella:
«esta vez la nariz la levanté yo».

**En el suelo sí espera**: el freno, con el mundo quieto, como la Vr de la
primera. Pedido el freno, frena su mano hasta parar. Y si al rodar quedan
menos de 500 m de pista antes de pedirlo, se pide ya (`PISTA_PARA_FRENAR`).

**Ni frustradas, ni vaca, ni percances, ni nadie más hablando.** Mientras
dura la escena el avión lo lleva ella (`manoDeJazlyn` en `game.ts`): no se
engancha la ayuda del gas de la final de Guyrami, ni la nivelada, ni la
ayuda de rodaje; la aproximación no manda ni propone irse al aire, no hay toma
larga ni aves en la final, y la boca es de la escena como en la primera. En
el Chaco tampoco hay vaca: no es aeródromo.

**El sello es el del Chaco**, el que da el cuaderno por aterrizar allí: el
aterrizaje entra en el cuaderno como cualquier otro, con el «primer sello» o
«ya está en tu cuaderno» según toque. Si en esta toma se ganan las gafas de
sol —el primer aterrizaje que cuenta—, se celebran al acabar la escena: con
la boca de la escena, la voz de la instructora se caía.

**Cómo se abre**: con su ficha, «Aterrizá con Jazlyn», al lado de la de
aprender en «¿A qué jugás?», y con `?inicio=2`. **No es la primera
experiencia**: esa sigue siendo el despegue, y `inicioGrabado` solo mira las
frases de la primera escena.

**Las voces, sin grabar.** Son treinta y una —veintidós de Jazlyn, nueve de
Ara— y van a la lista de grabar detrás de las de la primera, para no
renumerar lo grabado: `PENDIENTE-VOCES-inicio-2.md`. Mientras tanto, la escena
guía con los dibujos y los subtítulos, al ritmo de leerlos.

**Y la conversación, compartida.** La cola de frases de la primera escena
salió a `src/flight/conversacion.ts`, y las dos hablan con ella: dos copias de
la misma cola son dos sitios donde un día se corta a alguien.

### Lo que destapó

**En el Chaco y en el Valle, aterrizar era «fuera de pista».** La lista de
pistas del vuelo solo metía la de casa si el campo tenía aeródromo extraído,
y esos dos —los campos para empezar— no lo tienen: posarse en el medio de la
pista del Chaco a treinta centímetros por segundo salía percance. Nadie había
aterrizado allí. Ahora la de casa va siempre (`pistasDelVuelo` en `game.ts`).

### Consecuencias

- Treinta y una frases más por grabar, y un gesto nuevo del modo inicio en
  cada mando: menos gas, la nariz abajo y el freno, con su dibujo para el
  teclado, el dedo —que señala también el botón rojo del freno—, el mando de
  consola —el gatillo del gas apenas apretado— y el HOTAS X.
- La secuencia se prueba en `inicio-aterrizar.test.ts`, que vuela la final
  entera con el modelo de Guyrami y tres pilotos —quien hace lo que se le
  pide, quien no hace nada y quien aprieta de todo— y mira que se toque
  dentro de la pista, despacio, por el eje, y que se pare en ella.
- Y en el navegador, `scripts/verificar-inicio-2.mjs`: la escena entera con
  teclado, dedo, mando de consola y HOTAS X, que en el aire el mundo no se
  para ni un fotograma, que la mano lo lleva, el error con otras palabras, la
  toma, el cuaderno sin percance ni frustrada, que no habla nadie más, el sello
  y la ficha del hangar.
- La escena dura unos dos minutos y medio. Entre la nariz y la pista hay dos
  ratos callados de unos veinticinco segundos, volando los aros: si con las
  voces se hacen largos, lo que se mueve es `DESDE_LOS_AROS` y `DESDE_LA_SENDA`.

## La tercera escena: el primer vuelo de pasaje de Ara

Fecha: 2026-10-17

### Contexto

Punto 123 de la lista de Enrique: «mi primer vuelo, modo pasajero». La otra
primera vez, la que casi todo el mundo tiene antes que la de pilotar:
**subirse a un avión de línea**. Ara va de pasaje junto a la ventanilla y
Jazlyn es la comandante, en la cabina de mando, hablando por la megafonía. No
se toca ningún mando: es mirar y escuchar. Y con la calma de la tercera
consecuencia del AGENTS.md: es el primer avión de alguien, y lo que aprenda a
sentir aquí se lo lleva puesto el día que se suba a uno.

### Decisión

**El vuelo: de Los Rodeos a La Palma, en el JAZ 90.** Es un reactor regional
de su clase, y entre las islas vuelan turbohélices y reactores regionales. Se
eligió el tramo por lo que hay que contar por la ventanilla: el valle de La
Orotava, el Teide asomando por encima del mar de nubes y La Gomera, **los tres
por la izquierda**, que es donde va Ara, y los tres con su historia —medido con
`lo-que-se-ve-en-ruta.test.ts` antes de elegir; de Gran Canaria a Tenerife o
de Tenerife Sur a Gran Canaria salía menos—. El día es el de siempre del norte
de Tenerife: el alisio del nordeste y su capa de estratocúmulos, puesta a siete
décimas —el mar de nubes de un día de verano, sin llegar a tapar lo de debajo,
ver `TAPA_LA_VISTA`—, sin turbulencia en el camino, que es lo más corriente con
buen tiempo, y de día. Puesto a mano en `main.ts`: la escena es la misma
cualquier día. En el peldaño de los pequeños, que es el de quien viaja por
primera vez, y desde un puesto, como empieza cualquier vuelo.

Es un vuelo de verdad, y por eso dura lo que dura uno: unos treinta y cinco
minutos de puesto a puesto, medidos en el banco. Un salto entre islas casi no
tiene crucero —el punto de descenso llega al poco de nivelar—, y la escena lo
sabe: el cartel del cinturón se apaga en cuanto se nivela, el servicio va
pegado detrás, y lo de la ventanilla se cuenta subiendo, arriba y bajando,
hasta que se prepara la cabina para aterrizar.

**El avión lo lleva su tripulación**, `src/flight/vuelo-de-linea.ts`: la
comandante y su primer oficial, del puesto al puesto, con los mandos y no
moviendo el avión. Piden un ritmo de subida y una inclinación, y el modelo de
vuelo dice qué palanca da cada cosa —`mandoParaSubir` y `mandoParaInclinar`,
los de la mano de Jazlyn en la segunda escena—; la velocidad, con el gas. Lo
que vuela es **lo que pinta el juego**: la raya verde en el suelo, la ruta del
plan con su salida publicada, la senda del plan bajando, y en la final el
localizador y la senda de la pista, que son los mismos que sigue el
automático. Así el avión hace lo que hace con esos mandos y suena como suena,
y la cabina presurizada, el cartel del cinturón, las persianas y la máquina de
fases se enteran de todo sin trucos. Rueda despacio y frena con tiempo, espera
el permiso de la torre en la doble raya —el de la máquina de fases, el mismo
que recibe quien juega—, sube a unos dos mil setecientos pies por minuto y a
doscientos cincuenta nudos por debajo de diez mil pies, vira como mucho a
veinticinco grados y nunca por debajo de ciento veinte metros, saca los flaps
por escalones, el tren a unos doce kilómetros, arma los aerofrenos y el
autofreno, recoge a la altura de su manual con el gas saliendo con la altura,
y frena con la reversa hasta sesenta y cinco nudos.

Y no hace nada antes de lo que en un avión de verdad espera a la cabina de
pasaje: **no arranca** hasta que se arman los toboganes —eso se dice con las
puertas cerradas—, **no rueda** con los motores sin asentar y **no entra en
pista** hasta «tripulación, sentados para el despegue». Son los permisos de la
escena, `PermisosDeLaEscena`, y la espera tiene su red: si la frase se queda
colgada, a los setenta y cinco segundos se entra igual (`RED_DE_LA_ESPERA`).

**La secuencia**, `GUION_DEL_PASAJE` en `src/flight/inicio-pasaje.ts`, en el
orden de un vuelo de verdad: el asiento y la ventanilla; la bienvenida a bordo
de la tripulación y el cinturón, «bajito y bien ajustado»; los toboganes y las
puertas; los motores; el rodaje y la bienvenida de la comandante con el plan;
la espera antes de la pista; «sentados para el despegue»; el empuje de la
carrera; volar; las nubes; el cartel apagado y el servicio; lo que se ve por la
ventanilla; la bajada, los oídos y la isla de llegada; preparar la cabina; los
flaps; la toma; las dos llegadas; y en el puesto, con los motores parados, el
final. Cada momento espera a que no hable nadie y a que el avión esté donde
toca; **el que se pasa de su momento se salta**, que una exclamación de la
carrera no se dice volando. Con la misma cola de frases que las otras dos
escenas —`conversacion.ts`—, así que nada se pisa.

**Quién contesta, y cómo.** La comandante no le contesta a un pasajero por la
megafonía, y aquí no lo hace. Ara habla bajito con quien va a su lado, y lo
que contesta sus preguntas es lo que se oye de verdad en un avión: **anuncios
para todo el pasaje**. Ara pregunta por qué se paran antes de la pista, y la
comandante cuenta que siempre se espera el permiso de la torre; pregunta de
qué están hechas las nubes, y la comandante, ya pasados los diez mil pies —por
debajo, la cabina de mando no habla de nada que no sea volar—, lo cuenta «para
quienes vuelan hoy por primera vez», que es algo que hacen las comandantes de
verdad; se le tapan los oídos, y la tripulación cuenta en la bajada por qué y
qué se hace; oye rugir los motores al tocar, y en la llegada la comandante
cuenta que era para frenar. Siempre la pregunta antes y el anuncio después,
en su momento. Y las nubes, lo que se ve: si la subida atraviesa una, Ara
pregunta con la ventanilla blanca; si pasa entre ellas, al dejarlas abajo.

Para Ara, Jazlyn es su mamá, como en las otras dos escenas: «¡Es mamá! Ella es
la comandante, allá adelante en la cabina». Ara no la ve; la oye por el
altavoz del techo.

**Lo que ya había, tal cual.** Los anuncios de la megafonía los monta el juego
como en cualquier vuelo con pasaje —con el campo, el plan, el tiempo de allá y
el producto de la granja de hoy—, con la misma boca y la misma llamada de
cabina delante de lo que se le dice a la tripulación; lo que se ve por la
ventanilla lo elige `LoQueSeVe`, con su cabina estéril y su capa de nubes, y
se monta con su lado, su saludo y su historia. La escena solo decide
**cuándo**. Ara dice algo de lo que se señala solo si va por su lado: lo del
otro lado lo cuenta la comandante igual, que le habla a todo el pasaje.

**Desde el asiento, lo que se oye en el asiento.** La megafonía, la cabina de
pasaje y sus tonos —el del cinturón y las llamadas—, los motores, el tren y la
reversa. **No** las cajas de la cabina de mando —la cuenta del radioaltímetro,
«minimums», los avisos—, que suenan por el altavoz de una cabina con la puerta
cerrada y el pasaje no las oye nunca; ni la radio, ni la instructora, que en
ese vuelo no va; ni los tonos del juego para quien pilota. La boca es de la
escena, como en las otras dos, y deja pasar los anuncios y lo de la ventanilla
solo mientras la escena los está diciendo (`clavesDeLaEscena`).

**Sin leer y sin tocar nada.** La vista es la del asiento de Ara, la
ventanilla izquierda, el asiento de siempre. Sin relojes, ni mandos, ni torre en la
pantalla: se queda la tarjeta de la escena, el cartel del cinturón y el menú
con el sonido y la pausa. La tarjeta dibuja **qué mirar** —la ventanilla, el
ala, el motor, las nubes o el cinturón, con lo que hay que mirar latiendo— y
quién habla: Ara; Jazlyn con un altavoz pequeño en la esquina; y la
tripulación, a la que no se ve, con el altavoz del techo y sin cara inventada.
La llave no responde, ni la cámara cambia: los motores son de la tripulación,
y el sitio, el de Ara.

**El sello, de visita.** Ara no ha pilotado, así que no se apunta ni el
despegue, ni el aterrizaje, ni las horas, ni las gafas, ni los galones, ni el
final de vuelo de quien pilota. Lo que se lleva es **el sello de La Palma**,
como el de un pasaporte, en una lista aparte del cuaderno —`deViaje`— que da
sello y no grado: el grado pide campos volados. Al final, el sello a la vista
y un botón: **volver al hangar**, que un avión de línea traído de pasajero no
se sigue volando.

**Cómo se abre**: con su ficha, «Viajá con Jazlyn» —y no «Volá de pasajero»,
que diría si Ara es niño o niña—, al lado de las otras dos en «¿A qué jugás?»,
y con `?inicio=3`. **No es la primera experiencia**: esa sigue siendo el
despegue.

**Las voces, sin grabar.** Veintiocho frases nuevas —veintitrés de Ara, tres
de Jazlyn y dos de la tripulación de Canarias, que el vuelo es en Canarias y
la tripulación habla como se habla en su base—, a la lista de grabar detrás
de las de las otras dos escenas: `PENDIENTE-VOCES-inicio-3.md`. Mientras tanto,
subtítulos y dibujos, al ritmo de leerlos.

### Consecuencias

- La tripulación se prueba en `vuelo-de-linea.test.ts`, que vuela el JAZ 90
  con el modelo de Guyrami del puesto al puesto sobre un mundo de mentira: que
  rueda despacio y por la raya, no entra en pista sin permiso, despega en la
  Vr y por el eje, no vira pegado al suelo, sube y baja como un avión de línea,
  toca suave en la zona de toma y para en su puesto. Y la escena, en
  `inicio-pasaje.test.ts`, con una tripulación de mentira: el orden, que nada
  se pisa, los permisos, que la respuesta va después de la pregunta, lo de la
  ventanilla y que nada dice si Ara es niño o niña.
- En el navegador, `scripts/verificar-inicio-3.mjs` vuela la escena entera con
  el reloj del juego acelerado, desde el hangar y con `?inicio=3`, y en un
  teléfono apaisado. Medido: se despega a menos de un metro del eje y se toca
  a unos sesenta centímetros por segundo, sin percance, sin una frase encima
  de otra y sin nadie más hablando.
- La llegada a La Palma, si se pasa la salida rápida, remonta la pista hasta
  el final y vuelve por ella, que es lo que pinta la raya: un par de minutos
  más de rodaje.
- Hay ratos callados largos, sobre todo bajando: son los de un vuelo de
  verdad. Si con las voces se hacen largos, lo que se mueve es el guion, no el
  vuelo.

### Con las voces grabadas: lo que se espera, se espera oído

Grabadas las veintiocho, el banco bajó de veinte a diecisiete. La
tripulación entraba en pista antes de que sonara «sentados para el
despegue», «¡cómo empuja!» se saltaba y el Teide no se contaba. Las tres
tenían la misma raíz, medida con el reloj de pared al lado del de la escena:
**lo que espera a una voz se medía con el reloj del vuelo**. Con el del juego
acelerado doce veces, la red de la espera se cumplía a los seis segundos de
pared, y el tope de una frase daba por perdida a los tres una que estaba
sonando. Debajo había dos más que sin grabar no se veían: la reserva de la
boca no reconocía las recetas —la bienvenida con el plan, la ventanilla, el
servicio, el descenso—, y la bienvenida se pedía con el juego todavía en
«arrancando», así que la boca las tiraba.

Así que **lo que espera a una frase espera a que se haya oído**, no a que se
haya pedido: la conversación apunta cómo acabó cada una —sonó, muda,
cortada o por el tope— y mide su tope con el reloj de la voz; los permisos
miran lo oído y sus redes son de pared. Alineada, la tripulación no da gas
con Ara a media frase —como un «alineado y espere»—, y «¡cómo empuja!» va al
dar gas, que es cuando empuja. Un anuncio de tierra se pide cuando el juego
dice que vale. Y con el reloj acelerado, mientras habla la escena el juego
va a su ritmo: lo que se oye no se acelera. El banco comprueba ahora que
todo lo que dice la escena se oye entero, y el Teide, sin falta.

### Contado de verdad: los planos, la tripulación y lo que se explica

Fecha: 2026-10-18

Enrique probó la escena y le gustó, pero la encontró aburrida: «está todo el
tiempo la vista de ventanilla», no se oía a la tripulación enseñar el
cinturón y el chaleco, la ventanilla del JAZ 90 no enseñaba el motor que Ara
decía ver, Ara no se pegaba al cristal como haría cualquier niño, y «¿de qué
estará hecha?» se quedaba casi sin respuesta. Medido en el banco, con las
voces grabadas: **cinco minutos y medio callados bajando**, otros tres y medio
en la final y tres rodando al llegar. «La experiencia de montar en un vuelo
hay que contarla, explicarla con cariño y que el niño entienda todo lo que
está pasando.»

**Los planos.** La escena dice desde dónde se ve cada momento —`Plano` en
`inicio-pasaje.ts`— y `cameras/escena.ts` pone la cámara: la ventanilla de
Ara, Ara **pegada al cristal** mirando el motor o el mar, y el avión **por
fuera** en lo que se cuenta: rodando mientras la comandante da la
bienvenida; la carrera y el despegue desde la orilla de la pista, con la
cámara clavada en el suelo siguiendo al avión; el giro desde detrás, sin
inclinarse con él; una vuelta entera alrededor en crucero; el ala desde
encima del fuselaje cuando la comandante explica qué lo sostiene y cuando
salen los flaps; la toma desde la orilla de la zona de toma; y el rodaje de
llegada. Pegarse al cristal es un movimiento de la cabeza, despacio; lo de
fuera es un corte, con un fundido de medio segundo hasta tapar y medio para
destapar, y **un corte no cae nunca a media frase**: la escena calla el rato
del fundido (`CORTE_DE_PLANO`) y lo que venía detrás espera. El sonido sigue
siendo el del asiento: quien escucha es Ara. Con movimiento reducido, la
vuelta alrededor no da vueltas.

**El asiento de Ara**, `world/asiento-de-ara.ts`. Medido con rayos por el
cristal: desde el asiento de siempre, sentado, el motor del JAZ 90 no asoma
ni un píxel —cuelga debajo del ala y tres metros por delante del borde de
ataque—. Sentado, desde ninguna ventanilla se ve; **pegado al cristal**, sí.
Así que el asiento de Ara es la ventanilla, de las que caen encima del motor,
que con la cara en el cristal deja ver a la vez más motor y más ala, y Ara
dice «desde acá se ve el ala del avión, y el motor» pegada a él. Sentada va
algo más cerca del cristal que un adulto con la espalda en el respaldo. Lo
que va detrás del ala —los flaps— no se ve desde ahí, ni pegada: cuando Ara
los nota, se ven por fuera. Y no se pinta el asiento propio vacío detrás:
en él va Ara.

**El cinturón** sale en la ventanita —la hebilla que entra hasta el clic, la
cinta que se ajusta, la tapa que se levanta— con el cartel del techo
encendido, y el cartel del HUD parpadea al pedirlo la tripulación.

**La demostración de seguridad**, por la megafonía y con la voz de la
tripulación de Canarias, mientras se rueda —como en los saltos entre islas—,
cada cosa con su dibujo, en el orden y con el contenido de la norma europea:
el AMC1 CAT.OP.MPA.170 de EASA (Decisión 2017/008/R) pide antes del despegue
**demostrar** el cinturón —cómo se abrocha y se suelta—, las salidas, el
oxígeno «si se requiere» y el chaleco «si se requiere», e **informar** de las
luces del suelo hacia las salidas, los aparatos electrónicos y la tarjeta de
seguridad, que hay que leer antes de despegar. El GM2 del mismo artículo
pide decir cómo ponerse la mascarilla a tiempo y **ayudar a los demás**
después, y cuándo y dónde se infla el chaleco; la circular AC 121-24D de la
FAA dice lo mismo de la mascarilla: la de uno antes que la de un niño. Que el
chaleco **no se infla dentro del avión** es lo que dicen las tripulaciones en
su demostración: está por verificar en el manual de un operador concreto. El
chaleco va porque se despega y se aterriza sobre el mar; las mascarillas,
porque el JAZ 90 vuela presurizado y las lleva —ver la despresurización del
juego—. La tripulación no entra en pista sin la demostración acabada: la red
de la espera cuenta desde que se pide «sentados para el despegue», no desde
la doble raya.

**La tripulante, en persona.** La comandante no le contesta a un pasajero
por la megafonía, y eso no cambia; lo que entra es lo que hace una
tripulante de verdad con un niño que vuela por primera vez: **se acerca al
asiento** y le habla bajito, sin altavoz, con su voz y el tú de Canarias.
Revisa el cinturón y la persiana antes de despegar —y cuenta por qué va
subida—, le trae el agua con el servicio y le explica las nubes de cerca; por
el pasillo, en la bajada, el motor, el frío de fuera, las islas, el camino,
las luces de la pista, el baño y los telescopios de lo alto de La Palma; y antes de sentarse para aterrizar, la
última revisión. Tiene cara, porque Ara la ve: su moño, el pañuelo y las
alas en la solapa. Solo entre el servicio y la cabina preparada, que es
cuando una tripulante anda por el pasillo.

**Lo que se cuenta, y cuándo.** El guion fijo sigue mandando; lo nuevo son
las **charlas** (`CHARLAS_DEL_PASAJE`): lo que pasa —el golpe del tren al
guardarse, el giro, el «plop» de los oídos, las nubes otra vez bajando, las
ruedas para aterrizar— se dice en cuanto se calla lo de antes; lo explicado
espera su rato de silencio y su tramo del vuelo: la comandante solo por
encima de los diez mil pies —cómo se sostiene el avión, que vamos más alto
que el Teide y a más de quinientos por hora, que para bajar no se apagan los
motores—, y la tripulante, en los tramos de la bajada repartidos por la
distancia que falta (`BAJANDO`), medidos con la bajada de verdad. Lo que se
dice tiene que ser verdad cuando se dice: «más alto que el Teide» solo por
encima de su cumbre, «bajo cero» solo con la temperatura de fuera bajo cero,
el ala de Ara «apunta abajo» solo si el giro es a su lado.

**Las nubes**, de verdad: las del mar de nubes son de gotitas de agua (el
estratocúmulo «se compone de gotitas de agua», Atlas Internacional de Nubes
de la OMM) y las de muy arriba de cristalitos de hielo (el cirro, «casi
exclusivamente de cristales de hielo», mismo atlas); se ven blancas porque
las gotitas desparraman todos los colores de la luz del sol por igual (Met
Office, «Why are clouds white?»); cruzarlas mueve un poco el avión y moja la
ventanilla, y no pasa nada. La explicación de la sustentación es la de la
regla 4: el ala inclinada empuja el aire hacia abajo y el aire la empuja
hacia arriba, con menos presión encima —en el dibujo, el «−» y el «+»—, y nada
de caminos más largos. El PAPI, del Anexo 14 de la OACI. El Gran Telescopio
Canarias, en el Roque de los Muchachos, de 10,4 m (ficha del Ministerio de
Ciencia); que una ley protege el cielo de la isla, por verificar.

**Las ventanitas**: los dibujos van en la ventana de cristal de las fotos de
las historias —ilustraciones desde el punto 306—, que ya sabe dónde cabe sin
tapar nada; y en esta escena también salen las de las historias que cuenta la
comandante. **Dibujados en el
código** (`ui/dibujos-del-pasaje.ts`), como se aprobó en el punto 231 —«escenas
con el propio motor del juego, sin licencias»—: diecisiete láminas en SVG, sin
letras salvo el «EXIT» de los letreros, con su animación quieta si se pide
movimiento reducido. Ninguna foto nueva ni ninguna imagen generada.

**Y los esquemas, con ilustración** (punto 311, 19-10-2026): los dibujos que
explican cómo funciona algo —el oído, las máscaras, el chaleco, la nube de
cerca, el frío, lo alto, el meneo, el motor, el ala y los compartimentos de arriba— salen con
una ilustración de cuento de la misma colección que las demás, entera y en
4:3, en lugar del SVG; las islas, con la del Teide en corte, y los
telescopios, con la del cielo de La Palma. Siguen en SVG los que imitan una
señal de verdad —el cartel del cinturón, el letrero de la salida, el PAPI, el
mapa con el vuelo de ahora…—. El ala y el motor llegaron un día después y entraron igual.
Lo decide la receta: un esquema con la clave del dibujo lo sustituye. Ver
`ilustracionDelDibujo` en `ui/ilustraciones.ts`.

**Las voces, sin grabar**: sesenta y siete frases nuevas —6.338
caracteres—, en
`PENDIENTE-VOCES-inicio-3.md`. Mientras tanto se leen.

### Consecuencias

- `inicio-pasaje.test.ts` vuela además **el vuelo medido** en el banco, con
  sus tiempos, su giro, sus nubes y su mar, y con lo que dura cada frase —su
  toma, o sus letras al ritmo de su voz—: cada momento en su sitio, la
  demostración en su orden y antes de la pista, la comandante por encima de
  los diez mil pies, la tripulante solo por el pasillo, **ningún silencio de
  más de setenta segundos en el aire** —lo más largo sale de sesenta y cinco,
  y casi todos entre treinta y cinco y cincuenta y cinco— y **ningún corte de
  cámara a media frase**. `asiento-de-ara.test.ts` cuenta con rayos lo que se
  ve desde el asiento de Ara en el modelo de verdad, y `escena.test.ts`, el
  fundido y la cámara de fuera.
- El banco del navegador mira los planos que de verdad se ven, el velo, la
  ventanita, la demostración, las nubes explicadas, los silencios y el
  asiento, y saca capturas de cada momento nuevo.
- Las ventanas de los tramos de la bajada están medidas en esta ruta: si un
  día cambia el plan de Los Rodeos a La Palma, se miden otra vez con
  `OGA_PASAJE=1` en la prueba del vuelo medido.

### El kit de viaje y el hilo musical

Fecha: 2026-10-18

Punto 275 de la lista de Enrique, en dos peticiones. La primera: «a los
niños suelen darles algo para que se entretengan durante el vuelo […] se le
pone un juego que tenga que resolver en la pantalla y que tenga sentido
educativo también», y que se diga así: «volar es apasionante, pero los vuelos
duran un ratito». La segunda: «hilo musical, en los vuelos a veces ponen algo
de música ambiente».

**El kit, cuándo.** Lo trae la tripulante, en persona, en el tramo largo y
tranquilo del vuelo: la bajada, pasado lo último que la comandante señala
por la ventanilla y con más de cinco minutos por delante sin megafonía —medido
con la bajada del banco, hacia los 84 km de La Palma—. Es un momento del
guion, `kit`, entre los oídos y la isla de llegada: «¡Mira lo que te traigo:
tu kit de viaje!», «volar es apasionante, pero los vuelos duran un ratito», y
Ara da las gracias e invita a jugar. Desde ahí, abajo a la derecha, la
mochilita, que late hasta que se abre. Es lo que hacen las aerolíneas con
quien viaja con pocos años, y se dice como es.

**Los juegos**, dos —`flight/kit-de-viaje.ts`, dibujados en
`ui/kit-de-viaje.ts`—:

- **Armá el avión**: el ala, el motor, la cola y las ruedas, arrastradas a su
  hueco en el dibujo del avión —el hueco tiene la forma de la pieza—. Al
  encajar, Ara dice para qué sirve, y es lo de verdad: el ala empuja el aire
  hacia abajo y el aire la empuja hacia arriba (regla 4: nada de caminos más
  largos); el motor echa el aire hacia atrás y eso empuja el avión; la cola
  lo lleva derecho como las plumas de una flecha y su timón le mueve la nariz
  a los lados; las ruedas son para la pista y se guardan al volar.
- **El camino del avión**: el mapa de las islas con sus coordenadas, y los
  números del vuelo de hoy —1 Los Rodeos, 2 el Teide, 3 La Gomera, 4 La
  Palma— que se tocan en orden para dibujar el camino. El camino pasa al norte
  del Teide y de La Gomera, que se ven por la izquierda, como desde la
  ventanilla de Ara; y lo que dice Ara de cada sitio es verdad: el Teide es la
  cumbre más alta de España, y en La Gomera se habla todavía silbando.

El tercero que se pensó, buscar en la ventanilla lo que se nombra, se quedó
fuera: la escena entera ya lo hace con la ventanilla de verdad, y dos juegos
bien hechos valen más que tres a medias.

**Se gana siempre.** Una pieza soltada en otro sitio vuelve a la bandeja y su
hueco se ilumina, con un «¡casi!» sin regaño; un número de más adelante deja
brillar el que va; y si pasa un rato sin acertar, también brilla lo que toca,
la primera vez sin palabras. A la segunda que una pieza no encuentra su
hueco, tocarla la lleva sola. Se juega arrastrando, con dos toques —la pieza
y su hueco— o con el teclado, que lleva cada pieza a su sitio. Sin leer: el
hueco tiene la forma, lo que toca brilla, y Ara dice qué hacer.

**El vuelo manda.** El kit se cierra cuando se quiera y el juego se queda
donde estaba. Mientras habla la megafonía **se pausa** —se apaga y se ve el
altavoz encima—, que lo que se dice para todos va primero; y desde que se
prepara la cabina para aterrizar no se juega: la tripulante pide guardarlo
en el bolsillo del asiento, como se recoge todo para aterrizar de verdad, y
el kit se recoge y ya no se abre.

**Y la escena, con el kit en las manos, no cuenta encima.** Lo que va en el
guion y lo de la ventanilla se dicen igual; lo que se cuenta cuando viene a
cuento —las charlas— espera mientras se juega, que una explicación encima de
un juego es ruido. Con su red: un kit abierto que nadie toca en 45 segundos
no cuenta como jugando, y la escena vuelve a hablar. Lo que dicen los juegos
va por la misma conversación que todo, una frase detrás de otra; y lo que un
juego tenía en la cola sin decir se calla al cerrarlo o al cambiar de juego.

**Dónde.** Debajo de la tarjeta de la escena, del ancho que cabe entero en
la proporción de sus dibujos y sin pisar el volumen —en la tablet del aula
va a media altura a la izquierda—. En el teléfono apaisado, con el kit
abierto, la tarjeta sube arriba del todo para dejarle sitio, y los números
del camino crecen para el dedo.

**El hilo musical** —`audio/hilo-musical.ts`— suena al embarcar, con el
avión en el puesto y los motores parados, y al llegar al puesto con los
motores apagados; y se calla, para todo ese rato, en cuanto habla la
megafonía o suena una llamada a la tripulación, que es lo que pasa cuando la
tripulación coge el micrófono. Por el **altavoz del techo**, con el filtro de
la megafonía —un altavoz que no da graves, su bocina y el rebote del
pasillo—, armado por la misma función que el de las voces, pero hacia el bus
de la música: dieciocho decibelios por debajo de la voz y diez más mientras
alguien habla. Va con el volumen de todo lo demás, que no hay otro. La de
Paraguay en los vuelos de Paraguay y la de Canarias en los de Canarias,
según el habla del aeródromo; y solo donde hay pasaje, también en los vuelos
de línea de quien pilota, que desde la cabina de mando la oye tras la puerta.
Espera dos segundos en el rato antes de sonar, y lo que la megafonía ya decía
al abrirse el rato no lo acaba: se espera a que calle. Así, en un vuelo de
quien pilota —donde el «armar toboganes» se pide al segundo de estar en el
puesto— no asoma para callarse enseguida, y la que se oye es la de la llegada;
y al apagar los motores con la tripulación despidiéndose todavía, suena en
cuanto termina. En la escena, el embarque dura un poco más que antes —ocho
segundos callados entre lo primero de Ara y la bienvenida— para que se oiga.

Las piezas son de Oksigenia, con licencia de uso de su proveedor, y vienen de
noventa segundos con su fundido final. `scripts/hacer-musica.mjs` las deja en
**una vuelta sin salto**: busca, por las notas y por el pulso, dónde se parece
el final al principio, afina el punto a la muestra y los cruza en dos
segundos y medio. Quedan vueltas de 75 y 77 segundos, igualadas con las voces
con una ganancia fija —no con `loudnorm`, que la cambia por el camino—, en
mono, en Opus y en AAC: unos 450 KB la que se baja. Llevan medio segundo de
más a cada lado para que el silencio que un códec mete al empezar no caiga
dentro del bucle. Entran por `import`, con la huella en el nombre: no van en
la precarga, se bajan la primera vez que suenan y las guarda el trabajador de
servicio.

**Las voces, sin grabar**: diecisiete frases nuevas, 1.427 caracteres —catorce
de Ara y tres de la tripulante—, en `PENDIENTE-VOCES-inicio-3.md`.

#### Consecuencias

- `kit-de-viaje.test.ts` juega los dos juegos con quien acierta, con quien se
  equivoca y con quien toca a lo loco —cincuenta semillas cada uno—, y en
  todos se acaba ganando; y prueba dejarlo, la pausa y el recogerlo.
  `inicio-pasaje.test.ts` lo juega dentro del vuelo medido: que llega en un
  tramo tranquilo, que se juegan los dos enteros sin que ninguna charla
  empiece encima, que se pausa con la megafonía y que se recoge antes de la
  final. `hilo-musical.test.ts`, cuándo suena, cuál, por qué altavoz y que
  se calla.
- El banco del navegador juega los dos con el dedo —las piezas arrastradas
  con toques de verdad— en el teléfono, la tablet y el portátil, mira que el
  kit cabe sin tapar la tarjeta ni los botones, y en el vuelo entero abre el
  kit, dibuja el camino, lo deja abierto y mira que la aproximación lo pausa
  y la tripulante lo recoge; y que la música suena en el embarque por el
  techo, se calla con la bienvenida y vuelve en el puesto.
- Con un kit en las manos, las charlas de la bajada se juntan al cerrarlo, y
  alguna puede quedarse sin decir: es lo que pasa en un vuelo de verdad con
  un juego delante, y lo que tiene su momento se dice igual.

### Enmienda H38i (20-11-2026): la subida a FL170 y lo que dejó de caber

La tripulación sube ahora a su indicada y a su Mach, el modelo sencillo llega
a esa velocidad y el plan sube como se vuela (ADR 0019, enmiendas H38f, H38g y
H38h). De Los Rodeos por la 12 a La Palma por la 36 el salto nivela a FL170 a
los 911 s de escena, con 97 s de crucero, y empieza a bajar a los 120,7 km de
la pista; antes nivelaba a FL190 con 23 s de crucero y bajaba desde los 131.
Por encima de los diez mil pies, de cruzarlos subiendo a cruzarlos bajando,
se vuela unos dos minutos menos —de unos 710 s a unos 580—, y el banco de la
escena pasó de 126 de 126 a 123. Lo que dejó de caber, cada cosa con su causa:

- **La siesta adelanta menos, y era la vara.** Ara se duerme en cuanto la
  comandante acaba lo de los diez mil pies y el Teide, y la despierta el *ding*
  del «ya estamos arriba»: es lo que queda de subida, ahora 139 s de vuelo en
  vez de 189, a unos 176 m/s por el suelo en vez de 142. Adelanta 24,5 km, el
  avión del mapa se mueve 53 puntos de 480 y lo de al dormirse queda 24,5 km
  atrás. El banco pedía 25 km, puestos con la subida de antes. Lo que manda es
  lo del juego —una siesta de dos minutos de vuelo como poco, `SIESTA_MINIMA`,
  que salió de que Enrique no notara minuto y medio— y que se note en el mapa:
  el banco pide ahora esos dos minutos y lo que vuelan a la velocidad de
  arriba, 20 km.
- **«Armá tu avión» se quedaba sin rato, y era del juego.** El kit esperaba a
  los 104 km de la pista, puestos con la bajada que empezaba a los 131, y se
  recoge cruzando los diez mil pies, que con la bajada de FL170 llegan un
  minuto antes: 159 s de kit, la luz verde entera son 131 —con la pausa de la
  megafonía de La Gomera— y su canción 21, y a la tripulante pidiéndolo de
  vuelta le quedaban 26 s detrás de la luz; el banco no llegaba ni a elegir el
  avión. Ahora el kit llega en cuanto se ha contado lo que solo vale arriba
  —el porqué del ralentí, detrás de los oídos—, con sus once segundos callados
  delante; los 104 km se quedan de red por si ese porqué no se dice. Y el
  porqué del ralentí espera cinco segundos callados detrás de los oídos, no
  doce: es la respuesta a lo que Ara acaba de notar, como el del gas de subida,
  que espera dos.
- **«Más alto que el Teide» no se decía, y era del juego.** El Teide sí se
  presentaba antes de pasarlo en altura: la comandante lo señala por la
  ventanilla, con su historia, subiendo hacia los 10.700 pies, y la cumbre se
  pasa medio minuto después. Lo que se perdía era decir que ya se vuela por
  encima. Esa charla espera a que Ara se despierte, y luego trece segundos
  callados; y solo vale por encima de la cumbre con 150 m de margen. El
  crucero lo llenan el servicio, el baño y la tripulante con las nubes y el
  plop; la bajada, los anuncios, los oídos, el ralentí y el kit, con el que ya
  no se cuenta nada que venga a cuento. Los trece segundos no llegaban nunca.
  Ahora Ara lo pregunta nada más abrir los ojos, detrás de su «me dormí» y con
  el mapa de lo que se voló delante, antes del servicio
  (`primeroAlDespertar`, `atenderAlDespertar` en `motor-del-pasaje.ts`). Solo
  si quedan por delante veinte segundos de crucero para eso y, detrás, el
  minuto que el guion cuenta para el servicio, el baño y la tripulante en el
  asiento: con menos, espera su silencio como siempre, que con una bajada
  larga lo encuentra. Con veinte más los veinticinco del baño, en un crucero
  de un minuto la tripulante llegaba al asiento justo al quitar el gas para
  bajar y saludaba entre el ralentí y el anuncio.

#### Medido

- `inicio-pasaje.test.ts`, con el vuelo medido de antes: lo de la tripulante
  entero y en su orden con cruceros de 20 a 90 s y ahora también de 96, 104 y
  120; con uno de 110, Ara pregunta la altura detrás del «me dormí» y el
  servicio, el baño y la tripulante van enteros detrás; con uno de 60, no se
  adelanta. El kit llega con diez segundos sin megafonía delante, no treinta.
- **El banco de la escena** (`verificar-inicio-3.mjs`, reloj ×12, con la
  tarjeta de verdad): **124 de 126**, de 123. La siesta, de 779 a 917 s, 139 s
  de vuelo y 24,5 km: pasa. Ara pregunta la altura a los 933 s, siete después
  del «me dormí», con el Teide por su ventanilla a 28,7 km; la comandante
  contesta y Ara dice lo de las montañas de juguete; el servicio, el baño y la
  tripulante, detrás: pasa. El kit llega a los 1.119 s, once segundos después
  del porqué del ralentí, con 161 s hasta que se pide guardarlo (eran 159).

#### Lo que no

- **«Armá tu avión» sigue sin rato en el banco.** El kit ganó lo que esperaba
  a su kilómetro —diecisiete segundos— y los siete del ralentí, pero la
  pregunta de la altura empuja a la tripulante del crucero a la bajada: su
  plop acaba a los 1.037 s, quince después del punto de descenso, y todo lo de
  la bajada va quince segundos detrás. La luz verde acaba a los 1.252 s y su
  canción suena hasta que la tripulante pide el kit, a los 1.285: el banco,
  que vuelve a elegir con la canción ida, no llega a elegir el avión. Por
  encima de los diez mil pies, despierta, Ara tiene unos 370 s; lo que cuenta
  la escena y el kit con los dos juegos y algo de rato para las piezas piden
  unos 400. Es una decisión, y no se ha tomado aquí: o la siesta deja de
  comerse la subida entera, o el kit cuenta con un solo juego en el vuelo, o
  el salto sube a otro nivel.
- **El toque en el Teide ya no se prueba.** El banco toca el Teide en un
  silencio, por su cristal y antes del kit; con el H38h lo hacía en los nueve
  segundos libres al acabar el crucero, que ahora son de la pregunta de la
  altura. El toque mientras alguien habla sí se prueba, y espera a que se
  calle o se queda en su aro.
- **Lo que tampoco se dice desde la subida a FL170**, sin vara en el banco: la
  explicación del ala de la comandante —«cómo se sostiene en el aire un avión
  tan pesado»—, que espera dieciséis segundos callados al despertar y no los
  encuentra antes del kit, y la ruta que cuenta la tripulante bajando. Con
  FL190 se decían las dos. Lo del ala lo cuenta Ara si se pone esa pieza en
  «Armá tu avión», que es justo lo que se queda sin rato.

### Enmienda H38k (20-11-2026): por encima de los diez mil pies, lo que cabe

La tripulación ya vuela a sus velocidades de verdad (ADR 0019, enmiendas H38f a
H38h) y los niveles van por la tabla de verdad (H49): de Los Rodeos por la 12 a
La Palma por la 36 el salto nivela a FL160, con unos 170 s de crucero, y deja
unos **570 s por encima de los diez mil pies**. Lo que cuenta la escena, una
cosa detrás de otra, pide unos **650** —medido en H38i—. Bajar el nivel no da
rato (H38j, en su rama y sin juntar): por encima de los diez mil pies se vuela
lo que pone la ruta, no el nivel. La decisión que faltaba la tomó Enrique:

> «Pero si el vuelo es rápido no hay que entretener tanto al jugador».

#### Decisión

- **El vuelo no se toca** para que quepa más escena: ni el nivel, ni la ruta,
  ni las velocidades.
- **La escena va por prioridad, escrita en un solo sitio**: `LO_DE_ARRIBA`, en
  `guion-tenerife-la-palma.ts`, con lo que dura cada cosa. Primero lo de un
  vuelo de verdad, que pasa siempre: la comandante al cruzar los diez mil pies
  (53 s), el crucero con el servicio, el baño y la tripulante (110) y la bajada
  con el anuncio, los oídos y el porqué del ralentí (86). Después, lo de Ara,
  lo que se explica antes que lo que entretiene —«la experiencia de montar en
  un vuelo hay que contarla, explicarla con cariño», 18-10-2026—: a qué altura
  se va (30), cómo se sostiene el avión (36), el kit de viaje (166) y la siesta
  (136 como poco), que es lo último porque nació de «que el niño no se aburra
  esperando a aterrizar; esto tarda» (punto 304), y un salto corto no tarda.
- **Lo que no es esencial empieza solo si cabe** (`cabe`, en
  `motor-del-pasaje.ts`): ella y todo lo de más prioridad que queda por pasar,
  antes de cruzar los diez mil pies bajando. Ahí se recoge el kit, la
  comandante deja de hablar de lo que no es volar y empieza la llegada. Si no
  cabe, **se omite entero**, se apunta en `omitidos` con lo que quedaba y lo
  que pedía, y no se vuelve a mirar: el rato solo encoge, y algo que entra y
  sale de caber según el paso del juego es un filo, no una regla. Una charla
  que no cabe no se empieza; la siesta se mira antes del bostezo, y bostezada
  ya no, que un bostezo sin siesta es dejarla a medias; el kit omitido se
  lleva sus dos momentos, el de darlo y el de pedirlo de vuelta, que no
  cuentan como saltados. Y la siesta que llega a la bajada sin haber tenido
  sus dos minutos tranquilos también se apunta, «sin rato», que el banco dice
  qué se omitió y por qué.
- **El rato lo da el juego**: `hastaLosDiezMil`, lo que falta hasta donde la
  senda de la bajada del plan cruza los diez mil pies (`distanciaBajandoA` en
  `ruta.ts`), a la velocidad de ahora por el suelo, también bajando. Bajando
  se queda algo corto, que se va frenando: lo justo se queda fuera antes que
  dentro.
- **El kit, con dos minutos de juego o nada** (`RATO_DEL_KIT`, 166 s hasta
  los diez mil pies): los once segundos callados que espera, unos quince de
  la tripulante dándolo y Ara dando las gracias, **dos minutos de juego** —una
  partida entera de la luz verde, minuto y medio, con su canción, o un avión
  de «Armá tu avión» con sus piezas, sus luces y su despegue sin prisa— y
  veinte de una megafonía que lo pause por el camino. Menos es abrirlo y
  guardarlo, y eso enseña que un juego se deja a medias. Y el kit espera a que
  se cuente lo de la comandante que va antes que él en la lista.

#### Medido

- `inicio-pasaje.test.ts` vuela la escena con el vuelo medido a otro nivel
  —la misma bajada medida, desde su altitud, que el perfil lo pone la
  distancia a la pista— y con todos los números que le da el juego:
  - **el salto de ahora**, FL160 y dos minutos de crucero, **570 s** por
    encima de los diez mil pies: **no hay siesta** —la subida por encima de los
    diez mil pies no deja sus dos minutos tranquilos detrás de la comandante,
    y se apunta «sin rato»—; Ara, despierta, oye arriba la altura y el ala,
    enteras; y en ese vuelo de mentira, que baja más despacio que el de
    verdad, el kit llega con sus dos minutos de juego sin la megafonía en
    medio;
  - **el de antes**, FL190 y el crucero medido, **705 s**, y **uno largo**, con
    cinco minutos de crucero, **947 s**: pasa todo, la siesta de 163 s, la
    altura, el ala y el kit con su rato, y nada omitido;
  - y en los tres, lo esencial entero y en su orden, nada pisado, nada a
    medias —lo omitido sin una frase, lo demás con todas— y ningún silencio de
    más de setenta segundos en el aire.
- La prueba que pedía el kit antes que el ala (17-11-2026) pide ahora el ala
  antes: va antes en la lista, el kit la espera si viene a cuento, y su rato
  lo guarda `cabe`.

- **El banco de la escena** (`verificar-inicio-3.mjs`, reloj ×12, con la
  tarjeta de verdad, solo el vuelo y el teléfono: el hangar y el kit con el
  dedo no tocan esto), con FL160: **97 de 98**. Antes de este cambio no se
  había volado con FL160; con FL170 daba 124 de 126 (H38i) y con FL150, 116 de
  128 (H38j). Lo que dice que se omitió, y por qué:
  - **la siesta, «sin rato»**: a los 1.050 s se empieza a bajar sin que Ara
    haya tenido sus dos minutos tranquilos —la subida por encima de los diez
    mil pies se la llevan la comandante, la altura y el ala—;
  - **el kit, «no cabe»**: a los 1.131 s, detrás del porqué del ralentí,
    quedaban 140 s hasta los diez mil pies y pedía 166. Ni se trae ni se pide
    de vuelta, y la bajada se vive sin juego desde el principio.
  - Entero: **la altura y el ala**, que con FL170 y FL150 no se decían; y el
    Teide tocado por el cristal, a los 1.006 s, contado con lo que dice la
    tripulante de las islas. Lo esencial, entero y en su orden; nada pisado;
    lo más largo callado en el aire, 76 s.
  - Falla uno: **el toque mientras alguien habla**. El banco tocó el Teide a
    los 978 s con el plop de la tripulante acabando —a los 978,6—, el toque
    esperó su turno sin pisarla y, cuando le tocó, la escena vio que ya no se
    veía (`sinVer`) y no dijo nada; el banco solo da por buenos `ocupado` y
    `contado`. No pisa a nadie, que es lo que mira; si ese `sinVer` es de
    verdad —medio minuto después el Teide sí se veía— no se ha mirado: puede
    ser que se tocara con Ara pegada al cristal y se contestara ya sentada.

#### Lo que no

- **Lo que dura cada cosa está medido una vez**, en los bancos de H38i y H38j,
  y escrito en la lista; no se cuenta con lo que dura cada frase grabada. Si
  cambia lo que se dice arriba, se mide otra vez y se cambia allí.
- **El rato hasta los diez mil pies es una cuenta a la velocidad de ahora**,
  como la del punto de descenso: subiendo sale algo largo, que arriba se va
  más deprisa, y la siesta, que se decide subiendo, puede caber por unos
  segundos que bajando no estarán. Lo que se decide bajando —el kit— se queda
  corto, que es el lado bueno.
- **Lo de por debajo de los diez mil pies no va en la lista**: lo que cuenta
  la tripulante bajando —la ruta, las islas, los PAPI— caduca al preparar la
  cabina y espera su silencio como siempre. La ruta de la tripulante, que H38j
  vio colgar del reloj del silencio, sigue igual.
- **La cuarta escena no lleva lista**, y en ella todo cabe como antes.
- **En el salto de ahora no hay kit ni siesta.** Es lo que sale de la regla y
  de la decisión de Enrique; si se quiere el kit en este vuelo, lo que se
  mueve es la lista o lo que pide el kit, no el vuelo. Le faltaron 26 s.
- **El banco se voló una vez**: 97 de 98, y el que falla, el toque mientras
  alguien habla, está contado arriba. No se ha vuelto a volar.

#### Nota H38l (20-11-2026): el toque que se callaba y el rato que salía largo

- **El `sinVer` del toque al Teide era un fallo de la escena.** Al volver a
  mirar lo tocado después de esperar su turno, `sigueALaVista` preguntaba sin
  plano cómo se veía, y sin plano el juego contesta cómo se enseña mejor: un
  hito, con el avión por fuera (`mirarElSitio` en `game.ts`). Así el Teide que
  se veía por el cristal de Ara salía «fuera» y el toque se callaba. Ahora se
  pregunta cada pose con su plano —sentada en la ventanilla y con la cara
  contra el cristal—, y el toque guarda lo que se vio al volver a mirarlo
  (`VueltaAMirar`). La prueba de `inicio-pasaje.test.ts` lo reproduce con el
  mundo como lo mira el juego: con la regla de antes, el toque que esperó
  5,3 s con el Teide en el cristal salía `sinVer` con `como: "fuera"` y
  `ventanilla: true`; con la de ahora se cuenta, y si de verdad deja de verse
  por el cristal se sigue callando.
- **El banco ya no se cree un `sinVer`**: en el fotograma en que la escena
  contesta el toque de mientras alguien habla, mide por su lado si lo tocado
  cae por el cristal, sin nube, y solo da por bueno un `sinVer` si él tampoco
  lo ve desde el asiento.
- **`hastaLosDiezMil`, medido**: el banco apunta cada vez que la escena mira
  si algo cabe, con lo estimado y lo que de verdad quedaba. A la velocidad de
  ahora por el suelo, a los 738 s, subiendo, estimaba 602 s y quedaban 551
  (+51): la siesta, que pedía 601, cabía en la cuenta y no en el vuelo. El
  ala, +11; la altura, −4; el kit, bajando, −12. Ahora se cuenta por el
  perfil (`segundosHastaQueQueden` en `ruta.ts`): cada trozo a la velocidad
  que toca, con el viento. El banco lo comprueba: como mucho 20 s por arriba.
  Con el perfil, en el banco: la siesta −18, el ala −15, la altura −13 y el
  kit −6, siempre por el lado corto.
- **Volado una vez con el arreglo, 98 de 99** (×12, la tarjeta de verdad, sin
  hangar ni kit con el dedo). El toque de mientras alguien habla salió
  `ocupado` —la tripulante encadenó los dos plops— con el Teide a la vista
  para el banco. Falla uno que no es de esto y ya fallaba antes de tocar la
  escena, en el vuelo de medida, igual: **el mar de nubes de Ara**
  (`marDeNubes`, a los 888 y 891 s, asomada hacia abajo a 9,2 km del punto
  mirado). La escena lo da por visto con lo que deja pasar la capa —menos de
  0,85— y el banco pide cien metros de nube densa por medio y cuenta 0. No se
  ha mirado cuál de las dos cuentas tiene razón. La segunda pasada no se voló:
  cada una tardó 23 minutos de pared con la máquina compartida.

#### Nota H38m (20-11-2026): el mar de nubes, por lo que llena la vista

- **Había mar de nubes.** Se voló el banco hasta el instante en que mide lo
  nombrado, con la tarjeta de verdad (Iris Xe), y se sacó la captura: Ara
  con la cara contra el cristal, la ventanilla llena de nube de borde a borde
  y las cumbres de Tenerife asomando al fondo. La capa de ese vuelo es un BKN:
  base a 1.520 m —900 sobre el campo—, techo a 1.970 y tapadura 0,7. Los ojos,
  a 4.846 m; lo mirado, a 9,2 km.
- **Las dos cuentas, sobre la misma recta.** La escena: la capa deja pasar
  0,70 y lo de debajo no se distingue (0,23, con el listón en 0,45), así que
  lo da por visto. El banco: las dos láminas de abajo con 0,24 y 0,28 de nube,
  las otras tres limpias, y cuenta nube densa desde 0,3: 0 m. **La recta
  pasaba por un jirón**, y cuatro segundos después la misma mirada dejaba
  pasar 0,38 y cruzaba 400 m densos. La vista entera, medida con una rejilla
  de 178 rectas de la cámara hacia abajo: en 158 la capa deja pasar menos de
  0,85, en 162 lo de debajo no se distingue y 173 cruzan nube densa.
- **El banco miraba mal**: un mar de nubes no es lo que cruza una recta, es
  lo que llena la vista. Ahora tira veinticinco rectas desde la cámara, en un
  cuadro de 0,8 de pantalla alrededor de lo mirado y hasta el mar o el
  terreno, con su cuenta de siempre —cien metros por encima de 0,3, con el
  desvanecido—, y pide dos de cada cinco (`nubeEnLaVistaParaBanco` en
  `game.ts`). Sigue viendo un fallo: con unas nubes sueltas, una tapadura de
  0,2, pasa tres veces de cada cien, y sin capa o con el mar debajo, nunca.
- **Y la escena también miraba una recta**, que falla por el otro lado. Con
  unas nubes sueltas, desde FL160, una de cada seis miradas cae en una, y como
  el mar de nubes de Ara puede esperar a verse, acababa diciendo «nubes y más
  nubes, como un mar de algodón» sobre un cielo casi limpio. Ahora
  `seVeElMarDeNubes`, en `world/se-ve-desde-el-pasaje.ts`, mira cinco por
  cinco puntos en un cuadro de un 27 % de la distancia a cada lado —lo que
  cabe por la ventanilla con la cara contra el cristal— con la regla de antes
  en cada uno, y pide nube en tres quintos: con el alisio (0,45) sale nueve
  veces de cada diez, con 0,7 siempre y con 0,2 o 0,1 nunca. El toque de la
  ventanilla viva, igual: una nube suelta tocada no es el mar de nubes. Las
  pruebas, en `se-ve-desde-el-pasaje.test.ts`.
- **Volado con el arreglo** (×12, la tarjeta de verdad, sin hangar ni kit con
  el dedo): la primera pasada, **99 de 99**. Ara lo dice a los 887 s, y la
  recta de lo mirado vuelve a pasar por el jirón —0 m densos—, con nube densa
  en el 80 % de la vista. El vitest entero, 564 ficheros y 11.234 pruebas en
  verde.

## La cuarta escena: el vuelo largo de Ara a casa

Fecha: 2026-11-01

### Contexto

Después del primer vuelo de pasaje viene el largo: **de Madrid a Asunción,
de noche**, con Ara volviendo a casa. Enrique pidió que se vea pasar la noche
«como en una película, con Ara durmiendo», y que haya «más de un juego aunque
Ara duerma». El 31-10-2026
contestó las diez decisiones del plan; las que tocan a cómo pasa el tiempo
—los capítulos, el salto bajo tapa, la fecha y el medio despertar— tienen su
ADR, el 0023. Aquí va la escena.

### Decisión

**El vuelo es el de verdad**: el diario de esa ruta, que sale de Barajas a
las 23:45 y para en Pettirossi a las 06:25 o a las 07:30 según la hora de
España, por la ortodrómica y casi todo de noche. Ara vuelve a casa y va **a la
izquierda**, junto a la ventanilla, como en el vuelo corto. **Sin marcas**: ni
la aerolínea, ni el número de vuelo, ni el fabricante del avión salen en el
juego.

**El avión es nuevo**, el séptimo de la flota: el **JAZ 110 *Tijereta***, un
bimotor de fuselaje ancho de la clase del que hace esta ruta, sin su cara
(decisiones 1 y 2). La tijereta es el pájaro que se va del Paraguay en
invierno y vuelve en primavera: el de volver a casa. Lleva las ventanillas que
se oscurecen solas, y el JAZ 120 vuelve a las persianas, así siguen estando
los dos tipos (decisión 3).

**Jazlyn es la comandante, y hoy van tres pilotos.** Con la presentación
hacia las once menos cuarto de la noche, el periodo de actividad llega a doce
horas y cuarenta minutos, y la norma europea permite once con dos pilotos
cuando se empieza de noche (EASA ORO.FTL.205, tabla 2): hace falta un
tercero, y se descansa por turnos. Jazlyn también duerme, y sigue siendo la responsable
mientras descansa: los galones no son mando, son responsabilidad.

**Atienden a Ara en persona Idaira y Derlis**, con más tripulantes a bordo,
que el vuelo es largo y la tripulación más numerosa (decisión 7): Idaira, la
de Canarias que ya cuidó a Ara en el vuelo corto, y Derlis, la voz de la
tripulación de Paraguay, con la chipa del desayuno al llegar a casa.

**Madrid sí**, pero el último capítulo en hacerse, solo de noche y sin
ortofoto (decisión 4).

**La pantalla del respaldo**, que un largo radio lleva y el JAZ 90 no: el mapa
del vuelo con el camino curvo, la raya del día y la noche y los dos relojes;
los juegos —«Luz verde», «Armá tu avión» con el avión nuevo y uno nuevo, «La
Cruz del Sur», que es lo que solo enseña este vuelo (decisión 10)—; los
cuentos del camino; lo de Granja Óga, empezando por «Luz verde» (decisión 9);
los ejercicios para las piernas y el cuaderno. Las pestañas, con iconos y sin
leer.

**El mismo motor que la tercera escena**: la conversación por turnos, los
planos, la siesta, el ⏩, la ventanilla viva, el kit y el cuaderno. Se separa
de `inicio-pasaje.ts` lo que es motor de lo que es el guion de Tenerife Norte
a La Palma, con el banco `inicio-3` de red: tiene que seguir dando lo mismo.

**Por capítulos y con saltos**: tres capítulos de unos quince minutos que se
guardan, más el viaje seguido, y el reloj que salta mientras la pantalla está
tapada. Ver el ADR 0023, que cambia para este vuelo la regla de la siesta.

**Cómo se abre**: con su ficha en «¿A qué jugás?» y con
`?inicio=4&capitulo=N`. **No es la primera experiencia**: esa sigue siendo el
despegue.

### Consecuencias

- Está decidido y sin programar, salvo la ruta como datos
  (`flight/ruta-larga.ts`, con las cifras del plan en sus pruebas). Se hace
  por tandas: los cimientos y el avión a la vez; el mundo por el camino con la
  pantalla del respaldo, que cambia el origen de los datos de terreno y lleva
  su propio ADR; y los capítulos en orden inverso, publicando cada uno,
  empezando por el tercero.
- Unas cien frases nuevas por grabar, repartidas entre los tres capítulos,
  por el camino de siempre.
- El tercer capítulo cuenta dos llegadas: de noviembre a marzo, con el
  amanecer por la ventanilla sobre Brasil y Paraguay de día; de mayo a agosto,
  de noche cerrada, con Asunción en luces.
