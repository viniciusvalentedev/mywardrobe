// Datas do app. Um dia é sempre o texto 'AAAA-MM-DD' (igual à coluna worn_on) e um
// mês é 'AAAA-MM'; comparar esses textos com < e > já compara as datas.
//
// "Hoje" é o dia no fuso do app, não em UTC. Nunca use toISOString().slice(0, 10):
// depois das 21h em São Paulo isso já devolve o dia seguinte. Use todayLocal().
export const TIME_ZONE = 'America/Sao_Paulo'

const pad = (n) => String(n).padStart(2, '0')

const localParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// O dia de hoje no fuso do app. `now` só existe para os testes.
export function todayLocal(now = new Date()) {
  const parts = Object.fromEntries(localParts.formatToParts(now).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

// As contas abaixo usam UTC só como calendário neutro (sem horário de verão nem fuso).
const utcDate = (day) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export const monthOf = (day) => day.slice(0, 7)

export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// Primeiro e último dia do mês, para buscar só o mês visível.
export const monthRange = (month) => [`${month}-01`, `${month}-${pad(daysInMonth(month))}`]

// Células da grade mensal, com a semana começando no domingo.
// null = casa vazia antes do dia 1.
export function monthCells(month) {
  const lead = utcDate(`${month}-01`).getUTCDay()
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${pad(i + 1)}`)
  return [...Array(lead).fill(null), ...days]
}

export const WEEKDAYS = [
  { short: 'D', long: 'domingo' },
  { short: 'S', long: 'segunda-feira' },
  { short: 'T', long: 'terça-feira' },
  { short: 'Q', long: 'quarta-feira' },
  { short: 'Q', long: 'quinta-feira' },
  { short: 'S', long: 'sexta-feira' },
  { short: 'S', long: 'sábado' },
]

const dayFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const monthFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' })

// "quarta-feira, 7 de outubro"
export const formatDay = (day) => dayFormat.format(utcDate(day))
// "outubro de 2026"
export const formatMonth = (month) => monthFormat.format(utcDate(`${month}-01`))
