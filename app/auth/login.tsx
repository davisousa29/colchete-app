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
import { login } from '@/src/services/authService'
import { useAuthStore } from '@/src/store/authStore'
import { Colors, FontSize, Spacing } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { GOOGLE_LOGIN_HABILITADO } from '@/src/constants/features'
import BackHeader from '@/src/components/Header/BackHeader'
import CentralModal from '@/src/components/Modal/CentralModal'
import PasswordInput from '@/src/components/Input/PasswordInput'
import GoogleLoginSection from '@/src/components/Auth/GoogleLoginSection'

export default function Login() {
    const { setUser } = useAuthStore()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [modal, setModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'default' as 'default' | 'success' | 'error',
    })

    function mostrarErro(message: string) {
        setModal({ visible: true, title: 'Erro', message, type: 'error' })
    }

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

            mostrarErro(message)
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
                        <Text style={styles.esqueciSenha}>Esqueci minha senha</Text>
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

                    {/* Só monta quando ligado: desligado, nada do Google roda */}
                    {GOOGLE_LOGIN_HABILITADO && <GoogleLoginSection onErro={mostrarErro} />}

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
    form: {
        gap: Spacing.md,
    },
    esqueciSenha: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: '600',
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