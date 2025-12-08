import './Navbar.css';
import '../vistas/Dispositivos'
import { ContextDispositivos } from '../App';
import { useContext, useState, useEffect } from 'react';

function Navbar() {
    const {configDispositivo, dispatchDispositivo} = useContext(ContextDispositivos);
    const [buttonPressed, setButtonPressed] = useState(false);
    const [nombreDispositivo, setNombreDispositivo] = useState(null);

    useEffect(() => {
        if(configDispositivo.dispositivo) {
            setNombreDispositivo(configDispositivo.dispositivo.hostname);
        } else {
            setNombreDispositivo('Conectar dispositivo');
        }
    }, [configDispositivo]);

    const handleClick = () => {
        dispatchDispositivo({type: 'view'});
        setButtonPressed(!buttonPressed);
    };

    return (
        <nav className='navbar'>
            <div className='nav-Main'>
                <h1 className='ms-3'>Monitoreo Eléctrico</h1>
                <button className='nav-Dispositivo' onClick={handleClick}>
                    <svg className='nav-Dispositivo-flecha' viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span>{nombreDispositivo ? nombreDispositivo : 'Conectar Dispositivo'}</span>
                </button>
            </div>
        </nav>
    );
}

export default Navbar;