<?php
header('Content-Type: application/json');
$logo_path = '../reportes/logo.png';

// Basic error logging for diagnostics
error_reporting(0);
ini_set('display_errors', 0);

$response = ['logo' => null];

if (file_exists($logo_path) && is_readable($logo_path)) {
    $logo_data = file_get_contents($logo_path);
    if ($logo_data !== false) {
        $mime_type = mime_content_type($logo_path);
        if ($mime_type) {
            $response['logo'] = 'data:' . $mime_type . ';base64,' . base64_encode($logo_data);
        }
    }
}

echo json_encode($response);
?>
