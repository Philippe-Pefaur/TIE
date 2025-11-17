const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let port;
let parser;
const RECONNECT_INTERVAL = 5000; // Intervalo de reconexión (default 5000ms)
const API_URL = 'http://localhost:5000/api'; // Dirección de la API de procesamiento final de datos

async function enviarDatos(datos) { // Función para enviar datos obtenidos del Arduino a la API
    try {
        const response = await fetch(API_URL, { // Request POST con los datos en formato .JSON
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


function conectarPuerto() { // Función que intenta conectarse al puerto donde se comunicará el Arduino y recibir sus datos
    port = new SerialPort({ // Configurar el puerto serial
        path: 'COM4',
        baudRate: 9600,
        autoOpen: false
    });

    parser = port.pipe(new ReadlineParser({ delimiter: '\n' })); // Parser que procesa las líneas envíadas por el Arduino

    // Configurar funciones de manejo de flujo
    port.on('open', () => { // Función a ejecutar cuando el puerto se conecta correctamente
        console.log('Puerto serial COM4 abierto');
    });
    
    parser.on('data', (data) => { // Función a ejecutar cuando el Arduino envíe una línea de datos
        console.log('Datos recibidos:', data);
        try { // Crear una variable de objeto con la línea del Arduino
            const datosArduino = JSON.parse(data);
            console.log('Datos parseados:', datosArduino);
            
            enviarDatos(datosArduino); // Enviar a la API
        } catch (error) {
            console.error('Error al parsear JSON:', error.message);
        }
    });

    port.on('error', (err) => { // Función a ejecutar cuando ocurra un error
        console.error('Error en el puerto serial:', err.message);
    });

    port.on('close', () => { // Función a ejecutar cuando se pierda la conexión
        console.log('Puerto serial cerrado. Intentando reconectar en breve...');
        setTimeout(conectarPuerto, RECONNECT_INTERVAL);
    });

    process.on('SIGINT', () => { // Función a ejecutar cuando se cierre el proceso manualmente
        console.log('\nCerrando programa...');
        if (port && port.isOpen) { // Cerrar el pueto
            port.close(() => {
                console.log('Puerto serial cerrado');
                process.exit();
            });
        } else { // Si el puerto ya está cerrado, terminar el programa
            process.exit();
        }
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

conectarPuerto(); // Iniciar conexión