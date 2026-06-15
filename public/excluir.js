var _formPendente = null;

function fecharModal() {
  _formPendente = null;
  document.getElementById('modal-excluir').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.delete').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _formPendente = this.closest('form');
      document.getElementById('modal-excluir').style.display = 'flex';
    });
  });

  document.getElementById('btn-confirmar').addEventListener('click', function() {
    if (_formPendente) _formPendente.submit();
  });

  document.getElementById('btn-cancelar').addEventListener('click', fecharModal);

  document.getElementById('modal-excluir').addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
  });
});
