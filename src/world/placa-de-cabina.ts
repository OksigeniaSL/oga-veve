/**
 * **La placa de la matrícula, atornillada al panel de la cabina.**
 *
 * Todo avión lleva su matrícula en una placa delante de quien vuela: es lo
 * que se lee para decirla por radio. Aquí solo iba pintada fuera, en el
 * fuselaje, que desde el asiento no se ve, y la torre llamaba «Zulu Echo
 * Juliett Juliett» sin nada en la cabina con qué compararlo. Contado jugando:
 * «¿cómo sé que soy yo?».
 *
 * Es la misma placa que la del cuadro plano —ver `placaDeMatricula` en
 * `ui/tablero.ts`—: chapa clara, dos tornillos y letra negra grabada. Una
 * forma que se reconoce antes de saber leerla, y que es la misma en la
 * lámpara de la torre y en la tira de la radio.
 *
 * ## Dónde va
 *
 * Debajo de los instrumentos, a la izquierda, que es donde la llevan muchos
 * aviones y donde en los seis modelos queda panel libre. Los modelos no traen
 * un sitio marcado para ella, así que se busca: la caja que ocupan relojes y
 * pantallas —los materiales `reloj_…` y `g1000_display`, que son el contrato
 * con los guiones de Blender— dice dónde acaban los instrumentos, y un rayo
 * desde los ojos del piloto hasta ese punto dice **dónde está la superficie
 * del panel** de verdad y hacia dónde mira. Poniéndola a ojo, un panel
 * inclinado se la tragaba o la dejaba flotando.
 *
 * Y se alumbra como la chapa del panel: de día con la luz que rebota dentro,
 * de noche con el rojo. Ver `luz-de-cabina.ts`, que la reconoce por su
 * material, `placa`.
 */

import {
  Box3,
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Vector3,
  type Material,
} from "three";

/** El lienzo de la placa: cuatro de ancho por uno de alto, como la del cuadro. */
const ANCHO = 512;
const ALTO = 128;

/** Lo que mide la placa de verdad, m: como las que llevan los aviones. */
const LARGO_MINIMO = 0.075;
const LARGO_MAXIMO = 0.12;

/** Lo que se separa del panel hacia los ojos, m: lo justo para no parpadear. */
const DESPEGUE = 0.003;

/** Pinta la placa en un lienzo. Aparte, para poder comprobarla sin three. */
export function pintarPlaca(g: CanvasRenderingContext2D, matricula: string): void {
  const chapa = g.createLinearGradient(0, 0, 0, ALTO);
  chapa.addColorStop(0, "#e4e6e1");
  chapa.addColorStop(1, "#c3c7c0");
  g.fillStyle = chapa;
  g.fillRect(0, 0, ANCHO, ALTO);
  // El filo, para que se lea como una pieza puesta y no como una pegatina.
  g.strokeStyle = "rgba(0, 0, 0, 0.55)";
  g.lineWidth = 6;
  g.strokeRect(3, 3, ANCHO - 6, ALTO - 6);
  // Los dos tornillos.
  g.fillStyle = "#858a84";
  for (const x of [28, ANCHO - 28]) {
    g.beginPath();
    g.arc(x, ALTO / 2, 9, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#141816";
  g.font = `700 78px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(matricula, ANCHO / 2, ALTO / 2 + 4);
}

/** Los instrumentos del panel: donde acaban dice dónde va la placa. */
function esInstrumento(m: Mesh): boolean {
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as
    | Material
    | undefined;
  const nombre = mat?.name ?? "";
  return nombre === "g1000_display" || nombre.startsWith("reloj_");
}

export interface PlacaDeCabina {
  readonly malla: Mesh;
  dispose(): void;
}

/**
 * Atornilla la placa al panel de un modelo ya colocado.
 *
 * `grupo` es el de la aeronave, donde +X es la derecha del piloto, +Y arriba y
 * el morro va hacia −Z —ver `encenderPantallas`—; `ojo`, dónde tiene los ojos
 * el piloto en ese mismo grupo. La placa se cuelga de `raiz`, que es lo que
 * recorre la luz de la cabina.
 *
 * Devuelve `null` si el modelo no tiene instrumentos o no hay ojos que mirar:
 * el avión de cajas no tiene panel.
 */
export function atornillarPlaca(
  raiz: Object3D,
  grupo: Object3D,
  ojo: { readonly x: number; readonly y: number; readonly z: number } | undefined,
  matricula: string,
): PlacaDeCabina | null {
  if (!ojo || typeof document === "undefined") return null;
  grupo.updateWorldMatrix(true, true);
  const caja = new Box3();
  const mallas: Mesh[] = [];
  raiz.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) mallas.push(m);
    if (!m.isMesh || !esInstrumento(m)) return;
    const suya = new Box3().setFromObject(m);
    for (const x of [suya.min.x, suya.max.x])
      for (const y of [suya.min.y, suya.max.y])
        for (const z of [suya.min.z, suya.max.z])
          caja.expandByPoint(grupo.worldToLocal(new Vector3(x, y, z)));
  });
  if (caja.isEmpty()) return null;

  const largo = Math.min(
    LARGO_MAXIMO,
    Math.max(LARGO_MINIMO, (caja.max.x - caja.min.x) * 0.16),
  );
  const alto = largo / 4;
  const ojos = grupo.localToWorld(new Vector3(ojo.x, ojo.y, ojo.z));
  const rayo = new Raycaster();

  /*
   * Tres sitios, por orden: debajo a la izquierda, debajo a la derecha y
   * encima a la izquierda. Vale el primero en el que el rayo desde los ojos
   * da en el panel **cerca de donde se apuntó**: si da en algo de delante —el
   * volante, una palanca—, ese sitio está tapado y se prueba el siguiente.
   */
  const medio = (caja.min.z + caja.max.z) / 2;
  const sitios = [
    new Vector3(caja.min.x + largo / 2 + 0.01, caja.min.y - alto, medio),
    new Vector3(caja.max.x - largo / 2 - 0.01, caja.min.y - alto, medio),
    new Vector3(caja.min.x + largo / 2 + 0.01, caja.max.y + alto, medio),
  ];
  let donde: Vector3 | null = null;
  let normal: Vector3 | null = null;
  for (const sitio of sitios) {
    const apunto = grupo.localToWorld(sitio.clone());
    rayo.set(ojos, apunto.clone().sub(ojos).normalize());
    const tocado = rayo.intersectObjects(mallas, false)[0];
    if (!tocado?.face) continue;
    // Tapado: lo primero que se ve está lejos del panel.
    if (tocado.point.distanceTo(apunto) > largo * 1.2) continue;
    const n = tocado.face.normal
      .clone()
      .transformDirection(tocado.object.matrixWorld);
    // La cara que mira a los ojos, no la de detrás.
    if (n.dot(ojos.clone().sub(tocado.point)) < 0) n.negate();
    donde = tocado.point.clone();
    normal = n;
    break;
  }
  // Sin panel donde apoyarla, mirando a los ojos debajo de los instrumentos.
  if (!donde || !normal) {
    donde = grupo.localToWorld(sitios[0]!.clone());
    normal = ojos.clone().sub(donde).normalize();
  }

  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const g = lienzo.getContext("2d");
  if (!g) return null;
  pintarPlaca(g, matricula);
  const textura = new CanvasTexture(lienzo);
  // Color de lienzo: sin esto el negro de las letras sale gris.
  textura.colorSpace = SRGBColorSpace;
  textura.minFilter = LinearFilter;
  textura.anisotropy = 4;
  const material = new MeshStandardMaterial({
    name: "placa",
    map: textura,
    // Y la luz propia pasa por el mismo dibujo, para que las letras sigan
    // negras cuando `luz-de-cabina` la alumbra de día o la tiñe de rojo.
    emissiveMap: textura,
    roughness: 0.55,
    metalness: 0.2,
  });
  const malla = new Mesh(new PlaneGeometry(largo, alto), material);
  malla.name = "placa-matricula";

  // Puesta en el mundo y pasada a las coordenadas de `raiz`, que puede
  // llevar escala y media vuelta: `applyMatrix4` las deshace las dos.
  const colocada = new Object3D();
  colocada.position.copy(donde.addScaledVector(normal, DESPEGUE));
  colocada.up.copy(new Vector3(0, 1, 0).transformDirection(grupo.matrixWorld));
  colocada.lookAt(colocada.position.clone().add(normal));
  colocada.updateMatrixWorld(true);
  raiz.updateWorldMatrix(true, false);
  malla.applyMatrix4(
    raiz.matrixWorld.clone().invert().multiply(colocada.matrixWorld),
  );
  raiz.add(malla);
  return {
    malla,
    dispose() {
      textura.dispose();
      material.dispose();
      malla.geometry.dispose();
    },
  };
}
