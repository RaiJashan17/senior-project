import { useState } from "react";
import { Paper, TextField, Button, Typography } from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../Firebase/Firebase"; 
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setSuccess("Account created successfully!");
      const user = userCredential.user;
      setError(""); // Clear previous errors
      navigate(`/address?userId=${user.uid}`);
    } catch (error) {
      setError(error.message);
      setSuccess(""); // Clear success message on error
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
        <Paper elevation={6} style={{ padding: "30px", borderRadius: "10px", width: "350px" }}>
          <Typography variant="h5" align="center" gutterBottom>Sign Up</Typography>
          
          {error && <Typography color="error">{error}</Typography>}
          {success && <Typography color="primary">{success}</Typography>}

          <TextField
            label="Email"
            fullWidth
            margin="normal"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            margin="normal"
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />


          <Button variant="contained" color="primary" fullWidth onClick={handleSignUp}>
            Sign Up
          </Button>
        </Paper>
      </div>
      <Footer />
    </div>
  );
}


