<?php
//activamos almacenamiento en el buffer
ob_start();
if (strlen(session_id())<1) 
	session_start();

if (!isset($_SESSION['nombre'])) {
	echo "debe ingresar al sistema correctamente para vosualizar el reporte";
} else {

	if ($_SESSION['almacen']==1) {

		// Recibir datos del responsable desde POST (si existen)
		$nombre_responsable = isset($_POST['responsable_nombre']) ? utf8_decode($_POST['responsable_nombre']) : 'No especificado';
		$cargo_responsable = isset($_POST['responsable_cargo']) ? utf8_decode($_POST['responsable_cargo']) : 'No especificado';
		$departamento_responsable = isset($_POST['responsable_departamento']) ? utf8_decode($_POST['responsable_departamento']) : 'No especificado';

		if (isset($_POST['responsable_fecha'])) {
			$fecha_obj = new DateTime($_POST['responsable_fecha']);
			$fecha_emision = $fecha_obj->format('d/m/Y');
		} else {
			$fecha_emision = date('d/m/Y');
		}

		// Lógica de registro en BD (similar al ajax/log_reporte.php)
		if (isset($_POST['responsable_nombre'])) {
			require_once "../config/Conexion.php"; // Asegúrate que la ruta es correcta
			$idusuario_generador = $_SESSION['idusuario'];
			$tipo_reporte = 'Listado de Articulos';
			
			// Nota: Usar prepare statements es más seguro, pero manteniendo tu estilo de código:
			$sql = "INSERT INTO reporte_responsables (tipo_reporte, nombre_responsable, cargo_responsable, departamento_responsable, fecha_emision, idusuario_generador) VALUES ('$tipo_reporte', '".limpiarCadena($nombre_responsable)."', '".limpiarCadena($cargo_responsable)."', '".limpiarCadena($departamento_responsable)."', '".limpiarCadena($_POST['responsable_fecha'])."', '$idusuario_generador')";
			ejecutarConsulta($sql); // Activamos la consulta
		}


		//incluimos a la clase PDF_MC_Table
		require('PDF_MC_Table.php');

		//instanciamos la clase para generar el documento pdf
		$pdf=new PDF_MC_Table();

		//agregamos la primera pagina al documento pdf
		$pdf->AddPage();

		// =========================================================
		## INSERCIÓN DEL LOGO EN ESQUINA SUPERIOR DERECHA

		$logo_ruta = __DIR__ . 'logo.jpg'; // Ruta absoluta para evitar problemas de ruta relativa
		$x_posicion = 160; // Coordenada X ajustada (más a la derecha para margen)
		$y_posicion = 5;   // Coordenada Y (arriba)
		$ancho_logo = 25;  
		$alto_logo = 15;   

		// Verificamos si el archivo existe antes de insertarlo
		if (file_exists($logo_ruta)) {
			$pdf->Image($logo_ruta, $x_posicion, $y_posicion, $ancho_logo, $alto_logo);
		} else {
			// Opcional: Agrega un mensaje de error visible en el PDF para depurar (quita esto en producción)
			$pdf->SetXY(160, 5);
			$pdf->SetFont('Arial', '', 8);
			$pdf->Cell(40, 10, 'ERROR: Logo no encontrado', 0, 0, 'C');
		}
		// =========================================================


		// MANUALLY ADDED HEADER
		## TÍTULO DEL REPORTE AJUSTADO
		
		// Movemos el cursor Y para que el título esté debajo del logo (ajustado para no superponerse)
		$pdf->SetY(25); 
		$pdf->SetFont('Arial','B',15);
		// Usamos Cell(165) para centrar el título en el área izquierda, dejando espacio al logo.
		$pdf->Cell(165, 10, 'Reporte de Asistencia sssss', 0, 0, 'C'); 
		$pdf->Ln(5); // Saltamos 5mm después del título


		## LÍNEA DIVISORIA AJUSTADA

		// Posicionamos la línea divisoria debajo del título
		$pdf->SetY(40); 
		$pdf->SetDrawColor(128,128,128);
		$pdf->SetLineWidth(0.2);
		// Dibuja la línea desde el margen izquierdo hasta el margen derecho
		$pdf->Line($pdf->GetX(), 40, $pdf->GetPageWidth() - $pdf->GetX(), 40);
		$pdf->Ln(5);
		// END MANUALLY ADDED HEADER


		//creamos las celdas para los titulos de cada columna y le asignamos un fondo gris y el tipo de letra
		$pdf->SetFillColor(232,232,232);
		$pdf->SetFont('Arial','B',10);
		$pdf->Cell(58,6,'Nombre',1,0,'C',1);
		$pdf->Cell(50,6,utf8_decode('Categoría'),1,0,'C',1);
		$pdf->Cell(30,6,utf8_decode('Código'),1,0,'C',1);
		$pdf->Cell(12,6,'Stock',1,0,'C',1);
		$pdf->Cell(35,6,utf8_decode('Descripcion'),1,0,'C',1);
		$pdf->Ln(10);

		//creamos las filas de los registros según la consulta mysql
		require_once "../modelos/Articulo.php";
		$articulo = new Articulo();

		$rspta = $articulo->listar();

		//implementamos las celdas de la tabla con los registros a mostrar
		$pdf->SetWidths(array(58,50,30,12,35));

		while ($reg= $rspta->fetch_object()) {
			$nombre=$reg->nombre;
			$categoria= $reg->categoria;
			$codigo=$reg->codigo;
			$stock=$reg->stock;
			$descripcion=$reg->descripcion;

			$pdf->SetFont('Arial','',10);
			$pdf->Row(array(utf8_decode($nombre),utf8_decode($categoria),$codigo,$stock,utf8_decode($descripcion)));
		}

		// --- INICIO DE SECCIÓN DE FIRMA ---

		// Función para dibujar el cuadro de firma
		function dibujarCuadroFirma($pdf, $nombre, $cargo, $dpto, $fecha) {
			
			// Verificamos si necesitamos una nueva página antes de dibujar el recuadro
			if ($pdf->GetY() + 60 > $pdf->GetPageHeight() - $pdf->bMargin) {
				$pdf->AddPage();
			}

			// Margen superior relativo a donde terminó la tabla
			$pdf->SetY($pdf->GetY() + 10); 
			
			$pdf->SetFont('Arial', 'B', 12);
			$pdf->Cell(0, 10, 'RESPONSABLE DEL REPORTE', 1, 1, 'C');

			$pdf->SetFont('Arial', '', 10);
			$pdf->MultiCell(0, 8,
				"Nombre: " . $nombre . "\n" .
				"Cargo: " . $cargo . "\n" .
				"Departamento: " . $dpto . "\n" .
				"Fecha de emisión: " . $fecha,
				1, 'L');

			// Espacio para la firma
			$pdf->SetY($pdf->GetY() + 5); 
			$ancho_firma = 120; // 12cm
			$alto_firma = 30; // 3cm
			$x_centro = ($pdf->GetPageWidth() - $ancho_firma) / 2;
			$pdf->Rect($x_centro, $pdf->GetY(), $ancho_firma, $alto_firma);

			$pdf->SetY($pdf->GetY() + $alto_firma + 10);
			$pdf->SetFont('Arial', 'B', 10);
			$pdf->Cell(0, 5, '_________________________', 0, 1, 'C');
			$pdf->Cell(0, 5, 'Firma del Responsable', 0, 1, 'C');
		}

		dibujarCuadroFirma($pdf, $nombre_responsable, $cargo_responsable, $departamento_responsable, $fecha_emision);
		
		// Limpiamos el buffer y mostramos el PDF en el navegador (no descarga)
		ob_end_clean();
		$pdf->Output('I'); // 'I' significa "inline" - se muestra en el navegador

	} else {
		echo "No tiene permiso para visualizar el reporte";
	}

}
?>
