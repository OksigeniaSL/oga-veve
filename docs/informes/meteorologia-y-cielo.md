# El cielo de Óga Veve

*Óga Veve · Capa educativa · Meteorología y cielo*

> Informe de diseño de agosto de 2026, uno de los ocho que recoge la [visión del proyecto](../vision.md) en su sección 10. Se conserva tal como se escribió; lo que el juego ha decidido después manda sobre lo que aquí se propone.

Diseño de la capa de meteorología, del niño de cinco años al adulto curioso, con su implementación en three.js a 60 fps.

Principio rector: el cielo es el manual. Nada se lee que pueda volarse.

## 1. Escalera de aprendizaje

P1 · 4–6 años · sin lectura · **«El cielo empuja».** Concepto: el aire se mueve y mueve al avión; las nubes esponjosas son sitios donde el aire sube. Volando: bajo cada cúmulo hay una ascendencia suave con sonido propio (un acorde que sube) y pájaros girando que la señalan. Comprobación: telemetría implícita — si empieza a buscar nubes para ganar altura sin que nadie se lo diga, lo ha entendido; se celebra con música.

P2 · 7–9 años · **«Las nubes nacen del suelo».** Concepto: el sol calienta el suelo, el suelo el aire, el aire sube y arriba se hace nube. Volando: reto del planeador con motor apagado sobre un mosaico de campo arado (térmica fuerte), pastizal, bosque y laguna (nada); el niño descubre qué suelo «funciona». Comprobación: sostenerse cinco minutos encadenando tres térmicas.

P3 · 10–13 años · **«El cielo tiene reglas».** Conceptos: todas las bases de los cúmulos están a la misma altura (nivel de condensación); el viento deriva; indicada ≠ verdadera. Volando: humo de chimeneas y manga como instrumentos; subir hasta rozar la base y leer el altímetro. Comprobación: elegir la cabecera correcta según la manga tres aterrizajes seguidos con viento cruzado.

P4 · 14–17 años · **«Leer el cielo es pronosticar».** Conceptos: masas de aire, el frente que anuncian los cirros, cizalladura, la vida de una tormenta. Volando: misión «¿volamos hoy?» — el juego presenta un amanecer generado (cirros en garfio, viento norte, bochorno), el jugador elige hora y ruta, y vuela las consecuencias: quien despega a las 15 h de enero con torres creciendo vive el porqué y aterriza de emergencia sin drama.

P5 · adultos · **«El aire como fluido».** Conceptos: la atmósfera ISA que ya usa el motor, gradiente adiabático seco (≈1 °C/100 m), base del cúmulo ≈ 125 m × (T − T_rocío). Volando: modo «clima de hoy» con datos de clima.granjaoga.com; el jugador calcula la base con los datos del día y comprueba en vuelo que está donde predijo: la predicción cumplida es el examen.

## 2. Los diez géneros y cuáles entran

| Género                    | Render barato                                                                                                                                                                                           | Qué enseña                                                                     |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Cumulus                   | Protagonista. Racimo de 3–6 billboards con atlas de 8 orientaciones, base plana compartida al nivel de condensación, sombra como decal oscuro en el terreno (la sombra es lección: ahí no hay térmica). | Debajo, ascendencia; dentro, nada visible.                                     |
| Cumulonimbus              | El jefe final. Malla low-poly de torre y yunque con billboards adosados; cortina de lluvia como plano con textura desplazándose; relámpago como pulso de la luz direccional más un sprite.              | Rodear siempre; jamás por debajo ni por delante de su racha.                   |
| Stratus / niebla          | Casi gratis: la niebla exponencial existente convertida en capa (densidad función de la altura) más un plano translúcido visto desde arriba.                                                            | Techo bajo, pérdida de referencias, esperar.                                   |
| Stratocumulus             | El cielo del «día del sur»: capa de planos con textura tileable y huecos reales.                                                                                                                        | Aire estable, vuelo tranquilo debajo, ojo al hueco que se cierra.              |
| Cirrus                    | Decorado que habla: textura en el skydome, coste cero.                                                                                                                                                  | Viento fuerte en altura, frente en 24–48 h.                                    |
| Cirrostratus              | Fusionable con el anterior añadiendo el halo solar (sprite anular).                                                                                                                                     | Anuncia lluvia.                                                                |
| Altocumulus               | Opcional tardío; billboards pequeños en capa media.                                                                                                                                                     | *Castellanus* por la mañana = tormenta por la tarde, lección paraguaya de oro. |
| Altostratus, nimbostratus | No como objetos: a la altura del juego son techo, no forma; se representan como «día gris» (cielo plano, lluvia, poca visibilidad).                                                                     | —                                                                              |
| Cirrocumulus              | Fuera: indistinguible a coste razonable.                                                                                                                                                                | —                                                                              |

Regla de coste: nunca volumétrico real. Entrar en una nube funde a blanco: dentro no se ve nada, y esa es la lección.

## 3. Fenómenos que cambian el vuelo

Todo cuelga de una pieza: un campo de viento `W(x, y, z, t)` que se resta de la velocidad respecto al suelo para obtener la aerodinámica — el hueco que el motor ya dejó. Se compone por suma de términos baratos:

- **Viento base:** vector por altura, perfil logarítmico cerca del suelo, giro y refuerzo arriba (cizalladura enseñable).
- **Térmicas:** cilindros de perfil gaussiano (radio 100–300 m, ascenso máximo 2–4 m/s, anillo descendente alrededor) anclados a parches de terreno, con intensidad según hora solar y superficie. El cúmulo se enciende encima cuando la térmica alcanza el nivel de condensación: causa y efecto visibles.
- **Turbulencia:** ruido simplex 3D muestreado en la posición del avión, tres octavas, amplitud modulada por cercanía al suelo, a térmicas y a tormentas.
- **Viento de ladera:** componente vertical = producto escalar del viento con la normal del terreno; gratis con el heightmap.
- **Brisa de valle:** término anabático de día, catabático de noche, según pendiente y hora.
- **Tormenta:** bajo el cumulonimbus, downburst (chorro descendente que diverge al tocar el suelo) y frente de racha que avanza kilómetros por delante: el peligro didáctico por excelencia.
- **Niebla del río:** densidad de la niebla modulada por distancia al cauce y hora; nace de madrugada y se quema a media mañana.
- **Calma del amanecer:** mínimo global de viento y turbulencia al alba (inversión nocturna real): el momento tutorial por defecto.

## 4. Meteorología paraguaya

**La tormenta de verano:** cumulonimbus aislado de tarde, diciembre–marzo, ciclo completo en una sesión: cúmulo a las 14, torre a las 16, yunque y racha a las 17. **El viento norte:** cálido y húmedo, bochorno creciente, térmicas potentes pero turbias y bases bajas; «cuando el norte sopla tres días, el sur viene de camino». **El sur (surazo):** frente frío con giro brusco del viento, caída de 10–15 °C en horas y a veces línea de turbonada por delante; en el juego, el evento «la manga se da la vuelta»; a cambio trae el mejor aire del año, frío y limpio. **La humedad del Chaco:** gradiente este–oeste — hacia el Paraná bases bajas y aire lechoso; hacia el Chaco, más seco, térmicas más altas y ásperas: el mismo sol da nubes distintas según el suelo. **La niebla del Paraná y del río Paraguay:** radiativa, de mayo a agosto, pegada al agua, cierra los aeródromos ribereños hasta media mañana. No hay huracanes ni nieve; sí granizo y reventones. La estacionalidad invertida — tormentas en Navidad, niebla en julio — es contenido en sí.

## 5. Cielo y hora del día

El degradado actual se parametriza con el ángulo solar. Fondo físico: el aire dispersa más la luz azul (Rayleigh); por eso el cielo es azul y el sol bajo, cuya luz atraviesa mucho más aire, llega rojo. Amanecer y ocaso corren el gradiente a naranja en el lado del sol; los crepúsculos civil (−6°), náutico (−12°) y astronómico (−18°) son tres pasos de oscurecimiento. Luna con fase real reutilizando el calendario lunar existente. Noche: buffer estático con las ~500 estrellas más brillantes rotando alrededor del polo sur celeste, que no tiene estrella: se encuentra prolongando 4,5 veces el palo mayor de la Cruz del Sur — misión nocturna de navegación. Las Nubes de Magallanes, dos sprites tenues; el centro galáctico, alto en las noches de invierno. Lección que el material del norte omite: el sol culmina al norte y cruza el cielo de derecha a izquierda. El mapa ofrece modo sur-arriba, coherente con la convención de la casa.

## 6. Miedo bien enseñado

A los cinco años no se enseña miedo sino respeto, con personajes: la tormenta «está enfadada y hoy no quiere visitas»; la niebla «juega al escondite con el suelo: espera a que se canse». Ninguna consecuencia violenta: el avión se posa solo y la abuela de la granja lo explica por radio en una frase. Desde el peldaño 4, el mismo respeto con nombre técnico: el cumulonimbus hace daño por downburst, granizo y engelamiento, no por el rayo; la niebla, por el vuelo visual que se mete en nube y el terreno que no se ve; la cizalladura, en final, cuando no queda altura para corregir. La regla transversal, en positivo: el buen piloto elige cuándo no volar — decidir quedarse en tierra puede ganar la misión.

## 7. Integración sin libro de texto

Todo instrumento es diegético: manga, humo, aves, halo, y la radio de la abuela (voz en los tres idiomas; cero texto para quien no lee). Las misiones son recados de granja — «lleva la miel a Coronel Oviedo antes de la tormenta» — y la meteorología es el aliado o el antagonista, nunca el temario. Logros con nombre de saber: «Cazador de térmicas», «Leyó el cielo», «Supo esperar». Nada de fichas ni ventanas: si hay que explicar, lo dice la radio en una frase, siempre después del hecho. Puente final: el modo «clima de hoy» toma viento, nubosidad y luna reales de clima.granjaoga.com para que el niño vuele el mismo cielo que ve por la ventana.

## → Seis issues listos para abrir

- feat(viento): campo W(x,y,z,t) compuesto (base + térmicas + ladera + ruido) restado en el cálculo de la velocidad aerodinámica; manga de viento en pista.
- feat(térmicas): térmicas gaussianas ancladas a parches de terreno según hora solar, cúmulos billboard con base común al nivel de condensación y aves marcadoras; reto del planeador.
- feat(tormenta): cumulonimbus de verano con ciclo de vida, downburst, frente de racha, cortina de lluvia y relámpago; aviso por radio y logro por evitarla.
- feat(cielo): gradiente parametrizado por ángulo solar, crepúsculos, luna con fase real desde el calendario existente, Cruz del Sur, Nubes de Magallanes y modo sur-arriba en el mapa.
- feat(niebla): niebla matinal modulada por distancia al río y hora, capa de stratus sobre la niebla exponencial actual; misión «espera o desvíate al alterno».
- feat(clima-real): modo «clima de hoy» consumiendo viento, nubosidad y fase lunar de la API de clima.granjaoga.com.

Óga Veve · Oksigenia SL / Granja Óga · gratis a perpetuidad para la educación paraguaya
