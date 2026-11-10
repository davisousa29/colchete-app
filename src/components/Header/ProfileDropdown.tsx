import { useEffect } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
} from 'react-native'
import { router } from 'expo-router'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { Icons } from '@/src/constants/icons'
import { useAuthStore } from '@/src/store/authStore'
import { logout } from '@/src/services/authService'
import { useSuporteStore } from '@/src/store/suporteStore'
import { abrirWhatsapp } from '@/src/utils/whatsapp'

interface Props {
    visible: boolean
    onClose: () => void
}

export default function ProfileDropdown({ visible, onClose }: Props) {
    const { clearUser } = useAuthStore()

    const { contato, carregar } = useSuporteStore()

    useEffect(() => {
        if (visible) carregar()
    }, [visible])

    async function handleSuporte() {
        onClose()
        await abrirWhatsapp(contato!.whatsapp!, contato!.mensagem)
    }

    function handleNavigate(path: string) {
        onClose()
        router.push(path as any)
    }

    async function handleLogout() {
        onClose()
        await logout()
        clearUser()
        router.replace('/auth/welcome')
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            {/* Overlay invisível para fechar ao clicar fora */}
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                {/* Dropdown posicionado no canto superior direito */}
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.container}
                    onPress={() => {}}
                >
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => handleNavigate('/consultor/perfil')}
                        activeOpacity={0.7}
                    >
                        <Icons.user size={20} color={Colors.black} />
                        <Text style={styles.itemLabel}>Meu perfil</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {contato?.whatsapp && (
                        <>
                            <TouchableOpacity
                                style={styles.item}
                                onPress={handleSuporte}
                                activeOpacity={0.7}
                            >
                                <Icons.messageCircle size={20} color={Colors.info} />
                                <Text style={styles.itemLabel}>Suporte</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => handleNavigate('/consultor/configuracoes')}
                        activeOpacity={0.7}
                    >
                        <Icons.settings size={20} color={Colors.black} />
                        <Text style={styles.itemLabel}>Configurações</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.item}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Icons.logout size={20} color={Colors.red}/>
                        <Text style={[styles.itemLabel, styles.logoutText]}>Sair</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    container: {
        position: 'absolute',
        top: 100,
        right: Spacing.lg,
        width: 180,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    itemIcon: {
        fontSize: 16,
        width: 20,
        textAlign: 'center',
    },
    itemLabel: {
        fontSize: FontSize.md,
        color: Colors.black,
    },
    logoutText: {
        color: Colors.error,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray[200],
        marginVertical: Spacing.xs,
    },
})