# Sistema Web RN BRS - versão inicial

Protótipo inicial para Registro de Não Conformidade e Assistência Técnica.

## Rodar no VS Code

```bash
npm install
npm run dev
```

Depois abra o endereço que aparecer no terminal.

## Arquivos principais

- `src/main.jsx`: telas, formulário, dashboard e lista RN
- `src/style.css`: layout visual industrial
- `supabase_rn_brs.sql`: modelo inicial de banco de dados Supabase

## Próximos passos

1. Conectar com Supabase real.
2. Criar login de usuários.
3. Salvar fotos/anexos.
4. Integrar ID/link do Runrun.it.
5. Criar filtros por período, cliente, setor, status e responsável.
