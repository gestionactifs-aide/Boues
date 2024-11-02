import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = () => {
  const [secteurData, setSecteurData] = useState([]);

  useEffect(() => {
    fetch('/AIDE_Secteur.json')
      .then(response => response.json())
      .then(data => setSecteurData(data));
  }, []);

  const center = [50.5, 5.5];

  return (
    <MapContainer center={center} zoom={8} style={{ height: "800px", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {secteurData.map((secteur, index) => (
        <Polygon
          key={index}
          positions={secteur.polygone}
          color={secteur.color}
        />
      ))}
    </MapContainer>
  );
};

export default MapComponent;