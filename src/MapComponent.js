import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, Polyline, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = () => {
  const [secteurData, setSecteurData] = useState([]);
  const [trajetsData, setTrajetsData] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(9);
  const minZoomForText = 11;
  const [selectedSite, setSelectedSite] = useState('');
  const [mapOpacity, setMapOpacity] = useState(0.5);
  const minZoomForQuantities = 11;

useEffect(() => {
  fetch(`${process.env.PUBLIC_URL}/AIDE_Secteur.json`)
    .then(response => response.json())
    .then(data => {
      console.log('Secteur Data:', data); // Pour vérifier dans la console si les données sont chargées
      setSecteurData(data);
    });

  fetch(`${process.env.PUBLIC_URL}/AIDE_Trajets_boues.json`)
    .then(response => response.json())
    .then(data => {
      console.log('Trajets Data:', data); // Pour vérifier dans la console si les données sont chargées
      setTrajetsData(data);
    });
}, []);


  const center = [50.3, 5.8];

  const aggregatedTrajets = trajetsData.reduce((acc, trajet) => {
    const key = `${trajet.ORIGINE}-${trajet.DESTINATION}`;
    if (!acc[key]) {
      acc[key] = {
        ...trajet,
        QUANTITE: parseFloat(trajet.QUANTITE)
      };
    } else {
      acc[key].QUANTITE += parseFloat(trajet.QUANTITE);
    }
    return acc;
  }, {});

  const aggregatedTrajetsArray = Object.values(aggregatedTrajets);

  const calculateRadius = (capacity) => {
    const defaultRadius = 20;
    const minRadius = 0;
    const maxRadius = 20;
    if (!capacity) return defaultRadius;
    const logCapacity = Math.log10(capacity);
    return minRadius + ((logCapacity / Math.log10(100000)) * (maxRadius - minRadius)) * (zoomLevel / 12);
  };

  // Fonction pour calculer la distance entre deux points (en km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    return distance.toFixed(1); // Distance avec une décimale
  };

  const ZoomHandler = () => {
    useMapEvents({
      zoomend: (event) => {
        setZoomLevel(event.target.getZoom());
      }
    });
    return null;
  };

  // Création de la liste unique de tous les sites (origines et destinations)
  const allSitesSet = new Set();
  trajetsData.forEach(trajet => {
    allSitesSet.add(trajet.ORIGINE);
    allSitesSet.add(trajet.DESTINATION);
  });
  const allSites = Array.from(allSitesSet).sort();

  const renderedPositions = new Set();

  const handleSiteClick = (site) => {
    setSelectedSite(site);
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (e.target === e.sourceTarget) {
          setSelectedSite('');
        }
      },
    });
    return null;
  };

  // Traitement des données pour le site sélectionné
  let incomingSludge = [];
  let outgoingSludge = [];
  let totalIncoming = {};
  let totalOutgoing = {};

  if (selectedSite) {
    aggregatedTrajetsArray.forEach(trajet => {
      const origine = trajet.ORIGINE;
      const destination = trajet.DESTINATION;

      const origineLat = parseFloat(trajet.LAT01.replace(',', '.'));
      const origineLon = parseFloat(trajet.LONG01.replace(',', '.'));
      const destinationLat = parseFloat(trajet.LAT02.replace(',', '.'));
      const destinationLon = parseFloat(trajet.LONG02.replace(',', '.'));

      const distance = calculateDistance(origineLat, origineLon, destinationLat, destinationLon);

      if (origine.trim().toLowerCase() === selectedSite.trim().toLowerCase()) {
        // Boues sortantes
        outgoingSludge.push({
          destination: destination,
          quantity: parseFloat(trajet.QUANTITE),
          unit: trajet.UNITE,
          distance: distance
        });

        // Calcul des totaux, séparés par unité
        if (!totalOutgoing[trajet.UNITE]) {
          totalOutgoing[trajet.UNITE] = 0;
        }
        totalOutgoing[trajet.UNITE] += parseFloat(trajet.QUANTITE);

      } else if (destination.trim().toLowerCase() === selectedSite.trim().toLowerCase()) {
        // Boues entrantes
        incomingSludge.push({
          origine: origine,
          quantity: parseFloat(trajet.QUANTITE),
          unit: trajet.UNITE,
          distance: distance
        });

        // Calcul des totaux, séparés par unité
        if (!totalIncoming[trajet.UNITE]) {
          totalIncoming[trajet.UNITE] = 0;
        }
        totalIncoming[trajet.UNITE] += parseFloat(trajet.QUANTITE);
      }
    });
  }

  return (
    <div>
      {/* Menu déroulant pour sélectionner un site */}
      <div className="control-container">
        <div className="dropdown-container">
          <select onChange={(e) => setSelectedSite(e.target.value)} value={selectedSite}>
            <option value="">-- Sélectionner un site ou cliquer dessus --</option>
            {allSites.map((site, index) => (
              <option key={index} value={site}>{site}</option>
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

        <ZoomHandler />
        <MapClickHandler />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          opacity={mapOpacity}
        />

        {secteurData.map((secteur, index) => (
          <Polygon
            key={`${index}-${selectedSite}`}
            positions={secteur.polygone}
            color={secteur.color}
            weight={1}
            interactive={false}
          />
        ))}

        {aggregatedTrajetsArray.map((trajet, index) => {
          const originePosition = [
            parseFloat(trajet.LAT01.replace(',', '.')),
            parseFloat(trajet.LONG01.replace(',', '.'))
          ];
          const destinationPosition = [
            parseFloat(trajet.LAT02.replace(',', '.')),
            parseFloat(trajet.LONG02.replace(',', '.'))
          ];

          // Normalisation pour comparer avec le site sélectionné
          const selectedSiteNormalized = selectedSite.trim().toLowerCase();
          const trajetDestNormalized = trajet.DESTINATION.trim().toLowerCase();
          const trajetOrigineNormalized = trajet.ORIGINE.trim().toLowerCase();

          // Vérification de la connexion au site sélectionné
          const isConnected = selectedSiteNormalized 
            ? trajetDestNormalized === selectedSiteNormalized || trajetOrigineNormalized === selectedSiteNormalized
            : true;

          // Définition de la couleur des lignes selon la sélection
          let lineColor = "#7AC6E8";
          if (selectedSiteNormalized && isConnected) {
            if (trajetDestNormalized === selectedSiteNormalized) {
              lineColor = "#008EB7"; // Bleu foncé pour les destinations sélectionnées
            } else if (trajetOrigineNormalized === selectedSiteNormalized) {
              lineColor = "orange"; // Orange pour les origines sélectionnées
            }
          }

          const isTreatmentCenter = parseInt(trajet.DESTINATION_CAPACITE) === 0;

          const originePosKey = originePosition.toString();
          const destinationPosKey = destinationPosition.toString();

          let renderOrigineMarker = false;
          let renderDestinationMarker = false;

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
            <React.Fragment key={`${index}-${selectedSite}`}>
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
                    <>
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
                      {/* Marker transparent pour gérer le clic */}
                      <Marker
                        position={originePosition}
                        opacity={0}
                        eventHandlers={{
                          click: (e) => {
                            handleSiteClick(trajet.ORIGINE);
                          },
                        }}
                      />
                    </>
                  )}

                  {/* Pastille pour les sites de destination */}
                  {renderDestinationMarker && (
                    <>
                      <CircleMarker
                        center={destinationPosition}
                        radius={isTreatmentCenter ? 10 : calculateRadius(trajet.DESTINATION_CAPACITE)}
                        color={isTreatmentCenter ? "orange" : "#008EB7"}
                        fillColor={isTreatmentCenter ? "orange" : lineColor}
                        weight={1}
                        fillOpacity={0.8}
                      >
                        {zoomLevel >= minZoomForText && (
                          <Tooltip 
                            direction="right" 
                            offset={[20, 0]} 
                            opacity={1} 
                            permanent 
                            className={isTreatmentCenter ? "treatment-center-tooltip" : "zoom-tooltip"}
                          >
                            {trajet.DESTINATION} <br />
                            {isTreatmentCenter
                              ? "Centre de traitement"
                              : `Capacité: ${parseInt(trajet.DESTINATION_CAPACITE).toLocaleString()} EH`}
                          </Tooltip>
                        )}
                      </CircleMarker>
                      {/* Marker transparent pour gérer le clic */}
                      <Marker
                        position={destinationPosition}
                        opacity={0}
                        eventHandlers={{
                          click: (e) => {
                            handleSiteClick(trajet.DESTINATION);
                          },
                        }}
                      />
                    </>
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
        </div>
      )}

      {/* Informations sur le site sélectionné */}
		{selectedSite && (
		  <div className="Table_info">
			<p><strong>{selectedSite}</strong></p>

			{/* Boues entrantes */}
			{incomingSludge.length > 0 && (
			  <div>
				<p><br /><strong>-- BOUES ENTRANTES --</strong></p>
				<table>
				  <thead>
					<tr>
					  <th></th>
					  <th>Quantité</th>
					  <th>Distance</th>
					</tr>
				  </thead>
				  <tbody>
					{incomingSludge.map((item, index) => (
					  <tr key={index}>
						<td>{item.origine}</td>
						<td>{item.quantity} {item.unit}</td>
						<td>{item.distance} km</td>
					  </tr>
					))}
				  </tbody>
				</table>
				{/* Totaux */}
				<p><strong>Total :</strong></p>
				<ul>
				  {Object.keys(totalIncoming).map((unit, index) => (
					<li key={index}>{totalIncoming[unit]} {unit}</li>
				  ))}
				</ul>
			  </div>
			)}

			{/* Boues sortantes */}
			{outgoingSludge.length > 0 && (
			  <div>
				<p style={{ color: 'orange' }}><br /><strong>-- BOUES SORTANTES --</strong></p>
				<table>
				  <thead>
					<tr>
					  <th></th>
					  <th>Quantité</th>
					  <th>Distance</th>
					</tr>
				  </thead>
				  <tbody>
					{outgoingSludge.map((item, index) => (
					  <tr key={index}>
						<td>{item.destination}</td>
						<td>{item.quantity} {item.unit}</td>
						<td>{item.distance} km</td>
					  </tr>
					))}
				  </tbody>
				</table>
				{/* Totaux */}
				<p style={{ color: 'orange' }}><strong>Total :</strong></p>
				<ul style={{ color: 'orange', fontWeight: 'bold' }}>
				  {Object.keys(totalOutgoing).map((unit, index) => (
					<li key={index}>{totalOutgoing[unit]} {unit}</li>
				  ))}
				</ul>

			  </div>
			)}

		  </div>
		)}

    </div>
  );
};

export default MapComponent;
