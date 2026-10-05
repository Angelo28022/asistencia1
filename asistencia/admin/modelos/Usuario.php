<?php 
//incluir la conexion de base de datos
require "../config/Conexion.php";
class Usuario{


	//implementamos nuestro constructor
public function __construct(){

}

public function eliminar($idusuario)
{
    $sql = "DELETE FROM usuarios WHERE idusuario='$idusuario'";
    return ejecutarConsulta($sql);
}

//metodo insertar regiustro
public function insertar($nombre,$apellidos,$login,$iddepartamento,$idtipousuario,$clavehash,$imagen,$usuariocreado,$codigo_persona){
	date_default_timezone_set('America/Caracas');
	$fechacreado=date('Y-m-d H:i:s');
	$sql="INSERT INTO usuarios (nombre,apellidos,login,iddepartamento,idtipousuario,password,imagen,estado,fechacreado,usuariocreado,codigo_persona) VALUES ('$nombre','$apellidos','$login','$iddepartamento','$idtipousuario','$clavehash','$imagen','1','$fechacreado','$usuariocreado','$codigo_persona')";
	return ejecutarConsulta($sql);

}

// login and codigo_persona are UNIQUE: check before saving so the user gets a
// message instead of a fatal duplicate-key error. $idusuario excludes the row
// being edited ('' when inserting).
public function existeLogin($login,$idusuario){
	$sql="SELECT idusuario FROM usuarios WHERE login='$login' AND idusuario<>'$idusuario'";
	return ejecutarConsultaSimpleFila($sql) ? true : false;
}

public function existeCedula($codigo_persona,$idusuario){
	$sql="SELECT idusuario FROM usuarios WHERE codigo_persona='$codigo_persona' AND idusuario<>'$idusuario'";
	return ejecutarConsultaSimpleFila($sql) ? true : false;
}

public function editar($idusuario,$nombre,$apellidos,$login,$iddepartamento,$idtipousuario,$imagen,$usuariocreado,$codigo_persona){
	$sql="UPDATE usuarios SET nombre='$nombre',apellidos='$apellidos',login='$login',iddepartamento='$iddepartamento',idtipousuario='$idtipousuario',imagen='$imagen' ,usuariocreado='$usuariocreado',codigo_persona='$codigo_persona'    
	WHERE idusuario='$idusuario'";
	 return ejecutarConsulta($sql);

}
public function editar_clave($idusuario,$clavehash){
	$sql="UPDATE usuarios SET password='$clavehash' WHERE idusuario='$idusuario'";
	return ejecutarConsulta($sql);
}
public function mostrar_clave($idusuario){
	$sql="SELECT idusuario, password FROM usuarios WHERE idusuario='$idusuario'";
	return ejecutarConsultaSimpleFila($sql);
}
public function desactivar($idusuario){
	$sql="UPDATE usuarios SET estado='0' WHERE idusuario='$idusuario'";
	return ejecutarConsulta($sql);
}
public function activar($idusuario){
	$sql="UPDATE usuarios SET estado='1' WHERE idusuario='$idusuario'";
	return ejecutarConsulta($sql);
}

//metodo para mostrar registros
public function mostrar($idusuario){
	$sql="SELECT * FROM usuarios WHERE idusuario='$idusuario'";
	return ejecutarConsultaSimpleFila($sql);
}

//listar registros
public function listar(){
	$sql="SELECT * FROM usuarios";
	return ejecutarConsulta($sql);
}

//usuarios con su departamento y tipo de acceso (reporte PDF)
public function reporte(){
	$sql="SELECT u.nombre, u.apellidos, u.login, u.codigo_persona, u.fechacreado,
	d.nombre AS departamento, t.nombre AS tipo
	FROM usuarios u
	LEFT JOIN departamento d ON d.iddepartamento=u.iddepartamento
	LEFT JOIN tipousuario t ON t.idtipousuario=u.idtipousuario";
	return ejecutarConsulta($sql);
}

public function cantidad_usuario(){
	$sql="SELECT count(*) nombre FROM usuarios";
	return ejecutarConsulta($sql);
}


//Función para verificar el acceso al sistema
	public function verificar($login,$clave)
    {
    	$sql="SELECT u.codigo_persona,u.idusuario,u.nombre,u.apellidos,u.login,u.idtipousuario,u.iddepartamento,u.email,u.imagen,u.login, tu.nombre as tipousuario FROM usuarios u INNER JOIN tipousuario tu ON u.idtipousuario=tu.idtipousuario WHERE login='$login' AND password='$clave' AND estado='1'"; 
    	return ejecutarConsulta($sql);  
    }
}




 ?>
