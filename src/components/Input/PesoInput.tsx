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
}

// Campo de peso com a unidade "kg" fixa à direita (fora do texto, para não atrapalhar o cursor)
export default function PesoInput({ label, value, onChange, placeholder, hint, style }: Props) {
    return (
        <View style={[globalStyles.inputGroup, style]}>
            <Text style={globalStyles.inputLabel}>{label}</Text>

            <View style={styles.campo}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={texto => onChange(formatarPeso(texto))}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray[400]}
                    keyboardType="decimal-pad"
                />
                <Text style={styles.unidade}>kg</Text>
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