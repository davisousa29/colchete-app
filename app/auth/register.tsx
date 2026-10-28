import { useEffect, useState } from 'react'
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
import { router } from 'expo-router'
import { Check } from 'lucide-react-native'
import { register, loginComGoogle } from '@/src/services/authService'
import { getTermosVigentes, Termo, TipoTermo } from '@/src/services/termoService'
import { useAuthStore } from '@/src/store/authStore'
import { Colors, FontSize, Spacing, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackHeader from '@/src/components/Header/BackHeader'
import MaskedInput from '@/src/components/Input/MaskedInput'
import { phoneMask, cpfMask, dataMask } from '@/src/utils/masks'
import CentralModal from '@/src/components/Modal/CentralModal'
import PasswordInput from '@/src/components/Input/PasswordInput'
import PasswordStrength from '@/src/components/Input/PasswordStrength'
import GoogleButton from '@/src/components/Auth/GoogleButton'
import TermoModal from '@/src/components/Termos/TermoModal'
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth'
import { isValidCpf } from '@/src/utils/document'
import { calcularIdade, digitosParaDataIso, IDADE_MINIMA_CADASTRO } from '@/src/utils/datas'

const GOOGLE_LOGIN_HABILITADO = false

type ModalState = {
    visible: boolean
    title: string
    message: string
    type: 'default' | 'success' | 'error'
}

export default function Register() {
    const { setUser } = useAuthStore()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [cpf, setCpf] = useState('')
    const [dataNascimento, setDataNascimento] = useState('') // só dígitos: DDMMAAAA
    const [username, setUsername] = useState('')
    const [phone, setPhone] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [loading, setLoading] = useState(false)
    const [modal, setModal] = useState<ModalState>({
        visible: false,
        title: '',
        message: '',
        type: 'default',
    })
    const [loadingGoogle, setLoadingGoogle] = useState(false)

    // ── Termos ────────────────────────────────────────────────────────────────
    const [termos, setTermos] = useState<Termo[]>([])
    const [carregandoTermos, setCarregandoTermos] = useState(true)
    const [erroTermos, setErroTermos] = useState(false)
    const [aceitouTermos, setAceitouTermos] = useState(false)
    const [termoAberto, setTermoAberto] = useState<Termo | null>(null)

    useEffect(() => {
        carregarTermos()
    }, [])

    async function carregarTermos() {
        setCarregandoTermos(true)
        setErroTermos(false)
        try {
            setTermos(await getTermosVigentes())
        } catch {
            setErroTermos(true)
        } finally {
            setCarregandoTermos(false)
        }
    }

    function abrirTermo(tipo: TipoTermo) {
        const termo = termos.find(t => t.tipo === tipo)
        if (termo) setTermoAberto(termo)
    }

    function avisar(message: string, title = 'Atenção', type: ModalState['type'] = 'default') {
        setModal({ visible: true, title, message, type })
    }

    const { pronto, login: iniciarGoogle } = useGoogleAuth(async (accessToken) => {
        setLoadingGoogle(true)
        try {
            const resposta = await loginComGoogle(accessToken)
            setUser(resposta.user, resposta.token)

            if (resposta.cadastro_completo) {
                router.replace('/consultor/home')
            } else {
                router.replace('/auth/completar-cadastro')
            }
        } catch (error: any) {
            avisar(error.response?.data?.message || 'Erro ao entrar com Google.', 'Erro', 'error')
        } finally {
            setLoadingGoogle(false)
        }
    })

    async function handleRegister() {
        if (!name || !email || !cpf || !dataNascimento || !username || !password || !passwordConfirmation) {
            avisar('Preencha todos os campos obrigatórios.')
            return
        }

        if (!isValidCpf(cpf)) {
            avisar('Informe um CPF válido.')
            return
        }

        const dataIso = digitosParaDataIso(dataNascimento)
        if (!dataIso) {
            avisar('Informe uma data de nascimento válida (DD/MM/AAAA).')
            return
        }

        if (calcularIdade(dataIso) < IDADE_MINIMA_CADASTRO) {
            avisar(`É preciso ter pelo menos ${IDADE_MINIMA_CADASTRO} anos para criar uma conta.`)
            return
        }

        if (password !== passwordConfirmation) {
            avisar('As senhas não coincidem.')
            return
        }

        if (!aceitouTermos) {
            avisar('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.')
            return
        }

        setLoading(true)
        try {
            const resposta = await register({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                cpf,
                data_nascimento: dataIso,
                username: username.trim().toLowerCase(),
                phone,
                whatsapp,
                password,
                password_confirmation: passwordConfirmation,
                aceite_termos: true,
                termos: termos.map(t => t.id),
            })

            // A conta ainda não existe: segue para a tela do código
            router.push({
                pathname: '/auth/confirmar-cadastro',
                params: {
                    email: resposta.email,
                    segundos: String(resposta.segundos_para_reenvio),
                },
            } as any)
        } catch (error: any) {
            const status = error.response?.status
            const data = error.response?.data

            if (status === 429) {
                avisar(
                    'Você atingiu o limite de tentativas de cadastro. Aguarde um pouco antes de tentar novamente.',
                    'Muitas tentativas',
                    'error'
                )
                return
            }

            // Termos publicados enquanto a pessoa preenchia: recarrega e pede nova leitura
            if (data?.code === 'termos_desatualizados') {
                setAceitouTermos(false)
                await carregarTermos()
                avisar(data.message, 'Termos atualizados')
                return
            }

            if (data?.errors) {
                const firstError = Object.values(data.errors)[0] as string[]
                avisar(firstError[0], 'Erro', 'error')
            } else {
                avisar(data?.message || 'Erro ao criar conta.', 'Erro', 'error')
            }
        } finally {
            setLoading(false)
        }
    }

    const termosDisponiveis = termos.length > 0
    const podeEnviar = !loading && aceitouTermos && termosDisponiveis

    return (
        <KeyboardAvoidingView
            style={globalStyles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={globalStyles.scrollContentLoggedOut}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <BackHeader
                    title="Criar conta"
                    effectPhrase={''}
                    subtitle="Preencha seus dados para começar"
                    showLogo={false}
                />

                {/* Formulário */}
                <View style={styles.form}>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Nome completo *</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="Seu nome completo"
                            placeholderTextColor={Colors.gray[400]}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Email *</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="seu@email.com"
                            placeholderTextColor={Colors.gray[400]}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Text style={globalStyles.inputHint}>Enviaremos um código para confirmar este email</Text>
                    </View>

                    <MaskedInput
                        label="CPF *"
                        value={cpf}
                        onChange={setCpf}
                        placeholder="000.000.000-00"
                        keyboardType="number-pad"
                        mask={cpfMask}
                    />

                    <MaskedInput
                        label="Data de nascimento *"
                        value={dataNascimento}
                        onChange={setDataNascimento}
                        placeholder="DD/MM/AAAA"
                        keyboardType="number-pad"
                        mask={dataMask}
                    />

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Nome de usuário *</Text>
                        <View style={styles.usernameContainer}>
                            <Text style={styles.usernamePrefix}>@</Text>
                            <TextInput
                                style={styles.usernameInput}
                                placeholder="seu_usuario"
                                placeholderTextColor={Colors.gray[400]}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        <Text style={globalStyles.inputHint}>Usado para que fazendeiros te encontrem</Text>
                    </View>

                    <MaskedInput
                        label="Telefone"
                        value={phone}
                        onChange={setPhone}
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

                    <View>
                        <PasswordInput
                            label="Senha *"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Mínimo 8 caracteres"
                        />
                        <PasswordStrength senha={password} />
                    </View>

                    <PasswordInput
                        label="Confirmar senha *"
                        value={passwordConfirmation}
                        onChangeText={setPasswordConfirmation}
                        placeholder="Repita sua senha"
                    />

                    {/* Aceite dos termos */}
                    {carregandoTermos ? (
                        <ActivityIndicator color={Colors.primary} />
                    ) : erroTermos ? (
                        <View style={styles.termosErro}>
                            <Text style={styles.termosErroTexto}>
                                Não foi possível carregar os termos.
                            </Text>
                            <TouchableOpacity onPress={carregarTermos}>
                                <Text style={styles.termosLink}>Tentar novamente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.termosContainer}>
                            <TouchableOpacity
                                style={[styles.checkbox, aceitouTermos && styles.checkboxMarcado]}
                                onPress={() => setAceitouTermos(v => !v)}
                                disabled={!termosDisponiveis}
                                hitSlop={8}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: aceitouTermos }}
                            >
                                {aceitouTermos && <Check size={14} color={Colors.white} strokeWidth={3} />}
                            </TouchableOpacity>
                            <Text style={styles.termosTexto}>
                                Li e aceito os{' '}
                                <Text style={styles.termosLink} onPress={() => abrirTermo('uso')}>
                                    Termos de Uso
                                </Text>
                                {' '}e a{' '}
                                <Text style={styles.termosLink} onPress={() => abrirTermo('privacidade')}>
                                    Política de Privacidade
                                </Text>
                                .
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            globalStyles.buttonPrimary,
                            !podeEnviar && globalStyles.buttonDisabled,
                        ]}
                        onPress={handleRegister}
                        disabled={!podeEnviar}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={globalStyles.buttonPrimaryText}>Criar conta</Text>
                        )}
                    </TouchableOpacity>

                    {GOOGLE_LOGIN_HABILITADO && (
                        <>
                            {/* Separador */}
                            <View style={styles.separador}>
                                <View style={styles.linha} />
                                <Text style={styles.separadorTexto}>ou</Text>
                                <View style={styles.linha} />
                            </View>

                            <GoogleButton
                                onPress={iniciarGoogle}
                                loading={loadingGoogle}
                                texto="Cadastrar com Google"
                                disabled={!pronto}
                            />
                        </>
                    )}

                </View>

                {/* Link para login */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Já tem conta? </Text>
                    <TouchableOpacity onPress={() => router.replace('/auth/login')}>
                        <Text style={styles.footerLink}>Entrar</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <TermoModal termo={termoAberto} onClose={() => setTermoAberto(null)} />

            <CentralModal
                visible={modal.visible}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={() => setModal(prev => ({ ...prev, visible: false }))}
            />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    form: {
        gap: Spacing.md,
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
    },
    usernamePrefix: {
        fontSize: FontSize.md,
        color: Colors.primary,
        fontWeight: 'bold',
        marginRight: 4,
    },
    usernameInput: {
        flex: 1,
        paddingVertical: Spacing.sm,
        fontSize: FontSize.md,
        color: Colors.black,
    },
    termosContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Colors.gray[400],
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
    },
    checkboxMarcado: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    termosTexto: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.gray[700],
        lineHeight: 20,
    },
    termosLink: {
        color: Colors.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    termosErro: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    termosErroTexto: {
        fontSize: FontSize.sm,
        color: Colors.error,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.xl,
    },
    footerText: {
        color: Colors.gray[600],
        fontSize: FontSize.sm,
    },
    footerLink: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: 'bold',
    },
    separador: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginVertical: Spacing.xs,
    },
    linha: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.gray[300],
    },
    separadorTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
    },
})