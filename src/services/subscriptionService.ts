import api from './api'

// O app só consulta a situação da assinatura: planos e pagamento ficam no site
// (consultor.colcheteapp.com.br).

export interface SubscriptionStatus {
    status: 'trial' | 'active' | 'expired' | 'canceled' | 'lifetime' | 'none'
    is_active: boolean
    is_lifetime?: boolean
    plan: string | null
    expires_at: string | null
    days_remaining: number
    is_subscriber?: boolean
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const response = await api.get<SubscriptionStatus>('/subscription/status')
    return response.data
}
