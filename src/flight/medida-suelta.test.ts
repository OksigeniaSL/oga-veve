import { describe, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT } from "./aircraft";
import { neutralControls } from "./model";
const DT = 1 / 120;
describe("el planeo del grande", () => {
  it("lo dice", () => {
    const a = AIRCRAFT.find((x) => x.id === "jaz-120")!;
    const AR = (a.wingSpan * a.wingSpan) / a.wingArea;
    const clOpt = Math.sqrt(Math.PI * AR * a.aero.oswald * a.aero.cd0);
    const v = Math.sqrt((2 * a.mass * 9.81) / (1.225 * a.wingArea * clOpt));
    console.log(
      `  óptimo teórico ${v.toFixed(1)} m/s, L/D ${(0.5 * Math.sqrt((Math.PI * AR * a.aero.oswald) / a.aero.cd0)).toFixed(1)}`,
    );
    const m = new CoefficientFlightModel({
      aircraft: a,
      ground: () => 0,
      assist: 0,
    });
    m.reset({ position: new Vector3(0, 8000, 0), heading: 0, airspeed: v });
    let ultimo = m.state.position.clone();
    for (let k = 0; k < Math.round(400 / DT); k++) {
      const e = Math.max(
        -0.5,
        Math.min(0.5, (m.state.airspeed - v) * 0.06 - m.state.pitchRate * 1.2),
      );
      m.step(DT, {
        ...neutralControls(),
        engineOn: false,
        throttle: 0,
        elevator: e,
      });
      if (k % Math.round(40 / DT) === 0) {
        const d = m.state.position.clone();
        const caida = ultimo.y - d.y;
        const av = Math.hypot(d.x - ultimo.x, d.z - ultimo.z);
        console.log(
          `   ${(k * DT).toFixed(0).padStart(4)} s  V ${m.state.airspeed.toFixed(1).padStart(6)}  alfa ${((m.state.alpha * 180) / Math.PI).toFixed(1).padStart(6)}°  vs ${m.state.verticalSpeed.toFixed(2).padStart(6)}  y ${d.y.toFixed(0).padStart(5)}  L/D tramo ${caida > 1 ? (av / caida).toFixed(1) : "—"}  perdida ${m.state.stalled}`,
        );
        ultimo = d;
      }
    }
  });
});
