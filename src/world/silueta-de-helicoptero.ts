/**
 * **La silueta provisional del Super Puma**, hecha con piezas sencillas por
 * código mientras llega su modelo en 3D (paso 2 del ADR 0026). Es para volarlo
 * y afinar los mandos, no para enseñarlo: se tira el día que llegue el bueno.
 *
 * Lo que sí es de verdad son las medidas y lo que gira, porque eso es lo que
 * se aprende mirándolo: el rotor de 15,60 m y cuatro palas, el de cola de
 * 3,05 m y cinco, a 9,4 m detrás del mástil, 4,95 m de alto y unos 16 de largo
 * (TCDS R.002, III.4), y el principal **en horario visto desde arriba**, como
 * en todos los de Aérospatiale. Gira a las vueltas que dice el modelo: con el
 * rotor parado las palas están quietas, y si caen las vueltas se ve.
 *
 * Ejes como el resto de aeronaves del juego: el origen en el centro de
 * gravedad, que el modelo de vuelo pone 1,8 m por encima del suelo, el morro
 * hacia −Z, la derecha hacia +X y arriba +Y.
 */

import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import type { AircraftConfig } from "../flight/aircraft";
import type { FichaDeHelicoptero } from "../flight/helicoptero";
import type { AircraftMesh } from "./aircraft-mesh";
import { medirVistaAlFrente } from "./vista-al-frente";

/** Lo que mueve el juego en cada fotograma: los dos rotores. */
export interface RotoresDeHelicoptero {
  /**
   * Avanza los dos rotores `dt` segundos a estas vueltas del principal, rad/s.
   * El de cola va engranado: gira a las suyas en la misma proporción.
   */
  avanzar(dt: number, vueltas: number): void;
  /** El ángulo del principal, rad, contado en horario visto desde arriba. */
  readonly angulo: number;
}

/** Desde qué vueltas, rad/s, las palas empiezan a verse como un disco. */
const DISCO_DESDE = 8;

export function crearSiluetaDeHelicoptero(aircraft: AircraftConfig, f: FichaDeHelicoptero): AircraftMesh {
  const group = new Group();
  group.name = `aeronave:${aircraft.id}`;
  const look = aircraft.appearance;
  const casco = new MeshLambertMaterial({ color: look.body });
  const raya = new MeshLambertMaterial({ color: look.accent });
  const oscuro = new MeshLambertMaterial({ color: 0x2b2f33 });
  const cristal = new MeshLambertMaterial({ color: 0x1d3442 });
  const palas = new MeshLambertMaterial({ color: 0x3a3d40 });
  const pieza = (geo: BoxGeometry | CylinderGeometry | SphereGeometry, mat: MeshLambertMaterial, x: number, y: number, z: number): Mesh => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  const suelo = -aircraft.gearHeight;
  const buje = f.rotor.alturaDelBuje;
  const radio = f.rotor.radio;

  /*
   * **La cabina y el fuselaje**: unos 3 m de ancho y la panza a medio metro del
   * suelo, del morro a la raíz del cono de cola. Con el cono y el rotor de cola
   * suma los 16 m de largo de fuselaje de la ficha.
   */
  const panza = suelo + 0.7;
  const techo = 1.5;
  const alto = techo - panza;
  pieza(new BoxGeometry(2.9, alto, 8.6), casco, 0, panza + alto / 2, -0.6);
  // El morro redondeado, con el cristal de la cabina encima.
  const morro = pieza(new SphereGeometry(1.45, 16, 12), casco, 0, panza + alto / 2 - 0.15, -4.9);
  morro.scale.set(1, 0.95, 1.2);
  const parabrisas = pieza(new BoxGeometry(2.6, 0.9, 1.6), cristal, 0, techo - 0.35, -4.5);
  parabrisas.rotation.x = -0.45;
  // Las ventanillas de la cabina de carga, una raya oscura a cada lado.
  pieza(new BoxGeometry(2.95, 0.55, 4.2), cristal, 0, 0.7, -0.4);
  // Una raya del color de la casa a lo largo.
  pieza(new BoxGeometry(2.96, 0.25, 8.4), raya, 0, panza + 0.55, -0.6);
  // Los motores y la caja de transmisión, encima de la cabina.
  pieza(new BoxGeometry(1.9, 0.9, 5.2), casco, 0, techo + 0.45, -0.3);
  // Las barquillas del tren principal, a los lados.
  pieza(new BoxGeometry(0.6, 0.7, 2.4), casco, 1.65, panza + 0.45, 1.4);
  pieza(new BoxGeometry(0.6, 0.7, 2.4), casco, -1.65, panza + 0.45, 1.4);

  /*
   * **El cono de cola**, que sube y se estrecha hasta la deriva. El rotor de
   * cola queda donde dice la ficha: `brazo` por detrás del mástil y `altura`
   * por encima del centro de gravedad.
   */
  const colaZ = f.cola.brazo;
  const colaY = f.cola.altura;
  const raiz = { y: 0.9, z: 3.6 };
  const largoCono = colaZ - 0.4 - raiz.z;
  const cono = pieza(
    new CylinderGeometry(0.35, 0.85, Math.hypot(largoCono, colaY - 0.6 - raiz.y), 12),
    casco,
    0,
    (raiz.y + colaY - 0.6) / 2,
    raiz.z + largoCono / 2,
  );
  cono.rotation.x = Math.PI / 2 - Math.atan2(colaY - 0.6 - raiz.y, largoCono);
  // La deriva, inclinada hacia atrás, y el estabilizador de 3,79 m.
  const deriva = pieza(new BoxGeometry(0.25, 2.3, 1.4), casco, 0, colaY + 0.1, colaZ - 0.2);
  deriva.rotation.x = 0.35;
  pieza(new BoxGeometry(3.79, 0.12, 0.8), raya, 0, colaY - 0.55, colaZ - 1.6);

  // El tren: la rueda de morro y las dos del principal, donde las pone la ficha.
  const rueda = new CylinderGeometry(0.33, 0.33, 0.25, 12);
  rueda.rotateZ(Math.PI / 2);
  for (const r of f.ruedas) {
    // Ejes cuerpo de la ficha: x adelante, y a la derecha. Aquí, −Z y +X.
    pieza(rueda, oscuro, r.y, suelo + 0.33, -r.x);
  }

  // El mástil y la cabeza del rotor.
  pieza(new CylinderGeometry(0.22, 0.28, buje - techo - 0.9, 10), oscuro, 0, (techo + 0.9 + buje) / 2, -f.rotor.bujeAdelante);

  /*
   * **El rotor principal**: cuatro palas de 7,8 m con la cuerda de la ficha,
   * del buje hacia fuera. Y un disco muy tenue que asoma con las vueltas, que
   * es como se ve un rotor girando: a sus 265 vueltas las palas ya no se
   * siguen con el ojo, y en una pantalla a sesenta imágenes por segundo darían
   * saltos de una cuarta de vuelta que parecerían otra cosa.
   */
  const principal = new Group();
  principal.position.set(0, buje, -f.rotor.bujeAdelante);
  principal.add(new Mesh(new CylinderGeometry(0.45, 0.45, 0.35, 12), oscuro));
  const materialDePala = palas.clone();
  materialDePala.transparent = true;
  for (let i = 0; i < f.rotor.palas; i++) {
    const brazo = new Object3D();
    brazo.rotation.y = (i * 2 * Math.PI) / f.rotor.palas;
    const pala = new Mesh(new BoxGeometry(radio - 0.4, 0.08, f.rotor.cuerda), materialDePala);
    pala.position.x = 0.4 + (radio - 0.4) / 2;
    brazo.add(pala);
    principal.add(brazo);
  }
  const materialDelDisco = new MeshBasicMaterial({
    color: 0x2a2d30,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
  });
  const disco = new Mesh(new CircleGeometry(radio, 48), materialDelDisco);
  disco.rotation.x = -Math.PI / 2;
  principal.add(disco);
  group.add(principal);

  /*
   * **El de cola**, cinco palas de 1,525 m a la derecha de la deriva, como en el
   * Super Puma, con el eje de lado.
   */
  const cola = new Group();
  cola.position.set(0.45, colaY, colaZ);
  cola.add(new Mesh(new CylinderGeometry(0.16, 0.16, 0.3, 10).rotateZ(Math.PI / 2), oscuro));
  for (let i = 0; i < f.cola.palas; i++) {
    const brazo = new Object3D();
    brazo.rotation.x = (i * 2 * Math.PI) / f.cola.palas;
    const pala = new Mesh(new BoxGeometry(0.05, f.cola.radio - 0.15, f.cola.cuerda), palas);
    pala.position.y = 0.15 + (f.cola.radio - 0.15) / 2;
    brazo.add(pala);
    cola.add(brazo);
  }
  group.add(cola);

  let angulo = 0;
  let anguloCola = 0;
  const rotores: RotoresDeHelicoptero = {
    avanzar(dt, vueltas) {
      angulo = (angulo + vueltas * dt) % (2 * Math.PI);
      anguloCola = (anguloCola + vueltas * (f.cola.vueltas / f.rotor.vueltas) * dt) % (2 * Math.PI);
      // En horario visto desde arriba: el giro positivo de three.js alrededor de +Y es el contrario.
      principal.rotation.y = -f.rotor.sentido * angulo;
      cola.rotation.x = anguloCola;
      const borroso = Math.max(0, Math.min(1, (vueltas - DISCO_DESDE) / (f.rotor.vueltas - DISCO_DESDE)));
      materialDelDisco.opacity = 0.22 * borroso;
      materialDePala.opacity = 1 - 0.55 * borroso;
    },
    get angulo() {
      return angulo;
    },
  };

  /*
   * **Los ojos del piloto**, en el asiento de la derecha, que es el del
   * comandante en un helicóptero: con la silueta no hay cabina por dentro, pero
   * las caras de las piezas solo se pintan por fuera, así que desde ahí se ve el
   * mundo por donde iría el cristal.
   */
  const ojo = { x: 0.6, y: techo - 0.2, z: -4.3 };
  return {
    group,
    propeller: new Group(),
    helices: [],
    ojo,
    vista: medirVistaAlFrente(group, ojo),
    rotores,
  };
}
