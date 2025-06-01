// Variables globales
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];

// Elementos del DOM
const formTransaccion = document.getElementById('formTransaccion');
const cuerpoTabla = document.getElementById('cuerpoTabla');
const btnExportar = document.getElementById('btnExportar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnReporte = document.getElementById('btnReporte');
const btnCerrarReporte = document.getElementById('btnCerrarReporte');
const reporteHTML = document.getElementById('reporteHTML');
const contenidoReporte = document.getElementById('contenidoReporte');
const currentYearSpan = document.getElementById('currentYear');

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    // Establecer año actual en el footer
    currentYearSpan.textContent = new Date().getFullYear();

    // Establecer fecha actual por defecto
    document.getElementById('fecha').valueAsDate = new Date();

    // Inicializar la tabla
    actualizarTabla();

    // Event listeners
    formTransaccion.addEventListener('submit', registrarTransaccion);
    btnExportar.addEventListener('click', exportarAExcel);
    btnLimpiar.addEventListener('click', limpiarTransacciones);
    btnReporte.addEventListener('click', generarReporteHTML);
    btnCerrarReporte.addEventListener('click', cerrarReporte);
});

// Funciones principales
function registrarTransaccion(e) {
    e.preventDefault();

    const tipo = document.getElementById('tipoTransaccion').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const fecha = document.getElementById('fecha').value;
    const descripcion = document.getElementById('descripcion').value;

    // Validar fecha (si no se proporciona, usar fecha actual)
    const fechaTransaccion = fecha ? fecha : new Date().toISOString().split('T')[0];

    // Agregar la nueva transacción
    transacciones.push({
        tipo,
        monto,
        fecha: fechaTransaccion,
        descripcion
    });

    // Guardar y actualizar
    guardarTransacciones();
    actualizarTabla();

    // Resetear el formulario
    formTransaccion.reset();
}

function actualizarTabla() {
    cuerpoTabla.innerHTML = '';

    transacciones.forEach((transaccion, index) => {
        const fila = document.createElement('tr');

        // Determinar clase CSS según el tipo de transacción
        const claseTipo = transaccion.tipo === 'ingreso' ? 'monto-positivo' : 'monto-negativo';

        fila.innerHTML = `
      <td>${transaccion.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
      <td class="${claseTipo}">${transaccion.tipo === 'ingreso' ? '+' : '-'}$${transaccion.monto.toFixed(2)}</td>
      <td>${new Date(transaccion.fecha).toLocaleDateString()}</td>
      <td>${transaccion.descripcion}</td>
      <td>
        <button class="btn-eliminar" data-index="${index}">
          <i class="bi bi-trash"></i> Eliminar
        </button>
      </td>
    `;

        cuerpoTabla.appendChild(fila);
    });

    // Agregar event listeners a los botones de eliminar
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-index'));
            eliminarTransaccion(index);
        });
    });

    actualizarResumen();
}

function eliminarTransaccion(index) {
    transacciones.splice(index, 1);
    guardarTransacciones();
    actualizarTabla();
}

function limpiarTransacciones() {
    if (confirm('¿Estás seguro de que deseas eliminar todas las transacciones?')) {
        transacciones = [];
        guardarTransacciones();
        actualizarTabla();
    }
}

function actualizarResumen() {
    const totalIngresos = transacciones
        .filter(t => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0);

    const totalEgresos = transacciones
        .filter(t => t.tipo === 'egreso')
        .reduce((sum, t) => sum + t.monto, 0);

    const balanceGeneral = totalIngresos - totalEgresos;
    const iva = totalIngresos * 0.19; // Calcula el 19% de IVA sobre ingresos

    document.getElementById('totalIngresos').textContent = `$${totalIngresos.toFixed(2)}`;
    document.getElementById('totalEgresos').textContent = `$${totalEgresos.toFixed(2)}`;

    const balanceElement = document.getElementById('balanceGeneral');
    balanceElement.textContent = `$${balanceGeneral.toFixed(2)}`;
    balanceElement.className = balanceGeneral >= 0 ? 'monto-positivo' : 'monto-negativo';

    document.getElementById('totalIva').textContent = `$${iva.toFixed(2)}`;
}

// Funciones de exportación y reporte
function exportarAExcel() {
    // Preparar los datos para la exportación
    const datos = transacciones.map(t => ({
        'Tipo': t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        'Monto': t.tipo === 'ingreso' ? t.monto : -t.monto,
        'Fecha': new Date(t.fecha).toLocaleDateString(),
        'Descripción': t.descripcion
    }));

    // Agregar resumen
    const totalIngresos = transacciones
        .filter(t => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0);

    const totalEgresos = transacciones
        .filter(t => t.tipo === 'egreso')
        .reduce((sum, t) => sum + t.monto, 0);

    const balanceGeneral = totalIngresos - totalEgresos;
    const iva = totalIngresos * 0.19;

    datos.push(
        {},
        {
            'Tipo': 'RESUMEN',
            'Monto': '',
            'Fecha': '',
            'Descripción': ''
        },
        {
            'Tipo': 'Total Ingresos',
            'Monto': totalIngresos,
            'Fecha': '',
            'Descripción': ''
        },
        {
            'Tipo': 'Total Egresos',
            'Monto': -totalEgresos,
            'Fecha': '',
            'Descripción': ''
        },
        {
            'Tipo': 'Balance General',
            'Monto': balanceGeneral,
            'Fecha': '',
            'Descripción': ''
        },
        {
            'Tipo': 'IVA (19% sobre ingresos)',
            'Monto': iva,
            'Fecha': '',
            'Descripción': ''
        }
    );

    // Crear libro de Excel
    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(libro, hoja, "Transacciones");

    // Exportar el archivo
    XLSX.writeFile(libro, 'transacciones_financieras.xlsx');
}

function generarReporteHTML() {
    let html = `
    <h4>Resumen Financiero</h4>
    <p><strong>Total de transacciones:</strong> ${transacciones.length}</p>
    <p><strong>Fecha del reporte:</strong> ${new Date().toLocaleDateString()}</p>
    
    <h5 class="mt-4">Detalle de Transacciones</h5>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Monto</th>
          <th>Fecha</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
  `;

    transacciones.forEach(t => {
        html += `
      <tr>
        <td>${t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
        <td class="${t.tipo === 'ingreso' ? 'monto-positivo' : 'monto-negativo'}">
          ${t.tipo === 'ingreso' ? '+' : '-'}$${t.monto.toFixed(2)}
        </td>
        <td>${new Date(t.fecha).toLocaleDateString()}</td>
        <td>${t.descripcion}</td>
      </tr>
    `;
    });

    // Calcular resumen
    const totalIngresos = transacciones
        .filter(t => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0);

    const totalEgresos = transacciones
        .filter(t => t.tipo === 'egreso')
        .reduce((sum, t) => sum + t.monto, 0);

    const balanceGeneral = totalIngresos - totalEgresos;
    const iva = totalIngresos * 0.19;

    html += `
      </tbody>
    </table>

    <h5 class="mt-4">Resumen Contable</h5>
    <table class="table table-bordered">
      <tr>
        <td><strong>Total Ingresos</strong></td>
        <td class="monto-positivo">$${totalIngresos.toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Total Egresos</strong></td>
        <td class="monto-negativo">$${totalEgresos.toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Balance General</strong></td>
        <td class="${balanceGeneral >= 0 ? 'monto-positivo' : 'monto-negativo'}">
          $${balanceGeneral.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td><strong>IVA (19% sobre ingresos)</strong></td>
        <td>$${iva.toFixed(2)}</td>
      </tr>
    </table>
  `;

    contenidoReporte.innerHTML = html;
    reporteHTML.style.display = 'block';
}

function cerrarReporte() {
    reporteHTML.style.display = 'none';
}

// Función de utilidad
function guardarTransacciones() {
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
}