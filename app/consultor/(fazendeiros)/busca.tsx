import { useState, useCallback, useRef, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Linking,
    Image,
} from 'react-native'
import { router } from 'expo-router'
import { Search, MapPin, ChevronRight } from 'lucide-react-native'
import { buscarFazendeiros } from '@/src/services/buscaService'
import BackButton from '@/src/components/Header/BackButton'
import { FazendeiroPublico } from '@/src/types'
import { Icons } from '@/src/constants/icons'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'

const ESTADOS = [
    'Todos','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
    'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
    'RS','RO','RR','SC','SP','SE','TO',
]

const MIN_CARACTERES = 2
const DEBOUNCE_MS = 400

export default function BuscaScreen() {
    const [username, setUsername] = useState('')
    const [estadoSelecionado, setEstadoSelecionado] = useState('Todos')
    const [fazendeiros, setFazendeiros] = useState<FazendeiroPublico[]>([])
    const [loading, setLoading] = useState(false)
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [buscou, setBuscou] = useState(false)
    const [avisoMinimo, setAvisoMinimo] = useState(false)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Verifica se há critério válido para buscar
    function temCriterioValido(user: string, estado: string): boolean {
        return user.trim().length >= MIN_CARACTERES || estado !== 'Todos'
    }

    async function buscar(novaPagina = 1, userParam?: string, estadoParam?: string) {
        const user = userParam !== undefined ? userParam : username
        const estado = estadoParam !== undefined ? estadoParam : estadoSelecionado

        if (!temCriterioValido(user, estado)) {
            setAvisoMinimo(user.trim().length > 0 && user.trim().length < MIN_CARACTERES)
            setFazendeiros([])
            setBuscou(false)
            return
        }

        setAvisoMinimo(false)
        setLoading(true)
        try {
            const resultado = await buscarFazendeiros({
                username: user.trim().length >= MIN_CARACTERES ? user.trim() : undefined,
                estado: estado !== 'Todos' ? estado : undefined,
                page: novaPagina,
            })
            if (novaPagina === 1) {
                setFazendeiros(resultado.data)
            } else {
                setFazendeiros(prev => [...prev, ...resultado.data])
            }
            setPagina(novaPagina)
            setTotalPaginas(resultado.meta.last_page)
            setBuscou(true)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    // Debounce na busca por username
    function handleChangeUsername(texto: string) {
        setUsername(texto)

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        // Se apagou tudo e não tem estado, limpa resultados
        if (texto.trim().length === 0 && estadoSelecionado === 'Todos') {
            setFazendeiros([])
            setBuscou(false)
            setAvisoMinimo(false)
            return
        }

        // Mostra aviso se tem 1 caractere só
        if (texto.trim().length > 0 && texto.trim().length < MIN_CARACTERES) {
            setAvisoMinimo(true)
            return
        }

        setAvisoMinimo(false)

        debounceRef.current = setTimeout(() => {
            buscar(1, texto, estadoSelecionado)
        }, DEBOUNCE_MS)
    }

    // Selecionar estado dispara busca imediata
    function handleSelecionarEstado(estado: string) {
        setEstadoSelecionado(estado)

        // Se voltou para "Todos" e não tem username válido, limpa
        if (estado === 'Todos' && username.trim().length < MIN_CARACTERES) {
            setFazendeiros([])
            setBuscou(false)
            return
        }

        buscar(1, username, estado)
    }

    // Limpa o timeout ao desmontar
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    function carregarMais() {
        if (pagina < totalPaginas && !loading) {
            buscar(pagina + 1)
        }
    }

    function renderFazendeiro({ item }: { item: FazendeiroPublico }) {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/consultor/fazendeiro/${item.username}` as any)}
                activeOpacity={0.8}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome}>{item.name}</Text>
                    <Text style={styles.cardUsername}>@{item.username}</Text>

                    {item.localizacao.cidade && (
                        <View style={styles.cardRow}>
                            <MapPin size={12} color={Colors.gray[500]} />
                            <Text style={styles.cardLocal}>
                                {item.localizacao.cidade} — {item.localizacao.estado}
                            </Text>
                        </View>
                    )}

                    {item.fazendas.length > 0 && (
                        <Text style={styles.cardFazendas}>
                            {item.fazendas.length} fazenda{item.fazendas.length > 1 ? 's' : ''} cadastrada{item.fazendas.length > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>

                <ChevronRight size={18} color={Colors.gray[400]} />
            </TouchableOpacity>
        )
    }

    return (
        <View style={globalStyles.screen}>

            <View style={globalStyles.backButtonContainer}>
                <BackButton />
            </View>

            {/* Cabeçalho */}
            <View style={styles.header}>
                <Text style={globalStyles.pageTitle}>Buscar Fazendeiros</Text>
                <Text style={globalStyles.pageSubtitle}>
                    Encontre fazendeiros pelo @ ou estado
                </Text>
            </View>

            {/* Filtros */}
            <View style={styles.filtros}>

                <View style={styles.searchContainer}>
                    <Search size={18} color={Colors.gray[400]} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por @usuario"
                        placeholderTextColor={Colors.gray[400]}
                        value={username}
                        onChangeText={handleChangeUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {username.length > 0 && (
                        <TouchableOpacity onPress={() => handleChangeUsername('')}>
                            <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Aviso de mínimo de caracteres */}
                {avisoMinimo && (
                    <Text style={styles.avisoMinimo}>
                        Digite ao menos {MIN_CARACTERES} caracteres para buscar
                    </Text>
                )}

                <View style={styles.estadoContainer}>
                    <FlatList
                        data={ESTADOS}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item}
                        contentContainerStyle={{ gap: Spacing.xs }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.estadoChip,
                                    estadoSelecionado === item && styles.estadoChipAtivo,
                                ]}
                                onPress={() => handleSelecionarEstado(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.estadoChipText,
                                    estadoSelecionado === item && styles.estadoChipTextAtivo,
                                ]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>

            {/* Resultados */}
            <FlatList
                data={fazendeiros}
                keyExtractor={item => item.id}
                renderItem={renderFazendeiro}
                contentContainerStyle={styles.lista}
                showsVerticalScrollIndicator={false}
                onEndReached={carregarMais}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    loading && pagina === 1 ? (
                        <View style={styles.vazio}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : buscou && !loading ? (
                        <View style={styles.vazio}>
                            <Icons.circleAlert size={40} color="#FF0000" />
                            <Text style={styles.vazioTexto}>Nenhum fazendeiro encontrado</Text>
                            <Text style={styles.vazioSubtexto}>Tente buscar por outro @ ou estado</Text>
                        </View>
                    ) : !buscou ? (
                        <View style={styles.vazio}>
                            <Image
                                source={require('@/assets/png-files/chapeu_fazendeiro.png')}
                                style={{ width: 100, height: 100 }}
                            />
                            <Text style={styles.vazioTexto}>Busque fazendeiros</Text>
                            <Text style={styles.vazioSubtexto}>Use o campo acima para encontrar fazendeiros disponíveis</Text>
                        </View>
                    ) : undefined
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
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    filtros: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: Spacing.sm,
        fontSize: FontSize.md,
        color: Colors.black,
    },
    clearText: {
        color: Colors.gray[400],
        fontSize: FontSize.md,
        paddingHorizontal: 4,
    },
    avisoMinimo: {
        fontSize: FontSize.xs,
        color: Colors.warning,
        marginLeft: Spacing.xs,
    },
    estadoContainer: {
        marginHorizontal: -Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    estadoChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        backgroundColor: Colors.white,
        minWidth: 44,
        alignItems: 'center',
    },
    estadoChipAtivo: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    estadoChipText: {
        fontSize: FontSize.xs,
        color: Colors.gray[700],
        fontWeight: '600',
    },
    estadoChipTextAtivo: {
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
        alignItems: 'center',
        gap: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: Colors.white,
        fontSize: FontSize.xl,
        fontWeight: 'bold',
    },
    cardInfo: {
        flex: 1,
        gap: 2,
    },
    cardNome: {
        fontSize: FontSize.md,
        fontWeight: 'bold',
        color: Colors.black,
    },
    cardUsername: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    cardLocal: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
    },
    cardFazendas: {
        fontSize: FontSize.xs,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 2,
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