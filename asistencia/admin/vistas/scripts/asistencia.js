var tabla;
var responsableData = {};
var logoBase64 = '';

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
            console.log('PDF action initiated. Showing responsableModal.');
            var _this = this;
            // Original action reference, captured at the point of button definition
            var originalAction = $.fn.dataTable.ext.buttons.pdfHtml5.action;

            $('#responsableModal').modal('show');

            $('#confirmarResponsable').off('click.pdf').on('click.pdf', function() {
                console.log('Confirmar Responsable button clicked.');
                if (document.getElementById('responsableForm').checkValidity()) {
                    // Update the global responsableData here, before the AJAX call
                    responsableData = {
                        nombre: $('#nombre_completo').val(),
                        cargo: $('#cargo').val(),
                        departamento: $('#departamento option:selected').text(),
                        fecha: $('#fecha_emision').val()
                    };
                    console.log('Responsable Data captured:', responsableData);

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

                        console.log('AJAX response for guardar_responsable:', response);
                        
                        if (response && response.success) { // Check for success property
                            console.log('Responsable saved successfully. Calling original PDF action.');
                            $('#confirmarResponsable').blur();
                            $('#responsableModal').modal('hide');
                            originalAction.call(_this, e, dt, node, config);
                            console.log('Original PDF action called.');
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
                    console.warn('Responsable form validation failed.');
                    document.getElementById('responsableForm').reportValidity();
                }
            });
        },
        customize: function(doc) {
            console.log('Entering customize function for PDF.');
            console.log('Current logoBase64 length:', logoBase64 ? logoBase64.length : 'empty');
            console.log('Responsable data in customize (global variable):', responsableData); // Use the global variable
            try {
                // Header
                doc.header = function(currentPage, pageCount, pageSize) {
                    console.log('PDF Header generation started.');
                    return {
                        columns: [
                            {
                                text: 'Reporte de Asistencia',
                                alignment: 'left',
                                margin: [40, 30, 0, 0] // left, top, right, bottom
                            },
                            // Logo removido según solicitud del usuario
                            { text: '' } // Empty text to prevent document structure error
                        ],
                        margin: [40, 0] // To have the same margin on left and right
                    };
                };
                console.log('PDF Header generation finished.');

                // Footer
                doc.footer = function(currentPage, pageCount) { 
                    console.log('PDF Footer generation started.');
                    return { 
                        text: currentPage.toString() + ' de ' + pageCount,
                        alignment: 'center' 
                    }; 
                }; 
                console.log('PDF Footer generation finished.');

                // Margins for the content
                doc.pageMargins = [40, 80, 40, 60]; // left, top, right, bottom
                console.log('Page margins set.');

                // Signature Block
                // Check if responsableData is populated and has a name property
                if (responsableData && responsableData.nombre) { 
                    console.log('Adding signature block to PDF.');
                    doc.content.push({ text: ' ' });
                    doc.content.push({
                        table: {
                            widths: ['*'],
                            body: [
                                [{text: 'RESPONSABLE DEL REPORTE', style: 'tableHeader', alignment: 'center'}],
                                [{
                                    text: [
                                        {text: 'Nombre: ', bold: true}, responsableData.nombre + '\n',
                                        {text: 'Cargo: ', bold: true}, responsableData.cargo + '\n',
                                        {text: 'Departamento: ', bold: true}, responsableData.departamento + '\n',
                                        {text: 'Fecha de emisión: ', bold: true}, new Date(responsableData.fecha).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'})
                                    ],
                                    margin: [5, 5, 5, 5]
                                }],
                                [{
                                    text: '\n\n\n_________________________\nFirma del Responsable',
                                    alignment: 'center',
                                    margin: [0, 0, 0, 10]
                                }]
                            ]
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return (i === 0 || i === node.table.body.length || i === 1 || i === 2) ? 1 : 0;
                            },
                            vLineWidth: function (i, node) {
                                return 0;
                            },
                        }
                    });
                    console.log('Signature block added.');
                } else {
                    console.log('No valid responsableData.nombre found, skipping signature block.');
                }
                doc.styles.tableHeader = {
                    bold: true,
                    fontSize: 11,
                    color: 'white',
                    fillColor: '#2d4154',
                    alignment: 'center'
                };
                console.log('PDF customization finished successfully.');
            } catch (error) {
                console.error('CRITICAL ERROR during PDF customization:', error);
                // If customization fails, it's a good idea to alert the user
                bootbox.alert('Error crítico al personalizar el documento PDF. Por favor, revisa la consola para más detalles.');
            }
        }
    };
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