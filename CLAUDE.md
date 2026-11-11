# Radar Leads

Ferramenta estática (GitHub Pages) de prospecção: encontra comércios por nicho e cidade, diagnostica a oportunidade de venda de um site e gera um prompt individual para criar uma **prévia personalizada**. Código em JavaScript puro (módulos ES), sem build. Testes: `npm test`.

## Prévias personalizadas

Quando o usuário colar um prompt "Prévia personalizada: <comércio>" gerado pelo Radar Leads, crie a prévia seguindo estas regras.

### Processo
1. Pesquise o comércio na web (nome + cidade, Instagram, avaliações, site atual e concorrentes citados no prompt). Use apenas fatos confirmados.
2. Defina um conceito visual próprio para aquele comércio. Nunca reaproveite outra prévia como molde.
3. Crie `previas/<slug>/index.html` exatamente no caminho indicado no prompt.
4. Rode `node scripts/verificar-previa.mjs previas/<slug>/index.html` e corrija tudo o que falhar.
5. Revise visualmente com o Playwright em 390 px e 1440 px de largura (sem rolagem horizontal, textos legíveis, botões tocáveis).
6. Commit com a mensagem `Prévia: <nome do comércio>` e push na branch atual.
7. Responda com: o link final, uma mensagem de WhatsApp curta e pessoal para o dono (até 400 caracteres, citando um detalhe único do negócio, sem pressão) e a lista de fatos confirmados com a fonte.

### Requisitos técnicos
- Arquivo único: CSS e JS embutidos. Única dependência externa permitida: Google Fonts. Mapa pode usar iframe de `https://www.openstreetmap.org/export/embed.html`.
- `<html lang="pt-BR">`, `meta viewport`, `<meta name="robots" content="noindex, nofollow">`, `<title>Nome | Prévia do site</title>` e `meta description` com termos de busca local.
- Faixa no topo com o texto de prévia e o botão "Quero este site" exatamente como indicado no prompt.
- Botão de WhatsApp do comércio (`https://wa.me/55...`) no topo, na seção principal e flutuante no celular.
- Seções: abertura com headline local, serviços, diferenciais (a partir das características reais), espaço de prova social, localização com mapa e horário, contato e rodapé.
- Até 250 KB, contraste AA, foco visível, respeito a `prefers-reduced-motion`, nada de rolagem horizontal em 360 px.

### Honestidade (obrigatório)
- Não inventar avaliações, depoimentos, números, prêmios, preços, certificações ou nomes de profissionais.
- Avaliações só se forem reais e com a fonte; caso contrário, um espaço elegante "Suas avaliações do Google aparecem aqui".
- Texto não confirmado deve soar como sugestão editável, nunca como fato.
- Não usar fotos de terceiros. Use ilustrações em SVG, gradientes, padrões e molduras "Sua foto aqui" bem desenhadas.
- Respeitar as normas de publicidade de conselhos profissionais (OAB, CFM, CFO etc.) citadas no prompt.

### Padrão de qualidade
A prévia deve parecer feita por um estúdio caro: hierarquia tipográfica forte, espaçamento generoso, uma ideia visual marcante ligada ao negócio (por exemplo, a cor da fachada, a especialidade, o bairro) e textos escritos para aquele público. Se parecer um modelo genérico, refaça.
