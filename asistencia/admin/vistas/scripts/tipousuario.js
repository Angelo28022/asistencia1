var tabla;

//funcion que se ejecuta al inicio
function init(){
   mostrarform(false);
   listar();

   $("#formulario").on("submit",function(e){
   	guardaryeditar(e);
   })
}

//funcion limpiar
function limpiar(){
	$("#idtipousuario").val("");
	$("#nombre").val("");
	$("#descripcion").val(""); 
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

//cancelar form
function cancelarform(){
	limpiar();
	mostrarform(false);
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
                          generarExcelTipos();
                      }
                  },
                  {
                      extend: 'pdfHtml5',
                      text: 'PDF',
                      action: function () {
                          ReporteResponsable.pedir('Tipos de usuario', generarPdfTipos);
                      }
                  }
		],
		"ajax":
		{
			url:'../ajax/tipousuario.php?op=listar',
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
// PDF "Tipos de usuario": built from ajax/tipousuario.php?op=reporte
// (not from the table cells, which carry the action buttons and no user counts).
function generarPdfTipos(responsable){
	Promise.all([
		// never rejects: falls back to no crest / Roboto
		ReporteJornadas.prepararRecursos('../'),
		Promise.resolve($.getJSON('../ajax/tipousuario.php?op=reporte'))
	]).then(function(resultados){
		var recursos = resultados[0];
		var doc = ReporteTipos.buildDocDefinition({
			tipos: resultados[1],
			responsable: responsable,
			fechaGeneracion: new Date(),
			escudoDataUrl: recursos.escudoDataUrl,
			poppinsDisponible: recursos.poppinsDisponible
		});
		pdfMake.createPdf(doc).download('tipos-de-usuario-' + responsable.fechaEmisionISO + '.pdf');
	}).catch(function(error){
		console.error('Error generando el PDF de tipos de usuario:', error);
		bootbox.alert("No se pudo generar el PDF de tipos de usuario.");
	});
}

// Excel "Tipos de usuario": same data source as the PDF.
function generarExcelTipos(){
	var hoy = new Date();
	Promise.resolve($.getJSON('../ajax/tipousuario.php?op=reporte')).then(function(tipos){
		return ReporteExcel.descargar({
			archivo: 'tipos-de-usuario-' + ReporteExcel.fechaISO(hoy) + '.xlsx',
			hoja: 'Tipos de usuario',
			titulo: ReporteJornadas.INSTITUCION_NOMBRE,
			subtitulo: 'Tipos de usuario · Emitido el ' + ReporteExcel.fechaDMY(hoy),
			columnas: [
				{ titulo: 'Tipo', ancho: 18, tipo: 'texto' },
				{ titulo: 'Descripción', ancho: 48, tipo: 'texto' },
				{ titulo: 'Usuarios', ancho: 11, tipo: 'numero' },
				{ titulo: 'Registrado', ancho: 13, tipo: 'fecha' }
			],
			filas: (tipos || []).map(function(t){
				return [
					t.nombre,
					capitalizarTexto(t.descripcion),
					parseInt(t.usuarios, 10) || 0,
					fechaSQLValida(t.fechacreada)
				];
			}),
			total: { etiqueta: 'Total', columnas: [2] }
		});
	}).catch(function(error){
		console.error('Error generando el Excel de tipos de usuario:', error);
		if (error && error.status === 401) {
			bootbox.alert("Tu sesión expiró. Vuelve a iniciar sesión para generar el Excel de tipos de usuario.");
		} else {
			bootbox.alert("No se pudo generar el Excel de tipos de usuario.");
		}
	});
}

function capitalizarTexto(texto){
	var str = texto === undefined || texto === null ? '' : String(texto).trim();
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// "YYYY-MM-DD..." as-is; zero or malformed dates (legacy desactivar/activar
// write '0'/'1') -> null, so the Excel cell stays empty.
function fechaSQLValida(valor){
	var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
	return m && m[1] !== '0000' ? valor : null;
}

//funcion para guardaryeditar
function guardaryeditar(e){
     e.preventDefault();//no se activara la accion predeterminada 
     $("#btnGuardar").prop("disabled",true);
     var formData=new FormData($("#formulario")[0]);

     $.ajax({
     	url: "../ajax/tipousuario.php?op=guardaryeditar",
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

     limpiar();
}

function mostrar(idtipousuario){
	$.post("../ajax/tipousuario.php?op=mostrar",{idtipousuario : idtipousuario},
		function(data,status)
		{
			data=JSON.parse(data);
			mostrarform(true);

			$("#nombre").val(data.nombre);
			$("#descripcion").val(data.descripcion);
			$("#idtipousuario").val(data.idtipousuario);
		})
}


//funcion para desactivar
function desactivar(idtipousuario){
	bootbox.confirm("¿Esta seguro de desactivar este dato?", function(result){
		if (result) {
			$.post("../ajax/tipousuario.php?op=desactivar", {idtipousuario : idtipousuario}, function(e){
				bootbox.alert(e);
				tabla.ajax.reload();
			});
		}
	})
}

function activar(idtipousuario){
	bootbox.confirm("¿Esta seguro de activar este dato?" , function(result){
		if (result) {
			$.post("../ajax/tipousuario.php?op=activar" , {idtipousuario : idtipousuario}, function(e){
				bootbox.alert(e);
				tabla.ajax.reload();
			});
		}
	})
}

init();