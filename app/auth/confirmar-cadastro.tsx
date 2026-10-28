import { useState, useEffect, useRef } from 'react'
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
import { confirmarCadastro, reenviarCodigoCadastro } from '@/src/services/authService'
import { useAuthStore } from '@/src/store/authStore'
import { Colors, FontSize, Spacing, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackHeader from '@/src/components/Header/BackHeader'
import CentralModal from '@/src/components/Modal/CentralModal'

const COOLDOWN_PADRAO_SEGUNDOS = 60

type ModalState = {
    visible: boolean
    title: string
    message: string
    type: 'default' | 'success' | 'error'
    voltarAoCadastro?: boolean // ao fechar, volta para o formulário
}

export default function ConfirmarCadastro() {
    const { email, segundos: segundosParam } = useLocalSearchParams<{ email: string; segundos?: string }>()
    const { setUser } = useAuthStore()

    const [codigo, setCodigo] = useState('')
    const [segundos, setSegundos] = useState(0)
    const [confirmando, setConfirmando] = useState(false)
    const [reenviando, setReenviando] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [modal, setModal] = useState<ModalState>({
        visible: false,
        title: '',
        message: '',
        type: 'default',
    })

    // Contador de reenvio começa com o tempo informado pela API
    useEffect(() => {
        iniciarContador(Number(segundosParam) || COOLDOWN_PADRAO_SEGUNDOS)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    function iniciarContador(total: number) {
        setSegundos(total)
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => {
            setSegundos(s => {
                if (s <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current)
                    return 0
                }
                return s - 1
            })
        }, 1000)
    }

    function formatarTempo(seg: number): string {
        const min = Math.floor(seg / 60)
        const s = seg % 60
        return `${min}:${s.toString().padStart(2, '0')}`
    }

    function avisar(dados: Omit<ModalState, 'visible'>) {
        setModal({ visible: true, ...dados })
    }

    async function handleConfirmar() {
        if (codigo.length !== 6) {
            avisar({ title: 'Atenção', message: 'Digite os 6 dígitos do código.', type: 'default' })
            return
        }

        setConfirmando(true)
        try {
            const resposta = await confirmarCadastro(email as string, codigo)
            await setUser(resposta.user, resposta.token)
            avisar({ title: 'Conta criada!', message: 'Seu email foi confirmado. Bem-vindo ao Colchete!', type: 'success' })
        } catch (error: any) {
            const status = error.response?.status
            const message = error.response?.data?.message || 'Não foi possível confirmar o código.'

            // Cadastro pendente expirou (24h) ou dado ficou indisponível: refazer o formulário
            const refazer = status === 404 || message.includes('Refaça o cadastro')

            avisar({ title: 'Erro', message, type: 'error', voltarAoCadastro: refazer })
            setCodigo('')
        } finally {
            setConfirmando(false)
        }
    }

    async function handleReenviar() {
        if (segundos > 0) return

        setReenviando(true)
        try {
            const resposta = await reenviarCodigoCadastro(email as string)
            iniciarContador(resposta.segundos_para_reenvio)
            avisar({ title: 'Código reenviado', message: 'Enviamos um novo código para o seu email.', type: 'success' })
        } catch (error: any) {
            const status = error.response?.status
            const data = error.response?.data

            // Nossa regra de intervalo: a API diz quanto falta
            if (status === 429 && data?.segundos_restantes) {
                iniciarContador(data.segundos_restantes)
                return
            }

            avisar({
                title: 'Erro',
                message: data?.message || 'Erro ao reenviar o código.',
                type: 'error',
                voltarAoCadastro: status === 404,
            })
        } finally {
            setReenviando(false)
        }
    }

    function handleFecharModal() {
        const { type, voltarAoCadastro } = modal
        setModal(prev => ({ ...prev, visible: false }))

        if (type === 'success' && useAuthStore.getState().isLoggedIn) {
            router.replace('/consultor/perfil')
        } else if (voltarAoCadastro) {
            router.back()
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
                    title="Confirme seu email"
                    effectPhrase={''}
                    subtitle={`Enviamos um código de 6 dígitos para ${email}`}
                    showLogo={false}
                />

                <View style={styles.form}>
                    <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.inputLabel}>Código de verificação</Text>
                        <TextInput
                            style={styles.codigoInput}
                            placeholder="000000"
                            placeholderTextColor={Colors.gray[300]}
                            value={codigo}
                            onChangeText={text => setCodigo(text.replace(/[^0-9]/g, '').slice(0, 6))}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                            autoComplete="one-time-code"
                            textContentType="oneTimeCode"
                        />
                        <Text style={globalStyles.inputHint}>
                            O código vale por 10 minutos. Confira também a caixa de spam.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[globalStyles.buttonPrimary, confirmando && globalStyles.buttonDisabled]}
                        onPress={handleConfirmar}
                        disabled={confirmando}
                    >
                        {confirmando ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={globalStyles.buttonPrimaryText}>Confirmar</Text>
                        )}
                    </TouchableOpacity>

                    {/* Reenviar código */}
                    <View style={styles.reenviarContainer}>
                        {segundos > 0 ? (
                            <Text style={styles.reenviarTexto}>
                                Reenviar código em {formatarTempo(segundos)}
                            </Text>
                        ) : (
                            <TouchableOpacity onPress={handleReenviar} disabled={reenviando}>
                                {reenviando ? (
                                    <ActivityIndicator color={Colors.primary} size="small" />
                                ) : (
                                    <Text style={styles.reenviarLink}>Reenviar código</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity style={styles.corrigirContainer} onPress={() => router.back()}>
                        <Text style={styles.corrigirTexto}>Email errado? Voltar e corrigir</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

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
    form: {
        gap: Spacing.md,
    },
    codigoInput: {
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 12,
        color: Colors.black,
    },
    reenviarContainer: {
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    reenviarTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
    },
    reenviarLink: {
        fontSize: FontSize.sm,
        color: Colors.primary,
        fontWeight: 'bold',
    },
    corrigirContainer: {
        alignItems: 'center',
    },
    corrigirTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[600],
        textDecorationLine: 'underline',
    },
})