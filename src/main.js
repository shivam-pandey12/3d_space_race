import './styles.css';
import { Game } from './game/Game.js';

const app = document.querySelector('#app');
const game = new Game(app);

game.start();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });

  import.meta.hot.dispose(() => {
    game.dispose();
  });
}
