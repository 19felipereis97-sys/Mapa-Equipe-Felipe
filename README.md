# Mapa da Equipe

Sistema interno de controle e acompanhamento de equipe contábil.

> ⚠️ **Uso interno apenas.** Não exponha este sistema diretamente na internet sem implementar autenticação. Veja `docs/SECURITY_NOTES.md`.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- npm 9 ou superior

---

## Configuração inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
# Copie o arquivo de exemplo
copy .env.example .env
```

O arquivo `.env` já vem configurado para SQLite local. Não é necessário alterar nada para uso básico.

### 3. Criar o banco de dados e rodar a migration inicial

```bash
npx prisma migrate dev --name init
```

Isso criará o arquivo `data/mapa-equipe.db` automaticamente.

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Comandos disponíveis

| Comando                         | Descrição                                 |
|---------------------------------|-------------------------------------------|
| `npm install`                   | Instala as dependências                   |
| `npm run dev`                   | Inicia o servidor de desenvolvimento      |
| `npm run build`                 | Gera o build de produção                  |
| `npm start`                     | Inicia o servidor em modo produção        |
| `npm run lint`                  | Verifica problemas no código              |
| `npx prisma migrate dev`        | Aplica novas migrations (desenvolvimento) |
| `npx prisma migrate deploy`     | Aplica migrations (produção)              |
| `npx prisma generate`           | Regenera o Prisma Client                  |
| `npx prisma studio`             | Abre interface visual do banco            |
| `npm run db:reset`              | Reseta o banco (CUIDADO: apaga os dados)  |

---

## Rodando na rede interna

Para acessar o sistema de outro computador na mesma rede local:

```bash
# Inicie o servidor escutando em todas as interfaces
npx next dev -H 0.0.0.0
# ou em produção:
npx next start -H 0.0.0.0
```

Descubra o IP da máquina que roda o servidor (ex.: `192.168.1.100`) e acesse do outro computador:

```
http://192.168.1.100:3000
```

> **Importante:** Faça isso apenas na rede interna da empresa. Nunca exponha a porta 3000 ao roteador com port forward público.

---

## Banco de dados

O banco SQLite fica em:

```
data/mapa-equipe.db
```

- O arquivo é criado automaticamente ao rodar `npx prisma migrate dev`.
- A pasta `data/` está no `.gitignore` (não vai para o Git).
- Faça backups regulares copiando este arquivo.

### Backup manual

```bash
# Windows (PowerShell)
Copy-Item data\mapa-equipe.db "backups\mapa-equipe-$(Get-Date -Format 'yyyyMMdd').db"

# Linux / macOS
cp data/mapa-equipe.db backups/mapa-equipe-$(date +%Y%m%d).db
```

---

## Docker (opcional)

O projeto funciona normalmente sem Docker. Se preferir usar:

```bash
# Build e start
docker-compose up -d

# Parar
docker-compose down

# Ver logs
docker-compose logs -f app
```

O banco de dados persiste no volume `./data/` da máquina host.

---

## Estrutura do projeto

```
src/
├── app/                    # App Router (Next.js)
│   ├── layout.tsx          # Layout raiz
│   ├── page.tsx            # Redireciona para /dashboard
│   ├── dashboard/
│   ├── empresas/
│   ├── atividades/
│   ├── equipe/
│   ├── metas-dia/
│   ├── rescindidas/
│   └── configuracoes/
├── components/
│   ├── layout/             # AppLayout, Sidebar, MainContent, Icons
│   └── ui/                 # Button, Input, Card, Badge, Table, Modal, etc.
├── context/                # ThemeContext, AppContext
├── hooks/                  # useLocalStorage, useTheme, useSidebar
├── lib/                    # prisma.ts, utils.ts
├── services/               # systemConfigService.ts
├── styles/                 # globals.css, variables.css
├── types/                  # common.ts, system.ts
└── constants/              # routes.ts, menu.ts, statuses.ts, obrigacoes.ts
prisma/
├── schema.prisma
└── migrations/
data/
└── mapa-equipe.db          # Banco SQLite (excluído do Git)
docs/
└── SECURITY_NOTES.md
```

---

## Segurança

Veja [`docs/SECURITY_NOTES.md`](docs/SECURITY_NOTES.md) para orientações completas.

---

## Próximos módulos

- **Módulo 1** — Configurações: profissionais, tributações, níveis, tipos de obrigações
- **Módulo 2** — Empresas: cadastro completo
- **Módulo 3** — Atividades: mapa de obrigações
- **Módulo 4** — Dashboard: KPIs e alertas
- **Módulo 5** — Equipe, Metas do Dia, Rescindidas
