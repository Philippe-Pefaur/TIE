import './App.css';
import Diario from './vistas/Diario';
import Semanal from './vistas/Semanal';
import Mensual from './vistas/Mensual';
import Navbar from './nav/Navbar';
import Sidebar from './nav/Sidebar';
import { useReducer, createContext } from 'react';

export const ContextVistaPrincipal = createContext();

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

/*
La App es una grilla de tres contenedores cada uno con una vista,
la Navbar (barra superior), Sidebar y VistaPrincipal. La Sidebar 
permite seleccionar cuál de las vistas de métrica se desean mostrar,
esta vista es luego pasada a la variable VistaPrincipal, cargandose
así en la página
*/

function App() {
    const [VistaPrincipal, dispatch] = useReducer(reducerVista, Diario); // Variable de vista principal

    return (
        <ContextVistaPrincipal.Provider value={{VistaPrincipal, dispatch}}>
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
        </ContextVistaPrincipal.Provider>
        
    );
}

export default App;
