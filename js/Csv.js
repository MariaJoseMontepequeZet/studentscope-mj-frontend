(function () {
    'use strict';

    const COLUMNAS = [
        'id', 'nombre', 'apellido', 'email', 'ciudad', 'curso', 'progreso',
        'fechaInscripcion', 'plan', 'montoUSD', 'activo'
    ];

    function celda(valor) {
        let texto = valor === null || valor === undefined ? '' : String(valor);
        if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
        return /[",\n\r]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
    }

    function valorDe(estudiante, columna) {
        return columna === 'curso' ? estudiante.curso && estudiante.curso.nombre : estudiante[columna];
    }

    function aCSV(estudiantes) {
        const filas = estudiantes.map(function (e) {
            return COLUMNAS.map(function (columna) { return celda(valorDe(e, columna)); }).join(',');
        });
        return '﻿' + [COLUMNAS.join(',')].concat(filas).join('\r\n');
    }

    const api = { aCSV: aCSV, celda: celda, COLUMNAS: COLUMNAS };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        window.StudentScope = window.StudentScope || {};
        window.StudentScope.csv = api;
    }
})();
