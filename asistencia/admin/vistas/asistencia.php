<?php 
//activamos almacenamiento en el buffer
ob_start();
session_start();
if (!isset($_SESSION['nombre'])) {
  header("Location: login.html");
}else{

require 'header.php';
 ?>
    <div class="content-wrapper">
    <!-- Main content -->
    <section class="content">

      <!-- Default box -->
      <div class="row">
        <div class="col-md-12">
      <div class="box">
<div class="box-header with-border">
  <h1 class="box-title">Usuarios</h1>
  <div class="box-tools pull-right">
    
  </div>
</div>
<!--box-header-->
<!--centro-->
<div class="panel-body table-responsive" id="listadoregistros">
  <table id="tbllistado" class="table table-striped table-bordered table-condensed table-hover">
    <thead>
      <th>Cédula</th>
      <th>Nombres</th>
      <th>Apellidos</th>
      <th>Cargo</th>
      <th>Asistencia</th>
      <th>Fecha/Hora</th>
    </thead>
    <tbody>
    </tbody>
    <tfoot>
      <th>Cédula</th>
      <th>Nombres</th>
      <th>Apellidos</th>
      <th>Cargo</th>
      <th>Asistencia</th>
      <th>Fecha/Hora</th>
    </tfoot>   
  </table>

</div>


      </div>
      </div>
      <!-- /.box -->

    </section>
    <!-- /.content -->
  </div>
<?php 

require 'footer.php';
 ?>
 <script src="scripts/reporte-jornadas.js?v=3"></script>
 <script src="scripts/reporte-excel.js?v=1"></script>
 <script src="scripts/asistencia.js?v=8"></script>
 <?php 
}

ob_end_flush();
  ?>
