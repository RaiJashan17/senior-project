import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { Paper, Typography, Box } from "@mui/material";


export default function AboutUsPage() {

    return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
    
        <Header />

        <div style={{ display: "flex", flex: 1, padding: "40px", marginTop: "80px", alignItems: "center"}}>

        <Paper 
            elevation={6} 
            style={{
                width: "40%",
                padding: "20px",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
            }}
            >
            <Typography variant="h5" gutterBottom>
                Meet the Team
            </Typography>

            <Typography variant="body1">
                How to reach us?
                Phone Number: ###-###-####
                Email: example@hotmail.com

            </Typography>
        </Paper>

        </div>

        <div>
            <Footer />
        </div>

    </div>

    );
}