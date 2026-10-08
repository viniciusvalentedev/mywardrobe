# My Wardrobe

Aplicativo web de guarda-roupa pessoal, pensado para o celular. Você fotografa as peças, o fundo da foto é removido no próprio navegador, e a partir delas monta conjuntos, registra o que usou em cada dia e acompanha estatísticas de uso.

O código do app fica na pasta `my-wardrobe/`.

## Funcionalidades

### Guarda-roupa

- Login e cadastro só com usuário e senha (Supabase Auth; um e-mail fictício é montado por trás).
- Cadastro de peça por foto da câmera ou da galeria, redimensionada para no máximo 1024px.
- Remoção de fundo no navegador com [@imgly/background-removal](https://github.com/imgly/background-removal-js), com a opção de salvar a foto original.
- Cada peça tem categoria, cor e nota de 1 a 5 estrelas.
- Grade de peças com filtro por categoria e cor e ordenação por data ou nota.
- Edição e exclusão de peça. Antes de excluir, o app avisa em quantos conjuntos e em quantos dias do histórico a peça aparece.

### Conjuntos

- Montar conjunto: espaços Cima, Baixo, Calçado e Extra, cada um numa fileira que desliza. O vestido ocupa Cima e Baixo ao mesmo tempo.
- A nota do conjunto é a média das estrelas das peças. Ela é calculada na hora e nunca é gravada no banco.
- Um conjunto precisa de pelo menos 2 espaços preenchidos (o vestido conta como 2).
- Meus conjuntos: lista com as peças empilhadas, nome, nota, favoritos, edição e exclusão.
- Tags de ocasião (Trabalho, Faculdade, Festa, Casual), com filtro por ocasião e por favoritos.
- Me surpreenda: sorteia um conjunto com chance proporcional à nota das peças. Dá para travar peças com o cadeado e sortear só o resto, ou sortear entre os conjuntos salvos de uma ocasião.

### Calendário de looks

- Registro do que foi usado em cada dia, por três caminhos: botão "Usei hoje" em um conjunto salvo, botão "Usei hoje" na tela de montar (sem precisar salvar) ou direto num dia do calendário.
- O registro é uma cópia das peças daquele dia. Editar ou excluir o conjunto de origem depois não muda o histórico.
- Pode haver mais de um look no mesmo dia. Dias passados podem ser registrados; dias futuros, não.
- Grade mensal com miniatura do look, navegação por setas ou deslizando, e um painel por dia para ver, adicionar e remover looks.

### Estatísticas

Abrem pelo botão "Ver estatísticas" no fim do Calendário e têm endereço próprio (`#/estatisticas`).

- Período de 30 dias, 90 dias ou tudo, aplicado aos blocos de uso.
- Resumo, peças mais usadas, peças esquecidas no armário e conjunto mais usado.
- Peças por categoria e distribuição de cores do guarda-roupa, além das cores mais vestidas.
- Comparação entre a nota média do que foi vestido e a do guarda-roupa inteiro.
- O uso de uma peça é contado em dias distintos: aparecer em dois looks no mesmo dia conta uma vez.

## Tecnologias

- [React 19](https://react.dev) e [Vite](https://vite.dev)
- [Supabase](https://supabase.com): Auth, banco Postgres com RLS e Storage
- ESLint e o executor de testes embutido do Node (`node --test`)

Não há roteador nem biblioteca de gráficos: a navegação é um estado no `App.jsx` e os gráficos são HTML e CSS.

## Como rodar

Pré-requisitos: Node.js 22 ou mais recente e um projeto no Supabase.

```bash
git clone <url-do-repositorio>
cd <pasta-do-repositorio>/my-wardrobe
npm install
```

Crie o arquivo `my-wardrobe/.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

Configure o Supabase (seção abaixo) e inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O arquivo `.env.local` não é versionado. Nunca publique chaves secretas no repositório.

## Configuração do Supabase

### 1. Auth

Habilite o login por e-mail e senha e desligue a confirmação de e-mail, porque os e-mails são fictícios.

### 2. Storage

Crie um bucket público chamado `wardrobe`. As fotos são gravadas em `<id-da-usuaria>/<arquivo>`.

### 3. Tabela de peças

A tabela `items` não tem migration no repositório e precisa existir antes das outras, com RLS ativada:

| Coluna       | Tipo          | Observação                    |
| ------------ | ------------- | ----------------------------- |
| `id`         | `uuid`        | chave primária                |
| `user_id`    | `uuid`        | padrão `auth.uid()`           |
| `created_at` | `timestamptz` | padrão `now()`                |
| `image_url`  | `text`        | URL pública da foto no bucket |
| `category`   | `text`        |                               |
| `color`      | `text`        |                               |
| `rating`     | `smallint`    | 1 a 5                         |

### 4. Migrations

O projeto não usa a CLI do Supabase. Cole cada arquivo de `my-wardrobe/supabase/migrations/` no SQL Editor, na ordem do nome. Todos podem ser executados mais de uma vez.

| Arquivo                                    | O que cria                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `20261007120000_outfits.sql`               | Tabelas `outfits` e `outfit_items`, com RLS                                                                  |
| `20261007130000_outfit_edit_occasions.sql` | Colunas `occasions` e `updated_at` e a função `update_outfit`, que edita um conjunto numa única transação    |
| `20261007140000_outfit_logs.sql`           | Tabelas `outfit_logs` e `outfit_log_items` do calendário, com RLS, e as funções `log_outfit` e `delete_item` |
| `20261007150000_stats.sql`                 | Funções `stats_*` das estatísticas, que só leem dados                                                        |

### Modelo de dados

- `items`: as peças.
- `outfits` e `outfit_items`: os conjuntos salvos e a peça de cada espaço (`top`, `bottom`, `shoes`, `extra` ou `dress`).
- `outfit_logs` e `outfit_log_items`: um look usado num dia (`worn_on`, do tipo `date`) e as peças copiadas no momento do registro.

Em todas as tabelas, cada usuária só lê e altera os próprios registros. Excluir uma peça apaga os conjuntos que a usam e a retira do histórico; um look que ficar sem nenhuma peça é apagado.

## Datas e fuso horário

Os dias do calendário e das estatísticas seguem o fuso `America/Sao_Paulo`, tanto no navegador (`todayLocal()` em `src/utils/dates.js`) quanto no banco (função `local_today()`). Não use `toISOString().slice(0, 10)` para obter o dia de hoje: depois das 21h em São Paulo isso já devolve o dia seguinte.

## Estrutura

```
my-wardrobe/
├── src/
│   ├── App.jsx                # sessão, navegação por abas e endereço das estatísticas
│   ├── main.jsx
│   ├── index.css              # estilos do app
│   ├── my-wardrobe-theme.css  # cores, fontes e espaçamentos (temas claro e escuro)
│   ├── DESIGN.md              # guia da identidade visual
│   ├── pages/
│   │   ├── Login.jsx          # entrar e criar conta
│   │   ├── Closet.jsx         # guarda-roupa: grade, detalhes e exclusão
│   │   ├── AddItem.jsx        # adicionar e editar peça
│   │   ├── BuildOutfit.jsx    # montar, editar ou registrar um conjunto; Me surpreenda
│   │   ├── Outfits.jsx        # meus conjuntos
│   │   ├── Calendar.jsx       # calendário de looks
│   │   ├── Stats.jsx          # estatísticas
│   │   └── TestBg.jsx         # teste da remoção de fundo (fora da navegação)
│   ├── components/            # carrossel de espaço, pilha de peças, painel do dia, filtros, ícones
│   ├── hooks/                 # filtros do guarda-roupa, aviso flutuante, consulta de estatística
│   ├── lib/
│   │   ├── supabase.js        # cliente Supabase
│   │   └── logs.js            # registro de look no calendário
│   └── utils/
│       ├── outfits.js         # categorias, espaços, ocasiões e cálculo da nota
│       ├── colors.js          # cores das peças (nome e hex)
│       ├── surprise.js        # sorteio do Me surpreenda
│       ├── dates.js           # dia de hoje no fuso do app e contas de mês
│       └── storage.js         # caminho do arquivo a partir da URL pública
└── supabase/migrations/       # SQL para rodar no SQL Editor
```

Para acrescentar uma categoria, uma ocasião ou uma cor, edite a lista correspondente em `src/utils/outfits.js` ou `src/utils/colors.js`; as telas leem dessas listas.

## Scripts

Rode dentro de `my-wardrobe/`.

| Comando           | Descrição                               |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento             |
| `npm run build`   | Build de produção                       |
| `npm run preview` | Pré-visualiza o build                   |
| `npm run lint`    | Executa o ESLint                        |
| `npm test`        | Testes do sorteio e das funções de data |
