class SpeechToTextApp {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.finalTranscript = '';
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.bindEvents();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.languageSelect = document.getElementById('language');
        this.transcript = document.getElementById('transcript');
        this.interimTranscript = document.getElementById('interimTranscript');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.notification = document.getElementById('notification');
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showNotification('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.', 'error');
            this.startBtn.disabled = true;
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.languageSelect.value;
        
        this.setupRecognitionEvents();
    }

    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateUI();
            this.updateStatus('recording', 'Recording...');
        };

        this.recognition.onresult = (event) => {
            let interimTranscriptText = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    this.finalTranscript += transcript + ' ';
                    this.updateTranscript();
                } else {
                    interimTranscriptText += transcript;
                }
            }
            
            this.updateInterimTranscript(interimTranscriptText);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'An error occurred during speech recognition.';
            
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Audio capture failed. Please check your microphone.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'network':
                    errorMessage = 'Network error occurred. Please check your connection.';
                    break;
            }
            
            this.showNotification(errorMessage, 'error');
            this.stopRecording();
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateUI();
            this.updateStatus('ready', 'Ready to record');
            this.interimTranscript.classList.remove('active');
        };
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.clearBtn.addEventListener('click', () => this.clearTranscript());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadTranscript());
        
        this.languageSelect.addEventListener('change', () => {
            if (this.recognition) {
                this.recognition.lang = this.languageSelect.value;
            }
        });

        // Auto-save transcript as user types
        this.transcript.addEventListener('input', () => {
            this.finalTranscript = this.transcript.textContent;
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        if (this.isRecording) {
                            this.stopRecording();
                        } else {
                            this.startRecording();
                        }
                        break;
                    case 'c':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.copyToClipboard();
                        }
                        break;
                    case 'd':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.downloadTranscript();
                        }
                        break;
                }
            }
        });
    }

    startRecording() {
        if (!this.recognition) {
            this.showNotification('Speech recognition not available', 'error');
            return;
        }

        try {
            this.recognition.start();
            this.updateStatus('listening', 'Listening...');
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.showNotification('Failed to start recording', 'error');
        }
    }

    stopRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    clearTranscript() {
        this.finalTranscript = '';
        this.transcript.textContent = '';
        this.interimTranscript.textContent = '';
        this.interimTranscript.classList.remove('active');
        this.showNotification('Transcript cleared');
    }

    async copyToClipboard() {
        const text = this.transcript.textContent.trim();
        
        if (!text) {
            this.showNotification('No text to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Text copied to clipboard');
        } catch (error) {
            console.error('Failed to copy text:', error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('Text copied to clipboard');
        } catch (error) {
            console.error('Fallback copy failed:', error);
            this.showNotification('Failed to copy text', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    downloadTranscript() {
        const text = this.transcript.textContent.trim();
        
        if (!text) {
            this.showNotification('No text to download', 'error');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Transcript downloaded');
    }

    updateTranscript() {
        this.transcript.textContent = this.finalTranscript.trim();
    }

    updateInterimTranscript(text) {
        if (text.trim()) {
            this.interimTranscript.textContent = text;
            this.interimTranscript.classList.add('active');
        } else {
            this.interimTranscript.classList.remove('active');
        }
    }

    updateUI() {
        this.startBtn.disabled = this.isRecording;
        this.stopBtn.disabled = !this.isRecording;
        
        if (this.isRecording) {
            this.startBtn.classList.add('recording-animation');
        } else {
            this.startBtn.classList.remove('recording-animation');
        }
    }

    updateStatus(state, text) {
        this.statusDot.className = `status-dot ${state}`;
        this.statusText.textContent = text;
    }

    showNotification(message, type = 'success') {
        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        this.notification.classList.add('show');
        
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SpeechToTextApp();
});

// Add some helpful tips for users
document.addEventListener('DOMContentLoaded', () => {
    // Show browser compatibility info
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        const compatibilityInfo = document.createElement('div');
        compatibilityInfo.innerHTML = `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #92400e;">
                <strong>Browser Compatibility Notice:</strong><br>
                This application requires a browser that supports the Web Speech API. 
                Please use Chrome, Edge, or Safari for the best experience.
            </div>
        `;
        document.querySelector('.main-content').prepend(compatibilityInfo);
    }

    // Add keyboard shortcuts info
    const shortcutsInfo = document.createElement('div');
    shortcutsInfo.innerHTML = `
        <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #1e40af; font-size: 0.875rem;">
            <strong>Keyboard Shortcuts:</strong><br>
            • Ctrl/Cmd + Enter: Start/Stop recording<br>
            • Ctrl/Cmd + Shift + C: Copy transcript<br>
            • Ctrl/Cmd + Shift + D: Download transcript
        </div>
    `;
    document.querySelector('.features-section').after(shortcutsInfo);
});