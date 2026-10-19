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
 * primera experiencia: esa sigue siendo el despegue.
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
 *     desde el borde de la pista.
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
 */

import type { GenteDeLaCabina } from "../audio/gente-del-pasaje";
import { seLePasoElMomento } from "../audio/megafonia";
import type { DibujoDelPasaje } from "../ui/dibujos-del-pasaje";
import type { IlustracionDelPasaje } from "../ui/ilustraciones";
import { APAGA_LA_LUZ } from "./cinturon";
import { Conversacion, type FraseDicha, type Linea, type VozDelInicio } from "./conversacion";
import { KitDeViaje, LINEAS_DEL_KIT, type EstadoDelKit } from "./kit-de-viaje";
import { DICHO_DE_LA_LUZ, JuegoDeLaLuz, LINEAS_DE_LA_LUZ } from "./luz-verde";
import type { ComoSeVe } from "../world/se-ve-desde-el-pasaje";
import type { Fase } from "./vuelo";
import type { PermisosDeLaEscena, PotenciaDeLinea, TramoDeLinea } from "./vuelo-de-linea";

export type { ComoSeVe };

/** Diez mil pies, m: por debajo, la cabina de mando no habla de nada que no sea volar. */
export const DIEZ_MIL_PIES = 10000 * 0.3048;

/**
 * **La cumbre del Teide**, m: 3.715 según el Instituto Geográfico Nacional
 * desde 2017, y 3.718 en lo que se publicaba antes. «Más alto que el Teide»
 * se dice con margen sobre la más alta de las dos.
 */
export const CUMBRE_DEL_TEIDE = 3718;

/** Dónde se vuela la escena, en qué avión y adónde. Ver la cabecera. */
export const SITIO_DEL_PASAJE = "tenerife-norte";
export const DESTINO_DEL_PASAJE = "la-palma";
export const AVION_DEL_PASAJE = "jaz-90";
/** Y el lado de la ventanilla de Ara: el de lo que se cuenta. */
export const LADO_DE_ARA = "izquierda" as const;

/**
 * **Las salidas de emergencia del avión de la escena** (punto 312): las de su
 * clase, la del ERJ 170 —la hoja de tipo de EASA, IM.A.001, apartado III.21,
 * para el 170-100 y el 170-200—: cuatro puertas tipo I, la de pasaje y la de
 * servicio delante y las dos de detrás, una a cada lado, y **ninguna sobre el
 * ala**. Las ventanillas de salida sobre el ala son de los más largos de la
 * familia, el ERJ 190 y el 195. Lo que dice la demostración, lo que pinta su
 * dibujo y las puertas del modelo tienen que casar con esto. Ver
 * `docs/historias/fuentes.md`.
 */
export const SALIDAS_DEL_PASAJE = { delante: 2, detras: 2, sobreElAla: 0 } as const;

/** Qué hay que mirar: el dibujo de la tarjeta. Ver `ui/inicio.ts`. */
export type QueMirar = "ventanilla" | "ala" | "motor" | "nubes" | "cinturon";

/**
 * **El plano**: desde dónde se ve el vuelo en cada momento.
 *
 * - `ventanilla`: desde el asiento de Ara, mirando como se mira.
 * - `asomado-*`: **Ara con la cara contra el cristal**, como hace cualquier
 *   criatura para ver más: los ojos se acercan a la ventanilla y miran hacia
 *   el motor o hacia abajo. Es un movimiento de la cabeza, no un corte. Ver
 *   `asientoDeAra`.
 * - `fuera-*`: **el avión por fuera**, lo que se está contando visto desde
 *   donde se ve mejor: rodando, desde el borde de la pista al despegar y al
 *   tocar, en el giro, una vuelta alrededor en crucero y el ala. Ver
 *   `cameras/escena.ts`.
 * - **Y lo que se nombra del paisaje, donde se vea** (18-10-2026): Ara con la
 *   cara contra el cristal mirando hacia ello —`asomado-paisaje`—, o el avión
 *   desde detrás con el sitio al fondo —`fuera-paisaje`—. Ver
 *   `SitioDelPaisaje`.
 * - **El tren desde abajo** —`fuera-tren`—, con las patas bajando y trabadas,
 *   y **el señalero** —`fuera-senalero`—, guiando el avión hasta pararlo:
 *   lo que desde el asiento no se ve y enseña qué pasa.
 * - **La vuelta en la punta de la pista** —`fuera-raqueta`—, desde un lado y
 *   en alto, quieta: el avión que gira en el ensanche del final y vuelve por
 *   la pista. Desde la ventanilla solo se ve el suelo dando vueltas.
 * - **Ara asomada al pasillo** —`pasillo`— (punto 312): cuando la demostración
 *   dice «busquen la más cercana», Ara hace lo que se pide y mira hacia la
 *   salida más cercana, que en su fila es la de delante: el letrero «EXIT»
 *   encendido encima de las puertas y las tiras del suelo que llevan a ellas.
 *   Es dentro, pero es otra toma —de la pared al pasillo—, así que va con su
 *   fundido. Ver `world/pasillo-de-pasaje.ts`.
 */
export type Plano =
  | "ventanilla"
  | "asomado-motor"
  | "asomado-abajo"
  | "asomado-paisaje"
  | "pasillo"
  | "fuera-rodando"
  | "fuera-despegue"
  | "fuera-giro"
  | "fuera-vuelta"
  | "fuera-ala"
  | "fuera-pista"
  | "fuera-paisaje"
  | "fuera-tren"
  | "fuera-senalero"
  | "fuera-raqueta";

/** Si el plano es del avión por fuera. */
export const esDeFuera = (p: Plano): boolean => p.startsWith("fuera-");

/**
 * **Si pasar de un plano a otro es un corte**, con su fundido y su silencio:
 * de dentro a fuera, de fuera a dentro, de un sitio de fuera a otro, y de la
 * ventanilla al pasillo o al revés, que es mirar a otra pared. Asomarse al
 * cristal no lo es: es la cabeza que se acerca.
 */
export const esCorte = (de: Plano, a: Plano): boolean =>
  esDeFuera(de) || esDeFuera(a) || (de !== a && (de === "pasillo" || a === "pasillo"));

/**
 * **El silencio de un corte**, s de escena. Pasar de la ventanilla a fuera, o
 * de fuera a la ventanilla, es un corte de cámara: el juego lo hace con un
 * fundido corto —ver `FUNDIDO_DE_PLANO` en `cameras/escena.ts`—, y la escena
 * calla mientras tanto, que **un corte no cae nunca a media frase**. Lo que
 * venía detrás espera este rato. Asomarse a la ventanilla no es un corte: es
 * la cabeza que se mueve, y no espera.
 */
export const CORTE_DE_PLANO = 1.1;

/**
 * **Lo que dura un plano como poco**, s de escena desde que se pone. Lo de
 * fuera se queda a que se vea lo que se cuenta —la carrera entera hasta
 * despegar, una vuelta alrededor del avión—, y vuelve a la ventanilla en el
 * primer silencio después. Si antes llega algo que se dice desde la
 * ventanilla, manda eso.
 */
export const DURA_EL_PLANO: Readonly<Record<Plano, number>> = {
  ventanilla: 0,
  "asomado-motor": 5,
  "asomado-abajo": 5,
  "fuera-rodando": 16,
  "fuera-despegue": 32,
  "fuera-giro": 16,
  "fuera-vuelta": 36,
  "fuera-ala": 16,
  "fuera-pista": 24,
  "asomado-paisaje": 6,
  // El sitio al fondo, el rato de mirarlo; y el tren, hasta que se traba.
  "fuera-paisaje": 14,
  "fuera-tren": 12,
  // Y el señalero, hasta parar el avión: lo devuelve a la ventanilla la despedida.
  "fuera-senalero": 45,
  // La vuelta en la punta: el giro entero y el avión que echa a andar de vuelta.
  "fuera-raqueta": 22,
  // El pasillo, lo que dura la frase de las salidas y el rato de mirar el letrero.
  pasillo: 6,
};

export type MomentoDelPasaje =
  | "ventanilla"
  | "banoAntes"
  | "cinturon"
  | "puertas"
  | "motores"
  | "bienvenida"
  | "demostracion"
  | "demoSalidas"
  | "demoEquipo"
  | "revision"
  | "espera"
  | "despegue"
  | "carrera"
  | "volando"
  | "nubes"
  | "nubesRespuesta"
  | "arriba"
  | "servicio"
  | "tcpNubes"
  | "bajada"
  | "oidos"
  | "kit"
  | "kitRecoger"
  | "techo"
  | "isla"
  | "aproximacion"
  | "tcpAterrizaje"
  | "flaps"
  | "aterrizando"
  | "toma"
  | "llegada"
  | "impacientes"
  | "seLevantan"
  | "luz"
  | "suelto"
  | "gracias"
  | "puesto"
  | "fin";

/** Lo que se cuenta cuando viene a cuento. Ver `CHARLAS_DEL_PASAJE`. */
export type CharlaDelPasaje =
  | "tren"
  | "plop"
  | "giro"
  | "marArriba"
  | "ala"
  | "altoRapido"
  | "tcpFrio"
  | "tcpMotor"
  | "bajando"
  | "tcpIslas"
  | "tcpRuta"
  | "tcpPapi"
  | "sobreLaIsla"
  | "marQuieto"
  | "nubesCerca"
  | "bano"
  | "tcpEstrellas"
  | "islaCerca"
  | "otraNube"
  | "marAbajo"
  | "giroFinal"
  | "despacio"
  | "ruedas"
  | "miro"
  | "cerquita"
  | "vueltaEnPista"
  | "porQueLaVuelta"
  | "tcpOficio"
  | "despacito"
  | "repaso"
  | "meneo"
  | "senalero"
  | "marDeNubes"
  | "sigueLaNube"
  | "menosGas"
  | "porQueMenosGas"
  | "masGas";

/**
 * **Lo que se nombra del paisaje**, y que por eso **solo se dice si se ve**
 * (18-10-2026). Enrique encontró cinco veces en un vuelo la escena nombrando
 * lo que por la ventanilla de Ara no se veía: Anaga y La Orotava debajo del
 * mar de nubes, «esa isla redondita es La Gomera» con la ventanilla llena de
 * nubes, «¡ya se ve la isla adonde vamos!» con el avión metido en una nube y
 * «se ven las montañas, la costa y el mar» con la isla en la ventanilla de al
 * lado. Es la regla de `lo-que-se-nombra.ts` —solo se nombra lo que se ve, y
 * lo nombrado se señala—, llevada aquí:
 *
 * - `hito:<clave>`: lo que señala la comandante por la ventanilla —el Teide,
 *   La Gomera—. Ver `Senalado`.
 * - `isla-de-llegada`: las montañas de La Palma; y `costa-de-llegada`, su
 *   costa, ya cerca.
 * - `tierra-abajo` y `mar-abajo`: el suelo o el mar de debajo, por la
 *   ventanilla o con la cara pegada al cristal; y `nubes-abajo`, el mar de
 *   nubes, que también se tiene que ver para decirlo.
 *
 * Si se ve lo dice el juego, que es quien tiene el mundo: ver `LecturaDelPasaje.ver`
 * y `world/se-ve-desde-el-pasaje.ts`.
 */
export type SitioDelPaisaje =
  | "isla-de-llegada"
  | "costa-de-llegada"
  | "tierra-abajo"
  | "mar-abajo"
  | "nubes-abajo"
  | `hito:${string}`;

/**
 * **Cómo se ve un sitio ahora**: desde dónde se puede enseñar —por la
 * ventanilla de Ara, con su cara pegada al cristal mirando hacia él o con el
 * avión por fuera y el sitio al fondo— y por qué lado del avión cae, con el
 * rumbo de ahora. `como` es `null` si no se ve de ninguna manera: dentro de
 * una nube, con la nube o el monte entre medias, demasiado lejos o fuera de
 * todo cristal y de toda toma.
 */
export interface VistaDelSitio {
  readonly como: ComoSeVe | null;
  readonly lado: "izquierda" | "derecha" | null;
}

/** Lo que la escena necesita saber del vuelo. Todo en SI. */
export interface LecturaDelPasaje {
  /** Lo que va haciendo la tripulación, y desde cuándo. Ver `vuelo-de-linea.ts`. */
  readonly tramo: TramoDeLinea;
  readonly enTramo: number;
  readonly motor: boolean;
  readonly enTierra: boolean;
  readonly porElSuelo: number;
  /** De las ruedas al suelo, m. */
  readonly altura: number;
  readonly altitud: number;
  readonly vertical: number;
  /** Si la torre ya dio el permiso para entrar en la pista. */
  readonly autorizado: boolean;
  /** Dónde están los flaps, 0 a 1. */
  readonly flaps: number;
  /** La capa de nubes de hoy, altitudes en m, o `null` sin capa. */
  readonly nubes: { readonly base: number; readonly techo: number } | null;
  /**
   * **Cuánto dentro de una nube va el avión**, 0 a 1: lo mismo que blanquea
   * la ventanilla. Ver `cuantoDentro` en `world/capa-de-nubes.ts`.
   */
  readonly enNube: number;
  /** Lo que sube o baja la cabina presurizada, m/s: lo que notan los oídos. */
  readonly cabina: number;
  /** Lo que falta por la ruta hasta tocar, m. */
  readonly faltaParaTocar: number;
  /** Si la tripulación ya está alineada en la pista, esperando para dar gas. */
  readonly alineado?: boolean;
  /**
   * **La fase del vuelo, la del juego**: la que decide si un anuncio de tierra
   * todavía vale o ya se le pasó el momento. Ver `seLePasoElMomento`.
   */
  readonly fase?: Fase;
  /** **El alabeo**, rad, positivo con el ala derecha abajo. Ver `bankAngleOf`. */
  readonly alabeo?: number;
  /** Dónde está el tren, 0 dentro y 1 fuera. */
  readonly tren?: number;
  /** Si debajo del avión hay mar. */
  readonly sobreElMar?: boolean;
  /** La temperatura de fuera, °C. Ver `temperaturaExterior`. */
  readonly temperatura?: number;
  /**
   * **Si un sitio del paisaje se ve ahora**, y cómo: lo pregunta la escena
   * antes de nombrarlo. Con `plano`, solo desde ese plano: lo que se mira
   * pegada al cristal hacia abajo se tiene que ver así. Sin esto —las pruebas
   * que no miran el paisaje—, todo se ve por la ventanilla y por su lado.
   * Ver `SitioDelPaisaje`.
   */
  readonly ver?: (sitio: SitioDelPaisaje, plano?: Plano) => VistaDelSitio;
  /**
   * **Cuánto se mueve el aire**, σ de la ráfaga vertical en m/s: lo que hace
   * que el avión se menee y el ala suba y baje. Ver `cuantoSeMueve` en
   * `turbulencia.ts`.
   */
  readonly meneo?: number;
  /** **La visibilidad del parte**, m: la de diez kilómetros o más es 10.000. */
  readonly visibilidad?: number;
  /** Si el señalero ya le hace señas al avión en el puesto de llegada. */
  readonly senalero?: boolean;
  /**
   * **Lo que falta para llegar arriba**, s de vuelo: hasta nivelar en la
   * altitud del plan, con la captura del automático. Lo cuenta el juego con
   * la ley de la tripulación —ver `segundosHastaElCrucero`—. Sin esto, Ara no
   * se duerme: sin saber cuándo llega lo siguiente, no se puede despertar a
   * Ara a tiempo. Ver `puedeDormirse`.
   */
  readonly hastaElCrucero?: number;
  /**
   * **Y lo que falta para empezar a bajar**, s de vuelo: hasta el punto de
   * descenso del plan, a la velocidad de ahora. Lo mismo: sin esto, no hay
   * siesta.
   */
  readonly hastaLaBajada?: number;
  /**
   * **La potencia de los motores**, la que se oye desde el asiento, y cuánto
   * lleva así, s: la pone la tripulación. Sin esto —las pruebas que no la
   * miran—, no se cuenta ningún cambio de gas: lo que no se sabe si sonó no se
   * cuenta. Ver `PotenciaDeLinea` en `vuelo-de-linea.ts`.
   */
  readonly potencia?: PotenciaDeLinea;
  readonly conEstaPotencia?: number;
  /**
   * **Dónde va el avión respecto a la pista de llegada**, en tierra: lo que se
   * aparta de su eje, m; lo que queda hasta su final en el sentido en que se
   * aterrizó, m; y cuánto se ha dado la vuelta respecto a ese sentido, rad, de
   * cero —hacia donde se aterrizó— a π —de vuelta por ella—. `null` en el
   * aire. Sin esto —las pruebas que no lo miran—, no se nota ninguna vuelta.
   * Ver `daLaVuelta`.
   */
  readonly enLaPista?: { readonly alEje: number; readonly hastaElFinal: number; readonly vuelta: number } | null;
  /**
   * **Si la luz del cinturón está encendida ahora**, la del cartel de la
   * cabina: la que manda para levantarse del asiento (punto 293). Sin esto
   * —las pruebas que no la miran—, lo que se ha dicho: apagada desde el «ya
   * estamos arriba» hasta el anuncio de la bajada. Ver `luzApagada`.
   */
  readonly cinturon?: boolean;
}

/**
 * **Lo que se acaba de señalar por la ventanilla**, ya montado por el juego:
 * la frase de la comandante con su lado, y su historia detrás si la tiene.
 * Ver `loQueSeDice` y `laHistoria` en `audio/ventanilla.ts`.
 */
export interface Senalado {
  /** La clave del sitio: `teide`, `garajonay`… */
  readonly que: string;
  readonly lado: "izquierda" | "derecha";
  readonly dicho: { readonly texto: string; readonly clave: string; readonly relleno: Readonly<Record<string, string>> };
  /**
   * **Y la misma frase dicha desde cada lado**, si el juego la monta: entre
   * que se ve y que se dice el avión puede girar, y la comandante dice el lado
   * de cuando lo dice. «Asómense a las ventanillas de la izquierda» con el
   * sitio a la derecha es mandar a mirar a la nada. Ver `ladoDe` en
   * `world/se-ve-desde-el-pasaje.ts`.
   */
  readonly porLado?: Readonly<Record<"izquierda" | "derecha", Senalado["dicho"]>>;
  readonly historia: {
    readonly texto: string;
    readonly clave: string;
    readonly relleno: Readonly<Record<string, string>>;
    /** La clave de su ilustración, si la tiene: sale en la ventanita mientras se cuenta. */
    readonly sitio?: string;
  } | null;
}

// ── Los números ──────────────────────────────────────────────────────────

const GRADO = Math.PI / 180;
/** Lo que se espera sentado antes de hablar, s: el rato de mirar alrededor. */
const AL_SENTARSE = 1.5;
/**
 * **Y el rato de embarcar**, s callados después de lo primero que dice Ara
 * —la ventanilla, y que ya fue al baño—, antes de que la tripulación dé la
 * bienvenida: lo que tarda en sentarse el resto del pasaje, con el hilo
 * musical sonando por el techo. Ver `audio/hilo-musical.ts`.
 */
const EMBARCANDO = 8;
/** Lo que mira Ara por la ventanilla antes de contar que ya fue al baño, s. */
const ANTES_DEL_BANO = 2;
/**
 * **Lo que pide ir al baño y volver**, s de crucero por delante: si para
 * empezar a bajar queda menos, la tripulante no se lleva a Ara —la bajada
 * enciende la luz—, y se espera a aterrizar. El viaje se ve con el avión por
 * fuera, mientras suena el anuncio del servicio. Ver `puedeIrAlBano`.
 */
const LO_QUE_PIDE_EL_BANO = 25;
/** Entre el cinturón y las puertas, s: se termina de embarcar. */
const HASTA_LAS_PUERTAS = 2.5;
/** Con los motores ya en marcha, s, antes de decir que se oyen. */
const MOTORES_EN_MARCHA = 3;
/** Parado en la doble raya, s, antes de preguntar por qué. */
const PARADO_EN_LA_ESPERA = 1.5;
/**
 * **Cuánto arriba, nivelado, antes de apagar el cartel**, s. Poco: en un salto
 * entre islas el crucero dura unos minutos, y el servicio va detrás.
 */
const ARRIBA_Y_NIVELADO = 2;
/** Y del cartel al servicio, s. */
const HASTA_EL_SERVICIO = 3;
/** Y del anuncio del servicio a que la tripulante llega al asiento de Ara, s. */
const HASTA_EL_ASIENTO = 5;
/** Y de la toma a decir que se tocó, s: las ruedas, y la reversa ya rugiendo. */
const DESPUES_DE_TOCAR = 1.2;
/**
 * **A cuánto del umbral se prepara la cabina para aterrizar**, m: por encima
 * de la final, como en `EN_APROXIMACION` de la megafonía.
 */
const PREPARAR_LA_CABINA = 28000;
/**
 * **Cuánto dentro de una nube para decir que se está dentro**: un tercio,
 * que es cuando la ventanilla ya se ve blanca. Ver `cuantoDentro`.
 */
const DENTRO_DE_LA_NUBE = 0.35;
/** Y cuánto por encima de la capa para decir que ya quedó abajo, m. */
const POR_ENCIMA = 60;
/** **Desde dónde se ve la isla de llegada**, m por la ruta: unos cuarenta y cinco kilómetros. */
const VE_LA_ISLA = 45000;
/**
 * **Lo que baja la cabina para que se noten los oídos**, m/s: unos ciento
 * veinte pies por minuto, la mitad de lo que baja como mucho. Ver
 * `BAJA_LA_CABINA` en `cabina-presurizada.ts`.
 */
const SE_NOTAN_LOS_OIDOS = -0.6;
/** Y lo que sube, para el «plop» de la subida. */
const SUBE_LA_CABINA = 0.6;
/** **Lo que se inclina el avión para que se note el giro**, rad. */
const SE_NOTA_EL_GIRO = 12 * GRADO;
/**
 * **Lo que puede tardar Ara en decir que los motores suenan distinto**, s de
 * escena desde que cambian. Si en ese rato no hay un silencio —habla otro, o
 * pasa otra cosa—, se le pasó el momento y no se dice: un «¡ahora suenan más
 * bajito!» medio minuto largo después ya no es lo que se oye. Ver
 * `PotenciaDeLinea`.
 */
const SE_OYE_EL_CAMBIO = 40;
/** Si la potencia de los motores acaba de cambiar a esa, y todavía se nota. */
const acabaDePonerse = (l: LecturaDelPasaje, p: PotenciaDeLinea): boolean =>
  l.potencia === p && (l.conEstaPotencia ?? Infinity) < SE_OYE_EL_CAMBIO;
/** «Más de quinientos kilómetros por hora», m/s, con margen. */
const QUINIENTOS_POR_HORA = 505 / 3.6;
/** «Bajo cero, como en el congelador», °C fuera, con margen. */
const FRIO_DE_CONGELADOR = -8;
/**
 * **Lo que se mueve el aire para que se note el meneo**, σ de la ráfaga
 * vertical en m/s: media turbulencia ligera. Dentro del mar de nubes es de
 * ocho décimas —ver `EN_LA_NUBE` en `turbulencia.ts`—, y se nota: el avión se
 * menea y el ala sube y baja. Ver el punto 280 en `CHARLAS_DEL_PASAJE`.
 */
const SE_NOTA_EL_MENEO = 0.4;
/**
 * **Lo que dice de números la tripulante bajo las nubes**: «unos cinco mil
 * pies, unos mil quinientos metros», y «más de diez kilómetros». Una frase
 * grabada no puede decir otro número, así que solo se dice cuando es verdad:
 * la base de la capa en esos cinco mil pies con medio millar de margen, el
 * avión justo por debajo —eso es lo que le falta hasta el mar— y la
 * visibilidad del parte en diez kilómetros o más. Con otro tiempo se cuenta
 * lo mismo sin los números. Un número que no puede sonar a su altura no se
 * dice (AGENTS.md).
 */
const TECHO_DE_HOY = { desde: 4500 * 0.3048, hasta: 5500 * 0.3048, justoDebajo: 200 } as const;
const MAS_DE_DIEZ_KILOMETROS = 10000;
/**
 * **Lo que espera algo señalado a que se vea**, s de escena: el avión puede
 * meterse en una nube o girar entre que el juego lo ve y que la escena lo
 * puede decir. Pasado esto sin verse, se deja: nunca «esa isla» con la
 * ventanilla en blanco.
 */
const ESPERA_A_QUE_SE_VEA = 45;
/**
 * **Los tramos de la bajada**, m que faltan para tocar: desde dónde se cuenta
 * cada cosa. Una bajada entre islas son quince minutos, y sin repartirlos lo
 * explicado se decía todo seguido al empezar a bajar y el resto callaba: dos
 * minutos sin nada, tres veces. Repartidos con la bajada medida en el banco
 * —de 131 km a 13 km en 904 s—, cada cosa cae a un minuto de la anterior.
 */
const BAJANDO = {
  /**
   * **El kit de viaje**, en la parte alta de la bajada y sobre el mar: pasado
   * lo que solo vale arriba —el frío de fuera y el porqué del ralentí, que la
   * comandante cuenta por encima de los diez mil pies—. Desde los 104 km, en
   * el primer silencio: medido en el banco el 19-10-2026, llega a los 13.300
   * pies, detrás del ala que explica la comandante, y la tripulante lo pide de
   * vuelta tres minutos después (175 s), cruzando los diez mil; de esos, veinte
   * segundos son la megafonía de La Gomera, que lo pausa. Dos minutos y medio
   * largos de juego: la luz verde entera, minuto y medio, y su trozo de
   * canción al final, con rato de sobra. Ver `luz-verde.ts`.
   *
   * Estaba en los 84 km, pasado lo que se señala por la ventanilla, y allí,
   * con la tripulación pidiéndolo de vuelta a los diez mil pies, no quedaba ni
   * minuto y medio: la bajada se nivela a 10.430 pies para frenar a 250 nudos y
   * cruza los diez mil hacia los 75 km. Las islas y la ruta, que la tripulante
   * cuenta en persona, esperan a que se deje el juego: caducan al preparar la
   * cabina, a 28 km, y por debajo de los diez mil hay seis minutos de bajada.
   */
  kit: 104000,
  motor: 112000,
  islas: 99000,
  marQuieto: 86500,
  ruta: 78500,
  papi: 66000,
  bano: 60000,
  estrellas: 54000,
  /**
   * **Lo que sabe hacer la tripulación** (punto 303), detrás de las estrellas:
   * es el hueco callado más largo de la bajada que todavía tiene a la
   * tripulante por el pasillo —medido en las pruebas, cincuenta y cinco
   * segundos—, antes de las nubes y de preparar la cabina.
   */
  oficio: 50000,
} as const;
/** Lo que se calla la escena antes de que llegue la tripulante con el kit, s. */
const CALLA_ANTES_DEL_KIT = 10;
/**
 * **Lo que tiene que sobrar por encima de los diez mil pies para traer el
 * kit**, m: mil seiscientos pies, que con el tramo nivelado de los 10.430 son
 * dos minutos largos de bajada. Por menos, la tripulante no lo trae para
 * pedirlo de vuelta enseguida. Ver el momento `kitRecoger`.
 */
const KIT_POR_ENCIMA = 500;
/** Y la red del kit que se queda abierto bajando, m por debajo de los diez mil pies. */
const KIT_POR_DEBAJO = 300;
/**
 * **La siesta de Ara** (punto 304): los números. Ver `puedeDormirse`.
 *
 * - `CALLA_PARA_DORMIRSE`, s de silencio con nada a punto de contarse. Poco:
 *   Ara cierra los ojos en cuanto la comandante acaba lo de los diez mil pies,
 *   que el rato de dormir es lo que queda de subida y no da para esperar. Lo
 *   justo para que lo que se ve por la ventanilla —el Teide— se señale antes.
 * - `SIESTA_MINIMA`, s de vuelo durmiendo, como poco. Con un minuto y medio
 *   Enrique se despertó viendo lo mismo que al dormirse —«no movieste el vuelo
 *   nada»—: un salto que no se nota es peor que no dormirse. Por menos, Ara no
 *   se duerme, y para lo que queda está el modo rápido.
 * - `DESPIERTA_ANTES_DE_BAJAR`, s antes de empezar a bajar: si no hubo *ding*
 *   que despertara a Ara antes, la despierta la tripulante, que habla primero.
 * - `LO_QUE_DURA_EL_BOSTEZO`, s: lo que dice Ara antes de cerrar los ojos.
 * - `ESPERA_A_LO_QUE_SE_VE`, s de silencio: lo que se espera, antes de cerrar
 *   los ojos, a que la comandante señale lo que se tiene a la vista. Si no lo
 *   señala en ese rato, Ara se duerme igual.
 */
const CALLA_PARA_DORMIRSE = 5;
const SIESTA_MINIMA = 120;
const DESPIERTA_ANTES_DE_BAJAR = 22;
const LO_QUE_DURA_EL_BOSTEZO = 8;
const ESPERA_A_LO_QUE_SE_VE = 25;
/**
 * **Lo que puede esperar a que Ara se despierte**: lo que se cuenta porque
 * viene a cuento y sigue viniendo después —cómo se sostiene el avión, a qué
 * altura se va, el mar de nubes—. Lo que no puede esperar es la respuesta a lo
 * que Ara notó o preguntó —el gas de subida, las nubes—, que va antes de
 * dormirse: una explicación siete minutos después de la pregunta ya no
 * contesta nada. Ver `puedeDormirse`.
 */
const PUEDEN_ESPERAR: ReadonlySet<CharlaDelPasaje> = new Set(["ala", "altoRapido", "marArriba", "marDeNubes", "sobreLaIsla"]);
/**
 * **Y lo que esperó, al despertar, con menos silencio delante**, s: arriba el
 * rato es justo —la bajada empieza al minuto, y lo de la altura deja de ser
 * verdad por debajo del Teide—. Detrás de la explicación del ralentí, que
 * contesta a lo que Ara acaba de notar —doce—, y la altura primero, que es la
 * que se acaba antes; el frío de fuera —catorce— detrás, que también se acaba
 * bajando; y el ala la última, que vale hasta los diez mil pies.
 */
const TRAS_AL_DESPERTAR: Partial<Record<CharlaDelPasaje, number>> = { altoRapido: 13, ala: 16 };
/** Lo que se tiene que haber señalado, si se ve, antes de cerrar los ojos: lo más bonito de la ruta. */
const SE_ENSENA_ANTES_DE_DORMIRSE = ["teide"] as const;

/**
 * **El modo rápido** (⏩): los números. Ver `adelanto`.
 *
 * - `CORRE_SI_FALTAN`, s de vuelo hasta lo siguiente que hay que contar o
 *   ver: por menos no echa a correr, que no hay rato que ahorrar y un
 *   acelerón de un segundo es un tirón, no un viaje rápido.
 * - `PARA_ANTES`, s de vuelo: se para solo cuando lo siguiente está a esto,
 *   para llegar a ello a la velocidad de siempre y verlo venir.
 * - `CALLA_PARA_ADELANTAR`, s de silencio antes de volver a correr: lo que se
 *   acaba de decir se deja asentar.
 * - `MIRA_HASTA`, s de vuelo: lo más lejos que se mira lo que viene. Más allá,
 *   todo es «un rato largo».
 * - `MIRA_CADA`, s de escena: cada cuánto se vuelve a mirar.
 * - `RATOS`, cuántos ratos corriendo se guardan para el banco y las pruebas.
 */
export const ADELANTO = {
  CORRE_SI_FALTAN: 12,
  PARA_ANTES: 6,
  CALLA_PARA_ADELANTAR: 3,
  MIRA_HASTA: 180,
  MIRA_CADA: 0.5,
  RATOS: 200,
} as const;
/**
 * **Dónde empieza la llegada**, m de altitud bajando: los diez mil pies, que
 * es donde empieza la música de llegada —ver `BAJANDO_A_LA_PISTA` en
 * `audio/hilo-musical.ts`—, la bajada se hace aproximación y, poco después,
 * se prepara la cabina. Desde ahí el modo rápido se apaga solo y no vuelve
 * en ese vuelo (Enrique: «hay que vivir la bajada y la aproximación, ese
 * momento es mágico, cuando está llegando a tierra»).
 */
export const EMPIEZA_LA_LLEGADA = DIEZ_MIL_PIES;
/** Si el vuelo ya va en la llegada: bajando por debajo de los diez mil pies, o ya preparando la cabina. */
const enLaLlegada = (l: LecturaDelPasaje, e: VueloDePasaje): boolean =>
  (bajando(l.tramo) && l.altitud < EMPIEZA_LA_LLEGADA) || (bajando(l.tramo) && cabinaPreparada(l, e));
/** Los ratos por delante en los que se mira qué viene, s de vuelo. */
const PASOS_DE_MIRAR = [2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 105, 120, 150, 180] as const;
/**
 * **Lo que baja la cabina en la bajada, de cuenta**, m/s: el tope del control,
 * trescientos cincuenta pies por minuto, que es lo que hace en cuanto el
 * avión empieza a bajar. Ver `BAJA_LA_CABINA` en `cabina-presurizada.ts`.
 */
const LA_CABINA_BAJANDO = -1.78;
/** Lo que enfría el aire al subir, °C por metro: la atmósfera tipo. */
const ENFRIA_AL_SUBIR = 0.0065;
/**
 * **La vuelta en la pista** (punto 300): cuándo se está dando. Ver `daLaVuelta`.
 *
 * - `EN_LA_PUNTA`, m hasta el final de la pista: el ensanche de viraje de La
 *   Palma empieza a unos ciento cincuenta metros del final, y se le da margen.
 * - `EMPIEZA_A_GIRAR`, rad: lo que se ha girado para decir que se gira.
 * - `CERCA_DEL_EJE`, m: el ensanche llega a unos treinta del eje; la calle C,
 *   que sale torciendo hacia la terminal a mitad de pista, se aparta más
 *   antes de girar tanto, y además no está en la punta.
 * - `DE_VUELTA`, rad, y `EN_EL_EJE`, m: ya mirando hacia atrás y por el eje,
 *   que es remontar la pista esté donde esté la vuelta.
 * - `PISTA_LIBRE`, m del eje: la pista dejada libre, lo mismo que en
 *   `flight/vuelo.ts`.
 */
const EN_LA_PUNTA = 350;
const EMPIEZA_A_GIRAR = 35 * GRADO;
const CERCA_DEL_EJE = 45;
const DE_VUELTA = 150 * GRADO;
const EN_EL_EJE = 25;
const PISTA_LIBRE = 75;
/**
 * **Si el avión está dando la vuelta en la pista**: girando en la punta, o ya
 * de vuelta por ella. Lo que lo dice es el avión, no el plan: si frena a
 * tiempo para la salida, no da ninguna vuelta y no se cuenta nada.
 */
export function daLaVuelta(l: LecturaDelPasaje): boolean {
  const p = l.enLaPista;
  if (!p || !l.enTierra) return false;
  const enLaPunta = p.hastaElFinal < EN_LA_PUNTA && p.vuelta > EMPIEZA_A_GIRAR && p.alEje < CERCA_DEL_EJE;
  return enLaPunta || (p.vuelta > DE_VUELTA && p.alEje < EN_EL_EJE);
}
/** Si el avión ya ha dejado la pista: por la fase del juego, o por lo lejos que va del eje. */
const fueraDeLaPista = (l: LecturaDelPasaje): boolean =>
  l.fase === "a-plataforma" || l.fase === "en-puesto" || l.fase === "apagado" || (l.enLaPista?.alEje ?? 0) > PISTA_LIBRE;
/**
 * **Los que se levantan antes de tiempo** (punto 303): los números.
 *
 * - `PARADO_DEL_TODO`, s parado en el puesto: el señalero acaba de cruzar los
 *   bastones, y el plano suyo se queda a verlo antes de volver a la cabina.
 * - `SE_OYEN_LAS_HEBILLAS`, s de los primeros clics hasta que Ara los nota:
 *   primero se oye, y después se dice.
 * - `APAGA_LA_LUZ`, s con los motores parados antes de que la comandante
 *   apague la luz del cinturón: lo que tardan en pararse del todo. Es la
 *   regla de todos los vuelos con pasaje, y vive en `cinturon.ts`.
 * - `TRAS_EL_DING`, s del *ding* a que Ara se suelta: primero suena, y Ara
 *   reacciona a lo que oye.
 */
const PARADO_DEL_TODO = 1.5;
const SE_OYEN_LAS_HEBILLAS = 2.5;
const TRAS_EL_DING = 1.4;
/** Lo que se queda el dibujo de la ventanita después de la última frase, s. */
const SE_QUEDA_LA_VENTANITA = 2.5;
/**
 * **Y lo que se queda hasta la frase siguiente**, no solo ese poco: la cabina
 * vacía del embarque, que acompaña al rato callado en que sube el resto del
 * pasaje con el hilo musical. Ver `EMBARCANDO`.
 */
const HASTA_LA_SIGUIENTE: ReadonlySet<string> = new Set(["ilustracion:pasaje-embarque"]);

/**
 * **Y la red de la espera**, s de reloj de pared: si «sentados para el
 * despegue» no se ha oído en este rato —una boca que se quedó colgada—, se
 * entra igual. Lo primero es no dejar a nadie parado en la doble raya para
 * siempre. De pared y no de vuelo, porque lo que se espera es una voz: medida
 * con el reloj del vuelo, con el del juego acelerado doce veces se cumplía a
 * los seis segundos, y la tripulación entraba en la pista antes de que sonara
 * el anuncio. Medido en el banco con las tomas grabadas.
 *
 * **Y cuenta desde que se pide**, no desde que se llega a la doble raya: con
 * la demostración de seguridad, la tripulación puede llegar a la espera con
 * la cabina todavía enseñando las máscaras, y entonces espera —como en un
 * avión de verdad, que no entra en pista sin la cabina lista—.
 */
export const RED_DE_LA_ESPERA = 75;

/**
 * **Y la de un anuncio que espera su fase**, s de pared: si la fase del juego
 * no llega a la de un anuncio en este rato, se pide igual —y la boca lo
 * tirará—. La escena no se queda parada esperando una fase que no viene.
 */
export const RED_DEL_ANUNCIO = 15;

/**
 * **Y la de la cabecera**, s de pared: alineados, lo que espera la tripulación
 * a que Ara acabe lo que está diciendo antes de dar gas, como mucho. Ver
 * `PermisosDeLaEscena.despegar`.
 */
export const RED_DE_LA_CABECERA = 20;

// ── El guion ─────────────────────────────────────────────────────────────

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
/** La comandante, por la megafonía, con una frase nueva de esta escena. */
const comandante = (clave: string): Linea => ({
  quien: "mama",
  clave: `inicio.mama.pasaje.${clave}`,
  megafonia: true,
});
/** La tripulación de cabina, por la megafonía: a todo el pasaje. */
const tripulacion = (clave: string): Linea => ({
  quien: "tripulacion",
  clave: `inicio.tripulacion.pasaje.${clave}`,
  megafonia: true,
});
/**
 * **Y la tripulante, en persona**: se acerca al asiento y le habla a Ara, sin
 * altavoz. Su habla, la de su base —de Canarias, con el tú—, y la misma voz
 * que por la megafonía, que es la misma persona.
 */
const tripulante = (clave: string): Linea => ({
  quien: "tripulacion",
  clave: `inicio.tripulacion.pasaje.cerca.${clave}`,
});
/** La frase de la tripulante con la que llega el kit, y la de guardarlo para aterrizar. */
const KIT_DADO = "kitAqui";
const KIT_GUARDADO = "kitGuardar";
/** Si una frase es de un juego del kit, que se calla con él. */
const esDelKit = (l: Linea): boolean => l.clave.startsWith("inicio.ara.pasaje.kit.");
/** Una frase con el dibujo de la ventanita. */
const con = (l: Linea, dibujo: DibujoDelPasaje): Linea => ({ ...l, dibujo });
/**
 * **Una frase con su ilustración en la ventanita**: lo que está pasando en
 * ese instante, dibujado como un cuento —ver `ui/ilustraciones.ts`—. Va donde
 * no hay nada que explicar con un dibujo, y solo cuando lo que se ve en ella es
 * lo que pasa: las de la cabina de pasaje y la de la comandante tienen el
 * cielo y las nubes por la ventanilla, así que en tierra no salen.
 */
const ilustrada = (l: Linea, i: IlustracionDelPasaje): Linea => ({ ...l, dibujo: `ilustracion:${i}` });
/** La tripulante en persona, al lado de Ara: la ilustración de las dos, ya en el aire. */
const conLaTripulante = (l: Linea): Linea => ilustrada(l, "pasaje-tripulante");
/** La comandante por la megafonía, en su cabina por encima de las nubes. */
const desdeLaCabina = (l: Linea): Linea => ilustrada(l, "pasaje-comandante");
/**
 * **La siesta**: lo que dice Ara al cerrar los ojos y al abrirlos —con el
 * mapa de la ruta en la ventanita, el que se vio mientras dormía—, y la
 * tripulante que despierta a Ara para bajar, por lo que es: el cinturón y la
 * bajada. Ver `puedeDormirse`.
 */
const SE_DUERME = ara("dormirse");
const SE_DESPIERTA = con(ara("despertarse"), "ruta");
const LA_DESPIERTAN = conLaTripulante(tripulante("despertar"));
/**
 * **Si el cartel del cinturón está apagado**, por lo que se ha dicho: lo apaga
 * la comandante al llegar arriba —«pueden soltarse el cinturón»— y se enciende
 * al empezar a bajar. Ara de rodillas en el asiento, con la cara contra el
 * cristal, solo sale entonces: con el cartel encendido el cinturón va puesto
 * y bien abrochado, y un dibujo no enseña lo contrario.
 */
const cartelApagado = (e: VueloDePasaje): boolean => e.dicho("arriba") && !e.dicho("bajada");
/**
 * **Si la luz del cinturón está apagada ahora**: la del cartel, si el juego la
 * da; si no, la de lo que se ha dicho. Es la que manda para levantarse.
 */
const luzApagada = (l: LecturaDelPasaje, e: VueloDePasaje): boolean =>
  l.cinturon === undefined ? cartelApagado(e) : !l.cinturon;
/** Ara contra el cristal, con su ilustración si el cartel está apagado; si no, como venía. */
const contraElCristal = (l: Linea, e: VueloDePasaje): Linea =>
  cartelApagado(e) ? ilustrada(l, "pasaje-ara-ventanilla") : l;
/**
 * **Las nubes de cerca, con la tripulante al lado**: el saludo con su
 * ilustración, lo que se explica con el dibujo de la nube y, al final, lo que
 * dice Ara.
 */
/** **El plop de los oídos, explicado** por la tripulante: ver el momento `tcpNubes`. */
const EL_PLOP_EXPLICADO: readonly Linea[] = [conLaTripulante(tripulante("plop1")), conLaTripulante(tripulante("plop2"))];
/**
 * **Lo que sabe hacer la tripulante** (punto 303), con su dibujo: los
 * primeros auxilios y el desfibrilador, el fuego con la capucha del humo,
 * evacuar el avión en noventa segundos y los chalecos en el agua. Es lo que
 * lleva el certificado de tripulante de cabina europeo y lo que se repasa
 * cada año; ver `docs/historias/fuentes.md`. Contado como lo que sabe hacer,
 * no como algo que vaya a pasar. Y Ara saca la lección de los galones: el
 * uniforme es para cuidar.
 */
const EL_OFICIO: readonly Linea[] = [
  con(tripulante("oficio1"), "tripulacion"),
  con(tripulante("oficio2"), "tripulacion"),
  con(ara("uniforme"), "tripulacion"),
];
/**
 * **Y la vuelta en la pista, explicada**, por la comandante y para todos: por
 * qué se dio, el ensanche de la punta, y el permiso de la torre para ir por la
 * pista al revés. Con el dibujo de la pista desde arriba.
 */
const LA_VUELTA_EXPLICADA: readonly Linea[] = [
  con(comandante("vueltaEnPista"), "vuelta-en-pista"),
  con(comandante("permisoDeVuelta"), "vuelta-en-pista"),
];
const lasNubesDeCerca = (ultima: Linea): Linea[] => [
  conLaTripulante(tripulante("hola")),
  conLaTripulante(ara("deVerdad")),
  con(tripulante("nubes1"), "nube"),
  con(tripulante("nubes2"), "nube"),
  con(tripulante("nubes3"), "nube"),
  ultima,
];
/**
 * **Un anuncio de la megafonía de siempre**: lo monta el juego con el campo,
 * el plan y el tiempo de hoy. Ver `ANUNCIOS` en `audio/megafonia.ts`.
 */
const anuncio = (clave: string): Linea => ({
  quien: clave.startsWith("tripulacion.") ? "tripulacion" : "mama",
  clave,
  megafonia: true,
});

/**
 * **El baño** (punto 293): lo que dice la tripulante cuando Ara lo pregunta
 * con la luz encendida, y el viaje cuando se apaga —ella viene a por Ara, da
 * el anuncio del servicio desde la cocina de atrás mientras Ara está dentro,
 * y Ara vuelve abrochándose—. Ver `puedeIrAlBano`.
 */
const BANO_CON_LA_LUZ = con(tripulante("banoLuz"), "cinturon");
const AL_BANO: readonly Linea[] = [
  conLaTripulante(tripulante("banoAhora")),
  anuncio("tripulacion.servicio"),
  conLaTripulante(ara("banoVuelta")),
];
/** Y bajando, con la luz otra vez encendida, la tripulante que lo recuerda: fue justo a tiempo. */
const FUE_A_TIEMPO = conLaTripulante(tripulante("banoATiempo"));

/** Si una clave es de un anuncio de la megafonía de siempre. */
export function esAnuncioDeSiempre(clave: string): boolean {
  return clave.startsWith("comandante.") || clave.startsWith("tripulacion.");
}

/** Si una frase es de la tripulante en persona, sin altavoz. */
export function esDeCerca(l: Linea): boolean {
  return l.quien === "tripulacion" && !l.megafonia;
}

interface DefMomento<Id extends string = MomentoDelPasaje> {
  readonly id: Id;
  /** Cuándo toca: lo que pasa en el avión, y lo que ya se dijo. */
  readonly cuando: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean;
  /** Y cuándo ya no viene a cuento: se salta sin decirlo. */
  readonly caduca?: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean;
  readonly lineas: readonly Linea[];
  /** Y si lo que se dice depende de lo que pasa: las nubes, por dentro o desde arriba. */
  readonly segun?: (l: LecturaDelPasaje, e: VueloDePasaje) => readonly Linea[];
  /** Qué se dibuja para mirar mientras se dice. */
  readonly mira?: QueMirar;
  /** **Desde dónde se ve mientras se dice.** Sin decir, la ventanilla. */
  readonly plano?: Plano;
  /**
   * **Y si depende de lo que se está viendo**: la comandante que explica algo
   * con el señalero ya guiando el avión no lo quita de la pantalla.
   */
  readonly planoSegun?: (l: LecturaDelPasaje, e: VueloDePasaje) => Plano;
  /**
   * **Lo que nombra del paisaje**: solo se dice si se ve, y desde donde se
   * vea —la ventanilla, la cara contra el cristal o el avión por fuera con el
   * sitio al fondo—; si no se ve, espera, y si se le pasa el momento, se salta.
   * Con un `plano` propio, se tiene que ver desde ese. Ver `SitioDelPaisaje`.
   */
  readonly nombra?: SitioDelPaisaje;
  /**
   * **Lo que enseña si se ve**, sin esperarlo: lo que se dice vale igual sin
   * verlo —«más alto que la cumbre del Teide» es verdad con el Teide tapado—,
   * pero si se ve, se enseña.
   */
  readonly muestra?: SitioDelPaisaje;
  /**
   * **Si sigue el anuncio de otro momento**: la demostración va en tres trozos
   * para cambiar de plano entre ellos —ver `DEMOSTRACION`—, y es un solo
   * anuncio: lo que sigue no vuelve a saludar al pasaje.
   */
  readonly sigue?: MomentoDelPasaje;
}

/**
 * **Una charla**: lo que se cuenta si viene a cuento. No va en el guion fijo,
 * así que no espera a nada ni nada la espera: se dice en un silencio de
 * `tras` segundos como poco, si en ese momento vale, y si su rato pasa sin
 * decirse, no pasa nada.
 */
interface DefCharla extends DefMomento<CharlaDelPasaje> {
  /** Cuánto silencio antes, s: lo que suena a sucedido va enseguida; lo explicado, con aire. */
  readonly tras: number;
}

const enElSuelo = (t: TramoDeLinea): boolean =>
  t === "puerta" ||
  t === "arrancando" ||
  t === "rodando" ||
  t === "esperando" ||
  t === "entrando" ||
  t === "carrera";
const bajando = (t: TramoDeLinea): boolean =>
  t === "bajada" || t === "final" || t === "recogida" || t === "frenando" || t === "al-puesto" || t === "aparcado" || t === "apagado";
const volando = (l: LecturaDelPasaje): boolean =>
  !l.enTierra && (l.tramo === "subida" || l.tramo === "crucero" || l.tramo === "bajada");
const enLaFinal = (l: LecturaDelPasaje): boolean => l.tramo === "final" || l.tramo === "recogida";
/** Si ya no se puede ir por el pasillo: la cabina preparada para aterrizar. */
const cabinaPreparada = (l: LecturaDelPasaje, e: VueloDePasaje): boolean =>
  l.enTierra || enLaFinal(l) || l.faltaParaTocar < PREPARAR_LA_CABINA || e.dicho("aproximacion");
/** Si la tripulante ya anda por el pasillo: desde que trae el servicio. */
const tripulanteEnElPasillo = (e: VueloDePasaje): boolean => e.dicho("tcpNubes") || e.saltado("tcpNubes");

/**
 * **La demostración de seguridad**, por la megafonía y con su dibujo cada
 * cosa. Lo que se enseña y en qué orden es lo de la norma europea —el AMC1
 * CAT.OP.MPA.170 de EASA, información a los pasajeros antes del despegue—:
 * cómo se abrocha, se ajusta y se suelta el cinturón; dónde están las
 * salidas y las luces del suelo que llevan a ellas; las máscaras de oxígeno,
 * primero la de uno y después ayudar a los demás; el chaleco salvavidas,
 * que se infla al salir y no dentro; la tarjeta de seguridad, y los aparatos
 * electrónicos. Para un vuelo entre islas: el chaleco va porque se despega y
 * se aterriza sobre el mar. Corta y con cariño, y con Ara mirando: es la
 * primera vez que lo ve.
 *
 * **Y cuándo se usa cada cosa** (punto 313): las máscaras, si la cabina
 * perdiera presión; el chaleco, si el avión tuviera que posarse en el agua.
 * Sin eso, un niño puede salir creyendo que en un avión se llevan puestas.
 *
 * **Las salidas son las de este avión** (punto 312): cuatro puertas, dos
 * delante y dos detrás, que es lo que lleva un avión de la clase del ERJ 170
 * —ninguna sobre el ala—, y la más cercana puede estar detrás. Va en su
 * propio trozo, con Ara asomada al pasillo mirando la de delante, que es la
 * suya: el corte de plano necesita su silencio, y el anuncio es el mismo.
 * Ver `docs/historias/fuentes.md`.
 */
const DEMOSTRACION: readonly Linea[] = [tripulacion("demo.intro"), con(tripulacion("demo.cinturon"), "cinturon")];
const DEMO_SALIDAS: readonly Linea[] = [con(tripulacion("demo.salidas"), "salidas")];
const DEMO_EQUIPO: readonly Linea[] = [
  con(tripulacion("demo.mascaras"), "mascara"),
  con(ara("demoMascara"), "mascara"),
  con(tripulacion("demo.chaleco"), "chaleco"),
  con(ara("demoChaleco"), "chaleco"),
  con(tripulacion("demo.tarjeta"), "tarjeta"),
  con(ara("demoTarjeta"), "tarjeta"),
  con(tripulacion("demo.aparatos"), "modo-avion"),
];
/** Lo que se queda Ara mirando el letrero de la salida, s callados, antes de seguir la demostración. */
const MIRA_LA_SALIDA = 2;
/** Si se está rodando hacia la pista o esperando en la doble raya: cuando va la demostración. */
const rodandoALaPista = (l: LecturaDelPasaje): boolean => l.tramo === "rodando" || l.tramo === "esperando";
/** Y cuándo ya no viene a cuento: en el aire, o entrando en la pista. */
const yaEnLaPista = (l: LecturaDelPasaje): boolean => !enElSuelo(l.tramo) || l.tramo === "entrando" || l.tramo === "carrera";

/**
 * **El guion entero**, en el orden en que pasa un vuelo. Cada momento espera
 * a que no hable nadie y a que el avión esté donde toca; el que se pasa de su
 * momento se salta.
 */
export const GUION_DEL_PASAJE: readonly DefMomento[] = [
  {
    /*
     * **Lo primero, pegarse al cristal**: desde su asiento, sentada, Ara ve la
     * ventanilla; para ver el motor, que cuelga debajo del ala y por delante,
     * se acerca al cristal y mira hacia abajo. Lo que se dice se ve. Ver
     * `asientoDeAra`.
     */
    id: "ventanilla",
    cuando: (_l, e) => e.segundos >= AL_SENTARSE,
    // Y la cabina todavía vacía: las familias con criaturas embarcan las primeras.
    lineas: [ilustrada(ara("ventanilla"), "pasaje-embarque")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    /*
     * **Al baño, antes de subir** (punto 293): Ara cuenta que ya fue, porque
     * en los vuelos cortos casi no da tiempo. Lo dice su mamá, que de vuelos
     * cortos sabe. Con la cabina del embarque todavía en la ventanita.
     */
    id: "banoAntes",
    cuando: (_l, e) => e.callaDesde >= ANTES_DEL_BANO,
    lineas: [ilustrada(ara("banoAntes"), "pasaje-embarque")],
  },
  {
    /*
     * Después del rato de embarcar, con la música: la bienvenida, con todo el
     * pasaje ya en su asiento, y el cinturón de Ara, con su hebilla.
     */
    id: "cinturon",
    cuando: (_l, e) => e.callaDesde >= EMBARCANDO,
    lineas: [ilustrada(tripulacion("cinturon"), "pasaje-lleno"), con(ara("cinturon"), "cinturon")],
    mira: "cinturon",
  },
  {
    id: "puertas",
    cuando: (_l, e) => e.callaDesde >= HASTA_LAS_PUERTAS,
    lineas: [anuncio("comandante.crosscheck"), ara("puertas")],
  },
  {
    id: "motores",
    cuando: (l) => l.motor && l.tramo === "arrancando" && l.enTramo >= MOTORES_EN_MARCHA,
    lineas: [ara("motores")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    /*
     * El rodaje, visto por fuera, mientras la comandante da la bienvenida.
     *
     * **Y por qué se sale hacia el este**, en el mismo anuncio: con el alisio
     * del nordeste de la escena —ver `vientoDominante` de Los Rodeos— la 12 lo
     * tiene por delante y la 30 por detrás, así que se despega hacia el este
     * y después se da la vuelta hacia La Palma, que queda al oeste. Lo cuenta
     * quien lo decide, rodando y por la megafonía, que es cuando lo cuentan
     * las comandantes; volando ya no podría hasta los diez mil pies, y para
     * entonces el giro ya pasó.
     */
    id: "bienvenida",
    cuando: (l) => l.tramo === "rodando" && l.porElSuelo > 2,
    caduca: (l) => !enElSuelo(l.tramo),
    lineas: [anuncio("comandante.bienvenida"), comandante("viento"), ara("comandante")],
    plano: "fuera-rodando",
  },
  {
    id: "demostracion",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 1,
    caduca: yaEnLaPista,
    lineas: DEMOSTRACION,
  },
  {
    // Las salidas, con Ara asomada al pasillo mirando la suya. Ver `DEMOSTRACION`.
    id: "demoSalidas",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 0.3,
    caduca: yaEnLaPista,
    lineas: DEMO_SALIDAS,
    plano: "pasillo",
    sigue: "demostracion",
  },
  {
    // Y el resto, otra vez desde la ventanilla, cuando Ara ha mirado el letrero un momento.
    id: "demoEquipo",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= MIRA_LA_SALIDA,
    caduca: yaEnLaPista,
    lineas: DEMO_EQUIPO,
    sigue: "demostracion",
  },
  {
    /*
     * **Y la revisión**: antes de despegar, la tripulación pasa por el pasillo
     * mirando cinturones, respaldos y persianas. A Ara le revisa el suyo, y le
     * cuenta por qué la persiana va subida.
     *
     * **Y lo que Ara se ha quedado pensando de la demostración** (puntos 312
     * y 313), que es ahora cuando tiene a la tripulante al lado —durante la
     * demostración ella está ocupada—: si hay que ponerse ya la máscara —no:
     * es por si acaso, como el chaleco, y casi nunca pasa—, y si no se sale
     * por la ventanilla del ala —en los aviones más largos sí; este es más
     * corto, y sus salidas son las puertas—. Con calma: está todo preparado
     * por si acaso, sin asustar y sin esconderlo.
     *
     * **Y el baño, con la luz encendida** (punto 293): es lo último que tiene
     * a la tripulante al lado antes de que se apague —subiendo va sentada y
     * atada—, y la respuesta es la regla: con la luz encendida no se levanta
     * nadie, y cuando se apague, le acompaña. Lo dice porque la luz manda.
     */
    id: "revision",
    cuando: (l, e) => rodandoALaPista(l) && e.callaDesde >= 1.5,
    caduca: yaEnLaPista,
    lineas: [
      tripulante("revision"),
      ara("persiana"),
      con(tripulante("persiana"), "persiana"),
      ara("mascaraAhora"),
      // Sin el dibujo de las máscaras cayendo: lo que se contesta es que ahora no.
      tripulante("mascaraAhora"),
      ara("salidaAla"),
      con(tripulante("salidaAla"), "salidas"),
      ara("bano"),
      BANO_CON_LA_LUZ,
    ],
    mira: "ventanilla",
  },
  {
    id: "espera",
    cuando: (l) => l.tramo === "esperando" && l.enTramo >= PARADO_EN_LA_ESPERA,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando",
    lineas: [ara("espera"), comandante("espera")],
    mira: "ventanilla",
  },
  {
    id: "despegue",
    cuando: (l) => l.tramo === "esperando" && l.autorizado,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando" && l.tramo !== "entrando",
    lineas: [anuncio("comandante.despegue"), ara("despegue")],
    mira: "ventanilla",
  },
  {
    /*
     * **El empuje, en cuanto se nota**: al dar gas, que es cuando aprieta
     * contra el asiento. Y la carrera, vista desde el borde de la pista: el
     * avión que corre y se levanta, que es lo que no se ve desde dentro.
     */
    id: "carrera",
    cuando: (l) => l.tramo === "carrera" && l.porElSuelo > 8,
    caduca: (l) => !l.enTierra && l.altura > 150,
    lineas: [ara("carrera")],
    plano: "fuera-despegue",
  },
  {
    // «Las casas y los autos se ven chiquititos»: solo si se ve el suelo.
    id: "volando",
    cuando: (l) => !l.enTierra && l.altura > 80,
    caduca: (l) => l.altura > 1200,
    lineas: [ara("volando")],
    mira: "ventanilla",
    nombra: "tierra-abajo",
  },
  {
    /*
     * **Las nubes, por dentro o desde arriba**: si la subida atraviesa una, la
     * ventanilla se pone blanca y Ara pregunta ahí; si pasa entre ellas, al
     * dejarlas abajo. Lo que se dice tiene que ser lo que se ve.
     */
    id: "nubes",
    cuando: (l) =>
      !!l.nubes &&
      !l.enTierra &&
      l.vertical > 0.5 &&
      (l.enNube >= DENTRO_DE_LA_NUBE || l.altitud > l.nubes.techo + POR_ENCIMA),
    caduca: (l) => !l.nubes || l.altitud > l.nubes.techo + 700 || bajando(l.tramo),
    lineas: [ara("nubes")],
    segun: (l) => [ara(l.enNube >= DENTRO_DE_LA_NUBE ? "nubes" : "nubesAbajo")],
    mira: "nubes",
  },
  {
    /*
     * La respuesta, **pasados los diez mil pies**: por debajo, la cabina de
     * mando no habla de nada que no sea volar —la cabina estéril—. Y solo si
     * se preguntó: sin pregunta, la explicación sobraría.
     */
    id: "nubesRespuesta",
    cuando: (l) => !l.enTierra && (l.altitud >= DIEZ_MIL_PIES || l.tramo === "crucero"),
    caduca: (l, e) => !e.dicho("nubes") || bajando(l.tramo),
    lineas: [con(comandante("nubes"), "nube"), con(ara("niebla"), "nube")],
  },
  {
    // Arriba, una vuelta alrededor del avión, por encima del mar de nubes.
    id: "arriba",
    cuando: (l) => l.tramo === "crucero" && l.enTramo >= ARRIBA_Y_NIVELADO,
    caduca: (l) => bajando(l.tramo),
    lineas: [desdeLaCabina(anuncio("comandante.crucero"))],
    plano: "fuera-vuelta",
  },
  {
    id: "servicio",
    cuando: (_l, e) => e.desdeQueSeDijo("arriba") >= HASTA_EL_SERVICIO,
    caduca: (l, e) => !e.dicho("arriba") || bajando(l.tramo),
    lineas: [anuncio("tripulacion.servicio"), ara("servicio")],
    /*
     * **Y el baño, ahora que se puede** (punto 293): la luz se acaba de apagar
     * y la tripulante cumple lo que dijo en la revisión. Ara va mientras ella
     * da el anuncio del servicio desde la cocina de atrás —el teléfono de la
     * megafonía está allí, al lado del baño—, y vuelve a su asiento y se
     * abrocha. Con el avión por fuera, que el asiento se queda vacío un rato.
     * Si la luz no se ha apagado o ya no queda crucero, no: ver `puedeIrAlBano`.
     */
    segun: (l, e) => (e.puedeIrAlBano(l) ? AL_BANO : [anuncio("tripulacion.servicio"), ara("servicio")]),
    plano: "fuera-vuelta",
  },
  {
    /*
     * **La tripulante, en el asiento de Ara**, con el servicio: le pregunta si
     * es su primer vuelo y le cuenta las nubes de cerca, con su dibujo —de qué
     * son, por qué son blancas y qué se nota al cruzarlas—. La comandante ya
     * lo dijo para todos; esto es lo que se le cuenta a un niño.
     */
    id: "tcpNubes",
    cuando: (l, e) =>
      !l.enTierra &&
      (e.desdeQueSeDijo("servicio") >= HASTA_EL_ASIENTO || (e.saltado("servicio") && volando(l))),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: lasNubesDeCerca(con(ara("nubesSostiene"), "nube")),
    /*
     * Y lo último, «ahora las miro de otra manera», con Ara mirándolas contra
     * el cristal, si el cartel está apagado; si no, el dibujo de la nube sigue.
     *
     * **Y el plop de los oídos, explicado** (punto 284), si Ara lo notó al
     * subir. Subiendo, la presión de la cabina baja y el aire de dentro del
     * oído sale, y eso es el plop; tragar saliva o bostezar ayuda a igualarla.
     * En la subida nadie lo podía contar —la tripulación, sentada y atada; la
     * cabina de mando, por debajo de los diez mil pies, en lo suyo—, y lo
     * cuenta la tripulante en cuanto se levanta y llega al asiento de Ara, que
     * es lo que hace cualquier tripulante con un niño en su primer vuelo. Y se
     * engancha con la bajada: allí Ara ya sabe que es al revés. Ver el momento
     * `oidos`.
     */
    segun: (_l, e) => [
      ...lasNubesDeCerca(contraElCristal(con(ara("nubesSostiene"), "nube"), e)),
      ...(e.dichaLaCharla("plop") ? EL_PLOP_EXPLICADO : []),
    ],
    mira: "nubes",
  },
  {
    id: "bajada",
    cuando: (l) => bajando(l.tramo) && !l.enTierra,
    lineas: [desdeLaCabina(anuncio("comandante.descenso")), anuncio("tripulacion.cinturones")],
    /*
     * **Y los motores al ralentí, que se oyen** (punto 297): en el punto de
     * descenso la tripulación quita el gas del todo, y el ruido baja de golpe.
     * Ara lo nota primero, si acaba de pasar —ver `SE_OYE_EL_CAMBIO`—, y la
     * comandante dice lo que es: que empezamos a bajar. El porqué del ralentí
     * —que para bajar no se apagan los motores— lo cuenta ella misma en el
     * primer rato tranquilo de después, por encima de los diez mil pies: ver
     * la charla `bajando`.
     */
    segun: (l) => [
      ...(acabaDePonerse(l, "ralenti") ? [ara("ralenti")] : []),
      desdeLaCabina(anuncio("comandante.descenso")),
      anuncio("tripulacion.cinturones"),
    ],
  },
  {
    id: "oidos",
    cuando: (l) => l.cabina <= SE_NOTAN_LOS_OIDOS && !l.enTierra,
    caduca: (l) => l.tramo === "final" || l.tramo === "recogida" || l.enTierra || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("oidos"), con(tripulacion("oidos"), "oido"), con(ara("bostezo"), "oido")],
    /*
     * **Y si el plop de la subida ya se explicó** —ver el momento `tcpNubes`—,
     * Ara no pregunta lo que ya sabe: dice que ahora es al revés. Lo demás, lo
     * de siempre, que el anuncio es para todo el pasaje.
     */
    segun: (_l, e) => [
      e.plopExplicado ? ara("oidosAlReves") : ara("oidos"),
      con(tripulacion("oidos"), "oido"),
      con(ara("bostezo"), "oido"),
    ],
  },
  {
    /*
     * **El kit de viaje**: la tripulante se lo trae a Ara en el tramo largo y
     * tranquilo de la bajada, que es cuando un vuelo se hace largo. Es lo que
     * hacen las aerolíneas con quien viaja con pocos años, y se dice como es:
     * volar es apasionante, pero los vuelos duran un ratito. Ver
     * `kit-de-viaje.ts`.
     */
    id: "kit",
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      !l.enTierra &&
      tripulanteEnElPasillo(e) &&
      l.faltaParaTocar < BAJANDO.kit &&
      e.callaDesde >= CALLA_ANTES_DEL_KIT &&
      !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e) || l.altitud < DIEZ_MIL_PIES + KIT_POR_ENCIMA,
    lineas: [tripulante(KIT_DADO), tripulante("kitRato"), ara("kitGracias")].map(conLaTripulante),
  },
  {
    /*
     * **Y se recoge al empezar la llegada**, cruzando los diez mil pies
     * bajando, que es cuando se prepara la cabina para la llegada: la
     * tripulante pide guardarlo en el bolsillo del asiento. Lo pidió Enrique
     * (19-10-2026): «hay que vivir la bajada y la aproximación, ese momento es
     * mágico, cuando está llegando a tierra». Desde aquí, la llegada se vive
     * sin juego delante: las nubes, la isla, los flaps, el tren y la pista.
     * Antes se pedía con la cabina preparada, a treinta kilómetros de la pista.
     */
    id: "kitRecoger",
    cuando: (l, e) => e.kit.esDado && !l.enTierra && bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES,
    caduca: (l, e) => !e.kit.esDado || e.kit.estaRecogido || l.enTierra || enLaFinal(l),
    lineas: [conLaTripulante(tripulante(KIT_GUARDADO))],
  },
  {
    /*
     * **Al salir por debajo de las nubes** (punto 295), en el momento en que
     * pasa: el avión deja la capa encima y se ve lejos. Ara lo nota, y la
     * tripulante, que todavía anda por el pasillo, se lo cuenta «a nivel de
     * niños, pero no de tontos»: que la parte de abajo de las nubes es su base
     * —y techo cuando tapan más de medio cielo, que es lo que dice la OACI—,
     * a cuánto está hoy y cuánto falta hasta el mar, y la visibilidad, que se
     * mide en kilómetros y es lo que deja ver la pista a tiempo. Los números,
     * solo si son los de hoy: ver `TECHO_DE_HOY`. Con la cabina ya preparada,
     * sin la tripulante, lo cuenta Ara con lo que le enseñó su mamá.
     *
     * La comandante no: por debajo de los diez mil pies la cabina de mando
     * solo habla del vuelo —la cabina estéril—, y esto no es seguridad.
     */
    id: "techo",
    cuando: (l) =>
      bajando(l.tramo) &&
      !l.enTierra &&
      !!l.nubes &&
      l.altitud < l.nubes.base - 20 &&
      l.enNube < DENTRO_DE_LA_NUBE,
    // «Y abajo se ve lejísimos»: con la visibilidad corta no es verdad, y no se dice.
    caduca: (l) =>
      l.enTierra ||
      enLaFinal(l) ||
      !l.nubes ||
      (l.visibilidad ?? MAS_DE_DIEZ_KILOMETROS) < MAS_DE_DIEZ_KILOMETROS ||
      l.faltaParaTocar < PREPARAR_LA_CABINA - 4000,
    lineas: [ara("bajoLasNubes"), conLaTripulante(tripulante("techo")), con(tripulante("techoHoy"), "techo"), con(tripulante("visibilidad"), "techo")],
    segun: (l, e) => {
      const lineas: Linea[] = [ara("bajoLasNubes")];
      if (!tripulanteEnElPasillo(e) || cabinaPreparada(l, e)) return [...lineas, con(ara("techo"), "techo")];
      lineas.push(conLaTripulante(tripulante("techo")));
      const base = l.nubes?.base ?? 0;
      const deHoy =
        base >= TECHO_DE_HOY.desde &&
        base <= TECHO_DE_HOY.hasta &&
        l.altitud > base - TECHO_DE_HOY.justoDebajo &&
        l.sobreElMar !== false;
      if (deHoy) lineas.push(con(tripulante("techoHoy"), "techo"));
      if ((l.visibilidad ?? MAS_DE_DIEZ_KILOMETROS) >= MAS_DE_DIEZ_KILOMETROS)
        lineas.push(con(tripulante("visibilidad"), "techo"));
      return lineas;
    },
    mira: "nubes",
  },
  {
    /*
     * **La isla de llegada, a la vista**: La Palma sube a casi dos mil
     * quinientos metros, y desde cuarenta y tantos kilómetros ya se ve entera
     * por encima del mar de nubes. Es Ara quien la descubre: la cabina de mando
     * ya está con la llegada.
     *
     * **Y solo si se ve** (punto 286): se decía con el avión metido en la
     * nube, la ventanilla toda blanca. Se dice cuando se ve, desde donde se
     * vea: si va por delante del morro, con el avión por fuera y la isla al
     * fondo.
     */
    id: "isla",
    cuando: (l) => l.faltaParaTocar < VE_LA_ISLA && !l.enTierra,
    caduca: (l) => l.enTierra || l.tramo === "final" || l.faltaParaTocar < PREPARAR_LA_CABINA - 4000,
    lineas: [ara("isla")],
    mira: "ventanilla",
    nombra: "isla-de-llegada",
  },
  {
    id: "aproximacion",
    cuando: (l) => l.faltaParaTocar < PREPARAR_LA_CABINA && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [anuncio("comandante.aproximacion")],
  },
  {
    /*
     * La última vuelta de la tripulante antes de sentarse: cinturón, respaldo
     * y persiana. Y si trajo el kit y todavía no se guardó —se pide a los diez
     * mil pies, ver `kitRecoger`—, que se guarde: para aterrizar, todo
     * recogido. Ver `atenderAlKit`.
     */
    id: "tcpAterrizaje",
    cuando: (l, e) => !l.enTierra && e.desdeQueSeDijo("aproximacion") >= 2,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [conLaTripulante(tripulante("aterrizaje"))],
    segun: (_l, e) =>
      (e.kit.esDado && !e.kit.estaRecogido ? [tripulante(KIT_GUARDADO), tripulante("aterrizaje")] : [tripulante("aterrizaje")]).map(
        conLaTripulante,
      ),
  },
  {
    /*
     * **Los flaps, vistos por fuera**: desde el asiento de Ara, por delante del
     * ala, se ve el borde de ataque y el motor, y lo que sale por detrás queda
     * a la espalda. Así que cuando Ara lo nota, se ve el ala desde fuera, que
     * es donde se ve salir el flap. Ver `asiento-de-ara.test.ts`.
     */
    id: "flaps",
    cuando: (l) => l.flaps > 0.2 && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("flaps"), ara("flapsPorque")],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    // **La toma, desde el borde de la pista**: las ruedas que tocan y el avión que frena.
    id: "aterrizando",
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 60,
    caduca: (l) => l.enTierra,
    lineas: [ara("yaCasi")],
    plano: "fuera-pista",
  },
  {
    id: "toma",
    cuando: (l) => l.tramo === "frenando" && l.enTramo >= DESPUES_DE_TOCAR,
    caduca: (l) => l.tramo === "al-puesto" || l.tramo === "aparcado" || l.tramo === "apagado",
    lineas: [ara("toma")],
    mira: "motor",
    plano: "fuera-pista",
  },
  {
    id: "llegada",
    cuando: (l) => (l.tramo === "al-puesto" && l.porElSuelo > 1.5) || l.tramo === "aparcado",
    lineas: [anuncio("comandante.llegada"), comandante("reversa"), anuncio("tripulacion.llegada")],
    /*
     * **Y lo que sonó antes de tocar**, si Ara lo notó —ver la charla
     * `masGas`—: los motores que suben con el tren y los flaps fuera. En la
     * aproximación nadie lo podía contar —la cabina de mando, en lo suyo; la
     * tripulante, sentada—, así que lo cuenta la comandante en el primer rato
     * tranquilo, con la reversa: lo que pasa en un momento de trabajo se
     * explica en el primer momento tranquilo de después.
     */
    segun: (_l, e) => [
      anuncio("comandante.llegada"),
      comandante("reversa"),
      ...(e.dichaLaCharla("masGas") ? [comandante("masGas")] : []),
      anuncio("tripulacion.llegada"),
    ],
    plano: "fuera-rodando",
  },
  {
    /*
     * **Parados en el puesto, los impacientes** (punto 303): el avión se para,
     * los motores todavía en marcha y la luz del cinturón encendida, y
     * alrededor empiezan los clics de las hebillas y la gente que se levanta,
     * bajito. Lo de fuera —el señalero cruzando los bastones— se deja ver
     * parar, y se vuelve a la cabina, que es donde pasa esto. Sin palabras:
     * lo que se oye lo pone el juego mientras dure. Ver `gente`.
     */
    id: "impacientes",
    cuando: (l) => (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO) || l.tramo === "apagado",
    lineas: [],
  },
  {
    /*
     * **Y Ara lo nota, y se queda en su asiento**: lo dice sin regañar a
     * nadie —lo que hacen otros no es asunto suyo— y hace lo que toca. La
     * luz sigue encendida: «todavía no».
     */
    id: "seLevantan",
    cuando: (_l, e) => e.desdeQueSeDijo("impacientes") >= SE_OYEN_LAS_HEBILLAS,
    lineas: [ara("seLevantan"), ara("cinturonQuieto")],
  },
  {
    /*
     * **La luz del cinturón se apaga** cuando la apaga la comandante: con el
     * avión parado en su puesto y los motores ya apagados, que es cuando se
     * apaga en cualquier vuelo. Con su *ding*. Sin palabras: lo que se ve es
     * el cartel que se va, y lo pone el juego. Ver `luzApagadaEnElPuesto`.
     */
    id: "luz",
    cuando: (l, e) => l.tramo === "apagado" && l.enTramo >= APAGA_LA_LUZ && e.callaDesde >= 0.6,
    lineas: [],
  },
  {
    // Y ahora sí: Ara se suelta el cinturón, detrás del *ding*.
    id: "suelto",
    cuando: (_l, e) => e.desdeQueSeDijo("luz") >= TRAS_EL_DING,
    lineas: [ara("luzApagada")],
  },
  {
    /*
     * **La tripulante, ya de pie**, se acerca a Ara: le da las gracias por
     * esperar, le cuenta por qué —el avión podía frenar de golpe, y al abrir
     * los compartimentos de arriba se pueden caer cosas— y por qué al
     * aterrizar ponen cara seria: están trabajando, en la seguridad, y van
     * con el cinturón puesto hasta que el avión para; por eso lo recuerdan
     * por el altavoz. Antes no podía: iba en su asiento, atada. Y si lo que
     * sabe hacer no se contó bajando, se cuenta ahora: una vez.
     */
    id: "gracias",
    cuando: (_l, e) => e.callaDesde >= 1,
    lineas: [tripulante("gracias"), con(tripulante("maleteros"), "maletero"), tripulante("seria")],
    segun: (_l, e) => [
      tripulante("gracias"),
      con(tripulante("maleteros"), "maletero"),
      tripulante("seria"),
      ...(e.oficioContado ? [] : EL_OFICIO),
    ],
  },
  {
    id: "puesto",
    cuando: (l) => l.tramo === "apagado" && l.enTramo >= 1.5,
    lineas: [tripulante("adios"), ara("fin")],
  },
  { id: "fin", cuando: () => true, lineas: [] },
];

/**
 * **Las charlas**: lo que se cuenta cuando viene a cuento, en el orden en que
 * se prefieren. Unas son sucesos —el ruido del tren, el giro, las nubes otra
 * vez— y se dicen en cuanto se calla lo de antes; otras son explicaciones, y
 * esperan su rato de silencio y su tramo del vuelo: la comandante solo por
 * encima de los diez mil pies, y la tripulante solo por el pasillo, del
 * servicio a la cabina preparada. Los tramos, medidos en el banco con el
 * vuelo de verdad de Los Rodeos a La Palma, para que **ningún rato largo se
 * quede callado**. Ver `inicio-pasaje.test.ts`.
 */
export const CHARLAS_DEL_PASAJE: readonly DefCharla[] = [
  {
    // El tren se guarda en cuanto se despega, con un golpe que se oye en el pasaje.
    id: "tren",
    tras: 0,
    cuando: (l, e) => e.dicho("volando") && !l.enTierra && (l.tren ?? 1) < 0.95,
    caduca: (l) => l.altura > 1500 || bajando(l.tramo),
    lineas: [ara("tren")],
  },
  {
    /*
     * **El gas de subida, cuando suena** (punto 297). A los mil quinientos
     * pies sobre el campo la tripulación pasa del gas de despegue al de
     * subida, y el ruido de los motores baja: es de lo que más asusta a quien
     * vuela por primera vez, «¿se ha parado?». Ara lo nota en el momento,
     * mirando el motor, y con lo que lo calma: que se sigue subiendo igual.
     * Por debajo de los diez mil pies nadie lo puede contar —la cabina de
     * mando, en lo suyo; la tripulante, sentada y atada—, así que el porqué
     * espera al primer rato tranquilo: ver `porQueMenosGas`.
     */
    id: "menosGas",
    tras: 1,
    cuando: (l) => l.tramo === "subida" && !l.enTierra && acabaDePonerse(l, "subida"),
    caduca: (l) => l.tramo !== "subida" || !acabaDePonerse(l, "subida"),
    lineas: [ara("menosGas")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    /*
     * **Dentro de la nube, el avión se menea** (punto 280), y se cuenta en el
     * momento en que pasa: el aire de dentro de la nube sube y baja, el avión
     * se mueve un poco y el ala sube y baja con él —se ve desde el asiento,
     * con la cara contra el cristal—. Ara lo nota, y la comandante lo cuenta
     * con calma para todo el pasaje: que es aire que sube y baja, que es
     * normal, que las alas están hechas para doblarse un poco y por eso se
     * mueven, y que por eso se lleva el cinturón. Por debajo de los diez mil
     * pies la cabina de mando solo habla del vuelo, y esto es del vuelo: lo
     * de los baches y el cinturón es de los pocos anuncios que una
     * comandante hace subiendo.
     *
     * Para muchos niños será el primer meneo de avión de su vida, y lo que
     * aprendan a sentir aquí se lo llevan puesto (AGENTS.md): es normal, y se
     * va tranquilo con el cinturón.
     */
    id: "meneo",
    tras: 0,
    cuando: (l) => volando(l) && l.enNube >= DENTRO_DE_LA_NUBE && (l.meneo ?? 0) >= SE_NOTA_EL_MENEO,
    caduca: (l) => l.enTierra || enLaFinal(l),
    lineas: [ara("meneo"), con(comandante("meneo"), "meneo"), con(ara("meneoBien"), "meneo")],
    mira: "ala",
    plano: "asomado-motor",
  },
  {
    id: "plop",
    tras: 2,
    cuando: (l) => !l.enTierra && l.tramo === "subida" && l.cabina >= SUBE_LA_CABINA && l.altura > 300,
    caduca: (l) => l.tramo !== "subida",
    lineas: [ara("plop")],
  },
  {
    /*
     * **El giro, por fuera**: se inclina el avión, y desde detrás se ve cómo.
     * Lo que dice Ara depende del lado: si baja el ala suya, apunta al suelo.
     */
    id: "giro",
    tras: 0,
    cuando: (l) => volando(l) && l.altura > 250 && Math.abs(l.alabeo ?? 0) > SE_NOTA_EL_GIRO,
    caduca: (l) => l.enTierra || enLaFinal(l) || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("giroAbajo"), ara("bici")],
    segun: (l, e) => [ara(e.bajaMiAla(l.alabeo ?? 0) ? "giroAbajo" : "giroArriba"), ara("bici")],
    plano: "fuera-giro",
  },
  {
    /*
     * **El porqué del gas de subida**, por la comandante y para todo el
     * pasaje, en cuanto puede hablar: pasados los diez mil pies. Es la misma
     * ley que la reversa explicada al llegar —lo que pasa en un momento de
     * trabajo se cuenta en el primer momento tranquilo de después—, y la
     * cuenta quien quitó el gas. Solo si Ara lo notó: sin eso, sobraría.
     */
    id: "porQueMenosGas",
    // Poco: es la respuesta a lo que Ara ya notó, y arriba el rato es justo —ver `puedeDormirse`—.
    tras: 2,
    cuando: (l, e) => volando(l) && !bajando(l.tramo) && l.altitud >= DIEZ_MIL_PIES && e.dichaLaCharla("menosGas"),
    caduca: (l) => l.enTierra || bajando(l.tramo),
    lineas: [desdeLaCabina(comandante("menosGas"))],
  },
  {
    // Por encima de las nubes, pegada al cristal: el mar, entre ellas.
    id: "marArriba",
    tras: 20,
    cuando: (l) =>
      volando(l) && !!l.sobreElMar && !!l.nubes && l.altitud > l.nubes.techo + 150 && e_noEnNube(l),
    caduca: (l) => bajando(l.tramo),
    lineas: [ara("marArriba")],
    segun: (_l, e) => [contraElCristal(ara("marArriba"), e)],
    plano: "asomado-abajo",
    // «Entre las nubes, allá abajo, se ve el mar»: por un hueco, o no se dice.
    nombra: "mar-abajo",
  },
  {
    /*
     * **Por encima del mar de nubes, lo que se ve es el mar de nubes.** Con
     * Anaga, La Orotava y el mar debajo de la capa, la subida se quedaba dos
     * minutos callada: lo que la llenaba era lo que no se veía. Lo de verdad
     * es lo que hay debajo, y tiene nombre: en Canarias, el mar de nubes.
     */
    id: "marDeNubes",
    // Ya muy arriba, más alto que el Teide, y con su rato: lo que se mira cuando no pasa nada.
    tras: 40,
    cuando: (l, e) =>
      volando(l) &&
      !!l.nubes &&
      l.altitud > Math.max(l.nubes.techo + 150, CUMBRE_DEL_TEIDE) &&
      e_noEnNube(l) &&
      e.dicho("nubes"),
    caduca: (l) => l.enTierra || (bajando(l.tramo) && !!l.nubes && l.altitud < l.nubes.techo + 150),
    lineas: [ara("marDeNubes")],
    segun: (_l, e) => [contraElCristal(ara("marDeNubes"), e)],
    plano: "asomado-abajo",
    nombra: "nubes-abajo",
  },
  {
    // Por encima de Tenerife, subiendo: las montañas y los barrancos.
    id: "sobreLaIsla",
    tras: 18,
    cuando: (l) => l.tramo === "subida" && !l.enTierra && l.sobreElMar === false && l.altura > 2500,
    caduca: (l) => l.tramo !== "subida",
    lineas: [ara("sobreLaIsla")],
    // «Se ven las montañas y los barrancos»: si no los tapa el mar de nubes.
    nombra: "tierra-abajo",
  },
  {
    /*
     * **Cómo se sostiene el avión**, por la comandante y para todos, con el ala
     * vista por fuera. Lo que se cuenta es lo de verdad: el ala inclinada
     * empuja el aire hacia abajo y el aire la empuja hacia arriba. Nada del
     * «camino más largo por arriba», que es falso (AGENTS.md, regla 4).
     */
    id: "ala",
    tras: 15,
    cuando: (l, e) => volando(l) && l.altitud >= DIEZ_MIL_PIES && e.dicho("nubesRespuesta"),
    caduca: (l) => l.enTierra || enLaFinal(l) || (bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES),
    lineas: [ara("preguntaAla"), con(comandante("ala"), "ala"), con(ara("pandorga"), "ala")],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    /*
     * Más alto que el Teide y a más de quinientos por hora: solo cuando es
     * verdad.
     *
     * **Y el Teide, presentado la primera vez que se nombra** (punto 282). Un
     * niño de Paraguay no sabe qué es, y «más alto que la cumbre del Teide» no
     * le dice nada; lo que lo presentaba —lo que cuenta la comandante al
     * señalarlo— llegaba después, bajando. Así que si todavía no se ha
     * contado, la comandante lo cuenta antes: un volcán, la montaña más alta de
     * España, unos tres mil setecientos quince metros —ver
     * `docs/historias/fuentes.md`—. Y si se ve, se enseña con el avión por
     * fuera, que es como se entiende qué es volar por encima; Ara dice que
     * las montañas parecen de juguete solo si las está viendo.
     */
    id: "altoRapido",
    tras: 18,
    cuando: (l, e) =>
      volando(l) &&
      l.altitud > CUMBRE_DEL_TEIDE + 150 &&
      l.altitud >= DIEZ_MIL_PIES &&
      l.porElSuelo > QUINIENTOS_POR_HORA &&
      e.dicho("nubesRespuesta"),
    caduca: (l) => l.enTierra || enLaFinal(l) || (bajando(l.tramo) && l.altitud < CUMBRE_DEL_TEIDE + 150),
    lineas: [ara("preguntaAlto"), con(comandante("altoRapido"), "alto"), con(ara("altoRapido"), "alto")],
    segun: (l, e) => {
      const lineas: Linea[] = [ara("preguntaAlto")];
      if (!e.teidePresentado) lineas.push(con(comandante("teide"), "alto"));
      lineas.push(con(comandante("altoRapido"), "alto"));
      if (e.seVe("hito:teide", l)) lineas.push(con(ara("altoRapido"), "alto"));
      return lineas;
    },
    muestra: "hito:teide",
  },
  {
    /*
     * **Para bajar no se apagan los motores**: por la comandante, arriba
     * todavía. Es el porqué del ralentí que Ara oyó al empezar a bajar —ver el
     * momento `bajada`—, así que si Ara lo notó va el primero en cuanto se
     * calla lo de los oídos, aunque se baje desde muy arriba; si no, con la
     * bajada ya empezada de verdad. Y solo con los motores al ralentí, que es
     * lo que cuenta.
     */
    id: "bajando",
    tras: 12,
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      l.altitud > DIEZ_MIL_PIES + 150 &&
      (l.altitud < 4800 || e.registro.some((d) => d.clave === "inicio.ara.pasaje.ralenti")) &&
      e.dicho("oidos") &&
      (l.potencia ?? "ralenti") === "ralenti",
    caduca: (l) => l.altitud < DIEZ_MIL_PIES + 100 || enLaFinal(l) || l.enTierra,
    lineas: [ara("preguntaBajar"), desdeLaCabina(comandante("bajando"))],
  },
  {
    // El frío de fuera: solo si de verdad está bajo cero.
    id: "tcpFrio",
    tras: 14,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && (l.temperatura ?? 99) < FRIO_DE_CONGELADOR && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("frio"), "frio"), con(ara("frio"), "frio")],
  },
  {
    // El motor, con Ara contra el cristal para verlo mientras se lo cuentan.
    id: "tcpMotor",
    tras: 16,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.motor && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("motor1"), "motor"), con(tripulante("motor2"), "motor"), con(ara("secador"), "motor")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    // De dónde salieron las islas: volcanes desde el fondo del mar.
    id: "tcpIslas",
    tras: 16,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.islas && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("islas1"), "islas"), con(tripulante("islas2"), "islas"), con(ara("islas"), "islas")],
  },
  {
    // Desde tan alto, el mar parece quieto.
    id: "marQuieto",
    tras: 18,
    cuando: (l) =>
      l.tramo === "bajada" && !l.enTierra && !!l.sobreElMar && l.altitud > 2000 && l.faltaParaTocar < BAJANDO.marQuieto,
    caduca: (l) => l.enTierra || enLaFinal(l) || l.altitud < 1900,
    lineas: [ara("marQuieto")],
    plano: "asomado-abajo",
    nombra: "mar-abajo",
  },
  {
    // Cómo se sabe el camino: el mapa de la pantalla y la torre por radio.
    id: "tcpRuta",
    tras: 18,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.ruta && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("ruta"), "ruta"), con(ara("mapa"), "ruta")],
  },
  {
    // Bajando hacia el mar de nubes: cada vez más cerca.
    id: "nubesCerca",
    tras: 16,
    cuando: (l) =>
      l.tramo === "bajada" && !l.enTierra && !!l.nubes && l.altitud < 2800 && l.altitud > l.nubes.techo + 150,
    caduca: (l) => l.enTierra || enLaFinal(l) || (!!l.nubes && l.altitud < l.nubes.techo + 100),
    lineas: [ara("nubesCerca")],
  },
  {
    // Las cuatro luces al lado de la pista: lo que se va a ver al llegar.
    id: "tcpPapi",
    tras: 18,
    cuando: (l, e) =>
      volando(l) && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.papi && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("papi"), "papi"), con(ara("papi"), "papi")],
  },
  {
    /*
     * **El baño, otra vez, ya bajando con la luz encendida** (punto 293). Si
     * Ara fue, la tripulante, que anda por el pasillo, lo recuerda: fue justo
     * a tiempo, que ahora ya no se levanta nadie hasta aterrizar. Y si no hubo
     * rato —la luz no se apagó, o se apagó sin crucero para ir y volver—, lo
     * verdadero es esperar, y Ara lo entiende sin drama: con la luz encendida,
     * a aterrizar, que falta poco. Ver `puedeIrAlBano`.
     */
    id: "bano",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      !l.enTierra &&
      e.dicho("revision") &&
      !luzApagada(l, e) &&
      (!e.fueAlBano || tripulanteEnElPasillo(e)) &&
      l.faltaParaTocar < BAJANDO.bano &&
      !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [ara("banoEspero")],
    segun: (_l, e) => [e.fueAlBano ? FUE_A_TIEMPO : ara("banoEspero")],
  },
  {
    /*
     * **Lo que hay arriba de todo en La Palma**: los telescopios del Roque de
     * los Muchachos, que miran las estrellas desde uno de los cielos más
     * limpios del mundo. Es adonde se va, y casi nadie lo sabe.
     */
    id: "tcpEstrellas",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" && tripulanteEnElPasillo(e) && l.faltaParaTocar < BAJANDO.estrellas && !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: [con(tripulante("estrellas"), "estrellas"), con(ara("estrellas"), "estrellas")],
  },
  {
    /*
     * **Lo que sabe hacer la tripulante** (punto 303): «la gente se cree que
     * son camareras, y saben hacer RCP en vuelo, atender urgencias, apagar un
     * fuego en cabina…» (Enrique). Se lo cuenta a Ara en el hueco tranquilo
     * de la bajada, con naturalidad y una vez. Ver `EL_OFICIO`.
     */
    id: "tcpOficio",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" &&
      !l.enTierra &&
      tripulanteEnElPasillo(e) &&
      !e.oficioContado &&
      l.faltaParaTocar < BAJANDO.oficio &&
      !cabinaPreparada(l, e),
    caduca: (l, e) => cabinaPreparada(l, e),
    lineas: EL_OFICIO,
  },
  {
    // Por debajo de las nubes, la isla de llegada ya cerca.
    id: "islaCerca",
    tras: 16,
    cuando: (l, e) =>
      l.tramo === "bajada" && !l.enTierra && l.faltaParaTocar < 38000 && l.altura < 1400 && e.dicho("isla"),
    caduca: (l) => l.enTierra || enLaFinal(l) || l.altura < 500,
    lineas: [ara("islaCerca")],
    /*
     * «Se ven las montañas, la costa y el mar»: se decía con la isla en la
     * ventanilla de al lado y por la de Ara solo mar (punto 286, captura
     * 229). Se dice cuando se ve, y si por la ventanilla no, con una toma de
     * fuera, que es lo que pidió Enrique.
     */
    nombra: "costa-de-llegada",
  },
  {
    // Bajando, otra vez por dentro de una nube: ahora ya se sabe qué es.
    id: "otraNube",
    tras: 0,
    cuando: (l, e) => bajando(l.tramo) && !l.enTierra && l.enNube >= DENTRO_DE_LA_NUBE && e.dicho("nubes"),
    caduca: (l) => l.enTierra,
    lineas: [ara("otraNube")],
  },
  {
    /*
     * **Y si la nube dura, se cuenta que dura**: bajando, la capa se cruza
     * despacio —un rato nivelado con la ventanilla blanca— y el avión se sigue
     * meneando. Lo de verdad es eso, dicho ya con calma: es normal, y el
     * cinturón va puesto. Lo que se aprende aquí se lo llevan puesto.
     */
    id: "sigueLaNube",
    tras: 30,
    cuando: (l, e) =>
      bajando(l.tramo) &&
      !l.enTierra &&
      l.enNube >= DENTRO_DE_LA_NUBE &&
      (l.meneo ?? 0) >= SE_NOTA_EL_MENEO &&
      e.dichaLaCharla("otraNube") &&
      e.dichaLaCharla("meneo"),
    caduca: (l) => l.enTierra || enLaFinal(l),
    lineas: [ara("sigueLaNube")],
    mira: "nubes",
  },
  {
    // Por debajo de las nubes, pegada al cristal: el mar, ya cerca.
    id: "marAbajo",
    tras: 14,
    cuando: (l) =>
      !l.enTierra && bajando(l.tramo) && !!l.sobreElMar && l.altura > 400 && (!l.nubes || l.altitud < l.nubes.base - 100),
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [ara("marAbajo")],
    plano: "asomado-abajo",
    nombra: "mar-abajo",
  },
  {
    // El giro a la final, también por fuera.
    id: "giroFinal",
    tras: 0,
    cuando: (l, e) =>
      !l.enTierra &&
      bajando(l.tramo) &&
      l.faltaParaTocar < PREPARAR_LA_CABINA &&
      l.altura > 250 &&
      Math.abs(l.alabeo ?? 0) > SE_NOTA_EL_GIRO &&
      e.dichaLaCharla("giro"),
    caduca: (l) => l.enTierra || l.altura < 250,
    lineas: [ara("giroFinal")],
    plano: "fuera-giro",
  },
  {
    /*
     * Antes de la final, el avión va frenando para sacar los flaps: se nota
     * en el asiento. De doscientos cincuenta nudos a ciento sesenta, medido
     * en el banco.
     */
    id: "despacio",
    tras: 14,
    cuando: (l) =>
      !l.enTierra &&
      l.tramo === "bajada" &&
      l.faltaParaTocar < 22000 &&
      l.porElSuelo < QUINIENTOS_POR_HORA * 0.68,
    caduca: (l) => l.enTierra || enLaFinal(l),
    lineas: [ara("masDespacio")],
  },
  {
    /*
     * El tren sale, con su ruido, para aterrizar. **Y se ve desde abajo**
     * (punto 298): una toma desde debajo del avión y un poco por delante,
     * mirando hacia arriba, con las patas bajando y trabadas. Desde el asiento
     * no se ve, y es lo que hace ese ruido.
     */
    id: "ruedas",
    tras: 0,
    cuando: (l) => !l.enTierra && enLaFinal(l) && (l.tren ?? 0) > 0.5 && l.altura > 150,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("ruedas")],
    plano: "fuera-tren",
  },
  {
    /*
     * **Y los motores que suben en la aproximación** (punto 297): con el tren
     * y los flaps fuera el avión frena mucho, y para seguir a su velocidad
     * por la senda hace falta más empuje. Suena justo después del tren, y Ara
     * lo nota cuando acaba de verse el tren —sin pisar el plano de las patas,
     * que dura lo suyo—. Lo cuenta la comandante al llegar, que en la final
     * nadie puede: ver el momento `llegada`.
     */
    id: "masGas",
    tras: 8,
    cuando: (l) => !l.enTierra && bajando(l.tramo) && l.altura > 150 && acabaDePonerse(l, "aproximacion"),
    caduca: (l) => l.enTierra || l.altura < 150 || !acabaDePonerse(l, "aproximacion"),
    lineas: [ara("masGas")],
    mira: "motor",
    plano: "asomado-motor",
  },
  {
    id: "miro",
    tras: 12,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 560 && l.altura > 330,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [ara("miro")],
  },
  {
    id: "cerquita",
    tras: 6,
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 300 && l.altura > 110 && !!l.sobreElMar,
    caduca: (l) => l.enTierra || l.altura < 100,
    lineas: [ara("cerquita")],
    nombra: "mar-abajo",
  },
  {
    /*
     * **Dando la vuelta en la pista** (punto 300), cuando de verdad gira: en
     * el ensanche de la punta, o ya de vuelta por la pista. Ara lo nota, y se
     * ve por fuera, desde un lado y en alto, que desde el asiento solo se ve
     * el suelo dar vueltas. No lo explica nadie todavía: la pista sigue
     * ocupada y la cabina de mando está en lo suyo, y la tripulante va en su
     * asiento. Ver `porQueLaVuelta`.
     */
    id: "vueltaEnPista",
    tras: 0,
    cuando: (l) => l.tramo === "al-puesto" && daLaVuelta(l),
    caduca: (l) => l.tramo !== "al-puesto" || fueraDeLaPista(l),
    lineas: [ara("vueltaEnPista")],
    plano: "fuera-raqueta",
  },
  {
    /*
     * **Y en cuanto se deja la pista, por qué** —el primer rato tranquilo de
     * la cabina de mando—: la comandante, para todo el pasaje, como la reversa
     * y el gas de la aproximación. Solo si de verdad se dio la vuelta. Con el
     * avión por fuera rodando a la terminal, o con el señalero si ya guía.
     */
    id: "porQueLaVuelta",
    tras: 2,
    cuando: (l, e) =>
      (l.tramo === "al-puesto" || l.tramo === "aparcado") && e.dichaLaCharla("vueltaEnPista") && fueraDeLaPista(l),
    // Y parados en el puesto ya no: ahí empieza lo de los cinturones, y no se pisa.
    caduca: (l) => l.tramo === "apagado" || (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO),
    lineas: LA_VUELTA_EXPLICADA,
    planoSegun: (_l, e) => (e.dichaLaCharla("senalero") ? "fuera-senalero" : "fuera-rodando"),
  },
  {
    /*
     * **El señalero, desde fuera** (punto 301): al llegar al puesto, el que
     * guía el avión con sus dos bastones —seguir, girar, despacio y parar,
     * con las señas del Anexo 2 de la OACI— hasta dejarlo en su sitio. Desde
     * el asiento no se ve, y enseña que alguien en tierra guía al avión. Sin
     * palabras: lo dicen los brazos, y la despedida lo devuelve a la
     * ventanilla. Ver `world/senalero.ts`.
     */
    id: "senalero",
    tras: 0,
    cuando: (l) => !!l.senalero && (l.tramo === "al-puesto" || l.tramo === "aparcado"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [],
    plano: "fuera-senalero",
  },
  {
    id: "despacito",
    tras: 50,
    cuando: (l, e) => l.tramo === "al-puesto" && e.dicho("llegada"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [ara("despacito")],
  },
  {
    id: "repaso",
    tras: 50,
    cuando: (l, e) => (l.tramo === "al-puesto" || l.tramo === "aparcado") && e.dicho("llegada"),
    caduca: (l) => l.tramo === "apagado",
    lineas: [ara("repaso")],
  },
];

/** Por encima de las nubes y fuera de ellas. */
function e_noEnNube(l: LecturaDelPasaje): boolean {
  return l.enNube < DENTRO_DE_LA_NUBE;
}

/**
 * **Lo que dice Ara de lo que se le señala**, si va por su lado: lo que se
 * dice viendo algo así por primera vez. Lo que no tiene frase suya se queda
 * en la de siempre.
 */
const LO_QUE_DICE_ARA: Readonly<Record<string, string>> = {
  teide: "teide",
  garajonay: "garajonay",
  orotava: "orotava",
};
const LO_VEO = ara("loVeo");
/**
 * **Lo que Ara contesta a la historia, no a lo que ve**: «¿hablar silbando?»
 * es al silbo gomero, que solo lo cuenta la historia. Sin historia oída, no se
 * contesta. Ver `decirLoSenalado`.
 */
const CONTESTA_A_LA_HISTORIA: ReadonlySet<string> = new Set(["garajonay"]);

/**
 * **Todas las frases nuevas de la escena**, una vez cada una: para la lista de
 * grabar y las pruebas. Los anuncios de siempre y lo de la ventanilla no
 * están: ya tienen su voz.
 */
export const LINEAS_DEL_PASAJE: readonly Linea[] = (() => {
  const todas: Linea[] = [];
  const poner = (l: Linea): void => {
    if (!esAnuncioDeSiempre(l.clave) && !todas.some((x) => x.clave === l.clave)) todas.push(l);
  };
  for (const m of GUION_DEL_PASAJE) m.lineas.forEach(poner);
  for (const k of Object.values(LO_QUE_DICE_ARA)) poner(ara(k));
  poner(LO_VEO);
  poner(ara("nubesAbajo"));
  for (const c of CHARLAS_DEL_PASAJE) c.lineas.forEach(poner);
  poner(ara("giroArriba"));
  // Y lo que va según lo que se ve y quién anda por el pasillo: el Teide, y bajo las nubes.
  poner(comandante("teide"));
  poner(ara("techo"));
  // Y el kit: lo que se dice en los juegos, y guardarlo para aterrizar. La luz verde, al final.
  LINEAS_DEL_KIT.filter((l) => !LINEAS_DE_LA_LUZ.includes(l)).forEach(poner);
  poner(tripulante(KIT_GUARDADO));
  // Y la siesta: el bostezo, la tripulante que despierta a Ara para bajar y el despertar.
  [SE_DUERME, LA_DESPIERTAN, SE_DESPIERTA].forEach(poner);
  // Y los motores que se oyen cambiar, y los oídos: el plop explicado, y al revés al bajar.
  [ara("ralenti"), ...EL_PLOP_EXPLICADO, ara("oidosAlReves"), comandante("masGas")].forEach(poner);
  // Y el baño con la luz apagada: la tripulante que viene a por Ara, Ara de vuelta y, bajando, a tiempo.
  [...AL_BANO, FUE_A_TIEMPO].forEach(poner);
  // Y la luz verde del kit (punto 304), al final: lo nuevo no renumera lo que ya está grabado.
  LINEAS_DE_LA_LUZ.forEach(poner);
  return todas;
})();

// ── La secuencia ─────────────────────────────────────────────────────────

/** Un cambio de plano, con su hora de escena. */
export interface CambioDePlano {
  readonly plano: Plano;
  readonly desde: number;
  /** Y el sitio del paisaje que se enseña, en los planos que lo buscan. */
  readonly sitio?: SitioDelPaisaje;
}

/**
 * **Lo nombrado del paisaje, y cómo se veía al nombrarlo**: para el banco,
 * que comprueba con la imagen que se ve lo que se dice, y para las pruebas.
 */
export interface Nombrado {
  readonly sitio: SitioDelPaisaje;
  /** La clave de la primera frase que lo nombra. */
  readonly clave: string;
  readonly como: ComoSeVe;
  readonly lado: "izquierda" | "derecha" | null;
  /** Segundos de escena. */
  readonly desde: number;
}

/** Si un sitio es de lo de debajo del avión: se mira hacia abajo, no hacia él. */
export const esDeAbajo = (sitio: SitioDelPaisaje): boolean =>
  sitio === "tierra-abajo" || sitio === "mar-abajo" || sitio === "nubes-abajo";

/**
 * **El plano con el que se enseña un sitio**, según desde dónde se vea: la
 * ventanilla, la cara contra el cristal —mirando hacia él, o hacia abajo si es
 * lo de debajo— o el avión por fuera con el sitio al fondo.
 */
export function planoParaVer(como: ComoSeVe, sitio: SitioDelPaisaje): Plano {
  if (como === "ventanilla") return "ventanilla";
  if (como === "asomado") return esDeAbajo(sitio) ? "asomado-abajo" : "asomado-paisaje";
  return "fuera-paisaje";
}

/** Lo que la escena deja ver: para el dibujo, la cámara, el banco y las pruebas. */
export interface EstadoDelPasaje {
  readonly momento: MomentoDelPasaje;
  /** Qué se dibuja para mirar, o `null`. */
  readonly mira: QueMirar | null;
  /** La última frase pedida: el subtítulo. */
  readonly linea: Linea | null;
  readonly hablando: boolean;
  readonly puedeSeguir: boolean;
  readonly terminado: boolean;
  /** Segundos de escena. */
  readonly segundos: number;
  /** Los momentos dichos, en orden, y los que se saltaron por pasarse. */
  readonly dichos: readonly MomentoDelPasaje[];
  readonly saltados: readonly MomentoDelPasaje[];
  /** Las charlas dichas, en orden. */
  readonly charlas: readonly CharlaDelPasaje[];
  /** Lo señalado por la ventanilla, por su clave. */
  readonly senalados: readonly string[];
  /** **El plano de ahora**, y desde cuándo. Ver `Plano`. */
  readonly plano: Plano;
  readonly planoDesde: number;
  /** Todos los cambios de plano, en orden: el primero es la ventanilla. */
  readonly planos: readonly CambioDePlano[];
  /**
   * **El sitio del paisaje que se está enseñando**, en los planos que lo
   * buscan —`asomado-paisaje` y `fuera-paisaje`—; si no, `null`. Es adonde
   * mira la cámara. Ver `SitioDelPaisaje`.
   */
  readonly paisaje: SitioDelPaisaje | null;
  /** Lo nombrado del paisaje, y cómo se veía cuando se nombró. Ver `Nombrado`. */
  readonly nombrados: readonly Nombrado[];
  /** **El dibujo de la ventanita** de ahora, o `null`. */
  readonly dibujo: string | null;
  /** Si lo que suena ahora es la megafonía. Ver `megafoniaSuena`. */
  readonly megafonia: boolean;
  /** **El kit de viaje**, y sus juegos. Ver `kit-de-viaje.ts`. */
  readonly kit: EstadoDelKit;
  /**
   * **Si Ara duerme ahora**, y sus siestas, de cuándo a cuándo en s de
   * escena: mientras duerme no se cuenta nada, y el juego funde la pantalla y
   * deja pasar el vuelo deprisa. Ver `puedeDormirse`.
   */
  readonly durmiendo: boolean;
  readonly siestas: readonly Siesta[];
  /** **La luz del cinturón, apagada en el puesto**, y la gente de la cabina. Ver `gente`. */
  readonly luzApagada: boolean;
  readonly gente: GenteDeLaCabina;
  /** **Si Ara fue al baño**, con la luz apagada. Ver `puedeIrAlBano`. */
  readonly fueAlBano: boolean;
  /** **El botón de adelantar** (⏩). Ver `adelanto`. */
  readonly adelanto: EstadoDelAdelanto;
}

/** Una siesta de Ara, s de escena; `hasta` es `null` mientras dura. */
export interface Siesta {
  readonly desde: number;
  readonly hasta: number | null;
  /** Si despertó para bajar: entonces despierta a Ara la tripulante. */
  readonly paraBajar: boolean;
  /** **Qué despertó a Ara**: el *ding* de la luz que se apaga, la tripulante para bajar u otra cosa que llegó. */
  readonly porQue?: "ding" | "tripulante" | "otra";
}

/**
 * **El modo rápido** (⏩), lo que deja ver la escena:
 *
 * - `sale`: si el botón está a la vista ahora;
 * - `puesto`: si el modo rápido está puesto, corra o no en este momento;
 * - `adelantando`: si el vuelo corre ahora mismo;
 * - `falta`: lo que falta para lo siguiente que hay que contar o ver, s de
 *   vuelo, o `null` si no se está en calma;
 * - `pulsado`: cuántas veces se puso;
 * - `llegada`: s de escena desde que empezó la llegada —ver
 *   `EMPIEZA_LA_LLEGADA`—, o `null` si todavía no: desde ahí el botón no
 *   vuelve, y si estaba puesto se apagó solo (`seApagoSolo`);
 * - `ratos`: los ratos corriendo, s de escena, para el banco y las pruebas.
 */
export interface EstadoDelAdelanto {
  readonly sale: boolean;
  readonly puesto: boolean;
  readonly adelantando: boolean;
  readonly falta: number | null;
  readonly pulsado: number;
  readonly llegada: number | null;
  readonly seApagoSolo: boolean;
  readonly ratos: readonly { readonly desde: number; readonly hasta: number | null }[];
}

/**
 * **El vuelo dentro de un rato**, s de vuelo, contado con lo que ya se sabe:
 * la subida hasta nivelar, el crucero hasta el punto de descenso y la bajada
 * por su senda, con la cabina que baja, los motores al ralentí, el frío de
 * arriba y la capa de nubes por donde se cruce. Lo demás —el mar de debajo,
 * el giro, lo que se ve—, como está ahora. Es con lo que la escena mira qué
 * viene antes de dejar adelantar: ver `adelanto`.
 */
export function proyectar(l: LecturaDelPasaje, dt: number): LecturaDelPasaje {
  let tramo = l.tramo;
  let enTramo = l.enTramo + dt;
  let altitud = l.altitud + l.vertical * dt;
  let vertical = l.vertical;
  let cabina = l.cabina;
  let potencia = l.potencia;
  let conEstaPotencia = l.conEstaPotencia === undefined ? undefined : l.conEstaPotencia + dt;
  const nivela = l.hastaElCrucero;
  const baja = l.hastaLaBajada;
  if (tramo === "subida" && nivela !== undefined && dt >= nivela) {
    tramo = "crucero";
    enTramo = dt - nivela;
    altitud = l.altitud + Math.max(0, l.vertical) * nivela;
    vertical = 0;
    cabina = 0;
  }
  if (tramo === "crucero" && baja !== undefined && dt >= baja) {
    // Por la senda: lo que queda de altura repartido en lo que queda de camino.
    const aTocar = Math.max(1000, l.faltaParaTocar - l.porElSuelo * baja);
    const arriba = altitud;
    tramo = "bajada";
    enTramo = dt - baja;
    vertical = (-l.porElSuelo * arriba) / aTocar;
    altitud = arriba + vertical * (dt - baja);
    cabina = LA_CABINA_BAJANDO;
    potencia = "ralenti";
    conEstaPotencia = dt - baja;
  }
  const n = l.nubes;
  const enLaCapa = !!n && altitud > n.base && altitud < n.techo;
  return {
    ...l,
    tramo,
    enTramo,
    altitud,
    altura: l.altura + (altitud - l.altitud),
    vertical,
    cabina,
    faltaParaTocar: l.faltaParaTocar - l.porElSuelo * dt,
    enNube: enLaCapa ? Math.max(l.enNube, 1) : 0,
    ...(l.meneo !== undefined || enLaCapa ? { meneo: enLaCapa ? Math.max(l.meneo ?? 0, 0.8) : l.meneo } : {}),
    ...(l.temperatura !== undefined ? { temperatura: l.temperatura - (altitud - l.altitud) * ENFRIA_AL_SUBIR } : {}),
    ...(potencia !== undefined ? { potencia } : {}),
    ...(conEstaPotencia !== undefined ? { conEstaPotencia } : {}),
    hastaElCrucero: tramo === "subida" && nivela !== undefined ? Math.max(0, nivela - dt) : undefined,
    hastaLaBajada: tramo !== "bajada" && baja !== undefined ? Math.max(0, baja - dt) : undefined,
  };
}

/** Cuánto se queda el dibujo de mirar después de decirlo, s. */
const SE_QUEDA_EL_DIBUJO = 14;

export class VueloDePasaje {
  private indice = 0;
  private reloj = 0;
  private acabado = false;
  private seguirPedido = false;
  private readonly charla: Conversacion;
  private readonly dichos: MomentoDelPasaje[] = [];
  private readonly saltados: MomentoDelPasaje[] = [];
  private readonly cuandoSeDijo = new Map<MomentoDelPasaje, number>();
  private readonly charlasDichas: CharlaDelPasaje[] = [];
  private mira: QueMirar | null = null;
  private miraDesde = 0;
  private callada = 0;
  /** Cuándo se pidió «sentados para el despegue» y cuándo se alineó, en el reloj de pared. */
  private enLaEsperaDesde: number | null = null;
  private alineadoDesde: number | null = null;
  /** Lo señalado que espera turno, y desde cuándo espera. Ver `ESPERA_A_QUE_SE_VEA`. */
  private readonly porSenalar: { readonly s: Senalado; readonly desde: number }[] = [];
  private readonly senalados: string[] = [];
  /** Lo señalado que se dejó sin decir porque no llegó a verse. */
  private readonly olvidados: string[] = [];
  private plano: Plano = "ventanilla";
  private planoDesde = 0;
  private paisaje: SitioDelPaisaje | null = null;
  private readonly planos: CambioDePlano[] = [{ plano: "ventanilla", desde: 0 }];
  private readonly nombrados: Nombrado[] = [];
  /**
   * **Lo que Ara contesta a lo señalado, esperando a que se haya oído**: su
   * frase y las que tienen que haber sonado antes. Ver `decirLoSenalado`.
   */
  private contestacion: { readonly linea: Linea; readonly oir: readonly string[]; readonly desde: number } | null = null;
  /** Si ya se contó qué es el Teide: ver la charla `altoRapido`. */
  private teideContado = false;
  /** Y si ya se explicó el plop de los oídos de la subida: ver el momento `tcpNubes`. */
  private plopContado = false;
  /** Y si la tripulante ya contó lo que sabe hacer: ver `EL_OFICIO`. */
  private oficioDicho = false;
  /** Y si Ara ya fue al baño: ver `puedeIrAlBano`. */
  private alBano = false;

  private dibujo: string | null = null;
  private dibujoDe: Linea | null = null;
  /**
   * **El kit de viaje de Ara**: lo trae la tripulante en la bajada, se pausa
   * con la megafonía y se recoge para aterrizar. Lo que se toca se lo pasa el
   * dibujo directamente; lo que dice va por esta conversación, como todo.
   */
  readonly kit = new KitDeViaje();
  private kitAbierto = false;
  /** La luz verde ganada que está a la vista, y cuándo se vio ganada, s de escena. Ver `atenderAlKit`. */
  private luzGanada: { readonly juego: JuegoDeLaLuz; readonly en: number } | null = null;
  private juegoDelKit: KitDeViaje["juegoDeAhora"] = null;
  /** **La siesta de Ara**: la de ahora, si duerme, y todas. Ver `puedeDormirse`. */
  private siestaDeAhora: { desde: number; hasta: number | null; paraBajar: boolean; porQue?: Siesta["porQue"] } | null = null;
  private readonly siestas: { desde: number; hasta: number | null; paraBajar: boolean; porQue?: Siesta["porQue"] }[] = [];
  /** Si lo último que se pidió es el bostezo: al acabar, Ara cierra los ojos. */
  private bostezando = false;
  /** Si Ara se acaba de despertar con el *ding*: lo dice detrás del «ya estamos arriba». */
  private despiertaConElDing = false;
  /** Si lo que quedaba del plop explicado se apartó para el anuncio de la bajada. */
  private plopAplazado = false;
  /**
   * **El modo rápido**: si está puesto, si corre ahora, lo que falta y cuándo
   * se miró, si el botón se puede ver, cuándo empezó la llegada y los ratos
   * corriendo. Ver `adelanto`.
   */
  private rapido = false;
  private adelantando = false;
  private falta: number | null = null;
  private faltaMiradaEn = -Infinity;
  private pulsado = 0;
  private disponible = false;
  private llegadaDesde: number | null = null;
  private apagadoSolo = false;
  private readonly ratos: { desde: number; hasta: number | null }[] = [];

  constructor(
    voz: VozDelInicio,
    private readonly opciones: {
      /** El lado de la ventanilla de Ara. */
      readonly lado?: "izquierda" | "derecha";
      /**
       * **El reloj de las voces**, s: el de pared mientras se juega. Lo que
       * espera a que algo suene se mide con él, que una grabación dura lo que
       * dura aunque el reloj del juego vaya acelerado. Sin decir, el de la
       * escena. Ver `TOPE_DE_UNA_FRASE`.
       */
      readonly pared?: () => number;
    } = {},
  ) {
    this.charla = new Conversacion(voz, () => this.reloj, () => this.pared());
  }

  private pared(): number {
    return this.opciones.pared?.() ?? this.reloj;
  }

  private get def(): DefMomento {
    return GUION_DEL_PASAJE[Math.min(this.indice, GUION_DEL_PASAJE.length - 1)]!;
  }

  get segundos(): number {
    return this.reloj;
  }

  /** Cuánto lleva la escena sin que hable nadie, s. */
  get callaDesde(): number {
    return this.callada;
  }

  /** Si ese momento ya se dijo. */
  dicho(id: MomentoDelPasaje): boolean {
    return this.cuandoSeDijo.has(id);
  }

  /** Si ese momento se saltó por pasarse de su momento. */
  saltado(id: MomentoDelPasaje): boolean {
    return this.saltados.includes(id);
  }

  /** Si esa charla ya se dijo. */
  dichaLaCharla(id: CharlaDelPasaje): boolean {
    return this.charlasDichas.includes(id);
  }

  /**
   * **Si ya se ha contado qué es el Teide**, lo primero de todo: lo cuenta la
   * comandante al señalarlo por la ventanilla, o antes de decir que se vuela
   * más alto que él. Ver la charla `altoRapido`.
   */
  get teidePresentado(): boolean {
    return this.teideContado;
  }

  /**
   * **Si ya se explicó el plop de los oídos de la subida**: entonces, al bajar,
   * Ara ya sabe que es al revés. Ver los momentos `tcpNubes` y `oidos`.
   */
  get plopExplicado(): boolean {
    return this.plopContado;
  }

  /** **Si la tripulante ya contó lo que sabe hacer**, bajando o en el puesto: una vez. */
  get oficioContado(): boolean {
    return this.oficioDicho;
  }

  /** **Si Ara ya fue al baño**, con la luz apagada: una vez. Ver `puedeIrAlBano`. */
  get fueAlBano(): boolean {
    return this.alBano;
  }

  /**
   * **Si Ara puede ir al baño ahora** (punto 293). La luz manda: encendida, no
   * se levanta nadie; apagada, se puede. Así que hace falta todo esto:
   *
   * - que Ara lo haya pedido y la tripulante le haya dicho que le acompaña,
   *   que es lo de la revisión;
   * - **la luz del cinturón apagada**, la del cartel;
   * - en crucero, y con crucero por delante para ir y volver antes de empezar a
   *   bajar —ver `LO_QUE_PIDE_EL_BANO`—: al bajar se enciende la luz, y la
   *   tripulante lo sabe. Sin saber cuánto queda —las pruebas que no lo dan—,
   *   basta con estar en crucero.
   */
  puedeIrAlBano(l: LecturaDelPasaje): boolean {
    return (
      !this.alBano &&
      this.dicho("revision") &&
      !l.enTierra &&
      l.tramo === "crucero" &&
      luzApagada(l, this) &&
      (l.hastaLaBajada ?? Infinity) >= LO_QUE_PIDE_EL_BANO
    );
  }

  /**
   * **Si la comandante ya apagó la luz del cinturón en el puesto**: lo mira el
   * juego en cada fotograma para apagar el cartel, con su *ding*. Ver el
   * momento `luz` y `Cinturon.paso`.
   */
  get luzApagadaEnElPuesto(): boolean {
    return this.dicho("luz");
  }

  /**
   * **Cómo anda la gente de la cabina** en el puesto (punto 303): sentada, los
   * impacientes que se sueltan y se levantan con la luz todavía encendida, y
   * todo el mundo de pie cuando se apaga. Lo que suena lo pone el juego. Ver
   * `audio/gente-del-pasaje.ts`.
   */
  get gente(): GenteDeLaCabina {
    if (this.dicho("luz")) return "de-pie";
    if (this.dicho("impacientes")) return "impacientes";
    return "sentada";
  }

  /**
   * **Cómo se ve ahora un sitio del paisaje.** Lo sabe el juego —ver
   * `LecturaDelPasaje.ver`—; sin él, todo se ve por la ventanilla y por el
   * lado de Ara, que es lo que hacen las pruebas que no miran el paisaje.
   */
  comoSeVe(sitio: SitioDelPaisaje, l: LecturaDelPasaje, plano?: Plano, lado?: "izquierda" | "derecha"): VistaDelSitio {
    return (
      l.ver?.(sitio, plano) ?? {
        como: plano && esDeFuera(plano) ? "fuera" : plano && plano !== "ventanilla" ? "asomado" : "ventanilla",
        lado: lado ?? this.opciones.lado ?? LADO_DE_ARA,
      }
    );
  }

  /** Si un sitio del paisaje se ve ahora de alguna manera. */
  seVe(sitio: SitioDelPaisaje, l: LecturaDelPasaje): boolean {
    return this.comoSeVe(sitio, l).como !== null;
  }

  /** Si un alabeo baja el ala del lado de Ara. */
  bajaMiAla(alabeo: number): boolean {
    return (this.opciones.lado ?? LADO_DE_ARA) === "izquierda" ? alabeo < 0 : alabeo > 0;
  }

  /** Cuánto hace que se dijo ese momento, s, o −∞ si no se dijo. */
  desdeQueSeDijo(id: MomentoDelPasaje): number {
    const t = this.cuandoSeDijo.get(id);
    return t === undefined ? -Infinity : this.reloj - t;
  }

  get estado(): EstadoDelPasaje {
    const fin = this.def.id === "fin";
    return {
      momento: this.def.id,
      mira: this.mira,
      linea: this.charla.ultima,
      hablando: !this.charla.callada,
      puedeSeguir: fin && this.charla.callada,
      terminado: this.acabado,
      segundos: this.reloj,
      dichos: [...this.dichos],
      saltados: [...this.saltados],
      charlas: [...this.charlasDichas],
      senalados: [...this.senalados],
      plano: this.plano,
      planoDesde: this.planoDesde,
      planos: [...this.planos],
      paisaje: this.paisaje,
      nombrados: [...this.nombrados],
      dibujo: this.dibujo,
      megafonia: this.megafoniaSuena,
      kit: this.kit.estado,
      durmiendo: this.durmiendo,
      siestas: this.siestas.map((s) => ({ ...s })),
      luzApagada: this.luzApagadaEnElPuesto,
      gente: this.gente,
      fueAlBano: this.alBano,
      adelanto: this.adelanto,
    };
  }

  /** **Si Ara duerme ahora.** Lo mira el juego en cada fotograma: ver `frame` en `game.ts`. */
  get durmiendo(): boolean {
    return this.siestaDeAhora !== null;
  }

  /**
   * **El modo rápido** (⏩), aprobado por Enrique: «en casa, jugando al
   * simulador, se aburren». Un toque lo pone y otro lo quita, y mientras está
   * puesto el vuelo corre **en cada rato en que no hay nada que contar ni que
   * ver**, y se para solo antes de lo siguiente para que se oiga y se vea a su
   * velocidad. El primer botón, el de T54, solo salía con medio minuto de
   * silencio por delante, y el vuelo va contado de seguido: casi nunca salía.
   *
   * - **Corre solo cuando no va a pasar nada en un rato**: la escena sabe qué
   *   viene —el siguiente momento del guion, lo que se cuenta cuando viene a
   *   cuento, el siguiente cambio de tramo o de gas, el principio de la
   *   llegada— y lo busca en el vuelo de dentro de un rato, ver `proyectar`.
   *   Si falta menos de `CORRE_SI_FALTAN`, no echa a correr.
   * - **Se para solo** a `PARA_ANTES` de lo siguiente; y en cuanto alguien
   *   habla, se cambia de plano o hay algo señalado por la ventanilla,
   *   también. Pasado lo que se cuenta, y su rato de asentarse, sigue.
   * - **Nunca se salta nada**: lo que corre es el vuelo, de verdad, y lo que
   *   se tiene que contar o ver llega con el vuelo a su paso.
   * - **Ni en tierra, ni con Ara durmiendo** —la siesta ya pasa deprisa—, **ni
   *   con el tren o los flaps fuera**, ni con el gas de despegue.
   * - **Y la llegada se vive entera**: en la subida y en lo alto de la bajada,
   *   sí; desde los diez mil pies bajando —ver `EMPIEZA_LA_LLEGADA`— se apaga
   *   solo y el botón ya no vuelve en ese vuelo.
   *
   * Lo deprisa que va lo pone el juego, que es quien sabe lo que aguanta la
   * máquina: ver `frame` en `game.ts`.
   */
  get adelanto(): EstadoDelAdelanto {
    return {
      sale: this.disponible,
      puesto: this.rapido,
      adelantando: this.adelantando,
      falta: this.faltaAhora,
      pulsado: this.pulsado,
      llegada: this.llegadaDesde,
      seApagoSolo: this.apagadoSolo,
      ratos: this.ratos.map((r) => ({ ...r })),
    };
  }

  /**
   * **El botón ⏩ en la pantalla**, lo justo para pintarlo en cada fotograma:
   * si sale, si el modo está puesto, si corre ahora y si se acaba de apagar
   * solo al empezar la llegada —entonces vuelve a su estado y se va—.
   */
  get boton(): { readonly sale: boolean; readonly puesto: boolean; readonly corre: boolean; readonly seVa: boolean } {
    return { sale: this.disponible, puesto: this.rapido, corre: this.adelantando, seVa: this.apagadoSolo && this.llegadaDesde !== null };
  }

  /** Si el vuelo corre ahora: lo mira el juego en cada paso. */
  get adelantaAhora(): boolean {
    return this.adelantando;
  }

  /**
   * **Quien juega toca el botón**: pone el modo rápido si se puede, o lo
   * quita si estaba puesto. Devuelve si queda puesto.
   */
  adelantar(si: boolean = !this.rapido): boolean {
    if (si && !this.disponible) return false;
    if (si && !this.rapido) this.pulsado++;
    this.rapido = si;
    if (!si) this.parar();
    return si;
  }

  /** Lo que falta para lo siguiente, s de vuelo, contando lo que pasó desde que se miró. */
  private get faltaAhora(): number | null {
    return this.falta === null ? null : Math.max(0, this.falta - (this.reloj - this.faltaMiradaEn));
  }

  /** El vuelo deja de correr, y se apunta hasta cuándo corrió. */
  private parar(): void {
    if (!this.adelantando) return;
    this.adelantando = false;
    const r = this.ratos[this.ratos.length - 1];
    if (r && r.hasta === null) r.hasta = this.reloj;
  }

  /**
   * **Un paso del modo rápido**: si el botón se puede ver, si empieza la
   * llegada —y entonces se apaga solo, para siempre—, qué viene, y si el
   * vuelo corre o se para a tiempo.
   */
  private atenderAlAdelanto(l: LecturaDelPasaje): void {
    if (this.llegadaDesde === null && !l.enTierra && enLaLlegada(l, this)) {
      this.llegadaDesde = this.reloj;
      this.apagadoSolo = this.rapido;
      this.rapido = false;
    }
    this.disponible = this.sePuedeCorrer(l);
    if (!this.disponible || !this.rapido || !this.enCalma(l)) {
      this.falta = null;
      this.parar();
      return;
    }
    if (this.falta === null || this.reloj - this.faltaMiradaEn >= ADELANTO.MIRA_CADA) {
      this.falta = this.loQueFalta(l);
      this.faltaMiradaEn = this.reloj;
    }
    const falta = this.faltaAhora ?? 0;
    if (this.adelantando && falta <= ADELANTO.PARA_ANTES) this.parar();
    else if (!this.adelantando && falta >= ADELANTO.CORRE_SI_FALTAN) {
      this.adelantando = true;
      this.ratos.push({ desde: this.reloj, hasta: null });
      if (this.ratos.length > ADELANTO.RATOS) this.ratos.shift();
    }
  }

  /**
   * **Si el modo rápido vale ahora**, y por eso el botón está a la vista: en
   * el aire, con el tren y los flaps dentro y sin el gas de despegue, sin Ara
   * durmiendo ni bostezando, y antes de la llegada. Con el modo puesto, lo
   * que no se ve no corre.
   */
  private sePuedeCorrer(l: LecturaDelPasaje): boolean {
    if (this.acabado || this.durmiendo || this.bostezando || this.def.id === "fin" || this.llegadaDesde !== null) return false;
    if (!volando(l) || enLaFinal(l) || cabinaPreparada(l, this)) return false;
    return l.flaps <= 0.05 && (l.tren ?? 0) <= 0.05 && l.potencia !== "despegue";
  }

  /**
   * **Si el vuelo está en calma**: sin nadie hablando ni a punto de hablar,
   * en la ventanilla, sin el kit en las manos, y nada del guion que ya toque.
   */
  private enCalma(l: LecturaDelPasaje): boolean {
    if (!this.charla.callada || this.reloj < this.enCorteHasta || this.plano !== "ventanilla") return false;
    if (this.porSenalar.length > 0 || this.contestacion || this.kit.estaAbierto || this.kit.ocupaAAra) return false;
    if (!this.adelantando && this.callada < ADELANTO.CALLA_PARA_ADELANTAR) return false;
    return !this.def.cuando(l, this);
  }

  /**
   * **Cuánto falta para lo siguiente que hay que contar o ver**, s de vuelo,
   * hasta `MIRA_HASTA`: lo que ya viene a cuento y espera su silencio, y lo que
   * vendrá —el siguiente momento del guion, una charla, un cambio de tramo o
   * de gas, la llegada— en el vuelo de dentro de un rato. Lo que ya viene a cuento pero
   * espera a verse —el mar entre las nubes— no se sabe cuándo llega: si llega
   * adelantando, empieza a hablar, y el juego vuelve a su paso.
   */
  private loQueFalta(l: LecturaDelPasaje): number {
    let falta: number = ADELANTO.MIRA_HASTA;
    const yaVienen = new Set<CharlaDelPasaje>();
    for (const c of CHARLAS_DEL_PASAJE) {
      if (this.charlasDichas.includes(c.id) || !c.cuando(l, this) || c.caduca?.(l, this)) continue;
      yaVienen.add(c.id);
      if (this.callada < this.trasDe(c)) falta = Math.min(falta, this.trasDe(c) - this.callada);
    }
    for (const dt of PASOS_DE_MIRAR) {
      if (dt >= falta) break;
      const p = proyectar(l, dt);
      const e = this.dentroDe(dt);
      if (p.tramo !== l.tramo || p.potencia !== l.potencia) return dt;
      // Y la llegada, que se vive a su paso desde el primer metro.
      if (enLaLlegada(p, e)) return dt;
      if (this.def.cuando(p, e) && !this.def.caduca?.(p, e)) return dt;
      for (const c of CHARLAS_DEL_PASAJE)
        if (!this.charlasDichas.includes(c.id) && !yaVienen.has(c.id) && c.cuando(p, e) && !c.caduca?.(p, e)) return dt;
    }
    return falta;
  }

  /** **La escena dentro de un rato**, s, si nadie dice nada: para mirar qué viene. */
  private dentroDe(dt: number): VueloDePasaje {
    return Object.create(this, {
      reloj: { value: this.reloj + dt },
      callada: { value: this.callada + dt },
    }) as VueloDePasaje;
  }

  /**
   * **Si lo que suena ahora es la megafonía**: un anuncio, la comandante o la
   * tripulación por el altavoz del techo, también mientras se lee sin voz.
   * Con eso se pausa el kit y se calla el hilo musical.
   */
  get megafoniaSuena(): boolean {
    return this.charla.suena?.megafonia === true;
  }

  get registro(): readonly Readonly<FraseDicha>[] {
    return this.charla.registro;
  }

  /** La boca se vació por su cuenta: ver `Conversacion.retomar`. */
  retomarLaVoz(): void {
    this.charla.retomar();
  }

  /** Quien juega toca el botón del final. */
  seguir(): void {
    if (this.def.id === "fin") this.seguirPedido = true;
  }

  /**
   * **Si ahora se puede señalar algo por la ventanilla**: arriba —del cartel
   * apagado, o pasados los diez mil pies, hasta la bajada—, sin nadie
   * hablando y sin otro sitio esperando turno. Es lo que el juego le pasa a
   * `LoQueSeVe` como «alguien habla», para que elija el momento. Ver
   * `mirarPorLaVentanilla` en `game.ts`.
   */
  get puedeSenalar(): boolean {
    return (
      !this.contestacion &&
      // Ni con Ara cerrando los ojos o durmiendo: lo que no ve, no se le señala.
      !this.bostezando &&
      !this.durmiendo &&
      (this.dicho("arriba") || this.dicho("nubesRespuesta")) &&
      !this.dicho("aproximacion") &&
      this.charla.callada &&
      this.porSenalar.length === 0 &&
      !this.acabado
    );
  }

  /**
   * **Lo que el juego acaba de ver por la ventanilla**: se dice en cuanto se
   * pueda, si entonces se sigue viendo. Ver `ESPERA_A_QUE_SE_VEA`.
   */
  senalar(s: Senalado): void {
    if (this.acabado) return;
    this.porSenalar.push({ s, desde: this.reloj });
  }

  /** Lo señalado que se dejó sin decir porque no llegó a verse a tiempo. */
  get olvidadosPorNoVerse(): readonly string[] {
    return this.olvidados;
  }

  /** Un paso de la escena. Devuelve lo que la escena deja hacer a la tripulación. */
  paso(dt: number, l: LecturaDelPasaje): PermisosDeLaEscena {
    this.reloj += dt;
    /*
     * El silencio de un corte de cámara también es silencio: con el corte a
     * una toma sin palabras —el señalero— la cuenta volvía a cero y lo que
     * esperaba su rato callado se quedaba sin él.
     */
    const enCorte = this.reloj < this.enCorteHasta && this.charla.vacia;
    this.callada = this.charla.callada || enCorte ? this.callada + dt : 0;
    if (!this.acabado) {
      this.charla.atender();
      this.avanzar(l);
      this.charla.atender();
      // Después de lo que empieza a sonar en este paso: si es la megafonía, el kit se pausa ya.
      this.atenderAlKit(dt, l);
    }
    this.atenderAlAdelanto(l);
    if (this.mira && this.reloj - this.miraDesde > SE_QUEDA_EL_DIBUJO && this.charla.callada) this.mira = null;
    this.mirarLaVentanita();
    return this.permisos(l);
  }

  /**
   * **El dibujo de la ventanita**: el de la frase que suena, mientras suena y
   * un poco después. Entre dos frases del mismo dibujo no se va —la
   * demostración entera pasa de dibujo en dibujo sin parpadear—, y una frase
   * sin dibujo lo quita. Lo mismo con una ilustración o la foto de una
   * historia, que van por el mismo sitio con su prefijo delante.
   */
  private mirarLaVentanita(): void {
    const suena = this.charla.callada ? null : this.charla.ultima;
    if (suena && suena !== this.dibujoDe) {
      this.dibujoDe = suena;
      this.dibujo = suena.dibujo ?? null;
    }
    /*
     * **Y la foto de una historia, solo mientras suena la voz que la cuenta**
     * (punto 287). Salía la foto del gomero silbando con la historia del silbo
     * sin sonar: la escena la daba por dicha —se lee el subtítulo el rato de
     * leerlo— y la ventanita ponía su foto igual. Una foto no sale sin la voz
     * que la cuenta: hasta que esa voz empieza, y si no llega a empezar, la
     * ventanita se queda como estaba. Los dibujos de lo que se explica sí
     * acompañan al subtítulo, que es lo que se lee mientras una frase nueva
     * espera su toma.
     */
    if (this.dibujoDe?.dibujo?.startsWith("foto:")) {
      const deVerdad = this.charla.suenaDeVerdad === this.dibujoDe;
      if (!deVerdad && this.dibujo === this.dibujoDe.dibujo) this.dibujo = null;
      else if (deVerdad) this.dibujo = this.dibujoDe.dibujo;
    }
    const seQueda = this.dibujo !== null && HASTA_LA_SIGUIENTE.has(this.dibujo);
    if (this.charla.callada && this.callada > SE_QUEDA_LA_VENTANITA && !seQueda) this.dibujo = null;
    /*
     * **Y con Ara durmiendo, el mapa de la ruta**, con el avión avanzando: es
     * como se ve que el vuelo sigue mientras pasa deprisa. Y al despertar se
     * queda con lo que dice Ara. Ver `ui/siesta.ts`.
     */
    if (this.siestaDeAhora) this.dibujo = "ruta";
  }

  /**
   * **Cambiar de plano**: si es un corte —de la ventanilla a fuera o al
   * revés, de un sitio de fuera a otro, o de la ventanilla al pasillo—, la
   * escena calla su rato. Ver `CORTE_DE_PLANO` y `esCorte`.
   */
  private ponerPlano(p: Plano, sitio: SitioDelPaisaje | null = null): void {
    // Los planos que buscan un sitio son otro plano con otro sitio: otra toma.
    const suyo = p === "asomado-paisaje" || p === "fuera-paisaje" ? sitio : null;
    if (p === this.plano && suyo === this.paisaje) return;
    const corte = esCorte(this.plano, p);
    this.plano = p;
    this.paisaje = suyo;
    this.planoDesde = this.reloj;
    this.planos.push({ plano: p, desde: this.reloj, ...(suyo ? { sitio: suyo } : {}) });
    if (this.planos.length > 120) this.planos.splice(1, 1);
    if (corte) {
      this.charla.esperar(CORTE_DE_PLANO);
      this.enCorteHasta = this.reloj + CORTE_DE_PLANO;
    }
  }

  /** Hasta cuándo dura el silencio del último corte, s de escena. */
  private enCorteHasta = 0;

  /**
   * **Cómo se ve lo que nombra un momento o una charla**: `undefined` si no
   * nombra nada del paisaje, `null` si nombra algo que ahora no se ve —y
   * entonces espera—, o desde dónde se ve. Lo que solo se enseña si se ve
   * —`muestra`— no espera: sin verse, se dice sin enseñarlo.
   */
  private vistaDe(def: DefMomento<string>, l: LecturaDelPasaje): VistaDelSitio | null | undefined {
    const sitio = def.nombra ?? def.muestra;
    if (!sitio) return undefined;
    const v = this.comoSeVe(sitio, l, def.plano);
    if (v.como !== null) return v;
    return def.nombra ? null : undefined;
  }

  /** Se dice lo de un momento o una charla: su plano, su dibujo de mirar y sus frases. */
  private decirDe(def: DefMomento<string>, l: LecturaDelPasaje, vista?: VistaDelSitio): void {
    const sitio = def.nombra ?? def.muestra ?? null;
    const plano =
      def.planoSegun?.(l, this) ?? def.plano ?? (vista?.como && sitio ? planoParaVer(vista.como, sitio) : "ventanilla");
    this.ponerPlano(plano, sitio);
    const lineas = def.segun?.(l, this) ?? def.lineas;
    if (sitio && vista?.como && lineas[0])
      this.apuntarLoNombrado(sitio, lineas[0].clave, vista);
    if (lineas.some((x) => x.clave === "inicio.mama.pasaje.teide")) this.teideContado = true;
    if (lineas.some((x) => EL_PLOP_EXPLICADO.includes(x))) this.plopContado = true;
    if (lineas.some((x) => EL_OFICIO.includes(x))) this.oficioDicho = true;
    if (lineas.includes(AL_BANO[0]!)) this.alBano = true;
    this.charla.decir(lineas);
    if (def.mira) {
      this.mira = def.mira;
      this.miraDesde = this.reloj;
    }
  }

  private apuntarLoNombrado(sitio: SitioDelPaisaje, clave: string, v: VistaDelSitio): void {
    if (!v.como) return;
    this.nombrados.push({ sitio, clave, como: v.como, lado: v.lado, desde: this.reloj });
    if (this.nombrados.length > 60) this.nombrados.shift();
  }

  private avanzar(l: LecturaDelPasaje): void {
    // Lo que se pasa de su momento se salta, aunque haya alguien hablando.
    while (this.def.id !== "fin" && this.def.caduca?.(l, this)) {
      this.saltados.push(this.def.id);
      this.indice++;
    }
    const def = this.def;
    if (def.id === "fin") {
      if (this.seguirPedido && this.charla.callada) {
        this.acabado = true;
        this.charla.callar();
      }
      if (this.charla.callada) this.volverALaVentanilla();
      return;
    }
    /*
     * Preparando la cabina para aterrizar ya no se señala nada: lo que
     * esperaba turno, se olvida. Hasta ahí, también bajando, que es cuando
     * mejor se ve: la cabina estéril de abajo la guarda `LoQueSeVe`.
     */
    if (this.dicho("aproximacion") || l.tramo === "final" || l.enTierra) this.porSenalar.length = 0;
    /*
     * Con Ara durmiendo no se cuenta nada: solo se mira si toca despertar. Ver
     * `atenderALaSiesta`. Y si lo que despierta es el *ding* de la luz, lo que
     * lo trae —el «ya estamos arriba»— se dice ahora mismo, más abajo.
     */
    if (this.siestaDeAhora) {
      this.atenderALaSiesta(l);
      if (this.siestaDeAhora || !this.despiertaConElDing) return;
    }
    /*
     * **Y empezar a bajar no espera al plop** (19-10-2026). La tripulante
     * explica el plop de la subida al final de lo suyo con las nubes, y en un
     * crucero de un minuto eso puede llegar al punto de descenso: el ralentí
     * sonaba y Ara ya no lo podía notar a tiempo, ni la luz del cinturón se
     * encendía. Lo que le queda por empezar de esa explicación se aparta, se
     * dice el anuncio de la bajada —con el ralentí que nota Ara— y la
     * tripulante lo acaba detrás, antes de los oídos, que es donde se engancha.
     */
    if (this.def.id === "bajada" && !this.plopAplazado && acabaDePonerse(l, "ralenti") && this.def.cuando(l, this)) {
      let quitado = false;
      this.charla.quitar((x) => {
        const es = EL_PLOP_EXPLICADO.includes(x);
        quitado ||= es;
        return es;
      });
      this.plopAplazado = quitado;
    }
    if (!this.charla.callada) return;
    /*
     * Acabado el bostezo, Ara cierra los ojos, si sigue sin haber nada que
     * contar: si mientras bostezaba llegó lo siguiente, no se duerme.
     */
    if (this.bostezando) {
      this.bostezando = false;
      if (this.puedeDormirse(l, true)) {
        this.dormirse();
        return;
      }
    }
    // Lo que Ara contesta a lo señalado, si se oyó lo que contesta. Ver `decirLoSenalado`.
    if (this.contestacion) {
      const c = this.contestacion;
      this.contestacion = null;
      if (this.seOyeronDesde(c.oir, c.desde)) {
        this.charla.decir([c.linea]);
        return;
      }
    }
    const vista = def.cuando(l, this) ? this.vistaDe(def, l) : undefined;
    if (!def.cuando(l, this) || this.esperaSuFase(def, l) || vista === null) {
      /*
       * Lo señalado por la ventanilla, en los huecos de lo que no ha llegado;
       * y si no hay, lo que venga a cuento. Menos en el del servicio, que va
       * pegado al cartel apagado: un crucero entre islas dura un minuto, y una
       * historia en medio se lo comía.
       */
      if (def.id === "servicio") return;
      if (this.atenderLoSenalado(l)) return;
      /*
       * Y con el kit en las manos, lo que se cuenta cuando viene a cuento
       * espera: una explicación encima de un juego es un ruido. Lo que tiene
       * su momento —el guion, lo de la ventanilla— sí se dice.
       */
      /*
       * Y si se va a dormir Ara, lo que puede esperar a que se despierte
       * espera: con un rato de silencio llegaba antes que el sueño, y se
       * comía la siesta. Ver `PUEDEN_ESPERAR`.
       */
      const esperan = this.puedeDormirse(l, false, true) ? PUEDEN_ESPERAR : undefined;
      const charla = this.kit.ocupaAAra ? undefined : this.charlaQueToca(l, esperan);
      if (charla) {
        this.charlasDichas.push(charla.def.id);
        this.decirDe(charla.def, l, charla.vista);
        return;
      }
      // Y si no hay nada que contar en un buen rato, Ara bosteza. Ver `puedeDormirse`.
      if (this.puedeDormirse(l)) {
        this.bostezar();
        return;
      }
      this.volverALaVentanilla();
      return;
    }
    this.decirDe(def, l, vista ?? undefined);
    this.dichos.push(def.id);
    this.cuandoSeDijo.set(def.id, this.reloj);
    this.indice++;
    // Y lo que quedó de la explicación del plop, detrás del anuncio de la bajada.
    if (def.id === "bajada" && this.plopAplazado) {
      this.plopAplazado = false;
      this.charla.decir(EL_PLOP_EXPLICADO);
    }
    // Y Ara, a quien acaba de despertar el *ding*, detrás: con el mapa de lo que se voló mientras dormía.
    if (this.despiertaConElDing) {
      this.despiertaConElDing = false;
      this.charla.decir([SE_DESPIERTA]);
    }
  }

  /**
   * **Lo señalado por la ventanilla, si se ve.** El juego lo vio y lo dio,
   * pero entre eso y el hueco para decirlo el avión puede meterse en una nube
   * o girar: se mira otra vez, y si no se ve, espera su rato sin quitarle el
   * turno a nadie; pasado el rato, se deja. Devuelve si se dijo.
   */
  private atenderLoSenalado(l: LecturaDelPasaje): boolean {
    const primero = this.porSenalar[0];
    if (!primero) return false;
    const v = this.comoSeVe(`hito:${primero.s.que}`, l, undefined, primero.s.lado);
    if (v.como !== null) {
      this.porSenalar.shift();
      this.decirLoSenalado(primero.s, v);
      return true;
    }
    if (this.reloj - primero.desde > ESPERA_A_QUE_SE_VEA) {
      this.porSenalar.shift();
      this.olvidados.push(primero.s.que);
    }
    return false;
  }

  /**
   * **Si esas frases sonaron**, dichas a partir de `desde`: sonaron de
   * verdad, con su voz, no solo se dejaron leer. Lo que contesta Ara espera a
   * esto. Ver `decirLoSenalado`.
   */
  private seOyeronDesde(claves: readonly string[], desde: number): boolean {
    const r = this.charla.registro;
    return claves.every((c) => r.some((d) => d.clave === c && d.desde >= desde - 1e-6 && d.como === "sono"));
  }

  /**
   * **El kit de viaje, al ritmo de lo que se dice**: aparece cuando la
   * tripulante lo da —al sonar su frase, no al pedirse—, se recoge cuando
   * pide guardarlo o, si eso no llegó, en la final; se pausa mientras habla la
   * megafonía y desde que se prepara la cabina; y lo que quieren decir sus
   * juegos va a la cola de la conversación, detrás de lo que hubiera. Lo que
   * esperaba turno de un juego que se cerró, se quita.
   */
  private atenderAlKit(dt: number, l: LecturaDelPasaje): void {
    const suena = this.charla.suena?.clave;
    if (suena === `inicio.tripulacion.pasaje.cerca.${KIT_DADO}` || this.charla.oida(`inicio.tripulacion.pasaje.cerca.${KIT_DADO}`))
      this.kit.dar();
    /*
     * Y la red, por si la frase no llegó a sonar: mil pies por debajo de los
     * diez mil, recogido igual. Una espera sin salida es un kit abierto en la
     * final.
     */
    if (
      suena === `inicio.tripulacion.pasaje.cerca.${KIT_GUARDADO}` ||
      enLaFinal(l) ||
      (l.enTierra && bajando(l.tramo)) ||
      (bajando(l.tramo) && l.altitud < DIEZ_MIL_PIES - KIT_POR_DEBAJO)
    )
      this.kit.recoger();
    /*
     * **Y la canción**, en cuanto se oyó el «¡aterrizaron todos!» de Ara con
     * la torre ganada a la vista: el de esta vez, no el de una partida de
     * antes. Antes del paso del kit, que si no el juego ganado se iba de la
     * pantalla en el mismo fotograma. Ver `KitDeViaje.cancion`.
     */
    const torre = this.kit.juegoDeAhora;
    if (torre instanceof JuegoDeLaLuz && torre.terminado) {
      if (this.luzGanada?.juego !== torre) this.luzGanada = { juego: torre, en: this.reloj };
      if (!this.kit.cancion?.suena && this.charla.oidaDesde(DICHO_DE_LA_LUZ.fin.clave, this.luzGanada.en - 1))
        this.kit.empezarLaCancion();
    }
    this.kit.paso(dt, {
      megafonia: this.megafoniaSuena || this.dicho("aproximacion"),
      callada: this.charla.callada,
      pared: this.pared(),
    });
    /*
     * Lo que un juego quería decir y no le llegó el turno se calla con él: al
     * cerrar el kit y al cambiar de juego. Sin esto, con las piezas puestas
     * deprisa, «¡el ala!» sonaba con el mapa del camino ya delante.
     */
    const abierto = this.kit.estaAbierto;
    const juego = this.kit.juegoDeAhora;
    if ((this.kitAbierto && !abierto) || juego !== this.juegoDelKit) this.charla.quitar(esDelKit);
    this.kitAbierto = abierto;
    this.juegoDelKit = juego;
    const lineas = this.kit.tomarLoQueDecir();
    if (lineas.length) this.charla.decir(lineas);
  }

  /**
   * La primera charla que viene a cuento ahora, si hay alguna. **Y lo que
   * nombra del paisaje, solo si se ve**: ver `SitioDelPaisaje`.
   */
  private charlaQueToca(
    l: LecturaDelPasaje,
    sin?: ReadonlySet<CharlaDelPasaje>,
  ): { def: DefCharla; vista?: VistaDelSitio } | undefined {
    for (const c of CHARLAS_DEL_PASAJE) {
      if (sin?.has(c.id)) continue;
      if (this.charlasDichas.includes(c.id) || this.callada < this.trasDe(c) || !c.cuando(l, this) || c.caduca?.(l, this))
        continue;
      const vista = this.vistaDe(c, l);
      if (vista === null) continue;
      return { def: c, ...(vista ? { vista } : {}) };
    }
    return undefined;
  }

  /** El silencio que espera una charla: el suyo, o menos si esperó a que Ara se despertara. */
  private trasDe(c: DefCharla): number {
    return this.siestas.length > 0 && !this.durmiendo ? (TRAS_AL_DESPERTAR[c.id] ?? c.tras) : c.tras;
  }

  /**
   * **Cuánto falta para lo siguiente que Ara tiene que oír**, s de vuelo,
   * y si es la bajada: lo que se puede dormir. Solo se sabe para dos momentos
   * del guion, que son los que llegan con el vuelo y no con lo que se dice:
   * el «ya estamos arriba» —al nivelar, más lo que espera nivelado— y el
   * empezar a bajar. Con cualquier otro por decir, o sin los dos números del
   * juego, `null`: no se duerme.
   */
  private ratoTranquilo(l: LecturaDelPasaje): { readonly segundos: number; readonly paraBajar: boolean } | null {
    const bajada = l.hastaLaBajada;
    if (bajada === undefined || !volando(l) || bajando(l.tramo)) return null;
    let guion: number;
    if (this.def.id === "arriba") {
      if (l.tramo === "crucero") guion = Math.max(0, ARRIBA_Y_NIVELADO - l.enTramo);
      else if (l.hastaElCrucero === undefined) return null;
      else guion = l.hastaElCrucero + ARRIBA_Y_NIVELADO;
    } else if (this.def.id === "bajada") guion = Infinity;
    else return null;
    return guion < bajada ? { segundos: guion, paraBajar: false } : { segundos: bajada, paraBajar: true };
  }

  /**
   * **Si Ara se duerme ahora** (punto 304 de la lista de Enrique). Lo pidió
   * al volar la escena entera: «la idea era que el niño no se aburra
   * esperando a aterrizar; esto tarda, y en un avión aguantan porque no les
   * queda otra, pero en casa se aburren. Que haga como que se duerme, un
   * fundido, rapidillo, y luego despierta y ha pasado un rato».
   *
   * Y se duerme como se duerme en un avión: **arriba y sin nada que mirar**,
   * con el ruidito de los motores. Así que hace falta todo esto:
   *
   * - **Arriba**, antes de bajar: pasados los diez mil pies y fuera de las
   *   nubes, subiendo o en crucero. **Bajando, nunca**: durmiendo se traga menos
   *   saliva, y al bajar es cuando la presión de la cabina empuja los oídos.
   *   Es lo que aconsejan los médicos —no dormirse para despegar ni para
   *   aterrizar—, y por eso la tripulación despierta a quien duerme.
   * - **Nada que decir ni que ver** (19-10-2026): nadie hablando desde hace
   *   `CALLA_PARA_DORMIRSE`, nada del guion a punto, nada señalado esperando y
   *   **lo que contesta a Ara ya dicho**: pasados los diez mil pies, la
   *   comandante explica las nubes y el gas de subida, y en cuanto acaba, Ara
   *   cierra los ojos. Lo que puede esperar —ver `PUEDEN_ESPERAR`— se cuenta al
   *   despertar, bajando por encima de los diez mil pies, donde sigue siendo
   *   verdad. Y si lo más bonito de la ruta está a la vista sin señalar —el
   *   Teide—, se espera a que lo señale la comandante.
   * - **Sin el kit en las manos**: quien está jugando no se aburre.
   * - **Y con rato por delante, de verdad**: lo que falta para lo siguiente que
   *   hay que oír —ver `ratoTranquilo`— da para el bostezo y una siesta de
   *   `SIESTA_MINIMA` como poco. Con la siesta de antes, de minuto y medio,
   *   Enrique se despertó viendo lo mismo que al dormirse: lo que se duerme
   *   tiene que notarse en el mapa y por la ventanilla.
   *
   * **Lo que hay que oír sí o sí no se lo come el sueño.** Lo que despierta a
   * Ara es lo que despierta a medio avión: el *ding* de la luz del cinturón
   * que se apaga con el «ya estamos arriba». Y si antes llegara la bajada, la
   * tripulante, que es lo que se hace de verdad. Ver `atenderALaSiesta`.
   *
   * Medido en el banco el 19-10-2026: de los diez mil pies al crucero son unos
   * cuatro minutos y medio de subida, y la comandante habla el primer medio.
   * Es el rato más largo en el que Ara puede dormir sin comerse nada: el
   * crucero dura un minuto y lleva el baño y el servicio, y en cuanto se
   * empieza a bajar están los oídos.
   *
   * Una vez por vuelo. Lo que se habría contado mientras duerme no se cuenta
   * después fuera de su momento: lo señalado no se señala —Ara no lo ve— y
   * lo que se cuenta cuando viene a cuento solo se cuenta si sigue viniendo.
   *
   * Con `trasElBostezo`, al acabar de bostezar: el silencio ya no cuenta, que
   * acaba de hablar Ara. Y con `soloElRato`, si va a poder dormirse en cuanto
   * haya el silencio y se haya visto lo que hay que ver: lo que puede esperar,
   * espera desde ya.
   */
  private puedeDormirse(l: LecturaDelPasaje, trasElBostezo = false, soloElRato = false): boolean {
    if (this.siestas.length > 0 || this.acabado || this.bostezando) return false;
    if (!volando(l) || l.tramo === "bajada" || l.altitud < DIEZ_MIL_PIES || l.enNube >= DENTRO_DE_LA_NUBE) return false;
    if (!trasElBostezo && !soloElRato && this.callada < CALLA_PARA_DORMIRSE) return false;
    if (this.porSenalar.length > 0 || this.contestacion || this.kit.estaAbierto || this.kit.ocupaAAra) return false;
    if (this.def.cuando(l, this)) return false;
    if (this.quedaPorContestar(l)) return false;
    const rato = this.ratoTranquilo(l);
    if (!rato) return false;
    const despierta = rato.paraBajar ? DESPIERTA_ANTES_DE_BAJAR : 0;
    if (rato.segundos < (trasElBostezo ? 0 : LO_QUE_DURA_EL_BOSTEZO) + SIESTA_MINIMA + despierta) return false;
    return trasElBostezo || soloElRato || this.callada >= ESPERA_A_LO_QUE_SE_VE || !this.quedaPorVer(l);
  }

  /**
   * **Si queda algo que contestar** antes de cerrar los ojos: una charla que ya
   * viene a cuento y no puede esperar a que Ara se despierte, como la del gas
   * de subida. Ver `PUEDEN_ESPERAR`.
   */
  private quedaPorContestar(l: LecturaDelPasaje): boolean {
    return CHARLAS_DEL_PASAJE.some(
      (c) => !PUEDEN_ESPERAR.has(c.id) && !this.charlasDichas.includes(c.id) && c.cuando(l, this) && !c.caduca?.(l, this),
    );
  }

  /** **Si lo más bonito de la ruta está a la vista sin señalar**: ver `SE_ENSENA_ANTES_DE_DORMIRSE`. */
  private quedaPorVer(l: LecturaDelPasaje): boolean {
    return SE_ENSENA_ANTES_DE_DORMIRSE.some(
      (que) => !this.senalados.includes(que) && !this.olvidados.includes(que) && this.seVe(`hito:${que}`, l),
    );
  }

  /** **Ara bosteza** y lo dice, mirando por la ventanilla: al acabar, cierra los ojos. */
  private bostezar(): void {
    this.ponerPlano("ventanilla");
    this.bostezando = true;
    this.mira = null;
    this.charla.decir([SE_DUERME]);
  }

  /** **Y se duerme**: desde aquí, la escena calla y el juego funde la pantalla. */
  private dormirse(): void {
    const s = { desde: this.reloj, hasta: null, paraBajar: false };
    this.siestaDeAhora = s;
    this.siestas.push(s);
    this.mira = null;
    // El modo rápido sigue puesto, pero durmiendo corre la siesta: ver `sePuedeCorrer`.
    this.parar();
  }

  /**
   * **Mientras Ara duerme**, solo se mira si toca despertar, y **lo que
   * despierta es algo que pasa de verdad** (19-10-2026):
   *
   * - **El *ding* de la luz del cinturón**, que se apaga con el «ya estamos
   *   arriba» de la comandante y despierta a medio avión. Ara se despierta
   *   en el paso en que toca decirlo, la comandante lo dice —con su *ding*— y
   *   Ara cuenta detrás que se durmió, con el mapa de lo que se voló. Ver
   *   `avanzar`.
   * - **La tripulante, si la bajada llega con Ara durmiendo** y sin *ding*: es
   *   lo que se hace de verdad, despertar al pasaje al empezar a bajar, por el
   *   cinturón y los oídos. Lo dice ella, `DESPIERTA_ANTES_DE_BAJAR` antes del
   *   punto de descenso, que es antes de que la cabina empiece a bajar.
   * - **Y cualquier otra cosa del guion que llegue**, o el vuelo que haga
   *   otra cosa: se despierta ya, por su cuenta.
   */
  private atenderALaSiesta(l: LecturaDelPasaje): void {
    const s = this.siestaDeAhora;
    if (!s) return;
    const toca = this.def.cuando(l, this);
    if (toca && this.def.id === "arriba") {
      this.despertar(s, "ding");
      this.despiertaConElDing = true;
      return;
    }
    const rato = this.ratoTranquilo(l);
    if (rato && !toca && (rato.paraBajar ? rato.segundos > DESPIERTA_ANTES_DE_BAJAR : true)) return;
    const paraBajar = rato ? rato.paraBajar : bajando(l.tramo) || this.def.id === "bajada";
    this.despertar(s, paraBajar ? "tripulante" : "otra");
    this.charla.decir(paraBajar ? [LA_DESPIERTAN, SE_DESPIERTA] : [SE_DESPIERTA]);
  }

  /** Se acabó la siesta, por lo que sea. */
  private despertar(s: { hasta: number | null; paraBajar: boolean; porQue?: Siesta["porQue"] }, porQue: NonNullable<Siesta["porQue"]>): void {
    s.hasta = this.reloj;
    s.paraBajar = porQue === "tripulante";
    s.porQue = porQue;
    this.siestaDeAhora = null;
  }

  /**
   * **Y de vuelta a la ventanilla**, en un silencio y pasado lo que dura el
   * plano: lo de fuera se queda a que se vea lo que se contaba, y Ara se
   * despega del cristal cuando acaba de mirar.
   */
  private volverALaVentanilla(): void {
    if (this.plano === "ventanilla") return;
    if (this.reloj - this.planoDesde < DURA_EL_PLANO[this.plano] || this.callada < 0.6) return;
    this.ponerPlano("ventanilla");
  }

  /**
   * **Lo señalado**: la comandante por la megafonía, su historia detrás, y Ara
   * si va por su lado. Lo que va por el otro lado lo cuenta la comandante
   * igual —le habla a todo el pasaje— y Ara no lo ve, así que no dice nada.
   */
  private decirLoSenalado(s: Senalado, v: VistaDelSitio): void {
    const sitio: SitioDelPaisaje = `hito:${s.que}`;
    this.ponerPlano(planoParaVer(v.como ?? "ventanilla", sitio), sitio);
    /*
     * **Y el lado de ahora**, no el de cuando se vio: si el avión giró, la
     * comandante manda mirar por donde está. Ver `Senalado.porLado`.
     */
    const lado = v.lado ?? s.lado;
    const dicho = s.porLado?.[lado] ?? s.dicho;
    if (v.como) this.apuntarLoNombrado(sitio, dicho.clave, v);
    if (s.que === "teide") this.teideContado = true;
    const lineas: Linea[] = [
      { quien: "mama", clave: dicho.clave, megafonia: true, texto: dicho.texto, relleno: dicho.relleno },
    ];
    if (s.historia)
      lineas.push({
        quien: "mama",
        clave: s.historia.clave,
        megafonia: true,
        texto: s.historia.texto,
        relleno: s.historia.relleno,
        // Y su ilustración en la ventanita, la de las historias de cualquier vuelo.
        ...(s.historia.sitio ? { dibujo: `foto:${s.historia.sitio}` } : {}),
      });
    const suLado = lado === (this.opciones.lado ?? LADO_DE_ARA);
    if (suLado) {
      const suya = LO_QUE_DICE_ARA[s.que];
      /*
       * **Y Ara contesta a lo que se ha oído** (punto 287): se ponía a la cola
       * con lo demás, y «¿hablar silbando?» salía detrás de una historia del
       * silbo que no había sonado. Así que espera a que acabe lo de la
       * comandante, y solo si sonó: lo que la señala y, si contesta a la
       * historia, la historia.
       */
      const oir = [dicho.clave, ...(s.historia && CONTESTA_A_LA_HISTORIA.has(s.que) ? [s.historia.clave] : [])];
      this.contestacion = { linea: suya ? ara(suya) : LO_VEO, oir, desde: this.reloj };
      this.mira = "ventanilla";
      this.miraDesde = this.reloj;
    }
    this.senalados.push(s.que);
    this.charla.decir(lineas);
  }

  /**
   * **Lo que se deja hacer a la tripulación**: arrancar con los toboganes
   * armados, rodar con los motores ya oídos, y entrar en pista con la
   * tripulación de cabina sentada. Ver `PermisosDeLaEscena`.
   */
  private permisos(l: LecturaDelPasaje): PermisosDeLaEscena {
    const ahora = this.pared();
    // La red de la espera cuenta desde que se pidió «sentados para el despegue».
    if (l.tramo === "esperando" && (this.dicho("despegue") || this.saltado("despegue")))
      this.enLaEsperaDesde ??= ahora;
    if (l.tramo === "entrando" && l.alineado) this.alineadoDesde ??= ahora;
    const enLaEspera = this.enLaEsperaDesde === null ? 0 : ahora - this.enLaEsperaDesde;
    const alineado = this.alineadoDesde === null ? 0 : ahora - this.alineadoDesde;
    /*
     * Una vez dados, se quedan: lo que ya se hizo no se deshace. Y **lo que
     * espera a una frase espera a que se haya oído**, no a que se haya pedido
     * ni a que la escena la diera por perdida: ver `Conversacion.oida`.
     */
    this.dados = {
      arrancar: this.dados.arrancar || this.charla.oida("comandante.crosscheck") || this.saltado("puertas"),
      rodar: this.dados.rodar || (this.dicho("motores") && this.charla.callada),
      entrar: this.dados.entrar || this.charla.oida("comandante.despegue") || enLaEspera >= RED_DE_LA_ESPERA,
      /*
       * **Y no se da gas con Ara a media frase**: alineados, la tripulación
       * espera a que acabe lo que se está diciendo —«¡ahora sí que vamos a
       * despegar!»—, que es lo que hace que «¡cómo empuja!» llegue con el
       * empuje. Como un «alineado y espere» de la torre: unos segundos.
       */
      despegar:
        this.dados.despegar ||
        (this.dicho("despegue") && this.charla.callada) ||
        this.saltado("despegue") ||
        alineado >= RED_DE_LA_CABECERA,
    };
    return this.dados;
  }

  /**
   * **Y un anuncio de tierra se pide cuando el juego dice que vale**, que es
   * quien lo tira si no. La bienvenida se pedía en cuanto la tripulación
   * echaba a rodar, y para el juego eso todavía era «arrancando» —la fase
   * cambia con medio segundo de histéresis y con el avión pasando de dos
   * metros por segundo—: la boca la tiraba en el acto, «ya no es verdad», y
   * no sonaba. Medido en el banco con las tomas grabadas. Así que se espera a
   * la fase del juego, con su red: ver `RED_DEL_ANUNCIO`.
   */
  private esperaSuFase(def: DefMomento, l: LecturaDelPasaje): boolean {
    const fase = l.fase;
    const aDestiempo =
      fase !== undefined &&
      (def.segun?.(l, this) ?? def.lineas).some((x) => x.megafonia && seLePasoElMomento(x.clave, fase));
    if (!aDestiempo) {
      this.aDestiempoDesde = null;
      return false;
    }
    this.aDestiempoDesde ??= this.pared();
    return this.pared() - this.aDestiempoDesde < RED_DEL_ANUNCIO;
  }

  private aDestiempoDesde: number | null = null;

  private dados: PermisosDeLaEscena = { arrancar: false, rodar: false, entrar: false, despegar: false };
}
