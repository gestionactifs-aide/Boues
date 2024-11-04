// src/App.js
import React from 'react';
import MapComponent from './MapComponent';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="Banner-container">
        <div className="Top-banner">
          <div className="Banner-left">Rue de la Digue, 25 B-4420 Saint-Nicolas - Belgique</div>
          <div className="Banner-right">+32 (0)4 234 96 96 &nbsp;&nbsp; aide@aide.be</div>
        </div>
      </div>
      <header className="App-header">
        <div className="Logo-container">
          <img src={`${process.env.PUBLIC_URL}/AIDE_10mm.png`} alt="Logo AIDE" className="App-logo" />
        </div>
        <div className="Title-container">
          <h1 className="App-title">
            Association intercommunale pour le démergement <br /> et l'épuration des communes de la province de Liège
          </h1>
        </div>
      </header>
      <div className="Image-container">
        <img src={`${process.env.PUBLIC_URL}/SE_Sclessin.png`} alt="SE Sclessin" className="Map-image" />
      </div>
      <div className="Project-container">
        <h2 className="Project-title">Stations d'épuration - Transport de boues</h2>
      </div>
      <div className="Map-container">
        <MapComponent />
      </div>
    </div>
  );
}

export default App;
