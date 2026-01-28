# Public

Arquivos estáticos servidos publicamente pela aplicação.

## Estrutura

```
public/
├── assets/
│   └── images/
│       └── logo.png       # Logo principal (também usada como favicon)
├── placeholder.svg        # Imagem placeholder
└── robots.txt             # Configuração para crawlers
```

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `assets/images/logo.png` | Logo principal da Cindy IA (favicon + sidebar) |
| `placeholder.svg` | Imagem placeholder genérica |
| `robots.txt` | Configuração de crawlers |

## Notas

- A logo (`logo.png`) é usada como favicon, apple-touch-icon e nas sidebars
- Arquivos nesta pasta são copiados diretamente para a raiz do build
