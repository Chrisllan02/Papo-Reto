# Refinamento visual (padrão aplicado tela a tela)

Refinar, não redesenhar: manter tema escuro e claro, paleta, estrutura, ordem das seções e todo o conteúdo.

1. Texto nunca cortado em JS com "..."; usar `line-clamp` (títulos até 3 linhas).
2. Nada abaixo de 12px (`text-xs`); sem `text-[7px..10px]`. Rótulos em sentence case, sem `uppercase` + `tracking-widest`, exceto siglas.
3. Menos chips: no máximo 2 por item (categoria e tipo). Status vira texto pequeno; "fonte oficial" vira link de texto com `rel="noopener noreferrer"`.
4. Sem repetição: resumo igual ao título some; texto genérico repetido fica discreto (sem caixa pesada), nunca removido.
5. Sem texto cru: "A Definir", vazio, código no lugar de título ficam ocultos ou trocados pela descrição oficial (`utils/feedText.ts`).
6. Acabamento: cards `rounded-2xl`, bordas finas uniformes, gaps 4/6/8, sem glow, `shadow-[0_0_...]`, `scale-105` ou `drop-shadow` decorativo; `active:scale-[0.98]` no máximo.
7. WCAG AA: texto 4.5:1 nos dois temas, foco visível sólido, alvos de toque de pelo menos 44px.
