import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { Paper, Typography, Box } from "@mui/material";
import rai_image from "../About-Us-Images/Jashan Rai.jpg";
import vang_image from "../About-Us-Images/Alek Vang.jpg";
import mckenzie_image from "../About-Us-Images/James McKenzie.png";
import bradley_image from "../About-Us-Images/Brandon Bradley.jpg";
import keeler_image from "../About-Us-Images/Ben Keeler.jpg";

export default function AboutUsPage() {
  const teamMembers = [
    {
      name: "Jashan Rai",
      img: rai_image,
      major: "Computer Engineering",
      email: "jrai@csus.edu",
      linkedin: "https://www.linkedin.com/in/raijashan17/",
      github: "https://github.com/RaiJashan17",
    },
    {
      name: "James McKenzie",
      img: mckenzie_image,
      major: "Computer Engineering",
      email: "jmckenzie@csus.edu",
      linkedin: "https://www.linkedin.com/in/james-mckenzie-1083ba232/",
      github: "https://github.com/jlmkz"
    },
    {
      name: "Alekzandre Vang",
      img: vang_image,
      major: "Computer Engineering",
      email: "avang16@csus.edu",
      linkedin: "https://www.linkedin.com/in/alekzandrevang/",
      github: "https://github.com/Alekazahm",
    },
    {
      name: "Brandon Bradley",
      img: bradley_image,
      major: "Computer Engineering",
      email: "bbradley@csus.edu",
      linkedin: "https://www.linkedin.com/in/brandon-bradley-8bb196281/",
      github: "https://github.com/saywhy2me",
    },
    {
      name: "Ben Keeler",
      img: keeler_image,
      major: "Electrical Engineering",
      email: "bkeeler@csus.edu",
      linkedin: "https://www.linkedin.com/in/ben-keeler-8317a012/",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />

      {/* Team Section */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          flexWrap: "nowrap",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 3,
          p: 5,
          mt: 10,
        }}
      >
        {teamMembers.map((member) => (
          <Paper
            key={member.name}
            elevation={6}
            sx={{
              width: 250, 
              height: 320, 
              p: 2,
              borderRadius: 2,
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-around",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" gutterBottom>
              {member.name}
            </Typography>
            <img
              src={member.img}
              alt={member.name}
              width={100}
              height={100}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #e0e0e0",
              }}
            />
            <Typography variant="body2">
              {member.major}
              <br />
              <a href={`mailto:${member.email}`}>Send Email</a>
              <br />
              <a href={member.linkedin}>LinkedIn</a>
              {member.github && (
                <>
                  <br />
                  <a href={member.github}>GitHub</a>
                </>
              )}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Footer />
    </div>
  );
}
