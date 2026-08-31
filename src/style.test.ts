/**
 * La hoja de estilos no puede declarar dos veces la misma clase base.
 *
 * Esta prueba existe por un fallo concreto y muy caro de encontrar: el hangar
 * bautizó sus fichas como `.tarjeta`, que era **la clase que el HUD usa para
 * sus medidores desde el principio**. El resultado no apareció en el hangar
 * sino en pleno vuelo, a dos pantallas de distancia: `padding: 0` sacó los
 * rótulos fuera de la caja —«ALT» se leía «\LT»—, `overflow: hidden` recortó
 * el horizonte artificial y un `:hover` con `transform` hacía temblar los
 * paneles al pasar el ratón.
 *
 * Nada de eso lo habría cazado un test de la pantalla nueva, porque la
 * pantalla nueva estaba bien. Lo caza esto.
 *
 * No prohíbe declarar una clase dos veces con intención —para eso están los
 * modificadores y los estados—: prohíbe **dos bloques de propiedades base
 * para el mismo nombre a secas**, que es siempre un choque y nunca un plan.
 */

import { describe, expect, it } from 'vitest';
// Con `?raw`, que lo resuelve Vite: leerla con `node:fs` obliga a meter los
// tipos de Node en el `tsconfig` de la aplicación, y la aplicación no corre en
// Node.
import CSS from './style.css?raw';

/**
 * Los selectores de una sola clase declarados **en el primer nivel**: `.foo {`.
 *
 * El nivel importa. Dentro de un `@media` volver a declarar `.hud__derecha` no
 * es un choque, es exactamente para lo que sirve un `@media`; en el primer
 * nivel, en cambio, la segunda declaración pisa a la primera sin avisar. Así
 * que se recorre la hoja llevando la cuenta de las llaves y solo se miran las
 * reglas de fuera.
 */
function clasesBase(css: string): Map<string, number> {
  const cuenta = new Map<string, number>();
  let profundidad = 0;
  let desde = 0;

  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      if (profundidad === 0) {
        const selectores = css.slice(desde, i);
        // Una regla `@` —`@media`, `@keyframes`— abre un nivel y lo que lleva
        // dentro no son declaraciones base.
        if (!selectores.trimStart().startsWith('@')) {
          for (const sel of selectores.split(',')) {
            const m = /^\.([a-zA-Z][\w-]*)$/.exec(quitarComentarios(sel).trim());
            if (m) cuenta.set(m[1]!, (cuenta.get(m[1]!) ?? 0) + 1);
          }
        }
      }
      profundidad++;
    } else if (c === '}') {
      profundidad = Math.max(0, profundidad - 1);
      if (profundidad === 0) desde = i + 1;
    }
  }
  return cuenta;
}

const quitarComentarios = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '');

describe('la hoja de estilos', () => {
  it('no declara dos veces la misma clase base', () => {
    const repetidas = [...clasesBase(CSS)]
      .filter(([, n]) => n > 1)
      .map(([nombre, n]) => `.${nombre} (${n} veces)`);
    expect(repetidas).toEqual([]);
  });

  it('sabe encontrar el choque que provocó esta prueba', () => {
    const cuenta = clasesBase('.tarjeta { padding: 8px; }\n.tarjeta { padding: 0; }');
    expect(cuenta.get('tarjeta')).toBe(2);
  });

  it('no confunde un modificador ni un estado con una redeclaración', () => {
    const cuenta = clasesBase(
      '.ficha { color: red; }\n.ficha:hover { color: blue; }\n.ficha .hijo { color: green; }',
    );
    expect(cuenta.get('ficha')).toBe(1);
  });

  it('deja en paz lo que va dentro de un @media, que para eso está', () => {
    const cuenta = clasesBase(
      '.ficha { color: red; }\n@media (min-width: 40em) {\n  .ficha { color: blue; }\n}',
    );
    expect(cuenta.get('ficha')).toBe(1);
  });
});
