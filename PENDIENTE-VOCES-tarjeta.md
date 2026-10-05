# Voces pendientes — la tarjeta del avión (183)

ElevenLabs no tiene saldo hasta el 6 de octubre. Las frases están en el código
con su clave (`src/i18n/es-PY.ts` y `en.ts`), pero **sin grabar**: la tarjeta
funciona sin ellas, porque lo que no está grabado no suena y el globo de cada
punto lleva el dibujo y el texto. Cuando haya saldo, grabar por el camino de
siempre (`frases-para-grabar` → `voces-elevenlabs` → receta → hornear →
`verificar-voces`).

Voz: la instructora, sentada al lado, en registro de explicar —ni aviso ni
alarma—. Suena al tocar un punto de la tarjeta, al encender una luz desde ella
o al tocar la matrícula, en los cuatro peldaños: es una explicación pedida,
no un aviso que crece con la escalera.

Enganche: `TarjetaDelAvion.abrirGlobo` (`src/ui/tarjeta-del-avion.ts`) llama a
`decir(t(voz), voz)`; en el vuelo eso es `Game.instructor.decir`. En el hangar
todavía no hay instructora montada (el sonido arranca con el vuelo), así que
ahí el globo se lee y no se oye: hay que decidir si el hangar monta una voz
propia cuando estas existan.

Cada explicación tiene su `id` en `src/ui/explicaciones-del-avion.ts`, que es
el que recogerá el registro de explicaciones al tocar del cuadro.

## Las piezas

| id | clave | es-PY | en |
|---|---|---|---|
| `avion.alerones` | `tarjeta.voz.alerones` | «Estos son los alerones. Cuando movés la palanca a un costado, uno sube y el otro baja, y el avión se inclina para girar.» | «These are the ailerons. When you move the stick to one side, one goes up and the other goes down, and the plane banks to turn.» |
| `avion.profundidad` | `tarjeta.voz.profundidad` | «Este es el timón de profundidad, en la cola. Si tirás de la palanca, la cola baja y la nariz sube.» | «This is the elevator, on the tail. If you pull the stick, the tail goes down and the nose comes up.» |
| `avion.timon` | `tarjeta.voz.timon` | «Este es el timón de dirección. Con los pedales, la cola va para un lado y la nariz mira para el otro.» | «This is the rudder. With the pedals, the tail swings one way and the nose points the other.» |
| `avion.flaps` | `tarjeta.voz.flaps` | «Estos son los flaps. Al bajarlos, el ala se hace más curva y más grande, y sostiene al avión aunque vaya más despacio. Se usan para despegar y para aterrizar.» | «These are the flaps. Lower them and the wing gets more curved and bigger, so it holds the plane up even when it's slower. They're for take-off and landing.» |
| `avion.aerofrenos` | `tarjeta.voz.aerofrenos` | «Estos son los aerofrenos. Se levantan encima del ala para frenar en el aire, y al tocar la pista, para que el avión apoye las ruedas y frene mejor.» | «These are the spoilers. They rise on top of the wing to slow down in the air, and on the runway, to put the plane's weight on its wheels so it brakes better.» |
| `avion.pitot` | `tarjeta.voz.pitot` | «Este tubito es el pitot. El aire entra por la punta, y cuanto más rápido volás, más fuerte empuja: así sabe el avión a qué velocidad va.» | «This little tube is the pitot. Air goes in at the tip, and the faster you fly, the harder it pushes: that's how the plane knows its speed.» |
| `avion.pitot-morro` | `tarjeta.voz.pitotMorro` | «Estos tubitos a los lados de la nariz son los pitot, uno para cada piloto. El aire entra de frente, y cuanto más rápido volás, más empuja: así se mide la velocidad.» | «These little tubes on the sides of the nose are the pitots, one for each pilot. Air goes straight in, and the faster you fly, the harder it pushes: that's how speed is measured.» |
| `avion.motor-piston` | `tarjeta.voz.motorPiston` | «Acá está el motor. Hace girar la hélice, y la hélice, que tiene palas como alas chiquitas, tira del avión hacia adelante.» | «Here's the engine. It spins the propeller, and the propeller, with blades like little wings, pulls the plane forwards.» |
| `avion.motor-radial` | `tarjeta.voz.motorRadial` | «Este es un motor radial: los cilindros van en círculo, como los rayos de una estrella. Hace girar la hélice, y la hélice tira del avión.» | «This is a radial engine: the cylinders sit in a circle, like the points of a star. It spins the propeller, and the propeller pulls the plane.» |
| `avion.turbohelice` | `tarjeta.voz.turbohelice` | «Este es un turbohélice: adentro tiene una turbina, como la de un reactor, pero en vez de soplar, hace girar la hélice.» | «This is a turboprop: inside there's a turbine, like a jet's, but instead of blowing, it spins the propeller.» |
| `avion.reactor` | `tarjeta.voz.reactor` | «Esto es un reactor. Traga aire por adelante, quema combustible y lo suelta por atrás muy rápido. Y el que más empuja es el ventilador grande de adelante.» | «This is a jet engine. It swallows air at the front, burns fuel and blows it out of the back very fast. And the big fan at the front does most of the pushing.» |
| `avion.tren` | `tarjeta.voz.tren` | «Este es el tren de aterrizaje. Sale para aterrizar, y después de despegar se guarda adentro: así el aire pasa mejor y el avión va más rápido.» | «This is the landing gear. It comes down to land, and after take-off it folds away inside: that way the air flows past better and the plane goes faster.» |
| `avion.tren-fijo` | `tarjeta.voz.trenFijo` | «Este tren no se guarda nunca: va siempre afuera. Es más sencillo y más liviano, aunque frena un poco al avión.» | «This gear never folds away: it's always out. It's simpler and lighter, though it slows the plane down a little.» |

## Las luces que se encienden desde la tarjeta

| id | clave | es-PY | en |
|---|---|---|---|
| `avion.luces` | `tarjeta.voz.luces` | «Estas son las luces de navegación: roja a la izquierda, verde a la derecha y blanca atrás. Si de noche ves la roja y la verde juntas, ese avión viene de frente.» | «These are the navigation lights: red on the left, green on the right and white at the back. If at night you see the red and the green together, that plane is coming straight at you.» |
| `avion.luz-baliza` | `tarjeta.voz.luzBaliza` | «La baliza es la luz roja que parpadea. Se enciende antes de arrancar el motor y les dice a todos: no te acerques, este avión se va a mover.» | «The beacon is the flashing red light. It goes on before the engine starts and tells everyone: keep clear, this plane is about to move.» |
| `avion.luz-estrobos` | `tarjeta.voz.luzEstrobos` | «Estos destellos blancos se encienden al entrar en la pista y en todo el vuelo, para que los demás aviones te vean desde lejos.» | «These white flashes go on when you enter the runway and stay on the whole flight, so other planes can see you from far away.» |
| `avion.luz-aterrizaje` | `tarjeta.voz.luzAterrizaje` | «Los faros de aterrizaje se encienden para despegar, para aterrizar y siempre que volás por debajo de diez mil pies, donde hay más aviones y pájaros: así te ven.» | «The landing lights go on for take-off, for landing, and whenever you fly below ten thousand feet, where there are more planes and birds: so they can see you.» |

## La matrícula

| id | clave | es-PY | en |
|---|---|---|---|
| `avion.matricula` | `tarjeta.voz.matricula` | «La matrícula es como la cédula del avión: no hay otro en el mundo que se llame igual. Las primeras letras dicen de qué país es: zeta pe es Paraguay, y e ce es España.» | «The registration is like the plane's ID card: no other plane in the world has the same one. The first letters say which country it's from: Z P is Paraguay, and E C is Spain.» |

«Cédula» y no «DNI»: es como se dice en Paraguay, y la frase es de producto.
Enrique lo pidió como «el DNI del avión».

Dieciocho frases en cada idioma; en guaraní, ninguna.
