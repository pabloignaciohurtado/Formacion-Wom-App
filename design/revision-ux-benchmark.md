# Benchmark UX/UI multidimensional — Formación WOM vs. líderes del mercado

**Fecha:** 10 de julio de 2026 · **Versión:** v1 (línea base)
**App evaluada:** https://pabloignaciohurtado.github.io/Formacion-Wom-App/
**Método:** descubrimiento en paralelo (investigación externa con fuentes + auditoría de la pantalla núcleo + mapa de flujo con tiempos reales del código) → estándar de categoría → scorecard 1–10 contra el estándar → hallazgos priorizados por impacto en percepción.

---

## 1. Posición competitiva

La categoría se ordena en dos ejes: **gamificación de engagement ↔ ciencia del aprendizaje (SRS/retención)** y **consumo self-serve ↔ frontline enterprise (top-down, KPI de negocio)**. Formación WOM cae en el cuadrante **“frontline enterprise con gamificación tipo consumo + SRS explícito”** — el mismo terreno de **Axonify** y **Centrical** (los líderes específicos de call center), tomando prestada la mecánica de **Duolingo** y el motor Leitner de **Anki / EdApp**.

**Grupo en que compite:** microlearning gamificado para personal de primera línea.
**Hueco diferenciable y defendible:** es una app **propia**, sin riesgo de que un proveedor mate features de las que dependes (EdApp/SC Training retira su producto standalone en marzo 2026, forzando migración y pérdida de historial). Ya trae el set completo de progresión + SRS Leitner real + obligatorios asignables por supervisor + analítica de equipo. El diferenciador **más barato de conseguir** es justo donde los líderes de $$$ decepcionan: un **panel de jefaturas flexible, filtrable y exportable**.

## 2. El insight estructural de la categoría

Lo que separa a las ganadoras de las perdedoras **no es la gamificación** (todas la tienen), sino tres cosas:

1. **El manager es el producto, no un espectador.** En Axonify/Centrical la jefatura vive dentro del loop: recibe alertas de brechas y actúa hasta nivel individual (Centrical llega a auto-agendar coaching con IA). Donde el manager no tiene lugar, la herramienta no escala en frontline. Para WOM, el panel de supervisores no es un reporte de cumplimiento: es el mecanismo por el que el dato se vuelve conversación de desempeño.
2. **Ligar la formación al KPI real del rol es lo que la hace “no opcional”.** Axonify y Centrical ganaron el call center conectando el microlearning con **AHT, FCR, CSAT, conversión**. La formación desconectada del KPI se percibe como “tarea extra” y muere.
3. **El refuerzo espaciado es el foso, y el leaderboard individual desmotiva al que va perdiendo.** El SRS convierte “jugar” en “recordar”. Y el hallazgo mejor documentado de la categoría: una **liga individual y global es un anti-patrón** para el 70% inferior de la tabla (evidencia peer-reviewed en Kahoot; “streak/ligas” de ansiedad en Duolingo). Las líderes lo mitigan: cohortes pequeñas (~30 en Duolingo), segmentación por nivel/tenure, competencia contra uno mismo, y recompensas por equipo.

## 3. El estándar mínimo de la categoría (vara de medir)

Prácticas que **todas** las líderes comparten:

1. Sesión ultracorta como unidad atómica (3–5 min).
2. Feedback inmediato pregunta a pregunta.
3. Onboarding sin fricción para el aprendiz; la configuración cargada en el admin.
4. Algún refuerzo espaciado / anti-curva del olvido (requisito de pertenencia, no un extra).
5. Set completo de progresión visible (XP + niveles + insignias + leaderboard + certificados).
6. Recompensa tangible o de estatus (algo que canjear).
7. Panel de analítica que liga formación → comportamiento/KPI, con segmentos accionables.
8. Contenido asignable/obligatorio con recordatorios, por el manager.

---

## 4. Scorecard (1–10 contra el estándar, no contra la perfección)

| # | Dimensión | WOM | Estándar | App de referencia | Brecha específica |
|---|---|:---:|:---:|---|---|
| 1 | Actividad núcleo y feedback | **7.5** | 8.5 | EdApp · Duolingo | Feedback inmediato, explica el porqué y no auto-avanza (muy bien), pero **~8 canales redundantes para “correcto”** + flash verde a pantalla completa + jerarquía invertida (el rótulo de dominio pesa más que la pregunta). |
| 2 | Repaso espaciado (SRS) y retención | **7.0** | 8.0 | Axonify · Anki · EdApp | Leitner real (cajas, intervalos 1/2/4/8/16 d) — ya en la categoría. Falta la **evaluación basada en confianza** (distinguir “seguro pero equivocado”) y topes de intervalo más largos. |
| 3 | Gamificación y progresión | **8.0** | 8.0 | Duolingo · Centrical | **A la par**: XP, niveles, racha, insignias, certificados, ranking. Falta recompensa **canjeable/tangible** (tienda de puntos). |
| 4 | Ligas y competencia (calibración) | **5.0** | 7.5 | Centrical | La **fórmula ya premia corrección sobre velocidad** con topes anti-atracón (excelente, evita el anti-patrón Kahoot), pero la liga es **individual y global**: el agrupamiento castiga al 70% inferior. Sin segmentación por equipo, sin auto-competencia. |
| 5 | Onboarding y fricción al valor | **7.0** | 8.5 | Axonify · 7taps | 3 taps al primer valor con sesión viva; pero el CTA **“Repasar ahora” no inicia una sesión**: obliga a pasar por el selector de dominios (2 saltos + 2 esperas). |
| 6 | Analítica de jefaturas (manager loop) | **6.5** | 7.0 | Axonify · Centrical | Resumen de equipo, precisión por dominio, ficha individual y asignación por supervisor. Falta **exportar (CSV/Excel), filtrar y rango de fechas** — pero aquí los líderes también decepcionan, así que la brecha es chica y explotable. |
| 7 | Vínculo formación ↔ KPI del negocio | **3.0** | 8.5 | Axonify · Centrical | Se mide “curso completado / precisión / XP”, **no** AHT, FCR, CSAT ni conversión. Es lo que hace la formación “no opcional”; hoy no existe el puente. |
| 8 | Accesibilidad y consistencia de UI | **6.0** | 7.5 | WCAG · Duolingo | Diseño consistente y reduced-motion en general; pero **feedback sin `aria-live`** (lector de pantalla mudo en acierto/error), foco de teclado se pierde al responder, `red-500` no pasa AA. |
| | **Promedio** | **6.3** | **7.9** | | |

**Lectura:** una app indie genuinamente buena — a la par en completitud de gamificación y muy sólida en el núcleo — con **dos brechas estratégicas** (vínculo a KPI y calibración de la liga) y **deuda de accesibilidad**.

---

## 5. Hallazgos priorizados (por impacto en la percepción del usuario)

1. **(P0) La liga es individual y global → desmotiva al fondo de la tabla.** Anti-patrón documentado. La fórmula ya es buena (premia corrección, no velocidad); el problema es el *agrupamiento*. Mitigaciones probadas: segmentar por equipo/supervisor, competencia contra tu propia semana anterior, recompensas por equipo. Es la palanca de mayor impacto sobre la motivación sostenida — directamente ligada al abandono documentado en `docs/ESTADO.md §5`.
2. **(P0) El camino al hábito diario tiene un desvío de 2 saltos.** “Repasar ahora” va al selector, no a una sesión. Para una app cuyo motor es la racha de 3–5 min por turno, cada salto extra pesa. Un **quick-start** que caiga directo en una sesión de repasos ataca el mismo problema de retención.
3. **(P1) La celebración del acierto es ruido para la pregunta 10.** ~8 canales simultáneos + flash a pantalla completa que tapa la propia pregunta. Reducir a 3–4 canales y corregir la jerarquía (la pregunta debe pesar más que el rótulo de dominio).
4. **(P1) Deuda de accesibilidad en la pantalla núcleo.** Resultado no anunciado a lectores de pantalla, foco de teclado perdido al responder, `red-500` bajo AA. Para una herramienta corporativa (potencialmente obligatoria) esto es exclusión, no cosmética.
5. **(P2, estratégico) Falta la capa que separa “quiz gamificado” de “aprendizaje que cambia conducta”:** dimensión de **confianza** en el SRS (detectar el *Misinformed* — el agente seguro pero equivocado, exactamente lo que un call center no puede permitir) y **vínculo a KPI** del rol.

## 6. Fortalezas a proteger (no tocar en ciclos futuros)

- **La pregunta es la protagonista real:** la gamificación **no invade** la sesión (solo XP); ni mascota, ni racha, ni liga, ni insignias dentro de la práctica. Disciplina rara y valiosa.
- **El error está mejor tratado que el acierto:** explica el porqué en ambos casos, sin confetti ni flash en el error. Eso es pedagogía.
- **El feedback no auto-avanza:** el usuario controla el ritmo; el feedback persiste.
- **La fórmula de la liga ya evita el anti-patrón de velocidad** (Kahoot) con topes anti-atracón. **No tocar la fórmula, solo el agrupamiento.**
- **SRS Leitner real** (no mero scheduling), offline honesto, lazy loading, reduced-motion respetado en general, contraste tuneado donde importa.
- **App propia** = sin riesgo de vendor kill-switch.

## 7. Plan de cierre

| Prioridad | Acción | Esfuerzo | Impacto |
|---|---|---|---|
| **P0** | Quick-start: “Repasar ahora” salta directo a una sesión de repasos, sin pasar por el selector | Bajo | Alto |
| **P0** | Liga segmentada por equipo/supervisor + auto-competencia (vs. tu semana anterior) | Medio | Alto |
| **P1** | Reducir la celebración del acierto a 3–4 canales; acotar/quitar el flash a pantalla completa; corregir jerarquía (pregunta > rótulo) | Bajo | Medio-Alto |
| **P1** | Accesibilidad del núcleo: `aria-live` en feedback, foco a “Siguiente”, `red-700`, gatear animaciones por `reduce` | Bajo-Medio | Medio |
| **P1** | Panel de jefaturas exportable (CSV/Excel) + filtros + rango de fechas | Medio | Alto (diferenciador barato) |
| **P2** | Dimensión de confianza en el SRS (seguro/inseguro → detectar *Misinformed*) | Medio | Alto (foso) |
| **P2** | Vincular ejercicios a KPI del rol (AHT/FCR/CSAT) | Alto | Alto (estratégico) |
| **P2** | Recompensa canjeable / estatus tangible por XP | Medio | Medio |

**Proyección:** cerrar los dos P0 (quick-start + liga segmentada) más el bloque P1 de la pantalla núcleo mueve el promedio de ~6.3 a ~7.2–7.4 sin tocar la arquitectura. Los dos P2 estratégicos (confianza + KPI) son los que llevarían la app por encima de la línea del estándar (7.9) y hacia el terreno defendible frente a Axonify/Centrical.

---

## 8. Fuentes (selección)

Investigación con búsqueda web sobre Axonify, Centrical, Duolingo, EdApp/SC Training, Kahoot!, MobieTrain, Anki, Quizlet, 7taps, Spekit y Gnowbe (ratings de G2/Capterra/App Store/Play y quejas de reseñas, estado 2025–2026). Evidencia peer-reviewed del anti-patrón de velocidad: CBE—Life Sciences Education (`lifescied.org/doi/10.1187/cbe.20-08-0187`). Remediación “Accuracy mode” de Kahoot (mayo 2025). Cierre standalone de EdApp/SC Training (marzo 2026). Auditoría de código sobre `src/pages/Practica.tsx`, `src/pages/Panel.tsx`, `src/pages/Ejercicios.tsx`, `src/lib/motion.ts`, `src/lib/srs.ts` y `src/components/Layout.tsx`.

> **Re-evaluación (Fase 5):** tras un ciclo de mejoras, re-puntuar **solo** las dimensiones con trabajo real, justificando cada movimiento, y anexar aquí la tabla v1 | v2 | qué lo movió. Las dimensiones sin trabajo no se mueven: la honestidad del bench es su valor.
