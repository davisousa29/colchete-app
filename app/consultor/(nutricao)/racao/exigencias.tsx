import { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackButton from '@/src/components/Header/BackButton'
import CentralModal from '@/src/components/Modal/CentralModal'
import api from '@/src/services/api'
import { formatarNumero } from '@/src/utils/numbers'

interface Exigencias {
    ELm_mcal_dia: number
    ELg_mcal_dia: number
    EL_total_mcal: number
    CMS_kg_dia: number
    NDT_kg_dia: number
    PB_g_dia: number
    PDR_g_dia: number
    Ca_g_dia: number
    P_g_dia: number
}

interface ItemExigencia {
    label: string
    valor: string
    unidade: string
    descricao: string
}

export default function RacaoStep2() {
    const params = useLocalSearchParams<{
        especie_id: string
        raca_id: string
        categoria_id: string
        sistema_id: string
        peso_inicial: string
        peso_final: string
        gmd: string
        quantidade: string
        tipo_aplicacao: string
        especie_nome: string
        raca_nome: string
        categoria_nome: string
        sistema_nome: string
    }>()

    const [loading, setLoading] = useState(true)
    const [exigencias, setExigencias] = useState<Exigencias | null>(null)
    const [modal, setModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'default' as 'default' | 'success' | 'error',
        onClose: undefined as (() => void) | undefined,
    })

    useEffect(() => {
        calcularExigencias()
    }, [])

    async function calcularExigencias() {
        try {
            const response = await api.post('/racao/exigencias', {
                especie_id:   params.especie_id,
                raca_id:      params.raca_id,
                categoria_id: params.categoria_id,
                sistema_id:   params.sistema_id,
                peso_inicial: Number(params.peso_inicial),
                peso_final:   Number(params.peso_final),
                gmd:          Number(params.gmd),
            })
            setExigencias(response.data.exigencias)
        } catch (error: any) {
            setModal({
                visible: true,
                title: 'Erro',
                message: error.response?.data?.message || 'Não foi possível calcular as exigências.',
                type: 'error',
                onClose: () => router.back(),
            })
        } finally {
            setLoading(false)
        }
    }

    function handleProximo() {
        if (!exigencias) return

        router.push({
            pathname: '/consultor/racao/ingredientes',
            params: {
                ...params,
                exig_cms_kg:   String(exigencias.CMS_kg_dia),
                exig_ndt_kg:   String(exigencias.NDT_kg_dia),
                exig_pb_g:     String(exigencias.PB_g_dia),
                exig_elm_mcal: String(exigencias.ELm_mcal_dia),
                exig_elg_mcal: String(exigencias.ELg_mcal_dia),
                exig_ca_g:     String(exigencias.Ca_g_dia),
                exig_p_g:      String(exigencias.P_g_dia),
            }
        } as any)
    }

    const pesoMedio = (Number(params.peso_inicial) + Number(params.peso_final)) / 2

    const itensExigencias: ItemExigencia[] = exigencias ? [
        { label: 'Consumo de Matéria Seca', valor: formatarNumero(exigencias.CMS_kg_dia, 3), unidade: 'kg/dia', descricao: 'Quanto o animal precisa ingerir de matéria seca por dia' },
        { label: 'NDT', valor: formatarNumero(exigencias.NDT_kg_dia, 3), unidade: 'kg/dia', descricao: 'Nutrientes Digestíveis Totais — energia disponível' },
        { label: 'Energia Líquida Mantença', valor: formatarNumero(exigencias.ELm_mcal_dia, 3), unidade: 'Mcal/dia', descricao: 'Energia para manter o peso atual do animal' },
        { label: 'Energia Líquida Ganho', valor: formatarNumero(exigencias.ELg_mcal_dia, 3), unidade: 'Mcal/dia', descricao: 'Energia para ganho de peso' },
        { label: 'Proteína Bruta', valor: formatarNumero(exigencias.PB_g_dia, 1), unidade: 'g/dia', descricao: 'Total de proteína necessária por dia' },
        { label: 'Proteína Degradável no Rúmen', valor: formatarNumero(exigencias.PDR_g_dia, 1), unidade: 'g/dia', descricao: 'Fração da proteína que é degradada no rúmen' },
        { label: 'Cálcio', valor: formatarNumero(exigencias.Ca_g_dia, 2), unidade: 'g/dia', descricao: 'Exigência diária de cálcio' },
        { label: 'Fósforo', valor: formatarNumero(exigencias.P_g_dia, 2), unidade: 'g/dia', descricao: 'Exigência diária de fósforo' },
    ] : []

    return (
        <View style={globalStyles.screen}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <BackButton />

                {/* Indicador de passo */}
                <View style={styles.stepIndicator}>
                    <View style={styles.stepConcluido}><Text style={styles.stepNumeroConcluido}>✓</Text></View>
                    <View style={[styles.stepLinha, styles.stepLinhaAtiva]} />
                    <View style={styles.stepAtivo}><Text style={styles.stepNumeroAtivo}>2</Text></View>
                    <View style={styles.stepLinha} />
                    <View style={styles.stepInativo}><Text style={styles.stepNumeroInativo}>3</Text></View>
                    <View style={styles.stepLinha} />
                    <View style={styles.stepInativo}><Text style={styles.stepNumeroInativo}>4</Text></View>
                </View>

                <View style={styles.header}>
                    <Text style={globalStyles.pageTitle}>Exigências Nutricionais</Text>
                    <Text style={globalStyles.pageSubtitle}>Passo 2 de 4 — Calculadas pelo BR-CORTE 2016</Text>
                </View>

                {/* Resumo do animal */}
                <View style={styles.resumoCard}>
                    <Text style={styles.resumoTitulo}>Resumo do animal</Text>
                    <View style={styles.resumoGrid}>
                        <View style={styles.resumoItem}>
                            <Text style={styles.resumoLabel}>Espécie</Text>
                            <Text style={styles.resumoValor}>{params.especie_nome}</Text>
                        </View>
                        <View style={styles.resumoItem}>
                            <Text style={styles.resumoLabel}>Raça</Text>
                            <Text style={styles.resumoValor}>{params.raca_nome}</Text>
                        </View>
                        <View style={styles.resumoItem}>
                            <Text style={styles.resumoLabel}>Categoria</Text>
                            <Text style={styles.resumoValor}>{params.categoria_nome}</Text>
                        </View>
                        <View style={styles.resumoItem}>
                            <Text style={styles.resumoLabel}>Sistema</Text>
                            <Text style={styles.resumoValor}>{params.sistema_nome}</Text>
                        </View>
                        <View style={styles.resumoItem}>
                            <Text style={styles.resumoLabel}>Peso médio</Text>
                            <Text style={styles.resumoValor}>{formatarNumero(pesoMedio, 1)} kg</Text>
                        </View>
                        <View style={styles.resumoItem}>
                            <Text style={styles.resumoLabel}>GMD desejado</Text>
                            <Text style={styles.resumoValor}>{params.gmd} kg/dia</Text>
                        </View>
                    </View>
                </View>

                {/* Exigências calculadas */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingTexto}>Calculando exigências...</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.secaoTitulo}>Exigências calculadas</Text>
                        <View style={styles.exigenciasLista}>
                            {itensExigencias.map((item, index) => (
                                <View key={index} style={styles.exigenciaCard}>
                                    <View style={styles.exigenciaHeader}>
                                        <Text style={styles.exigenciaLabel}>{item.label}</Text>
                                        <View style={styles.exigenciaValorContainer}>
                                            <Text style={styles.exigenciaValor}>{item.valor}</Text>
                                            <Text style={styles.exigenciaUnidade}>{item.unidade}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.exigenciaDescricao}>{item.descricao}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[globalStyles.buttonPrimary, { marginTop: Spacing.lg }]}
                            onPress={handleProximo}
                            activeOpacity={0.8}
                        >
                            <Text style={globalStyles.buttonPrimaryText}>Próximo →</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <CentralModal
                visible={modal.visible}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={() => {
                    const fn = modal.onClose
                    setModal({ ...modal, visible: false, onClose: undefined })
                    fn?.()
                }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    stepAtivo: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    stepConcluido: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.success,
        justifyContent: 'center', alignItems: 'center',
    },
    stepInativo: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.gray[200],
        justifyContent: 'center', alignItems: 'center',
    },
    stepNumeroAtivo: {
        color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm,
    },
    stepNumeroConcluido: {
        color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm,
    },
    stepNumeroInativo: {
        color: Colors.gray[500], fontWeight: 'bold', fontSize: FontSize.sm,
    },
    stepLinha: {
        flex: 1, height: 2, backgroundColor: Colors.gray[200],
    },
    stepLinhaAtiva: {
        backgroundColor: Colors.success,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    resumoCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    resumoTitulo: {
        fontSize: FontSize.md,
        fontWeight: 'bold',
        color: Colors.black,
        marginBottom: Spacing.md,
    },
    resumoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    resumoItem: {
        width: '47%',
    },
    resumoLabel: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
        marginBottom: 2,
    },
    resumoValor: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.black,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.md,
    },
    loadingTexto: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
    },
    secaoTitulo: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.black,
        marginBottom: Spacing.md,
    },
    exigenciasLista: {
        gap: Spacing.sm,
    },
    exigenciaCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    exigenciaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    exigenciaLabel: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.black,
        flex: 1,
    },
    exigenciaValorContainer: {
        alignItems: 'flex-end',
    },
    exigenciaValor: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    exigenciaUnidade: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
    },
    exigenciaDescricao: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
        lineHeight: 16,
    },
})