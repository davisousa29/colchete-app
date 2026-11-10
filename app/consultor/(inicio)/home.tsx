import { View, Text, StyleSheet, Image, ScrollView } from 'react-native'
import { useEffect, useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useNotificacaoStore } from '@/src/store/notificacaoStore'
import { useAuthStore } from '@/src/store/authStore'
import api from '@/src/services/api'
import { Colors, Spacing } from '@/src/constants'
import { getSubscriptionStatus, SubscriptionStatus } from '@/src/services/subscriptionService'
import SubscriptionBanner from '@/src/components/Subscription/SubscriptionBanner'
import QuickShortcuts from '@/src/components/QuickShortcuts/QuickShortcuts'
import BotaoSuporte, { ESPACO_BOTAO_SUPORTE } from '@/src/components/Suporte/BotaoSuporte'

export default function Home() {

    const { user, profile, setProfile } = useAuthStore()
    const { atualizarNaoLidas } = useNotificacaoStore()
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)

    useFocusEffect(
        useCallback(() => {
            atualizarNaoLidas()
            carregarStatusAssinatura()
        }, [])
    )

    async function carregarStatusAssinatura() {
        try {
            const status = await getSubscriptionStatus()
            setSubscription(status)
        } catch (error) {
            console.log('Erro ao carregar status da assinatura', error)
        }
    }

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await api.get('/perfil')
                setProfile(response.data.perfil)
            } catch (error) {
                console.log('Erro ao carregar perfil', error)
            }
        }

        if (user && !profile) {
            loadProfile()
        }
    }, [user])

    return (
        <View style={styles.screen}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.content, { paddingBottom: ESPACO_BOTAO_SUPORTE + Spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                <SubscriptionBanner subscription={subscription} />

                <View style={styles.cardUserDescrible}>

                    <Image
                        source={require('@/assets/png-files/box-initial.png')}
                        style={styles.image}
                    />

                    <View style={styles.cardContent}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Especialista em {profile?.specialization}</Text>
                        </View>

                        <Text style={styles.title}>
                            Seja bem vindo,{' '}
                            <Text style={styles.highlight}>{user?.name}</Text>
                        </Text>

                        <Text style={styles.subtitle}>
                            {profile?.bio}.
                        </Text>
                    </View>

                </View>

                <QuickShortcuts />
            </ScrollView>

            <BotaoSuporte />
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    // Padding dentro da rolagem; o espaço extra embaixo evita que o último atalho cole na borda
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },

    cardUserDescrible: {
        width: '100%',
        height: 260,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 20,
    },

    image: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },

    cardContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-end',
    },

    badge: {
        alignSelf: 'flex-start',
        backgroundColor: '#A7F3D0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 10,
    },

    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#065F46',
    },

    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 6,
    },

    highlight: {
        color: Colors.primary,
    },

    subtitle: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
})