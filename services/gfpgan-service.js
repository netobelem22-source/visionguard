const { spawn } = require('child_process');
const readline = require('readline');

let _resolveGfpganPronto;
const gfpganPronto = new Promise(r => { _resolveGfpganPronto = r; });
const _callbacks = [];

const proc = spawn(
  '/var/www/GFPGAN/venv/bin/python3',
  ['/var/www/GFPGAN/servidor_gfpgan.py'],
  { stdio: ['pipe', 'pipe', 'pipe'] }
);

const rl = readline.createInterface({ input: proc.stdout });

rl.on('line', line => {
  try {
    const msg = JSON.parse(line);
    if (msg.status === 'pronto') {
      console.log('[GFPGAN] Servico pronto');
      _resolveGfpganPronto();
      return;
    }
    const cb = _callbacks.shift();
    if (cb) cb(msg);
  } catch (e) {
    console.error('[GFPGAN] Resposta invalida:', line);
  }
});

proc.stderr.on('data', data => process.stdout.write(data));

proc.on('exit', code => {
  console.error(`[GFPGAN] Processo encerrado com codigo ${code}`);
});

async function melhorar(caminho, pasta_saida) {
  await gfpganPronto;
  return new Promise(resolve => {
    _callbacks.push(resolve);
    proc.stdin.write(JSON.stringify({ caminho, pasta_saida }) + '\n');
  });
}

module.exports = { melhorar };
