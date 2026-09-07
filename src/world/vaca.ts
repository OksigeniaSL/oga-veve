/**
 * La vaca de la pista.
 *
 * Es la razón número uno por la que se frustra una aproximación en un campo de
 * hierba, y no es un chiste: en un aeródromo sin valla —que son casi todos los
 * pequeños del mundo— lo que se cruza en la pista tiene cuatro patas. Se hace
 * una pasada baja para espantarla y se vuelve a intentar, y eso lo cuenta
 * cualquier piloto de aeroclub como quien cuenta lo del tráfico.
 *
 * En Granja Óga además es donde vive: «las vacas van a pastar pasto aceitoso».
 *
 * ## Por qué una vaca y no una luz roja
 *
 * Porque la lección de la frustrada es **ver el motivo**. Una lámpara que se
 * pone en rojo enseña a obedecer; una vaca en mitad de la pista enseña por qué
 * la orden existe, y a los cuatro años eso es la diferencia entre una regla y
 * una manía del profesor. En los aeropuertos grandes no la hay —allí la orden
 * llega por radio y se obedece sin ver el motivo, que también es de verdad— y
 * por eso la vaca sale solo en los campos de hierba.
 *
 * Es de cajas, como el señalero y el coche del sígame: lo que hay que
 * reconocer desde doscientos metros es **que hay un bicho ahí**, no su raza.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";

/** El pardo de una vaca criolla, y el blanco de sus manchas. */
const PARDO = 0x6d4a33;
const MANCHA = 0xe8e2d6;
const OSCURO = 0x2a2320;

export class Vaca {
  readonly grupo: Group;

  constructor() {
    const grupo = new Group();
    grupo.name = "vaca";
    grupo.visible = false;
    // Más grande que una vaca de verdad, como todo lo que en este juego tiene
    // que verse desde el aire: lo que se conserva es que se vea.
    grupo.scale.setScalar(1.6);

    const cuero = new MeshLambertMaterial({ color: PARDO });
    const blanco = new MeshLambertMaterial({ color: MANCHA });
    const negro = new MeshLambertMaterial({ color: OSCURO });

    const cuerpo = new Mesh(new BoxGeometry(0.9, 1.15, 2.2), cuero);
    cuerpo.position.y = 1.25;

    // Dos manchas, que es lo que hace que un cajón pardo se lea como una vaca.
    const manchas = new Group();
    for (const [x, y, z] of [
      [0.46, 1.4, 0.4],
      [-0.46, 1.15, -0.5],
    ] as const) {
      const m = new Mesh(new BoxGeometry(0.06, 0.5, 0.7), blanco);
      m.position.set(x, y, z);
      manchas.add(m);
    }

    const cuello = new Mesh(new BoxGeometry(0.55, 0.6, 0.5), cuero);
    cuello.position.set(0, 1.35, -1.2);
    const cabeza = new Mesh(new BoxGeometry(0.5, 0.45, 0.75), cuero);
    cabeza.position.set(0, 1.1, -1.5);

    const patas = new Group();
    for (const x of [-0.32, 0.32]) {
      for (const z of [-0.75, 0.8]) {
        const pata = new Mesh(new BoxGeometry(0.22, 0.7, 0.22), negro);
        pata.position.set(x, 0.35, z);
        patas.add(pata);
      }
    }

    grupo.add(cuerpo, manchas, cuello, cabeza, patas);
    this.grupo = grupo;
  }

  /** La planta en la pista, mirando de través como mira una vaca. */
  poner(x: number, y: number, z: number, rumbo: number): void {
    this.grupo.position.set(x, y, z);
    // De través al eje: una vaca que cruza no va mirando al avión.
    this.grupo.rotation.y = rumbo + Math.PI / 2;
    this.grupo.visible = true;
  }

  /** Y se va, que para eso se hace la pasada. */
  quitar(): void {
    this.grupo.visible = false;
  }

  get estaPuesta(): boolean {
    return this.grupo.visible;
  }
}
