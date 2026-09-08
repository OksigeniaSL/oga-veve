/**
 * Cuál de las voces del sistema habla, que no es una pregunta menor.
 *
 * Esto existe porque el instructor se quedó mudo jugando y la causa no estaba
 * donde parecía. Medido en la máquina de siempre:
 *
 * | navegador | voces que publica |
 * |---|---|
 * | Chrome 139 | 19, todas de red, con `es-ES` y `es-US` |
 * | Firefox 155 | **13.362**, de espeak-ng, 204 de ellas castellanas |
 * | Brave 152 | **0**, incluso con `--enable-speech-dispatcher` |
 *
 * Con trece mil voces en un orden cualquiera, «la primera que case» es una al
 * azar —y salía «Spanish (Spain)+Nguyen», una variante de España para un juego
 * paraguayo—. Lo que se comprueba aquí es el criterio: acento primero, voz
 * base antes que variante, y nunca el silencio si hay algo del idioma.
 */

import { describe, expect, it } from 'vitest';

import { elegirVoz } from './instructor';

/** Una voz de mentira, con lo poco que mira `elegirVoz`. */
const voz = (
  lang: string,
  name: string,
  porDefecto = false,
): SpeechSynthesisVoice =>
  ({
    lang,
    name,
    default: porDefecto,
    localService: false,
    voiceURI: name,
  }) as SpeechSynthesisVoice;

/** Lo que publica Chrome: pocas, de red y con región en el código. */
const CHROME = [
  voz('de-DE', 'Google Deutsch'),
  voz('en-US', 'Google US English'),
  voz('es-ES', 'Google español'),
  voz('es-US', 'Google español de Estados Unidos'),
  voz('fr-FR', 'Google français'),
];

/** Y lo que publica Firefox: espeak-ng, con variantes y en desorden. */
const FIREFOX = [
  voz('es', 'Spanish (Spain)+Nguyen'),
  voz('es-419', 'Spanish (Latin America)+John'),
  voz('es-419', 'Spanish (Latin America)+Robosoft2'),
  voz('es', 'Spanish (Spain)'),
  voz('es-419', 'Spanish (Latin America)'),
  voz('en-us', 'English (America)+Mike'),
];

describe('elegirVoz', () => {
  it('en Chrome prefiere el castellano americano al de España', () => {
    expect(elegirVoz(CHROME, 'es-PY')?.name).toBe(
      'Google español de Estados Unidos',
    );
  });

  it('en Firefox coge la voz base americana y no una variante', () => {
    // Y no «Spanish (Latin America)+John», que es la primera que casa.
    expect(elegirVoz(FIREFOX, 'es-PY')?.name).toBe('Spanish (Latin America)');
  });

  it('el acento pesa más que la voz base: América antes que España', () => {
    const solo = [voz('es', 'Spanish (Spain)'), voz('es-419', 'LatAm+John')];
    expect(elegirVoz(solo, 'es-PY')?.lang).toBe('es-419');
  });

  it('si solo hay castellano de España, habla el de España', () => {
    // El silencio siempre es peor: el peldaño que no lee no tiene otra cosa.
    const solo = [voz('de-DE', 'Deutsch'), voz('es-ES', 'Google español')];
    expect(elegirVoz(solo, 'es-PY')?.lang).toBe('es-ES');
  });

  it('acepta el guion bajo que devuelven algunos sistemas', () => {
    expect(elegirVoz([voz('es_MX', 'Paulina')], 'es-PY')?.name).toBe('Paulina');
  });

  it('en inglés prefiere el americano', () => {
    expect(elegirVoz(CHROME, 'en')?.name).toBe('Google US English');
  });

  it('en guaraní se calla, que es lo honesto', () => {
    // No hay voz de guaraní en ningún sintetizador, y una castellana leyendo
    // guaraní escrito suena a burla. Ver #6.
    expect(elegirVoz(FIREFOX, 'gug')).toBeNull();
  });

  it('el otro avión de la radio no coge la voz del instructor', () => {
    // Una radio en la que contesta tu propio instructor no es una radio, es
    // un eco. Ver `elegirOtroAvion`.
    const suya = elegirVoz(CHROME, 'es-PY')!;
    const otra = elegirVoz(CHROME, 'es-PY', suya.name);
    expect(otra).not.toBeNull();
    expect(otra!.name).not.toBe(suya.name);
  });

  it('pero si solo hay una, prefiere repetirla a callarse', () => {
    const unica = [voz('es-ES', 'Google español')];
    expect(elegirVoz(unica, 'es-PY', 'Google español')?.name).toBe(
      'Google español',
    );
  });

  it('sin voces del idioma, ninguna', () => {
    expect(elegirVoz([voz('de-DE', 'Deutsch')], 'es-PY')).toBeNull();
    expect(elegirVoz([], 'es-PY')).toBeNull();
  });
});
