// Categoria da peça -> espaço do conjunto. É a lista única de categorias do app:
// uma categoria nova entra aqui e já aparece em "Adicionar peça" e no espaço certo.
// A migration de outfits repete este mapeamento para vínculos antigos.
export const CATEGORY_SLOT = {
  Camiseta: 'top',
  Blusa: 'top',
  Regata: 'top',
  Casaco: 'extra',
  Calça: 'bottom',
  Short: 'bottom',
  Saia: 'bottom',
  Vestido: 'dress',
  Tênis: 'shoes',
  Sapato: 'shoes',
  Sandália: 'shoes',
  Acessório: 'extra',
}

export const CATEGORIES = Object.keys(CATEGORY_SLOT)

// Espaços na ordem em que aparecem, de cima para baixo.
export const SLOTS = [
  { key: 'top', label: 'Cima', empty: 'Nenhuma peça de cima por enquanto.' },
  { key: 'bottom', label: 'Baixo', empty: 'Nenhuma peça de baixo por enquanto.' },
  { key: 'dress', label: 'Vestido', empty: 'Nenhum vestido por enquanto.' },
  { key: 'shoes', label: 'Calçado', empty: 'Nenhum calçado por enquanto.' },
  { key: 'extra', label: 'Extra', empty: 'Nenhum extra por enquanto.' },
]

export const EMPTY_PICK = { top: null, bottom: null, dress: null, shoes: null, extra: null }

// Tags de ocasião de um conjunto. Para criar outra, basta acrescentar aqui:
// ela aparece no montar/editar e no filtro de "Meus conjuntos".
export const OCCASIONS = ['Trabalho', 'Faculdade', 'Festa', 'Casual']

// Peças de um conjunto salvo (outfit_items com a peça embutida) no formato de escolha.
export function pickOfOutfit(outfit) {
  const pick = { ...EMPTY_PICK }
  for (const link of outfit.outfit_items) {
    if (link.item && link.slot in pick) pick[link.slot] = link.item
  }
  return pick
}

// Linhas de outfit_items ou outfit_log_items (com a peça em `item`) na ordem dos
// espaços, de cima para baixo. O vestido fica no lugar de Cima + Baixo.
export const orderedPieces = (links) =>
  SLOTS.flatMap(({ key }) => links.filter((link) => link.slot === key && link.item))

// Identifica uma combinação: mesma peça em cada espaço = mesma chave.
export const pickKey = (pick) => SLOTS.map((s) => pick[s.key]?.id ?? '').join('|')

// Linhas de outfit_items (sem outfit_id) para as peças escolhidas.
export const rowsOfPick = (pick) =>
  Object.entries(pick)
    .filter(([, item]) => item)
    .map(([slot, item]) => ({ item_id: item.id, slot }))

// Vestido ocupa Cima + Baixo, então são 4 espaços no total e ele conta como 2.
export const MAX_SLOTS = 4
export const MIN_SLOTS = 2

const norm = (s) => String(s ?? '').trim().toLowerCase()
const SLOT_BY_CATEGORY = new Map(Object.entries(CATEGORY_SLOT).map(([c, slot]) => [norm(c), slot]))

// Categoria desconhecida (peça antiga, texto diferente) cai em Extra.
export const slotOfCategory = (category) => SLOT_BY_CATEGORY.get(norm(category)) ?? 'extra'

const orList = new Intl.ListFormat('pt-BR', { type: 'disjunction' })

// "Camiseta, Blusa ou Regata"
export const categoriesOfSlot = (slot) =>
  orList.format(CATEGORIES.filter((c) => CATEGORY_SLOT[c] === slot))

export function groupBySlot(items) {
  const groups = { top: [], bottom: [], dress: [], shoes: [], extra: [] }
  for (const it of items) groups[slotOfCategory(it.category)].push(it)
  return groups
}

// Escolhe (ou tira, se já estava escolhida) uma peça num espaço.
// Vestido esvazia Cima e Baixo; peça de Cima ou Baixo tira o vestido.
export function pickItem(pick, slot, item) {
  const next = { ...pick, [slot]: pick[slot]?.id === item.id ? null : item }
  if (!next[slot]) return next
  if (slot === 'dress') {
    next.top = null
    next.bottom = null
  } else if (slot === 'top' || slot === 'bottom') {
    next.dress = null
  }
  return next
}

export const filledSlots = (pick) =>
  Object.entries(pick).reduce((n, [slot, item]) => n + (item ? (slot === 'dress' ? 2 : 1) : 0), 0)

// Nota do conjunto: média das estrelas das peças, cada peça uma vez (vestido incluso).
// Nunca é salva no banco; sempre sai das peças.
export function outfitRating(items) {
  const ratings = items.map((it) => Number(it?.rating)).filter((r) => r > 0)
  if (ratings.length === 0) return null
  return ratings.reduce((a, b) => a + b, 0) / ratings.length
}

export const formatRating = (value) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
