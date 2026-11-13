import { useCallback, useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackButton from '@/src/components/Header/BackButton'
import CentralModal from '@/src/components/Modal/CentralModal'
import api from '@/src/services/api'
import { calcularFormulacao, CalculoFormulacao } from '@/src/services/racaoService'
import { formatarNumero } from '@/src/utils/numbers'
import { currencyMask } from '@/src/utils/masks/currencyMask'
import { Icons } from '@/src/constants/icons'

interface IngredienteParam {
    ingrediente_id: string
    nome: string
    tipo: string
    proporcao_pct: number
    preco_kg_local: number
}

function BalancoItem({
                         label,
                         fornecido,
                         exigido,
                         unidade,
                     }: {
    label: string
    fornecido: number
    exigido: number
    unidade: string
}) {
    const pct = exigido > 0 ? (fornecido / exigido) * 100 : 0
    const status = pct >= 95 && pct <= 115 ? 'ok' : pct < 95 ? 'baixo' : 'alto'
    const cor = status === 'ok' ? Colors.success : status === 'baixo' ? Colors.error : Colors.warning

    return (
        <View style={styles.balancoItem}>
            <View style={styles.balancoHeader}>
                <Text style={styles.balancoLabel}>{label}</Text>
                <View style={[styles.balancoBadge, { backgroundColor: cor + '20' }]}>
                    <Text style={[styles.balancoBadgeText, { color: cor }]}>
                        {status === 'ok' ? '✓ Atendido' : status === 'baixo' ? '↓ Abaixo' : '↑ Acima'}
                    </Text>
                </View>
            </View>
            <View style={styles.balancoBar}>
                <View style={[styles.balancoFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: cor }]} />
            </View>
            <View style={styles.balancoValores}>
                <Text style={styles.balancoFornecido}>{formatarNumero(fornecido, 2)} {unidade}</Text>
                <Text style={styles.balancoExigido}>/ {formatarNumero(exigido, 2)} {unidade}</Text>
            </View>
        </View>
    )
}

export default function RacaoStep4() {
    const params = useLocalSearchParams<any>()
    const [salvando, setSalvando] = useState(false)
    const [contratosAtivos, setContratosAtivos] = useState<any[]>([])
    const [mostrarContratos, setMostrarContratos] = useState(false)
    const [loadingContratos, setLoadingContratos] = useState(false)
    const [modal, setModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'default' as 'default' | 'success' | 'error',
        onClose: undefined as (() => void) | undefined,
    })

    const ingredientes: IngredienteParam[] = JSON.parse(params.ingredientes ?? '[]')

    const exig = {
        cms:  Number(params.exig_cms_kg),
        ndt:  Number(params.exig_ndt_kg),
        elm:  Number(params.exig_elm_mcal),
        elg:  Number(params.exig_elg_mcal),
        pb:   Number(params.exig_pb_g),
        ca:   Number(params.exig_ca_g),
        p:    Number(params.exig_p_g),
    }

    const quantidade = Number(params.quantidade ?? 1)
    const nomeSugerido = `Formulação ${params.especie_nome} - ${params.raca_nome}`
    const [nome, setNome] = useState(nomeSugerido)

    const [calculo, setCalculo] = useState<CalculoFormulacao | null>(null)
    const [carregandoCalculo, setCarregandoCalculo] = useState(true)
    const [erroCalculo, setErroCalculo] = useState<string | null>(null)

    const carregarCalculo = useCallback(async () => {
        setCarregandoCalculo(true)
        setErroCalculo(null)
        try {
            setCalculo(await calcularFormulacao(exig.cms, ingredientes.map(ing => ({
                ingrediente_id: ing.ingrediente_id,
                tipo:           ing.tipo,
                proporcao_pct:  ing.proporcao_pct,
                preco_kg_local: ing.preco_kg_local,
            }))))
        } catch (error: any) {
            setErroCalculo(error.response?.data?.message || 'Não foi possível calcular a formulação.')
        } finally {
            setCarregandoCalculo(false)
        }
        // Os parâmetros da rota não mudam enquanto a tela está aberta
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.ingredientes, params.exig_cms_kg])

    useEffect(() => {
        carregarCalculo()
    }, [carregarCalculo])

    const custoAnimalDia = calculo?.totais.custo_animal_dia ?? 0
    const custoLoteDia = custoAnimalDia * quantidade

    async function buscarContratosAtivos() {
        setLoadingContratos(true)
        try {
            const response = await api.get('/contratos')
            const ativos = response.data.contratos.filter((c: any) => c.status === 'ativo')
            setContratosAtivos(ativos)
            setMostrarContratos(true)
        } catch {
            setModal({
                visible: true,
                title: 'Erro',
                message: 'Não foi possível carregar os contratos.',
                type: 'error',
                onClose: undefined,
            })
        } finally {
            setLoadingContratos(false)
        }
    }

    async function handleSalvar(contratoId?: string) {
        setSalvando(true)
        try {
            const programaRes = await api.post('/racao/programas', {
                contrato_id:        contratoId ?? null,
                nome:               nome.trim() || nomeSugerido,
                especie_id:         params.especie_id,
                raca_id:            params.raca_id,
                categoria_id:       params.categoria_id,
                sistema_id:         params.sistema_id,
                peso_inicial_kg:    Number(params.peso_inicial),
                peso_final_kg:      Number(params.peso_final),
                gmd_kg:             Number(params.gmd),
                quantidade_animais: quantidade,
                tipo_aplicacao:     params.tipo_aplicacao,
                exig_cms_kg:        exig.cms,
                exig_ndt_kg:        exig.ndt,
                exig_elm_mcal:      exig.elm,
                exig_elg_mcal:      exig.elg,
                exig_pb_g:          exig.pb,
                exig_ca_g:          exig.ca,
                exig_p_g:           exig.p,
            })

            const programaId = programaRes.data.programa.id

            await api.post(`/racao/programas/${programaId}/ingredientes`, {
                ingredientes: ingredientes.map(ing => ({
                    ingrediente_id: ing.ingrediente_id,
                    tipo:           ing.tipo,
                    proporcao_pct:  ing.proporcao_pct,
                    preco_kg_local: ing.preco_kg_local,
                })),
            })

            setModal({
                visible: true,
                title: 'Salvo com sucesso!',
                message: contratoId
                    ? 'A formulação foi salva e vinculada ao contrato.'
                    : 'O programa de ração foi salvo.',
                type: 'success',
                onClose: () => router.replace('/consultor/home'),
            })
        } catch (error: any) {
            setModal({
                visible: true,
                title: 'Erro',
                message: error.response?.data?.message || 'Erro ao salvar o programa.',
                type: 'error',
                onClose: undefined,
            })
        } finally {
            setSalvando(false)
        }
    }

    return (
        <View style={globalStyles.screen}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <BackButton />

                {/* Indicador de passo */}
                <View style={styles.stepIndicator}>
                    {[1, 2, 3, 4].map((step, index) => (
                        <View key={step} style={{ flexDirection: 'row', alignItems: 'center', flex: index < 3 ? 1 : 0 }}>
                            <View style={step < 4 ? styles.stepConcluido : styles.stepAtivo}>
                                <Text style={step < 4 ? styles.stepNumeroConcluido : styles.stepNumeroAtivo}>
                                    {step < 4 ? '✓' : '4'}
                                </Text>
                            </View>
                            {index < 3 && <View style={[styles.stepLinha, styles.stepLinhaAtiva]} />}
                        </View>
                    ))}
                </View>

                <View style={styles.header}>
                    <Text style={globalStyles.pageTitle}>Resultado</Text>
                    <Text style={globalStyles.pageSubtitle}>Passo 4 de 4 — Balanço nutricional da formulação</Text>
                </View>

                <View style={[globalStyles.inputGroup, styles.secao]}>
                    <Text style={globalStyles.inputLabel}>Nome da formulação</Text>
                    <TextInput
                        style={globalStyles.input}
                        value={nome}
                        onChangeText={setNome}
                        placeholder={nomeSugerido}
                        placeholderTextColor={Colors.gray[400]}
                        maxLength={100}
                        returnKeyType="done"
                    />
                    <Text style={globalStyles.inputHint}>
                        Ajuda a encontrar esta formulação em "Minhas formulações"
                    </Text>
                </View>

                {carregandoCalculo ? (
                    <View style={styles.estadoCalculo}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.estadoCalculoTexto}>Calculando a formulação...</Text>
                    </View>
                ) : erroCalculo || !calculo ? (
                    <View style={[styles.card, styles.estadoCalculo]}>
                        <Text style={styles.estadoCalculoTexto}>{erroCalculo}</Text>
                        <TouchableOpacity
                            style={[globalStyles.buttonSecondary, { alignSelf: 'stretch' }]}
                            onPress={carregarCalculo}
                            activeOpacity={0.8}
                        >
                            <Text style={globalStyles.buttonSecondaryText}>Tentar de novo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Resumo do lote */}
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Resumo</Text>
                            <View style={styles.resumoGrid}>
                                <View style={styles.resumoCard}>
                                    <Icons.pawPrint size={25} color={Colors.primary} />
                                    <Text style={styles.resumoValor}>{quantidade}</Text>
                                    <Text style={styles.resumoLabel}>anim{quantidade > 1 ? 'ais' : 'al'}</Text>
                                </View>
                                <View style={styles.resumoCard}>
                                    <Icons.scale size={25} color={Colors.primary} />
                                    <Text style={styles.resumoValor}>{formatarNumero(exig.cms, 2)}</Text>
                                    <Text style={styles.resumoLabel}>kg MS/animal/dia</Text>
                                </View>
                                <View style={styles.resumoCard}>
                                    <Icons.dolar size={25} color={Colors.primary} />
                                    <Text style={styles.resumoValor}>R$ {currencyMask(String(Math.round(custoAnimalDia * 100)))}</Text>
                                    <Text style={styles.resumoLabel}>custo/animal/dia</Text>
                                </View>
                                <View style={styles.resumoCard}>
                                    <Icons.handCoins size={25} color={Colors.primary} />
                                    <Text style={styles.resumoValor}>R$ {currencyMask(String(Math.round(custoLoteDia * 100)))}</Text>
                                    <Text style={styles.resumoLabel}>custo total/dia</Text>
                                </View>
                            </View>
                        </View>

                        {/* Composição da dieta */}
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Composição da dieta</Text>
                            <View style={styles.card}>
                                {calculo.itens.map((ing, index) => (
                                    <View key={ing.ingrediente_id}>
                                        {index > 0 && <View style={styles.divisor} />}
                                        <View style={styles.ingRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.ingNome}>{ing.nome}</Text>
                                                <Text style={styles.ingTipo}>
                                                    {ing.tipo.replace(/_/g, ' ')} · MS: {formatarNumero(ing.ms_pct, 0)}%
                                                </Text>
                                                <Text style={styles.ingConsumo}>
                                                    {formatarNumero(ing.consumo_ms_kg, 3)} kg MS/dia · {formatarNumero(ing.consumo_mn_kg, 3)} kg MN/dia
                                                </Text>
                                            </View>
                                            <View style={styles.ingDireita}>
                                                <Text style={styles.ingProporcao}>{ing.proporcao_pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</Text>
                                                <Text style={styles.ingConsumo}>
                                                    R$ {formatarNumero(ing.custo_animal_dia, 3)}/dia
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Balanço nutricional */}
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Balanço nutricional</Text>
                            <Text style={styles.secaoSubtitulo}>Fornecido vs Exigido pelo animal</Text>
                            <View style={styles.card}>
                                <BalancoItem
                                    label="Energia Líquida Mantença"
                                    fornecido={calculo.totais.contrib_elm_mcal}
                                    exigido={exig.elm}
                                    unidade="Mcal"
                                />
                                <View style={styles.divisor} />
                                <BalancoItem
                                    label="Proteína Bruta"
                                    fornecido={calculo.totais.contrib_pb_g}
                                    exigido={exig.pb}
                                    unidade="g"
                                />
                                <View style={styles.divisor} />
                                <BalancoItem
                                    label="Cálcio"
                                    fornecido={calculo.totais.contrib_ca_g}
                                    exigido={exig.ca}
                                    unidade="g"
                                />
                                <View style={styles.divisor} />
                                <BalancoItem
                                    label="Fósforo"
                                    fornecido={calculo.totais.contrib_p_g}
                                    exigido={exig.p}
                                    unidade="g"
                                />
                            </View>
                        </View>
                    </>
                )}

                {/* Ações */}
                <View style={styles.secao}>
                    <Text style={styles.secaoTitulo}>O que deseja fazer?</Text>

                    <TouchableOpacity
                        style={[globalStyles.buttonPrimary, (salvando || !calculo) && globalStyles.buttonDisabled]}
                        onPress={() => handleSalvar()}
                        disabled={salvando || !calculo}
                        activeOpacity={0.8}
                    >
                        {salvando ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Icons.save size={22} color={Colors.white} />
                                <Text style={globalStyles.buttonPrimaryText}>Salvar formulação</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            globalStyles.buttonSecondary,
                            { marginTop: Spacing.sm },
                            (loadingContratos || !calculo) && globalStyles.buttonDisabled,
                        ]}
                        onPress={buscarContratosAtivos}
                        disabled={loadingContratos || !calculo}
                        activeOpacity={0.8}
                    >
                        {loadingContratos ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Icons.handShake size={22} color={Colors.primary} />
                                <Text style={globalStyles.buttonSecondaryText}>Vincular a um contrato</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Lista de contratos ativos */}
                    {mostrarContratos && (
                        <View style={styles.contratosLista}>
                            <Text style={styles.contratosTitle}>
                                {contratosAtivos.length > 0
                                    ? 'Selecione o contrato'
                                    : 'Nenhum contrato ativo encontrado'}
                            </Text>
                            {contratosAtivos.map(contrato => (
                                <TouchableOpacity
                                    key={contrato.id}
                                    style={styles.contratoCard}
                                    onPress={() => {
                                        setMostrarContratos(false)
                                        handleSalvar(contrato.id)
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.contratoNome}>
                                            {contrato.fazenda?.name ?? '—'}
                                        </Text>
                                        <Text style={styles.contratoFazendeiro}>
                                            @{contrato.fazendeiro?.username ?? '—'}
                                        </Text>
                                    </View>
                                    <Text style={styles.contratoVincular}>Vincular →</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.cancelarVincular}
                                onPress={() => setMostrarContratos(false)}
                            >
                                <Text style={styles.cancelarVincularTexto}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.botaoDescartar}
                        onPress={() => router.replace('/consultor/home')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.botaoDescartarTexto}>Descartar e voltar ao início</Text>
                    </TouchableOpacity>
                </View>

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
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    stepAtivo: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    stepConcluido: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
    stepNumeroAtivo: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm },
    stepNumeroConcluido: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm },
    stepLinha: { flex: 1, height: 2, backgroundColor: Colors.gray[200] },
    stepLinhaAtiva: { backgroundColor: Colors.success },
    header: { marginBottom: Spacing.xl },
    secao: { marginBottom: Spacing.xl },
    secaoTitulo: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black, marginBottom: Spacing.xs },
    secaoSubtitulo: { fontSize: FontSize.sm, color: Colors.gray[500], marginBottom: Spacing.md },
    resumoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    resumoCard: {
        width: '47%',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    resumoValor: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, textAlign: 'center' },
    resumoLabel: { fontSize: FontSize.xs, color: Colors.gray[500], textAlign: 'center' },
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
    estadoCalculo: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl, marginBottom: Spacing.xl },
    estadoCalculoTexto: { fontSize: FontSize.sm, color: Colors.gray[600], textAlign: 'center' },
    divisor: { height: 1, backgroundColor: Colors.gray[200], marginVertical: Spacing.sm },
    ingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    ingNome: { fontSize: FontSize.md, fontWeight: '600', color: Colors.black },
    ingTipo: { fontSize: FontSize.xs, color: Colors.gray[500], marginTop: 2 },
    ingDireita: { alignItems: 'flex-end' },
    ingProporcao: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary },
    ingConsumo: { fontSize: FontSize.xs, color: Colors.gray[500] },
    balancoItem: { paddingVertical: Spacing.xs },
    balancoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    balancoLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.black, flex: 1 },
    balancoBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
    balancoBadgeText: { fontSize: FontSize.xs, fontWeight: 'bold' },
    balancoBar: { height: 6, backgroundColor: Colors.gray[200], borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
    balancoFill: { height: '100%', borderRadius: 3 },
    balancoValores: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    balancoFornecido: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.black },
    balancoExigido: { fontSize: FontSize.xs, color: Colors.gray[500] },
    contratosLista: {
        marginTop: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    contratosTitle: {
        fontSize: FontSize.md,
        fontWeight: 'bold',
        color: Colors.black,
        marginBottom: Spacing.xs,
    },
    contratoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.gray[200],
    },
    contratoNome: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.black,
    },
    contratoFazendeiro: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
        marginTop: 2,
    },
    contratoVincular: {
        fontSize: FontSize.sm,
        color: Colors.primary,
        fontWeight: 'bold',
    },
    cancelarVincular: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    cancelarVincularTexto: {
        fontSize: FontSize.sm,
        color: Colors.error,
        fontWeight: '600',
    },
    botaoDescartar: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
    botaoDescartarTexto: { fontSize: FontSize.sm, color: Colors.gray[500] },
})