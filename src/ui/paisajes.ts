/**
 * **El paisaje de cada sello de campo**: una cosa que se ve allí y en ningún otro sitio del juego.
 *
 * Cada dibujo se comprobó contra una foto de verdad del sitio, porque un sello también enseña: quien vea aquí el Teide
 * tiene que reconocerlo desde el avión (AGENTS.md, regla 4). Por eso el Teide lleva el Pilón y el hombro de Pico Viejo
 * al oeste, y no es un cono cualquiera; el puente de Encarnación, sus pilonos en A; y el cactus del Chaco es el cardón
 * (*Stetsonia coryne*), no un saguaro de Arizona.
 *
 * Un 40 × 40 a una tinta (`currentColor`): el trazo y el `estampa__tinte` que pinta el CSS del juego. Las claves son
 * las de `CAMPOS` en `sellos.ts`.
 */
export const PAISAJES = {
  /* Asunción: el Palacio de López, con su torre en el centro y sin frontón, que no tiene. */
  palacio: `
    <path class="estampa__tinte" d="M3 34 V23 H16 V11 H24 V23 H37 V34 Z" />
    <path d="M2 34 H38 M3 34 V23 H16 M24 23 H37 V34 M3 28.5 H37 M16 23 V11 H24 V23 M17.5 11 V7.5 H22.5 V11 M20 7.5 V3.5
             M5 34 V31.5 Q6.5 29.6 8 31.5 V34 M10 34 V31.5 Q11.5 29.6 13 31.5 V34 M27 34 V31.5 Q28.5 29.6 30 31.5 V34
             M32 34 V31.5 Q33.5 29.6 35 31.5 V34 M18.5 18 Q20 15.8 21.5 18 V20" />`,
  /* Ciudad del Este: los Saltos del Monday, a un paso del campo. */
  salto: `
    <path class="estampa__tinte" d="M2 11 H13 L12 34 H2 Z M27 11 H38 V34 H28 Z" />
    <path d="M2 11 H13 L12 34 M38 11 H27 L28 34 M13 11 H27
             M15 12 Q16.5 14 16.5 20 V31 M19.5 12 V31 M23.5 12 Q22.5 14 22.5 20 V31
             M10 36 Q14 32.5 18 36 Q22 32.5 26 36 Q30 32.5 33 36" />`,
  /* Encarnación: el puente San Roque González de Santa Cruz sobre el Paraná, atirantado desde dos pilonos en A. */
  puente: `
    <path d="M1 27 H39 M6 27 V31 M34 27 V31
             M11 27 L14 6 L17 27 M25 27 L28 6 L31 27
             M14 7 L4 27 M14 7 L8 27 M14 7 L20 27 M28 7 L22 27 M28 7 L34 27 M28 7 L37 27
             M3 35 Q7 32 11 35 Q15 32 19 35 Q23 32 27 35 Q31 32 35 35" />`,
  /* Concepción: el puerto del río Paraguay. */
  barco: `
    <path class="estampa__tinte" d="M19 28 H37 L34 32 H22 Z" />
    <path d="M3 28 H17 M8 28 V11 M12 28 V11 M8 11 H12 M8 16 L12 20 M12 16 L8 20 M8 22 L12 26
             M10 11 L25 6 M25 6 V15 M23.5 15 H26.5
             M19 28 H37 L34 32 H22 Z M23 28 V23 H32 V28 M26 23 V19.5 H30 V23
             M2 36 Q6 33 10 36 Q14 33 18 36 Q22 33 26 36 Q30 33 34 36" />`,
  /* Ayolas: el dorado, en la capital de la pesca. */
  pez: `
    <path class="estampa__tinte" d="M6 26 Q10 13 24 12 Q30 12 32 15 Q26 23 6 26 Z" />
    <path d="M6 26 Q10 13 24 12 Q30 12 32 15 Q26 23 6 26 Z M6 26 L4 23 M6 26 L9 27.5
             M32 15 L38 9 M32 15 L37 21 M34 13 L35 18.5
             M11 21 Q16 18 22 17 M27 13.5 h0.1
             M3 34 Q7 31 11 34 Q15 31 19 34 Q23 31 27 34 Q31 31 35 34" />`,
  /* Pilar: el yacaré de los esteros del Ñeembucú. */
  yacare: `
    <path class="estampa__tinte" d="M3 24 Q3 20 8 20 H16 Q17 15 20.5 15 Q24 15 24.5 20 Q25.5 18 27.5 18 Q30 18 30 21 H36 Q38 22 37 24 Z" />
    <path d="M3 24 Q3 20 8 20 H16 Q17 15 20.5 15 Q24 15 24.5 20 Q25.5 18 27.5 18 Q30 18 30 21 H36 Q38 22 37 24
             M20.5 17.6 h0.1 M5.5 21.5 h0.1 M7.5 21.5 h0.1
             M2 28 Q6 25.5 10 28 Q14 25.5 18 28 Q22 25.5 26 28 Q30 25.5 34 28 Q36 26.5 38 28
             M6 33 Q12 30.5 18 33 M24 33 Q30 30.5 36 33" />`,
  /* Pedro Juan Caballero: los cerros de Cerro Corá. */
  cerros: `
    <path class="estampa__tinte" d="M2 34 Q8 15 16 24 Q23 9 31 21 Q35 27 38 34 Z" />
    <path d="M2 34 Q8 15 16 24 Q23 9 31 21 Q35 27 38 34 M2 34 H38
             M8 34 V30 M8 30 Q5.5 28 8 25.5 Q10.5 28 8 30 M31 34 V31 M31 31 Q29 29.5 31 27.5 Q33 29.5 31 31
             M19.5 34 V30.5 M19.5 30.5 Q17.5 29 19.5 27 Q21.5 29 19.5 30.5" />`,
  /* Mariscal Estigarribia: el palo borracho del Chaco, con su panza. */
  borracho: `
    <path class="estampa__tinte" d="M17 36 Q11 29 15 22 Q17 19 18.5 16 H21.5 Q23 19 25 22 Q29 29 23 36 Z
             M7 15 a6 6 0 0 1 7 -7 a7 7 0 0 1 12 0 a6 6 0 0 1 7 7 Z" />
    <path d="M17 36 Q11 29 15 22 Q17 19 18.5 16 M21.5 16 Q23 19 25 22 Q29 29 23 36 M4 36 H36
             M7 15 a6 6 0 0 1 7 -7 a7 7 0 0 1 12 0 a6 6 0 0 1 7 7 Z
             M16 27 h0.1 M19 31 h0.1 M23 26 h0.1 M21 22 h0.1 M24 31 h0.1 M17 32 h0.1" />`,
  /* Yvytu Rape: la granja, con su vaca. */
  vaca: `
    <path class="estampa__tinte" d="M12 14 Q20 10 28 14 L27 30 Q20 35 13 30 Z" />
    <path d="M12 14 Q20 10 28 14 L27 30 Q20 35 13 30 Z M12 14 Q7 13 4 16 M28 14 Q33 13 36 16
             M13 12 Q11 7 14 5 M27 12 Q29 7 26 5
             M16 19 h0.1 M24 19 h0.1 M15 27 Q20 24 25 27 M18 28 h0.1 M22 28 h0.1" />`,
  /* El valle inventado: sus lomas. No es ningún sitio, y no lleva silueta. */
  lomas: `
    <path class="estampa__tinte" d="M2 27 Q9 10 17 21 Q25 8 38 22 V27 Z" />
    <path d="M2 27 Q9 10 17 21 Q25 8 38 22 M2 27 H38
             M10 38 Q22 34 16 31 Q11 29 21 27 M16 38 Q28 34 22 31 Q17 29 27 27" />`,
  /* El Chaco inventado: el cardón del Chaco (Stetsonia coryne). */
  cactus: `
    <path d="M2 35 H38 M18 35 V27 Q18 25 16 25 H13 Q11 25 11 23 V14 M18 27 Q18 25 20 25 H25 Q27 25 27 23 V11
             M18 27 V9 M14.5 25 V17 M23 25 V13
             M11 14 Q11 12 12.5 12 Q14 12 14 14 M27 11 Q27 9 28.5 9 Q30 9 30 11
             M33 8 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />`,
  /* Tenerife Norte: el Teide con el Pilón y el hombro de Pico Viejo al oeste, sobre el mar de nubes de Los Rodeos. */
  teide: `
    <path class="estampa__tinte" d="M3 27 Q9 19 12.5 10.5 L14 10 L15.6 6 H17.4 L19 10 L20.5 10.6 Q22 14 25 15 H31 Q34 18 38 27 Z" />
    <path d="M3 27 Q9 19 12.5 10.5 L14 10 L15.6 6 H17.4 L19 10 L20.5 10.6 Q22 14 25 15 H31 Q34 18 38 27
             M26 15 L27.5 16.5 H30 L31 15
             M2 30 Q5 26.5 9 29.5 Q12.5 26 17 29.5 Q21 26 25 29.5 Q29 26 33 29.5 Q36 27 38 30 M2 30 H38" />`,
  /* Tenerife Sur: un windsurf con la Montaña Roja detrás. El campo está junto a El Médano, con viento casi todo el año. */
  vela: `
    <path class="estampa__tinte" d="M22 28 Q25 15 31 15 Q36 16 39 28 Z M13 6 Q20 15 15 30 L9 30 Q13 17 13 6 Z" />
    <path d="M22 28 Q25 15 31 15 Q36 16 39 28 M13 6 Q20 15 15 30 L9 30 Q13 17 13 6 Z M13 6 L12 30 M11 19 L17 21
             M6 31.5 H19 M2 35 Q6 32 10 35 Q14 32 18 35 Q22 32 26 35 Q30 32 34 35" />`,
  /* La Palma: las cúpulas del observatorio del Roque de los Muchachos. */
  observatorio: `
    <path class="estampa__tinte" d="M12 36 L24 22 L38 30 V36 Z" />
    <path d="M12 36 L24 22 L38 30 M19 26 a5 5 0 0 1 10 0 Z M24 21 V19.5 M30 29 a3 3 0 0 1 6 0 Z
             M2 30 Q5 27 8 29.5 Q11 26.5 14.5 29 M2 34 Q5 31.5 8 33.5 Q10 31.5 12 33" />`,
  /* Gran Canaria: el Roque Nublo, tal como es. */
  nublo: `
    <path class="estampa__tinte" d="M15 30 Q14 20 15 11 L14.5 7.5 Q16 5 18.5 5.5 L20 4.5 Q23.5 5 24.5 8 L25.5 11 Q25 21 24.5 30 Z M8.5 30 L9.5 22 Q11 20 12.5 22 L13 30 Z" />
    <path d="M2 36 Q9 29 15 30 H24.5 Q31 29 38 36 M15 30 Q14 20 15 11 L14.5 7.5 Q16 5 18.5 5.5 L20 4.5 Q23.5 5 24.5 8 L25.5 11 Q25 21 24.5 30
             M8.5 30 L9.5 22 Q11 20 12.5 22 L13 30 M18 12 L18.5 21 M22 14 L21.5 25 M5 34 L8 32.5 M31 32.5 L34 34" />`,
  /* Lanzarote: los dromedarios de Timanfaya, con la montaña volcánica detrás. */
  camello: `
    <path class="estampa__tinte" d="M25 23 L31 12 H34 L40 23 Z M6 22 Q7 14 13 14 Q17 12 20 16 L24 15 L26 9 L30 10 L29 12 L27.5 12 L26 20 Q24 23 19 23 H8 Q6 23 6 22 Z" />
    <path d="M25 23 L31 12 H34 L40 23
             M6 22 Q7 14 13 14 Q17 12 20 16 L24 15 L26 9 L30 10 L29 12 L27.5 12 L26 20 Q24 23 19 23 H8 Q6 23 6 22 Z
             M10 12 H18 M11 12 V17 M17 12 V17 M10 17 H18
             M9 23 V33 M12 23 V33 M18 23 V33 M21 23 V33 M2 34 H38" />`,
  /* Fuerteventura: las dunas de Corralejo. */
  dunas: `
    <path class="estampa__tinte" d="M2 36 Q10 22 20 30 Q28 20 38 28 V36 Z" />
    <path d="M2 36 Q10 22 20 30 Q28 20 38 28 M7 33 Q11 30 15 33 M24 31 Q28 28 32 31 M18 35 Q21 33 24 35
             M28 10 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" />`,
  /* El Hierro: la sabina doblada por el viento, la de El Sabinar. */
  sabina: `
    <path class="estampa__tinte" d="M14 15 Q24 9 38 14 Q33 21 18 21 Z" />
    <path d="M7 36 Q9 27 10 21 Q11 15 16 14 M12 36 Q13 28 15 23 Q17 19 22 19 M14 15 Q24 9 38 14 Q33 21 18 21
             M3 36 H32 M25 26 H34 M28 30 H37" />`,
  /* La Gomera: la laurisilva de Garajonay. */
  laurisilva: `
    <path class="estampa__tinte" d="M2 16 Q3 9 8 10 Q10 5 15 7 Q19 3 24 6 Q28 4 31 8 Q37 8 38 15 Q34 18 29 16 Q24 19 19 16 Q13 19 8 16 Q4 18 2 16 Z" />
    <path d="M2 16 Q3 9 8 10 Q10 5 15 7 Q19 3 24 6 Q28 4 31 8 Q37 8 38 15 Q34 18 29 16 Q24 19 19 16 Q13 19 8 16 Q4 18 2 16 Z
             M8 17 Q6 24 9 28 Q11 31 8 35 M15 18 Q17 26 15 35 M24 18 Q22 25 25 30 Q26 32 25 35 M32 17 Q34 25 31 35
             M9 28 L12.5 25.5 M15.5 25 L18.5 22.5 M25 30 L28.5 27.5
             M2 35 H38 M3 30 H7 M18 31 H23 M33 29 H37" />`,
  /* Madrid, Cuatro Vientos: la cresta de Siete Picos, en el Guadarrama. */
  guadarrama: `
    <path class="estampa__tinte" d="M2 34 V27 L7 25 L11 23 L14 19 L16 20.5 L18 17 L20 19 L22 16 L24 18.5 L26 15.5 L28 18 L30 17 L33 21 L38 23 V34 Z" />
    <path d="M2 27 L7 25 L11 23 L14 19 L16 20.5 L18 17 L20 19 L22 16 L24 18.5 L26 15.5 L28 18 L30 17 L33 21 L38 23
             M2 34 H38 M2 30 Q12 27 20 29.5 Q29 27 38 30" />`,
} as const;
