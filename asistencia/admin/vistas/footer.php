  <footer class="main-footer">
    <div class="pull-right hidden-xs">
    </div>
  Desarrollado por estudiantes de la UPTT
  </footer>

<!-- Modal para Asignar Responsable de Reporte -->
<div class="modal fade" id="responsableModal" tabindex="-1" role="dialog" aria-labelledby="responsableModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title" id="responsableModalLabel">Asignar Responsable del Reporte</h4>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <form id="formResponsable">
          <div class="form-group">
            <label for="responsable_nombre">Nombre Completo *</label>
            <input type="text" class="form-control" id="responsable_nombre" required>
          </div>
          <div class="form-group">
            <label for="responsable_cargo">Cargo / Posición *</label>
            <select class="form-control" id="responsable_cargo" required>
              <option value="Gerente de Proyectos">Gerente de Proyectos</option>
              <option value="Analista de Datos">Analista de Datos</option>
              <option value="Jefe de Departamento">Jefe de Departamento</option>
              <option value="Administrador">Administrador</option>
              <option value="Otro">Otro (especificar)</option>
            </select>
            <input type="text" class="form-control" id="responsable_cargo_otro" style="display:none; margin-top:10px;" placeholder="Especifique el cargo">
          </div>
          <div class="form-group">
            <label for="responsable_departamento">Departamento / Área *</label>
            <select class="form-control" id="responsable_departamento" required>
                <!-- Opciones se podrían cargar dinámicamente -->
               <option value="Ventas">Ventas</option>
               <option value="Tecnología">Tecnología</option>
               <option value="Recursos Humanos">Recursos Humanos</option>
               <option value="Administración">Administración</option>
               <option value="Otro">Otro (especificar)</option>
            </select>
             <input type="text" class="form-control" id="responsable_departamento_otro" style="display:none; margin-top:10px;" placeholder="Especifique el departamento">
          </div>
          <div class="form-group">
            <label for="responsable_fecha">Fecha de Emisión *</label>
            <input type="date" class="form-control" id="responsable_fecha" required>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-dismiss="modal">Cancelar Generación</button>
        <button type="button" class="btn btn-primary" id="confirmarResponsableBtn">Confirmar Responsable</button>
      </div>
    </div>
  </div>
</div>


<!-- jQuery 3 -->

  <script src="../public/js/jquery-3.1.1.min.js"></script>
    <!-- Bootstrap 3.3.5 -->
    <script src="../public/js/bootstrap.min.js"></script>
    <!-- AdminLTE App -->
    <script src="../public/js/app.min.js"></script>

    <!-- DATATABLES -->
    <script src="../public/datatables/jquery.dataTables.min.js"></script>    
    <script src="../public/datatables/dataTables.buttons.min.js"></script>
    <script src="../public/datatables/buttons.html5.min.js"></script>
    <script src="../public/datatables/buttons.colVis.min.js"></script>
    <script src="../public/datatables/jszip.min.js"></script>
    <script src="../public/datatables/pdfmake.min.js"></script>
    <script src="../public/datatables/vfs_fonts.js"></script> 

    <script src="../public/js/bootbox.min.js"></script> 
    <script src="../public/js/bootstrap-select.min.js"></script>
    <script src="../public/js/filestyle.min.js"> </script>

    <script>
      // Lógica para el modal de responsable
      $(document).ready(function() {
        // Fecha automática
        document.getElementById('responsable_fecha').valueAsDate = new Date();

        // Mostrar campo "Otro" para Cargo
        $('#responsable_cargo').on('change', function() {
          $('#responsable_cargo_otro').toggle($(this).val() === 'Otro').prop('required', $(this).val() === 'Otro');
        });

        // Mostrar campo "Otro" para Departamento
        $('#responsable_departamento').on('change', function() {
          $('#responsable_departamento_otro').toggle($(this).val() === 'Otro').prop('required', $(this).val() === 'Otro');
        });
      });
    </script>

    <script>
      // Phone drawer: close on scrim tap, Escape, or tapping a real nav
      // link. AdminLTE's own PushMenu keeps handling the hamburger toggle
      // and the sidebar-open/sidebar-collapse classes; this only adds the
      // extra ways of dismissing it that the stock widget doesn't cover.
      (function () {
        function closeDrawer() {
          $('body').removeClass('sidebar-open');
        }
        $(document).on('click', '.sidebar-overlay', closeDrawer);
        $(document).on('click', '.sidebar-menu a[href]:not([href="#"])', function () {
          if ($(window).width() < 768) closeDrawer();
        });
        $(document).on('keydown', function (e) {
          if (e.key === 'Escape' || e.keyCode === 27) closeDrawer();
        });
      })();
    </script>

</body>
</html>