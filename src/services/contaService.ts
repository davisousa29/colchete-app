import api from './api'

// Exclui a conta do usuário logado. A senha confirma que é o próprio dono.
export async function excluirConta(password: string): Promise<void> {
    await api.delete('/conta', { data: { password } })
}