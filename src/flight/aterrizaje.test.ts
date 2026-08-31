import { describe, expect, it } from 'vitest';
import { LandingWatcher } from './aterrizaje';

/** Un vuelo completo: rodar, volar, tocar y frenar. */
function volarYAterrizar(sink: number, enPista = true, crashed = false) {
  const w = new LandingWatcher();
  const veredictos = [];
  veredictos.push(w.update(true, 0, 0, false, true)); // parado al principio
  for (let i = 0; i < 5; i++) veredictos.push(w.update(false, 50, 0, false, false));
  veredictos.push(w.update(true, 45, sink, crashed, enPista)); // contacto
  for (let i = 0; i < 5; i++) veredictos.push(w.update(true, 40 - i * 8, 0, crashed, enPista));
  return veredictos.filter(Boolean);
}

describe('el aterrizaje se reconoce y se dice', () => {
  it('un contacto suave se celebra como tal', () => {
    expect(volarYAterrizar(0.4)).toEqual(['suave']);
  });

  it('uno duro también cuenta, pero se llama por su nombre', () => {
    expect(volarYAterrizar(2.6)).toEqual(['firme']);
  });

  it('fuera de la pista sigue siendo un aterrizaje', () => {
    expect(volarYAterrizar(0.4, false)).toEqual(['fuera']);
  });

  it('si se rompió, no se felicita nada', () => {
    expect(volarYAterrizar(0.4, true, true)).toEqual([]);
  });

  it('se dice una sola vez, no una por fotograma', () => {
    const w = new LandingWatcher();
    w.update(false, 50, 0, false, false);
    w.update(true, 40, 0.5, false, true);
    const dichos = [];
    for (let i = 0; i < 30; i++) {
      const v = w.update(true, 5, 0, false, true);
      if (v) dichos.push(v);
    }
    expect(dichos).toEqual(['suave']);
  });

  /**
   * Estar quieto en la pista al empezar la partida no es un aterrizaje. Es la
   * primera condición y la más fácil de olvidar.
   */
  it('arrancar parado en la pista no cuenta como aterrizaje', () => {
    const w = new LandingWatcher();
    const dichos = [];
    for (let i = 0; i < 20; i++) {
      const v = w.update(true, 0, 0, false, true);
      if (v) dichos.push(v);
    }
    expect(dichos).toEqual([]);
  });
});
