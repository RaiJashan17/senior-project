import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Link, Box, Button } from "@mui/material";

export default function BottomBar() {
  const navigate = useNavigate(); 
  return (
    <AppBar
      position="sticky"
      sx={{
        top: "auto",
        bottom: 0,
        backgroundColor: "#1976d2",
        padding: "8px 16px",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Left-side links */}
        <Box>
          {/* <Link href="/about-us" color="inherit" sx={{ marginRight: 2 }}>
            About Us
          </Link> */}

          <Button color="inherit" sx={{ marginRight: 1 }} onClick={() => navigate("/about-us")}>About Us</Button>
        </Box>

        {/* Right-side copyright */}
        <Typography variant="body2" color="inherit">
          Sacramento State University
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

