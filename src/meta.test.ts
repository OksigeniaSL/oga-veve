/**
 * Lo que este proyecto le cuenta a quien no lo abre.
 *
 * Un buscador, un modelo de lenguaje o la vista previa de WhatsApp no
 * ejecutan el juego: leen cuatro etiquetas y un par de ficheros de texto. Y
 * este es un escaparate público además de un producto, así que que no sepan
 * explicar qué es esto es una oportunidad tirada.
 *
 * Se comprueba aquí y no a ojo porque es exactamente el tipo de cosa que se
 * rompe en silencio: nadie mira el `head` de una página que funciona.
 */

import { describe, expect, it } from "vitest";

import html from "../index.html?raw";
import llms from "../public/llms.txt?raw";
import robots from "../public/robots.txt?raw";

/**
 * **Dónde vive: granjaoga.com/oga-veve/**, desde el 19 de septiembre de 2026.
 *
 * Estas pruebas exigían que, **si había dirección, estuviera completa**: la
 * demo de GitHub Pages se había retirado y el juego no vivía en ninguna parte.
 * Ya vive, y Google no lo encontraba —«Google no reconoce esta URL»—, así que
 * ahora se exige entera y la misma en los cinco sitios que la dicen: la
 * canónica, las `hreflang`, la tarjeta, su imagen y el JSON-LD.
 */
const CASA = /property="og:url"\s+content="([^"]+)"/.exec(html)?.[1] ?? null;
const LA_DE_VERDAD = "https://granjaoga.com/oga-veve/";

describe("la tarjeta que se ve al compartir el enlace", () => {
  it("tiene título, descripción y tipo, que no dependen de dónde viva", () => {
    for (const propiedad of ["og:title", "og:description", "og:type"]) {
      expect(html).toContain(`property="${propiedad}"`);
    }
    expect(html).toContain('name="twitter:card"');
  });

  it("y tiene su dirección entera, la página y la imagen", () => {
    /*
     * Quien lee estas etiquetas es un servidor ajeno, no un navegador: una
     * ruta relativa no le sirve de nada y la tarjeta sale sin imagen, que es
     * como sale un enlace que nadie abre.
     *
     * Y van juntas. Media tarjeta —la página sí y la imagen no— es el estado
     * peor de los tres: se comparte, se ve el recuadro y sale vacío.
     */
    const imagen = /property="og:image"\s+content="([^"]+)"/.exec(html)?.[1];
    expect(CASA).toBe(LA_DE_VERDAD);
    expect(imagen).toBe(`${LA_DE_VERDAD}og.png`);
  });

  it("y dice de qué tamaño es, que si no hay que descargarla para saberlo", () => {
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    // Y su texto alternativo, que una tarjeta también la lee alguien con
    // lector de pantalla.
    expect(html).toContain('property="og:image:alt"');
  });
});

describe("lo que le decimos a una máquina", () => {
  const datos = JSON.parse(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]!,
  ) as { "@graph": Record<string, unknown>[] };
  const nodos = datos["@graph"];
  const juego = nodos.find((n) => n["@type"] === "VideoGame")!;
  const codigo = nodos.find((n) => n["@type"] === "SoftwareSourceCode")!;

  it("el JSON-LD se puede leer y dice qué es esto", () => {
    expect(juego).toBeDefined();
    // Y la dirección, la misma que las etiquetas: dos sitios diciendo dónde
    // vive esto es la forma de que un día discrepen.
    expect(juego["url"]).toBe(CASA);
    expect(juego["image"]).toBe(`${LA_DE_VERDAD}og.png`);
    expect(String(juego["description"])).toContain("Paraguay y de Canarias");
  });

  it("y dice que es gratis, que es la promesa del proyecto", () => {
    // `isAccessibleForFree` no es una etiqueta de marketing: es el compromiso
    // escrito donde una máquina lo puede leer. Ver LICENSE-CONTENIDO.md.
    expect(juego["isAccessibleForFree"]).toBe(true);
    expect((juego["offers"] as { price: string }).price).toBe("0");
  });

  it("y que no pide registro ni datos, que schema.org no sabe decir de otra forma", () => {
    const lista = (juego["featureList"] as string[]).join(" · ");
    expect(lista).toContain("Sin registro");
    expect(lista).toContain("Sin datos personales");
    expect(String(juego["description"])).toContain("sin registro y sin datos personales");
  });

  it("y quién lo hace, con su código y su licencia cada uno", () => {
    expect((juego["author"] as { name: string }).name).toBe("Oksigenia SL");
    // El código es Apache-2.0 y tiene repositorio; el juego —arte, voces,
    // marcas— no. Ver LICENSE-CONTENIDO.md.
    expect(codigo["codeRepository"]).toContain("github.com/OksigeniaSL/oga-veve");
    expect(String(codigo["license"])).toContain("LICENSE-2.0");
    expect(String(juego["license"])).toContain("LICENSE-CONTENIDO");
    expect((codigo["targetProduct"] as { "@id": string })["@id"]).toBe(juego["@id"]);
  });

  it("y para quién, que aquí importa más que el género", () => {
    expect(juego["typicalAgeRange"]).toBe("4-");
    expect(juego["isFamilyFriendly"]).toBe(true);
    expect((juego["audience"] as { suggestedMinAge: number }).suggestedMinAge).toBe(4);
    expect(juego["inLanguage"]).toEqual(["es-PY", "en", "gn"]);
  });
});

/**
 * **Lo que necesita un buscador para encontrarlo.** Search Console decía
 * «Google no reconoce esta URL»: sin mapa del sitio que la nombre —eso va en
 * el de granjaoga.com— ni una dirección canónica que la diga.
 */
describe("lo que necesita un buscador", () => {
  it("una dirección canónica, la de la barra al final", () => {
    expect(/<link rel="canonical" href="([^"]+)"/.exec(html)?.[1]).toBe(LA_DE_VERDAD);
  });

  it("y la misma página para los tres idiomas y para quien no diga ninguno", () => {
    const alternas = [...html.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/g)];
    expect(alternas.map((m) => m[1]).sort()).toEqual(["en", "es", "gn", "x-default"]);
    for (const m of alternas) expect(m[2]).toBe(LA_DE_VERDAD);
  });

  it("y un título y una descripción que dicen las dos regiones", () => {
    expect(/<title>([^<]+)<\/title>/.exec(html)?.[1]).toBe(
      "Óga Veve — Volá sobre Paraguay y Canarias",
    );
    const descripcion = /name="description"\s+content="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(descripcion).toContain("Paraguay y de Canarias");
    // Lo que cabe en un resultado de búsqueda sin que lo corten.
    expect(descripcion.length).toBeLessThanOrEqual(160);
  });

  it("y qué es, escrito, para quien no ejecuta el juego", () => {
    const sinJs = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? "";
    expect(sinJs).toContain("<h1");
    expect(sinJs).toContain("Óga Veve");
    expect(sinJs).toContain("Paraguay");
    expect(sinJs).toContain("Canarias");
    expect(sinJs).toContain("JavaScript");
    // Y en inglés también, que es el otro idioma de producto.
    expect(sinJs).toContain('lang="en"');
  });
});

describe("llms.txt", () => {
  it("dice qué es, para quién y el compromiso educativo", () => {
    expect(llms).toContain("# Óga Veve");
    expect(llms).toContain("Gratis para siempre");
    expect(llms.toLowerCase()).toContain("guyrami");
  });

  it("y de dónde salen los datos, con sus licencias", () => {
    // La de Copernicus es literal y obligatoria; si desaparece de aquí es que
    // alguien ha resumido lo que no se puede resumir.
    expect(llms).toContain("Copernicus DEM GLO-30");
    expect(llms).toContain("OpenStreetMap");
    expect(llms).toContain("OurAirports");
  });

  it("y dónde está el código", () => {
    expect(llms).toContain("github.com/OksigeniaSL/oga-veve");
  });
});

/*
 * Este `robots.txt` solo vale si el juego se sirve en la raíz de un dominio:
 * un buscador no lee el de una subcarpeta. En granjaoga.com/oga-veve/ el que
 * cuenta es el de granjaoga.com. Se deja abierto igual, por si un día vive
 * en un subdominio propio.
 */
describe("robots.txt", () => {
  it("deja pasar a todo el mundo", () => {
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).not.toContain("Disallow: /\n");
  });

  it("y apunta al mapa del sitio", () => {
    expect(robots).toContain("Sitemap:");
  });
});
