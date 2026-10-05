/**
 * **La instructora callada**: con los cascos, el dedo en los labios y, al
 * lado, el escudo ámbar con su exclamación — de lo peligroso avisa igual.
 *
 * Es el dibujo del modo sin instructora, y sale en los tres sitios donde se
 * habla de él: la pregunta del principio, el interruptor del cuaderno y su
 * explicación. El mismo dibujo en los tres, que es como se aprende a
 * reconocer algo sin leer. Ver `flight/sin-instructora.ts`.
 *
 * Va solo en su fichero porque lo usan una pantalla con DOM y el registro de
 * explicaciones, que se prueba sin navegador.
 */
export const INSTRUCTORA_CALLADA = `
  <svg class="instructora-callada" viewBox="0 0 120 96" aria-hidden="true">
    <path class="ic__pelo" d="M28 50 Q26 18 52 16 Q78 16 78 46 L80 70 Q72 60 72 46 Q60 40 46 30 Q38 42 32 48 Z" />
    <circle class="ic__cara" cx="53" cy="50" r="22" />
    <path class="ic__pelo" d="M31 44 Q34 26 53 26 Q70 26 75 42 Q62 38 48 30 Q40 40 31 44 Z" />
    <path class="ic__casco" d="M27 50 Q26 18 53 18 Q80 18 79 50" />
    <rect class="ic__auricular" x="22" y="42" width="9" height="16" rx="4" />
    <rect class="ic__auricular" x="75" y="42" width="9" height="16" rx="4" />
    <path class="ic__micro" d="M27 57 Q30 70 42 70" />
    <circle class="ic__ojo" cx="45" cy="47" r="2.4" />
    <circle class="ic__ojo" cx="61" cy="47" r="2.4" />
    <path class="ic__nariz" d="M51.5 53 Q53 56 54.5 53" />
    <path class="ic__boca" d="M46 63.5 Q53 66 60 63.5" />
    <path class="ic__dedo-borde" d="M53 79 V58.5" />
    <path class="ic__dedo" d="M53 79 V58.5" />
    <path class="ic__mano" d="M43 94 Q42 80 49 78 H57 Q64 80 63 94 Z" />
    <path class="ic__nudillos" d="M49 83 H57 M48.5 87 H57.5" />
    <path class="ic__escudo" d="M96 30 L110 35 V48 Q110 60 96 66 Q82 60 82 48 V35 Z" />
    <path class="ic__exclama" d="M96 39 V51 M96 57 v0.1" />
  </svg>`;

/** El candado del interruptor, en el lienzo de veinticuatro. */
export const CANDADO = `
  <svg class="candado" viewBox="0 0 24 24" aria-hidden="true">
    <path class="candado__arco" d="M7.5 11 V8 a4.5 4.5 0 0 1 9 0 V11" />
    <rect class="candado__cuerpo" x="5" y="11" width="14" height="10" rx="2.2" />
    <path class="candado__ojo" d="M12 14.6 V17.4" />
  </svg>`;
