# Física que se ve volando

*Óga Veve · Capa educativa · Física del vuelo y astronomía*

> Informe de diseño de agosto de 2026, uno de los ocho que recoge la [visión del proyecto](../vision.md) en su sección 10. Se conserva tal como se escribió; lo que el juego ha decidido después manda sobre lo que aquí se propone.

El simulador ya calcula la verdad: sustentación, derrape, momentos, Euler. La capa educativa no añade lecciones — hace visible lo que ya está calculado. Nada de fichas: se aprende volando.

1 · La escalera

## Cinco peldaños, del asombro al modelo desnudo

Peldaño 1 · 4–7 años · «El aire empuja»

El aire es materia, no vacío; volar es apoyarse en él. **Experiencia:** acelerar por la pista y notar que el avión «quiere» subir; cortar motor y planear en silencio. **Visualización:** dos flechas gordas — el aire que sostiene y el peso que tira — que crecen y menguan. Sin números, sin texto.

Peldaño 2 · 8–10 · «El ala desvía el aire»

El ala empuja aire hacia abajo; el aire responde empujando el ala hacia arriba (tercera ley de Newton). Aquí se mata la explicación popular: la historia del «camino más largo por arriba» con tiempos de tránsito iguales **es falsa** — el aire de arriba llega *antes*, las placas planas vuelan y los aviones vuelan invertidos. Bernoulli no es mentira; esa versión escolar de Bernoulli, sí. **Experiencia:** ver los hilos de corriente salir del ala doblados hacia abajo (downwash); comprobar en el laboratorio que una placa plana también vuela. **Instrumento:** hilos de corriente + vector de sustentación.

Peldaño 3 · 10–13 · Ángulo de ataque y pérdida

Lo que manda no es la velocidad: es el ángulo entre el ala y el aire que llega. **Experiencia:** reducir motor en vuelo recto — para no caer hay que subir el morro; al superar el ángulo crítico el ala deja de volar de golpe, con el motor aún rugiendo. El modelo ya tiene pérdida real con transición a placa plana: enseñarla, no esconderla. **Instrumento:** cuña de AoA dibujada entre el eje del avión y el vector velocidad, verde→ámbar→rojo; hilos desprendiéndose del extradós.

Peldaño 4 · 13–16 · Energía, viraje y g

Dos resistencias: la parásita crece con v², la inducida crece al volar lento → curva de potencia con mínimo, y «detrás de la curva» volar más despacio exige *más* motor. En viraje la sustentación se inclina: su componente vertical ya no sostiene el peso, hay que tirar (n = 1/cos φ), tirar sube la inducida, y sin más motor se paga en altura o velocidad. A 60° de alabeo, 2 g, y la velocidad de pérdida sube un factor √2. **Experiencia:** virar a 45° manteniendo altura y ver la velocidad desangrarse. **Instrumentos:** g‑metro, curva de potencia viva con tu punto encima, sustentación descompuesta en vertical y horizontal.

Peldaño 5 · Bachiller y adultos · El modelo desnudo

C_L(α) y la polar; IAS frente a TAS; altitud de densidad — una tarde de 38 °C en Coronel Oviedo alarga el despegue de verdad —; envolvente V‑n; la hélice como ala que gira, con empuje que decae con la velocidad. **Experiencia:** despegar al mediodía de enero y al amanecer de julio con el mismo avión; abrir dentro del juego la documentación de coeficientes del avión que estás volando. **Instrumentos:** envolvente V‑n con tu estado como punto móvil, doble cinta IAS/TAS.

2 · Ver lo invisible

## Diez visualizaciones

Regla única: toda visualización es una *lectura del motor físico*, nunca una animación aparte. Se activan con un botón «gafas de físico», con preajustes por peldaño, y todo es desactivable para volar limpio.

| Visualización                  | Qué revela                                                                          | Carácter         | Nivel |
|--------------------------------|-------------------------------------------------------------------------------------|------------------|-------|
| Vectores de fuerza             | L, D, W, T a escala relativa real; con momentos en el nivel alto                    | bonita didáctica | 1+    |
| Hilos de corriente             | El downwash: el ala desvía aire hacia abajo                                         | bonita           | 2+    |
| Desprendimiento en pérdida     | El flujo se suelta del extradós, por semiala — se ve venir la pérdida asimétrica    | bonita           | 3+    |
| Cuña de AoA                    | Ángulo entre eje y velocidad, verde→ámbar→rojo. La más valiosa                      | didáctica        | 3+    |
| Vórtices de punta de ala       | La resistencia inducida hecha visible: engordan al volar lento o pesado             | bonita           | 4+    |
| Curva de potencia viva         | Gráfico potencia–velocidad con tu punto moviéndose; «detrás de la curva» a la vista | didáctica        | 4+    |
| G y visión                     | Aguja de g + viñeteado gris de la visión al tirar fuerte                            | bonita didáctica | 4+    |
| Doble cinta IAS/TAS            | Las dos velocidades divergen al subir; aire «enrarecido» como partículas            | didáctica        | 5     |
| Envolvente V‑n                 | Tu estado como punto dentro (o fuera) del diagrama                                  | didáctica        | 5     |
| Estela helicoidal de la hélice | El aire acelerado hacia atrás: el empuje es Newton otra vez                         | bonita           | 3+    |

3 · El laboratorio

## Sí, sin ninguna duda

Es donde el modelo propio rinde más: no hay tablas trucadas, mueves el parámetro y el motor responde. Deslizadores de **masa, superficie alar, densidad del aire, gravedad y potencia**, con preajustes honestos: Everest, Marte (casi sin aire: no despegas salvo enorme y ligerísimo), la Luna (g/6 pero densidad cero: *no vuela nada* — la lección más contraintuitiva), Titán (aire denso y poca gravedad: el paraíso del vuelo).

Preguntas de un chaval de trece años que responde: ¿volaría esto en la Luna? ¿Y con el doble de peso? ¿Por qué los aviones grandes aterrizan tan deprisa? ¿Podría un humano volar aleteando? (En Titán, sí.) Mecánica: antes de mover nada, el juego pide una predicción con tres iconos (sube / igual / baja); y un **avión fantasma** con los parámetros antiguos vuela al lado para comparar A/B.

4 · Astronomía

## La cabina como observatorio

Con el planetario ya en producción, la cabina es un observatorio móvil. **El sol:** altura según hora, fecha y latitud; la sombra del avión sobre el terreno como reloj; volar al oeste persiguiendo la puesta. **La latitud:** la altura del polo celeste sobre el horizonte *es* tu latitud — y en el sur no hay estrella polar brillante: el polo se encuentra prolongando 4,5 veces el eje mayor de la Cruz del Sur, que es mejor lección que una Polar regalada. **Cielo austral:** las Nubes de Magallanes (galaxias enteras a simple vista) y el centro galáctico, que desde −25° pasa casi por el cenit en las noches de junio y julio: Paraguay tiene uno de los mejores cielos del mundo para verlo — la convención sur arriba del equipo encaja: el centro de la galaxia queda literalmente «arriba». **La luna:** fase coherente con la posición del sol — la parte iluminada siempre le apunta. **Crepúsculos:** civil, náutico y astronómico como capas de luz que se apagan por turnos.

5 · Vuelo nocturno

## Volar a oscuras enseña a fiarse de la medida

**Enseña:** confiar en los instrumentos cuando los ojos mienten (una desorientación espacial suave se puede provocar con seguridad); navegación estelar real — mantener rumbo sur con la Cruz —; contaminación lumínica comparando el cielo sobre Asunción con el del Chaco; adaptación a la oscuridad con la cabina en luz roja. **Exige del motor:** cielo del catálogo estelar real posicionado por fecha, hora y coordenadas (integrar el planetario, no estrellas aleatorias), luna con fase y posición correctas iluminando el terreno, gradiente de crepúsculo creíble, luces de pista y PAPI, atenuación regulable de cabina.

6 · Currículo MEC

## Puentes con la escuela paraguaya

**Primaria** (Medio Natural / Ciencias): el aire como materia, día y noche, estaciones, sistema solar, puntos cardinales. **Secundaria:** Física (fuerzas y Newton, presión, trabajo y energía, fluidos, el viraje como movimiento circular), Matemática (vectores, trigonometría con rumbos y pendientes de planeo), Geografía (coordenadas, escalas, volar el propio territorio: lago Ypacaraí, río Paraguay, cordillera del Ybytyruzú). El bilingüismo cuenta: la interfaz y los nombres en guaraní — el propio *Óga Veve* — valen como material de lengua.

**Lo que necesita una maestra:** que corra en navegador sin instalar nada y funcione offline (PWA), porque el aula real tiene un ordenador y mala conexión; un **modo proyector** — un alumno vuela, toda la clase ve, visualizaciones en grande —; **guiones de vuelo de 20 minutos**, una página cada uno, con qué volar y qué preguntar después; y cero cuentas, cero datos de alumnos.

7 · Honestidad científica

## Simplificar sí; mentir no

Simplificaciones legítimas — declarándolas

Coeficientes por tramos en vez de CFD; atmósfera ISA sin meteorología; hélice como curva de empuje sin teoría de elemento de pala; terreno simplificado; un modo dócil con un avión más estable — siempre que la pérdida siga existiendo.

Mentiras a evitar, aunque sean cómodas

La explicación de los tiempos de tránsito iguales, aunque esté en mil libros. Visualizaciones que no salgan del estado real del motor: una flecha «bonita» que no es la fuerza calculada es un fraude. Ayudas invisibles: si el modo niño auto‑corrige, que se vea al copiloto ayudar. Una pérdida desactivada en vez de suavizada. Cielo decorativo con estrellas aleatorias o luna de fase imposible. Efectos g teatrales.

**Regla de oro:** todo lo que se dibuja es una medida; toda simplificación se declara.

Listas para abrir

## Seis issues

1.  Overlay «gafas de físico»: vectores L/D/W/T leídos del estado del motor, tres niveles de detalle, conmutable en vuelo.
2.  Hilos de corriente con downwash y desprendimiento por semiala en la pérdida.
3.  Cuña de AoA verde/ámbar/roja + curva de potencia viva con el punto del avión en tiempo real.
4.  Modo Laboratorio: deslizadores (masa, S, ρ, g, P) con preajustes Luna/Marte/Titán, predicción previa y avión fantasma A/B.
5.  Integración del planetario en el cielo del simulador: efemérides reales de sol, luna con fase coherente y estrellas; crepúsculos por capas.
6.  Kit docente MEC: seis guiones de vuelo de 20 minutos (primaria y secundaria), modo proyector y PWA offline.

Óga Veve · Oksigenia SL / Granja Óga · Gratis a perpetuidad para la educación paraguaya
