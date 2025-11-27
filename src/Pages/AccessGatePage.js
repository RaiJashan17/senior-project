import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, Button, Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import NoButtonsHeader from "../Components/NoButtonsHeader";
import Footer from "../Components/Footer";

export default function AccessGatePage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const REQUIRED_CODE = "$Kendeezy$";

  const handleAccess = () => {
    if (code === REQUIRED_CODE) {
      sessionStorage.setItem("hasAccess", "true");
      navigate("/Add-Kendra-Trip");
    } else {
      alert("Incorrect access code.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NoButtonsHeader />
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, marginTop: "80px" }}>
        <Paper elevation={6} style={{ padding: "30px", width: "400px", borderRadius: "12px" }}>
          <Typography variant="h5" gutterBottom>
            Enter Access Code
          </Typography>
          <TextField
            fullWidth
            label="Access Code"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginBottom: "16px" }}
          />
          <Button variant="contained" color="primary" fullWidth onClick={handleAccess}>
            Submit
          </Button>
        </Paper>
      </Box>
      <Footer />
    </div>
  );
}
