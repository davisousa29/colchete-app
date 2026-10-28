import { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Colors, Spacing, FontSize, BorderRadius } from '@/src/constants'
import { globalStyles } from '@/src/constants/globalStyles'
import BackButton from '@/src/components/Header/BackButton'
import FilterChips, { FilterChip } from '@/src/components/Filter/FilterChips'
import CentralModal from '@/src/components/Modal/CentralModal'
import PesoInput from '@/src/components/Input/PesoInput'
import api from '@/src/services/api'
import { sanitizarNumero, parsearNumero, isNumeroValido } from '@/src/utils/numbers'
import { pesoParaNumero } from '@/src/utils/masks'

interface Especie { id: string; nome: string }
interface Raca { id: string; nome: string; grupo: string }
interface Categoria { id: string; nome: string; sexo: string; fase: string }
interface Sistema { id: string; nome: string }

export default function RacaoStep1() {
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'default' as 'default' | 'success' | 'error',
    })

    const [especies, setEspecies] = useState<Especie[]>([])
    const [racas, setRacas] = useState<Raca[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [sistemas, setSistemas] = useState<Sistema[]>([])

    const [especieSelecionada, setEspecieSelecionada] = useState('')
    const [racaSelecionada, setRacaSelecionada] = useState('')
    const [categoriaSelecionada, setCategoriaSelecionada] = useState('')
    const [sistemaSelecionado, setSistemaSelecionado] = useState('')

    const [pesoInicial, setPesoInicial] = useState('')
    const [pesoFinal, setPesoFinal] = useState('')
    const [gmd, setGmd] = useState('')
    const [quantidade, setQuantidade] = useState('1')
    const [tipoAplicacao, setTipoAplicacao] = useState<'individual' | 'lote'>('lote')

    useEffect(() => {
        carregarEspecies()
    }, [])

    useEffect(() => {
        if (especieSelecionada) {
            setRacaSelecionada('')
            setCategoriaSelecionada('')
            setSistemaSelecionado('')
            carregarDadosEspecie(especieSelecionada)
        }
    }, [especieSelecionada])

    async function carregarEspecies() {
        try {
            const response = await api.get('/referencia/especies')
            setEspecies(response.data.especies)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    async function carregarDadosEspecie(especieId: string) {
        setLoading(true)
        try {
            const [racasRes, categoriasRes, sistemasRes] = await Promise.all([
                api.get(`/referencia/racas/${especieId}`),
                api.get(`/referencia/categorias/${especieId}`),
                api.get(`/referencia/sistemas/${especieId}`),
            ])
            setRacas(racasRes.data.racas)
            setCategorias(categoriasRes.data.categorias)
            setSistemas(sistemasRes.data.sistemas)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    function mostrarErro(message: string) {
        setModal({ visible: true, title: 'Atenção', message, type: 'default' })
    }

    function validar(): string | null {
        if (!especieSelecionada) return 'Selecione uma espécie.'
        if (!racaSelecionada) return 'Selecione uma raça.'
        if (!categoriaSelecionada) return 'Selecione uma categoria.'
        if (!sistemaSelecionado) return 'Selecione o sistema de produção.'
        if (pesoParaNumero(pesoInicial) <= 0) return 'Informe o peso inicial.'
        if (pesoParaNumero(pesoFinal) <= 0) return 'Informe o peso final.'
        if (pesoParaNumero(pesoInicial) >= pesoParaNumero(pesoFinal)) return 'O peso final deve ser maior que o peso inicial.'
        if (!isNumeroValido(gmd)) return 'Informe o ganho médio diário.'
        if (parsearNumero(gmd) <= 0 || parsearNumero(gmd) > 3) return 'O GMD deve ser entre 0.1 e 3 kg/dia.'
        if (tipoAplicacao === 'lote' && (!quantidade || Number(quantidade) < 1)) return 'Informe a quantidade de animais.'
        return null
    }

    function handleProximo() {
        const erro = validar()
        if (erro) {
            mostrarErro(erro)
            return
        }

        router.push({
            pathname: '/consultor/racao/exigencias',
            params: {
                especie_id: especieSelecionada,
                raca_id: racaSelecionada,
                categoria_id: categoriaSelecionada,
                sistema_id: sistemaSelecionado,
                peso_inicial: String(pesoParaNumero(pesoInicial)),
                peso_final: String(pesoParaNumero(pesoFinal)),
                gmd: String(parsearNumero(gmd)),
                quantidade,
                tipo_aplicacao: tipoAplicacao,
                especie_nome: especies.find(e => e.id === especieSelecionada)?.nome ?? '',
                raca_nome: racas.find(r => r.id === racaSelecionada)?.nome ?? '',
                categoria_nome: categorias.find(c => c.id === categoriaSelecionada)?.nome ?? '',
                sistema_nome: sistemas.find(s => s.id === sistemaSelecionado)?.nome ?? '',
            }
        } as any)
    }

    const especiesChips: FilterChip[] = especies.map(e => ({ label: e.nome, value: e.id }))
    const racasChips: FilterChip[] = racas.map(r => ({ label: r.nome, value: r.id }))
    const categoriasChips: FilterChip[] = categorias.map(c => ({ label: c.nome, value: c.id }))
    const sistemasChips: FilterChip[] = sistemas.map(s => ({ label: s.nome, value: s.id }))
    const tipoChips: FilterChip[] = [
        { label: 'Lote', value: 'lote' },
        { label: 'Individual', value: 'individual' },
    ]

    return (
        <KeyboardAvoidingView
            style={globalStyles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <BackButton />

                {/* Indicador de passo */}
                <View style={styles.stepIndicator}>
                    <View style={styles.stepAtivo}><Text style={styles.stepNumeroAtivo}>1</Text></View>
                    <View style={styles.stepLinha} />
                    <View style={styles.stepInativo}><Text style={styles.stepNumeroInativo}>2</Text></View>
                    <View style={styles.stepLinha} />
                    <View style={styles.stepInativo}><Text style={styles.stepNumeroInativo}>3</Text></View>
                    <View style={styles.stepLinha} />
                    <View style={styles.stepInativo}><Text style={styles.stepNumeroInativo}>4</Text></View>
                </View>

                <View style={styles.header}>
                    <Text style={globalStyles.pageTitle}>Dados do Animal</Text>
                    <Text style={globalStyles.pageSubtitle}>Passo 1 de 4 — Selecione as características do animal</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
                ) : (
                    <View style={styles.form}>

                        <View style={globalStyles.inputGroup}>
                            <Text style={globalStyles.inputLabel}>Espécie *</Text>
                            <FilterChips chips={especiesChips} selecionado={especieSelecionada} onChange={setEspecieSelecionada} />
                        </View>

                        {racas.length > 0 && (
                            <View style={globalStyles.inputGroup}>
                                <Text style={globalStyles.inputLabel}>Raça *</Text>
                                <FilterChips chips={racasChips} selecionado={racaSelecionada} onChange={setRacaSelecionada} />
                            </View>
                        )}

                        {categorias.length > 0 && (
                            <View style={globalStyles.inputGroup}>
                                <Text style={globalStyles.inputLabel}>Categoria *</Text>
                                <FilterChips chips={categoriasChips} selecionado={categoriaSelecionada} onChange={setCategoriaSelecionada} />
                            </View>
                        )}

                        {sistemas.length > 0 && (
                            <View style={globalStyles.inputGroup}>
                                <Text style={globalStyles.inputLabel}>Sistema de produção *</Text>
                                <FilterChips chips={sistemasChips} selecionado={sistemaSelecionado} onChange={setSistemaSelecionado} />
                            </View>
                        )}

                        <View style={globalStyles.inputGroup}>
                            <Text style={globalStyles.inputLabel}>Tipo de aplicação *</Text>
                            <FilterChips chips={tipoChips} selecionado={tipoAplicacao} onChange={v => setTipoAplicacao(v as 'individual' | 'lote')} />
                        </View>

                        {tipoAplicacao === 'lote' && (
                            <View style={globalStyles.inputGroup}>
                                <Text style={globalStyles.inputLabel}>Quantidade de animais *</Text>
                                <TextInput
                                    style={globalStyles.input}
                                    placeholder="Ex: 50"
                                    placeholderTextColor={Colors.gray[400]}
                                    value={quantidade}
                                    onChangeText={text => setQuantidade(sanitizarNumero(text).replace(/[.,]/g, ''))}
                                    keyboardType="number-pad"
                                />
                            </View>
                        )}

                        <View style={styles.duasColunas}>
                            <PesoInput
                                label="Peso inicial *"
                                value={pesoInicial}
                                onChange={setPesoInicial}
                                placeholder="Ex: 300"
                                style={{ flex: 1 }}
                            />
                            <PesoInput
                                label="Peso final *"
                                value={pesoFinal}
                                onChange={setPesoFinal}
                                placeholder="Ex: 400"
                                style={{ flex: 1 }}
                            />
                        </View>

                        <View style={globalStyles.inputGroup}>
                            <Text style={globalStyles.inputLabel}>Ganho médio diário — GMD (kg/dia) *</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="Ex: 0.5"
                                placeholderTextColor={Colors.gray[400]}
                                value={gmd}
                                onChangeText={text => setGmd(sanitizarNumero(text))}
                                keyboardType="decimal-pad"
                            />
                            <Text style={globalStyles.inputHint}>Entre 0.1 e 3 kg/dia</Text>
                        </View>

                        <TouchableOpacity
                            style={globalStyles.buttonPrimary}
                            onPress={handleProximo}
                            activeOpacity={0.8}
                        >
                            <Text style={globalStyles.buttonPrimaryText}>Próximo →</Text>
                        </TouchableOpacity>

                    </View>
                )}
            </ScrollView>

            <CentralModal
                visible={modal.visible}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={() => setModal({ ...modal, visible: false })}
            />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    stepAtivo: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    stepInativo: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.gray[200],
        justifyContent: 'center', alignItems: 'center',
    },
    stepNumeroAtivo: {
        color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm,
    },
    stepNumeroInativo: {
        color: Colors.gray[500], fontWeight: 'bold', fontSize: FontSize.sm,
    },
    stepLinha: {
        flex: 1, height: 2, backgroundColor: Colors.gray[200],
    },
    header: {
        marginBottom: Spacing.xl,
    },
    form: {
        gap: Spacing.lg,
    },
    duasColunas: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
})