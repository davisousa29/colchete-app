import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Colors, FontSize, Spacing } from '@/src/constants'
import { loginComGoogle } from '@/src/services/authService'
import { useAuthStore } from '@/src/store/authStore'
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth'
import GoogleButton from './GoogleButton'

interface Props {
    texto?: string
    onErro: (mensagem: string) => void
}

/**
 * Separador "ou" + botão "Entrar com Google", com todo o fluxo do Google.
 * As telas só montam este componente quando GOOGLE_LOGIN_HABILITADO = true:
 * assim o hook do Google (que exige os IDs de cliente) nunca roda desligado.
 */
export default function GoogleLoginSection({ texto, onErro }: Props) {
    const { setUser } = useAuthStore()
    const [carregando, setCarregando] = useState(false)

    const { pronto, login } = useGoogleAuth(async (accessToken) => {
        setCarregando(true)
        try {
            const resposta = await loginComGoogle(accessToken)
            await setUser(resposta.user, resposta.token)

            router.replace(resposta.cadastro_completo ? '/consultor/home' : '/auth/completar-cadastro' as any)
        } catch (error: any) {
            onErro(error.response?.data?.message || 'Erro ao entrar com Google.')
        } finally {
            setCarregando(false)
        }
    })

    return (
        <>
            <View style={styles.separador}>
                <View style={styles.linha} />
                <Text style={styles.separadorTexto}>ou</Text>
                <View style={styles.linha} />
            </View>

            <GoogleButton
                onPress={login}
                loading={carregando}
                disabled={!pronto}
                texto={texto}
            />
        </>
    )
}

const styles = StyleSheet.create({
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