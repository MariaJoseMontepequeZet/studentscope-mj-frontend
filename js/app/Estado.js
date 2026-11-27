export const esc = window.StudentScope.escaparHTML;

export const num = window.StudentScope.aNumero;

export const ico = window.StudentScope.icono;

export const api = window.StudentScope.api;

export var PLANES_MONTO = { 'Básico': 29.99, 'Estándar': 59.99, 'Premium': 99.99 };

export var state = {
    estudiantes: [],
    cielo: [],
    cieloOcultos: [],
    cieloElegido: null,
    total: 0,
    paginas: 0,
    resumen: null,
    cursos: [],
    peticion: 0,
    temporizadorBusqueda: null,
    editandoId: null,
    graficoPlan: null,
    graficoProgreso: null,
    confirmCb: null,
    vistaActual: 'landing',
    paginaActual: 1,
    itemsPorPagina: 12,
    filtroCategoria: 'todos',
    usuario: null,
    avatarElegido: null,
    avatarOpciones: []
};
