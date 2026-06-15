window.addEventListener('DOMContentLoaded', function() {
  function atualizarBadge() {
    fetch('/api/pendentes/count')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var badges = document.querySelectorAll('.badge-pendentes');
        badges.forEach(function(b) {
          if (data.total > 0) {
            b.textContent = data.total;
            b.style.display = 'inline';
          } else {
            b.style.display = 'none';
          }
        });
      })
      .catch(function() {});
  }

  setInterval(atualizarBadge, 30000);
});
