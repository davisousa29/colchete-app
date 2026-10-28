import { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FileText } from 'lucide-react-native'
import { BorderRadius, Colors, FontSize, Spacing } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { useAuthStore } from '@/src/store/authStore'
import { useTermosStore } from '@/src/store/termosStore'
import { logout } from '@/src/services/authService'
import {
    aceitarTermos,
    getTermosPendentes,
    getTermosVigentes,
    Termo,
} from '@/src/services/termoService'
import TermoModal from './TermoModal'

/**
 * Bloqueia o app enquanto houver termos atualizados sem aceite.
 * Verifica: ao entrar logado (abertura do app ou login) e sempre que
 * a API responder 403 "termos_pendentes" (sinalizado pelo interceptor).
 */
export default function TermosPendentesGate() {
    const insets = useSafeAreaInsets()
    const isLoggedIn = useAuthStore(s => s.isLoggedIn)
    const sinalizado = useTermosStore(s => s.pendente)
    const resolver = useTermosStore(s => s.resolver)

    const [pendentes, setPendentes] = useState<Termo[]>([])
    const [vigentes, setVigentes] = useState<Termo[]>([])
    const [aceitando, setAceitando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [termoAberto, setTermoAberto] = useState<Termo | null>(null)

    const verificar = useCallback(async () => {
        try {
            const lista = await getTermosPendentes()
            if (lista.length === 0) {
                setPendentes([])
                resolver()
                return
            }
            // O aceite precisa enviar os ids de TODAS as versões vigentes
            setVigentes(await getTermosVigentes())
            setPendentes(lista)
        } catch {
            // Sem rede ou erro pontual: verifica de novo no próximo 403 ou login
        }
    }, [resolver])

    // Ao entrar logado: confere uma vez. Ao sair: limpa tudo.
    useEffect(() => {
        if (isLoggedIn) {
            verificar()
        } else {
            setPendentes([])
            setErro(null)
            resolver()
        }
    }, [isLoggedIn])

    // A API recusou alguma tela por falta de aceite
    useEffect(() => {
        if (isLoggedIn && sinalizado) verificar()
    }, [sinalizado])

    async function handleAceitar() {
        setAceitando(true)
        setErro(null)
        try {
            await aceitarTermos(vigentes.map(t => t.id))
            setPendentes([])
            resolver()
            // As telas abertas falharam com 403: recomeça do início para recarregar os dados
            router.replace('/consultor/home')
        } catch (error: any) {
            const data = error.response?.data
            if (data?.code === 'termos_desatualizados') {
                await verificar() // saiu outra versão enquanto a pessoa lia
            }
            setErro(data?.message || 'Não foi possível registrar o aceite. Tente novamente.')
        } finally {
            setAceitando(false)
        }
    }

    async function handleSair() {
        await logout()
        router.replace('/auth/login')
    }

    const visivel = isLoggedIn && pendentes.length > 0

    return (
        <Modal
            visible={visivel}
            animationType="fade"
            presentationStyle="fullScreen"
            onRequestClose={() => {}} // o botão "voltar" do Android não fecha: o aceite é obrigatório
        >
            <View
                style={[
                    styles.container,
                    { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.lg },
                ]}
            >
                <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
                    <Text style={globalStyles.pageTitle}>Atualizamos nossos termos</Text>
                    <Text style={[globalStyles.pageSubtitle, styles.subtitulo]}>
                        Para continuar usando o Colchete, leia e aceite as versões atualizadas.
                    </Text>

                    {pendentes.map(termo => (
                        <View key={termo.id} style={[globalStyles.card, styles.card]}>
                            <View style={styles.cardTopo}>
                                <FileText size={20} color={Colors.primary} />
                                <Text style={styles.cardTitulo}>{termo.titulo}</Text>
                                <Text style={styles.cardVersao}>v{termo.versao}</Text>
                            </View>

                            <Text style={styles.cardResumo}>
                                {termo.resumo_alteracoes || 'Documento publicado. Leia antes de aceitar.'}
                            </Text>

                            <TouchableOpacity onPress={() => setTermoAberto(termo)} hitSlop={8}>
                                <Text style={styles.link}>Ler documento completo</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {erro && <Text style={styles.erro}>{erro}</Text>}
                </ScrollView>

                <View style={styles.rodape}>
                    <Text style={styles.aviso}>
                        Ao tocar em "Aceitar e continuar", você concorda com os documentos acima.
                    </Text>

                    <TouchableOpacity
                        style={[globalStyles.buttonPrimary, aceitando && globalStyles.buttonDisabled]}
                        onPress={handleAceitar}
                        disabled={aceitando}
                        activeOpacity={0.8}
                    >
                        {aceitando ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={globalStyles.buttonPrimaryText}>Aceitar e continuar</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSair} disabled={aceitando} style={styles.sair}>
                        <Text style={styles.sairTexto}>Sair da conta</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Leitura do documento, por cima deste modal */}
            <TermoModal termo={termoAberto} onClose={() => setTermoAberto(null)} />
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    conteudo: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    subtitulo: {
        marginBottom: Spacing.lg,
    },
    card: {
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    cardTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    cardTitulo: {
        flex: 1,
        fontSize: FontSize.md,
        fontWeight: 'bold',
        color: Colors.black,
    },
    cardVersao: {
        fontSize: FontSize.xs,
        fontWeight: 'bold',
        color: Colors.gray[500],
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        overflow: 'hidden',
    },
    cardResumo: {
        fontSize: FontSize.sm,
        color: Colors.gray[700],
        lineHeight: 20,
    },
    link: {
        fontSize: FontSize.sm,
        color: Colors.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    erro: {
        color: Colors.error,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },
    rodape: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    aviso: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
        textAlign: 'center',
    },
    sair: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    sairTexto: {
        fontSize: FontSize.sm,
        color: Colors.gray[600],
    },
})