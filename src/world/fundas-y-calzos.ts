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
  Vector3,
  type Box3,
  type Material,
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
   * para que la funda de un reactor no sea la de una avioneta; `actitud`: el
   * cabeceo con el que descansa parado, rad, morro arriba positivo: el de
   * `actitudEnTierra` a velocidad cero, en `flight/apoyo.ts`.
   */
  constructor(
    fundas: readonly Vector3[],
    rueda: Box3 | null,
    tamano: number,
    conCalzos: boolean,
    actitud: number,
  ) {
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
      /*
       * **En el suelo, no en el plano de las ruedas del dibujo.**
       *
       * Los calzos van dentro del grupo del avión, que cabecea con él, y se
       * ponían a la altura de lo más bajo de la rueda con el avión a nivel.
       * En un triciclo parado da igual, porque descansa a nivel; el de rueda
       * de cola descansa con el morro arriba —el JAZ 25, doce grados—, y el
       * calzo de detrás de cada rueda se metía trece centímetros en el
       * asfalto y el de delante flotaba siete. Lo cazaron los dos bancos que
       * miran lo más bajo del avión contra lo que se ve: `verificar-ruedas` y
       * el del vuelo entero, que lo daban por «hundido 0,13 m» con las ruedas
       * en su sitio.
       *
       * Así que cada calzo se pone desde el punto en el que la rueda toca
       * con esa actitud —bajo su eje, en la vertical del mundo—, a lo largo
       * del suelo y no del fuselaje, y girado lo contrario que el avión para
       * que apoye su cara plana. Con actitud cero sale lo de siempre.
       */
      const cx = (rueda.min.x + rueda.max.x) / 2;
      const eje = new Vector3(cx, (rueda.min.y + rueda.max.y) / 2, (rueda.min.z + rueda.max.z) / 2);
      // Arriba y atrás del mundo, vistos desde el avión con el morro a `actitud`.
      const arriba = new Vector3(0, Math.cos(actitud), -Math.sin(actitud));
      const atras = new Vector3(0, Math.sin(actitud), Math.cos(actitud));
      const toca = eje.clone().addScaledVector(arriba, -r);
      // La cuña tiene la cara de abajo a medio radio de su centro.
      const alzado = r * 0.45 * 0.5;
      const aparte = (rueda.max.z - rueda.min.z) / 2 + r * 0.32;
      for (const lado of [1, -1])
        for (const delante of [true, false]) {
          const g = new Group();
          const donde = toca
            .clone()
            .addScaledVector(atras, delante ? -aparte : aparte)
            .addScaledVector(arriba, alzado);
          g.position.set(cx * lado, donde.y, donde.z);
          g.rotation.x = -actitud;
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

  /**
   * Se lleva los calzos: al arrancar, quien está abajo se los lleva. De golpe
   * en la avioneta, que es cosa de un momento; **animado** en el de línea,
   * donde los saca el personal de tierra delante de quien mira: salen de
   * debajo del avión hacia fuera y se van. Si no, el avión grande aparecía
   * sin calzos sin que nadie los hubiera quitado.
   */
  recogerCalzos(animado = false): void {
    for (const c of this.calzos) {
      if (!c.visible) continue;
      if (!animado) {
        c.visible = false;
        continue;
      }
      const lado = (c.userData.lado as number) ?? 1;
      this.quitando.push({
        que: c,
        hacia: { x: -lado * 2.4, y: 0, z: 0 },
        queda: 1.1,
        sedesvanece: true,
      });
    }
  }

  /** Cuántos calzos se ven puestos. Para las pruebas y el banco. */
  get calzosALaVista(): number {
    return this.calzos.filter((c) => c.visible && !c.userData.apartado).length;
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
