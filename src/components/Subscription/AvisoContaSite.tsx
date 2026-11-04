import { Text, StyleSheet } from 'react-native'
import { Colors, FontSize } from '@/src/constants'
import { SITE_ENDERECO } from '@/src/constants/site'
import { SITE_LINK_HABILITADO } from '@/src/constants/features'
import { abrirSite } from '@/src/utils/site'

interface Props {
    // Cor do texto em volta do endereço (o banner amarelo usa outra cor)
    cor?: string
    alinhamento?: 'left' | 'center'
}

/**
 * "Para mais informações de sua conta acesse o sistema consultor.colcheteapp.com.br"
 * Com SITE_LINK_HABILITADO, o endereço é um link para a tela de assinatura do site.
 */
export default function AvisoContaSite({ cor = Colors.gray[600], alinhamento = 'center' }: Props) {
    return (
        <Text style={[styles.texto, { color: cor, textAlign: alinhamento }]}>
            Para mais informações de sua conta acesse o sistema{' '}
            {SITE_LINK_HABILITADO ? (
                <Text style={styles.link} onPress={() => abrirSite('/assinatura')}>
                    {SITE_ENDERECO}
                </Text>
            ) : (
                <Text style={styles.endereco}>{SITE_ENDERECO}</Text>
            )}
        </Text>
    )
}

const styles = StyleSheet.create({
    texto: {
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    link: {
        color: Colors.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    endereco: {
        fontWeight: 'bold',
    },
})
