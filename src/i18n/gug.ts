/**
 * Guaraní paraguayo — jopara.
 *
 * **Jopara y no guaraniete**, y es una decisión, no una rebaja. El guaraniete
 * —el guaraní puro— es el de la escuela y el de los actos; el jopara es el que
 * se habla en la calle, en casa y con los chicos, y lleva castellano mezclado
 * con toda naturalidad. Los días de la semana, sin ir más lejos, son los del
 * castellano: nadie dice otra cosa. Este juego se habla, no se recita.
 *
 * De ahí la regla que gobierna este fichero:
 *
 * - **Guaraní donde lo hay y se usa**: yvate, yvýpe, tyapu, tekorosã, ejupi,
 *   emboguejy, eha'arõ.
 * - **Préstamo donde la gente lo usa**: motor, pista, freno, flaps, cámara,
 *   nivel, misión, timón. Traducirlos sonaría a manual, no a cabina.
 * - **Los rótulos aeronáuticos no se traducen jamás**: IAS, ALT, HDG, THR,
 *   V/S, BRK son iguales en toda la aviación del planeta y reconocerlos es
 *   parte de lo que se aprende aquí. Tampoco las unidades.
 *
 * Lo que falte cae al castellano automáticamente, que sigue siendo mejor que
 * inventar.
 *
 * PENDIENTE DE REPASO POR HABLANTE NATIVA. Esto es un primer borrador
 * completo, no una traducción certificada: corregir cualquier línea es cambiar
 * una línea de aquí y nada más. Lo que más importa que quede bien son los
 * avisos y el tutor —lo que se lee volando y en un segundo—; los créditos
 * pueden esperar.
 */

import type { Dictionary } from './index';

export const GUG: Dictionary = {
  'app.title': 'Óga Veve',
  'app.tagline': 'Eveve Paraguay ári',

  // ── El vuelo completo ──────────────────────────────────────────────────
  'torre.verde': 'Ikatúma reike',
  'torre.roja': "Eha'arõ ko'ápe",
  'vuelo.estacionado': 'Emyandy motor',
  'vuelo.arrancando': 'Epoi freno ha eguata mbegue',
  'vuelo.rodando': 'Eho raya hovy rupi',
  'vuelo.esperando': "Epyta porã ha eha'arõ tesape",
  'vuelo.autorizado': '¡Tesape hovy! Eike pistápe',
  'vuelo.alineando': 'Eñemboja eje-re',
  'vuelo.despegando': 'Motor opa peve',
  'vuelo.enVuelo': 'Tereho eveve',
  'vuelo.enVueloAterrizando': 'Tereho pistápe',
  'vuelo.final': 'Eguejy mbeguemi',
  'vuelo.aterrizado': 'Ejoko',
  'vuelo.abandonando': 'Esẽ pistágui, oúma ambue',
  'vuelo.aPlataforma': 'Eho jey nde rendápe',
  'vuelo.enPuesto': 'Reguahẽma. Embogue motor',
  'vuelo.apagado': '¡Opáma ne veve!',
  'vuelo.fuera': 'Eho jey raya hovýpe',
  'vuelo.despacio': 'Mbeguekatu',
  'vuelo.sinPermiso': "Reike tesape hovy'ỹre. Ambuévape eha'arõ",

  // ── El hangar ──────────────────────────────────────────────────────────
  'hangar.donde': '¿Moõpa javeve?',
  'hangar.como': '¿Mba’eichagua piloto piko nde?',
  'hangar.despegar': '¡Javeve!',
  'hangar.volver': 'Eiporavo ambue tenda',
  'mapa.title': 'Ehecha mapa',
  'mapa.cerca': 'Ehecha hi’aguĩve',
  'mapa.lejos': 'Ehecha mombyryve',
  'tiempo.title': 'Ára',
  'tiempo.hora': 'Mba’e óra',
  'tiempo.viento': 'Moõguipa ou yvytu ha mboýpa ipoguasu',
  'tiempo.calma': "Yvytu'ỹre",
  'tiempo.real': 'Ára ko’ág̃agua',
  'hangar.aque': '¿Mba’épe reñembosarái?',
  'leccion.vuelta': 'Reho reguata',
  'leccion.rodaje': 'Reguata yvýpe',
  'leccion.despegue': 'Repu’ã',
  'leccion.aterrizaje': 'Reguejy',

  // ── Instrumentos ───────────────────────────────────────────────────────
  // Los rótulos cortos (IAS, ALT, HDG…) no están aquí a propósito: no se
  // traducen. Esto son las glosas de debajo, que sí explican.
  'hud.speed': 'Pya’ekue',
  'hud.altitude': 'Yvate',
  'hud.heading': 'Tape',
  'hud.throttle': 'Motor',
  'hud.vspeed': 'Jupi',
  'hud.brakes': 'Freno',
  'hud.ground': 'Yvýpe',
  'hud.home': 'Pista',
  'hud.objective': 'Jehupytyrã',

  // ── Avisos ─────────────────────────────────────────────────────────────
  // Lo más importante del fichero: se leen volando y en un segundo. Cortos.
  'hud.stall': '¡Pérdida! Emboguejy tĩ',
  'hud.pullUp': '¡Yvy! Ejupi',
  'hud.runwayEnd': '¡Opa hína pista!',
  'hud.landedSoft': '¡Iporãiterei! Mbeguemi',
  'hud.landedFirm': 'Hatã michĩ. Reguejýma',
  'hud.landedOffRunway': 'Reguejy pista okápe, ha katu reguejy',
  'hud.crashed': 'Oñembyai mba’e. Jaha jey pistápe…',
  'hud.engineOff': 'Motor ogue',
  'hud.engineOn': '¡Motor oiko!',
  'hud.engineBusy': 'Epyta porã ha emboguejy motor raẽ',

  // ── El tutor ───────────────────────────────────────────────────────────
  'tutor.throttle': 'Emombarete motor',
  'tutor.speed': "Eha'arõ oñani peve",
  'tutor.pull': 'Emopu’ã',
  'tutor.slow': 'Emboguejy motor',
  'tutor.flying': 'Reveve hína!',

  // ── Nivel y sonido ─────────────────────────────────────────────────────
  'mode.label': 'Nivel',
  'mode.arcade': 'Arcade',
  'mode.pilot': 'Piloto',
  'mode.changed': 'Pytyvõ: {mode}',
  'sound.normal': 'Tyapu normal',
  'sound.bajo': 'Tyapu mbegue',
  'sound.mudo': 'Tyapu’ỹre',

  // ── Unidades ───────────────────────────────────────────────────────────
  // Iguales en todos los idiomas. Están aquí para que quede dicho que se
  // dejaron a propósito y no por olvido.
  'units.kmh': 'km/h',
  'units.metres': 'm',
  'units.mps': 'm/s',
  'units.knots': 'kt',
  'units.feet': 'ft',
  'units.fpm': 'ft/min',

  // ── Aeronaves ──────────────────────────────────────────────────────────
  'aircraft.oga172.description': "Avión mbo'ehao peguarã. Py’aguapy ha ipochy’ỹva.",
  'aircraft.mainumby.description': 'Biplano ñemitỹrã. Ipya’e ha imbarete.',

  // ── Misiones ───────────────────────────────────────────────────────────
  'mission.first.name': 'Ne veve peteĩha',
  'mission.valley.name': 'Valle jere',
  'mission.transfer.name': 'Jeguerova',
  'mission.started': '{name}',
  'mission.step': '¡Iporã! Tereho gueteri',
  'mission.done': '¡Ojejapopáma!',
  'mission.none': 'Veve sãso',

  // ── Escenarios ─────────────────────────────────────────────────────────
  // Silvio Pettirossi y Tenerife Norte son nombres propios y no se traducen.
  'scenario.valle.name': 'Cordillera Valle',
  'scenario.chaco.name': 'Chaco Ñu',
  'scenario.pettirossi.name': 'Silvio Pettirossi',
  'scenario.tenerife.name': 'Tenerife Norte',

  // ── Ayuda ──────────────────────────────────────────────────────────────
  'help.title': "Mba'éichapa oveve",
  'help.start': 'Emombarete motor opa peve ha emopu’ã mbeguemi oñani vove',
  'help.pitch': 'Flecha térã W A S D — ejupi, eguejy ha ejere',
  'help.rudder': 'Q ha E — timón',
  'help.throttle': 'Más ha menos — motor',
  'help.brakes': 'B térã espacio — freno',
  'help.camera': 'C — emoambue cámara',
  'help.assist': 'M — nivel',
  'help.reset': 'R — eñepyrũ jey',
  'help.credits': 'F1 — aguyje',
  'help.language': "L — ñe'ẽ",
  'help.sound': 'V — tyapu (térã botón)',
  'help.aircraft': 'P — emoambue avión',
  'help.mission': 'N — misión',

  // ── La pantalla de mandos ──────────────────────────────────────────────
  'teclas.title': 'Tecla kuéra',
  'teclas.cambiar': 'Emoambue umi tecla',
  'teclas.mano': 'Mba’e pópa remboguata motor',
  'teclas.zurda': 'Po asu',
  'teclas.diestra': 'Po akatúa',
  'teclas.hint': 'Eipoko peteĩ teclare emoambue haguã. Escape opyta upéicha.',
  'teclas.pulsa': 'Eipoko peteĩ tecla…',
  'teclas.restore': 'Ymaguaréicha',
  'teclas.close': 'Emboty',

  'tecla.pitchUp': 'Emopu’ã tĩ',
  'tecla.pitchDown': 'Emboguejy tĩ',
  'tecla.rollLeft': 'Ejere asúpe',
  'tecla.rollRight': 'Ejere akatúape',
  'tecla.yawLeft': 'Timón asúpe',
  'tecla.yawRight': 'Timón akatúape',
  'tecla.throttleUp': 'Motor hetave',
  'tecla.throttleDown': "Motor sa'ive",
  'tecla.brakes': 'Freno',
  'tecla.flaps': 'Flaps',
  'tecla.camera': 'Emoambue cámara',
  'tecla.assist': 'Nivel',
  'tecla.reset': 'Eñepyrũ jey',
  'tecla.aircraft': 'Emoambue avión',
  'tecla.mission': 'Emoambue misión',
  'tecla.sound': 'Tyapu',
  'tecla.language': "Ñe'ẽ",
  'tecla.credits': 'Aguyje',
  'tecla.keys': 'Ehecha ha emoambue tecla kuéra',
  'tecla.engine': 'Emyandy térã embogue motor',

  // ── Idioma ─────────────────────────────────────────────────────────────
  'language.label': "Ñe'ẽ",
  'language.changed': "Ñe'ẽ: {name}",

  // ── Créditos ───────────────────────────────────────────────────────────
  'credits.title': 'Aguyje',
  'credits.close': 'Emboty',
  'credits.madeBy': "Oksigenia SL mba'e, Granja Óga rérape.",
  'credits.educational':
    "Reipuru reíta opa ára Paraguay mbo'ehao kuérape: mbo'ehao, mbo'ehára, temimbo'e ha ogaygua. Ndaipóri trámite ha ndaipóri jehepyme'ẽ.",
  // La parte legal va en el idioma en que la exige la licencia: traducir una
  // atribución obligatoria es dejar de cumplirla.
  'credits.terrain': 'Yvy Copernicus DEM GLO-30 guive. © DLR e.V. 2010-2014 ha © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.',
  'credits.engine': 'Veve modelo: {model}',
  'credits.licence': "Código sãso Apache-2.0 guýpe. Mba'ekuaa ha marca, © Oksigenia SL.",
  'credits.dedication':
    "Guillermo Ayala-pe, Parque Nacional del Teide pegua, omoarandúva cuarenta año pukukue mbo'esyry kuérape upe yvyty. Ko ñembosarái rembiapoukapy ha'e imba'e: tekorosã, tekorosã, tekorosã — upégui, opa ambue ha'e ñemoarandu.",
};
