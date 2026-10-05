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
  <h1 class="box-title">Consulta de Asistencias por Fecha</h1>

  <div class="box-tools pull-right">
  </div>
</div>
<!--box-header-->
<!--centro-->
<div class="panel-body table-responsive" id="listadoregistros">
  <div class="form-group col-lg-3 col-md-3 col-sm-6 col-xs-12">
    <label>Fecha Inicio</label>
    <input type="date" class="form-control" name="fecha_inicio" id="fecha_inicio" value="<?php echo date("Y-m-d"); ?>">
  </div>
  <div class="form-group col-lg-3 col-md-3 col-sm-6 col-xs-12">
    <label>Fecha Fin</label>
    <input type="date" class="form-control" name="fecha_fin" id="fecha_fin" value="<?php echo date("Y-m-d"); ?>">
  </div>
  <div class="form-inline col-lg-6 col-md-6 col-sm-6 col-xs-12">
    <label>Empleado</label>
    <select id="idcliente" name="idcliente" class="form-control selectpicker" data-live-search="true" data-container="body" data-size="8">
</select>
    <div class="form-group" style="margin-top: 10px;">
        <button class="btn btn-success" onclick="listar_asistencia();">
            Mostrar
        </button>
        <button class="btn btn-primary" onclick="listar_asistencia_todos();" style="margin-left:10px;">
            Buscar Todos
        </button>
    </div>
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
  <table id="tbllistado_asistencia" class="table table-striped table-bordered table-condensed table-hover">
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

    <!-- Modal para Responsable del Reporte -->
    <div class="modal fade" id="responsableModal" tabindex="-1" role="dialog" aria-labelledby="responsableModalLabel" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="responsableModalLabel">Asignar Responsable del Reporte</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <form id="responsableForm">
              <div class="form-group">
                <label for="nombre_completo">Nombre Completo *</label>
                <input type="text" class="form-control" id="nombre_completo" required>
              </div>
              <div class="form-group">
                <label for="cargo">Cargo/Posición *</label>
                <select class="form-control" id="cargo" required>
                  <option value="Gerente de Proyectos">Gerente de Proyectos</option>
                  <option value="Analista de Datos">Analista de Datos</option>
                  <option value="Jefe de Departamento">Jefe de Departamento</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div class="form-group">
                <label for="departamento">Departamento/Área *</label>
                <select class="form-control" id="departamento" required>
                  <!-- Opciones de departamento se cargarán dinámicamente -->
                </select>
              </div>
              <div class="form-group">
                <label for="fecha_emision">Fecha de Emisión *</label>
                <input type="date" class="form-control" id="fecha_emision" required>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar Generación</button>
            <button type="button" class="btn btn-primary" id="confirmarResponsable">Confirmar Responsable</button>
          </div>
        </div>
      </div>
    </div>

  </div>
<?php 


require 'footer.php';
 ?>
 <script src="scripts/reporte-jornadas.js?v=3"></script>
 <script src="scripts/reporte-excel.js?v=1"></script>
 <script src="scripts/asistencia.js?v=10"></script>
 <?php 
}

ob_end_flush();
  ?>
