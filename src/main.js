import './styles.css';
import { Game } from './game/Game.js';
import { renderLegalRoute } from './game/LegalPages.js';

const app = document.querySelector('#app');
const legalRouteRendered = renderLegalRoute(app);

if (!legalRouteRendered) {
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
} else if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
