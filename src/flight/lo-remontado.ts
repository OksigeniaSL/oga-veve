/**
 * **Si quien juega ya ha remontado la pista**: desde donde la pisó, se ha ido
 * hacia la cabecera más de `SIN_REMONTAR` metros.
 *
 * Es una sola regla y la miran dos sitios, a propósito:
 *
 * - `vigilarElRemonte` en `flight/vuelo.ts` (H41f): quien remontó y dio la
 *   vuelta un poco antes del lazo dibujado hizo lo que dijo la torre, y no se
 *   le cuenta que despegó sin remontar.
 * - `situacion` en `world/plan-de-vuelo.ts` (H41i): a ese mismo piloto se le
 *   da por acabado el remonte en cuanto mira pista abajo, y con eso le llegan
 *   la verde fija y su «cleared for take-off». Antes la bandera del remonte
 *   seguía puesta hasta el lazo, y despegaba sin oír la autorización.
 *
 * Si fueran dos cuentas, un día dirían cosas distintas: la torre daría por
 * remontado a quien la instructora le cuenta que no remontó, o al revés.
 *
 * Mirar pista abajo **no basta**: hay entradas que llegan así a la pista antes
 * de remontar —un chaflán, una boca—, y darles la verde fija ahí es darles la
 * autorización de despegar a quien todavía tiene que rodar la pista hacia
 * atrás, que es justo lo que arregló la H41h.
 */

/**
 * Lo que se puede ir hacia la cabecera por la pista y seguir siendo entrar y
 * alinearse, m: más es haber remontado, aunque sea poco.
 */
export const SIN_REMONTAR = 30;

/** Lo que se lleva remontado desde que se pisó la pista. Se mira en cada paso. */
export class LoRemontado {
  /** Dónde se pisó la pista, m del eje, y lo más hacia la cabecera que se fue desde ahí. */
  private pisada: { entra: number; masAtras: number } | null = null;

  /**
   * Con lo de este paso: si se está en la pista y en qué metro de ella, a lo
   * largo del eje desde el centro y creciendo hacia donde se despega —como
   * `alLargoDePista`—. Al salir de la pista se olvida: entrar otra vez es
   * empezar a contar otra vez.
   */
  mirar(enPista: boolean, alLargo: number): void {
    if (!enPista) {
      this.pisada = null;
      return;
    }
    const p = this.pisada ?? { entra: alLargo, masAtras: alLargo };
    p.masAtras = Math.min(p.masAtras, alLargo);
    this.pisada = p;
  }

  /** Si desde que se pisó la pista se ha ido hacia la cabecera más de `SIN_REMONTAR`. */
  get remonto(): boolean {
    return this.pisada !== null && this.pisada.entra - this.pisada.masAtras > SIN_REMONTAR;
  }

  /** Para empezar de cero: un vuelo nuevo. */
  olvidar(): void {
    this.pisada = null;
  }
}
