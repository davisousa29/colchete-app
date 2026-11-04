// Liga/desliga de funcionalidades do app, num lugar só.

// Login com Google: desligado até os IDs de cliente (Web, iOS e Android) serem
// criados no Google Cloud e preenchidos no app.json (extra.google*ClientId).
// Desligado, nenhum código do Google roda — em nenhuma plataforma.
export const GOOGLE_LOGIN_HABILITADO = false

// Link para o site (consultor.colcheteapp.com.br) nas telas de assinatura.
// Ligado: o endereço é clicável e há botões "Acessar minha conta no site".
// Desligado: o endereço aparece só como texto, sem link nem botão — a saída
// pronta caso a revisão da Apple ou do Google não aceite o link para fora do app.
export const SITE_LINK_HABILITADO = true
