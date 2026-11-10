import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Headset, MessageCircle, X } from 'lucide-react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { useSuporteStore } from '@/src/store/suporteStore'
import { abrirWhatsapp } from '@/src/utils/whatsapp'

/** Altura ocupada pelo botão: as telas usam para reservar espaço no fim do conteúdo. */
export const ESPACO_BOTAO_SUPORTE = 88

/**
 * Botão flutuante de suporte (canto inferior direito).
 * 1º toque abre o balão; o botão do balão abre o WhatsApp do suporte.
 * Sem número cadastrado no backend, não aparece.
 */
export default function BotaoSuporte() {
    const insets = useSafeAreaInsets()
    const { contato, carregar } = useSuporteStore()
    const [aberto, setAberto] = useState(false)

    useEffect(() => {
        carregar()
    }, [])

    if (!contato?.whatsapp) return null

    async function contatar() {
        setAberto(false)
        await abrirWhatsapp(contato!.whatsapp!, contato!.mensagem)
    }

    return (
        <View
            style={[styles.container, { bottom: insets.bottom + Spacing.md }]}
            pointerEvents="box-none"
        >
            {aberto && (
                <View style={styles.balao}>
                    <TouchableOpacity style={styles.botaoContato} onPress={contatar} activeOpacity={0.8}>
                        <MessageCircle size={18} color={Colors.white} />
                        <Text style={styles.botaoContatoTexto}>Entrar em contato com o suporte</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setAberto(a => !a)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={aberto ? 'Fechar suporte' : 'Suporte'}
            >
                {aberto
                    ? <X size={26} color={Colors.white} />
                    : <Headset size={26} color={Colors.white} />}
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: Spacing.lg,
        alignItems: 'flex-end',
        gap: Spacing.sm,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.info,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    balao: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    botaoContato: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.info,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    botaoContatoTexto: {
        color: Colors.white,
        fontSize: FontSize.sm,
        fontWeight: 'bold',
    },
})