# Deploy do VisionGuard no Portainer

## 0. Pré-requisitos no servidor de destino

- Docker Engine + Docker Compose v2.
- Portainer instalado e configurado, **apontando para um ambiente Docker standalone** (não Swarm). Se for Swarm, o `build:` do docker-compose não funciona — seria necessário gerar as imagens antes e publicar num registry.
- Acesso à internet liberado durante o build (baixa pacotes do PyPI/npm).

## 1. Copiar o projeto para o servidor

Copie a pasta inteira do VisionGuard (com `Dockerfile.web`, `Dockerfile.ai`, `docker-compose.yml`, `init-postgres.sql`, `gfpgan-server/`, `package.json`, código-fonte etc.) para o servidor, por exemplo em `/opt/visionguard`.

Se for usar a opção "Repository" do Portainer, basta que o repositório git esteja acessível (público, ou com credenciais configuradas no Portainer) — o próprio Portainer clona e builda.

## 2. Criar o arquivo `.env`

Na raiz do projeto, copie `.env.example` para `.env` e preencha com valores reais (gere uma senha forte para `DB_PASS` e um valor aleatório para `SESSION_SECRET`, ex: `openssl rand -hex 32`):

```
DB_USER=vgadmin
DB_PASS=<senha forte>
DB_NAME=visionguard_users
SESSION_SECRET=<valor aleatório>
GMAIL_USER=<seu-email@gmail.com>
GMAIL_PASS=<app password do Gmail>
FILA_CONCURRENCIA=2
FACE_POOL_SIZE=2
```

**Nunca** suba esse `.env` para o git — ele já está no `.gitignore`.

## 3. Popular os volumes com os arquivos binários (modelos de IA)

Esses arquivos não ficam no git (são grandes/binários). Rode estes comandos **uma vez**, antes do primeiro `up`, no servidor onde o Docker vai rodar (ajuste os caminhos de origem se os arquivos estiverem em outro lugar):

```bash
# Modelos do face-api.js (reconhecimento facial)
docker volume create visionguard_face_models
docker run --rm \
  -v visionguard_face_models:/dest \
  -v "/caminho/para/blacklist-bot/models":/src \
  busybox cp -r /src/. /dest/

# Peso do GFPGAN (melhoria de rosto)
docker volume create visionguard_gfpgan_weights
docker run --rm \
  -v visionguard_gfpgan_weights:/dest \
  -v "/caminho/para/blacklist-bot/GFPGAN/gfpgan/weights":/src \
  busybox cp /src/GFPGANv1.3.pth /dest/
```

No seu PC atual (Windows), as origens são:
- `C:\projetos\blacklist-bot\models` (modelos face-api.js)
- `C:\projetos\blacklist-bot\GFPGAN\gfpgan\weights\GFPGANv1.3.pth` (peso GFPGAN, ~330MB)

Se o servidor de destino for outra máquina, copie essas duas pastas para ela antes (scp/rsync/pendrive) e troque o caminho de origem nos comandos acima.

> Os nomes dos volumes (`visionguard_face_models`, `visionguard_gfpgan_weights`) seguem o padrão `<nome-da-stack>_<nome-do-volume>`. Se você nomear a stack no Portainer como algo diferente de "visionguard", ajuste o prefixo.

## 4. Subir a stack

### Opção A — Portainer "Stacks → Add stack → Repository"
Aponte para o repositório git. O Portainer clona e builda os Dockerfiles automaticamente a partir do `docker-compose.yml`. Cole o conteúdo do `.env` no campo de variáveis de ambiente da stack (ou use "Environment variables from file").

### Opção B — Terminal + visualizar no Portainer
```bash
cd /opt/visionguard
docker compose up -d --build
```
Depois a stack aparece listada no Portainer normalmente (Docker standalone mostra todos os containers/composes existentes).

## 5. Primeiro acesso — criar o usuário admin

O sistema não vem com nenhum usuário. Passos:

1. Acesse `http://SEU_SERVIDOR:3000/cadastro` e crie sua conta.
2. Você vai precisar confirmar o email (link enviado via Gmail, configurado no `.env`). Se o envio de email falhar, veja os logs do container `web`.
3. Esse primeiro usuário fica como `nivel = normal` e `confirmado = false/true` dependendo da confirmação — mas **ninguém ainda é admin**, então promova-se manualmente direto no Postgres:

```bash
docker compose exec postgres psql -U vgadmin -d visionguard_users \
  -c "UPDATE usuarios SET nivel='admin', confirmado=true WHERE email='seu-email@gmail.com';"
```
(ajuste `-U` e `-d` para os valores de `DB_USER`/`DB_NAME` do seu `.env`)

4. Faça login normalmente em `/login`.

## 6. Conferir se tudo subiu certo

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f ai
```

Pontos de atenção:
- `web` deve logar `SQLite conectado` e `[GFPGAN] Servico pronto`. Se não aparecer "Servico pronto", o peso do GFPGAN não foi encontrado no volume (revise o passo 3).
- `ai` baixa automaticamente o `yolov8n.pt` no primeiro start — precisa de internet.
- Se `/registrar` (cadastro de foto) falhar travado, normalmente é o GFPGAN sem o `.pth` ou os modelos do face-api ausentes em `/app/models`.

## 7. Backups

O banco SQLite (`blacklist.db`), sessões e configs ficam no volume `web_data` (montado em `/data` dentro do container). O Postgres fica no volume `pgdata`. Faça backup desses dois volumes periodicamente — não tem backup automático configurado.
