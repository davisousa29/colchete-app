import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { Colors, FontSize, Spacing } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { Termo } from '@/src/services/termoService'
import { formatarDataBr } from '@/src/utils/datas'
import MarkdownSimples from './MarkdownSimples'

interface Props {
    termo: Termo | null // null = fechado
    onClose: () => void
}

// Leitura de um termo (Termos de Uso ou Política de Privacidade) em tela cheia
export default function TermoModal({ termo, onClose }: Props) {
    const insets = useSafeAreaInsets()

    return (
        <Modal
            visible={termo !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.md }]}>
                <View style={styles.cabecalho}>
                    <View style={styles.cabecalhoTextos}>
                        <Text style={styles.titulo}>{termo?.titulo}</Text>
                        {termo && (
                            <Text style={styles.meta}>
                                Versão {termo.versao} · publicada em {formatarDataBr(termo.publicado_em)}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
                        <X size={24} color={Colors.gray[600]} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator>
                    {termo && <MarkdownSimples conteudo={termo.conteudo} />}
                </ScrollView>

                <TouchableOpacity style={[globalStyles.buttonPrimary, styles.botao]} onPress={onClose} activeOpacity={0.8}>
                    <Text style={globalStyles.buttonPrimaryText}>Fechar</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Spacing.lg,
    },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[200],
    },
    cabecalhoTextos: {
        flex: 1,
    },
    titulo: {
        fontSize: FontSize.xl,
        fontWeight: 'bold',
        color: Colors.black,
    },
    meta: {
        fontSize: FontSize.sm,
        color: Colors.gray[500],
        marginTop: 2,
    },
    conteudo: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    botao: {
        marginHorizontal: Spacing.lg,
    },
})