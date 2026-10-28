import { create } from 'zustand'

// Sinal global "a API pediu aceite de termos".
// Quem liga é o interceptor do axios (resposta 403 termos_pendentes);
// quem lê e resolve é o TermosPendentesGate, no layout raiz.
// Não importa a api nem os services, para não criar dependência circular com o api.ts.

interface TermosState {
    pendente: boolean
    marcarPendente: () => void
    resolver: () => void
}

export const useTermosStore = create<TermosState>((set) => ({
    pendente: false,
    marcarPendente: () => set({ pendente: true }),
    resolver: () => set({ pendente: false }),
}))