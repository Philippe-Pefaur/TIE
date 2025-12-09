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
import { useReducer, useState } from 'react';
import { useEffect } from 'react';

ChartJS.register( // Cargar librerías importadas para gráficos de línea
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

async function obtenerDatosDiario(argFecha = undefined) { // Función para obtener datos de consumo diarios
    try {
        let fecha;
        if(argFecha === undefined){
            const ahora = new Date(); // utiliza la fecha actual para seleccionar el día
            fecha = ahora.toLocaleDateString('es-CL'); // Formato: dd-mm-yyyy
        } else{
            fecha = argFecha;
        }

        const response = await fetch(`http://localhost:5000/api/${fecha}`); // Pedir datos a la API

        if (!response.ok) { // Si no se recibe respuesta arrojar error
            throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json(); // Procesar los datos como .JSON y retornarlo
        return data;

    } catch (error) { // Notificar el error y retornar NULL
        console.error('Error al obtener los datos:', error);
        return null;
    }
}

function Diario() { // Función que crea las variables con los datos y configuración de los gráficos
    const [dias, setDias] = useState([]); // *

    // Varaibles de plantilla donde almacenar los datos para los gráficos
    // *
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

    // *
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
    
    // Variable para guardar datos de consumo acumulado durante el día*
    const [data, setData] = useState({ 
        consumoTotal: 0,
        consumoSuministroGeneralTotal: 0,
        generacionTotal: 0,
        perdidaTotal: 0
    });

    function reducerFecha(state, action) {
        switch(action.type) {
            case "start":
                const ahora = new Date(); // utiliza la fecha actual para seleccionar el día
                const fecha = ahora.toLocaleDateString('es-CL'); // Formato: dd-mm-yyyy
                return fecha; 
            case "setFecha":
                const [dia, mes, año] = action.task.split('-');
                const nuevaFecha = new Date(año, mes - 1, dia);
                return nuevaFecha.toLocaleDateString('es-CL');
            default:
                return state;
        }
    };

    const [fechaDatos, dispatchFecha] = useReducer(reducerFecha, ""); // Variable de vista principal

    const cargarDatos = async (argFecha = undefined) => {  // Función a ejecutar
        const datos = await obtenerDatosDiario(argFecha); // Obtener datos de la API
        if (datos) { // Si la respuesta no es NULL
            // Crear objetos con los datos de los gráficos
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

            // Pasar los objetos a las variables de plantilla
            setLineConsumo(templateConsumo);
            setLineBateria(templateBateria);
            setLinePerdida(templatePerdida);

            // Calcular consumos acumulados y guardarlos
            setData((current) => {
                current.consumoTotal = datos.consumo.reduce((acc, val) => acc + val, 0);
                current.consumoSuministroGeneralTotal = datos.consumoSuministroGeneral.reduce((acc, val) => acc + val, 0);
                current.generacionTotal = datos.generacion.reduce((acc, val) => acc + val, 0);
                current.perdidaTotal = datos.perdida.reduce((acc, val) => acc + val, 0);
                return current;
            })  
        }
    };

    // Cambia el valor de la fecha a la actual
    useEffect(() => {
        dispatchFecha({type: "start"});
    }, []);

    // Efecto a ser ejecutado cuando se modifica la fecha
    useEffect(() => { // Obtener y procesar datos de consumo
        cargarDatos(fechaDatos);
    }, [fechaDatos]);

    // Se ejecuta al partir y obtiene los días disponibles
    useEffect(() => {
        const cargarDias = async () => {
            try {
                const ahora = new Date();
                const fecha = ahora.toLocaleDateString('es-CL'); // Formato: dd-mm-yyyy

                const response = await fetch(`http://localhost:5000/api/registro/diario/${fecha}`);

                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                
                const datos = await response.json();
                setDias(datos.response); // O datos.response según tu API

            } catch (error) {
                console.error('Error al obtener los días:', error);
            }
        };

        cargarDias();
    }, []);

    // Variables de plantilla de configuraciones de los gráficos

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
            <select className='Diario-selector' onChange={(opcion) => dispatchFecha({type: "setFecha", task: opcion.target.value})}>
                <option disabled selected>
                    Automático: {fechaDatos}
                </option>
                {dias.map((fecha, index) => (
                    <option className='Diario-opcion' key={index} value={fecha}>
                        {fecha}
                    </option>
                ))}
            </select>
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