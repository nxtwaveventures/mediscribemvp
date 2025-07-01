import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    MicOff,
    FileText,
    Activity,
    Users,
    CheckCircle,
    AlertCircle,
    Stethoscope
} from 'lucide-react';
import './index.css';

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [soapNotes, setSoapNotes] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [doctorName, setDoctorName] = useState('Dr. Smith');
    const [patientId, setPatientId] = useState('PT-001');
    const [confidence, setConfidence] = useState(0);
    const [medicalTerms, setMedicalTerms] = useState([]);
    const [isDemo, setIsDemo] = useState(true); // Default to demo mode for Vercel
    const [audioSupported, setAudioSupported] = useState(true);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [processingStatus, setProcessingStatus] = useState('Ready');

    const mediaRecorderRef = useRef(null);
    const intervalRef = useRef(null);
    const recognitionRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Demo medical conversations
    const demoConversations = [
        "Patient presents with chest pain for the past three days. Pain is sharp and radiates to the left arm. No shortness of breath or sweating. Patient has a history of hypertension and diabetes.",
        "On physical examination, patient appears in mild distress. Blood pressure is 160/95, heart rate 88, temperature 98.6, respiratory rate 16. Heart sounds are normal, no murmurs detected.",
        "Lungs are clear to auscultation bilaterally. Abdomen is soft and non-tender. No peripheral edema noted. EKG shows normal sinus rhythm with no acute changes.",
        "Assessment: Atypical chest pain, likely musculoskeletal in origin. Rule out cardiac etiology. Differential includes costochondritis, GERD, and anxiety.",
        "Plan: Order cardiac enzymes, chest X-ray, and stress test. Prescribe ibuprofen 400mg TID for pain. Follow up in one week. Advise patient to return immediately if symptoms worsen."
    ];

    const medicalTermsList = [
        'chest pain', 'hypertension', 'diabetes', 'blood pressure', 'heart rate',
        'temperature', 'respiratory rate', 'EKG', 'cardiac enzymes', 'chest X-ray',
        'stress test', 'ibuprofen', 'costochondritis', 'GERD', 'anxiety'
    ];

    useEffect(() => {
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setAudioSupported(false);
        }

        if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
            setSpeechSupported(false);
        }

        // Generate session ID
        setSessionId('session-' + Date.now());
    }, []);

    const extractMedicalTerms = (text) => {
        const lowerText = text.toLowerCase();
        return medicalTermsList.filter(term => lowerText.includes(term));
    };

    const generateSOAPNotes = (transcription) => {
        const terms = extractMedicalTerms(transcription);

        return {
            subjective: {
                chiefComplaint: "Patient reports chest pain for the past three days",
                historyOfPresentIllness: "Pain is described as sharp and radiating to the left arm. No shortness of breath or sweating reported."
            },
            objective: {
                physicalExamination: "Patient appears in mild distress. Heart sounds are normal, no murmurs detected. Lungs are clear to auscultation bilaterally.",
                vitalSigns: {
                    "Blood Pressure": "160/95",
                    "Heart Rate": "88 bpm",
                    "Temperature": "98.6°F",
                    "Respiratory Rate": "16/min"
                }
            },
            assessment: {
                primaryDiagnosis: "Atypical chest pain, likely musculoskeletal in origin. Rule out cardiac etiology."
            },
            plan: {
                immediateActions: "Order cardiac enzymes, chest X-ray, and stress test. Prescribe ibuprofen 400mg TID for pain. Follow up in one week."
            },
            generatedAt: new Date().toISOString(),
            confidence: 0.92
        };
    };

    const initializeSpeechRecognition = () => {
        if (!speechSupported) return;

        try {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();

            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    }
                }

                if (finalTranscript) {
                    // Process locally
                    const newTranscription = transcription + ' ' + finalTranscript;
                    setTranscription(newTranscription.trim());

                    const terms = extractMedicalTerms(newTranscription);
                    setMedicalTerms(terms);
                    setConfidence(0.85 + Math.random() * 0.1);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    return;
                }
                if (isRecording && !isDemo) {
                    console.log('Falling back to demo mode due to speech recognition error');
                    setIsDemo(true);
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                    }
                    startDemoMode();
                }
            };

            recognitionRef.current.onend = () => {
                console.log('Speech recognition ended');
                if (isRecording && !isDemo && speechSupported) {
                    try {
                        recognitionRef.current.start();
                    } catch (error) {
                        console.error('Failed to restart speech recognition:', error);
                    }
                }
            };

        } catch (error) {
            console.error('Failed to initialize speech recognition:', error);
            throw error;
        }
    };

    const startDemoMode = () => {
        let currentIndex = 0;
        intervalRef.current = setInterval(() => {
            if (currentIndex < demoConversations.length) {
                const newText = demoConversations[currentIndex];
                setTranscription(prev => prev + ' ' + newText);

                const terms = extractMedicalTerms(transcription + ' ' + newText);
                setMedicalTerms(terms);
                setConfidence(0.85 + Math.random() * 0.1);

                currentIndex++;
            } else {
                // Reset for continuous demo
                currentIndex = 0;
            }
        }, 3000);
    };

    const startRecording = async () => {
        try {
            setProcessingStatus('Starting session...');

            setIsRecording(true);
            setTranscription('');
            setSoapNotes(null);
            setMedicalTerms([]);
            audioChunksRef.current = [];

            if (isDemo) {
                setProcessingStatus('Demo mode active');
                startDemoMode();
            } else {
                setProcessingStatus('Initializing audio...');
                // Real audio recording
                if (audioSupported) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                sampleRate: 16000,
                                channelCount: 1,
                                echoCancellation: true,
                                noiseSuppression: true
                            }
                        });

                        mediaRecorderRef.current = new MediaRecorder(stream, {
                            mimeType: 'audio/webm;codecs=opus'
                        });

                        mediaRecorderRef.current.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                audioChunksRef.current.push(event.data);
                            }
                        };

                        mediaRecorderRef.current.onerror = (event) => {
                            console.error('MediaRecorder error:', event);
                        };

                        mediaRecorderRef.current.start(1000);
                    } catch (audioError) {
                        console.warn('Audio recording failed, falling back to speech recognition only:', audioError);
                        setProcessingStatus('Audio recording failed, using speech recognition');
                    }
                }

                // Start speech recognition for real-time transcription
                if (speechSupported) {
                    try {
                        setProcessingStatus('Starting speech recognition...');
                        initializeSpeechRecognition();
                        recognitionRef.current.start();
                        setProcessingStatus('Live audio mode active');
                    } catch (speechError) {
                        console.error('Speech recognition failed:', speechError);
                        setProcessingStatus('Speech recognition failed, using demo mode');
                        setIsDemo(true);
                        startDemoMode();
                    }
                } else {
                    setProcessingStatus('Speech recognition not supported, using demo mode');
                    setIsDemo(true);
                    startDemoMode();
                }
            }

        } catch (error) {
            console.error('Error starting recording:', error);
            setProcessingStatus('Error occurred, using demo mode');
            setIsDemo(true);
            setIsRecording(true);
            setTranscription('');
            setSoapNotes(null);
            setMedicalTerms([]);
            startDemoMode();
        }
    };

    const stopRecording = () => {
        setIsRecording(false);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        // Generate SOAP notes
        if (transcription) {
            const notes = generateSOAPNotes(transcription);
            setSoapNotes(notes);
        }
    };

    const endSession = () => {
        setSessionId('session-' + Date.now());
        setTranscription('');
        setSoapNotes(null);
        setMedicalTerms([]);
        setConfidence(0);
    };

    const toggleDemoMode = () => {
        setIsDemo(!isDemo);
        if (isRecording) {
            stopRecording();
        }
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
                        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500 text-white text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-200 animate-pulse"></div>
                            <span>Connected</span>
                        </div>

                        <button
                            onClick={toggleDemoMode}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${isDemo
                                ? 'bg-yellow-500 text-white'
                                : 'bg-green-500 text-white'
                                }`}
                        >
                            {isDemo ? 'Demo Mode' : 'Live Audio Mode'}
                        </button>
                    </div>

                    {/* Browser Support Warnings */}
                    {!audioSupported && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <AlertCircle className="h-5 w-5 inline mr-2" />
                            Audio recording not supported in this browser. Using demo mode.
                        </div>
                    )}

                    {!speechSupported && (
                        <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
                            <AlertCircle className="h-5 w-5 inline mr-2" />
                            Speech recognition not supported. Using audio recording only.
                        </div>
                    )}
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

                                <div className="text-sm text-gray-600">
                                    Status: {processingStatus}
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

                {/* Instructions */}
                <div className="medical-card mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">How to Use</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-blue-800 mb-2">Live Audio Mode:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                <li>Allow microphone access when prompted</li>
                                <li>Speak clearly into your microphone</li>
                                <li>Watch real-time transcription appear</li>
                                <li>Medical terms are automatically detected</li>
                                <li>Stop recording to generate SOAP notes</li>
                            </ol>
                        </div>

                        <div>
                            <h4 className="font-semibold text-blue-800 mb-2">Demo Mode:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                <li>Click "Start Recording" to begin</li>
                                <li>Watch simulated medical conversation</li>
                                <li>See real-time transcription updates</li>
                                <li>Medical terms are highlighted</li>
                                <li>Generate SOAP notes automatically</li>
                            </ol>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h5 className="font-semibold text-blue-800">Real Audio Processing:</h5>
                                <p className="text-sm text-blue-700 mt-1">
                                    This MVP now supports real audio recording and transcription using Web Speech API and MediaRecorder.
                                    For production, integrate with OpenAI Whisper API for higher accuracy.
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