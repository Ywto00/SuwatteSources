# ManhwaBuddy.com Runner

Este runner permite ler manhwas (webcomics coreanos) do site **ManhwaBuddy.com** no应用 Suwatte/Daisuke.

## Features

- **Catálogo**: Lista popular e latest updates
- **Busca**: Por título/keyword
- **Detalhes da obra**: Título, capa, sinopse, autor, artista, gêneros, status
- **Lista de capítulos**: Com número, título e data
- **Leitor de páginas**: Imagens em alta qualidade

## Configuração

Na primeira vez, configure:
1. **Base URL**: `https://manhwabuddy.com` (padrão)
2. Opcional: Cookie (para bypass de Cloudflare/anti-bot)
3. Opcional: User-Agent customizado

Cookie pode ser obtido no navegador após acessar o site (F12 > Application > Cookies).

Selectors principais:
- Cards de catálogo: `.latest-list .latest-item`, `.item-move`
- Título: `h4` (latest), `h3` (popular)
- Capa: `img[src]`
- Capítulos: `.chapter-list a` com `.chapter-name` e `.ct-update`
- Páginas: `.loading` (imagens lazy-load), `.chapter-content img`

## Testes

```bash
# Build
npm run prep

# Copie a pasta dist/ para o app/dispositivo
```

### Testes manuais no app:

1. **Catálogo** → Popular ou Latest
   - Deve mostrar itens com imagem e título

2. **Busca** → "one piece" (exemplo)
   - Deve retornar resultados

3. **Abrir obra** → clique em um título
   - Detalhes: título, capa, sinopse, gêneros
   - Lista de capítulos: ordem cronológica reversa

4. **Ler capítulo** → clique em um capítulo
   - Páginas devem carregar

## Estrutura do Runner

```
manhwabuddy/
├── index.ts              # Target export
├── impl/
│   ├── contentSource.ts  # getContent, getChapters, getChapterData
│   ├── directoryHandler.ts # getDirectory
│   ├── preference.ts     # cookie, user-agent preferences
│   └── setup.ts          # baseUrl setup
├── store/
│   └── index.ts          # ObjectStore keys (manhwabuddy_*)
├── types/
│   └── index.ts          # Type definitions
└── utils/
    └── index.ts          # parse* functions, requestHtml, resolveUrl
```

## Baseado em

- **Kotlin reference**: `tachiREF/src/en/manhwabuddy/.../ManhwaBuddy.kt`
- **Pattern**: ParsedHttpSource com selectors CSS
- **Site**: https://manhwabuddy.com

## Notas

- Atualmente sem suporte a filtros de gênero (pode ser expandido)
- Paginação simples (next page selector: `.next`)
- Detecção de bot challenge no requestHtml
