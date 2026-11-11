/**
 * **El rotor del helicóptero, como lo ve el ojo**: el de Gaudí (kit de arte de
 * hq, `agents/arte/kit/oga-veve/rotor/`, 906b5527), pasado a TypeScript y
 * enchufado al modelo de verdad.
 *
 * Parado, las palas caen sobre su bisagra de batimiento. Girando, se enderezan,
 * suben al cono con el empuje y se funden en lo que se ve de un rotor de verdad
 * —y en cualquier foto—: un disco translúcido, el aro de las puntas en
 * terracota y unas sombras de pala suaves que giran despacio. **Nunca las palas
 * de verdad a toda velocidad**: un rotor a 265 rpm dibujado a sesenta imágenes
 * por segundo hace el efecto de la rueda de carro, y su sombra parpadea en el
 * panel. Aquí nada parpadea: todo se mueve suave o no se mueve.
 *
 * Es la misma idea que `discoDeHelice` en `aeronave-modelo.ts`, con lo que tiene
 * de suyo un rotor: la caída y el cono, el aro, las sombras y un disco que se ve
 * también desde abajo, por el techo de la cabina.
 */

import {
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  SRGBColorSpace,
  Vector3,
  type Material,
} from "three";
import type { FichaDeHelicoptero } from "../flight/helicoptero";
import type { RotoresDeHelicoptero } from "./silueta-de-helicoptero";

/**
 * El velo de un rotor girando, si las palas no dicen su color: un gris como el de
 * ellas. Era casi negro y sin luz, y de noche el disco desaparecía sobre el suelo
 * oscuro y solo quedaba el aro, brillando como si tuviera luz propia.
 */
const VELO = "#55595d";
/** Las puntas de las palas de la flota, y por eso el aro de las puntas. */
const TERRACOTA = "#be5d38";

const suave = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}

function lienzo(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * **El disco**: transparente en el buje, un velo que se aclara hacia fuera —una
 * pala tapa menos círculo cuanto más lejos va— y el aro de las puntas. Un lienzo:
 * una textura y ninguna petición.
 */
function texturaDeDisco(aro: number, velo = VELO, tonoAro = TERRACOTA, lado = 512, hueco = 0.1): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  const g = c.getContext("2d");
  if (!g) return null;
  const r = lado / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  const parada = (f: number, a: number): void => grad.addColorStop(f, hexA(velo, a));
  parada(0, 0);
  parada(hueco, 0);
  parada(hueco + 0.04, 0.62);
  parada(0.35, 0.42);
  parada(0.7, 0.3);
  parada(1 - aro - 0.03, 0.26);
  parada(1, 0);
  g.fillStyle = grad;
  g.fillRect(0, 0, lado, lado);
  if (aro > 0) {
    // El aro: suave por los dos bordes, como se ven las puntas deprisa.
    const anillo = g.createRadialGradient(r, r, r * (1 - aro * 1.6), r, r, r);
    anillo.addColorStop(0, hexA(tonoAro, 0));
    anillo.addColorStop(0.45, hexA(tonoAro, 0.75));
    anillo.addColorStop(0.8, hexA(tonoAro, 0.75));
    anillo.addColorStop(1, hexA(tonoAro, 0));
    g.fillStyle = anillo;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.arc(r, r, r * (1 - aro * 1.6), 0, Math.PI * 2, true);
    g.fill();
  }
  return lienzo(c);
}

/** **Las sombras**: palas suaves, oscuras en la raíz y que se apagan en la punta, un poco corridas por el giro. */
function texturaDeSombras(cuantas: number, velo = VELO, lado = 512, hueco = 0.1): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  const g = c.getContext("2d");
  if (!g) return null;
  const r = lado / 2;
  g.translate(r, r);
  for (let k = 0; k < cuantas; k++) {
    g.save();
    g.rotate((k * 2 * Math.PI) / cuantas);
    // Una cuña de pocos grados en rodajas finas que se apagan hacia atrás: el corrido del giro.
    for (let s = 0; s < 14; s++) {
      g.save();
      g.rotate(((-s * Math.PI) / 180) * 1.6);
      const grad = g.createLinearGradient(r * hueco, 0, r, 0);
      const a = 0.5 * (1 - s / 14);
      grad.addColorStop(0, hexA(velo, 0));
      grad.addColorStop(0.08, hexA(velo, a));
      grad.addColorStop(0.75, hexA(velo, a * 0.55));
      grad.addColorStop(1, hexA(velo, 0));
      g.fillStyle = grad;
      g.fillRect(r * hueco, -r * 0.018, r * (1 - hueco), r * 0.036);
      g.restore();
    }
    g.restore();
  }
  return lienzo(c);
}

interface OpcionesDelRotor {
  /** Las palas, para las sombras. */
  readonly cuantas: number;
  /** Dónde está la bisagra de batimiento, m desde el eje. */
  readonly bisagra: number;
  /** Lo que caen las puntas parado, grados, y lo que suben con todo el empuje. */
  readonly caida: number;
  readonly cono: number;
  /** El aro de las puntas: en el principal sí. */
  readonly aro: boolean;
  /** El giro aparente de las sombras, rad/s: negativo, hacia atrás, como ve una cámara un rotor rápido. */
  readonly giroSombras?: number;
  readonly fondoDisco?: number;
}

/** Un rotor montado: se le dice cada fotograma cuánto gira, cuánto empuja y qué hora es. */
export interface RotorMontado {
  readonly radio: number;
  /** `vueltas`, de 0 a 1 de las nominales; `empuje`, de 0 a 1; `t`, en segundos. */
  poner(vueltas: number, empuje: number, t: number): void;
}

/**
 * **El rotor sobre su eje.** El eje es lo que gira, con el mástil en su Z local;
 * las palas, sus descendientes con «pala» o «blade» en el nombre, una malla por
 * pala, como las escribe `modelos/jaz-super-puma.py`. Cada una se cuelga de un
 * pivote en su bisagra para caer y subir; el disco y las sombras van en el plano
 * del buje. `null` si el eje no tiene palas.
 */
export function montarRotor(eje: Object3D, o: OpcionesDelRotor): RotorMontado | null {
  eje.updateWorldMatrix(true, true);
  const palas: Mesh[] = [];
  eje.traverse((x) => {
    const m = x as Mesh;
    if (m.isMesh && /pala|blade/i.test(m.name)) palas.push(m);
  });
  if (!palas.length) return null;
  /*
   * **El color del disco, de las propias palas**: el velo, el de una pala, y el aro,
   * el de sus puntas. Así el disco se ve más claro que el suelo y más oscuro que el
   * cielo, como en una foto.
   */
  const colorDe = (m: Mesh | undefined): string | undefined => {
    const mat = (Array.isArray(m?.material) ? m?.material[0] : m?.material) as { color?: { getHexString(): string } } | undefined;
    return mat?.color ? `#${mat.color.getHexString()}` : undefined;
  };
  const velo = colorDe(palas.find((m) => !/punta/i.test(m.name))) ?? VELO;
  const tonoAro = colorDe(palas.find((m) => /punta/i.test(m.name))) ?? TERRACOTA;
  const v = new Vector3();
  let radio = 0;
  const bisagras: { pivote: Object3D; tangente: Vector3 }[] = [];
  const materiales: Material[] = [];
  for (const m of palas) {
    // Su propia copia del material, para apagarse sin apagar nada más pintado igual.
    const suyo = (Array.isArray(m.material) ? m.material[0] : m.material) as Material;
    const copia = suyo.clone();
    copia.transparent = true;
    m.material = copia;
    materiales.push(copia);
    // Hacia dónde apunta: el centro de sus vértices, en el sistema del eje.
    const pos = m.geometry.getAttribute("position");
    const c = new Vector3();
    let largo = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      m.localToWorld(v);
      eje.worldToLocal(v);
      c.add(v);
      largo = Math.max(largo, Math.hypot(v.x, v.y));
    }
    c.divideScalar(pos.count);
    radio = Math.max(radio, largo);
    const radial = new Vector3(c.x, c.y, 0).normalize();
    const pivote = new Object3D();
    pivote.name = `bisagra-${m.name}`;
    pivote.position.copy(radial).multiplyScalar(o.bisagra);
    eje.add(pivote);
    pivote.updateWorldMatrix(true, false);
    pivote.attach(m);
    // El batimiento gira la pala alrededor de la tangente de su círculo: arriba es +Z del eje.
    const tangente = new Vector3(0, 0, 1).cross(radial).normalize();
    bisagras.push({ pivote, tangente });
  }
  // Con luz, como el resto del helicóptero: al anochecer se apaga con él.
  const capa = (textura: CanvasTexture | null, nombre: string, z: number): Mesh => {
    const mat = new MeshLambertMaterial({ map: textura, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
    const malla = new Mesh(new CircleGeometry(radio, 64), mat);
    malla.name = nombre;
    malla.position.z = z;
    malla.renderOrder = 5;
    malla.visible = false;
    return malla;
  };
  const grupo = new Group();
  grupo.name = "rotor-girando";
  eje.add(grupo);
  const disco = capa(texturaDeDisco(o.aro ? 0.04 : 0, velo, tonoAro), "disco-de-rotor", 0);
  grupo.add(disco);
  const sombra = capa(texturaDeSombras(o.cuantas, velo), "sombras-de-rotor", 0.002);
  grupo.add(sombra);
  const giroSombras = o.giroSombras ?? -0.55;
  const fondoDisco = o.fondoDisco ?? 0.85;
  let ultimo = 0;
  return {
    radio,
    poner(vueltas, empuje, t) {
      const k = Math.max(0, Math.min(1, vueltas));
      const centrifuga = suave(0.15, 0.85, k);
      // Parado caen; girando, el giro las endereza y el empuje las sube al cono.
      const angulo =
        ((-o.caida * (1 - centrifuga) + o.cono * Math.max(0, Math.min(1, empuje)) * centrifuga) * Math.PI) / 180;
      for (const b of bisagras) b.pivote.quaternion.setFromAxisAngle(b.tangente, -angulo);
      const fundido = suave(0.3, 0.75, k);
      for (let i = 0; i < palas.length; i++) {
        const mat = materiales[i]!;
        mat.opacity = 1 - 0.94 * fundido;
        // Una pala que se apaga no puede tapar el disco de detrás, y deprisa no se dibuja.
        mat.depthWrite = mat.opacity > 0.98;
        palas[i]!.visible = mat.opacity > 0.12;
      }
      (disco.material as MeshLambertMaterial).opacity = fondoDisco * fundido;
      disco.visible = fundido > 0.01;
      (sombra.material as MeshLambertMaterial).opacity = 0.7 * fundido;
      sombra.visible = fundido > 0.01;
      sombra.rotation.z += giroSombras * Math.max(0, t - ultimo) * fundido;
      // El grupo que gira sube con el cono: el disco va donde corren las puntas.
      grupo.position.z = Math.sin(angulo) * radio * 0.5;
      ultimo = t;
    },
  };
}

/**
 * **Lo más deprisa que se ve girar un eje mientras se ven sus palas**, vueltas por
 * segundo. Más rápido, a sesenta imágenes por segundo, parecería ir hacia atrás.
 * Por encima de un tercio de las vueltas las palas se funden en el disco, y lo que
 * gira entonces son las sombras.
 */
const GIRO_QUE_SE_VE = 0.6;

/**
 * **Los dos rotores del modelo de verdad**, montados y listos para que el juego
 * los avance: el principal (`rotor-principal`, en horario visto desde arriba,
 * que en su Z es un giro negativo) y el de cola (`rotor-de-cola`, engranado).
 * `null` si el modelo no los trae.
 */
export function rotoresDelModelo(raiz: Object3D, f: FichaDeHelicoptero): RotoresDeHelicoptero | null {
  const ejePrincipal = raiz.getObjectByName("rotor-principal");
  const ejeCola = raiz.getObjectByName("rotor-de-cola");
  if (!ejePrincipal || !ejeCola) return null;
  const principal = montarRotor(ejePrincipal, { cuantas: f.rotor.palas, bisagra: 0.3, caida: 2.5, cono: 3.5, aro: true });
  const cola = montarRotor(ejeCola, {
    cuantas: f.cola.palas,
    bisagra: 0.1,
    caida: 0,
    cono: 0,
    aro: false,
    giroSombras: 0.8,
  });
  if (!principal || !cola) return null;
  let angulo = 0;
  let t = 0;
  return {
    avanzar(dt, vueltas, empuje = 0.5) {
      t += dt;
      const k = vueltas / f.rotor.vueltas;
      /*
       * El eje gira a sus vueltas mientras se ven las palas, sin pasar de lo que se
       * ve sin ir hacia atrás, y deja de girar según se funden: entonces giran las
       * sombras, despacio. El de cola, en la misma proporción.
       */
      const seVen = 1 - Math.max(0, Math.min(1, (k - 0.3) / 0.45));
      const aparente = Math.min(vueltas, GIRO_QUE_SE_VE * 2 * Math.PI) * seVen;
      const paso = aparente * dt;
      angulo = (angulo + paso) % (2 * Math.PI);
      ejePrincipal.rotateZ(-f.rotor.sentido * paso);
      ejeCola.rotateZ(paso);
      principal.poner(k, empuje, t);
      cola.poner(k, 0, t);
    },
    get angulo() {
      return angulo;
    },
  };
}
