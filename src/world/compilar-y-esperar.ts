/**
 * **Compilar lo que se va a colgar y esperar a que la tarjeta lo tenga**, sin
 * que la espera pueda reventar ni quedarse colgada.
 *
 * Es `WebGLRenderer.compileAsync` de three, que se usaba tal cual para los
 * sitios con modelo (`world/sitios-con-modelo.ts`): compila los programas y
 * pregunta cada diez milésimas, desde un temporizador, si la tarjeta ya los ha
 * enlazado. Esa pregunta lee el programa del material en las tablas de three,
 * y **si el material se tira mientras se pregunta** —pasa al cambiar de mundo:
 * `soltarTodo` tira el material con el que se calienta el sombreado de los
 * sitios—, three ya ha borrado su fila y la pregunta es `undefined.isReady()`:
 * una excepción en un temporizador, que no recoge nadie, y una promesa que no
 * se cumple nunca. Lo vio H23c (enmienda del ADR 0028) y aquí se arregla:
 *
 * - **Un material tirado deja de esperarse.** Se le escucha el `dispose`, y lo
 *   que no tenga programa en las tablas cuenta como listo, que es lo que es:
 *   ya no hay nada que dibujar con él.
 * - **Y la espera tiene plazo.** Con la tarjeta perdida, `isReady` no dice
 *   nunca que sí, y quien espera —`bajar`, en los sitios— no volvería a bajar
 *   ningún otro. Pasado el plazo se da por hecho: lo peor que pasa es el tirón
 *   del primer dibujo, que es lo que habría sin esperar.
 *
 * Lo demás es lo de three, en el mismo orden: `compile` con las luces y la
 * niebla de la escena, y la primera pregunta ya si la tarjeta compila en
 * paralelo o a las diez milésimas si no.
 */
import type { Camera, Material, Object3D, Scene, WebGLRenderer } from "three";

/** Lo que hace falta del pintor de three. */
export type PintorQueCompila = Pick<WebGLRenderer, "compile" | "properties" | "extensions">;

/** Lo más que se espera a la tarjeta, ms: varias veces lo que tarda en la tablet. */
export const PLAZO_DE_COMPILAR = 5000;
/** Cada cuánto se le pregunta, ms: lo de three. */
const CADA = 10;

interface ConPrograma {
  readonly currentProgram?: { isReady(): boolean | null };
}

export function compilarYEsperar(
  pintor: PintorQueCompila,
  objeto: Object3D,
  camara: Camera,
  escena: Scene,
  plazo = PLAZO_DE_COMPILAR,
): Promise<void> {
  const pendientes = new Set<Material>(pintor.compile(objeto, camara, escena));
  if (pendientes.size === 0) return Promise.resolve();
  return new Promise((listo) => {
    const desde = performance.now();
    const quitar = (m: Material): void => {
      pendientes.delete(m);
      m.removeEventListener("dispose", alTirar);
    };
    function alTirar(e: { readonly target: Material }): void {
      quitar(e.target);
    }
    for (const m of pendientes) m.addEventListener("dispose", alTirar);
    const mirar = (): void => {
      for (const m of pendientes) {
        let hecho = true;
        try {
          const programa = (pintor.properties.get(m) as ConPrograma | undefined)?.currentProgram;
          hecho = !programa || programa.isReady() === true;
        } catch {
          // Lo que no se puede preguntar no se espera: ver la cabecera.
        }
        if (hecho) quitar(m);
      }
      if (pendientes.size === 0 || performance.now() - desde >= plazo) {
        for (const m of pendientes) m.removeEventListener("dispose", alTirar);
        pendientes.clear();
        listo();
        return;
      }
      setTimeout(mirar, CADA);
    };
    if (pintor.extensions.has("KHR_parallel_shader_compile")) mirar();
    else setTimeout(mirar, CADA);
  });
}
