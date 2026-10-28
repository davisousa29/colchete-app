import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { useAuthStore } from '@/src/store/authStore'
import { useTermosStore } from '@/src/store/termosStore'

/**
 * Endereço da API, nesta ordem:
 * 1. EXPO_PUBLIC_API_URL, quando definida (produção, ou para forçar um endereço em dev);
 * 2. em desenvolvimento, o IP do computador que roda o `npx expo start`, na porta 80 —
 *    a URL acompanha a rede sem editar código;
 * 3. sem nenhum dos dois, falha ao abrir, em vez de chamar um endereço errado.
 */
function resolveApiUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL
    if (fromEnv) {
        return fromEnv.replace(/\/$/, '') // sem barra no final
    }

    if (__DEV__) {
        // hostUri = "192.168.1.51:8081" → só o IP
        const host = Constants.expoConfig?.hostUri?.split(':')[0]
        if (host) {
            return `http://${host}/api`
        }
    }

    throw new Error('EXPO_PUBLIC_API_URL não está definida para este build.')
}

const baseURL = resolveApiUrl()

if (__DEV__) {
    console.log(`[api] ${baseURL}`)
}

const api = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
})

// Marca a requisição que já foi repetida uma vez após renovar o token
type RequestComRetry = InternalAxiosRequestConfig & { _retry?: boolean }

// ── Renovação do token ────────────────────────────────────────────────────────

/** A API recusou a renovação: a sessão acabou de verdade e é preciso fazer login. */
class SessaoExpiradaError extends Error {}

// Renovação em andamento, compartilhada: se 5 requisições derem 401 juntas,
// só uma chama /auth/refresh e as outras esperam o mesmo resultado.
let renovacaoEmAndamento: Promise<string> | null = null

function renovarToken(tokenVencido: string): Promise<string> {
    if (!renovacaoEmAndamento) {
        renovacaoEmAndamento = axios
            // axios "puro", sem os interceptors desta instância (evita laço de 401)
            .post(`${baseURL}/auth/refresh`, null, {
                timeout: 10000,
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${tokenVencido}`,
                },
            })
            .then(async (response) => {
                const { user, token } = response.data
                await useAuthStore.getState().setUser(user, token)
                return token as string
            })
            .catch((error: AxiosError) => {
                // 401 = fora da janela, já renovado ou conta desativada → login.
                // Sem resposta (sem internet, timeout) NÃO derruba a sessão:
                // a requisição falha agora e a próxima tenta renovar de novo.
                if (error.response?.status === 401) {
                    throw new SessaoExpiradaError()
                }
                throw error
            })
            .finally(() => {
                renovacaoEmAndamento = null
            })
    }

    return renovacaoEmAndamento
}

// ── Interceptor de requisição — adiciona o token automaticamente ──────────────
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Interceptor de resposta — trata erros globalmente ────────────────────────
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<any>) => {
        const { router } = require('expo-router')
        const original = error.config as RequestComRetry | undefined
        const status = error.response?.status

        // Assinatura expirada — redireciona para a tela de bloqueio
        if (status === 402 && error.response?.data?.subscription === 'inactive') {
            router.replace('/assinatura/expirada')
            return Promise.reject(error)
        }

        // Termos atualizados ainda não aceitos — o TermosPendentesGate abre o modal de aceite
        if (status === 403 && error.response?.data?.code === 'termos_pendentes') {
            useTermosStore.getState().marcarPendente()
            return Promise.reject(error)
        }

        // Token vencido — renova uma vez e repete a requisição.
        // Só vale para requisições que foram COM token (login com senha errada
        // também é 401, mas vai sem token e não deve disparar renovação).
        const enviouToken = typeof original?.headers?.Authorization === 'string'

        if (status === 401 && original && enviouToken && !original._retry) {
            original._retry = true

            const tokenUsado = String(original.headers.Authorization).replace('Bearer ', '')
            const tokenAtual = useAuthStore.getState().token

            try {
                // Se outra requisição já renovou enquanto esta estava a caminho,
                // basta repetir com o token atual — sem nova renovação
                const novoToken = tokenAtual && tokenAtual !== tokenUsado
                    ? tokenAtual
                    : await renovarToken(tokenUsado)

                original.headers.Authorization = `Bearer ${novoToken}`
                return api(original)
            } catch (refreshError) {
                if (refreshError instanceof SessaoExpiradaError) {
                    await useAuthStore.getState().clearUser()
                    router.replace('/auth/login')
                }
                return Promise.reject(error)
            }
        }

        return Promise.reject(error)
    }
)

export default api