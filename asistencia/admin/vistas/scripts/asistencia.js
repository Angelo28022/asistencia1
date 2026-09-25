var tabla;
var responsableData = {};

//funcion que se ejecuta al inicio
function init(){
   $("#formulario").on("submit",function(e){
   	guardaryeditar(e);
   })

   // Set current date for fecha_emision
   document.getElementById('fecha_emision').valueAsDate = new Date();

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

            $('#responsableModal').modal('show');

            $('#confirmarResponsable').off('click.pdf').on('click.pdf', function() {
                if (document.getElementById('responsableForm').checkValidity()) {
                    // Update the global responsableData here, before the AJAX call
                    responsableData = {
                        nombre: $('#nombre_completo').val(),
                        cargo: $('#cargo').val(),
                        departamento: $('#departamento option:selected').text(),
                        fecha: $('#fecha_emision').val()
                    };

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
                            $('#confirmarResponsable').blur();
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
                    document.getElementById('responsableForm').reportValidity();
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

//funcion listar
function listar(){
	tabla=$('#tbllistado').dataTable({
		"aProcessing": true,//activamos el procedimiento del datatable
		"aServerSide": true,//paginacion y filrado realizados por el server
		dom: 'Bfrtip',//definimos los elementos del control de la tabla
		buttons: [
                  'copyHtml5',
                  'excelHtml5',
                  'csvHtml5',
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
		"iDisplayLength":10,//paginacion
		"order":[[0,"desc"]]//ordenar (columna, orden)
	}).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}
function listaru(){
	tabla=$('#tbllistadou').dataTable({
		"aProcessing": true,//activamos el procedimiento del datatable
		"aServerSide": true,//paginacion y filrado realizados por el server
		dom: 'Bfrtip',//definimos los elementos del control de la tabla
		buttons: [
                  'copyHtml5',
                  'excelHtml5',
                  'csvHtml5',
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
		"iDisplayLength":10,//paginacion
		"order":[[0,"desc"]]//ordenar (columna, orden)
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
                  'copyHtml5',
                  'excelHtml5',
                  'csvHtml5',
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
		"iDisplayLength":10,//paginacion
		"order":[[0,"desc"]]//ordenar (columna, orden)
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
            'copyHtml5',
            'excelHtml5',
            'csvHtml5',
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
        "iDisplayLength":10,//paginacion
        "order":[[0,"desc"]]//ordenar (columna, orden)
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
                  'copyHtml5',
                  'excelHtml5',
                  'csvHtml5',
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
		"iDisplayLength":10,//paginacion
		"order":[[0,"desc"]]//ordenar (columna, orden)
	}).DataTable();
    tabla.buttons().container().appendTo('#datatables_buttons_container');
}



init();