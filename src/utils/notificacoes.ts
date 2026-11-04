import { router } from 'expo-router'
import { Colors } from '@/src/constants'
import { Icons } from '@/src/constants/icons'
import { Notificacao } from '@/src/services/notificacaoService'

// Ícone e cor por tipo de notificação.
// Os tipos são os mesmos usados pelo NotificacaoService do backend.
const TIPO_CONFIG: Record<string, { icone: any; cor: string }> = {
    contrato_aceito:    { icone: Icons.handShake,   cor: '#40C057' },
    contrato_recusado:  { icone: Icons.circleAlert, cor: '#FA5252' },
    contrato_encerrado: { icone: Icons.contract,    cor: '#6C757D' },
    assinatura:         { icone: Icons.circleAlert, cor: Colors.warning },
}

export function configDoTipo(tipo: string) {
    return TIPO_CONFIG[tipo] ?? { icone: Icons.bell, cor: Colors.gray[500] }
}

export function tempoRelativo(data: string): string {
    const agora = new Date()
    const then = new Date(data)
    const diffMin = Math.floor((agora.getTime() - then.getTime()) / 60000)

    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 30) return `${diffD}d`
    return then.toLocaleDateString('pt-BR')
}

/**
 * Abre a tela ligada à notificação (campo `dados.rota` enviado pelo backend).
 * Retorna false quando a notificação não tem destino.
 */
export function abrirDestino(notif: Notificacao): boolean {
    const rota = notif.dados?.rota

    if (rota === 'contrato' && notif.dados?.id) {
        router.push(`/consultor/contrato/${notif.dados.id}` as any)
        return true
    }

    // Avisos de assinatura: a área de assinatura do app (com o caminho para o site)
    if (rota === 'assinatura') {
        router.push('/consultor/assinatura' as any)
        return true
    }

    return false
}
