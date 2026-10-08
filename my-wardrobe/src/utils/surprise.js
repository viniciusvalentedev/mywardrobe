// "Me surpreenda": sorteio de conjunto. Só funções puras; `rng` (padrão Math.random)
// pode ser trocado nos testes. A extensão no import deixa o arquivo rodar direto no Node.
import { EMPTY_PICK, MIN_SLOTS, SLOTS, filledSlots, outfitRating, pickKey, pickOfOutfit } from './outfits.js'

export const UNRATED_WEIGHT = 3 // peça (ou conjunto) sem nota pesa como 3 estrelas
export const EXTRA_CHANCE = 0.3 // o Extra só entra em 30% dos sorteios
export const MAX_TRIES = 5 // tentativas para não repetir a combinação anterior

// Peso = nota: 5 estrelas pesa 5, 1 estrela pesa 1.
export function weightOf(item) {
  const rating = Number(item?.rating)
  return rating > 0 ? rating : UNRATED_WEIGHT
}

// Sorteia um elemento com chance proporcional ao peso. Lista vazia devolve null.
export function weightedPick(list, weight = weightOf, rng = Math.random) {
  if (list.length === 0) return null
  const weights = list.map(weight)
  let roll = rng() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < list.length; i++) {
    roll -= weights[i]
    if (roll < 0) return list[i]
  }
  return list[list.length - 1]
}

// `locked` guarda, por espaço, o id da peça travada. A trava vale enquanto
// essa mesma peça estiver no espaço; trocar ou tirar a peça desfaz a trava.
export const isLocked = (pick, locked, slot) => !!pick[slot] && locked[slot] === pick[slot].id

// Uma rodada do sorteio de peças.
//   groups: peças por espaço (groupBySlot)   pick: o que está na tela agora
// Devolve { pick, missing }, onde missing lista os espaços que ela ainda não
// tem peça para preencher (só Cima, Baixo e Calçado; Extra é opcional).
export function drawPick({ groups, pick = EMPTY_PICK, locked = {}, rng = Math.random }) {
  const fixed = (slot) => isLocked(pick, locked, slot)
  const next = { ...EMPTY_PICK }
  for (const { key } of SLOTS) if (fixed(key)) next[key] = pick[key]

  const missing = []
  const draw = (slot) => {
    if (fixed(slot)) return
    if (groups[slot].length === 0) missing.push(slot)
    else next[slot] = weightedPick(groups[slot], weightOf, rng)
  }

  // Vestido ou Cima + Baixo? Peça travada decide; senão, proporcional à
  // quantidade de opções de cada lado (sem vestido cadastrado, nunca é vestido).
  let dress
  if (fixed('dress')) dress = true
  else if (fixed('top') || fixed('bottom')) dress = false
  else {
    const dresses = groups.dress.length
    const pieces = groups.top.length + groups.bottom.length
    dress = dresses > 0 && rng() * (dresses + pieces) < dresses
  }

  if (dress) draw('dress')
  else {
    draw('top')
    draw('bottom')
  }
  draw('shoes')

  const canDrawExtra = !fixed('extra') && groups.extra.length > 0
  if (canDrawExtra && rng() < EXTRA_CHANCE) next.extra = weightedPick(groups.extra, weightOf, rng)
  // faltou peça para o mínimo de espaços: o Extra entra para completar
  if (canDrawExtra && !next.extra && filledSlots(next) < MIN_SLOTS) {
    next.extra = weightedPick(groups.extra, weightOf, rng)
  }

  return { pick: next, missing }
}

// Repete `draw` até sair algo diferente de `avoidKey` (no máximo MAX_TRIES vezes).
function drawDifferent(draw, avoidKey) {
  let result
  for (let i = 0; i < MAX_TRIES; i++) {
    result = draw()
    if (pickKey(result.pick) !== avoidKey) break
  }
  return result
}

// Sorteio de peças evitando repetir exatamente o que já está na tela.
export function surprisePick(args) {
  return drawDifferent(() => drawPick(args), pickKey(args.pick ?? EMPTY_PICK))
}

// Sorteia entre os conjuntos SALVOS com a ocasião, ponderado pela nota calculada.
// Só entram conjuntos que tenham as peças travadas nos mesmos espaços.
// Devolve { outfit, pick, tagged }: outfit é null se nenhum servir, e tagged diz
// quantos conjuntos têm a ocasião (para saber se o problema foram as travas).
export function surpriseSaved({ outfits, occasion, pick = EMPTY_PICK, locked = {}, rng = Math.random }) {
  const lockedSlots = SLOTS.map((s) => s.key).filter((slot) => isLocked(pick, locked, slot))
  const tagged = outfits.filter((o) => (o.occasions ?? []).includes(occasion))
  const candidates = tagged
    .map((outfit) => ({ outfit, pick: pickOfOutfit(outfit) }))
    .filter((c) => filledSlots(c.pick) >= MIN_SLOTS)
    .filter((c) => lockedSlots.every((slot) => c.pick[slot]?.id === pick[slot].id))

  if (candidates.length === 0) return { outfit: null, pick: null, tagged: tagged.length }

  const weight = (c) => outfitRating(Object.values(c.pick)) ?? UNRATED_WEIGHT
  const chosen = drawDifferent(() => weightedPick(candidates, weight, rng), pickKey(pick))
  return { ...chosen, tagged: tagged.length }
}
