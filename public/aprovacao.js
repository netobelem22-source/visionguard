window.addEventListener('DOMContentLoaded', function() {

  // APROVAR
  document.querySelectorAll('.btn-aprovar').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.getAttribute('data-id');
      fetch('/blacklist/' + id + '/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aprovado' })
      }).then(function() { location.reload(); });
    });
  });

  // RECUSAR - abrir modal
  var modalRec = document.getElementById('modal-recusar');
  var recId = document.getElementById('rec-id');

  document.querySelectorAll('.btn-recusar').forEach(function(btn) {
    btn.addEventListener('click', function() {
      recId.value = this.getAttribute('data-id');
      modalRec.classList.add('open');
    });
  });

  // Fechar modal recusar
  document.getElementById('btn-fechar-rec').addEventListener('click', function() {
    modalRec.classList.remove('open');
  });
  modalRec.addEventListener('click', function(e) {
    if (e.target === this) modalRec.classList.remove('open');
  });

  // Salvar recusa
  document.getElementById('btn-salvar-rec').addEventListener('click', function() {
    var id = recId.value;
    var motivo = document.getElementById('rec-motivo').value;
    var obs = document.getElementById('rec-obs').value;
    fetch('/blacklist/' + id + '/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'recusado', observacao: motivo + (obs ? ': ' + obs : '') })
    }).then(function() {
      modalRec.classList.remove('open');
      location.reload();
    });
  });

});
