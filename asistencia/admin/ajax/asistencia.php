<?php 
require_once "../modelos/Asistencia.php";
if (strlen(session_id())<1) 
	session_start();
$asistencia=new Asistencia();

$codigo_persona=isset($_POST["codigo_persona"])? limpiarCadena($_POST["codigo_persona"]):"";
$iddepartamento=isset($_POST["iddepartamento"])? limpiarCadena($_POST["iddepartamento"]):"";



switch ($_GET["op"]) {
	case 'guardaryeditar':
		$result=$asistencia->verificarcodigo_persona($codigo_persona);

      	if($result > 0) {
	date_default_timezone_set('America/caracas');
      		$fecha = date("Y-m-d");
			$hora = date("H:i:s");

			$result2=$asistencia->seleccionarcodigo_persona($codigo_persona);
			   
     		$par = abs($result2%2);

          if ($par == 0){ 
                              
                $tipo = "Entrada";
        		$rspta=$asistencia->registrar_entrada($codigo_persona,$tipo);
    			//$movimiento = 0;
    			echo $rspta ? '<h3><strong>Nombres: </strong> '. $result['nombre'].' '.$result['apellidos'].'</h3><div class="alert alert-success"> Ingreso registrado '.$hora.'</div>' : 'No se pudo registrar el ingreso';
   		  }else{ 
                $tipo = "Salida";
         		$rspta=$asistencia->registrar_salida($codigo_persona,$tipo);
     			//$movimiento = 1;
     			echo $rspta ? '<h3><strong>Nombres: </strong> '. $result['nombre'].' '.$result['apellidos'].'</h3><div class="alert alert-danger"> Salida registrada '.$hora.'</div>' : 'No se pudo registrar la salida';             
        } 
        } else {
		         echo '<div class="alert alert-danger">
                       <i class="icon fa fa-warning"></i> No hay empleado registrado con esa código...!
                         </div>';
        }

	break;

	
	case 'mostrar':
		$rspta=$asistencia->mostrar($idasistencia);
		echo json_encode($rspta);
	break;


	
	case 'listar':
		$rspta=$asistencia->listar();
		//declaramos un array
		$data=Array();


		while ($reg=$rspta->fetch_object()) {
    $fecha_hora = date("d/m/Y h:i:s A", strtotime($reg->fecha_hora));
    $fecha = date("d/m/Y", strtotime($reg->fecha));
    $data[]=array(
        "0"=>$reg->codigo_persona,
		"1"=>$reg->nombre,
		"2"=>$reg->apellidos,
		"3"=>$reg->departamento,
		"4"=>$reg->tipo,
		"5"=>$fecha_hora
    );
}

		$results=array(
             "sEcho"=>1,//info para datatables
             "iTotalRecords"=>count($data),//enviamos el total de registros al datatable
             "iTotalDisplayRecords"=>count($data),//enviamos el total de registros a visualizar
             "aaData"=>$data); 
		echo json_encode($results);

	break;

	case 'listaru':
    $idusuario=$_SESSION["idusuario"];
		$rspta=$asistencia->listaru($idusuario);
		//declaramos un array
		$data=Array();


		while ($reg=$rspta->fetch_object()) {
    $fecha_hora = date("d/m/Y h:i:s A", strtotime($reg->fecha_hora));
    $fecha = date("d/m/Y", strtotime($reg->fecha));
    $data[]=array(
        "0"=>$reg->codigo_persona,
		"1"=>$reg->nombre,
		"2"=>$reg->apellidos,
		"3"=>$reg->departamento,
		"4"=>$reg->tipo,
		"5"=>$fecha_hora
    );
}

		$results=array(
             "sEcho"=>1,//info para datatables
             "iTotalRecords"=>count($data),//enviamos el total de registros al datatable
             "iTotalDisplayRecords"=>count($data),//enviamos el total de registros a visualizar
             "aaData"=>$data); 
		echo json_encode($results);

	break;

	case 'listar_asistencia':
    $fecha_inicio=$_REQUEST["fecha_inicio"];
    $fecha_fin=$_REQUEST["fecha_fin"];
    $codigo_persona=$_REQUEST["idcliente"]; 
		$rspta=$asistencia->listar_asistencia($fecha_inicio,$fecha_fin,$codigo_persona);
		//declaramos un array
		$data=Array();


		while ($reg=$rspta->fetch_object()) {
    $fecha_hora = date("d/m/Y h:i:s A", strtotime($reg->fecha_hora));
    $fecha = date("d/m/Y", strtotime($reg->fecha));
    $data[]=array(
        "0"=>$reg->codigo_persona,
		"1"=>$reg->nombre,
		"2"=>$reg->apellidos,
		"3"=>$reg->departamento,
		"4"=>$reg->tipo,
		"5"=>$fecha_hora
    );
}

		$results=array(
             "sEcho"=>1,//info para datatables
             "iTotalRecords"=>count($data),//enviamos el total de registros al datatable
             "iTotalDisplayRecords"=>count($data),//enviamos el total de registros a visualizar
             "aaData"=>$data); 
		echo json_encode($results);

	break;
	case 'listar_asistenciau':
    $fecha_inicio=$_REQUEST["fecha_inicio"];
    $fecha_fin=$_REQUEST["fecha_fin"];
    $codigo_persona=$_SESSION["codigo_persona"]; 
		$rspta=$asistencia->listar_asistencia($fecha_inicio,$fecha_fin,$codigo_persona);
		//declaramos un array
		$data=Array();


		while ($reg=$rspta->fetch_object()) {
    $fecha_hora = date("d/m/Y h:i:s A", strtotime($reg->fecha_hora));
    $fecha = date("d/m/Y", strtotime($reg->fecha));
    $data[]=array(
        "0"=>$reg->codigo_persona,
		"1"=>$reg->nombre,
		"2"=>$reg->apellidos,
		"3"=>$reg->departamento,
		"4"=>$reg->tipo,
		"5"=>$fecha_hora
    );
}

		$results=array(
             "sEcho"=>1,//info para datatables
             "iTotalRecords"=>count($data),//enviamos el total de registros al datatable
             "iTotalDisplayRecords"=>count($data),//enviamos el total de registros a visualizar
             "aaData"=>$data); 
		echo json_encode($results);

	break;

    case 'guardar_responsable':
        header('Content-Type: application/json');

        if (empty($_SESSION['idusuario'])) {
            echo json_encode(["success" => false, "message" => "Tu sesión expiró. Vuelve a iniciar sesión."]);
            break;
        }

        $nombre_responsable = isset($_POST["nombre_responsable"]) ? limpiarCadena($_POST["nombre_responsable"]) : "";
        $cargo_responsable = isset($_POST["cargo_responsable"]) ? limpiarCadena($_POST["cargo_responsable"]) : "";
        $departamento_responsable = isset($_POST["departamento_responsable"]) ? limpiarCadena($_POST["departamento_responsable"]) : "";
        // The emission date is the day the report is generated, never client input
        date_default_timezone_set('America/Caracas');
        $fecha_emision = date('Y-m-d');
        $tipo_reporte = isset($_POST["tipo_reporte"]) ? limpiarCadena($_POST["tipo_reporte"]) : "";
        $idusuario_generador = $_SESSION['idusuario'];

        try {
            $rspta = $asistencia->guardar_responsable($tipo_reporte, $nombre_responsable, $cargo_responsable, $departamento_responsable, $fecha_emision, $idusuario_generador);
            $response = $rspta
                ? ["success" => true, "message" => "Responsable guardado"]
                : ["success" => false, "message" => "No se pudo guardar el responsable"];
        } catch (mysqli_sql_exception $e) {
            error_log('guardar_responsable: ' . $e->getMessage());
            $response = ["success" => false, "message" => "No se pudo guardar el responsable"];
        }
        echo json_encode($response);
        break;

		case 'selectPersona':
			require_once "../modelos/Usuario.php";
			$usuario=new Usuario();

			$rspta=$usuario->listar();

			while ($reg=$rspta->fetch_object()) {
				echo '<option value=' . $reg->codigo_persona.'>'.$reg->nombre.' '.$reg->apellidos.'</option>';
			}
			break;

}
?>