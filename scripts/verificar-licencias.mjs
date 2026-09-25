/**
 * Que no se publique una imagen cuya licencia no está resuelta.
 *
 * ## Por qué existe
 *
 * La ortofoto de los escenarios paraguayos sale de la capa `s2cloudless` de
 * EOX, y el proyecto la declaraba **CC BY 4.0**, que EOX no da: da CC BY-NC-SA
 * 4.0 para uso no comercial —que es el caso de este juego, gratuito, de código
 * abierto y sin fines de lucro— y una licencia aparte, con acuerdo, para el
 * comercial. Ver el issue #155.
 *
 * Lo que añade este guion es que **ninguna imagen se publique con una licencia
 * que nadie haya leído en la documentación de su proveedor**. Cada licencia
 * buena está en `VERIFICADAS`, con quién y cuándo la comprobó.
 *
 * Y hacía falta, porque el accidente ya ocurrió dos veces por el mismo sitio:
 * la corrección se escribió una vez en las fichas y la siguiente regeneración
 * del extractor la deshizo, porque la cadena equivocada seguía dentro del
 * guion que las escribe. Una corrección que vive en el dato y no en quien lo
 * genera dura hasta la próxima tirada.
 *
 * ## Qué comprueba
 *
 * Recorre `data/ortho` —ver `CARPETAS` para por qué solo esa— y, para cada
 * ficha, mira dos cosas:
 *
 * 1. Que la licencia declarada esté en la lista de las **verificadas**. No
 *    vale cualquier cadena que empiece por «CC BY»: vale la que alguien
 *    comprobó contra la documentación del proveedor, con su fecha.
 * 2. Y que si no lo está, **la imagen no esté en el árbol**. Una ficha con la
 *    licencia sin resolver es una nota; una ficha sin resolver con su `.jpg`
 *    al lado es un fichero que se va a empaquetar y a servir.
 *
 * Porque eso es lo que decide si hay problema o no: no lo que dice el
 * documento, sino si el byte viaja.
 *
 *     node scripts/verificar-licencias.mjs
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Las licencias que alguien ha comprobado contra la documentación del
 * proveedor, con la fecha de la comprobación al lado.
 *
 * Añadir una entrada aquí es decir «he leído la licencia de este proveedor y
 * dice esto». No es una lista de cadenas permitidas: es una lista de cosas
 * comprobadas, y por eso lleva fecha.
 */
const VERIFICADAS = [
  {
    empieza: "CC BY 4.0 · scne.es",
    quien: "PNOA, Instituto Geográfico Nacional de España",
    comprobada: "2026-09-12",
  },
  /*
   * EOX da sus mosaicos bajo CC BY-NC-SA 4.0 para uso no comercial, y este
   * juego lo es: gratuito, de código abierto y sin fines de lucro. Ver #155.
   */
  {
    empieza: "CC BY-NC-SA 4.0 · EOX s2cloudless, uso no comercial",
    quien: "EOX IT Services, Sentinel-2 cloudless",
    comprobada: "2026-09-12",
  },
];

/**
 * Carpetas donde viven fichas con imagen al lado.
 *
 * Solo `data/ortho`, y es a propósito. Las fichas de relieve declaran la
 * licencia del DEM de Copernicus, que no he comprobado contra su documentación
 * — y listarlas aquí como «no verificadas» fingiría una cobertura que este
 * guion no tiene. Un guardián que avisa de lo que no ha mirado enseña a no
 * hacerle caso.
 *
 * Además el relieve no es una imagen: no se empaqueta con `import.meta.glob`
 * ni se sirve como textura, que es justo el camino por el que se publicó lo de
 * EOX sin que nadie se enterara.
 */
const CARPETAS = ["data/ortho"];

/** Las extensiones que se publican junto a una ficha. */
const IMAGENES = [".jpg", ".jpeg", ".png", ".webp"];

const hallazgos = [];
let fichas = 0;

for (const carpeta of CARPETAS) {
  if (!existsSync(carpeta)) continue;
  for (const nombre of readdirSync(carpeta)) {
    if (!nombre.endsWith(".json")) continue;
    const ruta = join(carpeta, nombre);
    let ficha;
    try {
      ficha = JSON.parse(readFileSync(ruta, "utf8"));
    } catch {
      hallazgos.push({ ruta, motivo: "la ficha no es JSON válido" });
      continue;
    }
    fichas++;
    const licencia = String(ficha.licencia ?? ficha.atribucion ?? "");
    const buena = VERIFICADAS.some((v) => licencia.startsWith(v.empieza));
    if (buena) continue;

    const base = ruta.replace(/\.json$/, "");
    const imagen = IMAGENES.map((e) => base + e).find((f) => existsSync(f));
    hallazgos.push({
      ruta,
      licencia: licencia || "(sin declarar)",
      imagen,
      motivo: imagen
        ? "licencia no verificada **y la imagen está en el árbol**"
        : "licencia no verificada (la imagen no está, así que no se publica)",
    });
  }
}

const graves = hallazgos.filter((h) => h.imagen);

console.log(`\n  licencias de imagen · ${fichas} fichas miradas\n`);

if (!hallazgos.length) {
  console.log("  ✓ todas con licencia verificada\n");
  process.exit(0);
}

for (const h of hallazgos) {
  console.log(`  ${h.imagen ? "✗" : "·"} ${h.ruta}`);
  console.log(`      licencia: ${h.licencia}`);
  console.log(`      ${h.motivo}`);
}

console.log(
  `\n  ${graves.length} de ${hallazgos.length} tienen la imagen puesta` +
    ` y se empaquetarían al construir.\n`,
);

if (graves.length) {
  console.log("  Las salidas, y las tres son de Oksigenia:\n");
  console.log("    1. Conseguir la licencia del proveedor y anotarla aquí.");
  console.log("    2. Cambiar a una fuente cuya licencia sí sirva.");
  console.log("    3. Quitar la imagen del árbol y volar sobre el relieve");
  console.log("       dibujado, como hacen los escenarios que no tienen foto.\n");
  console.log("  Ver el issue #155.\n");
  process.exit(1);
}

process.exit(0);
