import { StyleSheet, Text, TextStyle, View } from 'react-native'
import { Colors, FontSize, Spacing } from '@/src/constants'

/**
 * Renderiza o Markdown dos termos sem depender de biblioteca externa.
 * Suporta só o necessário para textos jurídicos:
 *   ## Seção           → título de seção   (# também vira título de seção)
 *   ### Subseção       → subtítulo
 *   - item  ou  * item → item de lista
 *   **negrito**        → negrito dentro do texto
 *   linha em branco    → separa parágrafos
 * Os arquivos .md dos termos devem se limitar a esses recursos.
 */

type Bloco = { tipo: 'secao' | 'subsecao' | 'paragrafo' | 'item'; texto: string }

function parsear(markdown: string): Bloco[] {
    const blocos: Bloco[] = []
    let paragrafo: string[] = []

    const fecharParagrafo = () => {
        if (paragrafo.length > 0) {
            blocos.push({ tipo: 'paragrafo', texto: paragrafo.join(' ') })
            paragrafo = []
        }
    }

    for (const linhaBruta of markdown.split('\n')) {
        const linha = linhaBruta.trim()

        if (linha === '') {
            fecharParagrafo()
        } else if (/^#{3,}\s/.test(linha)) {
            fecharParagrafo()
            blocos.push({ tipo: 'subsecao', texto: linha.replace(/^#+\s+/, '') })
        } else if (/^#{1,2}\s/.test(linha)) {
            fecharParagrafo()
            blocos.push({ tipo: 'secao', texto: linha.replace(/^#+\s+/, '') })
        } else if (/^[-*]\s/.test(linha)) {
            fecharParagrafo()
            blocos.push({ tipo: 'item', texto: linha.slice(2).trim() })
        } else {
            paragrafo.push(linha)
        }
    }

    fecharParagrafo()
    return blocos
}

// Texto com trechos **em negrito**
function TextoComNegrito({ texto, style }: { texto: string; style: TextStyle }) {
    const partes = texto.split(/(\*\*[^*]+\*\*)/g)

    return (
        <Text style={style}>
            {partes.map((parte, i) =>
                parte.startsWith('**') && parte.endsWith('**') ? (
                    <Text key={i} style={styles.negrito}>{parte.slice(2, -2)}</Text>
                ) : (
                    parte
                )
            )}
        </Text>
    )
}

export default function MarkdownSimples({ conteudo }: { conteudo: string }) {
    return (
        <View style={styles.container}>
            {parsear(conteudo).map((bloco, i) => {
                switch (bloco.tipo) {
                    case 'secao':
                        return <TextoComNegrito key={i} texto={bloco.texto} style={styles.secao} />
                    case 'subsecao':
                        return <TextoComNegrito key={i} texto={bloco.texto} style={styles.subsecao} />
                    case 'item':
                        return (
                            <View key={i} style={styles.item}>
                                <Text style={styles.marcador}>•</Text>
                                <TextoComNegrito texto={bloco.texto} style={styles.itemTexto} />
                            </View>
                        )
                    default:
                        return <TextoComNegrito key={i} texto={bloco.texto} style={styles.paragrafo} />
                }
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    secao: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.black,
        marginTop: Spacing.md,
    },
    subsecao: {
        fontSize: FontSize.md,
        fontWeight: 'bold',
        color: Colors.gray[700],
        marginTop: Spacing.sm,
    },
    paragrafo: {
        fontSize: FontSize.md,
        color: Colors.gray[700],
        lineHeight: 22,
    },
    item: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingLeft: Spacing.sm,
    },
    marcador: {
        fontSize: FontSize.md,
        color: Colors.gray[700],
        lineHeight: 22,
    },
    itemTexto: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.gray[700],
        lineHeight: 22,
    },
    negrito: {
        fontWeight: 'bold',
    },
})