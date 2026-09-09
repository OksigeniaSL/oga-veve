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

/** La dirección donde vive, que es la que tienen que decir las etiquetas. */
const CASA = "https://oksigeniasl.github.io/oga-veve/";

describe("la tarjeta que se ve al compartir el enlace", () => {
  it("tiene título, descripción, imagen y dirección", () => {
    for (const propiedad of [
      "og:title",
      "og:description",
      "og:image",
      "og:url",
      "og:type",
    ]) {
      expect(html).toContain(`property="${propiedad}"`);
    }
    expect(html).toContain('name="twitter:card"');
  });

  it("y la imagen va con dirección absoluta", () => {
    /*
     * Quien lee estas etiquetas es un servidor ajeno, no un navegador: una
     * ruta relativa no le sirve de nada y la tarjeta sale sin imagen, que es
     * como sale un enlace que nadie abre.
     */
    const imagen = /property="og:image"\s+content="([^"]+)"/.exec(html)?.[1];
    expect(imagen).toBeDefined();
    expect(imagen!.startsWith("https://")).toBe(true);
    expect(imagen).toContain("og.png");
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
  ) as Record<string, unknown>;

  it("el JSON-LD se puede leer y dice qué es esto", () => {
    expect(datos["@type"]).toBe("VideoGame");
    expect(datos["url"]).toBe(CASA);
  });

  it("y dice que es gratis, que es la promesa del proyecto", () => {
    // `isAccessibleForFree` no es una etiqueta de marketing: es el compromiso
    // escrito donde una máquina lo puede leer. Ver LICENSE-CONTENIDO.md.
    expect(datos["isAccessibleForFree"]).toBe(true);
    expect((datos["offers"] as { price: string }).price).toBe("0");
  });

  it("y quién lo hace, con su código", () => {
    expect((datos["author"] as { name: string }).name).toBe("Oksigenia SL");
    expect(datos["codeRepository"]).toContain("github.com/OksigeniaSL/oga-veve");
  });

  it("y para quién, que aquí importa más que el género", () => {
    expect(datos["typicalAgeRange"]).toBe("4-");
    expect(datos["isFamilyFriendly"]).toBe(true);
    expect(datos["inLanguage"]).toEqual(["es-PY", "en", "gn"]);
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
