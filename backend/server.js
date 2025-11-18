const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

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

function agregarConsumo(data) { // Agregar o crear archivo de datos de consumo
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

app.use(cors({ // Dar permiso de conexión a nivel local
    origin: 'http://localhost:3000'
}));
app.use(express.json()); // Cargar middleware para procesamiento de .JSON

app.get('/api/heartbeat', (req, res) => { // Función para verificar respuesta del servidor
    res.status(200).send();
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

app.post('/api', (req, res) => { // Función para agregar datos de consumo
    const required = ['consumo', 'generacion', 'bateria', 'suministroGeneral', 'perdida']; // Verificar que la request tenga los campos requeridos
    const missing = required.filter(elem => req.body[elem] === undefined || req.body[elem] === null);
    
    if(missing.length > 0) { // Si falta algún campo responder con error y notificar
        return res.status(400).json({
            message: 'Faltan datos',
            camposFaltantes: missing
        });
    }

    const ahora = new Date(); // Obtener la fecha y hora en la que se realiza el registro
    const dato = { // Formato de datos pre procesamiento
        horaLocal: ahora.toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }),
        fecha: ahora.toLocaleDateString('es-CL'),
        consumo: req.body.consumo,
        generacion: req.body.generacion,
        bateria: req.body.bateria,
        suministroGeneral: req.body.suministroGeneral,
        perdida: req.body.perdida
    };

    agregarConsumo(dato); // Crear archivo de datos de consumo

    res.status(201).json(dato); // Responder con éxito
});

app.listen(PORT, () => { // Ejecutar la API en el puerto correspondiente
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});