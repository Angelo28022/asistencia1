<?php 
session_start();
require_once "../modelos/Usuario.php";

$usuario=new Usuario();

$idusuarioc=isset($_POST["idusuarioc"])? limpiarCadena($_POST["idusuarioc"]):"";
$clavec=isset($_POST["clavec"])? limpiarCadena($_POST["clavec"]):"";
$idusuario=isset($_POST["idusuario"])? limpiarCadena($_POST["idusuario"]):"";
$nombre=isset($_POST["nombre"])? limpiarCadena($_POST["nombre"]):"";
$apellidos=isset($_POST["apellidos"])? limpiarCadena($_POST["apellidos"]):"";
$login=isset($_POST["login"])? limpiarCadena($_POST["login"]):"";
$iddepartamento=isset($_POST["iddepartamento"])? limpiarCadena($_POST["iddepartamento"]):"";
$idtipousuario=isset($_POST["idtipousuario"])? limpiarCadena($_POST["idtipousuario"]):"";
$codigo_persona=isset($_POST["codigo_persona"])? limpiarCadena($_POST["codigo_persona"]):"";
$password=isset($_POST["clave"])? limpiarCadena($_POST["clave"]):"";
$imagen=isset($_POST["imagen"])? limpiarCadena($_POST["imagen"]):"";
$usuariocreado=isset($_POST["nombre"])? limpiarCadena($_POST["nombre"]):"";
$idmensaje=isset($_POST["idmensaje"])? limpiarCadena($_POST["idmensaje"]):"";


switch ($_GET["op"]) {
	case 'guardaryeditar':

	// ...existing code...
// Ya no se maneja imagen
$imagen = ""; // O elimina la variable si no la usas en la BD
// ...existing code...

		//Hash SHA256 para la contraseña
		$clavehash=hash("SHA256", $password);

		if (empty($idusuario)) {
			$idusuario=$_SESSION["idusuario"];
			$rspta=$usuario->insertar($nombre,$apellidos,$login,$iddepartamento,$idtipousuario,$clavehash,$imagen,$usuariocreado,$codigo_persona);
			echo $rspta ? "Datos registrados correctamente" : "No se pudo registrar todos los datos del usuario";
		}
		else {
			$rspta=$usuario->editar($idusuario,$nombre,$apellidos,$login,$iddepartamento,$idtipousuario,$imagen,$usuariocreado,$codigo_persona);
			echo $rspta ? "Datos actualizados correctamente" : "No se pudo actualizar los datos";
		}
	break;
	

	/*case 'desactivar':
		$rspta=$usuario->desactivar($idusuario);
		echo $rspta ? "Datos desactivados correctamente" : "No se pudo desactivar los datos";
	break;

	case 'activar':
		$rspta=$usuario->activar($idusuario);
		echo $rspta ? "Datos activados correctamente" : "No se pudo activar los datos";
	break;
	*/
	case 'mostrar':
		$rspta=$usuario->mostrar($idusuario);
		echo json_encode($rspta);
	break;

	case 'editar_clave':
		$clavehash=hash("SHA256", $clavec);

		$rspta=$usuario->editar_clave($idusuarioc,$clavehash);
		echo $rspta ? "Password actualizado correctamente" : "No se pudo actualizar el password";
	break;

	case 'mostrar_clave':
		$rspta=$usuario->mostrar_clave($idusuario);
		echo json_encode($rspta);
	break;
	
	case 'listar':
		$rspta=$usuario->listar();
		//declaramos un array
		$data=Array();


		while ($reg=$rspta->fetch_object()) {
    $fechacreado = date("d/m/Y h:i:s A", strtotime($reg->fechacreado));
    $data[]=array(
        "0" =>
            '<button class="btn btn-warning btn-xs" onclick="mostrar('.$reg->idusuario.')"><i class="fa fa-pencil"></i></button> '.
            '<button class="btn btn-info btn-xs" onclick="mostrar_clave('.$reg->idusuario.')"><i class="fa fa-key"></i></button> '.
            '<button class="btn btn-danger btn-xs" onclick="eliminar('.$reg->idusuario.')"><i class="fa fa-trash"></i></button>',
        "1"=>$reg->nombre,
        "2"=>$reg->apellidos,
        "3"=>$reg->login,
        "4"=>$fechacreado 
  
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
		$rspta=$usuario->reporte();
		$data=array();
		while ($reg=$rspta->fetch_object()) {
			$data[]=array(
				"nombre"=>$reg->nombre,
				"apellidos"=>$reg->apellidos,
				"login"=>$reg->login,
				"codigo_persona"=>$reg->codigo_persona,
				"departamento"=>$reg->departamento,
				"tipo"=>$reg->tipo,
				"fechacreado"=>$reg->fechacreado
			);
		}
		echo json_encode($data);
	break;


	case 'verificar':
		//validar si el usuario tiene acceso al sistema
		$logina=$_POST['logina'];
		$clavea=$_POST['clavea'];

		//Hash SHA256 en la contraseña
		$clavehash=hash("SHA256", $clavea);
	
		$rspta=$usuario->verificar($logina, $clavehash);

		$fetch=$rspta->fetch_object();

		if (isset($fetch)) 
		{
			# Declaramos la variables de sesion
			$_SESSION['idusuario']=$fetch->idusuario;
			$id=$fetch->idusuario;
			$_SESSION['nombre']=$fetch->nombre;
			$_SESSION['codigo_persona']=$fetch->codigo_persona;
			$_SESSION['imagen']=$fetch->imagen;
			$_SESSION['login']=$fetch->login;
			$_SESSION['tipousuario']=$fetch->tipousuario;
			$_SESSION['departamento']=$fetch->iddepartamento;

			require "../config/Conexion.php";

			$sql="UPDATE usuarios SET iteracion='1' WHERE idusuario='$id'";
			echo $sql; 
	 		ejecutarConsulta($sql);	 		

		}

		echo json_encode($fetch);

	break;

	case 'salir':
			
			$id=$_SESSION['idusuario'];
			$sql="UPDATE usuarios SET iteracion='0' WHERE idusuario='$id'";
			echo $sql; 
	 		ejecutarConsulta($sql);	 		


		//Limpiamos las variables de sesión   
        session_unset();
        //Destruìmos la sesión
        session_destroy();
        //Redireccionamos al login
        header("Location: ../index.php");

	break;
	
	case 'eliminar':
		$rspta = $usuario->eliminar($idusuario);
		echo $rspta ? "Usuario eliminado correctamente" : "No se pudo eliminar el usuario";
	break;
	

	
}
?>