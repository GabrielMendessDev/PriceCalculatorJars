# 🫙 Calculadora de Potes

Ferramenta web para calcular preços de combos de potes com desconto, valor por unidade e economia em tempo real.

---

## ✨ Funcionalidades

- **Combos configuráveis** — defina quantos kits quiser (ex: 2, 3, 6 potes) pelo modal de configuração
- **Cálculo automático** — valor total riscado, desconto, preço por pote e economia calculados ao digitar
- **Badge de % OFF** — exibe a porcentagem de desconto em cada combo
- **Preço base editável** — altere o valor individual do pote e todos os combos recalculam instantaneamente
- **Dois modos de entrada** — digite o valor total do combo ou o valor por pote; a conversão é automática
- **Salva automaticamente** — combos, preço base e valores digitados persistem no navegador (localStorage)
- **Design responsivo** — funciona em desktop e mobile

## 🖥️ Preview

> Interface dark com cards por combo, badge de desconto e banner de economia em verde.

## 🚀 Como usar

1. [Abrir o site](https://gabrielmendessdev.github.io/PriceCalculatorJars/) no navegador
2. Defina o **valor individual por pote**
3. Clique em **⚙ Configurar combos** e configure as quantidades desejadas
4. Em cada card de combo, insira o **valor total com desconto**
5. Os resultados aparecem automaticamente

> Não requer instalação, servidor ou dependências. Funciona 100% no navegador.

## 📁 Estrutura

```
├── index.html                     # Estrutura HTML
├── styles.css                     # Estilização (tema dark, responsivo)
├── script.js                      # Lógica de cálculo e modal
├── fonts/
│   └── inter-latin-var.woff2      # Inter variável (subset latino), self-hosted
└── img/
    ├── favicon-64.png             # Ícone da aba
    └── favicon-180.png            # Ícone de tela inicial (iOS)
```

## 🛠️ Tecnologias

- HTML5
- CSS3 (variáveis CSS, Grid, animações)
- JavaScript puro (sem frameworks)
- Inter (fonte variável self-hosted, sem requisições a terceiros)

## 👤 Autor

Desenvolvido por **Gabriel Mendes**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/gabriel-mendes-bb5571264/)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/gabrielmenndess/)
