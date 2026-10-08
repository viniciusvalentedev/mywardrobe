// Cores que uma peça pode ter. É a lista única do app: "Adicionar peça" mostra
// estas opções e as estatísticas pintam os gráficos com o mesmo hex.
export const COLORS = [
  { name: 'Preto', hex: '#1a1a1a' },
  { name: 'Branco', hex: '#ffffff' },
  { name: 'Cinza', hex: '#9e9e9e' },
  { name: 'Bege', hex: '#e8d5b7' },
  { name: 'Marrom', hex: '#7b4a2d' },
  { name: 'Vermelho', hex: '#e03131' },
  { name: 'Rosa', hex: '#ff8fb8' },
  { name: 'Laranja', hex: '#f08c00' },
  { name: 'Amarelo', hex: '#fcc419' },
  { name: 'Verde', hex: '#2f9e44' },
  { name: 'Azul', hex: '#1c7ed6' },
  { name: 'Roxo', hex: '#7048e8' },
  { name: 'Jeans', hex: '#4a6fa5' },
]

const norm = (s) => String(s ?? '').trim().toLowerCase()
const HEX_BY_NAME = new Map(COLORS.map((c) => [norm(c.name), c.hex]))

// Hex da cor cadastrada na peça; null se o nome não estiver na lista.
export const hexOfColor = (name) => HEX_BY_NAME.get(norm(name)) ?? null
