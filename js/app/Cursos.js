import { avisarErrorCarga } from './Datos.js';
import { api, esc, num, state } from './Estado.js';
import { planSlug } from './Interfaz.js';

var CATEGORIAS_INFO = {
    'todos': { label: 'Todos' },
    'web': { label: 'Desarrollo Web' },
    'data': { label: 'Data & IA' },
    'devops': { label: 'DevOps & Cloud' },
    'mobile': { label: 'Mobile' },
    'design': { label: 'Diseño' },
    'seguridad': { label: 'Seguridad' },
    'marketing': { label: 'Marketing' }
};

export async function mostrarCursos() {
    var sec = document.getElementById('secCursos');
    if (!sec) return;
    if (!state.cursos.length) sec.innerHTML = '<p class="cursos-count">Cargando cursos…</p>';
    try {
        state.cursos = (await api.get('/api/cursos')).cursos;
    } catch (error) {
        avisarErrorCarga(error);
        if (!state.cursos.length) sec.innerHTML = '<p class="cursos-count">No se pudieron cargar los cursos.</p>';
        return;
    }
    renderizarCursos();
}

function renderizarCursos() {
    var sec = document.getElementById('secCursos');
    if (!sec) return;

    var filtro = state.filtroCategoria || 'todos';
    var lista = filtro === 'todos'
        ? state.cursos
        : state.cursos.filter(function (c) { return c.categoria === filtro; });

    var coloresCat = {
        'web': '#3B82F6', 'data': '#F5A623', 'devops': '#8B5CF6',
        'mobile': '#F97316', 'design': '#EC4899', 'seguridad': '#EF4444',
        'marketing': '#22C55E'
    };

    var tabsHTML = Object.keys(CATEGORIAS_INFO).map(function (k) {
        var activo = (k === filtro) ? ' cat-tab--active' : '';
        return '<button class="cat-tab' + activo + '" data-cat="' + k + '">' +
            esc(CATEGORIAS_INFO[k].label) + '</button>';
    }).join('');

    var cardsHTML = lista.map(function (c) {
        var color = coloresCat[c.categoria] || '#F5A623';
        var categoria = CATEGORIAS_INFO[c.categoria] ? CATEGORIAS_INFO[c.categoria].label : c.categoria;
        var nivelClass = c.nivel === 'Avanzado' ? 'nivel--avanzado' : c.nivel === 'Intermedio' ? 'nivel--intermedio' : 'nivel--basico';
        return '<article class="curso-card">' +
            '<div class="curso-card__top" style="--cat-color:' + color + '">' +
            '<span class="curso-cat-badge" style="background:' + color + '20;color:' + color + ';border-color:' + color + '40">' +
            esc(categoria) + '</span>' +
            '<span class="curso-nivel ' + nivelClass + '">' + esc(c.nivel) + '</span>' +
            '</div>' +
            '<h3 class="curso-card__title">' + esc(c.nombre) + '</h3>' +
            '<p class="curso-card__desc">' + esc(c.descripcion) + '</p>' +
            '<div class="curso-card__meta">' +
            '<span>' + esc(c.instructor) + '</span>' +
            '<span>' + num(c.semanas) + ' sem</span>' +
            '<span>' + num(c.inscritos) + ' inscritos</span>' +
            '</div>' +
            '<div class="curso-card__footer">' +
            '<span class="plan-badge plan-badge--' + esc(planSlug(c.plan)) + '">' + esc(c.plan) + '</span>' +
            '<span class="curso-card__precio">$' + num(c.precioUSD).toFixed(2) + ' USD</span>' +
            '</div>' +
            '</article>';
    }).join('');

    sec.innerHTML =
        '<header class="page-header">' +
        '<div><h2 class="page-header__title">Catálogo de <span>Cursos</span></h2>' +
        '<p class="page-header__meta">' + state.cursos.length + ' cursos disponibles · StudentScope MJ</p></div>' +
        '</header>' +
        '<div class="cat-tabs" role="tablist" aria-label="Filtrar por categoría">' + tabsHTML + '</div>' +
        '<p class="cursos-count">Mostrando <strong>' + lista.length + '</strong> curso' + (lista.length !== 1 ? 's' : '') + '</p>' +
        '<div class="cursos-grid">' + cardsHTML + '</div>';

    sec.querySelectorAll('.cat-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.filtroCategoria = this.getAttribute('data-cat');
            renderizarCursos();
        });
    });
}
