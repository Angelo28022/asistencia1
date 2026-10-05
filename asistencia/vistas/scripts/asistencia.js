var tabla;

//funcion que se ejecuta al inicio
function init(){
$("#formulario").on("submit",function(e){
   	registrar_asistencia(e);
   })

// Hide the "Cedula incorrecta" message as soon as the cedula is edited
$("#codigo_persona").on("input",function(){
	$("#cedulaError").hide();
})


}

//funcion limpiar
function limpiar(){
	$("#codigo_persona").val("");
	// Keep the Entrada/Salida/day-complete message on screen for 3 seconds
	setTimeout('document.location.reload()',3000);

}

function registrar_asistencia(e){
     e.preventDefault();//no se activara la accion predeterminada 
     $("#btnGuardar").prop("disabled",true);
     var formData=new FormData($("#formulario")[0]);

     $.ajax({
     	url: "../ajax/asistencia.php?op=registrar_asistencia",
     	type: "POST",
     	data: formData,
     	contentType: false,
     	processData: false,

     	success: function(datos){
     			$("#cedulaError").hide();
     			$("#movimientos").html(datos);
     			limpiar();
     		//bootbox.alert(datos);
     	},
     	error: function(xhr){
     		// Unknown cedula: keep it visible in the field so it can be corrected
     		if (xhr.status == 404) {
     			$("#cedulaError").show();
     		} else {
     			limpiar();
     		}
     	}
     });
}

init();
