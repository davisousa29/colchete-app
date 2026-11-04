import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Clock, ChevronRight } from 'lucide-react-native'
import { Spacing, FontSize, BorderRadius } from '@/src/constants'
import { SITE_ENDERECO } from '@/src/constants/site'
import { SITE_LINK_HABILITADO } from '@/src/constants/features'
import { SubscriptionStatus } from '@/src/services/subscriptionService'
import { abrirSite } from '@/src/utils/site'

interface Props {
    subscription: SubscriptionStatus | null
}

// Assinante pago passa a ver o aviso quando faltam até X dias
const DIAS_AVISO_RENOVACAO = 7

function textoDias(dias: number) {
    return `${dias} dia${dias !== 1 ? 's' : ''}`
}

export default function SubscriptionBanner({ subscription }: Props) {
    if (!subscription) return null
    if (subscription.is_lifetime) return null

    const dias = subscription.days_remaining
    let titulo: string

    if (subscription.status === 'trial') {
        titulo = dias > 0 ? `Seu teste grátis termina em ${textoDias(dias)}` : 'Seu teste grátis termina hoje'
    } else if (subscription.status === 'active' && dias <= DIAS_AVISO_RENOVACAO) {
        titulo = dias > 0 ? `Sua assinatura vence em ${textoDias(dias)}` : 'Sua assinatura vence hoje'
    } else {
        return null
    }

    const conteudo = (
        <>
            <View style={styles.icone}>
                <Clock size={20} color="#B7791F" />
            </View>
            <View style={styles.conteudo}>
                <Text style={styles.titulo}>{titulo}</Text>
                <Text style={styles.subtitulo}>
                    Para mais informações de sua conta acesse o sistema{' '}
                    <Text style={styles.endereco}>{SITE_ENDERECO}</Text>
                </Text>
            </View>
            {SITE_LINK_HABILITADO && <ChevronRight size={18} color="#B7791F" />}
        </>
    )

    // Com o link desligado, o aviso só informa (não é tocável)
    if (!SITE_LINK_HABILITADO) {
        return <View style={styles.container}>{conteudo}</View>
    }

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => abrirSite('/assinatura')}
            activeOpacity={0.85}
        >
            {conteudo}
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: '#FFF9DB',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: '#FFE066',
    },
    icone: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF3BF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    conteudo: {
        flex: 1,
        gap: 2,
    },
    titulo: {
        fontSize: FontSize.sm,
        fontWeight: 'bold',
        color: '#8D6E15',
    },
    subtitulo: {
        fontSize: FontSize.xs,
        color: '#A67C1A',
    },
    endereco: {
        fontWeight: 'bold',
    },
})
