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

  // Institution name shown in the letterhead. Replace with the real
  // institution name; kept as a placeholder because it is unknown at the
  // time this report was built.
  var INSTITUCION_NOMBRE = '[NOMBRE DE LA INSTITUCIÓN]';

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
    formatDuracion: formatDuracion,
    textoDeCelda: textoDeCelda,

    mapearColumnas: mapearColumnas,
    extraerFilas: extraerFilas,
    agruparJornadas: agruparJornadas,
    procesarTabla: procesarTabla
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReporteJornadas;
}
