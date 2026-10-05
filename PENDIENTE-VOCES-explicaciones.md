# Pendiente: voces de las explicaciones (puntos 117, 204, 205, 154 y 196)

El 05-10-2026 ElevenLabs no tiene saldo hasta el 6 de octubre. Las frases de
aquí **ya tienen su texto** en `src/i18n/es-PY.ts` y `src/i18n/en.ts`, porque
la ventana de una explicación las enseña escritas desde el tercer peldaño;
pero **no tienen grabación**, y mientras no la tengan **no suenan**: el
registro de explicaciones solo habla con la frase grabada y nunca la pasa a la
voz del navegador —muda en Brave para Linux, y un robot leyendo un párrafo en
el resto—. Ver `src/ui/explicaciones.ts` y `ponerVozDeLasExplicaciones` en
`src/game.ts`. En cuanto la clave tenga receta en el pack, la ventana la dice
sola, sin tocar código.

Todas son de **la instructora** (`instructor`), de vos y con calma: explica,
no avisa. El grupo `explica` ya está en `HABLADOS` de
`scripts/frases-para-grabar.mjs`, sin las palabras cortas ni los nombres de
los botones, que se leen y no se dicen.

Cuando se graben: `node scripts/frases-para-grabar.mjs`, grabar con
`node scripts/voces-elevenlabs.mjs instructor`, añadir la receta **después**
de grabar, hornear, restaurar lo re-codificado y pasar
`node scripts/verificar-voces.mjs`. Son largas —una explicación entera cada
una—, así que van «con chispa», como las de la ventanilla, y no al ritmo de
una orden de vuelo.

**Ojo al grabar:**

- `explica.tcas.texto` lleva «+10» y «−05», que es lo que se ve en la
  pantalla: se dicen «más diez» y «menos cero cinco». Y «traffic, traffic»
  se dice como lo dice la caja del avión, en inglés y sin alarma: la
  instructora lo está citando.
- Los rótulos de cabina —IAS, ALT, HDG, V/S, CAB ALT, TCAS, TA ONLY, T/D,
  T/C, GS, N1, RPM— se dicen en inglés, letra a letra o como se dicen en una
  cabina («ti-di», «ti-si», «en uan»), no traducidos.
- `explica.td.texto` y `explica.tc.texto` dicen *top of descent* y *top of
  climb* en inglés, que es de donde salen las siglas.

## 1. Las piezas del cuadro y de la pantalla de navegación

Se dicen al tocar la pieza. Salen en los cuatro peldaños; por escrito, desde
el tercero.

| clave | es-PY | en |
|---|---|---|
| `explica.velocidad.texto` | «IAS es la velocidad del aire que pasa por el ala, en nudos. El ala sostiene al avión solo si el aire pasa rápido: si vas muy despacio deja de sostener, y si vas muy rápido el avión sufre. Lo bueno es quedarse en el verde. Se mide con un tubito que mira para adelante: el pitot.» | «IAS is the speed of the air flowing over the wing, in knots. The wing only holds the plane up if the air flows fast: too slow and it stops holding, too fast and the plane suffers. Stay in the green. It is measured by a little tube facing forward: the pitot.» |
| `explica.altitud.texto` | «ALT es la altitud: a cuántos pies sobre el mar vas. Mil pies son unos trescientos metros. El altímetro no mira el suelo: mide cuánto pesa el aire que tenés encima, que arriba pesa menos. Por eso hay que ponerle la presión del día. La marca rosa es la altura que le pediste al avión.» | «ALT is the altitude: how many feet above the sea you are. A thousand feet is about three hundred metres. The altimeter doesn't look at the ground: it measures how much the air above you weighs, and higher up it weighs less. That's why it needs the pressure of the day. The pink mark is the altitude you asked the plane for.» |
| `explica.rumbo.texto` | «HDG es el rumbo: para dónde apunta la nariz del avión, en grados, como en una brújula. El norte es 360, el este 90, el sur 180 y el oeste 270. Las pistas se llaman por su rumbo: la pista 03 apunta a 30 grados.» | «HDG is the heading: where the nose of the plane points, in degrees, like a compass. North is 360, east 90, south 180 and west 270. Runways are named after their heading: runway 03 points at 30 degrees.» |
| `explica.actitud.texto` | «Es el horizonte artificial. Lo azul es el cielo y lo marrón, la tierra; el avioncito amarillo del medio sos vos. Si el azul baja, la nariz sube; si se inclina, estás virando. Sirve para volar derecho aunque afuera no se vea nada, dentro de una nube.» | «This is the artificial horizon. Blue is the sky and brown is the ground; the little yellow plane in the middle is you. If the blue goes down, the nose is going up; if it tilts, you are turning. It lets you fly straight even when you can't see anything outside, inside a cloud.» |
| `explica.variometro.texto` | «V/S dice si el avión sube o baja, y qué tan rápido, en pies por minuto. Arriba es subir, abajo es bajar, y en el medio el avión va nivelado.» | «V/S tells you whether the plane is climbing or descending, and how fast, in feet per minute. Up is climbing, down is descending, and in the middle the plane is level.» |
| `explica.coordinador.texto` | «El avioncito se inclina cuando virás, y dice qué tan rápido gira el avión. La bolita de abajo dice si el viraje va limpio: si se va para un lado, se la vuelve al medio con el pedal de ese lado.» | «The little plane tilts when you turn, and shows how fast the plane is turning. The ball underneath says whether the turn is clean: if it slides to one side, you bring it back to the middle with the pedal on that side.» |
| `explica.motor.texto` | «Cuánta fuerza hace el motor. En los de hélice se mide en vueltas por minuto, RPM; en los reactores, en lo rápido que gira el ventilador de adelante, N1. Más motor es ir más rápido o subir; menos motor, ir más despacio o bajar. En un reactor la aguja tarda unos segundos en llegar a lo que pediste: un motor grande no se apura.» | «How hard the engine is working. On propeller planes it is measured in turns per minute, RPM; on jets, by how fast the big fan at the front spins, N1. More power means going faster or climbing; less power, going slower or descending. On a jet the needle takes a few seconds to reach what you asked for: a big engine doesn't hurry.» |
| `explica.flaps.texto` | «Los flaps son la parte de atrás del ala, que sale para abajo. Hacen el ala más grande y más curva, y así sostiene al avión yendo más despacio. Se sacan para despegar y para aterrizar, y en el crucero se guardan, porque también frenan.» | «The flaps are the back part of the wing, and they slide down and out. They make the wing bigger and more curved, so it holds the plane up at a lower speed. They come out for take-off and landing, and go back in for the cruise, because they also slow you down.» |
| `explica.tren.texto` | «Las luces del tren. Verde quiere decir rueda abajo y trabada, lista para tocar el suelo. Después de despegar las ruedas se guardan, porque afuera frenan el aire. Antes de aterrizar siempre se mira: tres verdes.» | «The gear lights. Green means wheel down and locked, ready to touch the ground. After take-off the wheels go up, because outside they slow the air. Before landing you always check: three greens.» |
| `explica.combustible.texto` | «Cuánto combustible queda. En casi todos los aviones va dentro de las alas. La franja ámbar es la reserva: lo que se guarda siempre por si hay que esperar o ir a otro aeropuerto. Para llegar, nunca se cuenta con la reserva.» | «How much fuel is left. On most planes it is inside the wings. The amber band is the reserve: what is always kept in case you have to wait or go to another airport. You never count on the reserve to get there.» |
| `explica.presurizacion.texto` | «Allá arriba el aire es tan finito que no alcanza para respirar bien. Por eso el avión mete aire en la cabina y la infla un poco, como un globo: adentro es como estar en un cerro alto, a dos mil cuatrocientos metros como mucho, aunque afuera vayas a más de diez mil. CAB ALT dice a qué altura está la cabina.» | «Up there the air is so thin it isn't enough to breathe well. So the plane pumps air into the cabin and inflates it a little, like a balloon: inside it feels like being on a high hill, at most two thousand four hundred metres, even when outside you are above ten thousand. CAB ALT tells you how high the cabin is.» |
| `explica.avisos.texto` | «Se encienden cuando algo pide que lo mires. Ámbar quiere decir cuidado; rojo, que hay que hacer algo ya. Y siempre en el mismo orden: primero se vuela el avión, después se mira qué pasa.» | «They light up when something wants you to look at it. Amber means careful; red means something has to be done now. And always in the same order: first fly the plane, then look at what's happening.» |
| `explica.matricula.texto` | «Es el nombre del avión, como la chapa de un auto. Las primeras letras dicen de qué país es: ZP es Paraguay. La torre te llama por estas letras, cada una con su palabra de radio: Zulu, Papa… Por eso va a la vista, para saber que te hablan a vos.» | «It is the plane's name, like a car's number plate. The first letters tell the country: ZP is Paraguay. The tower calls you by these letters, each one with its radio word: Zulu, Papa… That's why it is in plain sight, so you know they're talking to you.» |
| `explica.carta.texto` | «Es la pantalla del mapa. El triángulo amarillo sos vos, y lo de arriba es lo que tenés adelante. La línea rosa es el camino del plan de vuelo. Los rombos son otros aviones: el TCAS solo te enseña a los que vuelan cerca de tu altura. Los que van mucho más arriba o más abajo no salen, aunque los veas por la ventanilla.» | «This is the map screen. The yellow triangle is you, and what's above it is what lies ahead. The pink line is the route of the flight plan. The diamonds are other planes: TCAS only shows you the ones flying near your altitude. Those much higher or lower don't appear, even if you can see them out of the window.» |
| `explica.tcas.texto` | «Cada rombo es otro avión que vuela cerca de tu altura. Hueco, anda por ahí; lleno, está cerca. Si se vuelve un círculo ámbar, el TCAS avisa —traffic, traffic— y hay que buscarlo afuera. El número son cientos de pies: +10 es mil pies más arriba, y −05, quinientos más abajo. La flechita dice si sube o baja. En los aviones de línea hay también un cuadrado rojo que te dice si subir o bajar; acá el TCAS está en TA ONLY y solo avisa.» | «Each diamond is another plane flying near your altitude. Hollow, it's around; filled, it's close. If it turns into an amber circle, TCAS warns you —traffic, traffic— and you look for it outside. The number is hundreds of feet: +10 is a thousand feet above, and −05 five hundred below. The little arrow says whether it is climbing or descending. Airliners also have a red square that tells you whether to climb or descend; here TCAS is in TA ONLY and only warns.» |
| `explica.arco.texto` | «Este arco verde dice dónde vas a llegar a la altura que pediste, si seguís subiendo o bajando como ahora. Si cae antes de la pista, llegás abajo con tiempo; si cae después, no te da: hay que bajar más rápido o empezar antes.» | «This green arc shows where you will reach the altitude you asked for, if you keep climbing or descending like now. If it falls before the runway, you get down with time to spare; if it falls after, you won't make it: descend faster or start earlier.» |
| `explica.td.texto` | «T/D quiere decir top of descent, lo alto de la bajada: acá empezamos a bajar. Desde este círculo verde, bajando tranquilos, se llega a la pista a la altura justa.» | «T/D means top of descent: this is where we start going down. From this green circle, descending calmly, you reach the runway at just the right height.» |
| `explica.tc.texto` | «T/C quiere decir top of climb, lo alto de la subida: acá terminamos de subir. Desde este círculo verde el avión va nivelado, en el crucero, hasta el T/D.» | «T/C means top of climb: this is where we finish climbing. From this green circle the plane flies level, in the cruise, until the T/D.» |
| `explica.senda.texto` | «El rombo dice dónde está la senda, la rampa invisible que baja hasta la pista. Si el rombo está abajo, vas alto: bajá un poco más. Si está arriba, vas bajo. Se vuela hacia el rombo, hasta tenerlo en el medio.» | «The diamond shows where the glide path is, the invisible ramp down to the runway. If the diamond is low, you are high: come down a bit more. If it is high, you are low. You fly towards the diamond until it sits in the middle.» |
| `explica.gs-rodaje.texto` | «GS es la velocidad sobre el suelo. Rodando, esta barra dice qué tan rápido vas, y la marca rosa, hasta dónde llenarla: antes de una curva baja, porque las curvas se toman despacio. Verde es que vas bien; ámbar, que tenés que frenar.» | «GS is the speed over the ground. While taxiing, this bar shows how fast you're going, and the pink mark how far to fill it: before a turn it drops, because turns are taken slowly. Green means you're fine; amber, that you need to brake.» |
| `explica.galones.texto` | «Las barras de la manga dicen tu grado, como en cualquier línea aérea: una, quien aprende; dos, la segunda oficial; tres, la primera oficial, que ya lleva el avión; y cuatro, la comandante. Cuatro barras no quieren decir que manda más: quieren decir que responde por todos los que van a bordo. Lo que hiciste bien en cada vuelo no va en la manga: lo marca la instructora en su hoja, con un visto.» (texto cambiado: ver `PENDIENTE-VOCES-cuaderno.md`) | «The stripes on the sleeve show your rank, as in any airline: one for someone learning; two, second officer; three, first officer, who already flies the plane; and four, the captain. Four stripes don't mean she's more in charge: they mean she answers for everyone on board. What you did well on each flight doesn't go on the sleeve: the instructor ticks it on her sheet.» |

## 2. La pantalla de navegación, en tierra

La misma pieza, con el avión posado: el TCAS en espera y la torre contando la
pista (#205).

| clave | es-PY | en |
|---|---|---|
| `explica.carta.tierra` | «En el suelo el radar de tráfico descansa; lo que hay en la pista te lo dice la torre. Por eso la pantalla dice TCAS STBY: el equipo espera. Se pone a trabajar en el punto de espera, antes de entrar a la pista, y mientras tanto lo que rueda se mira por la ventanilla.» | «On the ground the traffic radar rests; what's on the runway, the tower tells you. That's why the screen says TCAS STBY: the system is waiting. It starts working at the holding point, before entering the runway, and meanwhile whatever is taxiing you look at out of the window.» |

## 3. La primera vez, presentada

La instructora presenta cada símbolo nuevo la primera vez que sale en la
pantalla, una vez por partida y solo en los tres peldaños de abajo: la pieza
se ilumina en el cuadro, sale su tarjeta y —cuando esté grabada— suena esto.
Ver `Game.presentarLoNuevo`. El rombo del TCAS ya tenía la suya
(`vuelo.traficoArriba`, `vuelo.traficoAbajo`, `vuelo.traficoNivel`).

| clave | es-PY | en |
|---|---|---|
| `explica.arco.presenta` | «¿Ves el arco verde en el mapa? Ahí vamos a llegar a la altura que pedimos.» | «See the green arc on the map? That's where we'll reach the altitude we asked for.» |
| `explica.td.presenta` | «Mirá el círculo verde en el mapa: acá empezamos a bajar.» | «Look at the green circle on the map: that's where we start going down.» |
| `explica.tc.presenta` | «Ese círculo verde del mapa es donde terminamos de subir.» | «That green circle on the map is where we finish climbing.» |
| `explica.senda.presenta` | «Apareció el rombo de la senda. Si lo tenemos en el medio, vamos bien hacia la pista.» | «There's the glide path diamond. If we keep it in the middle, we're heading nicely for the runway.» |
| `explica.gs-rodaje.presenta` | «Esta barra dice qué tan rápido rodamos. Llenala hasta la marca rosa, nada más.» | «This bar shows how fast we're taxiing. Fill it up to the pink mark, no more.» |

## 4. El rincón de las curiosidades del vuelo

Los porqués de lo que pasa en un vuelo de pasaje y que en el vuelo no se
cuentan cada vez (#196). Se abren desde la pausa, desde el cuaderno y desde
cualquier explicación del cuadro, con la lamparita.

| clave | es-PY | en |
|---|---|---|
| `explica.persianas.texto` | «Para despegar y para aterrizar, las persianas de las ventanillas van subidas, y de noche se bajan las luces de la cabina. Así se ve afuera si pasa algo, y los ojos ya están acostumbrados a la luz de afuera si hubiera que salir. En algunos aviones nuevos, la tripulación aclara todas las ventanillas a la vez.» | «For take-off and landing the window shades go up, and at night the cabin lights are dimmed. That way you can see outside if something happens, and your eyes are already used to the light outside if you need to get out. On some new planes the crew clears all the windows at once.» |
| `explica.video-seguridad.texto` | «Antes de despegar, la tripulación enseña dónde están las salidas, cómo se abrocha el cinturón, el chaleco y las máscaras. Aunque vueles seguido, se mira siempre: cada avión es distinto, y la salida más cerca puede estar detrás tuyo.» | «Before take-off, the crew shows where the exits are, how the seat belt fastens, the life vest and the masks. Even if you fly often, you always watch: every plane is different, and the nearest exit may be behind you.» |
| `explica.mascaras.texto` | «Si la cabina pierde el aire, caen máscaras del techo. Primero te ponés la tuya y después ayudás a quien está al lado, aunque sea un niño: sin aire no podrías ayudar a nadie. El oxígeno sale aunque la bolsita no se infle, y el avión baja enseguida adonde se respira bien.» | «If the cabin loses its air, masks drop from the ceiling. Put yours on first and then help the person next to you, even a child: without air you couldn't help anyone. Oxygen is flowing even if the bag doesn't inflate, and the plane descends right away to where you can breathe well.» |
| `explica.no-fumar.texto` | «En el avión no se fuma, tampoco con cigarrillo electrónico, y menos en el baño: un fuego en el aire es de lo más peligroso que hay. Por eso los baños tienen detector de humo.» | «There's no smoking on the plane, not even electronic cigarettes, and least of all in the toilet: a fire in the air is one of the most dangerous things there is. That's why the toilets have smoke detectors.» |
| `explica.cinturon.texto` | «Aunque la luz del cinturón esté apagada, sentado se lleva puesto, flojito. A veces el aire se mueve de golpe sin avisar, con el cielo despejado, y el cinturón es lo que te deja en tu asiento.» | «Even when the seat belt sign is off, keep it on loosely while you're seated. Sometimes the air moves suddenly without warning, with a clear sky, and the belt is what keeps you in your seat.» |
| `explica.mesitas.texto` | «Para despegar y para aterrizar, la mesita guardada y el respaldo derecho. Así nadie se golpea si el avión frena fuerte, y el pasillo hasta la salida queda libre por si hubiera que salir rápido.» | «For take-off and landing, the table stowed and the seat back upright. That way nobody gets hurt if the plane brakes hard, and the aisle to the exit stays clear in case you need to get out fast.» |
| `explica.modo-avion.texto` | «El celular, en modo avión. Su radio buscando señal se cuela en los auriculares de los pilotos como un zumbido, justo cuando escuchan a la torre. Y allá arriba no hay señal: el celular gasta la batería buscándola.» | «Your phone, in flight mode. Its radio searching for a signal sneaks into the pilots' headsets as a buzz, right when they are listening to the tower. And up there there's no signal anyway: the phone drains its battery looking for one.» |

## 5. Los vídeos de Luna

Cada explicación tiene su hueco para un vídeo (`video` en `Explicacion`):
cuando lo lleve, la ventana enseña el vídeo en el sitio del dibujo y la
instructora no habla, porque el vídeo trae su propia voz. Cada vídeo entra en
`CREDITOS.md` con su licencia antes de enchufarlo.
