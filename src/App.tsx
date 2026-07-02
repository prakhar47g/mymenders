import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { MapPage } from './pages/MapPage';
import { AboutPage } from './pages/AboutPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="mymenders-textile-surface min-h-screen bg-backdrop flex flex-col mymenders-body-font">
        <Navbar />
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
