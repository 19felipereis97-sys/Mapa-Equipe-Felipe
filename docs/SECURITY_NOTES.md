# Notas de Segurança — Mapa da Equipe

## Módulo 0 — Situação atual

- **Este sistema não possui login nem autenticação no Módulo 0.**
- É destinado exclusivamente para uso em **rede interna** (localhost ou rede local da empresa).
- Não deve ser exposto diretamente na internet.

---

## Uso correto no Módulo 0

| Situação                      | Permitido? |
|-------------------------------|-----------|
| Uso local (localhost:3000)    | ✅ Sim    |
| Uso na rede interna (LAN)     | ✅ Sim    |
| Exposição pública na internet | ❌ Não    |
| Acesso via VPN corporativa    | ✅ Sim    |

---

## Medidas de proteção aplicadas neste módulo

- Porta do servidor ligada ao `127.0.0.1` no Docker (não exposta publicamente).
- Arquivo `.env` excluído do Git (via `.gitignore`).
- Nenhuma credencial ou chave sensível hardcoded no código.
- Banco de dados SQLite armazenado localmente em `data/` (excluído do Git).
- `robots.txt` configurado via metadata (`noindex, nofollow`) para não indexação.
- Logs sensíveis não expostos no console em produção.
- Sem rotas de API públicas neste módulo.

---

## Para publicar externamente no futuro

Caso o sistema precise ser acessado fora da rede interna, será necessário implementar antes:

1. **Autenticação** — login com usuário e senha (ex.: NextAuth.js ou similar).
2. **Autorização** — controle de permissões por usuário/papel.
3. **Proteção de rotas** — middleware de autenticação em todas as páginas.
4. **HTTPS** — certificado SSL obrigatório.
5. **Banco mais robusto** — migrar de SQLite para PostgreSQL (via Supabase ou servidor dedicado).
6. **Rate limiting** — proteção contra ataques de força bruta.
7. **Variáveis de ambiente seguras** — uso de secrets manager ou variáveis de ambiente do servidor.
8. **Auditoria de acesso** — log de ações dos usuários.

---

## Backup do banco de dados

O banco SQLite fica em:

```
data/mapa-equipe.db
```

**Backup manual:** copie o arquivo para uma pasta segura.

```bash
# Exemplo de backup manual
cp data/mapa-equipe.db backups/mapa-equipe-$(date +%Y%m%d).db
```

Recomendações:
- Faça backup diário durante uso ativo.
- Armazene cópias em local diferente (HD externo, nuvem privada, etc.).
- Antes de atualizações importantes, sempre faça backup.

---

## Responsabilidade

Este sistema processa dados internos do escritório. Mesmo sem publicação externa, siga as boas práticas:

- Não compartilhe o banco de dados com pessoas não autorizadas.
- Mantenha o sistema atualizado (dependências, Node.js, Next.js).
- Ao desativar o sistema, apague ou arquive o banco de dados com segurança.
