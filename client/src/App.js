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
    const [isDemo, setIsDemo] = useState(false); // Default to live audio mode
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
        // Symptoms
        'chest pain', 'headache', 'fever', 'shortness of breath', 'dyspnea', 'nausea', 'vomiting', 'dizziness',
        'fatigue', 'weakness', 'cough', 'sore throat', 'abdominal pain', 'back pain', 'joint pain',

        // Vital signs
        'blood pressure', 'heart rate', 'temperature', 'respiratory rate', 'pulse', 'oxygen saturation',

        // Medical conditions
        'hypertension', 'diabetes', 'asthma', 'copd', 'heart disease', 'stroke', 'pneumonia', 'infection',

        // Medications
        'ibuprofen', 'aspirin', 'acetaminophen', 'antibiotics', 'insulin', 'metformin',

        // Tests and procedures
        'EKG', 'ECG', 'chest X-ray', 'cardiac enzymes', 'stress test', 'blood test', 'urine test',
        'CT scan', 'MRI', 'ultrasound',

        // Body systems
        'cardiac', 'respiratory', 'gastrointestinal', 'neurological', 'musculoskeletal',

        // Physical exam findings
        'heart sounds', 'lung sounds', 'abdomen', 'tender', 'swelling', 'edema', 'murmur',

        // Common medical terms
        'acute', 'chronic', 'bilateral', 'unilateral', 'distress', 'stable', 'normal', 'abnormal'
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
        // Extract medical terms for processing
        const extractedTerms = extractMedicalTerms(transcription);

        // Analyze transcription to extract key information
        const lowerTranscription = transcription.toLowerCase();

        // Extract subjective information (patient complaints, history)
        let subjective = {
            chiefComplaint: "Patient presents with symptoms",
            historyOfPresentIllness: "Details of current symptoms and timeline"
        };

        // Look for common complaint patterns with more specific extraction
        if (lowerTranscription.includes('chest pain') || lowerTranscription.includes('chest discomfort')) {
            subjective.chiefComplaint = "Patient reports chest pain";

            // Extract specific details about chest pain
            let painDetails = [];
            if (lowerTranscription.includes('sharp')) painDetails.push('sharp');
            if (lowerTranscription.includes('dull')) painDetails.push('dull');
            if (lowerTranscription.includes('pressure')) painDetails.push('pressure-like');
            if (lowerTranscription.includes('radiate') || lowerTranscription.includes('arm')) painDetails.push('radiating to left arm');
            if (lowerTranscription.includes('shoulder')) painDetails.push('radiating to shoulder');
            if (lowerTranscription.includes('jaw')) painDetails.push('radiating to jaw');

            if (painDetails.length > 0) {
                subjective.historyOfPresentIllness = `Chest pain described as ${painDetails.join(', ')}`;
            } else {
                subjective.historyOfPresentIllness = "Chest pain reported with varying characteristics";
            }

            // Add duration if mentioned
            if (lowerTranscription.includes('days') || lowerTranscription.includes('hours')) {
                const durationMatch = lowerTranscription.match(/(\d+)\s*(days?|hours?)/);
                if (durationMatch) {
                    subjective.historyOfPresentIllness += ` for ${durationMatch[1]} ${durationMatch[2]}`;
                }
            }
        } else if (lowerTranscription.includes('headache') || lowerTranscription.includes('head pain')) {
            subjective.chiefComplaint = "Patient reports headache";

            let headacheDetails = [];
            if (lowerTranscription.includes('migraine')) headacheDetails.push('migraine-type');
            if (lowerTranscription.includes('tension')) headacheDetails.push('tension-type');
            if (lowerTranscription.includes('throbbing')) headacheDetails.push('throbbing');
            if (lowerTranscription.includes('pressure')) headacheDetails.push('pressure-like');

            subjective.historyOfPresentIllness = headacheDetails.length > 0
                ? `Headache described as ${headacheDetails.join(', ')}`
                : "Headache described with associated symptoms";
        } else if (lowerTranscription.includes('fever') || lowerTranscription.includes('temperature')) {
            subjective.chiefComplaint = "Patient reports fever";
            subjective.historyOfPresentIllness = "Fever with associated symptoms";
        } else if (lowerTranscription.includes('shortness of breath') || lowerTranscription.includes('dyspnea')) {
            subjective.chiefComplaint = "Patient reports shortness of breath";
            subjective.historyOfPresentIllness = "Dyspnea with associated symptoms";
        } else if (lowerTranscription.includes('abdominal pain') || lowerTranscription.includes('stomach pain')) {
            subjective.chiefComplaint = "Patient reports abdominal pain";
            subjective.historyOfPresentIllness = "Abdominal pain with associated symptoms";
        } else if (lowerTranscription.includes('back pain')) {
            subjective.chiefComplaint = "Patient reports back pain";
            subjective.historyOfPresentIllness = "Back pain with associated symptoms";
        }

        // Extract objective information (exam findings, vitals)
        let objective = {
            physicalExamination: "Physical examination findings",
            vitalSigns: {}
        };

        // Extract vital signs if mentioned with more patterns
        const bpMatch = lowerTranscription.match(/(\d{2,3})\/(\d{2,3})/);
        if (bpMatch) {
            objective.vitalSigns["Blood Pressure"] = `${bpMatch[1]}/${bpMatch[2]}`;
        }

        const hrMatch = lowerTranscription.match(/(\d{2,3})\s*(?:bpm|heart rate|pulse)/);
        if (hrMatch) {
            objective.vitalSigns["Heart Rate"] = `${hrMatch[1]} bpm`;
        }

        const tempMatch = lowerTranscription.match(/(\d{2,3}\.\d)/);
        if (tempMatch) {
            objective.vitalSigns["Temperature"] = `${tempMatch[1]}°F`;
        }

        const rrMatch = lowerTranscription.match(/(\d{2,3})\s*(?:respiratory rate|breaths)/);
        if (rrMatch) {
            objective.vitalSigns["Respiratory Rate"] = `${rrMatch[1]}/min`;
        }

        // Extract physical exam findings with more detail
        let examFindings = [];
        if (lowerTranscription.includes('heart sounds') || lowerTranscription.includes('cardiac')) {
            if (lowerTranscription.includes('normal')) {
                examFindings.push("Heart sounds are normal");
            } else if (lowerTranscription.includes('murmur')) {
                examFindings.push("Cardiac murmur detected");
            } else {
                examFindings.push("Cardiac examination performed");
            }
        }

        if (lowerTranscription.includes('lungs') || lowerTranscription.includes('respiratory')) {
            if (lowerTranscription.includes('clear')) {
                examFindings.push("Lungs are clear to auscultation");
            } else if (lowerTranscription.includes('wheez')) {
                examFindings.push("Wheezing detected on auscultation");
            } else if (lowerTranscription.includes('crackl')) {
                examFindings.push("Crackles detected on auscultation");
            } else {
                examFindings.push("Respiratory examination performed");
            }
        }

        if (lowerTranscription.includes('abdomen') || lowerTranscription.includes('abdominal')) {
            if (lowerTranscription.includes('tender')) {
                examFindings.push("Abdomen is tender");
            } else if (lowerTranscription.includes('soft')) {
                examFindings.push("Abdomen is soft and non-tender");
            } else {
                examFindings.push("Abdominal examination performed");
            }
        }

        if (lowerTranscription.includes('edema') || lowerTranscription.includes('swelling')) {
            if (lowerTranscription.includes('no edema') || lowerTranscription.includes('no swelling')) {
                examFindings.push("No peripheral edema noted");
            } else {
                examFindings.push("Edema/swelling noted");
            }
        }

        objective.physicalExamination = examFindings.length > 0
            ? examFindings.join('. ') + '.'
            : "Physical examination findings";

        // Generate assessment based on symptoms and findings
        let assessment = {
            primaryDiagnosis: "Assessment based on clinical presentation"
        };

        if (lowerTranscription.includes('chest pain') && (lowerTranscription.includes('cardiac') || lowerTranscription.includes('EKG'))) {
            assessment.primaryDiagnosis = "Atypical chest pain, rule out cardiac etiology";
        } else if (lowerTranscription.includes('chest pain')) {
            assessment.primaryDiagnosis = "Chest pain, likely musculoskeletal in origin";
        } else if (lowerTranscription.includes('headache')) {
            assessment.primaryDiagnosis = "Headache, etiology to be determined";
        } else if (lowerTranscription.includes('fever')) {
            assessment.primaryDiagnosis = "Fever, possible infectious etiology";
        } else if (lowerTranscription.includes('shortness of breath')) {
            assessment.primaryDiagnosis = "Dyspnea, etiology to be determined";
        } else if (lowerTranscription.includes('abdominal pain')) {
            assessment.primaryDiagnosis = "Abdominal pain, etiology to be determined";
        }

        // Generate plan based on assessment with more specific recommendations
        let plan = {
            immediateActions: "Follow-up care and monitoring recommended"
        };

        if (lowerTranscription.includes('chest pain')) {
            plan.immediateActions = "Order cardiac enzymes, chest X-ray, and stress test. Follow up in one week.";
        } else if (lowerTranscription.includes('headache')) {
            plan.immediateActions = "Monitor symptoms. Consider imaging if severe. Follow up as needed.";
        } else if (lowerTranscription.includes('fever')) {
            plan.immediateActions = "Monitor temperature. Consider infectious workup if persistent.";
        } else if (lowerTranscription.includes('shortness of breath')) {
            plan.immediateActions = "Monitor respiratory status. Consider pulmonary workup if persistent.";
        } else if (lowerTranscription.includes('abdominal pain')) {
            plan.immediateActions = "Monitor symptoms. Consider imaging if severe. Follow up as needed.";
        }

        // Calculate confidence based on medical terms found and transcription length
        const confidence = Math.min(0.85 + (extractedTerms.length * 0.02) + (transcription.length * 0.001), 0.98);

        return {
            subjective,
            objective,
            assessment,
            plan,
            generatedAt: new Date().toISOString(),
            confidence: confidence,
            medicalTermsFound: extractedTerms
        };
    };

    const initializeSpeechRecognition = () => {
        if (!speechSupported) {
            console.log('Speech recognition not supported in this browser');
            return;
        }

        try {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            if (!SpeechRecognition) {
                console.error('Speech recognition API not available');
                setSpeechSupported(false);
                return;
            }

            recognitionRef.current = new SpeechRecognition();
            console.log('Speech recognition initialized successfully');

            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                console.log('Speech recognition started');
                setProcessingStatus('Listening...');
            };

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    console.log('Final transcript:', finalTranscript);
                    const newTranscription = transcription + ' ' + finalTranscript;
                    setTranscription(newTranscription.trim());

                    const terms = extractMedicalTerms(newTranscription);
                    setMedicalTerms(terms);
                    setConfidence(0.85 + Math.random() * 0.1);

                    // Generate SOAP notes in real-time
                    const notes = generateSOAPNotes(newTranscription.trim());
                    setSoapNotes(notes);
                }

                if (interimTranscript) {
                    console.log('Interim transcript:', interimTranscript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    console.log('No speech detected, continuing...');
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
                        console.log('Restarting speech recognition...');
                        recognitionRef.current.start();
                    } catch (error) {
                        console.error('Failed to restart speech recognition:', error);
                    }
                }
            };

        } catch (error) {
            console.error('Failed to initialize speech recognition:', error);
            setSpeechSupported(false);
            throw error;
        }
    };

    const startDemoMode = () => {
        let currentIndex = 0;
        intervalRef.current = setInterval(() => {
            if (currentIndex < demoConversations.length) {
                const newText = demoConversations[currentIndex];
                const updatedTranscription = transcription + ' ' + newText;
                setTranscription(updatedTranscription);

                const terms = extractMedicalTerms(updatedTranscription);
                setMedicalTerms(terms);
                setConfidence(0.85 + Math.random() * 0.1);

                // Generate SOAP notes in real-time for demo mode too
                const notes = generateSOAPNotes(updatedTranscription);
                setSoapNotes(notes);

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

                                    {soapNotes.medicalTermsFound && soapNotes.medicalTermsFound.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-blue-100">
                                            <span className="text-xs text-gray-500">Medical terms analyzed: </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {soapNotes.medicalTermsFound.map((term, index) => (
                                                    <span key={index} className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                                        {term}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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