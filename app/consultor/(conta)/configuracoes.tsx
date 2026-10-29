import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, KeyRound } from 'lucide-react-native'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import { Icons } from '@/src/constants/icons'
import BackButton from '@/src/components/Header/BackButton'

interface ItemConfig {
    icone: any
    titulo: string
    descricao: string
    rota: string
    cor: string
}

export default function Configuracoes() {

    const secoes: { titulo: string; itens: ItemConfig[] }[] = [
        {
            titulo: 'Conta',
            itens: [
                {
                    icone: Icons.user,
                    titulo: 'Meu perfil',
                    descricao: 'Seus dados pessoais e profissionais',
                    rota: '/consultor/perfil',
                    cor: Colors.primary,
                },
            ],
        },
        {
            titulo: 'Segurança',
            itens: [
                {
                    icone: KeyRound,
                    titulo: 'Alterar senha',
                    descricao: 'Troque a senha de acesso à sua conta',
                    rota: '/consultor/seguranca/alterar-senha',
                    cor: '#F59F00',
                },
                {
                    icone: Icons.shield,
                    titulo: 'Autenticação em duas etapas',
                    descricao: 'Proteja sua conta com verificação extra',
                    rota: '/consultor/seguranca/dois-fatores',
                    cor: '#40C057',
                },
            ],
        },
    ]

    return (
        <View style={globalStyles.screen}>
            <View style={globalStyles.backButtonContainer}>
                <BackButton />
            </View>

            <ScrollView
                contentContainerStyle={styles.conteudo}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={globalStyles.pageTitle}>Configurações</Text>
                    <Text style={globalStyles.pageSubtitle}>
                        Gerencie sua conta e preferências
                    </Text>
                </View>

                {secoes.map((secao) => (
                    <View key={secao.titulo} style={styles.secao}>
                        <Text style={styles.secaoTitulo}>{secao.titulo}</Text>

                        <View style={styles.card}>
                            {secao.itens.map((item, index) => (
                                <TouchableOpacity
                                    key={item.titulo}
                                    style={[
                                        styles.item,
                                        index < secao.itens.length - 1 && styles.itemBorda,
                                    ]}
                                    onPress={() => router.push(item.rota as any)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.itemIcone, { backgroundColor: item.cor + '20' }]}>
                                        <item.icone size={20} color={item.cor} />
                                    </View>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemTitulo}>{item.titulo}</Text>
                                        <Text style={styles.itemDescricao}>{item.descricao}</Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.gray[400]} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    conteudo: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    header: {
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    secao: {
        marginBottom: Spacing.lg,
    },
    secaoTitulo: {
        fontSize: FontSize.sm,
        fontWeight: 'bold',
        color: Colors.gray[500],
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
    },
    itemBorda: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[100],
    },
    itemIcone: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemTitulo: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.black,
    },
    itemDescricao: {
        fontSize: FontSize.xs,
        color: Colors.gray[500],
    },
})