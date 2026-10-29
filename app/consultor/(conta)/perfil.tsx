import { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronRight, FileText, Trash2 } from 'lucide-react-native'
import { useAuthStore } from '@/src/store/authStore'
import { globalStyles } from '@/src/constants/globalStyles'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import api from '@/src/services/api'
import { getTermosVigentes, Termo, TipoTermo } from '@/src/services/termoService'
import CentralModal from '@/src/components/Modal/CentralModal'
import BackHeader from '@/src/components/Header/BackHeader'
import MaskedInput from '@/src/components/Input/MaskedInput'
import TermoModal from '@/src/components/Termos/TermoModal'
import ExcluirContaModal from '@/src/components/Conta/ExcluirContaModal'
import { ESPECIALIZACOES, ESTADOS } from '@/src/constants/options'
import { dataMask, phoneMask } from '@/src/utils/masks'
import {
    calcularIdade,
    digitosParaDataIso,
    formatarDataBr,
    IDADE_MINIMA_CADASTRO,
} from '@/src/utils/datas'

type ModalState = {
    visible: boolean
    title: string
    message: string
    type: 'default' | 'success' | 'error'
}

function formatarCpf(cpf?: string | null): string {
    if (!cpf) return '—'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Linha somente leitura (dados de identificação que não mudam pelo app)
function CampoLeitura({ label, valor, dica }: { label: string; valor: string; dica?: string }) {
    return (
        <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>{label}</Text>
            <View style={styles.campoLeitura}>
                <Text style={styles.campoLeituraTexto}>{valor}</Text>
            </View>
            {dica && <Text style={globalStyles.inputHint}>{dica}</Text>}
        </View>
    )
}

export default function Perfil() {
    // boasVindas=1 → aberto logo após o cadastro ("Quase lá!")
    const { boasVindas } = useLocalSearchParams<{ boasVindas?: string }>()
    const modoBoasVindas = boasVindas === '1'

    const { user, setUser, setProfile } = useAuthStore()

    // ── Dados pessoais ────────────────────────────────────────────────────────
    const [nome, setNome] = useState(user?.name ?? '')
    const [telefone, setTelefone] = useState(user?.phone ?? '')
    const [whatsapp, setWhatsapp] = useState(user?.whatsapp ?? '')
    const [dataNascimento, setDataNascimento] = useState('') // dígitos; só usado se ainda estiver vazia

    // ── Perfil profissional ───────────────────────────────────────────────────
    const [crea, setCrea] = useState('')
    const [especializacao, setEspecializacao] = useState('')
    const [especializacaoCustom, setEspecializacaoCustom] = useState('')
    const [bio, setBio] = useState('')
    const [estado, setEstado] = useState('')
    const [cidade, setCidade] = useState('')

    const [loading, setLoading] = useState(false)
    const [loadingPerfil, setLoadingPerfil] = useState(true)
    const [modal, setModal] = useState<ModalState>({
        visible: false,
        title: '',
        message: '',
        type: 'default',
    })

    const [cidades, setCidades] = useState<string[]>([])
    const [cidadesFiltradas, setCidadesFiltradas] = useState<string[]>([])
    const [loadingCidades, setLoadingCidades] = useState(false)
    const [cidadeValida, setCidadeValida] = useState(false)

    // ── Documentos e exclusão ─────────────────────────────────────────────────
    const [termoAberto, setTermoAberto] = useState<Termo | null>(null)
    const [carregandoTermo, setCarregandoTermo] = useState<TipoTermo | null>(null)
    const [excluirVisivel, setExcluirVisivel] = useState(false)

    function avisar(message: string, title = 'Atenção', type: ModalState['type'] = 'default') {
        setModal({ visible: true, title, message, type })
    }

    // ── Carrega usuário e perfil ──────────────────────────────────────────────
    useEffect(() => {
        async function fetchPerfil() {
            try {
                const response = await api.get('/perfil')
                const usuario = response.data.user
                const perfil = response.data.perfil

                if (usuario) {
                    setNome(usuario.name ?? '')
                    setTelefone(usuario.phone ?? '')
                    setWhatsapp(usuario.whatsapp ?? '')
                }

                if (perfil) {
                    setCrea(perfil.crea_number ?? '')
                    setBio(perfil.bio ?? '')
                    setEstado(perfil.location_state ?? '')
                    setCidade(perfil.location_city ?? '')
                    setCidadeValida(!!perfil.location_city)

                    const spec = perfil.specialization ?? ''
                    if (ESPECIALIZACOES.includes(spec)) {
                        setEspecializacao(spec)
                    } else if (spec) {
                        setEspecializacao('Outro')
                        setEspecializacaoCustom(spec)
                    }
                }
            } catch (error: any) {
                avisar(error.response?.data?.message || 'Não foi possível carregar o perfil.', 'Erro', 'error')
            } finally {
                setLoadingPerfil(false)
            }
        }

        fetchPerfil()
    }, [])

    // ── Busca cidades pelo estado selecionado ─────────────────────────────────
    useEffect(() => {
        if (!estado) return

        const cidadeAtual = cidade
        setCidadesFiltradas([])

        async function fetchCidades() {
            setLoadingCidades(true)
            try {
                const response = await fetch(
                    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`
                )
                const data = await response.json()
                const nomes = data.map((item: any) => item.nome)
                setCidades(nomes)

                if (cidadeAtual && nomes.includes(cidadeAtual)) {
                    setCidade(cidadeAtual)
                    setCidadeValida(true)
                } else {
                    setCidade('')
                    setCidadeValida(false)
                }
            } catch {
                avisar('Não foi possível carregar as cidades.', 'Aviso', 'error')
            } finally {
                setLoadingCidades(false)
            }
        }

        fetchCidades()
    }, [estado])

    // ── Filtra sugestões de cidade conforme digitação ─────────────────────────
    useEffect(() => {
        if (!cidade || cidadeValida) {
            setCidadesFiltradas([])
            return
        }

        const filtradas = cidades.filter((c) =>
            c.toLowerCase().includes(cidade.toLowerCase())
        )
        setCidadesFiltradas(filtradas.slice(0, 10))
    }, [cidade, cidades])

    // ── Abre Termos de Uso ou Política de Privacidade ─────────────────────────
    async function abrirTermo(tipo: TipoTermo) {
        setCarregandoTermo(tipo)
        try {
            const termos = await getTermosVigentes()
            const termo = termos.find(t => t.tipo === tipo)
            if (termo) setTermoAberto(termo)
        } catch {
            avisar('Não foi possível carregar o documento.', 'Erro', 'error')
        } finally {
            setCarregandoTermo(null)
        }
    }

    // ── Salva ─────────────────────────────────────────────────────────────────
    async function handleSalvar() {
        if (nome.trim().length < 3) {
            avisar('Informe seu nome completo.')
            return
        }

        if (telefone && telefone.length !== 11) {
            avisar('O telefone deve ter DDD + 9 dígitos.')
            return
        }

        if (whatsapp && whatsapp.length !== 11) {
            avisar('O WhatsApp deve ter DDD + 9 dígitos.')
            return
        }

        let dataIso: string | null = null
        if (!user?.data_nascimento && dataNascimento) {
            dataIso = digitosParaDataIso(dataNascimento)
            if (!dataIso) {
                avisar('Informe uma data de nascimento válida (DD/MM/AAAA).')
                return
            }
            if (calcularIdade(dataIso) < IDADE_MINIMA_CADASTRO) {
                avisar(`É preciso ter pelo menos ${IDADE_MINIMA_CADASTRO} anos.`)
                return
            }
        }

        if (!especializacao) {
            avisar('Selecione uma especialização.')
            return
        }

        if (especializacao === 'Outro' && !especializacaoCustom.trim()) {
            avisar('Digite sua especialização.')
            return
        }

        if (!cidadeValida) {
            avisar('Selecione uma cidade válida da lista.')
            return
        }

        setLoading(true)
        try {
            const response = await api.post('/perfil', {
                name: nome.trim(),
                phone: telefone || null,
                whatsapp: whatsapp || null,
                ...(dataIso ? { data_nascimento: dataIso } : {}),
                crea_number: crea,
                specialization: especializacao === 'Outro' ? especializacaoCustom.trim() : especializacao,
                bio,
                location_state: estado,
                location_city: cidade,
            })

            // Atualiza a sessão com o usuário e o perfil salvos
            const token = useAuthStore.getState().token
            if (token) await setUser(response.data.user, token)
            await setProfile(response.data.perfil)
            setDataNascimento('')

            avisar('Perfil salvo com sucesso!', 'Sucesso', 'success')
        } catch (error: any) {
            const errors = error.response?.data?.errors

            if (errors) {
                const firstError = Object.values(errors)[0] as string[]
                avisar(firstError[0], 'Erro', 'error')
            } else {
                avisar(error.response?.data?.message || 'Erro ao salvar perfil.', 'Erro', 'error')
            }
        } finally {
            setLoading(false)
        }
    }

    function handleFecharModal() {
        const sucesso = modal.type === 'success'
        setModal(prev => ({ ...prev, visible: false }))

        // Depois do cadastro, salvar leva ao início
        if (sucesso && modoBoasVindas) {
            router.replace('/consultor/home')
        }
    }

    if (loadingPerfil) {
        return (
            <View style={[globalStyles.screen, globalStyles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        )
    }

    const dataNascimentoSalva = user?.data_nascimento

    return (
        <KeyboardAvoidingView
            style={globalStyles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={globalStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {modoBoasVindas ? (
                    <BackHeader
                        title={<Text style={styles.step}>Quase lá!</Text>}
                        effectPhrase={<Text style={styles.title}>Complete seu perfil</Text>}
                        subtitle={
                            <Text style={styles.subtitle}>
                                Essas informações ajudam os fazendeiros a te encontrarem
                            </Text>
                        }
                        showLogo={false}
                    />
                ) : (
                    <BackHeader
                        title="Meu perfil"
                        effectPhrase={''}
                        subtitle="Seus dados de cadastro e perfil profissional"
                        showLogo={false}
                    />
                )}

                <View style={styles.form}>

                    {/* ── Dados da conta ─────────────────────────────────── */}
                    <Text style={styles.secao}>Dados da conta</Text>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Nome completo *</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="Seu nome completo"
                            placeholderTextColor={Colors.gray[400]}
                            value={nome}
                            onChangeText={setNome}
                            autoCapitalize="words"
                        />
                    </View>

                    <CampoLeitura label="Email" valor={user?.email ?? '—'} />
                    <CampoLeitura label="CPF" valor={formatarCpf(user?.cpf)} />
                    <CampoLeitura label="Nome de usuário" valor={user?.username ? `@${user.username}` : '—'} />

                    {dataNascimentoSalva ? (
                        <CampoLeitura label="Data de nascimento" valor={formatarDataBr(dataNascimentoSalva)} />
                    ) : (
                        <MaskedInput
                            label="Data de nascimento"
                            value={dataNascimento}
                            onChange={setDataNascimento}
                            placeholder="DD/MM/AAAA"
                            keyboardType="number-pad"
                            mask={dataMask}
                            hint="Pode ser informada uma única vez"
                        />
                    )}

                    <Text style={styles.dicaLeitura}>
                        Para alterar email, CPF, nome de usuário ou data de nascimento, fale com o suporte:
                        colchete.gestaodefazendas@gmail.com
                    </Text>

                    {/* ── Contato ────────────────────────────────────────── */}
                    <Text style={styles.secao}>Contato</Text>

                    <MaskedInput
                        label="Telefone"
                        value={telefone}
                        onChange={setTelefone}
                        placeholder="(62) 99999-9999"
                        keyboardType="phone-pad"
                        mask={phoneMask}
                    />

                    <MaskedInput
                        label="WhatsApp"
                        value={whatsapp}
                        onChange={setWhatsapp}
                        placeholder="(62) 99999-9999"
                        keyboardType="phone-pad"
                        mask={phoneMask}
                    />

                    {/* ── Perfil profissional ────────────────────────────── */}
                    <Text style={styles.secao}>Perfil profissional</Text>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Número do CREA</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="Ex: 12345-D/GO"
                            placeholderTextColor={Colors.gray[400]}
                            value={crea}
                            onChangeText={setCrea}
                            autoCapitalize="characters"
                        />
                        <Text style={globalStyles.inputHint}>Opcional</Text>
                    </View>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Especialização *</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chips}
                        >
                            {ESPECIALIZACOES.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.chip, especializacao === item && styles.chipSelected]}
                                    onPress={() => {
                                        setEspecializacao(item)
                                        if (item !== 'Outro') setEspecializacaoCustom('')
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, especializacao === item && styles.chipTextSelected]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {especializacao === 'Outro' && (
                        <View style={globalStyles.inputGroup}>
                            <Text style={globalStyles.inputLabel}>Qual sua especialização? *</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="Digite sua especialização"
                                placeholderTextColor={Colors.gray[400]}
                                value={especializacaoCustom}
                                onChangeText={setEspecializacaoCustom}
                            />
                        </View>
                    )}

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Bio</Text>
                        <TextInput
                            style={[globalStyles.input, styles.bioInput]}
                            placeholder="Fale um pouco sobre sua experiência..."
                            placeholderTextColor={Colors.gray[400]}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={1000}
                        />
                        <Text style={globalStyles.inputHint}>Opcional</Text>
                    </View>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Estado *</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chips}
                        >
                            {ESTADOS.map((uf) => (
                                <TouchableOpacity
                                    key={uf}
                                    style={[styles.chip, styles.chipEstado, estado === uf && styles.chipSelected]}
                                    onPress={() => setEstado(uf)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, estado === uf && styles.chipTextSelected]}>
                                        {uf}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Cidade *</Text>

                        <View style={styles.cidadeContainer}>
                            <TextInput
                                style={[globalStyles.input, { flex: 1 }, cidadeValida && styles.inputValido]}
                                placeholder={
                                    !estado
                                        ? 'Selecione um estado primeiro'
                                        : loadingCidades
                                            ? 'Carregando cidades...'
                                            : 'Digite sua cidade'
                                }
                                placeholderTextColor={Colors.gray[400]}
                                value={cidade}
                                onChangeText={(text) => {
                                    setCidade(text)
                                    setCidadeValida(false)
                                }}
                                editable={!!estado && !loadingCidades}
                                autoCapitalize="words"
                            />

                            {cidadeValida && (
                                <View style={styles.validIconContainer}>
                                    <Text style={styles.validIcon}>✓</Text>
                                </View>
                            )}
                        </View>

                        {loadingCidades && (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 4 }} />
                        )}

                        {cidadesFiltradas.length > 0 && (
                            <View style={styles.suggestions}>
                                {cidadesFiltradas.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={styles.suggestionItem}
                                        onPress={() => {
                                            setCidade(item)
                                            setCidadeValida(true)
                                            setCidadesFiltradas([])
                                        }}
                                    >
                                        <Text style={styles.suggestionText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {cidade.length > 2 && !cidadeValida && !loadingCidades && cidadesFiltradas.length === 0 && (
                            <Text style={styles.cidadeInvalida}>
                                Cidade não encontrada para o estado selecionado
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[globalStyles.buttonPrimary, loading && globalStyles.buttonDisabled]}
                        onPress={handleSalvar}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={globalStyles.buttonPrimaryText}>
                                {modoBoasVindas ? 'Salvar e continuar' : 'Salvar alterações'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {modoBoasVindas ? (
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={() => router.replace('/consultor/home')}
                        >
                            <Text style={styles.skipText}>Preencher depois</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            {/* ── Documentos ─────────────────────────────── */}
                            <Text style={styles.secao}>Documentos</Text>

                            {([
                                ['uso', 'Termos de Uso'],
                                ['privacidade', 'Política de Privacidade'],
                            ] as [TipoTermo, string][]).map(([tipo, titulo]) => (
                                <TouchableOpacity
                                    key={tipo}
                                    style={styles.linhaLink}
                                    onPress={() => abrirTermo(tipo)}
                                    disabled={carregandoTermo !== null}
                                    activeOpacity={0.7}
                                >
                                    <FileText size={18} color={Colors.primary} />
                                    <Text style={styles.linhaLinkTexto}>{titulo}</Text>
                                    {carregandoTermo === tipo ? (
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    ) : (
                                        <ChevronRight size={18} color={Colors.gray[400]} />
                                    )}
                                </TouchableOpacity>
                            ))}

                            {/* ── Excluir conta ──────────────────────────── */}
                            <Text style={styles.secao}>Excluir conta</Text>
                            <Text style={styles.dicaLeitura}>
                                Apaga definitivamente sua conta e seus dados de trabalho.
                            </Text>
                            <TouchableOpacity
                                style={styles.botaoExcluir}
                                onPress={() => setExcluirVisivel(true)}
                                activeOpacity={0.7}
                            >
                                <Trash2 size={18} color={Colors.error} />
                                <Text style={styles.botaoExcluirTexto}>Excluir minha conta</Text>
                            </TouchableOpacity>
                        </>
                    )}

                </View>
            </ScrollView>

            <TermoModal termo={termoAberto} onClose={() => setTermoAberto(null)} />

            <ExcluirContaModal visible={excluirVisivel} onClose={() => setExcluirVisivel(false)} />

            <CentralModal
                visible={modal.visible}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={handleFecharModal}
            />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    step: {
        fontSize: FontSize.sm,
        fontWeight: 'bold',
        color: Colors.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.xs,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: 'bold',
        color: Colors.black,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
        lineHeight: 22,
        textAlign: 'center',
    },
    form: {
        gap: Spacing.lg,
    },
    secao: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.black,
        marginTop: Spacing.sm,
        paddingBottom: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[200],
    },
    campoLeitura: {
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
    },
    campoLeituraTexto: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
    },
    dicaLeitura: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
        lineHeight: 18,
        marginTop: -Spacing.sm,
    },
    bioInput: {
        height: 100,
        paddingTop: Spacing.sm,
    },
    chips: {
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        backgroundColor: Colors.white,
    },
    chipEstado: {
        paddingHorizontal: Spacing.sm,
        minWidth: 44,
        alignItems: 'center',
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: FontSize.sm,
        color: Colors.gray[700],
    },
    chipTextSelected: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    cidadeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    inputValido: {
        borderColor: Colors.success,
    },
    validIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    validIcon: {
        color: Colors.white,
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
    cidadeInvalida: {
        fontSize: FontSize.xs,
        color: Colors.error,
        marginTop: 4,
    },
    suggestions: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray[300],
        borderRadius: BorderRadius.md,
        marginTop: 4,
        maxHeight: 200,
    },
    suggestionItem: {
        padding: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[200],
    },
    suggestionText: {
        fontSize: FontSize.md,
        color: Colors.black,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    skipText: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
    },
    linhaLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray[200],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        marginTop: -Spacing.sm,
    },
    linhaLinkTexto: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.black,
    },
    botaoExcluir: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1.5,
        borderColor: Colors.error,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.xl,
    },
    botaoExcluirTexto: {
        color: Colors.error,
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
})