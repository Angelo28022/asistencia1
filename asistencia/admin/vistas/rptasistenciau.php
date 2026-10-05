<?php
//activamos almacenamiento en el buffer
ob_start();
session_start();
if (!isset($_SESSION['nombre'])) {
  header("Location: login.php");
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
  <h1 class="box-title">Consulta de asistencia por Fecha</h1>
  <div class="box-tools pull-right">
    
  </div>
</div>
<!--box-header-->
<!--centro-->
<div class="panel-body table-responsive" id="listadoregistros">
  <div class="form-group col-lg-3 col-md-3 col-sm-6 col-xs-12">
    <label>Fecha Inicio</label>
    <input type="date" class="form-control" name="fecha_inicio" id="fecha_inicio" value="<?php echo date("Y-m-d"); ?>" onchange="listar_asistenciau()">
  </div>
  <div class="form-group col-lg-3 col-md-3 col-sm-6 col-xs-12">
    <label>Fecha Fin</label>
    <input type="date" class="form-control" name="fecha_fin" id="fecha_fin" value="<?php echo date("Y-m-d"); ?>" onchange="listar_asistenciau()">
  </div>
  <div class="col-lg-12 text-right" id="datatables_buttons_wrap" style="margin-bottom: 10px;">
    <!-- Phones only: a single "Exportar" control reveals the buttons
         below (see responsive.css/asistencia.js); desktop shows them
         inline as before, this toggle stays hidden. -->
    <button type="button" class="btn btn-default" id="btnExportarToggle" aria-expanded="false" aria-controls="datatables_buttons_container">
      <i class="fa fa-download"></i> Exportar
    </button>
    <div id="datatables_buttons_container">
      <!-- DataTables buttons will be dynamically inserted here -->
    </div>
  </div>
  <table id="tbllistado_asistenciau" class="table table-striped table-bordered table-condensed table-hover">
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
  </table>
</div>

<!--fin centro-->
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
 <script src="scripts/asistencia.js?v=9"></script>
 <?php 
}

ob_end_flush();
  ?>

