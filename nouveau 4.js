// src/components/MapComponent.js
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = () => {
  const [mapData, setMapData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState("");

  useEffect(() => {
    // Charger les trajectoires depuis Liste_test.json
    fetch('/Liste_test.json')
      .then((response) => response.json())
      .then((data) => setMapData(data))
      .catch((error) => console.error("Erreur lors du chargement des données :", error));
  }, []);

  useEffect(() => {
    // Charger les secteurs depuis AIDE_Secteur.json
    fetch('/AIDE_Secteur.json')
      .then((response) => response.json())
      .then((data) => setSectorData(data))
      .catch((error) => console.error("Erreur lors du chargement des données des secteurs :", error));
  }, []);

   const handleDestinationChange = (event) => {
    setSelectedDestination(event.target.value);
  };

  return (
    <div>
      <h3>Carte Interactive avec Secteurs et Filtrage par Destination</h3>
      <label>
        Filtrer par destination :
        <select onChange={handleDestinationChange} value={selectedDestination}>
          <option value="">Toutes les destinations</option>
          {Array.from(new Set(mapData.map(item => item.DESTINATION)))
            .sort((a, b) => a.localeCompare(b)) // Tri alphabétique
            .map((destination, index) => (
              <option key={index} value={destination}>{destination}</option>
            ))}
        </select>
      </label>
      
      <MapContainer center={[50.6, 5.2]} zoom={9} style={{ height: '600px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Affichage des polygones pour chaque secteur en arrière-plan */}
        {sectorData.map((sector, index) => (
          <Polygon
            key={index}
            positions={sector.polygone.map((coord) => [
              parseFloat(coord[0].toString().replace(',', '.')),
              parseFloat(coord[1].toString().replace(',', '.'))
            ])}
            color={sector.color || "blue"} // Couleur par défaut si non définie
            fillOpacity={0.3}
          >
            <Tooltip>{sector.secteur}</Tooltip>
          </Polygon>
        ))}

        {/* Affichage des trajectoires avec cercles et lignes au-dessus des secteurs */}
        {mapData.map((item, index) => {
          const originePosition = [parseFloat(item.LAT01.replace(',', '.')), parseFloat(item.LONG01.replace(',', '.'))];
          const destinationPosition = [parseFloat(item.LAT02.replace(',', '.')), parseFloat(item.LONG02.replace(',', '.'))];
          const midPosition = [
            (parseFloat(item.LAT01.replace(',', '.')) + parseFloat(item.LAT02.replace(',', '.'))) / 2,
            (parseFloat(item.LONG01.replace(',', '.')) + parseFloat(item.LONG02.replace(',', '.'))) / 2,
          ];

          // Définir la couleur en fonction de la destination sélectionnée
          let lineColor = "grey";
          if (selectedDestination) {
            if (item.DESTINATION === selectedDestination) {
              lineColor = "blue"; // Trajectoire arrivant à la destination sélectionnée
            } else if (item.ORIGINE === selectedDestination) {
              lineColor = "orange"; // Trajectoire partant de la destination sélectionnée
            }
          }

          return (
            <React.Fragment key={index}>
              {/* Ligne entre l'origine et la destination avec un dégradé */}
              <Polyline
                positions={[originePosition, midPosition]}
                color={lineColor}
                weight={2}
                opacity={0.8}
              />
              <Polyline
                positions={[midPosition, destinationPosition]}
                color="grey"
                weight={2}
                opacity={0.5}
              />

              {/* Cercle représentant l'origine */}
              <Circle center={originePosition} radius={Math.log1p(item.ORIGINE_CAPACITE) * 50} color="#7ac6e8" fillOpacity={0.6}>
                <Tooltip>{`Origine: ${item.ORIGINE}, Capacité: ${item.ORIGINE_CAPACITE}`}</Tooltip>
              </Circle>

              {/* Cercle représentant la destination */}
              <Circle center={destinationPosition} radius={Math.log1p(item.DESTINATION_CAPACITE) * 50} color={lineColor} fillOpacity={0.6}>
                <Tooltip>{`Destination: ${item.DESTINATION}, Capacité: ${item.DESTINATION_CAPACITE}`}</Tooltip>
              </Circle>

              {/* Marqueur au milieu de la trajectoire */}
              <Marker position={midPosition}>
                <Tooltip>{`Quantité: ${item.QUANTITE} ${item.UNITE}, Distance: ${item.Distance_km} km`}</Tooltip>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
