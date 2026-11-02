// Liga/desliga de funcionalidades do app, num lugar só.

// Login com Google: desligado até os IDs de cliente (Web, iOS e Android) serem
// criados no Google Cloud e preenchidos no app.json (extra.google*ClientId).
// Desligado, nenhum código do Google roda — em nenhuma plataforma.
export const GOOGLE_LOGIN_HABILITADO = false