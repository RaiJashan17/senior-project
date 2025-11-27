import { useState, useEffect } from "react";
import {
  Paper,
  TextField,
  Button,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import Footer from "../Components/Footer";
import { GetCoordinatesFromAddress } from "../Components/GetCoordinatesFromAddress";
import NoButtonsHeader from "../Components/NoButtonsHeader";

export default function AddressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");

  // input mode: "address" or "coordinates"
  const [locationMode, setLocationMode] = useState("address");

  // address fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // coordinate fields
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");

  // other fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCarrier, setPhoneCarrier] = useState("");
  const [mainNodeSerial, setMainNodeSerial] = useState("");

  useEffect(() => {
    if (!userId) {
      navigate("/signup");
      return;
    }
  }, [userId, navigate]);

  // Normalize any coordinate object to { latitude, longitude }
  const normalizeCoordinates = (coords) => ({
    latitude: coords.latitude ?? coords.lat,
    longitude: coords.longitude ?? coords.lng,
  });

  const handleSave = async () => {
    let coordinates;

    if (locationMode === "address") {
      if (!address || !city || !state || !zipCode) {
        console.error("Address fields are required");
        return;
      }

      const fullAddress = `${address}, ${city}, ${state}, ${zipCode}`;
      const rawCoords = await GetCoordinatesFromAddress(fullAddress);

      if (!rawCoords) {
        console.error("Could not fetch coordinates, invalid address");
        return;
      }

      coordinates = normalizeCoordinates(rawCoords);
    } else {
      // coordinates mode
      if (!latitudeInput || !longitudeInput) {
        console.error("Latitude and longitude are required");
        return;
      }

      const lat = parseFloat(latitudeInput);
      const lng = parseFloat(longitudeInput);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        console.error("Latitude and longitude must be valid numbers");
        return;
      }

      coordinates = { latitude: lat, longitude: lng };
    }

    const userDocRef = doc(db, "users", userId);
    await setDoc(
      userDocRef,
      {
        address,
        city,
        state,
        zipCode,
        coordinates, // { latitude, longitude }
        phoneNumber,
        phoneCarrier,
      },
      { merge: true }
    );

    const mainNodeDocRef = doc(db, "nodes", userId);
    await setDoc(
      mainNodeDocRef,
      {
        [mainNodeSerial]: {
          coordinates, // { latitude, longitude }
          type: "Main",
          operationalStatus: "Offline",
        },
      },
      { merge: true }
    );

    navigate(`/dashboard?userId=${userId}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NoButtonsHeader />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          marginTop: "64px",
        }}
      >
        <Paper elevation={6} style={{ padding: "30px", borderRadius: "10px", width: "350px" }}>
          <Typography variant="h5" align="center" gutterBottom>
            Location Details
          </Typography>

          {/* Choose address vs coordinates */}
          <FormControl component="fieldset" fullWidth margin="normal">
            <Typography variant="subtitle1" gutterBottom>
              Location Input Method
            </Typography>
            <RadioGroup
              row
              value={locationMode}
              onChange={(e) => setLocationMode(e.target.value)}
            >
              <FormControlLabel value="address" control={<Radio />} label="Address" />
              <FormControlLabel value="coordinates" control={<Radio />} label="Coordinates" />
            </RadioGroup>
          </FormControl>

          {/* Address fields */}
          {locationMode === "address" && (
            <>
              <TextField
                label="Address"
                fullWidth
                margin="normal"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <TextField
                label="City"
                fullWidth
                margin="normal"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <TextField
                label="State"
                fullWidth
                margin="normal"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <TextField
                label="Zip Code"
                fullWidth
                margin="normal"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </>
          )}

          {/* Coordinate fields */}
          {locationMode === "coordinates" && (
            <>
              <TextField
                label="Latitude"
                fullWidth
                margin="normal"
                value={latitudeInput}
                onChange={(e) => setLatitudeInput(e.target.value)}
              />
              <TextField
                label="Longitude"
                fullWidth
                margin="normal"
                value={longitudeInput}
                onChange={(e) => setLongitudeInput(e.target.value)}
              />
            </>
          )}

          {/* Common fields */}
          <TextField
            label="Phone Number"
            fullWidth
            margin="normal"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <TextField
            label="Main Node Serial Number"
            fullWidth
            margin="normal"
            value={mainNodeSerial}
            onChange={(e) => setMainNodeSerial(e.target.value)}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="carrier-label">Phone Carrier</InputLabel>
            <Select
              labelId="carrier-label"
              value={phoneCarrier}
              label="Phone Carrier"
              onChange={(e) => setPhoneCarrier(e.target.value)}
            >
              <MenuItem value="att">AT&amp;T</MenuItem>
              <MenuItem value="verizon">Verizon</MenuItem>
              <MenuItem value="tmobile">T-Mobile</MenuItem>
            </Select>
          </FormControl>

          <Button variant="contained" color="primary" fullWidth onClick={handleSave}>
            Save
          </Button>
        </Paper>
      </div>
      <Footer />
    </div>
  );
}