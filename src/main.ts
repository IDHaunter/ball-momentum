import { GameApplication } from './app/GameApplication';
import './styles/main.css';

const gameContainer = document.getElementById('game-container');
const uiRoot = document.getElementById('ui-root');

if (!gameContainer || !uiRoot) throw new Error('Required application containers are missing from index.html.');

const application = new GameApplication(gameContainer, uiRoot);
window.addEventListener('beforeunload', () => application.destroy(), { once: true });
