/** Linha mínima de um ingrediente da formulação (serve para a prévia e para a formulação salva). */
interface LinhaConsumo {
    tipo: string
    proporcao_pct: number | string
    consumo_ms_kg: number | string
    consumo_mn_kg: number | string
}

export interface TotalGrupo {
    mnKg: number   // matéria natural (o que é pesado no trato)
    msKg: number   // matéria seca
    pct: number    // participação na MS da dieta
}

/**
 * Soma o consumo diário por grupo (concentrado × volumoso) para o lote.
 * Volumoso = volumoso_principal + volumoso_suplementar.
 * Os valores por ingrediente vêm prontos do backend (por animal); aqui só agrupamos.
 */
export function totaisConcentradoVolumoso(itens: LinhaConsumo[], quantidadeAnimais: number) {
    const vazio = (): TotalGrupo => ({ mnKg: 0, msKg: 0, pct: 0 })
    const totais = { concentrado: vazio(), volumoso: vazio() }

    for (const item of itens) {
        const grupo = item.tipo === 'concentrado' ? totais.concentrado : totais.volumoso
        grupo.mnKg += Number(item.consumo_mn_kg) * quantidadeAnimais
        grupo.msKg += Number(item.consumo_ms_kg) * quantidadeAnimais
        grupo.pct  += Number(item.proporcao_pct)
    }

    return totais
}