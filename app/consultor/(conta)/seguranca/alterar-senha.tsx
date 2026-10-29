import { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { Colors, Spacing } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackButton from '@/src/components/Header/BackButton'
import PasswordInput from '@/src/components/Input/PasswordInput'
import PasswordStrength from '@/src/components/Input/PasswordStrength'
import CentralModal from '@/src/components/Modal/CentralModal'
import { alterarSenha } from '@/src/services/contaService'

type ModalState = {
    visible: boolean
    title: string
    message: string
    type: 'default' | 'success' | 'error'
}

export default function AlterarSenha() {
    const [senhaAtual, setSenhaAtual] = useState('')
    const [novaSenha, setNovaSenha] = useState('')
    const [confirmacao, setConfirmacao] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [modal, setModal] = useState<ModalState>({
        visible: false,
        title: '',
        message: '',
        type: 'default',
    })

    function avisar(message: string, title = 'Atenção', type: ModalState['type'] = 'default') {
        setModal({ visible: true, title, message, type })
    }

    async function handleSalvar() {
        if (!senhaAtual || !novaSenha || !confirmacao) {
            avisar('Preencha todos os campos.')
            return
        }

        if (novaSenha !== confirmacao) {
            avisar('A confirmação não confere com a nova senha.')
            return
        }

        if (novaSenha === senhaAtual) {
            avisar('A nova senha deve ser diferente da senha atual.')
            return
        }

        setSalvando(true)
        try {
            await alterarSenha({
                senha_atual: senhaAtual,
                password: novaSenha,
                password_confirmation: confirmacao,
            })
            setSenhaAtual('')
            setNovaSenha('')
            setConfirmacao('')
            avisar('Sua senha foi alterada. Enviamos um aviso para o seu email.', 'Senha alterada', 'success')
        } catch (error: any) {
            const status = error.response?.status
            const data = error.response?.data

            if (status === 429) {
                avisar('Muitas tentativas. Aguarde alguns minutos e tente novamente.', 'Erro', 'error')
            } else if (data?.errors) {
                const firstError = Object.values(data.errors)[0] as string[]
                avisar(firstError[0], 'Erro', 'error')
            } else {
                avisar(data?.message || 'Não foi possível alterar a senha.', 'Erro', 'error')
            }
        } finally {
            setSalvando(false)
        }
    }

    function handleFecharModal() {
        const sucesso = modal.type === 'success'
        setModal(prev => ({ ...prev, visible: false }))
        if (sucesso) router.back()
    }

    return (
        <KeyboardAvoidingView
            style={globalStyles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={globalStyles.backButtonContainer}>
                <BackButton />
            </View>

            <ScrollView
                contentContainerStyle={styles.conteudo}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={globalStyles.pageTitle}>Alterar senha</Text>
                    <Text style={globalStyles.pageSubtitle}>
                        Para sua segurança, confirme a senha atual antes de escolher a nova.
                    </Text>
                </View>

                <View style={styles.form}>
                    <PasswordInput
                        label="Senha atual *"
                        value={senhaAtual}
                        onChangeText={setSenhaAtual}
                        placeholder="Sua senha atual"
                    />

                    <View>
                        <PasswordInput
                            label="Nova senha *"
                            value={novaSenha}
                            onChangeText={setNovaSenha}
                            placeholder="Mínimo 8 caracteres"
                        />
                        <PasswordStrength senha={novaSenha} />
                    </View>

                    <PasswordInput
                        label="Confirmar nova senha *"
                        value={confirmacao}
                        onChangeText={setConfirmacao}
                        placeholder="Repita a nova senha"
                    />

                    <TouchableOpacity
                        style={[globalStyles.buttonPrimary, salvando && globalStyles.buttonDisabled]}
                        onPress={handleSalvar}
                        disabled={salvando}
                        activeOpacity={0.8}
                    >
                        {salvando ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={globalStyles.buttonPrimaryText}>Alterar senha</Text>
                        )}
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
    conteudo: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    header: {
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    form: {
        gap: Spacing.md,
    },
})