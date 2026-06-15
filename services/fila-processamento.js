const EventEmitter = require('events');

class FilaProcessamento extends EventEmitter {
  constructor(concurrencia = 2) {
    super();
    this.fila = [];
    this.ativos = 0;
    this.concurrencia = concurrencia;
  }

  adicionar(job) {
    this.fila.push(job);
    this._processar();
    return { posicao: this.fila.length + this.ativos };
  }

  _processar() {
    while (this.ativos < this.concurrencia && this.fila.length > 0) {
      this.ativos++;
      const job = this.fila.shift();
      console.log(`[FILA] Iniciando job. Ativos: ${this.ativos}, Na fila: ${this.fila.length}`);

      Promise.resolve(job.fn(job.dados))
        .then(() => this.emit('concluido', job))
        .catch(err => {
          console.error('[FILA] Erro:', err.message);
          this.emit('erro', { job, err });
        })
        .finally(() => {
          this.ativos--;
          console.log(`[FILA] Job concluído. Ativos: ${this.ativos}`);
          this._processar();
        });
    }
  }

  tamanho() {
    return this.fila.length + this.ativos;
  }
}

const concurrencia = parseInt(process.env.FILA_CONCURRENCIA) || 2;
module.exports = new FilaProcessamento(concurrencia);
