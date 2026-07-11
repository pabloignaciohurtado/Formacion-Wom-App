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

---

## 9. Re-evaluación v2 — 11 de julio de 2026 (ciclos: ligas, quick-start y analítica de jefaturas)

Se trabajaron **tres dimensiones**; el resto no se mueve.

| # | Dimensión | v1 | v2 | Qué lo movió |
|---|---|:---:|:---:|---|
| 4 | Ligas y competencia (calibración) | 5.0 | **7.5** | Ranking por **división** (compites solo contra tu tier, no global — el arreglo directo del anti-patrón); **zonas de ascenso/descenso** visibles (top 2 sube con ≥4 compitiendo, 0 pts baja) que dan aspiración sin prometer nada que el corte no cumpla; y **auto-competencia** (tu semana actual vs. tu propia semana anterior, comparación justa al mismo punto de la semana). No se tocó la fórmula ni el corte —ya eran buenos— solo el agrupamiento y lo que se muestra. |
| 5 | Onboarding y fricción al valor | 7.0 | **8.0** | **Quick-start:** "Repasar ahora" ya no va al selector — abre directo una sesión que junta las tarjetas SRS vencidas de **todos** los dominios, las más atrasadas primero. Se elimina el desvío de 2 saltos hacia el hábito diario; queda solo el login inicial (inherente a una herramienta corporativa), por eso no llega al 8.5. |
| 6 | Analítica de jefaturas (manager loop) | 6.5 | **7.5** | El tablero deja de solo mostrar: bloque **"Qué atender esta semana"** con tres segmentos accionables (inactivos ≥7 d, precisión <70%, obligatorios pendientes), cada uno un chip que **filtra** el equipo a su gente, con estado positivo cuando no hay nadie. Y **export CSV** del seguimiento (respeta el filtro activo) y del contenido difícil, para cruces propios de la jefatura. Cierra 2 de las 3 brechas del estándar (exportar + filtrar); supera el 7.0 porque el bloque de acción va más allá del dashboard pasivo de Axonify/Centrical. No llega más arriba: falta **rango de fechas / tendencia temporal** y drill al objetivo (Nivel 2, requiere base). |

**Promedio: 6.3 → 6.8.** Las tres dimensiones alcanzan (dims. 4 y 6) o casi (dim. 5) la línea del estándar. Lo que resta: en ligas, recompensa **canjeable/de estatus por equipo** (P2); en onboarding, el cold-start sigue pidiendo login + activación por admin (estándar top-down, no un hueco real); en analítica, **rango de fechas y tendencia** (Nivel 2).

**Detalle técnico.**

- *Ligas.* Migración `ligas_por_division_y_autocompetencia`: `ranking_division()` y `mi_progreso_semanal()` (SECURITY DEFINER, acotadas al tier del que llama). Rollback en `docs/rollback-ligas-division.sql`. Lógica pura `zonaLiga()`/`deltaSemanal()` con pruebas. E2E contra la base con JWTs simulados (5/5, cero residuos).
- *Quick-start.* Ruta `/repasar` reusa la pantalla de práctica en modo repaso: `construirColaRepaso()` (lógica pura con pruebas) resuelve cada tarjeta vencida a su ejercicio + dominio y arma la sesión cross-dominio; cada pregunta guarda su intento con el dominio correcto. Sin cambios en la base.
- *Analítica de jefaturas (Nivel 1).* Lógica pura en `src/lib/seguimiento.ts` (`diasDesde`, `precisionPct`, `enSegmento`, `contarAtencion`) y `src/lib/csv.ts` (`generarCSV`/`descargarCSV`, RFC 4180 + BOM), ambas con pruebas. `AdminEquipo` suma el bloque de segmentos que filtra la tabla y dos botones de export. Reusa los RPC existentes `resumen_equipo` y `precision_por_dominio`: **sin cambios en la base**. Aplica igual a admin y supervisor.

**Siguientes palancas de mayor retorno** (del plan §7): en lo estratégico, **confianza en el SRS** + **vínculo a KPI** (dims. 2 y 7), que son los que llevarían el promedio por encima de 7.9; y, más barato, la **limpieza de la celebración del acierto** (dim. 1) y el **Nivel 2 de analítica** (rango de fechas + drill al objetivo, dim. 6).

---

## 10. Re-evaluación v3 — 11 de julio de 2026 (ciclo: pantalla núcleo — celebración + accesibilidad)

Se trabajó el bloque **P1 de la pantalla de práctica**: las dos dimensiones que dependían de ella. El resto no se mueve.

| # | Dimensión | v2 | v3 | Qué lo movió |
|---|---|:---:|:---:|---|
| 1 | Actividad núcleo y feedback | 7.5 | **8.0** | Se quitan las capas celebratorias redundantes del acierto: fuera el **flash verde a pantalla completa** (tapaba el enunciado) y el **confetti por pregunta**; el acierto se marca con la propia respuesta en verde + check, el "+XP" y la explicación, y el confetti queda para el cierre de sesión. El **enunciado pasa a ser el foco visual** (`text-xl`, por encima del rótulo de dominio): corrige la jerarquía invertida. No llega a 8.5 porque el resto ya era bueno (feedback inmediato, explica el porqué, no auto-avanza) y lo que queda es afinamiento fino. |
| 8 | Accesibilidad y consistencia de UI | 6.0 | **7.5** | Se cierran las tres brechas que la auditoría nombró en la pantalla núcleo: **`aria-live`** en el feedback (el lector de pantalla anuncia acierto/error + explicación), **foco de teclado** que ya no se pierde (salta a "Siguiente" al responder y al enunciado al avanzar), y **contraste AA** (rojo de error a `red-700`/`red-600`). Alcanza el estándar *en la pantalla núcleo*; una pasada WCAG completa por el resto de las pantallas (orden de foco, etiquetas de formularios, roles) es un esfuerzo aparte y mayor. |

**Promedio: 6.8 → 7.1.** Cruza por primera vez la línea de 7.0 — el objetivo que el plan §7 proyectaba al cerrar los P0 más el bloque P1 del núcleo. De las ocho dimensiones, seis están en 7.5+; las dos que faltan son las estratégicas (SRS con confianza y vínculo a KPI).

**Detalle técnico.**

- *Celebración (dim 1).* En `src/pages/Practica.tsx` se elimina el estado `flash` y su overlay `.wom-flash` (también su CSS en `index.css`) y el confetti dentro de `responder()`. El enunciado sube a `text-xl` y recibe `ref` + `tabIndex={-1}` como ancla de foco. Sin cambios en la base.
- *Accesibilidad (dim 8).* El panel de feedback es `role="status"` con `aria-live="polite"`. Un `useEffect` por fase mueve el foco a `siguienteRef` (feedback) o `preguntaRef` (pregunta nueva). `Boton` (`src/components/ui.tsx`) pasa a `forwardRef` para poder enfocarlo. Los rojos de error suben a `red-700` (texto) y `red-600` (ícono).

**Siguientes palancas** (del plan §7): quedan las dos estratégicas que cruzarían el promedio por encima del estándar (7.9) — **confianza en el SRS** (dim. 2, el foso) y **vínculo a KPI del rol** (dim. 7, la más baja en 3.0). Esta última necesita una decisión de negocio: qué KPI (AHT, FCR, CSAT, conversión) y de qué fuente entra el dato. También sigue pendiente el **Nivel 2 de analítica** (dim. 6) y una **recompensa canjeable** (dim. 3), ambas con decisiones de producto/datos.

---

## 11. Re-evaluación v4 — 11 de julio de 2026 (ciclo: confianza en el SRS)

Se trabajó **la dimensión 2**, la palanca estratégica más profunda (el "foso" del §5). El resto no se mueve.

| # | Dimensión | v1 | v4 | Qué lo movió |
|---|---|:---:|:---:|---|
| 2 | Repaso espaciado (SRS) y retención | 7.0 | **8.0** | **Aprendizaje basado en confianza.** Entre elegir y revelar, el relator marca "¿qué tan seguro/a?" (un solo toque). El SRS usa la seguridad: acierto seguro sube de caja, acierto con dudas se queda (conocimiento frágil), el error vuelve a la caja 1. Y el feedback nombra el cuadrante del 2×2, resaltando el **seguro-pero-equivocado** (el *Misinformed*): el caso más caro en atención, porque el relator daría mal la información sin dudar. Es exactamente lo que el §5 marcaba como la capa que separa "quiz gamificado" de "aprendizaje que cambia conducta". No sube más porque quedan los **topes de intervalo más largos** (la caja máxima sigue en 16 días), un afinamiento menor. |

**Promedio: 7.1 → 7.2.** Siete de las ocho dimensiones quedan en 7.5+. La única baja es la dim. 7 (vínculo a KPI, 3.0), que es la última palanca estratégica y la que necesita una decisión de negocio para arrancar.

**Detalle técnico.**

- Migración `intentos_con_confianza`: columna `attempts.confianza` (boolean, nullable; los intentos previos quedan en null). Rollback en `docs/rollback-confianza-srs.sql`. `get_advisors(security)` sin lints nuevos; insert con `confianza` verificado E2E contra la base (transacción con rollback, cero residuo).
- Lógica pura en `src/lib/srs.ts`: `siguienteCaja(caja, correcto, seguro?)` (el 3er argumento es opcional → compatibilidad hacia atrás) y `clasificarRespuesta()` (el 2×2), ambas con pruebas.
- `Practica.tsx`: fase `'confianza'` entre elegir y revelar, con su propio foco de teclado; el confetti/celebración y el flujo offline se mantienen intactos.

**Lo que queda.** La palanca de mayor impacto pendiente es el **vínculo a KPI del rol** (dim. 7): conectar la formación con AHT/FCR/CSAT/conversión, lo que la vuelve "no opcional". Requiere definir qué KPI y de qué fuente entra el dato — una decisión de negocio, no de código. Más abajo en retorno: **Nivel 2 de analítica** (dim. 6, rango de fechas + drill), **topes de intervalo** (dim. 2) y **recompensa canjeable** (dim. 3, decisión de producto).
