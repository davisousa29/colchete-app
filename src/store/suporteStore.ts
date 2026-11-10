import { create } from 'zustand'
import { buscarContatoSuporte, ContatoSuporte } from '@/src/services/suporteService'

interface SuporteState {
    contato: ContatoSuporte | null
    carregar: () => Promise<void>
}

/**
 * Contato do suporte, buscado uma vez por uso do app.
 * Se a busca falhar, o contato fica null e o botão simplesmente não aparece:
 * o suporte nunca pode quebrar uma tela.
 */
export const useSuporteStore = create<SuporteState>((set, get) => ({
    contato: null,

    carregar: async () => {
        if (get().contato) return // já carregado: não busca de novo

        try {
            set({ contato: await buscarContatoSuporte() })
        } catch {
            // sem internet ou API fora do ar: segue sem o botão
        }
    },
}))