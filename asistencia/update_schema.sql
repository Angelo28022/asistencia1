CREATE TABLE `reporte_responsables` (
  `idreporte` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_reporte` varchar(255) NOT NULL,
  `nombre_responsable` varchar(255) NOT NULL,
  `cargo_responsable` varchar(255) NOT NULL,
  `departamento_responsable` varchar(255) NOT NULL,
  `fecha_emision` date NOT NULL,
  `idusuario_generador` int(11) NOT NULL,
  PRIMARY KEY (`idreporte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Match the departamento form (maxlength=256); varchar(45) was cutting descriptions.
ALTER TABLE `departamento` MODIFY `descripcion` varchar(256) NOT NULL;
