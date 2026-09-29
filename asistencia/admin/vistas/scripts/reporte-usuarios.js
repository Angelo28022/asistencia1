/* global module, require */
/*
 * Users PDF report ("Usuarios del sistema").
 *
 * Plain ES5-compatible browser script used by the PDF button of usuario.js.
 * It reuses the letterhead, signature block and footer of ReporteJornadas,
 * so every report of the system shares the same look.
 */
var ReporteUsuarios = (function (RJ) {
  'use strict';

  var COLORES = RJ.COLORES;
  var TIPO_ADMINISTRADOR = 'administrador';

  // "YYYY-MM-DD HH:MM:SS" (MariaDB DATETIME) -> "dd/mm/yyyy"; zero or
  // malformed dates -> "—".
  function formatearFechaSQL(valor) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
    if (!m || m[1] === '0000') return '—';
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function esAdministrador(tipo) {
    return RJ.normalizarTexto(tipo) === TIPO_ADMINISTRADOR;
  }

  function normalizarUsuarios(filas) {
    return (filas || [])
      .map(function (fila) {
        var cedula = String(fila.codigo_persona || '').trim();
        return {
          nombreCompleto: [RJ.normalizarNombre(fila.nombre), RJ.normalizarNombre(fila.apellidos)].join(' ').trim(),
          // codigo_persona holds the cédula, except for legacy accounts
          // such as admin (codigo_persona = "admin").
          cedula: /^\d+$/.test(cedula) ? cedula : '',
          login: String(fila.login || '').trim(),
          departamento: fila.departamento || '—',
          tipo: fila.tipo || '—',
          administrador: esAdministrador(fila.tipo),
          registrado: formatearFechaSQL(fila.fechacreado)
        };
      })
      .sort(function (a, b) {
        return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es');
      });
  }

  function calcularTotales(usuarios) {
    var departamentos = {};
    var administradores = 0;
    usuarios.forEach(function (u) {
      if (u.administrador) administradores += 1;
      if (u.departamento !== '—') departamentos[u.departamento] = true;
    });
    return {
      usuarios: usuarios.length,
      administradores: administradores,
      departamentos: Object.keys(departamentos).length
    };
  }

  function construirTitulo(opciones) {
    var estiloTitulo = { text: 'Usuarios del sistema', fontSize: 20, bold: true, color: COLORES.acento, margin: [0, 0, 0, 2] };
    if (opciones.poppinsDisponible) estiloTitulo.font = 'PoppinsBold';

    return {
      stack: [
        estiloTitulo,
        { text: 'Cuentas registradas con su departamento y tipo de acceso', fontSize: 10, color: COLORES.muted }
      ],
      margin: [0, 16, 0, 0]
    };
  }

  function construirMetadatos(totales) {
    return {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            RJ.metaColumna('Usuarios', String(totales.usuarios)),
            RJ.metaColumna('Administradores', String(totales.administradores)),
            RJ.metaColumna('Departamentos', String(totales.departamentos))
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

  function celdaNombre(u) {
    var stack = [{ text: u.nombreCompleto, fontSize: 10.5, bold: true, color: COLORES.ink }];
    if (u.cedula) {
      stack.push({ text: 'C.I. ' + u.cedula, fontSize: 9, color: COLORES.muted, margin: [0, 1, 0, 0] });
    }
    return { stack: stack };
  }

  function celdaTipo(u) {
    var estilo = { fontSize: 10, margin: [0, 2, 0, 0] };
    if (u.administrador) {
      estilo.bold = true;
      estilo.color = COLORES.acento;
    }
    return RJ.celdaTexto(u.tipo, estilo);
  }

  function construirTabla(usuarios) {
    var estiloEncabezado = { bold: true, fontSize: 9, color: COLORES.acento, fillColor: COLORES.headerFill };
    var cuerpo = [
      [
        RJ.celdaTexto('NOMBRE', estiloEncabezado),
        RJ.celdaTexto('USUARIO', estiloEncabezado),
        RJ.celdaTexto('DEPARTAMENTO', estiloEncabezado),
        RJ.celdaTexto('TIPO', estiloEncabezado),
        RJ.celdaTexto('REGISTRADO', Object.assign({ alignment: 'right' }, estiloEncabezado))
      ]
    ];

    usuarios.forEach(function (u) {
      cuerpo.push([
        celdaNombre(u),
        RJ.celdaTexto(u.login, { fontSize: 10, margin: [0, 2, 0, 0] }),
        RJ.celdaTexto(u.departamento, { fontSize: 10, margin: [0, 2, 0, 0] }),
        celdaTipo(u),
        RJ.celdaTexto(u.registrado, { fontSize: 10, alignment: 'right', margin: [0, 2, 0, 0] })
      ]);
    });

    // No dontBreakRows: in the bundled pdfmake 0.1.x it redraws each row's
    // top line again at the row's bottom (see reporte-jornadas.js).
    return {
      table: {
        headerRows: 1,
        widths: ['*', 78, 88, 78, 66],
        body: cuerpo
      },
      layout: {
        hLineWidth: function (i, node) {
          if (i === 0 || i === node.table.body.length) return 0;
          return i === 1 ? 1 : 0.5;
        },
        vLineWidth: function () {
          return 0;
        },
        hLineColor: function (i) {
          return i === 1 ? COLORES.acento : COLORES.ruleLight;
        },
        paddingTop: function (i) {
          return i === 0 ? 8 : 7;
        },
        paddingBottom: function () {
          return 7;
        }
      },
      margin: [0, 18, 0, 0]
    };
  }

  // opciones: { usuarios (raw rows from ajax/usuario.php?op=reporte),
  // responsable: { nombre, cargo, departamento, fechaEmisionISO },
  // fechaGeneracion: Date, escudoDataUrl, poppinsDisponible }
  function buildDocDefinition(opciones) {
    var usuarios = normalizarUsuarios(opciones.usuarios);

    var contenido = [
      RJ.construirLetterhead(opciones),
      construirTitulo(opciones),
      construirMetadatos(calcularTotales(usuarios)),
      construirTabla(usuarios)
    ];

    var firma = RJ.construirFirma(opciones);
    if (firma) contenido.push(firma);

    var doc = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [42, 36, 42, 48],
      content: contenido,
      footer: RJ.construirFooter(opciones),
      defaultStyle: {
        font: opciones.poppinsDisponible ? 'Poppins' : 'Roboto',
        fontSize: 10,
        color: COLORES.ink
      },
      styles: {}
    };

    if (RJ.MOSTRAR_ESCUDO && opciones.escudoDataUrl) {
      doc.images = { escudo: opciones.escudoDataUrl };
    }

    return doc;
  }

  return {
    normalizarUsuarios: normalizarUsuarios,
    calcularTotales: calcularTotales,
    buildDocDefinition: buildDocDefinition
  };
})(typeof ReporteJornadas !== 'undefined' ? ReporteJornadas : require('./reporte-jornadas.js'));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReporteUsuarios;
}
