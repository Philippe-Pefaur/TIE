const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let port;
let parser;
const RECONNECT_INTERVAL = 5000; // Intentar reconectar cada 5 segundos
const API_URL = 'http://localhost:5000/api';

async function enviarDatos(datos) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            const resultado = await response.json();
            console.log('Datos enviados exitosamente:', resultado);
        } else {
            console.error('Error al enviar datos:', response.status);
        }
    } catch (error) {
        console.error('Error en la petición HTTP:', error.message);
    }
}


function conectarPuerto() {
    // Configurar el puerto serial
    port = new SerialPort({
        path: 'COM4',
        baudRate: 9600,
        autoOpen: false
    });

    // Parser para leer línea por línea
    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Evento cuando el puerto se abre correctamente
    port.on('open', () => {
        console.log('Puerto serial COM4 abierto');
    });

    // Leer datos del Arduino
    parser.on('data', (data) => {
        console.log('Datos recibidos:', data);
        try {
            // Parsear el JSON recibido del Arduino
            const datosArduino = JSON.parse(data);
            console.log('Datos parseados:', datosArduino);
            
            // Enviar a la API
            enviarDatos(datosArduino);
        } catch (error) {
            console.error('Error al parsear JSON:', error.message);
        }
    });

    // Manejar errores
    port.on('error', (err) => {
        console.error('Error en el puerto serial:', err.message);
    });

    // Manejar desconexión
    port.on('close', () => {
        console.log('Puerto serial cerrado. Intentando reconectar en 5 segundos...');
        setTimeout(conectarPuerto, RECONNECT_INTERVAL);
    });

    // Abrir el puerto
    port.open((err) => {
        if (err) {
            console.error('Error al abrir el puerto:', err.message);
            console.log(`Reintentando en ${RECONNECT_INTERVAL/1000} segundos...`);
            setTimeout(conectarPuerto, RECONNECT_INTERVAL);
        }
    });
}

// Iniciar conexión
conectarPuerto();

// Cerrar el puerto solo cuando se cierre el proceso manualmente
process.on('SIGINT', () => {
    console.log('\nCerrando programa...');
    if (port && port.isOpen) {
        port.close(() => {
            console.log('Puerto serial cerrado');
            process.exit();
        });
    } else {
        process.exit();
    }
});