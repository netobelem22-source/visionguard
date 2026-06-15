window.addEventListener('DOMContentLoaded', function() {
  var inputFoto = document.getElementById('input-foto');
  var preview = document.getElementById('preview');
  var previewImg = document.getElementById('preview-img');
  var form = document.getElementById('form-registro');
  var loading = document.getElementById('loading');
  var btnEnviar = document.getElementById('btn-enviar');

  if (!inputFoto) return;
// Preencher data/hora atual automaticamente
var dataField = document.getElementById('data_ocorrencia');
if (dataField) {
  var agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  dataField.value = agora.toISOString().slice(0, 16);
}
  inputFoto.addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  if (form) {
  var enviando = false;
  form.addEventListener('submit', function(e) {
    if (enviando) {
      e.preventDefault();
      return;
    }
    enviando = true;
    form.style.display = 'none';
    loading.style.display = 'block';
    btnEnviar.disabled = true;
  });
}
});
