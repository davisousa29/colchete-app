import { useState, useEffect, useRef, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Image,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { ArrowLeft, Check, Copy } from 'lucide-react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import {
    getPlans,
    createCheckout,
    getCheckout,
    getSubscriptionStatus,
    Plan,
    PixData,
    CheckoutPayment,
} from '@/src/services/subscriptionService'

const INTERVALO_CONSULTA_MS = 4000

type Etapa = 'carregando' | 'escolha' | 'pix' | 'pago'

// ── Helpers de formatação ─────────────────────────────────────────────────────
function formatarPreco(valor: number) {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

function formatarData(iso: string | null) {
    if (!iso) return ''
    const [ano, mes, dia] = iso.substring(0, 10).split('-')
    return `${dia}/${mes}/${ano}`
}

function mesesDoPlano(plano: Plan) {
    return Math.max(1, Math.round(plano.days / 30))
}

// Economia em % comparando o preço mensal equivalente com o plano mensal
function calcularEconomia(plano: Plan, mensal?: Plan) {
    if (!mensal || plano.plan === mensal.plan) return 0
    const precoPorMes = plano.price / mesesDoPlano(plano)
    return Math.round((1 - precoPorMes / mensal.price) * 100)
}

function mensagemDeErro(error: any, padrao: string) {
    return error?.response?.data?.message ?? padrao
}

export default function Planos() {
    const [etapa, setEtapa] = useState<Etapa>('carregando')
    const [planos, setPlanos] = useState<Plan[]>([])
    const [selecionado, setSelecionado] = useState<string | null>(null)
    const [gerando, setGerando] = useState(false)
    const [payment, setPayment] = useState<CheckoutPayment | null>(null)
    const [copiado, setCopiado] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [validoAte, setValidoAte] = useState<string | null>(null)

    // Refs para o intervalo enxergar sempre o valor atual
    const pixRef = useRef<PixData | null>(null)
    const consultandoRef = useRef(false)

    const etapaRef = useRef<Etapa>(etapa)
    etapaRef.current = etapa

    useFocusEffect(
        useCallback(() => {
            if (etapaRef.current === 'carregando' || etapaRef.current === 'escolha') {
                carregarPlanos()
            }
        }, [])
    )

    async function carregarPlanos() {
        try {
            const lista = await getPlans()
            setPlanos(lista)
            // Mantém a escolha da pessoa se o plano ainda existir
            setSelecionado((atual) =>
                lista.some((p) => p.plan === atual) ? atual : lista[0]?.plan ?? null
            )
            setEtapa('escolha')
        } catch (error) {
            setErro(mensagemDeErro(error, 'Não foi possível carregar os planos.'))
            setEtapa('escolha')
        }
    }

    // ── Gera (ou reaproveita) o PIX do plano escolhido ────────────────────────
    async function handleGerarPix() {
        if (!selecionado) return
        setGerando(true)
        setErro(null)
        try {
            const novo = await createCheckout(selecionado)
            pixRef.current = novo.pix
            setPayment(novo)
            setEtapa(novo.status === 'received' ? 'pago' : 'pix')
        } catch (error) {
            setErro(mensagemDeErro(error, 'Não foi possível gerar o PIX. Tente novamente.'))
        } finally {
            setGerando(false)
        }
    }

    // ── Enquanto o QR está na tela, consulta se o pagamento caiu ──────────────
    useEffect(() => {
        if (etapa !== 'pix' || !payment) return

        let ativo = true
        const timer = setInterval(async () => {
            if (consultandoRef.current) return // evita consultas sobrepostas
            consultandoRef.current = true
            try {
                // Só pede o QR de novo se ele ainda não veio
                const atual = await getCheckout(payment.id, !pixRef.current)
                if (!ativo) return

                if (atual.status === 'received') {
                    setEtapa('pago')
                    return
                }

                if (atual.status !== 'pending') {
                    setErro('Esta cobrança não está mais disponível. Gere um novo PIX.')
                    setPayment(null)
                    pixRef.current = null
                    setEtapa('escolha')
                    carregarPlanos()
                    return
                }

                if (atual.pix && !pixRef.current) {
                    pixRef.current = atual.pix
                    setPayment((p) => (p ? { ...p, pix: atual.pix } : p))
                }
            } catch {
                // falha de rede pontual: tenta de novo no próximo ciclo
            } finally {
                consultandoRef.current = false
            }
        }, INTERVALO_CONSULTA_MS)

        return () => {
            ativo = false
            clearInterval(timer)
        }
    }, [etapa, payment?.id])

    // ── Ao confirmar, busca a nova data de vencimento para mostrar ────────────
    useEffect(() => {
        if (etapa !== 'pago') return
        getSubscriptionStatus()
            .then((s) => setValidoAte(s.expires_at))
            .catch(() => {})
    }, [etapa])

    async function handleCopiar() {
        const codigo = payment?.pix?.pix_copy_paste
        if (!codigo) return
        await Clipboard.setStringAsync(codigo)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
    }

    function handleVoltar() {
        // No QR, "voltar" retorna à escolha (a cobrança pendente é reaproveitada se gerar de novo)
        if (etapa === 'pix') {
            setEtapa('escolha')
            carregarPlanos()
            return
        }
        if (router.canGoBack()) router.back()
        else router.replace('/consultor/home')
    }

    // ── Renderização ──────────────────────────────────────────────────────────
    if (etapa === 'carregando') {
        return (
            <View style={[globalStyles.screen, globalStyles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        )
    }

    if (etapa === 'pago') {
        return (
            <View style={[globalStyles.screen, styles.containerCentro]}>
                <View style={styles.iconeSucesso}>
                    <Check size={44} color={Colors.success} strokeWidth={3} />
                </View>
                <Text style={styles.titulo}>Pagamento confirmado!</Text>
                <Text style={styles.descricao}>
                    Sua assinatura está ativa
                    {validoAte ? ` até ${formatarData(validoAte)}` : ''}. Obrigado por assinar o
                    Colchete.
                </Text>
                <TouchableOpacity
                    style={[globalStyles.buttonPrimary, styles.botaoLargo]}
                    onPress={() => router.replace('/consultor/home')}
                    activeOpacity={0.8}
                >
                    <Text style={globalStyles.buttonPrimaryText}>Ir para o início</Text>
                </TouchableOpacity>
            </View>
        )
    }

    const mensal = planos.find((p) => p.plan === 'monthly')
    const maiorEconomia = Math.max(0, ...planos.map((p) => calcularEconomia(p, mensal)))
    const planoDoPix = planos.find((p) => p.plan === payment?.plan)

    return (
        <View style={globalStyles.screen}>
            <View style={globalStyles.backButtonContainer}>
                <TouchableOpacity style={styles.voltar} onPress={handleVoltar} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={Colors.primary} />
                    <Text style={globalStyles.backText}>Voltar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {etapa === 'escolha' && (
                    <>
                        <Text style={globalStyles.pageTitle}>Escolha seu plano</Text>
                        <Text style={[globalStyles.pageSubtitle, styles.subtitulo]}>
                            Acesso completo a todas as funcionalidades do Colchete.
                        </Text>

                        {planos.map((plano) => {
                            const ativo = selecionado === plano.plan
                            const economia = calcularEconomia(plano, mensal)
                            const meses = mesesDoPlano(plano)
                            const melhor = economia > 0 && economia === maiorEconomia

                            return (
                                <TouchableOpacity
                                    key={plano.plan}
                                    style={[globalStyles.card, styles.cardPlano, ativo && styles.cardAtivo]}
                                    onPress={() => setSelecionado(plano.plan)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardTopo}>
                                        <View style={[styles.radio, ativo && styles.radioAtivo]}>
                                            {ativo && <Check size={14} color={Colors.white} />}
                                        </View>
                                        <Text style={styles.nomePlano}>{plano.name}</Text>
                                        {melhor && (
                                            <View style={styles.selo}>
                                                <Text style={styles.seloTexto}>Mais vantajoso</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={styles.preco}>{formatarPreco(plano.price)}</Text>
                                    <Text style={styles.detalhe}>
                                        {meses} {meses === 1 ? 'mês' : 'meses'} de acesso
                                        {meses > 1 && ` · ≈ ${formatarPreco(plano.price / meses)}/mês`}
                                    </Text>
                                    {economia > 0 && (
                                        <Text style={styles.economia}>Economize {economia}%</Text>
                                    )}
                                </TouchableOpacity>
                            )
                        })}

                        {erro && <Text style={styles.erro}>{erro}</Text>}

                        <TouchableOpacity
                            style={[
                                globalStyles.buttonPrimary,
                                styles.botaoLargo,
                                (!selecionado || gerando) && globalStyles.buttonDisabled,
                            ]}
                            onPress={handleGerarPix}
                            disabled={!selecionado || gerando}
                            activeOpacity={0.8}
                        >
                            {gerando ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={globalStyles.buttonPrimaryText}>Pagar com PIX</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                {etapa === 'pix' && payment && (
                    <>
                        <Text style={globalStyles.pageTitle}>Pague com PIX</Text>
                        <Text style={[globalStyles.pageSubtitle, styles.subtitulo]}>
                            {planoDoPix?.name ?? 'Plano'} · {formatarPreco(payment.value)}
                        </Text>

                        <View style={[globalStyles.card, styles.cardPix]}>
                            {payment.pix?.pix_qr_code ? (
                                <Image
                                    source={{ uri: `data:image/png;base64,${payment.pix.pix_qr_code}` }}
                                    style={styles.qr}
                                />
                            ) : (
                                <View style={[styles.qr, globalStyles.center]}>
                                    <ActivityIndicator color={Colors.primary} />
                                    <Text style={styles.gerandoQr}>Gerando QR Code…</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[
                                    globalStyles.buttonSecondary,
                                    styles.botaoCopiar,
                                    !payment.pix?.pix_copy_paste && globalStyles.buttonDisabled,
                                ]}
                                onPress={handleCopiar}
                                disabled={!payment.pix?.pix_copy_paste}
                                activeOpacity={0.8}
                            >
                                <View style={globalStyles.buttonRow}>
                                    {copiado ? (
                                        <Check size={18} color={Colors.primary} />
                                    ) : (
                                        <Copy size={18} color={Colors.primary} />
                                    )}
                                    <Text style={globalStyles.buttonSecondaryText}>
                                        {copiado ? 'Código copiado!' : 'Copiar código PIX'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {payment.due_date && (
                                <Text style={styles.validade}>
                                    Pague até {formatarData(payment.due_date)}
                                </Text>
                            )}
                        </View>

                        <View style={styles.instrucoes}>
                            <Text style={styles.instrucaoTexto}>
                                1. Abra o app do seu banco e escolha PIX.{'\n'}
                                2. Leia o QR Code ou use “PIX Copia e Cola”.{'\n'}
                                3. Confirme o pagamento.
                            </Text>
                        </View>

                        <View style={styles.aguardando}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.aguardandoTexto}>
                                Aguardando pagamento. Esta tela atualiza automaticamente.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    voltar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        alignSelf: 'flex-start',
    },
    subtitulo: {
        marginBottom: Spacing.lg,
    },
    containerCentro: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },

    // Cards de plano
    cardPlano: {
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cardAtivo: {
        borderColor: Colors.primary,
    },
    cardTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.gray[400],
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioAtivo: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    nomePlano: {
        flex: 1,
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.black,
    },
    selo: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    seloTexto: {
        fontSize: FontSize.xs,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    preco: {
        fontSize: FontSize.xxl,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    detalhe: {
        fontSize: FontSize.sm,
        color: Colors.gray[600],
        marginTop: 2,
    },
    economia: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.success,
        marginTop: Spacing.xs,
    },

    // PIX
    cardPix: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.md,
    },
    qr: {
        width: 220,
        height: 220,
        marginBottom: Spacing.md,
    },
    gerandoQr: {
        marginTop: Spacing.sm,
        fontSize: FontSize.sm,
        color: Colors.gray[600],
    },
    botaoCopiar: {
        alignSelf: 'stretch',
    },
    validade: {
        marginTop: Spacing.sm,
        fontSize: FontSize.xs,
        color: Colors.gray[600],
    },
    instrucoes: {
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    instrucaoTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[700],
        lineHeight: 22,
    },
    aguardando: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    aguardandoTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[600],
    },

    // Sucesso
    iconeSucesso: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#E6F7EA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    titulo: {
        fontSize: FontSize.xxl,
        fontWeight: 'bold',
        color: Colors.black,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    descricao: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
    },

    // Comuns
    botaoLargo: {
        width: '100%',
        marginTop: Spacing.sm,
    },
    erro: {
        color: Colors.error,
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
})