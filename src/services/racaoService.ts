import api from './api'

export type TipoIngredienteDieta = 'volumoso_principal' | 'volumoso_suplementar' | 'concentrado'

export interface IngredienteFormulacao {
    ingrediente_id: string
    tipo: TipoIngredienteDieta | string
    proporcao_pct: number
    preco_kg_local: number | null
}

/** Uma linha da formulação já calculada pelo backend (mesmos campos que ficam gravados). */
export interface LinhaCalculada {
    ingrediente_id: string
    nome: string
    ms_pct: number
    tipo: string
    proporcao_pct: number
    preco_kg_local: number
    consumo_ms_kg: number
    consumo_mn_kg: number
    contrib_ndt_kg: number
    contrib_pb_g: number
    contrib_pdr_g: number
    contrib_elm_mcal: number
    contrib_elg_mcal: number
    contrib_ca_g: number
    contrib_p_g: number
    custo_animal_dia: number
}

export interface CalculoFormulacao {
    itens: LinhaCalculada[]
    totais: Omit<LinhaCalculada, 'ingrediente_id' | 'nome' | 'ms_pct' | 'tipo' | 'preco_kg_local'>
}

/**
 * Calcula a formulação no backend SEM salvar — a mesma conta usada ao salvar,
 * então a tela final mostra exatamente o que vai ficar gravado.
 */
export async function calcularFormulacao(
    exigCmsKg: number,
    ingredientes: IngredienteFormulacao[],
): Promise<CalculoFormulacao> {
    const response = await api.post<CalculoFormulacao>('/racao/calcular', {
        exig_cms_kg: exigCmsKg,
        ingredientes,
    })
    return response.data
}
