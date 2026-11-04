import { View, Image, StyleSheet } from 'react-native'
import { Colors } from '@/src/constants'

interface LogoProps {
    size?: number
}

// Logo da marca no app: opção B (símbolo branco sobre o verde principal), em
// cartão arredondado com sombra. A imagem já tem o fundo verde e a margem.
// (O site usa a opção A, branca; o ícone do app também é a opção A.)
export default function Logo({ size = 100 }: LogoProps) {
    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.24 }]}>
            <Image
                source={require('@/assets/logo.png')}
                style={{ width: size, height: size, borderRadius: size * 0.24 }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',

        // iOS
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,

        // Android
        elevation: 6,
    },
})
