import { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { db } from "../Firebase/Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useSearchParams, useNavigate } from "react-router-dom";
import 'mapbox-gl/dist/mapbox-gl.css';
import { TextField, Button, Typography, Paper } from "@mui/material";
import Footer from "../Components/Footer";
import { Box } from "@mui/system";
import NoButtonsHeader from "../Components/NoButtonsHeader";

mapboxgl.accessToken = "pk.eyJ1IjoianJhaWNzdXMiLCJhIjoiY203ZmNpc284MG40cjJ0cHZzc2ZtdjYxeiJ9.iHoVNqcpXdgNwZmtwDelrQ";

export default function NodeRegistrationPage() {
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

  useEffect(() => {
    if (!defaultCoords) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [defaultCoords.lng, defaultCoords.lat], 
      zoom: 17,
      style: "mapbox://styles/mapbox/streets-v11",
    });

    mapRef.current.on("click", (event) => {
        const { lng, lat } = event.lngLat;
        setSelectedCoords({ latitude: lat, longitude: lng });
  
        // If marker exists, move it; otherwise, create one
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
        }
      });

    return () => mapRef.current.remove();
  }, [defaultCoords]);

  const handleSaveNode = async () => {
    if (!serialNumber || !coordinates) {
      alert("Please enter a serial number and select a location on the map.");
      return;
    }

    try {
      const userNodesRef = doc(db, "nodes", userId);

      await setDoc(
        userNodesRef,
        { [serialNumber]: {coordinates, type: "Secondary", operationalStatus: "Offline"} },
        { merge: true } // Merge to keep other nodes
      );

      alert("Node saved successfully!");
      setSerialNumber(""); // Reset input
      setSelectedCoords(null); // Reset selection
      if (markerRef.current) {
        markerRef.current.remove(); // Remove marker after saving
        markerRef.current = null; // Reset marker reference
      }
    } catch (error) {
      console.error("Error saving node:", error);
      alert("Failed to save node.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <NoButtonsHeader />
          <div style={{ display: "flex", flex: 1, padding: "40px", marginTop: "80px", alignItems: "center"}}>
          <Paper 
          elevation={6} 
          style={{
            width: "40%",
            padding: "20px",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
          }}
        >
        <Typography variant="h5" gutterBottom>
            Register a New Node
          </Typography>
          <Paper style={{ padding: "20px", width: "300px", marginBottom: "20px" }}>
         <TextField
          label="Node Serial Number"
          fullWidth
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />

        <Typography variant="body1" style={{ marginTop: "10px" }}>
          Click on the map to set the node location.
        </Typography>

        {coordinates && (
          <Typography variant="body2">
            Selected Coordinates: {coordinates.latitude}, {coordinates.longitude}
          </Typography>
        )}

        <Button variant="contained" color="primary" fullWidth onClick={handleSaveNode} style={{ marginTop: "10px" }}>
          Save Node
        </Button>

        <Button variant="outlined" color="secondary" fullWidth onClick={() => navigate(`/dashboard?userId=${userId}`)} style={{ marginTop: "10px" }}>
          Go to Dashboard
        </Button>
      </Paper>
          </Paper>
          <Box sx={{ flex: 1, marginLeft: "20px" }}>
          <div id="map-container" ref={mapContainerRef} style={{ width: "80vw", height: "50vh" }} />
        </Box>
          </div>
          <Footer />
      </div>
  );
}

