/**
 * **La pantalla, despierta mientras se vuela.**
 *
 * Contado con una captura del teléfono: «si el teléfono tiene previsto un
 * minuto para el modo reposo, se apaga y se para el juego; regreso y tengo la
 * pantalla sin avanzar el vuelo». Con el automático puesto, un crucero son
 * minutos sin tocar la pantalla, y el teléfono no distingue eso de que nadie
 * lo esté mirando: apaga la pantalla, la pestaña se oculta y el vuelo se para.
 *
 * Lo que lo arregla es lo que hace cualquier aplicación de mapas o de vídeo:
 * pedirle al sistema que no apague la pantalla **mientras se vuela**, con la
 * API de Screen Wake Lock, y soltarla en cuanto no se vuela —en la pausa, en
 * un panel, en el hangar—. Una pantalla encendida sin que pase nada es
 * batería del teléfono de una madre gastada para nada.
 *
 * Dos cosas de la API que mandan en cómo está escrito esto:
 *
 * - **El sistema suelta el cerrojo solo** cuando la pestaña se oculta, y no
 *   lo devuelve al volver. Así que se apunta lo que se *quiere* y se vuelve a
 *   pedir al hacerse visible, si se sigue queriendo.
 * - **Puede negarse**: sin la API —Firefox viejo, un navegador de aula—, con
 *   el ahorro de batería puesto o en una ventana sin permiso. Entonces no pasa
 *   nada: el juego se para al ocultarse, que es lo que hacía, y al volver se
 *   encuentra la pausa y no un vuelo congelado. Ver `atender` en `main.ts`.
 */

/** Lo que se usa de `navigator.wakeLock`. Aparte, para poder probarlo. */
export interface Despertador {
  request(tipo: "screen"): Promise<Cerrojo>;
}

/** Lo que se usa del cerrojo que devuelve. */
export interface Cerrojo {
  readonly released?: boolean;
  release(): Promise<void>;
  addEventListener?(evento: "release", cb: () => void): void;
}

/** Lo que se usa del documento: si se ve y cuándo cambia. */
export interface Documento {
  readonly visibilityState: string;
  addEventListener(evento: "visibilitychange", cb: () => void): void;
}

export class PantallaDespierta {
  private quiere = false;
  private cerrojo: Cerrojo | null = null;
  /** Una petición en vuelo: dos seguidas pedirían dos cerrojos. */
  private pidiendo = false;

  constructor(
    private readonly despertador: Despertador | null = despertadorDelNavegador(),
    private readonly documento: Documento | null = globalThis.document ?? null,
  ) {
    this.documento?.addEventListener("visibilitychange", () => {
      if (this.documento?.visibilityState === "visible") this.pedir();
    });
  }

  /** Si la pantalla tiene ahora mismo el cerrojo puesto. Para las pruebas. */
  get puesta(): boolean {
    return this.cerrojo !== null && !this.cerrojo.released;
  }

  /** `true` mientras se vuela; `false` en la pausa, un panel o el hangar. */
  ponerse(despierta: boolean): void {
    this.quiere = despierta;
    if (despierta) this.pedir();
    else this.soltar();
  }

  private pedir(): void {
    if (!this.quiere || !this.despertador || this.pidiendo || this.puesta) return;
    if (this.documento && this.documento.visibilityState !== "visible") return;
    this.pidiendo = true;
    this.despertador
      .request("screen")
      .then((cerrojo) => {
        this.pidiendo = false;
        /*
         * Y si mientras se pedía se dejó de volar, se suelta en el acto: un
         * cerrojo que llega tarde a una pausa la dejaría con la pantalla
         * encendida hasta que se volviera a volar.
         */
        if (!this.quiere) {
          void cerrojo.release().catch(() => {});
          return;
        }
        this.cerrojo = cerrojo;
        cerrojo.addEventListener?.("release", () => {
          if (this.cerrojo === cerrojo) this.cerrojo = null;
        });
      })
      .catch(() => {
        // Negado: se vuela igual. Ver la cabecera.
        this.pidiendo = false;
      });
  }

  private soltar(): void {
    const cerrojo = this.cerrojo;
    this.cerrojo = null;
    if (cerrojo && !cerrojo.released) void cerrojo.release().catch(() => {});
  }
}

function despertadorDelNavegador(): Despertador | null {
  const n = globalThis.navigator as
    | (Navigator & { wakeLock?: Despertador })
    | undefined;
  return n?.wakeLock ?? null;
}
