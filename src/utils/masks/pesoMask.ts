// ── Peso em kg ────────────────────────────────────────────────────────────────
// Não é uma máscara de posições fixas (como CPF ou data): o peso tem tamanho
// variável, então a formatação é feita por função a cada tecla digitada.

const MAX_DIGITOS_INTEIROS = 4 // até 9999 kg
const MAX_CASAS_DECIMAIS = 2

/**
 * Formata o texto digitado num campo de peso.
 * - aceita vírgula ou ponto como separador decimal (o teclado do Android pode mostrar ponto)
 *   e sempre exibe vírgula: "300.5" → "300,5"
 * - descarta letras e símbolos
 * - limita a 4 dígitos inteiros e 2 casas decimais
 * - remove zeros à esquerda: "0300" → "300" (mas mantém "0,5")
 */
export function formatarPeso(texto: string): string {
    const limpo = texto.replace(/\./g, ',').replace(/[^\d,]/g, '')
    const [inteiro = '', ...resto] = limpo.split(',')

    const inteiroLimpo = inteiro.replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITOS_INTEIROS)

    // Sem vírgula digitada: só a parte inteira
    if (resto.length === 0) {
        return inteiroLimpo
    }

    const decimais = resto.join('').slice(0, MAX_CASAS_DECIMAIS)
    return `${inteiroLimpo || '0'},${decimais}`
}

/** Converte o texto do campo ("300,5") para número (300.5). Vazio ou inválido vira 0. */
export function pesoParaNumero(valor: string): number {
    const numero = Number(valor.replace(',', '.'))
    return Number.isFinite(numero) ? numero : 0
}