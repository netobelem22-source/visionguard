async function atualizarDashboard() {

  try {
    
    const socket = io();

    const resposta =
      await fetch(
        "/api/dashboard"
      );

    const dados =
      await resposta.json();

    const grid =
      document.getElementById(
        "grid"
      );

    grid.innerHTML = "";

    dados.forEach(pessoa => {

      grid.innerHTML += `

<div class="card">

  <img
    src="/${pessoa.imagem}"
  >

  <div class="card-content">

    <h2>

      ${pessoa.nome}

    </h2>

    <div class="data">

      ${new Date(
        pessoa.data
      ).toLocaleString()}

    </div>

    <div class="botoes">

      <a
        class="download"
        href="/${pessoa.imagem}"
        download
      >

        Download

      </a>

    </div>

  </div>

</div>

      `;

    });

  } catch (erro) {

    console.log(
      "Erro atualização",
      erro
    );

  }

}

atualizarDashboard();

setInterval(

  atualizarDashboard,

  30000

);
socket.on(

  "dashboard_update",

  () => {

    atualizarDashboard();

  }

);