import { useState, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { Icons } from '@/src/constants/icons'
import BackButton from '@/src/components/Header/BackButton'
import {
    listarNotificacoes,
    marcarLida,
    marcarTodasLidas,
    Notificacao,
} from '@/src/services/notificacaoService'
import { useNotificacaoStore } from '@/src/store/notificacaoStore'
import { toastInfo, toastSucesso } from '@/src/utils/toast'
import { configDoTipo, tempoRelativo, abrirDestino } from '@/src/utils/notificacoes'

type Filtro = 'todas' | 'nao_lidas' | 'lidas'

const FILTRO_CHIPS: { label: string; value: Filtro }[] = [
    { label: 'Todas',     value: 'todas' },
    { label: 'Não lidas', value: 'nao_lidas' },
    { label: 'Lidas',     value: 'lidas' },
]

export default function NotificacoesScreen() {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
    const [loading, setLoading] = useState(false)
    const [filtro, setFiltro] = useState<Filtro>('todas')
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const { atualizarNaoLidas } = useNotificacaoStore()

    useFocusEffect(
        useCallback(() => {
            carregar(1, filtro)
        }, [filtro])
    )

    async function carregar(novaPagina: number, filtroAtual: Filtro) {
        setLoading(true)
        try {
            const resultado = await listarNotificacoes({
                page: novaPagina,
                lida: filtroAtual === 'todas' ? undefined : filtroAtual === 'lidas',
                ordem: 'recentes',
            })
            if (novaPagina === 1) {
                setNotificacoes(resultado.data)
            } else {
                setNotificacoes(prev => [...prev, ...resultado.data])
            }
            setPagina(resultado.current_page)
            setTotalPaginas(resultado.last_page)
        } catch {
            // silencioso
        } finally {
            setLoading(false)
        }
    }

    function carregarMais() {
        if (pagina < totalPaginas && !loading) {
            carregar(pagina + 1, filtro)
        }
    }

    async function handleTocar(notif: Notificacao) {
        if (!notif.lida) {
            try {
                await marcarLida(notif.id)
                atualizarNaoLidas()
                // Atualiza localmente sem refazer a busca
                setNotificacoes(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, lida: true } : n)
                )
            } catch {
                // segue
            }
        }

        if (!abrirDestino(notif)) {
            toastInfo('Este item não está mais disponível.')
        }
    }

    async function handleMarcarTodas() {
        try {
            await marcarTodasLidas()
            atualizarNaoLidas()
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
            toastSucesso('Todas as notificações foram marcadas como lidas.')
        } catch {
            // silencioso
        }
    }

    function renderNotificacao({ item }: { item: Notificacao }) {
        const config = configDoTipo(item.tipo)
        const Icone = config.icone
        return (
            <TouchableOpacity
                style={[styles.card, !item.lida && styles.cardNaoLida]}
                onPress={() => handleTocar(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.cardIcone, { backgroundColor: config.cor + '20' }]}>
                    <Icone size={20} color={config.cor} />
                </View>
                <View style={styles.cardConteudo}>
                    <Text style={styles.cardTitulo}>{item.titulo}</Text>
                    <Text style={styles.cardMensagem} numberOfLines={2}>{item.mensagem}</Text>
                    <Text style={styles.cardTempo}>{tempoRelativo(item.created_at)}</Text>
                </View>
                {!item.lida && <View style={styles.dotNaoLida} />}
            </TouchableOpacity>
        )
    }

    return (
        <View style={globalStyles.screen}>
            <View style={globalStyles.backButtonContainer}>
                <BackButton />
            </View>

            <FlatList
                data={notificacoes}
                keyExtractor={item => item.id}
                renderItem={renderNotificacao}
                contentContainerStyle={styles.lista}
                showsVerticalScrollIndicator={false}
                onEndReached={carregarMais}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <View style={styles.headerTopo}>
                            <Text style={globalStyles.pageTitle}>Notificações</Text>
                            <TouchableOpacity onPress={handleMarcarTodas}>
                                <Text style={styles.marcarTodas}>Marcar todas</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chips}>
                            {FILTRO_CHIPS.map(chip => (
                                <TouchableOpacity
                                    key={chip.value}
                                    style={[styles.chip, filtro === chip.value && styles.chipAtivo]}
                                    onPress={() => setFiltro(chip.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipTexto, filtro === chip.value && styles.chipTextoAtivo]}>
                                        {chip.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    loading && pagina === 1 ? (
                        <View style={styles.vazio}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.vazio}>
                            <Icons.bell size={40} color={Colors.gray[300]} />
                            <Text style={styles.vazioTexto}>Nenhuma notificação</Text>
                            <Text style={styles.vazioSubtexto}>
                                {filtro === 'nao_lidas'
                                    ? 'Você não tem notificações não lidas'
                                    : filtro === 'lidas'
                                        ? 'Você não tem notificações lidas'
                                        : 'Suas notificações aparecerão aqui'}
                            </Text>
                        </View>
                    )
                }
                ListFooterComponent={
                    loading && pagina > 1 ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
                    ) : undefined
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    headerTopo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    marcarTodas: {
        fontSize: FontSize.sm,
        color: Colors.primary,
        fontWeight: '600',
    },
    chips: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        backgroundColor: Colors.white,
    },
    chipAtivo: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[700],
        fontWeight: '600',
    },
    chipTextoAtivo: {
        color: Colors.white,
    },
    lista: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardNaoLida: {
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    cardIcone: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardConteudo: {
        flex: 1,
        gap: 2,
    },
    cardTitulo: {
        fontSize: FontSize.md,
        fontWeight: 'bold',
        color: Colors.black,
    },
    cardMensagem: {
        fontSize: FontSize.sm,
        color: Colors.gray[600],
    },
    cardTempo: {
        fontSize: FontSize.xs,
        color: Colors.gray[400],
        marginTop: 2,
    },
    dotNaoLida: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        marginTop: 4,
    },
    vazio: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.sm,
    },
    vazioTexto: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.gray[700],
    },
    vazioSubtexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
        textAlign: 'center',
    },
})