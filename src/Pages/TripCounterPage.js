import { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { db } from "../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams, useNavigate } from "react-router-dom";
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = "pk.eyJ1IjoianJhaWNzdXMiLCJhIjoiY203ZmNpc284MG40cjJ0cHZzc2ZtdjYxeiJ9.iHoVNqcpXdgNwZmtwDelrQ";

export default function TripCounterPage() {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("userId");
    const navigate = useNavigate();
    const [serialNumber, setSerialNumber] = useState("");
    const [coordinates, setSelectedCoords] = useState(null);
    const [defaultCoords, setDefaultCoords] = useState(null);
    const mapRef = useRef();
    const mapContainerRef = useRef();
    const markerRef = useRef(null);

    useEffect(() => {
        const fetchCoordinates = async () => {
            if (!userId){
            alert("No user ID found in URL.");
            return;
            }
    
            try {
              const userDocRef = doc(db, "users", userId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.coordinates.latitude && userData.coordinates.longitude) {
                    setDefaultCoords({ lat: userData.coordinates.latitude, lng: userData.coordinates.longitude});
                } else {
                  console.error("No coordinates found in Firestore.");
                }
              } else {
                console.error("User document not found.");
              }
            } catch (error) {
              console.error("Error fetching user coordinates:", error);
            }
          };
    
        fetchCoordinates();
      }, [userId]);
}

return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
    <Header></Header>
    </div>
)
