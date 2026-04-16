# Product Telemetry — Landing

Landing pública estática para Product Telemetry. Sin build step, sin dependencias, completamente autocontenida.

## Stack

- HTML + CSS + JS vanilla
- Bilingüe EN/ES (EN default, switcher persistido en `localStorage`)
- Convenciones de diseño AInvirion (island navbar, footer dos niveles, tokens compartidos)

## Correr localmente

Desde esta carpeta (`frontend/landing/`):

```bash
# Opción 1 — Python stdlib (recomendado, siempre disponible)
python3 -m http.server 5500

# Opción 2 — Wrapper que abre el browser automáticamente
python3 serve.py

# Opción 3 — Node (si lo tenés)
npx serve .
```

Luego abrir http://localhost:5500.

> **Nota:** Servir vía `file://` no funciona — `fetch('locales/...')` requiere HTTP.

## Estructura

```
frontend/landing/
├── index.html
├── assets/
│   ├── css/    # tokens, base, navbar, sections, footer
│   ├── js/     # i18n, navbar, morphs
│   └── images/
├── locales/    # en.json, es.json
├── README.md
└── serve.py
```

## i18n

- Texto inglés inline en HTML como fallback
- Atributos `data-i18n="section.key"` en cada nodo traducible
- Switcher en navbar — persistencia vía `localStorage.lang`
- Nombres de producto y AInvirion no se traducen
