/* global bootbox */
/*
 * Shared "responsable del reporte" step for the list PDFs (usuarios,
 * departamentos): shows the modal from footer.php, logs the answer in
 * reporte_responsables (ajax/log_reporte.php) and then hands it to the
 * report builder in the shape ReporteJornadas' letterhead/signature expect.
 */
var ReporteResponsable = (function () {
  'use strict';

  // Emission date is always the download day (local date, not UTC)
  function fechaHoyISO() {
    var hoy = new Date();
    return hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);
  }

  function leer() {
    var cargo = $('#responsable_cargo').val();
    var departamento = $('#responsable_departamento').val();
    return {
      nombre: $('#responsable_nombre').val(),
      cargo: cargo === 'Otro' ? $('#responsable_cargo_otro').val() : cargo,
      departamento: departamento === 'Otro' ? $('#responsable_departamento_otro').val() : departamento,
      fecha: fechaHoyISO()
    };
  }

  function cerrarModal() {
    // blur first so focus is not left inside an aria-hidden modal
    $('#confirmarResponsableBtn').blur();
    $('#responsableModal').modal('hide');
  }

  // tipoReporte: label stored in reporte_responsables.tipo_reporte.
  // generar(responsable): called once the log is saved, with
  // { nombre, cargo, departamento, fechaEmisionISO }.
  function pedir(tipoReporte, generar) {
    $('#responsableModal').modal('show');

    $('#confirmarResponsableBtn').off('click').on('click', function () {
      var formulario = $('#formResponsable')[0];
      if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
      }

      var datos = leer();

      $.post('../ajax/log_reporte.php', $.extend({ tipo_reporte: tipoReporte }, datos), function (r) {
        cerrarModal();
        if (!r || !r.success) {
          bootbox.alert('Error al generar el reporte: ' + (r ? r.message : 'respuesta vacía'));
          return;
        }
        generar({
          nombre: datos.nombre,
          cargo: datos.cargo,
          departamento: datos.departamento,
          fechaEmisionISO: datos.fecha
        });
      }, 'json').fail(function () {
        cerrarModal();
        bootbox.alert('Error de comunicación con el servidor al generar el reporte.');
      });
    });
  }

  return { pedir: pedir };
})();
