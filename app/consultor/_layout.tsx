import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Stack, type ErrorBoundaryProps } from 'expo-router'
import AppHeader from '@/src/components/Header/AppHeader'
import TermosPendentesGate from '@/src/components/Termos/TermosPendentesGate'
import { Colors, FontSize, Spacing } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'

// Header fixo em cima; as telas ocupam apenas o espaço que sobra abaixo dele
export default function AppLayout() {
    return (
        <View style={styles.container}>
            <AppHeader />
            <View style={styles.content}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: Colors.background },
                    }}
                />
            </View>

            {/* Aceite obrigatório de termos atualizados — fica por cima de qualquer tela */}
            <TermosPendentesGate />
        </View>
    )
}

/**
 * Rede de segurança: um erro inesperado ao montar qualquer tela mostra esta
 * mensagem em vez de fechar o app. O Expo Router usa este export automaticamente.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    return (
        <View style={[styles.container, styles.erro]}>
            <Text style={styles.erroTitulo}>Algo deu errado</Text>
            <Text style={styles.erroTexto}>
                Não foi possível abrir esta tela. Tente novamente; se o problema continuar,
                feche e abra o app.
            </Text>
            {__DEV__ && <Text style={styles.erroDetalhe}>{error.message}</Text>}
            <TouchableOpacity style={globalStyles.buttonPrimary} onPress={retry} activeOpacity={0.8}>
                <Text style={globalStyles.buttonPrimaryText}>Tentar novamente</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
    erro: {
        justifyContent: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    erroTitulo: {
        fontSize: FontSize.xxl,
        fontWeight: 'bold',
        color: Colors.black,
        textAlign: 'center',
    },
    erroTexto: {
        fontSize: FontSize.md,
        color: Colors.gray[600],
        textAlign: 'center',
        lineHeight: 22,
    },
    erroDetalhe: {
        fontSize: FontSize.xs,
        color: Colors.error,
        textAlign: 'center',
    },
})