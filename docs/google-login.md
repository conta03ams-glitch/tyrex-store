# Ativar o acesso Google na TYREX

A interface e o servidor estão preparados para Google pelo Firebase Authentication. A ativação depende do projeto real da loja. A compra como visitante continua disponível.

1. Em https://console.firebase.google.com/, crie ou selecione o projeto da TYREX.
2. Em Authentication > Sign-in method, ative Google e escolha o e-mail de suporte exigido pelo Google.
3. Em Authentication > Settings > Authorized domains, adicione `tyrex-store.fuzzygnat18.chatgpt.site`.
4. Em Project settings > General > Your apps, registre um app Web e copie o objeto `firebaseConfig`.
5. Configure os valores reais de `apiKey`, `authDomain`, `projectId` e opcionalmente `appId` nas respectivas variáveis de ambiente FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID e FIREBASE_APP_ID. Use o authDomain padrão do projeto, no formato projectId.firebaseapp.com. Ative FIREBASE_GOOGLE_ENABLED=true e publique a versão com essas variáveis.
6. Teste a entrada em desktop e celular, a saída da conta, o retorno ao checkout e a autorização do histórico em duas contas diferentes. Se o app OAuth estiver em teste, adicione usuários de teste ou publique-o no console Google conforme a configuração da conta.

O firebaseConfig web é público. Não envie nem coloque no site a chave privada de uma conta de serviço. O Google não compartilha a senha com a loja. A integração solicita somente identificação, nome e e-mail; não lê mensagens do Gmail. Não é necessário Firestore: os pedidos, sessões e keys continuam no banco já existente da loja.

## Segurança e continuidade

O servidor valida criptograficamente o token Firebase, projeto, provedor Google, e-mail verificado e autenticação recente. O token nunca é usado como identidade sem verificação. A sessão de oito horas fica em cookie HttpOnly/Secure, com hash armazenado em D1, e é revogada ao sair. O logout local não desconecta a conta Google do navegador. A expiração da sessão local é independente da sessão do Firebase.

IDs antigos não são associados por e-mail. O cliente pode vincular um pedido antigo ou feito como visitante com o código e a chave de consulta originais. Pedidos já vinculados a outra conta Google não são transferidos. A identidade ChatGPT da hospedagem não autentica o cliente no site.

A propriedade STORE_OWNER_USER_ID ainda precisa ser configurada com o identificador Google do responsável, depois de ele entrar, para liberar gestão. Nenhuma autorização administrativa é inferida pelo e-mail. Não altere DELIVERY_ENCRYPTION_KEY ou os segredos Purin para ativar o Google.

Referências oficiais: https://firebase.google.com/docs/auth/web/google-signin e https://firebase.google.com/docs/auth/admin/verify-id-tokens.

O projeto Web foi configurado pelo proprietário. Ambos os provedores Google e E-mail/senha estão habilitados no Firebase. O site oferece cadastro, confirmação de e-mail antes da sessão e recuperação de senha. A verificação do token aceita apenas google.com e password com e-mail confirmado. O prefixo histórico google: dos identificadores internos é mantido para preservar o vínculo dos pedidos.
