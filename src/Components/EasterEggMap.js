import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { db } from "../Firebase/Firebase"; 
import { doc, getDoc } from "firebase/firestore";
import "mapbox-gl/dist/mapbox-gl.css";

export default function Map() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [coordinates, setCoordinates] = useState(null);
  const [secondaryCoordinates, setSecondaryCoordinates] = useState([]);

  useEffect(() => {
    const fetchCoordinates = async () => {

      try {
        const userDocRef = doc(db, "Trips", "Kendra");
        const userDocSnap = await getDoc(userDocRef);
        const trips = [];
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          Object.entries(userData).forEach(([tripId, tripData]) => {
            if (tripData.coordinates.latitude && tripData.coordinates.longitude && tripId === "Main") {
                setCoordinates({ lat: tripData.coordinates.latitude, lng: tripData.coordinates.longitude});
            } else if (tripData.coordinates.latitude && tripData.coordinates.longitude) {
                trips.push({ lat: tripData.coordinates.latitude, lng: tripData.coordinates.longitude });
            } 
              else {
              console.error("No coordinates found in Firestore.");
            }
          });
          setSecondaryCoordinates(trips);
        }
      } catch (error) {
        console.error("Error fetching user coordinates:", error);
      }
    };

    fetchCoordinates();
  }, []);

  useEffect(() => {
    
    if (!coordinates) return;
    mapboxgl.accessToken =
      "pk.eyJ1IjoianJhaWNzdXMiLCJhIjoiY203ZmNpc284MG40cjJ0cHZzc2ZtdjYxeiJ9.iHoVNqcpXdgNwZmtwDelrQ";
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [coordinates.lng, coordinates.lat], 
      zoom: 14,
      style: "mapbox://styles/mapbox/streets-v11",
    });
    
    secondaryCoordinates.forEach(coord => {
      new mapboxgl.Marker({ color: "red" })
        .setLngLat([coord.lng, coord.lat])
        .addTo(mapRef.current);
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [coordinates, secondaryCoordinates]); 

  return <div id="map-container" ref={mapContainerRef} style={{ width: "100%", height: "500px" }} />;
}