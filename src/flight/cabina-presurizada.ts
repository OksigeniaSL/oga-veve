/**
 * La presurización: a qué altura está la cabina cuando el avión está arriba.
 *
 * Pedido tal cual, junto con la temperatura de fuera: «no veo temperatura
 * exterior, ni presurización de cabina». Y con la pregunta buena detrás:
 *
 * > «¿Qué pasa si tengo una despresurización a mucha altitud? Tengo pocos
 * > minutos para ponerme a altura de aire respirable.»
 *
 * Esa pregunta es la razón de que esto exista. Un avión de línea vuela a once
 * mil metros, donde el aire **no se puede respirar**, y lo único que separa a
 * las personas de dentro de eso es que la cabina va soplada a presión. La
 * altitud de cabina es el número que lo dice, y en cualquier avión de pasaje
 * está en un reloj a la vista.
 *
 * ## Lo que se enseña con un número
 *
 * Que la cabina **también sube**. No se queda al nivel del mar: sube despacio
 * y se para por debajo de ocho mil pies, y por eso duelen los oídos en el
 * descenso, se hincha arriba una bolsa de papas cerrada abajo y llega
 * aplastada una botella cerrada arriba. Quien lo vea subir mientras sube el
 * avión ya no necesita que se lo cuenten.
 *
 * ## Cómo lo hace un avión de verdad, y cómo se hace aquí
 *
 * El fuselaje es un globo, y la estructura aguanta **una diferencia de
 * presión máxima** entre dentro y fuera: la de la placa de cada tipo. Con
 * ella, el control de presión reparte la subida:
 *
 * - **En el suelo, las válvulas abiertas**: la cabina es el aire de fuera.
 * - **Subiendo, la cabina sube a la par que el avión, pero mucho menos**, y
 *   llega a los ocho mil pies justo a la altura a la que el diferencial del
 *   tipo ya no da más. Así el fuselaje trabaja lo menos posible en cada
 *   momento y nadie nota nada. Es el programa en línea recta que llevan los
 *   controladores automáticos.
 * - **Nunca por debajo del campo menos trescientos pies**: al despegar, la
 *   cabina se asienta un poco por debajo de la pista y así no da saltos; al
 *   llegar, se queda esos trescientos pies por debajo hasta tocar. Es lo que
 *   hace el control de la familia de Embraer.
 * - **Y a un ritmo cómodo**: subiendo, como mucho quinientos pies por minuto;
 *   bajando, trescientos cincuenta, que es donde el oído empieza a notarlo.
 *
 * Por encima del diferencial no hay programa que valga: una válvula de
 * seguridad deja salir el aire y la cabina sube con el avión. Y la cabina no
 * puede quedar nunca por encima del avión: otra válvula deja entrar el de
 * fuera. Por eso, si se baja más deprisa de lo que baja la cabina, **el avión
 * la alcanza y se la lleva**, y los oídos lo notan de golpe.
 *
 * Los ocho mil pies son la regla de los aviones de transporte (CS 25.841 y 14
 * CFR 25.841). Un turbohélice de diecinueve plazas se certifica con otra, y
 * su diferencial no llega a tanto: a su techo lleva la cabina a nueve mil.
 *
 * ## Y la avería
 *
 * La despresurización: el aire se va por donde no debe y la cabina se iguala
 * con fuera en unos segundos. La maniobra que viene detrás —máscara, y bajar
 * deprisa a donde se respira— está en `despresurizacion.ts`.
 */

import type { Presurizacion } from "./aircraft";
import { alturaDePresion, presionEstandar } from "./atmosphere";

const PIE = 0.3048;

/**
 * Hasta dónde deja subir la cabina el programa, m: ocho mil pies.
 *
 * Es el tope que fija la normativa de los aviones de transporte y el que
 * llevan puesto todos. Por encima el aire empieza a no dar, y a diez mil ya
 * salta el aviso. Estaba en dos mil cuatrocientos redondos; son 2438,4.
 */
export const TOPE_DE_CABINA = 8000 * PIE;

/** Lo más deprisa que sube la cabina con todo en orden, m/s: 500 ft/min. */
export const SUBE_LA_CABINA = (500 * PIE) / 60;

/**
 * Lo más deprisa que baja, m/s: 350 ft/min.
 *
 * Menos que subiendo, y es por los oídos: al bajar la presión de fuera empuja
 * el tímpano hacia dentro, y la trompa que lo iguala se abre peor en ese
 * sentido. Por eso los oídos se tapan bajando y casi nunca subiendo.
 */
export const BAJA_LA_CABINA = (350 * PIE) / 60;

/** Cuánto por debajo del campo se asienta la cabina al salir y al llegar, m. */
export const POR_DEBAJO_DEL_CAMPO = 300 * PIE;

/**
 * **Lo deprisa que se iguala una cabina que pierde el aire**: la constante de
 * tiempo de la caída, s.
 *
 * Cinco segundos es una despresurización **rápida** —de uno a diez segundos,
 * según el tamaño del agujero—, que es la que se entrena: la explosiva, en
 * menos de un segundo, es la del cine. La lenta tarda minutos y se nota en los
 * oídos antes que en ningún reloj.
 */
export const SE_IGUALA = 5;

/** Lo que hace falta saber de un avión para saber dónde va su cabina. */
export interface ConCabina {
  readonly presurizacion: Presurizacion | null;
}

/**
 * La cabina **más baja** que aguanta el fuselaje con el avión a esta altura,
 * m: la presión de fuera más el diferencial del tipo, puesta en altura.
 */
export function cabinaMasBaja(altura: number, p: Presurizacion): number {
  return alturaDePresion(presionEstandar(altura) + p.diferencialMaximo);
}

/**
 * A qué altura llega el avión **con la cabina en el tope y el diferencial
 * entero**, m. Por encima, la cabina pasa del tope; por debajo, el programa
 * la tiene más baja. Es el techo para el que se diseñó ese diferencial.
 */
export function alturaDelTope(p: Presurizacion): number {
  return alturaDePresion(presionEstandar(TOPE_DE_CABINA) - p.diferencialMaximo);
}

/**
 * **A qué altura quiere el control la cabina** con el avión a esta altura, m:
 * lo que pide el programa, sin contar el ritmo. Ver la cabecera.
 *
 * `campo` es la cota del aeródromo de salida o de llegada, si se sabe: la
 * cabina no baja de trescientos pies por debajo de él.
 *
 * Los que no presurizan llevan la cabina donde está el avión, que es la verdad
 * y es también por lo que no suben más sin oxígeno.
 */
export function altitudDeCabina(
  alturaDelAvion: number,
  avion: ConCabina,
  campo?: number,
): number {
  const alto = Math.max(0, alturaDelAvion);
  const p = avion.presurizacion;
  if (!p) return alto;
  const programa = Math.min(
    TOPE_DE_CABINA,
    (alto / Math.max(1, alturaDelTope(p))) * TOPE_DE_CABINA,
  );
  const conCampo =
    campo === undefined ? programa : Math.max(programa, campo - POR_DEBAJO_DEL_CAMPO);
  return Math.min(alto, Math.max(conCampo, cabinaMasBaja(alto, p)));
}

/** Lo que la cabina necesita saber del vuelo en cada paso. */
export interface PasoDeCabina {
  /** La altura del avión, m. */
  readonly altura: number;
  /** Con las ruedas en el suelo, las válvulas se abren. */
  readonly enTierra: boolean;
  /** La cota del campo de salida o de llegada, m, si se sabe. */
  readonly campo?: number;
}

/**
 * **La cabina de un avión, paso a paso**: dónde está ahora, a qué ritmo se
 * mueve y si todavía tiene aire.
 *
 * Lo que se enseña en el cuadro sale de aquí y no del programa suelto, porque
 * el programa dice dónde **quiere** estar la cabina y esto dice dónde **está**:
 * con el ritmo cómodo, con el avión que la alcanza bajando y con la avería.
 */
export class CabinaPresurizada {
  /** La altitud de cabina, m. */
  altitud = 0;
  /** Lo deprisa que se mueve, m/s. Positivo, subiendo. */
  ritmo = 0;
  private sinAire = false;

  constructor(private avion: ConCabina) {}

  /** Si la cabina ha perdido la presión. */
  get despresurizada(): boolean {
    return this.sinAire;
  }

  /**
   * Vuelo nuevo, o avión nuevo: la cabina en su sitio y con su aire.
   *
   * En tierra, la de fuera. **En el aire, la del programa**, que es donde
   * estaría si el avión hubiera llegado subiendo: un banco que pone el avión
   * a once mil metros no puede estrenarlo con la cabina a once mil.
   */
  reiniciar(altura: number, enTierra: boolean, avion?: ConCabina): void {
    if (avion) this.avion = avion;
    this.sinAire = false;
    this.ritmo = 0;
    this.altitud = enTierra ? Math.max(0, altura) : altitudDeCabina(altura, this.avion);
  }

  /**
   * **Se va el aire.** Devuelve si pasó: un avión sin presurizar no tiene
   * nada que perder, y una cabina que ya lo perdió, tampoco.
   */
  despresurizar(): boolean {
    if (!this.avion.presurizacion || this.sinAire) return false;
    this.sinAire = true;
    return true;
  }

  /** Un paso de `dt` segundos. Devuelve la altitud de cabina, m. */
  paso(dt: number, e: PasoDeCabina): number {
    const alto = Math.max(0, e.altura);
    const antes = this.altitud;
    const p = this.avion.presurizacion;
    if (!p) {
      this.altitud = alto;
    } else if (this.sinAire) {
      // Por el agujero, el aire de dentro se va igualando con el de fuera.
      this.altitud += (alto - this.altitud) * (1 - Math.exp(-dt / SE_IGUALA));
    } else {
      const quiere = e.enTierra ? alto : altitudDeCabina(alto, this.avion, e.campo);
      this.altitud += Math.max(
        -BAJA_LA_CABINA * dt,
        Math.min(SUBE_LA_CABINA * dt, quiere - this.altitud),
      );
      /*
       * Y las dos válvulas, que no esperan a ningún programa: la de seguridad
       * no deja pasar del diferencial, y la de alivio no deja la cabina por
       * encima del avión.
       */
      this.altitud = Math.min(alto, Math.max(this.altitud, cabinaMasBaja(alto, p)));
    }
    this.ritmo = dt > 0 ? (this.altitud - antes) / dt : 0;
    return this.altitud;
  }
}
