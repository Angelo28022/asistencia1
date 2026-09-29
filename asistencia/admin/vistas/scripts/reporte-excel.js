/* global module, JSZip */
/*
 * Shared Excel (.xlsx) builder for the list pages.
 *
 * Plain ES5-compatible browser script (no modules, no bundler). The list
 * pages call ReporteExcel.descargar(def) instead of DataTables' default
 * excelHtml5 export, so every spreadsheet of the system shares one layout:
 *
 *   Row 1   title (merged, bold, accent color)
 *   Row 2   subtitle (merged, muted color)
 *   Row 3   empty
 *   Row 4   column headers (frozen, with AutoFilter)
 *   Row 5.. data, with typed cells (text, number, date, time, duration)
 *   [total] optional SUBTOTAL row that keeps summing when the user filters
 *
 * construirLibro(def) is pure (it only returns the XML parts of the
 * workbook) and is exported as a CommonJS module so it can be required
 * directly from Node.js. descargar(def) zips those parts with the global
 * JSZip (v2 bundled with DataTables, v3 also supported) and downloads it.
 */
var ReporteExcel = (function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------

  var MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  var NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  // Brand colors (ARGB), matching the PDF reports (ReporteJornadas.COLORES).
  var COLOR_ACENTO = 'FF0C3484';
  var COLOR_MUTED = 'FF5A6478';
  var COLOR_HEADER_FILL = 'FFEEF2FA';

  // Fixed layout: headers on row 4, data from row 5.
  var FILA_TITULO = 1;
  var FILA_SUBTITULO = 2;
  var FILA_ENCABEZADO = 4;
  var PRIMERA_FILA_DATOS = 5;

  var ANCHO_POR_DEFECTO = 14;
  var MAX_LARGO_CELDA = 32767; // Excel limit per cell
  var MAX_LARGO_HOJA = 31; // Excel limit per sheet name
  var SEGUNDOS_POR_DIA = 86400;

  // Index of each entry of cellXfs in styles.xml (see construirEstilos).
  var ESTILO = {
    base: 0,
    titulo: 1,
    subtitulo: 2,
    encabezado: 3,
    texto: 4,
    numero: 5,
    fecha: 6,
    hora: 7,
    duracion: 8,
    totalTexto: 9,
    totalNumero: 10,
    totalDuracion: 11,
    totalFecha: 12
  };

  var TIPOS = { texto: true, numero: true, fecha: true, hora: true, duracion: true };

  // ---------------------------------------------------------------------
  // Text helpers
  // ---------------------------------------------------------------------

  // Characters that are not allowed in XML 1.0 (keeps tab, LF and CR) and
  // unpaired surrogate halves.
  var RE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
  var RE_SURROGADOS = /([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDFFF]/g;

  function limpiarTexto(valor) {
    return String(valor)
      .replace(RE_CONTROL, '')
      .replace(RE_SURROGADOS, function (m, par) {
        return par || '';
      })
      .replace(/\r\n?/g, '\n');
  }

  function escaparXml(valor) {
    return limpiarTexto(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function esVacio(valor) {
    return valor === null || valor === undefined || valor === '';
  }

  function dosDigitos(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // 'YYYY-MM-DD' from local date parts (for file names).
  function fechaISO(date) {
    var d = date instanceof Date ? date : new Date();
    return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1) + '-' + dosDigitos(d.getDate());
  }

  // 'dd/mm/yyyy' from local date parts (for subtitles).
  function fechaDMY(date) {
    var d = date instanceof Date ? date : new Date();
    return dosDigitos(d.getDate()) + '/' + dosDigitos(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  // Sheet names cannot contain []:*?/\, cannot start or end with an
  // apostrophe and are limited to 31 characters.
  function sanitizarNombreHoja(nombre) {
    var limpio = esVacio(nombre) ? '' : limpiarTexto(nombre).replace(/[\[\]:*?\/\\\n\r\t]/g, '');
    limpio = limpio.replace(/^[\s']+|[\s']+$/g, '').substring(0, MAX_LARGO_HOJA);
    limpio = limpio.replace(RE_SURROGADOS, function (m, par) {
      return par || '';
    });
    limpio = limpio.replace(/^[\s']+|[\s']+$/g, '');
    return limpio || 'Hoja1';
  }

  // Sheet name as used inside a formula / defined name: always quoted, with
  // embedded apostrophes doubled.
  function referenciaHoja(nombreHoja) {
    return "'" + nombreHoja.replace(/'/g, "''") + "'";
  }

  // ---------------------------------------------------------------------
  // Cell references
  // ---------------------------------------------------------------------

  // 0 -> 'A', 25 -> 'Z', 26 -> 'AA', ...
  function letraColumna(indice) {
    var letras = '';
    var n = indice + 1;
    while (n > 0) {
      var resto = (n - 1) % 26;
      letras = String.fromCharCode(65 + resto) + letras;
      n = Math.floor((n - 1) / 26);
    }
    return letras;
  }

  function refCelda(indiceColumna, fila) {
    return letraColumna(indiceColumna) + fila;
  }

  function refAbsoluta(indiceColumna, fila) {
    return '$' + letraColumna(indiceColumna) + '$' + fila;
  }

  // ---------------------------------------------------------------------
  // Value conversion (JS value -> Excel number)
  // ---------------------------------------------------------------------

  // Days between 1899-12-30 and the given local Y/M/D, i.e. an Excel serial
  // date (1900 date system). Using Date.UTC on both ends avoids any timezone
  // or daylight-saving drift. Returns null for impossible dates.
  function serialDesdeYMD(anio, mes, dia) {
    if (anio < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    var utc = Date.UTC(anio, mes - 1, dia);
    var control = new Date(utc);
    if (control.getUTCMonth() !== mes - 1 || control.getUTCDate() !== dia) return null;
    var serial = Math.round((utc - Date.UTC(1899, 11, 30)) / 864e5);
    // Excel treats 1900 as a leap year (1900-02-29 exists as serial 60).
    if (serial < 61) serial -= 1;
    return serial >= 1 ? serial : null;
  }

  // JS Date, 'YYYY-MM-DD...' (MariaDB DATE/DATETIME) or 'dd/mm/yyyy...'.
  // Zero and invalid dates ('0000-00-00 00:00:00') -> null.
  function convertirFecha(valor) {
    if (valor instanceof Date) {
      if (isNaN(valor.getTime())) return null;
      return serialDesdeYMD(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
    }
    if (typeof valor !== 'string') return null;
    var texto = valor.trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if (m) return serialDesdeYMD(+m[1], +m[2], +m[3]);
    m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
    if (m) return serialDesdeYMD(+m[3], +m[2], +m[1]);
    return null;
  }

  // Number of seconds from a number, a numeric string or 'H:MM[:SS]'.
  function segundosDe(valor) {
    if (typeof valor === 'number') return isFinite(valor) ? valor : null;
    if (typeof valor !== 'string') return null;
    var texto = valor.trim();
    if (/^-?\d+(\.\d+)?$/.test(texto)) return parseFloat(texto);
    var m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(texto);
    if (m) return +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0);
    return null;
  }

  // Time of day: JS Date (local h/m/s), seconds since midnight, 'HH:MM[:SS]'
  // or a 'YYYY-MM-DD HH:MM:SS' datetime. Stored as a fraction of a day.
  function convertirHora(valor) {
    var segundos;
    if (valor instanceof Date) {
      if (isNaN(valor.getTime())) return null;
      segundos = valor.getHours() * 3600 + valor.getMinutes() * 60 + valor.getSeconds();
    } else {
      segundos = segundosDe(valor);
      if (segundos === null && typeof valor === 'string') {
        var m = /^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(valor.trim());
        if (m) segundos = +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0);
      }
    }
    if (segundos === null || segundos < 0) return null;
    return segundos / SEGUNDOS_POR_DIA;
  }

  // Duration in seconds (number, numeric string or 'H:MM[:SS]'), stored as
  // a fraction of a day so '[h]:mm:ss' keeps counting hours past 24.
  function convertirDuracion(valor) {
    var segundos = segundosDe(valor);
    if (segundos === null || segundos < 0) return null;
    return segundos / SEGUNDOS_POR_DIA;
  }

  function convertirNumero(valor) {
    if (typeof valor === 'number') return isFinite(valor) ? valor : null;
    if (typeof valor !== 'string') return null;
    var texto = valor.trim();
    if (texto === '') return null;
    var n = Number(texto);
    return isFinite(n) ? n : null;
  }

  // Normalizes one value for a column type.
  // Returns null (empty cell), { numero: n } or { texto: s }.
  function convertirValor(tipo, valor) {
    if (esVacio(valor)) return null;

    var numero;
    switch (tipo) {
      case 'numero':
        numero = convertirNumero(valor);
        // Non-numeric content is kept as text instead of being lost.
        if (numero === null) return { texto: String(valor) };
        return { numero: numero };
      case 'fecha':
        numero = convertirFecha(valor);
        return numero === null ? null : { numero: numero };
      case 'hora':
        numero = convertirHora(valor);
        return numero === null ? null : { numero: numero };
      case 'duracion':
        numero = convertirDuracion(valor);
        return numero === null ? null : { numero: numero };
      default:
        return { texto: String(valor) };
    }
  }

  // ---------------------------------------------------------------------
  // Cell XML
  // ---------------------------------------------------------------------

  function numeroXml(n) {
    // Avoid '-0' and keep full precision.
    return String(n === 0 ? 0 : n);
  }

  // Excel keeps 15 significant digits; rounding the cached totals hides
  // float noise such as 1.4375000000000002.
  function redondearExcel(n) {
    return parseFloat(n.toPrecision(15));
  }

  function celdaTextoXml(ref, estilo, texto) {
    var limpio = limpiarTexto(texto);
    if (limpio.length > MAX_LARGO_CELDA) limpio = limpio.substring(0, MAX_LARGO_CELDA);
    if (limpio === '') return celdaVaciaXml(ref, estilo);
    return (
      '<c r="' + ref + '" s="' + estilo + '" t="inlineStr"><is><t xml:space="preserve">' +
      escaparXml(limpio) +
      '</t></is></c>'
    );
  }

  function celdaNumeroXml(ref, estilo, numero) {
    return '<c r="' + ref + '" s="' + estilo + '"><v>' + numeroXml(numero) + '</v></c>';
  }

  function celdaVaciaXml(ref, estilo) {
    return '<c r="' + ref + '" s="' + estilo + '"/>';
  }

  function celdaFormulaXml(ref, estilo, formula, cache) {
    return (
      '<c r="' + ref + '" s="' + estilo + '"><f>' + escaparXml(formula) + '</f><v>' + numeroXml(cache) + '</v></c>'
    );
  }

  function filaXml(numero, celdas, atributos) {
    return '<row r="' + numero + '"' + (atributos || '') + '>' + celdas.join('') + '</row>';
  }

  // ---------------------------------------------------------------------
  // Definition normalization
  // ---------------------------------------------------------------------

  function normalizarColumnas(columnas) {
    return (columnas || []).map(function (col) {
      col = col || {};
      var ancho = Number(col.ancho);
      return {
        titulo: esVacio(col.titulo) ? '' : String(col.titulo),
        ancho: isFinite(ancho) && ancho > 0 ? ancho : ANCHO_POR_DEFECTO,
        tipo: TIPOS[col.tipo] ? col.tipo : 'texto'
      };
    });
  }

  function estiloDato(tipo) {
    return ESTILO[tipo] !== undefined ? ESTILO[tipo] : ESTILO.texto;
  }

  function estiloTotal(tipo) {
    if (tipo === 'numero') return ESTILO.totalNumero;
    // A summed time column is a duration too (it can exceed 24 h).
    if (tipo === 'duracion' || tipo === 'hora') return ESTILO.totalDuracion;
    if (tipo === 'fecha') return ESTILO.totalFecha;
    return ESTILO.totalTexto;
  }

  // ---------------------------------------------------------------------
  // Worksheet
  // ---------------------------------------------------------------------

  // Builds sheet1.xml plus the ranges the workbook needs.
  function construirHoja(def, columnas) {
    var ultimaCol = columnas.length - 1;
    var letraUltima = letraColumna(ultimaCol);
    var filas = def.filas || [];
    var ultimaFilaDatos = FILA_ENCABEZADO + filas.length;
    var filasXml = [];

    // Rows 1-2: title and subtitle (merged across every column).
    if (!esVacio(def.titulo)) {
      filasXml.push(
        filaXml(FILA_TITULO, [celdaTextoXml(refCelda(0, FILA_TITULO), ESTILO.titulo, def.titulo)], ' ht="21" customHeight="1"')
      );
    }
    if (!esVacio(def.subtitulo)) {
      filasXml.push(filaXml(FILA_SUBTITULO, [celdaTextoXml(refCelda(0, FILA_SUBTITULO), ESTILO.subtitulo, def.subtitulo)]));
    }

    // Row 4: headers.
    filasXml.push(
      filaXml(
        FILA_ENCABEZADO,
        columnas.map(function (col, i) {
          return celdaTextoXml(refCelda(i, FILA_ENCABEZADO), ESTILO.encabezado, col.titulo);
        }),
        ' ht="20" customHeight="1"'
      )
    );

    // Rows 5..: data. Numeric values are summed on the fly for the cached
    // value of the total row.
    var sumas = columnas.map(function () {
      return 0;
    });
    filas.forEach(function (fila, f) {
      var numeroFila = PRIMERA_FILA_DATOS + f;
      var celdas = [];
      columnas.forEach(function (col, i) {
        var valor = convertirValor(col.tipo, fila ? fila[i] : undefined);
        if (!valor) return;
        var ref = refCelda(i, numeroFila);
        if (valor.numero !== undefined) {
          sumas[i] += valor.numero;
          celdas.push(celdaNumeroXml(ref, estiloDato(col.tipo), valor.numero));
        } else {
          celdas.push(celdaTextoXml(ref, ESTILO.texto, valor.texto));
        }
      });
      filasXml.push(filaXml(numeroFila, celdas));
    });

    // Optional total row: label in the first column, SUBTOTAL(9, ...) with a
    // cached value in the listed columns, styled empty cells elsewhere so the
    // top border spans the whole table.
    var ultimaFila = ultimaFilaDatos;
    if (def.total) {
      var filaTotal = ultimaFilaDatos + 1;
      var sumar = {};
      (def.total.columnas || []).forEach(function (indice) {
        if (indice === Math.floor(indice) && indice > 0 && indice <= ultimaCol) sumar[indice] = true;
      });
      var etiqueta = esVacio(def.total.etiqueta) ? 'Total' : def.total.etiqueta;
      var celdasTotal = columnas.map(function (col, i) {
        var ref = refCelda(i, filaTotal);
        if (i === 0) return celdaTextoXml(ref, ESTILO.totalTexto, etiqueta);
        if (!sumar[i]) return celdaVaciaXml(ref, estiloTotal(col.tipo));
        var estilo = col.tipo === 'texto' ? ESTILO.totalNumero : estiloTotal(col.tipo);
        if (filas.length === 0) return celdaNumeroXml(ref, estilo, 0);
        var letra = letraColumna(i);
        var formula = 'SUBTOTAL(9,' + letra + PRIMERA_FILA_DATOS + ':' + letra + ultimaFilaDatos + ')';
        return celdaFormulaXml(ref, estilo, formula, redondearExcel(sumas[i]));
      });
      filasXml.push(filaXml(filaTotal, celdasTotal));
      ultimaFila = filaTotal;
    }

    var rangoFiltro = 'A' + FILA_ENCABEZADO + ':' + letraUltima + ultimaFilaDatos;

    var cols = columnas
      .map(function (col, i) {
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + col.ancho + '" customWidth="1"/>';
      })
      .join('');

    // A merge needs at least two cells.
    var merges = [];
    if (ultimaCol > 0) {
      merges.push('<mergeCell ref="A' + FILA_TITULO + ':' + letraUltima + FILA_TITULO + '"/>');
      merges.push('<mergeCell ref="A' + FILA_SUBTITULO + ':' + letraUltima + FILA_SUBTITULO + '"/>');
    }

    // Digits-only text (cédulas, phone numbers) is intentionally text:
    // silence Excel's "number stored as text" warning on those columns.
    var rangosTexto = [];
    if (filas.length > 0) {
      columnas.forEach(function (col, i) {
        if (col.tipo === 'texto') {
          var letra = letraColumna(i);
          rangosTexto.push(letra + PRIMERA_FILA_DATOS + ':' + letra + ultimaFilaDatos);
        }
      });
    }

    var xml =
      XML_DECL +
      '<worksheet xmlns="' + NS_MAIN + '" xmlns:r="' + NS_REL + '">' +
      '<dimension ref="A1:' + letraUltima + ultimaFila + '"/>' +
      '<sheetViews><sheetView workbookViewId="0">' +
      '<pane ySplit="' + FILA_ENCABEZADO + '" topLeftCell="A' + PRIMERA_FILA_DATOS + '" activePane="bottomLeft" state="frozen"/>' +
      '<selection pane="bottomLeft" activeCell="A' + PRIMERA_FILA_DATOS + '" sqref="A' + PRIMERA_FILA_DATOS + '"/>' +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<cols>' + cols + '</cols>' +
      '<sheetData>' + filasXml.join('') + '</sheetData>' +
      '<autoFilter ref="' + rangoFiltro + '"/>' +
      (merges.length ? '<mergeCells count="' + merges.length + '">' + merges.join('') + '</mergeCells>' : '') +
      '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
      (rangosTexto.length
        ? '<ignoredErrors><ignoredError sqref="' + rangosTexto.join(' ') + '" numberStoredAsText="1"/></ignoredErrors>'
        : '') +
      '</worksheet>';

    return {
      xml: xml,
      filtro:
        refAbsoluta(0, FILA_ENCABEZADO) + ':' + refAbsoluta(ultimaCol, ultimaFilaDatos)
    };
  }

  // ---------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------

  function fuente(opciones) {
    return (
      '<font>' +
      (opciones.negrita ? '<b/>' : '') +
      '<sz val="' + (opciones.tamano || 11) + '"/>' +
      (opciones.color ? '<color rgb="' + opciones.color + '"/>' : '') +
      '<name val="Calibri"/><family val="2"/></font>'
    );
  }

  function xf(numFmtId, fontId, fillId, borderId, alineacion) {
    var attrs =
      ' numFmtId="' + numFmtId + '" fontId="' + fontId + '" fillId="' + fillId + '" borderId="' + borderId + '" xfId="0"';
    if (numFmtId) attrs += ' applyNumberFormat="1"';
    if (fontId) attrs += ' applyFont="1"';
    if (fillId) attrs += ' applyFill="1"';
    if (borderId) attrs += ' applyBorder="1"';
    if (alineacion) return '<xf' + attrs + ' applyAlignment="1"><alignment ' + alineacion + '/></xf>';
    return '<xf' + attrs + '/>';
  }

  function construirEstilos() {
    // Custom number formats (ids from 164 up). 49 is the built-in '@' (text).
    var FMT = { general: 0, texto: 49, fecha: 164, hora: 165, duracion: 166 };
    var numFmts = [
      '<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>',
      '<numFmt numFmtId="165" formatCode="hh:mm:ss"/>',
      '<numFmt numFmtId="166" formatCode="[h]:mm:ss"/>'
    ];

    // 0 default, 1 title, 2 subtitle, 3 header, 4 bold (total row).
    var fonts = [
      fuente({}),
      fuente({ negrita: true, tamano: 14, color: COLOR_ACENTO }),
      fuente({ color: COLOR_MUTED }),
      fuente({ negrita: true, color: COLOR_ACENTO }),
      fuente({ negrita: true })
    ];

    // 0 and 1 are mandatory (none / gray125); 2 header fill.
    var fills = [
      '<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="gray125"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="' + COLOR_HEADER_FILL + '"/><bgColor indexed="64"/></patternFill></fill>'
    ];

    // 0 none, 1 medium accent bottom (header), 2 thin accent top (total).
    var borders = [
      '<border><left/><right/><top/><bottom/><diagonal/></border>',
      '<border><left/><right/><top/><bottom style="medium"><color rgb="' + COLOR_ACENTO + '"/></bottom><diagonal/></border>',
      '<border><left/><right/><top style="thin"><color rgb="' + COLOR_ACENTO + '"/></top><bottom/><diagonal/></border>'
    ];

    // Order must match ESTILO.
    var cellXfs = [];
    cellXfs[ESTILO.base] = xf(FMT.general, 0, 0, 0);
    cellXfs[ESTILO.titulo] = xf(FMT.general, 1, 0, 0, 'vertical="center"');
    cellXfs[ESTILO.subtitulo] = xf(FMT.general, 2, 0, 0, 'vertical="center"');
    cellXfs[ESTILO.encabezado] = xf(FMT.general, 3, 2, 1, 'vertical="center"');
    cellXfs[ESTILO.texto] = xf(FMT.texto, 0, 0, 0);
    cellXfs[ESTILO.numero] = xf(FMT.general, 0, 0, 0);
    cellXfs[ESTILO.fecha] = xf(FMT.fecha, 0, 0, 0);
    cellXfs[ESTILO.hora] = xf(FMT.hora, 0, 0, 0);
    cellXfs[ESTILO.duracion] = xf(FMT.duracion, 0, 0, 0);
    cellXfs[ESTILO.totalTexto] = xf(FMT.texto, 4, 0, 2);
    cellXfs[ESTILO.totalNumero] = xf(FMT.general, 4, 0, 2);
    cellXfs[ESTILO.totalDuracion] = xf(FMT.duracion, 4, 0, 2);
    cellXfs[ESTILO.totalFecha] = xf(FMT.fecha, 4, 0, 2);

    return (
      XML_DECL +
      '<styleSheet xmlns="' + NS_MAIN + '">' +
      '<numFmts count="' + numFmts.length + '">' + numFmts.join('') + '</numFmts>' +
      '<fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts>' +
      '<fills count="' + fills.length + '">' + fills.join('') + '</fills>' +
      '<borders count="' + borders.length + '">' + borders.join('') + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + cellXfs.length + '">' + cellXfs.join('') + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="0"/>' +
      '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
      '</styleSheet>'
    );
  }

  // ---------------------------------------------------------------------
  // Package parts
  // ---------------------------------------------------------------------

  function construirContentTypes() {
    var ct = 'application/vnd.openxmlformats-';
    return (
      XML_DECL +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="' + ct + 'package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="' + ct + 'officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="' + ct + 'officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="' + ct + 'officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="' + ct + 'package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="' + ct + 'officedocument.extended-properties+xml"/>' +
      '</Types>'
    );
  }

  function construirRelsRaiz() {
    return (
      XML_DECL +
      '<Relationships xmlns="' + NS_PKG_REL + '">' +
      '<Relationship Id="rId1" Type="' + NS_REL + '/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="' + NS_REL + '/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>'
    );
  }

  function construirRelsLibro() {
    return (
      XML_DECL +
      '<Relationships xmlns="' + NS_PKG_REL + '">' +
      '<Relationship Id="rId1" Type="' + NS_REL + '/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="' + NS_REL + '/styles" Target="styles.xml"/>' +
      '</Relationships>'
    );
  }

  function construirLibroXml(nombreHoja, rangoFiltro) {
    return (
      XML_DECL +
      '<workbook xmlns="' + NS_MAIN + '" xmlns:r="' + NS_REL + '">' +
      '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192"/></bookViews>' +
      '<sheets><sheet name="' + escaparXml(nombreHoja) + '" sheetId="1" r:id="rId1"/></sheets>' +
      '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">' +
      escaparXml(referenciaHoja(nombreHoja) + '!' + rangoFiltro) +
      '</definedName></definedNames>' +
      '</workbook>'
    );
  }

  function construirCore(def) {
    return (
      XML_DECL +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
      ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"' +
      ' xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + escaparXml(esVacio(def.subtitulo) ? def.titulo || '' : def.subtitulo) + '</dc:title>' +
      '<dc:creator>' + escaparXml(def.titulo || 'Sistema de asistencia') + '</dc:creator>' +
      '</cp:coreProperties>'
    );
  }

  function construirApp() {
    return (
      XML_DECL +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"' +
      ' xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      '<Application>Microsoft Excel</Application>' +
      '</Properties>'
    );
  }

  // def: { archivo, hoja, titulo, subtitulo, columnas: [{ titulo, ancho, tipo }],
  //        filas: [[...]], total: { etiqueta, columnas: [indices] } }
  // Returns { '<path in zip>': '<xml string>' } with every part of the file.
  // The total row labels the first column, so index 0 in total.columnas is
  // ignored.
  function construirLibro(def) {
    def = def || {};
    var columnas = normalizarColumnas(def.columnas);
    if (!columnas.length) throw new Error('ReporteExcel: la definición no tiene columnas.');

    var nombreHoja = sanitizarNombreHoja(def.hoja);
    var hoja = construirHoja(def, columnas);

    return {
      '[Content_Types].xml': construirContentTypes(),
      '_rels/.rels': construirRelsRaiz(),
      'docProps/core.xml': construirCore(def),
      'docProps/app.xml': construirApp(),
      'xl/workbook.xml': construirLibroXml(nombreHoja, hoja.filtro),
      'xl/_rels/workbook.xml.rels': construirRelsLibro(),
      'xl/styles.xml': construirEstilos(),
      'xl/worksheets/sheet1.xml': hoja.xml
    };
  }

  // ---------------------------------------------------------------------
  // Browser download
  // ---------------------------------------------------------------------

  function nombreArchivo(def) {
    var nombre = esVacio(def && def.archivo) ? 'reporte-' + fechaISO(new Date()) : String(def.archivo);
    return /\.xlsx$/i.test(nombre) ? nombre : nombre + '.xlsx';
  }

  function guardarBlob(blob, nombre) {
    var nav = window.navigator;
    if (nav && typeof nav.msSaveOrOpenBlob === 'function') {
      nav.msSaveOrOpenBlob(blob, nombre);
      return;
    }
    var URLs = window.URL || window.webkitURL;
    var url = URLs.createObjectURL(blob);
    var enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    // Revoking right away can cancel the download in some browsers.
    setTimeout(function () {
      URLs.revokeObjectURL(url);
    }, 10000);
  }

  // Builds the workbook, zips it with the global JSZip and downloads
  // def.archivo. Returns a Promise resolved with the file name.
  function descargar(def) {
    return new Promise(function (resolve, reject) {
      var Zip = typeof JSZip !== 'undefined' ? JSZip : null;
      if (typeof Zip !== 'function') {
        reject(new Error('JSZip no está disponible: no se puede generar el archivo Excel.'));
        return;
      }

      var partes = construirLibro(def);
      var zip = new Zip();
      Object.keys(partes).forEach(function (ruta) {
        zip.file(ruta, partes[ruta]);
      });

      var opciones = { type: 'blob', mimeType: MIME_XLSX, compression: 'DEFLATE' };
      // The bundled JSZip is v2 (zip.generate); v3 only has generateAsync.
      var generado = zip.generateAsync ? zip.generateAsync(opciones) : Promise.resolve(zip.generate(opciones));

      generado.then(function (blob) {
        var nombre = nombreArchivo(def);
        guardarBlob(blob, nombre);
        resolve(nombre);
      }, reject);
    });
  }

  return {
    construirLibro: construirLibro,
    descargar: descargar,
    fechaISO: fechaISO,
    fechaDMY: fechaDMY,

    // Exposed for tests.
    letraColumna: letraColumna,
    sanitizarNombreHoja: sanitizarNombreHoja,
    convertirValor: convertirValor
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReporteExcel;
}
