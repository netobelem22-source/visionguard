window.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('modal-categorizar');
  var catId = document.getElementById('cat-id');
  var catGrupo = document.getElementById('cat-grupo');
  var catPessoa = document.getElementById('cat-pessoa');
  var catNome = document.getElementById('cat-nome');
  var catNomeGrupo = document.getElementById('cat-nome-grupo');
  var catObs = document.getElementById('cat-observacao');
  var nomeGrupoWrap = document.getElementById('nome-grupo-wrap');
  var novoNomeWrap = document.getElementById('novo-nome-wrap');

  catGrupo.addEventListener('change', function() {
    nomeGrupoWrap.style.display = this.value === 'quadrilha' ? 'block' : 'none';
  });
  nomeGrupoWrap.style.display = 'none';

  catPessoa.addEventListener('change', function() {
    novoNomeWrap.style.display = this.value === '' ? 'block' : 'none';
  });

  function carregarPessoas() {
    while (catPessoa.options.length > 1) catPessoa.remove(1);

    fetch('/pessoas')
      .then(function(r) { return r.json(); })
      .then(function(pessoas) {
        pessoas.forEach(function(p) {
          var opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.nome + (p.grupo ? ' (' + p.grupo + ')' : '');
          catPessoa.appendChild(opt);
        });

        var wrap = catPessoa.parentElement;
        var listaExcluir = wrap.querySelector('.lista-excluir-perfis');
        if (listaExcluir) listaExcluir.remove();

        if (pessoas.length > 0) {
          var lista = document.createElement('div');
          lista.className = 'lista-excluir-perfis';
          lista.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto;';

          pessoas.forEach(function(p) {
            var item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 10px;background:#131720;border-radius:6px;font-size:12px;color:#8b909e;';
            item.innerHTML = '<span>' + p.nome + (p.grupo ? ' <span style="color:#454955">(' + p.grupo + ')</span>' : '') + '</span>' +
              '<button data-id="' + p.id + '" data-nome="' + p.nome + '" style="background:rgba(224,92,92,0.15);color:#e05c5c;border:1px solid rgba(224,92,92,0.2);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;font-family:Inter,sans-serif;">✕</button>';

            item.querySelector('button').addEventListener('click', function() {
              var id = this.getAttribute('data-id');
              var nome = this.getAttribute('data-nome');
              if (confirm('Excluir perfil "' + nome + '"?')) {
                fetch('/pessoas/' + id + '/excluir', { method: 'POST' })
                  .then(function() { carregarPessoas(); });
              }
            });

            lista.appendChild(item);
          });

          wrap.appendChild(lista);
        }
      });
  }

  carregarPessoas();

  document.querySelectorAll('.btn-categorizar').forEach(function(btn) {
    btn.addEventListener('click', function() {
      catId.value = this.getAttribute('data-id');
      catGrupo.value = '';
      catPessoa.value = '';
      catNome.value = '';
      catNomeGrupo.value = '';
      catObs.value = '';
      nomeGrupoWrap.style.display = 'none';
      novoNomeWrap.style.display = 'block';
      modal.classList.add('open');
    });
  });

  document.getElementById('btn-fechar-cat').addEventListener('click', function() {
    modal.classList.remove('open');
  });
  modal.addEventListener('click', function(e) {
    if (e.target === this) modal.classList.remove('open');
  });

  document.getElementById('btn-salvar-cat').addEventListener('click', async function() {
    var id = catId.value;
    var grupo = catGrupo.value;
    var observacao = catObs.value;
    var pessoaId = catPessoa.value;

    if (!grupo) { alert('Selecione uma categoria!'); return; }

    if (!pessoaId && catNome.value.trim()) {
      var novaPessoa = await fetch('/pessoas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: catNome.value.trim(),
          grupo: grupo,
          nome_grupo: catNomeGrupo.value.trim(),
          observacao: observacao
        })
      }).then(function(r) { return r.json(); });
      pessoaId = novaPessoa.id;
    }

    await fetch('/categorizar/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupo: grupo, observacao: observacao, pessoa_id: pessoaId })
    });

    modal.classList.remove('open');
    location.reload();
  });
});
