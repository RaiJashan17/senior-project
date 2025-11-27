import { useState } from "react";
import { TextField, Button, Paper, Typography } from "@mui/material";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../Firebase/Firebase"; 
import { doc, getDoc } from "firebase/firestore";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);
      alert("Login successful!");
      if (docSnap.exists()){
        navigate(`/dashboard?userId=${user.uid}`); 
      }else{
        navigate(`/address?userId=${user.uid}`);
      } 
    } catch (error) {
      setError(error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent. Check your inbox!");
      setError(""); // Clear any previous errors
    } catch (error) {
      setError(error.message);
      setMessage(""); // Clear success message on error
    }
  };

  return (
  <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
    <Header />
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
        <Paper elevation={6} style={{ padding: "30px", borderRadius: "10px", width: "300px" }}>
          <Typography variant="h5" align="center" gutterBottom>Login</Typography>
          
          {error && <Typography color="error">{error}</Typography>}

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
          
          <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
            Login
          </Button>

          <Button
            color="secondary"
            fullWidth
            style={{ marginTop: "10px", textTransform: "none" }}
            onClick={handleResetPassword}
          >
            Forgot Password?
          </Button>
        </Paper>
      </div>
    </div>
    <Footer />
    </div>
  );
}

export default LoginPage;

