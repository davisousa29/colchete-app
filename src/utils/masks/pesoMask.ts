// ── Peso em kg (e outros valores com 2 casas, como o GMD) ─────────────────────
// Máscara no estilo dinheiro: os dígitos entram pela direita e há sempre 2 casas.
// Digitando 1, 2, 0, 0 → "0,01" → "0,12" → "1,20" → "12,00"
// Pesos grandes ganham ponto de milhar: "1.200,00"

const CASAS_DECIMAIS = 2

/**
 * Formata o texto digitado.
 * @param maxInteiros quantos dígitos a parte inteira aceita (4 = até 9.999,99 kg)
 */
export function formatarPeso(texto: string, maxInteiros = 4): string {
    const digitos = texto
        .replace(/\D/g, '')        // só números
        .replace(/^0+/, '')        // sem zeros à esquerda
        .slice(0, maxInteiros + CASAS_DECIMAIS)

    if (!digitos) return ''

    return (Number(digitos) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: CASAS_DECIMAIS,
        maximumFractionDigits: CASAS_DECIMAIS,
    })
}

/**
 * Converte o texto do campo para número: "1.200,50" → 1200.5
 * Tira os pontos de milhar ANTES de trocar a vírgula — se não, "1.200,50" viraria "1.200.50" (inválido).
 * Vazio ou inválido vira 0.
 */
export function pesoParaNumero(valor: string): number {
    const numero = Number(valor.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(numero) ? numero : 0
}