import { avisarErrorCarga, mostrarAvisoPendiente } from './Datos.js';
import { api, esc, ico, num } from './Estado.js';
import { puedeGestionar } from './Permisos.js';

export var notifPanelAbierto = false;

function marcarBoton(abierto) {
    var boton = document.getElementById('btnNotificaciones');
    if (boton) boton.setAttribute('aria-expanded', String(abierto));
}

function generarNotificaciones(r) {
    var inactivos = r.total - r.activos;
    var bajos = (r.rangosProgreso.find(function (x) { return x.rango === '0-24%'; }) || { total: 0 }).total;
    var notifs = [{
        tipo: 'stat', icono: 'barras', titulo: 'Resumen del sistema',
        texto: r.total + ' estudiantes · ' + r.activos + ' activos · ' + inactivos + ' inactivos · Promedio ' + r.progresoPromedio + '%',
        tiempo: 'Ahora'
    }];
    if (inactivos > 0) {
        notifs.push({
            tipo: 'warning', icono: 'alerta', titulo: 'Estudiantes inactivos',
            texto: inactivos + ' de ' + r.total + (inactivos === 1 ? ' estudiantes está inactivo' : ' estudiantes están inactivos') + ' (retención ' + r.retencionPorcentaje + '%).',
            tiempo: 'Hoy'
        });
    }
    if (r.completaron > 0) {
        notifs.push({
            tipo: 'success', icono: 'graduacion', titulo: 'Cursos completados',
            texto: r.completaron + (r.completaron === 1 ? ' estudiante completó' : ' estudiantes completaron') + ' su curso al 100%.',
            tiempo: 'Hoy'
        });
    }
    if (bajos > 0) {
        notifs.push({
            tipo: 'info', icono: 'tendenciaBaja', titulo: 'Progreso bajo',
            texto: bajos + (bajos === 1 ? ' estudiante lleva' : ' estudiantes llevan') + ' menos del 25% de progreso.',
            tiempo: 'Reciente'
        });
    }
    notifs.push({
        tipo: 'success', icono: 'dinero', titulo: 'Ingresos acumulados',
        texto: '$' + num(r.ingresosUSD).toFixed(2) + ' USD en inscripciones.',
        tiempo: 'Total'
    });
    return notifs;
}

export async function abrirPanelNotificaciones() {
    var panel = document.getElementById('notifPanel');
    if (!panel || !puedeGestionar()) return;
    if (notifPanelAbierto) { cerrarPanelNotificaciones(); return; }

    var datos;
    try {
        datos = await api.get('/api/reportes');
    } catch (error) {
        avisarErrorCarga(error);
        return;
    }
    var notifs = generarNotificaciones(datos);
    var colores = {
        warning: { bg: 'rgba(122,90,0,0.08)', border: 'rgba(122,90,0,0.25)', dot: '#7A5A00' },
        success: { bg: 'rgba(10,109,95,0.08)', border: 'rgba(10,109,95,0.25)', dot: '#0A6D5F' },
        info: { bg: 'rgba(42,62,158,0.08)', border: 'rgba(42,62,158,0.25)', dot: '#2A3E9E' },
        stat: { bg: 'rgba(91,75,183,0.08)', border: 'rgba(91,75,183,0.25)', dot: '#5B4BB7' }
    };

    var itemsHTML = notifs.map(function (n) {
        var c = colores[n.tipo] || colores.info;
        return '<div class="notif-item" style="background:' + c.bg + ';border-color:' + c.border + '">' +
            '<div class="notif-item__left">' +
            '<span class="notif-dot" style="background:' + c.dot + '"></span>' +
            '<span class="notif-icono">' + ico(n.icono) + '</span>' +
            '</div>' +
            '<div class="notif-item__body">' +
            '<p class="notif-titulo">' + esc(n.titulo) + '</p>' +
            '<p class="notif-texto">' + esc(n.texto) + '</p>' +
            '</div>' +
            '<span class="notif-tiempo">' + esc(n.tiempo) + '</span>' +
            '</div>';
    }).join('');

    var panelContent = document.getElementById('notifPanelContent');
    if (panelContent) panelContent.innerHTML = itemsHTML;

    mostrarAvisoPendiente(datos.total - datos.activos);

    notifPanelAbierto = true;
    panel.classList.add('is-open');
    marcarBoton(true);
}

export function cerrarPanelNotificaciones() {
    var panel = document.getElementById('notifPanel');
    if (panel) panel.classList.remove('is-open');
    notifPanelAbierto = false;
    marcarBoton(false);
}
