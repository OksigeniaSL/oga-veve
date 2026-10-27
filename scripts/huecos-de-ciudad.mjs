/**
 * **Los huecos de la ciudad sorteada**: donde no se ponen cajas.
 *
 * La ciudad de un escenario es un sorteo sobre una rejilla de densidad —ver
 * `world/ciudad.ts`— y no sabe qué hay en cada manzana. Donde va a ir el
 * modelo de un sitio que se reconoce desde el aire, una caja inventada
 * encima es justo lo que no puede haber: el Palacio de López no es un
 * bloque de pisos. Así que su manzana y su jardín hacia la costanera se
 * guardan aquí, con el contorno de OpenStreetMap, y la ciudad no construye
 * dentro. Lo demás de la ciudad no cambia: el sorteo es el mismo, solo se
 * saltan las casas que caen en el hueco.
 *
 * Por la API de OpenStreetMap, que son vías conocidas: ver `relieve-fino.mjs`.
 *
 * Uso: node scripts/huecos-de-ciudad.mjs
 */
import { writeFileSync } from "node:fs";

const AGENTE = "oga-veve/0.1 (+https://github.com/OksigeniaSL/oga-veve)";

const HUECOS = [
  {
    id: "palacio-lopez",
    nombre: "El Palacio de López: su manzana y el Jardín Trasero, hacia la bahía",
    /*
     * La manzana (`place=city_block`) y el jardín de detrás del palacio, que
     * baja a la costanera y es lo que se ve desde el avión con el palacio.
     */
    vias: [766066068, 694198143],
  },
];

async function via(id) {
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/way/${id}/full.json`, {
    headers: { "User-Agent": AGENTE },
  });
  if (!res.ok) throw new Error(`OpenStreetMap respondió ${res.status} a way/${id}`);
  const datos = await res.json();
  const nudos = new Map(datos.elements.filter((e) => e.type === "node").map((e) => [e.id, [e.lat, e.lon]]));
  const linea = datos.elements.find((e) => e.type === "way" && e.id === id);
  return linea.nodes.map((n) => nudos.get(n)).map(([la, lo]) => [+la.toFixed(7), +lo.toFixed(7)]);
}

const salida = [];
for (const h of HUECOS) {
  const anillos = [];
  for (const id of h.vias) anillos.push(await via(id));
  salida.push({ id: h.id, nombre: h.nombre, de: h.vias.map((v) => `osm way/${v}`).join(", "), anillos });
  console.log(`${h.id}: ${anillos.map((a) => a.length).join(" + ")} puntos`);
}
writeFileSync(
  "data/cities/huecos.json",
  `${JSON.stringify(
    {
      fuente: "OpenStreetMap: el contorno de cada hueco, tal cual",
      licencia: "© colaboradores de OpenStreetMap, ODbL 1.0",
      huecos: salida,
    },
    null,
    1,
  )}\n`,
);
console.log("→ data/cities/huecos.json");
