// ── Usuário ───────────────────────────────────────────────────────────────────
export interface User {
    id: string
    name: string
    email: string
    cpf?: string | null
    data_nascimento?: string | null
    email_verified_at?: string | null
    phone: string | null
    username: string
    whatsapp: string | null
    role: 'consultor' | 'fazendeiro'
    active: boolean
    created_at: string
    updated_at: string
}

// ── Perfil do consultor ───────────────────────────────────────────────────────
export interface ConsultorProfile {
    id: string
    user_id: string
    crea_number: string | null
    specialization: string | null
    bio: string | null
    location_state: string | null
    location_city: string | null
    created_at: string
    updated_at: string
}

export type Profile = ConsultorProfile

// ── Fazenda ───────────────────────────────────────────────────────────────────
export interface Fazenda {
    id: string
    fazendeiro_id: string
    name: string
    area_hectares: string | null
    address: string | null
    inscricao_estadual: string | null
    city: string | null
    state: string | null
    created_at: string
    updated_at: string
}

// ── Fazendeiro público (busca) ────────────────────────────────────────────────
export interface FazendeiroPublico {
    id: string
    name: string
    username: string
    localizacao: {
        cidade: string | null
        estado: string | null
    }
    fazendas: Pick<Fazenda, 'id' | 'name' | 'area_hectares' | 'city' | 'state'>[]
}

// ── Contrato ──────────────────────────────────────────────────────────────────
export interface Contrato {
    id: string
    consultor_id: string
    fazendeiro_id: string
    fazenda_id: string
    status: 'pendente' | 'ativo' | 'encerrado' | 'cancelado'
    start_date: string | null
    end_date: string | null
    value: string | null
    scope_description: string | null
    file_url: string | null
    consultor?: User
    fazendeiro?: User
    fazenda?: Fazenda
    created_at: string
    updated_at: string
}

// ── Autenticação ──────────────────────────────────────────────────────────────
export interface AuthResponse {
    message: string
    user: User
    token: string
}

// ── Resposta paginada ─────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
}