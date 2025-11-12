import './App.css';
import Diario from './vistas/Diario';
import Semanal from './vistas/Semanal';
import Mensual from './vistas/Mensual';
import Navbar from './nav/Navbar';
import Sidebar from './nav/Sidebar';
import { useReducer, createContext } from 'react';

export const ContextVistaPrincipal = createContext();

function reducerVista(state, action) {
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

function App() {
    const [VistaPrincipal, dispatch] = useReducer(reducerVista, Diario);

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
