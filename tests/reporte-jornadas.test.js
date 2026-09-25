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
