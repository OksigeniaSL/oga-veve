# Voces pendientes — antes de volar (puntos 125 y 129)

ElevenLabs no tiene saldo hasta el 6 de octubre. Las frases están en el código
con su clave (`src/i18n/es-PY.ts` y `en.ts`), pero **sin grabar**: lo de antes
de volar funciona sin ellas, porque lo que no está grabado no suena y todo
lleva su dibujo —los puntos de la vuelta con la pieza dibujada, el globo con
el dibujo moviéndose, la tarjeta del tiempo con la manga, la nube, la lluvia y
el ojo, y la señal del anemómetro en cero con la cinta de la funda—. Cuando
haya saldo, grabar por el camino de siempre (`frases-para-grabar` →
`voces-elevenlabs` → receta → hornear → `verificar-voces`).

Voz: **la instructora**, sentada al lado, en registro de explicar —ni aviso ni
alarma—, en los cuatro peldaños. Son explicaciones pedidas (se tocó algo) o la
decisión de antes de salir; ninguna es un canto de cabina ni de una caja del
avión, así que no suben por la escalera.

Enganche: todas salen por `Game.instructor.decir(t(clave), clave)` desde
`src/game.ts` (`tocarEnLaVuelta`, `abrirLaVuelta`, `vigilarLaFunda`,
`abrirElParte`, `quedarseEnTierra`). Las de la vuelta se piden con la clave
montada (`vuelta.${cosa}.voz`), así que `frases-para-grabar` las encuentra por
el diccionario, no por el código.

## La vuelta al avión (125)

Suenan al tocar cada cosa. Una por cosa, y la de «vuelta lista» al acabar
(detrás de la de la última cosa, no a la vez).

| clave | es-PY | en |
|---|---|---|
| `vuelta.empezar` | «Antes de volar, damos la vuelta al avión. Tocá lo que brilla.» | «Before we fly, we walk around the plane. Touch what's glowing.» |
| `vuelta.entera` | «¡Vuelta lista! El avión está para volar.» | «Walk-around done! The plane is ready to fly.» |
| `vuelta.pitot.voz` | «Esta funda roja tapa el pitot mientras el avión está guardado. Hay que sacarla: sin ella fuera, el avión no sabe a qué velocidad va.» | «This red cover protects the pitot while the plane is parked. It has to come off: with it on, the plane can't tell how fast it's going.» |
| `vuelta.sondas.voz` | «Estas son las sondas que miden la velocidad. Se les saca la funda y se mira que estén sanas y limpias.» | «These are the probes that measure speed. The covers come off, and we check they're clean and undamaged.» |
| `vuelta.superficies.voz` | «Los timones de la cola tienen que moverse libres, sin nada que los trabe.» | «The controls on the tail have to move freely, with nothing jamming them.» |
| `vuelta.calzos.voz` | «Los calzos son las cuñas que no dejan rodar al avión. Se sacan, y se mira que la rueda esté bien inflada.» | «Chocks are the wedges that stop the plane from rolling. They come out, and we check the tyre is properly inflated.» |
| `vuelta.frenos.voz` | «En cada rueda se mira la goma y el freno. Este pernito, mientras asome, dice que al freno todavía le queda.» | «On every wheel we check the tyre and the brake. While this little pin sticks out, the brake still has wear left.» |
| `vuelta.combustible.voz` | «Por esta boca se mira cuánto combustible hay. Y con el vasito se saca un poco de abajo: tiene que salir azul y sin agua.» | «Through this cap we look at how much fuel there is. And with the little cup we drain some from the bottom: it has to come out blue, with no water.» |
| `vuelta.aceite.voz` | «Con la varilla se mira el aceite del motor: tiene que llegar entre las dos rayas.» | «With the dipstick we check the engine oil: it has to sit between the two marks.» |
| `vuelta.helice.voz` | «La hélice se mira sin tocarla de más: que no tenga mellas ni golpes. Y nunca se para uno delante de ella.» | «We look at the propeller without handling it: no nicks, no dents. And never stand in front of it.» |
| `vuelta.motores.voz` | «Se mira la boca del motor y la salida de atrás: que no haya nada adentro, ni un pájaro ni un trapo.» | «We look into the engine inlet and the exhaust at the back: nothing inside, not a bird, not a rag.» |
| `vuelta.puertas.voz` | «Las puertas y las tapas que no se usan tienen que estar bien cerradas antes de salir.» | «Doors and panels that aren't in use have to be closed and latched before we go.» |
| `vuelta.luces.voz` | «Se prenden las luces y se mira que anden todas: la roja a la izquierda, la verde a la derecha y la blanca atrás.» | «We switch the lights on and check they all work: red on the left, green on the right and white at the back.» |

## La funda del pitot olvidada

Con calma: no es una emergencia, es una maniobra. Urgencia `mando` (no corta a
nadie, pero va delante de la charla).

| clave | es-PY | en |
|---|---|---|
| `pitot.noMarca` | «El anemómetro no marca: gas atrás y frená, con calma.» | «The airspeed isn't moving: throttle back and brake, calmly.» |
| `pitot.abortado` | «¡Muy bien! Parar era lo correcto. Era la funda del pitot: volvemos al puesto a sacarla.» | «Well done! Stopping was the right call. It was the pitot cover: back to the stand to take it off.» |
| `pitot.enElAire` | «Volamos sin anemómetro: con el horizonte y el gas, tranquilos. Damos una vuelta y aterrizamos.» | «We're flying without airspeed: attitude and power, nice and calm. We'll go round and land.» |

## Decidir si hoy se sale (129)

La propuesta suena al abrirse sola la tarjeta del tiempo (una vez por vuelo,
solo si algo pasa del límite de ese avión), con el primer motivo.

| clave | es-PY | en |
|---|---|---|
| `parte.propone.tormenta` | «Hay tormenta encima del campo. Hoy mejor no salir, o esperar a que pase.» | «There's a thunderstorm over the field. Better not to go today, or wait for it to pass.» |
| `parte.propone.visibilidad` | «Se ve muy poco para este avión. Hoy mejor quedarse, o esperar a que abra.» | «Visibility is too low for this plane. Better to stay today, or wait for it to clear.» |
| `parte.propone.techo` | «Las nubes están muy bajas para este avión. Hoy mejor quedarse, o esperar a que suban.» | «The clouds are too low for this plane. Better to stay today, or wait for them to lift.» |
| `parte.propone.cruzado` | «El viento de costado es más fuerte de lo que este avión sabe aguantar. Hoy mejor quedarse, o esperar a que afloje.» | «The crosswind is stronger than this plane is known to handle. Better to stay today, or wait for it to ease.» |
| `parte.ganaste` | «¡Hoy ganaste: decidiste bien!» | «You won today: good decision!» |
| `parte.salgoIgual.voz` | «Está bien: salimos con cuidado. Y si allá arriba no se puede, volvemos.» | «All right: we go, carefully. And if it's no good up there, we come back.» |

`parte.ganaste` es también el texto de la tarjeta en los peldaños de frases: la
misma clave para lo que se lee y lo que se oye, como en la frustrada.

Total: **22 frases** de la instructora, en dos idiomas.
