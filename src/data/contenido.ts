// Catálogo de contenidos de formación.
// Los ids son estables: attempts y srs_cards los referencian como texto.
// Edita o agrega dominios/objetivos/ejercicios aquí; el avance de cada
// relator se conserva mientras los ids no cambien.
// Nota: el orden de las alternativas se baraja en pantalla en cada sesión;
// `correcta` es el índice dentro de este archivo, no el mostrado.

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
  icono: string
  descripcion: string
  objetivos: Objetivo[]
  ejercicios: Ejercicio[]
}

export interface Categoria {
  id: string
  titulo: string
  icono: string
  dominios: string[]
}

// Agrupación lógica de los dominios para la pantalla de Ejercicios.
export const CATEGORIAS: Categoria[] = [
  {
    id: 'productos',
    titulo: 'Productos y Servicios',
    icono: '🛒',
    dominios: [
      'portabilidad',
      'planes',
      'prepago',
      'equipos',
      'boleta-pagos',
      'servicios-adicionales',
    ],
  },
  {
    id: 'tecnico',
    titulo: 'Técnico y Conectividad',
    icono: '🔧',
    dominios: ['internet-fibra', 'internet-movil', 'roaming', 'servicio-tecnico'],
  },
  {
    id: 'habilidades',
    titulo: 'Habilidades',
    icono: '🎯',
    dominios: ['atencion-cliente', 'tecnicas-formacion'],
  },
]

export const DOMINIOS: Dominio[] = [
  {
    id: 'portabilidad',
    titulo: 'Portabilidad',
    icono: '🔄',
    descripcion: 'El derecho a cambiar de compañía manteniendo el número.',
    objetivos: [
      { id: 'po-concepto', titulo: 'Concepto y derechos' },
      { id: 'po-proceso', titulo: 'Proceso y requisitos' },
    ],
    ejercicios: [
      { id: 'po-01', objetivoId: 'po-concepto', enunciado: '¿Qué es la portabilidad numérica?', opciones: ['Cambiar de equipo manteniendo el chip', 'Tener dos números en un teléfono', 'El derecho del cliente a cambiar de operador conservando su número', 'Transferir la línea a otra persona'], correcta: 2, explicacion: 'La portabilidad es un derecho regulado: el cliente cambia de compañía sin perder su número.' },
      { id: 'po-02', objetivoId: 'po-concepto', enunciado: '¿Quién inicia el trámite de portabilidad?', opciones: ['El operador de destino (al que el cliente se cambia)', 'El operador de origen', 'La Subsecretaría de Telecomunicaciones', 'El fabricante del equipo'], correcta: 0, explicacion: 'El cliente lo solicita en la compañía de destino y esta gestiona todo el proceso.' },
      { id: 'po-03', objetivoId: 'po-concepto', enunciado: '¿Necesita el cliente pedir autorización a su compañía actual para portarse?', opciones: ['Sí, debe pedir una carta de liberación', 'No: la portabilidad no requiere autorización del operador de origen', 'Solo si lleva menos de un año', 'Solo en planes de contrato'], correcta: 1, explicacion: 'El operador de origen no puede autorizar ni bloquear la portabilidad: es un derecho del cliente.' },
      { id: 'po-04', objetivoId: 'po-concepto', enunciado: 'Un cliente teme perder su número si se cambia. ¿Qué le explicas?', opciones: ['Que recibirá un número nuevo similar', 'Que mantiene el número solo por 6 meses', 'Que debe negociarlo con su operador actual', 'Que el número lo acompaña: mantenerlo es justamente el objetivo de la portabilidad'], correcta: 3, explicacion: 'El número es del cliente durante todo el proceso; portarse nunca implica perderlo.' },
      { id: 'po-05', objetivoId: 'po-proceso', enunciado: '¿Qué requisito es clave para iniciar una portabilidad?', opciones: ['Ser el titular de la línea (o tener su autorización) e identificarse', 'Estar al día en todos los pagos', 'Llevar más de 6 meses en la compañía actual', 'Devolver el equipo al operador anterior'], correcta: 0, explicacion: 'La titularidad y la identificación son el requisito central del trámite.' },
      { id: 'po-06', objetivoId: 'po-proceso', enunciado: '¿Tener deuda con el operador actual impide portarse?', opciones: ['Sí, siempre', 'Sí, salvo que repacte', 'No impide portarse, pero la deuda sigue vigente y debe pagarse', 'Solo si la deuda es del equipo'], correcta: 2, explicacion: 'La deuda no bloquea la portabilidad; la obligación de pago con el operador anterior se mantiene.' },
      { id: 'po-07', objetivoId: 'po-proceso', enunciado: 'Si el cliente compró su equipo en cuotas con el operador anterior, al portarse…', opciones: ['Las cuotas se anulan automáticamente', 'El equipo debe devolverse', 'El nuevo operador asume las cuotas', 'Debe seguir pagando las cuotas pendientes al operador anterior'], correcta: 3, explicacion: 'El financiamiento del equipo es un compromiso independiente de la línea: se sigue pagando.' },
      { id: 'po-08', objetivoId: 'po-proceso', enunciado: 'En telefonía móvil, el cambio efectivo de compañía tras solicitar la portabilidad suele completarse…', opciones: ['En cosa de horas a un día hábil, generalmente con ventana nocturna', 'En 30 días corridos', 'En el siguiente ciclo de facturación', 'Solo los fines de semana'], correcta: 0, explicacion: 'El proceso móvil es rápido: típicamente se activa dentro de un día hábil, de madrugada.' },
      { id: 'po-09', objetivoId: 'po-proceso', enunciado: '¿Qué servicio queda activo mientras se ejecuta el cambio de compañía?', opciones: ['Ninguno: la línea queda muerta un día completo', 'La línea sigue funcionando en el operador de origen hasta el momento del cambio', 'Solo los SMS', 'Solo las llamadas entrantes'], correcta: 1, explicacion: 'El servicio se corta solo durante la ventana técnica del cambio; antes de eso funciona normal.' },
      { id: 'po-10', objetivoId: 'po-proceso', enunciado: 'Un cliente portado se arrepiente. ¿Puede volver a portarse?', opciones: ['No, debe esperar un año', 'Solo pagando una multa', 'Sí: puede portarse nuevamente cuando quiera, es un derecho permanente', 'Solo si su operador anterior lo acepta'], correcta: 2, explicacion: 'La portabilidad puede ejercerse las veces que el cliente quiera.' },
    ],
  },
  {
    id: 'boleta-pagos',
    titulo: 'Boleta y Pagos',
    icono: '🧾',
    descripcion: 'Facturación, medios de pago y resolución de cobros.',
    objetivos: [
      { id: 'bp-boleta', titulo: 'Entender la boleta' },
      { id: 'bp-pagos', titulo: 'Pagos y cobranza' },
    ],
    ejercicios: [
      { id: 'bp-01', objetivoId: 'bp-boleta', enunciado: '¿Cuál es la diferencia entre fecha de emisión y fecha de vencimiento de la boleta?', opciones: ['Son la misma fecha con distinto nombre', 'La emisión es cuando se genera el documento; el vencimiento es el plazo máximo para pagar', 'La emisión es el día de pago automático', 'El vencimiento es cuando se corta el servicio'], correcta: 1, explicacion: 'Primero se emite la boleta con el detalle del ciclo; el vencimiento marca hasta cuándo pagar sin mora.' },
      { id: 'bp-02', objetivoId: 'bp-boleta', enunciado: 'Un cliente cambió de plan a mitad de ciclo y su boleta llegó con un monto distinto al plan. ¿La explicación más habitual?', opciones: ['Un error del sistema que debe reclamar', 'Un impuesto extraordinario', 'Cobro duplicado del plan anterior', 'Cargos proporcionales: se cobra la parte del plan antiguo y la del nuevo según los días de uso'], correcta: 3, explicacion: 'Los cambios de plan generan cobros proporcionales (prorrateo) en la boleta siguiente.' },
      { id: 'bp-03', objetivoId: 'bp-boleta', enunciado: '¿Qué conviene revisar primero ante un monto inesperado en la boleta?', opciones: ['El detalle de la boleta: cargos adicionales, proporcionales o servicios de terceros', 'Las noticias de la compañía', 'El manual del equipo', 'La velocidad del plan'], correcta: 0, explicacion: 'El detalle identifica el origen del cargo: proporcionales, bolsas extra, suscripciones, etc.' },
      { id: 'bp-04', objetivoId: 'bp-boleta', enunciado: 'Un cliente empresa pide documento tributario por sus líneas. ¿Qué corresponde?', opciones: ['No es posible en telecomunicaciones', 'Solo boleta nominativa', 'Factura a nombre de la empresa con sus datos tributarios', 'Una carta de la compañía'], correcta: 2, explicacion: 'Las personas jurídicas pueden facturar el servicio con sus datos tributarios.' },
      { id: 'bp-05', objetivoId: 'bp-boleta', enunciado: '¿Qué es la boleta electrónica?', opciones: ['Un resumen sin validez legal', 'El documento oficial de cobro emitido y enviado digitalmente', 'Una copia que se pide por separado y tiene costo', 'Solo un correo informativo'], correcta: 1, explicacion: 'La boleta electrónica es el documento oficial; llega por correo o se descarga de la sucursal virtual.' },
      { id: 'bp-06', objetivoId: 'bp-pagos', enunciado: '¿Qué es el PAC como medio de pago?', opciones: ['Pago con tarjeta en tiendas', 'Un descuento por pago anticipado', 'Pago automático con cargo a la tarjeta de crédito', 'Pago automático con cargo a la cuenta bancaria'], correcta: 3, explicacion: 'PAC descuenta de la cuenta bancaria; PAT carga a la tarjeta de crédito.' },
      { id: 'bp-07', objetivoId: 'bp-pagos', enunciado: 'Un cliente no reconoce un cobro. ¿Cuál es la orientación correcta?', opciones: ['Que deje de pagar toda la boleta', 'Revisar el detalle y, si corresponde, ingresar un reclamo formal por el cargo específico', 'Esperar a la próxima boleta a ver si desaparece', 'Cambiarse de compañía de inmediato'], correcta: 1, explicacion: 'El reclamo formal del cargo específico deja registro y plazos de respuesta; no pagar todo genera mora.' },
      { id: 'bp-08', objetivoId: 'bp-pagos', enunciado: '¿Qué ocurre habitualmente si una boleta no se paga dentro del plazo?', opciones: ['Nada durante 6 meses', 'Se pierde el número al día siguiente', 'Se puede suspender el servicio hasta regularizar el pago', 'Se duplica el monto automáticamente'], correcta: 2, explicacion: 'El no pago lleva a suspensión del servicio; al regularizar, se repone.' },
      { id: 'bp-09', objetivoId: 'bp-pagos', enunciado: 'Tras pagar una deuda que tenía el servicio suspendido, el cliente pregunta cuándo vuelve el servicio. ¿Qué respondes?', opciones: ['La reposición ocurre tras confirmarse el pago, normalmente dentro de horas', 'Debe comprar un chip nuevo', 'Al inicio del próximo ciclo de facturación', 'Debe esperar 7 días hábiles siempre'], correcta: 0, explicacion: 'Confirmado el pago, la reposición es un proceso rápido, usualmente el mismo día.' },
      { id: 'bp-10', objetivoId: 'bp-pagos', enunciado: 'Un cliente con dificultades para pagar el total pregunta por opciones. ¿Cuál es una orientación razonable?', opciones: ['Decirle que no existe ninguna alternativa', 'Recomendarle no pagar nunca', 'Sugerir pagar solo la mitad sin avisar', 'Informar los canales de la compañía para repactar o buscar alternativas de pago'], correcta: 3, explicacion: 'Las compañías disponen de canales de repactación/regularización; derivar ahí es lo correcto.' },
    ],
  },
  {
    id: 'planes',
    titulo: 'Planes',
    icono: '📶',
    descripcion: 'Planes de suscripción: características, cambios y condiciones.',
    objetivos: [
      { id: 'pl-conceptos', titulo: 'Conceptos de planes' },
      { id: 'pl-gestion', titulo: 'Gestión y cambios' },
    ],
    ejercicios: [
      { id: 'pl-01', objetivoId: 'pl-conceptos', enunciado: '¿Qué caracteriza a un plan postpago?', opciones: ['Se paga antes de usar mediante recargas', 'Solo incluye llamadas', 'Un servicio contratado que se factura por ciclos, típicamente mensuales', 'No permite portabilidad'], correcta: 2, explicacion: 'En postpago el cliente contrata un plan y paga la boleta del ciclo.' },
      { id: 'pl-02', objetivoId: 'pl-conceptos', enunciado: '¿Qué significa que un plan tenga "minutos todo destino"?', opciones: ['Llamadas a cualquier compañía nacional sin costo adicional dentro del cupo', 'Solo llamadas a números de la misma compañía', 'Llamadas internacionales incluidas', 'Minutos que no se pueden usar en roaming'], correcta: 0, explicacion: '"Todo destino" cubre llamadas a cualquier operador del país.' },
      { id: 'pl-03', objetivoId: 'pl-conceptos', enunciado: 'En Chile, ¿puede un plan móvil obligar a permanencia mínima con multa por salir antes?', opciones: ['Sí, hasta 24 meses', 'Sí, si el cliente firmó contrato', 'Solo en planes familiares', 'No: no existen cláusulas de permanencia en los planes móviles'], correcta: 3, explicacion: 'La normativa chilena eliminó la permanencia: el cliente puede cambiarse cuando quiera.' },
      { id: 'pl-04', objetivoId: 'pl-conceptos', enunciado: 'Un plan ofrece "GB libres + velocidad reducida". ¿Qué significa?', opciones: ['Al agotar los GB el servicio se corta', 'Al agotar los GB de alta velocidad, se sigue navegando pero más lento', 'Los GB nunca se agotan a máxima velocidad', 'Solo navega en WiFi al agotarse'], correcta: 1, explicacion: 'Es navegación continua: agotado el cupo de alta velocidad, se navega a velocidad reducida sin cobros extra.' },
      { id: 'pl-05', objetivoId: 'pl-conceptos', enunciado: '¿Qué es compartir internet (hotspot) y cómo afecta al plan?', opciones: ['Usar el teléfono como módem para otros dispositivos, consumiendo los GB del plan', 'Un servicio aparte que requiere otro chip', 'Regalar GB a otro cliente', 'Navegar gratis desde otro equipo'], correcta: 0, explicacion: 'El hotspot comparte la conexión del teléfono y descuenta datos del mismo plan.' },
      { id: 'pl-06', objetivoId: 'pl-gestion', enunciado: 'Un cliente quiere un plan más barato. ¿Qué le corresponde saber sobre el cambio?', opciones: ['Que bajar de plan está prohibido', 'Que solo puede cambiar una vez al año', 'Que puede solicitar el cambio y suele aplicar en el ciclo siguiente o con cobro proporcional', 'Que pierde su número al bajar de plan'], correcta: 2, explicacion: 'Los cambios de plan son un derecho; el efecto en la boleta depende del momento del ciclo.' },
      { id: 'pl-07', objetivoId: 'pl-gestion', enunciado: '¿Qué conviene revisar antes de recomendar un plan a un cliente?', opciones: ['Solo el precio', 'Su uso real: datos, llamadas, roaming y cuántas líneas necesita', 'La marca de su teléfono', 'El color del chip'], correcta: 1, explicacion: 'El plan correcto nace del patrón de uso, no solo del precio.' },
      { id: 'pl-08', objetivoId: 'pl-gestion', enunciado: 'En un plan multilínea (varias líneas en una cuenta), ¿cuál es la idea central?', opciones: ['Todas las líneas comparten un solo número', 'Cada línea paga boleta separada obligatoriamente', 'Las líneas extra no pueden portarse', 'Agrupar líneas en una boleta, generalmente con mejor precio por línea'], correcta: 3, explicacion: 'Multilínea agrupa líneas bajo un titular con condiciones preferentes.' },
      { id: 'pl-09', objetivoId: 'pl-gestion', enunciado: 'Un cliente se porta con plan vigente en su compañía anterior. ¿Qué pasa con ese plan?', opciones: ['El plan anterior termina con la portabilidad; el nuevo plan rige con el nuevo operador', 'Mantiene ambos planes activos', 'El plan anterior se transfiere automáticamente', 'Debe pagar ambos por 3 meses'], correcta: 0, explicacion: 'Al portarse, el contrato con el operador anterior termina (quedando solo deudas pendientes si existen).' },
      { id: 'pl-10', objetivoId: 'pl-gestion', enunciado: '¿Dónde puede el cliente revisar el saldo de GB y minutos de su plan?', opciones: ['Solo llamando al call center', 'En la app o sucursal virtual de la compañía', 'En la boleta del mes pasado', 'No es posible consultarlo'], correcta: 1, explicacion: 'La app/sucursal virtual muestra consumos en línea; es el canal de autoatención principal.' },
    ],
  },
  {
    id: 'equipos',
    titulo: 'Equipos',
    icono: '📱',
    descripcion: 'Teléfonos y dispositivos: IMEI, garantía, SIM y eSIM.',
    objetivos: [
      { id: 'eq-identificacion', titulo: 'Identificación y seguridad' },
      { id: 'eq-uso', titulo: 'Garantía y uso' },
    ],
    ejercicios: [
      { id: 'eq-01', objetivoId: 'eq-identificacion', enunciado: '¿Qué es el IMEI de un teléfono?', opciones: ['El número de la SIM', 'La clave de desbloqueo', 'El identificador único del equipo a nivel de hardware', 'El modelo comercial'], correcta: 2, explicacion: 'El IMEI identifica al equipo (no al chip) y se usa, por ejemplo, para bloquearlo si es robado.' },
      { id: 'eq-02', objetivoId: 'eq-identificacion', enunciado: '¿Cómo puede el cliente consultar el IMEI de su equipo?', opciones: ['Marcando *#06# o en los ajustes del teléfono', 'Solo en la caja original', 'Llamando a la Subtel', 'En la boleta mensual'], correcta: 0, explicacion: 'El código *#06# muestra el IMEI en pantalla; también aparece en Ajustes.' },
      { id: 'eq-03', objetivoId: 'eq-identificacion', enunciado: 'Ante robo del equipo, ¿por qué es importante reportarlo al operador?', opciones: ['Para recibir un equipo gratis', 'Solo por estadística', 'Para bloquear el número para siempre', 'Para bloquear el IMEI en la lista de equipos robados y suspender la línea'], correcta: 3, explicacion: 'El bloqueo de IMEI inutiliza el equipo en las redes y la SIM se repone para mantener el número.' },
      { id: 'eq-04', objetivoId: 'eq-identificacion', enunciado: '¿Qué es la eSIM?', opciones: ['Una SIM virtual integrada al equipo que se activa sin chip físico', 'Un chip de mayor tamaño', 'Una app de mensajería', 'Una SIM exclusiva para roaming'], correcta: 0, explicacion: 'La eSIM va integrada al hardware y se activa digitalmente (por ejemplo, con un QR).' },
      { id: 'eq-05', objetivoId: 'eq-identificacion', enunciado: 'Un cliente comprará un equipo por su cuenta. ¿Qué conviene verificar para usarlo en la red local?', opciones: ['Solo el color y almacenamiento', 'Que sea compatible con las bandas de la red local y que no esté reportado', 'Que venga con cargador', 'Que sea del mismo operador'], correcta: 1, explicacion: 'La compatibilidad de bandas y que el IMEI esté limpio son claves para que funcione bien.' },
      { id: 'eq-06', objetivoId: 'eq-uso', enunciado: 'Sobre la garantía legal de un equipo nuevo comprado en Chile, ¿cuál es la idea correcta?', opciones: ['No existe garantía para celulares', 'Solo cubre la pantalla', 'Ante una falla dentro del plazo legal, el cliente puede optar entre reparación, cambio o devolución del dinero', 'Solo permite reparar, nunca cambiar'], correcta: 2, explicacion: 'La ley del consumidor da derecho a elegir entre las tres opciones dentro del plazo de garantía legal.' },
      { id: 'eq-07', objetivoId: 'eq-uso', enunciado: 'El financiamiento del equipo en cuotas junto al plan, ¿qué relación tiene con el servicio?', opciones: ['Si se paga el plan, las cuotas se condonan', 'Son compromisos distintos: el equipo se sigue debiendo aunque se cancele la línea', 'El equipo es gratis tras un año', 'Las cuotas incluyen los GB'], correcta: 1, explicacion: 'Plan y equipo son contratos separados; cerrar la línea no extingue la deuda del equipo.' },
      { id: 'eq-08', objetivoId: 'eq-uso', enunciado: 'Un cliente dice que su equipo nuevo "no reconoce el chip". ¿Primer paso razonable?', opciones: ['Enviarlo de inmediato al servicio técnico', 'Formatear el teléfono', 'Comprar otro chip', 'Verificar que la SIM esté bien puesta y probarla en otro equipo (o probar otra SIM en el suyo)'], correcta: 3, explicacion: 'La prueba cruzada distingue en minutos si la falla es del chip o del equipo.' },
      { id: 'eq-09', objetivoId: 'eq-uso', enunciado: '¿Qué recomendación básica ayuda a cuidar la batería de un smartphone?', opciones: ['Evitar exposición al calor extremo y usar cargadores certificados', 'Cargarlo siempre hasta 100% con el equipo encendido al sol', 'Dejar que llegue a 0% todos los días', 'Cargarlo solo una vez por semana'], correcta: 0, explicacion: 'Calor y cargadores no certificados degradan la batería; los hábitos moderados la cuidan.' },
      { id: 'eq-10', objetivoId: 'eq-uso', enunciado: 'Antes de entregar un equipo a servicio técnico, ¿qué debe hacer el cliente?', opciones: ['Nada, el técnico se encarga de todo', 'Respaldar su información y, si es posible, cerrar sesión de sus cuentas', 'Dejar la sesión bancaria abierta para pruebas', 'Borrar el IMEI'], correcta: 1, explicacion: 'El respaldo y cierre de sesiones protege los datos personales durante la reparación.' },
    ],
  },
  {
    id: 'prepago',
    titulo: 'Prepago',
    icono: '💳',
    descripcion: 'Recargas, bolsas y todo el mundo prepago.',
    objetivos: [
      { id: 'pr-conceptos', titulo: 'Cómo funciona' },
      { id: 'pr-bolsas', titulo: 'Recargas y bolsas' },
    ],
    ejercicios: [
      { id: 'pr-01', objetivoId: 'pr-conceptos', enunciado: '¿Cuál es la diferencia esencial entre prepago y postpago?', opciones: ['El prepago no permite datos', 'El postpago no tiene número propio', 'En prepago se paga antes de consumir (recargas); en postpago se factura un plan por ciclos', 'Son lo mismo con distinto nombre'], correcta: 2, explicacion: 'Prepago: recargas anticipadas sin boleta mensual. Postpago: plan facturado.' },
      { id: 'pr-02', objetivoId: 'pr-conceptos', enunciado: '¿El prepago genera boleta mensual?', opciones: ['Sí, siempre', 'No: al pagar por adelantado no hay facturación mensual del servicio', 'Solo si recarga más de una vez', 'Sí, pero solo electrónica'], correcta: 1, explicacion: 'Sin plan contratado no hay ciclo de facturación; el comprobante es el de cada recarga.' },
      { id: 'pr-03', objetivoId: 'pr-conceptos', enunciado: '¿Puede un cliente prepago portarse a otra compañía manteniendo su número?', opciones: ['Sí: la portabilidad aplica igual para prepago y postpago', 'No, la portabilidad es solo para planes', 'Solo si convierte su línea a postpago primero', 'Solo una vez en la vida'], correcta: 0, explicacion: 'La portabilidad es un derecho de la línea, independiente de la modalidad.' },
      { id: 'pr-04', objetivoId: 'pr-conceptos', enunciado: 'Una línea prepago sin recargas ni uso por mucho tiempo, ¿qué riesgo corre?', opciones: ['Ninguno, es eterna', 'Pasar a postpago automáticamente', 'Generar deuda', 'Ser dada de baja por inactividad, perdiendo el número'], correcta: 3, explicacion: 'Los operadores desactivan líneas prepago tras periodos prolongados de inactividad.' },
      { id: 'pr-05', objetivoId: 'pr-conceptos', enunciado: '¿Cómo consulta un cliente prepago su saldo?', opciones: ['Solo en sucursales presenciales', 'Con el código corto del operador o en la app', 'En la boleta', 'No se puede consultar'], correcta: 1, explicacion: 'Códigos de marcación rápida y la app muestran saldo y vigencia al instante.' },
      { id: 'pr-06', objetivoId: 'pr-bolsas', enunciado: '¿Qué es una "bolsa" en prepago?', opciones: ['El envase del chip', 'Un descuento en recargas', 'Un paquete de datos/minutos por un precio y vigencia definidos, que se paga con el saldo', 'Un plan postpago pequeño'], correcta: 2, explicacion: 'Las bolsas convierten saldo en paquetes con mejor rendimiento y vigencia acotada.' },
      { id: 'pr-07', objetivoId: 'pr-bolsas', enunciado: '¿Cuál es la diferencia entre saldo y bolsa?', opciones: ['El saldo es dinero disponible; la bolsa es un paquete ya comprado con ese saldo', 'Son sinónimos', 'La bolsa nunca vence', 'El saldo solo sirve para llamadas'], correcta: 0, explicacion: 'Con el saldo se compran bolsas; cada bolsa tiene su propio cupo y vigencia.' },
      { id: 'pr-08', objetivoId: 'pr-bolsas', enunciado: 'Un cliente con bolsa de datos vigente dice que "se le acaba muy rápido". ¿Qué revisar primero?', opciones: ['El color del teléfono', 'La versión del chip', 'Si el número está bloqueado', 'El consumo de apps en segundo plano y la calidad de video en streaming'], correcta: 3, explicacion: 'Actualizaciones automáticas, respaldos y video en alta calidad son los grandes consumidores de datos.' },
      { id: 'pr-09', objetivoId: 'pr-bolsas', enunciado: '¿Qué pasa al agotarse la bolsa de datos si el cliente sigue navegando?', opciones: ['Se genera deuda automática', 'Navega con cargo al saldo a tarifa normal, o se detiene si no hay saldo', 'El servicio queda bloqueado una semana', 'Nada, los datos son infinitos'], correcta: 1, explicacion: 'Sin bolsa, el consumo descuenta del saldo a tarifa base; sin saldo, no hay navegación.' },
      { id: 'pr-10', objetivoId: 'pr-bolsas', enunciado: '¿Qué ventaja tiene la recarga programada o automática?', opciones: ['Es la única forma de recargar', 'Duplica el saldo siempre', 'Evita quedarse sin servicio por olvido, manteniendo la línea activa', 'Elimina la vigencia de las bolsas'], correcta: 2, explicacion: 'Automatizar la recarga evita cortes de servicio y vencimientos por inactividad.' },
    ],
  },
  {
    id: 'internet-fibra',
    titulo: 'Internet Fibra',
    icono: '🏠',
    descripcion: 'Fibra óptica al hogar: instalación, WiFi y diagnóstico.',
    objetivos: [
      { id: 'if-tecnologia', titulo: 'La tecnología' },
      { id: 'if-soporte', titulo: 'WiFi y diagnóstico' },
    ],
    ejercicios: [
      { id: 'if-01', objetivoId: 'if-tecnologia', enunciado: '¿Qué es la fibra óptica al hogar (FTTH)?', opciones: ['Internet por la red telefónica de cobre', 'Un cable de fibra que llega directo al domicilio y transmite datos como luz', 'Internet satelital', 'WiFi público del barrio'], correcta: 1, explicacion: 'FTTH lleva la fibra hasta la casa: gran capacidad y estabilidad frente al cobre.' },
      { id: 'if-02', objetivoId: 'if-tecnologia', enunciado: '¿Qué ventaja distintiva suele ofrecer la fibra frente a tecnologías antiguas?', opciones: ['No necesita electricidad', 'Funciona sin router', 'Es inmune a los cortes', 'Velocidades altas y simétricas (subida similar a la bajada) con baja latencia'], correcta: 3, explicacion: 'La simetría y la baja latencia son el sello de la fibra, clave para videollamadas y respaldos.' },
      { id: 'if-03', objetivoId: 'if-tecnologia', enunciado: '¿Qué es la ONT en una instalación de fibra?', opciones: ['El equipo que convierte la señal óptica en conexión de red para el hogar', 'Un tipo de chip móvil', 'La caja de la calle', 'Un repetidor WiFi'], correcta: 0, explicacion: 'La ONT (a menudo integrada al router) es el punto donde la fibra se transforma en internet utilizable.' },
      { id: 'if-04', objetivoId: 'if-tecnologia', enunciado: 'Antes de contratar fibra, ¿por qué se consulta la dirección del cliente?', opciones: ['Por marketing', 'Para verificar factibilidad técnica: que la red de fibra llegue a esa dirección', 'Para cobrar más según la comuna', 'Es solo un trámite sin efecto'], correcta: 1, explicacion: 'Sin cobertura de red en la dirección no es posible instalar; la factibilidad se verifica primero.' },
      { id: 'if-05', objetivoId: 'if-soporte', enunciado: 'La luz "LOS" del equipo de fibra está en rojo. ¿Qué indica típicamente?', opciones: ['Que el WiFi está apagado', 'Que hay actualización pendiente', 'Problema con la señal óptica (fibra dañada, desconectada o corte), suele requerir soporte', 'Que todo funciona bien'], correcta: 2, explicacion: 'LOS = pérdida de señal óptica: revisar el conector y, si persiste, escalar a soporte técnico.' },
      { id: 'if-06', objetivoId: 'if-soporte', enunciado: '¿Cuál es la diferencia práctica entre las bandas WiFi de 2.4 GHz y 5 GHz?', opciones: ['La 2.4 es de pago y la 5 gratis', '2.4 GHz llega más lejos pero es más lenta; 5 GHz es más rápida pero de menor alcance', 'La 5 GHz solo sirve para llamadas', 'No hay diferencia'], correcta: 1, explicacion: 'Regla práctica: lejos del router → 2.4; cerca y con demanda de velocidad → 5 GHz.' },
      { id: 'if-07', objetivoId: 'if-soporte', enunciado: 'Un cliente mide "baja velocidad" por WiFi desde el patio. ¿Cómo se mide correctamente la velocidad contratada?', opciones: ['Con un dispositivo conectado por cable al router, o al menos junto a él en 5 GHz', 'Desde el punto más lejano de la casa', 'Con varios videos reproduciéndose', 'Con el equipo en modo avión'], correcta: 0, explicacion: 'El WiFi lejos del router mide la calidad del WiFi, no la del enlace; la referencia es por cable.' },
      { id: 'if-08', objetivoId: 'if-soporte', enunciado: '¿Qué factores degradan comúnmente la señal WiFi dentro del hogar?', opciones: ['El color del router', 'La hora del día solamente', 'La marca del navegador', 'Muros gruesos, distancia, interferencias y muchos dispositivos conectados'], correcta: 3, explicacion: 'Obstáculos físicos e interferencia son las causas típicas de WiFi débil por zonas.' },
      { id: 'if-09', objetivoId: 'if-soporte', enunciado: '¿Cuál es el primer paso estándar ante una falla de internet hogar?', opciones: ['Pedir visita técnica de inmediato', 'Reiniciar el router/ONT (apagar, esperar unos segundos, encender) y verificar las luces', 'Cambiar de compañía', 'Mover el router al techo'], correcta: 1, explicacion: 'El reinicio resuelve gran parte de las fallas; las luces orientan el diagnóstico siguiente.' },
      { id: 'if-10', objetivoId: 'if-soporte', enunciado: 'Si tras el reinicio la fibra sigue sin servicio y hay vecinos con el mismo problema, ¿qué es probable?', opciones: ['Falla del teléfono del cliente', 'Un problema del navegador', 'Una falla masiva o corte en la zona: se reporta y se sigue el estado con el operador', 'Que el plan venció'], correcta: 2, explicacion: 'Múltiples clientes afectados apuntan a incidente de red zonal, no a la instalación individual.' },
    ],
  },
  {
    id: 'internet-movil',
    titulo: 'Internet Móvil',
    icono: '🌐',
    descripcion: 'Datos móviles, cobertura, 4G/5G y solución de problemas.',
    objetivos: [
      { id: 'im-red', titulo: 'Red y cobertura' },
      { id: 'im-soporte', titulo: 'Uso y diagnóstico' },
    ],
    ejercicios: [
      { id: 'im-01', objetivoId: 'im-red', enunciado: '¿Cuál es la diferencia principal entre 4G y 5G para el usuario?', opciones: ['El 5G ofrece mayores velocidades y menor latencia donde hay cobertura y equipo compatible', 'El 5G solo sirve para llamadas', 'El 4G es más rápido', 'Son la misma red con otro nombre'], correcta: 0, explicacion: '5G mejora velocidad y latencia, pero requiere cobertura 5G y un equipo compatible.' },
      { id: 'im-02', objetivoId: 'im-red', enunciado: '¿Por qué la velocidad móvil varía según el lugar?', opciones: ['Por el color del cielo', 'Porque depende de la cobertura, la distancia a la antena, obstáculos y congestión de la celda', 'Porque el plan cambia de precio por zona', 'Por la marca del cargador'], correcta: 1, explicacion: 'La experiencia móvil es radio: señal, obstáculos y cuánta gente comparte la antena.' },
      { id: 'im-03', objetivoId: 'im-red', enunciado: 'Dentro de un edificio la señal baja considerablemente. ¿Explicación típica?', opciones: ['El operador bloquea interiores', 'El teléfono está mal configurado siempre', 'El chip se gasta en interiores', 'Los materiales de construcción atenúan la señal; ayuda acercarse a ventanas o usar WiFi'], correcta: 3, explicacion: 'Hormigón y vidrios tratados atenúan la señal; WiFi o llamadas sobre WiFi son buen apoyo en interiores.' },
      { id: 'im-04', objetivoId: 'im-red', enunciado: '¿Qué es VoLTE?', opciones: ['Un tipo de bolsa de datos', 'Llamadas de voz sobre la red 4G, con mejor calidad y sin cortar los datos', 'Un bloqueo de llamadas', 'El nombre del buzón de voz'], correcta: 1, explicacion: 'VoLTE cursa la voz por 4G: audio más nítido y navegación simultánea.' },
      { id: 'im-05', objetivoId: 'im-red', enunciado: '¿Qué es el APN en un teléfono?', opciones: ['La configuración que conecta el equipo a la red de datos del operador', 'La clave del WiFi', 'El número de serie del chip', 'Una app de mensajes'], correcta: 0, explicacion: 'Un APN incorrecto impide navegar aunque haya señal; suele configurarse automáticamente.' },
      { id: 'im-06', objetivoId: 'im-soporte', enunciado: 'Un cliente con señal pero sin internet móvil. ¿Primer paso simple?', opciones: ['Restaurar el equipo de fábrica', 'Cambiar el chip', 'Activar y desactivar modo avión (fuerza el re-registro en la red) y verificar que los datos móviles estén encendidos', 'Pedir visita técnica'], correcta: 2, explicacion: 'El ciclo de modo avión re-registra el equipo; también hay que confirmar datos activos y saldo/bolsa vigente.' },
      { id: 'im-07', objetivoId: 'im-soporte', enunciado: '¿Qué consume más datos móviles habitualmente?', opciones: ['Video en streaming en alta calidad y videollamadas', 'Mensajes de texto SMS', 'Llamadas de voz tradicionales', 'Mirar la hora'], correcta: 0, explicacion: 'El video domina el consumo; bajar la calidad de reproducción ahorra GB notablemente.' },
      { id: 'im-08', objetivoId: 'im-soporte', enunciado: '¿Para qué sirve el "ahorro de datos" del teléfono?', opciones: ['Aumenta la señal', 'Restringe el consumo en segundo plano para estirar los GB del plan', 'Regala GB del operador', 'Acelera el WiFi'], correcta: 1, explicacion: 'Limita el tráfico de apps en segundo plano: útil con bolsas o planes acotados.' },
      { id: 'im-09', objetivoId: 'im-soporte', enunciado: 'El cliente dice "tengo 5G en el ícono pero navega lento". ¿Qué explicación es razonable?', opciones: ['El ícono garantiza velocidad máxima siempre', 'El equipo está roto', 'Debe pagar una multa', 'Puede haber congestión o señal 5G débil; a veces 4G con buena señal rinde mejor'], correcta: 3, explicacion: 'El ícono indica la red conectada, no la calidad: congestión y señal débil bajan el rendimiento.' },
      { id: 'im-10', objetivoId: 'im-soporte', enunciado: 'Compartir internet por hotspot a un notebook, ¿qué implica para el plan móvil?', opciones: ['Consume los GB del plan del teléfono, a veces con cupo específico según el plan', 'Es siempre gratis e ilimitado', 'Bloquea las llamadas', 'Requiere otro número'], correcta: 0, explicacion: 'El tráfico del notebook sale del cupo del plan; algunos planes definen GB específicos para compartir.' },
    ],
  },
  {
    id: 'roaming',
    titulo: 'Roaming',
    icono: '✈️',
    descripcion: 'Usar el servicio en el extranjero sin sorpresas.',
    objetivos: [
      { id: 'ro-concepto', titulo: 'Qué es y cómo funciona' },
      { id: 'ro-buenas', titulo: 'Buenas prácticas de viaje' },
    ],
    ejercicios: [
      { id: 'ro-01', objetivoId: 'ro-concepto', enunciado: '¿Qué es el roaming internacional?', opciones: ['Cambiar de número al viajar', 'Usar el servicio en el extranjero a través de redes de operadores asociados', 'Un plan exclusivo de datos', 'WiFi gratuito en aeropuertos'], correcta: 1, explicacion: 'En roaming el teléfono se conecta a redes de otros países con el mismo número.' },
      { id: 'ro-02', objetivoId: 'ro-concepto', enunciado: '¿Por qué conviene revisar el roaming antes de viajar?', opciones: ['Porque es obligatorio por ley', 'Porque sin revisar no funciona el WiFi', 'Para confirmar activación, destinos cubiertos y tarifas o paquetes disponibles', 'Para cambiar el IMEI'], correcta: 2, explicacion: 'Verificar antes del viaje evita quedarse sin servicio o pagar tarifas inesperadas.' },
      { id: 'ro-03', objetivoId: 'ro-concepto', enunciado: 'En roaming sin paquete contratado, ¿qué riesgo existe al dejar los datos móviles activos?', opciones: ['Ninguno', 'Que el equipo se bloquee', 'Que se pierda el número', 'Cargos elevados por consumo de datos a tarifa internacional'], correcta: 3, explicacion: 'El consumo a tarifa por MB internacional es la causa clásica de "cuentas sorpresa".' },
      { id: 'ro-04', objetivoId: 'ro-concepto', enunciado: '¿Recibir llamadas en el extranjero puede tener costo para el cliente?', opciones: ['Sí: en roaming, recibir llamadas puede tener cargo según destino y condiciones del plan', 'No, recibir siempre es gratis en todo el mundo', 'Solo si contesta en menos de 5 segundos', 'Solo las llamadas de desconocidos'], correcta: 0, explicacion: 'En roaming la recepción puede tarificarse; hay que revisar las condiciones del destino.' },
      { id: 'ro-05', objetivoId: 'ro-concepto', enunciado: '¿Qué es un paquete o bolsa de roaming?', opciones: ['Una maleta del operador', 'Un seguro de viaje', 'Un cupo de datos/minutos para usar en el extranjero por un precio y días definidos', 'El cargador universal'], correcta: 2, explicacion: 'Los paquetes de roaming dan cupos con precio conocido: la forma segura de viajar conectado.' },
      { id: 'ro-06', objetivoId: 'ro-buenas', enunciado: 'Un cliente viaja y no quiere gastar nada en roaming. ¿Configuración recomendada?', opciones: ['Modo avión todo el viaje sin excepción', 'Desactivar datos en roaming y usar WiFi; opcionalmente mantener solo SMS/llamadas si los necesita', 'Sacar el chip y botarlo', 'Activar todos los servicios "por si acaso"'], correcta: 1, explicacion: 'Datos en roaming apagados + WiFi cubre lo esencial sin cargos de datos.' },
      { id: 'ro-07', objetivoId: 'ro-buenas', enunciado: '¿Qué alternativa moderna existe para tener datos locales en el país de destino?', opciones: ['Una eSIM de viaje o SIM local del destino', 'Pedir la clave WiFi de desconocidos', 'Duplicar el IMEI', 'No existe alternativa'], correcta: 0, explicacion: 'Las eSIM de viaje dan datos locales sin cambiar el chip físico; útil en estadías largas.' },
      { id: 'ro-08', objetivoId: 'ro-buenas', enunciado: 'El cliente llegó al destino y no tiene señal. ¿Primer paso razonable?', opciones: ['Comprar otro teléfono', 'Esperar 48 horas', 'Reclamar al hotel', 'Verificar roaming activo en el equipo y seleccionar red manualmente si no conecta sola'], correcta: 3, explicacion: 'Roaming activado en ajustes y selección manual de operador resuelven la mayoría de los casos.' },
      { id: 'ro-09', objetivoId: 'ro-buenas', enunciado: '¿Por qué conviene desactivar actualizaciones automáticas y respaldos en la nube durante el viaje?', opciones: ['Porque dañan el teléfono en otros países', 'Porque consumen muchos datos en segundo plano y agotan el paquete de roaming', 'Porque son ilegales en el extranjero', 'Porque bloquean las llamadas'], correcta: 1, explicacion: 'Los procesos en segundo plano devoran el cupo del paquete sin que el cliente lo note.' },
      { id: 'ro-10', objetivoId: 'ro-buenas', enunciado: 'Al volver del viaje, ¿qué conviene revisar?', opciones: ['Que roaming de datos quede desactivado y el consumo del viaje en la app', 'Nada, todo vuelve solo', 'Formatear el equipo', 'Cambiar el número'], correcta: 0, explicacion: 'Revisar consumo y dejar la configuración normal evita sorpresas en la boleta siguiente.' },
    ],
  },
  {
    id: 'servicios-adicionales',
    titulo: 'Servicios Adicionales',
    icono: '➕',
    descripcion: 'Servicios de valor agregado, suscripciones y configuraciones.',
    objetivos: [
      { id: 'sa-servicios', titulo: 'Servicios y suscripciones' },
      { id: 'sa-configuracion', titulo: 'Configuraciones de línea' },
    ],
    ejercicios: [
      { id: 'sa-01', objetivoId: 'sa-servicios', enunciado: '¿Qué son los servicios de valor agregado (VAS)?', opciones: ['Los impuestos de la boleta', 'Servicios complementarios a la línea: contenidos, seguros, apps premium, etc.', 'Las llamadas de emergencia', 'El cargo fijo del plan'], correcta: 1, explicacion: 'Los VAS complementan el servicio base y suelen tener cobro adicional.' },
      { id: 'sa-02', objetivoId: 'sa-servicios', enunciado: 'Un cliente ve en su boleta un cobro recurrente de "contenido premium" que no recuerda contratar. ¿Qué corresponde?', opciones: ['Decirle que es imposible eliminarlo', 'Ignorarlo, desaparece solo', 'Identificar la suscripción, gestionarle la baja y orientarlo a reclamar el cobro si no la autorizó', 'Sugerirle cambiar de número'], correcta: 2, explicacion: 'Las suscripciones de terceros se pueden dar de baja y los cobros no autorizados se reclaman.' },
      { id: 'sa-03', objetivoId: 'sa-servicios', enunciado: '¿Cómo suele contratarse (a veces sin querer) un servicio de suscripción de terceros?', opciones: ['Aceptando pop-ups o mensajes promocionales al navegar, o respondiendo SMS de números cortos', 'Solo con firma notarial', 'Llamando al servicio técnico', 'Es imposible contratarlo sin querer'], correcta: 0, explicacion: 'Los flujos de suscripción por publicidad móvil son la vía típica de altas no deseadas.' },
      { id: 'sa-04', objetivoId: 'sa-servicios', enunciado: '¿Qué recomendación previene suscripciones no deseadas?', opciones: ['No usar nunca internet', 'Prestar el teléfono a terceros', 'Responder a todos los SMS promocionales', 'No ingresar el número en sitios dudosos y solicitar el bloqueo de servicios premium si el operador lo ofrece'], correcta: 3, explicacion: 'El bloqueo de suscripciones premium es la protección más efectiva.' },
      { id: 'sa-05', objetivoId: 'sa-servicios', enunciado: 'Algunos planes incluyen apps o streaming "liberado". ¿Qué significa?', opciones: ['Que el uso de esas apps no descuenta de los GB del plan, según las condiciones', 'Que las apps son de la compañía', 'Que solo funcionan con WiFi', 'Que el contenido es gratis para siempre en cualquier compañía'], correcta: 0, explicacion: '"Liberado" = ese tráfico no consume el cupo; las condiciones exactas dependen del plan.' },
      { id: 'sa-06', objetivoId: 'sa-configuracion', enunciado: '¿Qué es el buzón de voz?', opciones: ['Un chat del operador', 'El registro de llamadas', 'Un servicio que graba mensajes cuando el cliente no contesta o está sin señal', 'Una app de música'], correcta: 2, explicacion: 'El buzón captura mensajes de voz; puede activarse o desactivarse según preferencia.' },
      { id: 'sa-07', objetivoId: 'sa-configuracion', enunciado: '¿Qué hace el desvío de llamadas?', opciones: ['Bloquea todas las llamadas', 'Redirige las llamadas entrantes a otro número según la regla configurada', 'Graba las conversaciones', 'Duplica la señal'], correcta: 1, explicacion: 'El desvío deriva llamadas (siempre, si ocupado, si no contesta) a otro número.' },
      { id: 'sa-08', objetivoId: 'sa-configuracion', enunciado: 'Un cliente recibe demasiadas llamadas de spam. ¿Qué opciones tiene?', opciones: ['Cambiar de compañía es la única salida', 'Contestar y discutir con cada uno', 'Apagar el teléfono para siempre', 'Bloquear números desde el teléfono, usar filtros anti-spam e inscribirse en registros oficiales de no molestar'], correcta: 3, explicacion: 'La combinación de bloqueos del equipo y registros oficiales reduce el spam telefónico.' },
      { id: 'sa-09', objetivoId: 'sa-configuracion', enunciado: '¿Para qué sirve el control parental en los servicios?', opciones: ['Para limitar contenidos y tiempos de uso a menores en internet y apps', 'Para espiar cualquier teléfono', 'Para aumentar la velocidad', 'Para eliminar la publicidad del operador'], correcta: 0, explicacion: 'El control parental restringe contenido y uso: se configura en el equipo o mediante apps del servicio.' },
      { id: 'sa-10', objetivoId: 'sa-configuracion', enunciado: '¿Dónde puede el cliente activar o desactivar la mayoría de estos servicios adicionales?', opciones: ['Solo por carta certificada', 'En la app o sucursal virtual, o llamando al contact center', 'En la caja del chip', 'No se pueden modificar'], correcta: 1, explicacion: 'La autoatención digital y el contact center gestionan altas y bajas de servicios.' },
    ],
  },
  {
    id: 'servicio-tecnico',
    titulo: 'Servicio Técnico',
    icono: '🛠️',
    descripcion: 'Diagnóstico, escalamiento y gestión de fallas.',
    objetivos: [
      { id: 'st-diagnostico', titulo: 'Diagnóstico básico' },
      { id: 'st-gestion', titulo: 'Escalamiento y gestión' },
    ],
    ejercicios: [
      { id: 'st-01', objetivoId: 'st-diagnostico', enunciado: '¿Cuál es el orden correcto de un diagnóstico básico ante una falla?', opciones: ['Escalar primero y diagnosticar después', 'Cambiar el equipo de inmediato', 'Descartar lo simple primero (reinicio, saldo/plan vigente, cobertura, configuración) y luego escalar', 'Esperar a que la falla desaparezca'], correcta: 2, explicacion: 'El descarte de causas simples resuelve la mayoría de los casos sin escalamiento.' },
      { id: 'st-02', objetivoId: 'st-diagnostico', enunciado: '¿Por qué el reinicio del equipo es el primer paso clásico?', opciones: ['Porque limpia procesos y re-registra el equipo en la red, resolviendo muchas fallas transitorias', 'Porque borra todos los datos', 'Porque aumenta la señal permanentemente', 'Porque es un requisito legal'], correcta: 0, explicacion: 'Reiniciar restablece conexiones y servicios del sistema: barato y sorprendentemente efectivo.' },
      { id: 'st-03', objetivoId: 'st-diagnostico', enunciado: '¿Cómo distinguir rápidamente si una falla es del equipo o de la línea?', opciones: ['No se puede distinguir', 'Por el color de la pantalla', 'Comprando un teléfono nuevo', 'Probando la SIM en otro equipo y otra SIM en el equipo afectado'], correcta: 3, explicacion: 'La prueba cruzada aísla la variable: si la SIM funciona en otro equipo, el problema es del teléfono.' },
      { id: 'st-04', objetivoId: 'st-diagnostico', enunciado: 'Una SIM antigua falla intermitentemente. ¿Qué solución simple existe?', opciones: ['Pegarla con cinta adhesiva', 'Solicitar la reposición del chip manteniendo el mismo número', 'Cambiar de número', 'Formatear el teléfono'], correcta: 1, explicacion: 'La reposición de SIM conserva el número y descarta fallas del chip desgastado.' },
      { id: 'st-05', objetivoId: 'st-diagnostico', enunciado: '¿Por qué conviene revisar actualizaciones de software ante fallas del equipo?', opciones: ['Las actualizaciones corrigen errores conocidos del sistema que causan muchas fallas', 'Las actualizaciones son solo estéticas', 'Para gastar datos', 'No tiene relación'], correcta: 0, explicacion: 'Bugs de sistema se corrigen con updates; un equipo desactualizado arrastra fallas ya resueltas.' },
      { id: 'st-06', objetivoId: 'st-gestion', enunciado: '¿Cuándo corresponde escalar una falla de internet hogar a visita técnica?', opciones: ['Siempre, ante cualquier consulta', 'Cuando el diagnóstico remoto se agotó: reinicios y verificaciones no resuelven y el problema es de la instalación', 'Nunca, todo se resuelve por teléfono', 'Solo si el cliente insiste tres veces'], correcta: 1, explicacion: 'La visita procede cuando la evidencia apunta a un problema físico de la instalación o red local.' },
      { id: 'st-07', objetivoId: 'st-gestion', enunciado: '¿Por qué es importante registrar cada caso con un número de ticket o requerimiento?', opciones: ['Es solo burocracia', 'Para cobrar por la atención', 'Da trazabilidad: permite seguimiento, plazos y continuidad si atiende otra persona', 'Para llenar estadísticas del jefe'], correcta: 2, explicacion: 'El ticket es la memoria del caso: sin registro no hay seguimiento ni responsabilidad de plazos.' },
      { id: 'st-08', objetivoId: 'st-gestion', enunciado: 'Un equipo entra a reparación por garantía. ¿Qué conviene informar al cliente?', opciones: ['Que la reparación es instantánea', 'Que pierde la garantía al reclamar', 'Que debe pagar por adelantado', 'Los plazos estimados, cómo seguir el estado y qué pasa si la falla no es reparable'], correcta: 3, explicacion: 'Expectativas claras (plazos, seguimiento, alternativas) evitan reclamos posteriores.' },
      { id: 'st-09', objetivoId: 'st-gestion', enunciado: 'Varios clientes del mismo sector reportan la misma falla al mismo tiempo. ¿Qué corresponde?', opciones: ['Tratar cada caso como equipo defectuoso', 'Reportarlo como posible falla masiva de red para diagnóstico zonal', 'Pedirles a todos que cambien su router', 'Ignorar los reportes duplicados'], correcta: 1, explicacion: 'Patrones simultáneos y geográficos indican incidente de red: el reporte masivo acelera la solución.' },
      { id: 'st-10', objetivoId: 'st-gestion', enunciado: 'Al cerrar un caso técnico con el cliente, ¿cuál es la buena práctica final?', opciones: ['Confirmar con el cliente que el servicio quedó funcionando y explicar qué se hizo', 'Cortar la llamada apenas se aplique el arreglo', 'Pedirle que no vuelva a llamar', 'Prometer que nunca más fallará'], correcta: 0, explicacion: 'La verificación con el cliente y la explicación cierran el ciclo y evitan reaperturas.' },
    ],
  },
  {
    id: 'atencion-cliente',
    titulo: 'Atención al Cliente',
    icono: '💬',
    descripcion: 'Buenas prácticas de servicio y manejo de situaciones difíciles.',
    objetivos: [
      { id: 'ac-escucha', titulo: 'Escucha activa y empatía' },
      { id: 'ac-reclamos', titulo: 'Manejo de reclamos' },
    ],
    ejercicios: [
      { id: 'ac-01', objetivoId: 'ac-escucha', enunciado: 'Un cliente explica su problema por segunda vez, visiblemente frustrado. ¿Cuál es la mejor primera respuesta?', opciones: ['Interrumpirlo para ahorrar tiempo y dar la solución', 'Parafrasear su problema para confirmar que se entendió y reconocer su molestia', 'Transferirlo de inmediato a otro ejecutivo', 'Pedirle que envíe un correo con los detalles'], correcta: 1, explicacion: 'Parafrasear confirma comprensión y el reconocimiento de la emoción reduce la tensión: son las bases de la escucha activa.' },
      { id: 'ac-02', objetivoId: 'ac-escucha', enunciado: '¿Qué caracteriza a la escucha activa?', opciones: ['Esperar en silencio a que el cliente termine para responder lo planificado', 'Atender, confirmar y responder a lo que la persona realmente dijo', 'Tomar nota de todo sin intervenir', 'Repetir literalmente cada frase del cliente'], correcta: 1, explicacion: 'La escucha activa implica prestar atención plena, verificar la comprensión y responder sobre lo que la persona expresó, no sobre un guion.' },
      { id: 'ac-03', objetivoId: 'ac-reclamos', enunciado: 'Ante un reclamo que no puedes resolver en el momento, ¿qué corresponde hacer?', opciones: ['Prometer que se resolverá hoy para calmar al cliente', 'Explicar el paso siguiente, dar un plazo realista y registrar el caso', 'Indicar que no depende de tu área', 'Ofrecer una compensación inmediata sin registrar el caso'], correcta: 1, explicacion: 'Un compromiso realista y trazable (paso siguiente + plazo + registro) mantiene la confianza; prometer lo incumplible la destruye.' },
      { id: 'ac-04', objetivoId: 'ac-reclamos', enunciado: '¿Cuál es el orden recomendado para manejar un reclamo con un cliente molesto?', opciones: ['Solucionar → escuchar → disculparse', 'Escuchar → reconocer/disculparse → resolver → verificar satisfacción', 'Disculparse → transferir → cerrar el caso', 'Explicar las políticas → escuchar → resolver'], correcta: 1, explicacion: 'Primero se escucha y se reconoce la molestia; recién entonces la solución es recibida. Verificar el cierre evita reingresos del reclamo.' },
    ],
  },
  {
    id: 'tecnicas-formacion',
    titulo: 'Técnicas de Formación',
    icono: '🎓',
    descripcion: 'Herramientas didácticas para relatores: aprendizaje de adultos y diseño de sesiones.',
    objetivos: [
      { id: 'tf-adultos', titulo: 'Aprendizaje de adultos' },
      { id: 'tf-sesiones', titulo: 'Diseño de sesiones efectivas' },
    ],
    ejercicios: [
      { id: 'tf-01', objetivoId: 'tf-adultos', enunciado: '¿Qué principio caracteriza el aprendizaje de adultos (andragogía)?', opciones: ['Aprenden mejor con clases expositivas largas', 'Necesitan ver la aplicación práctica e inmediata de lo que aprenden', 'Prefieren memorizar antes que practicar', 'Dependen totalmente del formador para avanzar'], correcta: 1, explicacion: 'Los adultos aprenden orientados a problemas reales: la relevancia práctica inmediata es el principal motor de su motivación.' },
      { id: 'tf-02', objetivoId: 'tf-adultos', enunciado: '¿Por qué conviene espaciar los repasos en lugar de concentrar todo el estudio en una sesión?', opciones: ['Porque las sesiones largas son más caras', 'Porque el repaso espaciado fortalece la retención a largo plazo (efecto de espaciamiento)', 'Porque los adultos se aburren, aunque retengan igual', 'No conviene: concentrar el estudio es más efectivo'], correcta: 1, explicacion: 'La evidencia sobre el efecto de espaciamiento muestra que recuperar la información en intervalos crecientes consolida la memoria mucho más que el estudio masivo. Es exactamente lo que hace esta app.' },
      { id: 'tf-03', objetivoId: 'tf-sesiones', enunciado: 'Al iniciar una sesión de formación, ¿qué debe quedar claro primero?', opciones: ['El detalle de todos los contenidos que se verán', 'Los objetivos de aprendizaje y qué podrán hacer los participantes al terminar', 'Las reglas de evaluación y penalizaciones', 'La trayectoria profesional del relator'], correcta: 1, explicacion: 'Explicitar los objetivos orienta la atención y permite a los participantes autoevaluar su avance durante la sesión.' },
      { id: 'tf-04', objetivoId: 'tf-sesiones', enunciado: '¿Cuál es la mejor forma de verificar que los participantes comprendieron un contenido?', opciones: ['Preguntar "¿quedó claro?" al final', 'Pedirles que apliquen o expliquen el contenido (práctica de recuperación)', 'Repetir el contenido dos veces', 'Entregar el material impreso para revisión posterior'], correcta: 1, explicacion: 'La práctica de recuperación (aplicar, resolver, explicar) evidencia la comprensión real; el "¿quedó claro?" suele obtener un sí de cortesía.' },
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
