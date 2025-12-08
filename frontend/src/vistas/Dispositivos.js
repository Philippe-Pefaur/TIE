import { useEffect } from 'react';
import './Dispositivos.css';
import { ContextDispositivos } from '../App';
import { useState } from 'react';
import { useContext } from 'react';

const datosArduino = {
  "registros": [
      {
        "consumo": 10,
        "generacion": 8,
        "bateria": 70,
        "suministroGeneral": 2,
        "perdida": 0,
        "intervalo": 600
      },
      {
        "consumo": 12,
        "generacion": 8,
        "bateria": 68,
        "suministroGeneral": 4,
        "perdida": 0,
        "intervalo": 600
      },
      {
        "consumo": 11,
        "generacion": 8,
        "bateria": 66,
        "suministroGeneral": 3,
        "perdida": 0,
        "intervalo": 600
      }
    ],
    "intervalo": 300
};

async function obtenerListaDispositivos() {
    try {
        const response = await fetch('http://localhost:5000/api/devices');
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.devices; // Retorna el arreglo de dispositivos
    } catch (error) {
        console.error('Error al obtener lista de dispositivos:', error);
        return false;
    }
}

async function conectar(dispositivo) {
    try {
        const response = await fetch('http://localhost:5000/api/devices/select', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dispositivo)
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dispositivo seleccionado:', data);
        return true;
    } catch (error) {
        console.error('Error al conectar dispositivo:', error);
        return false;
    }
}

function Dispositivos() {
    const {dispatchDispositivo} = useContext(ContextDispositivos)
    const [listaDispositivos, setListaDispositivos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoDatos, setCargandoDatos] = useState(false);

    async function setup() {
        setCargando(true);
        const lista = await obtenerListaDispositivos();
        if(lista) {
            setListaDispositivos(lista);
        }
        setCargando(false);
    }

    async function conectarCargar(dispositivo) {
        if (conectar(dispositivo)) {
            sessionStorage.setItem('dispositivo', JSON.stringify(dispositivo));
            dispatchDispositivo({type: 'setDispositivo', payload: dispositivo});
            try {
                setCargandoDatos(true);
                // Enviar datos al backend
                const response = await fetch('http://localhost:5000/api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(datosArduino)
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.status} - ${response.statusText}`);
                } else {
                    window.location.reload();
                }

            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
                dispatchDispositivo({type: 'view', payload: false});
            }
        }
    }

    useEffect(() => {
        setup();
    }, []);

    return(
        <div className='Dispositivos-start'>
            <div className='Dispositivos-header'>
                <h2 className='Dispositivos-title'>Dispositivos Disponibles</h2>
                <button className='Dispositivos-cerrar' onClick={() => dispatchDispositivo({type: 'view', payload: false})}>
                    ✕
                </button>
            </div>
            {cargando ? (
                <div className='Dispositivos-cargando'>
                    <div className='Dispositivos-spinner'></div>
                    <p className='Dispositivos-cargandoTexto'>Buscando dispositivos...</p>
                </div>
            ) : cargandoDatos ? (
                <div className='Dispositivos-cargando'>
                    <div className='Dispositivos-spinner'></div>
                    <p className='Dispositivos-cargandoTexto'>Recuperando datos del dispositivo...</p>
                </div>
            ) : (
                <ul className='Dispositivos-lista'>
                    {listaDispositivos.map((dispositivo, index) => (
                        <li className='Dispositivos-item' key={index}>
                            <button className='Dispositivos-listaBoton' onClick={() => conectarCargar(dispositivo)}>
                                <h3 className='Dispositivos-listNombre'>{dispositivo.hostname}</h3>
                                <div className='Dispositivos-listaDiv'>
                                    <p className='Dispositivos-listaDesc'>{dispositivo.ip}</p>
                                    <p className='Dispositivos-listaDesc'>{dispositivo.mac}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Dispositivos;