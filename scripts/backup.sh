#!/bin/bash
DATA=$(date +%Y-%m-%d)
PASTA="/var/www/visionguard/backups"
BANCO="/var/www/visionguard/blacklist.db"
DESTINO="$PASTA/blacklist_$DATA.db"
LOG="/var/www/visionguard/logs/backup.log"

mkdir -p $PASTA
mkdir -p /var/www/visionguard/logs

# Fazer backup do SQLite
cp $BANCO $DESTINO
echo "[$(date '+%d/%m/%Y %H:%M')] Backup criado: $DESTINO" >> $LOG

# Remover backups com mais de 7 dias
find $PASTA -name "blacklist_*.db" -mtime +7 -delete
echo "[$(date '+%d/%m/%Y %H:%M')] Backups antigos removidos" >> $LOG

echo "Backup concluido: $DESTINO"
