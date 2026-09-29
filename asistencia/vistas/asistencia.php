<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>SISTEMA ASISTENCIA</title>
    <!-- Tell the browser to be responsive to screen width -->
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <!-- Bootstrap 3.3.5 -->
    <link rel="stylesheet" href="../admin/public/css/bootstrap.min.css">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="../admin/public/css/font-awesome.css">
    <!-- Theme style -->
    <link rel="stylesheet" href="../admin/public/css/AdminLTE.min.css">
    <!-- iCheck -->
    <link rel="stylesheet" href="../admin/public/css/blue.css">
    <link rel="shortcut icon" href="../admin/public/img/escudo-256.png">
    <link rel="stylesheet" href="../admin/public/css/actualizacion.css?v=1">
    <link rel="stylesheet" href="../admin/public/css/responsive.css?v=6">

  </head>
<body class="hold-transition lockscreen">

<!-- Automatic element centering -->
<div class="lockscreen-wrapper">
<?php 
 //include '../ajax/asistencia.php' ?>
    <div name="movimientos" id="movimientos">
    </div> 



  <div class="lockscreen-logo">
    <a href="#"><b>Liceo. Santa Rosa De Lima</b></a>
  </div>
  <!-- User name -->
  <div class="lockscreen-name">ASISTENCIA</div>

  <!-- START LOCK SCREEN ITEM -->
  <div class="lockscreen-item">
    <!-- lockscreen image -->
    <div class="lockscreen-image">
      <img src="../admin/public/img/escudo-256.png" alt="Escudo del Liceo Santa Rosa de Lima">
      
    </div>
    <!-- /.lockscreen-image -->

    <!-- lockscreen credentials (contains the form) -->
    <form  action="" class="lockscreen-credentials" name="formulario" id="formulario" method="POST">
      <div class="form-group">
        <input type="password" class="form-control" name="codigo_persona" id="codigo_persona" inputmode="numeric" placeholder="Ingrese su cédula" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Registrar <i class="fa fa-arrow-right" aria-hidden="true"></i></button>
    </form>
    <!-- /.lockscreen credentials -->

  </div>
  <!-- /.lockscreen-item -->
  <div class="help-block text-center">
    Ingresa tu cédula
  </div>
  <div class="text-center">

  </div>

  <!-- Tablet on-screen keypad (768-1199px + touch only, see responsive.css):
       types into the same #codigo_persona input and reuses the existing
       #formulario submit path, no new registration route. -->
  <div class="kiosk-keypad" id="kioskKeypad">
    <button type="button" class="kiosk-key" data-digit="1">1</button>
    <button type="button" class="kiosk-key" data-digit="2">2</button>
    <button type="button" class="kiosk-key" data-digit="3">3</button>
    <button type="button" class="kiosk-key" data-digit="4">4</button>
    <button type="button" class="kiosk-key" data-digit="5">5</button>
    <button type="button" class="kiosk-key" data-digit="6">6</button>
    <button type="button" class="kiosk-key" data-digit="7">7</button>
    <button type="button" class="kiosk-key" data-digit="8">8</button>
    <button type="button" class="kiosk-key" data-digit="9">9</button>
    <button type="button" class="kiosk-key kiosk-key-clear" id="kioskBorrar" aria-label="Borrar">Borrar</button>
    <button type="button" class="kiosk-key" data-digit="0">0</button>
    <button type="button" class="kiosk-key kiosk-key-submit" id="kioskRegistrar">Registrar</button>
  </div>
  <div class="lockscreen-footer text-center">
    <a href="../admin/">Iniciar Sesión</a>
  </div>
</div>
<!-- /.center -->


    <!-- jQuery -->
    <script src="../admin/public/js/jquery-3.1.1.min.js"></script>
    <!-- Bootstrap 3.3.5 -->
    <script src="../admin/public/js/bootstrap.min.js"></script>
     <!-- Bootbox -->
    <script src="../admin/public/js/bootbox.min.js"></script>

    <script type="text/javascript" src="scripts/asistencia.js"></script>

    <script>
      // Tablet keypad: types into #codigo_persona and reuses the existing
      // #formulario submit event (registrar_asistencia in scripts/asistencia.js)
      // -- same ajax call and clear/reload flow as the on-screen submit button.
      (function () {
        var $input = $('#codigo_persona');
        $(document).on('click', '.kiosk-key[data-digit]', function () {
          $input.val($input.val() + $(this).data('digit'));
        });
        $(document).on('click', '#kioskBorrar', function () {
          $input.val($input.val().slice(0, -1));
        });
        $(document).on('click', '#kioskRegistrar', function () {
          $('#formulario').trigger('submit');
        });
      })();
    </script>

  </body>
</html> 
