import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './Medidores.css';
import { useState } from 'react';
import { useEffect } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

async function getTodayData() {
    try {
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-CL'); // Formato: dd-mm-yyyy
        
        console.log(`http://localhost:5000/api/${fecha}`);

        const response = await fetch(`http://localhost:5000/api/${fecha}`);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        return null;
    }
}

function Medidores() {
    const [lineConsumo, setLineConsumo] = useState({
        labels: [],
        datasets: [
            {
                label: 'Consumo acumulado (kWh)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }
        ]
    });

    const [lineBateria, setLineBateria] = useState({
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        datasets: [
            {
                label: 'Carga de batería (%)',
                data: [20, 15, 5, 40, 90, 70, 40],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1
            }
        ]
    });
    
    const [data, setData] = useState({
        consumoTotal: 0,
        consumoSuministroGeneralTotal: 0,
        generacionTotal: 0,
        perdidaTotal: 0
    })

    useEffect(() => {
        const cargarDatos = async () => {
            const datos = await getTodayData();
            console.log(datos);
            if (datos) {
                const template = {
                    labels: datos.horas,
                    datasets: [
                        {
                            label: 'Consumo acumulado (kWh)',
                            data: datos.consumo,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.1
                        }
                    ]
                }
                setLineConsumo(template);
                setData((current) => {
                    current.consumoTotal = datos.consumo.reduce((acc, val) => acc + val, 0);
                    current.consumoSuministroGeneralTotal = datos.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0);
                    current.generacionTotal = datos.generacion.reduce((acc, val) => acc + val, 0);
                    current.perdidaTotal = datos.perdida.reduce((acc, val) => acc + val, 0);
                    return current;
                })  
            }
        };
        
        cargarDatos();
    }, [])

    const opcionesBateria = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            min: 0,
            max: 100
        }
    }
    };

    const opcionesConsumo = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
        }
    },
    scales: {
        y: {
            beginAtZero: true,
        }
    }
    };

    return(
        <div className='Medidores-start'>
            <h3>Hoydía</h3>
            <div className='counter-desc'>
                <p>Eergía generada: {data.generacionTotal} MWh</p>
                <p>Consumo suministro general: {data.consumoSuministroGeneralTotal} MWh</p>
                <p>Eergía perdida: {data.perdidaTotal} MWh</p>
            </div>
            <div className='flow-chart'>
                <p>Consumo acumulado durante el día:</p>
                <Line data={lineConsumo} options={opcionesConsumo} />
            </div>
            <div className='flow-chart'>
                <p>Carga de la batería durante el día:</p>
                <Line data={lineBateria} options={opcionesBateria} />
            </div>

        </div>
    )
}

export default Medidores;