export const IDADE_MINIMA_CADASTRO = 18

/**
 * Converte os dígitos do campo com máscara DD/MM/AAAA para o formato da API.
 * "20051990" → "1990-05-20". Retorna null se faltar dígito ou se a data não existir
 * (ex.: 31/02/1990) ou for anterior a 1900.
 */
export function digitosParaDataIso(digitos: string): string | null {
    if (!/^\d{8}$/.test(digitos)) return null

    const dia = Number(digitos.slice(0, 2))
    const mes = Number(digitos.slice(2, 4))
    const ano = Number(digitos.slice(4, 8))

    // O Date "corrige" datas impossíveis (31/02 vira 03/03); se mudou, a data não existe
    const data = new Date(Date.UTC(ano, mes - 1, dia))
    const existe =
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia

    if (!existe || ano < 1900) return null

    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Idade completa, em anos, de quem nasceu na data ISO "AAAA-MM-DD". */
export function calcularIdade(dataIso: string, hoje: Date = new Date()): number {
    const [ano, mes, dia] = dataIso.split('-').map(Number)

    let idade = hoje.getFullYear() - ano
    const mesAtual = hoje.getMonth() + 1
    const aindaNaoFezAniversario = mesAtual < mes || (mesAtual === mes && hoje.getDate() < dia)

    if (aindaNaoFezAniversario) idade--
    return idade
}

/** "2026-10-28T03:58:48Z" ou "2026-10-28" → "28/10/2026" */
export function formatarDataBr(iso: string | null | undefined): string {
    if (!iso) return ''
    const [ano, mes, dia] = iso.substring(0, 10).split('-')
    return `${dia}/${mes}/${ano}`
}