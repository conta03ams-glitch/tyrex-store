# TYREX STORE

Loja em português com a identidade visual da TYREX: preto, azul elétrico e mascote original. Inclui 33 produtos do catálogo enviado, nove categorias, catálogo completo na página inicial, páginas individuais, galeria ilustrativa, busca, filtros, ordenação, favoritos, carrinho persistente e checkout.

## Integração PurinCash

Referência: https://docs.purincash.com

- O catálogo real é consultado no servidor em `GET /v1/store/products`. Os nomes são associados ao catálogo enviado pela TYREX; as variações, identificadores, preços e estoque vêm da API. Produtos adicionais da loja entram automaticamente, com páginas próprias. Não são expostos conteúdos de estoque ou credenciais. Produtos ausentes ou inativos não podem gerar cobrança.
- Pagamento de carrinho: `POST /v1/charges` para um único Pix com o total dos itens; cartão usa `POST /v1/card-payments` e seu checkout hospedado.
- Preços, quantidades, disponibilidade e total são conferidos no servidor antes de cobrar. Pedidos têm proteção contra a repetição da mesma tentativa.
- O status é consultado no servidor e exige correspondência do valor cobrado. O redirecionamento do cartão nunca confirma a compra.
- Webhooks usam HMAC-SHA256 sobre o corpo original, deduplicação e consulta ao provedor antes de atualizar o pedido.
- Pedidos ficam em D1; a consulta pública exige uma chave de acesso de 24 bytes. O painel de gestão exige usuário autenticado e correspondência com o proprietário configurado.

## Configuração necessária para receber vendas

Use variáveis de ambiente do servidor, mantendo valores sensíveis como segredos:

| Chave | Uso |
| --- | --- |
| `PURINCASH_API_KEY` | Chave `ps_test_` para homologação ou `ps_live_` para produção. Nunca colocar no código ou no navegador. |
| `STORE_CHECKOUT_ENABLED` | `true` habilita cobranças; ausência mantém o checkout fechado. |
| `STORE_OWNER_USER_ID` | Identificador estável do responsável autenticado. O painel `/gestao` mostra o identificador da própria sessão para configuração. |
| `STORE_DISCORD_URL` | Convite real da comunidade da loja. |
| `STORE_SUPPORT_EMAIL` | E-mail comercial de atendimento. |
| `PURINCASH_WEBHOOK_SECRET` | Segredo da conta para conferir notificações. |
| `PURINCASH_WEBHOOK_ENABLED` | `true` somente quando a URL do Site permitir acesso público ao callback. |

O endpoint de callback é `/api/webhooks/purincash`. Uma publicação privada não recebe callbacks externos; a consulta ao provedor ainda permite acompanhar pagamentos. Cartão não está disponível em sandbox, conforme a documentação PurinCash.

**Entrega dos pedidos:** manual pela TYREX. A API documentada vincula uma cobrança a um único produto/variação; este checkout agrega múltiplos itens e não anuncia entrega automática nem consome o estoque da loja do Discord. O responsável deve processar o pedido e ajustar o estoque no painel da PurinCash. Para automação de entrega em lote, será necessário um fluxo adicional suportado pelo fornecedor. O estoque remoto é conferido antes da cobrança, mas não é reservado ou debitado automaticamente.

As descrições técnicas não inventam versões mínimas, funções ou garantias. Os detalhes exatos devem ser confirmados pelo responsável. O item Script Robux permanece indisponível durante verificação de finalidade e documentação; não há promessa de geração ou transferência de Robux. As categorias FiveM, Valorant e 8 Ball Pool foram preparadas sem produtos fictícios.

Antes de abrir vendas, revise as ofertas, as condições comerciais, a identificação do vendedor, os contatos e os procedimentos de entrega e reembolso.

## Validação

- `node --experimental-strip-types --test tests/commerce.test.mjs`: oito testes de valores monetários, preços adulterados, quantidades inválidas, duplicatas, estoque, status de pagamento e assinatura de webhook.
- `node --experimental-strip-types --test tests/cart-catalog.test.mjs`: cinco testes de carrinho com múltiplos itens, limites de quantidade, sincronização com o provedor, novos produtos e respostas inválidas.
- `node node_modules/typescript/bin/tsc --noEmit`: verificação de tipos.
- Build de produção via fluxo Sites.
- Conferência no navegador: página inicial, detalhe de produto, quantidade, carrinho e checkout; conferência visual em larguras de celular.

Integração autenticada validada com chave sandbox: catálogo de 33 produtos, criação de Pix, consulta pendente e simulação de pagamento confirmado. A chave permanece exclusivamente no segredo de runtime. Nenhuma cobrança real foi realizada. Carrinho dedicado em `/carrinho`, persistência síncrona antes da navegação e páginas próprias para todos os produtos.

## Artes

As referências originais estão otimizadas em `public/assets/`. As fontes estão hospedadas no próprio projeto em `public/fonts/`. As categorias usam as imagens fornecidas pela loja, otimizadas em WebP, incluindo o cartão Google Play para Gift cards e o logo Netflix para Assinaturas.

As artes novas foram produzidas com a ferramenta integrada de geração de imagens e incorporadas ao projeto:

- `public/assets/hero.webp`: mascote azul original da TYREX, mantendo rabo de cavalo escuro, joias douradas e barba, em composição cinematográfica à direita com cristal azul flutuante, fundo preto/azul e espaço para texto à esquerda; sem palavras ou interface.
- `public/assets/golds.webp`: barras e moedas douradas sobre pedestal escuro, faixa de luz azul, iluminação de produto cinematográfica; sem palavras, números ou logotipos.

- `public/assets/gift-cards-promo.png`: PNG transparente de 1254 × 1254 px, criado com a ferramenta integrada a partir da referência enviada. Dois cartões sobrepostos, Steam atrás à esquerda e Google Play à frente à direita, com cantos arredondados, acabamento acetinado, luz azul discreta e marcas legíveis. Aplicado na chamada “Um cartão. Novas possibilidades.”, com ajuste responsivo e movimento suave ao passar o mouse.

## Comunidade e compra

- Discord oficial: https://discord.gg/cNgnAXhWjw. Banner grande com o mascote; todos os links de atendimento e a antiga página `/ajuda` encaminham ao servidor. Não há formulário local de suporte.
- Os 33 produtos das três capturas aparecem na página inicial e no catálogo, com filtro por categoria. As capturas mostram preços de entrada/faixas e quantidades de opções, mas não os nomes, preços individuais nem conteúdo dessas variações: esses detalhes vêm da sincronização autenticada, sem opções inventadas.
- O botão de sacola adiciona produtos de opção única e abre o carrinho. Produtos com várias opções têm uma seta para a página de escolha. As quantidades e os itens persistem no navegador, independentemente da configuração do gateway.
- A publicação atual não possui `PURINCASH_API_KEY`. O código de integração está preparado, mas cobranças e sincronização autenticada dependem dessa credencial cadastrada como segredo e de `STORE_CHECKOUT_ENABLED=true`. Não foi feita cobrança real ou teste autenticado no provedor.

## SEO, imagens e Analytics — manter em toda atualização

Os sete requisitos permanentes do usuário estão registrados em `AGENTS.md` e protegidos pelo build de produção. `lib/seo.ts` é a fonte dos títulos, descrições, URLs canônicas e metadados Open Graph/Twitter. Todas as páginas possuem metadados próprios; produtos e categorias são calculados a partir do catálogo atual.

- `/robots.txt` permite o rastreamento do conteúdo público e dos recursos visuais, bloqueando APIs e rotas técnicas. Páginas de compra, pedidos, gestão, busca, favoritos, redirecionamento e erro têm `noindex` explícito. Seu HTML continua rastreável para que os robôs consigam ler essa instrução; robots.txt não é controle de acesso.
- `/sitemap.xml` é gerado dinamicamente com páginas institucionais, categorias preenchidas e produtos elegíveis, inclusive novos produtos sincronizados da PurinCash. São 43 URLs no catálogo atual. Não inclui páginas privadas ou parâmetros de busca e favoritos. Não publica datas artificiais de atualização.
- O Site continua privado para o proprietário. A configuração está preparada para SEO, mas o Google e os robôs de compartilhamento não conseguem acessar uma publicação privada. A audiência só deve ser alterada mediante pedido explícito do usuário.

### Google Analytics 4

A integração está preparada, porém desativada: o usuário informou que ainda não possui o ID de medição. Para ativar posteriormente:

1. Criar a propriedade GA4 e o fluxo Web do domínio correto; copiar o ID `G-...`.
2. Desativar a medição otimizada/automática de páginas no fluxo: este site envia visualizações manualmente, com URLs filtradas, para evitar duplicatas e o envio automático de parâmetros. Referência oficial: https://developers.google.com/analytics/devguides/collection/ga4/views
3. Configurar `GA4_MEASUREMENT_ID` no ambiente do Site e `GA4_ENABLED=true`, publicar a versão e conferir os eventos no relatório em tempo real da propriedade real.
4. Verificar navegação, consentimento, `view_item`, `add_to_cart`, `begin_checkout` e `purchase`. A compra só é enviada após status `paid` confirmado e é deduplicada por pedido neste navegador. Não foi validado recebimento no Google, pois ainda não existe ID configurado.

A tag só é carregada após aceitação dos cookies de análise. Recusar mantém a tag sem carregar. As preferências podem ser alteradas no rodapé quando a integração estiver ativa. Anúncios e sinais publicitários ficam desativados. Não são enviados nome, e-mail, usuário Discord, chaves de pedidos, conteúdo de formulários ou consultas livres. Pedidos, finalização da compra e gestão não geram visualizações de página.

### Compressão sem perda e imagem de compartilhamento

`python3 scripts/optimize-images.py` verifica as imagens do diretório público e só substitui um arquivo por uma versão menor se os pixels RGBA decodificados forem idênticos. Não reduz resolução nem aplica nova compressão com perdas. Arquivos WebP que já estavam menores são preservados. O relatório versionado está em `.openai/image-optimization.json`. A arte dos cartões é servida como WebP sem perda, preservando o PNG para download.

A imagem social `public/assets/tyrex-opengraph.png`, de 1734 × 907 px, foi criada com a ferramenta integrada de geração de imagens. Prompt final: cartão horizontal de compartilhamento da TYREX STORE, mascote azul original com joias douradas à direita, fundo preto/azul elétrico, texto branco exato “TYREX”, “STORE” e “Produtos digitais, gift cards e assinaturas” à esquerda, margens seguras; sem preços, avaliações ou promessas. A arte foi incorporada ao projeto e comprimida sem alterar os pixels.

O comando de produção executa a compressão e os dez testes de regressão de SEO/Analytics antes do build do framework. A suíte completa atual contém 23 testes. A conferência local inclui títulos, descrições, canônicas, Open Graph, noindex em pedidos e a leitura real de robots.txt e sitemap.xml. A indexação e as prévias externas só poderão ser conferidas após uma publicação acessível aos respectivos robôs.
