import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './Diario.css';
import { useState } from 'react';
import { useEffect } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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

function Diario() {
    const [lineConsumo, setLineConsumo] = useState({
        labels: [],
        datasets: [
            {
                label: 'Consumo total (kWh)',
                data: [],
                borderColor: 'rgba(242, 232, 94, 1)',
                backgroundColor: 'rgba(193, 177, 76, 0.2)',
                tension: 0.1
            }
        ]
    });

    const [lineBateria, setLineBateria] = useState({
        labels: [],
        datasets: [
            {
                label: 'Carga de batería (%)',
                data: [],
                borderColor: 'rgba(242, 232, 94, 1)',
                backgroundColor: 'rgba(193, 177, 76, 0.2)',
                tension: 0.1
            }
        ]
    });

    const [linePerdida, setLinePerdida] = useState({
        labels: [],
        datasets: [
            {
                label: 'Pérdidas de energía generada (kWh)',
                data: [],
                borderColor: 'rgba(209, 69, 69, 1)',
                backgroundColor: 'rgba(192, 106, 75, 0.2)',
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
                const templateConsumo = {
                    labels: datos.horas,
                    datasets: [
                        {
                            label: 'Consumo total (kWh)',
                            data: datos.consumo,
                            borderColor: 'rgba(242, 232, 94, 1)',
                            backgroundColor: 'rgba(193, 177, 76, 0.2)',
                            tension: 0.1,
                            fill: true
                        },
                        {
                            label: 'Consumo suministro general (kWh)',
                            data: datos.consumoSuministroGeneral,
                            borderColor: 'rgba(209, 69, 69, 1)',
                            backgroundColor: 'rgba(192, 106, 75, 0.2)',
                            tension: 0.1,
                            hidden: true,
                            fill: true
                        },
                        {
                            label: 'Consumo energía generada (kWh)',
                            data: datos.generacion,
                            borderColor: 'rgba(69, 209, 127, 1)',
                            backgroundColor: 'rgba(75, 192, 127, 0.2)',
                            tension: 0.1,
                            hidden: true,
                            fill: true
                        }
                    ]
                };
                const templateBateria = {
                    labels: datos.horas,
                    datasets: [
                        {
                            label: 'Carga batería (%)',
                            data: datos.bateria,
                            borderColor: 'rgba(242, 232, 94, 1)',
                            backgroundColor: 'rgba(193, 177, 76, 0.2)',
                            tension: 0.1,
                            fill: true
                        }
                    ]
                };
                const templatePerdida = {
                    labels: datos.horas,
                    datasets: [
                        {
                            label: 'Pérdidas de energía generada (kWh)',
                            data: datos.perdida,
                            borderColor: 'rgba(209, 69, 69, 1)',
                            backgroundColor: 'rgba(192, 106, 75, 0.2)',
                            tension: 0.1,
                            fill: true
                        }
                    ]
                };
                setLineConsumo(templateConsumo);
                setLineBateria(templateBateria);
                setLinePerdida(templatePerdida);
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
                labels: {
                    color: '#e1e1e1'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#e1e1e1'
                },
                grid: {
                    color: '#f0f0f01a'
                }
            },
            y: {
                beginAtZero: true,
                min: 0,
                max: 100,
                ticks: {
                    color: '#e1e1e1'
                },
                grid: {
                    color: '#f0f0f01a'
                }
            }
        }
    };

    const opcionesConsumo = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#e1e1e1'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#e1e1e1'
                },
                grid: {
                    color: '#f0f0f01a'
                }
            },
            y: {
                beginAtZero: true,
                min: 0,
                max: Math.max(...lineConsumo.datasets[0].data) + 2,
                ticks: {
                    color: '#e1e1e1'
                },
                grid: {
                    color: '#f0f0f01a'
                }
            }
        }
    };

    const opcionesPerdida = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#e1e1e1'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#e1e1e1'
                },
                grid: {
                    color: '#f0f0f01a'
                }
            },
            y: {
                beginAtZero: true,
                min: 0,
                max: Math.max(linePerdida.datasets[0].data) + 2,
                ticks: {
                    color: '#e1e1e1'
                },
                grid: {
                    color: '#f0f0f01a'
                }
            }
        }
    };

    return(
        <div className='Diario-start'>
            <div className='counter-desc'>
                <h3>Energía generada: {data.generacionTotal} MWh</h3>
                <h3>Consumo suministro general: {data.consumoSuministroGeneralTotal} MWh</h3>
                <h3>Energía perdida: {data.perdidaTotal} MWh</h3>
            </div>
            <div className='flow-chart mb-5'>
                <h3>Consumo acumulado durante el día:</h3>
                <Line data={lineConsumo} options={opcionesConsumo} />
            </div>
            <div className='flow-chart mb-5'>
                <h3>Carga de la batería durante el día:</h3>
                <Line data={lineBateria} options={opcionesBateria} />
            </div>
            <div className='flow-chart mb-5'>
                <h3>Pérdidas de energía generada durante el día:</h3>
                <Line data={linePerdida} options={opcionesPerdida} />
            </div>
        </div>
    )
}

export default Diario;