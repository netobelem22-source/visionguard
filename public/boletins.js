window.addEventListener('DOMContentLoaded', function() {
var PESSOA_ID = document.getElementById('pessoa-data').getAttribute('data-id');
  var modal = document.getElementById('modal-bo');

  function tipoLabel(tipo) {
    var map = { furto: 'Furto', tentativa: 'Tentativa', assedio: 'Assédio', vandalismo: 'Vandalismo', outro: 'Outro' };
    return map[tipo] || tipo;
  }

  function statusLabel(status) {
    var map = { aberto: 'Em aberto', registrado: 'Registrado', encerrado: 'Encerrado' };
    return map[status] || status;
  }

  function carregarBoletins() {
    fetch('/pessoas/' + PESSOA_ID + '/boletins')
      .then(function(r) { return r.json(); })
      .then(function(boletins) {
        var lista = document.getElementById('lista-boletins');
        if (boletins.length === 0) {
          lista.innerHTML = '<p style="color:#454955;font-size:13px">Nenhum boletim registrado ainda.</p>';
          return;
        }
        lista.innerHTML = boletins.map(function(b) {
          return '<div class="bo-item">' +
            '<div class="bo-header">' +
              '<span class="bo-numero">' + (b.numero_bo || 'Sem número') + '</span>' +
              '<span class="bo-badge bo-' + b.status + '">' + statusLabel(b.status) + '</span>' +
              '<span class="bo-badge bo-tipo-' + b.tipo + '">' + tipoLabel(b.tipo) + '</span>' +
            '</div>' +
            '<p class="bo-info">' + (b.loja || '') + (b.data_ocorrencia ? ' · ' + new Date(b.data_ocorrencia).toLocaleString('pt-BR') : '') + (b.prejuizo ? ' · Prejuízo: ' + b.prejuizo : '') + '</p>' +
            (b.descricao ? '<p class="bo-desc">' + b.descricao + '</p>' : '') +
            (b.medida ? '<p class="bo-desc">Medida: ' + b.medida + '</p>' : '') +
            '<div class="bo-acoes">' +
              '<button class="btn-bo-sm btn-bo-perigo" data-bo-id="' + b.id + '">Excluir</button>' +
            '</div>' +
          '</div>';
        }).join('');
lista.querySelectorAll('.btn-bo-perigo').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var id = this.getAttribute('data-bo-id');
    if (confirm('Excluir este boletim?')) {
      fetch('/boletins/' + id + '/excluir', { method: 'POST' })
        .then(function() { carregarBoletins(); });
    }
  });
});
      });
  }

 

  // Abrir modal
  document.getElementById('btn-novo-bo').addEventListener('click', function() {
    var agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    document.getElementById('bo-data').value = agora.toISOString().slice(0, 16);
    modal.classList.add('open');
  });

  // Fechar modal
  document.getElementById('btn-fechar-bo').addEventListener('click', function() {
    modal.classList.remove('open');
  });
  modal.addEventListener('click', function(e) {
    if (e.target === this) modal.classList.remove('open');
  });

  // Salvar boletim
  document.getElementById('btn-salvar-bo').addEventListener('click', function() {
    var dados = {
  numero_bo: document.getElementById('bo-numero').value,
  tipo: document.getElementById('bo-tipo').value,
  loja: document.getElementById('bo-loja').value,
  data_ocorrencia: document.getElementById('bo-data').value,
  prejuizo: document.getElementById('bo-prejuizo').value,
  descricao: document.getElementById('bo-descricao').value,
  status: 'registrado'
};

    fetch('/pessoas/' + PESSOA_ID + '/boletins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.sucesso) {
          modal.classList.remove('open');
          carregarBoletins();
        }
      });
  });

  carregarBoletins();
});
