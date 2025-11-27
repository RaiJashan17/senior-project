import { useNavigate, useLocation } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";

export default function LoggedInHeader() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const userId = searchParams.get("userId");
  const navigate = useNavigate(); 
  const isDashboard = location.pathname === "/dashboard";
  const isNodePage = location.pathname.startsWith("/node");
    return (
      <AppBar position="absolute" sx={{ backgroundColor: "#1976d2", padding: "0 16px" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }} onClick={() => navigate("/")}>
            Pyrotect
          </Typography>
          <div>
            {isDashboard && (<Button color="inherit" sx={{ marginRight: 1 }} onClick={() => navigate(`/node?userId=${userId}`)}>Add Nodes</Button>)}
            {isNodePage && (<Button color="inherit" sx={{ marginRight: 1 }} onClick={() => navigate(`/dashboard?userId=${userId}`)}>Dashboard</Button>)}
            <Button color="inherit" variant="outlined" sx={{ borderColor: "white", color: "white" }} onClick={() => navigate("/")}>
              Log Out
            </Button>
          </div>
        </Toolbar>
      </AppBar>
    );
  }