import api from './api'

export interface ContatoSuporte {
    whatsapp: string | null
    email: string | null
    mensagem: string | null
}

/** Contatos do suporte (rota pública do backend). */
export async function buscarContatoSuporte(): Promise<ContatoSuporte> {
    const response = await api.get<ContatoSuporte>('/suporte')
    return response.data
}