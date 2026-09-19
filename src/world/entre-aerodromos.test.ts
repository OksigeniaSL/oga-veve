/**
 * Dónde cae un aeródromo visto desde otro.
 *
 * Lo que se comprueba no son coordenadas inventadas: son **los aeródromos de
 * verdad que ya están en el juego**, con las distancias y los rumbos que
 * cualquiera puede mirar en una carta. Si esto se desvía, el segundo
 * aeropuerto aparece en el sitio equivocado del mar.
 */

import { describe, expect, it } from "vitest";
import {
  distanciaEntre,
  dondeCae,
  rumboHacia,
  type Sitio,
} from "./entre-aerodromos";

/** Los campos que ya están extraídos, con sus coordenadas de verdad. */
const CAMPOS: Record<string, Sitio> = {
  "tenerife-norte": { lat: 28.482752, lon: -16.341707 },
  "tenerife-sur": { lat: 28.044, lon: -16.5725 },
  "la-gomera": { lat: 28.0296, lon: -17.2146 },
  "el-hierro": { lat: 27.8148, lon: -17.8871 },
  "la-palma": { lat: 28.6265, lon: -17.7556 },
  lanzarote: { lat: 28.9455, lon: -13.6052 },
  fuerteventura: { lat: 28.4527, lon: -13.8638 },
};

describe("dónde cae un aeródromo desde otro", () => {
  it("un campo visto desde sí mismo está en el origen", () => {
    for (const [id, sitio] of Object.entries(CAMPOS)) {
      const { x, z } = dondeCae(sitio, sitio);
      expect(Math.hypot(x, z), id).toBeLessThan(0.001);
    }
  });

  it("y las distancias son las de la carta", () => {
    /*
     * Las cuatro rutas cortas de Canarias, que son las que caben en un mundo y
     * las que se vuelan de verdad todos los días con turbohélice. Un kilómetro
     * de holgura: las coordenadas son las del aeródromo, no las del umbral.
     */
    const rutas: [string, string, number][] = [
      ["tenerife-norte", "tenerife-sur", 53.8],
      ["lanzarote", "fuerteventura", 60.3],
      ["tenerife-sur", "la-gomera", 63.0],
      ["la-gomera", "el-hierro", 70.3],
      ["la-gomera", "la-palma", 84.9],
    ];
    for (const [a, b, km] of rutas) {
      const medido = distanciaEntre(CAMPOS[a]!, CAMPOS[b]!) / 1000;
      expect(medido, `${a} ↔ ${b}: ${medido.toFixed(1)} km`).toBeCloseTo(km, 0);
    }
  });

  it("y la distancia es la misma en los dos sentidos", () => {
    for (const a of Object.values(CAMPOS))
      for (const b of Object.values(CAMPOS))
        expect(distanciaEntre(a, b)).toBeCloseTo(distanciaEntre(b, a), 3);
  });

  it("y el signo del eje Z es el del juego: al sur, z positiva", () => {
    /*
     * **Es el error que se cuela solo.** Tenerife Sur está al sur de Tenerife
     * Norte, así que tiene que caer con z **positiva**; y al oeste, o sea con
     * x negativa. Si algún día sale al revés, el aeropuerto de destino aparece
     * reflejado y nadie lo nota hasta que vuela hacia él y se aleja.
     */
    const { x, z } = dondeCae(
      CAMPOS["tenerife-norte"]!,
      CAMPOS["tenerife-sur"]!,
    );
    expect(z).toBeGreaterThan(0);
    expect(x).toBeLessThan(0);
  });

  it("y los rumbos son los de un compás, no los de la trigonometría", () => {
    // Al norte 0, al este 90, al sur 180, al oeste 270.
    const centro: Sitio = { lat: 28, lon: -16 };
    expect(rumboHacia(centro, { lat: 29, lon: -16 })).toBeCloseTo(0, 1);
    expect(rumboHacia(centro, { lat: 28, lon: -15 })).toBeCloseTo(90, 1);
    expect(rumboHacia(centro, { lat: 27, lon: -16 })).toBeCloseTo(180, 1);
    expect(rumboHacia(centro, { lat: 28, lon: -17 })).toBeCloseTo(270, 1);
  });

  it("y de Tenerife Norte a Tenerife Sur se vuela al sursuroeste", () => {
    // La ruta de verdad: unos 200 grados. Si sale 160 es que el signo de Z se
    // coló en el rumbo, y eso no lo enseña ninguna prueba de distancia.
    const r = rumboHacia(CAMPOS["tenerife-norte"]!, CAMPOS["tenerife-sur"]!);
    expect(r, `${r.toFixed(0)}°`).toBeGreaterThan(180);
    expect(r, `${r.toFixed(0)}°`).toBeLessThan(230);
  });

  it("y el rumbo de vuelta es el contrario, más o menos", () => {
    for (const [a, b] of [
      ["tenerife-norte", "tenerife-sur"],
      ["lanzarote", "fuerteventura"],
      ["la-gomera", "el-hierro"],
    ] as const) {
      const ida = rumboHacia(CAMPOS[a]!, CAMPOS[b]!);
      const vuelta = rumboHacia(CAMPOS[b]!, CAMPOS[a]!);
      // La diferencia entre los dos rumbos tiene que ser media vuelta. Y se
      // mide en el círculo, que para eso es un rumbo: 350 y 10 distan 20.
      const diferencia = (ida - vuelta + 360) % 360;
      expect(
        diferencia,
        `${a} ida ${ida.toFixed(0)}° vuelta ${vuelta.toFixed(0)}°`,
      ).toBeCloseTo(180, 0);
    }
  });
});
