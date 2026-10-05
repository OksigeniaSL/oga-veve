/**
 * **La funda roja del pitot y los calzos**, puestos en el avión aparcado.
 *
 * Un avión en su puesto lleva las dos cosas: la funda en el tubo del pitot,
 * con su cinta roja colgando —*REMOVE BEFORE FLIGHT*, que es lo que pone en
 * todas y en inglés en todas partes—, y los calzos delante y detrás de las
 * ruedas. Son lo primero que se quita en la vuelta al avión, y por eso son
 * lo primero que hay que poder ver. Ver `flight/vuelta-al-avion.ts`.
 *
 * Hechas con el motor, con cuatro primitivas y un lienzo para la cinta: no
 * hay modelo que licenciar. Seis mallas como mucho, y solo mientras el avión
 * está en el puesto: al arrancar se van.
 */

import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Box3,
  type Material,
  type Vector3,
} from "three";

/** El rojo de las cintas de verdad. */
const ROJO = 0xd8232a;
/** El amarillo de los calzos de plataforma. */
const AMARILLO = 0xf2c230;

/**
 * La cinta, pintada una vez: roja, con *REMOVE BEFORE FLIGHT* en blanco.
 *
 * Con su espacio de color, que un lienzo de color sin él sale lavado —el
 * rojo se vuelve rosa—: ver la nota de los lienzos en sRGB.
 */
function cintaPintada(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const lienzo = document.createElement("canvas");
  lienzo.width = 64;
  lienzo.height = 512;
  const c = lienzo.getContext("2d");
  if (!c) return null;
  c.fillStyle = "#d8232a";
  c.fillRect(0, 0, 64, 512);
  c.save();
  c.translate(32, 256);
  c.rotate(-Math.PI / 2);
  c.fillStyle = "#ffffff";
  c.font = "bold 30px sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("REMOVE BEFORE FLIGHT", 0, 2);
  c.restore();
  const t = new CanvasTexture(lienzo);
  t.colorSpace = SRGBColorSpace;
  return t;
}

let cinta: CanvasTexture | null | undefined;

/** Lo que se anima al quitar algo. */
interface Quitando {
  readonly que: Group;
  /** Hacia dónde se va, m por segundo, en los ejes del avión. */
  readonly hacia: { x: number; y: number; z: number };
  /** Cuánto le queda, s. */
  queda: number;
  /** Si al acabar desaparece o se queda donde ha llegado. */
  readonly sedesvanece: boolean;
}

export class FundasYCalzos {
  readonly grupo = new Group();
  private readonly fundas: Group[] = [];
  private readonly calzos: Group[] = [];
  private readonly materiales: Material[] = [];
  private readonly geometrias: (BoxGeometry | CylinderGeometry | PlaneGeometry)[] = [];
  private readonly quitando: Quitando[] = [];

  /**
   * `fundas`: dónde está cada sonda; `rueda`: la caja de la rueda principal
   * izquierda, que se refleja a la derecha; `tamano`: lo que mide el avión,
   * para que la funda de un reactor no sea la de una avioneta.
   */
  constructor(fundas: readonly Vector3[], rueda: Box3 | null, tamano: number, conCalzos: boolean) {
    this.grupo.name = "fundas-y-calzos";
    const escala = Math.max(1, Math.sqrt(tamano / 11));
    cinta ??= cintaPintada();
    const rojo = new MeshLambertMaterial({ color: ROJO });
    const deCinta = new MeshBasicMaterial({
      color: cinta ? 0xffffff : ROJO,
      map: cinta ?? null,
      side: DoubleSide,
    });
    this.materiales.push(rojo, deCinta);
    const manga = new CylinderGeometry(0.03 * escala, 0.03 * escala, 0.24 * escala, 8);
    manga.rotateX(Math.PI / 2);
    const tira = new PlaneGeometry(0.05 * escala, 0.42 * escala);
    this.geometrias.push(manga, tira);
    for (const p of fundas) {
      const g = new Group();
      g.position.copy(p);
      // La manga sobre la punta del tubo, que mira hacia delante.
      const m = new Mesh(manga, rojo);
      m.position.z = -0.08 * escala;
      const t = new Mesh(tira, deCinta);
      // Colgando, girada de cara al costado para que se lea desde fuera.
      t.position.set(0, -0.23 * escala, -0.12 * escala);
      t.rotation.y = Math.PI / 2;
      t.rotation.z = 0.08;
      g.add(m, t);
      this.fundas.push(g);
      this.grupo.add(g);
    }
    if (conCalzos && rueda) {
      const alto = rueda.max.y - rueda.min.y;
      const r = alto / 2;
      const ancho = Math.max(0.12, (rueda.max.x - rueda.min.x) * 1.3);
      const amarillo = new MeshLambertMaterial({ color: AMARILLO });
      this.materiales.push(amarillo);
      /*
       * La cuña: un prisma de tres caras tumbado a lo ancho de la rueda, con
       * una cara en el suelo. Un cilindro de tres lados es eso mismo.
       */
      const cuna = new CylinderGeometry(r * 0.45, r * 0.45, ancho, 3);
      cuna.rotateZ(Math.PI / 2);
      cuna.rotateX(Math.PI / 6);
      this.geometrias.push(cuna);
      const cx = (rueda.min.x + rueda.max.x) / 2;
      const suelo = rueda.min.y + r * 0.45 * 0.5;
      for (const lado of [1, -1])
        for (const delante of [true, false]) {
          const g = new Group();
          const z = delante ? rueda.min.z - r * 0.32 : rueda.max.z + r * 0.32;
          g.position.set(cx * lado, suelo, z);
          g.add(new Mesh(cuna, amarillo));
          g.userData.lado = lado;
          this.calzos.push(g);
          this.grupo.add(g);
        }
    }
  }

  /** Si queda alguna funda puesta a la vista. */
  get conFunda(): boolean {
    return this.fundas.some((f) => f.visible);
  }

  /** Quita las fundas: salen hacia arriba y se desvanecen, o desaparecen sin más. */
  quitarFundas(animado: boolean): void {
    for (const f of this.fundas) {
      if (!f.visible) continue;
      if (!animado) {
        f.visible = false;
        continue;
      }
      this.quitando.push({
        que: f,
        hacia: { x: Math.sign(f.position.x || -1) * 1.2, y: 2.2, z: 0.4 },
        queda: 0.45,
        sedesvanece: true,
      });
    }
  }

  /** Aparta los calzos hacia fuera de la rueda: se quedan en el suelo, al lado. */
  quitarCalzos(animado: boolean): void {
    for (const c of this.calzos) {
      if (!c.visible || c.userData.apartado) continue;
      c.userData.apartado = true;
      if (!animado) {
        c.visible = false;
        continue;
      }
      const lado = (c.userData.lado as number) ?? 1;
      this.quitando.push({
        que: c,
        hacia: { x: -lado * 1.6, y: 0, z: 0 },
        queda: 0.6,
        sedesvanece: false,
      });
    }
  }

  /** Lo quita todo de golpe: al arrancar, quien está abajo se lo lleva. */
  recogerCalzos(): void {
    for (const c of this.calzos) c.visible = false;
  }

  /** Un paso de las animaciones. No cuesta nada si no hay ninguna. */
  paso(dt: number): void {
    for (let i = this.quitando.length - 1; i >= 0; i--) {
      const q = this.quitando[i]!;
      const d = Math.min(dt, q.queda);
      q.que.position.x += q.hacia.x * d;
      q.que.position.y += q.hacia.y * d;
      q.que.position.z += q.hacia.z * d;
      if (q.sedesvanece) q.que.scale.multiplyScalar(Math.max(0.2, 1 - 2.2 * d));
      q.queda -= d;
      if (q.queda <= 0) {
        if (q.sedesvanece) q.que.visible = false;
        this.quitando.splice(i, 1);
      }
    }
  }

  /** Suelta lo que ocupa en la tarjeta gráfica. */
  soltar(): void {
    this.grupo.removeFromParent();
    for (const g of this.geometrias) g.dispose();
    for (const m of this.materiales) m.dispose();
  }
}
