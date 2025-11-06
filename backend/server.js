const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

function agregarConsumo(data) {
    const dataDir = path.join(__dirname, `data/${data.fecha.substring(3, 10)}`);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    const nombreArchivo = `consumo-${data.fecha}.json`;
    const rutaArchivo = path.join(dataDir, nombreArchivo);

    if (!fs.existsSync(rutaArchivo)) {
        result = {
            fecha: data.fecha,
            horas: [data.horaLocal],
            consumo: [data.consumo],
            generacion: [data.generacion],
            bateria: [data.bateria],
            consumoSuministroGeneral: [data.suministroGeneral],
            perdida: [data.perdida]
        };

        fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2));
        console.log(`Dato guardado en ${rutaArchivo}`);

        return;
    }

    const contenido = fs.readFileSync(rutaArchivo, 'utf8');
    result = JSON.parse(contenido);

    result.horas.push(data.horaLocal);
    result.consumo.push(data.consumo);
    result.generacion.push(data.generacion);
    result.bateria.push(data.bateria),
    result.consumoSuministroGeneral.push(data.suministroGeneral);
    result.perdida.push(data.perdida);

    fs.writeFileSync(rutaArchivo, JSON.stringify(result, null, 2));
    console.log(`Dato guardado en ${rutaArchivo}`);
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