const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Import our utilities
const TranscriptionEngine = require('./utils/transcriptionEngine');
const MedicalFormatter = require('./utils/medicalFormatter');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Initialize our engines
const transcriptionEngine = new TranscriptionEngine();
const medicalFormatter = new MedicalFormatter();

// Store active sessions
const activeSessions = new Map();

// Serve React app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Start a new session
    socket.on('start-session', (data) => {
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            doctorName: data.doctorName,
            patientId: data.patientId,
            startTime: new Date(),
            audioChunks: [],
            transcription: '',
            isActive: true
        };

        activeSessions.set(sessionId, session);
        socket.sessionId = sessionId;

        socket.emit('session-started', { sessionId });
        console.log('Session started:', sessionId);
    });

    // Handle real audio streaming
    socket.on('audio-stream', async (data) => {
        if (!socket.sessionId || !activeSessions.has(socket.sessionId)) {
            return;
        }

        const session = activeSessions.get(socket.sessionId);

        try {
            // Handle real audio data
            if (data.audioData) {
                // Convert base64 audio to buffer
                const audioBuffer = Buffer.from(data.audioData, 'base64');
                session.audioChunks.push(audioBuffer);

                // Process audio in chunks for real-time transcription
                const transcription = await transcriptionEngine.processRealAudio(audioBuffer);

                if (transcription) {
                    session.transcription += ' ' + transcription;

                    // Extract medical terms
                    const medicalNotes = medicalFormatter.extractMedicalTerms(session.transcription);

                    // Send real-time updates
                    socket.emit('transcription-update', {
                        fullTranscription: session.transcription.trim(),
                        confidence: transcriptionEngine.getConfidence(),
                        medicalNotes: medicalNotes
                    });
                }
            }
            // Handle demo mode (fallback)
            else if (data.demo) {
                const demoTranscription = transcriptionEngine.processDemoAudio();
                session.transcription += ' ' + demoTranscription;

                const medicalNotes = medicalFormatter.extractMedicalTerms(session.transcription);

                socket.emit('transcription-update', {
                    fullTranscription: session.transcription.trim(),
                    confidence: transcriptionEngine.getConfidence(),
                    medicalNotes: medicalNotes
                });
            }
        } catch (error) {
            console.error('Audio processing error:', error);
            socket.emit('error', 'Audio processing failed');
        }
    });

    // Generate SOAP notes
    socket.on('generate-soap-notes', async (sessionId) => {
        const session = activeSessions.get(sessionId);
        if (!session) {
            socket.emit('error', 'Session not found');
            return;
        }

        try {
            const soapNotes = await medicalFormatter.generateSOAPNotes(session.transcription, {
                doctorName: session.doctorName,
                patientId: session.patientId,
                sessionId: sessionId
            });

            socket.emit('soap-notes-generated', { soapNotes });
        } catch (error) {
            console.error('SOAP notes generation error:', error);
            socket.emit('error', 'Failed to generate SOAP notes');
        }
    });

    // End session
    socket.on('end-session', (sessionId) => {
        const session = activeSessions.get(sessionId);
        if (session) {
            session.isActive = false;
            session.endTime = new Date();
            activeSessions.delete(sessionId);
            console.log('Session ended:', sessionId);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.sessionId) {
            const session = activeSessions.get(socket.sessionId);
            if (session) {
                session.isActive = false;
                session.endTime = new Date();
            }
        }
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes
app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(activeSessions.values()).map(session => ({
        id: session.id,
        doctorName: session.doctorName,
        patientId: session.patientId,
        startTime: session.startTime,
        isActive: session.isActive
    }));
    res.json(sessions);
});

app.get('/api/session/:id', (req, res) => {
    const session = activeSessions.get(req.params.id);
    if (session) {
        res.json(session);
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeSessions: activeSessions.size,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 MediScribe server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🏥 Frontend: http://localhost:${PORT}`);
}); 