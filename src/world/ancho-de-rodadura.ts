/**
 * Anchura por defecto de una calle de rodaje, m. OSM casi nunca la trae.
 *
 * **En su propio fichero y sin importar nada**, y no por gusto. Los escenarios
 * cosen sus plataformas al cargarse —ver `plataformas-cosidas.ts`— y para eso
 * necesitan este número; y el fichero de los escenarios y `aerodrome.ts` se
 * importan en círculo. Leído de `aerodrome.ts` a medio cargar, el número
 * llegaba sin valor, las cuentas daban `NaN` y Tenerife Sur se quedaba sin
 * coser —solo en algunas pruebas, según el orden en que se importara cada
 * cosa—. Un módulo que no importa nada se carga entero antes que nadie.
 */
export const ANCHO_RODADURA = 23;
