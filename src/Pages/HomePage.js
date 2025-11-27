import Header from '../Components/Header';
import Footer from '../Components/Footer';
import { Paper, Typography, Box } from "@mui/material";

export default function HomePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <div
  style={{
    display: "flex",
    flex: 1,
    padding: "40px",
    marginTop: "80px",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
  <Paper
    elevation={6}
    style={{
      width: "48%",
      padding: "20px",
      borderRadius: "12px",
      backgroundColor: "#ffffff",
    }}
  >
    <Typography variant="h5" gutterBottom>
      About This Website
    </Typography>
    <Typography variant="body1">
      This website allows users to place and manage nodes, check if fire is detected, etc.
      The fire-detecting nodes send sensor data to a main hub via MQTT, which then pushes the data to Firebase or cloud storage.
      The data is displayed on an interactive map for real-time monitoring.
    </Typography>
  </Paper>

  <Box
    sx={{
      width: "48%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <iframe
      width="100%"
      height="315"
      title="Pyrotect Demo"
      src="https://www.youtube.com/embed/sWt0RoY__jQ?si=yIUvY_H6ioVWud9o"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ borderRadius: "12px" }}
    />
  </Box>
</div>

      <Footer />
    </div>
  );
}

