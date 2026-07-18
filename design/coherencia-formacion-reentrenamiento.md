# Coherencia: Formación vs. Re-entrenamiento en Formación WOM

**Fecha:** 2026-07-18  
**Alcance:** Análisis de la plataforma Formación WOM (v1 en producción) como soporte a formación inicial y re-entrenamiento continuo de relatores en WOM.

---

## 1. Definiciones operacionales

En el contexto de una telco como WOM:

- **Formación (inicial)**: Onboarding de nuevos relatores. Objetivo: alcanzar competencia mínima en 13 dominios (Portabilidad, Planes, Prepago, Internet, Roaming, Atención al Cliente, etc.). Horizonte: 30–60 días. Patrón: intenso, lineal, con múltiples materiales de referencia.

- **Re-entrenamiento**: Capacitación continua de relatores activos. Objetivo: mantener/mejorar competencia en dominios existentes y adaptarse a cambios de producto/servicio (nuevos planes, políticas, procedimientos). Horizonte: toda la carrera del relator. Patrón: esporádico, reactivo a cambios, con énfasis en conocimiento volátil.

---

## 2. Cómo la app soporta formación inicial (bien diseñado)

### 2.1 Contenido y ritmo

- **Catálogo estable** en `src/data/contenido.ts`: 13 dominios, 3 categorías, ~130 ejercicios de múltiple opción con explicación pedagógica. Tiene los bloques conceptuales que un relator nuevo necesita dominar.

- **SRS con confianza** (`intentos_con_confianza`): Repaso espaciado detecta no solo errores, sino seguro-pero-equivocado (conocimiento frágil). Ideal para formación: un relator novel necesita identificar huecos conceptuales y cerrarlos antes de hablar con clientes.

- **Gamificación intensiva** (XP, niveles, racha, ligas, insignias): Mantiene a un relator novel motivado durante los primeros 30–60 días cuando la motivación extrínseca es crítica. Las ligas semanales crean urgencia.

### 2.2 Actividades obligatorias + materiales

- **Actividades obligatorias**: Permite que el equipo de formación asigne cursos, firmas de políticas, hitos (ej. "Certificado de Atención al Cliente en 5 días"). Integración con biblioteca de materiales (adjuntados a actividades).

- **Biblioteca de materiales**: PDFs, documentos, presentaciones, imágenes, enlaces a videos externos. Centralizada, reutilizable, versionable implícitamente (crear versión 2 es crear un nuevo material).

### 2.3 Panel admin: visibilidad y acción

- **Resumen de equipo**: Qué atender esta semana (inactivos, baja precisión, obligatorias pendientes). Accionable al nivel Nivel 1 (coordinador de turno).

- **Ficha individual**: Drill hacia objetivos específicos con baja precisión. Sirve para sesiones 1:1 entre jefe y relator: "necesitas mejorar en Proceso de Portabilidad".

- **Exportar**: PDF/Excel de equipos e individuos para legajos y reuniones.

---

## 3. Brechas actuales para re-entrenamiento

### 3.1 Contenido volátil no tiene hogar

Un relator experimentado practica los 13 dominios hoy y conoce la mayoría. Pero:

- **Cambio de producto**: Entra un nuevo plan, o cambia la política de devoluciones. Necesita **actualizar solo la parte afectada** sin repasar Técnicas de Formación o Internet Fibra.

- **Cambio de procedimiento**: Nuevo flujo de reclamo, cambio en comisiones. Es 10 preguntas nuevas en 2 dominios, no 130.

- **Volátil vs. durable**: Club WOM separa esto en diseño (`design/metodologia-beneficios.md`), pero solo para un dominio. No hay mecanismo para marcar "esta pregunta caduca el 2026-08-31" o "solo para relatores en Atención al Cliente".

### 3.2 Gamificación deja de motivar después de cierto punto

- Un relator que alcanzó Héroe WOM (1800 XP) hace 2 meses: ¿qué lo motiva ahora a practicar?
- Las ligas se resetean cada semana (bueno), pero si cae a Bronce por no practicar 1 semana y sabe que puede volver a Héroe en 3 días, el "riesgo" se disuelve.
- Insignias: "Primer paso", "7 días de racha", "100 ejercicios" — después de alcanzarlas, no hay más.
- **No hay mecánica de "maestría de experto"**: certificarse en un dominio al 100% descarga un PNG, punto. No hay "Experto en Club WOM" o "Recertificación anual".

### 3.3 Re-entrenamiento reactivo (cuando algo cambia) vs. proactivo (mejora continua)

- Hoy: cambio de producto → admin publica una Actividad Obligatoria → relatores lo completan.
- Falta: cuando sea rentable, un relator debería practicar los dominios donde está débil (precisión <75%) de forma *periódica*, no solo cuando hay una tarea asignada.
- Falta: "cargador de preguntas dinámicas" (ej. importar desde Google Sheets o un editor web) para que cambios pequeños se reflejen sin recompilación.

### 3.4 Cohesión temporal: no hay "ciclos de re-entrenamiento"

- La app registra `fecha` en cada intento, pero no hay concepto de "este relator completó la formación el 2026-06-15" o "está en el ciclo de recertificación trimestral de 2026-Q3".
- Dificulta responder: "¿qué % de mis relatores renovó su certificación en Club WOM este trimestre?"

---

## 4. Cómo enriquecer para re-entrenamiento

### 4.1 Rápido (sin cambios de BD)

**Segmentación de contenido en el catálogo**

- Agregar metadata a `src/data/contenido.ts`:
  ```typescript
  export const EJERCICIOS = {
    "cw-01": {
      titulo: "...",
      dominio: "club-wom",
      objetivo: "elegibilidad-usuario",
      tipo: "DURABLE",      // ← Nuevo: o DURABLE, VOLÁTIL, o CAMBIO_PUNTUAL
      diasVigencia: 365,     // ← Si es VOLÁTIL, cuántos días
      versión: "2.1",
      cambios: "Actualizado con nuevos comercios",
      ...
    }
  }
  ```
  - En el SRS, si algo es VOLÁTIL y caduca hoy, ofrécelo en la cola antes que nada.
  - En Admin, filtro "Mostrar cambios recientes (últimos 30 días)" para priorizar en reuniones.
  - Test de integridad: validar que cambios puntuales tengan `diasVigencia` ≤ 60.

**Certificación recurrente**

- Modelo: "Certificado de Club WOM válido por 365 días a partir de hoy".
- En `AdminEquipo`: columna "Próximo vencimiento de certificación" (calculado como max(fecha_certificado) + 365).
- Insignia "Certificación activa" (de corta duración, se recomputa cada semana).
- El 1:1 es ahora: "Tu certificado en Club WOM vence el 2027-07-15; hoy podrías recertificarte pasando 10 ejercicios nuevos."

**Meta de re-entrenamiento minimalista**

- En `FichaRelator`: agregar una meta especial "Mantener precisión ≥85% en X dominio" (vs. "alcanzar 100% en Y objetivo").
- Permite que un jefe diga: "necesito que tus 5 relatores mantengan ≥80% en Portabilidad", sin pensar en % de maestría absoluta.

### 4.2 Medio (1–2 migraciones de BD)

**Tabla `ciclos_capacitacion`**

```sql
CREATE TABLE ciclos_capacitacion (
  id UUID PRIMARY KEY,
  relator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dominio_id TEXT NOT NULL, -- ej: 'club-wom'
  tipo ENUM('formacion_inicial', 're-entrenamiento_trimestral', 're-entrenamiento_anual') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_limite DATE NOT NULL,
  estado ENUM('pendiente', 'en_curso', 'completado', 'incompleto') NOT NULL,
  meta_ejercicios INT DEFAULT 10, -- cuántos ejercicios nuevos/repasados esperamos
  intentos_realizados INT DEFAULT 0,
  precisión_promedio NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(relator_id, dominio_id, fecha_inicio)
);
```

- Un ciclo es un bloque temporal de "deberías practicar esto antes del 31-jul-2026".
- En Admin: "Crear ciclo de re-entrenamiento" → dominio, relatores, duración, meta de ejercicios.
- En Relator: "Ciclos activos" en la pantalla principal; practica cuenta hacia la meta.
- En FichaRelator: progreso del ciclo (8/10 ejercicios, precisión 82%, 5 días restantes).

**Vista materializada `progreso_ciclos_hoy`**

```sql
SELECT 
  r.id, r.nombre,
  cc.dominio_id, cc.tipo,
  cc.fecha_limite,
  COUNT(a.id) as intentos_ciclo,
  AVG(CASE WHEN a.correcto THEN 1 ELSE 0 END) as precision_ciclo
FROM ciclos_capacitacion cc
JOIN auth.users r ON cc.relator_id = r.id
LEFT JOIN attempts a ON a.user_id = r.id 
  AND a.domain_id = cc.dominio_id
  AND a.fecha >= cc.fecha_inicio
  AND a.fecha <= cc.fecha_limite
WHERE cc.estado = 'en_curso'
GROUP BY r.id, r.nombre, cc.dominio_id, cc.tipo, cc.fecha_limite
```

- `AdminEquipo` lo consulta para mostrar "x relatores en ciclo de recertificación, 5 quedan rezagados".

### 4.3 Largo (estrategia de contenido y flujo)

**Cargador dinámico de preguntas**

- API webhook que permite a un admin importar preguntas desde un Google Sheet o Strapi.
- Nueva categoría `EJERCICIOS_DINAMICOS` en el catálogo, que se refresca en pre-runtime.
- Permite que Pablo suba "Cambios de procedimiento — Julio 2026" sin tocar git.

**Diferenciación por carrera/trayectoria**

- Agregar `carrera` a `profiles` (ej. 'relator-atención', 'relator-técnico', 'supervisor', 'gerente').
- Contenido puede marcar "solo para relator-técnico" (ej. "Internet Fibra" no lo ve atención).
- Alcance de re-entrenamiento: en Julio, recertifica Internet solo quien está en técnico; en Agosto, cambio de políticas de reclamo afecta a todos.

**Panel de competencia** (dashboard avanzado)

- Matriz: filas = relatores, columnas = dominios, celdas = precisión actual + fecha del último intento + "necesita recertificación" (rojo).
- Filtros: por división, por carrera, por estado de re-entrenamiento.
- Export CSV para analytics externo (calcular si la inversión en re-entrenamiento baja AHT).

---

## 5. Diagnóstico: ¿por qué hay brecha?

La app fue diseñada para **formación inicial de cero a relator**. Esto es un proyecto de 30–60 días por persona, con inversión clara.

Re-entrenamiento es **indefinido** y reactivo: "¿cuándo terminan de re-entrenarse? Nunca; cuando cambia algo, vuelven." Eso es más difícil de modelar sin parecer hiper-controlador.

Pero para WOM, re-entrenamiento es **crítico**:

- Relatores son el punto de contacto con clientes. Error en procedimiento = insatisfacción + churn.
- Cambios de producto/políticas son frecuentes (nueva línea de negocios, cambio de comisiones).
- Algunos errores son costosos (ej. informar mal sobre devoluciones: cliente se siente engañado).

---

## 6. Recomendación: alcance para próximas sesiones

### Fase 1 (esta sesión): Validar modelo conceptual

1. ¿Es correcta esta separación (formación inicial vs. re-entrenamiento)?
2. ¿Qué tipo de re-entrenamiento es más frecuente hoy: cambios de producto, cambios de procedimiento, o "mejorar a relatores débiles"?
3. ¿Con qué frecuencia se espera que un relator sea "recertificado" en un dominio? (anual, trimestral, bajo demanda)
4. ¿Hay KPI externo (AHT, CSAT, FCR) que se espera mejore con re-entrenamiento?

> **Addendum 2026-07-18 — supuestos tomados para implementar sin bloquear.**
> Pablo autorizó ejecutar las Fases 1–3 de punta a punta sin pausar a
> preguntar. Para (1) y (2) se implementó sin asumir una respuesta única: el
> nuevo módulo de "ciclos de re-entrenamiento" (§8.2 de `DOCUMENTACION.md`)
> soporta los tres disparadores identificados —recertificación periódica,
> cambio de producto/procedimiento, refuerzo por baja precisión— como un
> campo `tipo` elegible caso a caso, así que no hace falta comprometerse a
> uno solo. Para (3), no se fijó una cadencia por defecto (ni trimestral ni
> anual): cada ciclo lleva su propia `fecha_limite`, decidida por quien lo
> abre. Para (4) — **no se tocó**: el vínculo a un KPI de negocio sigue
> bloqueado explícitamente por Pablo (ver "Pendientes de decisión humana" en
> `CLAUDE.md`), y nada de esta implementación asume ni inventa esa conexión.

### Fase 2 (próximas sesiones): Implementar lo "rápido"

- Segmentación de contenido (DURABLE/VOLÁTIL) en `contenido.ts`.
- Certificación recurrente (insignia + vencimiento).
- Meta de "mantener precisión ≥X%".
- Filtro en Admin: "Mostrar ejercicios nuevos/cambiados en los últimos 30 días".

**Costo estimado**: 1–2 sesiones, 0 migraciones de BD.

### Fase 3 (si es prioritario): Ciclos de capacitación

- Tabla `ciclos_capacitacion` + vistas.
- UI en Admin para crear ciclos.
- Progreso en Panel y FichaRelator.

**Costo estimado**: 2–3 sesiones, 1 migración de BD + E2E real contra Supabase.

### Fase 4 (largo plazo): Competencia avanzada

- Cargador dinámico de preguntas.
- Diferenciación por carrera.
- Panel de competencia (matriz).

**Costo estimado**: 3–5 sesiones, 1–2 migraciones, arquitectura de datos externa (Google Sheets, Strapi, etc.).

---

## 7. Conclusión

La app **resuelve formación inicial de forma sólida**. Para re-entrenamiento, tiene todos los *primitivos* (SRS, materiales, actividades, analítica), pero le falta:

1. **Concepto de ciclo temporal**: "Del 15 de Julio al 31 de Julio, estos 5 relatores deben pasar por re-entrenamiento de Club WOM."
2. **Diferenciación de contenido**: "Esta pregunta es nueva en Julio, priorizar" o "Esta pregunta caduca el 31 de Agosto".
3. **Recertificación**: Insignias que vencen y se renuevan, no que simplemente se alcanzan una vez.

Sin estos, re-entrenamiento se siente como "más de lo mismo" — los relatores ven el SRS igual, la gamificación igual, sin claridad de qué ha cambiado y por qué necesitan practicar hoy.

La Fase 2 (alcance y vencimientos) es la inversión mínima con máximo valor percibido. A partir de ahí, las decisiones sobre ciclos (Fase 3) y contenido dinámico (Fase 4) dependen de qué tan frecuente y costoso es el re-entrenamiento en la operación real de WOM.
