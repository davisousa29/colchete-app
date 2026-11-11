import { StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native'
import { globalStyles } from '@/src/constants/globalStyles'
import { BorderRadius, Colors, FontSize, Spacing } from '@/src/constants'
import { formatarPeso } from '@/src/utils/masks'

interface Props {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    hint?: string
    style?: StyleProp<ViewStyle>
    unidade?: string
    maxInteiros?: number
}

export default function PesoInput({ label, value, onChange, placeholder, hint, style, unidade = 'kg', maxInteiros = 4 }: Props) {
    return (
        <View style={[globalStyles.inputGroup, style]}>
            <Text style={globalStyles.inputLabel}>{label}</Text>

            <View style={styles.campo}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={texto => onChange(formatarPeso(texto, maxInteiros))}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray[400]}
                    keyboardType="number-pad"
                />
                <Text style={styles.unidade}>{unidade}</Text>
            </View>

            {hint && <Text style={globalStyles.inputHint}>{hint}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    campo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.gray[300],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.sm,
        fontSize: FontSize.md,
        color: Colors.black,
    },
    unidade: {
        fontSize: FontSize.md,
        color: Colors.gray[500],
        fontWeight: '600',
        marginLeft: Spacing.xs,
    },
})