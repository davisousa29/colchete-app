import { useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import Constants from 'expo-constants'

WebBrowser.maybeCompleteAuthSession()

const extra = Constants.expoConfig?.extra ?? {}

/**
 * Login com Google. Use só dentro do GoogleLoginSection:
 * a biblioteca exige o ID de cliente da plataforma atual e lança um erro
 * (que fecha o app) se ele faltar — por isso o hook só pode rodar com o
 * login com Google ligado e os três IDs configurados no app.json.
 */
export function useGoogleAuth(onToken: (accessToken: string) => void) {
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: extra.googleWebClientId as string,
        iosClientId: extra.googleIosClientId as string,
        androidClientId: extra.googleAndroidClientId as string,
    })

    useEffect(() => {
        if (response?.type === 'success') {
            const accessToken = response.authentication?.accessToken
            if (accessToken) {
                onToken(accessToken)
            }
        }
    }, [response])

    return {
        pronto: !!request,
        login: () => promptAsync(),
    }
}