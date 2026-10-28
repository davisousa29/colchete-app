import api from './api'
import { useAuthStore } from '@/src/store/authStore'
import { AuthResponse, User } from '@/src/types'

// A sessão (token, usuário) é gravada só pelo authStore.
// Este arquivo apenas conversa com a API.

// ── Cadastro (2 passos: formulário → código por e-mail) ───────────────────────
export interface CadastroIniciado {
    message: string
    email: string
    segundos_para_reenvio: number
}

// Passo 1: valida o formulário e envia o código. A conta ainda NÃO existe.
export async function register(data: {
    name: string
    email: string
    cpf: string
    data_nascimento: string // AAAA-MM-DD
    phone: string
    username: string
    whatsapp: string
    password: string
    password_confirmation: string
    aceite_termos: boolean
    termos: string[] // ids das versões vigentes lidas
}): Promise<CadastroIniciado> {
    const response = await api.post<CadastroIniciado>('/auth/register', data)
    return response.data
}

// Passo 2: confere o código e cria a conta (já devolve a sessão)
export async function confirmarCadastro(email: string, codigo: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register/confirmar', { email, codigo })
    return response.data
}

export async function reenviarCodigoCadastro(
    email: string
): Promise<{ message: string; segundos_para_reenvio: number }> {
    const response = await api.post<{ message: string; segundos_para_reenvio: number }>(
        '/auth/register/reenviar',
        { email }
    )
    return response.data
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<any> {
    const response = await api.post<any>('/auth/login', { email, password })
    return response.data
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
    try {
        await api.post('/auth/logout')
    } catch {
        // Ignora erro do servidor (ex: token já inválido) — o importante é limpar a sessão local
    } finally {
        await useAuthStore.getState().clearUser()
    }
}

// ── Usuário autenticado ───────────────────────────────────────────────────────
export async function me(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me')
    return response.data.user
}

// ── Recuperação de senha ──────────────────────────────────────────────────────
export async function solicitarCodigoRecuperacao(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/recuperar-senha', { email })
    return response.data
}

export async function redefinirSenha(data: {
    email: string
    codigo: string
    password: string
    password_confirmation: string
}): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/redefinir-senha', data)
    return response.data
}

// ── Login com Google ──────────────────────────────────────────────────────────
export async function loginComGoogle(accessToken: string): Promise<AuthResponse & { cadastro_completo: boolean }> {
    const response = await api.post<AuthResponse & { cadastro_completo: boolean }>('/auth/google', {
        access_token: accessToken,
    })
    return response.data
}