// Fecha/Hora cells read "dd/mm/yyyy hh:mm:ss AM"; DataTables would sort that
// as text (by day of the month first), so order it by the real date instead.
$.fn.dataTable.ext.type.order['fecha-hora-pre'] = function (valor) {
    var fecha = ReporteJornadas.parseFechaHora(valor);
    return fecha ? fecha.getTime() : 0;
};

var tabla;
var responsableData = {};

// Responsive layer: on phones, DataTables rows render as stacked cards
// (see responsive.css). This sets a data-label on every <td> from its
// column's header text so each value keeps a visible label; generic so it
// works for every DataTable on the site, not just this page's.
function etiquetarFilasResponsive(api) {
    var encabezados = api.columns().header().toArray().map(function (th) {
        return $(th).text().trim();
    });
    api.rows().nodes().each(function (fila) {
        $(fila).find('td').each(function (i) {
            if (encabezados[i]) $(this).attr('data-label', encabezados[i]);
        });
    });
}

// Phones only: a single "Exportar" button reveals the Excel/PDF buttons
// DataTables Buttons already renders into #datatables_buttons_container,
// instead of showing them inline. Desktop is untouched (the toggle
// stays hidden there via CSS) and every button keeps its existing handler.
$(document).on('click', '#btnExportarToggle', function () {
    var $contenedor = $('#datatables_buttons_container');
    var abierto = $contenedor.toggleClass('is-open').hasClass('is-open');
    $(this).attr('aria-expanded', abierto ? 'true' : 'false');
});

//funcion que se ejecuta al inicio
function init(){
   $("#formulario").on("submit",function(e){
   	guardaryeditar(e);
   })

   // Set current date for fecha_emision. Only the report pages
   // (rptasistencia*.php) have this field; on the list pages it doesn't
   // exist, and failing here stopped init() before the tables loaded.
   var fechaEmision = document.getElementById('fecha_emision');
   if (fechaEmision) fechaEmision.valueAsDate = new Date();

   // Iniciar cargas asíncronas y guardar sus promesas
   var cargaPersonas = $.post("../ajax/asistencia.php?op=selectPersona", function(r){
   	$("#idcliente").html(r);
   	$('#idcliente').selectpicker('refresh');
   });

   var cargaDeptos = $.post("../ajax/departamento.php?op=selectDepartamento", function(r){
       $("#departamento").html(r);
   });

   // Esperar a que ambas cargas terminen antes de inicializar las tablas
   $.when(cargaPersonas, cargaDeptos).done(function() {
       listar();
       listaru();
   }).fail(function() {
       console.error("Error al cargar datos iniciales para los selectores.");
       bootbox.alert("Error al cargar datos iniciales. Es posible que la página no funcione correctamente.");
   });
}

function cargarDepartamentos(){
    $.post("../ajax/departamento.php?op=selectDepartamento", function(r){
        $("#departamento").html(r);
    });
}

// Two "Responsable del reporte" modals exist: the report pages
// (rptasistencia*.php) ship their own (#confirmarResponsable,
// #responsableForm), while the list pages only have the shared one from
// footer.php (#confirmarResponsableBtn, #formResponsable). Use whichever
// the page has, so the PDF button works on every page that shows it.
function modalResponsable() {
    if (document.getElementById('confirmarResponsable')) {
        return {
            boton: '#confirmarResponsable',
            formulario: document.getElementById('responsableForm'),
            leer: function () {
                return {
                    nombre: $('#nombre_completo').val(),
                    cargo: $('#cargo').val(),
                    departamento: $('#departamento option:selected').text(),
                    fecha: $('#fecha_emision').val()
                };
            }
        };
    }
    var fecha = document.getElementById('responsable_fecha');
    if (fecha && !fecha.value) fecha.valueAsDate = new Date();
    return {
        boton: '#confirmarResponsableBtn',
        formulario: document.getElementById('formResponsable'),
        leer: function () {
            var cargo = $('#responsable_cargo').val();
            var departamento = $('#responsable_departamento').val();
            return {
                nombre: $('#responsable_nombre').val(),
                cargo: cargo === 'Otro' ? $('#responsable_cargo_otro').val() : cargo,
                departamento: departamento === 'Otro' ? $('#responsable_departamento_otro').val() : departamento,
                fecha: $('#responsable_fecha').val()
            };
        }
    };
}

function getPdfButtonDefinition() {
    return {
        extend: 'pdfHtml5',
        text: 'PDF',
        className: 'btn btn-danger align-middle',
        attr:  {
            style: 'margin-top: -2px !important;' // Adjust as needed
        },
        title: ' ', // Remove default title
        orientation: 'portrait',
        pageSize: 'A4',
        action: function ( e, dt, node, config ) {
            var _this = this;
            // Original action reference, captured at the point of button definition
            var originalAction = $.fn.dataTable.ext.buttons.pdfHtml5.action;

            var modal = modalResponsable();

            $('#responsableModal').modal('show');

            $(modal.boton).off('click.pdf').on('click.pdf', function() {
                if (modal.formulario.checkValidity()) {
                    // Update the global responsableData here, before the AJAX call
                    responsableData = modal.leer();

                    $.post("../ajax/asistencia.php?op=guardar_responsable", {
                        nombre_responsable: responsableData.nombre,
                        cargo_responsable: responsableData.cargo,
                        departamento_responsable: responsableData.departamento,
                        fecha_emision: responsableData.fecha,
                        tipo_reporte: 'asistencia'
                    }, function(response){
                        // Ensure response is parsed if it's a JSON string
                        try {
                            if (typeof response === 'string') {
                                response = JSON.parse(response);
                            }
                        } catch (e) {
                            console.error('Error parsing AJAX response:', e);
                            bootbox.alert('Error en el formato de la respuesta del servidor.');
                            $('#responsableModal').modal('hide');
                            return;
                        }

                        if (response && response.success) { // Check for success property
                            $(modal.boton).blur();
                            $('#responsableModal').modal('hide');
                            // Load the report resources (crest, fonts) before handing
                            // control to pdfmake; prepararRecursos() never rejects, so
                            // the PDF still renders (without those extras) on failure.
                            ReporteJornadas.prepararRecursos('../').then(function () {
                                originalAction.call(_this, e, dt, node, config);
                            });
                        } else {
                            console.error('Error saving responsable:', response ? response.message : 'Unknown error from server');
                            bootbox.alert('Error al guardar la información del responsable: ' + (response ? response.message : 'Error desconocido.'));
                            $('#responsableModal').modal('hide');
                        }
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.error('AJAX request failed for guardar_responsable:', textStatus, errorThrown, jqXHR.responseText);
                        bootbox.alert('Error de comunicación al guardar la información del responsable.');
                        $('#responsableModal').modal('hide');
                    });
                } else {
                    modal.formulario.reportValidity();
                }
            });
        },
        customize: function(doc) {
            try {
                // DataTables Buttons builds doc.content from whatever the table
                // currently renders; find that table node instead of assuming a
                // fixed position, so this works across Buttons versions and pages.
                var nodoTabla = encontrarNodoTabla(doc.content);
                if (!nodoTabla) {
                    throw new Error('No se encontró la tabla de asistencia en el documento PDF.');
                }

                var filasCrudas = nodoTabla.table.body;
                var encabezado = filasCrudas[0].map(ReporteJornadas.textoDeCelda);
                var cuerpo = filasCrudas.slice(1).map(function (fila) {
                    return fila.map(ReporteJornadas.textoDeCelda);
                });

                var mapaColumnas = ReporteJornadas.mapearColumnas(encabezado);
                var filas = ReporteJornadas.extraerFilas(mapaColumnas, cuerpo);
                var agrupado = ReporteJornadas.agruparJornadas(filas);

                var periodo = calcularPeriodo(filas);

                var recursos = ReporteJornadas.obtenerRecursos();
                var responsable = (responsableData && responsableData.nombre) ? {
                    nombre: responsableData.nombre,
                    cargo: responsableData.cargo,
                    departamento: responsableData.departamento,
                    fechaEmisionISO: responsableData.fecha
                } : null;

                var nuevoDoc = ReporteJornadas.buildDocDefinition({
                    agrupado: agrupado,
                    periodoInicio: periodo.inicio,
                    periodoFin: periodo.fin,
                    responsable: responsable,
                    escudoDataUrl: recursos.escudoDataUrl,
                    fechaGeneracion: new Date(),
                    poppinsDisponible: !!recursos.poppinsDisponible
                });

                delete doc.header; // the letterhead now lives in doc.content instead
                doc.content = nuevoDoc.content;
                doc.footer = nuevoDoc.footer;
                doc.pageMargins = nuevoDoc.pageMargins;
                doc.styles = nuevoDoc.styles;
                doc.defaultStyle = nuevoDoc.defaultStyle;
                if (nuevoDoc.images) doc.images = nuevoDoc.images;
            } catch (error) {
                console.error('CRITICAL ERROR during PDF customization:', error);
                bootbox.alert('Error crítico al personalizar el documento PDF. Por favor, revisa la consola para más detalles.');
            }
        }
    };
}

// Recursively finds the pdfmake table node ({ table: { body: [...] } })
// inside doc.content, wherever DataTables Buttons placed it.
function encontrarNodoTabla(contenido) {
    if (!contenido) return null;
    if (Array.isArray(contenido)) {
        for (var i = 0; i < contenido.length; i++) {
            var resultado = encontrarNodoTabla(contenido[i]);
            if (resultado) return resultado;
        }
        return null;
    }
    if (typeof contenido === 'object') {
        if (contenido.table && Array.isArray(contenido.table.body)) return contenido;
        for (var clave in contenido) {
            if (Object.prototype.hasOwnProperty.call(contenido, clave)) {
                var anidado = encontrarNodoTabla(contenido[clave]);
                if (anidado) return anidado;
            }
        }
    }
    return null;
}

// Period shown in the metadata row: #fecha_inicio/#fecha_fin when present
// (rptasistencia.php, rptasistenciau.php), else the min/max date found in
// the exported rows, else today (empty table, nothing else to show).
function calcularPeriodo(filas) {
    var inicio = ReporteJornadas.parseFechaISO($('#fecha_inicio').val());
    var fin = ReporteJornadas.parseFechaISO($('#fecha_fin').val());

    if (!inicio || !fin) {
        var tiempos = filas.map(function (fila) { return fila.fecha.getTime(); });
        if (tiempos.length) {
            if (!inicio) inicio = new Date(Math.min.apply(null, tiempos));
            if (!fin) fin = new Date(Math.max.apply(null, tiempos));
        } else {
            if (!inicio) inicio = new Date();
            if (!fin) fin = new Date();
        }
    }

    return { inicio: inicio, fin: fin };
}

// Excel export of the attendance tables: same source (the exported table
// rows), same shift grouping and same period as the PDF, one sheet row per
// shift. No responsable modal here.
function getExcelButtonDefinition() {
    return {
        extend: 'excelHtml5', // keeps Buttons' .buttons-excel class (green)
        text: 'Excel',
        action: function (e, dt, node, config) {
            generarExcelAsistencia(dt, config);
        }
    };
}

function generarExcelAsistencia(dt, config) {
    Promise.resolve().then(function () {
        // The same export data the PDF button feeds to pdfmake.
        var datos = dt.buttons.exportData(config && config.exportOptions);
        var def = construirDefExcelAsistencia(datos.header, datos.body, new Date());
        if (!def) {
            bootbox.alert('No hay registros de asistencia para exportar.');
            return;
        }
        return ReporteExcel.descargar(def);
    }).catch(function (error) {
        console.error('Error generando el Excel de asistencia:', error);
        bootbox.alert('No se pudo generar el Excel de asistencia.');
    });
}

// Builds the ReporteExcel definition from the table's header and body cells.
// Returns null when there is nothing to export.
function construirDefExcelAsistencia(encabezado, cuerpo, hoy) {
    var mapa = ReporteJornadas.mapearColumnas(encabezado.map(ReporteJornadas.textoDeCelda));
    var filas = ReporteJornadas.extraerFilas(mapa, cuerpo);
    var agrupado = ReporteJornadas.agruparJornadas(filas);
    var filasExcel = construirFilasExcelJornadas(agrupado, filas);
    if (!filasExcel.length) return null;

    var periodo = calcularPeriodo(filas);
    var inicioISO = ReporteExcel.fechaISO(periodo.inicio);
    var finISO = ReporteExcel.fechaISO(periodo.fin);

    return {
        archivo: 'asistencia-' + inicioISO + (finISO === inicioISO ? '' : '_' + finISO) + '.xlsx',
        hoja: 'Jornadas',
        titulo: ReporteJornadas.INSTITUCION_NOMBRE,
        subtitulo: 'Reporte de asistencia · ' + ReporteExcel.fechaDMY(periodo.inicio) +
            ' al ' + ReporteExcel.fechaDMY(periodo.fin) +
            ' · Emitido el ' + ReporteExcel.fechaDMY(hoy),
        columnas: [
            { titulo: 'C.I.', ancho: 12, tipo: 'texto' },
            { titulo: 'Nombres', ancho: 18, tipo: 'texto' },
            { titulo: 'Apellidos', ancho: 20, tipo: 'texto' },
            { titulo: 'Cargo', ancho: 14, tipo: 'texto' },
            { titulo: 'Fecha', ancho: 12, tipo: 'fecha' },
            { titulo: 'Entrada', ancho: 10, tipo: 'hora' },
            { titulo: 'Salida', ancho: 10, tipo: 'hora' },
            { titulo: 'Tiempo', ancho: 10, tipo: 'duracion' },
            { titulo: 'Estado', ancho: 12, tipo: 'texto' }
        ],
        filas: filasExcel,
        total: { etiqueta: 'Total', columnas: [7] }
    };
}

// One row per shift: C.I., Nombres, Apellidos, Cargo, Fecha, Entrada, Salida,
// Tiempo (seconds, complete shifts only), Estado. Persons keep the PDF's
// order (by full name) and agruparJornadas already emits each person's
// shifts in date order. agruparJornadas only keeps the combined
// nombreCompleto, so the separate Nombres/Apellidos come from the extracted
// marks, looked up with the same grouping key (cédula, else full name).
function construirFilasExcelJornadas(agrupado, filas) {
    var nombresPorClave = {};
    (filas || []).forEach(function (fila) {
        var clave = fila.cedula || (fila.nombres + ' ' + fila.apellidos).replace(/\s+/g, ' ').trim();
        if (!nombresPorClave[clave]) {
            nombresPorClave[clave] = { nombres: fila.nombres, apellidos: fila.apellidos };
        }
    });

    var filasExcel = [];
    agrupado.personas.forEach(function (persona) {
        var nombres = nombresPorClave[persona.cedula || persona.nombreCompleto] ||
            { nombres: persona.nombreCompleto, apellidos: '' };
        persona.jornadas.forEach(function (jornada) {
            filasExcel.push([
                persona.cedula,
                nombres.nombres,
                nombres.apellidos,
                persona.cargo,
                // Date only: the shift's day, without the entry time.
                new Date(jornada.fecha.getFullYear(), jornada.fecha.getMonth(), jornada.fecha.getDate()),
                jornada.entrada,
                jornada.salida,
                jornada.incompleta ? null : jornada.segundos,
                jornada.incompleta ? jornada.motivo : 'Completa'
            ]);
        });
    });
    return filasExcel;
}

//funcion listar
function listar(){
	tabla=$('#tbllistado').dataTable({
		"aProcessing": true,//activamos el procedimiento del datatable
		"aServerSide": true,//paginacion y filrado realizados por el server
		dom: 'Bfrtip',//definimos los elementos del control de la tabla
		buttons: [
                  getExcelButtonDefinition(),
                  getPdfButtonDefinition()
		],
		"ajax":
		{
			url:'../ajax/asistencia.php?op=listar',
			type: "get",
			dataType : "json",
			error:function(e){
				console.log(e.responseText);
			}
		},
		"bDestroy":true,
		drawCallback: function () { etiquetarFilasResponsive(this.api()); },
		"iDisplayLength":10,//paginacion
		"columnDefs":[{"targets":5,"type":"fecha-hora"}],
		"order":[[5,"desc"]]//newest Fecha/Hora first
	}).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}
function listaru(){
	tabla=$('#tbllistadou').dataTable({
		"aProcessing": true,//activamos el procedimiento del datatable
		"aServerSide": true,//paginacion y filrado realizados por el server
		dom: 'Bfrtip',//definimos los elementos del control de la tabla
		buttons: [
                  getExcelButtonDefinition(),
                  getPdfButtonDefinition()
		],
		"ajax":
		{
			url:'../ajax/asistencia.php?op=listaru',
			type: "get",
			dataType : "json",
			error:function(e){
				console.log(e.responseText);
			}
		},
		"bDestroy":true,
		drawCallback: function () { etiquetarFilasResponsive(this.api()); },
		"iDisplayLength":10,//paginacion
		"columnDefs":[{"targets":5,"type":"fecha-hora"}],
		"order":[[5,"desc"]]//newest Fecha/Hora first
	}).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}



function listar_asistencia(){
var  fecha_inicio = $("#fecha_inicio").val();
 var fecha_fin = $("#fecha_fin").val();
 var idcliente = $("#idcliente").val();

	tabla=$('#tbllistado_asistencia').dataTable({
		"aProcessing": true,//activamos el procedimiento del datatable
		"aServerSide": true,//paginacion y filrado realizados por el server
		dom: 'Bfrtip',//definimos los elementos del control de la tabla
		buttons: [
                  getExcelButtonDefinition(),
                  getPdfButtonDefinition()
		],
		"ajax":
		{
			url:'../ajax/asistencia.php?op=listar_asistencia',
			data:{fecha_inicio:fecha_inicio, fecha_fin:fecha_fin, idcliente: idcliente},
			type: "get",
			dataType : "json",
			error:function(e){
				console.log(e.responseText);
			}
		},
		"bDestroy":true,
		drawCallback: function () { etiquetarFilasResponsive(this.api()); },
		"iDisplayLength":10,//paginacion
		"columnDefs":[{"targets":5,"type":"fecha-hora"}],
		"order":[[5,"desc"]]//newest Fecha/Hora first
	}).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}
function listar_asistencia_todos(){
    var fecha_inicio = $("#fecha_inicio").val();
    var fecha_fin = $("#fecha_fin").val();
    var idcliente = 'todos';

    tabla=$('#tbllistado_asistencia').dataTable({
        "aProcessing": true,//activamos el procedimiento del datatable
        "aServerSide": true,//paginacion y filrado realizados por el server
        dom: 'Bfrtip',//definimos los elementos del control de la tabla
        buttons: [
            getExcelButtonDefinition(),
            getPdfButtonDefinition()
        ],
        "ajax":
        {
            url:'../ajax/asistencia.php?op=listar_asistencia',
            data:{fecha_inicio:fecha_inicio, fecha_fin:fecha_fin, idcliente: idcliente},
            type: "get",
            dataType : "json",
            error:function(e){
                console.log(e.responseText);
            }
        },
        "bDestroy":true,
		drawCallback: function () { etiquetarFilasResponsive(this.api()); },
        "iDisplayLength":10,//paginacion
        "columnDefs":[{"targets":5,"type":"fecha-hora"}],
		"order":[[5,"desc"]]//newest Fecha/Hora first
    }).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}

function listar_asistenciau(){
var  fecha_inicio = $("#fecha_inicio").val();
 var fecha_fin = $("#fecha_fin").val();

	tabla=$('#tbllistado_asistenciau').dataTable({
		"aProcessing": true,//activamos el procedimiento del datatable
		"aServerSide": true,//paginacion y filrado realizados por el server
		dom: 'Bfrtip',//definimos los elementos del control de la tabla
		buttons: [
                  getExcelButtonDefinition(),
                  getPdfButtonDefinition()
		],
		"ajax":
		{
			url:'../ajax/asistencia.php?op=listar_asistenciau',
			data:{fecha_inicio:fecha_inicio, fecha_fin:fecha_fin},
			type: "get",
			dataType : "json",
			error:function(e){
				console.log(e.responseText);
			}
		},
		"bDestroy":true,
		drawCallback: function () { etiquetarFilasResponsive(this.api()); },
		"iDisplayLength":10,//paginacion
		"columnDefs":[{"targets":5,"type":"fecha-hora"}],
		"order":[[5,"desc"]]//newest Fecha/Hora first
	}).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}



init();