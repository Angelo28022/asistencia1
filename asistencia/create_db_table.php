<?php
// Incluir el archivo de conexión
require_once 'admin/config/Conexion.php';

// SQL para crear la tabla
$sql = "CREATE TABLE IF NOT EXISTS `reporte_responsables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reporte` varchar(255) NOT NULL,
  `nombre_responsable` varchar(255) NOT NULL,
  `cargo_responsable` varchar(255) NOT NULL,
  `departamento_responsable` varchar(255) NOT NULL,
  `fecha_reporte` date NOT NULL,
  `id_usuario` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// Ejecutar la consulta
if (ejecutarConsulta($sql)) {
    echo "<h1>Tabla 'reporte_responsables' creada exitosamente.</h1>";
    echo "<p>Ahora puedes eliminar este archivo (create_db_table.php) y volver a intentar generar el reporte.</p>";
} else {
    global $conexion;
    echo "<h1>Error al crear la tabla.</h1>";
    echo "<p>Es posible que la tabla ya exista. Por favor, intenta generar el reporte de nuevo.</p>";
    echo "<p>Mensaje de error de la base de datos: " . $conexion->error . "</p>";
}

?>
