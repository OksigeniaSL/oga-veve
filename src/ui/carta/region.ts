/**
 * Las regiones de la carta en el juego: qué imagen horneada le toca a un
 * sitio, y cómo se pasa de longitud y latitud a esa imagen.
 *
 * La imagen sale de `scripts/carta-hornear.mjs` con la misma proyección que
 * se usa aquí —equirrectangular al coseno de la latitud media de la región—,
 * así que la costa trazada encima cae exactamente sobre la costa pintada.
 */

import { REGIONES, type IdRegion, type Region } from "./estilo";

/**
 * Las URL de las imágenes, con la huella que les pone Vite. No van en la
 * precarga: se bajan la primera vez que se abre la carta de su región.
 */
const IMAGENES = import.meta.glob("../../assets/carta/*.webp", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * La imagen de una región: la del calco de cuatro a seis años lleva el
 * sombreado más fuerte, que es como esos ojos leen la isla.
 */
export function imagenDe(id: IdRegion, pequenos: boolean): string | null {
  return IMAGENES[`../../assets/carta/${id}${pequenos ? "-pequenos" : ""}.webp`] ?? null;
}

/** El grano del papel: el mosaico de la hoja de estilo. */
export const PAPEL_URL: string | null = IMAGENES["../../assets/carta/papel.webp"] ?? null;

/** La región que contiene un punto, o `null` si no está en ninguna carta. */
export function regionDe(p: { readonly lat: number; readonly lon: number }): IdRegion | null {
  for (const [id, r] of Object.entries(REGIONES) as [IdRegion, Region][])
    if (p.lon >= r.oeste && p.lon <= r.este && p.lat >= r.sur && p.lat <= r.norte) return id;
  return null;
}

/** La proyección de una región: unidades de grado de latitud, el norte arriba. */
export interface Proyeccion {
  readonly region: Region;
  readonly ancho: number;
  readonly alto: number;
  /** De longitud y latitud al papel de la región. */
  readonly xy: (lonLat: readonly [number, number]) => [number, number];
}

export function proyeccionDe(id: IdRegion): Proyeccion {
  const region = REGIONES[id];
  const k = Math.cos((((region.sur + region.norte) / 2) * Math.PI) / 180);
  return {
    region,
    ancho: (region.este - region.oeste) * k,
    alto: region.norte - region.sur,
    xy: ([lon, lat]) => [(lon - region.oeste) * k, region.norte - lat],
  };
}
