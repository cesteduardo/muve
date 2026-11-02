# Muv.e: landing page

HTML, CSS e JS puros. Basta publicar esta pasta em um servidor com HTTPS.

## Antes de publicar
1. Trocar todos os `{{PREENCHER_...}}`: `grep -rn "PREENCHER" . --include=* --exclude=LEIA-ME.md`
2. Colocar a URL do destino dos contatos em `config.js` (`endpoint`). Sem ela, a página publicada NÃO envia o formulário e avisa o visitante.
3. Colocar `gtmId` e/ou `metaPixelId` em `config.js`. O aviso de cookies só aparece quando há rastreamento, e o rastreamento só carrega depois do "Aceitar".
4. Trocar a foto: em `index.html`, procure `FOTO DO FARLEN`. Tire a classe `fundador__foto--provisoria`, aponte para a foto real em proporção 4:5 e ajuste `object-fit` para `cover`.
5. Revisar a política de privacidade com o jurídico.

## O que o formulário envia
POST JSON com: `id_envio`, `nome`, `whatsapp` (só dígitos), `clinica`, `especialidade`, `cidade`, `uf`, `modelo_atendimento`, `investimento_mensal`, `principal_desafio`, `enviado_em`, UTMs, `gclid`, `fbclid`, `referrer`, `pagina`.
O destino deve aceitar CORS e responder 2xx. Use `id_envio` para descartar repetições no destino.

## Eventos no dataLayer
`lp_view`, `cta_click` (`cta_local`), `form_start`, `form_step`, `generate_lead` (só após resposta positiva, com `id_envio`). Se o Pixel estiver carregado, `Lead` dispara no mesmo momento com `eventID = id_envio`, pronto para deduplicar com a CAPI.

## Testar localmente
`python3 -m http.server 4799` nesta pasta. Em localhost, sem endpoint, o envio é simulado e não dispara evento de lead.

## Arquivos da marca usados
- `muve_logo_principal_quadrada.png`: imagem de compartilhamento (`og.jpg`) e origem dos logos vetoriais.
- `muve_logo_reduzida.png`: favicon e ícone do iPhone.
- `muve_logo_reduzida_quadrada.png`: lugar provisório da foto do Farlen.

## Versões anteriores
`_versoes/` guarda as versões anteriores e a comparação de fontes. Não publique essa pasta nem `.impeccable/` e `.taste-skill/`.
