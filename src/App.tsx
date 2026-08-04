import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { AddMenderModal } from './components/AddMenderModal';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { Vendor } from './types';

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
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddMender = async (newMenderData: Omit<Vendor, 'id'>) => {
    try {
      const res = await fetch(`${window.location.origin}/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMenderData),
      });
      await res.json();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add vendor:', err);
    }
  };

  return <>
    <Navbar onAddMender={() => setShowAddModal(true)} />
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="about" element={<AboutPage />} />
    </Routes>
    {showAddModal && (
      <AddMenderModal
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMender}
      />
    )}
  </>;
}
