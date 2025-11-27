import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { db } from "../Firebase/Firebase"; 
import { doc, getDoc } from "firebase/firestore";
import "mapbox-gl/dist/mapbox-gl.css";

export default function Map({ userId }) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  const [coordinates, setCoordinates] = useState(null); 
  const [secondaryCoordinates, setSecondaryCoordinates] = useState([]); 

  useEffect(() => {
    const fetchCoordinates = async () => {
      if (!userId) return;

      try {
        const userDocRef = doc(db, "nodes", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const secondaryHubs = [];

          Object.entries(userData).forEach(([nodeId, nodeData]) => {
            const lat = nodeData?.coordinates?.latitude;
            const lng = nodeData?.coordinates?.longitude;
            if (!lat || !lng) return;

            const serial = nodeData?.serialNumber || nodeId;

            if (nodeData?.type === "Main") {
              setCoordinates({ lat, lng, id: serial });
            } else if (nodeData?.type === "Secondary") {
              secondaryHubs.push({ lat, lng, id: serial });
            }
          });

          setSecondaryCoordinates(secondaryHubs);
        }
      } catch (error) {
        console.error("Error fetching user coordinates:", error);
      }
    };

    fetchCoordinates();
  }, [userId]);

  useEffect(() => {
    if (!coordinates) return;

    mapboxgl.accessToken =
      "pk.eyJ1IjoianJhaWNzdXMiLCJhIjoiY203ZmNpc284MG40cjJ0cHZzc2ZtdjYxeiJ9.iHoVNqcpXdgNwZmtwDelrQ";

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [coordinates.lng, coordinates.lat],
      zoom: 17,
      style: "mapbox://styles/mapbox/streets-v11",
    });

    new mapboxgl.Marker()
      .setLngLat([coordinates.lng, coordinates.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`Main: ${coordinates.id}`))
      .addTo(mapRef.current);

    secondaryCoordinates.forEach(({ lat, lng, id }) => {
      new mapboxgl.Marker({ color: "red" })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`Secondary: ${id}`))
        .addTo(mapRef.current);
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [coordinates, secondaryCoordinates]);

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      style={{ width: "100%", height: "500px" }}
    />
  );
}
