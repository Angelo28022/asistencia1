CREATE TABLE `reporte_responsables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reporte` varchar(255) NOT NULL,
  `nombre_responsable` varchar(255) NOT NULL,
  `cargo_responsable` varchar(255) NOT NULL,
  `departamento_responsable` varchar(255) NOT NULL,
  `fecha_reporte` date NOT NULL,
  `id_usuario` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
