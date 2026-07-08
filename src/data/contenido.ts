// Catálogo de contenidos de formación.
// Los ids son estables: attempts y srs_cards los referencian como texto.
// Edita o agrega dominios/objetivos/ejercicios aquí; el avance de cada
// relator se conserva mientras los ids no cambien.

export interface Ejercicio {
  id: string
  objetivoId: string
  enunciado: string
  opciones: string[]
  correcta: number
  explicacion: string
}

export interface Objetivo {
  id: string
  titulo: string
}

export interface Dominio {
  id: string
  titulo: string
  descripcion: string
  objetivos: Objetivo[]
  ejercicios: Ejercicio[]
}

export const DOMINIOS: Dominio[] = [
  {
    id: 'atencion-cliente',
    titulo: 'Atención al Cliente',
    descripcion:
      'Buenas prácticas de servicio y manejo de situaciones difíciles.',
    objetivos: [
      { id: 'ac-escucha', titulo: 'Escucha activa y empatía' },
      { id: 'ac-reclamos', titulo: 'Manejo de reclamos' },
    ],
    ejercicios: [
      {
        id: 'ac-01',
        objetivoId: 'ac-escucha',
        enunciado:
          'Un cliente explica su problema por segunda vez, visiblemente frustrado. ¿Cuál es la mejor primera respuesta?',
        opciones: [
          'Interrumpirlo para ahorrar tiempo y dar la solución',
          'Parafrasear su problema para confirmar que se entendió y reconocer su molestia',
          'Transferirlo de inmediato a otro ejecutivo',
          'Pedirle que envíe un correo con los detalles',
        ],
        correcta: 1,
        explicacion:
          'Parafrasear confirma comprensión y el reconocimiento de la emoción reduce la tensión: son las bases de la escucha activa.',
      },
      {
        id: 'ac-02',
        objetivoId: 'ac-escucha',
        enunciado: '¿Qué caracteriza a la escucha activa?',
        opciones: [
          'Esperar en silencio a que el cliente termine para responder lo planificado',
          'Atender, confirmar y responder a lo que la persona realmente dijo',
          'Tomar nota de todo sin intervenir',
          'Repetir literalmente cada frase del cliente',
        ],
        correcta: 1,
        explicacion:
          'La escucha activa implica prestar atención plena, verificar la comprensión y responder sobre lo que la persona expresó, no sobre un guion.',
      },
      {
        id: 'ac-03',
        objetivoId: 'ac-reclamos',
        enunciado:
          'Ante un reclamo que no puedes resolver en el momento, ¿qué corresponde hacer?',
        opciones: [
          'Prometer que se resolverá hoy para calmar al cliente',
          'Explicar el paso siguiente, dar un plazo realista y registrar el caso',
          'Indicar que no depende de tu área',
          'Ofrecer una compensación inmediata sin registrar el caso',
        ],
        correcta: 1,
        explicacion:
          'Un compromiso realista y trazable (paso siguiente + plazo + registro) mantiene la confianza; prometer lo incumplible la destruye.',
      },
      {
        id: 'ac-04',
        objetivoId: 'ac-reclamos',
        enunciado:
          '¿Cuál es el orden recomendado para manejar un reclamo con un cliente molesto?',
        opciones: [
          'Solucionar → escuchar → disculparse',
          'Escuchar → reconocer/disculparse → resolver → verificar satisfacción',
          'Disculparse → transferir → cerrar el caso',
          'Explicar las políticas → escuchar → resolver',
        ],
        correcta: 1,
        explicacion:
          'Primero se escucha y se reconoce la molestia; recién entonces la solución es recibida. Verificar el cierre evita reingresos del reclamo.',
      },
    ],
  },
  {
    id: 'productos-moviles',
    titulo: 'Productos y Servicios Móviles',
    descripcion:
      'Conceptos de telefonía móvil: planes, portabilidad y servicios.',
    objetivos: [
      { id: 'pm-planes', titulo: 'Planes y modalidades' },
      { id: 'pm-portabilidad', titulo: 'Portabilidad numérica' },
    ],
    ejercicios: [
      {
        id: 'pm-01',
        objetivoId: 'pm-planes',
        enunciado:
          '¿Cuál es la diferencia principal entre prepago y postpago?',
        opciones: [
          'El prepago solo permite llamadas, el postpago incluye datos',
          'En prepago se paga antes de consumir mediante recargas; en postpago se factura periódicamente el plan contratado',
          'El postpago no tiene contrato',
          'No hay diferencia, son nombres comerciales',
        ],
        correcta: 1,
        explicacion:
          'Prepago: el saldo se carga antes del consumo. Postpago: existe un plan contratado que se factura en ciclos (generalmente mensuales).',
      },
      {
        id: 'pm-02',
        objetivoId: 'pm-planes',
        enunciado: 'Un cliente pregunta qué es el roaming. ¿Qué le explicas?',
        opciones: [
          'Es el uso de la red de otro operador, típicamente en el extranjero, para llamadas y datos',
          'Es un plan exclusivo de datos ilimitados',
          'Es la portabilidad del número a otra compañía',
          'Es una app para medir la señal',
        ],
        correcta: 0,
        explicacion:
          'Roaming es el servicio que permite usar el teléfono fuera de la cobertura del operador propio, a través de redes de operadores asociados.',
      },
      {
        id: 'pm-03',
        objetivoId: 'pm-portabilidad',
        enunciado: '¿Qué es la portabilidad numérica?',
        opciones: [
          'Cambiar de equipo manteniendo el chip',
          'El derecho del cliente a cambiarse de operador conservando su número',
          'Tener dos números en un mismo teléfono',
          'Transferir el número a otra persona',
        ],
        correcta: 1,
        explicacion:
          'La portabilidad numérica permite que el cliente cambie de compañía sin perder su número, y es un derecho regulado.',
      },
      {
        id: 'pm-04',
        objetivoId: 'pm-portabilidad',
        enunciado:
          '¿Qué necesita normalmente un cliente para iniciar una portabilidad?',
        opciones: [
          'La autorización escrita de su operador actual',
          'Ser el titular de la línea (o contar con su autorización) e identificarse',
          'Pagar una multa por cambio de compañía',
          'Esperar a que termine su ciclo de facturación',
        ],
        correcta: 1,
        explicacion:
          'El trámite lo inicia el operador de destino; el requisito clave es la titularidad (o autorización del titular) y la identificación. El operador de origen no debe autorizarlo.',
      },
    ],
  },
  {
    id: 'tecnicas-formacion',
    titulo: 'Técnicas de Formación',
    descripcion:
      'Herramientas didácticas para relatores: aprendizaje de adultos y diseño de sesiones.',
    objetivos: [
      { id: 'tf-adultos', titulo: 'Aprendizaje de adultos' },
      { id: 'tf-sesiones', titulo: 'Diseño de sesiones efectivas' },
    ],
    ejercicios: [
      {
        id: 'tf-01',
        objetivoId: 'tf-adultos',
        enunciado:
          '¿Qué principio caracteriza el aprendizaje de adultos (andragogía)?',
        opciones: [
          'Aprenden mejor con clases expositivas largas',
          'Necesitan ver la aplicación práctica e inmediata de lo que aprenden',
          'Prefieren memorizar antes que practicar',
          'Dependen totalmente del formador para avanzar',
        ],
        correcta: 1,
        explicacion:
          'Los adultos aprenden orientados a problemas reales: la relevancia práctica inmediata es el principal motor de su motivación.',
      },
      {
        id: 'tf-02',
        objetivoId: 'tf-adultos',
        enunciado:
          '¿Por qué conviene espaciar los repasos en lugar de concentrar todo el estudio en una sesión?',
        opciones: [
          'Porque las sesiones largas son más caras',
          'Porque el repaso espaciado fortalece la retención a largo plazo (efecto de espaciamiento)',
          'Porque los adultos se aburren, aunque retengan igual',
          'No conviene: concentrar el estudio es más efectivo',
        ],
        correcta: 1,
        explicacion:
          'La evidencia sobre el efecto de espaciamiento muestra que recuperar la información en intervalos crecientes consolida la memoria mucho más que el estudio masivo. Es exactamente lo que hace esta app.',
      },
      {
        id: 'tf-03',
        objetivoId: 'tf-sesiones',
        enunciado:
          'Al iniciar una sesión de formación, ¿qué debe quedar claro primero?',
        opciones: [
          'El detalle de todos los contenidos que se verán',
          'Los objetivos de aprendizaje y qué podrán hacer los participantes al terminar',
          'Las reglas de evaluación y penalizaciones',
          'La trayectoria profesional del relator',
        ],
        correcta: 1,
        explicacion:
          'Explicitar los objetivos orienta la atención y permite a los participantes autoevaluar su avance durante la sesión.',
      },
      {
        id: 'tf-04',
        objetivoId: 'tf-sesiones',
        enunciado:
          '¿Cuál es la mejor forma de verificar que los participantes comprendieron un contenido?',
        opciones: [
          'Preguntar "¿quedó claro?" al final',
          'Pedirles que apliquen o expliquen el contenido (práctica de recuperación)',
          'Repetir el contenido dos veces',
          'Entregar el material impreso para revisión posterior',
        ],
        correcta: 1,
        explicacion:
          'La práctica de recuperación (aplicar, resolver, explicar) evidencia la comprensión real; el "¿quedó claro?" suele obtener un sí de cortesía.',
      },
    ],
  },
]

export function obtenerDominio(id: string): Dominio | undefined {
  return DOMINIOS.find((d) => d.id === id)
}

export function obtenerEjercicio(
  dominio: Dominio,
  ejercicioId: string
): Ejercicio | undefined {
  return dominio.ejercicios.find((e) => e.id === ejercicioId)
}
