/**
 * **Una VMS, dos dibujos**: el cuadro plano la pinta en SVG (`pantallaVms`) y
 * la cabina en 3D en su lienzo (`pintarVms` en `world/pantallas-cabina.ts`), y
 * los dos leen de aquí sus escalas y el sitio de cada lectura. Lo que se mira
 * es que el SVG salga de esos datos y no de unos suyos: si no, el día que
 * cambie una banda cambiaría en uno solo.
 */
import { describe, expect, it } from "vitest";
import { SUPER_PUMA_EN_EL_JUEGO } from "../flight/helicoptero-en-el-juego";
import { bandasDelRotor, FLI, NR_MAXIMO } from "../flight/vms";
import { escalaDelFli, escalaDelRotor, lecturasDeLaVms, pantallaVms } from "./vms";

describe("la VMS, en datos", () => {
  it("el reloj del rotor lleva las bandas de la ficha, y el FLI las de su escala", () => {
    const b = bandasDelRotor(SUPER_PUMA_EN_EL_JUEGO.helicoptero!);
    const r = escalaDelRotor(SUPER_PUMA_EN_EL_JUEGO);
    expect(r.maximo).toBe(NR_MAXIMO);
    expect(r.arcos.find((a) => a.color === "verde")).toMatchObject({ desde: b.conMotor[0], hasta: b.conMotor[1] });
    expect(r.limites).toEqual([b.sinMotor[0], b.sinMotor[1]]);
    const f = escalaDelFli();
    expect(f.arcos).toEqual([
      { desde: 0, hasta: FLI.continua, color: "verde" },
      { desde: FLI.continua, hasta: FLI.despegue, color: "ambar" },
    ]);
    expect(f.limites).toEqual([FLI.transitoria]);
  });

  it("el cuadro plano pone cada lectura donde dicen los datos", () => {
    const motores = SUPER_PUMA_EN_EL_JUEGO.helicoptero!.motores.cuantos;
    const svg = pantallaVms(400, 416, SUPER_PUMA_EN_EL_JUEGO);
    const cajas = [...svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"[^>]*class="vms__caja"/g)].map(
      (m) => ({ x: Number(m[1]), y: Number(m[2]), ancho: Number(m[3]), alto: Number(m[4]) }),
    );
    const l = lecturasDeLaVms(motores);
    expect(cajas).toEqual([...l.fli, l.nr]);
  });
});
