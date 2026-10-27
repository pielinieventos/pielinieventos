# Pielini Coffee — Landing Page

Landing page scrollytelling da **Pielini Coffee**: cafeteria e torrefação com ilhas de cafés especiais e preparo ao vivo para eventos.

## Como abrir

Site 100% estático: basta publicar a pasta (GitHub Pages, Netlify, Vercel, hospedagem comum) ou servir localmente:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Página completa (seções, widgets, símbolos SVG da marca) |
| `assets/js/main.js` | Motion de abertura, scrollytelling e os 4 widgets interativos |
| `assets/js/icons.js` | Somente os ícones Lucide usados (gerado) |
| `assets/css/styles.css` | Tailwind compilado (gerado a partir de `src/input.css`) |
| `assets/seq/` | Motion do grão: 76 quadros recortados (fundo transparente) desenhados conforme a rolagem |
| `assets/img/papel-filtro.jpg` | Textura de papel de filtro do fundo (gerada por `scripts/paper-texture.py`) |
| `assets/svg/` | Emblema e logotipo vetorizados do manual da marca |

## Editar estilos ou ícones

```bash
npm install
npm run build   # recompila o CSS e o pacote de ícones
npm run dev     # recompila o CSS a cada alteração
```

Cores e fontes ficam em `tailwind.config.js` (Creme `#F5F2EB`, Verde Pielini `#2C5E4F`, Marrom Torra `#1E1610`, Caramelo `#C88A4B`; Cormorant Garamond + Plus Jakarta Sans).

O número do WhatsApp fica em `WHATSAPP_NUMBER`, no topo de `assets/js/main.js`.
