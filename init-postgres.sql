CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'normal',
  confirmado BOOLEAN NOT NULL DEFAULT false,
  token_confirmacao TEXT,
  token_expira TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
