import { useState } from 'react'
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
import { login, loginComGoogle } from '@/src/services/authService'
import { useAuthStore } from '@/src/store/authStore'
import { Colors, FontSize, Spacing, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackHeader from '@/src/components/Header/BackHeader'
import CentralModal from '@/src/components/Modal/CentralModal'
import PasswordInput from '@/src/components/Input/PasswordInput'
import GoogleButton from '@/src/components/Auth/GoogleButton'
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth'

const GOOGLE_LOGIN_HABILITADO = false

export default function Login() {
    const { setUser } = useAuthStore()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)
    const [modal, setModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'default' as 'default' | 'success' | 'error',
    })

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
            setModal({
                visible: true,
                title: 'Erro',
                message: error.response?.data?.message || 'Erro ao entrar com Google.',
                type: 'error',
            })
        } finally {
            setLoadingGoogle(false)
        }
    })

    async function handleLogin() {
        if (!email || !password) {
            setModal({
                visible: true,
                title: 'Atenção',
                message: 'Preencha email e senha.',
                type: 'error',
            })
            return
        }

        setLoading(true)
        try {
            const response = await login(email.trim().toLowerCase(), password)

            if (response.requer_2fa) {
                router.push({
                    pathname: '/auth/verificar-2fa',
                    params: {
                        email: email.trim().toLowerCase(),
                        metodos: JSON.stringify(response.metodos),
                    },
                } as any)
                return
            }

            setUser(response.user, response.token)
            router.replace('/consultor/home')
        } catch (error: any) {
            let message = error.response?.data?.message || 'Erro ao fazer login.'

            if (error.response?.status === 429) {
                message = 'Muitas tentativas de login. Aguarde um instante para tentar novamente.'
            }

            setModal({
                visible: true,
                title: 'Erro',
                message,
                type: 'error',
            })
        } finally {
            setLoading(false)
        }
    }

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
                    title="Entrar"
                    effectPhrase={''}
                    subtitle="Acesse sua conta para continuar"
                    showLogo={true}
                />

                {/* Formulário */}
                <View style={styles.form}>

                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Email</Text>
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
                    </View>

                    <PasswordInput
                        label="Senha"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Sua senha"
                    />

                    <TouchableOpacity
                        onPress={() => router.push('/auth/recuperar-senha' as any)}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
                            Esqueci minha senha
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[globalStyles.buttonPrimary, loading && globalStyles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={globalStyles.buttonPrimaryText}>Entrar</Text>
                        )}
                    </TouchableOpacity>

                    {/* Separador */}
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
                                disabled={!pronto}
                            />
                        </>
                    )}

                </View>

                {/* Link para cadastro */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Ainda não tem conta? </Text>
                    <TouchableOpacity onPress={() => router.replace('/auth/register')}>
                        <Text style={styles.footerLink}>Criar conta</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <CentralModal
                visible={modal.visible}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                dismissable
                showCloseIcon
                confirmText="Fechar"
                onClose={() => setModal({ ...modal, visible: false })}
            />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        marginTop: Spacing.md,
    },
    form: {
        gap: Spacing.md,
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
})