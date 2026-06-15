window.addEventListener('DOMContentLoaded', function() {

  // Grupos permitidos
  function atualizarGruposJson() {
    var tags = document.querySelectorAll('.grupo-tag');
    var grupos = [];
    tags.forEach(function(t) { grupos.push(t.textContent.replace('×','').trim()); });
    document.getElementById('grupos-json').value = JSON.stringify(grupos);
  }

  window.removerGrupo = function(btn) {
    btn.parentElement.remove();
    atualizarGruposJson();
  };

  document.getElementById('btn-add-grupo').addEventListener('click', function() {
    var val = document.getElementById('novo-grupo').value.trim();
    if (!val) return;
    var wrap = document.getElementById('grupos-wrap');
    var span = document.createElement('span');
    span.className = 'grupo-tag';
    span.innerHTML = val + ' <button type="button" onclick="removerGrupo(this)">×</button>';
    wrap.appendChild(span);
    document.getElementById('novo-grupo').value = '';
    atualizarGruposJson();
  });

  // Backup
  document.getElementById('btn-backup').addEventListener('click', function() {
    var btn = this;
    btn.textContent = 'Gerando backup...';
    fetch('/configuracoes/backup', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.sucesso) {
          btn.textContent = '✓ Backup realizado!';
          document.getElementById('backup-info').textContent = 'Backup salvo em: ' + data.arquivo;
        }
      })
      .catch(function() { btn.textContent = '⬇ Backup agora'; });
  });

  // Limpar registros
  document.getElementById('btn-limpar').addEventListener('click', function() {
    if (confirm('Tem certeza? Isso vai remover registros recusados com mais de 30 dias.')) {
      fetch('/configuracoes/limpar', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          alert('Removidos ' + data.removidos + ' registros.');
        });
    }
  });

});
