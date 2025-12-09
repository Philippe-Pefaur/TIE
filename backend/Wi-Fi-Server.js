const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const os = require('os');
const ping = require('ping');
const app = express();
const PORT = process.env.PORT || 5000;

// Variables globales para almacenar información del dispositivo seleccionado
let selectedDevice = {
    ip: null,
    mac: null,
    hostname: null,
    status: null
};

// Cache para getLocalNetwork para evitar recalcular en cada request
let cachedLocalNetwork = null;

// Función para obtener la IP local y subnet
function getLocalNetwork() {
    // Si ya tenemos el resultado cacheado, devolverlo sin logs
    if (cachedLocalNetwork !== null) {
        return cachedLocalNetwork;
    }

    const interfaces = os.networkInterfaces();
    
    // Primero intentar encontrar interfaces WiFi comunes
    const wifiNames = ['Wi-Fi', 'WiFi', 'WLAN', 'Wireless', 'en0', 'wlan0'];

    for (let interfaceName in interfaces) {
        console.log(interfaceName);
        // Verificar si el nombre contiene palabras relacionadas con WiFi
        const isWifi = wifiNames.some(name => 
            interfaceName.toLowerCase().includes(name.toLowerCase())
        );
        
        if (isWifi) {
            for (let iface of interfaces[interfaceName]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const ip = iface.address;
                    const subnet = ip.substring(0, ip.lastIndexOf('.'));
                    console.log(`Red WiFi detectada: ${interfaceName} - ${ip}`);
                    cachedLocalNetwork = { ip, subnet, interface: interfaceName };
                    return cachedLocalNetwork;
                }
            }
        }
    }
    
    // Si no encuentra WiFi, buscar redes típicas de hogar (192.168.x.x o 10.x.x.x)
    for (let interfaceName in interfaces) {
        for (let iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address;
                
                // Filtrar redes típicas de hogar/oficina
                if (ip.startsWith('192.168.0.') || 
                    ip.startsWith('192.168.1.') || 
                    ip.startsWith('10.0.')) {
                    const subnet = ip.substring(0, ip.lastIndexOf('.'));
                    console.log(`Red detectada: ${interfaceName} - ${ip}`);
                    cachedLocalNetwork = { ip, subnet, interface: interfaceName };
                    return cachedLocalNetwork;
                }
            }
        }
    }
    
    // Fallback: cualquier IPv4 que NO sea 192.168.56.x (VirtualBox)
    for (let interfaceName in interfaces) {
        for (let iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('192.168.56.')) {
                const ip = iface.address;
                const subnet = ip.substring(0, ip.lastIndexOf('.'));
                console.log(`Red detectada: ${interfaceName} - ${ip}`);
                cachedLocalNetwork = { ip, subnet, interface: interfaceName };
                return cachedLocalNetwork;
            }
        }
    }
    
    cachedLocalNetwork = null;
    return null;
}

// Reemplazar scanNetworkARP() con esta nueva función
async function scanNetworkPing(subnet) {
    console.log(`Escaneando ${subnet}.1 - ${subnet}.254...`);
    const devices = [];
    const promises = [];

    // Escanear todo el rango de IPs en paralelo
    for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        promises.push(
            ping.promise.probe(ip, {
                timeout: 1,
                min_reply: 1
            }).then(res => {
                if (res.alive) {
                    return ip;
                }
                return null;
            })
        );
    }

    // Esperar a que todas las promesas se resuelvan
    const results = await Promise.all(promises);
    
    // Filtrar solo las IPs activas
    return results.filter(ip => ip !== null);
}

// Función para obtener MAC address de una IP usando arp
function getMacAddress(ip) {
    return new Promise((resolve) => {
        exec(`arp -a ${ip}`, (error, stdout) => {
            if (error) {
                resolve(null);
                return;
            }
            
            // Buscar la dirección MAC en el output
            const match = stdout.match(/([0-9a-f]{2}[:-]){5}([0-9a-f]{2})/i);
            if (match) {
                resolve(match[0].toUpperCase());
            } else {
                resolve(null);
            }
        });
    });
}

// Función para obtener hostname de una IP
function getHostname(ip) {
    return new Promise((resolve) => {
        exec(`ping -n 1 -a ${ip}`, { timeout: 3000 }, (error, stdout) => {
            if (error) {
                resolve(null);
                return;
            }
            
            // Intentar extraer el hostname del resultado
            const match = stdout.match(/Haciendo ping a ([^\s\[]+)/i);
            if (match && match[1] !== ip) {
                const ahora = new Date();
                const horaConSegundos = ahora.toLocaleTimeString('es-CL', {
                    minute: '2-digit',
                    hour: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                console.log(horaConSegundos);
                console.log(match);
                resolve(match[1]);
            } else {
                resolve(null);
            }
        });
    });
}

// Reemplazar scanDevicesWithDetails() con esta versión mejorada
async function scanDevicesWithDetails() {
    try {
        const localNet = getLocalNetwork();
        if (!localNet) {
            throw new Error('No se pudo determinar la red local');
        }

        console.log(`Escaneando red: ${localNet.subnet}.0/24`);
        
        // Escanear con ping activo
        const activeIPs = await scanNetworkPing(localNet.subnet);
        
        console.log(`Dispositivos activos encontrados: ${activeIPs.length}`);
        
        // Obtener detalles adicionales para cada IP
        const devicesWithDetails = await Promise.all(
            activeIPs.map(async (ip) => {
                const [hostname, mac] = await Promise.all([
                    getHostname(ip),
                    getMacAddress(ip)
                ]);
                
                return {
                    ip: ip,
                    mac: mac || 'Desconocido',
                    hostname: hostname || 'Desconocido',
                    status: 'online'
                };
            })
        );

        return {
            localIP: localNet.ip,
            subnet: localNet.subnet,
            totalDevices: devicesWithDetails.length,
            devices: devicesWithDetails
        };
    } catch (error) {
        throw error;
    }
}

function agregarRegistro(fecha, semana=false) { // Agrega un día o semana al registro liviano
    const rutaArchivo = path.join(__dirname, 'data/registro.json');
    const dia = fecha.substring(0,2);

    if (!fs.existsSync(rutaArchivo)) { // Si no existe el archivo de registros, crearlo
        let result;
        if (!semana) {
            result = { // Registro en JSON
                [fecha.substring(3,10)]: { // Clave: Mes, Valor: Días y semanas
                    dias: [dia], 
                    semanas: []
                }
            };
        } else {
            result = { // Registro en JSON
                [fecha.substring(3,10)]: { // Clave: Mes, Valor: Días y semanas
                    dias: [], 
                    semanas: [dia]
                }
            };
        }
        
        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
        console.log(`Dato guardado en ${rutaArchivo}`);

        return; // Terminar el proceso
    }

    // Si el archivo ya existe, agregar registro
    const contenido = fs.readFileSync(rutaArchivo, 'utf8'); // Leer el archivo
    const result = JSON.parse(contenido);

    if (!result[fecha.substring(3,10)]) { // Si no existe un registro para el mes
        if (!semana) {
            result[fecha.substring(3,10)] = { // Crear la clave del mes y agregar el día
                dias: [dia], 
                semanas: []
            };  
        } else {
            result[fecha.substring(3,10)] = { // Crear la clave del mes y agregar las semana
                dias: [], 
                semanas: [dia]
            };  
        }
        
        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
        console.log(`Dato guardado en ${rutaArchivo}`);

        return;
    }
    
    // Si ya hay registros para el mes
    if (!semana) {
        if (!result[fecha.substring(3,10)].dias.includes(dia)) { // Sólo si el día no esta registrado, agregarlo
            result[fecha.substring(3,10)].dias.push(dia);
        }
    } else {
        if (!result[fecha.substring(3,10)].semanas.includes(dia)) { // Sólo si la semana no esta registrado, agregarlo
            result[fecha.substring(3,10)].semanas.push(dia);
        }
    }
    
    fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
    console.log(`Dato guardado en ${rutaArchivo}`);

    return;
}

function actualizarResumenSemanal(data) { // Funcion para crear o actualizar datos de resumen semanal
    console.log(data);
    // Obtener fecha de los datos
    const[dia, mes, año] = data.fecha.split('-');
    const fecha = new Date(año, mes-1, dia);

    // Obetener semana de los datos
    const diaSemana = (fecha.getDay() + 6) % 7; // Obtener día de la semana [0-6], 0: Lunes, 6: Domingo
    const inicioSemana = new Date(fecha);
    inicioSemana.setDate(fecha.getDate() - diaSemana); // Obtener fecha del lunes de la semana corresopondiente

    // Formatear fecha a string
    const diaInicio = String(inicioSemana.getDate()).padStart(2, '0');
    const mesInicio = String(inicioSemana.getMonth() + 1).padStart(2, '0');
    const añoInicio = inicioSemana.getFullYear();
    const semana = `${diaInicio}-${mesInicio}-${añoInicio}`;

    const rutaArchivo = path.join(__dirname, `data/${data.fecha.substring(3, 10)}/resumenSemana-${semana}.json`); // Obtener la dirección del archivo
    
    if (!fs.existsSync(rutaArchivo)) { // Si no existe, crearlo
        const result = { // Datos en JSON
            fecha: semana,
            dias: [data.fecha.substring(0, 2)],
            consumo: [data.consumo.reduce((acc, val) => acc + val, 0)],
            generacion: [data.generacion.reduce((acc, val) => acc + val, 0)],
            consumoSuministroGeneral: [data.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0)],
            perdida: [data.perdida.reduce((acc, val) => acc + val, 0)]
        };

        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo

        return; // Terminar el proceso
    }

    // Si el archivo ya existe
    const contenido = fs.readFileSync(rutaArchivo, 'utf8'); // Leer el archivo
    const result = JSON.parse(contenido);

    if (result.dias.includes(data.fecha.substring(0, 2))) { // Si el día ya fué agregado
        indice = result.dias.indexOf(data.fecha.substring(0, 2)) // Obtener el índice del día
        
        // Editar los consumos acumulados según el índice
        result.consumo[indice] = data.consumo.reduce((acc, val) => acc + val, 0); 
        result.generacion[indice] = data.generacion.reduce((acc, val) => acc + val, 0);
        result.consumoSuministroGeneral[indice] = data.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0);
        result.perdida[indice] = data.perdida.reduce((acc, val) => acc + val, 0);
    } else { // Si el día no ha sido agregado, agregar los datos nuevos
        result.dias.push(data.fecha.substring(0, 2));
        result.consumo.push(data.consumo.reduce((acc, val) => acc + val, 0));
        result.generacion.push(data.generacion.reduce((acc, val) => acc + val, 0));
        result.consumoSuministroGeneral.push(data.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0));
        result.perdida.push(data.perdida.reduce((acc, val) => acc + val, 0));
    }

    fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
    console.log(`Dato guardado en ${rutaArchivo}`);

    agregarRegistro(semana, true);

    return;
}

function actualizarResumenMensual(data) {
    const rutaArchivo = path.join(__dirname, `data/${data.fecha.substring(3, 10)}/resumenMes.json`); // Obtener la dirección del archivo

    if (!fs.existsSync(rutaArchivo)) { // Si no existe, crearlo
        const result = {
            fecha: data.fecha.substring(3, 10),
            dias: [data.fecha.substring(0, 2)],
            consumo: [data.consumo.reduce((acc, val) => acc + val, 0)],
            generacion: [data.generacion.reduce((acc, val) => acc + val, 0)],
            consumoSuministroGeneral: [data.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0)],
            perdida: [data.perdida.reduce((acc, val) => acc + val, 0)]
        }

        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo

        return; // Terminar el proceso
    }

    // Si el archivo ya existe
    const contenido = fs.readFileSync(rutaArchivo, 'utf8'); // Leer el archivo
    const result = JSON.parse(contenido);

    if (result.dias.includes(data.fecha.substring(0, 2))) { // Si el día ya fué agregado
        indice = result.dias.indexOf(data.fecha.substring(0, 2)) // Obtener el índice del día
        
        // Editar los consumos acumulados según el índice
        result.consumo[indice] = data.consumo.reduce((acc, val) => acc + val, 0); 
        result.generacion[indice] = data.generacion.reduce((acc, val) => acc + val, 0);
        result.consumoSuministroGeneral[indice] = data.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0);
        result.perdida[indice] = data.perdida.reduce((acc, val) => acc + val, 0);
    } else { // Si el día no ha sido agregado, agregar los datos nuevos
        result.dias.push(data.fecha.substring(0, 2));
        result.consumo.push(data.consumo.reduce((acc, val) => acc + val, 0));
        result.generacion.push(data.generacion.reduce((acc, val) => acc + val, 0));
        result.consumoSuministroGeneral.push(data.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0));
        result.perdida.push(data.perdida.reduce((acc, val) => acc + val, 0));
    }

    fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
    console.log(`Dato guardado en ${rutaArchivo}`);

    return;
}

function agregarConsumo(data, in_order=true) { // Agregar o crear archivo de datos de consumo
    const dataDir = path.join(__dirname, `data/${data.fecha.substring(3, 10)}`); // Obtener el directorio del mes
    if (!fs.existsSync(dataDir)) { // Si el directorio del mes no existe, crearlo
        fs.mkdirSync(dataDir);
    }

    const nombreArchivo = `consumo-${data.fecha}.json`;
    const rutaArchivo = path.join(dataDir, nombreArchivo); // Obtener archivo de datos del día

    if (!fs.existsSync(rutaArchivo)) { // Si no existe, crearlo
        const result = { // Datos en JSON
            fecha: data.fecha,
            horas: [data.horaLocal],
            consumo: [data.consumo],
            generacion: [data.generacion],
            bateria: [data.bateria],
            consumoSuministroGeneral: [data.suministroGeneral],
            perdida: [data.perdida]
        };

        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
        console.log(`Dato guardado en ${rutaArchivo}`);

        agregarRegistro(data.fecha); // Agregar registro del día
        actualizarResumenSemanal(result); // Actualizar resumen semanal
        actualizarResumenMensual(result); // Actualizar resumen mensual

        return; // Terminar el proceso
    }

    // Si el archivo ya existe
    const contenido = fs.readFileSync(rutaArchivo, 'utf8'); // Leer el archivo
    result = JSON.parse(contenido);
 
    if(result.horas.at(-1) > data.horaLocal) { // si el registro es más viejo que el último registro
        return; // terminar sin agregarlo
    }

    // Agregar los datos nuevos a los ya existentes
    result.horas.push(data.horaLocal);
    result.consumo.push(data.consumo);
    result.generacion.push(data.generacion);
    result.bateria.push(data.bateria),
    result.consumoSuministroGeneral.push(data.suministroGeneral);
    result.perdida.push(data.perdida);

    fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
    console.log(`Dato guardado en ${rutaArchivo}`);

    agregarRegistro(data.fecha); // Agregar registro del día
    actualizarResumenSemanal(result); // Actualizar resumen semanal
    actualizarResumenMensual(result); // Actualizar resumen mensual

    return;
}

// Reemplaza la configuración actual de CORS con esta:
app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origin (como Postman, curl, o solicitudes del mismo servidor)
        if (!origin) {
            return callback(null, true);
        }

        try {
            // Obtener la información de red local
            const localNet = getLocalNetwork();
            if (!localNet) {
                return callback(new Error('No se pudo determinar la red local'));
            }

            // Extraer la IP del origin
            const url = new URL(origin);
            const originIP = url.hostname;

            // Verificar si la IP pertenece a la misma subnet
            const originSubnet = originIP.substring(0, originIP.lastIndexOf('.'));
            
            if (originSubnet === localNet.subnet || originIP === 'localhost' || originIP === '127.0.0.1') {
                callback(null, true);
            } else {
                console.log(`Solicitud bloqueada desde: ${originIP} (subnet: ${originSubnet})`);
                callback(new Error('Acceso denegado: IP no pertenece a la red local'));
            }
        } catch (error) {
            console.error('Error al verificar origin:', error);
            callback(error);
        }
    },
    credentials: true
}));

app.use(express.json()); // Cargar middleware para procesamiento de .JSON

app.get('/api/heartbeat', (req, res) => { // Función para verificar respuesta del servidor
    res.status(200).send();
});

app.get('/api/devices', async (req, res) => {
    try {
        console.log('Iniciando escaneo de red...');
        const result = await scanDevicesWithDetails();
        
        console.log(`Escaneo completado: ${result.totalDevices} dispositivos encontrados`);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error al escanear la red:', error.message);
        res.status(500).json({
            message: 'Error al escanear la red',
            error: error.message
        });
    }
});

// Endpoint para configurar el dispositivo seleccionado
app.post('/api/devices/select', (req, res) => {
    const { ip, mac, hostname, status } = req.body;
    
    // Validar que al menos tenga IP
    if (!ip) {
        return res.status(400).json({
            message: 'Falta el campo requerido: ip'
        });
    }
    
    // Guardar información del dispositivo
    selectedDevice = {
        ip: ip,
        mac: mac || 'Desconocido',
        hostname: hostname || 'Desconocido',
        status: status || 'unknown'
    };
    
    console.log(`Dispositivo seleccionado: ${selectedDevice.ip} (${selectedDevice.hostname})`);
    
    res.status(200).json({
        message: 'Dispositivo configurado exitosamente',
        device: selectedDevice
    });
});

// Endpoint para obtener el dispositivo seleccionado actual
app.get('/api/devices/selected', (req, res) => {
    if (!selectedDevice.ip) {
        return res.status(404).json({
            message: 'No hay dispositivo seleccionado'
        });
    }
    
    res.status(200).json({
        device: selectedDevice
    });
});

app.get('/api/:fecha', (req, res) => { // Función para obtener los datos de consumo de una fecha específica
    const mes = req.params.fecha.substring(3, 10);
    const fileDir = path.join(__dirname, `data/${mes}/consumo-${req.params.fecha}.json`); // Buscar el archivo correspondiente a la fecha
    if (!fs.existsSync(fileDir)) { // Si no existe responder con error
        res.status(400).json({message: 'Fecha no encontrada'});
    }

    const content = fs.readFileSync(fileDir, 'utf8'); // Cargar el archivo y enviarlo como respuesta
    result = JSON.parse(content);
    res.status(200).json(result);
});

app.get('/api/semanal/:fecha', (req, res) => {
    // Obtener fecha de los datos
    const[dia, mes, año] = req.params.fecha.split('-');
    const fecha = new Date(año, mes-1, dia);

    // Obetener semana de los datos
    const diaSemana = (fecha.getDay() + 6) % 7; // Obtener día de la semana [0-6], 0: Lunes, 6: Domingo
    const inicioSemana = new Date(fecha);
    inicioSemana.setDate(fecha.getDate() - diaSemana); // Obtener fecha del lunes de la semana corresopondiente

    // Formatear fecha a string
    const diaInicio = String(inicioSemana.getDate()).padStart(2, '0');
    const mesInicio = String(inicioSemana.getMonth() + 1).padStart(2, '0');
    const añoInicio = inicioSemana.getFullYear();
    const semana = `${diaInicio}-${mesInicio}-${añoInicio}`;

    const rutaArchivo = path.join(__dirname, `data/${req.params.fecha.substring(3, 10)}/resumenSemana-${semana}.json`); // Obtener la dirección del archivo
    if (!fs.existsSync(rutaArchivo)) { // Si no existe responder con error
        res.status(400).json({message: 'Resumen semanal no encontrado'});
    }

    const content = fs.readFileSync(rutaArchivo, 'utf8'); // Cargar el archivo y enviarlo como respuesta
    result = JSON.parse(content);
    res.status(200).json(result);
})

app.get('/api/mensual/:fecha', (req, res) => {
    // Obtener fecha de los datos
    const[dia, mes, año] = req.params.fecha.split('-');

    const rutaArchivo = path.join(__dirname, `data/${req.params.fecha.substring(3, 10)}/resumenMes.json`); // Obtener la dirección del archivo
    if (!fs.existsSync(rutaArchivo)) { // Si no existe responder con error
        res.status(400).json({message: 'Resumen semanal no encontrado'});
    }

    const content = fs.readFileSync(rutaArchivo, 'utf8'); // Cargar el archivo y enviarlo como respuesta
    result = JSON.parse(content);
    res.status(200).json(result);
})

app.get('/api/registro/diario/:fecha', (req, res) => {
    const rutaArchivo = path.join(__dirname, "data/registro.json"); // Obtener la dirección del archivo
    if (!fs.existsSync(rutaArchivo)) { // Si no existe responder con error
        res.status(400).json({message: 'Resumen semanal no encontrado'});
    }
    const content = fs.readFileSync(rutaArchivo, 'utf8'); // Cargar el archivo y enviarlo como respuesta
    const result = JSON.parse(content);

    const dias = result[req.params.fecha.substring(3,10)].dias;
    const diasConFecha = dias.map(dia => `${dia}-${req.params.fecha.substring(3,10)}`);
    res.status(200).json({response: diasConFecha});
});

app.post('/api', (req, res) => { // Función para agregar datos de consumo
    const required = ['registros', 'intervalo']; // Verificar que la request tenga los campos requeridos
    const missing = required.filter(elem => req.body[elem] === undefined || req.body[elem] === null);
    
    if(missing.length > 0) { // Si falta algún campo responder con error y notificar
        return res.status(400).json({
            message: 'Faltan datos',
            camposFaltantes: missing
        });
    }

    let nuevos_registros = []; // array donde almacenar los registros creados
    const ahora = new Date(); // obtener hora de llegada de la respuesta
    let intervalo_total = req.body.intervalo; // variable donde sumar el intervalo de creación de registros


    for(let registro of req.body.registros) { // iterar a través de los registros de más nuevo a más antiguo
        const required = ['consumo', 'generacion', 'bateria', 'suministroGeneral', 'perdida', 'intervalo']; // Verificar que la request tenga los campos requeridos
        const missing = required.filter(elem => registro[elem] === undefined || registro[elem] === null);
        
        if(missing.length > 0) { // Si falta algún campo responder con error y notificar
            return res.status(400).json({
                message: 'Faltan datos',
                camposFaltantes: missing
            });
        }

        let hora_registro = new Date(ahora.getTime() - intervalo_total * 1000)

        const dato = { // Formato de datos pre procesamiento
            horaLocal: hora_registro.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }),
            fecha: hora_registro.toLocaleDateString('es-CL'),
            consumo: registro.consumo,
            generacion: registro.generacion,
            bateria: registro.bateria,
            suministroGeneral: registro.suministroGeneral,
            perdida: registro.perdida
        };
        intervalo_total += registro.intervalo;

        nuevos_registros.unshift(dato);
    }

    for(let nuevo_registro of nuevos_registros) { // iterar a través de los registros de más antiguo a más nuevo
        agregarConsumo(nuevo_registro);
    }

    res.status(201).send();
});

app.listen(PORT, '0.0.0.0', () => {
    const localNet = getLocalNetwork();
    const ip = localNet ? localNet.ip : 'IP no detectada';
    
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`Accesible desde la red en http://${ip}:${PORT}`);
    
    if (localNet) {
        console.log(`Interfaz de red: ${localNet.interface}`);
        console.log(`Subnet detectada: ${localNet.subnet}.0/24`);
    }
});