import { useParams } from "react-router-dom";
import { Typography, Link } from "@mui/material";
import Footer from "../Components/Footer";
import LoggedInHeader from "../Components/LoggedInHeader";

function VideoFeedPage() {
  const { nodeId } = useParams();

  const streamMap = {
    H42802: "http://10.100.133.70:5000/node/H42802",
    A50942: "http://10.100.133.211:5000/node/A50942",
  };
  const videoUrl = streamMap[nodeId];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <LoggedInHeader />

      <div style={{ padding: "4rem", flex: 1 }}>
        <Typography style={{ marginTop: "2rem" }} variant="h5" align="center">
          Video Feed for Node {nodeId}
        </Typography>

        {!videoUrl ? (
          <div
            style={{
              marginTop: "2rem",
              marginBottom: "20rem",
              padding: "1.5rem",
              backgroundColor: "#ffecec",
              color: "#b30000",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: 720,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <h3>🚫 No video feed available for this node.</h3>
            <p>This node does not have a connected camera or stream feed.</p>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <iframe
              width="640"
              height="360"
              src={videoUrl}
              title={`Video Feed for ${nodeId}`}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
              allowFullScreen
              loading="lazy"
              style={{
                border: "2px solid #ccc",
                borderRadius: "10px",
              }}
            />
            <div style={{ marginTop: "1rem" }}>
              <Link href={videoUrl} target="_blank" rel="noopener noreferrer">
                Open stream directly
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default VideoFeedPage;
