import { useState, useRef, useEffect, useMemo, type ComponentRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Check } from 'lucide-react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackButton from '@/src/components/Header/BackButton'
import SearchBar from '@/src/components/Input/SearchBar'
import FilterChips, { FilterChip } from '@/src/components/Filter/FilterChips'
import CentralModal from '@/src/components/Modal/CentralModal'
import api from '@/src/services/api'
import { sanitizarNumero, parsearNumero } from '@/src/utils/numbers'
import { currencyMask, parseCurrency } from '@/src/utils/masks/currencyMask'

interface Ingrediente {
    id: string
    nome: string
    tipo: string
    grupo: string
    ms_pct: string
    ndt_pct: string
    pb_pct: string
    elm_mcal: string
    elg_mcal: string
    ca_pct: string
    p_pct: string
    preco_kg: string | null
}

interface IngredienteSelecionado {
    ingrediente: Ingrediente
    tipo: 'volumoso_principal' | 'volumoso_suplementar' | 'concentrado'
    proporcao_pct: string
    preco_kg_local: string
}

const TIPO_CHIPS: FilterChip[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Volumoso', value: 'volumoso' },
    { label: 'Concentrado', value: 'concentrado' },
    { label: 'Mineral', value: 'mineral' },
    { label: 'Aditivo', value: 'aditivo' },
]

const TIPO_DIETA_OPTIONS = [
    { label: 'Volumoso principal', value: 'volumoso_principal' },
    { label: 'Volumoso sup.', value: 'volumoso_suplementar' },
    { label: 'Concentrado', value: 'concentrado' },
]

export default function RacaoStep3() {
    const params = useLocalSearchParams()

    const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('todos')
    const [selecionados, setSelecionados] = useState<IngredienteSelecionado[]>([])
    const [modal, setModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'default' as 'default' | 'success' | 'error',
    })
    const listaRef = useRef<FlatList<Ingrediente>>(null)
    const itemEmFoco = useRef<string | null>(null)

    const telaRef = useRef<ComponentRef<typeof View>>(null)
    const [offsetTopo, setOffsetTopo] = useState(0)

    useEffect(() => {
        carregarIngredientes()
    }, [])

    async function carregarIngredientes() {
        try {
            const response = await api.get('/racao/ingredientes')
            setIngredientes(response.data.ingredientes)
        } catch {
            setModal({ visible: true, title: 'Erro', message: 'Não foi possível carregar os ingredientes.', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const ingredientesFiltrados = useMemo(() => {
        return ingredientes.filter(i => {
            const matchBusca = !busca || i.nome.toLowerCase().includes(busca.toLowerCase())
            const matchTipo = filtroTipo === 'todos' || i.tipo === filtroTipo
            return matchBusca && matchTipo
        })
    }, [ingredientes, busca, filtroTipo])

    function isSelecionado(id: string) {
        return selecionados.some(s => s.ingrediente.id === id)
    }

    function toggleIngrediente(ingrediente: Ingrediente) {
        if (isSelecionado(ingrediente.id)) {
            setSelecionados(prev => prev.filter(s => s.ingrediente.id !== ingrediente.id))
        } else {
            const tipoPadrao = ingrediente.tipo === 'volumoso'
                ? 'volumoso_principal'
                : ingrediente.tipo === 'concentrado'
                    ? 'concentrado'
                    : 'concentrado'

            setSelecionados(prev => [...prev, {
                ingrediente,
                tipo: tipoPadrao as any,
                proporcao_pct: '',
                preco_kg_local: ingrediente.preco_kg ?? '',
            }])
        }
    }

    function atualizarSelecionado(id: string, campo: keyof IngredienteSelecionado, valor: string) {
        setSelecionados(prev => prev.map(s =>
            s.ingrediente.id === id ? { ...s, [campo]: valor } : s
        ))
    }

    function totalProporcao() {
        return selecionados.reduce((acc, s) => acc + parsearNumero(s.proporcao_pct), 0)
    }

    function handleProximo() {
        if (selecionados.length === 0) {
            setModal({ visible: true, title: 'Atenção', message: 'Selecione pelo menos um ingrediente.', type: 'default' })
            return
        }

        const total = totalProporcao()
        if (total !== 100) {
            setModal({ visible: true, title: 'Atenção', message: `A soma das proporções deve ser 100%. Atual: ${total.toFixed(1)}%`, type: 'default' })
            return
        }

        const ingredientesParam = selecionados.map(s => ({
            ingrediente_id: s.ingrediente.id,
            nome: s.ingrediente.nome,
            tipo: s.tipo,
            proporcao_pct: parsearNumero(s.proporcao_pct),
            preco_kg_local: parseCurrency(s.preco_kg_local),
        }))

        router.push({
            pathname: '/consultor/racao/resultado',
            params: {
                ...params,
                ingredientes: JSON.stringify(ingredientesParam),
            }
        } as any)
    }

    function rolarAteItem(id: string, posicao: 0 | 1 = 1) {
        const index = ingredientesFiltrados.findIndex(i => i.id === id)
        if (index < 0) return

        listaRef.current?.scrollToIndex({ index, viewPosition: posicao, animated: true })
    }

    const rolarDepoisDeFiltrar = useRef<string | null>(null)

    function irParaIngrediente(id: string) {
        const visivel = ingredientesFiltrados.some(i => i.id === id)

        if (visivel) {
            rolarAteItem(id, 0)
            return
        }

        rolarDepoisDeFiltrar.current = id
        setBusca('')
        setFiltroTipo('todos')
    }

    useEffect(() => {
        const id = rolarDepoisDeFiltrar.current
        if (!id) return

        rolarDepoisDeFiltrar.current = null
        setTimeout(() => rolarAteItem(id, 0), 100)
    }, [ingredientesFiltrados])

    useEffect(() => {
        const sub = Keyboard.addListener('keyboardDidShow', () => {
            if (itemEmFoco.current) {
                setTimeout(() => rolarAteItem(itemEmFoco.current!), 100)
            }
        })
        return () => sub.remove()
    }, [ingredientesFiltrados])

    function aoFocarCampo(id: string) {
        itemEmFoco.current = id
        if (Keyboard.isVisible()) rolarAteItem(id)
    }

    function renderIngrediente({ item }: { item: Ingrediente }) {
        const selecionado = isSelecionado(item.id)
        const sel = selecionados.find(s => s.ingrediente.id === item.id)

        return (
            <View style={[styles.card, selecionado && styles.cardSelecionado]}>
                {/* Header do card */}
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleIngrediente(item)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardNome}>{item.nome}</Text>
                        <Text style={styles.cardTipo}>{item.tipo} · MS: {Number(item.ms_pct).toFixed(0)}% · PB: {Number(item.pb_pct).toFixed(1)}%</Text>
                    </View>
                    <View style={[styles.checkbox, selecionado && styles.checkboxAtivo]}>
                        {selecionado && <Check size={14} color={Colors.white} />}
                    </View>
                </TouchableOpacity>

                {/* Configuração quando selecionado */}
                {selecionado && sel && (
                    <View style={styles.cardConfig}>
                        <View style={styles.divisor} />

                        {/* Tipo na dieta */}
                        <Text style={styles.configLabel}>Tipo na dieta</Text>
                        <View style={styles.tipoOptions}>
                            {TIPO_DIETA_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.tipoChip, sel.tipo === opt.value && styles.tipoChipAtivo]}
                                    onPress={() => atualizarSelecionado(item.id, 'tipo', opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.tipoChipText, sel.tipo === opt.value && styles.tipoChipTextAtivo]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Proporção e preço */}
                        <View style={styles.configRow}>
                            <View style={[globalStyles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.configLabel}>Proporção (%)</Text>
                                <TextInput
                                    style={[globalStyles.input, { width: '100%', textAlign: 'center' }]}
                                    placeholder="0"
                                    placeholderTextColor={Colors.gray[400]}
                                    value={sel.proporcao_pct}
                                    onChangeText={v => atualizarSelecionado(item.id, 'proporcao_pct', sanitizarNumero(v))}
                                    keyboardType="decimal-pad"
                                    onFocus={() => aoFocarCampo(item.id)}
                                />
                            </View>
                            <View style={[globalStyles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.configLabel}>Preço (R$/kg)</Text>
                                <TextInput
                                    style={[globalStyles.input, { width: '100%', textAlign: 'center' }]}
                                    placeholder="0,00"
                                    placeholderTextColor={Colors.gray[400]}
                                    value={sel.preco_kg_local}
                                    onChangeText={v => atualizarSelecionado(item.id, 'preco_kg_local', currencyMask(v))}
                                    keyboardType="number-pad"
                                    onFocus={() => aoFocarCampo(item.id)}
                                />
                            </View>
                        </View>
                    </View>
                )}
            </View>
        )
    }

    const total = totalProporcao()
    const totalCor = total === 100 ? Colors.success : total > 100 ? Colors.error : Colors.warning

    return (
        <View
            ref={telaRef}
            style={globalStyles.screen}
            onLayout={() => telaRef.current?.measureInWindow((_x, y) => setOffsetTopo(y))}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={offsetTopo}
            >
                {loading ? (
                    <View style={[globalStyles.center, { flex: 1 }]}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={listaRef}
                        style={{ flex: 1 }}
                        data={ingredientesFiltrados}
                        keyExtractor={item => item.id}
                        renderItem={renderIngrediente}
                        contentContainerStyle={styles.lista}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        onScrollToIndexFailed={info => {
                            // Item ainda não medido (cards têm alturas diferentes): rolagem aproximada
                            listaRef.current?.scrollToOffset({
                                offset: info.averageItemLength * info.index,
                                animated: true,
                            })
                        }}
                        ListHeaderComponent={
                            <View style={styles.headerFixo}>
                                <BackButton />

                                <View style={styles.stepIndicator}>
                                    {[1, 2, 3, 4].map((step, index) => (
                                        <View key={step} style={{ flexDirection: 'row', alignItems: 'center', flex: index < 3 ? 1 : 0 }}>
                                            <View style={step < 3 ? styles.stepConcluido : step === 3 ? styles.stepAtivo : styles.stepInativo}>
                                                <Text style={step < 3 ? styles.stepNumeroConcluido : step === 3 ? styles.stepNumeroAtivo : styles.stepNumeroInativo}>
                                                    {step < 3 ? '✓' : step}
                                                </Text>
                                            </View>
                                            {index < 3 && <View style={[styles.stepLinha, step < 3 && styles.stepLinhaAtiva]} />}
                                        </View>
                                    ))}
                                </View>

                                <Text style={globalStyles.pageTitle}>Ingredientes</Text>
                                <Text style={[globalStyles.pageSubtitle, { marginBottom: Spacing.md }]}>
                                    Passo 3 de 4 — Selecione e configure os ingredientes
                                </Text>

                                {selecionados.length > 0 && (
                                    <View style={[styles.totalBanner, { backgroundColor: totalCor + '20', borderColor: totalCor }]}>
                                        <Text style={[styles.totalTexto, { color: totalCor }]}>
                                            Total: {total.toFixed(1)}% {total === 100 ? '✓' : total > 100 ? '(excedido)' : `(faltam ${(100 - total).toFixed(1)}%)`}
                                        </Text>
                                    </View>
                                )}

                                {selecionados.length > 0 && (
                                    <View style={styles.selecionadosBloco}>
                                        <Text style={styles.selecionadosTitulo}>Selecionados</Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.selecionadosLista}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {selecionados.map(s => {
                                                const pct = parsearNumero(s.proporcao_pct)
                                                const pendente = pct <= 0
                                                return (
                                                    <TouchableOpacity
                                                        key={s.ingrediente.id}
                                                        style={[styles.chipSelecionado, pendente && styles.chipPendente]}
                                                        onPress={() => irParaIngrediente(s.ingrediente.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.chipSelecionadoTexto} numberOfLines={1}>
                                                            {s.ingrediente.nome} · {pendente ? '—' : `${s.proporcao_pct}%`}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                <View style={styles.filtros}>
                                    <SearchBar value={busca} onChange={setBusca} placeholder="Buscar ingrediente..." />
                                    <FilterChips chips={TIPO_CHIPS} selecionado={filtroTipo} onChange={setFiltroTipo} />
                                </View>
                            </View>
                        }
                    />
                )}

                {selecionados.length > 0 && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[globalStyles.buttonPrimary, total !== 100 && globalStyles.buttonDisabled]}
                            onPress={handleProximo}
                            activeOpacity={0.8}
                        >
                            <Text style={globalStyles.buttonPrimaryText}>
                                Ver resultado ({selecionados.length} ingrediente{selecionados.length !== 1 ? 's' : ''})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            <CentralModal
                visible={modal.visible}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={() => setModal({ ...modal, visible: false })}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    headerFixo: {
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    stepAtivo: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    stepConcluido: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
    stepInativo: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.gray[200], justifyContent: 'center', alignItems: 'center' },
    stepNumeroAtivo: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm },
    stepNumeroConcluido: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm },
    stepNumeroInativo: { color: Colors.gray[500], fontWeight: 'bold', fontSize: FontSize.sm },
    stepLinha: { flex: 1, height: 2, backgroundColor: Colors.gray[200] },
    stepLinhaAtiva: { backgroundColor: Colors.success },
    totalBanner: {
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        alignItems: 'center',
    },
    totalTexto: {
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
    filtros: {
        gap: Spacing.sm,
    },
    lista: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.gray[200],
        overflow: 'hidden',
    },
    cardSelecionado: {
        borderColor: Colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    cardInfo: { flex: 1 },
    cardNome: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.black },
    cardTipo: { fontSize: FontSize.xs, color: Colors.gray[500], marginTop: 2 },
    checkbox: {
        width: 24, height: 24, borderRadius: 12,
        borderWidth: 2, borderColor: Colors.gray[300],
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxAtivo: {
        backgroundColor: Colors.primary, borderColor: Colors.primary,
    },
    cardConfig: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    divisor: { height: 1, backgroundColor: Colors.gray[200], marginBottom: Spacing.md },
    configLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray[600], marginBottom: Spacing.xs },
    tipoOptions: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
    tipoChip: {
        paddingHorizontal: Spacing.sm, paddingVertical: 4,
        borderRadius: BorderRadius.full, borderWidth: 1.5,
        borderColor: Colors.gray[300], backgroundColor: Colors.white,
    },
    tipoChipAtivo: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tipoChipText: { fontSize: FontSize.xs, color: Colors.gray[700], fontWeight: '600' },
    tipoChipTextAtivo: { color: Colors.white },
    configRow: { flexDirection: 'row', gap: Spacing.sm },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray[200],
    },
    selecionadosBloco: {
        marginBottom: Spacing.sm,
    },
    selecionadosTitulo: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: Colors.gray[600],
        marginBottom: Spacing.xs,
    },
    selecionadosLista: {
        gap: Spacing.xs,
    },
    chipSelecionado: {
        maxWidth: 220,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '15',
    },
    chipPendente: {
        borderColor: Colors.warning,
        backgroundColor: Colors.warning + '20',
    },
    chipSelecionadoTexto: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: Colors.black,
    },
})