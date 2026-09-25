/* global module */
/*
 * Attendance PDF report grouped by work shift ("jornada").
 *
 * Plain ES5-compatible browser script (no modules, no bundler) shared by the
 * PDF export button of every attendance DataTable (asistencia.js). It is also
 * exported as a CommonJS module so it can be required directly from Node.js
 * tests (tests/reporte-jornadas.test.js) without any bundling step.
 */
var ReporteJornadas = (function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------

  // Institution name shown in the letterhead. Kept as a single constant so
  // it is easy to change later without touching the layout code.
  var INSTITUCION_NOMBRE = 'Liceo Santa Rosa de Lima';

  // Whether the institutional crest image is shown in the letterhead.
  // A previous version of this report removed the logo at a user's request;
  // this flag lets it be turned back on/off without touching the layout code.
  var MOSTRAR_ESCUDO = true;

  // Brand colors, matching the approved visual design ("Propuesta B").
  var COLORES = {
    acento: '#0c3484',
    ink: '#16213a',
    muted: '#5a6478',
    rule: '#cfd6e4',
    ruleLight: '#dde3ee',
    headerFill: '#eef2fa',
    incompleta: '#9a3412'
  };

  var PARTICULAS = { de: true, del: true, la: true, las: true, los: true, y: true };

  // ---------------------------------------------------------------------
  // Text / date normalization helpers
  // ---------------------------------------------------------------------

  function stripAccents(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function normalizarTexto(valor) {
    var str = valor === undefined || valor === null ? '' : String(valor);
    return stripAccents(str.trim().toLowerCase()).replace(/\s+/g, ' ');
  }

  function textoDeCelda(celda) {
    if (celda === undefined || celda === null) return '';
    if (typeof celda === 'object' && typeof celda.text !== 'undefined') {
      return textoDeCelda(celda.text);
    }
    return String(celda);
  }

  // Parses "dd/mm/yyyy hh:mm:ss AM/PM" (12h) or "dd/mm/yyyy hh:mm:ss" (24h).
  // Returns a Date or null when the input cannot be parsed.
  var RE_FECHA_HORA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i;

  function parseFechaHora(valor) {
    if (valor === undefined || valor === null) return null;
    var str = String(valor).trim();
    var m = RE_FECHA_HORA.exec(str);
    if (!m) return null;

    var dia = parseInt(m[1], 10);
    var mes = parseInt(m[2], 10);
    var anio = parseInt(m[3], 10);
    var hora = parseInt(m[4], 10);
    var min = parseInt(m[5], 10);
    var seg = parseInt(m[6], 10);
    var meridiano = m[7] ? m[7].toUpperCase() : null;

    if (meridiano === 'PM' && hora !== 12) hora += 12;
    if (meridiano === 'AM' && hora === 12) hora = 0;

    var fecha = new Date(anio, mes - 1, dia, hora, min, seg);
    if (isNaN(fecha.getTime())) return null;
    return fecha;
  }

  function normalizarAsistencia(valor) {
    var texto = normalizarTexto(valor);
    if (texto === 'entrada') return 'Entrada';
    if (texto === 'salida') return 'Salida';
    return null;
  }

  // Capitalizes a word while preserving accented characters (unlike
  // normalizarTexto, which strips accents for header/value matching).
  function capitalizarPalabra(palabra) {
    if (!palabra) return palabra;
    return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
  }

  function normalizarNombre(valor) {
    var str = valor === undefined || valor === null ? '' : String(valor);
    str = str.trim().replace(/\s+/g, ' ');
    if (!str) return '';
    var palabras = str.split(' ');
    return palabras
      .map(function (palabra, indice) {
        var clave = normalizarTexto(palabra);
        if (indice > 0 && PARTICULAS[clave]) return clave;
        return capitalizarPalabra(palabra);
      })
      .join(' ');
  }

  function formatearFecha(fecha) {
    return pad2(fecha.getDate()) + '/' + pad2(fecha.getMonth() + 1) + '/' + fecha.getFullYear();
  }

  function formatearHora(fecha) {
    return pad2(fecha.getHours()) + ':' + pad2(fecha.getMinutes()) + ':' + pad2(fecha.getSeconds());
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatDuracion(segundosTotales) {
    var segundos = Math.round(segundosTotales);
    if (segundos < 60) {
      return segundos + ' s';
    }
    if (segundos < 3600) {
      var minutos = Math.round(segundos / 60);
      return minutos + ' min';
    }
    var horas = Math.floor(segundos / 3600);
    var minutosRestantes = Math.round((segundos % 3600) / 60);
    if (minutosRestantes === 60) {
      horas += 1;
      minutosRestantes = 0;
    }
    return horas + ' h ' + pad2(minutosRestantes) + ' min';
  }

  // Parses an <input type="date"> value ("yyyy-mm-dd") as a LOCAL Date at
  // midnight, without going through `new Date(str)` (which parses it as UTC
  // midnight and can land on the previous day in a negative UTC offset zone).
  function parseFechaISO(valorISO) {
    if (!valorISO) return null;
    var partes = String(valorISO).trim().split('-');
    if (partes.length !== 3) return null;
    var anio = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10);
    var dia = parseInt(partes[2], 10);
    if (isNaN(anio) || isNaN(mes) || isNaN(dia)) return null;
    return new Date(anio, mes - 1, dia);
  }

  // Formats an emission date coming from <input type="date"> ("yyyy-mm-dd")
  // as dd/mm/yyyy WITHOUT going through `new Date(str)`, which parses the
  // string as UTC midnight and can shift a day back once converted to a
  // negative UTC offset (e.g. America/Caracas, UTC-4).
  function formatearFechaInputISO(valorISO) {
    if (!valorISO) return '';
    var partes = String(valorISO).trim().split('-');
    if (partes.length !== 3) return String(valorISO);
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  // ---------------------------------------------------------------------
  // Column mapping — by header text, not by index (tables differ per page)
  // ---------------------------------------------------------------------

  function coincide(headerNormalizado, patrones) {
    for (var i = 0; i < patrones.length; i++) {
      if (headerNormalizado.indexOf(patrones[i]) !== -1) return true;
    }
    return false;
  }

  function mapearColumnas(headerCells) {
    var mapa = { cedula: -1, nombres: -1, apellidos: -1, cargo: -1, asistencia: -1, fechaHora: -1 };

    for (var i = 0; i < headerCells.length; i++) {
      var texto = normalizarTexto(textoDeCelda(headerCells[i]));

      if (mapa.fechaHora === -1 && texto.indexOf('fecha') !== -1 && texto.indexOf('hora') !== -1) {
        mapa.fechaHora = i;
        continue;
      }
      if (mapa.asistencia === -1 && coincide(texto, ['asistencia'])) {
        mapa.asistencia = i;
        continue;
      }
      if (mapa.cedula === -1 && coincide(texto, ['cedul', 'codigo'])) {
        mapa.cedula = i;
        continue;
      }
      if (mapa.apellidos === -1 && coincide(texto, ['apellido'])) {
        mapa.apellidos = i;
        continue;
      }
      if (mapa.nombres === -1 && coincide(texto, ['nombre'])) {
        mapa.nombres = i;
        continue;
      }
      if (mapa.cargo === -1 && coincide(texto, ['cargo'])) {
        mapa.cargo = i;
        continue;
      }
    }

    return mapa;
  }

  // ---------------------------------------------------------------------
  // Row extraction + grouping
  // ---------------------------------------------------------------------

  function valorColumna(fila, indice) {
    if (indice < 0 || indice >= fila.length) return '';
    return textoDeCelda(fila[indice]);
  }

  // Turns raw table rows (arrays of cells, per the column map) into
  // normalized attendance marks: { cedula, nombres, apellidos, cargo, tipo, fecha }.
  // Rows whose datetime or attendance type cannot be parsed are skipped.
  function extraerFilas(mapa, bodyRows) {
    var filas = [];
    for (var i = 0; i < bodyRows.length; i++) {
      var fila = bodyRows[i];
      var fecha = parseFechaHora(valorColumna(fila, mapa.fechaHora));
      var tipo = normalizarAsistencia(valorColumna(fila, mapa.asistencia));
      if (!fecha || !tipo) continue;

      filas.push({
        cedula: valorColumna(fila, mapa.cedula).trim(),
        nombres: normalizarNombre(valorColumna(fila, mapa.nombres)),
        apellidos: normalizarNombre(valorColumna(fila, mapa.apellidos)),
        cargo: valorColumna(fila, mapa.cargo).trim(),
        tipo: tipo,
        fecha: fecha
      });
    }
    return filas;
  }

  function nombreCompletoDeFila(fila) {
    return (fila.nombres + ' ' + fila.apellidos).replace(/\s+/g, ' ').trim();
  }

  // Groups normalized marks by person (cédula, falling back to full name),
  // pairs each Entrada with the next Salida into a "jornada" (work shift),
  // and computes per-person and overall totals. Incomplete shifts (a Salida
  // with no open Entrada, or an Entrada left open) are flagged and excluded
  // from totals.
  function agruparJornadas(filas) {
    var gruposPorClave = {};
    var ordenGrupos = [];

    filas.forEach(function (fila) {
      var clave = fila.cedula || nombreCompletoDeFila(fila);
      if (!gruposPorClave[clave]) {
        gruposPorClave[clave] = {
          cedula: fila.cedula,
          nombres: fila.nombres,
          apellidos: fila.apellidos,
          cargo: fila.cargo,
          nombreCompleto: nombreCompletoDeFila(fila),
          marcas: []
        };
        ordenGrupos.push(clave);
      }
      var grupo = gruposPorClave[clave];
      if (!grupo.cargo && fila.cargo) grupo.cargo = fila.cargo;
      if (!grupo.cedula && fila.cedula) grupo.cedula = fila.cedula;
      grupo.marcas.push(fila);
    });

    var personas = ordenGrupos.map(function (clave) {
      var grupo = gruposPorClave[clave];
      var marcas = grupo.marcas.slice().sort(function (a, b) {
        return a.fecha.getTime() - b.fecha.getTime();
      });

      var jornadas = [];
      var abierta = null;

      marcas.forEach(function (marca) {
        if (marca.tipo === 'Entrada') {
          if (abierta) {
            jornadas.push({
              fecha: abierta.fecha,
              entrada: abierta.fecha,
              salida: null,
              segundos: null,
              incompleta: true,
              motivo: 'Sin salida'
            });
          }
          abierta = marca;
          return;
        }
        // marca.tipo === 'Salida'
        if (abierta) {
          jornadas.push({
            fecha: abierta.fecha,
            entrada: abierta.fecha,
            salida: marca.fecha,
            segundos: (marca.fecha.getTime() - abierta.fecha.getTime()) / 1000,
            incompleta: false
          });
          abierta = null;
        } else {
          jornadas.push({
            fecha: marca.fecha,
            entrada: null,
            salida: marca.fecha,
            segundos: null,
            incompleta: true,
            motivo: 'Sin entrada'
          });
        }
      });

      if (abierta) {
        jornadas.push({
          fecha: abierta.fecha,
          entrada: abierta.fecha,
          salida: null,
          segundos: null,
          incompleta: true,
          motivo: 'Sin salida'
        });
      }

      var completas = jornadas.filter(function (j) {
        return !j.incompleta;
      });
      var totalSegundos = completas.reduce(function (acc, j) {
        return acc + j.segundos;
      }, 0);

      return {
        cedula: grupo.cedula,
        nombreCompleto: grupo.nombreCompleto,
        cargo: grupo.cargo,
        jornadas: jornadas,
        totalJornadas: completas.length,
        totalSegundos: totalSegundos
      };
    });

    personas.sort(function (a, b) {
      return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es');
    });

    var totales = personas.reduce(
      function (acc, persona) {
        acc.jornadas += persona.totalJornadas;
        acc.segundos += persona.totalSegundos;
        return acc;
      },
      { personas: personas.length, jornadas: 0, segundos: 0 }
    );

    return { personas: personas, totales: totales };
  }

  // Convenience: raw header + body rows straight in, grouped result out.
  function procesarTabla(headerCells, bodyRows) {
    var mapa = mapearColumnas(headerCells.map(textoDeCelda));
    var filas = extraerFilas(mapa, bodyRows);
    return agruparJornadas(filas);
  }

  // ---------------------------------------------------------------------
  // pdfmake document builder
  // ---------------------------------------------------------------------

  function formatearFechaHoraCorta(fecha) {
    return formatearFecha(fecha) + ' ' + pad2(fecha.getHours()) + ':' + pad2(fecha.getMinutes());
  }

  function celdaTexto(texto, extra) {
    var celda = { text: texto };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) celda[k] = extra[k];
      }
    }
    return celda;
  }

  function construirLetterhead(opciones) {
    var columnas = [];

    if (MOSTRAR_ESCUDO && opciones.escudoDataUrl) {
      columnas.push({ image: 'escudo', width: 30, height: 30, margin: [0, 0, 10, 0] });
    }

    columnas.push({
      stack: [
        { text: INSTITUCION_NOMBRE, fontSize: 11, bold: true, color: COLORES.ink },
        { text: 'Sistema de Control de Asistencia', fontSize: 9, color: COLORES.muted, margin: [0, 2, 0, 0] }
      ],
      width: '*'
    });

    // The emission date chosen in the responsable modal wins, so the
    // letterhead and the signature block never disagree.
    var responsable = opciones.responsable;
    var fechaEmitido = responsable && responsable.fechaEmisionISO
      ? formatearFechaInputISO(responsable.fechaEmisionISO)
      : formatearFecha(opciones.fechaGeneracion);

    columnas.push({
      text: 'Emitido el ' + fechaEmitido,
      fontSize: 9,
      color: COLORES.muted,
      alignment: 'right',
      width: 'auto'
    });

    return {
      stack: [
        { columns: columnas, columnGap: 10 },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLORES.acento }],
          margin: [0, 10, 0, 0]
        }
      ]
    };
  }

  function construirTitulo(opciones) {
    var estiloTitulo = { text: 'Reporte de Asistencia', fontSize: 20, bold: true, color: COLORES.acento, margin: [0, 0, 0, 2] };
    if (opciones.poppinsDisponible) estiloTitulo.font = 'PoppinsBold';

    return {
      stack: [
        estiloTitulo,
        {
          text: 'Jornadas por persona: entrada, salida y tiempo registrado',
          fontSize: 10,
          color: COLORES.muted
        }
      ],
      margin: [0, 16, 0, 0]
    };
  }

  function metaColumna(etiqueta, valor) {
    return {
      stack: [
        { text: etiqueta, fontSize: 9, color: COLORES.muted, margin: [0, 0, 0, 2] },
        { text: valor, fontSize: 10.5, bold: true, color: COLORES.ink }
      ]
    };
  }

  function construirMetadatos(opciones) {
    var totales = opciones.agrupado.totales;
    var periodoTexto = formatearFecha(opciones.periodoInicio) + ' al ' + formatearFecha(opciones.periodoFin);

    return {
      table: {
        widths: [185, 90, 90, '*'],
        body: [
          [
            metaColumna('Periodo', periodoTexto),
            metaColumna('Personas', String(totales.personas)),
            metaColumna('Jornadas', String(totales.jornadas)),
            metaColumna('Tiempo total', formatDuracion(totales.segundos))
          ]
        ]
      },
      layout: {
        hLineWidth: function () {
          return 1;
        },
        vLineWidth: function () {
          return 0;
        },
        hLineColor: function () {
          return COLORES.rule;
        },
        paddingTop: function () {
          return 10;
        },
        paddingBottom: function () {
          return 10;
        }
      },
      margin: [0, 14, 0, 0]
    };
  }

  function construirFilaEncabezadoTabla() {
    var estiloEncabezado = { bold: true, fontSize: 9, color: COLORES.acento, fillColor: COLORES.headerFill };
    return [
      celdaTexto('FECHA', estiloEncabezado),
      celdaTexto('ENTRADA', estiloEncabezado),
      celdaTexto('SALIDA', estiloEncabezado),
      celdaTexto('TIEMPO', Object.assign({ alignment: 'right' }, estiloEncabezado))
    ];
  }

  function construirFilaGrupo(persona) {
    var etiquetaJornadas = persona.totalJornadas + (persona.totalJornadas === 1 ? ' jornada' : ' jornadas');
    var subtitulo = 'C.I. ' + (persona.cedula || 's/c') + (persona.cargo ? ' · ' + persona.cargo : '');

    var celda = {
      colSpan: 4,
      columns: [
        {
          stack: [
            { text: persona.nombreCompleto, fontSize: 10.5, bold: true, color: COLORES.ink },
            { text: subtitulo, fontSize: 9, color: COLORES.muted, margin: [0, 1, 0, 0] }
          ],
          width: '*'
        },
        {
          text: [
            { text: etiquetaJornadas + ' · ', fontSize: 9, color: COLORES.muted },
            { text: formatDuracion(persona.totalSegundos), fontSize: 9, bold: true, color: COLORES.ink }
          ],
          alignment: 'right',
          width: 'auto'
        }
      ],
      columnGap: 10,
      margin: [0, 10, 0, 6],
      fillColor: null
    };

    return [celda, {}, {}, {}];
  }

  function construirFilaJornada(jornada) {
    var entradaTexto = jornada.entrada ? formatearHora(jornada.entrada) : '—';
    var salidaTexto = jornada.salida ? formatearHora(jornada.salida) : '—';
    var tiempoTexto = jornada.incompleta ? jornada.motivo : formatDuracion(jornada.segundos);
    var tiempoEstilo = { alignment: 'right' };
    if (jornada.incompleta) {
      tiempoEstilo.color = COLORES.incompleta;
    } else {
      tiempoEstilo.bold = true;
    }

    return [
      celdaTexto(formatearFecha(jornada.fecha), { fontSize: 10 }),
      celdaTexto(entradaTexto, { fontSize: 10 }),
      celdaTexto(salidaTexto, { fontSize: 10 }),
      celdaTexto(tiempoTexto, Object.assign({ fontSize: 10 }, tiempoEstilo))
    ];
  }

  function construirTablaJornadas(opciones) {
    var cuerpo = [construirFilaEncabezadoTabla()];

    opciones.agrupado.personas.forEach(function (persona) {
      cuerpo.push(construirFilaGrupo(persona));
      persona.jornadas.forEach(function (jornada) {
        cuerpo.push(construirFilaJornada(jornada));
      });
    });

    return {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['*', 100, 100, 80],
        body: cuerpo
      },
      layout: {
        hLineWidth: function (i) {
          return i === 1 ? 1 : 0.5;
        },
        vLineWidth: function () {
          return 0;
        },
        hLineColor: function (i, node) {
          if (i === 1) return COLORES.acento;
          var filaActual = node.table.body[i];
          var esGrupo = filaActual && filaActual[0] && filaActual[0].colSpan === 4;
          return esGrupo ? COLORES.rule : COLORES.ruleLight;
        },
        paddingTop: function (i) {
          return i === 0 ? 8 : 6;
        },
        paddingBottom: function () {
          return 6;
        }
      },
      margin: [0, 18, 0, 0]
    };
  }

  function construirFirma(opciones) {
    var responsable = opciones.responsable;
    if (!responsable || !responsable.nombre) return null;

    var fechaEmisionTexto = formatearFechaInputISO(responsable.fechaEmisionISO);

    return {
      margin: [0, 24, 0, 0],
      stack: [
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: COLORES.rule }]
        },
        {
          columns: [
            {
              width: 300,
              stack: [
                {
                  text: 'RESPONSABLE DEL REPORTE',
                  fontSize: 9,
                  bold: true,
                  color: COLORES.acento,
                  margin: [0, 14, 0, 8]
                },
                {
                  table: {
                    widths: ['auto', '*'],
                    body: [
                      [celdaTexto('Nombre', { fontSize: 9, color: COLORES.muted }), celdaTexto(responsable.nombre, { fontSize: 10 })],
                      [celdaTexto('Cargo', { fontSize: 9, color: COLORES.muted }), celdaTexto(responsable.cargo || '', { fontSize: 10 })],
                      [
                        celdaTexto('Departamento', { fontSize: 9, color: COLORES.muted }),
                        celdaTexto(responsable.departamento || '', { fontSize: 10 })
                      ],
                      [
                        celdaTexto('Fecha de emisión', { fontSize: 9, color: COLORES.muted }),
                        celdaTexto(fechaEmisionTexto, { fontSize: 10 })
                      ]
                    ]
                  },
                  layout: 'noBorders'
                }
              ]
            },
            {
              width: 181,
              stack: [
                { text: ' ', margin: [0, 30, 0, 0] },
                // x2 is kept well inside this column's own width (181pt) --
                // a canvas' drawn extent counts as its natural width, and a
                // longer line here would starve this column of layout space.
                { canvas: [{ type: 'line', x1: 10, y1: 0, x2: 171, y2: 0, lineWidth: 1, lineColor: COLORES.ink }] },
                { text: responsable.nombre, fontSize: 10.5, bold: true, alignment: 'center', margin: [0, 6, 0, 0] },
                { text: 'Firma y sello', fontSize: 9, color: COLORES.muted, alignment: 'center' }
              ]
            }
          ],
          columnGap: 30
        }
      ]
    };
  }

  function construirFooter(opciones) {
    var textoGeneracion = 'Generado por el Sistema de Control de Asistencia · ' + formatearFechaHoraCorta(opciones.fechaGeneracion);
    return function (currentPage, pageCount) {
      return {
        margin: [42, 0, 42, 20],
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 1, lineColor: COLORES.ruleLight }] },
          {
            columns: [
              { text: textoGeneracion, fontSize: 9, color: COLORES.muted, width: '*' },
              {
                text: 'Página ' + currentPage + ' de ' + pageCount,
                fontSize: 9,
                color: COLORES.muted,
                alignment: 'right',
                width: 'auto'
              }
            ],
            margin: [0, 6, 0, 0]
          }
        ]
      };
    };
  }

  function buildDocDefinition(opciones) {
    var contenido = [construirLetterhead(opciones), construirTitulo(opciones), construirMetadatos(opciones), construirTablaJornadas(opciones)];

    var firma = construirFirma(opciones);
    if (firma) contenido.push(firma);

    var doc = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [42, 36, 42, 48],
      content: contenido,
      footer: construirFooter(opciones),
      defaultStyle: {
        font: opciones.poppinsDisponible ? 'Poppins' : 'Roboto',
        fontSize: 10,
        color: COLORES.ink
      },
      styles: {}
    };

    if (MOSTRAR_ESCUDO && opciones.escudoDataUrl) {
      doc.images = { escudo: opciones.escudoDataUrl };
    }

    return doc;
  }

  // ---------------------------------------------------------------------
  // Browser resource loading (crest image now, Poppins fonts in a later
  // task). Only ever called from the browser (asistencia.js); guarded so
  // requiring this module in Node (tests) never touches fetch/Promise use
  // beyond defining the functions.
  // ---------------------------------------------------------------------

  var _recursos = { escudoDataUrl: null, poppinsDisponible: false };
  var _recursosPromise = null;

  function blobADataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      lector.onloadend = function () {
        resolve(lector.result);
      };
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
  }

  function cargarImagenBase64(url) {
    return fetch(url)
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status + ' cargando ' + url);
        return respuesta.blob();
      })
      .then(blobADataUrl);
  }

  function arrayBufferABase64(buffer) {
    var binario = '';
    var bytes = new Uint8Array(buffer);
    for (var i = 0; i < bytes.byteLength; i++) {
      binario += String.fromCharCode(bytes[i]);
    }
    return btoa(binario);
  }

  function cargarFuenteBase64(url) {
    return fetch(url)
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status + ' cargando ' + url);
        return respuesta.arrayBuffer();
      })
      .then(arrayBufferABase64);
  }

  // The default Roboto family pdfmake.min.js falls back to when
  // `pdfMake.fonts` is not set (see the bundled vfs_fonts.js keys). Kept
  // explicit here because setting `pdfMake.fonts` at all REPLACES that
  // default entirely instead of merging with it.
  var FUENTE_ROBOTO = {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-Italic.ttf'
  };

  var ARCHIVOS_POPPINS = ['Poppins-Regular.ttf', 'Poppins-Medium.ttf', 'Poppins-SemiBold.ttf', 'Poppins-Bold.ttf'];

  // Loads Poppins into pdfMake.vfs/fonts, in ADDITION to the default Roboto
  // (never replacing it). On any failure it leaves pdfMake.fonts untouched,
  // so the PDF renders with Roboto instead of breaking.
  function cargarPoppins(base) {
    if (typeof pdfMake === 'undefined') return Promise.resolve(false);

    var promesas = ARCHIVOS_POPPINS.map(function (archivo) {
      return cargarFuenteBase64(base + 'public/fonts/poppins/' + archivo).then(function (base64) {
        return { archivo: archivo, base64: base64 };
      });
    });

    return Promise.all(promesas)
      .then(function (resultados) {
        pdfMake.vfs = pdfMake.vfs || {};
        resultados.forEach(function (r) {
          pdfMake.vfs[r.archivo] = r.base64;
        });

        pdfMake.fonts = {
          Roboto: FUENTE_ROBOTO,
          Poppins: {
            normal: 'Poppins-Regular.ttf',
            bold: 'Poppins-SemiBold.ttf',
            italics: 'Poppins-Regular.ttf',
            bolditalics: 'Poppins-SemiBold.ttf'
          },
          PoppinsBold: {
            normal: 'Poppins-Bold.ttf',
            bold: 'Poppins-Bold.ttf',
            italics: 'Poppins-Bold.ttf',
            bolditalics: 'Poppins-Bold.ttf'
          }
        };

        return true;
      })
      .catch(function () {
        return false;
      });
  }

  // Loads the resources the PDF needs (institutional crest, Poppins fonts)
  // and caches the result after the first successful attempt. NEVER
  // rejects: on any failure it resolves with whatever partial state it
  // has, so PDF generation always falls back gracefully (no crest and/or
  // Roboto only) instead of breaking the export.
  function prepararRecursos(baseUrl) {
    if (_recursosPromise) return _recursosPromise;
    var base = baseUrl || '';

    _recursosPromise = Promise.resolve()
      .then(function () {
        if (!MOSTRAR_ESCUDO) return null;
        return cargarImagenBase64(base + 'public/img/escudo-pdf.png').catch(function () {
          return null;
        });
      })
      .then(function (escudoDataUrl) {
        _recursos.escudoDataUrl = escudoDataUrl;
        return cargarPoppins(base);
      })
      .then(function (poppinsDisponible) {
        _recursos.poppinsDisponible = poppinsDisponible;
        return _recursos;
      })
      .catch(function () {
        return _recursos;
      });

    return _recursosPromise;
  }

  function obtenerRecursos() {
    return _recursos;
  }

  return {
    INSTITUCION_NOMBRE: INSTITUCION_NOMBRE,
    MOSTRAR_ESCUDO: MOSTRAR_ESCUDO,
    COLORES: COLORES,

    parseFechaHora: parseFechaHora,
    normalizarTexto: normalizarTexto,
    normalizarAsistencia: normalizarAsistencia,
    normalizarNombre: normalizarNombre,
    formatearFecha: formatearFecha,
    formatearHora: formatearHora,
    formatearFechaInputISO: formatearFechaInputISO,
    parseFechaISO: parseFechaISO,
    formatDuracion: formatDuracion,
    textoDeCelda: textoDeCelda,

    mapearColumnas: mapearColumnas,
    extraerFilas: extraerFilas,
    agruparJornadas: agruparJornadas,
    procesarTabla: procesarTabla,

    buildDocDefinition: buildDocDefinition,

    prepararRecursos: prepararRecursos,
    obtenerRecursos: obtenerRecursos
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReporteJornadas;
}
