import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import {
    Mic,
    MicOff,
    Play,
    Pause,
    FileText,
    Activity,
    Users,
    Clock,
    CheckCircle,
    AlertCircle,
    Stethoscope
} from 'lucide-react';
import './index.css';

// Connect to socket server - works for both local and Vercel deployment
const socket = io(process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000');

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [soapNotes, setSoapNotes] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [doctorName, setDoctorName] = useState('Dr. Smith');
    const [patientId, setPatientId] = useState('PT-001');
    const [confidence, setConfidence] = useState(0);
    const [medicalTerms, setMedicalTerms] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [isDemo, setIsDemo] = useState(true);

    const audioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        // Socket connection handling
        socket.on('connect', () => {
            setConnectionStatus('Connected');
        });

        socket.on('disconnect', () => {
            setConnectionStatus('Disconnected');
        });

        socket.on('session-started', (data) => {
            setSessionId(data.sessionId);
            console.log('Session started:', data.sessionId);
        });

        socket.on('transcription-update', (data) => {
            setTranscription(data.fullTranscription);
            setConfidence(data.confidence);
            if (data.medicalNotes?.extractedData) {
                const allTerms = Object.values(data.medicalNotes.extractedData).flat();
                setMedicalTerms(allTerms);
            }
        });

        socket.on('soap-notes-generated', (data) => {
            setSoapNotes(data.soapNotes);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert('Error: ' + error);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('session-started');
            socket.off('transcription-update');
            socket.off('soap-notes-generated');
            socket.off('error');
        };
    }, []);

    const startRecording = async () => {
        try {
            // Start session
            socket.emit('start-session', {
                doctorName,
                patientId
            });

            setIsRecording(true);
            setTranscription('');
            setSoapNotes(null);
            setMedicalTerms([]);

            if (isDemo) {
                // Demo mode - simulate audio streaming
                intervalRef.current = setInterval(() => {
                    socket.emit('audio-stream', { demo: true });
                }, 2000);
            } else {
                // Real audio recording (future implementation)
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        socket.emit('audio-stream', event.data);
                    }
                };

                mediaRecorderRef.current.start(1000); // Send data every second
            }

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Failed to start recording: ' + error.message);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }

        // Generate SOAP notes
        if (sessionId) {
            socket.emit('generate-soap-notes', sessionId);
        }
    };

    const endSession = () => {
        if (sessionId) {
            socket.emit('end-session', sessionId);
        }

        setSessionId(null);
        setTranscription('');
        setSoapNotes(null);
        setMedicalTerms([]);
        setConfidence(0);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Stethoscope className="h-12 w-12 text-white mr-3" />
                        <h1 className="text-4xl font-bold text-white">MediScribe MVP</h1>
                    </div>
                    <p className="text-blue-100 text-lg">Real-Time Medical Transcription & SOAP Note Generation</p>

                    {/* Connection Status */}
                    <div className="flex items-center justify-center mt-4 space-x-4">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'
                            } text-white text-sm`}>
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-200 animate-pulse' : 'bg-red-200'
                                }`}></div>
                            <span>{connectionStatus}</span>
                        </div>

                        <div className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm">
                            Demo Mode: {isDemo ? 'ON' : 'OFF'}
                        </div>
                    </div>
                </div>

                {/* Session Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="medical-card">
                        <div className="flex items-center space-x-3">
                            <Users className="h-6 w-6 text-blue-600" />
                            <div>
                                <h3 className="font-semibold text-gray-800">Doctor</h3>
                                <input
                                    type="text"
                                    value={doctorName}
                                    onChange={(e) => setDoctorName(e.target.value)}
                                    className="medical-input mt-1"
                                    disabled={isRecording}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="medical-card">
                        <div className="flex items-center space-x-3">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <div>
                                <h3 className="font-semibold text-gray-800">Patient ID</h3>
                                <input
                                    type="text"
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    className="medical-input mt-1"
                                    disabled={isRecording}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="medical-card">
                        <div className="flex items-center space-x-3">
                            <Activity className="h-6 w-6 text-blue-600" />
                            <div>
                                <h3 className="font-semibold text-gray-800">Session Status</h3>
                                <div className="mt-1 text-sm">
                                    {sessionId ? (
                                        <span className="text-green-600 font-medium">Active: {sessionId}</span>
                                    ) : (
                                        <span className="text-gray-500">No active session</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recording Controls */}
                <div className="medical-card mb-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recording Controls</h2>

                        <div className="flex justify-center space-x-4">
                            {!isRecording ? (
                                <button
                                    onClick={startRecording}
                                    className="medical-button flex items-center space-x-2"
                                >
                                    <Mic className="h-5 w-5" />
                                    <span>Start Recording</span>
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                                >
                                    <MicOff className="h-5 w-5" />
                                    <span>Stop Recording</span>
                                </button>
                            )}

                            {sessionId && (
                                <button
                                    onClick={endSession}
                                    className="medical-button-secondary flex items-center space-x-2"
                                >
                                    <CheckCircle className="h-5 w-5" />
                                    <span>End Session</span>
                                </button>
                            )}
                        </div>

                        {isRecording && (
                            <div className="mt-4 flex items-center justify-center space-x-3">
                                <div className="recording-indicator flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                    <span>Recording in Progress</span>
                                </div>

                                {confidence > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600">Confidence:</span>
                                        <div className="confidence-bar w-20">
                                            <div
                                                className="confidence-fill"
                                                style={{ width: `${confidence * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm text-gray-600">{Math.round(confidence * 100)}%</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Real-time Transcription */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="medical-card">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <Activity className="h-5 w-5" />
                            <span>Live Transcription</span>
                        </h3>

                        <div className="transcription-box">
                            {transcription || 'Transcription will appear here as you speak...'}
                        </div>

                        {medicalTerms.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-700 mb-2">Medical Terms Detected:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {medicalTerms.map((term, index) => (
                                        <span key={index} className="medical-badge">
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SOAP Notes */}
                    <div className="medical-card">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>SOAP Notes</span>
                        </h3>

                        {soapNotes ? (
                            <div className="soap-notes space-y-4">
                                <div>
                                    <h4 className="font-semibold text-blue-800">Subjective:</h4>
                                    <p className="text-sm text-gray-700">{soapNotes.subjective.chiefComplaint}</p>
                                    <p className="text-sm text-gray-600 mt-1">{soapNotes.subjective.historyOfPresentIllness}</p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-blue-800">Objective:</h4>
                                    <p className="text-sm text-gray-700">{soapNotes.objective.physicalExamination}</p>
                                    {Object.keys(soapNotes.objective.vitalSigns).length > 0 && (
                                        <div className="mt-1">
                                            <span className="text-xs text-gray-600">Vitals: </span>
                                            {Object.entries(soapNotes.objective.vitalSigns).map(([key, value]) => (
                                                <span key={key} className="text-xs text-gray-700 mr-2">
                                                    {key}: {value}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="font-semibold text-blue-800">Assessment:</h4>
                                    <p className="text-sm text-gray-700">{soapNotes.assessment.primaryDiagnosis}</p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-blue-800">Plan:</h4>
                                    <p className="text-sm text-gray-700">{soapNotes.plan.immediateActions}</p>
                                </div>

                                <div className="pt-3 border-t border-blue-200">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Generated: {new Date(soapNotes.generatedAt).toLocaleString()}</span>
                                        <span>Confidence: {Math.round(soapNotes.confidence * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                <p>SOAP notes will be generated after recording</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Demo Instructions */}
                <div className="medical-card mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">MVP Demo Instructions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-blue-800 mb-2">How to Use:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                <li>Enter doctor name and patient ID</li>
                                <li>Click "Start Recording" to begin session</li>
                                <li>Watch real-time transcription appear (simulated medical conversation)</li>
                                <li>Medical terms are automatically detected and highlighted</li>
                                <li>Click "Stop Recording" to generate SOAP notes</li>
                                <li>Review formatted clinical documentation</li>
                            </ol>
                        </div>

                        <div>
                            <h4 className="font-semibold text-blue-800 mb-2">MVP Features Demonstrated:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                <li>Real-time audio processing simulation</li>
                                <li>Medical terminology recognition</li>
                                <li>Automatic SOAP note formatting</li>
                                <li>Confidence scoring for transcriptions</li>
                                <li>Session management and tracking</li>
                                <li>Professional medical interface</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                                <h5 className="font-semibold text-yellow-800">MVP Note:</h5>
                                <p className="text-sm text-yellow-700 mt-1">
                                    This demo simulates real-time transcription with sample medical conversations.
                                    In the full product, this would integrate with actual audio input, EMR systems,
                                    and advanced AI models for production-quality medical transcription.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App; 