class MedicalFormatter {
    constructor() {
        this.medicalTerms = {
            symptoms: ['pain', 'shortness of breath', 'nausea', 'dizziness', 'fatigue'],
            conditions: ['hypertension', 'diabetes', 'cardiac', 'respiratory'],
            medications: ['aspirin', 'nitroglycerin', 'metformin', 'lisinopril'],
            procedures: ['EKG', 'X-ray', 'blood test', 'ultrasound'],
            vitals: ['blood pressure', 'heart rate', 'temperature', 'oxygen saturation']
        };
    }

    async formatTranscription(transcriptionText) {
        const medicalNotes = {
            timestamp: new Date().toISOString(),
            rawTranscription: transcriptionText,
            extractedData: this.extractMedicalData(transcriptionText),
            structuredNotes: this.createStructuredNotes(transcriptionText)
        };

        return medicalNotes;
    }

    extractMedicalData(text) {
        const lowerText = text.toLowerCase();
        const extracted = {
            symptoms: [],
            conditions: [],
            medications: [],
            procedures: [],
            vitals: {}
        };

        // Extract symptoms
        this.medicalTerms.symptoms.forEach(symptom => {
            if (lowerText.includes(symptom)) {
                extracted.symptoms.push(symptom);
            }
        });

        // Extract conditions
        this.medicalTerms.conditions.forEach(condition => {
            if (lowerText.includes(condition)) {
                extracted.conditions.push(condition);
            }
        });

        // Extract medications
        this.medicalTerms.medications.forEach(medication => {
            if (lowerText.includes(medication)) {
                extracted.medications.push(medication);
            }
        });

        // Extract procedures
        this.medicalTerms.procedures.forEach(procedure => {
            if (lowerText.includes(procedure)) {
                extracted.procedures.push(procedure);
            }
        });

        // Extract vital signs with basic pattern matching
        const vitalsPatterns = {
            bloodPressure: /(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i,
            heartRate: /(\d{2,3})\s*(?:beats per minute|bpm)/i,
            temperature: /(\d{2,3}(?:\.\d)?)\s*(?:degrees|°)/i
        };

        Object.entries(vitalsPatterns).forEach(([vital, pattern]) => {
            const match = text.match(pattern);
            if (match) {
                extracted.vitals[vital] = match[0];
            }
        });

        return extracted;
    }

    createStructuredNotes(text) {
        // Basic structure for medical notes
        return {
            chiefComplaint: this.extractChiefComplaint(text),
            historyOfPresentIllness: this.extractHPI(text),
            pastMedicalHistory: this.extractPMH(text),
            medications: this.extractCurrentMedications(text),
            physicalExam: this.extractPhysicalExam(text),
            assessment: this.extractAssessment(text),
            plan: this.extractPlan(text)
        };
    }

    extractChiefComplaint(text) {
        const patterns = [
            /patient (?:reports|complains of|presents with) (.+?)(?:\.|,|that|who)/i,
            /chief complaint:?\s*(.+?)(?:\.|,|\n)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return "Chief complaint not clearly identified";
    }

    extractHPI(text) {
        const hpiKeywords = ['started', 'began', 'described as', 'radiating', 'worsens', 'improves'];
        const sentences = text.split(/[.!?]+/);

        const hpiSentences = sentences.filter(sentence =>
            hpiKeywords.some(keyword =>
                sentence.toLowerCase().includes(keyword)
            )
        );

        return hpiSentences.join('. ').trim() || "History of present illness to be documented";
    }

    extractPMH(text) {
        const pmhKeywords = ['history of', 'past medical', 'previous', 'diagnosed with'];
        const sentences = text.split(/[.!?]+/);

        const pmhSentences = sentences.filter(sentence =>
            pmhKeywords.some(keyword =>
                sentence.toLowerCase().includes(keyword)
            )
        );

        return pmhSentences.join('. ').trim() || "Past medical history to be reviewed";
    }

    extractCurrentMedications(text) {
        const medications = [];
        this.medicalTerms.medications.forEach(med => {
            if (text.toLowerCase().includes(med)) {
                medications.push(med);
            }
        });

        return medications.length > 0 ? medications.join(', ') : "Current medications to be reviewed";
    }

    extractPhysicalExam(text) {
        const examFindings = [];
        const vitalPatterns = /(?:blood pressure|heart rate|temperature).+?(?:\.|,)/gi;
        const matches = text.match(vitalPatterns);

        if (matches) {
            examFindings.push(...matches);
        }

        return examFindings.join(', ') || "Physical examination findings to be documented";
    }

    extractAssessment(text) {
        // Look for diagnostic thinking
        const assessmentKeywords = ['diagnosis', 'likely', 'suggests', 'consistent with'];
        const sentences = text.split(/[.!?]+/);

        const assessmentSentences = sentences.filter(sentence =>
            assessmentKeywords.some(keyword =>
                sentence.toLowerCase().includes(keyword)
            )
        );

        return assessmentSentences.join('. ').trim() || "Clinical assessment pending";
    }

    extractPlan(text) {
        const planKeywords = ['recommend', 'will', 'plan', 'follow up', 'order', 'start'];
        const sentences = text.split(/[.!?]+/);

        const planSentences = sentences.filter(sentence =>
            planKeywords.some(keyword =>
                sentence.toLowerCase().includes(keyword)
            )
        );

        return planSentences.join('. ').trim() || "Treatment plan to be determined";
    }

    async generateSOAPNotes(transcription, medicalNotes) {
        const structuredNotes = medicalNotes.structuredNotes;
        const extractedData = medicalNotes.extractedData;

        return {
            subjective: {
                chiefComplaint: structuredNotes.chiefComplaint,
                historyOfPresentIllness: structuredNotes.historyOfPresentIllness,
                pastMedicalHistory: structuredNotes.pastMedicalHistory,
                medications: structuredNotes.medications,
                allergies: "NKDA (No Known Drug Allergies)",
                socialHistory: "To be documented"
            },
            objective: {
                vitalSigns: extractedData.vitals,
                physicalExamination: structuredNotes.physicalExam,
                laboratoryResults: "Pending",
                imagingResults: "Pending"
            },
            assessment: {
                primaryDiagnosis: structuredNotes.assessment,
                secondaryDiagnoses: extractedData.conditions.join(', ') || "None identified",
                differentialDiagnosis: "To be considered based on further evaluation"
            },
            plan: {
                immediateActions: structuredNotes.plan,
                medications: extractedData.medications.join(', ') || "None prescribed",
                procedures: extractedData.procedures.join(', ') || "None ordered",
                followUp: "As clinically indicated",
                patientEducation: "Discussed with patient"
            },
            generatedAt: new Date().toISOString(),
            confidence: this.calculateConfidence(transcription, extractedData)
        };
    }

    calculateConfidence(transcription, extractedData) {
        let confidence = 0.5; // Base confidence

        // Increase confidence based on extracted medical terms
        const totalTerms = Object.values(extractedData).flat().length;
        confidence += Math.min(totalTerms * 0.05, 0.3);

        // Increase confidence based on transcription length
        if (transcription.length > 100) confidence += 0.1;
        if (transcription.length > 300) confidence += 0.1;

        return Math.min(confidence, 0.95);
    }
}

module.exports = MedicalFormatter; 