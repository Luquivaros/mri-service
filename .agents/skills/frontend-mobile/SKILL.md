---
name: frontend-mobile
description: Diretrizes e melhores práticas para desenvolvimento e otimização de interfaces web mobile-first e responsivas.
---

# Frontend Mobile Skill

## Princípios de Design Mobile-First
1. **Escopo Estrito de Media Queries**:
   - Todas as customizações e regras mobile devem ser isoladas dentro de `@media (max-width: 991px)` ou `@media (max-width: 768px)`.
   - A versão Desktop (telas > 991px) deve ser mantida 100% intacta e sem alterações colaterais.

2. **Navegação Mobile (Header & Drawer)**:
   - Header fixo compacto com `backdrop-filter: blur()`.
   - Botão Hamburger de toque rápido (mínimo 44x44px de área de toque) com transição suave para ícone de fechar (X).
   - Menu Drawer lateral/overlay fluido com fundo de vidro (*glassmorphism*), tipografia legível e espaçamento de toque confortável (padding vertical de 14-16px por link).
   - Submenus em acordeão dobrável para navegação intuitiva em listas longas.

3. **Imagens de Fundo & Hero**:
   - Ajustar `background-size: cover` e `background-position: center`.
   - Garantir que sequências de imagens e vídeos de fundo mantenham proporção correta sem achatar ou cortar conteúdo vital no celular.
