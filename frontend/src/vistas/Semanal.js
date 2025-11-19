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

function Semanal() {
    return(
        <div>
            <Line />
            <h1>SEMANAL</h1>
        </div>
    );
}

export default Semanal;