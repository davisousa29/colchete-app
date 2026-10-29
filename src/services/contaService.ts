import api from './api'

// Troca a senha do usuário logado. A senha atual confirma que é o próprio dono.
export async function alterarSenha(data: {
    senha_atual: string
    password: string
    password_confirmation: string
}): Promise<{ message: string }> {
    const response = await api.put<{ message: string }>('/conta/senha', data)
    return response.data
}

// Exclui a conta do usuário logado. A senha confirma que é o próprio dono.
export async function excluirConta(password: string): Promise<void> {
    await api.delete('/conta', { data: { password } })
}