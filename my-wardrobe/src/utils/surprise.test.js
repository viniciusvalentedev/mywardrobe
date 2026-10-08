// Rode com: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { EMPTY_PICK, filledSlots, groupBySlot, pickKey } from './outfits.js'
import { drawPick, surprisePick, surpriseSaved, weightOf, weightedPick } from './surprise.js'

// gerador com semente: mesmos números a cada execução
function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

let nextId = 0
const item = (category, rating) => ({ id: `i${++nextId}`, category, rating })
const closet = () =>
  groupBySlot([
    item('Camiseta', 5),
    item('Blusa', 1),
    item('Calça', 4),
    item('Saia', 2),
    item('Vestido', 5),
    item('Tênis', 3),
    item('Sapato', 5),
    item('Acessório', 4),
  ])
const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i))

test('peso = nota; sem nota pesa 3', () => {
  assert.equal(weightOf({ rating: 5 }), 5)
  assert.equal(weightOf({ rating: 1 }), 1)
  assert.equal(weightOf({ rating: null }), 3)
  assert.equal(weightOf({ rating: 0 }), 3)
  assert.equal(weightOf({}), 3)
})

test('weightedPick: lista vazia devolve null e rng escolhe pela faixa de peso', () => {
  const list = [{ id: 'a', rating: 1 }, { id: 'b', rating: 5 }] // faixas: a = [0, 1/6), b = [1/6, 1)
  assert.equal(weightedPick([]), null)
  assert.equal(weightedPick(list, weightOf, () => 0).id, 'a')
  assert.equal(weightedPick(list, weightOf, () => 0.16).id, 'a')
  assert.equal(weightedPick(list, weightOf, () => 0.17).id, 'b')
  assert.equal(weightedPick(list, weightOf, () => 0.999999).id, 'b')
})

test('5 estrelas sai cerca de 5 vezes mais que 1 estrela, mas a de nota baixa ainda sai', () => {
  const list = [{ id: 'baixa', rating: 1 }, { id: 'alta', rating: 5 }]
  const rng = seeded(7)
  const low = many(6000, () => weightedPick(list, weightOf, rng)).filter((x) => x.id === 'baixa').length
  assert.ok(low > 850 && low < 1150, `esperado perto de 1000, veio ${low}`)
})

test('vestido nunca sai junto com Cima ou Baixo, e sempre sai uma peça por espaço', () => {
  const groups = closet()
  const rng = seeded(3)
  let dresses = 0
  for (const { pick, missing } of many(2000, () => drawPick({ groups, rng }))) {
    assert.deepEqual(missing, [])
    assert.ok(pick.shoes)
    if (pick.dress) {
      dresses++
      assert.equal(pick.top, null)
      assert.equal(pick.bottom, null)
    } else {
      assert.ok(pick.top && pick.bottom)
    }
    assert.ok(filledSlots(pick) >= 2)
  }
  // 1 vestido contra 4 peças de cima/baixo: perto de 1/5
  assert.ok(dresses > 320 && dresses < 480, `esperado perto de 400, veio ${dresses}`)
})

test('sem vestido cadastrado, nunca sorteia vestido', () => {
  const groups = { ...closet(), dress: [] }
  const rng = seeded(5)
  assert.ok(many(500, () => drawPick({ groups, rng })).every((r) => r.pick.dress === null))
})

test('Extra entra em cerca de 30% dos sorteios e nunca quando não há extras', () => {
  const groups = closet()
  const rng = seeded(11)
  const withExtra = many(4000, () => drawPick({ groups, rng })).filter((r) => r.pick.extra).length
  assert.ok(withExtra > 1050 && withExtra < 1350, `esperado perto de 1200, veio ${withExtra}`)
  const none = { ...groups, extra: [] }
  assert.ok(many(300, () => drawPick({ groups: none, rng })).every((r) => r.pick.extra === null))
})

test('categoria vazia: sorteia o que dá e avisa o que falta', () => {
  const groups = { ...closet(), shoes: [], dress: [] }
  const { pick, missing } = drawPick({ groups, rng: seeded(2) })
  assert.ok(pick.top && pick.bottom)
  assert.equal(pick.shoes, null)
  assert.deepEqual(missing, ['shoes'])
})

test('se faltar peça para o mínimo de 2 espaços, o Extra completa', () => {
  const groups = groupBySlot([item('Camiseta', 4), item('Acessório', 2)])
  for (const { pick, missing } of many(200, (i) => drawPick({ groups, rng: seeded(i + 1) }))) {
    assert.ok(pick.top && pick.extra)
    assert.deepEqual(missing, ['bottom', 'shoes'])
  }
})

test('guarda-roupa vazio: nada sorteado, tudo avisado', () => {
  const { pick, missing } = drawPick({ groups: groupBySlot([]) })
  assert.equal(filledSlots(pick), 0)
  assert.deepEqual(missing, ['top', 'bottom', 'shoes'])
})

test('peça travada não muda e decide entre vestido e Cima + Baixo', () => {
  const groups = closet()
  const rng = seeded(9)
  const bottom = groups.bottom[1]
  const dress = groups.dress[0]
  for (let i = 0; i < 500; i++) {
    const a = drawPick({ groups, pick: { ...EMPTY_PICK, bottom }, locked: { bottom: bottom.id }, rng }).pick
    assert.equal(a.bottom, bottom)
    assert.equal(a.dress, null)
    assert.ok(a.top)

    const b = drawPick({ groups, pick: { ...EMPTY_PICK, dress }, locked: { dress: dress.id }, rng }).pick
    assert.equal(b.dress, dress)
    assert.equal(b.top, null)
    assert.equal(b.bottom, null)
  }
})

test('trava só vale para a peça que foi travada', () => {
  const groups = closet()
  const [first, second] = groups.shoes
  const rng = seeded(4)
  // travou `first`, mas depois trocou para `second`: o espaço volta a ser sorteado
  const results = many(200, () => drawPick({ groups, pick: { ...EMPTY_PICK, shoes: second }, locked: { shoes: first.id }, rng }))
  assert.ok(results.some((r) => r.pick.shoes === first))
})

test('surprisePick evita repetir a combinação que já está na tela', () => {
  const groups = groupBySlot([item('Camiseta', 5), item('Blusa', 5), item('Calça', 5), item('Tênis', 5)])
  const rng = seeded(6)
  let pick = EMPTY_PICK
  let repeats = 0
  for (let i = 0; i < 400; i++) {
    const next = surprisePick({ groups, pick, rng }).pick
    if (pickKey(next) === pickKey(pick)) repeats++
    pick = next
  }
  // 2 combinações possíveis: sem as 5 tentativas repetiria metade das vezes; com elas, 1 em 32
  assert.ok(repeats < 30, `repetiu ${repeats} vezes em 400`)
})

test('surprisePick devolve a única combinação possível mesmo sendo repetida', () => {
  const groups = groupBySlot([item('Camiseta', 5), item('Calça', 5)])
  const first = surprisePick({ groups }).pick
  assert.equal(pickKey(surprisePick({ groups, pick: first }).pick), pickKey(first))
})

const saved = (id, occasions, pairs) => ({
  id,
  occasions,
  outfit_items: pairs.map(([slot, it]) => ({ slot, item: it })),
})

test('surpriseSaved sorteia só conjuntos com a ocasião, ponderado pela nota do conjunto', () => {
  const g = closet()
  const outfits = [
    saved('bom', ['Festa'], [['top', g.top[0]], ['bottom', g.bottom[0]], ['shoes', g.shoes[1]]]), // (5+4+5)/3
    saved('fraco', ['Festa', 'Casual'], [['top', g.top[1]], ['bottom', g.bottom[1]]]), // (1+2)/2
    saved('trabalho', ['Trabalho'], [['dress', g.dress[0]], ['shoes', g.shoes[0]]]),
  ]
  const rng = seeded(8)
  const drawn = many(3000, () => surpriseSaved({ outfits, occasion: 'Festa', rng }).outfit.id)
  assert.ok(!drawn.includes('trabalho'))
  const weak = drawn.filter((id) => id === 'fraco').length
  // pesos 4,67 e 1,5: o fraco sai em cerca de 24% das vezes
  assert.ok(weak > 600 && weak < 850, `esperado perto de 730, veio ${weak}`)

  const work = surpriseSaved({ outfits, occasion: 'Trabalho', rng })
  assert.equal(work.outfit.id, 'trabalho')
  assert.equal(work.pick.dress, g.dress[0])
})

test('surpriseSaved: sem conjunto na ocasião devolve null', () => {
  const g = closet()
  const outfits = [saved('a', [], [['top', g.top[0]], ['bottom', g.bottom[0]]])]
  assert.deepEqual(surpriseSaved({ outfits, occasion: 'Festa' }), { outfit: null, pick: null, tagged: 0 })
})

test('surpriseSaved respeita peça travada e evita repetir o conjunto da tela', () => {
  const g = closet()
  const outfits = [
    saved('a', ['Casual'], [['top', g.top[0]], ['bottom', g.bottom[0]]]),
    saved('b', ['Casual'], [['top', g.top[1]], ['bottom', g.bottom[0]]]),
    saved('c', ['Casual'], [['top', g.top[1]], ['bottom', g.bottom[1]]]),
  ]
  const rng = seeded(12)
  const pick = { ...EMPTY_PICK, top: g.top[1] }
  const locked = { top: g.top[1].id }
  assert.ok(many(200, () => surpriseSaved({ outfits, occasion: 'Casual', pick, locked, rng }).outfit.id).every((id) => id !== 'a'))

  // travou uma peça que nenhum conjunto da ocasião usa
  const none = surpriseSaved({ outfits, occasion: 'Casual', pick: { ...EMPTY_PICK, shoes: g.shoes[0] }, locked: { shoes: g.shoes[0].id }, rng })
  assert.equal(none.outfit, null)
  assert.equal(none.tagged, 3)

  // "a" (peso 4,5) está na tela e disputa com "b" (peso 2,5): sem as 5 tentativas
  // repetiria em 64% das vezes (~193 de 300); com elas, em 11% (~33)
  const current = surpriseSaved({ outfits: outfits.slice(0, 2), occasion: 'Casual', rng: () => 0 }).pick
  const again = many(300, () => surpriseSaved({ outfits: outfits.slice(0, 2), occasion: 'Casual', pick: current, rng }).outfit.id)
  const repeats = again.filter((id) => id === 'a').length
  assert.ok(repeats < 60, `repetiu ${repeats} vezes em 300`)
})
