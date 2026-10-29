import { useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { router } from 'expo-router'
import { TriangleAlert } from 'lucide-react-native'
import { BorderRadius, Colors, FontSize, Spacing } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import PasswordInput from '@/src/components/Input/PasswordInput'
import { excluirConta } from '@/src/services/contaService'
import { useAuthStore } from '@/src/store/authStore'

interface Props {
    visible: boolean
    onClose: () => void
}

// Confirmação da exclusão de conta: explica o que será apagado e pede a senha
export default function ExcluirContaModal({ visible, onClose }: Props) {
    const [senha, setSenha] = useState('')
    const [excluindo, setExcluindo] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [excluida, setExcluida] = useState(false)

    function fechar() {
        if (excluindo) return
        setSenha('')
        setErro(null)
        onClose()
    }

    async function handleExcluir() {
        if (!senha) {
            setErro('Digite sua senha para confirmar.')
            return
        }

        setExcluindo(true)
        setErro(null)
        try {
            await excluirConta(senha)
            setExcluida(true)
        } catch (error: any) {
            const status = error.response?.status
            setErro(
                status === 429
                    ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
                    : error.response?.data?.message || 'Não foi possível excluir a conta. Tente novamente.'
            )
            setSenha('')
        } finally {
            setExcluindo(false)
        }
    }

    // A conta já não existe: limpa a sessão local e volta ao login
    async function concluir() {
        await useAuthStore.getState().clearUser()
        setExcluida(false)
        setSenha('')
        onClose()
        router.replace('/auth/login')
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={excluida ? concluir : fechar}>
            <KeyboardAvoidingView
                style={styles.fundo}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.caixa}>
                    {excluida ? (
                        <>
                            <Text style={styles.titulo}>Conta excluída</Text>
                            <Text style={styles.texto}>
                                Sua conta e seus dados foram excluídos. Enviamos uma confirmação para o seu email.
                            </Text>
                            <TouchableOpacity style={globalStyles.buttonPrimary} onPress={concluir} activeOpacity={0.8}>
                                <Text style={globalStyles.buttonPrimaryText}>Fechar</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.conteudo}>
                            <View style={styles.icone}>
                                <TriangleAlert size={28} color={Colors.error} />
                            </View>

                            <Text style={styles.titulo}>Excluir conta</Text>
                            <Text style={styles.texto}>
                                Esta ação é <Text style={styles.negrito}>definitiva</Text> e não pode ser desfeita. Serão apagados:
                            </Text>

                            <View style={styles.lista}>
                                <Text style={styles.item}>• seus dados de cadastro e seu perfil;</Text>
                                <Text style={styles.item}>• fazendas, contratos, formulações e projeções;</Text>
                                <Text style={styles.item}>• sua assinatura, incluindo o tempo de acesso restante;</Text>
                                <Text style={styles.item}>• cobranças PIX em aberto (serão canceladas).</Text>
                            </View>

                            <Text style={styles.textoPequeno}>
                                Registros de pagamentos já feitos são mantidos sem vínculo com você, como exige a lei.
                            </Text>

                            <PasswordInput
                                label="Digite sua senha para confirmar"
                                value={senha}
                                onChangeText={setSenha}
                                placeholder="Sua senha"
                            />

                            {erro && <Text style={styles.erro}>{erro}</Text>}

                            <TouchableOpacity
                                style={[styles.botaoExcluir, excluindo && globalStyles.buttonDisabled]}
                                onPress={handleExcluir}
                                disabled={excluindo}
                                activeOpacity={0.8}
                            >
                                {excluindo ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.botaoExcluirTexto}>Excluir minha conta</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={fechar} disabled={excluindo} style={styles.cancelar}>
                                <Text style={styles.cancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    fundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    caixa: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        maxHeight: '90%',
        gap: Spacing.md,
    },
    conteudo: {
        gap: Spacing.md,
    },
    icone: {
        alignSelf: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titulo: {
        fontSize: FontSize.xl,
        fontWeight: 'bold',
        color: Colors.black,
        textAlign: 'center',
    },
    texto: {
        fontSize: FontSize.md,
        color: Colors.gray[700],
        lineHeight: 22,
    },
    negrito: {
        fontWeight: 'bold',
    },
    lista: {
        gap: 4,
    },
    item: {
        fontSize: FontSize.sm,
        color: Colors.gray[700],
        lineHeight: 20,
    },
    textoPequeno: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
    },
    erro: {
        color: Colors.error,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },
    botaoExcluir: {
        backgroundColor: Colors.error,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    botaoExcluirTexto: {
        color: Colors.white,
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
    cancelar: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    cancelarTexto: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
    },
})