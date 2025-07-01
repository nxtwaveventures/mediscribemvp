const axios = require('axios');

class TranscriptionEngine {
    constructor() {
        this.currentIndex = 0;
        this.confidence = 0.85;
        this.isProcessing = false;

        // Demo medical conversations for fallback
        this.demoConversations = [
            "Patient presents with chest pain for the past three days. Pain is sharp and radiates to the left arm. No shortness of breath or sweating. Patient has a history of hypertension and diabetes.",
            "On physical examination, patient appears in mild distress. Blood pressure is 160/95, heart rate 88, temperature 98.6, respiratory rate 16. Heart sounds are normal, no murmurs detected.",
            "Lungs are clear to auscultation bilaterally. Abdomen is soft and non-tender. No peripheral edema noted. EKG shows normal sinus rhythm with no acute changes.",
            "Assessment: Atypical chest pain, likely musculoskeletal in origin. Rule out cardiac etiology. Differential includes costochondritis, GERD, and anxiety.",
            "Plan: Order cardiac enzymes, chest X-ray, and stress test. Prescribe ibuprofen 400mg TID for pain. Follow up in one week. Advise patient to return immediately if symptoms worsen."
        ];
    }

    async processRealAudio(audioBuffer) {
        try {
            this.isProcessing = true;

            // Try OpenAI Whisper API first (if API key is available)
            if (process.env.OPENAI_API_KEY) {
                return await this.processWithWhisper(audioBuffer);
            }

            // Fallback to Web Speech API (handled on frontend)
            return null;

        } catch (error) {
            console.error('Real audio processing error:', error);
            return null;
        } finally {
            this.isProcessing = false;
        }
    }

    async processWithWhisper(audioBuffer) {
        try {
            // Convert audio buffer to base64
            const base64Audio = audioBuffer.toString('base64');

            const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', {
                file: `data:audio/wav;base64,${base64Audio}`,
                model: 'whisper-1',
                response_format: 'json'
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.text) {
                this.confidence = 0.95; // Whisper is very accurate
                return response.data.text.trim();
            }

            return null;
        } catch (error) {
            console.error('Whisper API error:', error);
            return null;
        }
    }

    processDemoAudio() {
        // Simulate real-time transcription with demo data
        if (this.currentIndex < this.demoConversations.length) {
            const text = this.demoConversations[this.currentIndex];
            this.currentIndex++;
            this.confidence = 0.85 + (Math.random() * 0.1); // 85-95% confidence
            return text;
        }

        // Reset for continuous demo
        this.currentIndex = 0;
        return this.demoConversations[0];
    }

    getConfidence() {
        return this.confidence;
    }

    resetIndex() {
        this.currentIndex = 0;
    }

    isCurrentlyProcessing() {
        return this.isProcessing;
    }
}

module.exports = TranscriptionEngine; 