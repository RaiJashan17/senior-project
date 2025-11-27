import { useNavigate } from "react-router-dom";

import { AppBar, Toolbar, Typography} from "@mui/material";

export default function NoButtonsHeader() {
  const navigate = useNavigate(); 
    return (
      <AppBar position="absolute" sx={{ backgroundColor: "#1976d2", padding: "0 16px" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }} onClick={() => navigate("/")}>
            Pyrotect
          </Typography>
        </Toolbar>
      </AppBar>
    );
  }