import { useEffect, useState } from "react";
import EasterEggMap from '../Components/EasterEggMap';
import "mapbox-gl/dist/mapbox-gl.css";
import Footer from '../Components/Footer';
import { Paper, Typography, Box, List, ListItem, ListItemText } from "@mui/material";
import NoButtonsHeader from "../Components/NoButtonsHeader";
import { db } from "../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";

export default function EasterEggPage() {

  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const fetchTripData = async () => {

      try {
        const docRef = doc(db, "Trips", "Kendra");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const tripArray = Object.entries(data)
            .filter(([tripDate]) => tripDate !== "Main")
            .map(([tripDate, tripData]) => ({
            id: tripDate,
            ...tripData,
        }));
          setTrips(tripArray);
        }
      } catch (err) {
        console.error("Failed to fetch nodes:", err);
      }
    };

    fetchTripData();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NoButtonsHeader />
      <div style={{ display: "flex", flex: 1, padding: "40px", marginTop: "80px", alignItems: "flex-start" }}>
        
        <Paper 
          elevation={6} 
          style={{
            width: "40%",
            padding: "20px",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
            maxHeight: "500px",
            overflowY: "auto"
          }}
        >
          <Typography variant="h5" gutterBottom>
            Trip Overview
          </Typography>
          {trips.length > 0 ? (
            <List>
              {trips.map((trip) => (
                <ListItem key={trip.id} alignItems="flex-start">
                  <ListItemText
                    primary={`Date of Trip Put In System: ${trip.id}`}
                    secondary={
                      <>
                        <div><strong>Description:</strong> {trip.description}</div>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body1">No trip data available.</Typography>
          )}
        </Paper>

        <Box sx={{ flex: 1, marginLeft: "20px" }}>
          <EasterEggMap />
        </Box>
      </div>

      <Footer />
    </div>
  );
}
  