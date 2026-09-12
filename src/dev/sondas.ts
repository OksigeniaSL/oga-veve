/**
 * Una ventana al estado, **solo en desarrollo**.
 *
 * Existe porque comprobar el rodaje desde fuera exige saber dónde está el
 * avión y por dónde va la ruta, y sin esto la única forma de mirar era una
 * captura. El primer intento de comprobación automática rodó tan mal que
 * despegó de la plataforma a doscientos por hora sin que nadie se enterara.
 *
 * `import.meta.env.DEV` la borra del paquete que se publica: no es una puerta
 * trasera, es un banco de pruebas.
 *
 * ## Por qué vive aquí y no en `game.ts`
 *
 * Eran seiscientas líneas dentro de un fichero de casi siete mil, y ninguna de
 * ellas llega al navegador de quien juega. Sacarlas es el primer corte de #30
 * y el más barato: no hay decisión de diseño que tomar, porque esto no decide
 * nada — solo mira.
 *
 * Lo que sí trae es una consecuencia, y conviene decirla: **las piezas del
 * juego que esta ventana lee dejaron de ser `private`**. Son las partes de las
 * que el juego está hecho —el vuelo, el terreno, la cámara, el HUD, el plan— y
 * ahora se ven desde aquí. Lo demás sigue guardado.
 *
 * Si alguna cambia de nombre, esto deja de compilar, que es justo lo que se
 * quiere: la alternativa era un `as unknown as` y enterarse en la pista.
 */
import { Vector3 } from "three";
import type { Game } from "../game";
import { PANELES_DEL_VUELO, type PanelDelVuelo } from "../ui/paneles";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import { t, type TranslationKey } from "../i18n";
import { cabeceraEnUso } from "../world/terrain";
import { alturaDeEdificio } from "../world/aerodrome";
import { verticesDelCircuito } from "../world/circuito";

export function abrirLaVentanaDePruebas(juego: Game): void {
  if (!import.meta.env.DEV) return;
  (globalThis as { __oga?: unknown }).__oga = {
    estado: () => juego.flight.state,
    fase: () => juego.faseAnunciada,
    // Los mandos, para poder pilotar desde una comprobación sin pasar por el
    // teclado: cada tecla enviada desde fuera cuesta un viaje de ida y vuelta
    // al navegador, y rodar ciento cuarenta metros así tardaba minutos.
    /** Los mandos, para poder mirarlos desde una comprobación. */
    controles: () => juego.input.controls,
    /** La cota que da la foto sin filtrar, para comprobar lejos del aeropuerto. */
    cotaCruda: (x: number, z: number) =>
      juego.teselas?.medidaDirecta(x, z) ?? null,
    /** De qué color se ven las cuatro del PAPI ahora mismo. */
    papi: () => {
      const m = juego.aproximacion?.grupo.getObjectByName("papi") as
        { instanceColor?: { array: ArrayLike<number> } } | undefined;
      const a = m?.instanceColor?.array;
      if (!a) return null;
      // Azul alto es blanco; azul bajo es rojo. Es la separación que hay.
      return Array.from({ length: 4 }, (_, k) =>
        a[k * 3 + 2]! > 0.5 ? "blanca" : "roja",
      );
    },
    /**
     * Dónde está la cinta verde respecto del suelo, en metros.
     *
     * Existir no basta: sus cotas van horneadas, así que puede estar
     * perfectamente construida y **enterrada** bajo el asfalto. Un número
     * cerca de cero es que se ve; muy negativo, que está debajo.
     */
    cintaGuia: () => {
      const g = juego.plan?.grupo;
      if (!g) return null;
      const alturas: number[] = [];
      g.traverse((o) => {
        const geo = (o as { geometry?: { attributes?: { position?: never } } })
          .geometry;
        const pos = geo?.attributes?.position as
          | {
              count: number;
              getX(i: number): number;
              getY(i: number): number;
              getZ(i: number): number;
            }
          | undefined;
        if (!pos) return;
        for (let i = 0; i < pos.count; i += 7) {
          alturas.push(
            pos.getY(i) - juego.terrain.sampleHeight(pos.getX(i), pos.getZ(i)),
          );
        }
      });
      if (!alturas.length) return { vertices: 0, sobreElSuelo: null };
      alturas.sort((a, b) => a - b);
      return {
        vertices: alturas.length,
        sobreElSuelo: alturas[Math.floor(alturas.length / 2)]!,
      };
    },
    /**
     * Pone el avión en un sitio, de verdad.
     *
     * **Y hace falta que sea el modelo quien lo ponga.** Escribir en
     * `estado()` mueve el avión y le deja la velocidad puesta: el banco de
     * pruebas colocaba la avioneta en el puesto y allí seguía a treinta
     * metros por segundo, así que la máquina de fases no daba el vuelo por
     * terminado y una comprobación buena salía en rojo por culpa del banco.
     *
     * Esto llama al `reset` del modelo, que es lo que usa el propio juego
     * para colocar el avión al empezar una lección.
     */
    /*
     * Y **el rumbo, si se pide**: sin él, colocar el avión en un sitio nuevo
     * le dejaba el morro donde lo tuviera de antes. En el banco eso ponía el
     * avión en el eje de la pista mirando al campo, y lo que se medía luego
     * —seguir la raya de la salida— era en realidad recuperarse de un
     * atravesado que nadie había hecho. Sin argumento se comporta como
     * siempre.
     */
    colocar: (
      x: number,
      y: number,
      z: number,
      velocidad: number,
      rumbo?: number,
    ) =>
      juego.flight.reset({
        position: new Vector3(x, y, z),
        heading: rumbo ?? juego.flight.state.heading,
        airspeed: velocidad,
      }) ??
      (() => {
        juego.dichoDeLaToma = false;
        /*
         * Y se levanta el percance, si lo había: colocar el avión en otro
         * sitio es empezar otra situación, y una partida congelada no puede
         * sobrevivir a un teletransporte. Sin esto, una prueba del banco que
         * termina en percance dejaba **todas las de después** midiendo un
         * avión que no se mueve.
         */
        juego.percance = null;
        juego.hud.cerrarFinDeVuelo();
      })(),
    /** El viario de la ciudad, para comprobar que no se construye encima. */
    vias: () => juego.scenario.ciudad?.vias ?? [],
    /** Los galones ganados en este vuelo, para comprobarlos desde el banco. */
    galones: () => juego.galones.lista,
    /** Los bultos con los que se choca, para poder apuntarles desde el banco. */
    bultos: () => juego.bultos,
    /** Segundos que le quedan al aviso de bulto. Para el banco. */
    avisoDeBulto: () => juego.avisandoDelBulto,
    /**
     * Si el coche del sígame ya se ha echado a un lado. Para el banco.
     *
     * Apartado deja de ser un atropello —ver `yaSeAparto`—, así que la
     * comprobación de «no se le atropella» tiene que dejar de mirarlo
     * también: si no, mide un coche aparcado al lado del puesto.
     */
    cocheApartado: () => juego.sigueme.yaSeAparto,
    /*
     * La lista de paneles que se abren encima del vuelo.
     *
     * La lee `verificar-acceso`, y ese es todo el motivo de que exista: el
     * banco tenía su propia copia escrita a mano, con cuatro de los seis, y
     * los dos que faltaban llevaban meses sin encierro del foco y sin
     * Escape sin que nadie lo midiera. Ahora quien añada un panel a la
     * tabla lo mete en el banco sin enterarse. Ver `ui/paneles.ts` y #70.
     */
    paneles: () =>
      PANELES_DEL_VUELO.map((p: PanelDelVuelo) => ({
        id: p.id,
        caja: p.caja,
        congela: p.congela ?? true,
      })),
    /**
     * Cómo anda el sonido, y qué ha sonado la concha desde la última vez
     * que se preguntó. Se vacía al leerlo, que es lo que hace fácil medir
     * «lo que sonó al pulsar esto» y no «lo que ha sonado en todo el rato».
     */
    sonido: () => ({
      ...juego.audio.comoVa(),
      concha: juego.loQueSonoLaConcha.splice(0),
    }),
    /**
     * El reloj del juego, en segundos, desde que arrancó la partida.
     *
     * Los bancos median el tiempo contando sus propias vueltas: «cien
     * milisegundos por vuelta, luego esto son doce segundos». Es mentira en
     * cuanto la máquina va cargada —seis pestañas de Chrome a la vez, que es
     * como se pasa un barrido entero— y es mentira del todo con el reloj
     * acelerado. Aquí está el número de verdad.
     */
    reloj: () => juego.relojDelJuego,
    /**
     * Pone el reloj del juego a ir más deprisa.
     *
     * Para los bancos, y con un motivo muy concreto: el vuelo entero son
     * ocho minutos de reloj por escenario y son siete escenarios. Devuelve
     * lo que quedó puesto, que puede no ser lo pedido — ver `acelerar`.
     */
    acelerar: (veces: number) => juego.acelerar(veces),
    /**
     * Qué aeronave se está volando y **con qué se está dibujando**.
     *
     * Lo segundo es lo que hacía falta: el modelo de verdad se carga si está
     * y, si no, el juego sigue con las cajas sin decir nada. Es la regla de
     * la casa —que falte un recurso externo no puede dejar a nadie sin
     * volar— y su reverso es que nadie se entera de que se apagó. Pasó: la
     * aeronave cambió de identificador, el fichero se quedó con el nombre
     * viejo, y el salto visual más grande del juego se fue en silencio.
     */
    avion: () => ({
      id: juego.aircraft.id,
      nombre: juego.aircraft.name,
      // «fábrica» y no «cajas»: el respaldo dejó de ser media docena de
      // cajas el día que hubo fábrica paramétrica. Ver #68.
      dibujo: juego.aircraftMesh.deVerdad ? "modelo" : "fábrica",
      /*
       * Y los colores de su ficha, que es quien manda sobre el modelo.
       *
       * Un `.glb` trae sus propios materiales, así que el cargador lo
       * repinta con esto al abrirlo. `verificar-librea` compara lo uno con
       * lo otro sobre el material que se va a pintar de verdad.
       */
      librea: {
        casco: juego.aircraft.appearance.body,
        capo: juego.aircraft.appearance.accent,
        detalle: juego.aircraft.appearance.trim,
      },
    }),
    /**
     * Cómo está puesto el avión: alabeo y cabeceo, en radianes.
     *
     * El estado de vuelo lleva la orientación como cuaternión, que es lo
     * correcto por dentro y lo inservible desde fuera. Y hace falta: un
     * piloto automático que manda alerón **sin mirar cuánto está inclinado**
     * no vira, entra en espiral — el alerón manda velocidad de alabeo, no
     * inclinación, así que sostenerlo es seguir girando sobre el eje hasta
     * quedarse boca abajo. Le pasó al piloto del banco en Guaraní: viraba
     * para volver, la inclinación crecía sola y bajaba de 168 a 39 metros
     * con la palanca pidiendo subir.
     */
    actitud: () => ({
      alabeo: bankAngleOf(juego.flight.state.orientation),
      cabeceo: pitchAngleOf(juego.flight.state.orientation),
    }),
    /** Cuántas veces el juego ha decidido decir «ya podés tocar». */
    vecesQueDijoToca: () => juego.vecesQueDijoToca,
    /** Qué tarjeta hay puesta ahora mismo. Para el banco. */
    tarjeta: () => juego.hud.senal.puesto,
    /*
     * Cómo anda la voz del instructor: cuántas piezas grabadas tiene
     * cargadas y qué fue lo último que se le pidió decir.
     *
     * Existe porque el pack de voz es una tubería entera —bajarlo,
     * descodificarlo, montarlo y tocarlo— cuyo contenido todavía no existe,
     * y una tubería que no se puede mirar desde fuera es una tubería que no
     * se ha probado. Ver `audio/instructor-grabado.ts`.
     */
    voz: () => ({
      piezas: juego.instructor.cuantasPiezas,
      ultima: juego.instructor.loUltimo,
      hablando: juego.instructor.hablando,
    }),
    /**
     * Y pedirle que diga una frase, para poder oírla sin volar hasta ella.
     *
     * Media docena de las frases grabadas solo salen en un momento concreto
     * del vuelo —«pará en la doble raya», «salí de la pista»—, y probar el
     * pack esperando a que llegue ese momento es probarlo una vez cada tres
     * minutos. Ver `verificar-voz.mjs`.
     */
    decirlo: (clave: string) =>
      juego.instructor.decir(t(clave as TranslationKey), clave),
    /** Si está puesta la pantalla de fin de vuelo. Para el banco. */
    finDeVuelo: () => juego.hud.finPuesto,
    /**
     * El aviso de terreno vigente, o `null`.
     *
     * Se mira **esto y no la tarjeta**: la tarjeta dura tres segundos y se
     * queda puesta después de que el aviso se apague, así que una prueba que
     * mirase la tarjeta daba por bueno un aviso de hace tres segundos —y así
     * pasaba igual con el arreglo puesto que quitado, que es la definición
     * de una prueba que no prueba nada.
     */
    avisoDeTerreno: () => juego.terrenoDicho,
    /** El señalero, para mirarle los brazos sin rodar hasta el puesto. */
    senalero: () => juego.senalero,
    /** La aeronave montada: para saber si vuela el modelo o las cajas. */
    aeronave: () => ({
      grupo: juego.aircraftMesh.group,
      helice: juego.aircraftMesh.propeller.name || "(sin nombre)",
      ojo: juego.aircraftMesh.ojo ?? null,
      deVerdad: !!juego.aircraftMesh.deVerdad,
    }),
    /**
     * El tronco de la cámara y **cuántos bits tiene el búfer de
     * profundidad**, que es de donde sale que la pintura se vea o no.
     */
    /**
     * Dónde está el ojo ahora mismo, y con qué ángulo.
     *
     * Lo pide el banco de accesibilidad: comprobar que con movimiento
     * reducido la cámara **no se balancea** es mirar su altura fotograma a
     * fotograma, y desde fuera no hay otra forma de verla.
     */
    ojoDeCamara: () => ({
      x: juego.camera.position.x,
      y: juego.camera.position.y,
      z: juego.camera.position.z,
      fov: juego.camera.fov,
    }),
    /**
     * Las pantallas del salpicadero: dónde cayó cada una y qué pinta.
     *
     * `null` si este avión no tiene cabina de verdad. Ver `verificar-cabina`.
     */
    pantallas: () => juego.aircraftMesh.pantallas?.orden ?? null,
    /** Con qué vista se está mirando: `chase`, `cockpit`, `wing`… */
    vista: () => juego.cameraMode,
    camara: () => {
      const gl = juego.renderer.getContext();
      return {
        near: juego.camera.near,
        far: juego.camera.far,
        bits: gl.getParameter(gl.DEPTH_BITS) as number,
        logaritmico: juego.renderer.capabilities.logarithmicDepthBuffer,
      };
    },
    /**
     * A qué altura está cada malla del aeródromo **respecto del suelo**.
     *
     * Existir y estar encendida no basta: una malla puede estar
     * perfectamente montada y enterrada. Es lo que le pasó a la raya verde, y
     * es lo único que queda por descartar con la pintura de la pista.
     */
    alturaDeLasMallas: () => {
      const aero = juego.scenario.aerodrome;
      const recinto = aero
        ? juego.terrain.group.getObjectByName(`aerodromo:${aero.id}`)
        : null;
      const salida: string[] = [];
      recinto?.traverse((o) => {
        const pos = (
          o as {
            geometry?: {
              attributes?: {
                position?: {
                  count: number;
                  getX(i: number): number;
                  getY(i: number): number;
                  getZ(i: number): number;
                };
              };
            };
          }
        ).geometry?.attributes?.position;
        if (!pos || pos.count === 0) return;
        const d: number[] = [];
        for (
          let i = 0;
          i < pos.count;
          i += Math.max(1, Math.floor(pos.count / 40))
        ) {
          d.push(
            pos.getY(i) - juego.terrain.sampleHeight(pos.getX(i), pos.getZ(i)),
          );
        }
        d.sort((a, b) => a - b);
        salida.push(
          `${o.name || "(sin nombre)"}: ${d[Math.floor(d.length / 2)]!.toFixed(2)} m ` +
            `(de ${d[0]!.toFixed(2)} a ${d[d.length - 1]!.toFixed(2)})`,
        );
      });
      return salida;
    },
    /** Qué hay montado en el aeródromo y qué se está viendo. */
    pavimentos: () => {
      const salida: string[] = [];
      const aero = juego.scenario.aerodrome;
      const recinto = aero
        ? juego.terrain.group.getObjectByName(`aerodromo:${aero.id}`)
        : null;
      recinto?.traverse((o) => {
        const geo = (
          o as {
            geometry?: { attributes?: { position?: { count: number } } };
          }
        ).geometry;
        if (!geo?.attributes?.position) return;
        const mat = (
          o as {
            material?: {
              polygonOffsetFactor?: number;
              polygonOffsetUnits?: number;
            };
          }
        ).material;
        salida.push(
          `${o.name || "(sin nombre)"} ${o.visible ? "VISIBLE" : "apagado"}` +
            ` ${geo.attributes.position.count}v` +
            ` off ${mat?.polygonOffsetFactor ?? 0}/${mat?.polygonOffsetUnits ?? 0}`,
        );
      });
      return salida;
    },
    /** Cómo va el aro que toca de la senda: para poder medir si se enciende. */
    aros: () => juego.runwayGuide.sonda(),
    /** Dónde empieza la senda. Para ver que se muda con el viento. */
    dondeEmpiezaLaSenda: () => juego.runwayGuide.dondeEmpieza,
    /**
     * Poner un viento y ver qué se mueve con él.
     *
     * Cambiar de viento cambia **la cabecera en uso**, y con ella todo lo
     * que depende de por dónde se entra: el aeródromo, las luces de
     * aproximación, el plan de rodaje, el plano y la senda de aros. Esa
     * última se quedaba en el extremo contrario y no había forma de verlo
     * desde fuera. Para el banco.
     */
    ponerViento: (grados: number, nudos: number) =>
      juego.ponerTiempo({
        vientoDe: grados,
        vientoKt: nudos,
        qnh: 1013,
        temp: 24,
        techoM: juego.techoDeNubes,
        visibilidadM: 10000,
        fuente: "mano",
      }),
    /**
     * Vuelve a armar la senda desde donde está el avión.
     *
     * Para el banco: colocar el avión no rearma los aros, así que una prueba
     * que teletransporta hereda el índice de la prueba anterior y mide un
     * aro que ya no toca. Con esto, cada prueba de aros empieza en un sitio
     * conocido en vez de en el que dejó la de antes.
     */
    /**
     * Empieza otro vuelo, como el botón de la pantalla de fin.
     *
     * Para el banco: hay pruebas que necesitan un vuelo limpio —el percance
     * no puede saltar en un vuelo que ya terminó— y colocar el avión no
     * basta, porque lo que hay que rearmar es la partida, no la posición.
     */
    reiniciar: () => juego.resetFlight(),
    reiniciarSenda: () => juego.runwayGuide.reset(juego.flight.state.position),
    /** La cota del suelo en un punto del mundo. Para medir el suelo, no el vuelo. */
    suelo: (x: number, z: number) => juego.terrain.sampleHeight(x, z),
    /** El eje de la pista y las calles de rodaje, en coordenadas del mundo. */
    caminos: () => {
      const aero = juego.scenario.aerodrome;
      if (!aero) return [];
      const enElMundo = (p: readonly [number, number]) =>
        [p[0], -p[1]] as [number, number];
      /*
       * Y las plataformas, que es donde se empieza a rodar y donde se vio el
       * problema. De cada una se recorre su contorno y además las cuerdas
       * que unen vértices opuestos, que es la forma barata de cruzarla por
       * dentro sin ponerse a rellenar polígonos.
       */
      const plataformas = aero.aprons.map((a) => {
        const c = a.polygon.map(enElMundo);
        const cruces: [number, number][] = [];
        const mitad = Math.floor(c.length / 2);
        for (let i = 0; i < mitad; i++) {
          cruces.push(c[i]!, c[i + mitad]!);
        }
        return { que: "plataforma", puntos: [...c, c[0]!, ...cruces] };
      });
      return [
        ...aero.runways.map((r) => ({
          que: "pista",
          puntos: r.centerline.map(enElMundo),
        })),
        ...aero.taxiways.map((t) => ({
          que: "rodadura",
          puntos: t.path.map(enElMundo),
        })),
        ...plataformas,
      ];
    },
    /** Cuánto se subió el aeródromo sobre el datum para librar la foto. */
    alzado: () => juego.alzadoDelAerodromo,
    /** Cómo está el banco de nubes: si se ve, a qué altura y cuánto tapa. */
    /**
     * Y ponerlas, que es lo que hace falta para probar los mínimos.
     *
     * El techo va **sobre el aeródromo**, como en un parte de verdad: es la
     * misma llamada que hacen los tres botones del panel del tiempo.
     */
    ponerNubes: (techoM: number | null, tapadura = 0.9) =>
      juego.ponerTecho(techoM, tapadura),
    nubes: () => {
      const banco = juego.sky?.group.getObjectByName("nubes");
      if (!banco) return null;
      const capa = banco.children[0] as
        { material?: { opacity?: number } } | undefined;
      return {
        visible: banco.visible,
        altura: Math.round(banco.position.y),
        opacidad: capa?.material?.opacity ?? null,
      };
    },
    /** Un punto en final, a `d` metros del umbral en uso y sobre el eje. */
    puntoDeFinal: (d: number) => {
      const pista = juego.scenario.aerodrome?.runways[0];
      if (!pista) return null;
      const nombre = cabeceraEnUso(juego.scenario);
      const con = Object.entries(pista.thresholds).filter((e) => e[1]?.xy);
      if (con.length < 2) return null;
      const i = nombre ? con.findIndex(([n]) => n === nombre) : 0;
      const entrada = con[i >= 0 ? i : 0]![1]!.xy!;
      const salida = con[(i >= 0 ? i : 0) === 0 ? 1 : 0]![1]!.xy!;
      const l = Math.hypot(salida[0] - entrada[0], salida[1] - entrada[1]) || 1;
      const ux = (salida[0] - entrada[0]) / l;
      const uy = (salida[1] - entrada[1]) / l;
      const x = entrada[0] - ux * d;
      const y = entrada[1] - uy * d;
      return {
        x,
        z: -y,
        h: (Math.atan2(ux, uy) + 2 * Math.PI) % (2 * Math.PI),
        suelo: juego.terrain.sampleHeight(x, -y),
        cabecera: nombre,
      };
    },
    /** El estado del mundo de verdad, para las comprobaciones. */
    mundoReal: () => {
      if (!juego.teselas) return null;
      const s = juego.flight.state;
      // Lo único que de verdad importa: ¿están las ruedas encima del asfalto
      // de la fotografía, o dentro de él?
      const foto = juego.teselas.alturaEn(s.position.x, s.position.z);
      return {
        asentado: juego.teselas.asentado,
        desfase: juego.teselas.desfase,
        visibles: juego.teselas.visibles,
        nuestroSuelo: juego.terrain.sampleHeight(s.position.x, s.position.z),
        suSuelo: foto,
        ruedas: s.position.y - juego.aircraft.gearHeight,
        hundido:
          foto === null
            ? null
            : s.position.y - juego.aircraft.gearHeight - foto,
        bultos: juego.bultosQuitados,
        casas:
          (juego.scene.getObjectByName("ciudad")?.visible ?? false)
            ? (
                juego.scene.getObjectByName("ciudad")!.children as {
                  count?: number;
                }[]
              ).reduce((n, m) => n + (m.count ?? 0), 0)
            : 0,
      };
    },
    /**
     * Un piloto de pruebas: una función que toca los mandos **después** de
     * que los lea el teclado.
     *
     * Hace falta porque escribir en `controls` desde fuera no sirve de nada:
     * `input.update()` los reescribe enteros cada fotograma, así que el
     * primer comprobador le ponía timón al avión y el teclado se lo quitaba
     * al instante. El avión salía recto de la plataforma y se alejaba de su
     * ruta mientras la comprobación anotaba, tan contenta, que estaba
     * rodando.
     */
    pilotar: (fn: ((c: unknown) => void) | null) => {
      juego.pilotoDePruebas = fn as
        ((c: typeof juego.input.controls) => void) | null;
    },
    ruta: () => juego.plan?.rutaVisible() ?? [],
    pista: () => juego.scenario.runway,
    /**
     * Los edificios del aeródromo, con su planta y su altura.
     *
     * Para el banco: comprobar que están dibujados **y** que paran a un
     * avión hace falta saber dónde están, y eso solo lo sabe el fichero del
     * aeródromo.
     */
    edificios: () =>
      (juego.scenario.aerodrome?.buildings ?? []).map((e) => ({
        alto: alturaDeEdificio(e),
        // Del fichero al mundo: la Y del norte es la Z negativa.
        puntos: e.polygon.map(([x, y]) => [x, -y] as [number, number]),
      })),
    /**
     * Cómo se sortean las órdenes de irse al aire: `siempre`, `nunca` o
     * `auto`. Para el banco. Ver `ordenes`.
     */
    mandarFrustrar: (como: "auto" | "siempre" | "nunca" = "siempre") => {
      juego.ordenes = como;
    },
    /** El percance que ha parado el vuelo, si lo hay. Congela el avión. */
    percance: () => juego.percance,
    /** Si ahora mismo hay orden de irse al aire. */
    ordenDeFrustrar: () => juego.mandanFrustrar,
    porQueSeMando: () => juego.porQueSeMando,
    /**
     * Lo que cuesta el cuadro que se acaba de dibujar.
     *
     * Llamadas de dibujo y triángulos, que es lo que dice **por dónde** se va
     * el tiempo: los fotogramas solos dicen que va lento, y estos dos dicen
     * si es por dibujar demasiadas cosas o cosas demasiado gordas. Los usa
     * el banco de rendimiento. Ver `scripts/verificar-rendimiento.mjs`.
     */
    coste: () => ({
      llamadas: juego.renderer.info.render.calls,
      triangulos: juego.renderer.info.render.triangles,
      arboles: juego.vegetacion?.children.length ?? 0,
    }),
    /** Termina el vuelo ahora mismo, para poder mirar su pantalla. */
    acabar: () => juego.terminarElVuelo(),
    /** Y la traza de por dónde ha ido, en coordenadas del fichero. */
    traza: () => juego.traza,
    /** Los cinco vértices del circuito de tráfico, si lo hay. */
    /**
     * Los vértices del circuito de tráfico de la cabecera en uso.
     *
     * **Aunque no esté dibujado.** El circuito se dibuja solo en los
     * peldaños que lo enseñan, pero su geometría existe siempre —depende de
     * la pista y de por dónde se entra, no de a quién se le enseña— y el
     * piloto del banco la necesita para volar la vuelta como se vuela. Sin
     * esto tendría que calcularla por su cuenta, o sea una segunda fuente de
     * verdad para la misma figura, que es como se acaba midiendo un circuito
     * que no es el que el juego dibuja.
     */
    circuito: () =>
      juego.circuito?.vertices ??
      verticesDelCircuito(juego.scenario.runway, juego.terrain.runwayElevation),
    /** A qué caída se tocó, m/s. Para el banco y para las sondas. */
    caida: () => juego.landing.caidaAlTocar,
    /** Los pares puesto + espera que se consideraron, con sus metros. */
    pares: () => juego.plan?.paresVistos ?? [],
    /**
     * A qué velocidad pide el juego que se ruede **aquí**, m/s.
     *
     * La calcula el plan por el radio de cada curva y la usa el tope de
     * rodaje. El banco la necesita para rodar como se debe: su piloto
     * sostenía nueve metros por segundo escritos a mano, así que subir la
     * velocidad de crucero del plan no cambiaba nada de lo que medía.
     */
    rodaje: () => juego.vistaActual?.velocidadSugerida ?? 0,
    /**
     * Cómo va el rodaje por dentro: cuánta ruta queda y cuánto se va de ella.
     *
     * `restante` es lo que decide que la fase pase a «esperando» al llegar
     * a la doble raya, y no había forma de mirarlo desde fuera: el banco veía
     * el síntoma —una fase que no cambia— y no el número que lo causa. Ver
     * #151.
     */
    rodajeAsi: () => ({
      restante: Math.round(juego.vistaActual?.restante ?? -1),
      fuera: juego.vistaActual?.fuera ?? false,
      fase: juego.vistaActual?.fase ?? "",
      puntos: juego.plan?.rutaVisible().length ?? 0,
      vecesQueSePuso: juego.plan?.vecesQueSePusoLaRuta ?? 0,
      ...(juego.plan?.comoVaLaRuta ?? {}),
    }),
  };
}
