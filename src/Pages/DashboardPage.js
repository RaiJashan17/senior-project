import { useEffect, useState } from "react";
import Map from '../Components/Map';
import "mapbox-gl/dist/mapbox-gl.css";
import Footer from '../Components/Footer';
import { Paper, Typography, Box, List, ListItem, ListItemText } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import LoggedInHeader from "../Components/LoggedInHeader";
import { db } from "../Firebase/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate(); 

  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const fetchNodeData = async () => {
      if (!userId) return;

      try {
        const docRef = doc(db, "nodes", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const nodeArray = Object.entries(data).map(([nodeId, nodeData]) => ({
            id: nodeId,
            ...nodeData,
          }));

          // Sort Main node first
          nodeArray.sort((a, b) => {
            if (a.type === "Main") return -1;
            if (b.type === "Main") return 1;
            return 0;
          });

          setNodes(nodeArray);
        }
      } catch (err) {
        console.error("Failed to fetch nodes:", err);
      }
    };

    fetchNodeData();
  }, [userId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <LoggedInHeader />
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
            Node Overview
          </Typography>
          {nodes.length > 0 ? (
            <List>
              {nodes.map((node) => (
                <ListItem
                  key={node.id}
                  alignItems="flex-start"
                  onClick={() => navigate(`/node/${node.id}?userId=${userId}`)}
                  sx={{
                    cursor: "pointer", // shows the hand cursor
                    "&:hover": { backgroundColor: "#f5f5f5" }, // optional hover effect
                  }}
                >
                  <ListItemText
                    primary={`Node ID: ${node.id} (${node.type})`}
                    secondary={
                      <>
                        <div><strong>Status:</strong> {node.operationalStatus}</div>
                        <div><strong>Fire Detected:</strong> {node.detectedFire ? "🔥 Yes" : "No"}</div>
                        {node.type === "Secondary" && (
                          <>
                            <div><strong>PM1P0 Reading:</strong> {node.pm1p0 ?? "N/A"}</div>
                            <div><strong>PM2P5 Reading:</strong> {node.pm2p5 ?? "N/A"}</div>
                            <div><strong>PM4P0 Reading:</strong> {node.pm4p0 ?? "N/A"}</div>
                            <div><strong>PM10P0 Reading:</strong> {node.pm10p0 ?? "N/A"}</div>
                          </>
                        )}
                        {node.pm1p0 != null && node.pm2p5 != null && node.pm4p0 != null && node.pm10p0 != null && (
                          <div>
                            <strong>Average PM:</strong>{" "}
                            {((node.pm1p0 + node.pm2p5 + node.pm4p0 + node.pm10p0) / 4).toFixed(2)}
                          </div>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body1">No node data available.</Typography>
          )}
        </Paper>

        <Box sx={{ flex: 1, marginLeft: "20px" }}>
          <Map userId={userId} />
        </Box>
      </div>

      <Footer />
    </div>
  );
}


