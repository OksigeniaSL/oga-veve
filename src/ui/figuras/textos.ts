/**
 * **Las palabras de las figuras, del diccionario.**
 *
 * Las figuras llegaron con sus palabras en castellano de España dentro del
 * código; aquí se sacan del diccionario —el castellano paraguayo y el inglés;
 * lo que no esté en guaraní cae al castellano, como el resto del juego— para
 * que una figura no tenga un idioma propio.
 *
 * **Lo que va en la esfera no se traduce**: «KNOTS» en el velocímetro y
 * «FEET» en el altímetro, como en los instrumentos de verdad, en Asunción y en
 * Tenerife. Es la regla 3 de AGENTS.md: quien aprenda aquí lo va a ver tal
 * cual el día que se siente en una cabina. Lo mismo «QNH», «hPa», «kt», «ft» y
 * la placa «FLAPS» del panel, que van fijos en el dibujo.
 */

import { t, type TranslationKey } from "../../i18n";
import type { TextosDelMotor } from "./motor-comun";
import type { PalabrasDelTurbofan } from "./turbofan";
import type { PalabrasDelTurbohelice } from "./turbohelice";
import { cifra } from "./figura";
import type { TextosDeLosFlaps } from "./flaps";
import type { TextosDeLosMandos } from "./mandos";
import type { TextosDelAltimetro } from "./altimetro";
import type { TextosDelPapi } from "./papi";
import type { TextosDelVelocimetro } from "./velocimetro";

export function textosDelPapi(): TextosDelPapi {
  return {
    dibujo: {
      caja: t("figura.papi.caja"),
      tapa: t("figura.papi.tapa"),
      lampara: t("figura.papi.lampara"),
      filtro: t("figura.papi.filtro"),
      lente: t("figura.papi.lente"),
      escala: t("figura.papi.escala"),
      notaLente: t("figura.papi.notaLente"),
      masDe: t("figura.papi.masDe"),
      menosDe: t("figura.papi.menosDe"),
      senda: t("figura.papi.senda"),
      bien: t("figura.papi.bien"),
      alto: t("figura.papi.alto"),
      bajo: t("figura.papi.bajo"),
      ariaPerfil: t("figura.papi.ariaPerfil"),
      ariaCabina: t("figura.papi.ariaCabina"),
      ariaLeyenda: t("figura.papi.ariaLeyenda"),
      ariaDespiece: t("figura.papi.ariaDespiece"),
    },
    bien: t("figura.papi.bien"),
    alto: t("figura.papi.alto"),
    bajo: t("figura.papi.bajo"),
    sendaLargo: t("figura.papi.sendaLargo"),
    altoLargo: t("figura.papi.altoLargo"),
    bajoLargo: t("figura.papi.bajoLargo"),
    nombre: t("figura.papi.nombre"),
  };
}

export function textosDelVelocimetro(): TextosDelVelocimetro {
  return {
    dibujo: {
      pitot: t("figura.velocimetro.pitot"),
      toma: t("figura.velocimetro.toma"),
      capsula: t("figura.velocimetro.capsula"),
      caja: t("figura.velocimetro.caja"),
      engranajes: t("figura.velocimetro.engranajes"),
      calefaccion: t("figura.velocimetro.calefaccion"),
      presionEstatica: t("figura.velocimetro.presionEstatica"),
      presionTotal1: t("figura.velocimetro.presionTotal1"),
      presionTotal2: t("figura.velocimetro.presionTotal2"),
      esfera: "KNOTS",
      gas: t("figura.velocimetro.gas"),
      hielo: t("figura.velocimetro.hielo"),
      aria: t("figura.velocimetro.aria"),
    },
    palabras: {
      parado: t("figura.velocimetro.parado"),
      despacio: t("figura.velocimetro.despacio"),
      rapido: t("figura.velocimetro.rapido"),
      rapidisimo: t("figura.velocimetro.rapidisimo"),
    },
    arcos: {
      blanco: t("figura.velocimetro.arcoBlanco"),
      verde: t("figura.velocimetro.arcoVerde"),
      amarillo: t("figura.velocimetro.arcoAmarillo"),
      rojo: t("figura.velocimetro.rayaRoja"),
      bajo: t("figura.velocimetro.bajoLosArcos"),
    },
    hielo: t("figura.velocimetro.hieloTapa"),
    gas: t("figura.velocimetro.gas"),
    nudos: t("figura.velocimetro.nudos"),
    hieloBoton: t("figura.velocimetro.hieloBoton"),
  };
}

export function textosDelAltimetro(): TextosDelAltimetro {
  return {
    dibujo: {
      toma: t("figura.altimetro.toma"),
      capsulas: t("figura.altimetro.capsulas"),
      caja: t("figura.altimetro.caja"),
      engranajes: t("figura.altimetro.engranajes"),
      pies: t("figura.altimetro.pies"),
      esfera: "FEET",
      ajuste: t("figura.altimetro.ajuste"),
      aria: t("figura.altimetro.aria"),
      // Las marcas de la regla, con el separador de miles del idioma.
      m3: cifra(3000),
      m6: cifra(6000),
      m9: cifra(9000),
      m12: cifra(12000),
    },
    suelo: t("figura.altimetro.suelo"),
    bajo: t("figura.altimetro.bajo"),
    alto: t("figura.altimetro.alto"),
    altisimo: t("figura.altimetro.altisimo"),
    pies: t("figura.altimetro.pies"),
    lee: (fina, corta, larga) => t("figura.altimetro.lee", { fina, corta, larga }),
    bien: t("figura.altimetro.bien"),
    mal: (pies) => t("figura.altimetro.mal", { pies }),
    marca: (pies) => t("figura.altimetro.marca", { pies }),
    avion: t("figura.altimetro.avion"),
    menos: t("figura.altimetro.menos"),
    mas: t("figura.altimetro.mas"),
  };
}

export function textosDeLosMandos(): TextosDeLosMandos {
  return {
    dibujo: {
      volante: t("figura.mandos.volante"),
      pedales: t("figura.mandos.pedales"),
      cables: t("figura.mandos.cables"),
      polea: t("figura.mandos.polea"),
      aleron: t("figura.mandos.aleron"),
      profundidad: t("figura.mandos.profundidad"),
      direccion: t("figura.mandos.direccion"),
      compensador: t("figura.mandos.compensador"),
      aria: t("figura.mandos.aria"),
    },
    recto: t("figura.mandos.recto"),
    inclinado: t("figura.mandos.inclinado"),
    inclDer: t("figura.mandos.inclDer"),
    inclIzq: t("figura.mandos.inclIzq"),
    narizArriba: t("figura.mandos.narizArriba"),
    narizAbajo: t("figura.mandos.narizAbajo"),
    narizDer: t("figura.mandos.narizDer"),
    narizIzq: t("figura.mandos.narizIzq"),
    alabeo: t("figura.mandos.alabeo"),
    cabeceo: t("figura.mandos.cabeceo"),
    guinada: t("figura.mandos.guinada"),
    girar: t("figura.mandos.girar"),
    tirar: t("figura.mandos.tirar"),
    pedales: t("figura.mandos.pedales"),
    vGirar: (v, inclinacion) =>
      v > 0.05
        ? t("figura.mandos.girarDer")
        : v < -0.05
          ? t("figura.mandos.girarIzq")
          : Math.abs(inclinacion) >= 1
            ? t(inclinacion > 0 ? "figura.mandos.centroInclinadoDer" : "figura.mandos.centroInclinadoIzq", {
                grados: Math.round(Math.abs(inclinacion)),
              })
            : t("figura.mandos.centroRecto"),
    vTirar: (v) =>
      v > 0.05 ? t("figura.mandos.tirado") : v < -0.05 ? t("figura.mandos.empujado") : t("figura.mandos.alCentro"),
    vPedales: (v) =>
      v > 0.05 ? t("figura.mandos.pedalDer") : v < -0.05 ? t("figura.mandos.pedalIzq") : t("figura.mandos.parejos"),
  };
}

export function textosDeLosFlaps(): TextosDeLosFlaps {
  return {
    dibujo: {
      ala: t("figura.flaps.ala"),
      flap: t("figura.flaps.flap"),
      palanca: t("figura.flaps.palanca"),
      riel: t("figura.flaps.riel"),
      masCurva: t("figura.flaps.masCurva"),
      masGrande: t("figura.flaps.masGrande"),
      aria: t("figura.flaps.aria"),
    },
    sinFlaps: [t("figura.flaps.sinFlaps"), ""],
    conFlaps: [t("figura.flaps.conFlaps"), t("figura.flaps.conFlaps2")],
    despacio: (nudos, moviendose) => [
      t("figura.flaps.despacio"),
      nudos !== null
        ? t("figura.flaps.despacioNudos", { nudos })
        : moviendose
          ? t("figura.flaps.despacioMoviendo")
          : t("figura.flaps.despacioSinDato"),
    ],
    palanca: t("figura.flaps.palancaNombre"),
    valor: (grados, nudos) =>
      nudos === null
        ? t("figura.flaps.valorSinDato", { grados })
        : grados === 0
          ? t("figura.flaps.valorGuardado", { nudos })
          : t("figura.flaps.valor", { grados, nudos }),
  };
}

/** Lo común de los dos motores: la frase de Tukã y la palanca. */
const delMotor = (
  palanca: TranslationKey,
  poco: TranslationKey,
  medio: TranslationKey,
  todo: TranslationKey,
): TextosDelMotor => ({
  palanca: t(palanca),
  poco: t("figura.motor.poco"),
  medio: t("figura.motor.medio"),
  todo: t("figura.motor.todo"),
  valor: (p) => t(p < 0.2 ? poco : p < 0.7 ? medio : todo),
});

export function textosDelTurbohelice(): TextosDelMotor & { readonly dibujo: PalabrasDelTurbohelice } {
  return {
    ...delMotor(
      "figura.turbohelice.palanca",
      "figura.turbohelice.valorPoco",
      "figura.turbohelice.valorMedio",
      "figura.turbohelice.valorTodo",
    ),
    dibujo: {
      n1: t("figura.turbohelice.n1"),
      n2: t("figura.turbohelice.n2"),
      n3: t("figura.turbohelice.n3"),
      n4: t("figura.turbohelice.n4"),
      n5: t("figura.turbohelice.n5"),
      n6: t("figura.turbohelice.n6"),
      aire: t("figura.turbohelice.aire"),
      caja: t("figura.turbohelice.caja"),
      combustion: t("figura.turbohelice.combustion"),
      compresor: t("figura.turbohelice.compresor"),
      escape: t("figura.turbohelice.escape"),
      barraNg: t("figura.turbohelice.barraNg"),
      helice: t("figura.turbohelice.helice"),
      barraNp: t("figura.turbohelice.barraNp"),
      mas: t("figura.motor.mas"),
      menos: t("figura.motor.menos"),
      barraPar: t("figura.turbohelice.barraPar"),
      turbinas: t("figura.turbohelice.turbinas"),
      aria: t("figura.turbohelice.aria"),
    },
  };
}

export function textosDelTurbofan(): TextosDelMotor & { readonly dibujo: PalabrasDelTurbofan } {
  return {
    ...delMotor(
      "figura.turbofan.palanca",
      "figura.turbofan.valorPoco",
      "figura.turbofan.valorMedio",
      "figura.turbofan.valorTodo",
    ),
    dibujo: {
      n1: t("figura.turbofan.n1"),
      n2: t("figura.turbofan.n2"),
      n3: t("figura.turbofan.n3"),
      n4: t("figura.turbofan.n4"),
      n5: t("figura.turbofan.n5"),
      daLaVuelta: t("figura.turbofan.daLaVuelta"),
      rodea: t("figura.turbofan.rodea"),
      combustion: t("figura.turbofan.combustion"),
      masEmpuja: t("figura.turbofan.masEmpuja"),
      barraEmpuje: t("figura.turbofan.barraEmpuje"),
      calientes: t("figura.turbofan.calientes"),
      mas: t("figura.motor.mas"),
      menos: t("figura.motor.menos"),
      barraN2: t("figura.turbofan.barraN2"),
      nucleo: t("figura.turbofan.nucleo"),
      barraN1: t("figura.turbofan.barraN1"),
      ventilador: t("figura.turbofan.ventilador"),
      aria: t("figura.turbofan.aria"),
    },
  };
}
