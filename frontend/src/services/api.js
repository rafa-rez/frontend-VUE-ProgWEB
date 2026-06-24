const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

export const statusOptions = [
  { value: '0', label: 'Em Elaboracao' },
  { value: '1', label: 'Enviado' },
  { value: '2', label: 'Aprovado' },
  { value: '3', label: 'Reprovado' },
]

export const tipoOptions = [
  { value: 'MONOGRAFIA', label: 'Monografia' },
  { value: 'RELATORIO_ESTAGIO', label: 'Relatorio de Estagio' },
  { value: 'RELATORIO_TECNICO', label: 'Relatorio Tecnico' },
  { value: 'ARTIGO', label: 'Artigo' },
]

export const idiomaOptions = [
  { value: 'PT', label: 'Portugues' },
  { value: 'EN', label: 'Ingles' },
]

export const semestreOptions = [
  '2020/1',
  '2020/2',
  '2021/1',
  '2021/2',
  '2022/1',
  '2022/2',
  '2023/1',
  '2023/2',
  '2024/1',
  '2024/2',
  '2025/1',
  '2025/2',
  '2026/1',
]

export const endpoints = {
  unidades: 'unidades-academicas',
  departamentos: 'departamentos',
  cursos: 'cursos',
  alunos: 'alunos',
  professores: 'professores',
  tccs: 'tccs',
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, '')}`, options)

  if (!response.ok) {
    let detail = 'Nao foi possivel concluir a requisicao.'
    try {
      const data = await response.json()
      detail = JSON.stringify(data)
    } catch {
      detail = await response.text()
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return response.json()
}

export function resolveFileUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${MEDIA_BASE_URL}${value}`
  return `${MEDIA_BASE_URL}/${value}`
}

export async function listResource(endpoint, search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return normalizeList(await request(`${endpoint}/${query}`))
}

export async function getAllData(searchByEndpoint = {}) {
  const entries = await Promise.all(
    Object.entries(endpoints).map(async ([key, endpoint]) => {
      const list = await listResource(endpoint, searchByEndpoint[endpoint] || '')
      return [key, list]
    }),
  )
  return Object.fromEntries(entries)
}

export async function getStatistics() {
  return request('tccs/estatisticas/')
}

export async function createTcc(payload) {
  return request('tccs/', {
    method: 'POST',
    body: toTccFormData(payload),
  })
}

export async function updateTccStatus(tccId, status) {
  return request(`tccs/${tccId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
}

function appendIfPresent(formData, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    formData.append(key, value)
  }
}

export function toTccFormData(payload) {
  const formData = new FormData()
  appendIfPresent(formData, 'titulo', payload.titulo)
  appendIfPresent(formData, 'resumo', payload.resumo)
  appendIfPresent(formData, 'palavras_chave', payload.palavras_chave)
  appendIfPresent(formData, 'tipo', payload.tipo)
  appendIfPresent(formData, 'idioma', payload.idioma)
  appendIfPresent(formData, 'aluno', payload.aluno)
  appendIfPresent(formData, 'orientador', payload.orientador)
  appendIfPresent(formData, 'coorientador', payload.coorientador)
  appendIfPresent(formData, 'presidente', payload.presidente)
  appendIfPresent(formData, 'primeiro_membro', payload.primeiro_membro)
  appendIfPresent(formData, 'segundo_membro', payload.segundo_membro)
  appendIfPresent(formData, 'semestre_letivo_defesa', payload.semestre_letivo_defesa)
  appendIfPresent(formData, 'status', payload.status)
  if (payload.arquivo) {
    formData.append('arquivo', payload.arquivo)
  }
  return formData
}
