import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { AddMenderPage } from './pages/AddMenderPage';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="mymenders-textile-surface min-h-screen bg-backdrop flex flex-col mymenders-body-font">
        <Routes>
          <Route path="/admin/menders/:id" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/*" element={<PublicApp />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function PublicApp() {
  return <>
    <Navbar />
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="add" element={<AddMenderPage />} />
      <Route path="about" element={<AboutPage />} />
    </Routes>
  </>;
}
