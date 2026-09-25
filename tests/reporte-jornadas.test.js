'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ReporteJornadas = require(path.join(
  '..',
  'asistencia',
  'admin',
  'vistas',
  'scripts',
  'reporte-jornadas.js'
));

// ---------------------------------------------------------------------------
// parseFechaHora
// ---------------------------------------------------------------------------

test('parseFechaHora parses 12h AM/PM timestamps', () => {
  const d = ReporteJornadas.parseFechaHora('15/07/2025 01:55:50 AM');
  assert.equal(d.getFullYear(), 2025);
  assert.equal(d.getMonth(), 6); // July, 0-indexed
  assert.equal(d.getDate(), 15);
  assert.equal(d.getHours(), 1);
  assert.equal(d.getMinutes(), 55);
  assert.equal(d.getSeconds(), 50);
});

test('parseFechaHora parses 24h timestamps without AM/PM', () => {
  const d = ReporteJornadas.parseFechaHora('15/07/2025 13:05:00');
  assert.equal(d.getHours(), 13);
  assert.equal(d.getMinutes(), 5);
  assert.equal(d.getSeconds(), 0);
});

test('parseFechaHora maps 12 AM to hour 0', () => {
  const d = ReporteJornadas.parseFechaHora('01/01/2025 12:00:00 AM');
  assert.equal(d.getHours(), 0);
});

test('parseFechaHora maps 12 PM to hour 12', () => {
  const d = ReporteJornadas.parseFechaHora('01/01/2025 12:00:00 PM');
  assert.equal(d.getHours(), 12);
});

test('parseFechaHora is case-insensitive and tolerates loose spacing', () => {
  const d = ReporteJornadas.parseFechaHora('15/07/2025  11:16:33 pm');
  assert.equal(d.getHours(), 23);
});

test('parseFechaHora returns null for unparseable input', () => {
  assert.equal(ReporteJornadas.parseFechaHora('not a date'), null);
  assert.equal(ReporteJornadas.parseFechaHora(''), null);
  assert.equal(ReporteJornadas.parseFechaHora(undefined), null);
});

// ---------------------------------------------------------------------------
// Column mapping by header text
// ---------------------------------------------------------------------------

test('mapearColumnas maps columns regardless of order, ignoring accents/case', () => {
  const map = ReporteJornadas.mapearColumnas(['Fecha/Hora', 'ASISTENCIA', 'cedula', 'Apellidos', 'Nombres', 'Cargo']);
  assert.equal(map.fechaHora, 0);
  assert.equal(map.asistencia, 1);
  assert.equal(map.cedula, 2);
  assert.equal(map.apellidos, 3);
  assert.equal(map.nombres, 4);
  assert.equal(map.cargo, 5);
});

test('mapearColumnas handles a missing optional Cargo column', () => {
  const map = ReporteJornadas.mapearColumnas(['Código', 'Nombres', 'Apellidos', 'Fecha y Hora', 'Asistencia']);
  assert.equal(map.cargo, -1);
  assert.equal(map.cedula, 0);
  assert.equal(map.fechaHora, 3);
});

test('mapearColumnas does not confuse a bare "Fecha" column with "Fecha/Hora"', () => {
  const map = ReporteJornadas.mapearColumnas(['Fecha', 'Nombres', 'Asistencia', 'Fecha/Hora', 'Cédula']);
  assert.equal(map.fechaHora, 3);
});

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

test('normalizarAsistencia normalizes case and whitespace', () => {
  assert.equal(ReporteJornadas.normalizarAsistencia('Entrada'), 'Entrada');
  assert.equal(ReporteJornadas.normalizarAsistencia('ENTRADA '), 'Entrada');
  assert.equal(ReporteJornadas.normalizarAsistencia('salida'), 'Salida');
  assert.equal(ReporteJornadas.normalizarAsistencia('  SaLiDa  '), 'Salida');
});

test('normalizarNombre capitalizes each word and lowercases particles', () => {
  assert.equal(ReporteJornadas.normalizarNombre('guy'), 'Guy');
  assert.equal(ReporteJornadas.normalizarNombre('DIEGO ANDRES'), 'Diego Andres');
  assert.equal(ReporteJornadas.normalizarNombre('juan de la cruz'), 'Juan de la Cruz');
  assert.equal(ReporteJornadas.normalizarNombre('DE LOS SANTOS'), 'De los Santos');
  assert.equal(ReporteJornadas.normalizarNombre('maría josé'), 'María José');
});

test('formatDuracion formats seconds, minutes and hours', () => {
  assert.equal(ReporteJornadas.formatDuracion(7), '7 s');
  assert.equal(ReporteJornadas.formatDuracion(59), '59 s');
  assert.equal(ReporteJornadas.formatDuracion(60), '1 min');
  assert.equal(ReporteJornadas.formatDuracion(720), '12 min');
  assert.equal(ReporteJornadas.formatDuracion(29100), '8 h 05 min');
  assert.equal(ReporteJornadas.formatDuracion(3600), '1 h 00 min');
});

// ---------------------------------------------------------------------------
// Grouping + pairing — fixture reproduces the 8 real rows of reporte-1.png
// ---------------------------------------------------------------------------

const HEADER = ['Cédula', 'Nombres', 'Apellidos', 'Cargo', 'Asistencia', 'Fecha/Hora'];

// Rows deliberately out of chronological order: DataTables' default sort is by
// column 0 desc, so the exported table never arrives already sorted by time.
const FIXTURE_ROWS = [
  ['8012529', 'Teodosio', 'Avendaño', 'Docente', 'Entrada', '15/07/2025 11:16:33 PM'],
  ['12345678', 'guy', 'guy', 'Gerencia', 'Salida', '15/07/2025 01:56:21 AM'],
  ['26881623', 'Diego Andres', 'Avendaño Gudiño', 'Docente', 'Entrada', '15/07/2025 01:55:50 AM'],
  ['8012529', 'Teodosio', 'Avendaño', 'Docente', 'Salida', '15/07/2025 01:13:55 AM'],
  ['8012529', 'Teodosio', 'Avendaño', 'Docente', 'Entrada', '15/07/2025 01:13:49 AM'],
  ['26881623', 'Diego Andres', 'Avendaño Gudiño', 'Docente', 'Salida', '15/07/2025 01:55:57 AM'],
  ['12345678', 'guy', 'guy', 'Gerencia', 'Entrada', '15/07/2025 01:56:13 AM'],
  ['8012529', 'Teodosio', 'Avendaño', 'Docente', 'Salida', '15/07/2025 11:16:37 PM'],
];

function agrupar(header, rows) {
  const map = ReporteJornadas.mapearColumnas(header);
  const filas = ReporteJornadas.extraerFilas(map, rows);
  return ReporteJornadas.agruparJornadas(filas);
}

test('agruparJornadas groups by cédula, sorts by full name, pairs Entrada/Salida', () => {
  const resultado = agrupar(HEADER, FIXTURE_ROWS);

  assert.equal(resultado.personas.length, 3);
  assert.deepEqual(
    resultado.personas.map((p) => p.nombreCompleto),
    ['Diego Andres Avendaño Gudiño', 'Guy Guy', 'Teodosio Avendaño']
  );

  const [diego, guy, teodosio] = resultado.personas;

  assert.equal(diego.cedula, '26881623');
  assert.equal(diego.cargo, 'Docente');
  assert.equal(diego.jornadas.length, 1);
  assert.equal(diego.jornadas[0].segundos, 7);
  assert.equal(diego.totalJornadas, 1);
  assert.equal(diego.totalSegundos, 7);

  assert.equal(guy.cedula, '12345678');
  assert.equal(guy.jornadas.length, 1);
  assert.equal(guy.jornadas[0].segundos, 8);

  assert.equal(teodosio.cedula, '8012529');
  assert.equal(teodosio.jornadas.length, 2);
  assert.equal(teodosio.jornadas[0].segundos, 6);
  assert.equal(teodosio.jornadas[1].segundos, 4);
  assert.equal(teodosio.totalJornadas, 2);
  assert.equal(teodosio.totalSegundos, 10);

  assert.equal(resultado.totales.personas, 3);
  assert.equal(resultado.totales.jornadas, 4);
  assert.equal(resultado.totales.segundos, 25);
});

test('a Salida with no open Entrada renders as an incomplete "Sin entrada" shift', () => {
  const rows = [
    ['111', 'Ana', 'Perez', 'Docente', 'Salida', '15/07/2025 08:00:00 AM'],
  ];
  const resultado = agrupar(HEADER, rows);
  assert.equal(resultado.personas.length, 1);
  const jornada = resultado.personas[0].jornadas[0];
  assert.equal(jornada.incompleta, true);
  assert.equal(jornada.motivo, 'Sin entrada');
  assert.equal(jornada.entrada, null);
  assert.equal(jornada.salida.getHours(), 8);
  assert.equal(resultado.totales.jornadas, 0);
  assert.equal(resultado.totales.segundos, 0);
});

test('an Entrada while one is already open closes the previous one as "Sin salida"', () => {
  const rows = [
    ['111', 'Ana', 'Perez', 'Docente', 'Entrada', '15/07/2025 08:00:00 AM'],
    ['111', 'Ana', 'Perez', 'Docente', 'Entrada', '15/07/2025 09:00:00 AM'],
    ['111', 'Ana', 'Perez', 'Docente', 'Salida', '15/07/2025 10:00:00 AM'],
  ];
  const resultado = agrupar(HEADER, rows);
  const jornadas = resultado.personas[0].jornadas;
  assert.equal(jornadas.length, 2);
  assert.equal(jornadas[0].incompleta, true);
  assert.equal(jornadas[0].motivo, 'Sin salida');
  assert.equal(jornadas[1].incompleta, false);
  assert.equal(jornadas[1].segundos, 3600);
});

test('a trailing open Entrada renders as an incomplete "Sin salida" shift', () => {
  const rows = [
    ['111', 'Ana', 'Perez', 'Docente', 'Entrada', '15/07/2025 08:00:00 AM'],
  ];
  const resultado = agrupar(HEADER, rows);
  const jornada = resultado.personas[0].jornadas[0];
  assert.equal(jornada.incompleta, true);
  assert.equal(jornada.motivo, 'Sin salida');
  assert.equal(jornada.salida, null);
});

test('cross-midnight shifts are paired correctly with the shift date taken from Entrada', () => {
  const rows = [
    ['111', 'Ana', 'Perez', 'Docente', 'Entrada', '15/07/2025 10:00:00 PM'],
    ['111', 'Ana', 'Perez', 'Docente', 'Salida', '16/07/2025 06:00:00 AM'],
  ];
  const resultado = agrupar(HEADER, rows);
  const jornada = resultado.personas[0].jornadas[0];
  assert.equal(jornada.incompleta, false);
  assert.equal(jornada.segundos, 8 * 3600);
  assert.equal(jornada.fecha.getDate(), 15);
});

test('groups by full name when cédula is missing, and cargo missing does not crash', () => {
  const header = ['Fecha', 'Nombres', 'Asistencia', 'Fecha/Hora'];
  const rows = [
    ['15/07/2025', 'Carlos Ruiz', 'Entrada', '15/07/2025 08:00:00 AM'],
    ['15/07/2025', 'Carlos Ruiz', 'Salida', '15/07/2025 04:00:00 PM'],
  ];
  const resultado = agrupar(header, rows);
  assert.equal(resultado.personas.length, 1);
  assert.equal(resultado.personas[0].cargo, '');
  assert.equal(resultado.personas[0].jornadas[0].segundos, 8 * 3600);
});

test('parseFechaISO parses yyyy-mm-dd as a local midnight Date, without a UTC day-shift', () => {
  const d = ReporteJornadas.parseFechaISO('2025-07-15');
  assert.equal(d.getFullYear(), 2025);
  assert.equal(d.getMonth(), 6);
  assert.equal(d.getDate(), 15);
  assert.equal(d.getHours(), 0);
  assert.equal(ReporteJornadas.parseFechaISO(''), null);
  assert.equal(ReporteJornadas.parseFechaISO(undefined), null);
});

test('obtenerRecursos starts with no crest and no Poppins until prepararRecursos loads them', () => {
  const recursos = ReporteJornadas.obtenerRecursos();
  assert.equal(recursos.escudoDataUrl, null);
  assert.equal(recursos.poppinsDisponible, false);
});

test('formatearFechaInputISO formats yyyy-mm-dd without a UTC day-shift', () => {
  // new Date('2026-09-24') is parsed as UTC midnight; in a negative UTC
  // offset zone (e.g. America/Caracas, UTC-4) toLocaleDateString would show
  // 23/09/2026 instead of 24/09/2026. Splitting the string avoids that.
  assert.equal(ReporteJornadas.formatearFechaInputISO('2026-09-24'), '24/09/2026');
  assert.equal(ReporteJornadas.formatearFechaInputISO(''), '');
});

// ---------------------------------------------------------------------------
// buildDocDefinition — pdfmake document structure (T2)
// ---------------------------------------------------------------------------

// Only descends into pdfmake's content-bearing keys, so style properties
// that happen to be strings (color, alignment, fillColor, ...) are never
// mistaken for visible text.
const CLAVES_CONTENIDO = ['text', 'stack', 'columns', 'content'];

function aplanarTextos(nodo, out) {
  if (nodo === null || nodo === undefined) return out;
  if (typeof nodo === 'string') {
    out.push(nodo);
    return out;
  }
  if (typeof nodo !== 'object') {
    return out;
  }
  if (Array.isArray(nodo)) {
    nodo.forEach((n) => aplanarTextos(n, out));
    return out;
  }
  if (nodo.table && Array.isArray(nodo.table.body)) {
    aplanarTextos(nodo.table.body, out);
  }
  CLAVES_CONTENIDO.forEach((clave) => {
    if (Object.prototype.hasOwnProperty.call(nodo, clave)) aplanarTextos(nodo[clave], out);
  });
  return out;
}

function textoCompleto(nodo) {
  return aplanarTextos(nodo, []).join(' | ');
}

function encontrarTablaPrincipal(nodo) {
  if (nodo === null || nodo === undefined || typeof nodo !== 'object') return null;
  if (Array.isArray(nodo)) {
    for (const item of nodo) {
      const r = encontrarTablaPrincipal(item);
      if (r) return r;
    }
    return null;
  }
  if (nodo.table && nodo.table.headerRows === 1 && Array.isArray(nodo.table.widths) && nodo.table.widths.length === 4) {
    return nodo.table;
  }
  for (const key of Object.keys(nodo)) {
    const r = encontrarTablaPrincipal(nodo[key]);
    if (r) return r;
  }
  return null;
}

function construirDocBase(overrides) {
  const agrupado = agrupar(HEADER, FIXTURE_ROWS);
  return ReporteJornadas.buildDocDefinition(
    Object.assign(
      {
        agrupado,
        periodoInicio: new Date(2025, 6, 15),
        periodoFin: new Date(2025, 6, 15),
        responsable: null,
        escudoDataUrl: null,
        fechaGeneracion: new Date(2026, 8, 24, 16, 50),
        poppinsDisponible: false,
      },
      overrides || {}
    )
  );
}

test('buildDocDefinition builds a table with a single header row and 4 columns', () => {
  const doc = construirDocBase();
  const tabla = encontrarTablaPrincipal(doc.content);
  assert.ok(tabla, 'expected to find the shifts table in doc.content');
  assert.equal(tabla.headerRows, 1);
  assert.deepEqual(tabla.widths, ['*', 100, 100, 80]);
  assert.equal(tabla.dontBreakRows, true);

  const header = tabla.body[0];
  assert.equal(header.length, 4);
  assert.equal(textoCompleto(header[0]), 'FECHA');
  assert.equal(textoCompleto(header[1]), 'ENTRADA');
  assert.equal(textoCompleto(header[2]), 'SALIDA');
  assert.equal(textoCompleto(header[3]), 'TIEMPO');
});

test('buildDocDefinition renders one group row per person plus one row per shift', () => {
  const doc = construirDocBase();
  const tabla = encontrarTablaPrincipal(doc.content);

  // header (1) + Diego (1 group + 1 shift) + Guy (1 group + 1 shift) + Teodosio (1 group + 2 shifts)
  assert.equal(tabla.body.length, 1 + 2 + 2 + 3);

  const filasGrupo = tabla.body.filter((fila) => fila[0] && fila[0].colSpan === 4);
  assert.equal(filasGrupo.length, 3);
  assert.ok(textoCompleto(filasGrupo[0]).includes('Diego Andres Avendaño Gudiño'));
  assert.ok(textoCompleto(filasGrupo[0]).includes('C.I. 26881623'));
  assert.ok(textoCompleto(filasGrupo[0]).includes('Docente'));
  assert.ok(textoCompleto(filasGrupo[0]).includes('1 jornada'));
  assert.ok(textoCompleto(filasGrupo[2]).includes('2 jornadas'));
});

test('buildDocDefinition renders an incomplete shift with "—" and the reason in accent color', () => {
  const rows = [['111', 'Ana', 'Perez', 'Docente', 'Entrada', '15/07/2025 08:00:00 AM']];
  const agrupado = agrupar(HEADER, rows);
  const doc = construirDocBase({ agrupado });
  const tabla = encontrarTablaPrincipal(doc.content);

  const filaTurno = tabla.body[tabla.body.length - 1];
  assert.equal(textoCompleto(filaTurno[1]), '08:00:00');
  assert.equal(textoCompleto(filaTurno[2]), '—');
  assert.equal(textoCompleto(filaTurno[3]), 'Sin salida');
  assert.equal(filaTurno[3].color, '#9a3412');
});

test('buildDocDefinition omits the signature block when no responsable name is given', () => {
  const sinResponsable = construirDocBase({ responsable: null });
  assert.ok(!textoCompleto(sinResponsable.content).includes('RESPONSABLE DEL REPORTE'));

  const conResponsable = construirDocBase({
    responsable: {
      nombre: 'PowellS',
      cargo: 'Gerente de Proyectos',
      departamento: 'Gerencia',
      fechaEmisionISO: '2026-09-24',
    },
  });
  const texto = textoCompleto(conResponsable.content);
  assert.ok(texto.includes('RESPONSABLE DEL REPORTE'));
  assert.ok(texto.includes('PowellS'));
  assert.ok(texto.includes('Gerente de Proyectos'));
  assert.ok(texto.includes('24/09/2026'));
});

test('buildDocDefinition footer renders generation timestamp and page X of Y', () => {
  const doc = construirDocBase();
  const footer = doc.footer(2, 3, { width: 595, height: 842 });
  const texto = textoCompleto(footer);
  assert.ok(texto.includes('24/09/2026'));
  assert.ok(texto.includes('16:50'));
  assert.ok(texto.includes('Página 2 de 3'));
});

test('buildDocDefinition uses Poppins as defaultStyle font only when available', () => {
  const conPoppins = construirDocBase({ poppinsDisponible: true });
  const sinPoppins = construirDocBase({ poppinsDisponible: false });
  assert.equal(conPoppins.defaultStyle.font, 'Poppins');
  assert.equal(sinPoppins.defaultStyle.font, 'Roboto');
});

test('buildDocDefinition includes the crest image only when MOSTRAR_ESCUDO and a data URL are given', () => {
  const conEscudo = construirDocBase({ escudoDataUrl: 'data:image/png;base64,AAAA' });
  assert.ok(conEscudo.images && Object.keys(conEscudo.images).length === 1);

  const sinEscudo = construirDocBase({ escudoDataUrl: null });
  assert.ok(!sinEscudo.images || Object.keys(sinEscudo.images).length === 0);
});
