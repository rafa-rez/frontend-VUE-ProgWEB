<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  FileDown,
  FilePlus2,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCcw,
  Search,
  Send,
  UserRound,
  UsersRound,
} from '@lucide/vue'
import {
  createTcc,
  endpoints,
  getAllData,
  getStatistics,
  idiomaOptions,
  resolveFileUrl,
  semestreOptions,
  statusOptions,
  tipoOptions,
  updateTccStatus,
} from './services/api'

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'tccs', label: 'TCCs', icon: BookOpen },
  { key: 'alunos', label: 'Alunos', icon: GraduationCap },
  { key: 'professores', label: 'Professores', icon: UsersRound },
  { key: 'cursos', label: 'Cursos', icon: Layers3 },
  { key: 'departamentos', label: 'Departamentos', icon: Building2 },
  { key: 'unidades', label: 'Unidades', icon: UserRound },
]

const listConfigs = {
  alunos: {
    title: 'Alunos',
    endpoint: endpoints.alunos,
    icon: GraduationCap,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'matricula', label: 'Matricula' },
      { key: 'curso', label: 'Curso', lookup: 'cursos' },
    ],
  },
  professores: {
    title: 'Professores',
    endpoint: endpoints.professores,
    icon: UsersRound,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'departamento', label: 'Departamento', lookup: 'departamentos' },
    ],
  },
  cursos: {
    title: 'Cursos',
    endpoint: endpoints.cursos,
    icon: Layers3,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'sigla', label: 'Sigla' },
      { key: 'codigo', label: 'Codigo' },
    ],
  },
  departamentos: {
    title: 'Departamentos',
    endpoint: endpoints.departamentos,
    icon: Building2,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'sigla', label: 'Sigla' },
      { key: 'unidade_academica', label: 'Unidade Academica', lookup: 'unidades' },
    ],
  },
  unidades: {
    title: 'Unidades Academicas',
    endpoint: endpoints.unidades,
    icon: UserRound,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'sigla', label: 'Sigla' },
    ],
  },
}

const activeTab = ref('dashboard')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const search = reactive({
  tccs: '',
  alunos: '',
  professores: '',
  cursos: '',
  departamentos: '',
  unidades: '',
})
const data = reactive({
  unidades: [],
  departamentos: [],
  cursos: [],
  alunos: [],
  professores: [],
  tccs: [],
})
const statistics = ref(null)
const statusDraft = reactive({})
const form = reactive(defaultForm())

const lookups = computed(() => ({
  unidades: mapById(data.unidades, (item) => `${item.nome} (${item.sigla})`),
  departamentos: mapById(data.departamentos, (item) => `${item.nome} (${item.sigla})`),
  cursos: mapById(data.cursos, (item) => `${item.nome} (${item.codigo})`),
  alunos: mapById(data.alunos, (item) => `${item.nome} (${item.matricula})`),
  professores: mapById(data.professores, (item) => item.nome),
}))

const filteredTccs = computed(() => {
  const term = search.tccs.trim().toLowerCase()
  if (!term) return data.tccs
  return data.tccs.filter((tcc) => {
    const values = [
      tcc.titulo,
      tcc.resumo,
      tcc.palavras_chave,
      labelFor('alunos', tcc.aluno),
      labelFor('professores', tcc.orientador),
      statusLabel(tcc.status, tcc.status_display),
    ]
    return values.some((value) => String(value || '').toLowerCase().includes(term))
  })
})

const metricCards = computed(() => {
  const stats = statistics.value || {}
  const porStatus = stats.por_status || {}
  return [
    { label: 'Total de TCCs', value: stats.total_geral || 0 },
    { label: 'Aprovados', value: porStatus.Aprovado || 0 },
    { label: 'Enviados', value: porStatus.Enviado || 0 },
    { label: 'Em elaboracao', value: porStatus['Em Elaboracao'] || porStatus['Em Elaboração'] || 0 },
  ]
})

const activeListConfig = computed(() => listConfigs[activeTab.value] || null)

function defaultForm() {
  return {
    titulo: '',
    resumo: '',
    palavras_chave: '',
    tipo: 'MONOGRAFIA',
    idioma: 'PT',
    aluno: '',
    orientador: '',
    coorientador: '',
    presidente: '',
    primeiro_membro: '',
    segundo_membro: '',
    semestre_letivo_defesa: '2026/1',
    status: '0',
    arquivo: null,
  }
}

function mapById(items, getLabel) {
  return Object.fromEntries(items.map((item) => [String(item.id), getLabel(item)]))
}

function labelFor(lookupName, value) {
  return lookups.value[lookupName]?.[String(value)] || value || '-'
}

function statusLabel(status, display) {
  const option = statusOptions.find((item) => item.value === String(status))
  return option?.label || display || status || '-'
}

function optionLabel(options, value, fallback) {
  const option = options.find((item) => item.value === String(value))
  return option?.label || fallback || value || '-'
}

function displayCell(item, column) {
  if (column.lookup) return labelFor(column.lookup, item[column.key])
  return item[column.key] || '-'
}

function filteredList(key) {
  const term = search[key].trim().toLowerCase()
  const list = data[key] || []
  if (!term) return list
  return list.filter((item) => Object.values(item).some((value) => String(value || '').toLowerCase().includes(term)))
}

function chartEntries(source = {}, limit = 6) {
  return Object.entries(source)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function maxValue(source = {}) {
  const values = Object.values(source)
  return Math.max(1, ...values)
}

function resetMessages() {
  error.value = ''
  success.value = ''
}

async function loadData() {
  loading.value = true
  resetMessages()
  try {
    const [allData, stats] = await Promise.all([getAllData(), getStatistics()])
    Object.assign(data, allData)
    statistics.value = stats
    data.tccs.forEach((tcc) => {
      statusDraft[tcc.id] = String(tcc.status)
    })
  } catch (err) {
    error.value = `Erro ao carregar dados: ${err.message}`
  } finally {
    loading.value = false
  }
}

async function submitTcc() {
  saving.value = true
  resetMessages()
  try {
    await createTcc(form)
    Object.assign(form, defaultForm())
    await loadData()
    activeTab.value = 'tccs'
    success.value = 'TCC cadastrado com sucesso.'
  } catch (err) {
    error.value = `Erro ao cadastrar TCC: ${err.message}`
  } finally {
    saving.value = false
  }
}

async function saveStatus(tcc) {
  saving.value = true
  resetMessages()
  try {
    await updateTccStatus(tcc.id, statusDraft[tcc.id])
    await loadData()
    success.value = 'Status atualizado.'
  } catch (err) {
    error.value = `Erro ao alterar status: ${err.message}`
  } finally {
    saving.value = false
  }
}

function setFile(event) {
  form.arquivo = event.target.files?.[0] || null
}

onMounted(loadData)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">T</div>
        <div>
          <strong>Gestao de TCCs</strong>
          <span>Frontend Vue</span>
        </div>
      </div>

      <nav class="nav-list" aria-label="Navegacao principal">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="nav-button"
          :class="{ active: activeTab === tab.key }"
          type="button"
          :title="tab.label"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="18" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div>
          <p class="eyebrow">Sistema Academico</p>
          <h1>Controle de Trabalhos de Conclusao de Curso</h1>
        </div>
        <button class="icon-button" type="button" title="Atualizar dados" @click="loadData">
          <RefreshCcw :size="18" />
        </button>
      </header>

      <div v-if="error" class="notice error">{{ error }}</div>
      <div v-if="success" class="notice success">{{ success }}</div>

      <section v-if="loading" class="loading-panel">
        <Loader2 class="spin" :size="28" />
        <span>Carregando dados da API...</span>
      </section>

      <template v-else>
        <section v-if="activeTab === 'dashboard'" class="content-stack">
          <div class="metrics-grid">
            <article v-for="metric in metricCards" :key="metric.label" class="metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          </div>

          <div class="chart-grid">
            <article class="chart-panel">
              <h2>Por status</h2>
              <div class="bar-list">
                <div v-for="[label, value] in chartEntries(statistics?.por_status)" :key="label" class="bar-row">
                  <span>{{ label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" :style="{ width: `${(value / maxValue(statistics?.por_status)) * 100}%` }"></div>
                  </div>
                  <strong>{{ value }}</strong>
                </div>
              </div>
            </article>

            <article class="chart-panel">
              <h2>Por orientador</h2>
              <div class="bar-list">
                <div v-for="[label, value] in chartEntries(statistics?.por_orientador)" :key="label" class="bar-row">
                  <span>{{ label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill alt" :style="{ width: `${(value / maxValue(statistics?.por_orientador)) * 100}%` }"></div>
                  </div>
                  <strong>{{ value }}</strong>
                </div>
              </div>
            </article>

            <article class="chart-panel">
              <h2>Por curso</h2>
              <div class="bar-list">
                <div v-for="[label, value] in chartEntries(statistics?.por_curso)" :key="label" class="bar-row">
                  <span>{{ label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill warm" :style="{ width: `${(value / maxValue(statistics?.por_curso)) * 100}%` }"></div>
                  </div>
                  <strong>{{ value }}</strong>
                </div>
              </div>
            </article>

            <article class="chart-panel">
              <h2>Por semestre</h2>
              <div class="bar-list">
                <div v-for="[label, value] in chartEntries(statistics?.por_semestre)" :key="label" class="bar-row">
                  <span>{{ label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill cool" :style="{ width: `${(value / maxValue(statistics?.por_semestre)) * 100}%` }"></div>
                  </div>
                  <strong>{{ value }}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === 'tccs'" class="content-stack">
          <div class="section-heading">
            <div>
              <p class="eyebrow">TCCs</p>
              <h2>Cadastro, arquivos e status</h2>
            </div>
            <label class="search-field">
              <Search :size="18" />
              <input v-model="search.tccs" type="search" placeholder="Buscar TCC, aluno, orientador..." />
            </label>
          </div>

          <form class="tcc-form" @submit.prevent="submitTcc">
            <div class="form-header">
              <FilePlus2 :size="20" />
              <h3>Cadastrar TCC</h3>
            </div>

            <div class="form-grid">
              <label>
                Titulo
                <input v-model="form.titulo" required type="text" />
              </label>
              <label>
                Palavras-chave
                <input v-model="form.palavras_chave" required type="text" />
              </label>
              <label>
                Tipo
                <select v-model="form.tipo" required>
                  <option v-for="option in tipoOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>
              <label>
                Idioma
                <select v-model="form.idioma" required>
                  <option v-for="option in idiomaOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>
              <label>
                Aluno
                <select v-model="form.aluno" required>
                  <option value="" disabled>Selecione</option>
                  <option v-for="aluno in data.alunos" :key="aluno.id" :value="aluno.id">{{ aluno.nome }}</option>
                </select>
              </label>
              <label>
                Orientador
                <select v-model="form.orientador" required>
                  <option value="" disabled>Selecione</option>
                  <option v-for="professor in data.professores" :key="professor.id" :value="professor.id">{{ professor.nome }}</option>
                </select>
              </label>
              <label>
                Coorientador
                <select v-model="form.coorientador">
                  <option value="">Nenhum</option>
                  <option v-for="professor in data.professores" :key="professor.id" :value="professor.id">{{ professor.nome }}</option>
                </select>
              </label>
              <label>
                Presidente
                <select v-model="form.presidente" required>
                  <option value="" disabled>Selecione</option>
                  <option v-for="professor in data.professores" :key="professor.id" :value="professor.id">{{ professor.nome }}</option>
                </select>
              </label>
              <label>
                Primeiro membro
                <select v-model="form.primeiro_membro" required>
                  <option value="" disabled>Selecione</option>
                  <option v-for="professor in data.professores" :key="professor.id" :value="professor.id">{{ professor.nome }}</option>
                </select>
              </label>
              <label>
                Segundo membro
                <select v-model="form.segundo_membro" required>
                  <option value="" disabled>Selecione</option>
                  <option v-for="professor in data.professores" :key="professor.id" :value="professor.id">{{ professor.nome }}</option>
                </select>
              </label>
              <label>
                Semestre
                <select v-model="form.semestre_letivo_defesa">
                  <option v-for="semestre in semestreOptions" :key="semestre" :value="semestre">{{ semestre }}</option>
                </select>
              </label>
              <label>
                Status
                <select v-model="form.status">
                  <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>
              <label class="wide">
                Resumo
                <textarea v-model="form.resumo" required rows="4"></textarea>
              </label>
              <label class="wide">
                Arquivo PDF
                <input accept="application/pdf,.pdf" type="file" @change="setFile" />
              </label>
            </div>

            <button class="primary-button" type="submit" :disabled="saving">
              <Send :size="18" />
              <span>{{ saving ? 'Salvando...' : 'Cadastrar TCC' }}</span>
            </button>
          </form>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Aluno</th>
                  <th>Orientador</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Arquivo</th>
                  <th>Alterar status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tcc in filteredTccs" :key="tcc.id">
                  <td>
                    <strong>{{ tcc.titulo }}</strong>
                    <small>{{ tcc.semestre_letivo_defesa || '-' }}</small>
                  </td>
                  <td>{{ labelFor('alunos', tcc.aluno) }}</td>
                  <td>{{ labelFor('professores', tcc.orientador) }}</td>
                  <td>{{ optionLabel(tipoOptions, tcc.tipo, tcc.tipo_display) }}</td>
                  <td><span class="status-pill">{{ statusLabel(tcc.status, tcc.status_display) }}</span></td>
                  <td>
                    <a v-if="tcc.arquivo" class="file-link" :href="resolveFileUrl(tcc.arquivo)" target="_blank" rel="noreferrer">
                      <FileDown :size="16" />
                      Abrir PDF
                    </a>
                    <span v-else>-</span>
                  </td>
                  <td>
                    <div class="status-editor">
                      <select v-model="statusDraft[tcc.id]">
                        <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                      </select>
                      <button class="icon-button compact" type="button" title="Salvar status" @click="saveStatus(tcc)">
                        <CheckCircle2 :size="17" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredTccs.length === 0">
                  <td colspan="7" class="empty-cell">Nenhum TCC encontrado.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="activeListConfig" class="content-stack">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Listagem</p>
              <h2>{{ activeListConfig.title }}</h2>
            </div>
            <label class="search-field">
              <Search :size="18" />
              <input
                v-model="search[activeTab]"
                type="search"
                :placeholder="`Buscar em ${activeListConfig.title.toLowerCase()}...`"
              />
            </label>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="column in activeListConfig.columns" :key="column.key">{{ column.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredList(activeTab)" :key="item.id">
                  <td v-for="column in activeListConfig.columns" :key="column.key">{{ displayCell(item, column) }}</td>
                </tr>
                <tr v-if="filteredList(activeTab).length === 0">
                  <td :colspan="activeListConfig.columns.length" class="empty-cell">Nenhum registro encontrado.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <footer class="site-footer">Feito por Mateus Mendes e Rafael Rezende</footer>
    </main>
  </div>
</template>
