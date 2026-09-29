/* global module, require */
/*
 * User types PDF report ("Tipos de usuario").
 *
 * Plain ES5-compatible browser script used by the PDF button of
 * tipousuario.js. It reuses the letterhead, signature block and footer of
 * ReporteJornadas, so every report of the system shares the same look.
 */
var ReporteTipos = (function (RJ) {
  'use strict';

  var COLORES = RJ.COLORES;

  // Width (pt) of the user-count bar track; the filled part is scaled
  // against the user type with the most users.
  var ANCHO_BARRA = 70;
  var COLOR_PISTA_BARRA = '#e3e8f2';

  // Normalized name of the user type counted as "Administradores".
  var TIPO_ADMINISTRADOR = 'administrador';

  function plural(cantidad, singular, pluralTexto) {
    return cantidad + ' ' + (cantidad === 1 ? singular : pluralTexto);
  }

  function capitalizar(texto) {
    var str = texto === undefined || texto === null ? '' : String(texto).trim();
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // "YYYY-MM-DD HH:MM:SS" (MariaDB DATETIME) -> "dd/mm/yyyy". Zero or
  // malformed dates (legacy desactivar/activar write '0'/'1') -> "—".
  function formatearFechaSQL(valor) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
    if (!m || m[1] === '0000') return '—';
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function normalizarTipos(filas) {
    return (filas || []).map(function (fila) {
      return {
        nombre: capitalizar(fila.nombre),
        descripcion: capitalizar(fila.descripcion),
        registrado: formatearFechaSQL(fila.fechacreada),
        usuarios: parseInt(fila.usuarios, 10) || 0,
        esAdministrador: RJ.normalizarTexto(fila.nombre) === TIPO_ADMINISTRADOR
      };
    });
  }

  function calcularTotales(tipos) {
    return tipos.reduce(
      function (acc, t) {
        acc.usuarios += t.usuarios;
        if (t.esAdministrador) acc.administradores += t.usuarios;
        if (t.usuarios > acc.maximo) acc.maximo = t.usuarios;
        return acc;
      },
      { tipos: tipos.length, usuarios: 0, administradores: 0, maximo: 0 }
    );
  }

  function construirTitulo(opciones) {
    var estiloTitulo = { text: 'Tipos de usuario', fontSize: 20, bold: true, color: COLORES.acento, margin: [0, 0, 0, 2] };
    if (opciones.poppinsDisponible) estiloTitulo.font = 'PoppinsBold';

    return {
      stack: [
        estiloTitulo,
        { text: 'Niveles de acceso al sistema y usuarios asignados a cada uno', fontSize: 10, color: COLORES.muted }
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
            RJ.metaColumna('Tipos', String(totales.tipos)),
            RJ.metaColumna('Usuarios', String(totales.usuarios)),
            RJ.metaColumna('Administradores', String(totales.administradores))
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

  function celdaTipo(t) {
    var stack = [{ text: t.nombre, fontSize: 10.5, bold: true, color: COLORES.ink }];
    if (t.descripcion) {
      stack.push({ text: t.descripcion, fontSize: 9, color: COLORES.muted, margin: [0, 1, 0, 0] });
    }
    return { stack: stack };
  }

  function celdaUsuarios(t, maximo) {
    if (t.usuarios === 0) {
      return RJ.celdaTexto('Sin usuarios', { fontSize: 9, color: COLORES.muted, margin: [0, 3, 0, 0] });
    }

    var relleno = Math.max(6, Math.round((ANCHO_BARRA * t.usuarios) / maximo));
    return {
      columns: [
        { text: String(t.usuarios), width: 16, alignment: 'right', bold: true, fontSize: 10.5 },
        {
          width: ANCHO_BARRA,
          canvas: [
            { type: 'rect', x: 0, y: 5, w: ANCHO_BARRA, h: 6, r: 3, color: COLOR_PISTA_BARRA },
            { type: 'rect', x: 0, y: 5, w: relleno, h: 6, r: 3, color: COLORES.acento }
          ]
        }
      ],
      columnGap: 8,
      margin: [0, 2, 0, 0]
    };
  }

  function construirTabla(tipos, totales) {
    var estiloEncabezado = { bold: true, fontSize: 9, color: COLORES.acento, fillColor: COLORES.headerFill };
    var cuerpo = [
      [
        RJ.celdaTexto('TIPO', estiloEncabezado),
        RJ.celdaTexto('USUARIOS', estiloEncabezado),
        RJ.celdaTexto('REGISTRADO', Object.assign({ alignment: 'right' }, estiloEncabezado))
      ]
    ];

    tipos.forEach(function (t) {
      cuerpo.push([
        celdaTipo(t),
        celdaUsuarios(t, totales.maximo),
        RJ.celdaTexto(t.registrado, { fontSize: 10, alignment: 'right', margin: [0, 2, 0, 0] })
      ]);
    });

    cuerpo.push([
      RJ.celdaTexto('Total', { bold: true, fontSize: 10.5 }),
      RJ.celdaTexto(plural(totales.usuarios, 'usuario', 'usuarios'), { bold: true, fontSize: 10.5 }),
      RJ.celdaTexto('')
    ]);

    var filaTotal = cuerpo.length - 1;

    return {
      // No dontBreakRows: in the bundled pdfmake 0.1.x it redraws each row's
      // top line again at the row's bottom (a stray accent line under the
      // first row and under the total).
      table: {
        headerRows: 1,
        widths: ['*', 110, 76],
        body: cuerpo
      },
      layout: {
        hLineWidth: function (i, node) {
          if (i === 0 || i === node.table.body.length) return 0;
          return i === 1 || i === filaTotal ? 1 : 0.5;
        },
        vLineWidth: function () {
          return 0;
        },
        hLineColor: function (i) {
          return i === 1 || i === filaTotal ? COLORES.acento : COLORES.ruleLight;
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

  // opciones: { tipos (raw rows from ajax/tipousuario.php?op=reporte),
  // responsable: { nombre, cargo, departamento, fechaEmisionISO },
  // fechaGeneracion: Date, escudoDataUrl, poppinsDisponible }
  function buildDocDefinition(opciones) {
    var tipos = normalizarTipos(opciones.tipos);
    var totales = calcularTotales(tipos);

    var contenido = [
      RJ.construirLetterhead(opciones),
      construirTitulo(opciones),
      construirMetadatos(totales),
      construirTabla(tipos, totales)
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
    normalizarTipos: normalizarTipos,
    calcularTotales: calcularTotales,
    buildDocDefinition: buildDocDefinition
  };
})(typeof ReporteJornadas !== 'undefined' ? ReporteJornadas : require('./reporte-jornadas.js'));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReporteTipos;
}
