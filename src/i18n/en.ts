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
  "palabra.laPista": "Runway?",
  "palabra.cuidado": "Careful!",
  "palabra.mira": "Look!",
  "tcas.hora": "at {hora} o'clock",
  "tcas.hora.1": "at one o'clock",
  "tcas.arriba": "Traffic {donde}, {cuanto} above",
  "tcas.abajo": "Traffic {donde}, {cuanto} below",
  "tcas.nivel": "Traffic {donde}, same level",
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
  "vuelo.tomaLarga": "Not like this: we go around and try again",
  "vuelo.tomaLargaSinPista": "Not enough runway to stop: we go around and try again",
  "vuelo.aterrizasteContraLaOrden":
    "The tower had sent us around. When the tower says go around, you go: it sees what we can't see from here",
  "vuelo.rotar": "Pull up and fly",
  "vuelo.comprometido": "We're flying now — keep going",
  "vuelo.despegando": "Full power",
  "vuelo.enVuelo": "Go for a fly",
  "vuelo.enVueloAterrizando": "Head for the runway",
  "vuelo.enVueloDestino": "Follow the arrow to the next airport",
  "vuelo.final": "Come down gently",
  "vuelo.terrenoBajo": "You are very low",
  "vuelo.terrenoSube": "Terrain. Pull up",
  "vuelo.perdida": "Stall. Lower the nose",
  "vuelo.trafico.delante": "Look ahead: there's another plane nearby",
  "vuelo.trafico.izquierda": "Look to your left: there's another plane nearby",
  "vuelo.trafico.derecha": "Look to your right: there's another plane nearby",
  "vuelo.trafico.detras": "There's another plane nearby, behind you",
  "vuelo.traficoArriba":
    "That diamond on the screen is another plane. It's higher than us: it's no bother",
  "vuelo.traficoAbajo":
    "That diamond on the screen is another plane. It's lower than us: it's no bother",
  "vuelo.traficoNivel":
    "That diamond on the screen is another plane. It's at our height, but far away: we keep an eye on it",
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
  "vuelo.pilotoEnTierra": "The autopilot engages in the air",
  "vuelo.empezamosABajar": "Top of descent: we start down now, nice and easy",
  "comandante.nivelMasTranquilo":
    "Ladies and gentlemen, this is your captain. Because of the bumps we asked air traffic control for another level, and we've climbed for a smoother ride.",
  "comandante.bachesEnTodos":
    "Ladies and gentlemen, this is your captain. We checked other levels with air traffic control, but it's bumpy at all of them. That's normal: please keep your seat belts fastened.",
  "vuelo.alturaDeLaTorre":
    "The tower gave us how high to climb. I set it in the altitude window, in magenta: we climb up to there and stay.",
  "vuelo.alturaDeLaTorreRaya": "The tower tells us how high to climb: up to the line on the tape.",
  "vuelo.otraAlturaDeLaTorre": "The tower lets us climb a bit more. The new altitude is already set.",
  "vuelo.tonoDeAltitudCerca":
    "That tone means we're nearly at the ALT window altitude. That's where we level off.",
  "vuelo.tonoDeAltitudFuera":
    "That tone means we've drifted off the ALT window altitude. Ease back to it, gently.",
  "vuelo.masAltoQueElPlan":
    "We're higher than the plan: there's more to come down, so we'll start down earlier.",
  "palabra.aBajar": "Descend",
  "vuelo.mandanFrustrar": "Runway occupied: go around and rejoin the circuit",
  "hud.cotaDeLaPista":
    "The runway we're heading to is {cota} above sea level: what the altimeter reads minus that is how high you are above it",
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
  "vuelo.consejo.masGas": "A little more power, up to the pink mark. Keep the nose still.",
  "vuelo.consejo.menosGas": "A little less power, down to the pink mark.",
  "vuelo.consejo.narizAbajoPapi": "Nose a little down, until you see two white and two red.",
  "vuelo.consejo.narizArribaPapi": "Nose a little up, until you see two white and two red.",
  "vuelo.consejo.narizAbajoSenda": "Nose a little down, until the diamond is in the middle.",
  "vuelo.consejo.narizArribaSenda": "Nose a little up, until the diamond is in the middle.",
  "vuelo.consejo.narizArribaRitmo":
    "Nose a little up: we come down softer, to the pink mark on the vertical speed.",
  "vuelo.consejo.narizArribaSuave": "Nose a little up, to come down softer.",
  "vuelo.consejo.aerofrenos": "A little speed brake, down to the pink mark.",
  "vuelo.consejo.nivelarPerfil":
    "We're a little below the profile: come down softer, or level off a moment, until the diamond reaches the middle.",
  "vuelo.consejo.narizAbajoPerfil":
    "We're above the profile: nose a little down, until the diamond reaches the middle.",
  "vuelo.consejo.aerofrenosPerfil":
    "We're above the profile and the plane is already coming down as fast as it can: speed brakes out, until the diamond reaches the middle.",
  "vuelo.consejo.masGasPerfil":
    "We're a little below the profile: a touch of power, to come down softer, until the diamond reaches the middle.",
  "vuelo.consejo.menosGasPerfil":
    "We're above the profile: a little less power, to come down more, until the diamond reaches the middle.",
  "vuelo.consejo.masGasPapi":
    "A little low for the runway: a touch of power, nose still, until you see two white and two red.",
  "vuelo.consejo.masGasSenda":
    "A little low: a touch of power, nose still, until the diamond is in the middle.",
  "vuelo.consejo.menosGasPapi":
    "A little high for the runway: a little less power, nose still, until you see two white and two red.",
  "vuelo.consejo.menosGasSenda":
    "A little high: a little less power, nose still, until the diamond is in the middle.",
  "vuelo.consejo.masGasSuave": "We're coming down too steeply: a touch of power, to come down softer.",
  "vuelo.consejo.narizAbajoMarca": "We're slow: nose a touch down, up to the pink mark.",
  "vuelo.consejo.narizArribaMarca": "We're fast: nose a touch up, down to the pink mark.",
  "palabra.masGas": "More power",
  "palabra.menosGas": "Less power",
  "palabra.narizArriba": "Nose up",
  "palabra.narizAbajo": "Nose down",
  "vuelo.paso.subir": "We climb up to the height line, at the speed of the pink mark.",
  "vuelo.paso.acelerarGas": "Now we can go faster: more power, up to the pink mark.",
  "vuelo.paso.acelerarNariz": "Now we can go faster: nose a little down, up to the pink mark.",
  "vuelo.paso.frenarGas": "Now we slow down: less power, down to the pink mark.",
  "vuelo.paso.frenarAerofrenos": "Now we slow down: a little speed brake, down to the pink mark.",
  "vuelo.paso.frenarNariz":
    "Now we slow down: nose a little up, which slows us, down to the pink mark.",
  "vuelo.paso.mantener": "The pink mark changed and we're already at that speed: we keep it like this.",
  "vuelo.paso.marcaDelAutomatico":
    "The pink mark changed: the autopilot takes the engines there. Watch the lever move.",
  "vuelo.paso.crucero":
    "We're up: cruise power, to the mark on the engine. That takes us to the pink mark.",
  "vuelo.paso.cruceroConAutomatico":
    "We're up: cruise power, to the mark on the engine. And if you like, switch on the autopilot: it's the button that's pulsing.",
  "vuelo.paso.cruceroConGases":
    "We're up. The autopilot sets cruise power: watch the lever go by itself to the engine mark.",
  "vuelo.paso.bajar": "We start down: less power, and we come down gently to the height line.",
  "vuelo.paso.bajarConAutomatico":
    "We start down. The autopilot follows the path down to the height line: you check the speed stays on the pink mark.",
  "vuelo.paso.nivelar":
    "We've reached the line: we stay here, level, until the glide path comes to meet us.",
  "vuelo.paso.flaps1": "First flaps, one notch, and to the pink mark.",
  "vuelo.paso.flaps2": "Another notch of flaps, and to the pink mark.",
  "vuelo.paso.flaps3": "Landing flaps, all the way down, and to the pink mark.",
  "vuelo.paso.tren": "Gear down: we're about to land.",
  "vuelo.paso.recogerAerofrenos": "We're at the pink mark: speed brakes in.",
  "vuelo.paso.senda": "We're on final: nose along the glide path, and the speed on the pink mark.",
  "vuelo.paso.sendaConGases":
    "We're on final. The plane holds the power for the pink mark: you fly the nose along the glide path.",
  "vuelo.paso.sendaConAyuda":
    "We're on final. I'll hold the power for the pink mark: you fly the nose along the glide path.",
  "vuelo.paso.gasTuyo": "You moved the throttle: now the speed is yours, to the pink mark.",
  "palabra.crucero": "Cruise",
  "palabra.nivela": "Level off",
  "palabra.laSenda": "Glide path",
  "vuelo.paso.cotaAlMar":
    "The runway we're going to is almost at sea level: what the altimeter shows is nearly all we still have to come down.",
  "vuelo.paso.cotaEnAlto":
    "The runway we're going to is higher than the sea: what we still have to come down is what the altimeter shows minus the runway's number, the one under the tape.",
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
  "vuelo.tormenta": "Storm ahead: go around it, don't fly through",
  "palabra.tormenta": "Storm",
  "vuelo.baches":
    "It's getting bumpy: that's the air, like waves on water. The plane is built for this. Keep flying, calmly.",
  "vuelo.reserva":
    "Into reserve fuel. Stay calm: we are going to the nearest airport, follow the arrow",
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
  "cuaderno.sellos": "Your stamps",
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

  /*
   * El guion de la cabina: el plan y el descenso de la comandante, y la
   * tripulación. La voz está grabada en castellano, como el resto de la
   * megafonía; esto es lo que se lee en la tira. Ver `audio/megafonia.ts`.
   */
  "comandante.previsto.vuelo": "The flight will take about {n} minutes.",
  "comandante.previsto.nivel": "We'll be flying at {n} thousand feet.",
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
  "servicio.rotulo": "In-flight service",

  /*
   * Tapping a piece of the panel explains it, and the corner of flight
   * curiosities. See `ui/explicaciones-de-serie.ts`. The voice is not
   * recorded yet; see `PENDIENTE-VOCES-explicaciones.md`.
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
  "explica.tcas.texto":
    "Each diamond is another plane flying near your altitude. Hollow, it's around; filled, it's close. If it turns into an amber circle, TCAS warns you —traffic, traffic— and you look for it outside. The number is hundreds of feet: +10 is a thousand feet above, and −05 five hundred below. The little arrow says whether it is climbing or descending. Airliners also have a red square that tells you whether to climb or descend; here TCAS is in TA ONLY and only warns.",
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
    "There's the glide path diamond. If we keep it in the middle, we're heading nicely for the runway.",
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
};
