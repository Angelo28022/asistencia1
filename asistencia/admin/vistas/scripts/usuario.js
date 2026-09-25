var tabla;
var logoBase64 = null; // Variable global para el logo

//funcion que se ejecuta al inicio
function init(){
   // --- NUEVO: Cargar logo dinámicamente ---
   $.ajax({
        url: '../ajax/get_logo.php',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.logo) {
                logoBase64 = response.logo;
            } else {
                console.error('No se pudo cargar el logo.');
            }
        },
        error: function() {
            console.error('Error al solicitar el logo.');
        }
    });

   mostrarform(false);
   mostrarform_clave(false);
   listar();
$("#formularioc").on("submit",function(c){
   		editar_clave(c);
   })
   $("#formulario").on("submit",function(e){
   		guardaryeditar(e);
   })

   $("#imagenmuestra").hide();
//mostramos los permisos
$.post("../ajax/usuario.php?op=permisos&id=", function(r){
	$("#permisos").html(r);
});

   //cargamos los items al select departamento
   $.post("../ajax/departamento.php?op=selectDepartamento", function(r){
   	$("#iddepartamento").html(r);
   	$('#iddepartamento').selectpicker('refresh'); 
   });

   //cargamos los items al select tipousuario
   $.post("../ajax/tipousuario.php?op=selectTipousuario", function(r){
   	$("#idtipousuario").html(r);
   	$('#idtipousuario').selectpicker('refresh'); 
   });

}

//funcion limpiar
function limpiar(){
    $("#nombre").val("");
    $("#apellidos").val("");
    $("#direccion").val("");
    $("#iddepartamento").selectpicker('refresh');
    $("#idtipousuario").selectpicker('refresh');
    $("#login").val("");
    $("#clave").val("");
    $("#codigo_persona").val("");
    // $("#imagenmuestra").attr("src",""); // Eliminado
    // $("#imagenactual").val(""); // Eliminado
    $("#idusuario").val("");
}


//funcion mostrar formulario
function mostrarform(flag){
	limpiar();
	if(flag){
		$("#listadoregistros").hide();
		$("#formularioregistros").show();
		$("#btnGuardar").prop("disabled",false);
		$("#btnagregar").hide();
	}else{
		$("#listadoregistros").show();
		$("#formularioregistros").hide();
		$("#btnagregar").show();
	}
}
function mostrarform_clave(flag){
	limpiar();
	if(flag){
		$("#listadoregistros").hide();
		$("#formulario_clave").show();
		$("#btnGuardar_clave").prop("disabled",false);
		$("#btnagregar").hide();
	}else{
		$("#listadoregistros").show();
		$("#formulario_clave").hide();
		$("#btnagregar").show();
	}
}
//cancelar form
function cancelarform(){
	$("#claves").show();
	limpiar();
	mostrarform(false);
}
function cancelarform_clave(){
	limpiar();
	mostrarform_clave(false);

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
            {
                extend: 'pdfHtml5',
                text: 'PDF',
                title: 'Reporte de Usuarios',
                orientation: 'portrait',
                pageSize: 'A4',
                customize: function(doc) {
                    // --- MEJORA: Añadir logo y márgenes ---
                    doc.header = function(currentPage, pageCount, pageSize) {
                        if (logoBase64) {
                            return {
                                image: logoBase64,
                                width: 50,
                                margin: [20, 10, 20, 10]
                            };
                        }
                        return null; 
                    };
                    const responsableData = $('#responsableModal').data('responsableData');
                    var tableIndex = 1;
                    if (responsableData) {
                        doc.content.unshift({
                            text: `Reporte generado por: ${responsableData.nombre}\n` + 
                                  `Cargo: ${responsableData.cargo}\n` + 
                                  `Departamento: ${responsableData.departamento}\n` + 
                                  `Fecha: ${new Date(responsableData.fecha).toLocaleDateString()}`,
                            alignment: 'left',
                            margin: [20, 0, 20, 10],
                            fontSize: 10
                        });
                        tableIndex = 2;
                    }

                    doc.footer = function(currentPage, pageCount) { 
                        return {
                            text: 'Página ' + currentPage.toString() + ' de ' + pageCount,
                            alignment: 'right',
                            margin: [0, 10, 40, 0],
                            fontSize: 8
                        }; 
                    };

                    if(doc.content[tableIndex] && doc.content[tableIndex].table){
                        doc.content[tableIndex].table.widths = Array(doc.content[tableIndex].table.body[0].length + 1).join('*').split('');
                    }
                    
                    doc.defaultStyle.alignment = 'center';
                    doc.styles.tableHeader.alignment = 'center';
                },
                action: function(e, dt, node, config) {
                    // 1. Abrir el modal
                    $('#responsableModal').modal('show');

                    // 2. Manejar el clic de confirmación
                    $('#confirmarResponsableBtn').off('click').on('click', function() {
                        if ($('#formResponsable')[0].checkValidity()) {
                            // 3. Guardar datos y cerrar modal, luego activar la descarga del PDF
                            guardarYExportar(); // Ya no necesitamos pasar dt, originalPdfAction, etc.
                        } else {
                            $('#formResponsable')[0].reportValidity();
                        }
                    });
                }
            }
        ],
		"ajax":
		{
			url:'../ajax/usuario.php?op=listar',
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
}

// Se modificó la firma de la función ya que no necesita los parámetros de DataTables directamente
function guardarYExportar() {
    // Recolectar datos del modal
    const nombre = $('#responsable_nombre').val();
    const cargoVal = $('#responsable_cargo').val();
    const cargo = cargoVal === 'Otro' ? $('#responsable_cargo_otro').val() : cargoVal;
    const deptoVal = $('#responsable_departamento').val();
    const departamento = deptoVal === 'Otro' ? $('#responsable_departamento_otro').val() : deptoVal;
    const fecha = $('#responsable_fecha').val();

    const responsableData = { nombre, cargo, departamento, fecha };

    // Guardar en el log de la BD
    $.post("../ajax/log_reporte.php", {
        tipo_reporte: 'Listado de Usuarios',
        ...responsableData
    }, function(response) {
        if (response.success) {
            console.log('Log response:', response.message);
            // Adjuntar datos al modal para que 'customize' los pueda leer
            $('#responsableModal').data('responsableData', responsableData);

            // Ocultar modal
            $('#responsableModal').modal('hide');

            // Simular un clic en el botón PDF generado por DataTables
            // Esto activará la descarga usando el manejador por defecto de DataTables Buttons
            $('#tbllistado_wrapper .dt-button.buttons-pdf').click();

        } else {
            console.error('Error al guardar el registro del responsable:', response.message);
            bootbox.alert("Error al generar el reporte: " + response.message);
            $('#responsableModal').modal('hide'); // Ocultar el modal incluso en caso de error
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Error en la petición AJAX:', textStatus, errorThrown);
        bootbox.alert("Error de comunicación con el servidor al generar el reporte.");
        $('#responsableModal').modal('hide'); // Ocultar el modal en caso de fallo de comunicación
    });
}

//funcion para guardaryeditar
function guardaryeditar(e){
     e.preventDefault();//no se activara la accion predeterminada 
     $("#btnGuardar").prop("disabled",true);
     var formData=new FormData($("#formulario")[0]);

     $.ajax({
     	url: "../ajax/usuario.php?op=guardaryeditar",
     	type: "POST",
     	data: formData,
     	contentType: false,
     	processData: false,

     	success: function(datos){
     		bootbox.alert(datos);
     		mostrarform(false);
     		tabla.ajax.reload();
     	}
     });
$("#claves").show();
     limpiar();
}

function editar_clave(c){
     c.preventDefault();//no se activara la accion predeterminada 
     $("#btnGuardar_clave").prop("disabled",true);
     var formData=new FormData($("#formularioc")[0]);

     $.ajax({
     	url: "../ajax/usuario.php?op=editar_clave",
     	type: "POST",
     	data: formData,
     	contentType: false,
     	processData: false,

     	success: function(datos){
     		bootbox.alert(datos);
     		mostrarform_clave(false);
     		tabla.ajax.reload();
     	}
     });

     limpiar();
	 $("#getCodeModal").modal('hide');
}
function mostrar(idusuario){
    $.post("../ajax/usuario.php?op=mostrar",{idusuario : idusuario},
        function(data,status)
        {
            data=JSON.parse(data);
            mostrarform(true);
            if ($("#idusuario").val(data.idusuario).length==0) {
               $("#claves").show();
               
           }else{
            $("#claves").hide();
            }
            $("#nombre").val(data.nombre);
            $("#iddepartamento").val(data.iddepartamento);
            $("#iddepartamento").selectpicker('refresh');
            $("#idtipousuario").val(data.idtipousuario);
            $("#idtipousuario").selectpicker('refresh');
            $("#apellidos").val(data.apellidos);
            $("#login").val(data.login);
            $("#codigo_persona").val(data.codigo_persona);
            // $("#imagenmuestra").show(); // Eliminado
            // $("#imagenmuestra").attr("src","../files/usuarios/"+data.imagen); // Eliminado
            // $("#imagenactual").val(data.imagen); // Eliminado
            $("#idusuario").val(data.idusuario);
        });
    $.post("../ajax/usuario.php?op=permisos&id="+idusuario, function(r){
    $("#permisos").html(r);
});
}

function mostrar_clave(idusuario){
	 $("#getCodeModal").modal('show');
	$.post("../ajax/usuario.php?op=mostrar_clave",{idusuario : idusuario},
		function(data,status)
		{
			data=JSON.parse(data);
            $("#idusuarioc").val(data.idusuario);
		});
}

//funcion para desactivar
/*function desactivar(idusuario){
	bootbox.confirm("¿Esta seguro de desactivar este dato?", function(result){
		if (result) {
			$.post("../ajax/usuario.php?op=desactivar", {idusuario : idusuario}, function(e){
				bootbox.alert(e);
				tabla.ajax.reload();
			});
		}
	})
} */

/*function activar(idusuario){
	bootbox.confirm("¿Esta seguro de activar este dato?" , function(result){
		if (result) {
			$.post("../ajax/usuario.php?op=activar", {idusuario : idusuario}, function(e){
				bootbox.alert(e);
				tabla.ajax.reload();
			});
		}
	})
} */
function eliminar(idusuario){
    bootbox.confirm("¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.", function(result){
        if (result) {
            $.post("../ajax/usuario.php?op=eliminar", {idusuario : idusuario}, function(e){
                bootbox.alert(e);
                tabla.ajax.reload();
            });
        }
    });
}

function generar(longitud)
{
  long=parseInt(longitud);
  var caracteres = "abcdefghijkmnpqrtuvwxyzABCDEFGHIJKLMNPQRTUVWXYZ2346789";
  var contraseña = "";
  for (i=0; i<long; i++) contraseña += caracteres.charAt(Math.floor(Math.random()*caracteres.length));
    $("#codigo_persona").val(contraseña);
}



init();
