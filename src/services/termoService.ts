import api from './api'

export type TipoTermo = 'uso' | 'privacidade'

export interface Termo {
    id: string
    tipo: TipoTermo
    titulo: string
    versao: number
    conteudo: string // Markdown
    resumo_alteracoes: string | null
    publicado_em: string
}

// Versões vigentes (público — usado no cadastro)
export async function getTermosVigentes(): Promise<Termo[]> {
    const response = await api.get<{ termos: Termo[] }>('/termos')
    return response.data.termos
}

// O que o usuário logado ainda precisa aceitar (vazio = em dia)
export async function getTermosPendentes(): Promise<Termo[]> {
    const response = await api.get<{ termos: Termo[] }>('/termos/pendentes')
    return response.data.termos
}

// Registra o aceite das versões vigentes (envie os ids de todas)
export async function aceitarTermos(ids: string[]): Promise<void> {
    await api.post('/termos/aceitar', { termos: ids })
}