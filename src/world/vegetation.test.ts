/**
 * Nada crece en la pista.
 *
 * Reportado mirando por la ventanilla: un árbol plantado en mitad del asfalto
 * de Silvio Pettirossi. La cuenta de la franja de pista solo acertaba con
 * rumbos alineados con los ejes —con 0° o 90° sale bien por simetría de los
 * ejes— y con cualquier otro giraba el rectángulo noventa grados. Las pistas
 * sintéticas van a 90° y 30°, así que no se notaba; el primer aeródromo real
 * corre a 192,45° y lo destapó.
 *
 * Y no es solo estética: un aeródromo tiene una franja de pista que debe
 * quedar libre de obstáculos, y se extiende más allá del asfalto.
 */

import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4 } from 'three';
import { SCENARIOS } from './scenarios';
import { createVegetation } from './vegetation';

describe('la franja de pista se respeta', () => {
  for (const escenario of SCENARIOS) {
    it(`${escenario.id}: ningún árbol sobre el asfalto`, () => {
      // Un suelo llano a media ladera: bastante alto para que crezca algo en
      // cualquier escenario y bastante bajo para no salirse de las bandas.
      const cota = Math.max(escenario.waterLevel + 40, escenario.reliefHeight * 0.22);
      const grupo = createVegetation(escenario, () => cota);

      const { runway } = escenario;
      const h = (runway.heading * Math.PI) / 180;
      const sin = Math.sin(h);
      const cos = Math.cos(h);
      const m = new Matrix4();

      let total = 0;
      let dentro = 0;
      grupo.traverse((o) => {
        if (!(o instanceof InstancedMesh)) return;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          const dx = m.elements[12]! - runway.x;
          const dz = m.elements[14]! - runway.z;
          const along = dx * sin - dz * cos;
          const across = dx * cos + dz * sin;
          total++;
          if (Math.abs(along) < runway.length / 2 && Math.abs(across) < runway.width / 2) dentro++;
        }
      });

      // Y que haya árboles, que la prueba se cumple muy bien con un mundo pelado.
      expect(total).toBeGreaterThan(500);
      expect(dentro).toBe(0);
    });
  }
});
