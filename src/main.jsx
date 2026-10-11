import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';

/**
 * Not wrapped in StrictMode: it mounts every effect twice in development,
 * which would build a second WebGL renderer and a second render loop on the
 * same canvas. The engine is a single long-lived imperative object, so it is
 * mounted once - see app/App.jsx.
 */
createRoot(document.getElementById('root')).render(<App />);
