// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api', // Caminho relativo para funcionar em qualquer servidor
  wsUrl: ''      // Deixamos vazio, pois o chat.service já lida com isso em produção
};
