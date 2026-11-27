(function () {
    'use strict';

    /* Cálculos del mapa del observatorio. No toca la página, para poder probarlo. */

    const RADIOS = { 'Básico': 5, 'Estándar': 6.5, 'Premium': 8 };
    const MARGEN = 5;
    const DISPERSION = 1.8;

    function estadoDe(estudiante) {
        if (estudiante.progreso >= 100) return 'completo';
        return estudiante.activo ? 'activo' : 'abandono';
    }

    function contar(lista) {
        const total = { completo: 0, activo: 0, abandono: 0 };
        lista.forEach(function (e) { total[estadoDe(e)] += 1; });
        return total;
    }

    function abandonos(lista) {
        return lista
            .filter(function (e) { return estadoDe(e) === 'abandono'; })
            .sort(function (a, b) { return a.progreso - b.progreso || a.id - b.id; });
    }

    function tiempo(estudiante) {
        return Date.parse(estudiante.fechaInscripcion) || 0;
    }

    function rangoDeFechas(lista) {
        const tiempos = lista.map(tiempo);
        if (!tiempos.length) return { desde: 0, hasta: 0 };
        return { desde: Math.min.apply(null, tiempos), hasta: Math.max.apply(null, tiempos) };
    }

    /* Desplazamiento estable entre -1 y 1, para que dos puntos iguales no se tapen. */
    function desvio(semilla) {
        const valor = Math.sin(semilla * 12.9898) * 43758.5453;
        return (valor - Math.floor(valor)) * 2 - 1;
    }

    function limitar(valor) {
        return Math.round(Math.min(98, Math.max(2, valor)) * 100) / 100;
    }

    /* Posición en porcentaje: a la derecha los recientes, arriba los más avanzados. */
    function posicion(estudiante, rango) {
        const amplitud = rango.hasta - rango.desde;
        const parte = amplitud ? (tiempo(estudiante) - rango.desde) / amplitud : 0.5;
        const ancho = 100 - MARGEN * 2;
        return {
            x: limitar(MARGEN + parte * ancho + desvio(estudiante.id) * DISPERSION),
            y: limitar(100 - MARGEN - (estudiante.progreso / 100) * ancho + desvio(estudiante.id + 97) * DISPERSION)
        };
    }

    function radio(plan) {
        return RADIOS[plan] || RADIOS['Básico'];
    }

    function titular(total, enAbandono) {
        if (!total) return 'Todavía no hay estudiantes';
        if (!enAbandono) return 'Nadie ha dejado su curso sin terminar';
        return enAbandono === 1
            ? '1 estudiante dejó su curso sin terminar'
            : enAbandono + ' estudiantes dejaron su curso sin terminar';
    }

    const api = {
        estadoDe: estadoDe,
        contar: contar,
        abandonos: abandonos,
        rangoDeFechas: rangoDeFechas,
        posicion: posicion,
        radio: radio,
        titular: titular
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        window.StudentScope = window.StudentScope || {};
        window.StudentScope.cielo = api;
    }
})();
