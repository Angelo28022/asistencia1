<?php 
//ip de la pc servidor base de datos
define("DB_HOST", getenv("DB_HOST") ?: "localhost");

// nombre de la base de datos
define("DB_NAME", getenv("DB_NAME") ?: "control_asistencia");


//nombre de usuario de base de datos
define("DB_USERNAME", getenv("DB_USERNAME") ?: "root");
//define("DB_USERNAME", "u222417_admin");

//conraseña del usuario de base de datos
define("DB_PASSWORD", getenv("DB_PASSWORD") !== false ? getenv("DB_PASSWORD") : "");
//define("DB_PASSWORD", "Enero2020Admin");

//codificacion de caracteres
define("DB_ENCODE", "utf8");

//nombre del proyecto
define("PRO_NOMBRE", "CompartiendoCodigos");
 
 ?>