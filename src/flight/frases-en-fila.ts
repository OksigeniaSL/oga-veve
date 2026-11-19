/**
 * **Las frases de un ejercicio, de una en una**: cada una se pide cuando la
 * anterior del mismo ejercicio ha acabado, y no antes.
 *
 * Es lo que aprendió el altímetro (ADR 0031, enmienda H26t, y
 * `porDecirDelAltimetro` en `game.ts`): pedidas en cuanto pasaba su paso, con
 * las frases grabadas una se quedaba esperando detrás de la anterior más de
 * los cuatro segundos que aguanta una explicación en la cola de la boca, y se
 * caía sin sonar. Sin grabar no ocupan la boca y en el banco no se ve. Aquí
 * está escrito para que lo use otro ejercicio sin copiarlo: el primero es
 * «Se apaga el GPS» (`gps-con-apagones.ts`).
 *
 * - Una frase pedida espera a saber cómo acabó; si no llega noticia en
 *   `tope` segundos de pared, se sigue: una frase sin noticias no deja al
 *   ejercicio mudo para siempre.
 * - La que se cae por esperar detrás de lo que no es del ejercicio se pide
 *   otra vez, unas pocas veces (`otraVezSi`, `otraVezHasta`).
 * - La que dejó de ser verdad mientras esperaba (`vale`) no se pide.
 *
 * Sin audio ni DOM: quien habla, el reloj y el cuaderno de lo que se canta
 * llegan de fuera.
 */

import type { AlSonar } from "../audio/instructor";

export interface BocaDeLaFila<K extends string> {
  /** Pide la frase; `true` si se pidió. Avisa cómo va con `alSonar`. */
  readonly decir: (clave: K, alSonar: AlSonar) => boolean;
  /** El reloj de pared, s. */
  readonly reloj: () => number;
  /** Lo que se apunta en el cuaderno de lo cantado. */
  readonly apuntar: (que: string) => void;
  /** Quita de la boca la que estaba sonando o esperando. */
  readonly retirar: (clave: K) => void;
  /** Lo más que se espera noticia de una frase pedida, s de pared. */
  readonly tope: number;
  /** Por qué se vuelve a pedir una que se cayó. */
  readonly otraVezSi: ReadonlySet<string>;
  /** Y cuántas veces, como mucho. */
  readonly otraVezHasta: number;
}

export class FrasesEnFila<K extends string> {
  private porDecir: { readonly clave: K; readonly vale: () => boolean; readonly intentos: number }[] = [];
  private habla: { readonly clave: K; readonly desde: number } | null = null;

  constructor(private readonly boca: BocaDeLaFila<K>) {}

  /** Cuántas quedan por acabar: la que suena y las que esperan detrás. */
  get cuantas(): number {
    return this.porDecir.length + (this.habla ? 1 : 0);
  }

  /** Una más a la fila, y se suelta si la boca del ejercicio está libre. */
  pedir(clave: K, vale: () => boolean = () => true): void {
    this.porDecir.push({ clave, vale, intentos: 0 });
    this.soltar();
  }

  /** Pide la siguiente si la anterior ya acabó. Se llama cada paso. */
  soltar(): void {
    if (this.habla) {
      if (this.boca.reloj() - this.habla.desde < this.boca.tope) return;
      this.boca.apuntar(`${this.habla.clave}: sin noticias, se sigue`);
      this.habla = null;
    }
    while (this.porDecir.length) {
      const f = this.porDecir.shift()!;
      if (!f.vale()) {
        this.boca.apuntar(`${f.clave}: ya no es verdad, no se pide`);
        continue;
      }
      const esta = { clave: f.clave, desde: this.boca.reloj() };
      this.habla = esta;
      const pedida = this.boca.decir(f.clave, (que, porque) => {
        if (que === "empieza" || this.habla !== esta) return;
        this.habla = null;
        if (que === "se-cae" && this.boca.otraVezSi.has(porque ?? "") && f.intentos < this.boca.otraVezHasta)
          this.porDecir.unshift({ ...f, intentos: f.intentos + 1 });
      });
      if (pedida) return;
      if (this.habla === esta) this.habla = null;
    }
  }

  /** Lo que quedaba por decir, fuera: al cerrarse con percance o al volver a empezar. */
  olvidar(): void {
    this.porDecir = [];
    const clave = this.habla?.clave;
    if (clave) this.boca.retirar(clave);
    this.habla = null;
  }
}
