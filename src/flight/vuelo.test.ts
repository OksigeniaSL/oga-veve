/**
 * El vuelo completo, fase por fase.
 *
 * Se prueba volando: se simula un vuelo entero a base de situaciones y se
 * comprueba que las fases van saliendo en orden. Y sobre todo se prueban **las
 * trampas**, que es donde una máquina de estados se cae: cruzar la doble raya
 * sin parar, dar por aterrizado a quien nunca despegó, o quedarse autorizado
 * para siempre.
 */

import { describe, expect, it } from 'vitest';
import { Vuelo, type Fase, type Situacion } from './vuelo';

const EN_TIERRA: Situacion = {
  estado: { airspeed: 0, verticalSpeed: 0 } as Situacion['estado'],
  alaRuta: 0,
  restante: 500,
  alEjeDePista: 500,
  enPista: false,
  sobreElSuelo: 0,
  motor: false,
  desalineado: 0,
};

const con = (cambios: Partial<Situacion>): Situacion => ({
  ...EN_TIERRA,
  ...cambios,
  estado: { ...EN_TIERRA.estado, ...(cambios.estado ?? {}) },
});

/**
 * Mantiene una situación durante unos segundos, a 20 fotogramas por segundo.
 *
 * **Los tiempos no son decorativos.** La máquina deduce la fase cada fotograma
 * y una fase nueva tiene que sostenerse medio segundo antes de sustituir a la
 * vieja; si una prueba mantiene una situación menos que eso, la fase no llega
 * a asentarse y el test falla sin que nada esté roto. Un segundo por paso, que
 * además es lo que tarda una persona en hacer cualquiera de estas cosas.
 */
function durante(v: Vuelo, s: Situacion, segundos: number): Fase {
  let fase: Fase = v.actual;
  for (let t = 0; t < segundos; t += 0.05) fase = v.paso(s, 0.05).fase;
  return fase;
}

describe('un vuelo entero', () => {
  it('recorre las fases en orden, de estacionado a apagado', () => {
    const v = new Vuelo();
    v.reiniciar();
    const vistas: Fase[] = [v.actual];
    const anotar = (f: Fase) => {
      if (f !== vistas[vistas.length - 1]) vistas.push(f);
    };

    anotar(durante(v, con({ motor: true }), 1));
    anotar(durante(v, con({ motor: true, estado: { airspeed: 6 } as never }), 1));
    anotar(
      durante(v, con({ motor: true, restante: 10, estado: { airspeed: 0 } as never }), 1),
    );
    // Parado en la raya: la torre tarda en mirar y en contestar.
    anotar(durante(v, con({ motor: true, restante: 10 }), 5));
    anotar(durante(v, con({ motor: true, enPista: true, alEjeDePista: 30 }), 1));
    anotar(
      durante(v, con({ motor: true, enPista: true, alEjeDePista: 2, desalineado: 1 }), 1),
    );
    anotar(
      durante(
        v,
        con({ motor: true, enPista: true, alEjeDePista: 2, sobreElSuelo: 60 }),
        1,
      ),
    );
    // Vuela un rato y vuelve. **Un rato de verdad**: hay que subir a altura de
    // circuito y estar en el aire un mínimo antes de poder volver a entrar, o
    // un salto de rana contaría como vuelo completo.
    anotar(durante(v, con({ motor: true, sobreElSuelo: 700, alEjeDePista: 900 }), 20));
    anotar(
      durante(
        v,
        con({
          motor: true,
          sobreElSuelo: 120,
          alEjeDePista: 20,
          desalineado: 3,
          estado: { airspeed: 30, verticalSpeed: -3 } as never,
        }),
        1,
      ),
    );
    anotar(
      durante(
        v,
        con({
          motor: true,
          sobreElSuelo: 1,
          alEjeDePista: 5,
          enPista: true,
          estado: { airspeed: 25, verticalSpeed: 0 } as never,
        }),
        1,
      ),
    );
    anotar(
      durante(v, con({ motor: true, alEjeDePista: 5, estado: { airspeed: 6 } as never }), 1),
    );
    anotar(durante(v, con({ motor: true, alEjeDePista: 120, restante: 400 }), 1));
    anotar(
      durante(
        v,
        con({ motor: true, alEjeDePista: 200, restante: 5, estado: { airspeed: 0 } as never }),
        1,
      ),
    );
    anotar(durante(v, con({ motor: false, alEjeDePista: 200, restante: 5 }), 1));

    expect(vistas).toEqual([
      'estacionado',
      'arrancando',
      'rodando',
      'esperando',
      'autorizado',
      'alineando',
      'despegando',
      'en-vuelo',
      'final',
      'aterrizado',
      'abandonando',
      'a-plataforma',
      'en-puesto',
      'apagado',
    ]);
  });
});

describe('las trampas', () => {
  it('no autoriza a quien no para en la doble raya', () => {
    // Es la lección entera: si se autoriza por llegar y no por parar, cruzar
    // la raya a toda velocidad sale gratis y no se aprende nada.
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true }), 1);
    durante(v, con({ motor: true, estado: { airspeed: 6 } as never }), 1);
    // Llega a la raya pero sin frenar del todo.
    const fase = durante(v, con({ motor: true, restante: 5, estado: { airspeed: 5 } as never }), 8);
    expect(fase).toBe('rodando');
    expect(v.autorizado).toBe(false);
  });

  it('el permiso se gasta al entrar en pista', () => {
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true }), 1);
    durante(v, con({ motor: true, estado: { airspeed: 6 } as never }), 1);
    durante(v, con({ motor: true, restante: 5, estado: { airspeed: 0 } as never }), 1);
    durante(v, con({ motor: true, restante: 5 }), 5);
    expect(v.autorizado).toBe(true);
    durante(v, con({ motor: true, enPista: true, alEjeDePista: 2, desalineado: 1 }), 1);
    // Ya se usó: no queda un verde colgado para la próxima vez.
    expect(v.autorizado).toBe(false);
  });

  it('no da por aterrizado a quien nunca despegó', () => {
    const v = new Vuelo();
    v.reiniciar(true);
    // Arranca en pista, no llega a subir, y se para. No hay aterrizaje.
    const fase = durante(
      v,
      con({
        motor: true,
        enPista: true,
        alEjeDePista: 4,
        sobreElSuelo: 1,
        estado: { airspeed: 5 } as never,
      }),
      6,
    );
    expect(fase).toBe('despegando');
  });

  it('apagar el motor en el suelo termina el vuelo se esté donde se esté', () => {
    // «Ya aterricé y esto gasta queroseno» es una razón válida para terminar.
    const v = new Vuelo();
    v.reiniciar(true);
    durante(v, con({ motor: true, enPista: true, sobreElSuelo: 400 }), 20);
    expect(v.actual).toBe('en-vuelo');
    durante(
      v,
      con({
        motor: true,
        sobreElSuelo: 1,
        alEjeDePista: 5,
        enPista: true,
        estado: { airspeed: 20, verticalSpeed: -1 } as never,
      }),
      1,
    );
    const fase = durante(v, con({ motor: false, sobreElSuelo: 1 }), 0.5);
    expect(fase).toBe('apagado');
  });

  it('un salto de rana no cuenta como vuelo: no se puede aterrizar recién despegado', () => {
    // Sin esta regla, el avión despegaba, subía quince metros, se asentaba un
    // instante y a los dos segundos el juego lo daba por aproximación final.
    // Catorce fases en veinte segundos y ni una vuelta.
    const v = new Vuelo();
    v.reiniciar(true);
    durante(v, con({ motor: true, enPista: true, sobreElSuelo: 20 }), 1);
    expect(v.actual).toBe('en-vuelo');
    const fase = durante(
      v,
      con({
        motor: true,
        sobreElSuelo: 18,
        alEjeDePista: 5,
        estado: { airspeed: 32, verticalSpeed: -1 } as never,
      }),
      5,
    );
    expect(fase).toBe('en-vuelo');
  });

  it('quien se pasa de largo en final vuelve a en-vuelo y puede repetir', () => {
    // Una frustrada. No es un fallo: es una maniobra, y hay que poder hacerla
    // sin que el juego se quede colgado esperando un aterrizaje que no llega.
    const v = new Vuelo();
    v.reiniciar(true);
    durante(v, con({ motor: true, enPista: true, sobreElSuelo: 400 }), 20);
    durante(
      v,
      con({
        motor: true,
        sobreElSuelo: 120,
        alEjeDePista: 20,
        estado: { airspeed: 30, verticalSpeed: -3 } as never,
      }),
      1.5,
    );
    expect(v.actual).toBe('final');
    const fase = durante(v, con({ motor: true, sobreElSuelo: 600 }), 0.5);
    expect(fase).toBe('en-vuelo');
  });
});

describe('recuperarse de haberse salido del guion', () => {
  // Estas tres pruebas son la razón de que la máquina deduzca en vez de
  // avanzar. Con la versión de lista, las tres se quedaban colgadas para
  // siempre — y las tres las encontró alguien jugando, no un test.

  it('despegar en travesía desde una calle de rodaje se reconoce como vuelo', () => {
    // «Nada me impide salirme, despegar de manera transversal.» Pues no, nada
    // se lo impide, y ahora el juego se entera.
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true, estado: { airspeed: 8 } as never }), 1);
    expect(v.actual).toBe('rodando');
    // Se sale de la calle, acelera y se va al aire, sin pasar por la pista.
    const fase = durante(
      v,
      con({
        motor: true,
        alaRuta: 200,
        alEjeDePista: 900,
        sobreElSuelo: 60,
        estado: { airspeed: 40 } as never,
      }),
      2,
    );
    expect(fase).toBe('en-vuelo');
  });

  it('al volver a tierra fuera de la pista, retoma y manda a la plataforma', () => {
    // «Al volver ya no puedo aterrizar para retomar la guía por la calle de
    // rodadura, ya estoy en vuelo.» Ahora sí puede.
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true, sobreElSuelo: 400, estado: { airspeed: 40 } as never }), 20);
    expect(v.actual).toBe('en-vuelo');
    // Toma tierra lejos de la pista y frena.
    durante(
      v,
      con({ motor: true, sobreElSuelo: 1, alEjeDePista: 800, estado: { airspeed: 30 } as never }),
      1,
    );
    expect(v.actual).toBe('aterrizado');
    const fase = durante(
      v,
      con({ motor: true, sobreElSuelo: 1, alEjeDePista: 800, restante: 900 }),
      2,
    );
    expect(fase).toBe('a-plataforma');
  });

  it('rodar hacia atrás desde la doble raya no deja al tutor colgado', () => {
    // Lo que motivó la máquina de un solo sentido. Ahora se puede retroceder y
    // la fase lo sigue, sin parpadear: la histéresis la sostiene medio segundo.
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true, estado: { airspeed: 8 } as never }), 1);
    durante(v, con({ motor: true, restante: 10, estado: { airspeed: 0 } as never }), 1);
    expect(v.actual).toBe('esperando');
    const fase = durante(
      v,
      con({ motor: true, restante: 400, estado: { airspeed: 8 } as never }),
      2,
    );
    expect(fase).toBe('rodando');
  });

  it('no parpadea cuando el avión oscila en el filo de un umbral', () => {
    // Un fotograma sí y otro no, justo en el límite de «parado». Sin
    // histéresis esto cambiaba de fase varias veces por segundo.
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true, estado: { airspeed: 8 } as never }), 1);
    const inicio = v.actual;
    let cambios = 0;
    let previa = inicio;
    for (let i = 0; i < 60; i++) {
      const rapido = i % 2 === 0;
      const f = v.paso(
        con({ motor: true, restante: 10, estado: { airspeed: rapido ? 3 : 0 } as never }),
        0.05,
      ).fase;
      if (f !== previa) cambios++;
      previa = f;
    }
    expect(cambios).toBeLessThanOrEqual(1);
  });
});

describe('saltarse la luz de la torre', () => {
  it('se nota, y se avisa una sola vez', () => {
    // «¿Y qué pasaría si me salto la luz esa?» Pasa que se nota. No hay muro
    // invisible ni vuelo reiniciado: eso enseñaría que no se puede, y lo que
    // hay que enseñar es que no se hace.
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true, estado: { airspeed: 8 } as never }), 1);
    let avisos = 0;
    for (let i = 0; i < 40; i++) {
      const p = v.paso(
        con({ motor: true, enPista: true, alEjeDePista: 5, estado: { airspeed: 8 } as never }),
        0.05,
      );
      if (p.saltoLaLuz) avisos++;
    }
    expect(avisos).toBe(1);
  });

  it('quien espera la luz no recibe el aviso', () => {
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con({ motor: true, estado: { airspeed: 8 } as never }), 1);
    durante(v, con({ motor: true, restante: 10, estado: { airspeed: 0 } as never }), 6);
    expect(v.autorizado).toBe(true);
    let avisos = 0;
    for (let i = 0; i < 40; i++) {
      const p = v.paso(
        con({ motor: true, enPista: true, alEjeDePista: 5, estado: { airspeed: 8 } as never }),
        0.05,
      );
      if (p.saltoLaLuz) avisos++;
    }
    expect(avisos).toBe(0);
  });
});
