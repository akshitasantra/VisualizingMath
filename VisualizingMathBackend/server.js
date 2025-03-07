require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const sgMail = require('@sendgrid/mail');
app.use(cors());
app.use(bodyParser.json());

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Define User Schema
const UserSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', UserSchema);

// Signup Route
app.post('/signup', async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ firstname, lastname, email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: "✅ User registered successfully!" });
    } catch (error) {
        res.status(500).json({ message: "❌ Server error", error });
    }
});

// Sample route for login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Received login credentials:', { email, password });

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Compare the entered password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // If passwords match, generate a JWT token (optional)
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({
            message: 'Login successful',
            token, // You can return the token if you are using it for authentication
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '❌ Server error', error });
    }
});


// Forgot Password Route
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create a JWT token that will be used to verify the password reset request
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Create the reset password URL with the token
        const resetUrl = `http://localhost:8080/reset-password.html?email=${email}&token=${token}`;

        // Send the email with the reset link
        const msg = {
            to: email,
            from: 'akshitasantra@gmail.com', // Use a verified email address from your SendGrid account
            subject: 'Password Reset Request',
            text: 'Click the link below to reset your password.',
            html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
        };

        await sgMail.send(msg);
        res.json({ message: 'Password reset email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Error sending email' });
    }
});

// Reset password route
// Reset password route
app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid or expired reset token' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

