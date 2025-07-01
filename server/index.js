const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Medical terminology and formatting utilities
const MedicalFormatter = require('./utils/medicalFormatter');
const TranscriptionEngine = require('./utils/transcriptionEngine');

const medicalFormatter = new MedicalFormatter();
const transcriptionEngine = new TranscriptionEngine();

// Store active sessions
const activeSessions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Doctor connected:', socket.id);

    // Start new transcription session
    socket.on('start-session', (sessionData) => {
        const sessionId = Date.now().toString();
        activeSessions.set(sessionId, {
            socketId: socket.id,
            doctorName: sessionData.doctorName,
            patientId: sessionData.patientId,
            startTime: new Date(),
            transcription: '',
            medicalNotes: {}
        });

        socket.emit('session-started', { sessionId });
        console.log(`Session started: ${sessionId} for Dr. ${sessionData.doctorName}`);
    });

    // Handle real-time audio streaming
    socket.on('audio-stream', async (audioData) => {
        try {
            // Find session for this socket
            const session = Array.from(activeSessions.values())
                .find(s => s.socketId === socket.id);

            if (!session) {
                socket.emit('error', 'No active session found');
                return;
            }

            // Process audio through transcription engine
            const transcriptionResult = await transcriptionEngine.processAudio(audioData);

            if (transcriptionResult.text) {
                // Update session transcription
                session.transcription += transcriptionResult.text + ' ';

                // Format medical notes in real-time
                const medicalNotes = await medicalFormatter.formatTranscription(
                    session.transcription
                );

                session.medicalNotes = medicalNotes;

                // Send real-time updates to frontend
                socket.emit('transcription-update', {
                    text: transcriptionResult.text,
                    fullTranscription: session.transcription,
                    medicalNotes: medicalNotes,
                    confidence: transcriptionResult.confidence
                });
            }
        } catch (error) {
            console.error('Audio processing error:', error);
            socket.emit('error', 'Failed to process audio');
        }
    });

    // Generate final SOAP notes
    socket.on('generate-soap-notes', async (sessionId) => {
        try {
            const session = activeSessions.get(sessionId);
            if (!session) {
                socket.emit('error', 'Session not found');
                return;
            }

            const soapNotes = await medicalFormatter.generateSOAPNotes(
                session.transcription,
                session.medicalNotes
            );

            socket.emit('soap-notes-generated', {
                sessionId,
                soapNotes,
                session: session
            });

        } catch (error) {
            console.error('SOAP generation error:', error);
            socket.emit('error', 'Failed to generate SOAP notes');
        }
    });

    // End session
    socket.on('end-session', (sessionId) => {
        const session = activeSessions.get(sessionId);
        if (session) {
            session.endTime = new Date();
            console.log(`Session ended: ${sessionId}`);

            // In a real system, save to hospital database here
            socket.emit('session-ended', {
                sessionId,
                duration: session.endTime - session.startTime,
                summary: session.medicalNotes
            });

            activeSessions.delete(sessionId);
        }
    });

    socket.on('disconnect', () => {
        console.log('Doctor disconnected:', socket.id);
        // Clean up any active sessions for this socket
        for (const [sessionId, session] of activeSessions.entries()) {
            if (session.socketId === socket.id) {
                activeSessions.delete(sessionId);
            }
        }
    });
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeSessions: activeSessions.size,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
        sessionId: id,
        doctorName: session.doctorName,
        patientId: session.patientId,
        startTime: session.startTime,
        duration: new Date() - session.startTime
    }));

    res.json({ sessions });
});

// Demo endpoint for testing
app.post('/api/demo-transcription', async (req, res) => {
    try {
        const { text } = req.body;
        const medicalNotes = await medicalFormatter.formatTranscription(text);
        const soapNotes = await medicalFormatter.generateSOAPNotes(text, medicalNotes);

        res.json({
            originalText: text,
            medicalNotes,
            soapNotes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🏥 MediScribe Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
}); 