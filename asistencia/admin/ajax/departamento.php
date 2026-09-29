<?php 
require_once "../modelos/Departamento.php";
if (strlen(session_id())<1) 
	session_start();

$departamento=new Departamento();

$iddepartamento=isset($_POST["iddepartamento"])? limpiarCadena($_POST["iddepartamento"]):"";
$nombre=isset($_POST["nombre"])? limpiarCadena($_POST["nombre"]):"";
$descripcion=isset($_POST["descripcion"])? limpiarCadena($_POST["descripcion"]):"";
$idusuario=isset($_SESSION["idusuario"])? $_SESSION["idusuario"]:"";

switch ($_GET["op"]) {
	case 'guardaryeditar':
	if (empty($iddepartamento)) {
		$rspta=$departamento->insertar($nombre,$descripcion,$idusuario);
		echo $rspta ? "Datos registrados correctamente" : "No se pudo registrar los datos";
	}else{
         $rspta=$departamento->editar($iddepartamento,$nombre,$descripcion,$idusuario);
		echo $rspta ? "Datos actualizados correctamente" : "No se pudo actualizar los datos";
	}
		break;
	

	case 'desactivar':
		$rspta=$departamento->desactivar($iddepartamento);
		echo $rspta ? "Datos desactivados correctamente" : "No se pudo desactivar los datos";
		break;
	case 'activar':
		$rspta=$departamento->activar($iddepartamento);
		echo $rspta ? "Datos activados correctamente" : "No se pudo activar los datos";
		break;
	
	case 'mostrar':
		$rspta=$departamento->mostrar($iddepartamento);
		echo json_encode($rspta);
		break;

    case 'listar':
		$rspta=$departamento->listar();
		$data=Array();

		while ($reg=$rspta->fetch_object()) {
			$data[]=array(
            "0"=>'<button class="btn btn-warning btn-xs" onclick="mostrar('.$reg->iddepartamento.')"><i class="fa fa-pencil"></i></button>'.' '.'<button class="btn btn-danger btn-xs" onclick="desactivar('.$reg->iddepartamento.')"><i class="fa fa-close"></i></button>',
            "1"=>$reg->nombre,
            "2"=>$reg->descripcion,
            "3"=>$reg->fechacreada
              );
		}
		$results=array(
             "sEcho"=>1,//info para datatables
             "iTotalRecords"=>count($data),//enviamos el total de registros al datatable
             "iTotalDisplayRecords"=>count($data),//enviamos el total de registros a visualizar
             "aaData"=>$data); 
		echo json_encode($results);   
		break;

		case 'reporte':
			header('Content-Type: application/json');
			if (!isset($_SESSION['idusuario'])) {
				http_response_code(401);
				echo json_encode(array());
				break;
			}
			$rspta=$departamento->reporte();
			$data=array();
			while ($reg=$rspta->fetch_object()) {
				$data[]=array(
					"nombre"=>$reg->nombre,
					"descripcion"=>$reg->descripcion,
					"fechacreada"=>$reg->fechacreada,
					"personal"=>(int)$reg->personal
				);
			}
			echo json_encode($data);
			break;

		case 'selectDepartamento':
			$rspta=$departamento->select();
			echo '<option value="0">seleccione...</option>';
			while ($reg=$rspta->fetch_object()) {
				echo '<option value=' . $reg->iddepartamento.'>'.$reg->nombre.'</option>';
			}
			break;
}
 ?>