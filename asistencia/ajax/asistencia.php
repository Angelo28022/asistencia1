<?php 
require_once "../modelos/Asistencia.php";

$asistencia=new Asistencia();

$codigo_persona=isset($_POST["codigo_persona"])? limpiarCadena($_POST["codigo_persona"]):"";
$iddepartamento=isset($_POST["iddepartamento"])? limpiarCadena($_POST["iddepartamento"]):"";



switch ($_GET["op"]) {
	case 'registrar_asistencia':
		$result=$asistencia->verificarcodigo_persona($codigo_persona);

      	if($result > 0) {
	date_default_timezone_set('America/Caracas');
      		$fecha = date("Y-m-d");
			$hora = date("H:i:s");

			// Decide from today's marks, not the whole history: the table allows one
			// Entrada and one Salida per person and day, and a missed Salida on an
			// earlier day would otherwise flip every later mark.
			$marcas=array();
			$rsptaMarcas=$asistencia->marcasDelDia($codigo_persona,$fecha);
			while ($reg=$rsptaMarcas->fetch_object()) {
				$marcas[$reg->tipo]=$reg->fecha_hora;
			}
			$nombres='<h3><strong>Nombres: </strong> '. $result['nombre'].' '.$result['apellidos'].'</h3>';

          if (isset($marcas['Entrada']) && isset($marcas['Salida'])) {
                echo $nombres.'<div class="alert alert-warning"><i class="icon fa fa-warning"></i> Tu jornada de hoy ya está completa (Entrada '.date("h:i A", strtotime($marcas['Entrada'])).' · Salida '.date("h:i A", strtotime($marcas['Salida'])).').</div>';
          } elseif (!isset($marcas['Entrada'])) {
                $tipo = "Entrada";
        		$rspta=$asistencia->registrar_entrada($codigo_persona,$tipo);
    			echo $rspta ? $nombres.'<div class="alert alert-success"> Ingreso registrado '.$hora.'</div>' : 'No se pudo registrar el ingreso';
   		  } else {
                $tipo = "Salida";
         		$rspta=$asistencia->registrar_salida($codigo_persona,$tipo);
     			echo $rspta ? $nombres.'<div class="alert alert-danger"> Salida registrada '.$hora.'</div>' : 'No se pudo registrar la salida';
          }
        } else {
		         // 404 lets the kiosk show its inline "Cedula incorrecta" message.
		         http_response_code(404);
		         echo 'Cedula incorrecta';
        }

	break;

}
?>