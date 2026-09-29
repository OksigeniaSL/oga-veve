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
  "app.tagline": "Fly over Paraguay",

  "hud.speed": "Airspeed",
  "luz.terreno": "TERRAIN",
  "luz.perdida": "STALL",
  "luz.rapido": "OVERSPEED",
  "luz.tren": "GEAR",
  "luz.combustible": "FUEL LOW",
  "luz.frustrada": "GO AROUND",
  "luz.piloto": "A/P OFF",
  "luz.freno": "PARK BRK",
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
    "A short tap on the arrow leaves the nose a little higher or lower, and it stays: that's the trim, TRIM. Held down, the arrow is the stick and springs back when you let go. On a gamepad, the D-pad.",
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
  "torre.canario.alAire": "{indicativo}, go around",
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
  "vuelo.alineando": "Line up on the centreline",
  "vuelo.minimos": "Look at the runway: can you see it?",
  "vuelo.noEstabilizada": "Not like this: go around and try again",
  "motivo.sinPista": "The runway is not in sight",
  "motivo.lento": "Too slow",
  "motivo.cayendo": "Coming down too fast",
  "motivo.rapido": "Too fast",
  "motivo.torcido": "Not lined up",
  "motivo.descolocado": "Off the centreline",
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
  "circuito.base": "Turn base and start down: we are landing now",
  "vuelo.papiAlto": "Whites: you are high, come down",
  "vuelo.lentoYBajo": "You are slow: add power",
  "vuelo.papiBajo": "Reds: you are low, climb",
  "vuelo.papiBien": "Two red, two white: on the glide path",
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
  "hud.pilotoAutomatico": "Autopilot",
  "hud.trimArriba": "Trim, nose up",
  "hud.trimAbajo": "Trim, nose down",
  "version.nueva": "A new version is ready",
  "avion.noCabeAqui": "No other aircraft fits on this runway",
  "avion.cambiarParado": "Stop on the ground to change aircraft",
  "hud.mandarCinturon": "Seatbelt sign",
  "hud.subirCuadro": "Raise the panel",
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
  "vuelo.despacio": "Slow down",
  "vuelo.alto": "Stop here",
  "vuelo.teLoPasaste": "You went past. Brake and come back",
  "vuelo.yaPodesTocar": "You can touch down now",
  "vuelo.quitaElGas": "Throttle to idle",
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
  "hangar.nocabe.largo": "needs {pide} m, has {hay} m",
  "hangar.nocabe.ancho": "needs {pide} m wide, has {hay} m",
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

  "tactil.palanca": "Stick",
  "tactil.timon": "Rudder",
  "tactil.motor": "Throttle",
  "galon.manga": "This flight\u2019s stripes",
  "galon.aproximacion": "Approach stripe",
  "galon.toma": "Landing stripe",
  "galon.aros": "Rings stripe",
  "galon.velocidad": "Speed stripe",
  "galon.rodaje": "Taxi stripe",
  "galon.frustrada": "Go-around stripe",

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
};
