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
	$("#iddepartamento").val("");
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
                          generarExcelDepartamentos();
                      }
                  },
                  {
                      extend: 'pdfHtml5',
                      text: 'PDF',
                      action: function () {
                          ReporteResponsable.pedir('Departamentos y personal', generarPdfDepartamentos);
                      }
                  }
		],
		"ajax":
		{
			url:'../ajax/departamento.php?op=listar',
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
// PDF "Departamentos y personal": built from ajax/departamento.php?op=reporte
// (not from the table cells, which carry the action buttons and no staff counts).
function generarPdfDepartamentos(responsable){
	Promise.all([
		// never rejects: falls back to no crest / Roboto
		ReporteJornadas.prepararRecursos('../'),
		Promise.resolve($.getJSON('../ajax/departamento.php?op=reporte'))
	]).then(function(resultados){
		var recursos = resultados[0];
		var doc = ReporteDepartamentos.buildDocDefinition({
			departamentos: resultados[1],
			responsable: responsable,
			fechaGeneracion: new Date(),
			escudoDataUrl: recursos.escudoDataUrl,
			poppinsDisponible: recursos.poppinsDisponible
		});
		pdfMake.createPdf(doc).download('departamentos-' + responsable.fechaEmisionISO + '.pdf');
	}).catch(function(error){
		console.error('Error generando el PDF de departamentos:', error);
		bootbox.alert("No se pudo generar el PDF de departamentos.");
	});
}

// Excel "Departamentos y personal": same source as the PDF
// (ajax/departamento.php?op=reporte), with real columns and a staff total.
function generarExcelDepartamentos(){
	var hoy = new Date();
	Promise.resolve($.getJSON('../ajax/departamento.php?op=reporte')).then(function(departamentos){
		return ReporteExcel.descargar({
			archivo: 'departamentos-' + ReporteExcel.fechaISO(hoy) + '.xlsx',
			hoja: 'Departamentos',
			titulo: ReporteJornadas.INSTITUCION_NOMBRE,
			subtitulo: 'Departamentos y personal · Emitido el ' + ReporteExcel.fechaDMY(hoy),
			columnas: [
				{ titulo: 'Departamento', ancho: 18, tipo: 'texto' },
				{ titulo: 'Descripción', ancho: 48, tipo: 'texto' },
				{ titulo: 'Personal', ancho: 11, tipo: 'numero' },
				{ titulo: 'Registrado', ancho: 13, tipo: 'fecha' }
			],
			filas: filasExcelDepartamentos(departamentos),
			total: { etiqueta: 'Total', columnas: [2] }
		});
	}).catch(function(error){
		console.error('Error generando el Excel de departamentos:', error);
		bootbox.alert(mensajeErrorExcel(error, "No se pudo generar el Excel de departamentos."));
	});
}

// Rows [Departamento, Descripción, Personal, Registrado] in endpoint order.
function filasExcelDepartamentos(departamentos){
	return (departamentos || []).map(function(d){
		return [
			capitalizarExcel(d.nombre),
			capitalizarExcel(d.descripcion),
			parseInt(d.personal, 10) || 0,
			d.fechacreada || ''
		];
	});
}

function capitalizarExcel(texto){
	var str = texto === undefined || texto === null ? '' : String(texto).trim();
	return str.charAt(0).toUpperCase() + str.slice(1);
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
     	url: "../ajax/departamento.php?op=guardaryeditar",
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

function mostrar(iddepartamento){
	$.post("../ajax/departamento.php?op=mostrar",{iddepartamento : iddepartamento},
		function(data,status)
		{
			data=JSON.parse(data);
			mostrarform(true);

			$("#nombre").val(data.nombre);
			$("#descripcion").val(data.descripcion);
			$("#iddepartamento").val(data.iddepartamento);
		})
}


//funcion para desactivar
function desactivar(iddepartamento){
	bootbox.confirm("¿Esta seguro de desactivar este dato?", function(result){
		if (result) {
			$.post("../ajax/departamento.php?op=desactivar", {iddepartamento : iddepartamento}, function(e){
				bootbox.alert(e);
				tabla.ajax.reload();
			});
		}
	})
}

function activar(iddepartamento){
	bootbox.confirm("¿Esta seguro de activar este dato?" , function(result){
		if (result) {
			$.post("../ajax/departamento.php?op=activar" , {iddepartamento : iddepartamento}, function(e){
				bootbox.alert(e);
				tabla.ajax.reload();
			});
		}
	})
}

init();