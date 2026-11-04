import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { SITE_LINK_HABILITADO } from '@/src/constants/features'
import BackButton from '@/src/components/Header/BackButton'
import AvisoContaSite from '@/src/components/Subscription/AvisoContaSite'
import { getSubscriptionStatus, SubscriptionStatus } from '@/src/services/subscriptionService'
import { formatarDataBr } from '@/src/utils/datas'
import { abrirSite } from '@/src/utils/site'

// Nome dos planos (o status traz o identificador)
const NOME_PLANO: Record<string, string> = {
    monthly: 'Mensal',
    semiannual: 'Semestral',
    annual: 'Anual',
    courtesy: 'Cortesia',
}

interface Situacao {
    titulo: string
    descricao: string
    cor: string
}

function descreverSituacao(s: SubscriptionStatus): Situacao {
    const vence = formatarDataBr(s.expires_at)

    switch (s.status) {
        case 'lifetime':
            return { titulo: 'Acesso vitalício', descricao: 'Você tem acesso completo, sem vencimento.', cor: Colors.success }
        case 'trial':
            return { titulo: 'Teste grátis', descricao: `Termina em ${vence}.`, cor: Colors.info }
        case 'active':
            return {
                titulo: `Ativa · ${NOME_PLANO[s.plan ?? ''] ?? 'Plano pago'}`,
                descricao: `Válida até ${vence}.`,
                cor: Colors.success,
            }
        default:
            return { titulo: 'Expirada', descricao: 'Renove para retomar o acesso.', cor: Colors.error }
    }
}

/**
 * Área da assinatura no app — só leitura. Plano, pagamento e renovação ficam no site.
 */
export default function Assinatura() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(false)

    useFocusEffect(
        useCallback(() => {
            carregar()
        }, [])
    )

    async function carregar() {
        setErro(false)
        try {
            setStatus(await getSubscriptionStatus())
        } catch {
            setErro(true)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <View style={[globalStyles.screen, globalStyles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        )
    }

    const situacao = status ? descreverSituacao(status) : null

    return (
        <View style={globalStyles.screen}>
            <View style={globalStyles.backButtonContainer}>
                <BackButton />
            </View>

            <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={globalStyles.pageTitle}>Assinatura</Text>
                    <Text style={globalStyles.pageSubtitle}>Situação do seu acesso ao Colchete</Text>
                </View>

                {situacao && status ? (
                    <View style={[globalStyles.card, styles.card, { borderLeftColor: situacao.cor }]}>
                        <Text style={styles.rotulo}>SUA ASSINATURA</Text>
                        <Text style={styles.titulo}>{situacao.titulo}</Text>
                        <Text style={styles.descricao}>{situacao.descricao}</Text>
                        {['trial', 'active'].includes(status.status) && (
                            <Text style={styles.dias}>
                                {status.days_remaining} dia{status.days_remaining === 1 ? '' : 's'} restante
                                {status.days_remaining === 1 ? '' : 's'}
                            </Text>
                        )}
                    </View>
                ) : (
                    erro && (
                        <Text style={styles.erro}>Não foi possível carregar a situação da assinatura.</Text>
                    )
                )}

                {status?.status !== 'lifetime' && (
                    <>
                        <View style={styles.aviso}>
                            <AvisoContaSite alinhamento="left" />
                        </View>

                        {SITE_LINK_HABILITADO && (
                            <TouchableOpacity
                                style={globalStyles.buttonPrimary}
                                onPress={() => abrirSite('/assinatura')}
                                activeOpacity={0.8}
                            >
                                <Text style={globalStyles.buttonPrimaryText}>Acessar minha conta no site</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
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
    card: {
        borderLeftWidth: 4,
        gap: 2,
        marginBottom: Spacing.lg,
    },
    rotulo: {
        fontSize: FontSize.xs,
        fontWeight: 'bold',
        color: Colors.gray[500],
    },
    titulo: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.black,
    },
    descricao: {
        fontSize: FontSize.sm,
        color: Colors.gray[600],
    },
    dias: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
        marginTop: Spacing.xs,
    },
    aviso: {
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    erro: {
        color: Colors.error,
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
})
