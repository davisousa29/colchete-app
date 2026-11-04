import { Linking } from 'react-native'
import { SITE_URL } from '@/src/constants/site'
import { toastErro } from '@/src/utils/toast'

/**
 * Abre uma página do site no navegador do celular.
 * Ex.: abrirSite('/assinatura') → https://consultor.colcheteapp.com.br/assinatura
 * Sem login no site, ele pede o login e depois volta para essa página.
 */
export async function abrirSite(caminho = '/'): Promise<void> {
    try {
        await Linking.openURL(`${SITE_URL}${caminho}`)
    } catch {
        toastErro('Não foi possível abrir o navegador.')
    }
}
