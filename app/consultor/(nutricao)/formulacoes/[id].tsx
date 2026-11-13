import { useState, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import {
    FlaskConical,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackButton from '@/src/components/Header/BackButton'
import CentralModal from '@/src/components/Modal/CentralModal'
import api from '@/src/services/api'
import { formatarNumero } from '@/src/utils/numbers'
import { currencyMask } from '@/src/utils/masks/currencyMask'
import { Icons } from '@/src/constants/icons'
import { toastErro, toastInfo, toastSucesso } from '@/src/utils/toast'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import ResumoConcentradoVolumoso from '@/src/components/Formulacao/ResumoConcentradoVolumoso'

interface Ingrediente {
    id: string
    ingrediente_id: string
    tipo: string
    ordem: number
    proporcao_pct: string
    consumo_ms_kg: string
    consumo_mn_kg: string
    contrib_elm_mcal: string
    contrib_pb_g: string
    contrib_ca_g: string
    contrib_p_g: string
    custo_animal_dia: string
    preco_kg_local: string
    ingrediente: {
        id: string
        nome: string
        tipo: string
        ms_pct: string
    }
}

interface Programa {
    id: string
    nome: string
    status: string
    contrato_id: string | null
    criado_por: string
    especie: { id: string; nome: string }
    raca: { id: string; nome: string }
    categoria: { id: string; nome: string }
    sistema: { id: string; nome: string }
    peso_inicial_kg: string
    peso_final_kg: string
    peso_medio_kg: string
    gmd_kg: string
    quantidade_animais: number
    tipo_aplicacao: string
    exig_cms_kg: string
    exig_ndt_kg: string
    exig_pb_g: string
    exig_elm_mcal: string
    exig_elg_mcal: string
    exig_ca_g: string
    exig_p_g: string
    custo_animal_dia: string
    referencia_nutricional: string
    data_inicio: string | null
    data_fim: string | null
    observacoes: string | null
    created_at: string
    ingredientes: Ingrediente[]
    contrato: {
        id: string
        fazenda: { name: string }
        fazendeiro: { username: string; name: string }
    } | null
}

function StatusBadge({ status }: { status: string }) {
    const config = {
        ativo:     { cor: '#40C057', icone: CheckCircle, label: 'Ativo' },
        rascunho:  { cor: '#FAB005', icone: AlertCircle, label: 'Rascunho' },
        encerrado: { cor: '#6C757D', icone: XCircle,     label: 'Encerrado' },
    }[status] ?? { cor: '#6C757D', icone: AlertCircle, label: status }
    const Icone = config.icone
    return (
        <View style={[styles.badge, { backgroundColor: config.cor + '20' }]}>
            <Icone size={12} color={config.cor} />
            <Text style={[styles.badgeText, { color: config.cor }]}>{config.label}</Text>
        </View>
    )
}

function BalancoItem({ label, fornecido, exigido, unidade }: {
    label: string; fornecido: number; exigido: number; unidade: string
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

export default function FormulacaoDetalheScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const [programa, setPrograma] = useState<Programa | null>(null)
    const [loading, setLoading] = useState(true)
    const [encerrando, setEncerrando] = useState(false)
    const [gerandoPdf, setGerandoPdf] = useState(false)
    const [contratosAtivos, setContratosAtivos] = useState<any[]>([])
    const [mostrarContratos, setMostrarContratos] = useState(false)
    const [loadingContratos, setLoadingContratos] = useState(false)
    const [vinculando, setVinculando] = useState(false)
    const [modal, setModal] = useState({
        visible: false, title: '', message: '',
        type: 'default' as 'default' | 'success' | 'error',
        onClose: undefined as (() => void) | undefined,
    })

    useFocusEffect(useCallback(() => { carregarPrograma() }, [id]))

    async function carregarPrograma() {
        setLoading(true)
        try {
            const response = await api.get(`/racao/programas/${id}`)
            setPrograma(response.data.programa)
        } catch {
            setModal({ visible: true, title: 'Erro', message: 'Não foi possível carregar a formulação.', type: 'error', onClose: () => router.back() })
        } finally {
            setLoading(false)
        }
    }

    async function handleEncerrar() {
        setModal({ visible: true, title: 'Encerrar formulação', message: 'Tem certeza que deseja encerrar esta formulação?', type: 'default', onClose: confirmarEncerramento })
    }

    async function confirmarEncerramento() {
        setEncerrando(true)
        try {
            await api.post(`/racao/programas/${id}/encerrar`)
            setModal({ visible: true, title: 'Encerrada!', message: 'A formulação foi encerrada com sucesso.', type: 'success', onClose: () => carregarPrograma() })
        } catch (error: any) {
            setModal({ visible: true, title: 'Erro', message: error.response?.data?.message || 'Erro ao encerrar.', type: 'error', onClose: undefined })
        } finally {
            setEncerrando(false)
        }
    }

    async function buscarContratosAtivos() {
        setLoadingContratos(true)
        try {
            const response = await api.get('/contratos')
            const ativos = response.data.contratos.filter((c: any) => c.status === 'ativo')
            if (ativos.length === 0) {
                toastInfo('Nenhum contrato ativo encontrado.')
                return
            }
            setContratosAtivos(ativos)
            setMostrarContratos(true)
        } catch {
            toastErro('Não foi possível carregar os contratos.')
        } finally {
            setLoadingContratos(false)
        }
    }

    async function handleVincular(contratoId: string) {
        setMostrarContratos(false)
        setVinculando(true)
        try {
            const programaRes = await api.post('/racao/programas', {
                contrato_id:        contratoId,
                nome:               programa!.nome,
                especie_id:         programa!.especie?.id,
                raca_id:            programa!.raca?.id,
                categoria_id:       programa!.categoria?.id,
                sistema_id:         programa!.sistema?.id,
                peso_inicial_kg:    Number(programa!.peso_inicial_kg),
                peso_final_kg:      Number(programa!.peso_final_kg),
                gmd_kg:             Number(programa!.gmd_kg),
                quantidade_animais: programa!.quantidade_animais,
                tipo_aplicacao:     programa!.tipo_aplicacao,
                exig_cms_kg:        Number(programa!.exig_cms_kg),
                exig_ndt_kg:        programa!.exig_ndt_kg != null ? Number(programa!.exig_ndt_kg) : null,
                exig_elm_mcal:      Number(programa!.exig_elm_mcal),
                exig_elg_mcal:      Number(programa!.exig_elg_mcal),
                exig_pb_g:          Number(programa!.exig_pb_g),
                exig_ca_g:          Number(programa!.exig_ca_g),
                exig_p_g:           Number(programa!.exig_p_g),
            })
            const novoId = programaRes.data.programa.id
            if (programa!.ingredientes.length > 0) {
                await api.post(`/racao/programas/${novoId}/ingredientes`, {
                    ingredientes: programa!.ingredientes.map(ing => ({
                        ingrediente_id: ing.ingrediente_id ?? ing.ingrediente?.id,
                        tipo:           ing.tipo,
                        proporcao_pct:  Number(ing.proporcao_pct),
                        preco_kg_local: Number(ing.preco_kg_local),
                    })),
                })
            }
            toastSucesso('Formulação vinculada ao contrato com sucesso.')
            router.push(`/consultor/formulacoes/${novoId}` as any)
        } catch (error: any) {
            toastErro(error.response?.data?.message || 'Erro ao vincular formulação.')
        } finally {
            setVinculando(false)
        }
    }

    async function handleGerarPdf() {
        setGerandoPdf(true)
        try {
            const response = await api.get(`/racao/programas/${id}/pdf`)
            const html = response.data.html
            const { uri } = await Print.printToFileAsync({ html, base64: false })
            const podeCompartilhar = await Sharing.isAvailableAsync()
            if (podeCompartilhar) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: programa!.nome, UTI: 'com.adobe.pdf' })
            } else {
                toastSucesso(`PDF salvo em: ${uri}`, 'PDF gerado!')
            }
        } catch {
            toastErro('Não foi possível gerar o PDF.')
        } finally {
            setGerandoPdf(false)
        }
    }

    function formatarData(data: string | null): string {
        if (!data) return '—'
        return new Date(data).toLocaleDateString('pt-BR')
    }

    if (loading) {
        return (
            <View style={[globalStyles.screen, globalStyles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        )
    }

    if (!programa) return null

    const custoLoteDia = Number(programa.custo_animal_dia) * programa.quantidade_animais
    const fornecidoELm = programa.ingredientes.reduce((acc, ing) => acc + Number(ing.contrib_elm_mcal), 0)
    const fornecidoPB  = programa.ingredientes.reduce((acc, ing) => acc + Number(ing.contrib_pb_g), 0)
    const fornecidoCa  = programa.ingredientes.reduce((acc, ing) => acc + Number(ing.contrib_ca_g), 0)
    const fornecidoP   = programa.ingredientes.reduce((acc, ing) => acc + Number(ing.contrib_p_g), 0)

    return (
        <View style={globalStyles.screen}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <BackButton />

                {/* Cabeçalho */}
                <View style={styles.cabecalho}>
                    <View style={styles.cabecalhoTopo}>
                        <View style={styles.cabecalhoIcone}>
                            <FlaskConical size={28} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={globalStyles.pageTitle} numberOfLines={2}>{programa.nome}</Text>
                            <View style={styles.cabecalhoInfo}>
                                <StatusBadge status={programa.status} />
                                <Text style={styles.cabecalhoData}>{formatarData(programa.created_at)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Resumo */}
                <View style={styles.secao}>
                    <Text style={styles.secaoTitulo}>Resumo</Text>
                    <View style={styles.resumoGrid}>
                        <View style={styles.resumoCard}>
                            <Icons.pawPrint size={25} color={Colors.primary} />
                            <Text style={styles.resumoValor}>{programa.quantidade_animais}</Text>
                            <Text style={styles.resumoLabel}>anim{programa.quantidade_animais > 1 ? 'ais' : 'al'}</Text>
                        </View>
                        <View style={styles.resumoCard}>
                            <Icons.scale size={25} color={Colors.primary} />
                            <Text style={styles.resumoValor}>{formatarNumero(Number(programa.exig_cms_kg), 2)}</Text>
                            <Text style={styles.resumoLabel}>kg MS/animal/dia</Text>
                        </View>
                        <View style={styles.resumoCard}>
                            <Icons.dolar size={25} color={Colors.primary} />
                            <Text style={styles.resumoValor}>R$ {currencyMask(String(Math.round(Number(programa.custo_animal_dia) * 100)))}</Text>
                            <Text style={styles.resumoLabel}>custo/animal/dia</Text>
                        </View>
                        <View style={styles.resumoCard}>
                            <Icons.handCoins size={25} color={Colors.primary} />
                            <Text style={styles.resumoValor}>R$ {currencyMask(String(Math.round(custoLoteDia * 100)))}</Text>
                            <Text style={styles.resumoLabel}>custo total/dia</Text>
                        </View>
                    </View>
                </View>

                {/* Dados do animal */}
                <View style={styles.secao}>
                    <Text style={styles.secaoTitulo}>Dados do animal</Text>
                    <View style={styles.card}>
                        {[
                            { label: 'Espécie',    valor: programa.especie?.nome },
                            { label: 'Raça',       valor: programa.raca?.nome },
                            { label: 'Categoria',  valor: programa.categoria?.nome },
                            { label: 'Sistema',    valor: programa.sistema?.nome },
                            { label: 'Peso inicial', valor: `${programa.peso_inicial_kg} kg` },
                            { label: 'Peso final',   valor: `${programa.peso_final_kg} kg` },
                            { label: 'Peso médio',   valor: `${programa.peso_medio_kg} kg` },
                            { label: 'GMD desejado', valor: `${programa.gmd_kg} kg/dia` },
                            { label: 'Referência',   valor: programa.referencia_nutricional },
                        ].map((item, index, arr) => (
                            <View key={index}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{item.label}</Text>
                                    <Text style={styles.infoValor}>{item.valor ?? '—'}</Text>
                                </View>
                                {index < arr.length - 1 && <View style={styles.divisor} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Exigências */}
                <View style={styles.secao}>
                    <Text style={styles.secaoTitulo}>Exigências nutricionais</Text>
                    <View style={styles.card}>
                        {[
                            { label: 'CMS', valor: `${programa.exig_cms_kg} kg/dia` },
                            { label: 'ELm', valor: `${programa.exig_elm_mcal} Mcal/dia` },
                            { label: 'ELg', valor: `${programa.exig_elg_mcal} Mcal/dia` },
                            { label: 'PB',  valor: `${programa.exig_pb_g} g/dia` },
                            { label: 'Ca',  valor: `${programa.exig_ca_g} g/dia` },
                            { label: 'P',   valor: `${programa.exig_p_g} g/dia` },
                        ].map((item, index, arr) => (
                            <View key={index}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{item.label}</Text>
                                    <Text style={styles.infoValor}>{item.valor}</Text>
                                </View>
                                {index < arr.length - 1 && <View style={styles.divisor} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Composição da dieta */}
                {programa.ingredientes.length > 0 && (
                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Composição da dieta</Text>
                        <View style={styles.card}>
                            {programa.ingredientes.map((ing, index) => (
                                <View key={ing.id}>
                                    {index > 0 && <View style={styles.divisor} />}
                                    <View style={styles.ingRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.ingNome}>{ing.ingrediente.nome}</Text>
                                            <Text style={styles.ingTipo}>{ing.tipo.replace(/_/g, ' ')} · MS: {Number(ing.ingrediente.ms_pct).toFixed(0)}%</Text>
                                            <Text style={styles.ingConsumo}>{formatarNumero(Number(ing.consumo_ms_kg), 3)} kg MS/dia · {formatarNumero(Number(ing.consumo_mn_kg), 3)} kg MN/dia</Text>
                                        </View>
                                        <View style={styles.ingDireita}>
                                            <Text style={styles.ingProporcao}>{Number(ing.proporcao_pct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</Text>
                                            <Text style={styles.ingCusto}>R$ {Number(ing.custo_animal_dia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {programa.ingredientes.length > 0 && (
                    <ResumoConcentradoVolumoso
                        itens={programa.ingredientes}
                        quantidadeAnimais={programa.quantidade_animais}
                    />
                )}

                {/* Balanço nutricional */}
                {programa.ingredientes.length > 0 && (
                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Balanço nutricional</Text>
                        <Text style={styles.secaoSubtitulo}>Fornecido vs Exigido</Text>
                        <View style={styles.card}>
                            <BalancoItem label="Energia Líquida Mantença" fornecido={fornecidoELm} exigido={Number(programa.exig_elm_mcal)} unidade="Mcal" />
                            <View style={styles.divisor} />
                            <BalancoItem label="Proteína Bruta" fornecido={fornecidoPB} exigido={Number(programa.exig_pb_g)} unidade="g" />
                            <View style={styles.divisor} />
                            <BalancoItem label="Cálcio" fornecido={fornecidoCa} exigido={Number(programa.exig_ca_g)} unidade="g" />
                            <View style={styles.divisor} />
                            <BalancoItem label="Fósforo" fornecido={fornecidoP} exigido={Number(programa.exig_p_g)} unidade="g" />
                        </View>
                    </View>
                )}

                {/* Contrato vinculado */}
                {programa.contrato && (
                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Contrato vinculado</Text>
                        <TouchableOpacity
                            style={styles.contratoCard}
                            onPress={() => router.push(`/consultor/contrato/${programa.contrato!.id}` as any)}
                            activeOpacity={0.8}
                        >
                            <FileText size={20} color={Colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.contratoNome}>{programa.contrato.fazenda?.name}</Text>
                                <Text style={styles.contratoFazendeiro}>@{programa.contrato.fazendeiro?.username}</Text>
                            </View>
                            <Text style={styles.contratoVer}>Ver contrato →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Ações */}
                <View style={styles.secao}>

                    {/* Vincular a contrato */}
                    {programa.status !== 'encerrado' && (
                        <View style={{ marginBottom: Spacing.md }}>
                            <TouchableOpacity
                                style={[styles.botaoVincular, (loadingContratos || vinculando) && globalStyles.buttonDisabled]}
                                onPress={buscarContratosAtivos}
                                disabled={loadingContratos || vinculando}
                                activeOpacity={0.8}
                            >
                                {loadingContratos || vinculando ? (
                                    <ActivityIndicator color={Colors.primary} />
                                ) : (
                                    <Text style={styles.botaoVincularTexto}>
                                        {programa.contrato_id ? '+ Vincular a outro contrato' : '+ Vincular a um contrato'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {mostrarContratos && (
                                <View style={[styles.card, { marginTop: Spacing.sm }]}>
                                    <Text style={styles.contratoSelecioneLabel}>Selecione um contrato</Text>
                                    {contratosAtivos.map((contrato, index) => (
                                        <View key={contrato.id}>
                                            {index > 0 && <View style={styles.divisor} />}
                                            <TouchableOpacity
                                                style={styles.contratoOpcao}
                                                onPress={() => handleVincular(contrato.id)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.contratoNome}>{contrato.fazenda?.name ?? '—'}</Text>
                                                    <Text style={styles.contratoFazendeiro}>@{contrato.fazendeiro?.username ?? '—'}</Text>
                                                </View>
                                                <Text style={styles.contratoVer}>Vincular →</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <View style={styles.divisor} />
                                    <TouchableOpacity style={styles.cancelarVincular} onPress={() => setMostrarContratos(false)}>
                                        <Text style={styles.cancelarVincularTexto}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    <TouchableOpacity
                        style={[globalStyles.buttonSecondary, gerandoPdf && globalStyles.buttonDisabled, { marginBottom: Spacing.sm }]}
                        onPress={handleGerarPdf}
                        disabled={gerandoPdf}
                        activeOpacity={0.8}
                    >
                        {gerandoPdf ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : (
                            <View style={globalStyles.buttonRow}>
                                <Icons.graphic size={20} color={Colors.primary} />
                                <Text style={globalStyles.buttonSecondaryText}>Gerar PDF</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {programa.status === 'ativo' && (
                        <TouchableOpacity
                            style={[styles.botaoEncerrar, encerrando && globalStyles.buttonDisabled]}
                            onPress={handleEncerrar}
                            disabled={encerrando}
                            activeOpacity={0.8}
                        >
                            {encerrando ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={styles.botaoEncerrarTexto}>Encerrar formulação</Text>
                            )}
                        </TouchableOpacity>
                    )}
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
    scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },
    cabecalho: { marginBottom: Spacing.xl },
    cabecalhoTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    cabecalhoIcone: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8F5EE', justifyContent: 'center', alignItems: 'center' },
    cabecalhoInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
    cabecalhoData: { fontSize: FontSize.xs, color: Colors.gray[500] },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
    badgeText: { fontSize: FontSize.xs, fontWeight: 'bold' },
    secao: { marginBottom: Spacing.xl },
    secaoTitulo: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black, marginBottom: Spacing.sm },
    secaoSubtitulo: { fontSize: FontSize.sm, color: Colors.gray[500], marginBottom: Spacing.md, marginTop: -Spacing.xs },
    resumoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    resumoCard: { width: '47%', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    resumoValor: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, textAlign: 'center' },
    resumoLabel: { fontSize: FontSize.xs, color: Colors.gray[500], textAlign: 'center' },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
    infoLabel: { fontSize: FontSize.sm, color: Colors.gray[500] },
    infoValor: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.black, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
    divisor: { height: 1, backgroundColor: Colors.gray[200] },
    ingRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm, gap: Spacing.md },
    ingNome: { fontSize: FontSize.md, fontWeight: '600', color: Colors.black },
    ingTipo: { fontSize: FontSize.xs, color: Colors.gray[500], marginTop: 2 },
    ingConsumo: { fontSize: FontSize.xs, color: Colors.gray[400], marginTop: 2 },
    ingDireita: { alignItems: 'flex-end' },
    ingProporcao: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.primary },
    ingCusto: { fontSize: FontSize.xs, color: Colors.gray[500], marginTop: 2 },
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
    contratoCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    contratoNome: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.black },
    contratoFazendeiro: { fontSize: FontSize.sm, color: Colors.gray[500] },
    contratoVer: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
    botaoVincular: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.white },
    botaoVincularTexto: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
    contratoSelecioneLabel: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.black, marginBottom: Spacing.sm },
    contratoOpcao: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
    cancelarVincular: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
    cancelarVincularTexto: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
    botaoEncerrar: { backgroundColor: Colors.error, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
    botaoEncerrarTexto: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
})