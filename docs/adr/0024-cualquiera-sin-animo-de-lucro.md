# ADR 0024 — El contenido, libre para todo uso sin ánimo de lucro, en cualquier país

**Fecha**: 2026-11-01 · **Estado**: aceptada · **Amplía**: [ADR 0004](0004-licencias.md)

## Contexto

El ADR 0004 separó el código (Apache-2.0) del contenido (propietario) y concedió el contenido gratis e irrevocablemente
a la educación paraguaya. Eso dejaba una grieta: jugar en la web no tiene barrera ninguna, pero un colegio de otro país
que instalara el juego o lo proyectara en clase no tenía permiso sobre el papel. Y los textos públicos abrían con
«gratis para la educación paraguaya», así que quien no era de allí leía que aquello no iba con él.

Enrique, el 1 de noviembre de 2026: «En Paraguay, no. Lo puede usar cualquiera que quiera», y «otra cosa es que los
vuelos estén basados en rutas de Paraguay y las Islas Canarias». Preguntado por el alcance: «Para todo uso sin ánimo de
lucro».

## Decisión

- **El contenido se concede a cualquier persona o entidad de cualquier país, para todo uso sin ánimo de lucro**, de
  forma gratuita, permanente e irrevocable y sin trámites. Se escribe en `LICENSE-CONTENIDO.md` y se resume en `NOTICE`,
  como concesión unilateral separada, por lo mismo que en el ADR 0004: Apache-2.0 no admite párrafos añadidos.
- **La concesión a la educación paraguaya sigue escrita tal cual.** Es irrevocable y se dio la primera; la nueva la
  cubre, pero no la sustituye.
- **Lo comercial** —venderlo, cobrar por él, ponerle publicidad o integrarlo en un producto— **sigue necesitando acuerdo**.
- **Los verbos son los de siempre**: usar, instalar, proyectar, copiar y distribuir. Modificar el arte, las voces o los
  personajes no se concede; el código sí se puede modificar, porque es Apache-2.0. Solo se quita «internamente» de
  «distribuir», porque ya no hay una institución dentro de la que distribuir.
- **Un colegio de pago que lo usa sin cobrar por él entra.** El ánimo de lucro se mide en el juego, no en quien lo usa;
  si no, la concesión dejaría fuera a media enseñanza del mundo.
- **Las marcas salen de la lista del contenido.** No se ceden, y no se escribe que son de Oksigenia SL: OKSIGENIA está
  registrada a nombre de los socios (`shared/marcas/oksigenia.md` en hq). El © de la SL queda para el diseño, los textos y
  el contenido.

## Consecuencias

- Paraguay y Canarias siguen en títulos y descripciones, porque son dónde se vuela. Lo que ya no dicen es para quién es.
- Si algún día se vende una licencia comercial del contenido, tiene que respetar las dos concesiones: las dos son
  irrevocables a propósito.
- Los datos y los assets de terceros siguen con su licencia y su atribución. Alguna es solo para uso no comercial, y eso
  encaja con esta concesión y no con una venta: mirar `CREDITOS.md` antes de cualquier acuerdo comercial.
