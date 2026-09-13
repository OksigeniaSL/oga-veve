/**
 * De dónde sale una clave de API, y de dónde no.
 *
 * Del entorno, siempre que esté. Y si no está, de **un solo fichero fuera de
 * cualquier repositorio**: `~/.config/claves/entorno`, con permisos 600, en
 * formato `NOMBRE=valor` y una por línea.
 *
 * ## Por qué existe este segundo sitio
 *
 * Porque la alternativa real no era «el entorno», era «buscar la clave otra
 * vez». Exportarla a mano en cada terminal significa ir al panel del
 * proveedor, rotarla —porque solo se enseña al crearla—, pegarla, y repetirlo
 * dentro de dos días. Eso no es más seguro: acaba en un pegado apresurado en
 * el sitio que no era.
 *
 * Un fichero que solo puede leer su dueño, fuera del repositorio y fuera de
 * cualquier cosa que se publique, es la misma seguridad con menos ocasiones de
 * equivocarse.
 *
 * ## Lo que sigue estando prohibido
 *
 * - **En el repositorio, no.** Ni en un `.env` del proyecto, ni en un fichero
 *   de configuración, ni en un comentario. El `.gitignore` ya tapa `.env*`,
 *   pero la regla es no escribirla ahí, no confiar en la red.
 * - **Con `VITE_` delante, jamás.** Vite mete todo lo que empieza así en el
 *   paquete que se baja el navegador: sería publicarla.
 * - **En una conversación, tampoco.** Lo que pasa por un chat queda escrito en
 *   algún sitio, y una clave que ha estado escrita en algún sitio es una clave
 *   quemada.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** El fichero, para poder nombrarlo en un mensaje de error. */
export const FICHERO = join(homedir(), ".config", "claves", "entorno");

/**
 * La clave que se pida, o `null`.
 *
 * Nunca la imprime ni la devuelve por ningún otro camino: quien la pide la
 * usa y ya está.
 */
export function clave(nombre) {
  const delEntorno = process.env[nombre];
  if (delEntorno) return delEntorno;
  let crudo;
  try {
    crudo = readFileSync(FICHERO, "utf8");
  } catch {
    return null;
  }
  for (const linea of crudo.split("\n")) {
    const corte = linea.indexOf("=");
    if (corte < 0) continue;
    if (linea.slice(0, corte).trim() !== nombre) continue;
    const valor = linea
      .slice(corte + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    return valor || null;
  }
  return null;
}
