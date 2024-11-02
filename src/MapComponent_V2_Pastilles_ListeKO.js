import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, Polyline, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = () => {
  const [secteurData, setSecteurData] = useState([]);  // Données des secteurs
  const [trajetsData, setTrajetsData] = useState([]);  // Données des trajets
  const [zoomLevel, setZoomLevel] = useState(9);  // Niveau de zoom initial
  const minZoomForText = 11;  // Zoom minimum pour afficher les zoom-tooltip
  const [selectedDestination, setSelectedDestination] = useState('');  // Destination sélectionnée dans la liste
  const [mapOpacity, setMapOpacity] = useState(0.5); // Initialisez l’opacité de la carte
  const minZoomForQuantities = 11;  // Zoom minimum pour afficher les quantités

  useEffect(() => {
    fetch('/AIDE_Secteur.json')
      .then(response => response.json())
      .then(data => setSecteurData(data));  // Mise à jour des données des secteurs

    fetch('/AIDE_Trajets_boues.json')
      .then(response => response.json())
      .then(data => setTrajetsData(data));  // Mise à jour des données des trajets
  }, []);

  const center = [50.3, 5.8];  // Coordonnées centrales de la carte

  // Agrégation des trajets en combinant ceux qui partagent les mêmes origine et destination
  const aggregatedTrajets = trajetsData.reduce((acc, trajet) => {
    const key = `${trajet.ORIGINE}-${trajet.DESTINATION}`;
    if (!acc[key]) {
      acc[key] = {
        ...trajet,
        QUANTITE: parseFloat(trajet.QUANTITE)  // Quantité initiale pour un trajet unique
      };
    } else {
      acc[key].QUANTITE += parseFloat(trajet.QUANTITE);  // Ajout de la quantité
    }
    return acc;
  }, {});

  const aggregatedTrajetsArray = Object.values(aggregatedTrajets);
  

  // Définition des rayons pour les pastilles des sites
  const defaultRadius = 20;
  const minRadius = 0;
  const maxRadius = 20;

  // Calcul du rayon des pastilles selon la capacité
  const calculateRadius = (capacity) => {
    if (!capacity) return defaultRadius;
    const logCapacity = Math.log10(capacity);
    // Rayon normalisé selon le niveau de zoom
    return minRadius + ((logCapacity / Math.log10(100000)) * (maxRadius - minRadius)) * (zoomLevel / 12);
  };

  // Gestionnaire de zoom pour capturer le niveau de zoom actuel
  const ZoomHandler = () => {
    useMapEvents({
      zoomend: (event) => {
        setZoomLevel(event.target.getZoom());
      }
    });
    return null;
  };

  // Liste des destinations uniques pour le menu déroulant
  const uniqueDestinations = [...new Set(trajetsData.map(trajet => trajet.DESTINATION))].sort();

  // Ensemble pour stocker les positions déjà rendues, évitant ainsi les doublons de `zoom-tooltip`
  const renderedPositions = new Set();

  return (
    <div>
      {/* Menu déroulant pour sélectionner une destination */}
      <div className="control-container">
        <div className="dropdown-container">
          <select onChange={(e) => setSelectedDestination(e.target.value)} value={selectedDestination}>
            <option value="">-- Sélectionnez une destination --</option>
            {uniqueDestinations.map((destination, index) => (
              <option key={index} value={destination}>{destination}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Carte principale */}
      <MapContainer 
        center={center} 
        zoom={zoomLevel} 
        className="map-offset"
        style={{ height: "800px", width: "100%" }} 
        zoomControl={false}
      >

        <ZoomHandler />  {/* Gestionnaire de zoom */}

        {/* Couche de tuiles pour l'affichage des cartes */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          opacity={mapOpacity}
        />

        {/* Affichage des secteurs sous forme de polygones */}
        {secteurData.map((secteur, index) => (
          <Polygon
            key={`${index}-${selectedDestination}`}
            positions={secteur.polygone}
            color={secteur.color}
            weight={1}
            interactive={false} // Désactive l'interactivité du secteur
          />
        ))}

        {/* Affichage des trajets agrégés */}
        {aggregatedTrajetsArray.map((trajet, index) => {
          const originePosition = [
            parseFloat(trajet.LAT01.replace(',', '.')),
            parseFloat(trajet.LONG01.replace(',', '.'))
          ];
          const destinationPosition = [
            parseFloat(trajet.LAT02.replace(',', '.')),
            parseFloat(trajet.LONG02.replace(',', '.'))
          ];

          // Normalisation pour comparer avec la destination sélectionnée
          const selectedDestNormalized = selectedDestination.trim().toLowerCase();
          const trajetDestNormalized = trajet.DESTINATION.trim().toLowerCase();
          const trajetOrigineNormalized = trajet.ORIGINE.trim().toLowerCase();

          // Vérification de la connexion au site sélectionné
          const isConnected = selectedDestNormalized 
            ? trajetDestNormalized === selectedDestNormalized || trajetOrigineNormalized === selectedDestNormalized
            : true;

          // Définition de la couleur des lignes selon la sélection
          let lineColor = "#7AC6E8";
          if (selectedDestNormalized && isConnected) {
            lineColor = trajetDestNormalized === selectedDestNormalized ? "#008EB7" : "orange";
          }

          const isTreatmentCenter = parseInt(trajet.DESTINATION_CAPACITE) === 0;

          // Correction : Gestion des positions rendues pour éviter les coordonnées affichées
          const originePosKey = originePosition.toString();
          const destinationPosKey = destinationPosition.toString();

          // Initialiser les variables pour savoir si on doit rendre les marqueurs
          let renderOrigineMarker = false;
          let renderDestinationMarker = false;

          // Mettez à jour renderedPositions uniquement si le trajet est connecté
          if (isConnected) {
            if (!renderedPositions.has(originePosKey)) {
              renderedPositions.add(originePosKey);
              renderOrigineMarker = true;
            }

            if (!renderedPositions.has(destinationPosKey)) {
              renderedPositions.add(destinationPosKey);
              renderDestinationMarker = true;
            }
          }

          return (
            <React.Fragment key={`${index}-${selectedDestination}`}>
              {isConnected && (
                <>
                  {/* Ligne entre origine et destination */}
                  <Polyline
                    positions={[originePosition, destinationPosition]}
                    color={lineColor}
                    weight={2}
                    opacity={1}
                  >
                    {zoomLevel >= minZoomForQuantities && (
                      <Tooltip 
                        direction="center" 
                        offset={[0, 0]} 
                        opacity={1} 
                        permanent 
                        className="quantity-tooltip"
                      >
                        {`${trajet.QUANTITE} ${trajet.UNITE}`}
                      </Tooltip>
                    )}
                  </Polyline>

                  {/* Pastille pour les sites d'origine */}
                  {renderOrigineMarker && (
                    <CircleMarker
                      center={originePosition}
                      radius={calculateRadius(trajet.ORIGINE_CAPACITE)}
                      color="#008EB7"
                      fillColor={lineColor}
                      weight={1}
                      fillOpacity={0.3}
                    >
                      {zoomLevel >= minZoomForText && (
                        <Tooltip 
                          direction="top" 
                          offset={[0, -10]} 
                          opacity={1} 
                          permanent 
                          className="zoom-tooltip"
                        >
                          {trajet.ORIGINE} <br /> Capacité: {parseInt(trajet.ORIGINE_CAPACITE).toLocaleString()} EH
                        </Tooltip>
                      )}
                    </CircleMarker>
                  )}

                  {/* Pastille pour les sites de destination */}
                  {renderDestinationMarker && (
                    isTreatmentCenter ? (
                      <Marker
                        position={destinationPosition}
                        icon={L.divIcon({
                          className: 'custom-square-icon', 
                          html: `<div style="width: 20px; height: 20px; background-color: orange; border: 1px solid #ff8c00;"></div>`,
                        })}
                        eventHandlers={{
                          click: () => setSelectedDestination(trajet.DESTINATION),
                        }} // Utilisation de eventHandlers pour le clic
                      >
                        {zoomLevel >= minZoomForText && (
                          <Tooltip 
                            direction="right" 
                            offset={[20, 0]} 
                            opacity={1} 
                            permanent 
                            className="treatment-center-tooltip"
                          >
                            {trajet.DESTINATION} <br /> Centre de traitement
                          </Tooltip>
                        )}
                      </Marker>
                    ) : (
                      <CircleMarker
                        center={destinationPosition}
                        radius={calculateRadius(trajet.DESTINATION_CAPACITE)}
                        color="#008EB7"
                        fillColor={lineColor}
                        weight={1}
                        fillOpacity={0.3}
                        onClick={() => setSelectedDestination(trajet.DESTINATION)}
                      >
                        {zoomLevel >= minZoomForText && (
                          <Tooltip 
                            direction="right" 
                            offset={[20, 0]} 
                            opacity={1} 
                            permanent 
                            className="zoom-tooltip"
                          >
                            {trajet.DESTINATION} <br /> Capacité: {parseInt(trajet.DESTINATION_CAPACITE).toLocaleString()} EH
                          </Tooltip>
                        )}
                      </CircleMarker>
                    )
                  )}

                  {/* Marqueur transparent pour capturer le clic */}
                  {renderDestinationMarker && !isTreatmentCenter && (
                    <Marker
                      position={destinationPosition}
                      opacity={0} // Rendre le marqueur invisible
                      eventHandlers={{
                        click: () => {
                          setSelectedDestination(trajet.DESTINATION);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Légende conditionnelle */}
      {zoomLevel >= minZoomForQuantities && (
        <div className="legend">
          <p><strong>Légende :</strong></p>
          <p>Boues liquides (m³) - Boues déshydratées (t)</p>
          <p style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{
              width: '30px',          // Longueur du trait
              height: '4px',          // Épaisseur du trait
              backgroundColor: 'orange', // Couleur du trait
              marginRight: '8px'      // Espace entre le trait et le texte
            }}></span>
            : Boues sortantes
          </p>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
