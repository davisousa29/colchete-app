import { useState, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { LockKeyhole } from 'lucide-react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { SITE_LINK_HABILITADO } from '@/src/constants/features'
import { getSubscriptionStatus } from '@/src/services/subscriptionService'
import { logout } from '@/src/services/authService'
import { useAuthStore } from '@/src/store/authStore'
import AvisoContaSite from '@/src/components/Subscription/AvisoContaSite'
import { abrirSite } from '@/src/utils/site'
import { toastInfo } from '@/src/utils/toast'

export default function AssinaturaExpirada() {
    const { clearUser } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [verificando, setVerificando] = useState(false)

    useFocusEffect(
        useCallback(() => {
            verificar(false)
        }, [])
    )

    // aoTocar = a pessoa tocou em "Já renovei": avisa se ainda não encontrou
    async function verificar(aoTocar: boolean) {
        if (aoTocar) setVerificando(true)
        try {
            const s = await getSubscriptionStatus()
            // A assinatura voltou a ficar ativa (renovada no site): volta para a home
            if (s.is_active) {
                router.replace('/consultor/home')
                return
            }
            if (aoTocar) {
                toastInfo('Ainda não encontramos a renovação. Se você acabou de pagar, aguarde alguns instantes e tente de novo.')
            }
        } catch {
            // silencioso
        } finally {
            setLoading(false)
            setVerificando(false)
        }
    }

    async function handleSair() {
        await logout()
        clearUser()
        router.replace('/auth/welcome')
    }

    if (loading) {
        return (
            <View style={[globalStyles.screen, globalStyles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        )
    }

    return (
        <View style={[globalStyles.screen, styles.container]}>
            <View style={styles.icone}>
                <LockKeyhole size={40} color={Colors.error} />
            </View>

            <Text style={styles.titulo}>Sua assinatura expirou</Text>

            <View style={styles.aviso}>
                <AvisoContaSite />
            </View>

            <View style={styles.avisoDados}>
                <Text style={styles.avisoTexto}>
                    Seus dados estão protegidos e serão mantidos por um período. Renove para não perder
                    nenhuma informação.
                </Text>
            </View>

            {SITE_LINK_HABILITADO && (
                <TouchableOpacity
                    style={[globalStyles.buttonPrimary, styles.botaoLargo]}
                    onPress={() => abrirSite('/assinatura')}
                    activeOpacity={0.8}
                >
                    <Text style={globalStyles.buttonPrimaryText}>Acessar minha conta no site</Text>
                </TouchableOpacity>
            )}

            {/* Quem renovou no site volta aqui e confere, sem sair e entrar de novo */}
            <TouchableOpacity
                style={[globalStyles.buttonSecondary, styles.botaoLargo, verificando && globalStyles.buttonDisabled]}
                onPress={() => verificar(true)}
                disabled={verificando}
                activeOpacity={0.8}
            >
                {verificando ? (
                    <ActivityIndicator color={Colors.primary} />
                ) : (
                    <Text style={globalStyles.buttonSecondaryText}>Já renovei</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoSair} onPress={handleSair} activeOpacity={0.7}>
                <Text style={styles.botaoSairTexto}>Sair da conta</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    icone: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FDE8E8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    titulo: {
        fontSize: FontSize.xxl,
        fontWeight: 'bold',
        color: Colors.black,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    aviso: {
        marginBottom: Spacing.lg,
    },
    avisoDados: {
        backgroundColor: '#FFF9DB',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
    },
    avisoTexto: {
        fontSize: FontSize.sm,
        color: '#8D6E15',
        textAlign: 'center',
        lineHeight: 20,
    },
    botaoLargo: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    botaoSair: {
        paddingVertical: Spacing.sm,
    },
    botaoSairTexto: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
        fontWeight: '600',
    },
})
