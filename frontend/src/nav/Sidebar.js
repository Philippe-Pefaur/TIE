import { ContextVistaPrincipal } from '../App';
import { useContext, useState } from 'react';
import './Sidebar.css';

function Sidebar() {
    const {vistaPrincipal, dispatch} = useContext(ContextVistaPrincipal); // Contexto de cuál vista está mostrandose actualmente
    const [botonActivo, setBotonActivo] = useState('Diario'); // Variable para rastrear cuál botón está activo

    const click = (vista) => { // Al hacer click en un botón cambiar a la vista correspondiente y guardarlo como botón activo
        setBotonActivo(vista);
        dispatch({type: vista});
    };

    return ( // Se utilizan operadores ? : para saber si el botón está activo o no, al comparar la variable botonActivo con el nombre de la vista correspondiente
        <div className="sidebar bg-light"> 
            <ul className="nav flex-column">
                <li>
                    <div className='side-title'>
                        <h3>Resumen:</h3>
                    </div>
                </li>
                <li className="nav-item">
                    <button className={`btn side-ItemBtn ${botonActivo === 'Diario' ? 'presionado' : ''}`} onClick={() => click('Diario')}>
                        <h4>Diario</h4>
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`btn side-ItemBtn ${botonActivo === 'Semanal' ? 'presionado' : ''}`} onClick={() => click('Semanal')}>
                        <h4>Semanal</h4>
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`btn side-ItemBtn ${botonActivo === 'Mensual' ? 'presionado' : ''}`} onClick={() => click('Mensual')}>
                        <h4>Mensual</h4>
                    </button>
                </li>
            </ul>
        </div>
    );
}

export default Sidebar;