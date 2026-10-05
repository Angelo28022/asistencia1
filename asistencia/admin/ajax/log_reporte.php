<?php
session_start();
require_once "../config/Conexion.php";

header('Content-Type: application/json'); // Ensure JSON response

$response = ['success' => false, 'message' => ''];

if (!isset($_SESSION['idusuario'])) {
    $response['message'] = "Usuario no autenticado.";
} else {
    $tipo_reporte = isset($_POST['tipo_reporte']) ? limpiarCadena($_POST['tipo_reporte']) : '';
    $nombre_responsable = isset($_POST['nombre']) ? limpiarCadena($_POST['nombre']) : '';
    $cargo_responsable = isset($_POST['cargo']) ? limpiarCadena($_POST['cargo']) : '';
    $departamento_responsable = isset($_POST['departamento']) ? limpiarCadena($_POST['departamento']) : '';
    // The emission date is the day the report is generated, never client input
    date_default_timezone_set('America/Caracas');
    $fecha_emision = date('Y-m-d');
    $idusuario_generador = $_SESSION['idusuario'];

    if (!empty($nombre_responsable) && !empty($cargo_responsable) && !empty($departamento_responsable)) {
        $sql = "INSERT INTO reporte_responsables (tipo_reporte, nombre_responsable, cargo_responsable, departamento_responsable, fecha_emision, idusuario_generador) VALUES ('$tipo_reporte', '$nombre_responsable', '$cargo_responsable', '$departamento_responsable', '$fecha_emision', '$idusuario_generador')";
        
        $result = ejecutarConsulta($sql);

        if ($result) {
            $response['success'] = true;
            $response['message'] = "Registro de responsable guardado.";
        } else {
            // Check for a specific error from the database connection
            global $conexion;
            $error_message = $conexion->error;
            $response['message'] = "Error al guardar el registro del responsable: " . $error_message;
        }
    } else {
        $response['message'] = "Faltan datos del responsable.";
    }
}

echo json_encode($response);
?>