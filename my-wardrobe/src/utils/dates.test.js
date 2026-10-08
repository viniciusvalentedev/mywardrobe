// Rode com: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { addMonths, daysInMonth, formatDay, formatMonth, monthCells, monthOf, monthRange, todayLocal } from './dates.js'

test('todayLocal usa o dia de São Paulo, não o de UTC', () => {
  // 22h30 do dia 7 em São Paulo já é 01h30 do dia 8 em UTC
  const night = new Date('2026-10-08T01:30:00Z')
  assert.equal(night.toISOString().slice(0, 10), '2026-10-08') // o jeito errado
  assert.equal(todayLocal(night), '2026-10-07')

  assert.equal(todayLocal(new Date('2026-10-08T02:59:59Z')), '2026-10-07') // 23h59
  assert.equal(todayLocal(new Date('2026-10-08T03:00:00Z')), '2026-10-08') // meia-noite
  assert.equal(todayLocal(new Date('2026-10-07T15:00:00Z')), '2026-10-07') // meio-dia
})

test('todayLocal na virada do ano e com zeros à esquerda', () => {
  assert.equal(todayLocal(new Date('2027-01-01T02:00:00Z')), '2026-12-31')
  assert.equal(todayLocal(new Date('2026-03-05T12:00:00Z')), '2026-03-05')
})

test('meses: vizinhos, tamanho e intervalo', () => {
  assert.equal(monthOf('2026-10-07'), '2026-10')
  assert.equal(addMonths('2026-10', 1), '2026-11')
  assert.equal(addMonths('2026-12', 1), '2027-01')
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(addMonths('2026-10', -12), '2025-10')
  assert.equal(daysInMonth('2026-02'), 28)
  assert.equal(daysInMonth('2028-02'), 29)
  assert.deepEqual(monthRange('2026-10'), ['2026-10-01', '2026-10-31'])
  assert.deepEqual(monthRange('2026-02'), ['2026-02-01', '2026-02-28'])
})

test('grade do mês começa no domingo', () => {
  // 1º de outubro de 2026 é quinta-feira: 4 casas vazias antes
  const cells = monthCells('2026-10')
  assert.deepEqual(cells.slice(0, 5), [null, null, null, null, '2026-10-01'])
  assert.equal(cells.length, 4 + 31)
  assert.equal(cells.at(-1), '2026-10-31')
  // 1º de novembro de 2026 é domingo: nenhuma casa vazia
  assert.equal(monthCells('2026-11')[0], '2026-11-01')
})

test('textos em português', () => {
  assert.equal(formatDay('2026-10-07'), 'quarta-feira, 7 de outubro')
  assert.equal(formatMonth('2026-10'), 'outubro de 2026')
})
