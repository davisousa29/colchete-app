import { Linking } from 'react-native'

/** Link oficial do WhatsApp: https://wa.me/<número>?text=<mensagem> */
export function linkWhatsapp(numero: string, mensagem?: string | null): string {
    const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
    return `https://wa.me/${numero}${texto}`
}

export function abrirWhatsapp(numero: string, mensagem?: string | null): Promise<void> {
    return Linking.openURL(linkWhatsapp(numero, mensagem))
}