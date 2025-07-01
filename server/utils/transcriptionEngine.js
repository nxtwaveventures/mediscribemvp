class TranscriptionEngine {
    constructor() {
        this.isProcessing = false;

        // Medical conversation samples for demo
        this.demoTexts = [
            "Patient reports chest pain that started this morning",
            "Pain is described as sharp and radiating to the left arm",
            "Patient has history of hypertension and diabetes",
            "Blood pressure is 140 over 90",
            "Heart rate is 88 beats per minute",
            "No shortness of breath reported",
            "Patient took aspirin at home before coming in",
            "Recommending EKG and chest X-ray",
            "Will start patient on nitroglycerin if needed",
            "Follow up in cardiology clinic next week"
        ];

        this.currentIndex = 0;
    }

    async processAudio(audioData) {
        // Simulate processing delay
        await this.delay(500 + Math.random() * 1000);

        // In real implementation, this would use OpenAI Whisper or similar
        // For MVP demo, we simulate with medical text samples

        if (this.currentIndex < this.demoTexts.length) {
            const text = this.demoTexts[this.currentIndex];
            this.currentIndex++;

            return {
                text: text,
                confidence: 0.85 + Math.random() * 0.1, // Simulate 85-95% confidence
                timestamp: new Date().toISOString(),
                medicalTermsDetected: this.detectMedicalTerms(text)
            };
        }

        return {
            text: '',
            confidence: 0,
            timestamp: new Date().toISOString(),
            medicalTermsDetected: []
        };
    }

    detectMedicalTerms(text) {
        const medicalTerms = [
            'hypertension', 'diabetes', 'chest pain', 'blood pressure',
            'heart rate', 'shortness of breath', 'aspirin', 'EKG',
            'chest X-ray', 'nitroglycerin', 'cardiology'
        ];

        const detected = [];
        const lowerText = text.toLowerCase();

        medicalTerms.forEach(term => {
            if (lowerText.includes(term)) {
                detected.push(term);
            }
        });

        return detected;
    }

    reset() {
        this.currentIndex = 0;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Real implementation would use this method
    async processRealAudio(audioBuffer) {
        // This would integrate with OpenAI Whisper or similar service
        // const transcription = await whisper.transcribe(audioBuffer);
        // return transcription;

        throw new Error('Real audio processing not implemented in MVP');
    }
}

module.exports = TranscriptionEngine; 