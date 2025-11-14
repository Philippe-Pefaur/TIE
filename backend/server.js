const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

function agregarRegistro(fecha) { // Agrega un día al registro liviano
    const rutaArchivo = path.join(__dirname, 'data/registro.json');
    const dia = fecha.substring(0,2);

    if (!fs.existsSync(rutaArchivo)) { // Si no existe el archivo de registros, crearlo
        result = { // Registro en JSON
            [fecha.substring(3,10)]: [dia] // Clave: Mes, Valor: Día
        };

        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
        console.log(`Dato guardado en ${rutaArchivo}`);

        return; // Terminar el proceso
    }

    // Si el archivo ya existe, agregar registro
    const contenido = fs.readFileSync(rutaArchivo, 'utf8'); // Leer el archivo
    result = JSON.parse(contenido);

    if (!result[fecha.substring(3,10)]) { // Si no existe un registro para el mes
        result[fecha.substring(3,10)] = [dia];  // Crear la clave del mes y agregar el día

        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2)); // Escribir el archivo
        console.log(`Dato guardado en ${rutaArchivo}`);

        return;
    }
    
    // Si ya hay registros para el mes
    if (!result[fecha.substring(3,10)].includes(dia)) { // Sólo si el día no esta registrado, agregarlo
        result[fecha.substring(3,10)].push(dia);
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
        result = { // Datos en JSON
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

    return;
}

app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(express.json());

app.get('/api/heartbeat', (req, res) => {
    res.status(200).send();
});

app.get('/api/:date', (req, res) => {
    const month = req.params.date.substring(3, 10);
    const fileDir = path.join(__dirname, `data/${month}/consumo-${req.params.date}.json`);
    if (!fs.existsSync(fileDir)) {
        res.status(400).json({message: 'Fecha no encontrada'});
    }

    const content = fs.readFileSync(fileDir, 'utf8');
    result = JSON.parse(content);
    res.status(200).json(result);
})

app.post('/api', (req, res) => {
    const required = ['consumo', 'generacion', 'bateria', 'suministroGeneral', 'perdida'];
    const missing = required.filter(elem => req.body[elem] === undefined || req.body[elem] === null);
    
    if(missing.length > 0) {
        return res.status(400).json({
            message: 'Faltan datos',
            camposFaltantes: missing
        });
    }

    const ahora = new Date();
    const dato = {
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

    agregarConsumo(dato);

    res.status(201).json(dato);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});