import { useNavigate } from "react-router-dom";

import { AppBar, Toolbar, Typography, Button } from "@mui/material";

export default function Header() {
  const navigate = useNavigate(); 
    return (
      <AppBar position="absolute" sx={{ backgroundColor: "#1976d2", padding: "0 16px" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }} onClick={() => navigate("/")}>
            Pyrotect
          </Typography>
          <div>
            <Button color="inherit" sx={{ marginRight: 1 }} onClick={() => navigate("/login")}>Login</Button>
            <Button color="inherit" variant="outlined" sx={{ borderColor: "white", color: "white" }} onClick={() => navigate("/signup")}>
              Sign Up
            </Button>
          </div>
        </Toolbar>
      </AppBar>
    );
  }
  
