var tabla;

//funcion que se ejecuta al inicio
function init(){
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
            {
                extend: 'excelHtml5',
                text: 'Excel',
                action: function () {
                    generarExcelUsuarios();
                }
            },
            {
                extend: 'pdfHtml5',
                text: 'PDF',
                action: function () {
                    ReporteResponsable.pedir('Listado de Usuarios', generarPdfUsuarios);
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

// PDF "Usuarios del sistema": built from ajax/usuario.php?op=reporte (not from
// the table cells, which carry the action buttons and no department/type).
function generarPdfUsuarios(responsable){
	Promise.all([
		// never rejects: falls back to no crest / Roboto
		ReporteJornadas.prepararRecursos('../'),
		Promise.resolve($.getJSON('../ajax/usuario.php?op=reporte'))
	]).then(function(resultados){
		var recursos = resultados[0];
		var doc = ReporteUsuarios.buildDocDefinition({
			usuarios: resultados[1],
			responsable: responsable,
			fechaGeneracion: new Date(),
			escudoDataUrl: recursos.escudoDataUrl,
			poppinsDisponible: recursos.poppinsDisponible
		});
		pdfMake.createPdf(doc).download('usuarios-' + responsable.fechaEmisionISO + '.pdf');
	}).catch(function(error){
		console.error('Error generando el PDF de usuarios:', error);
		bootbox.alert("No se pudo generar el PDF de usuarios.");
	});
}

// Excel "Usuarios del sistema": same source as the PDF (ajax/usuario.php?op=reporte),
// so the sheet gets real columns instead of the table cells (action buttons).
function generarExcelUsuarios(){
	var hoy = new Date();
	Promise.resolve($.getJSON('../ajax/usuario.php?op=reporte')).then(function(usuarios){
		return ReporteExcel.descargar({
			archivo: 'usuarios-' + ReporteExcel.fechaISO(hoy) + '.xlsx',
			hoja: 'Usuarios',
			titulo: ReporteJornadas.INSTITUCION_NOMBRE,
			subtitulo: 'Usuarios del sistema · Emitido el ' + ReporteExcel.fechaDMY(hoy),
			columnas: [
				{ titulo: 'C.I.', ancho: 12, tipo: 'texto' },
				{ titulo: 'Nombres', ancho: 18, tipo: 'texto' },
				{ titulo: 'Apellidos', ancho: 20, tipo: 'texto' },
				{ titulo: 'Usuario', ancho: 15, tipo: 'texto' },
				{ titulo: 'Departamento', ancho: 17, tipo: 'texto' },
				{ titulo: 'Tipo', ancho: 15, tipo: 'texto' },
				{ titulo: 'Registrado', ancho: 13, tipo: 'fecha' }
			],
			filas: filasExcelUsuarios(usuarios)
		});
	}).catch(function(error){
		console.error('Error generando el Excel de usuarios:', error);
		bootbox.alert(mensajeErrorExcel(error, "No se pudo generar el Excel de usuarios."));
	});
}

// Rows [C.I., Nombres, Apellidos, Usuario, Departamento, Tipo, Registrado],
// sorted by full name like the PDF.
function filasExcelUsuarios(usuarios){
	return (usuarios || []).map(function(u){
		var cedula = String(u.codigo_persona || '').trim();
		return [
			// codigo_persona holds the cédula, except for legacy accounts
			// such as admin (codigo_persona = "admin").
			/^\d+$/.test(cedula) ? cedula : '',
			ReporteJornadas.normalizarNombre(u.nombre),
			ReporteJornadas.normalizarNombre(u.apellidos),
			String(u.login || '').trim(),
			u.departamento || '',
			u.tipo || '',
			u.fechacreado || ''
		];
	}).sort(function(a, b){
		return (a[1] + ' ' + a[2]).trim().localeCompare((b[1] + ' ' + b[2]).trim(), 'es');
	});
}

// A 401 from the report endpoint means the session expired.
function mensajeErrorExcel(error, mensaje){
	if (error && error.status === 401) {
		return "Su sesión ha expirado. Inicie sesión nuevamente para generar el Excel.";
	}
	return mensaje;
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
