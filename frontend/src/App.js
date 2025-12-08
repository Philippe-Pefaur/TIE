import './App.css';
import Diario from './vistas/Diario';
import Semanal from './vistas/Semanal';
import Mensual from './vistas/Mensual';
import Navbar from './nav/Navbar';
import Sidebar from './nav/Sidebar';
import Dispositivos from './vistas/Dispositivos';
import { useReducer, createContext } from 'react';
import { useEffect } from 'react';

export const ContextVistaPrincipal = createContext();
export const ContextDispositivos = createContext();

function reducerVista(state, action) { // Función para editar variable de vista principal
    switch(action.type) {
        case 'Diario':
            return Diario;
        case 'Semanal':
            return Semanal;
        case 'Mensual':
            return Mensual;
        default:
            return state;
  }
}

function reducerDispositivo(state, action) {
    switch(action.type) {
        case 'conectado':
            return { ...state, conectado: true };
        case 'desconectado':
            return { ...state, conectado: false };
        case 'setDispositivo':
            return { ...state, dispositivo: action.payload };
        case 'view':
            return { ...state, view: !state.view };
        default:
            console.log('default');
            return state;
    }
}

/*
La App es una grilla de tres contenedores cada uno con una vista,
la Navbar (barra superior), Sidebar y VistaPrincipal. La Sidebar 
permite seleccionar cuál de las vistas de métrica se desean mostrar,
esta vista es luego pasada a la variable VistaPrincipal, cargandose
así en la página
*/

function App() {
    const [VistaPrincipal, dispatch] = useReducer(reducerVista, Diario); // Variable de vista principal
    const [configDispositivo, dispatchDispositivo] = useReducer(reducerDispositivo, { conectado: false, dispositivo: null, view: false });

    useEffect(() => {
        if(sessionStorage.getItem('dispositivo')) {
            dispatchDispositivo({type: 'setDispositivo', payload: JSON.parse(sessionStorage.getItem('dispositivo'))});
        }
    }, []);

    return (
        <ContextVistaPrincipal.Provider value={{VistaPrincipal, dispatch}}>
        <ContextDispositivos.Provider value={{configDispositivo, dispatchDispositivo}}>
            <div className='appContainer'>
                <div className='navBar'>
                    <Navbar />
                </div>
                <div className='sideBar'>
                    <Sidebar />
                </div>
                <div className='mainView'>
                    <VistaPrincipal />
                </div>
            </div>
            {configDispositivo.view && <Dispositivos/>}
        </ContextDispositivos.Provider>
        </ContextVistaPrincipal.Provider>
    );
}

export default App;
