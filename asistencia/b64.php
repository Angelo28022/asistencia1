<?php
$path = 'c:/xampp/htdocs/asistencia/admin/reportes/logo.png';
$data = file_get_contents($path);
$base64 = base64_encode($data);
echo $base64;
?>