/**
 * Malla de la aeronave, generada por código.
 *
 * Geométrica y sin texturas a propósito, y no por falta de tiempo: un modelo
 * de terceros traería licencias que auditar, y aun en CC0 traería la silueta
 * de un avión que existe, que es lo que este proyecto ha decidido no hacer.
 * Ver #68 y CREDITOS.md. Si hay un glTF propio en `assets/aeronaves/<id>.glb`,
 * manda él y esto es el respaldo — ver `aeronave-modelo.ts`.
 *
 * Orientación: el morro apunta a -Z, la panza a -Y. Es la convención que
 * espera el FDM y la de cualquier glTF exportado con "forward -Z", así que
 * el reemplazo futuro encaja sin rotaciones sorpresa.
 *
 * La forma la pone `fabrica-de-aeronaves.ts` y la silueta la dice la tabla de
 * la flota, no la ficha: un biplano se dibuja con dos alas y sus montantes, un
 * regional con la cola en T y un reactor con los motores colgados. Antes todas
 * salían iguales —el biplano parecía un monoplano— porque la geometría solo
 * miraba las medidas y no la forma.
 *
 * Aquí queda el ensamblaje: el casco fusionado en una sola llamada de dibujo,
 * y las hélices aparte, que son lo único que se mueve.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Object3D,
} from "three";
import type { AircraftConfig } from "../flight/aircraft";
import { modeloPorId } from "../flight/flota";
import { fabricarAeronave, RADIO_DE_HELICE } from "./fabrica-de-aeronaves";

export interface AircraftMesh {
  group: Group;
  /** Se hace girar con el motor. */
  propeller: Object3D;
  /**
   * Y las demás, si el avión lleva más de una.
   *
   * Un bimotor tiene dos hélices y cada una gira **sobre su propio eje**:
   * meterlas en un grupo y girar el grupo las pondría a dar vueltas una
   * alrededor de la otra, que es lo que hace un tiovivo y no un avión. Así que
   * son objetos sueltos y se giran todos. `propeller` sigue siendo el primero
   * para que nada de lo que ya existía tenga que enterarse.
   */
  helices?: readonly Object3D[];
  /**
   * Dónde están los ojos del piloto, en coordenadas de la aeronave.
   *
   * Sin modelo no hay cabina que valga y la vista se coloca con una fórmula
   * sobre la cuerda del ala, que es lo que había. Con modelo, la cabina existe
   * de verdad y hay que ponerse **donde se sienta uno**: un palmo por detrás
   * del panel y a la altura de la cabeza, no flotando entre los asientos
   * traseros mirando el salón.
   */
  /** Las pantallas de la cabina, si el modelo las trae. */
  pantallas?: import("./pantallas-cabina").Pantallas | null;
  /**
   * Si esto es el modelo de verdad y no las cajas de respaldo.
   *
   * Existe para poder **mirarlo desde fuera**, y hace falta porque el respaldo
   * es silencioso a propósito: si el glTF no está o está roto, el juego sigue
   * volando con cajas y no dice nada. Es la regla de la casa —que falte un
   * recurso externo no puede dejar a nadie sin volar— y tiene su reverso:
   * **nadie se entera de que se apagó**. Pasó el día que la aeronave cambió de
   * identificador y el fichero se quedó con el nombre viejo; el modelo se fue
   * y no lo notó ningún banco. Ver `flota.ts` y `__oga.avion`.
   */
  deVerdad?: boolean;
  ojo?: { x: number; y: number; z: number };
}

/**
 * Monta la aeronave con la fábrica paramétrica. Ver `fabrica-de-aeronaves.ts`.
 *
 * Aquí solo queda lo que la fábrica no puede saber: de dónde salen las medidas
 * —de la ficha de vuelo, para que el dibujo y la física midan lo mismo—, qué
 * silueta le toca —de la tabla de la flota, que es la única lista— y las
 * hélices, que son lo único que se mueve y por eso van aparte de la geometría
 * fusionada.
 */
export function createAircraftMesh(aircraft: AircraftConfig): AircraftMesh {
  const group = new Group();
  group.name = `aeronave:${aircraft.id}`;

  const look = aircraft.appearance;
  const silueta = modeloPorId(aircraft.id)?.silueta ?? "ala-alta";
  const hecho = fabricarAeronave(
    silueta,
    {
      envergadura: aircraft.wingSpan,
      cuerda: aircraft.chord,
      tren: aircraft.gearHeight,
    },
    { body: look.body, accent: look.accent, trim: look.trim },
  );

  /*
   * **Un material y una llamada de dibujo por avión**, que es todo el objetivo
   * de fusionar la geometría. El color viaja en los vértices; sin
   * `vertexColors` el avión sale blanco y parece que falta una textura.
   */
  const casco = new Mesh(
    hecho.geometria,
    new MeshLambertMaterial({ vertexColors: true }),
  );
  /*
   * La fábrica deja la panza en el cero porque el juego coloca la aeronave por
   * su tren; aquí se baja al origen de la aeronave, que es donde el resto del
   * juego espera encontrarla. Misma convención que con un glTF de fuera.
   */
  casco.position.y = -aircraft.gearHeight;
  group.add(casco);

  const helices: Object3D[] = [];
  for (const donde of hecho.helices) {
    const helice = new Group();
    helice.position.set(donde.x, donde.y - aircraft.gearHeight, donde.z);
    /*
     * **La hélice, con el tamaño de una hélice.**
     *
     * Medía por la cuerda del ala y las palas eran cajas **centradas en el
     * buje**, así que salían al otro lado: tres palas de dos metros y medio
     * cruzándose en una estrella por delante del capó. De cerca no parecía una
     * hélice, parecía un avión roto.
     *
     * Una hélice mide por la envergadura, que es lo que la relaciona con el
     * avión: alrededor de un noveno del ala a cada lado. Y cada pala sale
     * **del buje hacia fuera**, no lo atraviesa.
     */
    const radio = aircraft.wingSpan * RADIO_DE_HELICE;
    const buje = new Mesh(
      new CylinderGeometry(radio * 0.14, radio * 0.1, radio * 0.5, 10),
      new MeshLambertMaterial({ color: look.accent }),
    );
    // El cono, apuntando adelante: es lo que hace que se lea como morro y no
    // como un disco pegado.
    buje.rotation.x = -Math.PI / 2;
    buje.position.z = -radio * 0.2;
    helice.add(buje);
    for (let i = 0; i < look.blades; i++) {
      const pala = new Mesh(
        new BoxGeometry(radio, radio * 0.16, radio * 0.05),
        new MeshLambertMaterial({ color: look.trim }),
      );
      // Del buje hacia fuera, y repartidas por toda la vuelta.
      pala.position.x = radio * 0.55;
      const brazo = new Object3D();
      brazo.rotation.z = (i * 2 * Math.PI) / look.blades;
      brazo.add(pala);
      helice.add(brazo);
    }
    group.add(helice);
    helices.push(helice);
  }

  return {
    group,
    // `propeller` es la primera, para que lo que ya existía siga funcionando.
    propeller: helices[0] ?? new Group(),
    helices,
    /*
     * Y dónde se sienta el piloto, que aquí no hay cabina modelada —el cristal
     * va pintado— pero sí un sitio del que se ve lo que se tiene que ver:
     * encima del fuselaje y delante del ala. Ver `fabricarAeronave`.
     */
    ojo: {
      x: hecho.ojo.x,
      y: hecho.ojo.y - aircraft.gearHeight,
      z: hecho.ojo.z,
    },
  };
}
