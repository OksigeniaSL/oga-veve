/**
 * English.
 *
 * Not an afterthought for foreign visitors: aviation runs in English
 * worldwide. Someone who learns to fly here and later flies for real will
 * meet these words in a cockpit, in a chart and on the radio, so they may as
 * well meet them here first. See AGENTS.md, rule 3.
 *
 * The instrument labels on the HUD (IAS, ALT, HDG, V/S, THR) are not in this
 * file: they are the same in every language, exactly as they are in a real
 * aircraft. What this dictionary carries is the plain-words gloss underneath.
 */

import type { Dictionary } from "./index";

export const EN: Dictionary = {
  "pilotos.titulo": "Which one is your plane?",
  "pilotos.nuevo": "A new one",
  "pilotos.quitar": "Remove this plane",
  "pilotos.tuyo": "This is your plane",
  "pilotos.bicho": "The animal",
  "pilotos.color": "The colour",
  "pilotos.listo": "Let's fly",
  "bicho.tero": "Tero",
  "bicho.jaguarete": "Jaguareté",
  "bicho.karumbe": "Karumbé",
  "bicho.mburucuya": "Mburucuyá",
  "color.rojo": "Red",
  "color.azul": "Blue",
  "color.verde": "Green",
  "color.amarillo": "Yellow",
  "color.violeta": "Purple",
  "color.naranja": "Orange",
  "ajustes.titulo": "Settings",
  "ajustes.listo": "Done",
  "ajustes.movimiento": "Motion",
  "ajustes.movimiento.sistema": "Follow the device",
  "ajustes.movimiento.normal": "Normal",
  "ajustes.movimiento.reducido": "Reduced",
  "ajustes.cabeceo": "Pitch control",
  "ajustes.cabeceo.normal": "Normal",
  "ajustes.cabeceo.invertido": "Inverted",
  "ajustes.unidades": "Units",
  "ajustes.unidades.peldano": "The step's own",
  "ajustes.unidades.metrico": "km/h and metres",
  "ajustes.unidades.aeronautico": "Knots and feet",
  "ajustes.tamano": "Control size",
  "ajustes.tamano.pequeno": "Small",
  "ajustes.tamano.normal": "Normal",
  "ajustes.tamano.grande": "Large",
  "ajustes.volumen": "Sound",
  "ajustes.volumen.normal": "Normal",
  "ajustes.volumen.bajo": "Quiet",
  "ajustes.volumen.mudo": "Off",
  "ajustes.contraste": "Contrast",
  "ajustes.contraste.normal": "Normal",
  "ajustes.contraste.alto": "Stronger",
  "app.tagline": "Fly over Paraguay and the Canary Islands",

  "hud.speed": "Airspeed",
  "luz.terreno": "TERRAIN",
  "luz.perdida": "STALL",
  "luz.rapido": "OVERSPEED",
  "luz.tren": "GEAR",
  "luz.combustible": "FUEL LOW",
  "luz.frustrada": "GO AROUND",
  "luz.piloto": "A/P OFF",
  "luz.freno": "PARK BRK",
  "luz.cabina": "CABIN ALT",
  "luz.motor": "ENG FAIL",
  "hud.altitude": "Altitude",
  "hud.heading": "Heading",
  "hud.throttleDown": "Less power",
  "hud.throttleUp": "More power",
  "hud.sinFoto": "No world photos today. You are flying the drawn world.",
  "hud.sinVoz":
    "This browser has no speech voices installed: the instructor cannot talk.",
  "hud.throttle": "Throttle",
  "hud.vspeed": "Vertical speed",
  "hud.stall": "Stall! Lower the nose",
  "hud.pullUp": "Ground. Pull up",
  "hud.runwayEnd": "Runway ending",
  "hud.landedSoft": "Beautiful landing. Smooth as it gets",
  "hud.landedFast": "Too fast! Ease off the power before touching down",
  "hud.landedFirm": "Firm landing. You are down",
  "hud.landedOffRunway": "You landed off the runway, but you landed",
  "hud.landedShort":
    "You touched down before the white bar: the arrows are for taxi and take-off",
  "hud.brakes": "Brakes",
  "hud.crashed": "Something broke. Back to the runway…",
  "hud.home": "Runway",
  "hud.objective": "Objective",
  "sound.normal": "Sound on",
  "sound.bajo": "Sound low",
  "sound.mudo": "Sound off",

  "units.kmh": "km/h",
  "units.metres": "m",
  "units.mps": "m/s",
  "units.knots": "kt",
  "units.feet": "ft",
  "units.fpm": "ft/min",

  "aircraft.pykasu.description": "Trainer. Steady and forgiving.",
  "aircraft.mainumby.description": "Crop duster biplane. Nimble and strong.",
  "aircraft.panambi.description":
    "Low-wing twin. Two engines, faster, and the legs tuck away.",
  "aircraft.arasunu.description":
    "Regional turboprop, T-tail. Big, and it fits short runways.",
  "aircraft.arai.description":
    "Swept-wing jet. Fast, and everything happens slower.",
  "aircraft.yvaga.description":
    "Four-engine widebody. The big one: count the engines.",

  "mission.rio.name": "See the river",
  "mission.rioabajo.name": "Follow the river",
  "mission.mar.name": "Out to sea",
  "mission.anaga.name": "To Anaga",
  "mission.cumbre.name": "To the summit",
  "mission.lomas.name": "To the hills",
  "mission.first.name": "Your first flight",
  "mission.valley.name": "Around the valley",
  "mission.transfer.name": "The transfer",
  "mission.started": "{name}",
  "mision.titulo": "What to do",
  "mision.despegar": "Take off",
  "mision.llegar": "Reach the point",
  "mision.aterrizar": "Land",
  "mision.hecho": "Done",
  "mission.step": "Good! Keep going",
  "mission.done": "Mission complete!",
  "mission.none": "Free flight",

  "scenario.guarani.name": "Guaraní · Ciudad del Este",
  "scenario.estigarribia.name": "Mariscal Estigarribia · the Chaco",
  "scenario.pedroJuan.name": "Pedro Juan Caballero · Amambay",
  "scenario.encarnacion.name": "Encarnación · the Paraná",
  "scenario.concepcion.name": "Concepción · the north",
  "scenario.ayolas.name": "Ayolas · Yacyretá",
  "scenario.pilar.name": "Pilar · Ñeembucú",
  "scenario.valle.name": "Cordillera Valley",
  "scenario.pettirossi.name": "Silvio Pettirossi",
  "scenario.yvytu.name": "Yvytu Rape · Granja Óga",
  "scenario.chaco.name": "Chaco Plain",
  "scenario.tenerife.name": "Tenerife North",
  "scenario.laPalma.name": "La Palma",
  "scenario.tenerifeSur.name": "Tenerife South",
  "scenario.granCanaria.name": "Gran Canaria",
  "scenario.lanzarote.name": "Lanzarote",
  "scenario.fuerteventura.name": "Fuerteventura",
  "scenario.elHierro.name": "El Hierro",
  "scenario.laGomera.name": "La Gomera",
  "scenario.cuatroVientos.name": "Cuatro Vientos",

  "tutor.throttle": "Add power",
  "tutor.speed": "Let her run",
  "tutor.pull": "Pull up",
  "tutor.flying": "You're flying!",
  "tutor.frenar": "Brake",
  "tutor.salir": "Follow the line off the runway",
  "tutor.slow": "Ease the power",
  "tutor.palancaSeQueda":
    "The stick stays where you leave it, and so does the plane. Tap it twice to fly straight again.",
  "tutor.dobleToque": "Wings level, flying level.",
  "tutor.inclinacionTope":
    "That's as far as it banks: thirty-three degrees. That keeps the passengers comfortable.",
  "tutor.mandoConectado": "Gamepad connected: you can fly with it.",
  "tutor.joystickConectado": "Joystick connected: you can fly with it.",
  "palabra.mando": "Gamepad",
  "palabra.joystick": "Joystick",
  "tutor.pedales":
    "Down there are the rudder pedals: on the ground, they steer the plane. Press the left one to go left.",
  "help.assist": "M — difficulty tier",
  "help.start": "Throttle all the way up, then ease back when she runs",

  "teclas.title": "Controls",
  "teclas.cambiar": "Change the keys",
  "teclas.mano": "Which hand works the throttle",
  "teclas.zurda": "Left hand",
  "teclas.diestra": "Right hand",
  "teclas.hint": "Click a key to change it. Escape leaves it alone.",
  "teclas.pulsa": "Press a key…",
  "teclas.toque":
    "In the air, the arrows bank the plane and make it climb or descend gently, and when you let go it stays as you left it: the trim, TRIM, holds it. A short tap moves it a little more.",
  "teclas.mando":
    "You can also fly with a gamepad or a flight joystick: plug it in and move it. On the joystick, the hat switch is TRIM, the trigger brakes and the buttons on the base move the flaps and the gear.",
  "teclas.restore": "Back to default",
  "teclas.close": "Close",
  "tecla.pitchUp": "Nose up",
  "tecla.pitchDown": "Nose down",
  /* Trim, which is not "nose up" again: the stick springs back, trim stays. */
  "tecla.trimUp": "Trim nose up",
  "tecla.trimDown": "Trim nose down",
  "tecla.cuadro": "Lower or raise the panel",
  "tecla.rollLeft": "Turn left",
  "tecla.rollRight": "Turn right",
  "tecla.yawLeft": "Rudder left",
  "tecla.yawRight": "Rudder right",
  "tecla.throttleUp": "More power",
  "tecla.throttleDown": "Less power",
  "tecla.brakes": "Brakes",
  "tecla.reversa": "Reverse thrust",
  "tecla.flaps": "Flaps",
  "tecla.tren": "Gear",
  "tecla.aerofrenos": "Speed brakes",
  "tecla.autofreno": "Autobrake",
  "tecla.camera": "Change view",
  "tecla.assist": "Difficulty tier",
  "tecla.reset": "Start again",
  "tecla.aircraft": "Change aircraft",
  "tecla.mission": "Change mission",
  "tecla.destino": "Change destination",
  "vuelo.solo-vuelta": "From here, it's a local flight",
  "vuelo.solo-vuelta.no-cabe":
    "With this aeroplane it's a local flight. To fly to {sitios}, pick a smaller one in the hangar",
  "tecla.qnhUp": "Altimeter setting up",
  "tecla.qnhDown": "Altimeter setting down",
  "tecla.altUp": "ALT window up",
  "tecla.altDown": "ALT window down",
  "tecla.sound": "Sound",
  "tecla.language": "Language",
  "tecla.credits": "Credits",
  "tecla.keys": "View and change keys",
  "tecla.pausa": "Pause the game",
  "tecla.engine": "Start or shut down the engine",
  "hud.engineOff": "Engine off",
  "hud.engineBusy": "Come to a stop and close the throttle first",
  "hud.engineOn": "Engine running",
  "credits.title": "Credits",
  "credits.madeBy": "An Oksigenia SL product, under the Granja Óga brand.",
  "credits.educational":
    "Free forever for Paraguayan education: schools, teachers, pupils and families. No paperwork, no payment.",
  "credits.cancion": "The simulator's song: «Luz verde» (Green Light), by Granja Óga.",
  "credits.cancionEnlace": "Listen on YouTube",
  "credits.terrain":
    "Relief from Copernicus DEM GLO-30. © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.",
  "credits.terrainEs":
    "Relief in Spain from PNOA-LiDAR MDT05 © Instituto Geográfico Nacional de España, CC BY 4.0.",
  "credits.osm":
    "Aerodromes, taxiways, aprons and towns from data © OpenStreetMap contributors, under the ODbL licence.",
  "credits.ortoEs":
    "Aerial imagery of Spain: PNOA © Instituto Geográfico Nacional de España, CC BY 4.0 · scne.es.",
  "credits.ortoPy":
    "Aerial imagery of Paraguay: EOxCloudless (cloudless.eox.at) by EOX IT Services GmbH — contains modified Copernicus Sentinel data, 2020.",
  "credits.fotosHistorias":
    "Photos for the window stories: Wikimedia Commons. Each one carries its author and licence —CC BY, CC BY-SA, CC0 or public domain— and the full list is in CREDITOS.md, alongside the game's code.",
  "credits.engine": "Flight model: {model}",
  "credits.licence":
    "Code free under Apache-2.0. Content and brands, © Oksigenia SL.",
  "credits.dedication":
    "For Guillermo Ayala, of Teide National Park, who has spent forty years teaching that mountain to schoolchildren. The rule this game runs on is his: safety, safety, safety — everything after that is learning.",
  "credits.close": "Close",

  "torre.verde": "{indicativo}, cleared for take-off",
  // La roja es la del punto de espera: «hold short of runway (number)», Doc
  // 4444, 12.3.4.7. Ver `torre.roja` en `es-PY.ts`.
  "torre.roja": "{indicativo}, hold short of runway",
  // La torre canaria dice lo mismo en inglés: lo que cambia entre las dos es
  // el castellano y la voz. Ver `i18n/habla.ts`.
  "torre.afisLibre": "{indicativo}, runway free",
  "torre.afisLibreEnFinal": "{indicativo}, runway free",
  "torre.afisOcupada": "{indicativo}, runway occupied",
  "torre.afisSinTrafico": "{indicativo}, no reported traffic",
  "torre.afisTraficoAterriza": "{indicativo}, landing traffic",
  "torre.afisTraficoDespega": "{indicativo}, departing traffic",
  "torre.canario.afisLibre": "{indicativo}, runway free",
  "torre.canario.afisLibreEnFinal": "{indicativo}, runway free",
  "torre.canario.afisOcupada": "{indicativo}, runway occupied",
  "torre.canario.afisSinTrafico": "{indicativo}, no reported traffic",
  "torre.canario.afisTraficoAterriza": "{indicativo}, landing traffic",
  "torre.canario.afisTraficoDespega": "{indicativo}, departing traffic",
  "torre.canario.verde": "{indicativo}, cleared for take-off",
  "torre.canario.roja": "{indicativo}, hold short of runway",
  "torre.aterrizar": "{indicativo}, cleared to land",
  "torre.canario.aterrizar": "{indicativo}, cleared to land",
  "torre.alAire": "{indicativo}, go around",
  "torre.acelereAbandono": "{indicativo}, expedite vacating",
  "torre.aterrizoSinPermiso":
    "{indicativo}, landed without clearance, call the tower by telephone on arrival",
  "torre.canario.alAire": "{indicativo}, go around",
  "torre.canario.acelereAbandono": "{indicativo}, expedite vacating",
  "torre.canario.aterrizoSinPermiso":
    "{indicativo}, landed without clearance, call the tower by telephone on arrival",
  // El límite de la autorización: a dónde va el vuelo. Ver `torre.destino`.
  "torre.destino": "{indicativo}, cleared to {destino}",
  "torre.canario.destino": "{indicativo}, cleared to {destino}",
  // La altura va ya dicha: «three thousand feet», «flight level one one zero».
  // Ver `alturaEnRadio` en `flight/autorizacion-de-altitud.ts`.
  "torre.subir": "{indicativo}, climb to {altura}",
  "torre.canario.subir": "{indicativo}, climb to {altura}",
  // Tu número en la fila de salida. Ver `torre.numeroDos` en `es-PY.ts`.
  "torre.numeroDos": "number two for departure",
  "torre.numeroTres": "number three for departure",
  "torre.canario.numeroDos": "number two for departure",
  "torre.canario.numeroTres": "number three for departure",
  "hud.filaDeSalida": "Number {numero} for departure",
  "hud.esperaLaEstela": "Waiting for the wake of the plane that just left",
  // Las palabras del segundo peldaño. Ver `flight/escalera.ts`.
  // Cómo vuela un ala. Ver `ui/pantalla-ala.ts`.
  "ala.titulo": "How a wing flies",
  "ala.angulo": "Wing angle",
  "ala.velocidad": "Speed",
  "ala.sustentacion": "What lifts",
  "ala.resistencia": "What slows",
  "ala.finura": "Lift over drag",
  "ala.peso": "Times the aeroplane's weight",
  "ala.dice.arriba":
    "Look at the blue: most of the force comes from the air on top, pulling up. And look at the air going down behind the wing.",
  "ala.dice.arrastra":
    "More angle lifts more… but it slows you down much more. That is why you do not fly nose-high.",
  "ala.dice.cerca": "Careful: a bit more angle and the air lets go.",
  "ala.dice.perdida":
    "The air came off the wing: look at the swirls, and how the blue is left only at the very front. That is the stall: lower the nose and it comes back.",
  "palabra.mudo": "No voice",
  "palabra.bien": "Good!",
  "palabra.tira": "Pull!",
  "palabra.gas": "Power",
  "palabra.subi": "Climb",
  "palabra.baja": "Down!",
  "palabra.frena": "Brake!",
  "palabra.toca": "Land!",
  "palabra.volve": "Try again!",
  "palabra.aterriza": "Land!",
  "palabra.alAire": "Go around!",
  "palabra.vuelta": "Orbit!",
  "palabra.laPista": "Runway?",
  "palabra.cuidado": "Careful!",
  "palabra.mira": "Look!",
  "tcas.hora": "at {hora} o'clock",
  "tcas.hora.1": "at one o'clock",
  "tcas.arriba": "Traffic {donde}, {cuanto} above",
  "tcas.abajo": "Traffic {donde}, {cuanto} below",
  "tcas.nivel": "Traffic {donde}, same level",
  "palabra.ra.sube": "Climb",
  "palabra.ra.baja": "Descend",
  "palabra.ra.nivela": "Level off",
  "palabra.ra.vigila": "Steady",
  "tcas.ra.sube": "Climb: {ritmo} or more, up to the green band",
  "tcas.ra.baja": "Descend: {ritmo} or more, down to the green band",
  "tcas.ra.nivela": "Level off: vertical speed needle to zero",
  "tcas.ra.vigila": "Keep it steady: vertical speed needle out of the red",
  "palabra.ra.subeMas": "Climb more",
  "palabra.ra.bajaMas": "Descend more",
  "palabra.ra.ahoraSube": "Now climb",
  "palabra.ra.ahoraBaja": "Now descend",
  "palabra.ra.mantiene": "Maintain",
  "tcas.ra.cruzaSube": "Climb, crossing its altitude: {ritmo} or more, up to the green band",
  "tcas.ra.cruzaBaja": "Descend, crossing its altitude: {ritmo} or more, down to the green band",
  "tcas.ra.mantiene": "Maintain the rate: vertical speed needle on the green band",
  "tcas.ra.mantieneCruzando":
    "Maintain the rate, crossing its altitude: vertical speed needle on the green band",
  "tcas.ra.subeMas": "Climb faster: {ritmo} or more, up to the green band",
  "tcas.ra.bajaMas": "Descend faster: {ritmo} or more, down to the green band",
  "tcas.ra.ahoraSube": "Now climb, right away: {ritmo} or more, up to the green band",
  "tcas.ra.ahoraBaja": "Now descend, right away: {ritmo} or more, down to the green band",
  "palabra.rapido": "Too fast",
  "palabra.fuera": "Off",
  "palabra.corto": "Short",
  "palabra.roto": "Broken",
  "vuelo.estacionado": "Start the engine",
  "vuelo.arrancando": "Release the brakes and roll slowly",
  "vuelo.rodando": "Follow the green line",
  "vuelo.esperando": "Stop completely and wait for the light",
  "vuelo.esperaQueAterrice": "We wait: a plane is coming in to land",
  "vuelo.esperaQueDespegue": "We wait: the plane on the runway goes first",
  "vuelo.esperaTurnoDeSalida": "We wait our turn: the plane that got here first goes first",
  "vuelo.esperaLaEstela": "We wait a little: the plane that just left leaves swirls in the air",
  "vuelo.autorizado": "Green light! Enter the runway",
  "vuelo.esperandoMirando": "Stop and look: the windsock, the animals and the runway",
  "vuelo.autorizadoSinTorre": "All clear: enter the runway",
  "vuelo.esperandoAfis":
    "Stop and listen: nobody clears you here. The radio tells you who is around, and you decide",
  "vuelo.autorizadoAfis": "The runway is free: enter when you are ready",
  "vuelo.backTaxi": "Backtrack to the far end, then turn around",
  "vuelo.remontar": "We'll taxi along the runway to the far end and turn around there",
  "vuelo.remontarUnTrecho":
    "We'll taxi back along the runway a little way and turn around: from there we have plenty to take off",
  "vuelo.desdeLaInterseccion":
    "We'll take off from here, without going to the end: the runway ahead is more than we need",
  "vuelo.backTaxiUnTrecho": "Taxi back to the drawn turn and turn around there",
  "vuelo.remontar.calor":
    "It's hot today and the plane needs more runway: we'll taxi along the runway to the far end and turn around there",
  "vuelo.remontar.cola":
    "The wind is from behind today and the plane needs more runway: we'll taxi along the runway to the far end and turn around there",
  "vuelo.remontarUnTrecho.calor":
    "It's hot today and the plane needs more runway: we'll taxi back along the runway a little way and turn around",
  "vuelo.remontarUnTrecho.cola":
    "The wind is from behind today and the plane needs more runway: we'll taxi back along the runway a little way and turn around",
  "vuelo.alineando": "Line up on the centreline",
  "vuelo.minimos": "Look at the runway: can you see it?",
  "vuelo.noEstabilizada": "Not like this: go around and try again",
  "motivo.sinPista": "The runway is not in sight",
  "motivo.lento": "Too slow",
  "motivo.cayendo": "Coming down too fast",
  "motivo.rapido": "Too fast",
  "motivo.torcido": "Not lined up",
  "motivo.descolocado": "Off the centreline",
  "motivo.alto": "Too high",
  "motivo.bajo": "Too low",
  "motivo.sinConfigurar": "Gear or flaps not set",
  "vuelo.proponeIrse": "This one isn't coming right. If you like, we go around and try again",
  "vuelo.proponeIrseSinPista": "The safe thing is to go around and try again",
  "vuelo.proponeIrseSalidaTapada":
    "There's a plane waiting to take off right where we'd leave the runway. If you like, we go around, let it go, and come back calmly",
  "vuelo.tomaLarga": "Not like this: we go around and try again",
  "vuelo.tomaLargaSinPista": "Not enough runway to stop: we go around and try again",
  "vuelo.aterrizasteContraLaOrden":
    "The tower had sent us around. When the tower says go around, you go: it sees what we can't see from here",
  "vuelo.rotar": "Pull up and fly",
  "vuelo.comprometido": "We're flying now — keep going",
  "vuelo.despegando": "Full power",
  "vuelo.alineadoGasAFondo": "You're lined up: full power",
  "vuelo.enVuelo": "Go for a fly",
  "vuelo.enVueloAterrizando": "Head for the runway",
  "vuelo.enVueloDestino": "Follow the arrow to the next airport",
  "vuelo.final": "Come down gently",
  "vuelo.terrenoBajo": "You are very low",
  "vuelo.terrenoSube": "Terrain. Pull up",
  "vuelo.terrenoDelante": "There is a mountain ahead, higher than us: climb",
  "vuelo.perdida": "Stall. Lower the nose",
  "vuelo.trafico.delante": "Look ahead: there's another plane nearby",
  "vuelo.trafico.izquierda": "Look to your left: there's another plane nearby",
  "vuelo.trafico.derecha": "Look to your right: there's another plane nearby",
  "vuelo.trafico.detras": "There's another plane nearby, behind you",
  "vuelo.ra.sube":
    "The box asks us to climb away from the other plane: climb gently, up to the green band.",
  "vuelo.ra.baja":
    "The box asks us to descend away from the other plane: descend gently, down to the green band.",
  "vuelo.ra.nivela":
    "The box asks us to stop climbing and descending: level off gently, with the needle on the green band.",
  "vuelo.ra.vigila":
    "The box says we're fine like this: keep going as you are, and keep the needle out of the red.",
  "vuelo.ra.cruzaSube":
    "The box asks us to climb through the other plane's altitude, and it will end up below us: climb gently, up to the green band.",
  "vuelo.ra.cruzaBaja":
    "The box asks us to descend through the other plane's altitude, and it will end up above us: descend gently, down to the green band.",
  "vuelo.ra.mantiene":
    "The box asks us to keep going as we are, without easing off: the needle on the green band.",
  "vuelo.ra.mantieneCruzando":
    "The box asks us to keep going as we are, without easing off: we'll pass through the other plane's altitude. The needle on the green band.",
  "vuelo.ra.subeMas":
    "The box asks us to climb faster: a little more nose up, up to the new green band.",
  "vuelo.ra.bajaMas":
    "The box asks us to descend faster: a little more nose down, down to the new green band.",
  "vuelo.ra.ahoraSube":
    "The box changed the order: now we need to climb. Climb now, gently, up to the green band.",
  "vuelo.ra.ahoraBaja":
    "The box changed the order: now we need to descend. Descend now, gently, down to the green band.",
  "vuelo.ra.libre": "It's over: the other plane is moving away. We gently go back to our altitude.",
  "vuelo.radio.otraFrecuencia":
    "We've left the airport's zone: another controller talks to us now, and we no longer hear the tower.",
  "vuelo.radio.otraVezLaTorre": "We're close now: we hear the tower again, and this airport's planes.",
  "vuelo.traficoArriba":
    "That diamond on the map is another plane. It's higher than us: it's no bother",
  "vuelo.traficoAbajo":
    "That diamond on the map is another plane. It's lower than us: it's no bother",
  "vuelo.traficoNivel":
    "That diamond on the map is another plane. It's at our height, but far away: we keep an eye on it",
  "vuelo.lucesDeNoche.deFrente":
    "Look at that plane: green light on your left, red on your right. That means it's coming towards us. That's what a plane's lights are for: to be seen in time.",
  "vuelo.lucesDeNoche.seAleja":
    "See that single white light? It's another plane's tail: it's moving away from us.",
  "vuelo.lucesDeNoche.cruzaIzquierda":
    "That plane is showing us its red light: we're seeing its left side, and it's passing towards your left.",
  "vuelo.lucesDeNoche.cruzaDerecha":
    "That plane is showing us its green light: we're seeing its right side, and it's passing towards your right.",
  "vuelo.lucesDeNoche.regla":
    "At night every plane carries the same lights: red on the left wingtip, green on the right and white at the back. Looking at them tells you where each one is going.",
  "vuelo.otroAvion.delante.arriba": "Ahead and higher there's another plane. Can you see it?",
  "vuelo.otroAvion.delante.nivel": "Ahead, at our height, there's another plane. Can you see it?",
  "vuelo.otroAvion.delante.abajo": "Ahead and lower there's another plane. Can you see it?",
  "vuelo.otroAvion.derecha.arriba": "Up on the right there's another plane. Can you see it?",
  "vuelo.otroAvion.derecha.nivel": "On the right, at our height, there's another plane. Can you see it?",
  "vuelo.otroAvion.derecha.abajo": "Down on the right there's another plane. Can you see it?",
  "vuelo.otroAvion.izquierda.arriba": "Up on the left there's another plane. Can you see it?",
  "vuelo.otroAvion.izquierda.nivel": "On the left, at our height, there's another plane. Can you see it?",
  "vuelo.otroAvion.izquierda.abajo": "Down on the left there's another plane. Can you see it?",
  "vuelo.otroAvion.detras.arriba": "Behind us and higher there's another plane. Nothing to do",
  "vuelo.otroAvion.detras.nivel": "Behind us, at our height, there's another plane. Nothing to do",
  "vuelo.otroAvion.detras.abajo": "Behind us and lower there's another plane. Nothing to do",
  "vuelo.aves.porQueSubir":
    "The tower says there are birds on final. If you see one head-on, climb a little: frightened birds dive downwards",
  "vuelo.aves.enUve":
    "Look, birds flying in a V! Each one rides the air rising beside the wingtip of the one ahead. Planes do the opposite: we keep clear of that swirl",
  "aves.enLaFinal": "Birds on final",
  "aves.deFrente": "Birds ahead: climb a little",
  "vuelo.bajasRapido": "Sink rate. Ease off",
  "vuelo.muyInclinado": "Bank angle. Level off",
  "vuelo.pilotoSuelto": "Autopilot disconnected",
  "vuelo.niveladaAsistida":
    "We reached the height in the window and the plane stays here by itself. Now power means speed: more power, faster.",
  "vuelo.gasesAutomaticos":
    "In this plane the autopilot also handles the engines: watch the lever move by itself to keep the speed of the pink mark.",
  "vuelo.gasesSueltos":
    "You moved the throttle: now the speed is yours. The autopilot still holds the height.",
  "vuelo.automaticoParaAterrizar":
    "We switch the autopilot off to land by hand. Follow the path, the way it was flying.",
  "vuelo.ventanillaFrustrada":
    "The autopilot is on the glide path now. In the window we set the go-around altitude, in case we have to climb: the path does the descending.",
  "vuelo.pilotoEnTierra": "The autopilot engages in the air",
  "vuelo.empezamosABajar": "Top of descent: we start down now, nice and easy",
  "comandante.nivelMasTranquilo":
    "Ladies and gentlemen, this is your captain. Because of the bumps we asked air traffic control for another level, and we've climbed for a smoother ride.",
  "comandante.bachesEnTodos":
    "Ladies and gentlemen, this is your captain. We checked other levels with air traffic control, but it's bumpy at all of them. That's normal: please keep your seat belts fastened.",
  "comandante.turbulencia.ligera":
    "Ladies and gentlemen, this is your captain. We're about to go through some light turbulence: a few gentle bumps, like a dirt road. It's perfectly normal, and the aircraft is built for it. The seatbelt sign is on: please return to your seat and fasten your seatbelt.",
  "comandante.turbulencia.moderada":
    "Ladies and gentlemen, this is your captain. There's moderate turbulence ahead, so it will get quite bumpy for a while. That's normal, and the aircraft is built for it. The cabin crew will be taking their seats too. Please return to your seat, fasten your seatbelt securely and put away anything on your tray table.",
  "comandante.turbulencia.fuerte":
    "Ladies and gentlemen, this is your captain. There's strong turbulence ahead. We'll go through it calmly: the aircraft is built for this and we know how to fly it. Please be seated now and fasten your seatbelt tightly. The cabin crew will be seated too. I'll let you know when we're through it.",
  "comandante.turbulencia.ahora.ligera":
    "Ladies and gentlemen, we're going through a little turbulence. It's the kind you can't see on the radar, called clear-air turbulence, and it's normal. The seatbelt sign is on: please return to your seat and fasten your seatbelt.",
  "comandante.turbulencia.ahora.moderada":
    "Ladies and gentlemen, this is your captain. We're going through some moderate turbulence that we couldn't see coming: it doesn't show on the radar. It's normal, and the aircraft is built for it. Please return to your seat and fasten your seatbelt securely. The cabin crew will be seated too.",
  "comandante.turbulencia.ahora.fuerte":
    "Ladies and gentlemen, this is your captain. We're going through strong turbulence. Stay calm: the aircraft is built for this. Please remain seated with your seatbelt tightly fastened. I'll let you know when we're through it.",
  "comandante.turbulencia.otraVez.ligera":
    "Ladies and gentlemen, we've got a little more turbulence coming, like before. You know the drill: back to your seat, seatbelt on, and we'll carry on smoothly.",
  "comandante.turbulencia.otraVez.moderada":
    "Ladies and gentlemen, more turbulence is coming, a bit bumpier this time. Same as before: everyone seated with seatbelts securely fastened. The cabin crew will be seated too.",
  "comandante.turbulencia.otraVez.fuerte":
    "Ladies and gentlemen, it's your captain again. A stretch of strong turbulence is coming. We'll go through it calmly, like the last one: please be seated now, with your seatbelt tightly fastened. I'll let you know when we're through it.",
  "comandante.turbulencia.tormenta":
    "Ladies and gentlemen, this is your captain. There are storms along our route today. The radar shows us where they are and we'll fly around them, but the air will be bumpy for most of the flight. The seatbelt sign will stay on: please remain seated with your seatbelt fastened.",
  "comandante.turbulencia.pirep":
    "Ladies and gentlemen, this is your captain. An aircraft ahead of us has let us know by radio that there's turbulence further on. Thanks to that report we can get ready: please return to your seat and fasten your seatbelt. Pilots look out for each other.",
  "comandante.turbulencia.paso":
    "Ladies and gentlemen, we're through it and it's smooth again. We're switching off the seatbelt sign: you're free to move about, but while you're seated, please keep it fastened.",
  "comandante.turbulencia.pasoBajando":
    "Ladies and gentlemen, we're through the turbulence. The seatbelt sign stays on because we've started our descent.",
  "comandante.cinturon.porque":
    "A tip from your captain: even when the seatbelt sign is off, keep your seatbelt loosely fastened while you're seated. Sometimes turbulence comes without warning, and your seatbelt is what keeps you safely in your seat.",

  /*
   * La bienvenida, siempre distinta, y lo que cuenta la comandante en un
   * crucero largo. La voz va grabada en castellano; esto es lo que se lee en
   * la tira. Ver `audio/bienvenidas.ts` y `audio/momentos-de-crucero.ts`.
   */
  "comandante.bienvenida.saludo.pasajeros.dias":
    "Good morning, ladies and gentlemen. This is Captain Jazlyn speaking.",
  "comandante.bienvenida.saludo.pasajeros.tardes":
    "Good afternoon, ladies and gentlemen. This is Captain Jazlyn speaking.",
  "comandante.bienvenida.saludo.pasajeros.noches":
    "Good evening, ladies and gentlemen. This is Captain Jazlyn speaking.",
  "comandante.bienvenida.saludo.cabina.dias":
    "A very good morning from the flight deck: this is Captain Jazlyn.",
  "comandante.bienvenida.saludo.cabina.tardes":
    "A very good afternoon from the flight deck: this is Captain Jazlyn.",
  "comandante.bienvenida.saludo.cabina.noches":
    "A very good evening from the flight deck: this is Captain Jazlyn.",
  "comandante.bienvenida.saludo.chicos.dias":
    "Ladies and gentlemen, and our youngest passengers: good morning! This is Captain Jazlyn speaking.",
  "comandante.bienvenida.saludo.chicos.tardes":
    "Ladies and gentlemen, and our youngest passengers: good afternoon! This is Captain Jazlyn speaking.",
  "comandante.bienvenida.saludo.chicos.noches":
    "Ladies and gentlemen, and our youngest passengers: good evening! This is Captain Jazlyn speaking.",
  "comandante.bienvenida.gracia.1":
    "Ladies and gentlemen, this is Captain Jazlyn, speaking from the office with the best view on the whole plane.",
  "comandante.bienvenida.gracia.2":
    "Ladies and gentlemen, hello: this is Captain Jazlyn. We've checked everything, the plane is ready, and so am I.",
  "comandante.bienvenida.gracia.3":
    "Ladies and gentlemen, this is Captain Jazlyn. I have the best job in the world, and today it's flying all of you.",
  "comandante.bienvenida.a.local":
    "Welcome aboard. Today we're taking a trip around the area and coming right back here.",
  "comandante.bienvenida.a.pettirossi": "Welcome aboard this flight to Asunción.",
  "comandante.bienvenida.a.guarani": "Welcome aboard this flight to Ciudad del Este.",
  "comandante.bienvenida.a.encarnacion": "Welcome aboard this flight to Encarnación.",
  "comandante.bienvenida.a.concepcion": "Welcome aboard this flight to Concepción.",
  "comandante.bienvenida.a.pedro-juan": "Welcome aboard this flight to Pedro Juan Caballero.",
  "comandante.bienvenida.a.estigarribia": "Welcome aboard this flight to Mariscal Estigarribia.",
  "comandante.bienvenida.a.ayolas": "Welcome aboard this flight to Ayolas.",
  "comandante.bienvenida.a.pilar": "Welcome aboard this flight to Pilar.",
  "comandante.bienvenida.a.yvytu-rape":
    "Welcome aboard this flight to Yvytu Rape, the Granja Óga airstrip.",
  "comandante.bienvenida.a.tenerife-norte": "Welcome aboard this flight to Tenerife North.",
  "comandante.bienvenida.a.tenerife-sur": "Welcome aboard this flight to Tenerife South.",
  "comandante.bienvenida.a.gran-canaria": "Welcome aboard this flight to Gran Canaria.",
  "comandante.bienvenida.a.lanzarote": "Welcome aboard this flight to Lanzarote.",
  "comandante.bienvenida.a.fuerteventura": "Welcome aboard this flight to Fuerteventura.",
  "comandante.bienvenida.a.la-palma": "Welcome aboard this flight to La Palma.",
  "comandante.bienvenida.a.el-hierro": "Welcome aboard this flight to El Hierro.",
  "comandante.bienvenida.a.la-gomera": "Welcome aboard this flight to La Gomera.",
  "comandante.bienvenida.detalle.local":
    "Welcome aboard. We're not going far today: a trip around to see everything from above, and then right back here.",
  "comandante.bienvenida.detalle.pettirossi":
    "Welcome aboard: today we're flying you to Asunción, the capital, on the banks of the Paraguay River.",
  "comandante.bienvenida.detalle.guarani":
    "Welcome aboard: today we're flying you to Ciudad del Este, the second-largest city in the country.",
  "comandante.bienvenida.detalle.encarnacion":
    "Welcome aboard: today we're flying you to Encarnación, the capital of Itapúa, on the banks of the Paraná.",
  "comandante.bienvenida.detalle.concepcion":
    "Welcome aboard: today we're flying you north, to Concepción, on the banks of the Paraguay River.",
  "comandante.bienvenida.detalle.pedro-juan":
    "Welcome aboard: today we're flying you to Pedro Juan Caballero, right on the border with Brazil.",
  "comandante.bienvenida.detalle.estigarribia":
    "Welcome aboard: today we're flying you to Mariscal Estigarribia, in the heart of the Chaco.",
  "comandante.bienvenida.detalle.ayolas":
    "Welcome aboard: today we're flying you to Ayolas, next to the Yacyretá dam.",
  "comandante.bienvenida.detalle.pilar":
    "Welcome aboard: today we're flying you to Pilar, in Ñeembucú, the land of wetlands.",
  "comandante.bienvenida.detalle.yvytu-rape":
    "Welcome aboard: today we're flying you to Yvytu Rape, the Granja Óga grass airstrip.",
  "comandante.bienvenida.detalle.tenerife-norte":
    "Welcome aboard: today we're flying you to Tenerife North, in La Laguna.",
  "comandante.bienvenida.detalle.tenerife-sur":
    "Welcome aboard: today we're flying you to Tenerife South, on the island of Mount Teide.",
  "comandante.bienvenida.detalle.gran-canaria":
    "Welcome aboard: today we're flying you to Gran Canaria, an almost round island with its summit in the middle.",
  "comandante.bienvenida.detalle.lanzarote":
    "Welcome aboard: today we're flying you to Lanzarote, the island of volcanoes.",
  "comandante.bienvenida.detalle.fuerteventura":
    "Welcome aboard: today we're flying you to Fuerteventura, the island closest to Africa.",
  "comandante.bienvenida.detalle.la-palma":
    "Welcome aboard: today we're flying you to La Palma, the island of telescopes.",
  "comandante.bienvenida.detalle.el-hierro":
    "Welcome aboard: today we're flying you to El Hierro, the westernmost island of Spain.",
  "comandante.bienvenida.detalle.la-gomera":
    "Welcome aboard: today we're flying you to La Gomera, the island where people talk by whistling.",
  "comandante.bienvenida.cierre.disfruten": "Sit back, get comfortable and enjoy the flight.",
  "comandante.bienvenida.cierre.gracias":
    "Thank you for flying with us, and have a lovely trip.",
  "comandante.bienvenida.cierre.acomodense": "Make yourselves comfortable: we'll be on our way shortly.",
  "comandante.mitad.camino":
    "Ladies and gentlemen, this is your captain again: we're now halfway there.",
  "comandante.mitad.viaje":
    "Ladies and gentlemen, this is your captain with a quick update: we're past the halfway point of our trip.",
  "comandante.mitad.parte": "Here's the latest weather report from our destination.",
  "comandante.chicos.primeraVez":
    "Ladies and gentlemen, this is your captain. A special hello to anyone flying for the very first time today: that feeling in your tummy when the plane goes up or down is perfectly normal, and we all felt it our first time.",
  "comandante.chicos.tripulacion":
    "Ladies and gentlemen, this is your captain. A big hello to all the kids travelling with us today: you're now part of the crew, and your job is to keep an eye on the sky through the window.",
  "comandante.chicos.aterrizar":
    "Ladies and gentlemen, this is your captain. A hello to our youngest passengers and to anyone on a plane for the first time: welcome to the sky. When we come down, look out of the window and watch everything grow big again.",
  "comandante.curiosidad.alas":
    "Ladies and gentlemen, something for those of you by the window: if you look at the wing, you'll see it bent slightly upwards. That's the air holding us up, pushing on it. It's made to do that, so don't worry.",
  "comandante.curiosidad.rayas":
    "Ladies and gentlemen, a fun fact from your captain: the white lines some planes leave in the sky are clouds. The water vapour coming out of the engines freezes in the cold, and stays drawn up there.",
  "comandante.curiosidad.ventanilla":
    "Ladies and gentlemen, a secret about the windows: many have a tiny hole near the bottom. It's not a fault: it lets the outer pane take all the pressure, and keeps the inner one from fogging up.",
  "comandante.curiosidad.ingles":
    "Ladies and gentlemen, a fun fact from your captain: English is the language of aviation. A pilot from any country can speak English with the tower at any international airport, and they understand each other.",
  "comandante.curiosidad.llave":
    "Ladies and gentlemen, a secret from the flight deck: planes don't have a key to start them, like cars do. They're started with switches, following a checklist, step by step.",
  "comandante.curiosidad.viento":
    "Ladies and gentlemen, did you know that planes take off and land into the wind? With the wind on the nose, the plane needs less speed over the ground before the air lifts it, so it needs less runway.",
  "vuelo.alturaDeLaTorre":
    "The tower gave us how high to climb. I set it in the altitude window, in magenta: we climb up to there and stay.",
  "vuelo.alturaDeLaTorreRaya":
    "The tower tells us how high to climb: up to the line on the altitude.",
  "vuelo.otraAlturaDeLaTorre": "The tower lets us climb a bit more. The new altitude is already set.",
  "vuelo.tonoDeAltitudCerca":
    "That tone means we're nearly at the ALT window altitude. That's where we level off.",
  "vuelo.tonoDeAltitudFuera":
    "That tone means we've drifted off the ALT window altitude. Ease back to it, gently.",
  "vuelo.masAltoQueElPlan":
    "We're higher than the plan: there's more to come down, so we'll start down earlier.",
  "palabra.aBajar": "Descend",
  "vuelo.mandanFrustrar": "Runway occupied: go around and rejoin the circuit",
  "vuelo.vueltaPorTuSalida":
    "The tower asks us for a full turn: a plane is waiting to take off right where we'll leave the runway. We go round, it takes off, and we come back.",
  "vuelo.vueltaHecha": "Full turn done. Now we head back to the runway.",
  "vuelo.alAirePorTuSalida":
    "A plane is waiting to take off right where we'd leave the runway. We climb, it takes off, and we come back round the circuit.",
  "vuelo.permisoAnulado":
    "The tower had cleared us to land, but a plane got onto the runway. With the runway occupied we don't land: we climb and come back round the circuit.",
  "hud.cotaDeLaPista":
    "The runway we're heading to is {cota} above sea level: what the altimeter reads minus that is how high you are above it",
  "vuelo.cotaDeLaPista":
    "Look at the chart: next to the runway it says how high it is above the sea. What the altimeter reads minus that is how high we are above the runway, and that's what the minimums are set from",
  "vuelo.sinPermisoEnLosMinimos":
    "The tower didn't clear you to land. No clearance, no landing: go around and rejoin the circuit",
  "percance.ocupada": "The runway was occupied and you were told to go around",
  "vuelo.puedeVolver": "Cleared to try again",
  "vuelo.puedeAterrizar": "The tower clears you to land",
  "vuelo.puedeVolverSinTorre": "The runway is clear again: try again",
  "vuelo.puedeAterrizarSinTorre": "Now it's fine: you can land",
  "vuelo.puedeAterrizarAfis": "The runway is free: if you're set up, land",
  "vuelo.frustrada": "Well done! You went around. Try again",
  "vuelo.aroAlto": "You are high for the runway. Come down a little",
  "vuelo.aroBajo": "You are low for the runway. Climb a little",
  "vuelo.corregido": "That is it! Right on the glide path now",
  "circuito.subida": "Climb straight ahead",
  "circuito.cruzado": "Turn left onto crosswind: we are going back to land",
  "circuito.encola": "Downwind: fly beside the runway, keeping it on your left",
  "circuito.cruzado.derecha": "Turn right onto crosswind: we are going back to land",
  "circuito.encola.derecha": "Downwind: fly beside the runway, keeping it on your right",
  "circuito.base": "Turn base and start down: we are landing now",
  "vuelo.papiAlto": "Whites: you are high, come down",
  "vuelo.lentoYBajo": "You are slow: add power",
  "vuelo.papiBajo": "Reds: you are low, climb",
  "vuelo.papiBien": "Two red, two white: on the glide path",
  "vuelo.consejo.masGas":
    "A little more power, up to the pink mark on the speed. Keep the nose still.",
  "vuelo.consejo.menosGas": "A little less power, down to the pink mark on the speed.",
  "vuelo.consejo.narizAbajoPapi":
    "Nose a little down, until you see two white and two red on the four lights beside the runway.",
  "vuelo.consejo.narizArribaPapi":
    "Nose a little up, until you see two white and two red on the four lights beside the runway.",
  "vuelo.consejo.narizAbajoSenda":
    "Nose a little down, until the pink diamond, the one next to the altitude, is in the middle.",
  "vuelo.consejo.narizArribaSenda":
    "Nose a little up, until the pink diamond, the one next to the altitude, is in the middle.",
  "vuelo.consejo.narizArribaRitmo":
    "Nose a little up: we come down softer, to the pink mark on the vertical speed.",
  "vuelo.consejo.narizArribaSuave": "Nose a little up, to come down softer.",
  "vuelo.consejo.aerofrenos": "A little speed brake, down to the pink mark on the speed.",
  "vuelo.consejo.aerofrenos.sinVer": "A little speed brake, to slow down.",
  "vuelo.consejo.nivelarPerfil":
    "We're a little below the profile: come down softer, or level off a moment, until the pink diamond, the one next to the altitude, reaches the middle.",
  "vuelo.consejo.nivelarPerfil.sinVer":
    "We're a little below the profile: come down softer, or level off a moment.",
  "vuelo.consejo.narizAbajoPerfil":
    "We're above the profile: nose a little down, until the pink diamond, the one next to the altitude, reaches the middle.",
  "vuelo.consejo.aerofrenosPerfil":
    "We're above the profile and the plane is already coming down as fast as it can: speed brakes out, until the pink diamond, the one next to the altitude, reaches the middle.",
  "vuelo.consejo.aerofrenosPerfil.sinVer":
    "We're above the profile and the plane is already coming down as fast as it can: speed brakes out.",
  "vuelo.consejo.masGasPerfil":
    "We're a little below the profile: a touch of power, to come down softer, until the pink diamond, the one next to the altitude, reaches the middle.",
  "vuelo.consejo.masGasPerfil.sinVer":
    "We're a little below the profile: a touch of power, to come down softer.",
  "vuelo.consejo.menosGasPerfil":
    "We're above the profile: a little less power, to come down more, until the pink diamond, the one next to the altitude, reaches the middle.",
  "vuelo.consejo.menosGasPerfil.sinVer":
    "We're above the profile: a little less power, to come down more.",
  "vuelo.consejo.masGasPapi":
    "A little low for the runway: a touch of power, nose still, until you see two white and two red on the four lights beside the runway.",
  "vuelo.consejo.masGasSenda":
    "A little low: a touch of power, nose still, until the pink diamond, the one next to the altitude, is in the middle.",
  "vuelo.consejo.masGasSenda.sinVer": "A little low: a touch of power, nose still.",
  "vuelo.consejo.menosGasPapi":
    "A little high for the runway: a little less power, nose still, until you see two white and two red on the four lights beside the runway.",
  "vuelo.consejo.menosGasSenda":
    "A little high: a little less power, nose still, until the pink diamond, the one next to the altitude, is in the middle.",
  "vuelo.consejo.menosGasSenda.sinVer": "A little high: a little less power, nose still.",
  "vuelo.consejo.masGasSuave":
    "We're coming down too steeply: a touch of power, to come down softer.",
  "vuelo.consejo.narizAbajoMarca":
    "We're slow: nose a touch down, up to the pink mark on the speed.",
  "vuelo.consejo.narizArribaMarca":
    "We're fast: nose a touch up, down to the pink mark on the speed.",
  "vuelo.consejo.narizArribaMarca.sinVer": "We're fast: nose a touch up.",
  "palabra.masGas": "More power",
  "palabra.menosGas": "Less power",
  "palabra.narizArriba": "Nose up",
  "palabra.narizAbajo": "Nose down",
  "vuelo.paso.subir": "We climb up to the height line, at the speed of the pink mark.",
  "vuelo.paso.subir.sinVer": "Now we climb up to our height.",
  "vuelo.paso.acelerarGas": "Now we can go faster: more power, up to the pink mark on the speed.",
  "vuelo.paso.acelerarGas.sinVer": "Now we can go faster: more power.",
  "vuelo.paso.acelerarNariz":
    "Now we can go faster: nose a little down, up to the pink mark on the speed.",
  "vuelo.paso.acelerarNariz.sinVer": "Now we can go faster: nose a little down.",
  "vuelo.paso.frenarGas": "Now we slow down: less power, down to the pink mark on the speed.",
  "vuelo.paso.frenarAerofrenos":
    "Now we slow down: a little speed brake, down to the pink mark on the speed.",
  "vuelo.paso.frenarAerofrenos.sinVer": "Now we slow down: a little speed brake.",
  "vuelo.paso.frenarNariz":
    "Now we slow down: nose a little up, which slows us, down to the pink mark on the speed.",
  "vuelo.paso.frenarNariz.sinVer": "Now we slow down: nose a little up, which slows us.",
  "vuelo.paso.mantener":
    "The pink mark on the speed moved, and we're right there already: we keep it like this.",
  "vuelo.paso.marcaDelAutomatico":
    "The pink mark on the speed moved: the autopilot takes the engines there. Watch the lever move.",
  "vuelo.paso.marcaDelAutomatico.sinVer":
    "Our speed changed: the autopilot handles the engines by itself. Watch the lever move.",
  "vuelo.paso.crucero":
    "We're up: cruise power, to the mark on the engine. That takes us to the speed of the pink mark.",
  "vuelo.paso.crucero.sinVer": "We're up: cruise power, to the mark on the engine.",
  "vuelo.paso.cruceroConAutomatico":
    "We're up: cruise power, to the mark on the engine. And if you like, switch on the autopilot: it's the button that's pulsing.",
  "vuelo.paso.cruceroConGases":
    "We're up. The autopilot sets cruise power: watch the lever go by itself to the engine mark.",
  "vuelo.paso.bajar": "We start down: less power, and we come down gently to the height line.",
  "vuelo.paso.bajarConAutomatico":
    "We start down. The autopilot follows the path down to the height line: you check the speed stays on the pink mark.",
  "vuelo.paso.nivelar":
    "We've reached the height line: we stay here, level, until the glide path comes to meet us.",
  "vuelo.paso.nivelar.sinVer":
    "We're at our height: we stay here, level, until the glide path comes to meet us.",
  "vuelo.paso.flaps1": "First flaps, one notch, and to the pink mark on the speed.",
  "vuelo.paso.flaps2": "Another notch of flaps, and to the pink mark on the speed.",
  "vuelo.paso.flaps3": "Landing flaps, all the way down, and to the pink mark on the speed.",
  "vuelo.paso.tren": "Gear down: we're about to land.",
  "vuelo.paso.recogerAerofrenos": "We're at the pink mark on the speed: speed brakes in.",
  "vuelo.paso.recogerAerofrenos.sinVer": "We're at the right speed: speed brakes in.",
  "vuelo.paso.senda": "We're on final: nose along the glide path, and the speed on the pink mark.",
  "vuelo.paso.senda.sinVer": "We're on final: nose along the glide path.",
  "vuelo.paso.sendaConGases":
    "We're on final. The plane holds the power, for the pink mark on the speed: you fly the nose along the glide path.",
  "vuelo.paso.sendaConGases.sinVer":
    "We're on final. The plane holds the power: you fly the nose along the glide path.",
  "vuelo.paso.sendaConAyuda":
    "We're on final. I'll hold the power, for the pink mark on the speed: you fly the nose along the glide path.",
  "vuelo.paso.sendaConAyuda.sinVer":
    "We're on final. I'll hold the power: you fly the nose along the glide path.",
  "vuelo.paso.gasTuyo": "You moved the throttle: now the speed is yours, to the pink mark.",
  "vuelo.paso.gasTuyo.sinVer": "You moved the throttle: now the speed is yours.",
  "vuelo.paso.velocidad": "That's {n} kilometres per hour.",
  "palabra.crucero": "Cruise",
  "palabra.nivela": "Level off",
  "palabra.laSenda": "Glide path",
  "vuelo.paso.cotaAlMar":
    "The runway we're going to is almost at sea level: what the altimeter shows is nearly all we still have to come down.",
  "vuelo.paso.cotaEnAlto":
    "The runway we're going to is higher than the sea: what we still have to come down is what the altimeter shows minus the runway's number, the one under the altitude.",
  "palabra.pista": "Runway",
  "palabra.asi": "Steady",
  "palabra.aerofrenosAdentro": "Speed brakes in",
  "hud.gasDelAvion": "The plane holds the power",
  "hud.gasDeLaAyuda": "The instructor holds the power",
  "vuelo.bulto": "No way through: there is a building",
  "pausa.titulo": "The flight is paused",
  "pausa.seguir": "Keep flying",
  "pausa.reiniciar": "Start again",
  "pausa.hangar": "Back to the hangar",
  "hud.pausa": "Pause the game",
  "hud.camara": "Change view",
  "hud.gafas": "Sunglasses",
  "hud.gira": "Turn your screen sideways",
  "hud.bajarCuadro": "Lower the panel",
  "hud.armaAerofrenos": "Arm the speed brakes and autobrake",
  "hud.aerofrenosArmados": "Speed brakes and autobrake armed: I did it",
  "hud.pilotoAutomatico": "Autopilot",
  "hud.trimArriba": "Trim, nose up",
  "hud.trimAbajo": "Trim, nose down",
  "version.nueva": "A new version is ready",
  "avion.noCabeAqui": "No other aircraft fits on this runway",
  "avion.cambiarParado": "Stop on the ground to change aircraft",
  "hud.mandarCinturon": "Seatbelt sign",
  "hud.subirCuadro": "Raise the panel",
  "hud.telGrande": "Show the screen big",
  "hud.altBajar": "Lower the selected altitude",
  "hud.altSubir": "Raise the selected altitude",
  "hud.volumen": "Volume",
  "hud.menu": "More buttons",
  "hud.pantallaCompleta": "Full screen",
  "hud.salirPantallaCompleta": "Exit full screen",
  "inicio.pasos": "To play full screen: tap Share, then “Add to Home Screen”.",
  "inicio.cerrar": "Close",
  "ajustes.inicio":
    "On iPhone, the game runs full screen when opened from its icon: in Safari tap Share (or “•••”, then Share), choose “Add to Home Screen” and open it from there.",
  "gafas.ganadas": "Your sunglasses!",
  "gafas.puestas": "Sunglasses on",
  "gafas.quitadas": "Sunglasses off",
  "fin.horas": "Your flying time",
  "fin.llegaste": "You made it! You are home",
  "fin.bien": "Good flight!",
  "fin.muyBien": "Great flight!",
  "fin.otra": "Fly again",
  "fin.redondo": "A perfect flight. It does not get better",
  "vuelo.aterrizado": "Brake",
  "vuelo.abandonando": "Vacate the runway, someone is behind you",
  "vuelo.abandonandoSinPrisa": "No rush: vacate the runway and head home",
  "vuelo.abandonandoConLaBici":
    "No rush: vacate the runway and follow Jazlyn, who came to meet you on her bike",
  "vuelo.abandonandoSinTorre": "No rush: vacate the runway and taxi to the apron",
  "vuelo.pistaLibre": "Runway clear! Well done",
  "vuelo.aPlataforma": "Head back to your stand",
  "vuelo.enPuesto": "You made it. Shut the engine down",
  "vuelo.cortaMotores": "That's the cut-engines signal: shut the engine down",
  "vuelo.apagado": "Flight complete!",
  "vuelo.fuera": "Back to the green line",
  "vuelo.roto": "We have a problem",
  "vuelo.rapido": "Too fast",
  "vuelo.sobrevelocidad": "Too fast: ease the power",
  "vuelo.sobrevelocidadAire": "Too fast for this altitude",
  "vuelo.trenPasado": "Too fast with the gear down: raise it",
  "vuelo.flapsPasados": "Too fast with flaps out: retract them",
  "vuelo.pediFlaps": "Flaps down to slow",
  "vuelo.alivioDeFlaps":
    "The flaps went up one notch on their own: the aircraft protects them because we're fast. Slow down and they come back.",
  "vuelo.flapsTocados":
    "We went too fast with the flaps and they're damaged: they won't go past the first notch. The mechanic will check them on the ground.",
  "vuelo.flapsEnLaCarrera":
    "Flaps are better once off the runway: during the roll you could hit the gear lever by mistake.",
  "vuelo.flapsArribaAlSalir": "We're off the runway: now raise the flaps.",
  "vuelo.despuesDelAterrizaje":
    "After landing checklist: flaps up is yours; lights and transponder, I've got them.",
  "vuelo.alPuestoConFlaps":
    "We reached the stand with the flaps out. No problem: next time, raise them after leaving the runway.",
  "vuelo.despues.aerofrenos": "Speed brakes in: lever down.",
  "vuelo.despues.luces": "I'll do the lights: landing lights off, taxi light on.",
  "vuelo.despues.transpondedor": "And the transponder: TCAS to standby.",
  "palabra.luces": "Lights",
  "palabra.transpondedor": "Transponder",
  "palabra.flaps": "Flaps",
  "vuelo.meteElTren": "Gear up — it is slowing you down",
  "vuelo.armaLosAerofrenos":
    "Before landing, arm the speed brakes and autobrake: they come out by themselves when we touch down",
  "vuelo.losArmeYo": "I armed the speed brakes and autobrake, so we brake well when we touch down",
  "vuelo.salenLosFrenosDeTierra":
    "See that? The panels on the wing came up when we touched down: the wing stops holding the plane up and the wheels can brake",
  "vuelo.sinFrenosDeTierra":
    "The speed brakes didn't come out because they weren't armed: brake gently, the wheels carry almost no weight at first",
  "vuelo.quitaLaReversa": "We're slow now: stow the reversers",
  "vuelo.autofrenoSuelto": "You pressed the brakes: the autobrake let go, now you're braking",
  "vuelo.tormenta": "Storm ahead: go around it, don't fly through",
  "palabra.tormenta": "Storm",
  "vuelo.baches":
    "It's getting bumpy: that's the air, like waves on water. The plane is built for this. Keep flying, calmly.",
  "vuelo.pirep":
    "Did you hear the radio? Another plane reported bumpy air ahead. Planes help each other out: that way the captain can warn everyone in advance.",
  "vuelo.reserva":
    "Into reserve fuel. Stay calm: we are going to the nearest airport, follow the arrow",
  "vuelo.reservaAqui": "We're into the reserve, but we have plenty to get there: we land here.",
  "vuelo.reservaMinimo":
    "We're getting short, so we tell the tower: minimum fuel. It's not an emergency: it tells them we can't wait.",
  "palabra.reserva": "Fuel",
  "vuelo.sinCombustible": "Out of fuel: glide to the runway",
  "palabra.sinCombustible": "No fuel",
  "vuelo.sinMotor":
    "We have no engine: nose down, hold this speed and head for that runway",
  "palabra.planea": "Glide",
  "vuelo.planeoLento": "We are slow: lower the nose a little",
  "vuelo.planeoRapido": "We are fast: raise the nose a little, it takes us further",
  "vuelo.aire.frio":
    "It is zero degrees outside now. Every thousand metres we climb, about six and a half degrees colder: up high it is around fifty below zero.",
  "palabra.frio": "Cold",
  "vuelo.aire.crucero":
    "We are at cruise now. Up here the air is thin: the plane has less drag and burns less fuel. That is why planes fly so high.",
  "vuelo.aire.cruceroConCifras":
    "Look at the speed: the gauge shows less than we are really doing, because up here the air is thin. And thinner air means less drag and less fuel: that is why planes fly so high.",
  "vuelo.aire.bolsa":
    "The cabin climbs too, but slowly: it is now at about one thousand five hundred metres, even though the plane is much higher. That is why a bag of chips sealed on the ground puffs up here.",
  "vuelo.aire.oidos":
    "We are starting down, and the cabin comes down too. If your ears feel blocked, swallow or yawn and they will pop. And a bottle closed up high arrives squashed on the ground.",
  "vuelo.cabinaSinPresion":
    "The cabin has lost pressure. Calmly: mask first, and we go down quickly to where we can breathe. Throttle to idle, speed brakes out and nose down.",
  "vuelo.cabinaSinPresionConTren":
    "The cabin has lost pressure. Calmly: mask first, and we go down quickly to where we can breathe. Throttle to idle, gear down and nose down.",
  "palabra.mascara": "Mask",
  "palabra.descensoDeEmergencia": "Emergency descent",
  "vuelo.primeroLaTuya.segundos":
    "The masks have dropped. Yours first, because at this altitude, without oxygen, you have only seconds to think clearly: half a minute or less. With yours on, you can help others.",
  "vuelo.primeroLaTuya.minuto":
    "The masks have dropped. Yours first, because at this altitude, without oxygen, you have about a minute to think clearly. With yours on, you can help others.",
  "vuelo.primeroLaTuya.minutos":
    "The masks have dropped. Yours first, because at this altitude, without oxygen, you have only a few minutes to think clearly. With yours on, you can help others.",
  "vuelo.yaSeRespira":
    "Well done: we can breathe here. We level off and head to the nearest airport, calmly. That is how real pilots practise it.",
  "palabra.yaSeRespira": "Breathable",
  "hangar.ejercicio.despresurizacion": "Cabin depressurization",
  "vuelo.laOtraPunta":
    "That is not the runway in use: today the wind says land from the other end",
  "palabra.otraPunta": "Other end",
  "vuelo.calor": "It's hot: we'll need more runway to take off",
  "calor.tarjeta": "It's hot, {grados} °C: taking off needs {mas} % more runway",
  "calor.tarjetaCabina":
    "{grados} °C, density altitude {pies} ft: {mas} % longer takeoff run",
  "vuelo.salidaSiguiente":
    "You missed the exit. No problem: keep rolling to the next one",
  "palabra.salidaSiguiente": "Next one",
  "vuelo.dasPaso":
    "We stop here: another plane is coming the other way down that taxiway, and only one goes through at a time. We let it pass and carry on",
  "vuelo.nuestroAvion": "Our plane is {indicativo}. That is what the tower calls us",
  "vuelo.alAireOtraPunta": "Not from that end: go around and come back to the other one",
  "vuelo.alAireVientoDeCola":
    "With a tailwind you will not stop in time: go around and come back to the other end",
  "vuelo.sacaElTren": "Gear down",
  "vuelo.trenEnElSuelo": "On the ground, the gear stays down",
  "palabra.tren": "Gear",
  "palabra.aerofrenos": "Speed brakes",
  "vuelo.despacio": "Slow down",
  "vuelo.alto": "Stop here",
  "senalero.alto": "Wands crossed overhead: that means stop",
  "senalero.frenos": "Hand up, fist closed: set the parking brake",
  "senalero.calzos": "Wands together overhead: the chocks are in",
  "vuelo.teLoPasaste": "You went past. Brake and come back",
  "vuelo.yaPodesTocar": "You can touch down now",
  "vuelo.quitaElGas": "Throttle to idle",
  "vuelo.narizEnLaRecogida": "A little nose up",
  "vuelo.narizYQuitaElGas": "A little nose up, and throttle to idle",
  "palabra.narizYSinGas": "Nose up, idle",
  "palabra.sinGas": "Idle",
  "percance.coche": "You ran over the follow-me car",
  "percance.edificio": "You hit a building",
  "percance.fuera": "You touched down off the runway",
  "percance.golpe": "That landing was a thump",
  "percance.pasada": "You ran off the end of the runway",
  "percance.sinpermiso": "You entered the runway without clearance",
  "percance.sintren": "You touched down with the gear up",
  "grado.aprendiz": "Student",
  "grado.piloto": "Pilot",
  "grado.comandante": "Captain",
  "grado.instructora": "Instructor",
  "cuaderno.title": "My logbook",
  "cuaderno.horas": "hours",
  "cuaderno.despegues": "take-offs",
  "cuaderno.aterrizajes": "landings",
  "cuaderno.frustradas": "go-arounds",
  "cuaderno.aerodromos": "airfields",
  "cuaderno.falta": "For {grado} you still need:",
  "cuaderno.completo": "That is all of them. Keep flying",
  "cuaderno.vuelos": "Your flights",
  "cuaderno.sellos": "Where you've been",
  "cuaderno.album": "Your stamps",
  "cuaderno.grados": "The ranks",
  "cuaderno.queEs": "What is this?",
  "cuaderno.sinInstructora": "Fly without the instructor",
  "cuaderno.sinInstructoraPuesta":
    "You fly without the instructor because you know how to look after yourself.",
  "cuaderno.sinInstructoraQuitada": "The instructor flies with you.",
  "cuaderno.sinInstructoraFalta": "To fly without the instructor you still need:",
  "sinInstructora.si": "Yes, without the instructor",
  "sinInstructora.no": "No, with the instructor",
  "vuelo.sinInstructora.pregunta": "Today you're flying without me. Is that how you want it?",
  "vuelo.sinInstructora.si": "Off you go. If there's any danger, I'll tell you.",
  "vuelo.sinInstructora.no": "All right: I'll fly with you today.",
  "vuelo.sinPermiso":
    "You went in without the green light. Wait for it next time",

  "hangar.pais.py": "Paraguay",
  "hangar.pais.es": "Spain",
  "hangar.pais.inventado": "Made up",
  "hangar.tramos": "Learning to fly",
  "hangar.misiones": "Going somewhere",
  "hangar.donde": "Where do you take off from?",
  "hangar.adonde": "Where are you going?",
  "hangar.vuelta": "Local flight",
  "hangar.combustible": "Fuel",
  "hangar.nocabe.corta": "the runway is too short for this aeroplane",
  "hangar.nocabe.estrecha": "the runway is too narrow for its wings",
  "hangar.nocabe.no-da-la-vuelta": "it cannot turn around on this runway",
  "hangar.nocabe.bomberos": "this airport's fire crew can't cover this aeroplane",
  "hangar.nocabe.largo": "needs {pide} m, has {hay} m",
  "hangar.nocabe.ancho": "needs {pide} m wide, has {hay} m",
  "hangar.nocabe.categoria": "category {hay} · needs {pide}",
  "hangar.nocabe.con": "Tap to fly there in the {avion}",
  "hangar.conque": "What are you flying?",
  "hangar.como": "Which pilot are you?",
  "hangar.despegar": "Take off!",
  "pie.hecho": "Made in Capiibary, Paraguay.",
  "pie.oksigenia": "Built by Oksigenia",
  "pie.codigo": "Source code",
  "pie.promesa": "No accounts, no permissions: open it and fly.",
  "hangar.volver": "Pick another place",
  "mapa.title": "See the map",
  "mapa.cerca": "Zoom in",
  "mapa.lejos": "Zoom out",
  "tiempo.title": "Weather",
  "tiempo.hora": "Time of day",
  "tiempo.viento": "Where the wind comes from and how hard",
  "tiempo.calma": "No wind",
  "tiempo.real": "Live weather",
  "tiempo.nubes": "Clouds",
  "mundo.label": "How the world looks",
  "mundo.foto": "The real world, in photos",
  "mundo.dibujado": "The drawn world",
  "tiempo.despejado": "Clear sky",
  "tiempo.algunas": "A few clouds",
  "tiempo.cubierto": "Overcast",
  "hangar.aque": "What are you playing?",
  "hangar.seguimos": "Carry on where you left off?",
  "hangar.ajustes": "Settings",
  "hangar.atras": "Back",
  "hangar.proximamente": "Coming soon",
  "hangar.reposo": "If nobody plays, it comes back here",
  "leccion.vuelta": "Go for a ride",
  "leccion.rodaje": "Taxi",
  "leccion.despegue": "Take off",
  "leccion.aterrizaje": "Land",

  "hangar.emergencias": "Emergency practice",
  "hangar.ejercicio.planeo": "Glide with no engine",
  "hangar.ejercicio.antes-de-v1": "Engine before V1",
  "hangar.ejercicio.despues-de-v1": "Engine after V1",
  "hangar.ejercicio.un-motor": "Fly on one engine",
  "hangar.ejercicio.simulador": "Simulator session",
  "hangar.ejercicio.tormenta": "Go around a storm",
  "ejercicio.planeo.antes":
    "Today we practise gliding. In a little while the engine will stop, on purpose: we lower the nose, hold the speed and glide to the runway",
  "ejercicio.antes-de-v1.antes":
    "Today we practise a take-off that stops. Before V1 an engine will fail: throttles back, brakes, and we stop on the runway. Stopping in time is winning too",
  "ejercicio.despues-de-v1.antes":
    "Today we practise an engine failing after V1. There is no runway left to stop: we keep flying on the other engine and come back to land",
  "ejercicio.un-motor.antes":
    "Today we practise flying on one engine. In a while we will shut one down, and the plane keeps flying on the other: we push the pedal on the good side, hold the speed and land",
  "ejercicio.simulador.antes":
    "Simulator session: something will fail, and I won't tell you what or when. Fly the plane and run the procedure, like airline pilots every six months",
  "ejercicio.despresurizacion.antes":
    "Today we practise losing cabin pressure. In a little while the pressure will go, on purpose: a warning sounds and the masks drop. Mask first, then we go down quickly to where we can breathe. It's a procedure, and we do it calmly",
  "palabra.practica": "Practice",
  "ejercicio.paramos": "Engine failure before V1: throttles back and brakes, we stop",
  "ejercicio.seguimos": "Engine failure, and we are past V1: we keep flying",
  "ejercicio.enVuelo": "An engine has stopped. The plane keeps flying on the other one",
  "ejercicio.pieDerecho":
    "The left one stopped and the plane pulls left: push the right pedal",
  "ejercicio.pieIzquierdo":
    "The right one stopped and the plane pulls right: push the left pedal",
  "palabra.pieDerecho": "Right foot",
  "palabra.pieIzquierdo": "Left foot",
  "ejercicio.velocidad":
    "Use the nose to hold this speed. On one engine it climbs slowly, but it climbs",
  "ejercicio.bandera":
    "I'm feathering the propeller of the dead engine: edge-on to the air, it drags much less",
  "ejercicio.banderaSola":
    "The dead engine's propeller has feathered itself. I'm cutting its fuel",
  "ejercicio.cortar":
    "We have height now. I'm cutting the fuel to the dead engine: it is secured",
  "ejercicio.declarar":
    "We tell the tower with the emergency word and set seven seven zero zero on the transponder. Everyone knows we are coming back, and we get priority",
  "ejercicio.bomberos":
    "See the trucks by the runway? That's the airport fire service. They always wait when a plane comes back with an emergency: it's normal",
  "ejercicio.bomberosUno":
    "See the truck by the runway? That's the airport fire service. They always wait when a plane comes back with an emergency: it's normal",
  "palabra.bomberosCategoria": "Fire service · category {n}",
  "ejercicio.bomberosFrenos":
    "The fire service is coming to check the brakes: braking that hard makes them very hot. It's normal",
  "ejercicio.bien":
    "Exercise done: you flew the procedure like in a real simulator",
  "ejercicio.bienDespresurizacion":
    "Exercise done: mask first, down quickly to where we can breathe, and on to the nearest airport. That's how airline pilots practise it in the simulator",
  "ejercicio.bienParado":
    "You stopped in time and on the runway: that is doing it right. Giving up in time is winning too",
  "ejercicio.paradoTrasV1":
    "You stopped, and it fitted on the runway. After V1 the safe thing is to keep flying: the plane flies on one engine. Next time, we go",
  "ejercicio.seguidoAntesDeV1":
    "Good return. Before V1 there is still runway left, and the safe thing is to stop. Next time, we stop",
  "ejercicio.otraVez":
    "The exercise didn't work out this time. In the simulator you repeat it as often as you need: let's go again",
  "palabra.otraVez": "Again",

  // ── The storm exercise: we never fly into one, and lightning is harmless ──
  "ejercicio.tormenta.antes":
    "Today we fly with a storm. See that huge cloud up ahead, tall as a tower? That's a thunderstorm, and we never fly into one: we'll go around it, far away, calmly",
  "ejercicio.tormenta.porQue":
    "Inside that cloud the air goes up and down very hard, it rains a lot and hail can fall. That's why we don't go in. Turn right, towards where the wind comes from, and keep it well away",
  "ejercicio.tormenta.radar":
    "You can see it on the radar: red and magenta are the strongest, and we never go in there. A storm like this is passed at twenty miles, about thirty-seven kilometres. Turn right, upwind, away from the anvil",
  "ejercicio.tormenta.avisamos":
    "We tell air traffic control we're going around the storm, and we switch on the seat belt sign: near a storm the air moves, and with your belt on a bump can't lift you out of your seat",
  "ejercicio.tormenta.masDerecha":
    "Turn a little more to the right: on this heading we'd still pass too close to the storm",
  "ejercicio.tormenta.masIzquierda":
    "Turn a little more to the left: on this heading we'd still pass too close to the storm",
  "ejercicio.tormenta.asiVa":
    "That's it! On this heading we stay well clear. Keep straight until the storm is behind us",
  "ejercicio.tormenta.rayoLejos":
    "Did you see the flash inside the cloud? That was lightning. Storms have lots of it, and from far away it can't hurt us. And if lightning ever hits a plane, that's fine too: planes are built for it",
  "ejercicio.tormenta.adentro":
    "We're inside the storm: that's why it's bumpy, the rain is heavy and you can hear the hail. Calmly: seat belt on, wings level, and keep straight, which is the quickest way out",
  "ejercicio.tormenta.rayoEnElAvion":
    "Lightning hit us, and nothing happens. Almost all the electricity runs along the outer skin of the plane and goes on its way: it's built for that. Every airliner gets hit about once or twice a year",
  "ejercicio.tormenta.salimos":
    "We're out. That's what it's like inside a storm: bumpy, heavy rain and hail. That's why we don't go in: we go around, far away. Let's try again, from the start",
  "ejercicio.tormenta.bien":
    "Very good! You went around the storm and kept it well away, just like real pilots do. Now, back home",
  "ejercicio.tormenta.bienCerca":
    "You went around it without going in: well done. We passed a bit close: next time, even further, because a storm like this is passed at twenty miles",
  "palabra.rodeala": "Go around it",
  "palabra.masLejos": "Further",
  "palabra.rayo": "Lightning",
  "palabra.derecho": "Straight on",
  "tormenta.rotulo.rodearDerecha": "Go around on the right: {n} {u} from the red",
  "tormenta.rotulo.rodearIzquierda": "Go around on the left: {n} {u} from the red",
  "tormenta.rotulo.masLejos": "This way you pass {n} {u} from the red: turn more",
  "tormenta.rotulo.asiVa": "That's it! You pass {n} {u} from the red",
  "tormenta.rotulo.rayoLejos": "Lightning in the storm: from afar it can't hurt us",
  "tormenta.rotulo.adentro": "Inside: seat belt, wings level, keep straight",
  "tormenta.rotulo.rayoEnElAvion": "Lightning hit the plane: nothing happens",
  "tormenta.rotulo.salimos": "Out. We never fly into a storm: again",
  "tormenta.rotulo.bien": "Well clear! You passed {n} {u} from the red",
  "tormenta.rotulo.bienCerca": "Passed {n} {u} from the red: next time, {m} {u}",

  "tactil.palanca": "Stick",
  "tactil.timon": "Rudder pedals",
  "tactil.motor": "Throttle",
  "galon.manga": "The instructor\u2019s sheet",
  "galon.aproximacion": "Stabilised approach",
  "galon.toma": "Landing",
  "galon.aros": "The rings",
  "galon.velocidad": "Speed",
  "galon.rodaje": "Taxiing",
  "galon.frustrada": "Go-around when it was needed",
  "galon.aproximacion.corta": "Approach",
  "galon.toma.corta": "Landing",
  "galon.aros.corta": "Rings",
  "galon.velocidad.corta": "Speed",
  "galon.rodaje.corta": "Taxi",
  "galon.frustrada.corta": "Go-around",
  "hoja.vuelta": "Walk-around, complete",
  "hoja.vueltaAMedias": "Walk-around, halfway",
  "hoja.enTierra": "You stayed on the ground today: well decided",
  "hoja.abortado": "Take-off rejected in time: well decided",
  "manga.grado": "Your rank on your sleeve: {grado}",

  "language.label": "Language",
  "language.changed": "Language: {name}",

  /*
   * What you can see out of the window. The name and the height are data,
   * straight from OpenStreetMap, so no article goes in front of the name.
   */
  "hito.izquierda": "left",
  "hito.derecha": "right",
  "hito.montana": "Look out of the window, on your {lado}: {nombre}, {altura} metres.",
  "hito.isla": "On your {lado} we are leaving {nombre} behind.",
  "hito.ciudad": "Down there, on your {lado}, {nombre}.",
  /* The same, said by the instructor sitting beside you in a light aircraft. */
  "hito.montana.vos": "Look out of the window, on your {lado}: {nombre}, {altura} metres.",
  "hito.isla.vos": "On your {lado} we are leaving {nombre} behind.",
  "hito.ciudad.vos": "Down there, on your {lado}, {nombre}.",
  "hito.unBarco": "a ship",
  "hito.otroAvion": "another aeroplane",
  "hito.avion.vos": "Look, on your {lado}: another aeroplane.",
  "hito.cruzDelSur": "Southern Cross",
  "hito.polar": "Pole Star",
  "luces.deFrente": "Green on your left and red on your right: it's coming towards you",
  "luces.seAleja": "Only the white light: it's moving away",
  "luces.cruzaIzquierda": "You see its red light: it's heading to your left",
  "luces.cruzaDerecha": "You see its green light: it's heading to your right",
  /*
   * What you can see out of the window, written by hand: one sentence per
   * place, with something worth remembering. The side goes first, as a
   * separate sentence, and the captain says hello the first time.
   */
  "ventanilla.saludo": "Hello again, this is your captain speaking.",
  "ventanilla.lado.izquierda": "If you're sitting on the left, take a look out of the window.",
  "ventanilla.lado.derecha": "If you're sitting on the right, take a look out of the window.",
  "ventanilla.teide":
    "That giant is Mount Teide: three thousand seven hundred and fifteen metres, the highest mountain in Spain. It's a volcano, and in winter it even wears a cap of snow.",
  "ventanilla.canadas":
    "At the foot of Teide lies Las Cañadas: a giant crater more than ten kilometres across. And those strangely shaped rocks are the Roques de García, carved by wind, rain and ice.",
  "ventanilla.anaga":
    "Those green, wrinkled mountains are Anaga, one of the oldest parts of Tenerife. They keep the laurisilva, a forest that covered southern Europe millions of years ago.",
  "ventanilla.orotava":
    "That wide valley running down to the sea is the Orotava Valley. It formed when a huge piece of the island slid into the ocean, hundreds of thousands of years ago.",
  "ventanilla.gigantes":
    "That wall of rock dropping into the sea is the Cliffs of Los Gigantes: hundreds of metres, straight down to the water. That's why they're called the Giants.",
  "ventanilla.garajonay":
    "That round little island is La Gomera, and the green on top is Garajonay: a forest so damp it drinks water from the clouds. It's a World Heritage Site.",
  "ventanilla.taburiente":
    "That's La Palma, the beautiful island. Up on the rim of the Caldera de Taburiente stands the Roque de los Muchachos, full of telescopes looking at the stars.",
  "ventanilla.tajogaite":
    "That dark mountain is Tajogaite, the youngest volcano in the Canary Islands: it was born in twenty twenty-one and spent almost three months pouring out lava.",
  "ventanilla.hierro":
    "That's El Hierro, the smallest of the seven big islands. For centuries the prime meridian ran through it: the world was measured from there.",
  "ventanilla.nieves":
    "High up on Gran Canaria is the Pico de las Nieves, almost two thousand metres. Centuries ago people stored the winter snow there in pits, to have ice in summer.",
  "ventanilla.las-palmas":
    "That city by the sea is Las Palmas de Gran Canaria, the biggest in the Canary Islands. It has a beach right in town, Las Canteras, with a rock reef that shelters it from the waves.",
  "ventanilla.maspalomas":
    "That golden patch by the sea is the Maspalomas Dunes: a little sand desert that the wind keeps moving, bit by bit.",
  "ventanilla.fuerteventura":
    "That long island is Fuerteventura, the oldest in the Canaries: about twenty million years old. All that wind and rain left it this flat, with huge beaches.",
  "ventanilla.lobos":
    "That islet is Lobos: it's named after the sea wolves, a kind of seal that used to live there. And opposite, the white dunes of Corralejo, on Fuerteventura.",
  "ventanilla.timanfaya":
    "Those red and black mountains are Timanfaya, on Lanzarote. About three hundred years ago its volcanoes erupted for six years in a row, and the ground is still warm.",
  "ventanilla.barco":
    "Down there a ship is sailing from one island to another: look at the white wake it leaves on the sea.",
  "ventanilla.rio-paraguay":
    "That wide, shining river down there is the Paraguay River, which gives the country its name. It splits it in two: the Eastern Region on one side, and the Chaco on the other.",
  "ventanilla.asuncion":
    "That big city on the riverbank is Asunción, our capital. It was founded in fifteen thirty-seven, and it's called the Mother of Cities, because the people who founded many others set out from there.",
  "ventanilla.ypacarai":
    "That lake is Ypacaraí, the one in the song Recuerdos de Ypacaraí, which is sung in a great many countries.",
  "ventanilla.ypoa":
    "That big stretch of water is Lake Ypoá, the largest in Paraguay, surrounded by marshes full of birds.",
  "ventanilla.rio-parana":
    "That enormous river is the Paraná, the second longest in South America: only the Amazon beats it.",
  "ventanilla.yacyreta":
    "That long line across the Paraná is the Yacyretá dam, which we share with Argentina: the river's strength makes electricity for millions of homes.",
  "ventanilla.itaipu":
    "Over there is Itaipú, the dam we share with Brazil: one of the biggest producers of energy in the whole world.",
  "ventanilla.iguazu":
    "Over there, between Argentina and Brazil, are the Iguazú Falls: almost three hundred waterfalls. With luck you can see the cloud of spray they throw up.",
  "ventanilla.triple-frontera":
    "Right there, where the Iguazú meets the Paraná, three countries touch: Paraguay, Argentina and Brazil. It's called the Triple Frontier.",
  "ventanilla.cerro-cora":
    "Those hills are Cerro Corá, a national park. That's where the biggest war in our history ended, in eighteen seventy.",
  "ventanilla.chaco":
    "Down below is the Chaco: more than half the country, but with very few people. A vast dry forest where jaguars, armadillos and giant anteaters live.",
  "ventanilla.encarnacion":
    "That's Encarnación, the Pearl of the South, on the banks of the Paraná. In summer it has river beaches and the most famous carnival in the country.",
  "ventanilla.trinidad":
    "Those are the ruins of Trinidad, an eighteenth-century Jesuit mission. It's a World Heritage Site, together with Jesús, just nearby.",
  "ventanilla.tres-kandu":
    "Those hills are the Ybytyruzú, and the highest is Tres Kandú: eight hundred and forty-two metres, the highest point in Paraguay.",
  "ventanilla.cruz-del-sur":
    "Now look at the sky: those four stars in a cross are the Southern Cross. Stretch the long bar about four and a half times and you reach due south. That's how sailors found their way, long before GPS!",
  "ventanilla.polar":
    "Look north: that lonely star, not too high and not too low, is the Pole Star. It isn't the brightest, but it's the most useful: it hardly moves all night and it marks north. And it sits as high as we are far from the equator: here, about twenty-eight degrees.",
  /*
   * And right behind, its story: something about the place that can't be
   * seen from up here. Every fact has its source in docs/historias/fuentes.md.
   */
  "ventanilla.historia.teide":
    "And something you can't see: measured from the ocean floor, Teide is about seven thousand five hundred metres tall. It's the third-highest volcano in the world, after two in Hawaii.",
  "ventanilla.historia.canadas":
    "In spring, Las Cañadas fill with red tajinastes: towers of flowers that can be taller than a person, and that only grow in the Canary Islands. And higher up, among the stones, lives the Teide violet.",
  "ventanilla.historia.anaga":
    "Anaga has been a Biosphere Reserve since twenty fifteen: it's one of the places in Europe with the most plants and animals that live nowhere else in the world.",
  "ventanilla.historia.orotava":
    "In seventeen ninety-nine the scientist Alexander von Humboldt came through this valley. He climbed Teide and noticed that the plants change with height, as if the mountain had floors.",
  "ventanilla.historia.gigantes":
    "In the sea opposite, pilot whales live all year round: big, dark relatives of dolphins. There are very few places in the world where they stay like that.",
  "ventanilla.historia.garajonay":
    "And on La Gomera you can talk by whistling: it's the Silbo Gomero, which carries from one side of a ravine to the other and can be heard kilometres away. Children on the island learn it at school.",
  "ventanilla.historia.taburiente":
    "So that those telescopes can see well, La Palma has a law that looks after the sky: the street lamps shine down at the ground, not up. That's why you can see so many stars there at night.",
  "ventanilla.historia.tajogaite":
    "When the lava reached the sea, the island grew: two pieces of brand-new land were born along the coast, the Tajogaite fajanas. They're younger than many of the children on board.",
  "ventanilla.historia.hierro":
    "The ancient people of El Hierro, the Bimbaches, drank water from a tree, the Garoé: its leaves caught the mist and the water fell drop by drop. Even Magellan's sailors heard about it, in fifteen nineteen.",
  "ventanilla.historia.nieves":
    "The centre of the island is a World Heritage Site. There, at Risco Caído, the ancient Canarians carved a cave where the sun shines in through a hole, and its light moves across the wall with the seasons.",
  "ventanilla.historia.las-palmas":
    "In fourteen ninety-two, on his way to America, Christopher Columbus stopped on Gran Canaria to fit a new rudder on the Pinta, one of his three ships.",
  "ventanilla.historia.timanfaya":
    "The ground there is still so hot that if they pour water into a hole, it shoots up like a geyser. And at the restaurant on the mountain, they grill the food with the volcano's heat.",
  "ventanilla.historia.rio-paraguay":
    "Look at the river's bends, and at those horseshoe-shaped lakes beside it: they're old bends. The water eats away the outer bank of every curve, until one day the river takes a shortcut and the bend is left on its own.",
  "ventanilla.historia.asuncion":
    "When the first European ships arrived, almost five hundred years ago, the Guaraní people here were already growing maize, cassava, sweet potato and peanuts. One of those travellers wrote that in four years he hadn't eaten such good bread.",
  "ventanilla.historia.ypacarai":
    "The music of that song was written by a Paraguayan, Demetrio Ortiz. And the words were written by an Argentine poet, Zulema de Mirkin, who had never seen the lake: she was inspired by his guitar.",
  "ventanilla.historia.ypoa":
    "Lake Ypoá has floating islands: mats of plants so thick that little trees even grow on top. Over the years, some of them are joining up with the solid ground.",
  "ventanilla.historia.yacyreta":
    "In Guaraní, Yacyretá means land of the moon: jasy is the moon. That was the name of an island in the river, and the dam took its name from it.",
  "ventanilla.historia.itaipu":
    "In Guaraní, Itaipú means the stone that sounds: that was the name of an island in the river, near where the dam was built. Its first turbine began to turn in nineteen eighty-four.",
  "ventanilla.historia.iguazu":
    "In Guaraní, Iguazú means big water. In fifteen forty-two Álvar Núñez Cabeza de Vaca reached it on his way to Asunción, and had to carry his canoes on foot to get around the falls.",
  "ventanilla.historia.triple-frontera":
    "On each bank there's a landmark painted in the colours of its flag: sky blue and white in Argentina, green and yellow in Brazil, and red, white and blue in Paraguay.",
  "ventanilla.historia.cerro-cora":
    "In the forests of Cerro Corá the mboreví still lives, the tapir: the biggest land animal in South America, with a little trunk for a nose.",
  "ventanilla.historia.chaco":
    "In the Chaco grows the samuhú, the bottle tree: a tree with a trunk as fat as a bottle, which stores water for the dry months.",
  "ventanilla.historia.encarnacion":
    "Encarnación was born in sixteen fifteen as a mission village, founded by Roque González de Santa Cruz, a priest born in Asunción. Today the bridge that joins it to Posadas, in Argentina, bears his name.",
  "ventanilla.historia.trinidad":
    "Inside its church there are angels carved in stone, playing music: harp, organ, trumpets and flute. They've been there for more than two hundred and fifty years.",
  "ventanilla.historia.cruz-del-sur":
    "More than four hundred years ago, Father José de Acosta wrote that these four stars were called the Crucero, and that sailors used the star at the foot of the cross to measure how far south they were.",
  /* The alt text of the photo shown while the story is told. */
  "historia.foto.teide": "Mount Teide rising above the clouds",
  "historia.foto.canadas": "Red tajinastes in flower in front of Mount Teide",
  "historia.foto.anaga": "The green mountains of Anaga",
  "historia.foto.orotava": "Alexander von Humboldt, painted in 1843",
  "historia.foto.gigantes": "A pilot whale swimming off Tenerife",
  "historia.foto.garajonay": "A man from La Gomera speaking in Silbo",
  "historia.foto.taburiente": "A telescope on La Palma, with a comet in the sky",
  "historia.foto.tajogaite": "The new land of the Tajogaite lava deltas, by the sea",
  "historia.foto.hierro": "The Garoé tree, on El Hierro",
  "historia.foto.nieves": "Caves carved into the rock at Risco Caído",
  "historia.foto.las-palmas": "A replica of the caravel Pinta",
  "historia.foto.timanfaya": "A jet of steam coming out of the ground at Timanfaya",
  "historia.foto.rio-paraguay": "The Paraguay River and its old bends, seen from a satellite",
  "historia.foto.asuncion": "Cassava roots fresh out of the ground",
  "historia.foto.ypacarai": "A boat on Lake Ypacaraí",
  "historia.foto.ypoa": "A floating island on Lake Ypoá",
  "historia.foto.yacyreta": "The moon over the Yacyretá dam, at night",
  "historia.foto.itaipu": "The Itaipú dam",
  "historia.foto.iguazu": "The Iguazú falls",
  "historia.foto.triple-frontera": "The Paraguayan marker at the Triple Frontier, red, white and blue",
  "historia.foto.cerro-cora": "A tapir, with its little trunk",
  "historia.foto.chaco": "The bottle-shaped trunk of a samuhú tree",
  "historia.foto.encarnacion": "The bridge between Encarnación and Posadas",
  "historia.foto.trinidad": "Musician angels carved in stone at Trinidad",
  "historia.foto.cruz-del-sur": "The Southern Cross in the night sky",
  /* The illustrations: what is seen, for whoever cannot see it. Nothing says whether Ara is a boy or a girl. */
  "ilustracion.pasaje-embarque": "The cabin still empty: families with little ones board first",
  "ilustracion.pasaje-lleno": "The full cabin, everyone in their seat, and Ara by the window",
  "ilustracion.pasaje-tripulante": "The flight attendant talking to Ara, next to the seat",
  "ilustracion.pasaje-ara-ventanilla": "Ara, face against the window, looking at the wing and engine",
  "ilustracion.pasaje-comandante": "Captain Jazlyn in the cockpit, above the clouds",
  "ilustracion.ara-durmiendo": "Ara asleep by the window, with the blanket and the seat belt over it",
  "ilustracion.ara-sonando": "Ara smiling in a dream of a plane flying over the islands",
  "ilustracion.fuera-jaz-20": "The JAZ 20 flying over the river and the forest",
  "ilustracion.fuera-jaz-25": "The JAZ 25 flying low over a crop field",
  "ilustracion.fuera-jaz-40": "The JAZ 40 flying over a lake among the hills",
  "ilustracion.fuera-jaz-60": "The JAZ 60 flying over the wetlands",
  "ilustracion.fuera-jaz-90": "The JAZ 90 flying above the clouds",
  "ilustracion.fuera-jaz-120": "The JAZ 120, with its four engines, above the clouds",
  "ilustracion.cabina-jaz-20": "Jazlyn at the controls of the JAZ 20, in the left seat",
  "ilustracion.cabina-jaz-25": "Jazlyn at the controls of the JAZ 25, the single-seat biplane",
  "ilustracion.cabina-jaz-40": "Jazlyn at the controls of the JAZ 40, with an engine on each wing",
  "ilustracion.cabina-jaz-60": "Jazlyn at the controls of the JAZ 60 and its screens",
  "ilustracion.cabina-jaz-90": "Jazlyn at the controls of the JAZ 90, with Mount Teide ahead",
  "ilustracion.cabina-jaz-120": "Jazlyn at the controls of the JAZ 120, at night under the Southern Cross",
  "ilustracion.retrato-jazlyn": "Jazlyn, with the captain's cap and sunglasses",
  /* The same, said by the instructor sitting beside you in a light aircraft. */
  "ventanilla.vos.lado.izquierda": "Look out of the window, to your left.",
  "ventanilla.vos.lado.derecha": "Look out of the window, to your right.",
  "ventanilla.vos.teide":
    "See that huge mountain? That's Mount Teide, the highest in all of Spain. And it's a volcano!",
  "ventanilla.vos.canadas":
    "Look down, at the foot of Teide: that's Las Cañadas, a giant crater. And those strange rocks are the Roques de García.",
  "ventanilla.vos.anaga":
    "Those green, wrinkled mountains are Anaga. The laurisilva grows there, a forest that already existed millions of years ago.",
  "ventanilla.vos.orotava":
    "That valley running down to the sea is La Orotava. It formed when a giant piece of the island slid into the sea.",
  "ventanilla.vos.gigantes":
    "Look at those cliffs: they're Los Gigantes. Walls of rock dropping straight into the sea.",
  "ventanilla.vos.garajonay":
    "That island is La Gomera. The green on top is Garajonay, a forest that drinks water from the clouds.",
  "ventanilla.vos.taburiente":
    "That's La Palma. Right at the top, on the Roque de los Muchachos, there are giant telescopes for looking at the stars.",
  "ventanilla.vos.tajogaite":
    "See that black mountain? That's Tajogaite, a volcano born in twenty twenty-one. It poured out lava for almost three months!",
  "ventanilla.vos.hierro":
    "That's El Hierro, the smallest of the seven big islands. Long ago, the world was measured from there.",
  "ventanilla.vos.nieves":
    "On top of Gran Canaria is the Pico de las Nieves. People used to store snow there, in pits, to have ice in summer.",
  "ventanilla.vos.las-palmas":
    "That's Las Palmas de Gran Canaria, the biggest city in the islands. It has a beach right in the middle of town!",
  "ventanilla.vos.maspalomas":
    "See that golden patch? Those are the Maspalomas dunes: a tiny desert right by the sea.",
  "ventanilla.vos.fuerteventura":
    "That long island is Fuerteventura, the oldest of all the Canary Islands. It's about twenty million years old!",
  "ventanilla.vos.lobos":
    "That islet is Lobos. It's named after the seals that used to live there: the sea wolves.",
  "ventanilla.vos.timanfaya":
    "Those red and black mountains are Timanfaya: volcanoes that erupted for six years. The ground is still hot!",
  "ventanilla.vos.barco":
    "Look down there: a ship, with the white line it leaves behind in the water.",
  "ventanilla.vos.avion":
    "Look: another aeroplane. Looking outside is the first thing a pilot does, to see everyone else.",
  "ventanilla.vos.rio-paraguay":
    "That river is the Paraguay, which gives our country its name. The Chaco begins on the other side.",
  "ventanilla.vos.asuncion":
    "That's Asunción, the capital. It's one of the oldest cities in South America.",
  "ventanilla.vos.ypacarai":
    "That lake is Ypacaraí, the one in the song. Do you know it?",
  "ventanilla.vos.ypoa":
    "That's Lake Ypoá, the biggest in Paraguay. Lots and lots of birds live there.",
  "ventanilla.vos.rio-parana":
    "That enormous river is the Paraná. In all of South America, only the Amazon is longer.",
  "ventanilla.vos.yacyreta":
    "That long line across the river is the Yacyretá dam. It uses the water's strength to make electricity for people's homes.",
  "ventanilla.vos.itaipu":
    "Over there is Itaipú, a giant dam. It makes electricity for Paraguay and for Brazil.",
  "ventanilla.vos.iguazu":
    "Over that way are the Iguazú Falls. That's almost three hundred waterfalls!",
  "ventanilla.vos.triple-frontera":
    "That's where two rivers and three countries meet: Paraguay, Argentina and Brazil.",
  "ventanilla.vos.cerro-cora":
    "Those hills are Cerro Corá. A very big war ended there, long ago, in eighteen seventy.",
  "ventanilla.vos.chaco":
    "Down below is the Chaco: a huge dry forest where jaguars, armadillos and anteaters live.",
  "ventanilla.vos.encarnacion":
    "That's Encarnación. In summer it has beaches on the river and a very famous carnival.",
  "ventanilla.vos.trinidad":
    "Those are the ruins of Trinidad: a very old Jesuit mission, a World Heritage Site.",
  "ventanilla.vos.tres-kandu":
    "Those hills are the Ybytyruzú. That's Tres Kandú, the highest point in all of Paraguay!",
  "ventanilla.vos.cruz-del-sur":
    "Look at those four stars in a cross: that's the Southern Cross. Stretch the long bar four and a half times and you're pointing south.",
  "ventanilla.vos.polar":
    "See that lonely star to the north? That's the Pole Star. It hardly moves: all night long it marks north.",
  /* And its story, said by the instructor: shorter, to whoever sits beside her. */
  "ventanilla.vos.historia.teide":
    "Did you know? Measured from the bottom of the sea, Teide is seven thousand five hundred metres tall. It's one of the tallest volcanoes in the world!",
  "ventanilla.vos.historia.canadas":
    "In spring, red tajinastes grow down there: towers of flowers that can be taller than you. They only grow in the Canary Islands!",
  "ventanilla.vos.historia.anaga":
    "Plants and little animals live in Anaga that don't exist anywhere else in the world. Only there!",
  "ventanilla.vos.historia.orotava":
    "A long time ago a scientist called Humboldt came through this valley. He climbed Teide and realised that plants change with height, like the floors of a house.",
  "ventanilla.vos.historia.gigantes":
    "Pilot whales live in that sea all year round: big, dark cousins of dolphins.",
  "ventanilla.vos.historia.garajonay":
    "On La Gomera people talk by whistling, from one ravine to another: the Silbo Gomero. Kids learn it at school!",
  "ventanilla.vos.historia.taburiente":
    "So the telescopes can see well, the street lamps on La Palma shine downwards, not at the sky. There's a law to look after the stars!",
  "ventanilla.vos.historia.tajogaite":
    "When the lava reached the sea, the island grew: two pieces of brand-new land were born by the coast!",
  "ventanilla.vos.historia.hierro":
    "On El Hierro there was a tree that gave water: the Garoé. Its leaves caught the mist, and the water fell drop by drop.",
  "ventanilla.vos.historia.nieves":
    "The ancient Canarians made a cave where the sun shines in through a hole. Depending on the time of year, the light lands on a different part of the wall!",
  "ventanilla.vos.historia.las-palmas":
    "Christopher Columbus stopped on this island before crossing to America, to fix the rudder of one of his ships, the Pinta.",
  "ventanilla.vos.historia.timanfaya":
    "At Timanfaya the ground is so hot that they cook food with the volcano's heat. And if they pour water into a hole, it shoots straight up!",
  "ventanilla.vos.historia.rio-paraguay":
    "See those horseshoe-shaped lakes beside the river? They're old bends the river left behind when it took a shortcut.",
  "ventanilla.vos.historia.asuncion":
    "When the first ships from Europe arrived, the Guaraní people here were already growing maize, cassava, sweet potato and peanuts.",
  "ventanilla.vos.historia.ypacarai":
    "The words of that song were written by a poet who had never seen the lake. She was inspired by listening to the guitar!",
  "ventanilla.vos.historia.ypoa":
    "Lake Ypoá has floating islands! They're mats of plants, and little trees even grow on top.",
  "ventanilla.vos.historia.yacyreta":
    "Do you know what Yacyretá means in Guaraní? Land of the moon: jasy is the moon.",
  "ventanilla.vos.historia.itaipu":
    "Itaipú means the stone that sounds, in Guaraní. That was the name of an island in the river.",
  "ventanilla.vos.historia.iguazu":
    "Iguazú means big water, in Guaraní. Long ago, some travellers had to carry their canoes on foot to get past the falls.",
  "ventanilla.vos.historia.triple-frontera":
    "On each bank there's a column painted in the colours of its flag. Three banks, three flags!",
  "ventanilla.vos.historia.cerro-cora":
    "The mboreví lives in those forests, the tapir: the biggest land animal in South America, with a little trunk!",
  "ventanilla.vos.historia.chaco":
    "In the Chaco there's a tree with a fat belly like a bottle: the samuhú. It keeps water inside for when it doesn't rain!",
  "ventanilla.vos.historia.encarnacion":
    "Encarnación started more than four hundred years ago, as a mission village. And a long bridge joins it to Argentina!",
  "ventanilla.vos.historia.trinidad":
    "In the church at Trinidad there are stone angels playing the harp, the organ and the flute. A stone orchestra!",
  "ventanilla.vos.historia.cruz-del-sur":
    "Long ago, these stars were called the Crucero, and sailors used them to know how far south they were.",

  /*
   * El guion de la cabina: el plan y el descenso de la comandante, y la
   * tripulación. La voz está grabada en castellano, como el resto de la
   * megafonía; esto es lo que se lee en la tira. Ver `audio/megafonia.ts`.
   */
  "comandante.previsto.vuelo": "The flight will take about {n} minutes.",
  "comandante.previsto.nivel": "We'll be flying at {n} thousand feet.",
  "comandante.previsto.vuelo.h75": "The flight will take about an hour and a quarter.",
  "comandante.previsto.vuelo.h90": "The flight will take about an hour and a half.",
  "comandante.previsto.vuelo.h105": "The flight will take about an hour and forty-five minutes.",
  "comandante.previsto.vuelo.h120": "The flight will take about two hours.",
  "comandante.descenso.hacia":
    "Ladies and gentlemen, this is your captain again. We're starting our descent.",
  "comandante.descenso.vuelta":
    "Ladies and gentlemen, this is your captain again. We're starting our descent back to the airport.",
  "comandante.descenso.hacia.pettirossi":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Asunción.",
  "comandante.descenso.hacia.guarani":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Ciudad del Este.",
  "comandante.descenso.hacia.encarnacion":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Encarnación.",
  "comandante.descenso.hacia.concepcion":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Concepción.",
  "comandante.descenso.hacia.pedro-juan":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Pedro Juan Caballero.",
  "comandante.descenso.hacia.estigarribia":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Mariscal Estigarribia.",
  "comandante.descenso.hacia.ayolas":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Ayolas.",
  "comandante.descenso.hacia.pilar":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Pilar.",
  "comandante.descenso.hacia.yvytu-rape":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Yvytu Rape, the Granja Óga airstrip.",
  "comandante.descenso.hacia.tenerife-norte":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Tenerife North.",
  "comandante.descenso.hacia.tenerife-sur":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Tenerife South.",
  "comandante.descenso.hacia.gran-canaria":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Gran Canaria.",
  "comandante.descenso.hacia.lanzarote":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Lanzarote.",
  "comandante.descenso.hacia.fuerteventura":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into Fuerteventura.",
  "comandante.descenso.hacia.la-palma":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into La Palma.",
  "comandante.descenso.hacia.el-hierro":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into El Hierro.",
  "comandante.descenso.hacia.la-gomera":
    "Ladies and gentlemen, this is your captain again. We're starting our descent into La Gomera.",
  "comandante.minutos": "We'll be landing in about {n} minutes.",
  "comandante.minutos.h75": "We'll be landing in about an hour and a quarter.",
  "comandante.minutos.h90": "We'll be landing in about an hour and a half.",
  "comandante.minutos.h105": "We'll be landing in about an hour and forty-five minutes.",
  "comandante.minutos.h120": "We'll be landing in about two hours.",
  "comandante.cielo.despejado": "The sky there is clear.",
  "comandante.cielo.nubes": "There are a few clouds there.",
  "comandante.cielo.nublado": "It's cloudy there.",
  "comandante.cielo.lluvia": "It's raining there.",
  "comandante.cielo.tormenta":
    "There's a storm there, so it may get a little bumpy: keep your seatbelt fastened and relax.",
  "comandante.cielo.niebla": "It's foggy there.",
  "comandante.temperatura": "The temperature is {n} degrees.",
  "comandante.temperaturaBajoCero": "The temperature is {n} degrees below zero.",
  "comandante.aproximacion": "Cabin crew, prepare for landing.",
  "comandante.descensoDeEmergencia": "Cabin crew, emergency descent.",
  "comandante.alturaSegura": "Cabin crew, we have reached a safe altitude.",
  "comandante.mascaras":
    "Ladies and gentlemen, this is your captain speaking. Put on your oxygen mask over your nose and mouth: yours first, then help others. We are descending quickly to an altitude where the air is breathable.",
  "comandante.yaSeRespira":
    "Ladies and gentlemen, this is your captain speaking. We are now at an altitude where the air is breathable: you may remove your mask. We are heading to the nearest airport. Thank you for staying calm.",
  "tripulacion.servicio.mango":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: fresh water, and dried mango from Granja Óga. Enjoy!",
  "tripulacion.servicio.pina":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: fresh water, and dried pineapple from Granja Óga. Enjoy!",
  "tripulacion.servicio.banana":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: fresh water, and dried banana from Granja Óga. Enjoy!",
  "tripulacion.servicio.mani":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: fresh water, and roasted peanuts from Granja Óga. Enjoy!",
  "tripulacion.servicio.chipa":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: fresh water, and chipa from Granja Óga. Enjoy!",
  "tripulacion.servicio.mbeju":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: fresh water, and mbejú from Granja Óga. Enjoy!",
  "tripulacion.servicio.largo":
    "And as it's a long flight, we also have hot coffee and tea.",
  "tripulacion.cinturones":
    "Ladies and gentlemen, the seatbelt sign is on. Please fasten your seatbelt, bring your seat back upright and stow your tray table. Thank you.",
  "tripulacion.servicio.pausa":
    "Ladies and gentlemen, due to the turbulence we're pausing the service for a little while, and the cabin crew will take their seats. We'll carry on as soon as it settles.",
  "tripulacion.servicio.seguimos":
    "It's settled down: we're resuming the service. Thank you very much for your patience.",
  "tripulacion.mascaras":
    "Ladies and gentlemen: pull the mask towards you, place it over your nose and mouth and breathe normally. Put on your own first, then help others. We are descending to an altitude where the air is breathable.",
  "tripulacion.canario.mascaras":
    "Ladies and gentlemen: pull the mask towards you, place it over your nose and mouth and breathe normally. Put on your own first, then help others. We are descending to an altitude where the air is breathable.",
  "tripulacion.canario.servicio.mango":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and dried mango from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.pina":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and dried pineapple from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.banana":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and dried banana from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.mani":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and roasted peanuts from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.mango.paraguay":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and dried mango; a taste of Paraguay, from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.pina.paraguay":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and dried pineapple; a taste of Paraguay, from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.banana.paraguay":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and dried banana; a taste of Paraguay, from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.mani.paraguay":
    "Ladies and gentlemen, in a few minutes we'll come through the cabin with our service: water, and roasted peanuts; a taste of Paraguay, from Granja Óga. Enjoy!",
  "tripulacion.canario.servicio.largo":
    "And as it's a long flight, we also have coffee and tea.",
  "tripulacion.canario.cinturones":
    "Ladies and gentlemen, the seatbelt sign is on. Please fasten your seatbelt, bring your seat back upright and stow your tray table. Thank you.",
  "tripulacion.canario.servicio.pausa":
    "Ladies and gentlemen, due to the turbulence we're pausing the service for a little while, and the cabin crew will take their seats. We'll carry on as soon as it settles.",
  "tripulacion.canario.servicio.seguimos":
    "It's settled down: we're resuming the service. Thank you very much for your patience.",
  /*
   * Off the runway and taxiing in, what any cabin crew says. See
   * `audio/anuncio-tras-la-toma.ts`.
   */
  "tripulacion.bienvenidos": "Ladies and gentlemen, welcome to {campo}.",
  "tripulacion.bienvenidos.pettirossi": "Ladies and gentlemen, welcome to Asunción.",
  "tripulacion.bienvenidos.guarani": "Ladies and gentlemen, welcome to Ciudad del Este.",
  "tripulacion.bienvenidos.encarnacion": "Ladies and gentlemen, welcome to Encarnación.",
  "tripulacion.bienvenidos.pedro-juan": "Ladies and gentlemen, welcome to Pedro Juan Caballero.",
  "tripulacion.trasLaToma":
    "Please remain seated with your seatbelt fastened until the aircraft has come to a complete stop and the seatbelt sign has been switched off. You may now use your mobile phones. Please take care when opening the overhead bins, as items may have moved during the flight. Thank you.",
  "tripulacion.canario.bienvenidos": "Ladies and gentlemen, welcome to {campo}.",
  "tripulacion.canario.bienvenidos.tenerife-norte": "Ladies and gentlemen, welcome to Tenerife North.",
  "tripulacion.canario.bienvenidos.tenerife-sur": "Ladies and gentlemen, welcome to Tenerife South.",
  "tripulacion.canario.bienvenidos.gran-canaria": "Ladies and gentlemen, welcome to Gran Canaria.",
  "tripulacion.canario.bienvenidos.lanzarote": "Ladies and gentlemen, welcome to Lanzarote.",
  "tripulacion.canario.bienvenidos.fuerteventura": "Ladies and gentlemen, welcome to Fuerteventura.",
  "tripulacion.canario.bienvenidos.la-palma": "Ladies and gentlemen, welcome to La Palma.",
  "tripulacion.canario.bienvenidos.la-gomera": "Ladies and gentlemen, welcome to La Gomera.",
  "tripulacion.canario.trasLaToma":
    "Please remain seated with your seatbelt fastened until the aircraft has come to a complete stop and the seatbelt sign has been switched off. You may now use your mobile phones. Please take care when opening the overhead bins, as items may have moved during the flight. Thank you.",
  "servicio.rotulo": "In-flight service",

  /*
   * Tapping a piece of the panel explains it, and the corner of flight
   * curiosities. See `ui/explicaciones-de-serie.ts`. Only the recorded
   * voice says them: they never fall back to the browser's voice.
   */
  "explica.oir": "Listen again",
  "explica.curiosidades": "Flight curiosities",
  "explica.velocidad.corta": "Speed",
  "explica.velocidad.texto":
    "IAS is the speed of the air flowing over the wing, in knots. The wing only holds the plane up if the air flows fast: too slow and it stops holding, too fast and the plane suffers. Stay in the green. It is measured by a little tube facing forward: the pitot.",
  "explica.altitud.corta": "Height",
  "explica.altitud.texto":
    "ALT is the altitude: how many feet above the sea you are. A thousand feet is about three hundred metres. The altimeter doesn't look at the ground: it measures how much the air above you weighs, and higher up it weighs less. That's why it needs the pressure of the day. The pink mark is the altitude you asked the plane for.",
  "explica.rumbo.corta": "Heading",
  "explica.rumbo.texto":
    "HDG is the heading: where the nose of the plane points, in degrees, like a compass. North is 360, east 90, south 180 and west 270. Runways are named after their heading: runway 03 points at 30 degrees.",
  "explica.actitud.corta": "Horizon",
  "explica.actitud.texto":
    "This is the artificial horizon. Blue is the sky and brown is the ground; the little yellow plane in the middle is you. If the blue goes down, the nose is going up; if it tilts, you are turning. It lets you fly straight even when you can't see anything outside, inside a cloud.",
  "explica.variometro.corta": "Up or down",
  "explica.variometro.texto":
    "V/S tells you whether the plane is climbing or descending, and how fast, in feet per minute. Up is climbing, down is descending, and in the middle the plane is level.",
  "explica.coordinador.corta": "Turn",
  "explica.coordinador.texto":
    "The little plane tilts when you turn, and shows how fast the plane is turning. The ball underneath says whether the turn is clean: if it slides to one side, you bring it back to the middle with the pedal on that side.",
  "explica.motor.corta": "Engine",
  "explica.motor.texto":
    "How hard the engine is working. On propeller planes it is measured in turns per minute, RPM; on jets, by how fast the big fan at the front spins, N1. More power means going faster or climbing; less power, going slower or descending. On a jet the needle takes a few seconds to reach what you asked for: a big engine doesn't hurry.",
  "explica.flaps.corta": "Flaps",
  "explica.flaps.texto":
    "The flaps are the back part of the wing, and they slide down and out. They make the wing bigger and more curved, so it holds the plane up at a lower speed. They come out for take-off and landing, and go back in for the cruise, because they also slow you down.",
  "explica.tren.corta": "Wheels",
  "explica.tren.texto":
    "The gear lights. Green means wheel down and locked, ready to touch the ground. After take-off the wheels go up, because outside they slow the air. Before landing you always check: three greens.",
  "explica.combustible.corta": "Fuel",
  "explica.combustible.texto":
    "How much fuel is left. On most planes it is inside the wings. The amber band is the reserve: what is always kept in case you have to wait or go to another airport. You never count on the reserve to get there.",
  "explica.presurizacion.corta": "Cabin air",
  "explica.presurizacion.texto":
    "Up there the air is so thin it isn't enough to breathe well. So the plane pumps air into the cabin and inflates it a little, like a balloon: inside it feels like being on a high hill, at most two thousand four hundred metres, even when outside you are above ten thousand. CAB ALT tells you how high the cabin is.",
  "explica.avisos.corta": "Warning lights",
  "explica.avisos.texto":
    "They light up when something wants you to look at it. Amber means careful; red means something has to be done now. And always in the same order: first fly the plane, then look at what's happening.",
  "explica.matricula.corta": "Registration",
  "explica.matricula.texto":
    "It is the plane's name, like a car's number plate. The first letters tell the country: ZP is Paraguay. The tower calls you by these letters, each one with its radio word: Zulu, Papa… That's why it is in plain sight, so you know they're talking to you.",
  "explica.carta.corta": "Map",
  "explica.carta.texto":
    "This is the map screen. The yellow triangle is you, and what's above it is what lies ahead. The pink line is the route of the flight plan. The diamonds are other planes: TCAS only shows you the ones flying near your altitude. Those much higher or lower don't appear, even if you can see them out of the window.",
  "explica.carta.tierra":
    "On the ground the traffic radar rests; what's on the runway, the tower tells you. That's why the screen says TCAS STBY: the system is waiting. It starts working at the holding point, before entering the runway, and meanwhile whatever is taxiing you look at out of the window.",
  "explica.tcas.corta": "Another plane",
  "explica.tcas.ra":
    "Each diamond is another plane flying near your altitude. Hollow, it's around; filled, it's close. If it turns into an amber circle, TCAS warns you —traffic, traffic— and you look for it outside. The number is hundreds of feet: +10 is a thousand feet above, and −05 five hundred below. The little arrow says whether it is climbing or descending. And in the jets, if the other plane really closes in, it turns into a red square: TCAS tells you whether to climb or descend —climb, climb— and the green band on the vertical speed indicator tells you how much.",
  "explica.arco.corta": "Green arc",
  "explica.arco.texto":
    "This green arc shows where you will reach the altitude you asked for, if you keep climbing or descending like now. If it falls before the runway, you get down with time to spare; if it falls after, you won't make it: descend faster or start earlier.",
  "explica.arco.presenta":
    "See the green arc on the map? That's where we'll reach the altitude we asked for.",
  "explica.td.corta": "Start down",
  "explica.td.texto":
    "T/D means top of descent: this is where we start going down. From this green circle, descending calmly, you reach the runway at just the right height.",
  "explica.td.presenta": "Look at the green circle on the map: that's where we start going down.",
  "explica.tc.corta": "Done climbing",
  "explica.tc.texto":
    "T/C means top of climb: this is where we finish climbing. From this green circle the plane flies level, in the cruise, until the T/D.",
  "explica.tc.presenta": "That green circle on the map is where we finish climbing.",
  "explica.senda.corta": "Glide path",
  "explica.senda.texto":
    "The diamond shows where the glide path is, the invisible ramp down to the runway. If the diamond is low, you are high: come down a bit more. If it is high, you are low. You fly towards the diamond until it sits in the middle.",
  "explica.senda.presenta":
    "There's the pink glide path diamond, next to the altitude. If we keep it in the middle, we're heading nicely for the runway.",
  "explica.gs-rodaje.corta": "Taxi",
  "explica.gs-rodaje.texto":
    "GS is the speed over the ground. While taxiing, this bar shows how fast you're going, and the pink mark how far to fill it: before a turn it drops, because turns are taken slowly. Green means you're fine; amber, that you need to brake.",
  "explica.gs-rodaje.presenta":
    "This bar shows how fast we're taxiing. Fill it up to the pink mark, no more.",
  "explica.grado-aprendiz.corta": "Student",
  "explica.grado-aprendiz.texto":
    "Student is the first rank. You're learning, and the instructor flies beside you and tells you what comes next. Getting things wrong is learning too: every flight counts.",
  "explica.grado-piloto.corta": "Pilot",
  "explica.grado-piloto.texto":
    "A pilot can already take off and land. You fly the plane from stand to stand, and the instructor helps when you need it.",
  "explica.grado-comandante.corta": "Captain",
  "explica.grado-comandante.texto":
    "Being captain doesn't mean you're in charge: it means you answer for the plane and for everyone on board. To get there you need to have gone around at least once, because knowing when not to land is what keeps everyone safe. That's why with this rank you can fly without the instructor.",
  "explica.grado-instructora.corta": "Instructor",
  "explica.grado-instructora.texto":
    "An instructor knows enough to teach someone else. She answers for her plane and, on top of that, for what the person flying beside her learns.",
  "explica.sin-instructora.corta": "No instructor",
  "explica.sin-instructora.texto":
    "You fly without the instructor because you already know how to look after yourself. She stays quiet and only speaks up if there's danger: the ground too close, another plane, a stall, an order from the tower or a go-around that's needed. The tower and the aircraft's own voice carry on as usual. You need to be a captain to choose it.",
  "explica.galones.corta": "Stripes",
  "explica.galones.texto":
    "The stripes on the sleeve show your rank, as in any airline: one for someone learning; two, second officer; three, first officer, who already flies the plane; and four, the captain. Four stripes don't mean she's more in charge: they mean she answers for everyone on board. What you did well on each flight doesn't go on the sleeve: the instructor ticks it on her sheet.",
  "explica.hoja.corta": "The instructor's sheet",
  "explica.hoja.texto":
    "After each flight, the instructor fills in a sheet with the parts of the flight: the walk-around, the approach, the landing, the go-around if it was needed, the speed and the taxiing. She ticks each one you did well. That's how a real flight school assesses you. What doesn't come out yet isn't crossed out: you practise it on the next flight.",
  "explica.sello.veve.corta": "¡Veve!",
  "explica.sello.veve.texto":
    "Veve! The stamp for your first take-off. Veve means 'to fly' in Guaraní.",
  "explica.sello.karumbe.corta": "Karumbe",
  "explica.sello.karumbe.texto":
    "Karumbe, the tortoise: you taxied the whole runway, slowly and down the middle. At airfields without a taxiway, that's how you get to the end of the runway.",
  "explica.sello.mainumby.corta": "Mainumby",
  "explica.sello.mainumby.texto":
    "Mainumby, the hummingbird: you flew really slowly, level, without stalling. Slow flight is practised at flying school to get to know your aeroplane.",
  "explica.sello.nanduti.corta": "Ñandutí",
  "explica.sello.nanduti.texto":
    "Ñandutí: you flew through a cloud, white inside like the lace. Inside you can't see a thing and you fly by your instruments, so it's only done in aeroplanes equipped for it.",
  "explica.sello.tajamar.corta": "Around the pond",
  "explica.sello.tajamar.texto":
    "Around the pond: you flew a full circle around the farm's tajamar, where the cattle drink. Turns around a point teach you to correct for the wind.",
  "explica.sello.tres-toques.corta": "Three touch-and-goes",
  "explica.sello.tres-toques.texto":
    "Three touch-and-goes: you touched the runway and climbed away three times in a row, without stopping. That's how landings are practised at flying school.",
  "explica.sello.primer-solo.corta": "First Solo",
  "explica.sello.primer-solo.texto":
    "Your first solo: you took off and landed with no instructor, on your own. Every pilot remembers that day forever.",
  "explica.sello.chipa-volandera.corta": "Flying chipa",
  "explica.sello.chipa-volandera.texto":
    "Flying chipa: you left one airfield and landed at another. Your first cross-country flight, like the chipa that travels from town to town.",
  "explica.sello.jasy.corta": "Jasy",
  "explica.sello.jasy.texto":
    "Jasy, the moon: you landed at night. At night you find the runway by its lights, and you come down even more calmly.",
  "explica.sello.mbarete.corta": "Mbarete",
  "explica.sello.mbarete.texto":
    "Mbarete means strong. You gave up in time, when something wasn't right: it takes strength not to carry on. That's what good pilots do.",
  "explica.sello.ruta-jesuitica.corta": "Jesuit Route",
  "explica.sello.ruta-jesuitica.texto":
    "Jesuit Route: you flew at Encarnación and Ayolas, the land of the Jesuit missions, with their stone ruins more than two hundred years old.",
  "explica.sello.pettirossi.corta": "Pettirossi's feat",
  "explica.sello.pettirossi.texto":
    "Pettirossi's feat: you have flown at every airfield in Paraguay. Silvio Pettirossi was the first Paraguayan aviator, and Asunción's airport bears his name.",
  "explica.sello.planeador.corta": "The glider",
  "explica.sello.planeador.texto":
    "The glider: you reached the runway with no engine, gliding. It's what pilots practise for the day an engine stops: calmly, at gliding speed, towards the runway you can reach.",
  "explica.sello.manos-de-seda.corta": "Silk hands",
  "explica.sello.manos-de-seda.texto":
    "Silk hands: you came down the glide path at your speed and settled nicely on the runway. A stabilised approach like that is what an examiner looks at most.",
  "explica.sello.transchaco.corta": "Transchaco",
  "explica.sello.transchaco.texto":
    "Transchaco: you flew between Asunción and Mariscal Estigarribia, over the Chaco, along the Transchaco highway. A long flight, the kind you plan before you leave.",
  "explica.sello.cien-horas.corta": "One hundred hours",
  "explica.sello.cien-horas.texto":
    "One hundred hours: your logbook now has a hundred hours of flight. Hours are what really count for a pilot, and these are all yours.",
  "explica.persianas.corta": "The windows",
  "explica.persianas.texto":
    "For take-off and landing the window shades go up, and at night the cabin lights are dimmed. That way you can see outside if something happens, and your eyes are already used to the light outside if you need to get out. On some new planes the crew clears all the windows at once.",
  "explica.video-seguridad.corta": "Before take-off",
  "explica.video-seguridad.texto":
    "Before take-off, the crew shows where the exits are, how the seat belt fastens, the life vest and the masks. Even if you fly often, you always watch: every plane is different, and the nearest exit may be behind you.",
  "explica.mascaras.corta": "The masks",
  "explica.mascaras.texto":
    "If the cabin loses its air, masks drop from the ceiling. Put yours on first and then help the person next to you, even a child: without air you couldn't help anyone. Oxygen is flowing even if the bag doesn't inflate, and the plane descends right away to where you can breathe well.",
  "explica.no-fumar.corta": "No smoking",
  "explica.no-fumar.texto":
    "There's no smoking on the plane, not even electronic cigarettes, and least of all in the toilet: a fire in the air is one of the most dangerous things there is. That's why the toilets have smoke detectors.",
  "explica.cinturon.corta": "The seat belt",
  "explica.cinturon.texto":
    "Even when the seat belt sign is off, keep it on loosely while you're seated. Sometimes the air moves suddenly without warning, with a clear sky, and the belt is what keeps you in your seat.",
  "explica.mesitas.corta": "Table and seat back",
  "explica.mesitas.texto":
    "For take-off and landing, the table stowed and the seat back upright. That way nobody gets hurt if the plane brakes hard, and the aisle to the exit stays clear in case you need to get out fast.",
  "explica.modo-avion.corta": "Flight mode",
  "explica.modo-avion.texto":
    "Your phone, in flight mode. Its radio searching for a signal sneaks into the pilots' headsets as a buzz, right when they are listening to the tower. And up there there's no signal anyway: the phone drains its battery looking for one.",
  "explica.bomberos.corta": "Fire crew",
  "explica.bomberos.texto":
    "Every airport has a fire crew ready for the biggest plane it receives: the longer and wider the plane, the more water, foam and fire trucks it takes. This plane is bigger than they can look after here, so it doesn't come: if something happened, there wouldn't be enough to help it properly. That's why every airport states its category, from 1 to 10, and every plane goes where it can be looked after.",
  "explica.bomberos-y-aviones.corta": "Why only small planes?",
  "explica.bomberos-y-aviones.texto":
    "Only small planes go to some airports. Often it's because of the runway, and sometimes because of the fire crew. To La Gomera, in the Canary Islands, Binter flies the ATR, a twenty-seven-metre propeller plane. Binter also has forty-one-and-a-half-metre jets —one is even called «La Gomera»— and doesn't take them there: La Gomera's fire crew is category 5, ready for planes up to twenty-eight metres, and those jets need at least 6. An airport gets ready for the planes it receives, and so every plane goes where it can be looked after.",
  "tarjeta.abrir": "See the plane up close",
  "tarjeta.ficha.envergadura": "Wingtip to wingtip",
  "tarjeta.ficha.largo": "Nose to tail",
  "tarjeta.ficha.mtow": "The most it can weigh to take off",
  "tarjeta.ficha.crucero": "How fast it travels",
  "tarjeta.ficha.alcance": "How far it goes without refuelling",
  "tarjeta.ficha.techo": "The highest it can climb",
  "tarjeta.ficha.motores": "How many engines, and what kind",
  "tarjeta.ficha.plazas": "How many people fit, pilot included",
  "tarjeta.ficha.vref": "How fast it crosses the threshold to land",
  "tarjeta.motor.piston": "piston",
  "tarjeta.motor.radial": "radial",
  "tarjeta.motor.turbohelice": "turboprop",
  "tarjeta.motor.turbofan": "turbofan",
  "tarjeta.pieza.alerones": "Ailerons",
  "tarjeta.pieza.profundidad": "Elevator",
  "tarjeta.pieza.timon": "Rudder",
  "tarjeta.pieza.flaps": "Flaps",
  "tarjeta.pieza.aerofrenos": "Spoilers",
  "tarjeta.pieza.pitot": "Pitot tube",
  "tarjeta.pieza.motor": "Engine",
  "tarjeta.pieza.tren": "Landing gear",
  "tarjeta.pieza.luces": "Navigation lights",
  "tarjeta.luz.navegacion": "Navigation lights",
  "tarjeta.luz.baliza": "Beacon",
  "tarjeta.luz.estroboscopicas": "Strobes",
  "tarjeta.luz.aterrizaje": "Landing lights",
  "tarjeta.corta.pitotMorro": "Pitot tubes",
  "tarjeta.corta.motorPiston": "Piston engine",
  "tarjeta.corta.motorRadial": "Radial engine",
  "tarjeta.corta.turbohelice": "Turboprop",
  "tarjeta.corta.reactor": "Jet engine",
  "tarjeta.corta.trenFijo": "Fixed landing gear",
  "tarjeta.corta.matricula": "Registration",
  "tarjeta.tamano": "Compare the size",
  "tarjeta.tamano.colectivos": "As long as {n} buses in a row",
  "tarjeta.tamano.uno": "As long as a bus",
  "tarjeta.tamano.menos": "Shorter than a bus",
  "tarjeta.matricula.nombre": "Registration {matricula}",
  "tarjeta.pais.ZP": "Paraguay",
  "tarjeta.pais.EC": "Spain",
  "tarjeta.alerones":
    "Ailerons. When one goes up, the other goes down: one wing lifts more and the other less, and the plane banks to turn.",
  "tarjeta.profundidad":
    "Elevator. It moves the tail up or down, and the nose with it: pull the stick and the nose comes up.",
  "tarjeta.timon":
    "Rudder. It pushes the tail to one side and the nose points the other way. You move it with the pedals.",
  "tarjeta.flaps":
    "Flaps. They slide out behind the wing and make it more curved and bigger, so it holds the plane up at a slower speed: for take-off and landing.",
  "tarjeta.aerofrenos":
    "Spoilers. They rise on top of the wing, slow the plane and spoil some lift: to come down without speeding up and, on the runway, to put the weight on the wheels so they brake.",
  "tarjeta.pitot":
    "Pitot tube. Air rushes straight into its tip, and the faster the plane flies, the harder it pushes. That's how airspeed is measured.",
  "tarjeta.pitotMorro":
    "Pitot tubes, one on each side of the nose: one for each pilot. Air rushes straight in, and the faster you go, the harder it pushes. That's how airspeed is measured.",
  "tarjeta.motorPiston":
    "Engine and propeller. The engine spins the propeller; its blades are little wings that push air backwards and pull the plane forwards.",
  "tarjeta.motorRadial":
    "Radial engine. Its cylinders sit in a circle, like the points of a star, and they spin the propeller, which pulls the plane.",
  "tarjeta.turbohelice":
    "Turboprop. Inside there's a turbine, like a jet's, but instead of blowing it spins the propeller.",
  "tarjeta.reactor":
    "Jet engine. It swallows air at the front, burns fuel and blows it out of the back very fast. The big fan at the front does most of the pushing.",
  "tarjeta.tren":
    "Landing gear. It comes down to land and folds away after take-off: tucked in, the air flows past better and the plane goes faster.",
  "tarjeta.trenFijo":
    "Fixed gear. It's always out: simpler and lighter, though it slows the plane down a little.",
  "tarjeta.luces":
    "Navigation lights: red on the left wingtip, green on the right and white on the tail. If at night you see the red and the green together, that plane is coming towards you.",
  "tarjeta.luzBaliza":
    "Beacon: the flashing red light. It goes on before the engine starts and says: this plane is alive, keep clear.",
  "tarjeta.luzEstrobos":
    "Strobes: very bright white flashes. They go on when entering the runway and stay on in flight, so other planes see you from far away.",
  "tarjeta.luzAterrizaje":
    "Landing lights. They go on on the runway and below ten thousand feet, where there are more planes and birds: so they can see you.",
  "tarjeta.matricula":
    "The registration is the plane's ID: no other plane in the world has the same one. ZP means Paraguay; EC, Spain. On the radio it's spelled out letter by letter.",
  "tarjeta.voz.alerones":
    "These are the ailerons. When you move the stick to one side, one goes up and the other goes down, and the plane banks to turn.",
  "tarjeta.voz.profundidad":
    "This is the elevator, on the tail. If you pull the stick, the tail goes down and the nose comes up.",
  "tarjeta.voz.timon":
    "This is the rudder. With the pedals, the tail swings one way and the nose points the other.",
  "tarjeta.voz.flaps":
    "These are the flaps. Lower them and the wing gets more curved and bigger, so it holds the plane up even when it's slower. They're for take-off and landing.",
  "tarjeta.voz.aerofrenos":
    "These are the spoilers. They rise on top of the wing to slow down in the air, and on the runway, to put the plane's weight on its wheels so it brakes better.",
  "tarjeta.voz.pitot":
    "This little tube is the pitot. Air goes in at the tip, and the faster you fly, the harder it pushes: that's how the plane knows its speed.",
  "tarjeta.voz.pitotMorro":
    "These little tubes on the sides of the nose are the pitots, one for each pilot. Air goes straight in, and the faster you fly, the harder it pushes: that's how speed is measured.",
  "tarjeta.voz.motorPiston":
    "Here's the engine. It spins the propeller, and the propeller, with blades like little wings, pulls the plane forwards.",
  "tarjeta.voz.motorRadial":
    "This is a radial engine: the cylinders sit in a circle, like the points of a star. It spins the propeller, and the propeller pulls the plane.",
  "tarjeta.voz.turbohelice":
    "This is a turboprop: inside there's a turbine, like a jet's, but instead of blowing, it spins the propeller.",
  "tarjeta.voz.reactor":
    "This is a jet engine. It swallows air at the front, burns fuel and blows it out of the back very fast. And the big fan at the front does most of the pushing.",
  "tarjeta.voz.tren":
    "This is the landing gear. It comes down to land, and after take-off it folds away inside: that way the air flows past better and the plane goes faster.",
  "tarjeta.voz.trenFijo":
    "This gear never folds away: it's always out. It's simpler and lighter, though it slows the plane down a little.",
  "tarjeta.voz.luces":
    "These are the navigation lights: red on the left, green on the right and white at the back. If at night you see the red and the green together, that plane is coming straight at you.",
  "tarjeta.voz.luzBaliza":
    "The beacon is the flashing red light. It goes on before the engine starts and tells everyone: keep clear, this plane is about to move.",
  "tarjeta.voz.luzEstrobos":
    "These white flashes go on when you enter the runway and stay on the whole flight, so other planes can see you from far away.",
  "tarjeta.voz.luzAterrizaje":
    "The landing lights go on for take-off, for landing, and whenever you fly below ten thousand feet, where there are more planes and birds: so they can see you.",
  "tarjeta.voz.matricula":
    "The registration is like the plane's ID card: no other plane in the world has the same one. The first letters say which country it's from: Z P is Paraguay, and E C is Spain.",
  // ── Before flying: the walk-around (item 125) and the weather (item 129) ──
  "vuelta.titulo": "The walk-around",
  "vuelta.abrir": "Walk around the plane",
  "vuelta.volver": "Back",
  "vuelta.seguir": "Keep walking around",
  "vuelta.lista": "Walk-around done",
  "vuelta.empezar":
    "Before we fly, we walk around the plane. Touch what's glowing.",
  "vuelta.entera": "Walk-around done! The plane is ready to fly.",
  "vuelta.pitot.nombre": "The pitot cover",
  "vuelta.pitot.globo": "Cover off: the pitot has to breathe.",
  "vuelta.pitot.voz":
    "This red cover protects the pitot while the plane is parked. It has to come off: with it on, the plane can't tell how fast it's going.",
  "vuelta.sondas.nombre": "The probes and their covers",
  "vuelta.sondas.globo": "Probes uncovered and undamaged.",
  "vuelta.sondas.voz":
    "These are the probes that measure speed. The covers come off, and we check they're clean and undamaged.",
  "vuelta.superficies.nombre": "The tail controls",
  "vuelta.superficies.globo": "They move freely.",
  "vuelta.superficies.voz":
    "The controls on the tail have to move freely, with nothing jamming them.",
  "vuelta.calzos.nombre": "The wheel and the chocks",
  "vuelta.calzos.globo": "Tyre inflated; chocks away.",
  "vuelta.calzos.voz":
    "Chocks are the wedges that stop the plane from rolling. They come out, and we check the tyre is properly inflated.",
  "vuelta.frenos.nombre": "Wheels and brakes",
  "vuelta.frenos.globo": "The brake pin sticks out: brake left.",
  "vuelta.frenos.voz":
    "On every wheel we check the tyre and the brake. While this little pin sticks out, the brake still has wear left.",
  "vuelta.combustible.nombre": "The fuel",
  "vuelta.combustible.globo": "Checked through the wing cap, and sumped: blue, no water.",
  "vuelta.combustible.voz":
    "Through this cap we look at how much fuel there is. And with the little cup we drain some from the bottom: it has to come out blue, with no water.",
  "vuelta.aceite.nombre": "The oil",
  "vuelta.aceite.globo": "The dipstick, between the two marks.",
  "vuelta.aceite.voz":
    "With the dipstick we check the engine oil: it has to sit between the two marks.",
  "vuelta.helice.nombre": "The propeller",
  "vuelta.helice.globo": "No nicks, no dents.",
  "vuelta.helice.voz":
    "We look at the propeller without handling it: no nicks, no dents. And never stand in front of it.",
  "vuelta.motores.nombre": "The engines",
  "vuelta.motores.globo": "Inlet and exhaust clear.",
  "vuelta.motores.voz":
    "We look into the engine inlet and the exhaust at the back: nothing inside, not a bird, not a rag.",
  "vuelta.puertas.nombre": "Doors and panels",
  "vuelta.puertas.globo": "All closed and latched.",
  "vuelta.puertas.voz":
    "Doors and panels that aren't in use have to be closed and latched before we go.",
  "vuelta.luces.nombre": "The lights",
  "vuelta.luces.globo": "Red on the left, green on the right: they work.",
  "vuelta.luces.voz":
    "We switch the lights on and check they all work: red on the left, green on the right and white at the back.",
  "pitot.noMarca": "The airspeed isn't moving: throttle back and brake, calmly.",
  "pitot.abortado":
    "Well done! Stopping was the right call. It was the pitot cover: back to the stand to take it off.",
  "pitot.enElAire":
    "We're flying without airspeed: attitude and power, nice and calm. We'll go round and land.",
  "pitot.volver": "Back to the stand",
  "parte.abrir": "Today's weather",
  "parte.titulo": "Today's weather",
  "parte.salida": "Departure",
  "parte.llegada": "Arrival",
  "parte.aVolar": "Let's fly!",
  "parte.meQuedo": "I'll stay today",
  "parte.salgoIgual": "Go anyway",
  "parte.ganaste": "You won today: good decision!",
  "parte.sinMetar": "no METAR: the usual weather here",
  "parte.propone.tormenta":
    "There's a thunderstorm over the field. Under a storm the wind changes all of a sudden, and nobody flies into a storm: better to stay, or wait for it to pass.",
  "parte.propone.visibilidad":
    "Visibility today is below the minimum for this plane. Without seeing, we couldn't find the runway again if we needed to: better to stay, or wait for it to clear.",
  "parte.propone.techo":
    "The clouds are lower than this plane's minimum. Up there we'd fly into them and wouldn't see the runway to come back: better to stay, or wait for them to lift.",
  "parte.propone.cruzado":
    "Today's crosswind is stronger than the one this plane was tested with. With more crosswind than it was tested for, we don't know how it behaves on touchdown: better to stay, or wait for it to ease.",
  "parte.propone.pista":
    "Today this plane needs more runway than there is, with the margin its manual asks for. No margin, no departure: better to stay, or wait for it to cool down or for the wind to change.",
  "parte.palabra.cruzado": "Crosswind",
  "parte.palabra.visibilidad": "Poor visibility",
  "parte.palabra.techo": "Low cloud",
  "parte.palabra.tormenta": "Thunderstorm",
  "parte.palabra.pista": "Runway too short",
  "parte.cifras.cruzado": "crosswind today: {hoy} · this plane, tested up to {limite}",
  "parte.cifras.visibilidad": "visibility today: {hoy} · this plane needs {limite}",
  "parte.cifras.techo": "cloud base today {hoy} · this plane needs {limite}",
  "parte.cifras.tormenta": "thunderstorm over the field today · no departing into a storm",
  "parte.cifras.pista": "runway needed today: {hoy} · this runway has {limite}",
  "parte.origen.demostrado": "demonstrated in its certification",
  "parte.origen.norma": "the minimum the rules require",
  "parte.origen.visual": "the minimum the rules require to fly by looking outside",
  "parte.origen.instrumentos": "the minimum the rules require for its approach",
  "parte.origen.manualEscuela": "its manual, with the training margin",
  "parte.origen.manualCertificacion": "its manual, with its certification margin",
  "parte.origen.tormenta": "nobody flies into a storm",
  "parte.esperar": "We'll wait a while",
  "parte.esperamos.voz": "We'll wait a while and look at the report again.",
  "parte.sigueIgual": "We looked again: no change",
  "parte.sigueIgual.voz":
    "We looked again and nothing has changed. We can wait a bit more, or stay: both are fine.",
  "parte.yaSePuede": "We looked again: now we can go!",
  "parte.yaSePuede.voz": "We looked again and it got better: now we can go.",
  "parte.salgoIgual.voz":
    "All right: we go, carefully. And if it's no good up there, we come back.",
  "inicio.modo.nombre": "Learn with Jazlyn",
  "inicio.modo.mama": "Jazlyn",
  "inicio.modo.ara": "Ara",
  "inicio.modo.seguir": "Keep flying",
  "inicio.modo.llave": "Start the engine",
  "inicio.ara.hola": "Mum, Mum, will you teach me to fly today?",
  "inicio.mama.hola":
    "Today you're the pilot, my love! I'm right here beside you. The plane waits for you at every step, and if something doesn't work, we just try again.",
  "inicio.ara.motor": "How do you switch the plane on, Mum?",
  "inicio.mama.motor": "First, the engine. Press the shining key and listen to it wake up.",
  "inicio.mama.motor.otra1": "Find the little key that's moving, sweetheart. Press it once, don't be scared.",
  "inicio.mama.motor.otra2":
    "The engine starts with the key. Do what the picture shows: one little tap, and that's it.",
  "inicio.ara.motor.bien": "It's on! Listen to it, Mum!",
  "inicio.mama.motor.bien": "That's it! That noise is the propeller spinning. Now we have an engine.",
  "inicio.ara.gas": "And now how do we make it go?",
  "inicio.mama.gas":
    "With the throttle. Do what the picture shows and give it full power: then the propeller pulls with all its strength.",
  "inicio.mama.gas.otra1":
    "The throttle is the engine with the little arrow pointing up. Go on, push it all the way up.",
  "inicio.mama.gas.otra2":
    "Look at the shining picture: that's the throttle. A bit more, my love, the plane is waiting.",
  "inicio.mama.gas.bien": "Very good! I'll hold the throttle for you. Look how fast we're going down the runway.",
  "inicio.ara.carrera": "Mum, we're going super fast! When do we fly?",
  "inicio.mama.carrera": "Not yet. A plane needs lots of speed before the air can lift it. I'll tell you when.",
  "inicio.mama.despegar": "Now! To take off, press the up arrow.",
  "inicio.mama.despegar.otra1":
    "The arrow pointing up, the shining one. Press it and the plane lifts its nose.",
  "inicio.mama.despegar.otra2": "The up one, my love, the one pointing at the sky. Try again, no rush.",
  "inicio.ara.despegar.bien": "We're flying! Look how tiny everything is!",
  "inicio.mama.despegar.bien":
    "You took off! That's how a real plane does it: first it runs, then it lifts its nose.",
  "inicio.ara.izquierda": "And how do I turn, Mum?",
  "inicio.mama.izquierda":
    "Planes don't turn like a car: they turn by tilting their wings. Press the left arrow.",
  "inicio.mama.izquierda.otra1":
    "The left arrow, sweetheart, the one shining in the picture. Press it and watch the wing.",
  "inicio.mama.izquierda.otra2":
    "Do what the picture shows: the arrow that points left, and the wing on that side goes down.",
  "inicio.mama.masRato1": "That's it! A little more: keep it pressed until the wing goes down.",
  "inicio.mama.masRato2": "You're doing well. Hold it a little longer, the plane tilts slowly.",
  "inicio.mama.izquierda.bien": "Yes! See how the wing on that side goes down? That's how you turn.",
  "inicio.ara.derecha": "Now I want to go the other way!",
  "inicio.mama.derecha": "Go on! Now the right arrow, the shining one.",
  "inicio.mama.derecha.otra1":
    "The right arrow, my love, the one on the other side. Press it and watch the wing change.",
  "inicio.mama.derecha.otra2":
    "Do what the picture shows: the arrow that points right, and the plane turns that way.",
  "inicio.mama.derecha.bien": "Perfect! Left and right: now you know how to turn.",
  "inicio.ara.nivelar": "Mum, how do I make it go straight?",
  "inicio.mama.nivelar":
    "We level the wings. Do what the picture shows, gently, until the plane is flat like a table.",
  "inicio.mama.nivelar.otra1":
    "Gently, sweetheart, until both wings are even, like your arms held out.",
  "inicio.mama.nivelar.otra2":
    "Look at the picture: a little bit the other way, and let go when the plane is straight.",
  "inicio.mama.nivelar.bien": "Nice and straight! Wings level: that's how you fly calmly.",
  "inicio.ara.fin": "Mum, Mum, look! I flew all by myself!",
  "inicio.mama.fin":
    "You flew, my love! You've earned your first stamp for your logbook. Now keep flying, the sky is yours.",
  "inicio.mama.finOtra":
    "What a lovely flight, my love! Your stamp from this field is already in your logbook. Now keep flying, the sky is yours.",
  "inicio.modo.aterrizar": "Land with Jazlyn",
  "inicio.modo.freno": "Brake",
  "inicio.ara.aterrizar.hola": "Mum, will you teach me to land today?",
  "inicio.mama.aterrizar.hola":
    "Today you're landing, my love! In the air a plane can't just stand still, so I'll fly it while I teach you.",
  "inicio.ara.aterrizar.gas": "So what's the first thing we do, Mum?",
  "inicio.mama.aterrizar.gas":
    "We're a little fast for landing. Do what the picture shows and give it a little less throttle.",
  "inicio.mama.aterrizar.gas.otra1":
    "The throttle, sweetheart, down a little: the engine eases off and the plane slows down.",
  "inicio.mama.aterrizar.gas.otra2":
    "Look at the shining picture: that's the throttle. One little tap down, no rush.",
  "inicio.mama.aterrizar.gas.bien":
    "That's it! Hear the engine calming down? Now we're at just the right speed to land.",
  "inicio.mama.aterrizar.gas.yo":
    "This time I'll bring the throttle back, watch the lever: just a little, and the engine calms down.",
  "inicio.ara.aterrizar.nariz": "And how do we get down to the runway?",
  "inicio.mama.aterrizar.nariz":
    "With the nose. Lower it a little, like in the picture, so it points at the runway through the hoops.",
  "inicio.mama.aterrizar.nariz.otra1":
    "The nose down a little, my love, looking at the runway. The plane goes through the hoops.",
  "inicio.mama.aterrizar.nariz.otra2":
    "Do what the picture shows: one little tap down, and the nose points at the runway.",
  "inicio.ara.aterrizar.nariz.bien": "Mum, look! The hoops are turning green!",
  "inicio.mama.aterrizar.nariz.bien":
    "Because we're right on the little path! That's how you come down to a runway: gently and straight.",
  "inicio.mama.aterrizar.nariz.yo":
    "This time I'll lower the nose, watch: just a little, and it points at the runway.",
  "inicio.ara.aterrizar.aros": "Mum, why are there hoops in the sky?",
  "inicio.mama.aterrizar.aros":
    "They're for learning: they draw the little path down to the runway. At airports, that path is shown by lights beside the runway.",
  "inicio.ara.aterrizar.senda": "Mum, the runway keeps getting bigger and bigger!",
  "inicio.mama.aterrizar.senda":
    "That's because we're nearly there. When we're down low, I'll take the throttle off and you lift the nose, gently, so we settle.",
  "inicio.mama.aterrizar.recogida": "Now! Lift the nose a little, gently, gently.",
  "inicio.ara.aterrizar.toque": "We touched the ground, Mum! I didn't even feel it!",
  "inicio.mama.aterrizar.recogida.bien":
    "You landed! The back wheels first, nice and soft, just like a real plane.",
  "inicio.mama.aterrizar.recogida.yo":
    "We've landed! This time I lifted the nose. Next time, you lift it.",
  "inicio.ara.aterrizar.frenar": "And now how do we stop the plane, Mum?",
  "inicio.mama.aterrizar.frenar":
    "With the brake, like in a car. Press the brake in the picture and I'll help you stop.",
  "inicio.mama.aterrizar.frenar.otra1":
    "The brake, sweetheart, the shining picture. Press it and the plane slows to a stop.",
  "inicio.mama.aterrizar.frenar.otra2":
    "Find the brake in the picture and press it once, don't be scared. The runway is long.",
  "inicio.mama.aterrizar.frenar.bien":
    "Very good! Look how we're braking, gently and right down the middle of the runway.",
  "inicio.ara.aterrizar.fin": "We did it, Mum! We landed on the runway!",
  "inicio.mama.aterrizar.fin":
    "You landed, my love! You've earned your first stamp for your logbook. Whenever you like, we'll fly again.",
  "inicio.mama.aterrizar.finOtra":
    "What a lovely landing, my love! This field's stamp is already in your logbook. Whenever you like, we'll fly again.",
  "inicio.modo.pasaje": "Travel with Jazlyn",
  "inicio.modo.tripulacion": "The cabin crew, over the PA",
  "inicio.modo.megafonia": "Jazlyn, over the PA",
  "inicio.modo.volver": "Back to the hangar",
  "inicio.ara.pasaje.ventanilla": "I got the window seat! From here I can see the plane's wing, and the engine.",
  "inicio.tripulacion.pasaje.cinturon":
    "Ladies and gentlemen, welcome aboard. Please take your seats and fasten your seat belts: low and tight.",
  "inicio.ara.pasaje.cinturon": "Click! My seat belt's done up, nice and low and tight.",
  "inicio.ara.pasaje.puertas": "They've closed the plane's door. We're off!",
  "inicio.ara.pasaje.motores": "Listen! The engines have started: they sound like a giant hair dryer.",
  "inicio.ara.pasaje.comandante": "That's Mum! The captain, way up front in the cockpit.",
  "inicio.ara.pasaje.espera": "Why have we stopped here, before the runway?",
  "inicio.mama.pasaje.espera":
    "Ladies and gentlemen, we'll be taking off shortly. Before entering the runway, we always wait for permission from the control tower.",
  "inicio.ara.pasaje.despegue": "Now we're really taking off! I'm watching out the window.",
  "inicio.ara.pasaje.carrera": "Whoa, what a push! It's pressing me into my seat, and we're going super fast!",
  "inicio.ara.pasaje.volando": "We're flying! The houses and cars look teeny-tiny.",
  "inicio.ara.pasaje.nubes": "Everything's white! We're inside a cloud. What's it made of?",
  "inicio.ara.pasaje.nubesAbajo": "We've gone past the clouds! Now we can see them from above. What are they made of?",
  "inicio.mama.pasaje.nubes":
    "Ladies and gentlemen, this is your captain speaking. For those of you flying for the first time today: the clouds we went through on the way up are made of water, millions of droplets so tiny and light that the air holds them up.",
  "inicio.ara.pasaje.niebla": "Water! So a cloud is like fog, only way up high.",
  "inicio.ara.pasaje.servicio": "They're bringing something yummy to eat! I want to try a little bit.",
  "inicio.ara.pasaje.teide": "I can see it! It's huge, and the top sticks out above the clouds.",
  "inicio.ara.pasaje.garajonay": "Talking by whistling? I want to learn to whistle like that too!",
  "inicio.ara.pasaje.orotava": "What a big valley! It goes all the way from the mountain down to the sea.",
  "inicio.ara.pasaje.loVeo": "I can see it! From up here everything looks tiny.",
  "inicio.ara.pasaje.oidos": "My ears feel a bit blocked... I wonder why?",
  "inicio.tripulacion.pasaje.oidos":
    "Ladies and gentlemen, if your ears feel blocked as we descend, that's normal: the air pressure is changing. Swallowing or yawning helps to clear them.",
  "inicio.ara.pasaje.bostezo": "I did a great big yawn, and my ears popped!",
  "inicio.ara.pasaje.isla": "I can see the island we're going to! What tall mountains it has!",
  "inicio.ara.pasaje.flaps": "Look at the wing! A piece is sliding out backwards and down.",
  "inicio.ara.pasaje.toma": "We touched the ground! And listen to the engines roar now!",
  "inicio.mama.pasaje.reversa":
    "And for those of you who flew for the first time today: that loud engine noise when we landed was for braking. The engines push the air forwards, and that slows the plane down.",
  "inicio.ara.pasaje.fin": "We made it to La Palma! Now I'll tell Mum everything I saw out the window.",
  // The passenger flight told properly: the safety demonstration, the cabin crew in person, and more.
  "inicio.tripulacion.pasaje.demo.intro":
    "Ladies and gentlemen, may we have your attention for a moment: we're going to show you the safety equipment on this aircraft.",
  "inicio.tripulacion.pasaje.demo.cinturon":
    "To fasten your seat belt, push the buckle in until you hear a click, tighten it by pulling the strap, and release it by lifting the flap.",
  "inicio.tripulacion.pasaje.demo.salidas":
    "This aircraft has emergency exits at the front, at the back and over the wings. Lights along the floor of the aisle mark the way to them.",
  "inicio.tripulacion.pasaje.demo.mascaras":
    "If needed, oxygen masks will drop from the ceiling. Pull one towards you, place it over your nose and mouth, and breathe normally. Put on your own first, and then help anyone who needs it.",
  "inicio.tripulacion.pasaje.demo.chaleco":
    "Your life jacket is under your seat. Slip it over your head and fasten it around your waist. Don't inflate it inside the aircraft: inflate it as you leave, by pulling the red tabs.",
  "inicio.tripulacion.pasaje.demo.tarjeta":
    "In the seat pocket in front of you is the safety card, with all of this in pictures. Please read it before take-off.",
  "inicio.tripulacion.pasaje.demo.aparatos":
    "And phones and electronic devices in flight mode for the whole flight. Thank you for your attention.",
  "inicio.ara.pasaje.demoMascara": "The grown-ups put their masks on first, and then mine! That way they can help me.",
  "inicio.ara.pasaje.demoChaleco": "There's a yellow life jacket under my seat. And it only gets inflated outside the plane!",
  "inicio.ara.pasaje.demoTarjeta": "I found the card in the pocket in front! It has little pictures of everything.",
  "inicio.tripulacion.pasaje.cerca.revision":
    "Hi there! Let me check that seat belt... perfect, that's how it's worn! And the window blind always goes up for take-off.",
  "inicio.ara.pasaje.persiana": "And why does the window blind have to be up for take-off?",
  "inicio.tripulacion.pasaje.cerca.persiana":
    "So we can see outside if anything happens. And at night we dim the cabin lights, so our eyes are already used to the dark outside.",
  "inicio.ara.pasaje.tren": "Something went clunk under the plane! It's the wheels, tucking away so we can fly.",
  "inicio.ara.pasaje.plop": "Pop! My ears went pop, like in the lift of a really tall building.",
  "inicio.ara.pasaje.giroAbajo": "We're turning! The plane is leaning over, and my wing is pointing down.",
  "inicio.ara.pasaje.giroArriba": "We're turning! The plane is leaning over, and my wing is pointing up at the sky.",
  "inicio.ara.pasaje.bici": "Mum says planes lean over to turn, like a bike going round a bend.",
  "inicio.ara.pasaje.marArriba": "I'm pressing my face to the window to see more! Down there, between the clouds, there's the sea.",
  "inicio.ara.pasaje.preguntaAla": "How can such a big, heavy plane fly without falling down?",
  "inicio.mama.pasaje.ala":
    "Ladies and gentlemen, for those of you flying for the first time today: how does such a heavy plane stay up in the air? The wings are tilted just a little and push the air downwards, and the air pushes the wings upwards. That's why we have to go fast.",
  "inicio.ara.pasaje.pandorga": "Like a kite! The wind pushes it upwards, and up and up it goes.",
  "inicio.ara.pasaje.preguntaAlto": "How high and how fast are we flying now?",
  "inicio.mama.pasaje.altoRapido":
    "And for those of you flying for the first time today: we're now higher than the summit of Mount Teide, and going at more than five hundred kilometres an hour, much faster than any car.",
  "inicio.ara.pasaje.altoRapido": "Higher than Mount Teide! No wonder the mountains look like toys from up here.",
  "inicio.tripulacion.pasaje.cerca.hola":
    "Hello again! Here's some water and something tasty. I saw you looking at the clouds out the window: is this your first flight?",
  "inicio.ara.pasaje.deVerdad": "Yes, it's my first flight! Are clouds really made of water?",
  "inicio.tripulacion.pasaje.cerca.nubes1":
    "They really are! A cloud is millions of tiny droplets of water, so small you can't see them one by one, and the air holds them up.",
  "inicio.tripulacion.pasaje.cerca.nubes2":
    "And very high up, where it's very cold, they're tiny ice crystals. They look white because the droplets scatter all of the sunlight.",
  "inicio.tripulacion.pasaje.cerca.nubes3":
    "When we fly through them, everything turns white, the plane moves a little, and sometimes the window gets wet. That's fine: the plane is made for it.",
  "inicio.ara.pasaje.nubesSostiene": "Water that the air holds up in the sky! Now I'll look at clouds differently.",
  "inicio.tripulacion.pasaje.cerca.frio":
    "Guess what? Outside, this high up, it's as cold as a freezer, below zero. In here we take air from outside and warm it up, so we're comfortable.",
  "inicio.ara.pasaje.frio": "It's freezer-cold outside, and nice and warm in here!",
  "inicio.tripulacion.pasaje.cerca.motor1":
    "Can you see the engine, there under the wing? At the front it has a giant fan that swallows loads and loads of air.",
  "inicio.tripulacion.pasaje.cerca.motor2":
    "Inside, the air is squeezed, heated up with the fuel, and shoots out of the back at top speed. That pushes the plane forwards.",
  "inicio.ara.pasaje.secador": "Like a hair dryer: a fan that blows warm air, only giant!",
  "inicio.ara.pasaje.preguntaBajar": "And how does the plane go down? Do they switch the engines off?",
  "inicio.mama.pasaje.bajando":
    "Ladies and gentlemen, for those of you flying for the first time today: to come down, we don't switch the engines off. We turn them right down, and the plane comes down little by little, like on a very long slide.",
  "inicio.tripulacion.pasaje.cerca.islas1":
    "Did you know the Canary Islands came up from the bottom of the sea? They're volcanoes that kept growing, for millions of years, until they poked out.",
  "inicio.tripulacion.pasaje.cerca.islas2":
    "La Palma, where we're going, is one of the youngest, and it has really high mountains.",
  "inicio.ara.pasaje.islas": "Islands that used to be volcanoes at the bottom of the sea! I'm going to tell everyone.",
  "inicio.tripulacion.pasaje.cerca.ruta":
    "And how does the plane know the way? The captain and the co-pilot have the map on a screen, and they talk to the control tower by radio.",
  "inicio.ara.pasaje.mapa": "Like the map on a phone, but for planes! And with the tower on the radio.",
  "inicio.tripulacion.pasaje.cerca.papi":
    "Beside the runway there are four little lights. If you see two white and two red, the plane is coming down right on its path.",
  "inicio.ara.pasaje.papi": "Two white and two red! I'm going to look for them when I fly with Mum.",
  "inicio.ara.pasaje.sobreLaIsla": "We're flying over the island! You can see the mountains and the ravines.",
  "inicio.ara.pasaje.marQuieto": "From this high up, the sea looks so still. But up close it has waves!",
  "inicio.ara.pasaje.nubesCerca": "We're getting lower and lower: the clouds are really close now!",
  "inicio.ara.pasaje.bano": "What if I need the toilet? Is there a toilet on the plane?",
  "inicio.tripulacion.pasaje.cerca.bano":
    "Of course there is! But right now, with the seat belt light on, it's best to wait until we land.",
  "inicio.tripulacion.pasaje.cerca.estrellas":
    "Do you know what's at the very top of La Palma? Huge telescopes for looking at the stars: the island's sky is one of the clearest in the world.",
  "inicio.ara.pasaje.estrellas": "Giant telescopes for looking at the stars! I want to see one up close.",
  "inicio.ara.pasaje.islaCerca": "The island is really close now! You can see the mountains, the coast and the sea.",
  "inicio.ara.pasaje.otraNube": "Inside a cloud again, everything white! Now I know it's water.",
  "inicio.ara.pasaje.marAbajo": "I'm pressing my face to the window to see more! Down there is the sea, huge and dark blue.",
  "inicio.tripulacion.pasaje.cerca.aterrizaje":
    "We're about to land: seat belt fastened, seat back upright and the window blind up. You're doing brilliantly!",
  "inicio.ara.pasaje.flapsPorque": "Mum told me that this way the wing holds the plane up even when it goes slowly.",
  "inicio.ara.pasaje.giroFinal": "Another turn! Now the plane is lined up straight, facing the runway.",
  "inicio.ara.pasaje.masDespacio": "Now the plane is going slower, getting ready to land. You can feel it!",
  "inicio.ara.pasaje.ruedas": "Another noise underneath! Now the wheels are coming out, for landing.",
  "inicio.ara.pasaje.miro": "Now I'm going to keep looking out the window until we touch the runway.",
  "inicio.ara.pasaje.cerquita": "The sea is getting closer and closer! It's not long now until the runway.",
  "inicio.ara.pasaje.yaCasi": "Almost there! The wheels are about to touch the runway.",
  "inicio.ara.pasaje.cinturonQuieto": "I'm not taking my seat belt off yet! We have to wait for the light to go out.",
  "inicio.ara.pasaje.despacito": "Now we're going slowly along the ground, like a car, to our parking spot.",
  "inicio.ara.pasaje.repaso": "That was lovely! The clouds from inside, the huge sea and the islands with mountains.",
  "inicio.tripulacion.pasaje.cerca.adios":
    "See you soon, and thank you for flying with us! Now you know loads of things about planes.",
  "inicio.modo.tripulante": "The cabin crew member, right beside you",
  "inicio.dibujo.cinturon": "The seat belt: fasten it until it clicks, tighten it, and lift the flap to release it.",
  "inicio.dibujo.salidas": "The plane's exits, and the lights along the aisle that lead to them.",
  "inicio.dibujo.mascara": "The oxygen masks: the grown-up puts one on first, and then helps.",
  "inicio.dibujo.chaleco": "The life jacket, under the seat: it's inflated outside the plane.",
  "inicio.dibujo.tarjeta": "The safety card, in the pocket of the seat in front.",
  "inicio.dibujo.modo-avion": "The phone in flight mode.",
  "inicio.dibujo.persiana": "The window blind up for take-off, so you can see outside.",
  "inicio.dibujo.nube": "A cloud up close: water droplets below and tiny ice crystals above.",
  "inicio.dibujo.ala": "The wing pushes the air down, and the air pushes the wing up.",
  "inicio.dibujo.alto": "The plane, higher than Mount Teide and faster than a car.",
  "inicio.dibujo.motor": "Inside the engine: it swallows air, heats it and blows it out the back.",
  "inicio.dibujo.frio": "Below zero outside; warm inside.",
  "inicio.dibujo.islas": "Volcanoes growing up from the bottom of the sea until they become islands.",
  "inicio.dibujo.ruta": "The plane's route, from Tenerife to La Palma, and the tower on the radio.",
  "inicio.dibujo.oido": "The ear: coming down, the air pushes in; swallowing or yawning clears it.",
  "inicio.dibujo.papi": "The four lights beside the runway: two white and two red.",
  "inicio.dibujo.estrellas": "The telescopes at the top of La Palma, looking at the stars.",
  "inicio.dibujo.meneo": "Inside the cloud the air goes up and down, the wings bend a little and the seat belt is on.",
  "inicio.dibujo.techo": "The base of the clouds, the plane just below it, how far it is to the sea and how far you can see.",
  // The travel kit: see `src/flight/kit-de-viaje.ts`.
  "inicio.tripulacion.pasaje.cerca.kitAqui":
    "Look what I've brought you: your travel kit, with two games inside! We always carry a few on board.",
  "inicio.tripulacion.pasaje.cerca.kitRato":
    "Flying is exciting, but flights take a little while. With this, the time to La Palma will fly by.",
  "inicio.ara.pasaje.kitGracias": "Thank you! Shall we play? Tap the little backpack and we'll pick one of the games.",
  "inicio.ara.pasaje.kit.elegir": "There are two games: building the plane, or drawing the route of our flight. Which one do you want?",
  "inicio.ara.pasaje.kit.piezas.empezar": "Will you help me build the plane? Grab each piece and take it to its place.",
  "inicio.ara.pasaje.kit.piezas.ala": "The wing! It pushes the air down, and the air pushes it up: that's what holds us up.",
  "inicio.ara.pasaje.kit.piezas.motor":
    "The engine! It swallows air at the front and blows it out the back really hard: that moves the plane forward.",
  "inicio.ara.pasaje.kit.piezas.cola":
    "The tail! It keeps the plane flying straight, like the feathers on an arrow, and its rudder turns the nose from side to side.",
  "inicio.ara.pasaje.kit.piezas.ruedas":
    "The wheels! They're for running along the runway and for landing. In the air, they're tucked away inside the plane.",
  "inicio.ara.pasaje.kit.piezas.ayuda": "Almost! That piece goes somewhere else on the plane: look at the one that's shining.",
  "inicio.ara.pasaje.kit.piezas.fin": "We built the whole plane! With wing, engine, tail and wheels, it's ready to fly.",
  "inicio.ara.pasaje.kit.camino.empezar":
    "We set off from number one, in Tenerife. Tap the numbers in order and we'll draw the plane's route.",
  "inicio.ara.pasaje.kit.camino.teide": "Two, the Teide! It's the highest volcano in Spain, and it peeks out above the clouds.",
  "inicio.ara.pasaje.kit.camino.gomera": "Three, La Gomera! It's a round little island where people still talk by whistling.",
  "inicio.ara.pasaje.kit.camino.palma": "Four, La Palma! That's where we land. We've drawn the whole route of our flight.",
  "inicio.ara.pasaje.kit.camino.ayuda": "That number comes later. First tap the one that's shining.",
  "inicio.tripulacion.pasaje.cerca.kitGuardar":
    "Now put the kit away in the seat pocket, because we're about to land: everything neatly stowed.",
  // What is seen, when it happens: see `src/flight/inicio-pasaje.ts`.
  "inicio.ara.pasaje.meneo": "Whoa, the plane is moving a little! And the wing goes up and down, as if it were waving.",
  "inicio.mama.pasaje.meneo":
    "Ladies and gentlemen, this is your captain. What you can feel is the air inside the cloud, going up and down: that's normal. The wings are made to bend a little, and that's why they move. And that's why we keep our seat belts fastened.",
  "inicio.ara.pasaje.meneoBien": "So it's normal for it to move! And my seat belt is on, nice and snug.",
  "inicio.mama.pasaje.teide":
    "Ladies and gentlemen, for those who don't know it: Teide is the volcano of Tenerife, and at three thousand seven hundred and fifteen metres it's the highest mountain in Spain.",
  "inicio.ara.pasaje.bajoLasNubes":
    "We came out under the clouds! Now they're above us, like a ceiling, and down below you can see really far.",
  "inicio.tripulacion.pasaje.cerca.techo":
    "See? The bottom of the clouds is called the base. And when they cover more than half the sky, pilots call it the ceiling.",
  "inicio.tripulacion.pasaje.cerca.techoHoy":
    "Today the base is at about five thousand feet, fifteen hundred metres. We're just below it, so that's roughly how far we are from the sea.",
  "inicio.tripulacion.pasaje.cerca.visibilidad":
    "Below the clouds you can see really far, more than ten kilometres: that's the visibility. To land, pilots need to see the runway in time.",
  "inicio.ara.pasaje.techo":
    "Mum taught me that the bottom of the clouds is called the base, and that to land you have to see the runway in time!",
  "inicio.ara.pasaje.marDeNubes":
    "Look down: clouds and more clouds, like a sea of cotton wool! That's why they call it a sea of clouds.",
  "inicio.ara.pasaje.sigueLaNube":
    "We're still inside the cloud and the plane is moving a little. But I know it's normal, and my seat belt is on!",
  "inicio.ara.pasaje.dormirse": "Aaah, the hum of the engine makes me so sleepy! I'm going to close my eyes for a bit.",
  "inicio.tripulacion.pasaje.cerca.despertar":
    "Wake up, we're about to start going down: seat belt nice and snug. When you sleep you swallow less, and on the way down your ears feel it.",
  "inicio.ara.pasaje.despertarse": "Oops, I fell asleep for a bit! And meanwhile, the plane kept flying along its route.",
  "inicio.siesta": "Ara naps for a bit and dreams, while the plane keeps flying its route.",
  // What you hear change, explained: the engines in each part of the flight, and the ears on the way up.
  "inicio.ara.pasaje.menosGas": "Listen! The engines sound quieter now, and we're still climbing just the same.",
  "inicio.mama.pasaje.menosGas":
    "For those of you flying for the first time today: shortly after take-off we took off a little power, and the engines got quieter. Climbing doesn't need as much strength as taking off.",
  "inicio.tripulacion.pasaje.cerca.plop1":
    "And on the way up, did your ears go pop? That's normal: the air pressure in the cabin goes down, and the air inside your ear comes out.",
  "inicio.tripulacion.pasaje.cerca.plop2":
    "That's the pop. If you feel it, swallow or yawn: that way the pressure inside your ear evens out with the cabin.",
  "inicio.ara.pasaje.ralenti": "The engines sound even quieter now! Does that mean we're starting to go down?",
  "inicio.ara.pasaje.oidosAlReves": "Now my ears feel a bit blocked! It's the other way round from going up: the air has to get in.",
  "inicio.ara.pasaje.masGas": "Now the engines sound louder! What for, if we're about to land?",
  "inicio.mama.pasaje.masGas":
    "And just before touchdown, the engines got louder: with the wheels and the flaps out, the plane slows down a lot, and it needs more power so as not to lose speed.",
  "inicio.ara.pasaje.vueltaEnPista": "We're turning round on the runway! We're going back the same way.",
  "inicio.mama.pasaje.vueltaEnPista":
    "And for those of you flying for the first time today: we turned round on the runway because the exits to the terminal were behind us, and there are none further on. At the end of the runway there's a wider bit for turning round.",
  "inicio.mama.pasaje.permisoDeVuelta":
    "To go back along the runway the other way, we need permission from the control tower: while we're on it, nobody else can land or take off.",
  "inicio.ara.pasaje.seLevantan": "Listen! Some people are already undoing their seat belts and standing up.",
  "inicio.ara.pasaje.luzApagada": "The seat belt light's gone off! Now I can take mine off: click!",
  "inicio.tripulacion.pasaje.cerca.gracias":
    "Thank you for waiting with your seat belt on until the light went off! While the plane is still moving, it can brake suddenly.",
  "inicio.tripulacion.pasaje.cerca.maleteros":
    "And take care when you open the lockers up above: bags may have moved during the flight, and they can fall out.",
  "inicio.tripulacion.pasaje.cerca.seria":
    "And do you know why we look so serious when we land? Because we're working, and safety comes first. I keep my seat belt on too until the plane stops: that's why we remind everyone over the speaker.",
  "inicio.tripulacion.pasaje.cerca.oficio1":
    "Do you know what? The most important part of my job isn't bringing water: it's safety. I know how to look after someone who feels unwell, and even help their heart with the defibrillator we carry on board.",
  "inicio.tripulacion.pasaje.cerca.oficio2":
    "And I know how to put out a fire wearing a smoke hood, get everyone off the plane in ninety seconds and use the life jackets in the water. We practise it every year.",
  "inicio.ara.pasaje.uniforme": "So your uniform isn't for serving: it's for looking after all of us!",
  "inicio.kit.nombre": "Travel kit",
  "inicio.kit.abrir": "Open the travel kit",
  "inicio.kit.cerrar": "Put the kit away",
  "inicio.kit.elegir": "Back to the games",
  "inicio.kit.piezas": "Build the plane",
  "inicio.kit.camino": "The plane's route",
  "inicio.kit.pausa": "The announcement is on: listen",
  "inicio.kit.pieza.ala": "The wing",
  "inicio.kit.pieza.motor": "The engine",
  "inicio.kit.pieza.cola": "The tail",
  "inicio.kit.pieza.ruedas": "The wheels",
  "inicio.kit.sitio.ala": "The wing's place",
  "inicio.kit.sitio.motor": "The engine's place",
  "inicio.kit.sitio.cola": "The tail's place",
  "inicio.kit.sitio.ruedas": "The wheels' place",
  "inicio.kit.parada.tenerife": "One: Tenerife, where we set off",
  "inicio.kit.parada.teide": "Two: the Teide",
  "inicio.kit.parada.gomera": "Three: La Gomera",
  "inicio.kit.parada.palma": "Four: La Palma, where we're going",
};
