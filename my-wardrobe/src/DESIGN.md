# My Wardrobe — guia de design

Site de guarda-roupa pessoal: a Gigi cadastra as roupas, monta looks e guarda os favoritos. A identidade é um rosa bem fofo: macio, claro e carinhoso, nunca açucarado demais.

**Regra de ouro:** use só as variáveis de `src/my-wardrobe-theme.css`. Não invente cores, fontes, raios nem sombras.

## Arquivos da identidade

- `src/my-wardrobe-theme.css`: todos os tokens (claro e escuro) e a importação das fontes.
- `public/my-wardrobe-mark.svg`: logo colorida, para fundos claros.
- `public/my-wardrobe-app-icon.svg`: ícone quadrado, usado como favicon.
- Logo branca (para fundos `primary` ou `rose`): se precisar, troque no SVG a cor do corpo para branco e o interior para `--brand`.

## Voz e texto

Português do Brasil, tratando por "você". Próxima, leve e sem pressa, como quem fez o presente com carinho.

- Botões dizem o que acontece: "Adicionar peça", "Montar look", "Salvar conjunto". Nunca "OK" ou "Enviar".
- Tela vazia convida: "Seu guarda-roupa está esperando as primeiras peças."
- Erro explica e acalma: "Não deu para salvar agora. Tente de novo em instantes."
- Sem exclamação em excesso, sem gíria forçada, sem emoji no meio de frases de interface.

## Cores

| Variável | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--bg` | #fff7fa | #2b1522 | Fundo da página |
| `--surface` | #ffffff | #3a1d2e | Cartões, painéis, campos |
| `--tint` | #ffeaf1 | #4a263a | Quadro da foto da peça, áreas de apoio |
| `--blush` | #ffd3e2 | #5c3248 | Tags, blocos de relevo, botão suave |
| `--petal` | #ffb3cd | #8c4a68 | Detalhes e ilustrações (só decorativo) |
| `--brand` | #ff8fb5 | #ff8fb5 | Rosa da marca: logo, ilustração, grandes áreas. Nunca como texto |
| `--rose` | #e5568a | #d2578a | Estrelas de nota e ícones (3:1 sobre `--surface`) |
| `--primary` | #c93a72 | #ff8fb5 | Botão principal, links, favorito |
| `--primary-hover` | #a82a5c | #ffa6c3 | Botão principal em hover |
| `--on-primary` | #ffffff | #3a1226 | Texto sobre `--primary` |
| `--lilac` | #e6dcff | #5a4a8c | Apoio para tags (usar pouco) |
| `--butter` | #fff0c2 | #6b5624 | Apoio para tags (usar pouco) |
| `--ink` | #4a1d33 | #ffeaf1 | Texto principal |
| `--muted` | #8a5a70 | #e0b3c7 | Texto secundário, placeholder |
| `--line` | #ffd3e2 | #5c3248 | Bordas decorativas de cartões |
| `--line-strong` | #c4668a | #b06a8a | Borda de campos e controles |
| `--danger` | #b3243f | #ff8a9b | Excluir e erros, sempre com texto |
| `--focus` | #c93a72 | #ffa6c3 | Anel de foco de teclado |

Regras:

- Uma ação `--primary` por tela.
- Superfícies em camadas: `--bg` embaixo, `--surface` nos cartões, `--tint` dentro da foto da peça.
- Texto precisa de 4.5:1 ou mais sobre o fundo; bordas de campos e ícones de 3:1 ou mais. Não troque pares de cores por conta própria.
- Tema escuro: `document.documentElement.dataset.theme = 'dark'`.

## Tipografia

- Títulos (`h1`, `h2`, `h3`): `var(--font-display)`, Fredoka 600.
- Texto: `var(--font-body)`, Nunito 400 e 700.

| Estilo | Tamanho / linha | Peso | Uso |
| --- | --- | --- | --- |
| display | 56 / 58 | 600 | Nome da marca, boas-vindas |
| h1 | 36 / 42 | 600 | Título de página |
| h2 | 26 / 32 | 600 | Título de seção |
| h3 | 20 / 26 | 600 | Título de cartão |
| body-lg | 18 / 28 | 400 | Introdução |
| body | 16 / 24 | 400 | Texto padrão |
| small | 14 / 20 | 400 | Apoio |
| label | 13 / 16 | 700 (letter-spacing 0.02em) | Rótulos e tags |
| caption | 12 / 16 | 600 | Legendas |

## Formas, sombras e espaço

- Raios: `--radius-sm` 10px (detalhes), `--radius-md` 16px (campos, foto da peça), `--radius-lg` 24px (cartões), `--radius-xl` 32px (painéis grandes), `--radius-pill` (botões e tags, sempre).
- Sombras: `--shadow-soft` em repouso, `--shadow-pop` em hover e menus abertos.
- Espaços: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px (padrão), `--space-5` 24px (entre cartões), `--space-6` 32px, `--space-7` 48px.
- A foto da peça fica sem fundo, centralizada sobre `--tint`.

## Ícones e logo

- Ícones: traço de 2px, pontas e cantos arredondados, desenho simples (estilo Lucide). Cheios só quando ativos.
- Dois ícones são da marca: coração (favorito) em `--primary` e estrela (nota) em `--rose`.
- Logo: guarda-roupa rosa em silhueta com uma porta aberta, cabide e vestidinho dentro. Tamanho mínimo 24px. Não girar, não esticar, não trocar as cores. Ao lado, o nome "My Wardrobe" em Fredoka 600, cor `--ink`.
- Mostre a logo no cabeçalho e no topo das telas de login e cadastro.

## Componentes

**Botão.** Sempre em pílula (`--radius-pill`), padding 14px por 24px (10px por 18px no pequeno), Nunito 700.
- Primário: fundo `--primary`, texto `--on-primary`; hover `--primary-hover`.
- Suave: fundo `--blush`, texto `--ink`.
- Contorno: transparente, texto `--primary`, borda de 2px em `--line-strong`.
- Perigo: transparente, texto e borda de 2px em `--danger`. Peça confirmação antes de excluir.
- Foco: outline de 3px em `--focus`, afastado 2px. Nunca remover.

**Tag.** Pílula com padding 6px por 12px, estilo `label`, texto `--ink`. Fundo `--blush` para a categoria principal; `--lilac` e `--butter` para variar. A cor da roupa vira texto da tag.

**Campo de texto.** Rótulo sempre visível acima (estilo `label`). Fundo `--surface`, borda de 2px em `--line-strong`, raio `--radius-md`, padding 12px por 16px. Placeholder em `--muted`. No foco: borda `--primary` mais outline de 3px `--focus`. Dica abaixo em `--muted`, estilo `small`.

**Estrelas de nota.** Cinco estrelas de 24px com contorno de 2px em `--rose`; cheia = preenchida, vazia = só contorno. Leitor de tela recebe "Nota X de 5". A nota de um conjunto é a média das notas das peças.

**Cartão de peça.** Largura sugerida 220px, grade com gap de 24px. Fundo `--surface`, borda de 2px em `--line`, raio `--radius-lg`, padding 16px, sombra `--shadow-soft` (hover: `--shadow-pop`). Dentro: quadro da foto (`--tint`, raio `--radius-md`, altura 150px), nome em h3, tags de categoria e cor, e uma linha com estrelas à esquerda e coração de favorito à direita (`--primary`, preenchido quando ativo).

## Checklist antes de entregar uma tela

1. Só variáveis do tema, sem cores soltas.
2. Um único botão primário na tela.
3. Foco por teclado visível em tudo que é clicável.
4. Funciona no celular.
5. Textos no tom da marca, em português do Brasil.
