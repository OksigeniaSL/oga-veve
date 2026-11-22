# Cuatro aves, un avión

*Oksigenia SL · Granja Óga · Óga Veve — documento de diseño · agosto 2026*

> Informe de diseño de agosto de 2026, uno de los ocho que recoge la [visión del proyecto](../vision.md) en su sección 10. Se conserva tal como se escribió; lo que el juego ha decidido después manda sobre lo que aquí se propone.

Sistema de niveles por edad. Principio rector: **los tramos no cambian el mundo ni el avión; cambian cuánta física se confía al jugador y cuánto lee la pantalla por él**. Un único modelo de coeficientes siempre activo, con capas de asistencia que se retiran una a una. Una sola escena, un solo Paraguay.

Cuatro tramos —no cinco: las capas de asistencia independientes ya cubren el matiz intra-tramo— con nombre de ave en guaraní (a validar con la familia de Coronel Oviedo). El selector es un dibujo de las cuatro aves; las edades solo aparecen en el rincón del adulto. Nadie elige «el modo de bebés»: elige el colibrí.

## Mainumby

colibrí · 4–6 · PRELECTOR

- **1** grupo de mandos
- **0** instrumentos
- sin fracaso posible
- sesión **5–8 min**
- sube: **el adulto con el niño**

**Qué sabe y qué no**

Sabe sostener una dirección continua con una mano y seguir una instrucción de un paso. No sabe: coordinar dos ejes continuos asimétricos con las dos manos (la coordinación bimanual asimétrica madura entre los 6 y los 10 años; Fagard), leer, retener más de 1–2 elementos en memoria de trabajo (Gathercole y Alloway: a los 4 años, un tercio de la capacidad adulta), ni encajar un estado de derrota explícito. Atención enfocada en juego autoelegido: 5–10 minutos (Ruff y Lawson).

**Pantalla**

Cero instrumentos, cero números, cero texto. Horizonte, sol, terreno y cosas grandes que mirar. El único HUD es diegético: las gafas de sol puestas.

**Mandos y ayudas**

Solo las flechas (o inclinar la tablet): «apuntar el morro», dos ejes en una sola mano, límites de alabeo y cabeceo muy cerrados. El juego gobierna gases, coordina virajes y protege toda la envolvente. Un niño de 5 no puede coordinar acelerador y cabeceo a la vez, y no debe intentarlo. El suelo no mata: rebote blando, sacudida, «uy», y sigue volando. Despegue y aterrizaje: un botón, cinemáticos.

**Objetivo y fracaso**

No existe el fracaso. El objetivo es paseo con sorpresa: aros gigantes opcionales y avistar animales (carpincho, tukã, ñandú) que se pegan en un álbum local. Fallar un aro no dice nada; acertarlo, celebra.

**Sesión y retorno**

5–8 minutos, un paseo. Vuelve mañana porque la semilla diaria (derivada de la fecha, sin servidor) coloca un animal nuevo en un sitio nuevo.

## Tukã

tucán · 7–9 · LECTOR INICIAL

- **2** ejes + gases discretos
- **2** instrumentos pictóricos
- choque cómico, reintento inmediato
- sesión **10–15 min**
- sube: **el juego propone, niño y adulto confirman**

**Qué sabe y qué no**

Lee palabras cortas (la decodificación se consolida a los 6–8; en Paraguay, atención a la alfabetización bilingüe castellano-guaraní), coordina dos ejes en una mano y suma acciones discretas con la otra, retiene ~3 pasos. No sabe leer números en movimiento mientras pilota, ni sostener tres ejes continuos, ni encajar un fracaso sin reintento inmediato: el control con esfuerzo se está construyendo entre los 4 y los 7 (Rothbart).

**Pantalla**

Dos instrumentos pictóricos: velocidad como aguja sobre arcos de color, altitud como avioncito en cinta vertical. Los rótulos `IAS` y `ALT` aparecen ya —vocabulario, no información: el dato lo da el color y la posición, no la cifra.

**Mandos y ayudas**

Flechas (cabeceo + alabeo) en la derecha; gases discretos en la izquierda: ralentí / crucero / todo. Protección de pérdida activa, guiñada autocoordinada, haz de aterrizaje y aros de senda siempre. Sin viento.

**Objetivo y fracaso**

El circuito completo: despegue con el tutor de teclas, tres aros, aterrizaje en el haz. Puede estrellarse, pero el choque es cómico: nube de polvo, el avión se sacude y reaparece en pista en dos segundos. Sin vidas, sin pantalla de derrota. El reintento instantáneo es la tolerancia a la frustración que el niño aún no trae de casa.

**Sesión y retorno**

10–15 minutos: un circuito guiado y luego vuelo libre. Vuelve por los sellos del carné (aterrizajes limpios, rachas de aros), en `localStorage`, exportables como «código de hangar» —tres palabras en guaraní— para cambiar de dispositivo sin cuentas.

**Subida**

Tras cinco aterrizajes en el haz sin rebote, el juego propone Taguato; confirman niño y adulto. Proponer, jamás imponer.

## Taguato

halcón · 10–13 · LECTOR FLUIDO

- **3** ejes (+ timón opcional)
- HUD numérico completo
- choque real + debrief
- sesión **15–25 min**
- sube: **competencia demostrada**

**Qué sabe y qué no**

Lee fluido, razona sobre tasas y cifras, sostiene 3–4 elementos en memoria de trabajo, planifica dos pasos por delante y encaja el fracaso si le explica algo (Dweck: el error reencuadrado como información alimenta en vez de quemar). No sabe gestionar carga cognitiva adulta: viento fuerte + navegación + emergencia a la vez lo satura.

**Pantalla**

HUD numérico completo: `IAS`, `ALT`, `HDG`, `V/S`, `THR`. Los aros de senda pasan a opcionales; el haz de luz se apaga desde el propio juego, como reto, no desde un menú.

**Mandos y ayudas**

Gases continuos + cabeceo + alabeo; timón opcional. La protección de pérdida se sustituye por *aviso* de pérdida (sacudida y borde de pantalla). Entran viento ligero, flaps y compensador.

**Objetivo y fracaso**

El aterrizaje puntuado (senda, velocidad, tasa de descenso en el contacto) y retos de precisión con récord personal local. El choque es real: fin del vuelo y debrief con la traza de la aproximación dibujada. El fracaso se convierte en el instrumento didáctico principal.

**Sesión y retorno**

15–25 minutos persiguiendo un récord concreto. Vuelve porque ayer se quedó a un nudo del aterrizaje perfecto.

**Subida**

Diez aterrizajes puntuados sobre umbral: el juego propone Taguato Ruvicha y el jugador confirma. Aquí el adulto ya no interviene.

## Taguato Ruvicha

harpía · 14+ / ADULTO

- todos los mandos
- modelo completo sin red
- fracaso con consecuencia
- sesión **20–40 min**
- progresión: **maestría, no contenido**

**Especificación**

El modelo de coeficientes sin red: pérdida y barrena reales, viento y térmicas, combustible, navegación por `HDG` a pistas sin haz, pistas cortas del interior. Fracaso con consecuencia —se acaba el vuelo, debrief completo— y objetivos autoimpuestos. Es el modo Piloto actual, endurecido y con métricas. Aquí engancha al fundador; no necesita más justificación evolutiva.

### Resumen operativo

| Tramo           | Ejes simultáneos       | Instrumentos            | Fracaso             | Quién sube                       |
|-----------------|------------------------|-------------------------|---------------------|----------------------------------|
|  Mainumby 4–6   | 1 mano, morro asistido | ninguno                 | imposible (rebote)  | adulto + niño                    |
|  Tukã 7–9       | 2 + gases discretos    | 2 pictóricos (IAS, ALT) | cómico, respawn 2 s | juego propone, humanos confirman |
|  Taguato 10–13  | 3 + timón opcional     | HUD numérico            | real + debrief      | competencia demostrada           |
|  T. Ruvicha 14+ | todos                  | todo                    | con consecuencia    | el jugador                       |

### La pregunta difícil

Primero: los tramos no recortan contenido, recortan responsabilidad. El mundo, las pistas y los animales son los mismos en Mainumby que en Taguato Ruvicha; el adulto que entra en el tramo bajo vuela el mismo Paraguay, no «la versión pobre».

Segundo, y central: el adulto en el tramo bajo no juega al juego del niño; juega a otro juego en la misma pantalla: el de instructor. Vuelo a cuatro manos: dos personas en un teclado (o tablet + teclado), reparto real de mandos como en instrucción de vuelo. La niña lleva el morro con las flechas; el padre lleva gases y flaps; una tecla alterna «mis mandos / tus mandos», como dice un instructor de verdad. La niña de las gafas de sol pilota; el padre no se aburre porque está enseñando, que es el juego más profundo que existe. Y en sentido inverso: el niño que se asoma a Taguato antes de tiempo no se estrella solo, porque el adulto entra de copiloto y le quita carga (le lleva los gases) sin quitarle el vuelo.

Tercero: bajar de tramo nunca es regresión ni tiene ceremonia —«hoy vuelo tranquilo» es legítimo a los 40—; subir sí la tiene (carné, ave nueva). El selector de aves sin edades visibles hace el resto.

### Issues propuestos

1.  **feat: selector de tramo por aves, sin texto ni edades, con «rincón del adulto»** · Cuatro ilustraciones seleccionables; edades y explicación solo tras gesto de adulto (mantener pulsado 3 s).

2.  **arch: extraer las asistencias a capas activables sobre el modelo de coeficientes** · Protección de envolvente, autothrottle, autocoordinación y límites de actitud como módulos independientes; los tramos son presets.

3.  **feat: vuelo a cuatro manos — reparto de mandos en un teclado con tecla «mis mandos / tus mandos»** · Modo copiloto local: un jugador lleva actitud, otro gases/flaps; traspaso instantáneo con una tecla.

4.  **feat: fracaso por tramo — rebote blando (Mainumby), respawn cómico 2 s (Tukã), debrief con traza de aproximación (Taguato+)** · Tres implementaciones de la colisión con suelo según preset activo.

5.  **feat: semilla diaria por fecha + álbum de animales en localStorage con «código de hangar» exportable** · Retorno diario sin servidor, sin cuentas y sin telemetría; migración entre dispositivos con tres palabras en guaraní.

ÓGA VEVE · GRATIS A PERPETUIDAD PARA LA EDUCACIÓN PARAGUAYA · SIN CUENTAS · SIN TELEMETRÍA · WCAG 2.2 AA
