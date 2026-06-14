<?php
// ── AxisWorks — Config del chatbot (EJEMPLO) ─────────────────────────
// 1. Copia este archivo a  private/config.php  (sin .example)
// 2. Pon tu API key real de Anthropic (console.anthropic.com → API Keys)
// 3. NUNCA subas config.php ni leads.csv a git (ya están en .gitignore)

define('ANTHROPIC_API_KEY', 'PON_AQUI_TU_ANTHROPIC_API_KEY'); // formato sk-ant-...

// Opcional: cambiar de modelo. Por defecto Haiku 4.5 (rápido y barato).
// Para respuestas más persuasivas: 'claude-sonnet-4-6'
// define('CLAUDE_MODEL', 'claude-sonnet-4-6');
