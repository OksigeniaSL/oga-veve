/**
 * **La tercera escena del modo inicio: el primer vuelo de pasajero de Ara.**
 *
 * Las dos primeras enseñan a despegar y a aterrizar con Jazlyn al lado. Esta
 * es la otra primera vez, la que casi todo el mundo tiene antes que la de
 * pilotar: **subirse a un avión de línea**. Ara va en el asiento de la
 * ventanilla —sin género: la escena no dice si es niño o niña— y Jazlyn es
 * la comandante, en la cabina de mando, hablando por la megafonía.
 * No se toca ningún mando: es mirar y escuchar. Lo lleva la tripulación, como
 * en un vuelo de verdad; ver `vuelo-de-linea.ts`.
 *
 * Se abre con su ficha en «¿A qué jugás?» o con `?inicio=3`. No es la
 * primera experiencia: esa sigue siendo el despegue. Y para probar el kit
 * de viaje sin volar hasta él, `?inicio=3&kit`: ver `kitDePrueba` en
 * `game.ts`.
 *
 * ## El vuelo
 *
 * **De Los Rodeos a La Palma**, en el JAZ 90, que es un reactor regional de su
 * clase —en Canarias los saltos entre islas los hacen turbohélices y reactores
 * regionales—, con el día de siempre del norte de Tenerife: el alisio del
 * nordeste y su mar de nubes a unos mil quinientos metros, que se atraviesa al
 * subir. Es el tramo donde más hay que contar por la ventanilla: el valle de
 * La Orotava, el Teide asomando por encima de las nubes y La Gomera, las tres
 * por el mismo lado —el izquierdo, que es donde va Ara—, y las tres con su
 * historia. Ver `lo-que-se-ve-en-ruta.test.ts`.
 *
 * ## Contado de verdad, y sin aburrir
 *
 * Enrique, al probar la primera versión: le gustó, pero «está todo el tiempo
 * la vista de ventanilla, eso lo hace aburrido», no se oía a la tripulación
 * enseñar el cinturón y el chaleco, y había ratos de cinco minutos sin nada.
 * «La experiencia de montar en un vuelo hay que contarla, explicarla con
 * cariño y que el niño entienda todo lo que está pasando.» Así que la escena
 * lleva tres cosas más, cada una en su sitio:
 *
 * - **Los planos.** De vez en cuando el avión se ve por fuera —rodando, al
 *   despegar, en el giro, una vuelta alrededor, el ala, al tocar— y se vuelve
 *   a la ventanilla; y Ara **se pega al cristal** cuando hay algo que mirar.
 *   Se ve por fuera lo que se está contando, y el cambio cae siempre en un
 *   silencio, nunca a media frase. Ver `Plano` y `CORTE_DE_PLANO`.
 * - **La tripulación de cabina, en persona.** Da la demostración de
 *   seguridad por la megafonía, como en cualquier vuelo, y además **se acerca
 *   a Ara** y le habla bajito, sin altavoz —revisa el cinturón, le trae el
 *   agua, le explica las nubes, el motor, las islas—, que es lo que hace una
 *   tripulante de verdad con un niño que vuela por primera vez. Jazlyn sigue
 *   hablando por la megafonía para todos.
 * - **Lo que se cuenta en los ratos callados**, las «charlas»: no van en un
 *   orden fijo sino cuando vienen a cuento —el giro cuando se gira, el ruido
 *   del tren cuando se guarda, las nubes otra vez al cruzarlas bajando— y,
 *   las explicaciones, después de un rato de silencio y en su tramo del vuelo.
 *   Ver `CHARLAS_DEL_PASAJE`.
 *
 * Y lo que se explica lleva su **dibujo en la ventanita** de cristal —ver
 * `ui/dibujos-del-pasaje.ts`—; y lo que pasa, a veces, su **ilustración**:
 * la cabina vacía del embarque, la cabina llena, la tripulante al lado de Ara,
 * Ara con la cara contra el cristal y la comandante en su cabina. Ver
 * `ui/ilustraciones.ts` y `ilustrada`.
 *
 * ## Lo que pasa, en el orden de un vuelo de verdad
 *
 * 1. **El asiento**: Ara se pega a la ventanilla y descubre el ala y el
 *    motor. Su asiento es el que los deja ver: ver `asientoDeAra`. Y cuenta
 *    que fue al baño antes de subir. Mientras se acaba de embarcar, el hilo
 *    musical: ver `audio/hilo-musical.ts`.
 * 2. **El cinturón**: la tripulación da la bienvenida y pide abrocharlo, y Ara
 *    se lo abrocha —el dibujo de la hebilla, y el cartel encendido—.
 * 3. **Las puertas**: la comandante manda armar los toboganes y Ara se da
 *    cuenta de que ya se van. Con eso, la tripulación de mando arranca.
 * 4. **Los motores**, que se oyen arrancar, y Ara con la cara contra el cristal.
 * 5. **El rodaje**, visto por fuera, con la bienvenida de la comandante.
 * 6. **La demostración de seguridad**, por la megafonía: el cinturón, las
 *    salidas y sus luces del suelo, las máscaras, el chaleco, la tarjeta y el
 *    modo avión. Ver `DEMOSTRACION` para el porqué de cada cosa y su orden.
 *    Y en algunos vuelos, con un toque de gracia en la entrada y en la
 *    despedida, nunca en las instrucciones: ver `demostracion-con-gracia.ts`.
 * 7. **La revisión**: la tripulante pasa mirando cinturones y le cuenta a Ara
 *    por qué la persiana va subida, y lo del baño con la luz encendida.
 * 8. **La espera** antes de la pista, y el permiso de la torre.
 * 9. **El despegue**, visto por fuera; el empuje, el tren que se guarda, el
 *    giro y las nubes por dentro.
 * 10. **Arriba**: la respuesta de las nubes, una vuelta alrededor del avión,
 *     el baño con la luz apagada, el servicio y la tripulante con Ara: las
 *     nubes de cerca.
 * 11. **La bajada**, los oídos, **el kit de viaje** —tres juegos que trae la
 *     tripulante en la parte alta de la bajada, sobre el mar, ver
 *     `kit-de-viaje.ts`—, que se guarda al empezar la llegada, cruzando los
 *     diez mil pies; y la llegada sin juego delante: las nubes, la isla y la
 *     cabina preparada.
 * 12. **La aproximación**: el ala estirando los flaps, el tren, y la toma vista
 *     desde el borde de la pista; al tocar, el ala otra vez, con los
 *     aerofrenos levantándose (punto 296), y Ara cuenta para qué en el primer
 *     rato tranquilo rodando.
 * 13. **La llegada**, rodando por fuera, y en el puesto la despedida.
 *
 * ## Solo se nombra lo que se ve
 *
 * Enrique voló esta escena el 18-10-2026 y encontró cinco veces el mismo
 * fallo: Anaga y el valle de La Orotava nombrados debajo del mar de nubes,
 * «esa isla redondita es La Gomera» con la ventanilla llena de nubes, «¡ya se
 * ve la isla adonde vamos!» con el avión metido en una nube, y «se ven las
 * montañas, la costa y el mar» con la isla en la ventanilla de al lado. Lo
 * repetido va a la raíz: la regla de `lo-que-se-nombra.ts` —solo se nombra
 * lo que se ve, y lo nombrado se señala— vale también aquí. Lo que nombra un
 * sitio del paisaje lo dice —`nombra`—, y antes de decirlo se le pregunta al
 * juego si se ve —ver `LecturaDelPasaje.ver`—: por la ventanilla de Ara, con
 * su cara contra el cristal mirando hacia él, o con el avión por fuera y el
 * sitio al fondo, que es como se enseña. Si no se ve de ninguna manera, la
 * frase espera; y si se le pasa el momento, se salta y se cuenta lo que es
 * verdad —dentro de una nube, la nube—. Lo señalado por la ventanilla, igual,
 * y con el lado de cuando se dice. Ver `SitioDelPaisaje`.
 *
 * Y lo que pasa se cuenta cuando pasa: el meneo dentro de la nube, el techo
 * al salir por debajo de las nubes, el Teide la primera vez que se nombra, el
 * tren visto desde abajo al salir y el señalero hasta parar el avión.
 *
 * ## Todo lo que se oye cambiar se cuenta
 *
 * Enrique (punto 297): «llegó el momento en que los pilotos quitaron gas, y
 * nadie dice nada». Los motores suenan como en un vuelo de verdad —ver
 * `PotenciaDeLinea` en `vuelo-de-linea.ts`— y cada cambio que se oye lo nota
 * Ara en el momento: el gas de subida a los mil quinientos pies, el ralentí
 * al empezar a bajar y el empuje que sube con el tren y los flaps fuera. Lo
 * explica quien puede en ese momento, y si no puede nadie —la cabina estéril
 * por debajo de los diez mil pies, la tripulación sentada—, en el primer rato
 * tranquilo de después, como la reversa al llegar. Y lo mismo con el plop de
 * los oídos al subir (punto 284), que lo explica la tripulante en cuanto se
 * levanta y llega al asiento de Ara, con el servicio; en la bajada, Ara ya
 * sabe que es al revés.
 *
 * ## Y si no hay nada que contar, Ara se duerme
 *
 * Enrique voló la escena entera (punto 304): «esto tarda, y en un avión
 * aguantan porque no les queda otra, pero en casa se aburren». Así que arriba,
 * en cuanto la comandante acaba lo de los diez mil pies y no queda nada que
 * decir ni que ver, Ara bosteza, la pantalla se funde a Ara durmiendo y
 * soñando, con el mapa de la ruta en la ventanita, el vuelo pasa deprisa —de
 * verdad: el avión sigue su ruta, ver `frame` en `game.ts`— y lo que despierta
 * a Ara es el *ding* de la luz del cinturón que se apaga con el «ya estamos
 * arriba», como a medio avión. Para bajar, nunca durmiendo: al bajar se notan
 * los oídos, y quien duerme traga menos. Ver `puedeDormirse` y `ui/siesta.ts`.
 *
 * Medido en el banco, el crucero de este vuelo dura un minuto y va lleno —el
 * «ya estamos arriba», el baño de Ara, el servicio y la tripulante con las
 * nubes—: entre islas casi no hay crucero. El rato callado de verdad es lo
 * alto de la subida, por encima del mar de nubes, y ahí es donde cabe la
 * siesta: la primera, de minuto y medio, no se notaba —«no movieste el vuelo
 * nada»—, y ahora es lo que queda de subida después de la comandante.
 *
 * ## Y el modo rápido
 *
 * Quien juega puede poner el vuelo en modo rápido con el botón ⏩: mientras
 * está puesto, en cada rato en que no va a pasar nada el avión vuela de
 * verdad más deprisa, con todo a la vista, y se para solo un poco antes de lo
 * siguiente que hay que contar o ver; pasado eso, sigue. Nunca se salta nada.
 * Vale en la subida y en lo alto de la bajada: **la llegada se vive a su
 * paso**, y desde los diez mil pies bajando se apaga solo. Ver `adelanto`.
 *
 * ## La vuelta en la pista de La Palma
 *
 * Punto 300. En La Palma las tres salidas de la pista —A, B y C— están en su
 * mitad sur, y aterrizando por la 36 un reactor no frena a tiempo para la C:
 * se pasa, y por delante ya no hay ninguna. Así que sigue hasta el final, da
 * la vuelta en el ensanche que hay en la punta —la plataforma de viraje,
 * pintada con su raya para seguirla— y vuelve por la misma pista hasta la C.
 * Es lo que pide el AIP de La Palma a los aviones grandes, y lo que hace el
 * JAZ 90 en el juego; ver `docs/historias/fuentes.md`. Ara lo nota cuando de
 * verdad gira, con el avión visto por fuera; y como en la pista no puede
 * explicarlo nadie —la cabina de mando, en lo suyo con la pista ocupada; la
 * tripulante, en su asiento—, lo cuenta la comandante en cuanto la deja
 * libre: por qué se da la vuelta, que en la punta hay un ensanche para eso y
 * que ir por la pista al revés pide permiso a la torre, porque mientras tanto
 * nadie puede aterrizar. Ver `daLaVuelta` y las charlas `vueltaEnPista` y
 * `porQueLaVuelta`.
 *
 * ## Lo que se reconoce al llegar, y la música
 *
 * Punto 314. Lo mágico, dice Enrique, es ir reconociendo lo de abajo cuando
 * el avión ya casi toca tierra. Entrando por el sur a la 36, la ladera de
 * Villa de Mazo —fincas, casas, caminos que suben— queda a la izquierda, la
 * de Ara, y Ara la cuenta cuando de verdad se ve por su cristal. El nombre del
 * pueblo lo dice la comandante con la pista ya libre, que en la final no
 * puede nadie. Ver las charlas `mazo` y `queEsMazo`.
 *
 * Y la música de llegada, que empieza a los diez mil pies: Ara pregunta por
 * qué la ponen poco después de que suene, y contesta la tripulante en persona
 * si anda por los asientos preparando la cabina. Ver la charla `musica`.
 *
 * ## Los que se levantan antes de tiempo, y lo que es la tripulación
 *
 * Punto 303. Al pararse en el puesto, alrededor se oyen hebillas y gente
 * levantándose, bajito, con la luz del cinturón todavía encendida; Ara lo oye
 * y sigue en su asiento con el cinturón puesto. La luz se apaga cuando la
 * comandante la apaga, con los motores ya parados —su *ding*, y el cartel que
 * se va—, y entonces Ara se lo suelta y la tripulante se lo agradece: el
 * avión podía frenar de golpe, y lo de los compartimentos de arriba se pudo
 * mover en el vuelo. Y explica su cara seria: está trabajando, que lo suyo es
 * la seguridad, y va con el cinturón puesto hasta que el avión para; por eso
 * lo recuerda el altavoz. Sin regañar a nadie: se enseña con el ejemplo.
 *
 * Y lo que saben hacer de verdad —primeros auxilios y RCP con el desfibrilador
 * de a bordo, fuego y humo, evacuar el avión en noventa segundos, los
 * chalecos en el agua— lo cuenta la tripulante en el tramo tranquilo de la
 * bajada, una vez; y si allí no hubo hueco, en el puesto. Es la misma lección
 * que la de los galones: el uniforme no es para servir, es responsabilidad.
 * Ver los momentos `impacientes` a `gracias` y la charla `tcpOficio`.
 *
 * ## El baño, cuando la luz deja
 *
 * Punto 293. Ara preguntaba por el baño bajando, la tripulante le decía que
 * con la luz encendida mejor esperar a aterrizar, y Ara se quedaba sin ir:
 * «y eso que es la madre». El salto entre islas es así de corto de verdad,
 * y lo que se enseña es la regla de verdad: **la luz manda, y cuando se
 * apaga, se puede**. No que en un avión no se va al baño.
 *
 * - **Antes de subir**: Ara cuenta en el embarque que ya fue, porque en los
 *   vuelos cortos casi no da tiempo. Es lo que se hace.
 * - **Con la luz encendida**, rodando, Ara lo pregunta en la revisión de
 *   cinturones, que es cuando la tripulante está a su lado —subiendo va
 *   sentada y atada—, y ella le dice que con la luz encendida no se levanta
 *   nadie, y que cuando se apague le acompaña.
 * - **Cuando se apaga**, arriba, va de verdad: la tripulante viene a por Ara
 *   en cuanto la comandante dice que se pueden soltar, da el anuncio del
 *   servicio desde la cocina de atrás mientras Ara está en el baño, y Ara
 *   vuelve a su asiento y se abrocha otra vez. Si la luz no se apaga, o ya no
 *   queda crucero para ir y volver, no va: espera a aterrizar, y lo dice sin
 *   drama. Ver `puedeIrAlBano`.
 *
 * ## Quién contesta, y cómo
 *
 * **La comandante no le contesta a un pasajero por la megafonía**, y aquí no
 * lo hace. Ara habla bajito con quien va a su lado —quien juega, o quien le
 * acompañe—; lo que contesta sus preguntas es lo que de verdad se dice en un
 * avión: anuncios **para todo el pasaje**, de los que dan las comandantes
 * «para quienes vuelan hoy por primera vez», y **la tripulante de cabina**,
 * que sí se acerca al asiento. Ara pregunta primero, y la respuesta llega
 * después y en su momento, nunca encima.
 *
 * ## Un suceso, una voz
 *
 * Las mismas reglas que las otras dos escenas, con la misma cola de frases:
 * ver `conversacion.ts`. Nada se dice encima de nada, lo que ya no viene a
 * cuento se salta —una exclamación de la carrera no se dice volando—, y lo que
 * no tiene voz grabada espera el rato de leerlo.
 *
 * Esto es solo la secuencia: no toca el DOM, ni el modelo de vuelo, ni el
 * audio. Lo engancha `game.ts`, que además pone la cámara de cada plano —ver
 * `cameras/escena.ts`— y lo dibuja `ui/inicio.ts`.
 *
 * ## El motor y el guion
 *
 * La escena es el motor del pasaje —`motor-del-pasaje.ts`: los turnos, los
 * planos, la siesta, el ⏩, la ventanilla viva, el kit y el cuaderno— con el
 * guion de este vuelo —`guion-tenerife-la-palma.ts`—. Se separaron para el
 * vuelo largo de Madrid a Asunción (T1, 1-11-2026), que es otro guion sobre
 * el mismo motor. Lo de aquí arriba vale para los dos, menos lo que es de las
 * islas.
 */

import type { VozDelInicio } from "./conversacion";
import { GUION_TENERIFE_LA_PALMA, type CharlaDelPasaje, type MomentoDelPasaje } from "./guion-tenerife-la-palma";
import { MotorDelPasaje, type GuionDelPasaje, type OpcionesDelPasaje } from "./motor-del-pasaje";

export * from "./motor-del-pasaje";
export * from "./guion-tenerife-la-palma";

/**
 * **La tercera escena**: el motor del pasaje con el guion de Los Rodeos a La
 * Palma. Es lo que abre el juego con `?inicio=3`. Con otro guion de sus mismos
 * momentos, lo prueba el banco del salto: ver `guion-de-prueba-del-salto.ts`.
 */
export class VueloDePasaje extends MotorDelPasaje<MomentoDelPasaje, CharlaDelPasaje> {
  constructor(
    voz: VozDelInicio,
    opciones: OpcionesDelPasaje = {},
    guion: GuionDelPasaje<MomentoDelPasaje, CharlaDelPasaje> = GUION_TENERIFE_LA_PALMA,
  ) {
    super(voz, guion, opciones);
  }
}
