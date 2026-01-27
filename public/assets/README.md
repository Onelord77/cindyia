# Assets Estáticos

Esta pasta contém os arquivos estáticos públicos da aplicação.

## Estrutura

```
assets/
└── images/
    └── logo.png      # Logo principal da aplicação
```

## Arquivos

### images/

| Arquivo | Descrição |
|---------|-----------|
| `logo.png` | Logo principal da Cindy IA, usada na sidebar e meta tags |

## Uso

Os arquivos nesta pasta são servidos estaticamente e podem ser referenciados usando caminhos absolutos:

```html
<img src="/assets/images/logo.png" alt="Cindy IA" />
```

```tsx
<img src="/assets/images/logo.png" alt="Cindy IA" className="h-9 w-9" />
```
