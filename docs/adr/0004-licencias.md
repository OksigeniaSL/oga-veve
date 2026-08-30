# ADR 0004 — Apache-2.0 para el código, contenido propietario, educación paraguaya gratis

**Fecha**: 2026-08-30 · **Estado**: aceptada

## Contexto

Tres objetivos que en principio se estorban: que el repositorio sea escaparate
público de Oksigenia SL, que el juego se pueda vender, y que sea gratuito para
la educación paraguaya.

## Decisión

Separar **código** y **contenido**, con licencias distintas.

### Código: Apache-2.0

Frente a MIT, aporta **concesión expresa de patentes** y términos explícitos
de contribución. Para una empresa que puede querer integrar este motor en un
proyecto de cliente, esa protección es la diferencia entre poder y no poder.

Frente a GPL-3.0: la GPL obligaría a cualquiera que integre el motor a abrir
su producto. Eso protege el código pero mata la adopción, y la adopción es
justamente el objetivo del escaparate. Además complicaría vender el juego a
un tercero que quisiera una versión cerrada.

### Contenido: propietario

Arte, audio, escenarios, personajes y marcas son © Oksigenia SL. Es lo que
hace vendible al producto y lo que distingue a Granja Óga. Un motor lo copia
cualquiera; el mundo, no.

### Educación paraguaya: concesión gratuita e irrevocable

**Esto no se implementa como cláusula de la licencia del código.** Apache-2.0
no admite restricciones ni excepciones añadidas, y una licencia "Apache con
un párrafo extra" deja de ser una licencia conocida y se convierte en un
problema legal para quien la lea.

La forma correcta —y la que usamos— es una **concesión unilateral separada**,
en `LICENSE-CONTENIDO.md` y resumida en `NOTICE`, que afecta al contenido
propietario. El código ya es libre para todo el mundo, colegios incluidos; lo
que la concesión libera es el arte, el audio y las marcas.

Sin registro, sin trámite, sin caducidad.

## Consecuencias

- Tres ficheros de referencia: `LICENSE` (Apache-2.0 íntegra), `NOTICE`
  (copyright y concesión educativa) y `LICENSE-CONTENIDO.md` (el detalle).
- Toda contribución externa se acepta bajo Apache-2.0; está dicho en el
  README.
- Si algún día se vende una licencia comercial del contenido, la concesión
  educativa paraguaya sobrevive: es irrevocable a propósito, y cualquier
  contrato de cesión tiene que respetarla.
