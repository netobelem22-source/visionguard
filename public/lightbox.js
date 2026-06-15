window.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('modal-foto');
  var modalImg = document.getElementById('modal-foto-img');

  document.querySelectorAll('.card-img-clicavel').forEach(function(img) {
    img.addEventListener('click', function() {
      modalImg.src = this.getAttribute('data-src');
      modal.style.display = 'flex';
    });
  });

  modal.addEventListener('click', function() {
    modal.style.display = 'none';
    modalImg.src = '';
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      modal.style.display = 'none';
      modalImg.src = '';
    }
  });
});
