#!/usr/bin/env python3
"""
Servico GFPGAN persistente - modelo carregado uma vez, processa via stdin/stdout JSON.
Executa com: python3 servidor_gfpgan.py
Variaveis de ambiente:
  GFPGAN_WEIGHTS_DIR - pasta com os arquivos .pth do GFPGAN (default: /weights)
"""
import sys
import os
import json
import glob
import cv2

WEIGHTS_DIR = os.environ.get('GFPGAN_WEIGHTS_DIR', '/weights')


def log(msg):
    sys.stderr.write(f'[GFPGAN] {msg}\n')
    sys.stderr.flush()


def responder(data):
    sys.stdout.write(json.dumps(data) + '\n')
    sys.stdout.flush()


CANDIDATOS = [
    'GFPGANv1.2.pth',
    'GFPGANCleanv1-NoCE-C2.pth',
    'GFPGANv1.3.pth',
    'GFPGANv1.4.pth',
]

model_path = None
for c in CANDIDATOS:
    caminho = os.path.join(WEIGHTS_DIR, c)
    if os.path.exists(caminho):
        model_path = caminho
        break

if not model_path:
    encontrados = glob.glob(os.path.join(WEIGHTS_DIR, '*.pth'))
    if encontrados:
        model_path = encontrados[0]

if not model_path:
    log(f'ERRO: Nenhum modelo .pth encontrado em {WEIGHTS_DIR}')
    sys.exit(1)

log(f'Carregando modelo: {model_path}')

try:
    from gfpgan import GFPGANer
    restorer = GFPGANer(
        model_path=model_path,
        upscale=1,
        arch='clean',
        channel_multiplier=2,
        bg_upsampler=None
    )
    log('Modelo carregado. Servico pronto.')
    responder({'status': 'pronto'})
except Exception as e:
    log(f'Erro ao carregar modelo: {e}')
    sys.exit(1)

for linha in sys.stdin:
    linha = linha.strip()
    if not linha:
        continue
    try:
        job = json.loads(linha)
        caminho = job['caminho']
        pasta_saida = job['pasta_saida']

        img = cv2.imread(caminho, cv2.IMREAD_COLOR)
        if img is None:
            responder({'erro': 'imagem_nao_encontrada'})
            continue

        _, faces_restauradas, _ = restorer.enhance(
            img,
            has_aligned=False,
            only_center_face=True,
            paste_back=True
        )

        if not faces_restauradas:
            responder({'erro': 'sem_rosto'})
            continue

        pasta_faces = os.path.join(pasta_saida, 'restored_faces')
        os.makedirs(pasta_faces, exist_ok=True)

        nome_arquivo = os.path.basename(caminho)
        destino = os.path.join(pasta_faces, nome_arquivo)
        cv2.imwrite(destino, faces_restauradas[0])

        responder({'sucesso': True})
        log(f'Processado: {nome_arquivo}')

    except Exception as e:
        log(f'Erro ao processar: {e}')
        responder({'erro': str(e)})
