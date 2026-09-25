/**
 * Las patas que se meten, en el modelo.
 *
 * Es la mitad visible del tren: la otra es la resistencia que quita meterlo
 * —ver `flight/tren.ts`— y esa se siente pero no se ve. Ésta se ve, y hace
 * falta por lo mismo que se ve el humo del motor o giran las hélices: un mando
 * que no cambia nada en la pantalla no parece un mando, parece un ajuste.
 *
 * ## Giran sobre su bisagra, no suben
 *
 * Un tren de verdad se recoge **girando**: cada pata cuelga de un muñón y da
 * un cuarto de vuelta hasta su pozo con las ruedas pegadas, como un sólido.
 * El principal de un avión de línea se tumba hacia la panza; el de morro se
 * va hacia delante; el de un bimotor, dentro de la góndola. Quien lo mire
 * aquí tiene que reconocer ese giro el día que vea despegar uno.
 *
 * Antes las piezas se deslizaban por su `position.y`, y eso tenía un fallo
 * que no se veía en la prueba: la pieza vive dentro del nodo `avion`, que va
 * girado para pasar de los ejes del modelo a los de Blender, así que su «y»
 * era la z del avión. Lo que se veía era el tren yéndose hacia atrás,
 * desplegado, y apagándose al final: «un intento de recogerlo que salió mal».
 *
 * ## El modelo dice cómo, el juego solo gira
 *
 * Cada pata cuelga en el modelo de un vacío `bisagra-…` puesto en su muñón,
 * con dos propiedades: `eje`, en los ejes del avión —x a la derecha, y
 * arriba, z a la cola—, y `grados`, lo que gira para quedar dentro. Aquí no
 * hay nada de cada avión: se pasa ese eje al marco del padre de la bisagra,
 * sea cual sea el giro que traiga, y se gira. Ver `bisagra` en
 * `modelos/exterior.py`, que además comprueba al exportar que la pata
 * metida cae dentro de la piel.
 *
 * Y al final del camino se apagan, **porque ya no se ven**, no para
 * esconderlas: están dentro del fuselaje y solo costarían triángulos.
 */

import { Quaternion, Vector3, type Object3D } from "three";

/**
 * Cómo se llaman las piezas del tren en los modelos.
 *
 * Las hacen los guiones de `modelos/` y las nombran siempre igual: `pata-…`
 * lo que aguanta y `rueda-…` lo que rueda, y `bisagra-…` el vacío del que
 * cuelgan las que se meten. Está aquí y no repartido porque es un contrato
 * entre dos lenguajes y esos son los que se rompen sin avisar.
 */
export const SE_LLAMAN = /^(pata|rueda)/;
export const BISAGRA = /^bisagra-/;

/** Una pata que se mete: su bisagra, cómo estaba y hacia dónde gira. */
interface Pata {
  readonly bisagra: Object3D;
  readonly reposo: Quaternion;
  /** El eje de giro, ya en el marco del padre de la bisagra. */
  readonly eje: Vector3;
  /** Lo que gira de fuera a dentro, en radianes. */
  readonly angulo: number;
}

export interface Patas {
  /** Cuántas patas se meten. Cero si este modelo no trae tren con bisagra. */
  readonly cuantas: number;
  /** Las pone donde toca. `donde` es 0 dentro y 1 fuera. Ver `tren.ts`. */
  poner(donde: number): void;
}

/**
 * Suave al arrancar y al llegar, como se mueve un actuador hidráulico: el
 * `donde` del tren avanza a paso fijo, y girar a paso fijo se ve de juguete,
 * con un golpe seco al salir y otro al trabarse.
 */
function suave(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Prepara las patas de un modelo para poder meterlas.
 *
 * Devuelve `null` si el modelo no trae ninguna bisagra, que es lo que pasa
 * con el respaldo de cajas y con los aviones de tren fijo: vuelan igual, con
 * el tren siempre puesto. La regla de la casa — que falte un recurso no deje
 * a nadie sin volar.
 */
export function prepararPatas(raiz: Object3D): Patas | null {
  raiz.updateWorldMatrix(true, true);
  const delModelo = raiz.getWorldQuaternion(new Quaternion());
  const patas: Pata[] = [];
  raiz.traverse((o) => {
    if (!BISAGRA.test(o.name) || !o.parent) return;
    const eje = o.userData["eje"];
    const grados = o.userData["grados"];
    if (!Array.isArray(eje) || eje.length !== 3 || typeof grados !== "number")
      return;
    /*
     * El eje viene en los ejes del avión, que son los de la raíz del glTF.
     * La bisagra, en cambio, gira en el marco de su padre, que en estos
     * modelos es el nodo `avion` con su cuarto de vuelta para Blender. Se
     * pasa del uno al otro con los giros de los dos en el mundo, y así no
     * importa cuál traiga cada modelo: el mismo error de marco que hacía ir
     * el tren hacia atrás no puede volver por aquí.
     */
    const delPadre = o.parent.getWorldQuaternion(new Quaternion());
    const enElPadre = new Vector3(Number(eje[0]), Number(eje[1]), Number(eje[2]))
      .normalize()
      .applyQuaternion(delModelo)
      .applyQuaternion(delPadre.invert());
    if (!Number.isFinite(enElPadre.x)) return;
    patas.push({
      bisagra: o,
      reposo: o.quaternion.clone(),
      eje: enElPadre,
      angulo: (grados * Math.PI) / 180,
    });
  });
  if (!patas.length) return null;
  const giro = new Quaternion();
  return {
    cuantas: patas.length,
    poner(donde: number) {
      const fuera = Math.max(0, Math.min(1, donde));
      const metida = suave(1 - fuera);
      for (const p of patas) {
        giro.setFromAxisAngle(p.eje, p.angulo * metida);
        p.bisagra.quaternion.multiplyQuaternions(giro, p.reposo);
        // Dentro del todo no se dibuja: ya está en el pozo, tapada por la
        // piel, y solo costaría triángulos. Y en cuanto asoma, vuelve.
        p.bisagra.visible = fuera > 0;
      }
    },
  };
}
