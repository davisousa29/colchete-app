import { View, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import AppHeader from '@/src/components/Header/AppHeader'
import TermosPendentesGate from '@/src/components/Termos/TermosPendentesGate'
import { Colors } from '@/src/constants'

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
})