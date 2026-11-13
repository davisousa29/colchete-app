import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { formatarNumero } from '@/src/utils/numbers'
import { totaisConcentradoVolumoso, TotalGrupo } from '@/src/utils/formulacao'

interface Props {
    itens: Parameters<typeof totaisConcentradoVolumoso>[0]
    quantidadeAnimais: number
}

/** Seção "Concentrado × volumoso": kg/dia por grupo no lote e a relação V:C. */
export default function ResumoConcentradoVolumoso({ itens, quantidadeAnimais }: Props) {
    const { concentrado, volumoso } = totaisConcentradoVolumoso(itens, quantidadeAnimais)
    const porLote = quantidadeAnimais > 1

    return (
        <View style={styles.secao}>
            <Text style={styles.titulo}>Concentrado × volumoso</Text>
            <Text style={styles.subtitulo}>
                {porLote ? `Por dia no lote (${quantidadeAnimais} animais)` : 'Por dia, por animal'}
            </Text>

            <View style={styles.card}>
                <Linha nome="Concentrado" total={concentrado} />
                <View style={styles.divisor} />
                <Linha nome="Volumoso" total={volumoso} />
                <View style={styles.divisor} />
                <View style={styles.linha}>
                    <Text style={styles.relacaoLabel}>Relação volumoso : concentrado</Text>
                    <Text style={styles.relacaoValor}>
                        {formatarNumero(volumoso.pct, 0)} : {formatarNumero(concentrado.pct, 0)}
                    </Text>
                </View>
            </View>
        </View>
    )
}

function Linha({ nome, total }: { nome: string; total: TotalGrupo }) {
    return (
        <View style={styles.linha}>
            <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{nome}</Text>
                <Text style={styles.detalhe}>
                    {formatarNumero(total.msKg, 1)} kg MS · {formatarNumero(total.pct, 1)}% da dieta (MS)
                </Text>
            </View>
            <Text style={styles.valor}>{formatarNumero(total.mnKg, 1)} kg</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    secao: { marginBottom: Spacing.xl },
    titulo: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black, marginBottom: Spacing.xs },
    subtitulo: { fontSize: FontSize.sm, color: Colors.gray[500], marginBottom: Spacing.md },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    nome: { fontSize: FontSize.md, fontWeight: '600', color: Colors.black },
    detalhe: { fontSize: FontSize.xs, color: Colors.gray[500], marginTop: 2 },
    valor: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary },
    relacaoLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.gray[600] },
    relacaoValor: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.black },
    divisor: { height: 1, backgroundColor: Colors.gray[200], marginVertical: Spacing.sm },
})